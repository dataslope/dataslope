// Validation for the sign-in "return to where you were" destination
// (app/_components/auth/returnTo.ts). The guard is security-relevant: a
// crafted ?next= must never bounce a fresh sign-in off-site or back into
// the auth flow.
import { describe, expect, it } from "vitest";

import { isSafeReturnPath } from "../app/_components/auth/returnTo";

describe("isSafeReturnPath", () => {
  it("accepts internal relative paths (with query and hash)", () => {
    expect(isSafeReturnPath("/playground/web")).toBe(true);
    expect(isSafeReturnPath("/courses/python-basics/loops?x=1#top")).toBe(true);
    expect(isSafeReturnPath("/account")).toBe(true);
    expect(isSafeReturnPath("/")).toBe(true);
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(isSafeReturnPath("https://evil.example/")).toBe(false);
    expect(isSafeReturnPath("//evil.example/phish")).toBe(false);
    expect(isSafeReturnPath("javascript:alert(1)")).toBe(false);
  });

  it("rejects non-strings and empty values", () => {
    expect(isSafeReturnPath(null)).toBe(false);
    expect(isSafeReturnPath(undefined)).toBe(false);
    expect(isSafeReturnPath("")).toBe(false);
    expect(isSafeReturnPath(42)).toBe(false);
  });

  it("rejects the auth pages themselves (no redirect loops)", () => {
    expect(isSafeReturnPath("/sign-in")).toBe(false);
    expect(isSafeReturnPath("/sign-in/anything")).toBe(false);
    expect(isSafeReturnPath("/reset-password")).toBe(false);
    // …but not unrelated paths that merely share a prefix.
    expect(isSafeReturnPath("/sign-in-help")).toBe(true);
  });
});
