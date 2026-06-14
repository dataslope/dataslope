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

4. **Cloudflare is a viable and cheaper home** for this workload (flat pricing, unlimited bandwidth, no per-read ISR meter), but the migration is *not* zero-cost: Next.js on Cloudflare runs via the **OpenNext adapter**, which has real caveats (Worker size limits, no edge runtime, you wire up your own KV/R2/D1 for caching). Details and alternatives below. **Self-hosting on a VPS (e.g. a DigitalOcean droplet managed by Coolify) is the other no-meters path** — flat $6–24/mo, native Next.js with zero adapter caveats, deploy-on-push + PR previews via Coolify, at the cost of owning the server; see §6.1.

5. **Once you add the planned backend** (user accounts, workspace DB, "Ask AI"), a *pure* static export can't host those features — but a **hybrid** keeps the 758 lessons free-static and runs only the new `/api/*` routes as server compute. On Cloudflare that means **Workers + OpenNext** (Pages is no longer the steered path for full-stack Next.js), with D1/R2 + Claude via the Anthropic SDK behind AI Gateway. Staying on Vercel supports all of this first-class too. See §5.

6. **Build/preview costs are a separate bill line.** Your build is heavy (758 lessons + WASM toolchain) and you run many previews. The biggest lever is build *hygiene* — extend your existing `ignoreCommand` to skip non-shipping pushes, cache dependencies, and don't build throwaway branches — which works on any host. Cloudflare's build minutes are also more generous/cheaper than Vercel's if volume is the driver. See §7. The Phase 1 runtime fixes **also carry over to Cloudflare** (§8) — nothing is wasted if you migrate.

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

If you're willing to convert search to static, **Path B is the strongest structural fix** — it makes *every* static host (Cloudflare Pages, Netlify, even S3+CloudFront or GitHub Pages) cheap and removes the entire class of problem permanently. **But note:** this is only true *today*, while the site is read-only. The planned user accounts, workspace database, and "Ask AI" features need server-side compute — which changes the calculus. See the next section.

---

## 5. Planned features (user accounts, workspace DB, "Ask AI") — how they change the Cloudflare picture

You're planning to add three things that all require **server-side execution**:

1. **User management** (accounts, login/sessions).
2. **A database** to save playground workspaces online (today they live client-side in OPFS).
3. **"Ask AI"** — an LLM feature that must run server-side (to keep API keys secret and stream responses).

This is the single most important input to the hosting decision, so take it section by section.

### 5.1 — Does this kill the "pure static export" option (Path B)?

**For the new features, yes — but not for the site as a whole.** Path B (`output: 'export'`, zero server runtime) can only ship static files; it cannot run auth, write to a database, or call an LLM. The moment you add those, a fully-static export no longer covers your whole app.

But you do **not** lose the static benefit for the part that matters. The right shape is a **hybrid**, and it's exactly what OpenNext-on-Workers gives you for free:

- Your **758 lessons stay prerendered static assets** → served free from the CDN, no per-request meter (this is what fixes the original ISR-read problem).
- Only the **new dynamic routes** — `/api/auth/*`, `/api/workspaces/*`, `/api/ask-ai` — run as server (Worker) invocations, billed per request.

So the structural win survives: the expensive, high-volume traffic (lesson reads + prefetches) is still free static; only genuine app actions (login, save, ask) hit metered compute, and those are far lower volume.

### 5.2 — Is Cloudflare Pages "no longer an option"?

**Pages still exists and still works, but as of 2026 it is no longer the path Cloudflare steers full-stack Next.js apps toward — Workers is.** The relevant facts:

- Cloudflare's official guidance now says: to deploy a **full-stack / SSR Next.js app, use OpenNext + Cloudflare Workers**, not Pages. Their own Next.js adapter is being built for the Workers + OpenNext path.
- As of **early 2026, Workers reached feature parity with Pages** for static assets, SSR, and custom domains — Workers gained native static-asset hosting (declared in `wrangler` config), and **static-asset requests are free, same as Pages**.
- Several capabilities you'll likely want are **Workers-only**: **Durable Objects** (stateful/realtime — useful if workspace sync ever needs live collaboration), Containers, Workflows, and the Secrets Store.
- Pages is **not formally deprecated** — it still gets maintenance — but new features land on Workers first or only. For a new build, the advice is unambiguous: **go straight to Workers + OpenNext and skip Pages.**

