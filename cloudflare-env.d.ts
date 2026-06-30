// Hand-maintained Cloudflare bindings for the app Worker. Keep in sync with the
// `r2_buckets` / `d1_databases` / `vars` / `services` entries in wrangler.jsonc.
//
// Why this isn't the raw `wrangler types` output: `wrangler types` inlines the
// ENTIRE workerd runtime type surface — including a global `Response`, `fetch`,
// `Request`, etc. — which conflicts with this app's DOM lib. In particular it
// retypes `Response.json()` to `Promise<unknown>`, which breaks ordinary
// browser `fetch(...).then((r) => r.json())` chains across the codebase (e.g.
// app/svg-gallery/SvgGalleryClient.tsx). This is a Next.js/DOM app, not a bare
// Worker, so we want the DOM globals to win. We therefore declare only the
// bindings, sourcing their types from `@cloudflare/workers-types` via `import
// type` — a module-scoped import that adds NO globals.
//
// `npm run cf-typegen` regenerates the full runtime types into a scratch file
// (.wrangler/, gitignored) for reference; do not point it back at this file.
import type { D1Database, Fetcher, R2Bucket } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    // R2 bucket backing OpenNext's incremental cache.
    NEXT_INC_CACHE_R2_BUCKET: R2Bucket;
    // D1 database for Better Auth (users + sessions). See migrations/.
    DB: D1Database;
    // Static-assets binding (prerendered pages + /_next/static).
    ASSETS: Fetcher;
    // Service binding back to this worker (OpenNext cache/revalidation).
    WORKER_SELF_REFERENCE: Fetcher;

    // --- vars (wrangler.jsonc) ---
    BETTER_AUTH_URL: string;
    // From address for transactional email (must be on a Resend-verified domain).
    EMAIL_FROM?: string;

    // --- secrets (set via `wrangler secret put`, absent from wrangler.jsonc) ---
    BETTER_AUTH_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    // Resend API key; when set, email verification + password reset turn on.
    RESEND_API_KEY?: string;
    // Comma-separated Better Auth user IDs granted admin access to /admin
    // (regardless of their `role` column). Bootstraps the first admin.
    ADMIN_USER_IDS?: string;
  }
}

export {};
