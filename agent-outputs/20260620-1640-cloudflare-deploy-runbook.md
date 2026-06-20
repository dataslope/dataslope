# Deploying DataSlope to Cloudflare — GitHub CI, Previews & Custom Domain

**Date:** 2026-06-20
**Path:** A — Cloudflare Workers + OpenNext adapter (configured in PR #520 / branch `claude/beautiful-keller-oyj8tl`)
**Goal:** push-to-deploy from GitHub, per-PR preview URLs, production on `dataslope.com` + `www.dataslope.com`.

---

## ⚠️ Read first: plan requirement

The built Worker is **~9.96 MiB gzipped** (measured via `wrangler deploy --dry-run`).

| Cloudflare plan | Worker size limit | Result |
| --- | --- | --- |
| Workers **Free** | 3 MiB | ❌ deploy is **rejected** |
| Workers **Paid** ($5/mo) | 10 MiB | ✅ fits (≈38 KiB headroom) |

**You must be on the Workers Paid plan ($5/mo) for this deploy to succeed.** It fits today but with almost no headroom, so a future dependency bump could push it over 10 MiB. Two ways to buy headroom (optional, can be done later):
- **Trim the server bundle** — lazy-load the heavy client-only libs (Plotly ~4.4 MB, Mermaid, CodeMirror) with `next/dynamic({ ssr: false })` and externalize the prebuilt `public/_workers/*` from the server bundle. Realistically lands ~5–6 MiB.
- **Static export (Path B)** — the only way onto the Free plan (no Worker, no size limit, unlimited bandwidth), but requires converting search to client-side and was previously deferred.

Everything below assumes **Workers Paid**.

---

## What's already done (in the repo)

PR #520 added all the code/config: `wrangler.jsonc`, `open-next.config.ts`, the `initOpenNextCloudflareForDev()` call in `next.config.ts`, `public/_headers`, the `cf:*` npm scripts, `.gitignore` entries, the CORS-proxy allowlist update (Cloudflare prod + preview origins), and moved 17 MB of print artwork out of `public/`. The OpenNext build is verified green.

**Merge PR #520 to `main` first**, so production builds come from `main`.

---

## Step 1 — Make sure the domain is on Cloudflare

The custom-domain step needs `dataslope.com` managed as a Cloudflare **zone**.

1. Cloudflare dashboard → **Add a site** → `dataslope.com` → pick the **Free** plan for the zone (the zone plan is separate from the Workers Paid plan).
2. Cloudflare shows two nameservers. At your domain registrar, replace the current nameservers with those two.
3. Wait for the zone status to go **Active** (minutes to a few hours). You can do Steps 2–4 in parallel while this propagates.

> If `dataslope.com` is already a Cloudflare zone (e.g. the CORS proxy or current DNS already lives there), skip this step.

---

## Step 2 — Subscribe to Workers Paid

Dashboard → **Workers & Pages** → **Plans** → **Workers Paid** ($5/mo). Required for the worker size (see top).

---

## Step 3 — Connect the GitHub repo (Workers Builds = the "GitHub CI")

This is Cloudflare's native Git CI: it builds on every push and creates preview URLs for non-production branches — no GitHub Actions workflow to maintain. (If you'd rather run the build inside GitHub Actions, see the Appendix.)

1. Dashboard → **Workers & Pages** → **Create** → **Workers** → **Connect to Git**.
2. Authorize Cloudflare's GitHub app and select **`dataslope/dataslope`**.
3. Configure the build:
   - **Project / Worker name:** `dataslope` (must match `name` in `wrangler.jsonc`).
   - **Production branch:** `main`.
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
   - **Root directory:** repo root (leave default).
   - Cloudflare auto-detects `wrangler.jsonc` for `main`/`assets`/flags — don't override.
4. **Build watch paths** (optional, saves build minutes — mirrors your old `vercel-ignore-build.sh`): under the build settings, set *Excluded paths* to: `agent-outputs/*`, `__tests__/*`, `e2e/*`, `.github/*`, `cloudflare-cors-proxy/*`, `*.md`. Pushes touching only those won't trigger a build.

> Heads-up: the build is heavy (fumadocs over ~800 lessons + WASM-worker prebuild + `next build`). It completes fine but takes several minutes; Cloudflare's build container handles the memory.

---

## Step 4 — Environment variables

In the Worker's **Settings → Variables and Secrets**, add for **both Production and Preview**:

