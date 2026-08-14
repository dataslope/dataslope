/**
 * Better Auth server configuration, backed by Cloudflare D1.
 *
 * One instance per request: the D1 binding only exists at request time, so
 * this is a factory — call `createAuth(env, request)` per request, never a
 * module-level singleton. Auth gates *actions* (save, share, AI), never
 * *content*: lessons stay statically prerendered and are read with no session.
 * Keep auth out of middleware.ts (rough edges on the Workers runtime).
 */
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { admin, oAuthProxy } from "better-auth/plugins";
import { D1Dialect } from "kysely-d1";
import { promoteConfiguredAdmins } from "@/lib/auth/adminBootstrap";
import {
  deleteAccountEmail,
  resetPasswordEmail,
  sendEmail,
  verifyEmail,
} from "@/lib/auth/email";
import { polarPlugin } from "@/lib/billing/polar";
import { deleteAllUserObjects } from "@/lib/workspaces/store";

/** Split a comma-separated secret into a trimmed, non-empty list. */
export function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Domain attribute for the OAuth `state` cookie, derived from BETTER_AUTH_URL.
 * Scoped to the registrable domain so a sign-in started on www.dataslope.com
 * can complete on the apex callback (host-only cookies caused
 * `?error=state_mismatch`). Session cookies stay host-only. Returns undefined
 * when the host is not a dotted DNS name (localhost, IP literals): browsers
 * reject a Domain they can't tail-match and would drop the cookie entirely.
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
 * Is `requestHost` the baseURL host or a subdomain of it? Widens the CSRF
 * origin allow-list so www.dataslope.com is trusted while baseURL pins the
 * apex (otherwise sign-up from www fails with "Invalid origin"). The subdomain
 * test is anchored on a leading dot so look-alikes (dataslope.com.evil.com)
 * never match, and this only ever adds the request's own host — cross-site
 * POSTs are still rejected.
 */
export function isSameSiteHost(
  baseURL: string | undefined,
  requestHost: string | undefined,
): boolean {
  if (!baseURL || !requestHost) return false;
  let baseHost: string;
  try {
    baseHost = new URL(baseURL).hostname.toLowerCase();
  } catch {
    return false;
  }
  const req = requestHost.toLowerCase();
  return req === baseHost || req.endsWith(`.${baseHost}`);
}

/**
 * The origin THIS deployment is served from: the request's own origin on a
 * *.workers.dev preview, otherwise the pinned production URL. Drives the state
 * cookie's Domain and oAuthProxy's currentURL, both of which must distinguish
 * previews from production. Only workers.dev floats; www resolves to the
 * pinned apex and is treated as production.
 */
export function deploymentOrigin(
  pinned: string | undefined,
  request?: Request,
): string | undefined {
  if (!request) return pinned;
  try {
    const { origin, hostname } = new URL(request.url);
    if (hostname.endsWith(".workers.dev")) return origin;
  } catch {
    // Unparseable request URL → fall back to the pinned value.
  }
  return pinned;
}

/**
 * Extra CSRF-trusted origins merged onto Better Auth's defaults: configured
 * TRUSTED_ORIGINS, plus the request's own origin when it's a *.workers.dev
 * preview or same-site with BETTER_AUTH_URL. Only ever adds the request's OWN
 * origin, so cross-site POSTs are still rejected. Better Auth skips the origin
 * check under NODE_ENV=test; the endpoint tests force it back on with
 * `advanced.disableOriginCheck: false`.
 */
export function extraTrustedOrigins(
  env: CloudflareEnv,
  request?: Request,
): string[] {
  const origins = parseList(env.TRUSTED_ORIGINS);
  try {
    if (request) {
      const { origin, hostname } = new URL(request.url);
      if (
        hostname.endsWith(".workers.dev") ||
        isSameSiteHost(env.BETTER_AUTH_URL, hostname)
      ) {
        origins.push(origin);
      }
    }
  } catch {
    // A request without a parseable URL contributes no extra origin.
  }
  return origins;
}

