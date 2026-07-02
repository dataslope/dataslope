"use client";

// Shared intellisense wiring for every imperative-language CodeMirror
// editor (Playground, CodeBlock, ChallengeCard). One extension bundles:
//
//   1. `autocompletion()` with an explicitly composed per-language
//      source list:
//        - a *runtime* source that bridges the adapter's optional
//          `LanguageRuntime.complete()` hook (live-introspection
//          completions from Pyodide/WebR/the TS language service);
//        - the language package's own static sources where they exist
//          (lang-python keywords/builtins/locals, lang-javascript
//          snippets/locals) — re-assembled here so they can be guarded
//          against firing in member-access position (`pd.|` must not
//          offer `print`);
//        - a curated builtin/keyword list for languages with no
//          semantic analyzer (PHP, Java, C, C++, C#, R-before-boot),
//          lazy-loaded so the lists stay out of the main bundle;
//        - document-word completion for the static-only languages, so
//          `obj.` / `ptr->` at least offers identifiers already in the
//          buffer (the classic editor fallback).
//      Static sources that a booted runtime supersedes are suppressed
//      once `runtime.complete` is available — CodeMirror only dedupes
//      options whose label/detail/boost all match, so running both
//      tiers at once would show visible duplicates.
//   2. Trigger characters (`.`, `->`, `::`, `$` per language) that open
//      the popup, plus Ctrl-Space. `activateOnTyping` stays OFF on
//      these surfaces by design: typing pauses are reserved for the AI
//      ghost-text suggestions (see app/_components/ai/inlineCompletion
//      on the ai-autocomplete branch), which stand down while this
//      popup is open.
//   3. The completion keymap at high precedence: Tab accepts, Escape
//      closes, arrows navigate, Enter always inserts a newline — the
//      same bindings the SQL playgrounds already teach.

import {
  acceptCompletion,
  autocompletion,
  completionKeymap,
  completeAnyWord,
  completeFromList,
  ifNotIn,
  startCompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult as CmCompletionResult,
  type CompletionSource,
} from "@codemirror/autocomplete";
import { Prec, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";

import type {
  CompletionListItem,
  CompletionRequest,
  CompletionResult,
} from "../types";

/** The slice of `LanguageRuntime` this module needs — kept structural so
 *  hosts can hand in a ref-reader without importing the full type. */
export interface CompletionRuntime {
  complete?(request: CompletionRequest): Promise<CompletionResult>;
}

export interface LanguageCompletionConfig {
  /** Adapter id ("python", "r", "javascript", …) — selects the
   *  language profile below. */
  adapterId: string;
  /** Returns the live runtime when one is booted, or null. The runtime
   *  source degrades to nothing (static sources still answer) until a
   *  runtime is available. */
  getRuntime: () => CompletionRuntime | null;
  /** Read-only init code that conceptually runs before this editor's
   *  doc (the CodeBlock/ChallengeCard init drawer). Prepended to the
   *  document sent to whole-file analyzers so names it defines
   *  complete. Read per request so tab switches don't require an
   *  editor reconfigure. */
  getContextPrefix?: () => string;
  /** Active workspace-relative filename, for multi-file surfaces. */
  getFilename?: () => string | undefined;
}

// ─── Per-language profiles ────────────────────────────────────────────────

/** Lezer node names inside which static keyword/builtin lists must not
 *  fire. A superset across grammars — `ifNotIn` ignores names a
 *  particular grammar doesn't produce. */
const DONT_COMPLETE_IN = [
  "String",
  "StringLiteral",
  "TemplateString",
  "RawString",
  "CharLiteral",
  "LineComment",
  "BlockComment",
  "Comment",
];

interface LanguageProfile {
  /** Characters that make up a completion token, as a trailing-anchored
   *  regex used to locate the current word. */
  wordRe: RegExp;
  /** `validFor` handed to CodeMirror so further typing filters the open
   *  popup instead of re-querying the (possibly slow) runtime. */
  validFor: RegExp;
  /** Endings (looking backwards from the token start) that mark
   *  member-access position — static/global sources are suppressed
   *  there so `pd.|` never offers top-level keywords. */
  memberEndings: string[];
  /** Typed sequences that auto-open the completion popup. */
  triggerEndings: string[];
  /** Lazy loader for the language package's own completion sources
   *  (locals first, then globals/snippets). */
  langPack?: () => Promise<CompletionSource[]>;
  /** When true, the language-pack sources stay active even once the
   *  runtime provides completions (JS/TS keep their snippet templates,
   *  which the TS language service doesn't offer; exact-duplicate
   *  keywords collapse via CodeMirror's dedup). When false they're a
   *  pre-boot fallback only. */
  langPackAlwaysOn?: boolean;
  /** Lazy loader for the curated static builtin/keyword list. */
  staticList?: () => Promise<readonly Completion[]>;
  /** Include document-word completion (the static-language fallback for
   *  member access and local identifiers). */
  docWords?: boolean;
  /** Extra language-specific source (e.g. PHP `$variable` scanning),
   *  active regardless of runtime state. */
  extraSource?: CompletionSource;
}

const WORD_DEFAULT = /[\w$]*$/;
const VALID_DEFAULT = /^[\w$]*$/;

/** Completions for `$variables` present in the document plus the PHP
 *  superglobals — the only names that make sense right after `$`. */
const phpVariableSource: CompletionSource = (ctx) => {
  const token = ctx.matchBefore(/\$[\w]*$/);
  if (!token && !ctx.explicit) return null;
  const seen = new Set<string>([
    "$_GET", "$_POST", "$_REQUEST", "$_SESSION", "$_COOKIE",
    "$_SERVER", "$_FILES", "$_ENV", "$GLOBALS",
  ]);
  const docText = ctx.state.doc.toString();
  const re = /\$[A-Za-z_][\w]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(docText)) !== null) seen.add(m[0]);
  // Don't suggest the fragment the user is currently typing.
  if (token) seen.delete(token.text);
  return {
    from: token ? token.from : ctx.pos,
    options: [...seen].map((label) => ({ label, type: "variable" })),
    validFor: /^\$[\w]*$/,
  };
};

