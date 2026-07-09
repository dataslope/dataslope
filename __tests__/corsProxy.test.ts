import { describe, expect, it } from "vitest";
import {
  parseAllowedOrigins,
  isOriginInAllowList,
  wildcardOriginToRegExp,
  isLocalhostOrigin,
} from "../cloudflare-cors-proxy/src/origins";

const ALLOW = parseAllowedOrigins(
  "http://localhost:3000,https://dataslope.com,https://www.dataslope.com,https://dataslope.vercel.app,https://dataslope-*-ye-joo-parks-projects.vercel.app",
);

describe("parseAllowedOrigins", () => {
  it("separates exact entries from wildcard patterns", () => {
    expect(ALLOW.exact.has("https://dataslope.com")).toBe(true);
    expect(ALLOW.exact.has("https://dataslope.vercel.app")).toBe(true);
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
    expect(isOriginInAllowList("https://dataslope.vercel.app", ALLOW)).toBe(true);
  });

  it("rejects unrelated origins", () => {
    expect(isOriginInAllowList("https://evil.com", ALLOW)).toBe(false);
    expect(isOriginInAllowList("https://dataslope.com.evil.com", ALLOW)).toBe(
      false,
    );
  });
});

describe("isOriginInAllowList, Vercel preview wildcards", () => {
  it("accepts branch/commit preview deployments under the team scope", () => {
    expect(
      isOriginInAllowList(
        "https://dataslope-git-claude-focused-barde-c4a546-ye-joo-parks-projects.vercel.app",
        ALLOW,
      ),
    ).toBe(true);
    expect(
      isOriginInAllowList(
        "https://dataslope-git-claude-vigilant-feyn-a92c1c-ye-joo-parks-projects.vercel.app",
        ALLOW,
      ),
    ).toBe(true);
    // Bare per-deployment hash form.
    expect(
      isOriginInAllowList(
        "https://dataslope-a92c1c-ye-joo-parks-projects.vercel.app",
        ALLOW,
      ),
    ).toBe(true);
  });

  it("rejects a same-named project under a different (attacker) team scope", () => {
    // The `*` cannot cross the team-scope suffix, so a different scope fails.
    expect(
      isOriginInAllowList(
        "https://dataslope-abc-evil-team-projects.vercel.app",
        ALLOW,
      ),
    ).toBe(false);
  });

  it("does not let the wildcard cross a dot into another domain", () => {
    expect(
      isOriginInAllowList(
        "https://dataslope-x.ye-joo-parks-projects.vercel.app",
        ALLOW,
      ),
    ).toBe(false);
    expect(
      isOriginInAllowList(
        "https://dataslope-x-ye-joo-parks-projects.vercel.app.evil.com",
        ALLOW,
      ),
    ).toBe(false);
  });

  it("requires the https scheme exactly", () => {
    expect(
      isOriginInAllowList(
        "http://dataslope-x-ye-joo-parks-projects.vercel.app",
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
    const re = wildcardOriginToRegExp("https://app-*.vercel.app");
    expect(re.test("https://app-.vercel.app")).toBe(false);
    expect(re.test("https://app-x.vercel.app")).toBe(true);
  });
});
