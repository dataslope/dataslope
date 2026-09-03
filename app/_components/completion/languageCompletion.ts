"use client";

// Shared intellisense wiring for every imperative-language CodeMirror editor
// (Playground, CodeBlock, ChallengeCard, the split web editors): a runtime
// source bridging `LanguageRuntime.complete()`, the language package's
// static sources (guarded against member-access position), document
// symbols from the Lezer tree (declarations, and member completion from
// declared types for the analyzer-less languages), curated builtin lists
// (lazy-loaded), and document-word fallback. Static sources are suppressed
// once the runtime can complete — CodeMirror only dedupes exact
// label/detail/boost matches, so both tiers at once show duplicates.
//
// When the popup opens is the reader's choice (Settings → Code
// Suggestions, see completionPrefs.ts): as you type by default, after
// trigger characters, only on Ctrl-Space, or never. Tab accepts, Enter
// always inserts a newline (same convention as the SQL playgrounds).
// Hover documentation and parameter hints ride along (runtimeTooltips.ts).

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
  HoverResult,
  PositionRequest,
  SignatureHelpResult,
} from "../types";
import { withCompletionTrigger, type CompletionTriggerMode } from "./completionPrefs";
import {
  documentMemberSource,
  documentSymbolSource,
  type SymbolLanguage,
} from "./documentSymbols";
import { completionPopupTheme } from "./popupTheme";
import { buildPositionRequest } from "./positionRequest";
import { RANK, ranked, rememberPickedCompletions } from "./ranking";
import { runtimeTooltips } from "./runtimeTooltips";

/** The slice of `LanguageRuntime` this module needs, kept structural so
 *  hosts can hand in a ref-reader without importing the full type. */
export interface CompletionRuntime {
  complete?(request: CompletionRequest): Promise<CompletionResult>;
  hover?(request: PositionRequest): Promise<HoverResult | null>;
  signatureHelp?(request: PositionRequest): Promise<SignatureHelpResult | null>;
}

export interface LanguageCompletionConfig {
  /** Adapter id ("python", "r", "javascript", …), selects the
   *  language profile below. */
  adapterId: string;
  /** Returns the live runtime when booted, or null (static sources still
   *  answer until then). */
  getRuntime: () => CompletionRuntime | null;
  /** Read-only init code prepended to the doc sent to whole-file analyzers
   *  so names it defines complete. Read per request so tab switches don't
   *  require an editor reconfigure. */
  getContextPrefix?: () => string;
  /** Active workspace-relative filename, for multi-file surfaces. */
  getFilename?: () => string | undefined;
}

/** Pause before the popup opens in "as you type" mode. Long enough that a
 *  fast typist isn't interrupted mid-word, short enough to feel live. */
const TYPING_DELAY_MS = 120;

// ─── Per-language profiles ────────────────────────────────────────────────

/** Lezer node names inside which static keyword/builtin lists must not
 *  fire. A superset across grammars, `ifNotIn` ignores names a
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
  /** Endings before the token that mark member-access position, where
   *  static/global sources are suppressed (`pd.|` must not offer `print`). */
  memberEndings: string[];
  /** Typed sequences that auto-open the completion popup. */
  triggerEndings: string[];
  /** Lazy loader for the language package's own completion sources
   *  (locals first, then globals/snippets). */
  langPack?: () => Promise<CompletionSource[]>;
  /** When true the pack stays active alongside the runtime (JS/TS keep
   *  snippet templates the TS service doesn't offer); otherwise it's a
   *  pre-boot fallback only. */
  langPackAlwaysOn?: boolean;
  /** False for packs that decide context themselves (HTML tags after `<`,
   *  CSS values after `:`) and must not be muted in "member" position. */
  guardMembers?: boolean;
  /** Tier for each pack source (locals, then globals/snippets); defaults
   *  to `[RANK.local, RANK.keyword]`. */
  packRanks?: [number, number];
  /** Lazy loader for the curated static builtin/keyword list. */
  staticList?: () => Promise<readonly Completion[]>;
  /** Lazy loader for keywords that stay on beside a runtime that only
   *  knows symbols (Roslyn, clang without patterns). */
  keywordsAlwaysOn?: () => Promise<readonly Completion[]>;
  /** Include document-word completion (the coarsest fallback for member
   *  access and local identifiers). */
  docWords?: boolean;
  /** Lezer-tree document symbols and declared-type member completion. */
  symbols?: SymbolLanguage;
  /** Symbols stay on beside the runtime (no runtime knows the document
   *  better for Java/PHP); off, they're a pre-boot tier. */
  symbolsAlwaysOn?: boolean;
  /** Extra language-specific source (e.g. PHP `$variable` scanning),
   *  active regardless of runtime state. */
  extraSource?: CompletionSource;
}