const PROFILES: Record<string, LanguageProfile> = {
  python: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: ["."],
    triggerEndings: ["."],
    // Pre-boot fallback only: once the Pyodide worker answers (jedi —
    // which covers keywords, builtins, and locals with richer
    // metadata), these would only add duplicate rows.
    langPack: async () => {
      const { localCompletionSource, globalCompletion } = await import(
        "@codemirror/lang-python"
      );
      return [localCompletionSource, globalCompletion];
    },
  },
  r: {
    // R identifiers include dots (`read.csv`); `::`/`$`/`@` extend the
    // token so the runtime sees the full qualified fragment (R answers
    // with full replacements like `frame$col` / `utils::read.csv`).
    wordRe: /[\w.:$@]*$/,
    validFor: /^[\w.:$@]*$/,
    memberEndings: ["$", "@", "::"],
    triggerEndings: ["$", "@", "::"],
    staticList: async () => (await import("./staticLists/r")).R_COMPLETIONS,
  },
  javascript: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: [".", "?."],
    triggerEndings: ["."],
    langPack: async () => {
      const { localCompletionSource, snippets } = await import(
        "@codemirror/lang-javascript"
      );
      const { JS_KEYWORDS } = await import("./staticLists/javascript");
      return [
        localCompletionSource,
        ifNotIn(DONT_COMPLETE_IN, completeFromList([...snippets, ...JS_KEYWORDS])),
      ];
    },
    langPackAlwaysOn: true,
  },
  typescript: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: [".", "?."],
    triggerEndings: ["."],
    langPack: async () => {
      const { localCompletionSource, typescriptSnippets } = await import(
        "@codemirror/lang-javascript"
      );
      const { TS_KEYWORDS } = await import("./staticLists/javascript");
      return [
        localCompletionSource,
        ifNotIn(
          DONT_COMPLETE_IN,
          completeFromList([...typescriptSnippets, ...TS_KEYWORDS]),
        ),
      ];
    },
    langPackAlwaysOn: true,
  },
  php: {
    wordRe: /[\w$]*$/,
    validFor: /^\$?[\w]*$/,
    memberEndings: ["->", "::", "$"],
    triggerEndings: ["->", "::", "$"],
    staticList: async () => (await import("./staticLists/php")).PHP_COMPLETIONS,
    docWords: true,
    extraSource: phpVariableSource,
  },
  c: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: [".", "->"],
    triggerEndings: [".", "->"],
    staticList: async () => (await import("./staticLists/c")).C_COMPLETIONS,
    docWords: true,
  },
  cpp: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: [".", "->", "::"],
    triggerEndings: [".", "->", "::"],
    staticList: async () => (await import("./staticLists/cpp")).CPP_COMPLETIONS,
    docWords: true,
  },
  java: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: ["."],
    triggerEndings: ["."],
    staticList: async () => (await import("./staticLists/java")).JAVA_COMPLETIONS,
    docWords: true,
  },
  csharp: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: ["."],
    triggerEndings: ["."],
    staticList: async () =>
      (await import("./staticLists/csharp")).CSHARP_COMPLETIONS,
    docWords: true,
  },
};

