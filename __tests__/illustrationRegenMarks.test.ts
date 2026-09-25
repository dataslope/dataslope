// The pure rules behind the admin gallery's illustration regeneration queue
// (lib/illustrations/regenMarks.ts): a note is reduced to one bounded line
// before it reaches SQL, and a redrawn illustration awaits approval until an
// approval newer than the redraw exists.
import { describe, expect, it } from "vitest";

import {
  MAX_NOTE_LENGTH,
  isAwaitingApproval,
  normalizeNote,
  type RegenMark,
} from "../lib/illustrations/regenMarks";

describe("normalizeNote", () => {
  it("collapses newlines and tabs into single spaces", () => {
    expect(normalizeNote("use a\nsimpler\t\tillustration")).toBe(
      "use a simpler illustration",
    );
  });

  it("trims and caps at MAX_NOTE_LENGTH", () => {
    const long = "x".repeat(MAX_NOTE_LENGTH + 50);
    expect(normalizeNote(`   ${long}   `)).toHaveLength(MAX_NOTE_LENGTH);
  });

  it("treats anything that isn't a string as no note", () => {
    expect(normalizeNote(undefined)).toBe("");
    expect(normalizeNote(42)).toBe("");
  });
});

describe("approval", () => {
  const mark = (over: Partial<RegenMark> = {}): RegenMark => ({
    promptId: "a",
    marked: false,
    note: "",
    updatedAt: "2026-08-03T00:00:00.000Z",
    regeneratedAt: null,
    approvedAt: null,
    deleteRequestedAt: null,
    deleteReason: "",
    ...over,
  });

  it("only counts an illustration as awaiting approval once it is redrawn", () => {
    expect(isAwaitingApproval(mark())).toBe(false);
    expect(isAwaitingApproval(mark({ regeneratedAt: "2026-08-03T10:00:00Z" }))).toBe(
      true,
    );
  });

  it("clears once approved, and comes back after a later redraw", () => {
    const approved = mark({
      regeneratedAt: "2026-08-03T10:00:00Z",
      approvedAt: "2026-08-03T11:00:00Z",
    });
    expect(isAwaitingApproval(approved)).toBe(false);
    // A second redraw overtakes the old approval, which is the whole reason
    // the two timestamps are compared rather than a flag being flipped.
    expect(
      isAwaitingApproval({ ...approved, regeneratedAt: "2026-08-04T09:00:00Z" }),
    ).toBe(true);
  });
});
