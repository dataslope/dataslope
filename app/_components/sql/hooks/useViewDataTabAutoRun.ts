"use client";

import { useEffect, useRef } from "react";
import type { QueryTab } from "../../sqlitePlaygroundTabs";
import type { QueryRunResult } from "../types";

export type EngineStatusState = "loading" | "ready" | "running" | "error";

export interface ViewDataAutoRunInput {
  tabs: readonly QueryTab[];
  activeTabId: string;
  resultsByTab: Record<string, QueryRunResult | null>;
  statusState: EngineStatusState;
  /** Tabs already attempted for this database, see the hook below. */
  attempted: ReadonlySet<string>;
}

/**
 * The tab whose query should be re-run right now, or null. Split out of the
 * hook so the conditions are testable without a DOM. Only `view-data` tabs
 * qualify: their SQL is the sidebar-written `SELECT * FROM <table>`, so
 * running it unprompted is safe; a plain query tab may hold DDL/DML and must
 * never re-run on its own.
 */
export function viewDataTabToAutoRun({
  tabs,
  activeTabId,
  resultsByTab,
  statusState,
  attempted,
}: ViewDataAutoRunInput): QueryTab | null {
  // Held back until the engine has booted, so a restored tab runs once the
  // engine is up rather than being dropped on the floor while it loads.
  if (statusState !== "ready") return null;
  const tab = tabs.find((candidate) => candidate.id === activeTabId);
  if (!tab || tab.kind !== "view-data") return null;
  // `null` is the cleared / never-run state; anything else (rows, or an
  // engine error) is an answer this tab already has.
  if (resultsByTab[tab.id]) return null;
  if (attempted.has(tab.id)) return null;
  if (!tab.code.trim()) return null;
  return tab;
}

interface ViewDataTabAutoRunOptions
  extends Omit<ViewDataAutoRunInput, "attempted" | "tabs"> {
  tabs: QueryTab[];
  /** The database the tabs belong to. Switching it clears the bookkeeping
   *  below, because the switch also clears every result. */
  activeDbId: string;
  /** Runs the tab's SQL. `sourceTable` is what makes the grid editable, so it
   *  is passed here exactly as the sidebar's "open table" action passes it. */
  run: (
    tabId: string,
    sql: string,
    source: string,
    sourceTable: string,
  ) => void;
}

/**
 * Re-runs a table tab's query when it is shown without one (tabs survive a
 * session, results don't). The query fires when the tab is *shown*, not when
 * the workspace loads, so a dozen restored tabs cost one scan; each tab gets
 * a single attempt per database so an empty/errored answer isn't retried on
 * every render.
 */
export function useViewDataTabAutoRun({
  tabs,
  activeTabId,
  resultsByTab,
  statusState,
  activeDbId,
  run,
}: ViewDataTabAutoRunOptions): void {
  const attemptedRef = useRef<Set<string>>(new Set());

  // Declared first so a database switch clears the set before the effect
  // below reads it in the same commit.
  useEffect(() => {
    attemptedRef.current = new Set();
  }, [activeDbId]);

  useEffect(() => {
    const tab = viewDataTabToAutoRun({
      tabs,
      activeTabId,
      resultsByTab,
      statusState,
      attempted: attemptedRef.current,
    });
    if (!tab) return;
    attemptedRef.current.add(tab.id);
    run(tab.id, tab.code, `Table: ${tab.title}`, tab.title);
  }, [statusState, tabs, activeTabId, resultsByTab, run]);
}
