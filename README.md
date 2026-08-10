# DataSlope

**Free, interactive learning for Data Science and Computer Science, right in your browser.**

DataSlope provides free learning materials and hands-on exercises built around in-browser playgrounds powered by WebAssembly. There's nothing to install: every playground runs fully client-side, so you can write and run real code the moment you open the page.

## What DataSlope offers

### 🖥️ Free mini IDEs (browser playgrounds)

Full-featured code editors that run language runtimes entirely in the browser via WebAssembly. Sign-in optional, no server round-trips. Available playgrounds include:

| Language | Runtime |
| --- | --- |
| Python | Pyodide (WASM) |
| R | WebR (WASM) |
| JavaScript | Native browser engine |
| TypeScript | In-browser transpilation |
| PHP | php-wasm (WASM) |
| C | browsercc (Clang → WASM) |
| C++ | browsercc (Clang → WASM) |
| Java | CheerpJ / OpenJDK (WASM) |
| C# | Roslyn on .NET WebAssembly (Mono) |
| SQLite | SQLite (official WASM build) |
| PostgreSQL | PGlite (WASM) |
| DuckDB | DuckDB-Wasm (WASM) |

### 📚 Free learning materials

Structured courses and guides covering Data Science and Computer Science topics. Learning pages can embed live, runnable code blocks so you can experiment with every concept as you read, no switching tabs, no copy-pasting into a separate editor.

### ✏️ Interactive exercises

Exercises are woven directly into the learning content. Run, tweak, and re-run code inline to build real intuition, not just reading comprehension.

## Deployment

