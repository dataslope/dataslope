// The illustration regeneration queue (lib/illustrations/regenMarks.ts), the
// D1 layer behind the "mark for regeneration" control on /dashboard/admin/illustration-prompts.
//
// D1 is stubbed rather than run: what is worth pinning here is the contract the
// gallery and a later regeneration run both depend on, namely that a note
// survives being unmarked, that the queue comes back marked-first, and that a
// note is reduced to one bounded line before it reaches SQL.
import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";

import {
  MAX_NOTE_LENGTH,
  approveRegenMark,
  isAwaitingApproval,
  listRegenMarks,
  normalizeNote,
  upsertRegenMark,
  type RegenMark,
} from "../lib/illustrations/regenMarks";
// Queue-generic, so it is called with the queue name the wrappers bind.
import { requestDeletion } from "../lib/review/marks";

interface Row {
  prompt_id: string;
  marked: number;
  note: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
  regenerated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  delete_requested_at: string | null;
  delete_requested_by: string | null;
  delete_reason: string | null;
}

/**
 * Just enough of D1 to exercise the module: the statements it issues (the mark
 * upsert, the approval update, the single-row read) plus the queue listing,
 * backed by a Map. Dispatch is on the leading SQL keyword, so a query that
 * changes shape still routes correctly.
 */
function fakeDb(): { db: D1Database; rows: Map<string, Row> } {
  const rows = new Map<string, Row>();

  const prepare = (sql: string) => {
    const kind = sql.trim().slice(0, 6).toUpperCase();
    let args: unknown[] = [];
    const stmt = {
      bind: (...values: unknown[]) => {
        args = values;
        return stmt;
      },
      run: async () => {
        if (kind === "UPDATE") {
          const [approved_at, approved_by, updated_at, prompt_id] = args as [
            string,
            string | null,
            string,
            string,
          ];
          const existing = rows.get(prompt_id);
          // Mirrors "WHERE ... AND regenerated_at IS NOT NULL".
          if (existing?.regenerated_at) {
            rows.set(prompt_id, { ...existing, approved_at, approved_by, updated_at });
          }
          return { success: true };
        }
        const blank: Row = {
          prompt_id: "",
          marked: 0,
          note: "",
          marked_by: null,
          created_at: "",
          updated_at: "",
          regenerated_at: null,
          approved_at: null,
          approved_by: null,
          delete_requested_at: null,
          delete_requested_by: null,
          delete_reason: "",
        };

        // Both upserts bind six values, so arity cannot separate them; the
        // conflict clause names the columns each one actually writes.
        if (sql.includes("delete_requested_at = excluded.delete_requested_at")) {
          const [
            prompt_id,
            created_at,
            updated_at,
            delete_requested_at,
            delete_requested_by,
            delete_reason,
          ] = args as [string, string, string, string | null, string | null, string];
          const existing = rows.get(prompt_id);
          rows.set(prompt_id, {
            ...blank,
            ...(existing ?? {}),
            prompt_id,
            created_at: existing?.created_at ?? created_at,
            updated_at,
            delete_requested_at,
            delete_requested_by,
            delete_reason,
          });
          return { success: true };
        }

        const [prompt_id, marked, note, marked_by, created_at, updated_at] =
          args as [string, number, string, string | null, string, string];
        const existing = rows.get(prompt_id);
        rows.set(prompt_id, {
          ...blank,
          ...(existing ?? {}),
          prompt_id,
          marked,
          note,
          marked_by,
          created_at: existing?.created_at ?? created_at,
          updated_at,
        });
        return { success: true };
      },
      first: async () => rows.get(args[0] as string) ?? null,
      all: async () => {
        // Mirrors "ORDER BY marked DESC, updated_at ASC".
        const results = [...rows.values()].sort(
          (a, b) => b.marked - a.marked || a.updated_at.localeCompare(b.updated_at),
        );
        return { results };
      },
    };
    return stmt;
  };

  return { db: { prepare } as unknown as D1Database, rows };
}

/** Stand in for the regeneration run, which stamps `regenerated_at` and clears
 *  the mark once the new art is promoted (see the runbook's step 6). */
function markRegenerated(rows: Map<string, Row>, promptId: string, at: string) {
  const row = rows.get(promptId);
  if (row) rows.set(promptId, { ...row, marked: 0, regenerated_at: at });
}

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

