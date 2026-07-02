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
  const bothTiers = env({
    AI_FREE_API_KEY: "or-key",
    AI_FREE_BASE_URL: "https://openrouter.ai/api/v1",
    AI_FREE_MODEL: "deepseek/deepseek-v4-flash",
    AI_PRO_API_KEY: "oai-key",
    AI_PRO_BASE_URL: "https://api.openai.com/v1",
    AI_PRO_MODEL: "gpt-4o",
  });

  it("uses each tier's own base URL/model/key when fully configured", () => {
    const free = resolveModel("free", bothTiers)!;
    expect(free.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(free.model).toBe("deepseek/deepseek-v4-flash");
    expect(free.apiKey).toBe("or-key");
    expect(free.tier).toBe("free");

    const pro = resolveModel("pro", bothTiers)!;
    expect(pro.baseUrl).toBe("https://api.openai.com/v1");
    expect(pro.model).toBe("gpt-4o");
    expect(pro.apiKey).toBe("oai-key");
    expect(pro.tier).toBe("pro");
    // Pro gets a larger output cap + budget than free.
    expect(pro.maxTokens).toBeGreaterThan(free.maxTokens);
    expect(pro.dailyTokenBudget).toBeGreaterThan(free.dailyTokenBudget);
  });

  it("degrades pro to the free provider when only free is fully configured, keeping pro budgets", () => {
    const e = env({
      AI_FREE_API_KEY: "or-key",
      AI_FREE_BASE_URL: "https://openrouter.ai/api/v1",
      AI_FREE_MODEL: "deepseek/deepseek-v4-flash",
    });
    const pro = resolveModel("pro", e)!;
    expect(pro.apiKey).toBe("or-key");
    expect(pro.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(pro.tier).toBe("pro"); // still reported as pro
    expect(pro.maxTokens).toBe(
      resolveModel(
        "pro",
        env({
          AI_PRO_API_KEY: "x",
          AI_PRO_BASE_URL: "https://api.openai.com/v1",
          AI_PRO_MODEL: "gpt-4o",
        }),
      )!.maxTokens,
    );
  });

  it("degrades free to the pro provider when only pro is fully configured, keeping free budgets", () => {
    const e = env({
      AI_PRO_API_KEY: "oai-key",
      AI_PRO_BASE_URL: "https://api.openai.com/v1",
      AI_PRO_MODEL: "gpt-4o",
    });
    const free = resolveModel("free", e)!;
    expect(free.apiKey).toBe("oai-key");
    expect(free.baseUrl).toBe("https://api.openai.com/v1");
    expect(free.tier).toBe("free");
    expect(free.dailyRequestBudget).toBe(
      resolveModel(
        "free",
        env({
          AI_FREE_API_KEY: "x",
          AI_FREE_BASE_URL: "https://openrouter.ai/api/v1",
          AI_FREE_MODEL: "some/model",
        }),
      )!.dailyRequestBudget,
    );
  });

  it("treats a tier as unconfigured if base URL or model is missing, even with a key set", () => {
    const e = env({ AI_FREE_API_KEY: "or-key" }); // no base URL/model
    expect(resolveModel("free", e)).toBeNull();
    expect(resolveModel("pro", e)).toBeNull();
  });

  it("returns null when no provider is configured at all", () => {
    expect(resolveModel("free", env({}))).toBeNull();
    expect(resolveModel("pro", env({}))).toBeNull();
  });
});
