/**
 * Which of the three logical surfaces the single-pane mobile layout shows.
 * Desktop ignores this entirely (the CSS only acts on it below the mobile
 * breakpoint). Lives in its own module so the pure tab-activation rule below
 * is unit-testable without pulling in the `"use client"` shell (and its CSS
 * imports).
 */
export type SqlMobilePane = "schema" | "editor" | "results";

/**
 * Decide which bottom pane to show when a mobile query tab becomes active.
 *
 * Each query tab remembers the last pane the user looked at; activating a tab
 * restores that pane rather than carrying the previous tab's pane over. The one
 * override: a tab is never dropped onto an empty Results surface — if the
 * remembered pane is "results" but the tab has no output to show, fall back to
 * the Editor ("no results ⇒ show the editor"). A tab with no remembered pane
 * (e.g. a freshly created one) defaults to the Editor.
 *
 * @param remembered  the tab's last explicitly-selected pane, if any
 * @param hasResults  whether the tab currently has real output on Results
 */
export function paneForActivatedTab(
  remembered: SqlMobilePane | undefined,
  hasResults: boolean,
): SqlMobilePane {
  const target = remembered ?? "editor";
  return target === "results" && !hasResults ? "editor" : target;
}