describe("the regeneration queue", () => {
  it("keeps the note when a mark is cleared", async () => {
    const { db } = fakeDb();
    await upsertRegenMark(db, {
      promptId: "python-basics-sets",
      marked: true,
      note: "too busy, fewer objects",
      markedBy: "admin-1",
    });

    const cleared = await upsertRegenMark(db, {
      promptId: "python-basics-sets",
      marked: false,
      note: "too busy, fewer objects",
      markedBy: "admin-1",
    });

    // Unmarking must not delete the row: the note is the record of what was
    // asked for, and the next review round starts from it.
    expect(cleared.marked).toBe(false);
    expect(cleared.note).toBe("too busy, fewer objects");
  });

  it("returns marked rows first", async () => {
    const { db } = fakeDb();
    await upsertRegenMark(db, { promptId: "a", marked: false, note: "" });
    await upsertRegenMark(db, { promptId: "b", marked: true, note: "redraw" });

    const queue = await listRegenMarks(db);
    expect(queue.map((m) => m.promptId)).toEqual(["b", "a"]);
    expect(queue[0].marked).toBe(true);
  });

  it("normalizes the note on the way in", async () => {
    const { db, rows } = fakeDb();
    await upsertRegenMark(db, {
      promptId: "a",
      marked: true,
      note: "  two\nlines  ",
    });
    expect(rows.get("a")?.note).toBe("two lines");
  });

  // The note is optional and has no default in either direction: marking with
  // nothing typed used to substitute a canned brief, which read back as though
  // someone had written it.
  it("leaves the note empty when marking with nothing typed", async () => {
    const { db } = fakeDb();
    const mark = await upsertRegenMark(db, { promptId: "a", marked: true, note: "" });
    expect(mark.note).toBe("");
  });

  it("does not invent a note when clearing a mark", async () => {
    const { db } = fakeDb();
    const mark = await upsertRegenMark(db, { promptId: "a", marked: false, note: "" });
    expect(mark.note).toBe("");
  });

  it("caps a note at the stored maximum", async () => {
    const { db, rows } = fakeDb();
    await upsertRegenMark(db, {
      promptId: "a",
      marked: true,
      note: "x".repeat(MAX_NOTE_LENGTH + 50),
    });
    expect(rows.get("a")?.note).toHaveLength(MAX_NOTE_LENGTH);
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

  it("stamps approved_at on a regenerated row", async () => {
    const { db, rows } = fakeDb();
    await upsertRegenMark(db, { promptId: "a", marked: true, note: "simpler" });
    markRegenerated(rows, "a", "2026-08-03T10:00:00.000Z");

    const approved = await approveRegenMark(db, { promptId: "a", approvedBy: "admin" });
    expect(approved).not.toBeNull();
    expect(isAwaitingApproval(approved!)).toBe(false);
    expect(rows.get("a")?.approved_by).toBe("admin");
  });

  it("is a no-op on an illustration that was never regenerated", async () => {
    const { db } = fakeDb();
    await upsertRegenMark(db, { promptId: "a", marked: true, note: "simpler" });

    const result = await approveRegenMark(db, { promptId: "a" });
    expect(result?.approvedAt).toBeNull();
  });
});

describe("deletion requests", () => {
  it("stamps a timestamp and stores the reason", async () => {
    const { db, rows } = fakeDb();
    const mark = await requestDeletion(db, "illustrations", {
      promptId: "a",
      requested: true,
      reason: "superseded by the new one",
      requestedBy: "admin-1",
    });
    expect(mark.deleteRequestedAt).toBeTruthy();
    expect(mark.deleteReason).toBe("superseded by the new one");
    expect(rows.get("a")?.delete_requested_by).toBe("admin-1");
  });

  it("withdraws by clearing the timestamp, the reason and the author", async () => {
    const { db, rows } = fakeDb();
    await requestDeletion(db, "illustrations", {
      promptId: "a",
      requested: true,
      reason: "not needed",
      requestedBy: "admin-1",
    });
    const mark = await requestDeletion(db, "illustrations", {
      promptId: "a",
      requested: false,
      reason: "",
    });
    expect(mark.deleteRequestedAt).toBeNull();
    expect(mark.deleteReason).toBe("");
    // The author goes too: a withdrawn request should leave nothing behind
    // that reads as an outstanding one.
    expect(rows.get("a")?.delete_requested_by).toBeNull();
  });

  it("does not disturb an existing redraw mark or its note", async () => {
    // The two decisions are independent: something queued for a redraw last
    // month can be judged not worth keeping today, and asking for the deletion
    // must not quietly clear the review history that explains why.
    const { db } = fakeDb();
    await upsertRegenMark(db, {
      promptId: "a",
      marked: true,
      note: "labels collide in dark mode",
    });
    const mark = await requestDeletion(db, "illustrations", {
      promptId: "a",
      requested: true,
      reason: "",
    });
    expect(mark.marked).toBe(true);
    expect(mark.note).toBe("labels collide in dark mode");
    expect(mark.deleteRequestedAt).toBeTruthy();
  });

  it("works on an artefact that has never been reviewed", async () => {
    // Upsert, not update: a chart nobody has ever marked still needs to be
    // requestable, and an UPDATE would silently do nothing.
    const { db } = fakeDb();
    const mark = await requestDeletion(db, "illustrations", {
      promptId: "never-seen",
      requested: true,
      reason: "",
    });
    expect(mark.promptId).toBe("never-seen");
    expect(mark.marked).toBe(false);
    expect(mark.deleteRequestedAt).toBeTruthy();
  });

  it("normalizes the reason the same way a note is normalized", async () => {
    const { db } = fakeDb();
    const mark = await requestDeletion(db, "illustrations", {
      promptId: "a",
      requested: true,
      reason: "  two\nlines   and   spaces  ",
    });
    expect(mark.deleteReason).toBe("two lines and spaces");
  });
});