const FALLBACK_PROFILE: LanguageProfile = {
  wordRe: WORD_DEFAULT,
  validFor: VALID_DEFAULT,
  memberEndings: ["."],
  triggerEndings: [],
  docWords: true,
};

// ─── Source combinators ───────────────────────────────────────────────────

/** True when the current token sits in member-access position (right
 *  after one of `endings`) — where top-level names are meaningless. */
function inMemberPosition(
  ctx: CompletionContext,
  wordRe: RegExp,
  endings: string[],
): boolean {
  const word = ctx.matchBefore(wordRe);
  const start = word ? word.from : ctx.pos;
  if (start === 0) return false;
  const before = ctx.state.sliceDoc(Math.max(0, start - 2), start);
  return endings.some((e) => before.endsWith(e));
}

function suppressInMemberPosition(
  source: CompletionSource,
  profile: LanguageProfile,
): CompletionSource {
  return (ctx) =>
    inMemberPosition(ctx, profile.wordRe, profile.memberEndings)
      ? null
      : source(ctx);
}

/** Wrap a lazily-loaded source: kicks the import on first query and
 *  answers `null` until it resolves (the next keystroke re-queries). */
function lazySource(load: () => Promise<CompletionSource>): CompletionSource {
  let loaded: CompletionSource | null = null;
  let loading: Promise<void> | null = null;
  return (ctx) => {
    if (loaded) return loaded(ctx);
    if (!loading) {
      loading = load().then(
        (s) => {
          loaded = s;
        },
        () => {
          // Leave `loading` settled-but-failed; a page with a broken
          // chunk simply has no static completions.
        },
      );
    }
    return null;
  };
}

/** Map a runtime `CompletionListItem` onto a CodeMirror completion. */
function toCmCompletion(item: CompletionListItem): Completion {
  if (typeof item === "string") return { label: item, type: "variable" };
  return {
    label: item.label,
    type: item.type ?? "variable",
    detail: item.detail,
    info: item.info,
    apply: item.apply,
    boost: item.boost,
  };
}

/** Bridge the adapter's `LanguageRuntime.complete()` into a CodeMirror
 *  completion source. */
function runtimeSource(
  cfg: LanguageCompletionConfig,
  profile: LanguageProfile,
): CompletionSource {
  return async (ctx): Promise<CmCompletionResult | null> => {
    const rt = cfg.getRuntime();
    if (!rt || typeof rt.complete !== "function") return null;

    const cursorLine = ctx.state.doc.lineAt(ctx.pos);
    const prefix = cfg.getContextPrefix?.() ?? "";
    // Prepend the read-only init code (when any) so whole-file
    // analyzers see the names it defines. Offsets shift accordingly;
    // line-based engines only consume `line`/`column`, which don't.
    const prefixBlock = prefix.trim() ? `${prefix.trimEnd()}\n` : "";
    const request: CompletionRequest = {
      doc: prefixBlock + ctx.state.doc.toString(),
      offset: prefixBlock.length + ctx.pos,
      line: cursorLine.text,
      column: ctx.pos - cursorLine.from,
      lineNumber:
        cursorLine.number + (prefixBlock ? prefixBlock.split("\n").length - 1 : 0),
      explicit: ctx.explicit,
      filename: cfg.getFilename?.(),
    };

    try {
      const res = await rt.complete(request);
      if (!res || res.list.length === 0) return null;
      return {
        from: ctx.pos - res.replaceLength,
        to: ctx.pos,
        options: res.list.map(toCmCompletion),
        validFor: profile.validFor,
      };
    } catch {
      return null;
    }
  };
}

