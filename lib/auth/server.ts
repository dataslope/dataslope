/**
 * Better Auth server configuration for DataSlope, backed by Cloudflare D1.
 *
 * This is the accounts layer from
 * `agent-outputs/20260621-1733-feature-expansion-auth-membership-seo-persistence.md`
 * (Q1): Better Auth + D1, social login first (Google + GitHub), self-hosted so
 * all user data lives in our own D1 tables.
 *
 * IMPORTANT — one instance per request. The D1 binding only exists at request
 * time (via `getCloudflareContext()`), and the report flags reusing a single
 * D1/Kysely connection across requests as the classic Workers footgun. So this
 * is a *factory*: the route handler calls `createAuth(env)` fresh on every
 * request (see app/api/auth/[...all]/route.ts) rather than instantiating a
 * shared module-level singleton.
 *
 * Auth gates *actions* (save, share, AI), never *content*: the ~800 `/learn`
 * lessons stay statically prerendered and are read with no session. The session
 * is read client-side (lib/auth/client.ts) so anonymous readers still get the
 * exact same cached static HTML. Keep auth out of middleware.ts — it has rough
 * edges on the Workers runtime (a known OpenNext limitation); do auth work in
 * route handlers / server components instead.
 */
import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";

/** Build a request-scoped Better Auth instance bound to this request's D1. */
export function createAuth(env: CloudflareEnv) {
  // Only advertise a provider when both halves of its credential pair are
  // present, so a partially-configured environment fails closed (the provider
  // simply isn't offered) rather than booting with an invalid OAuth client.
  const socialProviders: NonNullable<
    Parameters<typeof betterAuth>[0]["socialProviders"]
  > = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  return betterAuth({
    // D1 via the Kysely SQLite dialect — the most Cloudflare-native path, with
    // full ownership of the tables (schema in /migrations). One dialect per
    // call = one connection per request.
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: "sqlite",
    },
    secret: env.BETTER_AUTH_SECRET,
    // Canonical origin for OAuth callback URLs. Unset → inferred from the
    // request; set BETTER_AUTH_URL (wrangler `vars`, or `.dev.vars` locally)
    // when the deployed origin must be pinned.
    baseURL: env.BETTER_AUTH_URL,
    // Social login first: no passwords stored, no reset/verification flow to
    // own on day one (the right starting scope per the report). Email/password
    // can be enabled later alongside a transactional email provider.
    emailAndPassword: { enabled: false },
    socialProviders,
    session: {
      // Cache the session in a short-lived signed cookie so the common
      // "who am I" check is served from the cookie instead of a D1 read on
      // every request — D1's tight write/read budget rewards this, and it
      // keeps auth cheap at the edge.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // No outbound telemetry from the Worker.
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
