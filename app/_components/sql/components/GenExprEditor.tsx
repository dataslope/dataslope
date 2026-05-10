"use client";

import { useRef, useEffect } from "react";
import { Compartment } from "@codemirror/state";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { sql as sqlLang, SQLite, PostgreSQL } from "@codemirror/lang-sql";
import { themeFor } from "../../cmExtensions";

/**
 * A compact, auto-expanding CodeMirror editor for SQL expressions, used in
 * the "Generated Columns" section of the View/Edit Structure drawer. The
 * editor grows and shrinks with the number of lines.
 */
export function GenExprEditor({
  value,
  onChange,
  placeholder,
  ariaLabel,
  isPostgres = false,
  theme,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  isPostgres?: boolean;
  theme: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const themeCompRef = useRef<Compartment | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const themeComp = new Compartment();
    const view = new EditorView({
      doc: value,
      parent: hostRef.current,
      extensions: [
        sqlLang({
          dialect: isPostgres ? PostgreSQL : SQLite,
          upperCaseKeywords: false,
        }),
        themeComp.of(themeFor(theme)),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        history(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        ...(placeholder ? [cmPlaceholder(placeholder)] : []),
      ],
    });
    viewRef.current = view;
    themeCompRef.current = themeComp;
    return () => {
      view.destroy();
      viewRef.current = null;
      themeCompRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. after a reset).
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  // Propagate theme changes into the live editor.
  useEffect(() => {
    if (viewRef.current && themeCompRef.current) {
      viewRef.current.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(theme)),
      });
    }
  }, [theme]);

  return <div ref={hostRef} className="sql-gen-expr-editor" aria-label={ariaLabel} />;
}
