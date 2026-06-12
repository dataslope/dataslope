# Vercel ISR Reads, Edge Requests & Fast Origin Transfer — Diagnosis and Hosting Options

**Date:** 2026-06-12
**Project:** DataSlope (`dataslope/dataslope`)
**Stack:** Next.js 16.2.4 (App Router) + Fumadocs MDX, 758 prerendered `/learn` lessons, WASM playgrounds
**Trigger:** Vercel email — 75% of the Hobby free tier's 1,000,000 monthly ISR Reads consumed; Edge Requests and Fast Origin Transfer also elevated.

---

## TL;DR

1. **You are not paying for stale data or rebuilds.** Every row in your screenshots shows **Writes = 0**. Nothing is being regenerated. This is a *fully static* site, so the standard advice ("raise your `revalidate` interval") **does not apply to you** — there is nothing to revalidate.

2. **The real driver is Next.js 16's aggressive per-segment prefetching** combined with a very large navigation surface (758 lessons + Fumadocs sidebars full of `<Link>`s). The `.segment` / `__PAGE__.segment` rows in your screenshots are exactly this: Next 16 splits each route into individually-prefetchable segments, and your sidebar prefetches many of them on viewport/hover. Each prefetch that misses the CDN edge cache becomes **1 ISR Read + 1 Edge Request + some Fast Origin Transfer**. The three metrics you're worried about are all the *same root cause* viewed three ways.

3. **Highest-leverage fixes (in order):**
   - **Tame prefetching** (custom `<Link>` wrapper defaulting `prefetch={false}`, extend router `staleTimes`). Community reports: **40–60% bandwidth/request reduction**. *(~1 hour, low risk)*
   - **Cache static output harder at the edge** so the CDN absorbs reads instead of falling through to durable storage. *(low risk)*
   - **Structural fix:** this site is *static enough* that a host which serves prerendered pages as free CDN assets (Cloudflare, Netlify) — or a full `output: 'export'` — **removes the ISR-Read meter entirely.** That's the durable answer if usage keeps climbing.

4. **Cloudflare is a viable and cheaper home** for this workload (flat pricing, unlimited bandwidth, no per-read ISR meter), but the migration is *not* zero-cost: Next.js on Cloudflare runs via the **OpenNext adapter**, which has real caveats (Worker size limits, no edge runtime, you wire up your own KV/R2/D1 for caching). Details and alternatives below.

---

## 1. How Vercel bills these three things (and why they move together)

| Metric | What it actually measures | Free (Hobby) allowance |
| --- | --- | --- |
| **ISR Reads** | Reads from Vercel's **durable** ISR store that happen when the **edge CDN cache misses**. CDN hits are free; only the fall-through to durable storage is metered. | 1,000,000 / mo |
| **ISR Writes** | Writes to the durable store (build prerender + on-demand/timed revalidation). | 200,000 / mo |
| **Edge Requests** | Every request that hits the Edge Network — page loads, RSC navigations, **prefetches**, static assets, `/api/*`. | included, but capped |
| **Fast Origin Transfer** | Bytes moved **between the edge and your compute/durable store on a cache miss** — i.e. it measures cache *misses*, not user-facing traffic. | included, but capped |

The critical mental model: **all three spike on the same event — a CDN cache miss for a prerendered segment.** One prefetch of an uncached lesson segment = one Edge Request, one ISR Read, and a slice of Fast Origin Transfer. So a single change that reduces *unnecessary cache-miss-inducing requests* improves all three at once.

### Why your cache-miss rate is structurally high
- **758 lessons**, each now split into multiple prefetchable **segments** under Next 16. That's thousands of independently-cacheable objects.
- Vercel's CDN cache is **per-region and LRU-evicted**. With this many cold, rarely-hit objects spread across global edge regions, any given segment is frequently *not* warm in the region serving the request → it falls through to durable storage → **ISR Read**.
- Next.js 16 made `<Link>` prefetching **more aggressive by default**, and Fumadocs sidebars/TOCs render *many* links per page. Community measurements after the v16 upgrade show **4× average and 7–10× worst-case** request growth on "docs/marketing sites with many segments" — which is precisely your shape.

> Evidence in your own screenshots: the top "Units" route is `/svg-gallery` at **641 units read** and the `.segment` rows dominate the "Count" view. Reads are spread thinly across hundreds of unique routes with **1 unique path each** — the fingerprint of broad prefetch fan-out, not a few hot dynamic pages.

---

## 2. Reduce ISR Reads / Edge Requests / Fast Origin Transfer (no migration)

These are ordered by effort-to-impact. Items 1–2 are the big wins.

### 2.1 — Stop prefetching the entire sidebar (biggest lever)