/** A profile chosen per file, for surfaces mixing languages (the web
 *  playground's HTML/CSS/JS trio). */
interface ByFileProfile {
  byFile: Array<{ test: RegExp; profile: LanguageProfile }>;
  fallback: LanguageProfile;
}

type ProfileSpec = LanguageProfile | ByFileProfile;

const WORD_DEFAULT = /[\w$]*$/;
const VALID_DEFAULT = /^[\w$]*$/;

/** Snippet templates sort below real symbols, as VS Code orders them. */
const asSnippet = (c: Completion): Completion => ({ ...c, boost: RANK.snippet });

/** Completions for `$variables` present in the document plus the PHP
 *  superglobals, the only names that make sense right after `$`. */
const phpVariableSource: CompletionSource = (ctx) => {
  const token = ctx.matchBefore(/\$[\w]*$/);
  if (!token) {
    if (!ctx.explicit) return null;
    // Ctrl-Space right behind a word or number, or in member position
    // (`$cart->`, `Cart::`): a `$name` would land glued to it.
    if (ctx.matchBefore(/[\w]$|->$|::$/)) return null;
  }
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

const JAVASCRIPT_PROFILE: LanguageProfile = {
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
      ifNotIn(
        DONT_COMPLETE_IN,
        completeFromList([...snippets.map(asSnippet), ...JS_KEYWORDS]),
      ),
    ];
  },
  langPackAlwaysOn: true,
};

const TYPESCRIPT_PROFILE: LanguageProfile = {
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
        completeFromList([...typescriptSnippets.map(asSnippet), ...TS_KEYWORDS]),
      ),
    ];
  },
  langPackAlwaysOn: true,
};

const HTML_PROFILE: LanguageProfile = {
  wordRe: /[\w-]*$/,
  validFor: /^[\w-]*$/,
  memberEndings: ["<", "</"],
  triggerEndings: ["<", "</"],
  langPack: async () => {
    const { htmlCompletionSource } = await import("@codemirror/lang-html");
    return [htmlCompletionSource];
  },
  langPackAlwaysOn: true,
  guardMembers: false,
  packRanks: [RANK.builtin, RANK.builtin],
};

const CSS_PROFILE: LanguageProfile = {
  wordRe: /[\w-]*$/,
  validFor: /^[\w-]*$/,
  memberEndings: [":"],
  triggerEndings: [":"],
  langPack: async () => {
    const { cssCompletionSource } = await import("@codemirror/lang-css");
    return [cssCompletionSource];
  },
  langPackAlwaysOn: true,
  guardMembers: false,
  packRanks: [RANK.builtin, RANK.builtin],
};

