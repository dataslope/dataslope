// The chart review queue (lib/charts/regenMarks.ts), the D1 layer behind the
// "mark for redraw" control on /dashboard/admin/charts.
//
// The mechanics are shared with the illustration queue (lib/review/marks.ts)
// and covered by illustrationRegenMarks.test.ts. What is worth pinning *here*
// is the part that is not shared and cannot be caught by types: the table name.
// D1 cannot bind an identifier, so the queue name is interpolated into every
// statement, and a chart binding that reached `illustration_regen_marks` would
// silently write into the wrong queue and pass every other test in the file.
import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";

import { QUEUE_TABLES } from "../lib/review/marks";
import {
  approveRegenMark,
  listRegenMarks,
  readMark,
  requestDeletion,
  upsertRegenMark,
} from "../lib/charts/regenMarks";

/** A D1 stub that records the SQL it is handed and answers with nothing, which
 *  is all these assertions need. */
function recordingDb() {
  const sql: string[] = [];
  const db = {
    prepare(query: string) {
      sql.push(query);
      const stmt = {
        bind: () => stmt,
        run: async () => ({ success: true }),
        first: async () => null,
        all: async () => ({ results: [] }),
      };
      return stmt;
    },
  } as unknown as D1Database;
  return { db, sql };
}

const CHART_TABLE = QUEUE_TABLES.charts;
const ILLUSTRATION_TABLE = QUEUE_TABLES.illustrations;

describe("chart review queue targeting", () => {
  it("names its own table and never the illustration one", async () => {
    const { db, sql } = recordingDb();

    await listRegenMarks(db);
    await readMark(db, "bar-truncation");
    await upsertRegenMark(db, { promptId: "bar-truncation", marked: true, note: "" });
    await approveRegenMark(db, { promptId: "bar-truncation" });
    await requestDeletion(db, { promptId: "bar-truncation", requested: true, reason: "" });

    // Every statement the binding issues, across all five entry points.
    expect(sql.length).toBeGreaterThanOrEqual(5);
    for (const query of sql) {
      expect(query).toContain(CHART_TABLE);
      expect(query).not.toContain(ILLUSTRATION_TABLE);
    }
  });

  it("keeps the two queues on distinct tables", () => {
    expect(CHART_TABLE).not.toBe(ILLUSTRATION_TABLE);
  });
});

describe("chart marks", () => {
  it("stores an empty note when marking with nothing typed", async () => {
    const rows = new Map<string, { note: string; marked: number }>();
    const db = {
      prepare(query: string) {
        const stmt = {
          bound: [] as unknown[],
          bind(...args: unknown[]) {
            stmt.bound = args;
            return stmt;
          },
          run: async () => {
            if (query.includes("INSERT INTO")) {
              const [id, marked, note] = stmt.bound as [string, number, string];
              rows.set(id, { note, marked });
            }
            return { success: true };
          },
          first: async () => null,
          all: async () => ({ results: [] }),
        };
        return stmt;
      },
    } as unknown as D1Database;

    const mark = await upsertRegenMark(db, {
      promptId: "bar-truncation",
      marked: true,
      note: "   ",
    });
    expect(mark.note).toBe("");
    expect(rows.get("bar-truncation")?.note).toBe("");
  });
});