// ─── Extension assembly ───────────────────────────────────────────────────

/** Build the full intellisense extension for one editor. Append to the
 *  editor's extension list; it is self-contained (completion sources,
 *  trigger characters, and keymap included). */
export function languageCompletion(cfg: LanguageCompletionConfig): Extension {
  const profile = PROFILES[cfg.adapterId] ?? FALLBACK_PROFILE;

  const runtimeCanComplete = () => {
    const rt = cfg.getRuntime();
    return !!rt && typeof rt.complete === "function";
  };
  /** Suppress a fallback source once the runtime supersedes it. */
  const unlessRuntime = (source: CompletionSource): CompletionSource =>
    (ctx) => (runtimeCanComplete() ? null : source(ctx));

  // Labels of the curated static list, once loaded — document-word
  // completion filters against them so `printf` isn't offered twice
  // (once with a signature, once as a bare doc word).
  const staticLabels = new Set<string>();

  const sources: CompletionSource[] = [runtimeSource(cfg, profile)];
  if (profile.extraSource) sources.push(profile.extraSource);
  if (profile.langPack) {
    // Language packs ship up to two independent sources (locals +
    // globals/snippets). Each gets its own lazy wrapper; the import
    // promise is shared so the chunk loads once.
    let packPromise: Promise<CompletionSource[]> | null = null;
    const loadPack = () => (packPromise ??= profile.langPack!());
    for (const idx of [0, 1]) {
      const lazy = lazySource(async () => {
        const packSources = (await loadPack()).map((s) =>
          suppressInMemberPosition(s, profile),
        );
        return packSources[idx] ?? (() => null);
      });
      sources.push(profile.langPackAlwaysOn ? lazy : unlessRuntime(lazy));
    }
  }
  if (profile.staticList) {
    sources.push(
      unlessRuntime(
        lazySource(async () => {
          const list = await profile.staticList!();
          for (const c of list) staticLabels.add(c.label);
          return suppressInMemberPosition(
            ifNotIn(DONT_COMPLETE_IN, completeFromList(list)),
            profile,
          );
        }),
      ),
    );
  }
  if (profile.docWords) {
    // Document words answer everywhere — including member position,
    // where they're the only fallback static languages have.
    const docWordSource = ifNotIn(DONT_COMPLETE_IN, (ctx) => {
      const res = completeAnyWord(ctx) as CmCompletionResult | null;
      if (!res) return null;
      return {
        ...res,
        options: res.options.filter((o) => !staticLabels.has(o.label)),
      };
    });
    sources.push(unlessRuntime(docWordSource));
  }

  // Auto-open the popup on the language's member-access triggers,
  // mirroring the "type a dot" UX of the original Playground wiring.
  const triggerListener =
    profile.triggerEndings.length === 0
      ? []
      : EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          for (const tr of update.transactions) {
            if (!tr.isUserEvent("input.type")) continue;
            let inserted = "";
            tr.changes.iterChanges((_fA, _tA, _fB, _tB, ins) => {
              inserted += ins.toString();
            });
            if (!inserted) continue;
            const head = update.state.selection.main.head;
            const before = update.state.sliceDoc(Math.max(0, head - 2), head);
            if (profile.triggerEndings.some((e) => before.endsWith(e))) {
              startCompletion(update.view);
              return;
            }
          }
        });

  return [
    autocompletion({
      override: sources,
      activateOnTyping: false,
      closeOnBlur: true,
      // The built-in keymap binds Enter → acceptCompletion at the
      // highest precedence; we register our own bindings below so
      // Enter always inserts a newline and Tab accepts — the same
      // convention as the SQL playground editors. Ctrl-Space (open)
      // comes with `completionKeymap`.
      defaultKeymap: false,
    }),
    triggerListener,
    Prec.high(
      keymap.of([
        ...completionKeymap.filter((b) => b.key !== "Enter"),
        { key: "Tab", run: acceptCompletion },
      ]),
    ),
  ];
}

/** Test-only handles (see __tests__/languageCompletion.test.ts). Not
 *  part of the public surface. */
export const _internal = {
  PROFILES,
  phpVariableSource,
  inMemberPosition,
  suppressInMemberPosition,
  toCmCompletion,
};