Next.js defaults `<Link prefetch>` to eager. With hundreds of sidebar links, every page view fans out prefetches across many lessons the user will never open. Disabling **viewport** prefetch while keeping **hover** prefetch retains ~all perceived speed.

**Option A — global wrapper (cleanest, if you control link usage):**
```tsx
// app/_components/Link.tsx
import NextLink, { type LinkProps } from "next/link";

// Default prefetch OFF; hover/touch still triggers a just-in-time prefetch.
export function Link({ prefetch = false, ...props }: LinkProps & { children?: React.ReactNode }) {
  return <NextLink prefetch={prefetch} {...props} />;
}
```
Then opt back in only on primary nav: `<Link href="/learn" prefetch>`.

**Caveat for this repo:** the heavy link surface is inside **Fumadocs** components (sidebar, TOC, breadcrumbs), which import `next/link` internally — a wrapper won't reach those. For those, use Option B.

**Option B — Fumadocs / router-level controls (recommended here):**
- Fumadocs exposes sidebar/link prefetch behavior through its layout/`<DocsLayout>` tree options and `next/link` `prefetch` props on items it renders; set prefetch to `false`/`"auto"` where the API allows. Check the installed `fumadocs-ui` version's `DocsLayout`/`SidebarItem` props for a `prefetch` pass-through before patching.
- Combine with `staleTimes` (next item) so even when a prefetch *does* happen, it's reused instead of repeated. Community report on the exact "many segments" scenario: **40–60% reduction** in bandwidth/requests from prefetch control alone.

### 2.2 — Extend the client router cache (`staleTimes`)

