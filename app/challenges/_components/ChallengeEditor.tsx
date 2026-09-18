"use client";

/**
 * The workspace's code editor: a real CodeMirror instance, not a highlighted
 * snapshot.
 *
 * Mounted once and re-seeded when the learner moves between tasks (a step, or
 * a language). Swapping the document rather than remounting keeps the undo
 * history tied to the view's lifetime and avoids a flash of empty editor on
 * every step change.
 *
 * The buffer is lifted: the parent owns the text (it saves drafts and hands
 * them to the runner), so this reports every change upward and never holds
 * the source of truth.
 */

import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { bracketMatching, indentOnInput, indentUnit } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import {
  loadLanguage,
  noActiveLine,
  redoKeymap,
  themeFor,
} from "@/app/_components/cmExtensions";
import type { CodeLanguage } from "@/lib/challenges";
import s from "./ChallengeWorkspace.module.css";

/** Spaces per indent level, per language. */
const INDENT: Record<CodeLanguage, number> = {
  sql: 2,
  python: 4,
  javascript: 2,
  typescript: 2,
};

/** Resolve the language extension for a challenge language. */
async function extensionFor(language: CodeLanguage) {
  if (language === "sql") {
    const { sql } = await import("@codemirror/lang-sql");
    return sql();
  }
  return loadLanguage(language === "typescript" ? "text/typescript" : language);
}

export function ChallengeEditor({
  value,
  language,
  onChange,
  /** Changes when the learner moves to a different step or language. */
  taskKey,
  readOnly,
}: {
  value: string;
  language: CodeLanguage;
  onChange: (next: string) => void;
  taskKey: string;
  readOnly?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageComp = useRef(new Compartment());
  const readOnlyComp = useRef(new Compartment());
  // Held in a ref so the update listener never closes over a stale callback.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  // The text this component last pushed into the view, so an echo of our own
  // change never dispatches a redundant transaction.
  const lastPushed = useRef(value);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || viewRef.current) return;

    const view = new EditorView({
      doc: value,
      parent: host,
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        lineNumbers(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        EditorView.lineWrapping,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...redoKeymap,
          indentWithTab,
        ]),
        languageComp.current.of([]),
        readOnlyComp.current.of([]),
        // The workspace is light-only, like the playground shells.
        themeFor("github-light"),
        noActiveLine,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          const next = update.state.doc.toString();
          lastPushed.current = next;
          onChangeRef.current(next);
        }),
      ],
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount once: later changes are dispatched into the live view below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Language follows the active task.
  useEffect(() => {
    let cancelled = false;
    void extensionFor(language).then((ext) => {
      const view = viewRef.current;
      if (cancelled || !view) return;
      // Indent width rides along with the mode, so Tab inserts what the
      // language expects (four spaces in Python, two elsewhere).
      view.dispatch({
        effects: languageComp.current.reconfigure([
          ext ?? [],
          EditorState.tabSize.of(INDENT[language]),
          indentUnit.of(" ".repeat(INDENT[language])),
        ]),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: readOnlyComp.current.reconfigure(
        readOnly
          ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
          : [],
      ),
    });
  }, [readOnly]);

  // Re-seed on a task change, or when the parent replaces the text (Reset,
  // or a restored draft). Guarded on the last text we pushed so typing does
  // not dispatch a transaction per keystroke.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (value === lastPushed.current) return;
    lastPushed.current = value;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      selection: { anchor: Math.min(value.length, view.state.doc.length) },
    });
  }, [value, taskKey]);

  return <div ref={hostRef} className={s.editorHost} />;
}