Bottom line: don't think "Pages vs Workers." Think **"Workers + OpenNext"** as the single Cloudflare target. It serves your static lessons free *and* hosts the dynamic auth/DB/AI routes — Pages would just be a more limited subset of the same platform.

### 5.3 — Your Cloudflare building blocks for each feature

Cloudflare is actually a *strong* fit here because it has first-party primitives for all three, billed flat with no egress fees:

| Need | Cloudflare-native option | Notes / alternatives |
| --- | --- | --- |
| **Auth / user management** | **Better Auth** (self-hosted, first-class D1 support: email/password, social, magic links, passkeys, 2FA, RBAC) | Auth.js (NextAuth) has a D1 adapter too. Or external: Clerk / Supabase Auth / WorkOS if you'd rather not run auth yourself. Better Auth + D1 is the popular CF-native combo. |
| **Workspace database** | **D1** (serverless SQLite) for structured data (users, workspace metadata); **R2** (zero-egress object storage) for the workspace file blobs themselves | Today workspaces sit in browser OPFS; "save online" = push the OPFS tree to R2 (files) keyed by a row in D1. **KV** for small/cache data, **Durable Objects** if you later want live multi-device sync. Or external Postgres (Neon/Supabase) via **Hyperdrive** if you prefer Postgres. |
| **"Ask AI"** | A **Worker route** (`/api/ask-ai`) that calls **Claude via the official Anthropic SDK** (`@anthropic-ai/sdk`), optionally behind **Cloudflare AI Gateway** (caching, rate-limiting, retries, fallback, observability) | Cloudflare **Workers AI** (open models on CF's GPUs) is the fully-in-house option, but for a learning tutor the answer quality of Claude is worth the external call. Stream the response (Workers support SSE streaming) so long answers don't time out. |

### 5.4 — Notes specific to the "Ask AI" feature

Since this is a tutoring feature layered over your lesson content, two Anthropic-API capabilities matter a lot for cost and latency:

- **Prompt caching.** If every "Ask AI" call injects the same lesson text / course context as a prefix, cache that prefix. Cache reads cost ~10% of normal input price, so a tutor that answers many questions against the same lesson gets dramatically cheaper. Structure the request as `[cached lesson context] → [user's question]`.
- **Streaming.** Always stream the response for a chat-style feature — it shows tokens immediately and avoids Worker/SDK timeouts on long answers.
- **Model tier is a cost/quality dial.** For a free public site doing potentially high question volume, you can route by need: **Claude Haiku 4.5** for cheap/fast answers, **Claude Sonnet 4.6** for a balance, **Claude Opus 4.8** for the most capable tutoring. Start at whichever tier matches your quality bar and adjust — caching + a sensible tier keeps the bill predictable. (I can hand you exact model IDs and a working `/api/ask-ai` Route Handler in chat — kept out of this report.)
- **Keep the key server-side.** The whole reason "Ask AI" needs a server is to hold the Anthropic API key. Never ship it to the browser; the Worker route (or AI Gateway) is the boundary.

### 5.5 — What this means for the decision

Adding server features **tips the recommendation toward Cloudflare Workers + OpenNext** (or staying on Vercel), because:

- A pure static host (GitHub Pages, S3-only, Netlify static) can no longer run your whole app — you'd need a *separate* backend service anyway, adding ops surface.
- Cloudflare gives you the static-lessons-are-free win **and** D1/R2/Workers-AI/AI-Gateway for the dynamic features, under one flat bill with no egress fees — a genuinely good fit for a free, public, content-heavy learning site that's growing a backend.
- Staying on Vercel also works (Vercel has first-class support for all of this — Postgres, Blob, auth, streaming AI routes) and is the lowest-effort path; the tradeoff is the metered model that prompted this report. With the Phase 1 tuning applied, Vercel may stay free even with the new routes, since auth/save/ask are low-volume compared to lesson reads.

---

## 6. Other hosting alternatives (including self-hosting / VPS)

| Host | Best for | ISR-Read-style meter? | Bandwidth | Pricing shape | Fit for DataSlope |
| --- | --- | --- | --- | --- | --- |
| **Stay on Vercel + tune** | Keeping zero-config DX, easiest path to add auth/DB/AI | Yes (the thing biting you) | Metered (FOT on miss) | Free → $20/dev Pro | **Do this first.** Tuning likely keeps you free; first-class support for the planned backend features. |
| **Cloudflare (OpenNext on Workers)** | Full Next features + auth/DB/AI, cheap, unlimited bandwidth | **No ISR-Read meter** | **Unlimited** | Flat $0/$20 (not per-user) | **Strong** once you add server features — D1/R2/Workers-AI/AI-Gateway under one flat bill. Adapter caveats. |
| **Cloudflare Pages/Workers Static** | Static export of *today's* read-only site | None | **Unlimited** | Free at this scale | Removes the meter, but **can't host the planned auth/DB/AI** — you'd need a separate backend. Superseded by the Workers path above once features land. |
| **VPS + Coolify (DigitalOcean / Hetzner)** | Full control, flat bill, zero per-request meters, 100% Next.js feature support (plain Node) | **None — no meters of any kind** | Included quota (DO: 500 GB–11 TB; overage $0.01/GiB), pair with a free CDN | Flat **$6–24/mo** droplet (+$0–5/mo Coolify) | **Strong if you accept ops ownership.** No adapter, no meters, easy Postgres for the future backend. Single-region origin → put Cloudflare's free CDN in front. See §6.1. |
| **Netlify** | Content/docs sites, nice DX | Limited free tier; SSR via functions | Metered (100 GB free) | $0 → **$20/seat** Pro | Good DX, but **per-seat** billing and metered bandwidth — less cost-advantaged than Cloudflare for a public free site. |
| **AWS Amplify Hosting** | Teams already in AWS | Pay-per-use (build/host/transfer) | Metered (AWS egress) | Usage-based | Powerful, but AWS egress + complexity; overkill unless you're already on AWS. |
| **SST (OpenNext on your AWS)** | Max control, IaC | You configure (S3/CloudFront/Lambda) | AWS egress | AWS usage | Most control, most ops burden. Same OpenNext engine as Cloudflare path, different cloud. |
| **Render** | Flat-rate PaaS, predictable bills | N/A (container) | Generous, predictable | Flat monthly | Simple and predictable, but you'd run Next as a Node server (less CDN-native for a static docs site). |

### 6.1 — Self-hosting on a VPS with Coolify (e.g. a DigitalOcean droplet)

You asked about running DataSlope on your own VPS — for example a DigitalOcean droplet managed through **Coolify**. This is a legitimate fourth path, and in some ways the most *complete* fix: there are **no per-request meters at all** (no ISR Reads, no Edge Requests, no Fast Origin Transfer, no function invocations, no build minutes). You pay one flat monthly price for a box and everything on it is yours.

**What Coolify is.** An open-source (Apache 2.0), self-hostable PaaS that recreates the Vercel workflow on your own server: connect the GitHub repo via a GitHub App, get **deploy-on-push**, **per-PR preview deployment URLs**, automatic HTTPS (Let's Encrypt via Traefik/Caddy), logs/monitoring, rollbacks, and **280+ one-click services** (including Postgres — relevant for the planned workspace DB). It deploys Next.js either via Nixpacks auto-detection or a Dockerfile; for this repo you'd use Next's `output: "standalone"` mode so the runtime image stays small. The software is **free self-hosted** (you run the Coolify panel on the droplet itself or a $4–6 side box); **Coolify Cloud** — where they host just the control panel for you — is **~$5/mo for up to 2 servers** (+$3/server beyond that), and your apps still run on your own droplet.

**How the economics compare for DataSlope:**

| Cost line | Vercel today | DO droplet + Coolify |
| --- | --- | --- |
| ISR Reads / Edge Requests / FOT | Metered (the problem) | **Don't exist** |
| Bandwidth | Metered (FDT) | DO includes 500 GB–11 TB by droplet size; **$0.01/GiB** overage — and ~free if Cloudflare CDN fronts it |
| Builds / previews | Build-minute meter (§7) | **Your hardware** — unlimited builds; each PR preview is just another container on the box |
| Backend (auth/DB/AI later) | First-class, metered | One-click Postgres next to the app; `/api/ask-ai` is just a Node route on the same box |
| Monthly bill | $0 → unpredictable | **Flat $6–24/mo** (droplet size-dependent) + optional $5 Coolify Cloud |

**Droplet sizing — the build is the constraint, not serving.** Serving 758 static pages from a Node `next start` is light (1 GB RAM is plenty). But *building* this repo (fumadocs-mdx over 758 lessons → esbuild workers → `next build` with the WASM-heavy dependency tree) wants **4 GB+ RAM**; on a $6/mo 1 GB droplet, on-box builds will OOM or crawl, and a build will starve the live site while it runs. Three sane configurations:
1. **$12/mo (2 GB) droplet + swap**, builds tolerated as slow — minimum viable, previews will hurt.
2. **$24/mo (4 GB) droplet** — comfortable for app + builds + a few PR preview containers. *(Recommended starting point.)*
3. **Build elsewhere:** run `next build` in GitHub Actions (free for public repos) and have Coolify deploy the artifact/image, or attach a second cheap box as a dedicated Coolify **build server**. Keeps the serving droplet tiny.
   - Hetzner equivalent for the same money is roughly 2× the hardware (CPX-class ~€8/mo ≈ $9.50 for 3 vCPU/4 GB; EU regions include 20 TB egress, US regions 1 TB) — same Coolify experience, better $/perf, slightly less polished ecosystem than DO.

**The two things you give up vs. a managed edge platform:**
1. **A global CDN by default.** A droplet is one origin in one region; Vercel/Cloudflare serve your static lessons from dozens of PoPs. Mitigation is standard and free: put **Cloudflare's free tier in front** (DNS + proxy + cache). Static assets and prerendered HTML then serve from Cloudflare's edge worldwide, origin egress drops to near nothing, and you keep zero meters. (The Phase 1 prefetch/caching fixes carry over here too — they reduce origin hits exactly the same way; see §8.)
2. **Ops ownership.** You patch the OS, watch disk space, configure backups (DO droplet backups are +20% of droplet price, or snapshot to Spaces), and you are the on-call. Coolify automates the deploy workflow, not the sysadmin work. Budget a few hours up front and ~an hour a month steady-state. Coolify is also still a v4 *beta* line (very widely used — ~56k GitHub stars — but expect occasional rough edges; the announced v5 rewrite has no public timeline yet).

**Migration shape for this repo:** `output: "standalone"` Dockerfile (or Nixpacks) → Coolify app from the GitHub repo → keep the existing `npm run build` chain (fumadocs-mdx + workers + svg-gallery data are all plain Node steps and run fine in a container build) → Cloudflare DNS/proxy in front → done. The jsDelivr WASM offload (§2.5) stays exactly as-is. ISR/`revalidate` semantics work natively (it's just Next on Node — the *only* host class with zero adapter caveats), though for this fully-static site there's nothing to revalidate anyway.

**Verdict:** the strongest fit if you value a *fixed* bill and full control, and the planned backend makes it more attractive (Postgres on the same box, no per-invocation pricing for "Ask AI" calls — you pay only Anthropic). The honest counterweight: for a solo-maintained free site, Cloudflare Workers + OpenNext buys ~the same "no meters that matter" outcome with zero server administration. Pick VPS+Coolify if the ops ownership reads as a feature to you, not a chore.

**Shortlist for your situation (free, public, static-heavy, content site):**
1. **Tune Vercel** (today) — cheapest change, probably solves it.
2. **Cloudflare** — if you want to stop watching meters with zero server ops: Path B (static) if you can convert search, else Path A (OpenNext).
3. **VPS + Coolify (DO/Hetzner)** — if you want a flat bill, no meters anywhere, native Next.js, and you're happy owning a server (§6.1).
4. **Netlify** — viable, but the per-seat Pro pricing and metered bandwidth make it less attractive than Cloudflare for an ad-free public learning site.

---

## 7. Build & preview-deployment pricing (you run many preview builds)

This is a *separate bill line* from the runtime meters above (ISR/Edge/FOT), and for an active-development repo with many preview builds it can dominate. Your build is also **not cheap per run**: `npm run build` chains `fumadocs-mdx` (processing 758 lessons) → `build-almostnode-workers` → `next build`, on top of a `postinstall` that patches and rebuilds workers, with a very large dependency tree (Pyodide, WebR, sqlite-wasm, parquet-wasm, etc.). Every preview push pays that cost.

### How the platforms bill builds

| Platform | Included build allowance | Overage | Concurrency | Notes |
| --- | --- | --- | --- | --- |
| **Vercel Pro** | **6,000 build-minutes / mo** | **$0.014/min** (standard); enhanced/turbo machines cost ~2×/~9× more | **12 concurrent** builds | 45-min cap per build. Faster machines bill at a higher per-minute rate, so a "turbo" build that's 2× faster can still cost more in absolute dollars. |
| **Vercel Hobby** | No paid build minutes (free-tier builds only; not for commercial use) | — | 1 concurrent | The plan you're on now. |
| **Cloudflare (Workers/Pages CI)** | **3,000 build-min / mo Free**, **6,000 / mo Paid** | **$0.005/min** (Paid) | 1 default (more on Workers paid) | ~2.8× cheaper per overage minute than Vercel, and the free tier already includes 3,000 min. |

**Takeaway on the platform question:** Cloudflare's build minutes are both more generous on the free tier (3,000 vs Vercel's zero free paid-builds) and ~2.8× cheaper per overage minute ($0.005 vs $0.014). So if **build volume** is a real cost driver, that's another point in Cloudflare's favor — but the bigger wins are the build-hygiene fixes below, which apply on *either* host.

### Reduce preview-build spend (do these regardless of host)

You already have the most important lever in place — lean into it:

1. **You already skip no-op builds** (`scripts/vercel-ignore-build.sh` cancels deploys that only touch `agent-outputs/`). **Extend that `ignoreCommand`** to also skip pushes that only touch other non-shipping paths — `__tests__/`, `e2e/`, `*.md` docs, `.github/`, etc. Every skipped preview build is build-minutes saved at zero risk. This is the single highest-leverage change for your situation.
2. **Cache `node_modules` / the build cache.** Your `postinstall` rebuilds almostnode workers on every install — make sure the platform's dependency cache is warm between builds so you're not re-running heavy install steps each preview. (Vercel caches `node_modules` by commit; Cloudflare CI caches too. Verify it's actually hitting.)
3. **Don't rebuild on every commit to a PR.** Configure deploys so only the *latest* commit on a branch builds (Vercel cancels superseded queued builds automatically if enabled) rather than every intermediate push. Squash-style workflows or pushing less often cuts build count directly.
4. **Skip builds for draft PRs / WIP branches.** Only build previews for branches that are actually under review. You can gate this in the `ignoreCommand` (e.g. check `$VERCEL_GIT_COMMIT_REF` against a prefix like `wip/`) so experimental branches never trigger a paid build.
5. **Speed up the build itself.** Faster builds = fewer minutes. The `dynamic: true` Fumadocs mode already keeps the 758 lessons out of the bundler (good — see `source.config.ts`). Beyond that: ensure Turbopack is used for `next build` where stable, and confirm `build-almostnode-workers` output is cached rather than rebuilt from scratch each time.
6. **Run previews locally / in your own CI for throwaway work.** For rapid iteration that doesn't need a shareable URL, `next dev` or a local build avoids platform build minutes entirely; reserve preview deployments for changes you actually want to review or share.

> Net: the `ignoreCommand` extension (#1) plus build caching (#2) usually cut preview-build minutes the most, and they work the same on Vercel or Cloudflare. The platform difference (Cloudflare's cheaper, more-included minutes) is a secondary, additional saving.

---

## 8. Do the Phase 1 fixes still help if you move to Cloudflare?

**Yes — almost all of them carry over, they just optimize a different bill line.** None of the Phase 1 work is wasted if you later migrate.

| Phase 1 fix | Still useful on Cloudflare? | Why |
| --- | --- | --- |
| **Prefetch control** (`<Link prefetch={false}`, Fumadocs sidebar) | **Yes — arguably more so** | Cloudflare serves static lessons free, but any prefetch that hits a *dynamic* route (your future `/api/*`, auth-gated pages) is a billed **Worker request** + CPU. Fewer needless prefetches = fewer Worker invocations and less client bandwidth. The ISR-read meter disappears; the Worker-request meter takes its place, and prefetch discipline reduces that. |
| **`staleTimes`** (client router cache) | **Yes — host-independent** | This is pure client-side behavior. It reduces refetches and navigation requests no matter who hosts. |
| **Edge cache headers** (`s-maxage` on `/api/search`, `.md`) | **Yes — reframed** | On Vercel it saves metered ISR reads; on Cloudflare it raises CDN cache-hit ratio so requests are served from cache instead of invoking a Worker. Same code, still beneficial. |
| **Robots / crawler tightening** | **Yes — universal** | Bots hitting cold routes cost Worker invocations on Cloudflare just as they cost ISR reads on Vercel. Keeping crawlers off `/playground/*`, `/api/*`, etc. helps on every host. |
| **Offloading large assets to jsDelivr** | **Yes — still smart** | Keeps heavy WASM bandwidth off *any* host's bill. Already done; keep doing it. |

**The one thing that changes:** on Cloudflare there is **no ISR-read meter at all**, and static prerendered pages are served as **free** assets. So the *original problem* (ISR reads) largely evaporates on migration — but the Phase 1 fixes still pay off because Cloudflare bills **Worker requests + CPU time** for the dynamic routes you're about to add (auth, workspace save, Ask AI), and prefetch/caching discipline directly reduces *those*.

**Practical sequencing:** do Phase 1 now on Vercel (cheap, reversible, likely keeps you free). If you later migrate to Cloudflare for the backend features, you carry the same optimizations over unchanged — you'll just be reading a Worker-requests dashboard instead of an ISR-reads dashboard.

---

## 9. Recommended action plan

**Phase 1 — This week (no migration, reversible):**
1. Add a `<Link>` wrapper defaulting `prefetch={false}`; opt back in on primary nav only.
2. Disable/limit Fumadocs sidebar/TOC prefetch (check `DocsLayout`/sidebar item props for a prefetch pass-through).
3. Add `experimental.staleTimes` (`static: 300+`) in `next.config.ts`.
4. Add long `s-maxage` cache headers to `/api/search` and the `.md` route handlers.
5. Add a tightened `robots.ts` to keep crawlers off `/playground/*`, `/svg-gallery`, `/color-test`, `/api/*`, `*.md`.
6. **Cut build spend:** extend `scripts/vercel-ignore-build.sh` to also skip `__tests__/`, `e2e/`, `.github/`, and doc-only pushes; gate `wip/`-prefixed branches out of preview builds; confirm the dependency/build cache is warm (§7).
7. Re-check the Vercel usage dashboard after 3–5 days. This should drop ISR Reads / Edge Requests (and, from #6, build minutes) materially.

**Phase 2 — If usage still trends toward the cap, or once you start the backend (auth / workspace DB / Ask AI):**
8. For a *read-only* site staying lean: decide static-export feasibility (convert Orama to Fumadocs **static search**) → any static host removes the meter permanently.
9. **Once you add server features (the likelier path):** go **Cloudflare Workers + OpenNext** (not Pages — see §5.2). Lessons stay free static; auth/DB/AI run as Worker routes via D1/R2/AI-Gateway (§5.3). Validate Worker size and all 11 playgrounds + search in a preview before DNS cutover. Staying on Vercel is also fine — it supports all three features first-class; the tradeoff is the metered model. If you'd rather own the box than watch any dashboard, the **VPS + Coolify** path (§6.1) hosts the same hybrid — static lessons + Node API routes + one-click Postgres — for a flat monthly price, with Cloudflare's free CDN in front for global edge caching.

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
- [Cloudflare — Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Cloudflare Pages vs Workers 2026 (pricing, free plan, migration)](https://cogley.jp/articles/cloudflare-pages-to-workers-migration)
- [Better Auth + Cloudflare (D1, R2, Workers)](https://github.com/zpg6/better-auth-cloudflare)
- [Cloudflare Workers AI — overview](https://developers.cloudflare.com/workers-ai/)
- [Vercel — Managing builds](https://vercel.com/docs/builds/managing-builds)
- [Vercel — Pricing docs](https://vercel.com/docs/pricing)
- [Cloudflare Workers CI — builds limits & pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)
- [Coolify — official site](https://coolify.io/) / [Coolify pricing (self-hosted free, Cloud $5/mo)](https://coolify.io/pricing)
- [Coolify on GitHub (Apache 2.0, ~56k stars)](https://github.com/coollabsio/coolify)
- [Coolify docs — deploying Next.js](https://coolify.io/docs/applications/nextjs)
- [Coolify — GitHub PR preview deployments guide](https://lumadock.com/tutorials/coolify-github-pr-previews)
- [Coolify pricing breakdown 2026 (self-hosted vs Cloud)](https://temps.sh/blog/coolify-pricing-explained-2026)
- [DigitalOcean pricing in 2026 — plans and real costs](https://kuberns.com/blogs/digitalocean-pricing/)
- [DigitalOcean vs Hetzner 2026 (pricing, bandwidth, regions)](https://betterstack.com/community/guides/web-servers/digitalocean-vs-hetzner/)
- [Vercel vs Coolify in 2026](https://uibakery.io/blog/vercel-vs-coolify)

*Prepared from the live repository state (Next.js 16.2.4, Fumadocs, 758 static lessons, WASM runtimes offloaded to jsDelivr) and the attached Vercel ISR observability screenshots showing Writes = 0 across all routes.*
