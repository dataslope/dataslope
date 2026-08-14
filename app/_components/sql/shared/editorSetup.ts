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
      // Completion keys must come before `defaultKeymap`, otherwise
      // ArrowUp/ArrowDown would move the cursor instead of the popup
      // selection. Enter is removed so it always inserts a newline,
      // Tab accepts the active completion instead (falling through to
      // indentWithTab when no completion is shown). This only works
      // because the autocompletion extension's own keymap is disabled
      // (`defaultKeymap: false` above); that built-in copy binds Enter
      // at the highest precedence and would override anything here.
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

