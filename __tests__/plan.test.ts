/**
 * Membership plan resolution (lib/plan.ts): the display rule every surface
 * shares, and the server's tier, which adds the env allowlists.
 *
 * Pure functions, so they run in Node. The env objects are partial
 * `CloudflareEnv`s cast through `unknown` since only a few fields matter.
 */
import { describe, it, expect } from "vitest";
import { effectivePlan, planLabel, resolveTier } from "../lib/plan";

function env(partial: Record<string, string | undefined>): CloudflareEnv {
  return partial as unknown as CloudflareEnv;
}

describe("effectivePlan", () => {
  it("counts admins as pro, so the sidebar and account page agree", () => {
    expect(effectivePlan({ role: "admin", plan: "free" })).toBe("pro");
    expect(planLabel({ role: "admin", plan: "free" })).toBe("Pro (admin)");
    expect(planLabel({ plan: "pro" })).toBe("Pro");
    expect(planLabel({ plan: "free" })).toBe("Free");
    expect(effectivePlan(null)).toBe("free");
  });
});

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
