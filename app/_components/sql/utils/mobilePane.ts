/**
 * Which surface the single-pane mobile layout shows; desktop ignores it.
 * Its own module so the pure rule below is testable without the shell.
 */
export type SqlMobilePane = "schema" | "editor" | "results";

/**
 * Which bottom pane to show when a mobile query tab becomes active: the
 * tab's remembered pane, except a tab is never dropped onto an empty
 * Results surface — that (and no remembered pane) falls back to the Editor.
 */
export function paneForActivatedTab(
  remembered: SqlMobilePane | undefined,
  hasResults: boolean,
): SqlMobilePane {
  const target = remembered ?? "editor";
  return target === "results" && !hasResults ? "editor" : target;
}
