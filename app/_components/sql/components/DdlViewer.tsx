"use client";

import { useRef, useEffect } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  lineNumbers as lineNumbersExt,
} from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { sql as sqlLang, SQLite, PostgreSQL } from "@codemirror/lang-sql";
import { themeFor } from "../../cmExtensions";

// Replace the entire editor document — the v6 idiom for what v5 called
// `editor.setValue(s)`. Centralised so all call sites read the same.
function replaceDoc(view: EditorView, value: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
  });
}

// ────────────────────────────────────────────────────────────────────────
// DdlViewer — read-only EditorView mounted inside the View DDL dialog so
// the SQL is syntax-highlighted and the user can scroll / select with
// their keyboard.
// ────────────────────────────────────────────────────────────────────────

export function DdlViewer({
  sql,
  theme,
  isPostgres = false,
}: {
  sql: string;
  theme: string;
  isPostgres?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const themeComp = new Compartment();
    const view = new EditorView({
      doc: sql,
      parent: hostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        drawSelection(),
        lineNumbersExt(),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        // Wrap long lines to prevent horizontal scroll in the View DDL popup.
        EditorView.lineWrapping,
        sqlLang({ dialect: isPostgres ? PostgreSQL : SQLite, upperCaseKeywords: false }),
        themeComp.of(themeFor(theme)),
      ],
    });
    viewRef.current = view;
    themeCompRef.current = themeComp;
    return () => {
      view.destroy();
      viewRef.current = null;
      themeCompRef.current = null;
    };
    // sql / theme updates are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== sql) {
      replaceDoc(view, sql);
    }
  }, [sql]);

  useEffect(() => {
    if (viewRef.current && themeCompRef.current) {
      viewRef.current.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(theme)),
      });
    }
  }, [theme]);

  return <div className="sql-ddl-code-wrap" ref={hostRef} />;
}
