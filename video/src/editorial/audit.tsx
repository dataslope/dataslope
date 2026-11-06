import type React from "react";
import { useLayoutEffect } from "react";
import { getInputProps, useCurrentFrame } from "remotion";

/**
 * Checks the page as drawn, for what the source cannot show. Off unless the
 * render's input props carry `audit: true`, which `npm run check:frames`
 * passes; the Studio and a normal render never pay for it.
 *
 * - Tabular figures over a hyphen. Inter's tabular feature sets a hyphen a
 *   digit wide, so TABULAR over "P-101" reads "P - 101".
 *   `src/editorial/tabular.test.ts` catches it in literal text; this catches
 *   it in text that arrives as a value (a sheet cell, a list item), which is
 *   where the Data Analyst review found it twice. Reported as `[tabular]`.
 * - Words set too close to the word before them. Words laid out as separate
 *   elements (a flex row, a label beside a number) are spaced by margins,
 *   not by a space character, and a highlight drawn behind a word reaches
 *   past it on both sides. Either can leave a gap narrower than a space,
 *   which reads as a missing space: a highlight 0.1em wider than its number
 *   put "of" and "2,097,152" 4px apart in ListVsSet. Every pair of
 *   neighbours on one line is measured, a highlight counting as part of its
 *   word, and a gap under CROWDED (in the smaller word's size) is reported
 *   as `[crowded]`. Words that touch exactly, like the tokens of one line of
 *   code, are meant to.
 */
export const PageAudit: React.FC = () => {
  const frame = useCurrentFrame();
  const on = (getInputProps() as { audit?: boolean }).audit === true;
  useLayoutEffect(() => {
    if (!on) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      if (!/[\p{L}\p{N}]-[\p{L}\p{N}]/u.test(text)) continue;
      const el = node.parentElement;
      if (!el) continue;
      const style = getComputedStyle(el);
      // A mono face has one width for every glyph already.
      if (!style.fontVariantNumeric.includes("tabular-nums") || /mono/i.test(style.fontFamily)) continue;
      console.warn(`[tabular] "${text.trim()}" sets its hyphen a digit wide; put TABULAR on the number alone`);
    }
    for (const c of crowded()) console.warn(`[crowded] ${c} at frame ${frame}`);
  }, [frame, on]);
  return null;
};

/** The narrowest gap two neighbouring words may keep, in ems of the smaller
 *  one: a space is about 0.25em in Inter and in Source Serif. */
export const CROWDED = 0.15;

/** A run of text on one line, or a highlight drawn behind a word, which
 *  counts as part of that word. */
type Piece = { r: DOMRect; owner: Element; text: string; em: number; highlight: boolean; mono: boolean };

function crowded(): string[] {
  // Settled words only: anything still fading (a crossfade between two
  // slides overlaps words that never share the page) is left for a later
  // frame, where it is either gone or fully drawn.
  const seen = new Map<Element, number>();
  const alpha = (el: Element): number => {
    const known = seen.get(el);
    if (known !== undefined) return known;
    const st = getComputedStyle(el);
    const parent = el.parentElement;
    const a = st.display === "none" || st.visibility === "hidden" ? 0 : Number(st.opacity) * (parent ? alpha(parent) : 1);
    seen.set(el, a);
    return a;
  };
  const shown = (el: Element) => alpha(el) > 0.9;

  const pieces: Piece[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    const first = text.search(/\S/);
    const el = node.parentElement;
    if (first < 0 || !el || !shown(el)) continue;
    const range = document.createRange();
    // The words alone: a space at either end belongs to neither neighbour.
    range.setStart(node, first);
    range.setEnd(node, text.trimEnd().length);
    for (const r of range.getClientRects()) {
      if (r.width < 1 || r.height < 1) continue;
      pieces.push({ r, owner: el, text: text.trim(), em: r.height / 1.2, highlight: false, mono: /mono/i.test(getComputedStyle(el).fontFamily) });
    }
  }

  // A highlight: an empty, absolutely placed box with a fill, hugging the
  // word that is its parent.
  for (const el of document.body.querySelectorAll("*")) {
    if (el.childElementCount || (el.textContent ?? "").trim() || !el.parentElement) continue;
    const st = getComputedStyle(el);
    // Any fill with some alpha: HIGHLIGHT is a color-mix(), which computes
    // to color(srgb … / 0.8), not rgba().
    if (st.position !== "absolute" || /^(transparent|rgba\(0, 0, 0, 0\))$|[,/]\s*0\)$/.test(st.backgroundColor)) continue;
    const word = el.parentElement;
    const text = (word.textContent ?? "").trim();
    if (!text || !shown(el)) continue;
    const r = el.getBoundingClientRect();
    const w = word.getBoundingClientRect();
    // A band behind the word, not a strike or an underline through it.
    if (r.width < 1 || r.height < 0.4 * w.height || r.height > w.height * 1.5) continue;
    if (r.left < w.left - w.height || r.right > w.right + w.height) continue;
    pieces.push({ r, owner: word, text, em: w.height / 1.2, highlight: true, mono: /mono/i.test(getComputedStyle(word).fontFamily) });
  }

  const related = (a: Element, b: Element) => a === b || a.contains(b) || b.contains(a);
  const out: string[] = [];
  for (const a of pieces) {
    let best: { b: Piece; gap: number } | null = null;
    for (const b of pieces) {
      if (related(a.owner, b.owner) || (a.highlight && b.highlight)) continue;
      // On one line, and to the right of a.
      const overlap = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (overlap < 0.6 * Math.min(a.r.height, b.r.height)) continue;
      if (b.r.right <= a.r.right || b.r.left <= a.r.left) continue;
      const gap = b.r.left - a.r.right;
      // Further in than half a word is another layer, not a neighbour.
      if (gap < -0.5 * Math.min(a.em, b.em)) continue;
      if (!best || gap < best.gap) best = { b, gap };
    }
    if (!best) continue;
    const { b, gap } = best;
    const em = Math.min(a.em, b.em);
    // Meant to touch: punctuation that closes onto the word before it or
    // opens onto the word after (a highlighter mark may run under it), the
    // tokens of one line of code, and characters set one by one.
    if (/^[,.;:!?)\]}%…]/.test(b.text) || /[([{]$/.test(a.text)) continue;
    if (a.mono && b.mono) continue;
    if ([...a.text].length === 1 && [...b.text].length === 1) continue;
    // Exactly touching is meant (tokens of one line of code); a highlight
    // has no such excuse.
    // (Within a pixel and a half: "250" and "px" set as two spans.)
    if (!a.highlight && !b.highlight && gap < 1.5) continue;
    if (gap >= CROWDED * em) continue;
    const name = (p: Piece, end: boolean) => {
      const t = end ? p.text.slice(-24) : p.text.slice(0, 24);
      return `"${t}"${p.highlight ? " (its highlight)" : ""}`;
    };
    out.push(`${name(a, true)} and ${name(b, false)} are ${gap.toFixed(1)}px apart (${(gap / em).toFixed(2)}em)`);
  }
  return out;
}
