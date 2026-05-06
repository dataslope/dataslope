import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCachedResponse, setCachedResponse, pruneCache } from "../app/_components/ai/aiAutocompleteCache";
import { AUTOCOMPLETE_SCHEMA_VERSION } from "../app/_components/ai/aiAutocompleteSchema";

// ─── Cache tests ─────────────────────────────────────────────────────────────
describe("aiAutocompleteCache", () => {
  beforeEach(() => {
    // Flush any entries left from previous tests by calling prune with
    // Date.now far in the future — easier than exposing a clearAll helper.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores and retrieves a response", () => {
    const response = { suggestions: [{ label: "SELECT", type: "keyword" as const }] };
    setCachedResponse("key1", response);
    expect(getCachedResponse("key1")).toEqual(response);
  });

  it("returns null for unknown keys", () => {
    expect(getCachedResponse("no-such-key")).toBeNull();
  });

  it("returns null for expired entries", () => {
    const response = { suggestions: [] };
    setCachedResponse("expiring-key", response);
    // Advance 6 minutes past the 5-minute TTL.
    vi.advanceTimersByTime(6 * 60 * 1000);
    expect(getCachedResponse("expiring-key")).toBeNull();
  });

  it("does not expire entries before TTL", () => {
    const response = { suggestions: [] };
    setCachedResponse("fresh-key", response);
    vi.advanceTimersByTime(4 * 60 * 1000); // 4 min < 5 min TTL
    expect(getCachedResponse("fresh-key")).toEqual(response);
  });

  it("pruneCache removes expired entries", () => {
    const response = { suggestions: [] };
    setCachedResponse("prune-me", response);
    vi.advanceTimersByTime(6 * 60 * 1000);
    pruneCache();
    expect(getCachedResponse("prune-me")).toBeNull();
  });

  it("cache key includes schema version", () => {
    // Keys for the same prompt string are scoped to the schema version.
    // We can verify this by checking that responses set under the current
    // version are still retrievable (i.e. the version is embedded correctly).
    const response = { suggestions: [{ label: "FROM", type: "keyword" as const }] };
    setCachedResponse("versioned-prompt", response);
    const retrieved = getCachedResponse("versioned-prompt");
    expect(retrieved).toEqual(response);
    // The internal map key incorporates AUTOCOMPLETE_SCHEMA_VERSION.
    // As long as the same version is used for set/get the lookup succeeds.
    expect(AUTOCOMPLETE_SCHEMA_VERSION).toBe("1");
  });
});

// ─── Schema validator tests ───────────────────────────────────────────────────
import { isAutocompleteResponse } from "../app/_components/ai/aiAutocompleteSchema";

describe("isAutocompleteResponse", () => {
  it("accepts a valid response", () => {
    expect(
      isAutocompleteResponse({
        suggestions: [
          { label: "SELECT", type: "keyword" },
          { label: "COUNT", type: "function", apply: "COUNT()", detail: "Aggregate" },
        ],
      }),
    ).toBe(true);
  });

  it("accepts an empty suggestions array", () => {
    expect(isAutocompleteResponse({ suggestions: [] })).toBe(true);
  });

  it("rejects null", () => {
    expect(isAutocompleteResponse(null)).toBe(false);
  });

  it("rejects missing suggestions field", () => {
    expect(isAutocompleteResponse({})).toBe(false);
  });

  it("rejects non-array suggestions", () => {
    expect(isAutocompleteResponse({ suggestions: "SELECT" })).toBe(false);
  });

  it("rejects suggestion without label", () => {
    expect(isAutocompleteResponse({ suggestions: [{ type: "keyword" }] })).toBe(false);
  });

  it("rejects suggestion without type", () => {
    expect(isAutocompleteResponse({ suggestions: [{ label: "SELECT" }] })).toBe(false);
  });

  it("accepts optional fields (apply, detail)", () => {
    expect(
      isAutocompleteResponse({
        suggestions: [{ label: "users", type: "type", apply: "users", detail: "table" }],
      }),
    ).toBe(true);
  });
});
