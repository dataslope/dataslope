# Moving DataSlope to Cloudflare — Cost Review & Migration Guide

**Date:** 2026-06-20
**Project:** DataSlope (`dataslope/dataslope`)
**Stack:** Next.js 16.2.4 (App Router) + Fumadocs MDX · ~800 prerendered `/learn` lessons · 11 in‑browser WASM playgrounds
**Trigger:** Vercel Hobby free quota exhausted; temporarily on Netlify; want to move to Cloudflare.

> Companion to `agent-outputs/20260612-1620-vercel-isr-edge-usage-and-hosting-report.md`, which diagnosed *why* Vercel's ISR/Edge meters were high. This report answers the two concrete questions you asked now: **(1)** what in the codebase actually drives host cost, and **(2)** exact steps + required changes to deploy on Cloudflare.

---

## TL;DR

1. **Your codebase is already unusually cost‑lean.** Every heavy asset — all 11 WASM runtimes (Pyodide, WebR, DuckDB, SQLite, PHP, Clang, CheerpJ/Java, .NET, the formatters), the .NET bundle (~35 MB), Java's `tools.jar` (~18 MB), PGlite, and the sample datasets — is loaded from **external CDNs (jsDelivr / unpkg / pyodide.org / r-wasm.org / leaningtech)**, *not* from your host. The host only ever serves the Next.js HTML/JS/CSS. This is the single most important cost decision and it's already done.

2. **There is exactly one server function in the whole app:** `GET /api/search` (Fumadocs/Orama). Everything else is static — prerendered pages and `force-static` route handlers. So "server compute cost" is nearly nil today; the cost you hit on Vercel was the **ISR‑read/edge‑request meter** caused by Next 16 prefetch fan‑out across ~800 lessons, *not* heavy compute.

3. **Cloudflare removes the exact meter that bit you.** Static prerendered pages are served as **free assets with unlimited bandwidth** and there is **no per‑ISR‑read meter**. Your one search function becomes a cheap Worker request (or can be eliminated — see §3).

4. **Two viable Cloudflare targets:**
   - **Path A — Workers + OpenNext adapter** (`@opennextjs/cloudflare`): keeps the app exactly as‑is (the search route keeps working server‑side), supports Next 16. ~30–60 min of setup. **Recommended** — lowest‑risk, and it's the shape you'll want once you add the planned auth/DB/AI backend.
   - **Path B — Pure static export** (`output: "export"`): cheapest/simplest, but you must convert search to Fumadocs **static/client search** and drop the two server route handlers. Good only while the site stays read‑only.

5. **Required code changes are small** (Path A): add the adapter + `wrangler.jsonc` + `open-next.config.ts`, one line in `next.config.ts`, a `public/_headers` cache rule, and point the CORS‑proxy allowlist at your Cloudflare domain. Full diffs in §4.

6. **Two cleanups worth doing regardless of host:** (a) `public/logo-files/EPS/*.eps` ships **~17 MB of source artwork** to the live site for no user benefit — remove from `public/`; (b) the Vercel‑specific `vercel.json` ignore‑build logic has a Cloudflare equivalent (§6).

---

## Part 1 — Codebase cost review

### 1.1 What actually costs money on a host like Vercel/Netlify

| Cost driver | Billed as (Vercel / Netlify) | DataSlope's exposure |
| --- | --- | --- |
| Static page/asset **bandwidth** | Fast Data Transfer / Bandwidth (100 GB free on Netlify) | **Low–moderate.** Only Next HTML/JS/CSS. All WASM + datasets are off‑host (see 1.2). |
| **Server function** invocations | Functions / Edge Functions | **Minimal.** Exactly one function: `/api/search`. |
| **ISR reads / edge requests** on cache miss | Vercel ISR Reads, Edge Requests | **This is what bit you** — prefetch fan‑out over ~800 lessons (diagnosed in the 06‑12 report). |
| **Image optimization** transforms | Image Optimization units (Netlify bills these separately) | **Zero.** You don't render `next/image` — only raw `<img>` and `data:` URIs (confirmed in `Playground.tsx`). No optimizer is ever invoked. |
| **Build minutes** | Build minutes (Netlify: 300 min/mo free) | **Heavy per build** (fumadocs‑mdx over ~800 lessons + WASM‑worker prebuild), so preview volume matters. |

### 1.2 The big win you've already banked — runtimes are off‑host

Verified in `app/_components/runtime/`: every large binary is fetched from a third‑party CDN at runtime, so **your host serves none of it**:

