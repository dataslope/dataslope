/**
 * Slim stand-in for the `shiki` package, wired in via the `shiki` resolve
 * alias in next.config.ts.
 *
 * Why: the docs collections run in Fumadocs `dynamic` mode, so MDX (and its
 * Shiki highlighting) compiles at REQUEST time inside the Cloudflare Worker.
 * Fumadocs boots its highlighter with `await import("shiki")`, the
 * full bundle, which statically references every grammar in
 * `@shikijs/langs` — ~9.4 MB of regex data (~1.3 MiB gzipped) in a Worker
 * whose hard size ceiling is 10 MiB gzipped. This module exposes the same
 * runtime surface Fumadocs uses (`createHighlighter`,
 * `createJavaScriptRegexEngine`, `createOnigurumaEngine`, plus the core
 * re-exports) with the language registry restricted to the languages the
 * content actually uses.
 *
 * Behavior for a language OUTSIDE this list: Fumadocs's
 * `loadMissingLanguage` skips grammars that aren't in the bundle, so the
 * code block renders unhighlighted instead of crashing. If you fence a new
 * language in content/, add it here (and check `npm run build` output;
 * `scripts/` has no automated guard). ```mermaid``` fences never reach
 * Shiki, `remarkMdxMermaid` converts them to components first.
 *
 * Build-time highlighting (fumadocs-mdx compiling static collections in
 * Node) resolves the REAL `shiki` package, aliasing applies only to the
 * Next.js bundle, so this list only has to cover what request-time
 * compiles (the `dynamic`-mode courses/interview collections) need.
 */

import {
  createBundledHighlighter,
  createSingletonShorthands,
  guessEmbeddedLanguages,
} from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import { createOnigurumaEngine } from "@shikijs/engine-oniguruma";
import type {
  BundledLanguageInfo,
  BundledThemeInfo,
  DynamicImportLanguageRegistration,
  DynamicImportThemeRegistration,
} from "@shikijs/types";

export * from "@shikijs/core";
export { createJavaScriptRegexEngine, createOnigurumaEngine };

/** Languages fenced in content/ (see the header comment). Aliases that
 *  shiki normally resolves via `bundledLanguagesAlias` (js → javascript,
 *  py → python, …) are listed as their own keys pointing at the same
 *  grammar module, Fumadocs checks `lang in bundledLanguages` directly. */
export const bundledLanguages = {
  bash: () => import("@shikijs/langs/bash"),
  sh: () => import("@shikijs/langs/bash"),
  shell: () => import("@shikijs/langs/bash"),
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  cs: () => import("@shikijs/langs/csharp"),
  css: () => import("@shikijs/langs/css"),
  haskell: () => import("@shikijs/langs/haskell"),
  html: () => import("@shikijs/langs/html"),
  java: () => import("@shikijs/langs/java"),
  javascript: () => import("@shikijs/langs/javascript"),
  js: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  jsx: () => import("@shikijs/langs/jsx"),
  markdown: () => import("@shikijs/langs/markdown"),
  md: () => import("@shikijs/langs/markdown"),
  python: () => import("@shikijs/langs/python"),
  py: () => import("@shikijs/langs/python"),
  r: () => import("@shikijs/langs/r"),
  rust: () => import("@shikijs/langs/rust"),
  sas: () => import("@shikijs/langs/sas"),
  sql: () => import("@shikijs/langs/sql"),
  toml: () => import("@shikijs/langs/toml"),
  tsx: () => import("@shikijs/langs/tsx"),
  typescript: () => import("@shikijs/langs/typescript"),
  ts: () => import("@shikijs/langs/typescript"),
  yaml: () => import("@shikijs/langs/yaml"),
  yml: () => import("@shikijs/langs/yaml"),
} as Record<string, DynamicImportLanguageRegistration>;

/** Fumadocs's defaults (github-light/github-dark) only. */
export const bundledThemes = {
  "github-light": () => import("@shikijs/themes/github-light"),
  "github-dark": () => import("@shikijs/themes/github-dark"),
} as Record<string, DynamicImportThemeRegistration>;

// Compatibility exports mirroring shiki's full bundle shape; consumers
// that enumerate the registry see the slim list.
export const bundledLanguagesBase = bundledLanguages;
export const bundledLanguagesAlias: Record<
  string,
  DynamicImportLanguageRegistration
> = {};
export const bundledLanguagesInfo: BundledLanguageInfo[] = [];
export const bundledThemesInfo: BundledThemeInfo[] = [];

export const createHighlighter = /* @__PURE__ */ createBundledHighlighter({
  langs: bundledLanguages,
  themes: bundledThemes,
  engine: () => createJavaScriptRegexEngine(),
});

export const {
  codeToHtml,
  codeToHast,
  codeToTokens,
  codeToTokensBase,
  codeToTokensWithThemes,
  getSingletonHighlighter,
  getLastGrammarState,
} = /* @__PURE__ */ createSingletonShorthands(createHighlighter, {
  guessEmbeddedLanguages,
});
