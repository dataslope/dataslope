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
 *
 * Escape dismisses them, the way it leaves a browser's find bar. Highlights
 * are a *view* of a search, not part of the lesson, and a reader who has found
 * their answer is otherwise stuck with a yellow-flecked page until they
 * navigate away: the API paints every prefix match, so a common word can light
 * up a page dozens of times. Dismissing also drops `?hl=` from the URL, so a
 * reload, a copied link or a step back through history does not repaint what
 * was just dismissed.
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

/** Whether Escape belongs to something else on the page: a field being typed
 *  in, an editor, or an open dialog (the search dialog itself closes on it). */
function escapeIsClaimed(): boolean {
  const el = document.activeElement;
  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  ) {
    return true;
  }
  return document.querySelector('[role="dialog"]') !== null;
}

export default function SearchHighlight() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
    const terms = highlightTerms();
    if (terms.length === 0) return;

    let dismissed = false;

    const apply = () => {
      if (dismissed) return;
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

    const stop = () => {
      dismissed = true;
      observer.disconnect();
      window.clearTimeout(debounce);
      window.clearTimeout(settleTimer);
      CSS.highlights.delete(HIGHLIGHT_NAME);
    };

    const onKey = (e: KeyboardEvent) => {
      // `defaultPrevented` first: a component that has already claimed this
      // keypress (a closing overlay, a CodeMirror keymap) gets to keep it.
      if (e.key !== "Escape" || e.defaultPrevented || dismissed) return;
      if (escapeIsClaimed()) return;
      stop();
      // Not `router.replace`: this is a purely local dismissal, and going
      // through the router would re-run the route's data fetching to change a
      // query parameter nothing on the server reads.
      const url = new URL(window.location.href);
      url.searchParams.delete("hl");
      window.history.replaceState(window.history.state, "", url);
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      stop();
    };
  }, [pathname]);

  return null;
}
