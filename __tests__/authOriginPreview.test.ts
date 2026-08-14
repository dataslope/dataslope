/**
 * CSRF origin allow-list + Cloudflare-preview auth (lib/auth/server.ts).
 * Covers (1) the "Invalid origin" fix: Better Auth trusts only BETTER_AUTH_URL
 * (the apex) but production also serves www, so sign-up POSTs from www were
 * rejected — isSameSiteHost/extraTrustedOrigins trust the apex, its
 * subdomains, and *.workers.dev previews; (2) oAuthProxy engaging ONLY on
 * previews, leaving apex/www production flow untouched. Better Auth skips the
 * origin check under NODE_ENV=test, so the end-to-end tests force
 * disableOriginCheck: false with the same extraTrustedOrigins.
 */
import { describe, it, expect } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import {
  createAuth,
  deploymentOrigin,
  extraTrustedOrigins,
  isSameSiteHost,
} from "../lib/auth/server";

const APEX = "https://dataslope.com";
const WWW = "https://www.dataslope.com";
const PREVIEW = "https://x-dataslope.subwaymatch.workers.dev";

/** Minimal D1 that echoes back INSERT ... RETURNING * rows (enough for the
 *  sign-up / social-verification writes) and, optionally, records the `value`
 *  column of the last `verification` insert so a test can inspect it. */
function echoDb(sink?: { value?: string }): D1Database {
  function stmt(sql: string, binds: unknown[] = []) {
    const cols = /\(([^)]*)\)\s*values/i
      .exec(sql)?.[1]
      ?.split(",")
      .map((c) => c.trim().replace(/^"|"$/g, ""));
    return {
      bind: (...b: unknown[]) => stmt(sql, b),
      async all() {
        if (sink && cols && /insert into "verification"/i.test(sql)) {
          const idx = cols.indexOf("value");
          if (idx >= 0) sink.value = binds[idx] as string;
        }
        const row = cols
          ? Object.fromEntries(cols.map((c, i) => [c, binds[i]]))
          : undefined;
        return { results: row ? [row] : [], success: true, meta: {} };
      },
      async run() {
        return { results: [], success: true, meta: {} };
      },
      async first() {
        return null;
      },
      raw: async () => [],
    };
  }
  return { prepare: (sql: string) => stmt(sql) } as unknown as D1Database;
}

function makeEnv(overrides: Partial<CloudflareEnv> = {}): CloudflareEnv {
  return {
    DB: echoDb(),
    BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
    BETTER_AUTH_URL: APEX,
    GOOGLE_CLIENT_ID: "test-google-id",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    ...overrides,
  } as CloudflareEnv;
}

describe("isSameSiteHost", () => {
  it("trusts the apex and its subdomains", () => {
    expect(isSameSiteHost(APEX, "dataslope.com")).toBe(true);
    expect(isSameSiteHost(APEX, "www.dataslope.com")).toBe(true);
    expect(isSameSiteHost(APEX, "app.dataslope.com")).toBe(true);
    expect(isSameSiteHost(APEX, "DATASLOPE.COM")).toBe(true); // case-insensitive
  });

  it("rejects look-alike and unrelated hosts", () => {
    expect(isSameSiteHost(APEX, "dataslope.com.evil.com")).toBe(false);
    expect(isSameSiteHost(APEX, "notdataslope.com")).toBe(false);
    expect(isSameSiteHost(APEX, "evil.example")).toBe(false);
    // A leading-dot anchor is required: bare "com" must not match.
    expect(isSameSiteHost(APEX, "com")).toBe(false);
  });

  it("returns false for missing or unparseable inputs", () => {
    expect(isSameSiteHost(undefined, "www.dataslope.com")).toBe(false);
    expect(isSameSiteHost(APEX, undefined)).toBe(false);
    expect(isSameSiteHost("not a url", "www.dataslope.com")).toBe(false);
  });
});

describe("deploymentOrigin", () => {
  const req = (origin: string) =>
    new Request(`${origin}/api/auth/sign-in/social`, { method: "POST" });

  it("floats to the request origin only on *.workers.dev", () => {
    expect(deploymentOrigin(APEX, req(PREVIEW))).toBe(PREVIEW);
  });

  it("keeps the pinned apex on apex and www requests", () => {
    expect(deploymentOrigin(APEX, req(APEX))).toBe(APEX);
    expect(deploymentOrigin(APEX, req(WWW))).toBe(APEX);
  });

  it("returns the pinned value for request-less calls", () => {
    expect(deploymentOrigin(APEX)).toBe(APEX);
    expect(deploymentOrigin(undefined)).toBeUndefined();
  });
});

