"use client";

// The completion popup's shape, shared by every editor: a column of a
// dozen rows the way VS Code's suggest widget sizes it, labels on the
// left, the signature or type as a quiet right-aligned detail that
// truncates before it can push the popup wide. CodeMirror's own defaults
// let the popup grow to 700px around a long signature and cap it at
// seven rows. An `EditorView.theme` (not a base theme) so it outranks
// those defaults whatever order the extensions mount in.

import { EditorView } from "@codemirror/view";

export const completionPopupTheme = EditorView.theme({
  ".cm-tooltip.cm-tooltip-autocomplete > ul": {
    minWidth: "16em",
    maxWidth: "min(34em, 90vw)",
    // Twelve rows at the row height below.
    maxHeight: "18.6em",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
    display: "flex",
    alignItems: "baseline",
    gap: "0.75em",
    padding: "2px 8px",
    lineHeight: "1.45",
    whiteSpace: "nowrap",
    overflow: "hidden",
  },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li > .cm-completionIcon": {
    flex: "none",
    paddingRight: "0",
  },
  ".cm-tooltip.cm-tooltip-autocomplete .cm-completionLabel": {
    flex: "0 1 auto",
    minWidth: "4em",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  ".cm-tooltip.cm-tooltip-autocomplete .cm-completionDetail": {
    flex: "1 1 auto",
    marginLeft: "auto",
    maxWidth: "60%",
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontStyle: "normal",
    fontSize: "92%",
    opacity: "0.65",
  },
  // SQL groups its rows (Columns, Tables, Keywords); the header reads as a
  // quiet caption, not a row.
  ".cm-tooltip.cm-tooltip-autocomplete > ul > completion-section": {
    display: "block",
    padding: "4px 8px 1px",
    fontSize: "72%",
    fontWeight: "600",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    opacity: "0.55",
    borderBottom: "none",
  },
  ".cm-tooltip.cm-completionInfo": {
    maxWidth: "min(28em, 60vw)",
    whiteSpace: "pre-wrap",
    fontSize: "92%",
  },
});
