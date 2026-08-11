"use client";

import { TabbiedPattern } from "tabbied/react";
import { glazing } from "tabbied/patterns";

/**
 * The faint decorative band that sits directly above the footer content.
 *
 * `glazing` is the reviewer's pick, replacing the `mixtape` bars it ran with
 * before (and the `bothways` crossings this started as).
 *
 * Colors are theme-neutral on purpose. The palette's first entry is the
 * background, left transparent so the page color shows through, and the inks
 * are low-alpha mid-grey and brand blue — light enough to read as texture on
 * white, and to stay visible without glaring on the dark theme's #121212.
 * Passing theme-specific colors would mean threading the current theme in
 * here and re-rendering the doodle on every toggle.
 *
 * The band is masked at both ends: a long fade-in at the top so it emerges
 * from the page rather than starting on a hard edge, and a shorter fade-out
 * at the bottom so it dissolves into the footer instead of stopping dead
 * against the links. The two are deliberately unequal — the top edge is the
 * one a reader scrolls into, so it gets the gentler ramp, while the bottom
 * only needs enough to kill the hard line. This fade-in is the deepest on the
 * site, and the other bands' fade-outs (see `PatternBackdrop`) stay under it.
 *
 * Motion is handled by the library: `redrawInterval` reseeds the pattern
 * periodically, and Tabbied already skips ticks under
 * `prefers-reduced-motion`, while the tab is hidden, and while the element is
 * outside the viewport — so a footer nobody has scrolled to costs nothing. 18
 * seconds is slow enough that the change reads as ambient rather than as
 * something demanding attention; a visitor reading the footer links will
 * typically see one redraw, not a flicker.
 *
 * `decorative` defaults to true, so the wrapper is `aria-hidden`.
 */
/** Band height, and the two mask ramps measured against it: the fade-in runs
 *  0 → 55% (143px) and the fade-out covers the last 64px. Written as a single
 *  `mask-image` rather than Tailwind arbitrary values because the fade-out
 *  needs a `calc()` the utility syntax renders awkwardly. */
const HEIGHT = 260;
const FADE_OUT_PX = 64;
const MASK =
  "linear-gradient(to bottom, transparent 0, #000 55%, " +
  `#000 calc(100% - ${FADE_OUT_PX}px), transparent 100%)`;

export function FooterPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none w-full select-none opacity-60 dark:opacity-50"
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    >
      <TabbiedPattern
        pattern={glazing}
        palette={[
          "transparent",
          "rgba(128,128,128,0.30)",
          "rgba(20,140,255,0.22)",
        ]}
        cellSize={56}
        height={HEIGHT}
        redrawInterval={18_000}
      />
    </div>
  );
}
