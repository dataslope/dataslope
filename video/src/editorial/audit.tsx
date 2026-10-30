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
  }, [frame, on]);
  return null;
};
