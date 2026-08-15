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
import {
  Compartment,
  EditorState,
  Prec,
  type Extension,
} from "@codemirror/state";
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
import { themeFor, redoKeymap } from "../../cmExtensions";
import {
  createSqlCompletionSource,
  type SqlCompletionSchema,
  type SqlDialect,
} from "../sqlCompletion";
import { splitSqlStatements, statementAtCursor } from "../utils/sqlAnalysis";

// 75 ms keeps schema suggestions feeling immediate while coalescing rapid
// typing (CodeMirror's default is 100 ms).
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
  // Called on document / selection changes. Hosts typically wire these to
  // refs so the editor needn't be torn down when a tab switch changes them.
  onDocChange: (code: string) => void;
  onSelectionChange: (hasSelection: boolean) => void;
  onRunSelection: (text: string) => void;
  onRunAll: () => void;
}

// `@codemirror/lang-sql` is loaded on demand so it lives in its own chunk.
// The editor mounts instantly without highlighting; the lang compartment is
// reconfigured as soon as the dynamic import resolves.
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

/** Dialect argument for lang-sql's `sql({ dialect })`. DuckDB has no native
 *  descriptor, so it falls back to the generic SQL grammar. */
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
    // The built-in keymap binds Enter → acceptCompletion at highest
    // precedence, hijacking newlines while the popup is visible; the
    // completion keys are registered manually instead.
    defaultKeymap: false,
    override: [createSqlCompletionSource(schema, { dialect })],
  });
}

/** Build the lang-sql extension for a reconfigure dispatch. Returns a
 *  Promise so callers share the lazy-loaded chunk via `loadLangSql`. */
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


/** Typing `'` straight after an `x`/`X` blob prefix inserts a plain quote
 *  instead of an auto-closed pair.
 *
 *  `closeBrackets` does not recognise `x'…'` as one token, so it auto-closes
 *  the opening quote and then fails to type over its own closing quote — the
 *  spare `'` ends up at the end of the line, and `SELECT x'' AS zz;` becomes
 *  `SELECT x'' AS zz;'` with a syntax error pointing somewhere else entirely.
 *  `x'…'` is idiomatic SQLite (it is how every BLOB literal is written), so
 *  this pays for itself; a quote in any other position still auto-closes.
 *
 *  Highest precedence so it runs before `closeBrackets`'s own handler. */
const blobLiteralQuoteHandler = Prec.highest(
  EditorView.inputHandler.of((view, from, to, text) => {
    if (text !== "'") return false;
    const prev = view.state.doc.sliceString(Math.max(0, from - 1), from);
    if (prev !== "x" && prev !== "X") return false;
    // `ax'` is an identifier, not a blob literal: only a standalone x/X counts.
    const beforePrev =
      from >= 2 ? view.state.doc.sliceString(from - 2, from - 1) : "";
    if (/[\w$]/.test(beforePrev)) return false;
    view.dispatch({
      changes: { from, to, insert: "'" },
      selection: { anchor: from + 1 },
      userEvent: "input.type",
    });
    return true;
  }),
);

/** Canonical extension list shared by every SQL playground. Compartments are
 *  passed in so the caller can `.reconfigure(...)` later. The `lang`
 *  compartment is intentionally seeded empty: the caller dispatches the
 *  resolved `makeSqlLangExtension(...)` so lang-sql never blocks mount. */
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
    blobLiteralQuoteHandler,
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
        // Primary run action: run the selection if any, else every statement.
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
        // Secondary run action: with no selection in a multi-statement doc,
        // run just the statement under the cursor; otherwise run all.
        key: "Mod-Shift-Enter",
        run: (view) => {
          const sel = view.state.selection.main;
          if (sel.empty) {
            const doc = view.state.doc.toString();
            const stmt = statementAtCursor(doc, sel.head);
            if (stmt && splitSqlStatements(doc).length > 1) {
              onRunSelection(stmt.text);
              return true;
            }
          }
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
      // Completion keys must precede `defaultKeymap` so ArrowUp/Down move the
      // popup selection, not the cursor. Enter is removed so it always
      // inserts a newline; Tab accepts the completion instead. Only works
      // because the extension's own keymap is disabled (defaultKeymap: false).
      ...completionKeymap.filter((b) => b.key !== "Enter"),
      { key: "Tab", run: acceptCompletion },
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...redoKeymap,
      indentWithTab,
    ]),
  ];
}