DataSlope is deployed to Cloudflare Workers via the [OpenNext](https://opennext.js.org/cloudflare) adapter.

```bash
npm run cf:preview   # build + preview in the local Workers runtime
npm run cf:deploy    # build + deploy to Cloudflare
```

### Static asset file count

Cloudflare caps the static-asset files in a **single Worker version** at [20,000 on the free plan and 100,000 on Workers Paid](https://developers.cloudflare.com/workers/platform/limits/#static-assets), with a 25 MiB ceiling on any individual file. That cap is content-driven here rather than code-driven: `.open-next/assets` is mostly per-lesson output (one `.md` mirror per course, several `.webp` illustrations per lesson), so it creeps up with authoring. `npm run cf:deploy` and `npm run cf:preview` check it between the build and the upload, and it can be run on its own against an existing build:

```bash
npx opennextjs-cloudflare build   # the count only exists after a build
npm run check:assets              # add -- --plan=free to check the lower cap
```

At the time of writing that reports **5,222 files, 5.2% of the 100,000 limit**, the largest being a 6.2 MiB wasm bundle. The ~1,600 prerendered pages are not part of that number: they are served from the R2 incremental cache (below), and the assets directory contains no HTML at all.

Two things to know if you cross-check this by hand. `wrangler deploy` logs "Read N files from the assets directory" from a plain recursive `readdir`, so **its N includes directory entries** (5,268 against 5,222 real files); the manifest it uploads skips directories and symlinks and applies `.assetsignore`, which is what `check:assets` mirrors. And the effective cap is server-side, read from the upload token's `max_file_count_allowed` claim, defaulting to 20,000 when absent — the plan numbers in the script are a local mirror of an account property. Using the raised limit also needs wrangler ≥ 4.34.0.

### One-time setup: incremental cache bucket

OpenNext serves the prerendered home page and `/courses/*` lessons from an R2-backed incremental cache (see `open-next.config.ts`). Without it the Worker re-renders those pages on demand and hits `node:fs`, which doesn't exist in the Workers runtime, returning a 500 (this is what caused `*.workers.dev` preview URLs to fail). Create the bucket once before the first deploy:

```bash
npx wrangler r2 bucket create dataslope-inc-cache
```

The bucket is bound as `NEXT_INC_CACHE_R2_BUCKET` in `wrangler.jsonc`. It is **populated at deploy time**, so the deploy command must run `opennextjs-cloudflare deploy` (which `npm run cf:deploy` does), a bare `wrangler deploy` skips the populate step and leaves the cache empty. If you deploy via Cloudflare Workers Builds (the CI path that builds production and per-branch previews), configure its build settings as shown below.

### Recommended: a Cache Rule for lesson HTML

A Worker runs *ahead* of Cloudflare's CDN cache, and its response is not stored there unless something explicitly puts it there. Next sets `s-maxage=31536000` on every prerendered page, but that header buys nothing on the first hop: page responses come back with **no `cf-cache-status` header at all**, while `/_next/static/*` (served by the assets binding, not the Worker) reports `cf-cache-status: HIT`. So today every visitor to a lesson costs a Worker invocation plus an R2 read, and two readers of the same page share nothing.

`open-next.config.ts` closes half of that gap in code: `withRegionalCache` fronts R2 with the per-data-centre Cache API, so the first reader in a colo pays the R2 round trip and everyone behind them is served locally. The Worker invocation itself can only be skipped from the origin side, which is dashboard configuration:

> Caching → Cache Rules → **Create rule**
> - **If** URI Path starts with `/courses/` (add `/interview-prep/` and `/fumadocs-dev/` to taste)
> - **Then** Eligible for cache, Edge TTL → *Use cache-control header if present*

This is safe here because lesson content only changes on deploy and every asset URL is build-ID-scoped, so a new deploy can never be served the previous build's HTML. Leave `/api/*` out of the rule: those routes are `force-dynamic` and several are per-user.

### Cloudflare Workers Builds configuration

Production and preview deploys run through Cloudflare Workers Builds rather than the local `npm run cf:*` scripts, so its build settings (Workers → the `dataslope` worker → Settings → Build) must populate the R2 cache on **both** paths. The non-production (preview) command is the easy one to get wrong: a bare `npx wrangler versions upload` builds the Worker but skips the cache populate step, leaving previews with an empty cache that 500s the home page and `/courses/*`.

| Field | Value |
| --- | --- |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy && npm run db:seed:search:remote` |
| Non-production branch deploy command | `npx opennextjs-cloudflare upload` |
| Path | `/` |

Both `deploy` (production) and `upload` (preview versions) populate the R2 cache before shipping, `upload` wraps `wrangler versions upload`, so previews get the same populated cache production does. `Path` is `/` because this Worker lives at the repo root; the CORS proxy under `cloudflare-cors-proxy/` is a separate Worker with its own config.

The search re-seed is appended to the **production** deploy command only, and the ordering is deliberate on both counts. It runs after `deploy` so a hiccup rebuilding the search index can never block shipping the site itself. And it is absent from the preview command because there is one `dataslope-search` database and one set of rows in it: a preview build that seeded would overwrite production's index with a feature branch's content, and nothing would look broken until someone searched.

`db:seed:search:remote` no-ops when no indexed content changed, so the many deploys that touch a component and no lesson cost nothing — see [Search](#search) for how that is decided, and for the **D1 (edit)** permission the build's API token needs before any of this works.

### Incremental cache cleanup

OpenNext keys cache objects as `incremental-cache/<buildId>/…`, so **every deploy, production and each preview, writes a fresh copy (~1–1.4 GB: one HTML+RSC `.cache` object per prerendered page, ~1,600 of them) under a new build ID, and nothing is pruned automatically.** Left alone the bucket grows by that much per deploy, at active-development velocity that's tens of GB within days.

A scheduled GitHub Action (`.github/workflows/r2-cache-cleanup.yml`) prunes it every 6 hours, **one cache per active branch**. This works because the build ID is the deployed commit SHA, `next.config.ts` sets `generateBuildId` to `WORKERS_CI_COMMIT_SHA` on Workers Builds, so a cache folder's name is the commit it was built from. The job maps each folder to the **open pull request** whose head is that commit (a PR's head SHA is its branch's latest commit), and keeps a folder only while **all** hold: it's the current head of an open PR, younger than 24 hours, and among the 10 most-recently-deployed such branches. Everything else is deleted, superseded commits (an older head of a still-open PR), **merged or closed PR previews**, and anything past 24 hours. The live production build is always kept regardless, a stable site can go weeks without a deploy, and deleting its cache would 500 the home page and `/courses/*` lessons. So the bucket holds the production build plus at most one preview per active branch (worst case 11 builds, ~14 GB; typically well under that). Note the flip side: a PR preview URL stops rendering once its cache folder is pruned, push any commit to the PR (or re-run its build) to regenerate it.

The job identifies the live build by fetching [`/api/cache-build-id`](app/api/cache-build-id/route.ts) (the running Worker reports the exact `OPEN_NEXT_BUILD_ID` it serves from) and **aborts without deleting anything** if it can't positively identify that folder, or can't list the repo's open PRs (otherwise a transient API error would leave every preview unmatched and delete it). So a transient error can never wipe the bucket. Trigger it manually with `dry_run` to preview deletions.

It needs three repository secrets (Settings → Secrets and variables → Actions), from an R2 API token with Object Read & Write:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (the R2 S3 endpoint host) |
| `R2_INC_CACHE_ACCESS_KEY_ID` | R2 API token access key ID |
| `R2_INC_CACHE_SECRET_ACCESS_KEY` | R2 API token secret access key |

The `R2_INC_CACHE_*` pair is named for the bucket it belongs to, because a second R2 credential now exists: `.github/workflows/r2-illustrations-lifecycle.yml` needs an **Admin Read & Write** token (`R2_ADMIN_*`) to edit bucket configuration, which is a tier this job deliberately does not get — it deletes objects unattended every six hours, and admin tokens are account-wide, so one here could destroy `dataslope-workspaces` (live user data) or `dataslope-inc-cache` itself. The job aborts rather than running credential-less, so a missing or half-renamed secret fails loudly instead of reporting a green run that pruned nothing.

To change how long stale/preview cache lingers, edit `THRESHOLD_HOURS` (age limit) and `MAX_BRANCHES` (how many active-branch previews may coexist) in the workflow. At ~1–1.4 GB per retained build, retention is what decides whether the bucket sits near R2's 10 GB free tier or balloons, storage beyond it is cheap ($0.015/GB-month), but there's no reason to pay for dead previews.

## Search

Site search is a **SQLite FTS5 index on D1** (`dataslope-search`), built from `content/` at build time and queried by `app/api/search/route.ts`. It replaced an in-Worker Orama index, which had to be fetched, parsed and re-tokenised on the first search in every fresh isolate — a cost paid per data centre, per deploy, and growing with the content. An FTS5 query is a `SELECT` against an index that already exists, so there is nothing to warm up.

Three build steps produce it, all wired into `npm run build`:

| Step | Output |
| --- | --- |
| `scripts/build-search-corpus.mjs` | `lib/generated/search-corpus.json` — one row per `(page, heading)`, plus one per anchored component |
| `scripts/build-search-sql.mjs` | `lib/generated/search-seed.sql` — the `DELETE` + batched `INSERT`s |
| `npm run db:seed:search[:remote]` | the rows, in D1 — skipped when unchanged |

These run **after** `build:charts`, and the order is load-bearing: chart titles and captions live in the generated chart manifest rather than in the MDX, so a corpus built before it silently omits every one of them. That is worth ~264 kB of prose across ~250 charts, and it produced an index with no chart captions in it at all the first time the steps were ordered the other way. `build-search-corpus.mjs` now warns loudly when the manifest is missing or empty rather than quietly indexing less.

The corpus is extracted from the MDX **ASTs**, not the rendered HTML, which is what lets it reach content that never exists in the DOM until a learner interacts: `<ChallengeCard>` instructions and solutions, `<MultipleChoice>` questions and per-choice explanations, fenced and `<CodeBlock>` source, Mermaid definitions, `<Chart>` titles and captions, and the whole of `content/interview/`, which the previous index omitted entirely. Prose and code land in separate columns so `bm25()` can weight prose about seven to one over code — that ratio is what makes indexing code safe, since a search for a common identifier should surface the lesson that *explains* it above the dozen that merely use it in a starter file.

Three query-time behaviours sit on top of that index (`lib/search/ranking.ts`):

- **Component anchors.** Content components get deterministic DOM ids (`#x-mcq-2`, `#x-code-1`) injected at compile time by `remarkComponentAnchors`, and the corpus carries a narrow extra row per component under the same id, so a hit on quiz or challenge text deep-links to the component itself instead of the heading somewhere above it. `lib/search/anchors.mjs` is the single source both sides derive the ids from; `__tests__/searchAnchors.test.ts` pins the contract.
- **Current-course boost.** The docs layouts send the course / interview track being read as `?tag=` (see `DocsRootProvider`), and the route *boosts* — not filters — rows from that course (×2) and collection (×1.15), so "bar" typed inside the Plotly course surfaces Plotly's bar-chart lesson above ggplot2's while the rest of the site stays reachable.
- **Landing-page highlights.** Result URLs carry the searched tokens as `?hl=`; `SearchHighlight` paints them browser-find style via the CSS Custom Highlight API, and `HashScrollFix` keeps the viewport pinned to the anchor while CodeMirror/KaTeX/Mermaid finish mounting underneath it.

### One-time setup

The database and its schema already exist. To recreate them from scratch:

```bash
npx wrangler d1 create dataslope-search   # paste database_id into wrangler.jsonc
npm run db:migrate:search:remote          # migrations/search/0001_create_docs_fts.sql
npm run db:seed:search:remote             # ~19k rows
```

**The Workers Builds API token needs `D1 (edit)` added to it.** The token Cloudflare generates for Workers Builds is scoped to Account Settings (read), Workers Scripts (edit), Workers KV (edit), Workers R2 (edit) and Workers Routes (edit) — D1 is not in that set, so the deploy-time seed fails to authorize until it is added under **My Profile → API Tokens → (the Workers Builds token) → Edit → Account → D1 → Edit**. Because the seed is chained after `deploy` with `&&`, the symptom is a Worker that ships fine and a build that goes red on the last step, with the index never updating.

### Local development

`next dev` resolves bindings through `initOpenNextCloudflareForDev()` (see `next.config.ts`), so `/api/search` reads the **local** D1 under `.wrangler/`, not the remote one. That database starts empty, and an empty FTS5 table is not an error — it answers every query with no matches. Search therefore looks broken-but-silent until it is set up once:

```bash
npm run db:migrate:search   # --local
npm run db:seed:search      # --local, skipped when already current
```

Re-run the seed after editing lessons; it no-ops when the content hash already matches.

### Re-seeding only when content changed

`build-search-sql.mjs` writes a SHA-256 of the corpus into the seed file and, as the seed's last statement, into `docs_meta.content_hash`. `scripts/seed-search.mjs` compares the two and skips the apply when they agree.

The hash is taken over the **corpus**, not over `content/`, which is what makes it correct: it changes when a lesson is edited, and equally when the extractor learns to reach something it previously could not. Hashing the source files would have classified the chart-manifest fix above as a no-op and left the incomplete index in place.

Gating matters more than the row count suggests. A re-seed deletes and re-inserts every row, and on an FTS5 table the rows that get written are not the ~9k logical ones — the shadow tables hold ~20k, and D1 meters deletes as writes too, so an unconditional seed spends roughly 40k written rows on a deploy that may have touched no lesson at all.

Two properties worth keeping if this is ever rewritten: the hash is written **last**, so a partial apply cannot leave a hash claiming to be current and the next deploy retries; and **any uncertainty seeds** — an unreadable remote hash means apply, because a redundant seed costs some written rows while a wrongly skipped one serves stale content. `npm run db:seed:search:remote:force` overrides the check.

Sizing, measured rather than estimated: 8,965 rows over ~890 lessons produce a **~21 MB** database (14.7 MB of stored text so `snippet()` can quote matches, 5.5 MB of actual inverted index). That is 4% of the free plan's 500 MB per-database cap and 0.2% of the paid plan's 10 GB, so storage is not a constraint this index will run into.

### Two D1 rules the seed generator exists to respect

Both fail *only* on the remote seed, so both are enforced at build time instead:

- **100 KB per statement.** Batching a fixed number of rows per `INSERT` overran it, because section rows range from ~200 bytes to ~12 KB. Batches are closed on a byte budget, and `build-search-sql.mjs` re-checks the finished file and exits non-zero if any statement is over.
- **No transactions in the file.** `wrangler d1 execute --file` already runs inside one, so a `BEGIN TRANSACTION` earns `cannot start a transaction within a transaction`. That enclosing transaction is also what makes the leading `DELETE FROM docs` safe — the delete and the inserts land together, so a failed seed cannot leave an empty index.

`dataslope-search` is deliberately its own database. It is the only one holding an FTS5 **virtual table**, and `wrangler d1 export` refuses to export any database containing one — a failed attempt has been reported to wedge the database entirely ([workers-sdk#9519](https://github.com/cloudflare/workers-sdk/issues/9519), [#6305](https://github.com/cloudflare/workers-sdk/issues/6305)). Every row here is derived from `content/` and rebuilt each deploy, so the recovery for anything going wrong is to delete the database and re-seed. Extending that exposure to `dataslope-auth` or `dataslope-illustrations`, which record human decisions and cannot be rebuilt from source, would not be an acceptable trade.

Queries go through `withSession("first-unconstrained")`, so enabling [read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/) later is a dashboard toggle rather than a code change: the index only changes at deploy, so there is no read-after-write hazard and any replica's answer is as good as the primary's.

## Authentication (accounts)

Accounts are powered by [Better Auth](https://better-auth.com) running inside the app Worker, with **Cloudflare D1** (edge SQLite) as the user/session store. Sign-in is available via **Google + GitHub** social login and **email + password**. This is the accounts layer from `agent-outputs/20260621-1733-feature-expansion-auth-membership-seo-persistence.md` (Q1).

Email verification and password reset are sent via **[Resend](https://resend.com)** (`lib/auth/email.ts`), a single authenticated `fetch`, which is what the Workers runtime supports (no SMTP/TCP sockets). Passwords are hashed by Better Auth and stored in the existing `account` table, so no schema change was needed.

> **These flows are gated on `RESEND_API_KEY` being set** (`lib/auth/server.ts`). This is fail-safe: with no key, password sign-in works exactly as before and verification/reset are inert, a missing key can never lock everyone out. **Once the key is set, new sign-ups must verify their email before signing in**, and the forgot-password flow (`/reset-password`) goes live. To switch providers later (e.g. AWS SES via `aws4fetch`), change only `sendEmail` in `lib/auth/email.ts`.

To enable verification + reset:

1. Create a Resend account, **verify your sending domain** (add the SPF/DKIM DNS records Resend shows), and create an API key.
2. Set the key and From address:

   ```bash
   npx wrangler secret put RESEND_API_KEY
   # EMAIL_FROM is a non-secret var in wrangler.jsonc, change it to an address
   # on your verified domain (default: "Dataslope <no-reply@dataslope.com>").
   ```

   For local dev, add `RESEND_API_KEY` (and optionally `EMAIL_FROM`) to `.dev.vars`. Before a domain is verified, Resend only delivers to your own account address via the `onboarding@resend.dev` sandbox From.

Auth gates **actions, never content**: every `/courses` lesson, exercise, and playground stays free and statically prerendered with no session. Signing in only unlocks per-user features (cloud saves, sharing, AI). The session is read client-side (`lib/auth/client.ts`), so anonymous readers still receive the exact same cached static HTML.

Key files:

| File | Role |
| --- | --- |
| `lib/auth/server.ts` | `createAuth(env, request)`, a **per-request** Better Auth factory bound to that request's D1 (a shared connection across requests is the classic Workers footgun). |
| `app/api/auth/[...all]/route.ts` | Catch-all handler for `/api/auth/*` (sign-in, OAuth callbacks, session, sign-out). |
| `lib/auth/client.ts` | Browser client + `useSession` / `signIn` / `signOut`. |
| `app/sign-in/`, `app/account/` | Sign-in screen (Google/GitHub) and a gated account area. |
| `app/admin/` | Gated admin dashboard (list / remove / ban users), built on the shadcn UI primitives in `components/ui`. See [Admin dashboard](#admin-dashboard). |
| `migrations/` | D1 schema, one subfolder per database: `auth/`, `illustrations/`, `search/`. Each is a `migrations_dir` in `wrangler.jsonc` with its own numbering and its own `d1_migrations` table. See `migrations/README.md` for which command applies which, and why there are three databases rather than one. |
| `migrations/auth/` | `dataslope-auth`: Better Auth core tables plus the admin plugin's `role`/`ban` fields, plans, AI usage counters, cloud-workspace metadata and custom content. Applied with `npm run db:migrate[:remote]`. |
| `migrations/illustrations/` | `dataslope-illustrations`, a second database holding the illustration and chart regeneration queues written from the admin-only `/dashboard/admin/illustration-prompts` and `/dashboard/admin/charts` galleries. Applied with `npm run db:migrate:illustrations[:remote]`; see `agent-outputs/20260803-0900-illustration-regeneration-queue.md`. |
| `migrations/search/` | `dataslope-search`: the lesson full-text index read by `/api/search`. Applied with `npm run db:migrate:search[:remote]`, seeded with `npm run db:seed:search[:remote]`. |

> Auth is deliberately kept **out of `middleware.ts`**, `cookies()`/middleware sessions have rough edges on the Workers runtime (a known OpenNext limitation). All auth work happens in route handlers and client components instead.

### One-time setup

1. **Create the D1 database** and paste the printed `database_id` into `wrangler.jsonc` (the `d1_databases` entry, replacing `REPLACE_WITH_D1_DATABASE_ID`, it is not a secret):

   ```bash
   npx wrangler d1 create dataslope-auth
   ```

2. **Apply the schema** (locally, then to Cloudflare):

   ```bash
   npx wrangler d1 migrations apply dataslope-auth            # local
   npx wrangler d1 migrations apply dataslope-auth --remote   # Cloudflare
   ```

3. **Create OAuth apps** and set their authorized redirect URIs to your origin:
   - Google: `https://dataslope.com/api/auth/callback/google`
   - GitHub: `https://dataslope.com/api/auth/callback/github`

   (For local dev use `http://localhost:3000/api/auth/callback/<provider>`.)

4. **Set the secrets** (these never live in `wrangler.jsonc`):

   ```bash
   npx wrangler secret put BETTER_AUTH_SECRET   # e.g. `openssl rand -base64 32`
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   ```

   `BETTER_AUTH_URL` is set as a non-secret `var` in `wrangler.jsonc` (defaults to `https://dataslope.com`); change it if the deployed origin differs. A provider whose `*_CLIENT_ID`/`*_CLIENT_SECRET` pair is missing is simply not offered, so you can ship with just one provider configured.

   You only ever register the **production** callback URL above; there are no per-preview URLs. `lib/auth/server.ts` handles the two hosts that aren't the pinned apex:
   - **`www.dataslope.com`** (production also serves `www` with no redirect) is trusted for the CSRF origin check alongside the apex and any subdomain, so email/password sign-up/sign-in works there (previously it failed with "Invalid origin").
   - **`*.workers.dev` preview deployments** trust their own origin for email/password, and Google/GitHub sign-in completes via Better Auth's `oAuthProxy` plugin: the provider still returns to the registered production callback, then the authenticated session is relayed back to the preview. The relay encrypts its payload with a secret shared across deployments: `BETTER_AUTH_SECRET` by default, or set a dedicated `OAUTH_PROXY_SECRET` (`npx wrangler secret put OAUTH_PROXY_SECRET`, identical value everywhere) to narrow the blast radius. The proxy is a no-op on production and `www`.

### Local development

`npm run dev` reads bindings/vars from `wrangler.jsonc` via OpenNext's `initOpenNextCloudflareForDev()`. Put local secrets and any overrides in a `.dev.vars` file (gitignored), e.g.:

```
BETTER_AUTH_SECRET="dev-only-secret"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="…"
GOOGLE_CLIENT_SECRET="…"
GITHUB_CLIENT_ID="…"
GITHUB_CLIENT_SECRET="…"
RESEND_API_KEY="…"     # optional; enables email verification + password reset
ADMIN_EMAILS="…"       # optional; comma-separated emails granted /admin access
ADMIN_USER_IDS="…"     # optional; same, but by user id instead of email
```

The Cloudflare bindings interface (`CloudflareEnv`, used by `getCloudflareContext()`) is **hand-maintained** in `cloudflare-env.d.ts`, keep it in sync with `wrangler.jsonc` by hand when you add a binding. We don't commit `wrangler types`' output there because it inlines the full workerd runtime type surface (a global `Response`, `fetch`, …) that conflicts with this app's DOM types; the file's header comment explains the trade-off. `npm run cf-typegen` still works but writes to a gitignored scratch file for reference only.

### Ask AI

A signed-in, streaming "Ask AI" chat pane on the `/courses` lessons and `/playground/*` pages (`app/api/ai/chat/route.ts` + `app/_components/ai/`). It runs on the Workers runtime and pipes an OpenAI-compatible provider's Server-Sent-Event stream straight through, no Node APIs, no filesystem (lesson context is fetched from the prerendered `${slug}.md` asset, not read from disk).

**Model per membership tier.** Base URL + model id are non-secret `vars` in `wrangler.jsonc` (`AI_FREE_BASE_URL` / `AI_FREE_MODEL` / `AI_PRO_BASE_URL` / `AI_PRO_MODEL`), there's no hardcoded fallback (`lib/ai/models.ts`), so a tier needs its base URL, model id, and API key all set to be usable. Both tiers currently point at **OpenRouter**'s **DeepSeek V4 Flash** model. The API key is a secret:

```bash
npx wrangler secret put AI_FREE_API_KEY   # OpenRouter key, covers both tiers today
npx wrangler secret put AI_PRO_API_KEY    # optional: only needed if pro should use a separate key
```

If a tier is missing its key, base URL, or model, it degrades to whichever tier *is* fully configured (a half-wired env still answers), keeping its own budgets. With neither tier fully configured, Ask AI stays inert (503). A user's tier comes from the `plan` column (`migrations/auth/0003`, default `'free'`); admins and any address in `PRO_USER_EMAILS` are treated as Pro as a bootstrap before billing exists (`lib/ai/tier.ts`).

**Cost / abuse controls.** Signed-in only; per-user daily request + token budgets and a global daily token ceiling (`AI_DAILY_GLOBAL_TOKEN_CAP`, default 5M) bound spend regardless of account/IP rotation (`lib/ai/limits.ts`, backed by the `ai_usage_*` tables in `migrations/auth/0003`). Output is capped per tier. Per-minute limiting (a Durable Object / the Rate Limiting binding) and per-widget context capture are tracked as follow-ups in `agent-outputs/20260701-1107-ask-ai-cloudflare-implementation.md`.

**What the model is told about the page.** Context is opt-in per source through the panel's chip, with one exception: a ~20-token "Page you're on" line naming the page's heading and its course rides along by default (`pageIdentityLine`, `lib/ai/context.ts`). It exists because `slug` is used server-side *only* to resolve the lesson Markdown and never reaches the prompt, so a question asked with every source switched off used to arrive with nothing identifying the lesson, and answers were generic in exactly the way that implies. The heading comes from the rendered `<h1>` (what the reader sees); the course title is resolved from the slug against the build-time catalog rather than trusted from the client. It is a listed, countable, toggleable row in the context sheet, so the chip's "N sources" stays an honest description of the request.

**Questions queue; they are never refused.** Asking while an answer streams adds the question to a queue rather than locking the composer (`useAskAi`); answers stay ordered because the queue drains one request at a time, and Stop cancels the answer in flight *and* the queue. The stream also sends a `: ping` SSE comment every ten seconds — the gap before a model's first token, the gap before its usage chunk, and OpenRouter's own comment-only heartbeats (which the transform drops) can otherwise leave the connection idle long enough for an intermediary to close it, which reached users as "Connection lost. Please try again." on an answer that was fine.

**What is stored, and what is not.** Ask AI conversations are **not** retained: questions and answers pass through to the provider, and only the `ai_usage_*` counters (requests and token totals per user per UTC day) are written. The one exception is a rating: pressing the thumbs-up/down under an answer writes that rating plus the question, the answer, the page, and the model to `ai_answer_feedback` (`migrations/auth/0008`, via `POST /api/ai/feedback`), which is what makes the buttons worth pressing. Pressing again withdraws the rating and deletes the row, and the table cascades on user deletion. The panel says so under every answer and `/privacy` says it at length — keep those three in step if this ever changes. Reviewed at `/admin/ai-feedback`.

For local dev, add the keys to `.dev.vars`:

```
AI_FREE_API_KEY="sk-or-…"   # OpenRouter, covers both tiers today
PRO_USER_EMAILS="you@example.com"   # optional; grants the pro model without billing
```

### AI inline completion (pro)

Copilot-style ghost-text autocomplete in the language-runtime CodeMirror editors, code blocks, challenge cards, and the `/playground/*` editors (`app/_components/ai/inlineCompletion.ts` + `app/api/ai/complete/route.ts`). After a short typing pause the editor requests a fill-in-the-middle suggestion; **Tab** accepts, **Escape** dismisses, and typing "through" the suggestion consumes it. Challenge/code-block editors send the active file's read-only init code as extra prompt context.

**Pro members only, enforced server-side.** The endpoint returns 401 for guests and 403 for signed-in free members, the client gate (a `GET /api/ai/complete` capability probe the extension fires once per page) is only there to avoid doomed requests. Completions reuse the **pro-tier** provider config above (OpenRouter → DeepSeek V4 Flash today) via the same OpenAI-compatible `/chat/completions` adapter (`lib/ai/provider.ts`), non-streaming with a small output cap (`lib/ai/completion.ts`).

**Cost / abuse controls.** Completions bill per-user daily request + token counters that are **separate from Ask AI chat** (`completions` / `completion_*_tok` columns, `migrations/auth/0004`) so a busy editor session can't eat a member's chat budget, but they share the global daily token ceiling, which stays the single backstop on total provider spend.

### Pro subscriptions (Polar)

Paid Pro memberships run on [Polar](https://polar.sh) as **merchant of record**, Polar is the legal seller, handles global VAT/sales tax, invoices, and chargebacks, and pays out; we never touch card data. Individuals/sole proprietors can onboard without a company. The integration is the official Better Auth plugin (`@polar-sh/better-auth`), configured in `lib/billing/polar.ts` and mounted under the existing `/api/auth/*` catch-all:

- `POST /api/auth/checkout`, hosted-checkout session for the signed-in user (slugs `pro` / `pro-annual`); the client redirects to Polar. Anonymous checkout is off (the customer must be keyed to a user id).
- `GET|POST /api/auth/customer/portal`, Polar's customer portal (invoices, payment method, cancel/renew) for the signed-in user.
- `POST /api/auth/polar/webhooks`, Polar → us, signature-verified (standardwebhooks HMAC; pure-JS crypto, Workers-safe). **This is the only billing writer of `user.plan`.**

**How plan sync works.** Checkout is created with `externalCustomerId = user.id`, so every webhook's customer carries our user id. We key everything off the `customer.state_changed` event, it fires on every subscription transition and carries the full current state, so the plan is a pure function of the latest event (`derivePlanFromCustomerState`): Pro while any active subscription matches a configured Pro product, free otherwise. One indexed D1 `UPDATE user SET plan` per event; no extra tables. An admin's manual plan switch for a *paying* customer is overwritten by the next state event (billing owns paid status); comped users (`PRO_USER_EMAILS`, admins, admin-set plan on non-customers) are untouched. After checkout the buyer lands on `/account?checkout=success`, which polls the session with the cookie cache bypassed until the webhook's flip is visible.

**Setup.** Billing is inert until configured (like social login / email / AI):

1. Create a Polar organization (start on `sandbox.polar.sh`), a Pro product (e.g. $4.99/mo), and optionally an annual product.
2. `wrangler.jsonc` vars: `POLAR_PRO_PRODUCT_ID` (+ `POLAR_PRO_ANNUAL_PRODUCT_ID` for the yearly slug), `POLAR_SERVER` (`"sandbox"` while testing; empty = production).
3. Secrets: `npx wrangler secret put POLAR_ACCESS_TOKEN` (org access token) and, after creating a webhook endpoint in Polar pointing at `https://dataslope.com/api/auth/polar/webhooks` (subscribe it to at least `customer.state_changed`), `npx wrangler secret put POLAR_WEBHOOK_SECRET`.
4. Local dev: same four values in `.dev.vars`.

Client side, `app/_components/billing/proCheckout.ts` drives the flow (upgrade button on `/account`, the Pro CTA on `/pricing`, which sends signed-out visitors to sign-in first). It deliberately calls the endpoints via `authClient.$fetch` instead of registering `polarClient()`, keeping Polar's checkout-embed library out of the shared auth bundle.

### Cloud saves & playground sharing

Workspaces can be pushed to the account ("Cloud" button in every playground header) and shared as immutable snapshot links ("Share", works for **guests too**, no account needed). A workspace travels as a **bundle**: a gzipped JSON document (`lib/workspaces/types.ts`) holding the code files verbatim, or, for the SQL playgrounds, a replayable SQL dump plus the query tabs (the database binary never leaves the browser; opening a bundle replays the dump through the WASM engine). D1 keeps only metadata (`migrations/auth/0005`); the bundle bytes live in a dedicated R2 bucket, because SQL dumps routinely exceed D1's 2 MB row cap and R2 reads are egress-free.

- **Endpoints:** `GET/PUT/DELETE /api/workspaces[/:id[/bundle]]` (owner-only) and `POST/GET/DELETE /api/shares[/:id[/bundle]]` (share reads are public, the slug is the capability). Share links land on `/s/<id>` (noindex, disallowed in robots).
- **Retention (read-time, no cron):** guest share links carry a fixed ~30-day expiry; free members' saves + links expire after ~30 days of inactivity (opening / viewing resets the clock); Pro storage doesn't expire. Expired rows are never served and are purged lazily by whichever route encounters them. Policy numbers live in `lib/workspaces/policy.ts` and are what `/pricing` documents.
- **Quotas:** free 100 MB / Pro 10 GB, account-wide across saves + shares; per-bundle caps (guest 10 MB, free 25 MB, pro 100 MB compressed); guest share creation is metered per salted-IP hash + a global daily backstop (`share_usage_daily`, no raw IPs stored).
- **Management:** `/account` gains a "Cloud storage" card listing every save + share link (open / delete / copy / revoke).

**One-time setup**, create the bucket and apply the migration; the feature answers 503 until both exist:

```bash
npx wrangler r2 bucket create dataslope-workspaces
npx wrangler d1 migrations apply dataslope-auth            # local
npx wrangler d1 migrations apply dataslope-auth --remote   # Cloudflare
```

Optional hardening: an R2 **lifecycle rule** on the `share/` prefix (e.g. delete after ~45 days) backstops byte reclamation for guest snapshots whose lazy sweep hasn't run; the D1 rows self-heal.

### Admin dashboard

`/admin` is a gated dashboard with a sidebar, powered by Better Auth's [`admin` plugin](https://www.better-auth.com/docs/plugins/admin) (`lib/auth/server.ts` + `lib/auth/client.ts`). The shell lives in `app/admin/layout.tsx`; adding a section is one route folder plus one entry in `app/admin/_components/AdminSidebar.tsx`. Current sections:

- **Users** (`/admin`), lists every account with per-row actions:
  - **Plan switch**, flips `free` ↔ `pro` via `admin.updateUser` (an already-signed-in session can lag up to five minutes behind, from the session cookie cache; impersonation and fresh sign-ins see the new plan immediately).
  - **Impersonate**, become that user in this browser (refused for admins server-side). Come back to `/admin` and the access-denied card offers **Stop impersonating**.
  - **Remove**, a **hard delete**. It drops the `user` row, which cascades to that user's `session` and `account` rows (the `ON DELETE CASCADE` in `migrations/auth/0001`) and frees their unique email. **The person can then sign up again** from scratch with OAuth or email/password. Use this for the "let me start over" / account-reset case, e.g. someone who created an unverified email/password account and now can't sign in with Google (see [Account linking](#account-linking)).
  - **Ban**, the soft alternative. Blocks sign-in but keeps the account (and its email) in place; reversible with **Unban**.
- **Test users** (`/admin/test-users`), creates disposable accounts for testing member-gated features (AI autocomplete, Ask AI tiers). They're created through `admin.createUser` with `data: { plan, emailVerified: true }`, so they're born verified (no verification email is sent on this path) on the chosen plan, no billing involved. Test accounts are identified purely by their reserved `@dataslope.test` email domain (RFC 6761 `.test` can never receive mail), which is what the list and the "Test" badges key on. Passwords show once at creation; use Impersonate for existing ones.
- **AI usage** (`/admin/ai-usage`), per-user and site-wide Ask AI + completion + suggestion counters for a chosen UTC window (Day / Week / Month / Total, anchored by an "as of" date), against the global daily cap. Backed by `GET /api/admin/ai-usage?start&end` (inclusive UTC-day range; `start` omitted ⇒ all-time), a custom route gated by `requireAdmin` (`lib/auth/admin.ts`) since it isn't a Better Auth endpoint.
- **AI feedback** (`/admin/ai-feedback`), the answers readers rated in the Ask AI panel, each with the question that produced it, the page, the model, and the full answer behind a disclosure. Defaults to the downvotes, since those are the ones worth acting on, and leads with the standing up/down ratio. Backed by `GET /api/admin/ai-feedback?rating&limit&before` behind `requireAdmin`. Only rated exchanges exist here — an empty page means nobody has rated anything, not that it is broken.

Authorization is enforced **server-side** on every `admin.*` endpoint (and `requireAdmin` on our own `/api/admin/*` routes), so the pages themselves stay statically-prerendered, client-read screens like `/account` (the "auth gates actions, not content" rule): a non-admin who opens `/admin` just gets an access-denied notice and can read or change nothing. The dashboard refuses destructive actions on your own row, so you can't lock yourself out.

The admin plugin adds `role` / `banned` / `banReason` / `banExpires` to `user` and `impersonatedBy` to `session`; that delta is `migrations/auth/0002_add_admin_plugin_fields.sql`, applied by the same `wrangler d1 migrations apply` command as the rest.

**Designating admins.** Three ways, which compose. All three grant admin regardless of the `role` column, so any of them can bootstrap the *first* admin (there's no admin to promote them yet):

1. **By email (recommended):** set `ADMIN_EMAILS` to a comma-separated list of addresses. You know these up front, and it works for people who already signed up, no need to look up an id first:

   ```bash
   npx wrangler secret put ADMIN_EMAILS   # e.g. "you@example.com,teammate@example.com"
   ```

   Better Auth's admin plugin only understands user *ids*, so `resolveAdminUserIds` (`lib/auth/server.ts`) resolves these to ids against D1. That lookup is one indexed read and runs **only** on the admin plugin's own `/api/auth/admin/*` endpoints, so the hot `get-session` path the cookie cache keeps off D1 is unaffected. An admin email that hasn't signed up yet simply isn't an admin until the account exists (correct, you can't be a user that doesn't exist).

2. **By user id:** set `ADMIN_USER_IDS` to a comma-separated list of Better Auth user ids (no D1 lookup). Handy in automation where you already have the id:

   ```bash
   npx wrangler d1 execute dataslope-auth --remote --command "SELECT id, email FROM user;"
   npx wrangler secret put ADMIN_USER_IDS   # e.g. "abc123,def456"
   ```

3. **By role:** an existing admin can promote another account by setting its `role` to `admin` (directly in D1, or via the plugin's `setRole`). Role-based admins also see an **Admin** link in the account menu; email/id-based admins reach the dashboard at `/admin` directly.

### Account linking

What happens when someone signs up with **email/password** and later tries **Google/GitHub with the same email** (or vice-versa) depends on whether the existing account's email is **verified**, Better Auth's `accountLinking` defaults (which this app keeps) only merge a social login into an existing account when that's safe:

- **Existing email is _verified_** → the social account is **linked** to the existing user; they sign into the same account (now with both a password and the social provider).
- **Existing email is _unverified_** → linking is **refused** (`account_not_linked`); the social sign-in fails and **no duplicate account is created** (email is `UNIQUE`). The user must sign in the original way.

The second case is the default whenever email verification is off (no `RESEND_API_KEY`), since every email/password account is then unverified. It's a deliberate anti-takeover guard: an unverified local account could have been created by someone who doesn't own the address, so Better Auth won't let a social login silently adopt it. A user stuck this way can be unblocked by **removing** their account in the admin dashboard so they can re-register cleanly. To relax this (e.g. trust Google/GitHub to link even into unverified local accounts), set `account.accountLinking.trustedProviders` / `requireLocalEmailVerified` in `createAuth`, at the cost of that safety margin.

### Adding Better Auth plugins later

If you enable additional Better Auth features (e.g. 2FA, organizations), regenerate the schema delta with `npx @better-auth/cli generate` and add it as a **new** migration file in `migrations/auth/` rather than editing the existing one.


## License

Dataslope is available under more than one license:

- **Source code**: [MIT License](./LICENSE). Attribution via the copyright
  notice, and no warranty/liability.
- **Learning content** (everything under [`content/`](./content)): [Creative
  Commons Attribution 4.0 International (CC BY 4.0)](./LICENSE-CONTENT).
  Attribution required, no warranty/liability.

Third-party software and language runtimes retain their own licenses; see
[`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md). In particular, the Java
runtime **CheerpJ** (Leaning Technologies) is proprietary, used here under its
free **Community Edition**, which allows commercial use for individuals and
one-person companies, and is loaded from Leaning Technologies' CDN (self-hosting
and redistribution aren't permitted). Re-check its terms if you grow beyond a
solo operation.
