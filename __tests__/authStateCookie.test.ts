/**
 * OAuth `state` cookie scoping (lib/auth/server.ts): the state cookie must
 * come back on the OAuth callback, which Google always sends to the
 * BETTER_AUTH_URL host. Host-only cookies made every flow started on www fail
 * (?error=state_mismatch, works on retry); the fix scopes the cookie to the
 * registrable domain and matches the server-side state's 10-minute window.
 * Covers the derivation rules (including hosts where Domain must NOT be
 * emitted — browsers reject a Domain they can't tail-match) and the full
 * sign-in/social endpoint, both against a mocked D1.
 */
import { describe, it, expect } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import { createAuth, oauthStateCookieDomain } from "../lib/auth/server";

describe("oauthStateCookieDomain", () => {
  it("derives the hostname from the production base URL", () => {
    expect(oauthStateCookieDomain("https://dataslope.com")).toBe(
      "dataslope.com",
    );
  });

  it("keeps a subdomain base URL scoped to that subdomain", () => {
    // Domain=www.dataslope.com covers www and *.www, never the apex. That is
    // the correct (narrowest) scope when the callback host is the subdomain.
    expect(oauthStateCookieDomain("https://www.dataslope.com")).toBe(
      "www.dataslope.com",
    );
  });

  it("returns undefined when BETTER_AUTH_URL is unset", () => {
    expect(oauthStateCookieDomain(undefined)).toBeUndefined();
    expect(oauthStateCookieDomain("")).toBeUndefined();
  });

  it("returns undefined for localhost (dotless host)", () => {
    expect(oauthStateCookieDomain("http://localhost:3000")).toBeUndefined();
  });

  it("returns undefined for IP literals", () => {
    expect(oauthStateCookieDomain("http://127.0.0.1:8787")).toBeUndefined();
    expect(oauthStateCookieDomain("http://[::1]:8787")).toBeUndefined();
  });

  it("returns undefined for an unparseable URL", () => {
    expect(oauthStateCookieDomain("not a url")).toBeUndefined();
  });
});

/**
 * Minimal D1 that satisfies Better Auth's kysely adapter for this flow: the
 * only statement `sign-in/social` runs is `INSERT INTO "verification" (...)
 * VALUES (...) RETURNING *`, so echo the inserted row back by zipping the
 * column list out of the SQL with the bound values.
 */
function echoDb(): D1Database {
  function stmt(sql: string, binds: unknown[] = []) {
    return {
      bind: (...b: unknown[]) => stmt(sql, b),
      async all() {
        const cols = /\(([^)]*)\)\s*values/i
          .exec(sql)?.[1]
          ?.split(",")
          .map((c) => c.trim().replace(/^"|"$/g, ""));
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
    BETTER_AUTH_URL: "https://dataslope.com",
    GOOGLE_CLIENT_ID: "test-google-id",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    ...overrides,
  } as CloudflareEnv;
}

async function startGoogleSignIn(env: CloudflareEnv, origin: string) {
  const auth = await createAuth(env);
  return auth.handler(
    new Request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ provider: "google", callbackURL: "/account" }),
    }),
  );
}

describe("sign-in/social state cookie", () => {
  it("sets a domain-scoped state cookie with the 10-minute lifetime", async () => {
    const res = await startGoogleSignIn(makeEnv(), "https://dataslope.com");
    expect(res.status).toBe(200);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("__Secure-better-auth.state=");
    // The fix: valid on the apex AND every subdomain, so a flow started on
    // www survives Google redirecting back to the apex callback…
    expect(cookie).toMatch(/domain=dataslope\.com/i);
    // …and it lives as long as the server-side state (10 min), not 5.
    expect(cookie).toMatch(/max-age=600/i);
    // Lax is what lets the cookie ride the top-level redirect from Google.
    expect(cookie).toMatch(/samesite=lax/i);

    // redirect_uri stays pinned to BETTER_AUTH_URL regardless of the
    // request's own host, that pinning is why the domain scope is needed.
    const { url } = (await res.json()) as { url: string };
    expect(new URL(url).searchParams.get("redirect_uri")).toBe(
      "https://dataslope.com/api/auth/callback/google",
    );
  });

  it("keeps the cookie host-only when BETTER_AUTH_URL is unset (local dev)", async () => {
    const res = await startGoogleSignIn(
      makeEnv({ BETTER_AUTH_URL: undefined }),
      "https://dataslope.com",
    );
    expect(res.status).toBe(200);

    const cookie = res.headers.get("set-cookie") ?? "";
    // No baseURL → the __Secure- prefix follows NODE_ENV instead, so match
    // the unprefixed name (a substring of the prefixed one, either way).
    expect(cookie).toContain("better-auth.state=");
    expect(cookie).not.toMatch(/domain=/i);
    expect(cookie).toMatch(/max-age=600/i);
  });
});
