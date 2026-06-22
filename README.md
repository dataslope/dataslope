# DataSlope

**Free, interactive learning for Data Science and Computer Science — right in your browser.**

DataSlope provides free learning materials and hands-on exercises built around in-browser playgrounds powered by WebAssembly. There's nothing to install: every playground runs fully client-side, so you can write and run real code the moment you open the page.

## What DataSlope offers

### 🖥️ Free mini IDEs (browser playgrounds)

Full-featured code editors that run language runtimes entirely in the browser via WebAssembly. No account required, no server round-trips. Available playgrounds include:

| Language | Runtime |
| --- | --- |
| Python | Pyodide (WASM) |
| R | WebR (WASM) |
| JavaScript | Native browser engine |
| TypeScript | In-browser transpilation |
| PHP | php-wasm (WASM) |
| C | Clang → WASM (Wasmer) |
| C++ | Clang → WASM (Wasmer) |
| Java | CheerpJ / OpenJDK (WASM) |
| C# | Roslyn on .NET WebAssembly (Mono) |
| SQLite | sql.js (WASM) |
| PostgreSQL | Remote connection shell |

### 📚 Free learning materials

Structured courses and guides covering Data Science and Computer Science topics. Learning pages can embed live, runnable code blocks so you can experiment with every concept as you read — no switching tabs, no copy-pasting into a separate editor.

### ✏️ Interactive exercises

Exercises are woven directly into the learning content. Run, tweak, and re-run code inline to build real intuition, not just reading comprehension.

## Deployment

DataSlope is deployed to Cloudflare Workers via the [OpenNext](https://opennext.js.org/cloudflare) adapter.

```bash
npm run cf:preview   # build + preview in the local Workers runtime
npm run cf:deploy    # build + deploy to Cloudflare
```

### One-time setup: incremental cache bucket

OpenNext serves the prerendered home page and `/learn/*` lessons from an R2-backed incremental cache (see `open-next.config.ts`). Without it the Worker re-renders those pages on demand and hits `node:fs`, which doesn't exist in the Workers runtime — returning a 500 (this is what caused `*.workers.dev` preview URLs to fail). Create the bucket once before the first deploy:

```bash
npx wrangler r2 bucket create dataslope-inc-cache
```

The bucket is bound as `NEXT_INC_CACHE_R2_BUCKET` in `wrangler.jsonc`. It is **populated at deploy time**, so the deploy command must run `opennextjs-cloudflare deploy` (which `npm run cf:deploy` does) — a bare `wrangler deploy` skips the populate step and leaves the cache empty. If you deploy via Cloudflare Workers Builds (the CI path that builds production and per-branch previews), configure its build settings as shown below.

### Cloudflare Workers Builds configuration

Production and preview deploys run through Cloudflare Workers Builds rather than the local `npm run cf:*` scripts, so its build settings (Workers → the `dataslope` worker → Settings → Build) must populate the R2 cache on **both** paths. The non-production (preview) command is the easy one to get wrong: a bare `npx wrangler versions upload` builds the Worker but skips the cache populate step, leaving previews with an empty cache that 500s the home page and `/learn/*`.

| Field | Value |
| --- | --- |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |
| Non-production branch deploy command | `npx opennextjs-cloudflare upload` |
| Path | `/` |

Both `deploy` (production) and `upload` (preview versions) populate the R2 cache before shipping — `upload` wraps `wrangler versions upload`, so previews get the same populated cache production does. `Path` is `/` because this Worker lives at the repo root; the CORS proxy under `cloudflare-cors-proxy/` is a separate Worker with its own config.

### Incremental cache cleanup

OpenNext keys cache objects as `incremental-cache/<buildId>/…`, so **every deploy — production and each preview — writes a fresh copy (~0.6 GB) under a new build ID, and nothing is pruned automatically.** Left alone the bucket grows ~0.6 GB per deploy.

A scheduled GitHub Action (`.github/workflows/r2-cache-cleanup.yml`) prunes it daily: it deletes every build folder that is **both** not the live production build **and** older than 3 days. The live production build is preserved regardless of age — important because a stable site can go weeks without a deploy, and deleting its cache would 500 the home page and `/learn/*` lessons. Superseded production builds and merged-PR previews age out 3 days after their last deploy.

The job identifies the live build by fetching [`/api/cache-build-id`](app/api/cache-build-id/route.ts) (the running Worker reports the exact `OPEN_NEXT_BUILD_ID` it serves from) and **aborts without deleting anything** if it can't positively identify that folder, so a transient error can never wipe the bucket. Trigger it manually with `dry_run` to preview deletions.

It needs three repository secrets (Settings → Secrets and variables → Actions), from an R2 API token with Object Read & Write:

| Secret | Value |
| --- | --- |
| `CF_ACCOUNT_ID` | Cloudflare account ID (the R2 S3 endpoint host) |
| `R2_ACCESS_KEY_ID` | R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret access key |

To change how long stale/preview cache lingers, edit `THRESHOLD_DAYS` in the workflow. The cost impact is small — at ~0.6 GB per retained build against R2's 10 GB free tier, even heavy deploy volumes stay within a few cents per month.

