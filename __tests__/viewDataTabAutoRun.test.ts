/**
 * Conditions under which a restored table tab re-queries.
 *
 * Tabs outlive a session (localStorage), results don't (component state), so a
 * `view-data` tab reopened from a previous visit arrives with no rows and the
 * "Run a query to see results" placeholder where its table should be. The
 * playgrounds fix that by re-running the tab's query when it is shown; the
 * decision itself lives in `viewDataTabToAutoRun`, which is what this pins.
 *
 * The safety-critical case is the last one: a plain query tab holds whatever
 * SQL the user last typed, so it must never run on its own.
 */
import { describe, expect, it } from "vitest";
import {
  viewDataTabToAutoRun,
  type ViewDataAutoRunInput,
} from "../app/_components/sql/hooks/useViewDataTabAutoRun";
import type { QueryTab } from "../app/_components/sqlitePlaygroundTabs";
import type { QueryRunResult } from "../app/_components/sql/types";

const tableTab = (over: Partial<QueryTab> = {}): QueryTab => ({
  id: "t1",
  title: "transactions",
  code: 'SELECT * FROM "public"."transactions";',
  pristineCode: 'SELECT * FROM "public"."transactions";',
  kind: "view-data",
  ...over,
});

const result = (): QueryRunResult =>
  ({
    sets: [{ columns: ["id"], values: [[1]] }],
    elapsedMs: 1,
    source: "Table: transactions",
  }) as QueryRunResult;

const input = (
  over: Partial<ViewDataAutoRunInput> = {},
): ViewDataAutoRunInput => ({
  tabs: [tableTab()],
  activeTabId: "t1",
  resultsByTab: {},
  statusState: "ready",
  attempted: new Set<string>(),
  ...over,
});

describe("viewDataTabToAutoRun", () => {
  it("re-queries a restored table tab that has no result", () => {
    expect(viewDataTabToAutoRun(input())?.id).toBe("t1");
  });

  it("treats a cleared result the same as never having run", () => {
    expect(
      viewDataTabToAutoRun(input({ resultsByTab: { t1: null } }))?.id,
    ).toBe("t1");
  });

  it("leaves a tab that already has rows alone", () => {
    expect(
      viewDataTabToAutoRun(input({ resultsByTab: { t1: result() } })),
    ).toBeNull();
  });

  it("waits for the engine to finish booting", () => {
    expect(viewDataTabToAutoRun(input({ statusState: "loading" }))).toBeNull();
    expect(viewDataTabToAutoRun(input({ statusState: "running" }))).toBeNull();
    expect(viewDataTabToAutoRun(input({ statusState: "error" }))).toBeNull();
  });

  it("gives each tab one attempt, so an empty table doesn't loop", () => {
    expect(
      viewDataTabToAutoRun(input({ attempted: new Set(["t1"]) })),
    ).toBeNull();
  });

  it("only considers the tab on screen", () => {
    const tabs = [tableTab(), tableTab({ id: "t2", title: "cards" })];
    expect(viewDataTabToAutoRun(input({ tabs, activeTabId: "t2" }))?.id).toBe(
      "t2",
    );
    expect(viewDataTabToAutoRun(input({ tabs, activeTabId: "gone" }))).toBeNull();
  });

  it("never runs a plain query tab on its own", () => {
    const tabs = [tableTab({ kind: undefined })];
    expect(viewDataTabToAutoRun(input({ tabs }))).toBeNull();
  });

  it("ignores a table tab with no SQL to run", () => {
    const tabs = [tableTab({ code: "   " })];
    expect(viewDataTabToAutoRun(input({ tabs }))).toBeNull();
  });
});
