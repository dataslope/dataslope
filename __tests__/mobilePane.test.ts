import { describe, expect, it } from "vitest";
import { paneForActivatedTab } from "../app/_components/sql/utils/mobilePane";

describe("paneForActivatedTab", () => {
  it("defaults a never-visited tab (no memory) to the editor", () => {
    expect(paneForActivatedTab(undefined, false)).toBe("editor");
    expect(paneForActivatedTab(undefined, true)).toBe("editor");
  });

  it("restores a remembered editor/schema pane verbatim", () => {
    expect(paneForActivatedTab("editor", false)).toBe("editor");
    expect(paneForActivatedTab("editor", true)).toBe("editor");
    // Schema is always available, so it restores regardless of results.
    expect(paneForActivatedTab("schema", false)).toBe("schema");
    expect(paneForActivatedTab("schema", true)).toBe("schema");
  });

  it("restores Results when the tab actually has output", () => {
    expect(paneForActivatedTab("results", true)).toBe("results");
  });

  it("falls back to the editor when Results is remembered but empty", () => {
    // The bug Request 3 fixes: leaving tab A on Results then activating a
    // never-run tab B must land on B's editor, not an empty Results.
    expect(paneForActivatedTab("results", false)).toBe("editor");
  });
});