Keep prefetched/visited segments reusable in the browser longer, so navigations and re-hovers don't re-hit the edge.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons"],
    staleTimes: {
      dynamic: 60,     // seconds a prefetched dynamic segment stays fresh client-side
      static: 300,     // your lessons are static — cache them aggressively client-side
    },
  },
  // ...existing redirects/rewrites
};
```
Because your lesson pages are fully static, a long `static` stale time is safe — the content doesn't change between deploys.

### 2.3 — Make the edge CDN hold the static output longer

Your pages are static and only change on deploy. Add long-lived, immutable-ish caching so the **CDN serves them and the durable ISR store is rarely touched** (every CDN hit = a *free* read instead of a metered one). On Vercel, prerendered App Router pages are managed by the framework, but you can reinforce caching for the **route handlers** you own, which are also static today:

```ts
// app/llms/learn/[[...slug]]/route.ts  and  app/api/search/route.ts
// These are statically generated (revalidate = false). Reinforce edge caching:
export const dynamic = "force-static";
// and/or return explicit headers from the handler:
//   "Cache-Control": "public, s-maxage=31536000, stale-while-revalidate"
```
For `/api/search` (Orama) in particular: the index only changes on deploy, so a long `s-maxage` turns repeat searches into free CDN hits instead of function invocations + origin transfer.

### 2.4 — Audit the outliers
- **`/svg-gallery` (641 units, your #1 reader):** confirm whether this is a real learner-facing page or a dev/demo page. If it's a demo, `noindex` it and/or remove it from any prefetched nav so bots and stray crawls stop hammering it.
- **Bot/crawler traffic** inflates all three meters. Add a tightened `app/robots.ts` (or `public/robots.txt`) to keep crawlers off non-content routes (`/playground/*`, `/color-test`, `/svg-gallery`, `/api/*`, the `.md` mirror routes). Crawlers requesting cold segments are pure cost with no user benefit.

### 2.5 — Things you've *already* done right (don't undo these)
- **WASM runtimes (.NET ~35 MB, PGlite) are offloaded to jsDelivr**, not served by Vercel (`app/_components/runtime/cdn.ts`). This is the single most important bandwidth decision and it's already in place — it keeps Fast *Data* Transfer (user-facing egress) off Vercel's bill. Keep doing this for any new large asset; the 37 MB `public/` (mostly `tools.jar`) is the main remaining Vercel-served blob — consider moving `tools.jar` to jsDelivr too if traffic to Java grows (the code comment notes jsDelivr can't host `.jar`, so it may need a rename/repackage trick or an R2 bucket).

### What *won't* help you (so don't waste time on it)
- **Raising `revalidate`** — you have no revalidation (Writes = 0). N/A.
- **ISR On-Demand revalidation tuning** — same reason.
- **`unstable_cache` / Data Cache tuning** — you don't fetch external data per request on these pages.

---

## 3. Realistic outcome of the no-migration plan

Prefetch control (2.1) + `staleTimes` (2.2) + edge caching (2.3) should plausibly cut ISR Reads and Edge Requests by **roughly half**, comfortably back under the 1M free ceiling with headroom — **without** changing hosts. Do these first; they're an afternoon of work and reversible. Treat migration as the move only if traffic keeps growing past what tuning buys you, or if you want to stop thinking about these meters entirely.

---

## 4. Moving to Cloudflare — pros & cons

Two distinct paths exist; pick based on how much of Next's server feature-set you keep.

### Path A — Cloudflare Workers via the **OpenNext** adapter (`@opennextjs/cloudflare`)
This is the current, Cloudflare-blessed way to run a *full* Next.js app (App Router, ISR, image optimization, route handlers) on their platform.

**Pros**
- **Pricing model fits a static-heavy content site.** Flat **$0 Free / $20-ish Pro**, **unlimited bandwidth on all plans**, and **no per-ISR-Read meter** — the exact charge that's biting you simply doesn't exist. Prerendered pages are served as static assets for free.
- **Node.js runtime supported** (unlike the older `next-on-pages`, which was edge-only). Your route handlers using `node:fs` (`app/llms/learn/.../route.ts` reads files) and Fumadocs's server search are far likelier to work.
- **Next.js 16 supported** (all 16.x minor/patch releases; latest 14/15 too).
- First-class access to Cloudflare KV/R2/D1 if you later want real incremental caching or storage, and a global edge network with strong cold-start performance.

**Cons / caveats (read before committing)**
- **Worker size limit:** **3 MiB compressed on Free, 10 MiB on Paid.** A docs site is usually fine, but heavy server deps can blow the budget — verify your built Worker size early.
- **No Edge runtime** (Node only on the adapter today; edge runtime support is "planned"). You don't use `export const runtime = "edge"` anywhere, so this likely doesn't affect you — but it forecloses that option.
- **You own the caching wiring.** ISR/`revalidate`/`use cache` work, but you configure the backing store (Workers KV / R2 / D1) yourself via OpenNext config. More moving parts than Vercel's zero-config.
- **`cookies()` in middleware is Node-only / unsupported in some flows**, and Windows dev support for the adapter is still maturing. You have **no middleware** and a CI/Linux build, so low risk here — but worth knowing.
- **You leave the "first-party" path.** Vercel ships Next features day-one; OpenNext follows. New Next.js features can lag, and you're debugging an adapter layer when something breaks.
- **Migration is real work:** new build pipeline (`opennextjs-cloudflare build`), `wrangler` config, `nodejs_compat` flag + compatibility date, preview/deploy via Cloudflare, DNS cutover, and re-validating all 11 WASM playgrounds + the search index in the workerd runtime.

### Path B — Cloudflare Pages / Workers **Static Assets** (treat the site as static)
Because **Writes = 0** and content only changes on deploy, DataSlope is *nearly* a pure static site. If you adopt Next's `output: 'export'` (or Fumadocs's static-search variant), you can deploy plain static assets to Cloudflare with **no server runtime at all**.

**Pros:** simplest, cheapest, fastest, effectively free at your scale; no adapter, no Worker size limit, no ISR concept to meter.
**Cons / blockers to clear first:**
- `app/api/search/route.ts` (Orama **server** search) must switch to **Fumadocs static/client search** (it supports a build-time static index).
- The `.md` mirror routes (`app/llms/learn/...`) are already static (`generateStaticParams`, `revalidate = false`) and export cleanly.
- No Next Image optimization server — fine, you serve your own assets / jsDelivr.
- Confirm none of the playground routes rely on server behavior (they're client/WASM, so they should export fine).

If you're willing to convert search to static, **Path B is the strongest structural fix** — it makes *every* static host (Cloudflare Pages, Netlify, even S3+CloudFront or GitHub Pages) cheap and removes the entire class of problem permanently.

---

## 5. Other hosting alternatives (excluding self-hosting / VPS)

| Host | Best for | ISR-Read-style meter? | Bandwidth | Pricing shape | Fit for DataSlope |
| --- | --- | --- | --- | --- | --- |
| **Stay on Vercel + tune** | Keeping zero-config DX | Yes (the thing biting you) | Metered (FOT on miss) | Free → $20/dev Pro | **Do this first.** Tuning likely keeps you free. |
| **Cloudflare (OpenNext)** | Full Next features, cheap, unlimited bandwidth | **No ISR-Read meter** | **Unlimited** | Flat $0/$20 (not per-user) | **Strong** if you want server features + low cost. Adapter caveats. |
| **Cloudflare Pages/Workers Static** | Static export of this site | None | **Unlimited** | Free at this scale | **Best long-term** if you convert search to static. |
| **Netlify** | Content/docs sites, nice DX | Limited free tier; SSR via functions | Metered (100 GB free) | $0 → **$20/seat** Pro | Good DX, but **per-seat** billing and metered bandwidth — less cost-advantaged than Cloudflare for a public free site. |
| **AWS Amplify Hosting** | Teams already in AWS | Pay-per-use (build/host/transfer) | Metered (AWS egress) | Usage-based | Powerful, but AWS egress + complexity; overkill unless you're already on AWS. |
| **SST (OpenNext on your AWS)** | Max control, IaC | You configure (S3/CloudFront/Lambda) | AWS egress | AWS usage | Most control, most ops burden. Same OpenNext engine as Cloudflare path, different cloud. |
| **Render** | Flat-rate PaaS, predictable bills | N/A (container) | Generous, predictable | Flat monthly | Simple and predictable, but you'd run Next as a Node server (less CDN-native for a static docs site). |

**Shortlist for your situation (free, public, static-heavy, content site):**
1. **Tune Vercel** (today) — cheapest change, probably solves it.
2. **Cloudflare** — if you want to stop watching meters: Path B (static) if you can convert search, else Path A (OpenNext).
3. **Netlify** — viable, but the per-seat Pro pricing and metered bandwidth make it less attractive than Cloudflare for an ad-free public learning site.

---

## 6. Recommended action plan

**Phase 1 — This week (no migration, reversible):**
1. Add a `<Link>` wrapper defaulting `prefetch={false}`; opt back in on primary nav only.
2. Disable/limit Fumadocs sidebar/TOC prefetch (check `DocsLayout`/sidebar item props for a prefetch pass-through).
3. Add `experimental.staleTimes` (`static: 300+`) in `next.config.ts`.
4. Add long `s-maxage` cache headers to `/api/search` and the `.md` route handlers.
5. Add a tightened `robots.ts` to keep crawlers off `/playground/*`, `/svg-gallery`, `/color-test`, `/api/*`, `*.md`.
6. Re-check the Vercel usage dashboard after 3–5 days. This should drop ISR Reads / Edge Requests materially.

**Phase 2 — If usage still trends toward the cap:**
7. Decide static-export feasibility (convert Orama to Fumadocs **static search**).
8. If yes → **Cloudflare Pages/Workers Static** (or any static host): problem gone permanently.
9. If you need server features → **Cloudflare via OpenNext**; validate Worker size and all 11 playgrounds + search in a preview before DNS cutover.

---

## Sources

- [Vercel — ISR Usage and Pricing](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing)
- [Vercel — Manage and optimize Edge Network usage](https://vercel.com/docs/pricing/networking)
- [Vercel — Manage and optimize usage](https://vercel.com/docs/pricing/manage-and-optimize-usage)
- [Vercel Pricing](https://vercel.com/pricing)
- [Mike Bifulco — Optimizing Your Next.js Site's Fast Origin Transfer and ISR Reads](https://mikebifulco.com/posts/reduce-nextjs-bandwidth-with-link-prefetch)
- [Build with Matija — How to Reduce Vercel Fast Origin Traffic by 95% Using ISR](https://www.buildwithmatija.com/blog/reduce-vercel-fast-origin-transfer-isr-nextjs)
- [Sanity Docs — Next.js 16 + SanityLive: avoiding request overages (segment prefetch multiplication)](https://www.sanity.io/docs/help/nextjs-16-sanitylive-status)
- [vercel/next.js #85489 — Prefetch requests happen more than once on Next 16](https://github.com/vercel/next.js/issues/85489)
- [Next.js — Guides: Prefetching](https://nextjs.org/docs/app/guides/prefetching)
- [Next.js 16 release notes](https://nextjs.org/blog/next-16)
- [OpenNext — Cloudflare adapter](https://opennext.js.org/cloudflare)
- [Cloudflare — Deploy Next.js with the OpenNext adapter](https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/)
- [Cloudflare Workers — Next.js framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [MakerKit — 10 Best Next.js Hosting Providers in 2026](https://makerkit.dev/blog/tutorials/best-hosting-nextjs)
- [Lucky Media — Web Hosting Comparison 2026: Vercel vs Netlify vs Cloudflare vs Render](https://www.luckymedia.dev/insights/hosting)
- [Logarithmic Spirals — AWS Amplify vs Cloudflare Pages vs S3 (2026)](https://logarithmicspirals.com/blog/website-migration-aws-amplify-to-cloudflare-insights/)

*Prepared from the live repository state (Next.js 16.2.4, Fumadocs, 758 static lessons, WASM runtimes offloaded to jsDelivr) and the attached Vercel ISR observability screenshots showing Writes = 0 across all routes.*
