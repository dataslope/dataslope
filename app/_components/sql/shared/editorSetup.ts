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
import { splitSqlStatements, statementAtCursor } from "../utils/sqlAnalysis";

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

// Stage 5.3 — `@codemirror/lang-sql` is loaded on demand so it lives in
// its own chunk instead of bloating each SQL playground's main bundle.
// The chunk is small enough that fetching it in parallel with engine
// boot keeps the user-visible editor mount instant: the editor renders
// immediately with no syntax highlighting / lang-aware completions and
// the lang compartment is reconfigured as soon as the dynamic import
// resolves (typically before the user even finishes the database boot).
type LangSqlModule = typeof import("@codemirror/lang-sql");
let _langSqlPromise: Promise<LangSqlModule> | null = null;
function loadLangSql(): Promise<LangSqlModule> {
  if (!_langSqlPromise) {
    _langSqlPromise = import("@codemirror/lang-sql");
  }
  return _langSqlPromise;
}
/** Returns a Promise that resolves to the `@codemirror/lang-sql`
 *  module. Cached so concurrent callers share one fetch. */
export function ensureLangSqlLoaded(): Promise<LangSqlModule> {
  return loadLangSql();
}

/** Returns the dialect-specific argument for `@codemirror/lang-sql`'s
 *  `sql({ dialect })` factory. DuckDB has no native dialect descriptor,
 *  so we fall back to undefined (which lets lang-sql use its default
 *  generic SQL grammar). */
function pickLangDialect(mod: LangSqlModule, dialect: SqlDialect) {
  if (dialect === "postgres") return mod.PostgreSQL;
  if (dialect === "sqlite") return mod.SQLite;
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
 *  the SQLite playground has always passed.
 *
 *  Returns a Promise so callers can re-use the lazy-loaded chunk
 *  without re-importing it. Each playground caches the resolved
 *  module via the shared `loadLangSql` promise above. */
export async function makeSqlLangExtension(
  dialect: SqlDialect,
  schema?: Record<string, string[]>,
): Promise<Extension> {
  const mod = await loadLangSql();
  return mod.sql({
    schema,
    dialect: pickLangDialect(mod, dialect),
    upperCaseKeywords: false,
  });
}

/** Build the canonical extension list every SQL playground needs.
 *
 *  This consolidates ~80 lines that were duplicated across the SQLite,
 *  Postgres, and DuckDB playgrounds. The four CodeMirror compartments
 *  (lang / completion / theme / wrap) are passed in by the caller so
 *  it can hold onto them for later `.reconfigure(...)` dispatches
 *  (schema updates, theme toggles, word-wrap toggles).
 *
 *  The `lang` compartment is intentionally seeded with an empty
 *  extension. The caller is expected to dispatch a reconfigure with
 *  the resolved `makeSqlLangExtension(...)` once it lands — this lets
 *  us defer the lang-sql chunk without blocking editor mount. */
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
    // Lang compartment seeded empty; reconfigured once the lazy-loaded
    // `@codemirror/lang-sql` chunk resolves (see `makeSqlLangExtension`).
    compartments.lang.of([]),
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
        // Run the selection if any; otherwise, in a multi-statement document,
        // run just the statement under the cursor (the standard IDE behavior);
        // a single-statement document still runs everything (unchanged). Use
        // Mod-Shift-Enter to force "run all" regardless.
        key: "Mod-Enter",
        run: (view) => {
          const sel = view.state.selection.main;
          if (!sel.empty) {
            onRunSelection(view.state.sliceDoc(sel.from, sel.to));
            return true;
          }
          const doc = view.state.doc.toString();
          const stmt = statementAtCursor(doc, sel.head);
          if (stmt && splitSqlStatements(doc).length > 1) {
            onRunSelection(stmt.text);
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

