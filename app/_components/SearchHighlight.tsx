"use client";

/**
 * Paints the searched words on a lesson a reader arrived at from the search
 * dialog, browser-find style.
 *
 * `/api/search` puts the sanitised query tokens on every result URL as
 * `?hl=…` (see lib/search/ranking.ts). This component reads them back and
 * marks every word starting with one of those tokens via the CSS Custom
 * Highlight API: ranges in `CSS.highlights`, painted by the
 * `::highlight(ds-search-match)` rule in docs.css. No DOM mutation, so
 * CodeMirror, KaTeX and hydration are never disturbed; browsers without the
 * API (or visitors who arrived without `?hl=`) get exactly the page they had
 * before.
 *
 * Prefix matching (not whole-word) is deliberate: FTS5 porter-stems its
 * index and prefix-matches the final token, so the query "reason" may have
 * matched the page's "reasons"; highlighting only exact words would light up
 * nothing on the very page the API said matches.
 *
 * Late-mounting components (`<MultipleChoice>` renders its markdown client
 * side) add their text after the first pass, so mutations re-trigger the
 * pass during the same settle window HashScrollFix uses; after that the
 * highlights stay put until navigation.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const HIGHLIGHT_NAME = "ds-search-match";
const SETTLE_MS = 4000;
const REAPPLY_DEBOUNCE_MS = 150;
/** Bounds one pass: enough for any real query, cheap even on huge lessons. */
const MAX_RANGES = 1500;
const WORD_CHAR = /[\p{L}\p{N}_]/u;

function highlightTerms(): string[] {
  const hl = new URLSearchParams(window.location.search).get("hl");
  if (!hl) return [];
  return [...new Set(hl.toLowerCase().split(/\s+/))]
    .filter((t) => t.length >= 2) // single letters over-highlight ("r", "x")
    .slice(0, 12);
}

function collectRanges(root: Node, terms: string[]): Range[] {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue;
    if (!text || !text.trim()) continue;
    const lower = text.toLowerCase();
    for (const term of terms) {
      for (
        let i = lower.indexOf(term);
        i !== -1;
        i = lower.indexOf(term, i + term.length)
      ) {
        // Word-start matches only: "bar" lights up "bars", not "sidebar".
        if (i > 0 && WORD_CHAR.test(lower[i - 1])) continue;
        const range = new Range();
        range.setStart(node, i);
        range.setEnd(node, i + term.length);
        ranges.push(range);
        if (ranges.length >= MAX_RANGES) return ranges;
      }
    }
  }
  return ranges;
}

export default function SearchHighlight() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
    const terms = highlightTerms();
    if (terms.length === 0) return;

    const apply = () => {
      const root =
        document.querySelector("article") ??
        document.querySelector("main") ??
        document.body;
      CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...collectRanges(root, terms)));
    };

    apply();

    // Re-apply while late-mounting components are still adding text.
    let debounce: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(apply, REAPPLY_DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const settleTimer = window.setTimeout(() => {
      observer.disconnect();
      window.clearTimeout(debounce);
      apply();
    }, SETTLE_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(debounce);
      window.clearTimeout(settleTimer);
      CSS.highlights.delete(HIGHLIGHT_NAME);
    };
  }, [pathname]);

  return null;
}