/**
 * Admin user ids from config: ADMIN_USER_IDS (literal ids) merged with
 * ADMIN_EMAILS resolved to ids via D1. Both grant admin regardless of the
 * `role` column, which solves the bootstrap problem (no admin exists to
 * promote the first one). The D1 lookup only runs for `/admin/` endpoints so
 * the hot get-session path stays off D1; with no request to inspect we
 * resolve unconditionally.
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
  // Require BETTER_AUTH_SECRET explicitly. A social sign-in spans two requests
  // that must verify the signed state cookie against the SAME secret; passing
  // undefined makes Better Auth fall back to a NODE_ENV-dependent built-in key
  // (NODE_ENV isn't reliable on Workers), turning a missing binding into
  // intermittent `state_mismatch` failures. Fail closed and loud instead.
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      "BETTER_AUTH_SECRET is not set. Set it with `wrangler secret put " +
        "BETTER_AUTH_SECRET` (and in .dev.vars locally). It signs the OAuth " +
        "state and session cookies; without a single stable value, Google " +
        "sign-in intermittently fails with ?error=state_mismatch.",
    );
  }

  // Only advertise a provider when both halves of its credential pair are
  // present, so a partially-configured environment fails closed.
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

  const thisOrigin = deploymentOrigin(env.BETTER_AUTH_URL, request);

  // Derive the state cookie's Domain from THIS deployment's origin: previews
  // get their own host-valid workers.dev Domain (browsers reject
  // Domain=dataslope.com there and would drop the cookie); production keeps
  // Domain=dataslope.com.
  const stateCookieDomain = oauthStateCookieDomain(thisOrigin);

  // Enable the OAuth-proxy relay only with a pinned production origin and at
  // least one social provider; it's a no-op on the production origin itself.
  const oauthProxyEnabled =
    Boolean(env.BETTER_AUTH_URL) && Object.keys(socialProviders).length > 0;

  return betterAuth({
    // D1 via the Kysely SQLite dialect (schema in /migrations). One dialect
    // per call = one connection per request.
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: "sqlite",
    },
    secret: env.BETTER_AUTH_SECRET,
    // Canonical origin for OAuth callback URLs. Stays pinned on every host,
    // including previews: oAuthProxy (below) does the preview relay via its
    // own `currentURL`, so the base URL never has to float.
    baseURL: env.BETTER_AUTH_URL,
    // CSRF origin allow-list, merged with the defaults (baseURL stays
    // trusted). Adds the request's own origin for same-site hosts (www) and
    // *.workers.dev previews, plus TRUSTED_ORIGINS extras. See
    // extraTrustedOrigins.
    trustedOrigins: (req) => extraTrustedOrigins(env, req),
    // Land failed OAuth callbacks on /sign-in (the default is `/?error=<code>`
    // with no UI that reads it). Most are duplicate callbacks whose one-time
    // state was already consumed: SignInClient strips the code and redirects
    // already-signed-in visitors on to /account.
    onAPIError: { errorURL: "/sign-in" },
    // Verification + reset are gated on a configured Resend sender: with no
    // key set those flows are inert but password sign-in still works, so a
    // missing key can never lock everyone out. See lib/auth/email.ts.
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
    // Harden the one-time OAuth `state` cookie (fixes "first Google sign-in
    // fails with state_mismatch"): scope it to the registrable domain so a
    // flow started on www survives the apex callback, and align maxAge with
    // Better Auth's 10-minute server-side state window (the cookie default is
    // 5). Session cookies keep their defaults.
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
    // Membership tier, surfaced on the session (see lib/ai/tier.ts). `plan`
    // column from migrations/auth/0003; `input: false` so users can't set
    // their own plan — it's changed server-side only.
    user: {
      additionalFields: {
        plan: {
          type: "string",
          required: false,
          defaultValue: "free",
          input: false,
        },
      },
      // Self-serve account deletion. The user row's deletion cascades to
      // session/account and workspace/share rows, but the R2 payloads behind
      // them don't, so beforeDelete drops those first — best-effort (never
      // throws) so a storage hiccup can't trap a user. With a configured
      // sender deletion requires an emailed confirmation link; without one,
      // Better Auth requires a fresh session or the password. NOTE: does not
      // cancel a Pro user's Polar subscription; the account page warns to
      // cancel via the billing portal first.
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await deleteAllUserObjects(env, user.id);
        },
        ...(emailConfigured
          ? {
              sendDeleteAccountVerification: async ({
                user,
                url,
              }: {
                user: { email: string };
                url: string;
              }) => {
                await sendEmail(env, {
                  to: user.email,
                  ...deleteAccountEmail(url),
                });
              },
            }
          : {}),
      },
    },
    // Promote config-listed admins' `role` column at sign-in (see
    // lib/auth/adminBootstrap.ts). Must run as a *before* hook on
    // sign-in/callback, not a session.create database hook: the handler seeds
    // the 5-minute session cookie cache from its user-row read, and a
    // database hook fires after that read, leaving a fresh admin looking like
    // a plain user until the cache expired.
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
          // New sign-ups have no row for the hook above to promote — write
          // role 'admin' into the INSERT so even the first session's cookie
          // cache carries it.
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
    // admin: list/remove/ban for the /admin dashboard. removeUser is a hard
    // delete (cascades to session/account rows, frees the email); every
    // admin.* endpoint is authorized server-side, so /admin can stay
    // statically prerendered.
    // polarPlugin: Pro billing endpoints when configured; with no POLAR_*
    // config the plugin simply isn't registered (see lib/billing/polar.ts).
    // oAuthProxy: lets social sign-in complete on a workers.dev preview —
    // Google only redirects to the registered production callback, so the
    // proxy rewrites redirect_uri, exchanges the code on production, and
    // relays the session back to the preview. No-ops on production
    // (currentURL === productionURL). Needs one secret shared across
    // deployments; BETTER_AUTH_SECRET already is.
    plugins: (() => {
      const adminPlugin = admin({
        adminUserIds: adminUserIdsResolved,
      });
      const billing = polarPlugin(env);
      const proxy = oauthProxyEnabled
        ? oAuthProxy({
            productionURL: env.BETTER_AUTH_URL,
            // Pin currentURL to THIS deployment's origin so only workers.dev
            // previews are proxied; without it the plugin falls back to the
            // raw request host and would proxy www too.
            currentURL: thisOrigin,
            secret: env.OAUTH_PROXY_SECRET ?? env.BETTER_AUTH_SECRET,
          })
        : null;
      return [
        adminPlugin,
        ...(billing ? [billing] : []),
        ...(proxy ? [proxy] : []),
      ];
    })(),
    session: {
      // Serve the common "who am I" check from a short-lived signed cookie
      // instead of a D1 read per request.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    // No outbound telemetry from the Worker.
    telemetry: { enabled: false },
  });
}

export type Auth = Awaited<ReturnType<typeof createAuth>>;
