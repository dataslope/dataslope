import { describe, expect, it } from "vitest";
import {
  parseAllowedOrigins,
  isOriginInAllowList,
  wildcardOriginToRegExp,
  isLocalhostOrigin,
} from "../cloudflare-cors-proxy/src/origins";

// The allowlist the proxy actually ships with (see cloudflare-cors-proxy's
// README): the app's production domains plus its Cloudflare Workers hosts.
// This used to be modelled on the Vercel deployment, whose preview wildcard
// put the variable part in a *suffix* segment
// (`dataslope-*-<team>.vercel.app`). Cloudflare inverts that — the version or
// alias is a *prefix* on a fixed worker-name host — so the old fixtures were
// exercising a pattern shape this project no longer deploys, and leaving the
// deployed one untested.
const ALLOW = parseAllowedOrigins(
  "http://localhost:3000,https://dataslope.com,https://www.dataslope.com,https://dataslope.subwaymatch.workers.dev,https://*-dataslope.subwaymatch.workers.dev",
);

describe("parseAllowedOrigins", () => {
  it("separates exact entries from wildcard patterns", () => {
    expect(ALLOW.exact.has("https://dataslope.com")).toBe(true);
    expect(
      ALLOW.exact.has("https://dataslope.subwaymatch.workers.dev"),
    ).toBe(true);
    expect(ALLOW.patterns).toHaveLength(1);
  });

  it("trims whitespace and strips trailing slashes", () => {
    const a = parseAllowedOrigins(" https://dataslope.com/ , https://x.com ");
    expect(a.exact.has("https://dataslope.com")).toBe(true);
    expect(a.exact.has("https://x.com")).toBe(true);
  });

  it("ignores empty entries", () => {
    const a = parseAllowedOrigins("https://a.com,,  ,https://b.com");
    expect(a.exact.size).toBe(2);
  });
});

describe("isOriginInAllowList, exact origins", () => {
  it("accepts configured production and localhost origins", () => {
    expect(isOriginInAllowList("https://dataslope.com", ALLOW)).toBe(true);
    expect(isOriginInAllowList("https://www.dataslope.com", ALLOW)).toBe(true);
    expect(isOriginInAllowList("http://localhost:3000", ALLOW)).toBe(true);
    expect(
      isOriginInAllowList("https://dataslope.subwaymatch.workers.dev", ALLOW),
    ).toBe(true);
  });

  it("rejects unrelated origins", () => {
    expect(isOriginInAllowList("https://evil.com", ALLOW)).toBe(false);
    expect(isOriginInAllowList("https://dataslope.com.evil.com", ALLOW)).toBe(
      false,
    );
  });
});

describe("isOriginInAllowList, Workers preview wildcards", () => {
  it("accepts version and alias preview deployments of the app worker", () => {
    // Per-version hostname.
    expect(
      isOriginInAllowList(
        "https://6f1c2a3b-dataslope.subwaymatch.workers.dev",
        ALLOW,
      ),
    ).toBe(true);
    // Named alias.
    expect(
      isOriginInAllowList(
        "https://staging-dataslope.subwaymatch.workers.dev",
        ALLOW,
      ),
    ).toBe(true);
  });

  it("rejects another worker on the same workers.dev subdomain", () => {
    // The pattern's fixed `-dataslope` segment is what scopes it to the app
    // worker; a different worker on the same owner subdomain must not match.
    expect(
      isOriginInAllowList(
        "https://some-other-worker.subwaymatch.workers.dev",
        ALLOW,
      ),
    ).toBe(false);
  });

  it("rejects the same worker name under a different (attacker) subdomain", () => {
    expect(
      isOriginInAllowList(
        "https://staging-dataslope.attacker.workers.dev",
        ALLOW,
      ),
    ).toBe(false);
  });

  it("does not let the wildcard cross a dot into another domain", () => {
    expect(
      isOriginInAllowList(
        "https://x.staging-dataslope.subwaymatch.workers.dev",
        ALLOW,
      ),
    ).toBe(false);
    expect(
      isOriginInAllowList(
        "https://staging-dataslope.subwaymatch.workers.dev.evil.com",
        ALLOW,
      ),
    ).toBe(false);
  });

  it("requires the https scheme exactly", () => {
    expect(
      isOriginInAllowList(
        "http://staging-dataslope.subwaymatch.workers.dev",
        ALLOW,
      ),
    ).toBe(false);
  });
});

describe("isLocalhostOrigin", () => {
  it("accepts localhost on any port and scheme", () => {
    expect(isLocalhostOrigin("http://localhost:3000")).toBe(true);
    expect(isLocalhostOrigin("http://localhost:8787")).toBe(true);
    expect(isLocalhostOrigin("https://localhost")).toBe(true);
  });

  it("rejects non-localhost and malformed origins", () => {
    expect(isLocalhostOrigin("https://dataslope.com")).toBe(false);
    expect(isLocalhostOrigin("http://localhost.evil.com")).toBe(false);
    expect(isLocalhostOrigin("not a url")).toBe(false);
  });
});

describe("wildcardOriginToRegExp", () => {
  it("escapes regex metacharacters in the literal segments", () => {
    const re = wildcardOriginToRegExp("https://a.b-*.example.app");
    // The dots are literal, not 'any char'.
    expect(re.test("https://aXb-123.example.app")).toBe(false);
    expect(re.test("https://a.b-123.example.app")).toBe(true);
  });

  it("requires at least one character for the wildcard", () => {
    const re = wildcardOriginToRegExp("https://*-dataslope.example.workers.dev");
    expect(re.test("https://-dataslope.example.workers.dev")).toBe(false);
    expect(re.test("https://x-dataslope.example.workers.dev")).toBe(true);
  });
});
