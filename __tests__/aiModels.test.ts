/**
 * Tier resolution + per-tier model/provider selection for "Ask AI".
 *
 * Pure functions (no D1, no network), so they run in Node. The env objects are
 * partial `CloudflareEnv`s cast through `unknown` since only a few fields matter.
 */
import { describe, it, expect } from "vitest";
import { resolveTier } from "../lib/ai/tier";
import { resolveModel } from "../lib/ai/models";

function env(partial: Record<string, string | undefined>): CloudflareEnv {
  return partial as unknown as CloudflareEnv;
}

describe("resolveTier", () => {
  it("treats no session as free", () => {
    expect(resolveTier(null, env({}))).toBe("free");
    expect(resolveTier(undefined, env({}))).toBe("free");
  });

  it("honours the plan column", () => {
    expect(resolveTier({ plan: "pro" }, env({}))).toBe("pro");
    expect(resolveTier({ plan: "PRO" }, env({}))).toBe("pro");
    expect(resolveTier({ plan: "free" }, env({}))).toBe("free");
  });

  it("grants pro to admins", () => {
    expect(resolveTier({ role: "admin" }, env({}))).toBe("pro");
  });

  it("grants pro via the PRO_USER_EMAILS allowlist (case-insensitive)", () => {
    const e = env({ PRO_USER_EMAILS: "vip@x.com, Other@Y.com" });
    expect(resolveTier({ email: "VIP@x.com" }, e)).toBe("pro");
    expect(resolveTier({ email: "nobody@x.com" }, e)).toBe("free");
  });

  it("grants pro via the ADMIN_EMAILS allowlist", () => {
    expect(resolveTier({ email: "a@b.com" }, env({ ADMIN_EMAILS: "a@b.com" }))).toBe(
      "pro",
    );
  });

  it("defaults an ordinary user to free", () => {
    expect(resolveTier({ email: "u@x.com", role: "user" }, env({}))).toBe("free");
  });
});

describe("resolveModel", () => {
  const bothKeys = env({
    AI_FREE_API_KEY: "or-key",
    AI_PRO_API_KEY: "oai-key",
  });

  it("uses OpenRouter for free and OpenAI for pro by default", () => {
    const free = resolveModel("free", bothKeys)!;
    expect(free.baseUrl).toContain("openrouter");
    expect(free.apiKey).toBe("or-key");
    expect(free.tier).toBe("free");

    const pro = resolveModel("pro", bothKeys)!;
    expect(pro.baseUrl).toContain("openai");
    expect(pro.apiKey).toBe("oai-key");
    expect(pro.tier).toBe("pro");
    // Pro gets a larger output cap + budget than free.
    expect(pro.maxTokens).toBeGreaterThan(free.maxTokens);
    expect(pro.dailyTokenBudget).toBeGreaterThan(free.dailyTokenBudget);
  });

  it("honours base URL + model overrides", () => {
    const e = env({
      AI_FREE_API_KEY: "k",
      AI_FREE_BASE_URL: "https://example.com/v1",
      AI_FREE_MODEL: "some/model",
    });
    const m = resolveModel("free", e)!;
    expect(m.baseUrl).toBe("https://example.com/v1");
    expect(m.model).toBe("some/model");
  });

  it("degrades pro to the free provider when only the free key is set, keeping pro budgets", () => {
    const e = env({ AI_FREE_API_KEY: "or-key" });
    const pro = resolveModel("pro", e)!;
    expect(pro.apiKey).toBe("or-key");
    expect(pro.baseUrl).toContain("openrouter");
    expect(pro.tier).toBe("pro"); // still reported as pro
    expect(pro.maxTokens).toBe(resolveModel("pro", env({ AI_PRO_API_KEY: "x" }))!.maxTokens);
  });

  it("degrades free to the pro provider when only the pro key is set, keeping free budgets", () => {
    const e = env({ AI_PRO_API_KEY: "oai-key" });
    const free = resolveModel("free", e)!;
    expect(free.apiKey).toBe("oai-key");
    expect(free.baseUrl).toContain("openai");
    expect(free.tier).toBe("free");
    expect(free.dailyRequestBudget).toBe(
      resolveModel("free", env({ AI_FREE_API_KEY: "x" }))!.dailyRequestBudget,
    );
  });

  it("returns null when no provider key is configured", () => {
    expect(resolveModel("free", env({}))).toBeNull();
    expect(resolveModel("pro", env({}))).toBeNull();
  });
});
