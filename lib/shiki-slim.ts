/**
 * Slim stand-in for the `shiki` package, wired in via the resolve alias in
 * next.config.ts. Dynamic-mode docs compile MDX at request time in the
 * Worker, and the full shiki bundle statically references every grammar
 * (~1.3 MiB gzipped against the Worker's 10 MiB ceiling), so this exposes
 * the same runtime surface with the registry restricted to what content
 * actually fences. A language outside the list renders unhighlighted
 * (Fumadocs skips missing grammars); fence a new language in content/, add
 * it here. ```mermaid``` fences never reach Shiki. Build-time highlighting
 * resolves the REAL shiki package — the alias applies only to the Next.js
 * bundle.
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