describe("extraTrustedOrigins", () => {
  const req = (origin: string) =>
    new Request(`${origin}/api/auth/sign-up/email`, { method: "POST" });

  it("adds www (and apex) so www.dataslope.com is trusted", () => {
    expect(extraTrustedOrigins(makeEnv(), req(WWW))).toContain(WWW);
    expect(extraTrustedOrigins(makeEnv(), req(APEX))).toContain(APEX);
  });

  it("adds the *.workers.dev preview origin", () => {
    expect(extraTrustedOrigins(makeEnv(), req(PREVIEW))).toContain(PREVIEW);
  });

  it("never adds an unrelated origin", () => {
    expect(extraTrustedOrigins(makeEnv(), req("https://evil.example"))).not.toContain(
      "https://evil.example",
    );
  });

  it("passes through the configured TRUSTED_ORIGINS", () => {
    const env = makeEnv({ TRUSTED_ORIGINS: "https://staging.example, https://qa.example" });
    const origins = extraTrustedOrigins(env, req(APEX));
    expect(origins).toContain("https://staging.example");
    expect(origins).toContain("https://qa.example");
  });
});

/**
 * End-to-end origin enforcement. Built with disableOriginCheck:false (Better
 * Auth otherwise skips the check under NODE_ENV=test) and the real
 * extraTrustedOrigins, so this exercises the exact list createAuth produces.
 */
function enforcingAuth(env: CloudflareEnv) {
  return betterAuth({
    database: { dialect: new D1Dialect({ database: env.DB }), type: "sqlite" },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true },
    trustedOrigins: (req) => extraTrustedOrigins(env, req),
    advanced: { disableOriginCheck: false },
  });
}

async function signUp(reqHost: string, origin: string) {
  const auth = enforcingAuth(makeEnv());
  const res = await auth.handler(
    new Request(`https://${reqHost}/api/auth/sign-up/email`, {
      method: "POST",
      // A cookie is what makes Better Auth run the origin check on this request.
      headers: { "content-type": "application/json", origin, cookie: "sid=1" },
      body: JSON.stringify({
        email: "user@example.com",
        password: "supersecret123",
        name: "User",
      }),
    }),
  );
  return { status: res.status, body: await res.text() };
}

describe("origin enforcement (email sign-up)", () => {
  it("accepts a same-site request from www.dataslope.com (the bug fix)", async () => {
    const { status, body } = await signUp("www.dataslope.com", WWW);
    expect(status).not.toBe(403);
    expect(body).not.toMatch(/invalid origin/i);
  });

  it("accepts a request from a *.workers.dev preview", async () => {
    const host = "x-dataslope.subwaymatch.workers.dev";
    const { status, body } = await signUp(host, `https://${host}`);
    expect(status).not.toBe(403);
    expect(body).not.toMatch(/invalid origin/i);
  });

  it("still rejects a genuine cross-site Origin (CSRF intact)", async () => {
    // Request arrives at the trusted apex host but claims an evil Origin.
    const { status, body } = await signUp("dataslope.com", "https://evil.example");
    expect(status).toBe(403);
    expect(body).toMatch(/invalid origin/i);
  });
});

/**
 * oAuthProxy engagement. The stored `verification.value.callbackURL` tells us
 * whether the proxy rewrote the flow: on a preview it routes through the
 * preview's /oauth-proxy-callback; on apex/www it stays the raw app path.
 */
async function socialCallbackURL(origin: string) {
  const sink: { value?: string } = {};
  const env = makeEnv({ DB: echoDb(sink) });
  const auth = await createAuth(
    env,
    new Request(`${origin}/api/auth/sign-in/social`, { method: "POST" }),
  );
  const res = await auth.handler(
    new Request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ provider: "google", callbackURL: "/account" }),
    }),
  );
  const { url } = (await res.json()) as { url: string };
  const stored = sink.value ? (JSON.parse(sink.value) as { callbackURL: string }) : undefined;
  return {
    redirectUri: new URL(url).searchParams.get("redirect_uri"),
    stateCookieDomain:
      /domain=([^;]+)/i.exec(res.headers.get("set-cookie") ?? "")?.[1] ?? null,
    storedCallbackURL: stored?.callbackURL,
  };
}

describe("oAuthProxy on Cloudflare previews", () => {
  it("engages on a *.workers.dev preview: relays via the preview and pins redirect_uri to production", async () => {
    const r = await socialCallbackURL(PREVIEW);
    // The provider is still sent to the REGISTERED production callback…
    expect(r.redirectUri).toBe(`${APEX}/api/auth/callback/google`);
    // …but the post-auth hop routes back through the preview's proxy endpoint.
    expect(r.storedCallbackURL).toContain(`${PREVIEW}/api/auth/oauth-proxy-callback`);
    // And the state cookie is scoped to the preview host, not dataslope.com.
    expect(r.stateCookieDomain).toBe("x-dataslope.subwaymatch.workers.dev");
  });

  it("is a no-op on the apex (production flow unchanged)", async () => {
    const r = await socialCallbackURL(APEX);
    expect(r.redirectUri).toBe(`${APEX}/api/auth/callback/google`);
    expect(r.storedCallbackURL).toBe("/account");
    expect(r.stateCookieDomain).toBe("dataslope.com");
  });

  it("is a no-op on www (keeps the domain-scoped state cookie, no proxy)", async () => {
    const r = await socialCallbackURL(WWW);
    expect(r.redirectUri).toBe(`${APEX}/api/auth/callback/google`);
    expect(r.storedCallbackURL).toBe("/account");
    expect(r.stateCookieDomain).toBe("dataslope.com");
  });
});
