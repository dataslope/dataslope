"use client";

import {
  acceptCompletion,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  startCompletion,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  PostgreSQL,
  SQLite,
  sql as sqlLang,
} from "@codemirror/lang-sql";
import {
  bracketMatching,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
  tooltips,
} from "@codemirror/view";
import { themeFor } from "../../cmExtensions";
import {
  createSqlCompletionSource,
  type SqlCompletionSchema,
  type SqlDialect,
} from "../sqlCompletion";

// 75 ms keeps local schema suggestions feeling immediate while still
// coalescing rapid typing before recomputing completions. CodeMirror's
// default is 100 ms.
const AUTOCOMPLETE_DELAY_MS = 75;

export interface SqlEditorCompartments {
  lang: Compartment;
  completion: Compartment;
  theme: Compartment;
  wrap: Compartment;
}

export function makeSqlEditorCompartments(): SqlEditorCompartments {
  return {
    lang: new Compartment(),
    completion: new Compartment(),
    theme: new Compartment(),
    wrap: new Compartment(),
  };
}

export interface CreateSqlEditorExtensionsOptions {
  dialect: SqlDialect;
  compartments: SqlEditorCompartments;
  initialSchema?: SqlCompletionSchema;
  initialTheme: string;
  initialWordWrap: boolean;
  // The editor calls these on document / selection changes. The host
  // typically wires them to refs that always reflect the freshest
  // callbacks so the editor doesn't have to be torn down when a tab
  // switch changes which "run" function should fire.
  onDocChange: (code: string) => void;
  onSelectionChange: (hasSelection: boolean) => void;
  onRunSelection: (text: string) => void;
  onRunAll: () => void;
}

/** Returns the dialect-specific argument for `@codemirror/lang-sql`'s
 *  `sql({ dialect })` factory. DuckDB has no native dialect descriptor,
 *  so we fall back to undefined (which lets lang-sql use its default
 *  generic SQL grammar). */
export function sqlLangDialect(dialect: SqlDialect) {
  if (dialect === "postgres") return PostgreSQL;
  if (dialect === "sqlite") return SQLite;
  return undefined;
}

export function makeSqlAutocompletionExtension(
  schema: SqlCompletionSchema,
  dialect: SqlDialect,
): Extension {
  return autocompletion({
    activateOnTyping: true,
    activateOnTypingDelay: AUTOCOMPLETE_DELAY_MS,
    closeOnBlur: true,
    override: [createSqlCompletionSource(schema, { dialect })],
  });
}

/** Build the `@codemirror/lang-sql` extension for a reconfigure
 *  dispatch (when the schema or dialect changes after the editor is
 *  mounted). The optional `schema` is the lang-sql shape used for
 *  built-in completions — it's the same `Record<table, columns>`
 *  the SQLite playground has always passed. */
export function makeSqlLangExtension(
  dialect: SqlDialect,
  schema?: Record<string, string[]>,
): Extension {
  return sqlLang({
    schema,
    dialect: sqlLangDialect(dialect),
    upperCaseKeywords: false,
  });
}

/** Build the canonical extension list every SQL playground needs.
 *
 *  This consolidates ~80 lines that were duplicated across the SQLite,
 *  Postgres, and DuckDB playgrounds. The four CodeMirror compartments
 *  (lang / completion / theme / wrap) are passed in by the caller so
 *  it can hold onto them for later `.reconfigure(...)` dispatches
 *  (schema updates, theme toggles, word-wrap toggles). */
export function createSqlEditorExtensions(
  opts: CreateSqlEditorExtensionsOptions,
): Extension[] {
  const {
    dialect,
    compartments,
    initialSchema = { entities: [] },
    initialTheme,
    initialWordWrap,
    onDocChange,
    onSelectionChange,
    onRunSelection,
    onRunAll,
  } = opts;

  return [
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    tooltips({ parent: document.body }),
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    crosshairCursor(),
    EditorState.tabSize.of(2),
    indentUnit.of("  "),
    compartments.lang.of(
      sqlLang({
        dialect: sqlLangDialect(dialect),
        upperCaseKeywords: false,
      }),
    ),
    compartments.completion.of(
      makeSqlAutocompletionExtension(initialSchema, dialect),
    ),
    compartments.theme.of(themeFor(initialTheme)),
    compartments.wrap.of(initialWordWrap ? EditorView.lineWrapping : []),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        onSelectionChange(!update.state.selection.main.empty);
      }
      if (update.docChanged) {
        onDocChange(update.state.doc.toString());
      }
    }),
    keymap.of([
      {
        // Run selection if text is selected, otherwise run all.
        key: "Mod-Enter",
        run: (view) => {
          const sel = view.state.selection.main;
          if (!sel.empty) {
            onRunSelection(view.state.sliceDoc(sel.from, sel.to));
          } else {
            onRunAll();
          }
          return true;
        },
      },
      {
        // Always run all queries (ignores any selection).
        key: "Mod-Shift-Enter",
        run: () => {
          onRunAll();
          return true;
        },
      },
      {
        key: "Ctrl-Space",
        run: (view) => {
          startCompletion(view);
          return true;
        },
      },
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      // Remove Enter from the default completion keymap so that Enter
      // always inserts a newline. Tab accepts the active completion
      // instead, falling through to indentWithTab when no completion is
      // shown.
      ...completionKeymap.filter((b) => b.key !== "Enter"),
      { key: "Tab", run: acceptCompletion },
      indentWithTab,
    ]),
  ];
}