| Name | Value | Type |
| --- | --- | --- |
| `NEXT_PUBLIC_CORS_PROXY_URL` | `https://dataslope-cors-proxy.subwaymatch.workers.dev` | Plain text (it's a public build-time var) |

(Mirror any other `NEXT_PUBLIC_*` you set on Vercel/Netlify. There are no server secrets today.)

---

## Step 5 — First production deploy + smoke test

1. Trigger a build (merge to `main`, or **Retry deployment** in the dashboard).
2. When it finishes, open the printed `https://dataslope.subwaymatch.workers.dev` and verify:
   - [ ] Home page + a `/learn` lesson render; sidebar nav works
   - [ ] **Search** (`/api/search`) returns results
   - [ ] A raw-markdown URL works (`/learn/<some-lesson>.md`)
   - [ ] 3–4 playgrounds boot: **Python, R, Java, PostgreSQL** (these exercise the CDN runtime fetches + the CORS proxy)
   - [ ] `/robots.txt` looks right

If a playground's network feature 403s, it's the CORS proxy allowlist — see Step 7.

---

## Step 6 — Preview deployments (per branch / PR)

With Workers Builds connected, **every non-production branch push gets its own preview URL** automatically, formatted:

```
https://<branch-or-version>-dataslope.subwaymatch.workers.dev
```

The CORS proxy allowlist already includes `https://*-dataslope.subwaymatch.workers.dev` (committed in PR #520), so playground network features work on previews too. Cloudflare also posts the preview URL back on the PR. Nothing else to configure.

---

## Step 7 — Connect the custom domain (`dataslope.com` + `www`)

Once the zone is **Active** (Step 1) and production is verified (Step 5):

1. Worker → **Settings → Domains & Routes** → **Add → Custom Domain**.
2. Add **`dataslope.com`**, then **Add** again for **`www.dataslope.com`**.
3. Cloudflare automatically creates the proxied (orange-cloud) DNS records and provisions the TLS certificate — no manual CNAME needed. Wait for the cert to go active (usually minutes).
4. Decide canonical host (recommended apex `dataslope.com`):
   - Either add both as custom domains (both serve the app), **or**
   - Add `dataslope.com` as the custom domain and create a **Bulk Redirect / Redirect Rule** `www.dataslope.com/* → https://dataslope.com/$1` (301) so `www` folds into the apex.
5. Re-run the Step 5 smoke test against `https://dataslope.com`.

---

## Step 8 — Redeploy the CORS proxy with the new allowlist

The allowlist change is committed but the **proxy worker is deployed separately** — push it once:

```bash
cd cloudflare-cors-proxy
npx wrangler deploy
```

`dataslope.com` and `www.dataslope.com` were already in the allowlist, so production playgrounds work either way; this redeploy adds the new `workers.dev` preview origins.

---

## Step 9 — Cut over and decommission

1. Confirm `https://dataslope.com` serves correctly from Cloudflare and search/playgrounds pass.
2. Remove the domain from Vercel/Netlify (so only Cloudflare serves it).
3. Optionally delete `vercel.json` from the repo and remove the Vercel preview wildcard from the CORS-proxy `ALLOWED_ORIGINS` once you're sure you won't roll back.
4. Keep the jsDelivr/unpkg runtime offload exactly as-is — it's host-independent.

---

## Appendix — GitHub Actions alternative (if you want the build to run in GitHub, not Cloudflare)

Prefer this only if you specifically want CI inside GitHub Actions (e.g. to gate deploys on your test suite). It replaces Steps 3 & 6.

1. Create a Cloudflare API token (**My Profile → API Tokens → Edit Cloudflare Workers** template). Add it to the repo as secret `CLOUDFLARE_API_TOKEN`, and your account ID as `CLOUDFLARE_ACCOUNT_ID`.
2. Add `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]
  pull_request:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx opennextjs-cloudflare build
      - name: Deploy (production on main, versioned preview on PRs)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: ${{ github.ref == 'refs/heads/main' && 'deploy' || 'versions upload' }}
```

`versions upload` on PRs produces a preview URL (the `<version>-dataslope.subwaymatch.workers.dev` form already in the CORS allowlist); `deploy` on `main` ships production. The custom-domain steps (Step 7) are identical.

> I can add this workflow file to the repo if you choose this route — just say so.

---

## Quick reference

| Action | Command / location |
| --- | --- |
| Local prod-runtime preview | `npm run cf:preview` |
| Manual deploy from your machine | `npx wrangler login` then `npm run cf:deploy` |
| Check worker size before deploy | `npx opennextjs-cloudflare build && npx wrangler deploy --dry-run` |
| Redeploy CORS proxy | `cd cloudflare-cors-proxy && npx wrangler deploy` |
| Production URL (pre-domain) | `https://dataslope.subwaymatch.workers.dev` |

## Sources
- [OpenNext — Cloudflare get started](https://opennext.js.org/cloudflare/get-started)
- [Cloudflare Workers — Next.js framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [Cloudflare Workers Builds — Git integration & limits](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Cloudflare Workers — Preview URLs](https://developers.cloudflare.com/workers/configuration/previews/)
- [Cloudflare Workers — Custom domains & routes](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Workers — platform limits (3 MiB Free / 10 MiB Paid)](https://developers.cloudflare.com/workers/platform/limits/)
- [cloudflare/wrangler-action](https://github.com/cloudflare/wrangler-action)