const PROFILES: Record<string, ProfileSpec> = {
  python: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: ["."],
    triggerEndings: ["."],
    // Pre-boot fallback only: once jedi answers, these would only duplicate.
    langPack: async () => {
      const { localCompletionSource, globalCompletion } = await import(
        "@codemirror/lang-python"
      );
      return [localCompletionSource, globalCompletion];
    },
  },
  r: {
    // R identifiers include dots; `::`/`$`/`@` extend the token so the
    // runtime sees the full qualified fragment.
    wordRe: /[\w.:$@]*$/,
    validFor: /^[\w.:$@]*$/,
    memberEndings: ["$", "@", "::"],
    triggerEndings: ["$", "@", "::"],
    staticList: async () => (await import("./staticLists/r")).R_COMPLETIONS,
  },
  javascript: JAVASCRIPT_PROFILE,
  typescript: TYPESCRIPT_PROFILE,
  react: TYPESCRIPT_PROFILE,
  web: {
    byFile: [
      { test: /\.(html?|xhtml)$/i, profile: HTML_PROFILE },
      { test: /\.css$/i, profile: CSS_PROFILE },
      { test: /\.(m?js|cjs|jsx)$/i, profile: JAVASCRIPT_PROFILE },
      { test: /\.tsx?$/i, profile: TYPESCRIPT_PROFILE },
    ],
    fallback: HTML_PROFILE,
  },
  php: {
    wordRe: /[\w$]*$/,
    validFor: /^\$?[\w]*$/,
    memberEndings: ["->", "::", "$"],
    triggerEndings: ["->", "::", "$"],
    staticList: async () => (await import("./staticLists/php")).PHP_COMPLETIONS,
    docWords: true,
    symbols: "php",
    symbolsAlwaysOn: true,
    extraSource: phpVariableSource,
  },
  c: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: [".", "->"],
    triggerEndings: [".", "->"],
    staticList: async () => (await import("./staticLists/c")).C_COMPLETIONS,
    docWords: true,
    symbols: "c",
  },
  cpp: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: [".", "->", "::"],
    triggerEndings: [".", "->", "::"],
    staticList: async () => (await import("./staticLists/cpp")).CPP_COMPLETIONS,
    docWords: true,
    symbols: "cpp",
  },
  java: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: ["."],
    triggerEndings: ["."],
    staticList: async () => (await import("./staticLists/java")).JAVA_COMPLETIONS,
    docWords: true,
    symbols: "java",
    symbolsAlwaysOn: true,
  },
  csharp: {
    wordRe: WORD_DEFAULT,
    validFor: VALID_DEFAULT,
    memberEndings: ["."],
    triggerEndings: ["."],
    staticList: async () =>
      (await import("./staticLists/csharp")).CSHARP_COMPLETIONS,
    // Roslyn answers with symbols only; the language's keywords stay.
    keywordsAlwaysOn: async () =>
      (await import("./staticLists/csharp")).CSHARP_KEYWORDS,
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

function isByFile(spec: ProfileSpec): spec is ByFileProfile {
  return "byFile" in spec;
}

/** The profiles an adapter can be in (one, or one per file kind). */
function variantsOf(spec: ProfileSpec): LanguageProfile[] {
  if (!isByFile(spec)) return [spec];
  const out: LanguageProfile[] = [];
  for (const { profile } of spec.byFile) {
    if (!out.includes(profile)) out.push(profile);
  }
  if (!out.includes(spec.fallback)) out.push(spec.fallback);
  return out;
}

function selectProfile(spec: ProfileSpec, filename: string | undefined): LanguageProfile {
  if (!isByFile(spec)) return spec;
  if (filename) {
    for (const { test, profile } of spec.byFile) {
      if (test.test(filename)) return profile;
    }
  }
  return spec.fallback;
}

// ─── Source combinators ───────────────────────────────────────────────────

/** True when the current token sits in member-access position (right
 *  after one of `endings`), where top-level names are meaningless. */
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
  if (profile.guardMembers === false) return source;
  return (ctx) =>
    inMemberPosition(ctx, profile.wordRe, profile.memberEndings)
      ? null
      : source(ctx);
}

/** Wrap a lazily-loaded source: kicks the import on first query and
 *  answers through the promise, so even the first request (a Ctrl-Space
 *  on a fresh page) shows the popup once the chunk lands. */