| Runtime / asset | Source (not your host) | Reference |
| --- | --- | --- |
| Python (Pyodide) | `cdn.jsdelivr.net/pyodide/…` | `pyodide-worker.ts` |
| R (WebR) | `webr.r-wasm.org` (WebR default CDN) | `r.tsx` (`new WebR()`) |
| DuckDB‑WASM | `cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm` | `duckdb.ts` |
| SQLite‑WASM | `cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm` | `sqlite-wasm.ts` |
| C/C++ (browsercc/Clang) | `cdn.jsdelivr.net/npm/browsercc` | `browsercc-worker.ts` |
| Java (CheerpJ + tools.jar) | `cjrtnc.leaningtech.com` + `unpkg.com/dataslope-tools-jar` | `cheerpj.ts`, `cdn.ts` |
| C# (.NET WASM, ~35 MB) | `cdn.jsdelivr.net/gh/dataslope/dataslope@…/cdn-assets` | `cdn.ts` |
| PHP (php‑wasm) | `unpkg.com/php-wasm` | `php-worker.ts` |
| PostgreSQL (PGlite) | `cdn.jsdelivr.net/npm/@electric-sql/pglite` | `cdn.ts` |
| Formatters (ruff/clang/web/mago) | `cdn.jsdelivr.net/npm/@wasm-fmt/*` | `clangFormat.ts`, etc. |
| Sample datasets | `cdn.jsdelivr.net/gh/dataslope/datasets` | `duckdbSamples.ts`, `remoteDatasets.ts` |

**Implication for migration:** because none of this touches the host, your Cloudflare (or Netlify) bandwidth bill is essentially just the Next app shell. This is why a host swap is low‑risk — the expensive bytes never depended on the host in the first place. Keep this pattern for any future large asset.

### 1.3 The only server‑side surface

- **`app/api/search/route.ts`** — Fumadocs/Orama search. The *one* genuine server function. Already sends `s-maxage=86400` so repeat queries are CDN hits. On Cloudflare this is one cheap Worker route (Path A) or can be removed entirely (Path B / static search).
- **`app/llms/learn/[[...slug]]/route.ts`** — raw‑Markdown mirror. `export const dynamic = "force-static"` + `generateStaticParams()` → **prerendered at build, not a runtime function.** Reads files only at build time.
- **`app/learn/[[...slug]]/page.tsx`** — all lessons prerendered via `generateStaticParams()`. Fumadocs `dynamic: true` mode compiles MDX from disk **at build time** for these params, so there's no request‑time filesystem access in production. (Good to know for Cloudflare: no runtime `fs` needed for the happy path.)
- **No middleware, no `use server` actions, no `runtime = "edge"`** anywhere — confirmed. This makes the OpenNext adapter path low‑risk (those are its main caveats).

### 1.4 Concrete cost liabilities found in the repo

1. **`public/logo-files/EPS/*.eps` — ~17 MB of source artwork shipped to production.** Three EPS files (5–6 MB each) live under `public/`, so they're publicly fetchable and deployed to every host. They are print/source assets, not web assets, and nothing references them. **Action:** move `public/logo-files/` out of `public/` (e.g. to a `brand-assets/` folder excluded from deploy, or Git LFS / a release). Saves deploy size and removes a hotlink/crawl bandwidth liability on any host.
2. **`public/` is ~19 MB total**, ~17 MB of which is the EPS above. After removing those it's ~2 MB — negligible.
3. **`cdn-assets/` (35 MB) and `tools-jar/`** are in the repo but **correctly excluded from the served output** (offloaded to jsDelivr/unpkg per `cdn.ts`). No action — just don't ever move them into `public/`.
4. **Build cost**: `npm run build` runs `fumadocs-mdx` over ~800 lessons + `build-almostnode-workers` + `build-svg-gallery-data` + `next build`, on a large dep tree. On Netlify's 300 free build‑min/mo this is the line you'll hit *next* if you push many previews. Cloudflare's CI gives 3,000 build‑min/mo free (§6).

### 1.5 Netlify‑specific note (your current temporary host)

Netlify's free tier is **100 GB bandwidth/mo, 300 build‑min/mo, 125k serverless‑function calls/mo**, and it bills **image‑optimization** and **edge functions** separately. Your risk profile there:
- Bandwidth: low (runtimes off‑host) unless the EPS files get crawled — fix §1.4.
- Functions: only `/api/search` → well under 125k unless heavily searched/crawled (your `robots.ts` already disallows `/api/`).
- Build minutes: **the most likely Netlify ceiling**, same as Vercel — heavy build × many previews. The mitigations in the 06‑12 report (§7) and §6 below apply.

