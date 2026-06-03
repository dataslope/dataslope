import type { EditorView } from "@codemirror/view";
import { splitSqlStatements, statementAtCursor } from "./sqlAnalysis";

export function replaceDoc(view: EditorView, value: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
  });
}

/** The SQL a "run this one statement" action should target, given the editor's
 *  current state: the selection if there is one; otherwise the statement under
 *  the cursor in a multi-statement document; otherwise the whole document.
 *  Mirrors the Run / Run-statement-at-cursor behaviour, reused by Explain. */
export function activeSqlForEditor(view: EditorView): string {
  const sel = view.state.selection.main;
  if (!sel.empty) return view.state.sliceDoc(sel.from, sel.to);
  const doc = view.state.doc.toString();
  const stmt = statementAtCursor(doc, sel.head);
  if (stmt && splitSqlStatements(doc).length > 1) return stmt.text;
  return doc;
}

