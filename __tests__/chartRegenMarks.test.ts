// The chart review queue (lib/charts/regenMarks.ts). Mechanics are shared
// with the illustration queue and covered by illustrationRegenMarks.test.ts;
// pinned here is what types cannot catch: D1 cannot bind an identifier, so
// the queue table name is interpolated into every statement, and a chart
// binding reaching the illustration table would silently write there.
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
});
