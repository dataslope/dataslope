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

## Authentication (accounts)

Accounts are powered by [Better Auth](https://better-auth.com) running inside the app Worker, with **Cloudflare D1** (edge SQLite) as the user/session store. Sign-in is available via **Google + GitHub** social login and **email + password**. This is the accounts layer from `agent-outputs/20260621-1733-feature-expansion-auth-membership-seo-persistence.md` (Q1).

Email verification and password reset are sent via **[Resend](https://resend.com)** (`lib/auth/email.ts`) — a single authenticated `fetch`, which is what the Workers runtime supports (no SMTP/TCP sockets). Passwords are hashed by Better Auth and stored in the existing `account` table, so no schema change was needed.

> **These flows are gated on `RESEND_API_KEY` being set** (`lib/auth/server.ts`). This is fail-safe: with no key, password sign-in works exactly as before and verification/reset are inert — a missing key can never lock everyone out. **Once the key is set, new sign-ups must verify their email before signing in**, and the forgot-password flow (`/reset-password`) goes live. To switch providers later (e.g. AWS SES via `aws4fetch`), change only `sendEmail` in `lib/auth/email.ts`.

To enable verification + reset:

1. Create a Resend account, **verify your sending domain** (add the SPF/DKIM DNS records Resend shows), and create an API key.
2. Set the key and From address:

   ```bash
   npx wrangler secret put RESEND_API_KEY
   # EMAIL_FROM is a non-secret var in wrangler.jsonc — change it to an address
   # on your verified domain (default: "Dataslope <no-reply@dataslope.com>").
   ```

   For local dev, add `RESEND_API_KEY` (and optionally `EMAIL_FROM`) to `.dev.vars`. Before a domain is verified, Resend only delivers to your own account address via the `onboarding@resend.dev` sandbox From.

Auth gates **actions, never content**: every `/learn` lesson, exercise, and playground stays free and statically prerendered with no session. Signing in only unlocks per-user features (cloud saves, sharing, AI). The session is read client-side (`lib/auth/client.ts`), so anonymous readers still receive the exact same cached static HTML.

Key files:

| File | Role |
| --- | --- |
| `lib/auth/server.ts` | `createAuth(env)` — a **per-request** Better Auth factory bound to that request's D1 (a shared connection across requests is the classic Workers footgun). |
| `app/api/auth/[...all]/route.ts` | Catch-all handler for `/api/auth/*` (sign-in, OAuth callbacks, session, sign-out). |
| `lib/auth/client.ts` | Browser client + `useSession` / `signIn` / `signOut`. |
| `app/sign-in/`, `app/account/` | Sign-in screen (Google/GitHub) and a gated account area. |
| `migrations/` | D1 schema (Better Auth core tables), applied with `wrangler d1 migrations apply`. |

> Auth is deliberately kept **out of `middleware.ts`** — `cookies()`/middleware sessions have rough edges on the Workers runtime (a known OpenNext limitation). All auth work happens in route handlers and client components instead.

### One-time setup

1. **Create the D1 database** and paste the printed `database_id` into `wrangler.jsonc` (the `d1_databases` entry, replacing `REPLACE_WITH_D1_DATABASE_ID` — it is not a secret):

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

### Local development

`npm run dev` reads bindings/vars from `wrangler.jsonc` via OpenNext's `initOpenNextCloudflareForDev()`. Put local secrets and any overrides in a `.dev.vars` file (gitignored), e.g.:

```
BETTER_AUTH_SECRET="dev-only-secret"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="…"
GOOGLE_CLIENT_SECRET="…"
GITHUB_CLIENT_ID="…"
GITHUB_CLIENT_SECRET="…"
RESEND_API_KEY="…"   # optional; enables email verification + password reset
```

The Cloudflare bindings interface (`CloudflareEnv`, used by `getCloudflareContext()`) is **hand-maintained** in `cloudflare-env.d.ts` — keep it in sync with `wrangler.jsonc` by hand when you add a binding. We don't commit `wrangler types`' output there because it inlines the full workerd runtime type surface (a global `Response`, `fetch`, …) that conflicts with this app's DOM types; the file's header comment explains the trade-off. `npm run cf-typegen` still works but writes to a gitignored scratch file for reference only.

### Adding Better Auth plugins later

If you enable additional Better Auth features (e.g. email/password, 2FA, organizations), regenerate the schema delta with `npx @better-auth/cli generate` and add it as a **new** migration file in `migrations/` rather than editing the existing one.

