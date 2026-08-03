// The illustration regeneration queue (lib/illustrations/regenMarks.ts), the
// D1 layer behind the "mark for regeneration" control on /illustration-prompts.
//
// D1 is stubbed rather than run: what is worth pinning here is the contract the
// gallery and a later regeneration run both depend on, namely that a note
// survives being unmarked, that the queue comes back marked-first, and that a
// note is reduced to one bounded line before it reaches SQL.
import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";

import {
  MAX_NOTE_LENGTH,
  listRegenMarks,
  normalizeNote,
  upsertRegenMark,
} from "../lib/illustrations/regenMarks";

interface Row {
  prompt_id: string;
  marked: number;
  note: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
  regenerated_at: string | null;
}

/**
 * Just enough of D1 to exercise the module: the two statements it issues (the
 * upsert and the single-row read) plus the queue listing, backed by a Map.
 */
function fakeDb(): { db: D1Database; rows: Map<string, Row> } {
  const rows = new Map<string, Row>();

  const prepare = (sql: string) => {
    let args: unknown[] = [];
    const stmt = {
      bind: (...values: unknown[]) => {
        args = values;
        return stmt;
      },
      run: async () => {
        const [prompt_id, marked, note, marked_by, created_at, updated_at] =
          args as [string, number, string, string | null, string, string];
        const existing = rows.get(prompt_id);
        rows.set(prompt_id, {
          prompt_id,
          marked,
          note,
          marked_by,
          created_at: existing?.created_at ?? created_at,
          updated_at,
          regenerated_at: existing?.regenerated_at ?? null,
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
    void sql;
    return stmt;
  };

  return { db: { prepare } as unknown as D1Database, rows };
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
});
