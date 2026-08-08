// Hand-maintained Cloudflare bindings for the app Worker. Keep in sync with the
// `r2_buckets` / `d1_databases` / `vars` / `services` entries in wrangler.jsonc.
//
// Why this isn't the raw `wrangler types` output: `wrangler types` inlines the
// ENTIRE workerd runtime type surface, including a global `Response`, `fetch`,
// `Request`, etc., which conflicts with this app's DOM lib. In particular it
// retypes `Response.json()` to `Promise<unknown>`, which breaks ordinary
// browser `fetch(...).then((r) => r.json())` chains across the codebase (e.g.
// a client component). This is a Next.js/DOM app, not a bare
// Worker, so we want the DOM globals to win. We therefore declare only the
// bindings, sourcing their types from `@cloudflare/workers-types` via `import
// type`, a module-scoped import that adds NO globals.
//
// `npm run cf-typegen` regenerates the full runtime types into a scratch file
// (.wrangler/, gitignored) for reference; do not point it back at this file.
import type { D1Database, Fetcher, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    // R2 bucket backing OpenNext's incremental cache.
    NEXT_INC_CACHE_R2_BUCKET: R2Bucket;
    // R2 bucket holding cloud-saved workspace bundles + shared playground
    // snapshots (metadata lives in D1, migrations/auth/0005). Optional so the
    // /api/workspaces + /api/shares routes can degrade to 503 "not
    // configured" on deployments that haven't created the bucket yet.
    WORKSPACES_BUCKET?: R2Bucket;
    // D1 database for Better Auth (users + sessions). See migrations/.
    DB: D1Database;
    // D1 database for illustration review state (the regeneration queue behind
    // /illustration-prompts). Optional so the rest of the app keeps working on
    // a deployment that hasn't created it yet: the marks API answers 503 and
    // the gallery renders read-only. See migrations/illustrations/.
    ILLUSTRATIONS_DB?: D1Database;
    // Static-assets binding (prerendered pages + /_next/static).
    ASSETS: Fetcher;
    // Service binding back to this worker (OpenNext cache/revalidation).
    WORKER_SELF_REFERENCE: Fetcher;

    // --- vars (wrangler.jsonc) ---
    BETTER_AUTH_URL: string;
    // From address for transactional email (must be on a Resend-verified domain).
    EMAIL_FROM?: string;
    // Extra CSRF-trusted origins (comma-separated), on top of BETTER_AUTH_URL,
    // the apex + its subdomains (so www.dataslope.com is trusted), and the
    // auto-trusted *.workers.dev preview origins. For custom preview or staging
    // domains. See `trustedOrigins` in lib/auth/server.ts.
    TRUSTED_ORIGINS?: string;

    // --- "Ask AI" model config (vars; see lib/ai/models.ts) ---
    // Base URL + model id per membership tier, no hardcoded fallback, so a
    // tier needs its base URL, model id, AND API key (below) all set to be
    // usable. Both providers must speak the OpenAI /chat/completions
    // streaming API. Currently both tiers point at OpenRouter's DeepSeek V4
    // Flash model (see wrangler.jsonc). Fallback is asymmetric, by cost
    // (resolveModel): pro degrades to the free provider when unconfigured,
    // but free never silently upgrades to the pro provider.
    AI_FREE_BASE_URL?: string;
    AI_FREE_MODEL?: string;
    AI_PRO_BASE_URL?: string;
    AI_PRO_MODEL?: string;
    // Global per-day token ceiling (bounded-downside backstop). Defaults to 5M.
    AI_DAILY_GLOBAL_TOKEN_CAP?: string;
    // Comma-separated emails granted the pro model before billing exists
    // (bootstrap; mirrors ADMIN_EMAILS). See lib/ai/tier.ts.
    PRO_USER_EMAILS?: string;

    // --- Polar billing (Pro subscriptions; see lib/billing/polar.ts) ---
    // Billing is inert until POLAR_ACCESS_TOKEN + POLAR_PRO_PRODUCT_ID are
    // set (webhook endpoint additionally needs POLAR_WEBHOOK_SECRET).
    // The Polar product whose active subscription grants the 'pro' plan.
    POLAR_PRO_PRODUCT_ID?: string;
    // Optional second product for annual billing (slug "pro-annual").
    POLAR_PRO_ANNUAL_PRODUCT_ID?: string;
    // "sandbox" while testing against sandbox.polar.sh; unset = production.
    POLAR_SERVER?: string;

    // --- secrets (set via `wrangler secret put`, absent from wrangler.jsonc) ---
    // Required (not optional): signs the OAuth `state` + session cookies, so it
    // must be a single stable value present on every isolate/deployment. If it
    // is ever missing, the signed state cookie can't be verified on the OAuth
    // callback and sign-in fails with ?error=state_mismatch, so createAuth()
    // (lib/auth/server.ts) hard-fails when it's unset rather than falling back
    // to Better Auth's built-in key.
    BETTER_AUTH_SECRET: string;
    // Optional dedicated key for the oAuthProxy plugin (Google/GitHub sign-in
    // on *.workers.dev preview deployments; see `oAuthProxy` in
    // lib/auth/server.ts). It encrypts the profile relayed from the production
    // callback back to the preview, so it must be identical across all
    // deployments. Defaults to BETTER_AUTH_SECRET (already Worker-wide) when
    // unset; set a distinct value to narrow the blast radius.
    OAUTH_PROXY_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    // Resend API key; when set, email verification + password reset turn on.
    RESEND_API_KEY?: string;
    // "Ask AI" provider API keys (secrets). Set with `wrangler secret put`.
    // Free tier calls AI_FREE_BASE_URL with this key; pro tier calls
    // AI_PRO_BASE_URL. If only one is set, both tiers use it (see resolveModel).
    AI_FREE_API_KEY?: string;
    AI_PRO_API_KEY?: string;
    // Polar billing secrets (see lib/billing/polar.ts): the organization
    // access token, and the per-endpoint webhook secret Polar shows when you
    // point a webhook at /api/auth/polar/webhooks.
    POLAR_ACCESS_TOKEN?: string;
    POLAR_WEBHOOK_SECRET?: string;
    // Admins for /admin, regardless of their `role` column (bootstraps the
    // first admin). Both are comma-separated and merge; specify whichever is
    // handier. ADMIN_EMAILS is resolved to user IDs against D1 (see
    // resolveAdminUserIds in lib/auth/server.ts). Signing in while listed
    // promotes the user's `role` column to 'admin' (sign-in hooks in
    // lib/auth/server.ts + lib/auth/adminBootstrap.ts), which surfaces the
    // /admin shortcut in the avatar menu and the Pro tier (lib/ai/tier.ts)
    // on their session.
    ADMIN_EMAILS?: string;
    ADMIN_USER_IDS?: string;
  }
}

export {};
