"use client";

/**
 * Client-only static syntax highlighter for the small, read-only source
 * panels in <LivePreview> / <ReactPreview> (see PreviewCode.tsx).
 *
 * Deliberately reuses the CodeMirror language packages the app already ships
 * to the browser (the editable code blocks load them via `loadLanguage`):
 * we pull the Lezer parser out of the LanguageSupport, parse the snippet, and
 * walk the tree with `@lezer/highlight`'s `classHighlighter` to emit `tok-*`
 * spans. `livePreview.module.css` colours those classes.
 *
 * Why not Shiki: MDX highlighting runs Shiki at request time INSIDE the
 * Cloudflare Worker, and adding a client Shiki instance (core + grammars)
 * would grow the client bundle. The Lezer parsers are already downloaded for
 * the editors, and every import here is dynamic + effect-only, so nothing
 * lands in the SSR/Worker bundle: these panels highlight purely on the client
 * after mount, with the plain source as the first-paint fallback.
 */

import { highlightTree, classHighlighter } from "@lezer/highlight";
import type { Parser } from "@lezer/common";
import { loadLanguage } from "../cmExtensions";

export interface HighlightToken {
  text: string;
  /** Space-separated `tok-*` class list, or null for un-tokenised text. */
  className: string | null;
}

/** Language-chip label (as authored in MDX) → the `loadLanguage` mode used by
 *  the editors. Returns null for labels we don't have a parser for, callers
 *  then fall back to plain text. */
const MODE_BY_LANG: Record<string, string> = {
  html: "htmlmixed",
  css: "css",
  tsx: "tsx",
  jsx: "tsx",
  react: "tsx",
  js: "javascript",
  javascript: "javascript",
  ts: "text/typescript",
  typescript: "text/typescript",
};

function modeForLang(lang: string): string | null {
  return MODE_BY_LANG[lang.trim().toLowerCase()] ?? null;
}

/** A LanguageSupport (what `loadLanguage` resolves to for these modes) carries
 *  its Lezer parser at `.language.parser`. */
function parserOf(ext: unknown): Parser | null {
  const language = (ext as { language?: { parser?: Parser } } | null)?.language;
  return language?.parser ?? null;
}

/**
 * Tokenise `source` for the given language-chip label. Resolves null when the
 * label has no parser (so the caller shows plain text) or on a flaky
 * dynamic-import failure — never throws, so a cosmetic highlight can't break
 * the panel.
 */
export async function highlightSource(
  source: string,
  lang: string,
): Promise<HighlightToken[] | null> {
  const mode = modeForLang(lang);
  if (!mode) return null;
  const parser = parserOf(await loadLanguage(mode));
  if (!parser) return null;

  const tree = parser.parse(source);
  const tokens: HighlightToken[] = [];
  let pos = 0;
  highlightTree(tree, classHighlighter, (from, to, classes) => {
    // Gap between the previous token and this one is plain text.
    if (from > pos) tokens.push({ text: source.slice(pos, from), className: null });
    tokens.push({ text: source.slice(from, to), className: classes });
    pos = to;
  });
  if (pos < source.length) {
    tokens.push({ text: source.slice(pos), className: null });
  }
  return tokens;
}
