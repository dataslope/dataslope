/**
 * Better Auth server configuration for DataSlope, backed by Cloudflare D1.
 *
 * This is the accounts layer from
 * `agent-outputs/20260621-1733-feature-expansion-auth-membership-seo-persistence.md`
 * (Q1): Better Auth + D1, social login first (Google + GitHub), self-hosted so
 * all user data lives in our own D1 tables.
 *
 * IMPORTANT, one instance per request. The D1 binding only exists at request
 * time (via `getCloudflareContext()`), and the report flags reusing a single
 * D1/Kysely connection across requests as the classic Workers footgun. So this
 * is a *factory*: the route handler calls `createAuth(env, request)` fresh on
 * every request (see app/api/auth/[...all]/route.ts) rather than instantiating
 * a shared module-level singleton.
 *
 * Auth gates *actions* (save, share, AI), never *content*: the ~800 `/learn`
 * lessons stay statically prerendered and are read with no session. The session
 * is read client-side (lib/auth/client.ts) so anonymous readers still get the
 * exact same cached static HTML. Keep auth out of middleware.ts, it has rough
 * edges on the Workers runtime (a known OpenNext limitation); do auth work in
 * route handlers / server components instead.
 */
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { D1Dialect } from "kysely-d1";
import { promoteConfiguredAdmins } from "@/lib/auth/adminBootstrap";
import { resetPasswordEmail, sendEmail, verifyEmail } from "@/lib/auth/email";
import { polarPlugin } from "@/lib/billing/polar";

/** Split a comma-separated secret into a trimmed, non-empty list. Exported
 *  for the custom admin API routes' authorization check (lib/auth/admin.ts). */