function lazySource(load: () => Promise<CompletionSource>): CompletionSource {
  let loaded: CompletionSource | null = null;
  let loading: Promise<CompletionSource | null> | null = null;
  return (ctx) => {
    if (loaded) return loaded(ctx);
    loading ??= load().then(
      (s) => (loaded = s),
      () => null, // Broken chunk: this source stays silent.
    );
    return loading.then((s) => (s && !ctx.aborted ? s(ctx) : null));
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
  profileFor: () => LanguageProfile,
): CompletionSource {
  return async (ctx): Promise<CmCompletionResult | null> => {
    const rt = cfg.getRuntime();
    if (!rt || typeof rt.complete !== "function") return null;
    const profile = profileFor();
    const request: CompletionRequest = {
      ...buildPositionRequest(ctx.state, ctx.pos, cfg),
      explicit: ctx.explicit,
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

/** Only answer while `profile` is the active one (multi-language surfaces
 *  register every variant's sources at once). */
function onlyFor(
  source: CompletionSource,
  profile: LanguageProfile,
  profileFor: () => LanguageProfile,
): CompletionSource {
  return (ctx) => (profileFor() === profile ? source(ctx) : null);
}

// ─── Extension assembly ───────────────────────────────────────────────────

/** Builds the self-contained intellisense extension for one editor
 *  (sources, trigger characters, keymap, hover and parameter hints). */
export function languageCompletion(cfg: LanguageCompletionConfig): Extension {
  const spec = PROFILES[cfg.adapterId] ?? FALLBACK_PROFILE;
  const profileFor = (): LanguageProfile =>
    selectProfile(spec, cfg.getFilename?.());

  const runtimeCanComplete = () => {
    const rt = cfg.getRuntime();
    return !!rt && typeof rt.complete === "function";
  };
  /** Suppress a fallback source once the runtime supersedes it. */
  const unlessRuntime = (source: CompletionSource): CompletionSource =>
    (ctx) => (runtimeCanComplete() ? null : source(ctx));

  const sources: CompletionSource[] = [
    // Never inside a string or comment, whatever the runtime thinks.
    ranked(ifNotIn(DONT_COMPLETE_IN, runtimeSource(cfg, profileFor)), RANK.runtime),
  ];

  for (const profile of variantsOf(spec)) {
    const mine = (source: CompletionSource) => onlyFor(source, profile, profileFor);
    // Static-list labels; doc-word completion filters against them so
    // `printf` isn't offered twice.
    const staticLabels = new Set<string>();

    if (profile.extraSource) {
      sources.push(mine(ranked(profile.extraSource, RANK.documentSymbol, { locality: false })));
    }

    if (profile.langPack) {
      // Packs ship up to two sources; each gets a lazy wrapper sharing one
      // import promise so the chunk loads once.
      let packPromise: Promise<CompletionSource[]> | null = null;
      const loadPack = () => (packPromise ??= profile.langPack!());
      const packRanks = profile.packRanks ?? [RANK.local, RANK.keyword];
      for (const idx of [0, 1] as const) {
        const lazy = ranked(
          lazySource(async () => {
            const packSources = (await loadPack()).map((s) =>
              suppressInMemberPosition(s, profile),
            );
            return packSources[idx] ?? (() => null);
          }),
          packRanks[idx],
        );
        sources.push(mine(profile.langPackAlwaysOn ? lazy : unlessRuntime(lazy)));
      }
    }

    if (profile.symbols) {
      const symbolSource = ranked(
        suppressInMemberPosition(
          ifNotIn(DONT_COMPLETE_IN, documentSymbolSource(profile.symbols)),
          profile,
        ),
        RANK.documentSymbol,
        { locality: false },
      );
      sources.push(
        mine(profile.symbolsAlwaysOn ? symbolSource : unlessRuntime(symbolSource)),
      );
    }

    if (profile.keywordsAlwaysOn) {
      sources.push(
        mine(
          ranked(
            lazySource(async () =>
              suppressInMemberPosition(
                ifNotIn(DONT_COMPLETE_IN, completeFromList(await profile.keywordsAlwaysOn!())),
                profile,
              ),
            ),
            RANK.keyword,
          ),
        ),
      );
    }

    // The static list loads once; the doc-word source waits for it so its
    // filter never races the chunk on the first query (`printf` twice).
    let staticListPromise: Promise<readonly Completion[]> | null = null;
    const loadStaticList = (): Promise<readonly Completion[]> =>
      (staticListPromise ??= profile.staticList!().then((list) => {
        for (const c of list) staticLabels.add(c.label);
        return list;
      }));

    if (profile.staticList) {
      sources.push(
        mine(
          unlessRuntime(
            ranked(
              lazySource(async () =>
                suppressInMemberPosition(
                  ifNotIn(DONT_COMPLETE_IN, completeFromList(await loadStaticList())),
                  profile,
                ),
              ),
              RANK.builtin,
            ),
          ),
        ),
      );
    }

    if (profile.docWords) {
      // In member position the declared-type member source answers first
      // (it knows `s.` is a String); doc words are the fallback for both
      // positions, minus static labels and bare numbers.
      const memberSource = profile.symbols
        ? ranked(
            ifNotIn(DONT_COMPLETE_IN, documentMemberSource(profile.symbols)),
            RANK.documentSymbol,
            { locality: false },
          )
        : null;
      const docWordSource = ranked(
        ifNotIn(DONT_COMPLETE_IN, async (ctx) => {
          const res = completeAnyWord(ctx) as CmCompletionResult | null;
          if (!res) return null;
          if (profile.staticList) {
            try {
              await loadStaticList();
            } catch {
              // No static list this session; nothing to filter against.
            }
            if (ctx.aborted) return null;
          }
          return {
            ...res,
            options: res.options.filter(
              (o) => !staticLabels.has(o.label) && !/^\d/.test(o.label),
            ),
          };
        }),
        RANK.docWord,
        { locality: false },
      );
      const combined: CompletionSource = (ctx) => {
        if (
          memberSource &&
          inMemberPosition(ctx, profile.wordRe, profile.memberEndings)
        ) {
          const members = memberSource(ctx);
          if (members) return members;
        }
        return docWordSource(ctx);
      };
      sources.push(
        mine(
          profile.symbolsAlwaysOn && memberSource
            ? (ctx) =>
                runtimeCanComplete()
                  ? inMemberPosition(ctx, profile.wordRe, profile.memberEndings)
                    ? memberSource(ctx)
                    : null
                  : combined(ctx)
            : unlessRuntime(combined),
        ),
      );
    }
  }

  // Auto-open the popup on the language's member-access triggers.
  const triggerListener = EditorView.updateListener.of((update) => {
    if (!update.docChanged) return;
    const endings = profileFor().triggerEndings;
    if (endings.length === 0) return;
    for (const tr of update.transactions) {
      if (!tr.isUserEvent("input.type")) continue;
      let inserted = "";
      tr.changes.iterChanges((_fA, _tA, _fB, _tB, ins) => {
        inserted += ins.toString();
      });
      if (!inserted) continue;
      const head = update.state.selection.main.head;
      const before = update.state.sliceDoc(Math.max(0, head - 2), head);
      if (endings.some((e) => before.endsWith(e))) {
        startCompletion(update.view);
        return;
      }
    }
  });

  const completionKeys = Prec.high(
    keymap.of([
      ...completionKeymap.filter((b) => b.key !== "Enter"),
      { key: "Tab", run: acceptCompletion },
    ]),
  );

  const build = (mode: CompletionTriggerMode): Extension => {
    if (mode === "off") return [];
    return [
      autocompletion({
        override: sources,
        activateOnTyping: mode === "typing",
        activateOnTypingDelay: TYPING_DELAY_MS,
        closeOnBlur: true,
        // Own bindings: Enter always inserts a newline, Tab accepts (the
        // default keymap binds Enter → acceptCompletion).
        defaultKeymap: false,
      }),
      mode === "manual" ? [] : triggerListener,
      completionKeys,
    ];
  };

  return [
    withCompletionTrigger(build),
    completionPopupTheme,
    rememberPickedCompletions,
    runtimeTooltips(cfg),
  ];
}

/** Test-only handles; not part of the public surface. */
export const _internal = {
  PROFILES,
  phpVariableSource,
  inMemberPosition,
  suppressInMemberPosition,
  toCmCompletion,
  lazySource,
  selectProfile,
  variantsOf,
};
