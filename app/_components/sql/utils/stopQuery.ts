// Stopping a query that will not finish.
//
// None of the three engines can be interrupted from outside while it is
// busy: each runs single-threaded in a worker, and PGlite, sqlite-wasm and
// duckdb-wasm's `query()` expose no cancel that reaches a statement already
// executing. The only thing that stops one is ending the worker, and what
// the reader used to have for that was knowing to reload the tab. A runaway
// cross join otherwise left a spinner, a disabled Run button and no way out.
//
// So Stop does that reload for them. It is blunt, and it is the same on all
// three engines: the page's own unload handlers flush the query tabs first,
// and the playground reopens the workspace's database from what was last
// saved, then says what happened.

const NOTICE_KEY = "dataslope:sql-query-stopped";

export function stopRunningQuery(): void {
  try {
    window.sessionStorage.setItem(NOTICE_KEY, "1");
  } catch {
    // Private mode: the reload still stops the query, minus the notice.
  }
  window.location.reload();
}

/** True once, on the first boot after a Stop, so the playground can say so. */
export function consumeStoppedNotice(): boolean {
  try {
    if (window.sessionStorage.getItem(NOTICE_KEY) !== "1") return false;
    window.sessionStorage.removeItem(NOTICE_KEY);
    return true;
  } catch {
    return false;
  }
}

export const STOPPED_NOTICE =
  "Stopped the running query. The database was reopened from its last saved state.";