export function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Domain attribute for the OAuth `state` cookie, derived from BETTER_AUTH_URL.
 *
 * Why it exists: a social sign-in spans two requests, the sign-in POST sets a
 * signed one-time `state` cookie, then the provider redirects back to the
 * callback, which requires that cookie (Better Auth's login-CSRF check). By
 * default the cookie is host-only, while the callback always lands on the
 * BETTER_AUTH_URL host because the OAuth redirect_uri is pinned to it. Both
 * dataslope.com and www.dataslope.com serve this app with no canonical
 * redirect, so a sign-in started on www set its cookie on www, Google returned
 * to the apex where the cookie doesn't exist, and the callback failed with
 * `?error=state_mismatch`, reproducibly, on every first attempt from www. The
 * failure redirect lands on the apex /sign-in, which is why *retrying* always
 * worked. Scoping the state cookie to the registrable domain (`Domain=
 * dataslope.com` covers the apex and every subdomain) lets a flow started on
 * any *.dataslope.com host complete on the apex callback. Session cookies are
 * deliberately left host-only, this widens only the short-lived random nonce.
 *
 * Returns undefined (host-only cookie, today's behavior) when BETTER_AUTH_URL
 * is unset or its host is not a dotted DNS name: browsers reject a Domain
 * attribute they can't tail-match against the request host (localhost, IP
 * literals), which would drop the cookie entirely and break sign-in outright.
 */
export function oauthStateCookieDomain(
  baseURL: string | undefined,
): string | undefined {
  if (!baseURL) return undefined;
  let hostname: string;
  try {
    hostname = new URL(baseURL).hostname;
  } catch {
    return undefined;
  }
  if (!hostname.includes(".") || hostname.startsWith("[")) return undefined;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return undefined;
  return hostname;
}

/**
 * Resolve who is an admin for this request. Two config sources, which merge,
 * both grant admin regardless of the `role` column, which solves the bootstrap
 * problem (there's no admin to promote the first one yet):
 *
 *   - `ADMIN_EMAILS`, email addresses (the friendly path: you know them up
 *     front, and it works for people who already signed up). Better Auth's
 *     admin plugin only understands user *ids*, so we resolve emails → ids
 *     against D1 here.
 *   - `ADMIN_USER_IDS`, literal Better Auth user ids (no DB lookup needed).
 *
 * Signing in additionally *promotes* a config-listed user's `role` column to
 * 'admin' (see the sign-in hooks in createAuth), so the session the client
 * reads, the avatar menu's /admin shortcut, the account page's Pro display,
 * the Pro tier in lib/ai/tier.ts, reflects admin status without hand-editing
 * D1. These allowlists then act as the safety net for endpoints in between.
 *
 * The email→id lookup is one indexed D1 read, and `adminUserIds` is only ever
 * consulted inside the admin plugin's own endpoints (`/api/auth/admin/*`). So
 * we only run it for those requests; every other auth request, crucially the
 * hot `get-session` path that the cookie cache deliberately keeps off D1,
 * skips it. (With no request to inspect we resolve unconditionally.)
 */
async function resolveAdminUserIds(
  env: CloudflareEnv,
  request?: Request,
): Promise<string[]> {
  const ids = parseList(env.ADMIN_USER_IDS);
  const emails = parseList(env.ADMIN_EMAILS).map((e) => e.toLowerCase());
  if (emails.length === 0) return ids;

  const onAdminEndpoint =
    !request || new URL(request.url).pathname.includes("/admin/");
  if (!onAdminEndpoint) return ids;

  const placeholders = emails.map(() => "?").join(", ");
  const { results } = await env.DB.prepare(
    `SELECT id FROM user WHERE lower(email) IN (${placeholders})`,
  )
    .bind(...emails)
    .all<{ id: string }>();
  return [...new Set([...ids, ...results.map((row) => row.id)])];
}

/** Build a request-scoped Better Auth instance bound to this request's D1. */
export async function createAuth(env: CloudflareEnv, request?: Request) {
  // Require BETTER_AUTH_SECRET explicitly, never boot on a fallback key.
  //
  // Better Auth HMAC-signs the short-lived OAuth `state` cookie (and the session
  // cookie) with this secret. A social sign-in spans *two separate requests*:
  // `/api/auth/sign-in/social` sets the signed state cookie, then, seconds to
  // minutes later, after the Google consent screen, `/api/auth/callback/google`
  // must re-verify that cookie's signature against the SAME secret. Those two
  // requests can land on different Worker isolates or straddle a new deployment.
  // If the secret differs across the round-trip, the signature no longer
  // verifies, Better Auth treats the state cookie as missing, and the sign-in
  // aborts with `error=state_mismatch` (the user silently ends up signed out).
  //
  // Passing `undefined` here does NOT fail, Better Auth falls back to a
  // built-in key whose selection depends on `process.env.NODE_ENV`, which is not
  // reliably set on the Workers runtime. That turns a missing/misdelivered
  // binding into intermittent, deploy-correlated `state_mismatch` failures that
  // are miserable to debug. So fail closed and loud instead: a clear error at
  // request time beats cookies signed with a key that won't verify later.
  // (Rotating this secret intentionally invalidates all in-flight sign-ins and
  // existing sessions, expected, and rare.)
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET is not set. Set it with `wrangler secret put " +
        "BETTER_AUTH_SECRET` (and in .dev.vars locally). It signs the OAuth " +
        "state and session cookies; without a single stable value, Google " +
        "sign-in intermittently fails with ?error=state_mismatch.",
    );
  }

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

  // Email verification + password reset only turn on once a sender is wired up.
  const emailConfigured = Boolean(env.RESEND_API_KEY);

  const adminUserIdsResolved = await resolveAdminUserIds(env, request);

  const stateCookieDomain = oauthStateCookieDomain(env.BETTER_AUTH_URL);

  return betterAuth({
    // D1 via the Kysely SQLite dialect, the most Cloudflare-native path, with
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
    // CSRF origin allow-list. Better Auth always trusts `baseURL` (pinned to
    // https://dataslope.com so OAuth callbacks resolve). Preview deployments,
    // though, are served from the account's *.workers.dev subdomain, which is
    // therefore NOT trusted, so email/password sign-in and sign-up on a preview
    // fail the origin check with "Invalid origin". Trust the request's own
    // origin when it's a workers.dev host, so previews work without per-URL
    // config, plus any explicit TRUSTED_ORIGINS extras (custom preview/staging
    // domains). This function's result is merged with the defaults, so baseURL
    // stays trusted. It's not a production CSRF hole: production runs on the
    // custom domain (never the workers.dev branch), and session cookies are
    // SameSite=Lax. NOTE: social login still can't *complete* on a preview,
    // its OAuth redirect_uri is pinned to baseURL, so Google/GitHub return to
    // production; use email/password to exercise auth on a preview URL.
    trustedOrigins: (req) => {
      const origins = parseList(env.TRUSTED_ORIGINS);
      try {
        if (req) {
          const { origin, hostname } = new URL(req.url);
          if (hostname.endsWith(".workers.dev")) origins.push(origin);
        }
      } catch {
        // A request without a parseable URL contributes no extra origin.
      }
      return origins;
    },
    // Where failed OAuth callbacks land. Without this, Better Auth bounces
    // them through its built-in /api/auth/error page, which in production
    // redirects to `/?error=<code>`, stranding codes like `state_mismatch`
    // in the home page URL with no UI that reads them. The most common
    // occurrence isn't even a real failure: a *duplicate* callback request
    // (back button, browser re-fetch) whose one-time state was already
    // consumed by the request that signed the user in, so they're signed in
    // yet parked on `/?error=state_mismatch`. Land on /sign-in instead:
    // SignInClient strips the code from the URL and shows friendly copy for
    // genuine failures, while an already-signed-in visitor (the duplicate-
    // callback case) is immediately redirected on to /account.
    onAPIError: { errorURL: "/sign-in" },
    // Email + password sign-in. Passwords are hashed by Better Auth and stored
    // in the `account` table (providerId "credential"), the existing schema
    // already has the `password` column, so no migration change is needed.
    //
    // Verification + reset are gated on a configured email sender (Resend, via
    // RESEND_API_KEY). This is fail-safe: with no key set, password sign-in
    // still works exactly as before and the reset/verify flows are simply
    // inert, so a missing key can never lock everyone out. Once the key is set,
    // new sign-ups must verify their email before they can sign in, and the
    // forgot-password flow goes live. See lib/auth/email.ts.
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: emailConfigured,
      sendResetPassword: emailConfigured
        ? async ({ user, url }) => {
            await sendEmail(env, { to: user.email, ...resetPasswordEmail(url) });
          }
        : undefined,
    },
    emailVerification: emailConfigured
      ? {
          sendOnSignUp: true,
          autoSignInAfterVerification: true,
          sendVerificationEmail: async ({ user, url }) => {
            await sendEmail(env, { to: user.email, ...verifyEmail(url) });
          },
        }
      : undefined,
    socialProviders,
    // Fix for the "first Google sign-in fails with ?error=state_mismatch,
    // clicking again works" loop. Two hardenings of the one-time OAuth `state`
    // cookie, which the callback demands back (see oauthStateCookieDomain):
    //
    //   - `domain`: scope it to the registrable domain instead of host-only,
    //     so a flow started on www.dataslope.com survives Google returning to
    //     the pinned apex callback. (workers.dev previews still can't complete
    //     social login, Google only redirects to the registered production
    //     URI, and no cookie scope spans workers.dev → dataslope.com.)
    //   - `maxAge`: Better Auth sets the cookie to 5 minutes but honours the
    //     server-side state for 10, someone who sits on Google's account
    //     chooser for 6 minutes would fail the cookie check with the same
    //     stale-attempt error. Align the cookie with the 10-minute window.
    //
    // Only the `state` cookie is touched; session cookies keep their defaults.
    advanced: {
      cookies: {
        state: {
          attributes: {
            ...(stateCookieDomain ? { domain: stateCookieDomain } : {}),
            maxAge: 600,
          },
        },
      },
    },
    // Membership tier, surfaced on the session so the "Ask AI" endpoint can
    // pick the model by plan (free → cheaper OpenRouter model; pro → OpenAI).
    // Backed by the `plan` column added in migrations/0003. `input: false` means
    // users can't set their own plan via the sign-up/update API, it's changed
    // server-side only (a future billing webhook, or an admin). Defaults to
    // 'free'. See lib/ai/tier.ts, which also honours a PRO_USER_EMAILS allowlist
    // and admins as a bootstrap before billing exists.
    user: {
      additionalFields: {
        plan: {
          type: "string",
          required: false,
          defaultValue: "free",
          input: false,
        },
      },
    },
    // Complete the ADMIN_EMAILS / ADMIN_USER_IDS bootstrap: config-listed
    // admins get their `role` column promoted to 'admin' when they sign in,
    // so the session the client reads carries admin status, which surfaces
    // the /admin shortcut in the avatar menu and, since admins are treated
    // as Pro (lib/ai/tier.ts), the full Pro feature set. See
    // lib/auth/adminBootstrap.ts for the promotion semantics (one-way,
    // no-op for everyone not config-listed).
    //
    // The promotion runs as a request-level *before* hook on the sign-in and
    // OAuth-callback endpoints, not a session.create database hook, so the
    // role is already 'admin' when the handler reads the user row. That
    // matters because the handler seeds the 5-minute session cookie cache
    // from that read: a database hook fires after the read, which would leave
    // a freshly signed-in admin looking like a plain user until the cache
    // expired. Sign-in requests are rare, so this stays off the hot
    // get-session path.
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!ctx.path.startsWith("/sign-in") && !ctx.path.startsWith("/callback")) {
          return;
        }
        try {
          await promoteConfiguredAdmins(env.DB, {
            adminUserIds: parseList(env.ADMIN_USER_IDS),
            adminEmails: parseList(env.ADMIN_EMAILS),
          });
        } catch {
          // Best-effort: a failed promotion must never abort a sign-in.
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          // New sign-ups don't have a row for the hook above to promote,
          // write role 'admin' into the INSERT itself, so even the first
          // session's cookie cache carries the admin role.
          before: async (user) => {
            const email = (user.email ?? "").toLowerCase();
            const isConfigAdmin = parseList(env.ADMIN_EMAILS)
              .map((e) => e.toLowerCase())
              .includes(email);
            if (!isConfigAdmin) return;
            return { data: { ...user, role: "admin" } };
          },
        },
      },
    },
    // Admin capabilities (list/remove/ban users) for the gated /admin
    // dashboard. The `removeUser` action is a hard delete: it drops the `user`
    // row, which cascades to that user's `session` + `account` rows (see the
    // ON DELETE CASCADE in migrations/0001) and frees their unique email, so a
    // removed user can immediately sign up again with OAuth or email/password.
    // Authorization is enforced *server-side* on every `admin.*` endpoint, so
    // the dashboard staying a statically-prerendered, client-read page (the
    // codebase's "auth gates actions, not content" rule) is still safe: a
    // non-admin who loads /admin simply gets 403s and an empty screen.
    //
    // Polar billing (Pro subscriptions) mounts checkout/portal/webhook
    // endpoints when configured, see lib/billing/polar.ts. Like every other
    // integration here it's fail-safe: with no POLAR_* config the plugin
    // simply isn't registered and auth runs exactly as before.
    plugins: (() => {
      const adminPlugin = admin({
        adminUserIds: adminUserIdsResolved,
      });
      const billing = polarPlugin(env);
      return billing ? [adminPlugin, billing] : [adminPlugin];
    })(),
    session: {
      // Cache the session in a short-lived signed cookie so the common
      // "who am I" check is served from the cookie instead of a D1 read on
      // every request, D1's tight write/read budget rewards this, and it
      // keeps auth cheap at the edge.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // No outbound telemetry from the Worker.
    telemetry: { enabled: false },
  });
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;