So Netlify will probably *also* be fine for a while, but it has the same metered shape (bandwidth + builds + per‑seat Pro at $19/seat) that prompted the move. Cloudflare's flat, unlimited‑bandwidth model is the structural fix.

---

## Part 2 — Why Cloudflare fits this project

- **No ISR‑read meter** — the exact charge that exhausted your Vercel quota does not exist on Cloudflare.
- **Unlimited bandwidth on all plans**, including Free; prerendered pages are served as **free static assets**.
- **Free tier covers you:** Workers Free = 100,000 requests/day; static‑asset requests are free and don't count against that. ~800 static lessons + a handful of dynamic routes sits comfortably inside Free.
- **Next 16 is supported** by `@opennextjs/cloudflare` (all 16.x minor/patch releases).
- **You don't trip the adapter's caveats:** no edge runtime, no middleware, Linux/CI build — all the things that make OpenNext painful are absent here.
- **Future‑proof:** when you add the planned accounts / workspace DB / "Ask AI", the same Worker can call **D1 / R2 / AI Gateway**, no second platform needed.

The honest cons (unchanged from the 06‑12 report): OpenNext is an adapter layer (new Next features can lag; you debug one more layer), and the deployed **Worker has a size limit** (3 MiB compressed Free / 10 MiB Paid) — verify yours after the first build (it'll almost certainly be fine since the heavy bytes are off‑host).

---

## Part 3 — Pick your target

### Path A — Workers + OpenNext (recommended)
Keeps the app **as‑is**, including the server search route. Best balance of effort vs. risk, and it's the right base for the planned backend.

### Path B — Pure static export (`output: "export"`)
Cheapest/simplest, **no server runtime at all**, but requires:
- Converting `app/api/search/route.ts` → Fumadocs **static search** (build‑time index + client‑side search). Fumadocs `createFromSource` exposes a `staticGET` for exactly this; the search UI switches to client mode.
- Dropping/relocating the `.md` mirror route (it's already static, but `output: export` has constraints on route handlers — simplest is to emit the `.md` files as static assets or keep them only if export accepts the `force-static` handler).
- Removing the `redirects()`/`rewrites()` in `next.config.ts` that don't survive static export, replacing the `/learn/*.md` rewrite with Cloudflare `_redirects`.

**Recommendation:** go **Path A now**. It's less work than Path B's search conversion, preserves behavior, and you won't have to undo it when the backend lands. Revisit Path B only if you want the absolute‑zero‑compute setup and are happy to convert search.

The rest of this report details **Path A**.

---

## Part 4 — Path A: required changes (exact)

All paths relative to repo root. Nothing here affects local `next dev` behavior except the one harmless init call.

### 4.1 Install adapter + Wrangler

```bash
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest   # needs >= 3.99
```

### 4.2 `wrangler.jsonc` (new file, repo root)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "dataslope",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    { "binding": "WORKER_SELF_REFERENCE", "service": "dataslope" }
  ]
}
```
(`nodejs_compat` matters here — Fumadocs/Orama and the build‑time `node:fs` reads expect Node APIs. You already use `nodejs_compat` in `cloudflare-cors-proxy/wrangler.toml`, so this is familiar.)

### 4.3 `open-next.config.ts` (new file, repo root)

Minimal config is fine — the site is static, so you don't strictly need an incremental cache. If you want ISR/`revalidate` to work later, wire R2:

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// Optional now (no revalidation today); enables ISR caching when you add it:
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  // incrementalCache: r2IncrementalCache,
});
```

### 4.4 `next.config.ts` — add the dev init call

At the **top** of `next.config.ts`, add:

```typescript
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
```

This only affects `next dev` (gives local access to Cloudflare bindings); it's a no‑op for the production build. Your existing `withMDX(nextConfig)` export, `redirects`, `rewrites`, and `staleTimes` all stay exactly as they are — OpenNext supports them.

> Note on the `/_dotnet/` redirect and `/learn/*.md` rewrite: both are standard Next config features and are honored by OpenNext, so no change needed. (Under Path B they would have needed `_redirects`; under Path A they keep working.)

### 4.5 `public/_headers` (new file) — long‑cache immutable assets

```
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable
```

This is the Cloudflare equivalent of the edge‑cache reinforcement you already do in the route handlers. Your route handlers' own `Cache-Control` headers continue to work through the Worker.

### 4.6 `package.json` scripts

Add Cloudflare scripts (keep your existing `build`/`dev`/`start` for local + other hosts):

```jsonc
{
  "scripts": {
    // ...existing...
    "cf:preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "cf:deploy":  "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
  }
}
```
`opennextjs-cloudflare build` runs your normal `next build` (and therefore your full `fumadocs-mdx` + worker‑prebuild chain via the `build` script's prerequisites) and then transforms the output into `.open-next/`.

> Heads‑up: your `build` script and `postinstall` run `fumadocs-mdx` + `build-almostnode-workers.mjs` + `build-svg-gallery-data.mjs`. These are plain Node steps and run fine in Cloudflare's build environment — but make sure the Cloudflare build command is your **full `npm run build`** (or that `opennextjs-cloudflare build` invokes it), not a bare `next build`, or the prebuilt workers / svg‑gallery data won't be generated.

### 4.7 `.gitignore` — add the build output

```
# OpenNext Cloudflare build output
.open-next
```

### 4.8 CORS proxy + env — point at the Cloudflare origin

Two touch‑points so the playgrounds' proxied fetches keep working from the new domain:

1. **`cloudflare-cors-proxy/wrangler.toml`** — add your Cloudflare hostname(s) to `ALLOWED_ORIGINS` (or set the production secret). E.g. `https://dataslope.com` is already listed; add the `*.workers.dev` preview host you'll deploy under, e.g. `https://dataslope.<your-subdomain>.workers.dev`, and drop the Vercel preview wildcard once you've cut over:
   ```toml
   ALLOWED_ORIGINS = "http://localhost:3000,https://dataslope.com,https://www.dataslope.com,https://dataslope.<your-subdomain>.workers.dev"
   ```
   Then redeploy the proxy: `cd cloudflare-cors-proxy && npx wrangler deploy`.
2. **`NEXT_PUBLIC_CORS_PROXY_URL`** stays the same (the proxy URL doesn't change). Set it in the Cloudflare project's environment variables (mirror your current `.env`/Vercel value: `https://dataslope-cors-proxy.subwaymatch.workers.dev`).

### 4.9 Cleanup (do once)

- Remove `public/logo-files/EPS/*.eps` from the deployed tree (§1.4).
- You can keep `vercel.json` if you might return to Vercel; it's ignored by Cloudflare. If you're fully cutting over, delete it.
- No `export const runtime = "edge"` to remove (you have none) and no `@cloudflare/next-on-pages` installed — nothing to uninstall.

---

## Part 5 — Deployment steps (start to finish)

### Option 1 — CLI deploy (fastest to validate)

```bash
# 0. one-time: Cloudflare account + login
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest
npx wrangler login

# 1. add the files from §4 (wrangler.jsonc, open-next.config.ts,
#    next.config.ts init line, public/_headers, package.json scripts, .gitignore)

# 2. build + preview in the real Workers runtime LOCALLY first
npm run cf:preview
#    -> open the printed localhost URL. Smoke-test:
#       - homepage, a /learn lesson, sidebar nav
#       - /api/search returns results
#       - a /learn/<slug>.md raw-markdown URL
#       - 2-3 playgrounds actually boot (Python, SQLite, R) — confirms the
#         off-host CDN fetches + the CORS proxy still work

# 3. deploy
npm run cf:deploy
#    -> prints https://dataslope.<your-subdomain>.workers.dev
```

### Option 2 — Git-connected (deploy on push, PR previews) — recommended steady state

1. Cloudflare dashboard → **Workers & Pages → Create → Connect to Git** → select `dataslope/dataslope`.
2. **Build command:** `npx opennextjs-cloudflare build` (ensure it runs your full `npm run build` chain — set `npm run build` as a prerequisite or use `npm run build && npx opennextjs-cloudflare build` if needed).
   **Deploy command:** `npx opennextjs-cloudflare deploy`.
   **Output dir:** `.open-next` (the adapter handles assets/worker split).
3. Add env var `NEXT_PUBLIC_CORS_PROXY_URL` (and any future secrets).
4. Set the **production branch** to `main`; preview deployments are created for other branches/PRs automatically.
5. First deploy runs; verify the smoke‑test list from Option 1 on the preview URL.

### Cut over DNS (when validated)

- In Cloudflare dashboard → your Worker → **Custom Domains** → add `dataslope.com` and `www.dataslope.com`.
- If the domain's DNS is already on Cloudflare, this is a couple of clicks (Cloudflare wires the route). If not, move the domain's nameservers to Cloudflare first (free plan).
- Keep the old Vercel/Netlify deployment live until the Cloudflare domain serves correctly, then flip and decommission.

### Post‑cutover checklist
- [ ] `/learn` lessons render + sidebar/search work
- [ ] `/api/search` returns results from the deployed Worker
- [ ] `/learn/<slug>.md` mirror serves `text/markdown`
- [ ] All 11 playgrounds boot (spot‑check Python, R, Java, C#, PostgreSQL — the CDN‑heavy ones)
- [ ] CORS proxy `ALLOWED_ORIGINS` includes the live Cloudflare domain (else proxied `fetch` from playgrounds 403s)
- [ ] `robots.ts` output looks right at `/robots.txt`
- [ ] Worker size under the plan limit (the deploy command reports it)

---

## Part 6 — Build hygiene on Cloudflare (replaces `vercel.json`)

Your `scripts/vercel-ignore-build.sh` (skip no‑op deploys for `wip/` branches and non‑shipping paths) is Vercel‑specific. Cloudflare's Git builds support an equivalent so you don't burn build minutes on doc‑only/test‑only pushes:

- Cloudflare Workers Builds lets you configure **build watch paths** (include/exclude globs) and **non‑production branch** build control in the dashboard. Mirror your `EXCLUDE_PATHSPECS` there: exclude `agent-outputs/`, `__tests__/`, `e2e/`, `.github/`, `cloudflare-cors-proxy/`, and the top‑level docs.
- Cloudflare CI free tier is **3,000 build‑min/mo** (vs Netlify's 300, Vercel Hobby's none for paid builds), so build volume is far less likely to bite — but the watch‑path excludes are still worth setting.

The other build‑cost levers from the 06‑12 report (warm dependency cache, don't rebuild every intermediate commit, build previews only for branches under review) apply unchanged.

---

## Part 7 — What does NOT need to change

- **All 11 WASM runtimes** — already off‑host via CDN; untouched by the migration.
- **`next.config.ts` `redirects`/`rewrites`/`staleTimes`/`optimizePackageImports`** — supported by OpenNext; keep as‑is.
- **The two route handlers** — keep working server/static on Path A.
- **No `next/image` migration** — you don't use it.
- **The CORS proxy Worker itself** — already on Cloudflare; only its allowlist needs the new origin (§4.8).
- **The jsDelivr/unpkg offload pattern** (`cdn.ts`) — keep using it for any new large asset.

---

## Part 8 — Recommendation

1. **Do the two cleanups now** (remove EPS from `public/`; note build‑hygiene) — they help on Vercel, Netlify, *and* Cloudflare.
2. **Migrate via Path A (Workers + OpenNext).** It's ~30–60 min of config, changes no app behavior, keeps your one search function working, and is the correct base for the planned accounts/DB/AI backend. Use the **Git‑connected** deploy for push‑to‑deploy + PR previews.
3. **Skip Path B (static export)** unless you specifically want zero server runtime and are willing to convert Fumadocs search to its static/client mode — more work now, and you'd undo it when the backend lands.
4. **Keep the CORS proxy** exactly where it is; just update `ALLOWED_ORIGINS`.

Net effect: the ISR‑read meter that exhausted your Vercel quota **ceases to exist**, bandwidth is unlimited and free, your ~800 lessons serve as free static assets, and you stay on the Free plan with large headroom — while keeping a clean upgrade path to D1/R2/AI Gateway later.

---

## Sources

- [OpenNext — Cloudflare adapter (get started)](https://opennext.js.org/cloudflare/get-started)
- [OpenNext — Cloudflare overview & Next.js version support](https://opennext.js.org/cloudflare)
- [@opennextjs/cloudflare — npm](https://www.npmjs.com/package/@opennextjs/cloudflare)
- [Cloudflare Workers — Next.js framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare — Deploying Next.js apps to Workers with the OpenNext adapter](https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/)
- [Cloudflare Workers — Static assets & pricing (free static-asset requests)](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers CI — builds limits & pricing (3,000 free build-min/mo)](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)
- [Netlify — pricing & free-tier limits (bandwidth, build minutes, functions)](https://www.netlify.com/pricing/)
- [Fumadocs — search (server + static/client modes)](https://fumadocs.dev/docs/headless/search)
- Repo evidence: `app/_components/runtime/cdn.ts`, `pyodide-worker.ts`, `r.tsx`, `duckdb.ts`, `sqlite-wasm.ts`, `cheerpj.ts`, `php-worker.ts`; `app/api/search/route.ts`; `app/llms/learn/[[...slug]]/route.ts`; `app/learn/[[...slug]]/page.tsx`; `next.config.ts`; `vercel.json`; `scripts/vercel-ignore-build.sh`; `cloudflare-cors-proxy/wrangler.toml`.
- Prior analysis: `agent-outputs/20260612-1620-vercel-isr-edge-usage-and-hosting-report.md`.
</content>
</invoke>
