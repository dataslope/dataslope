"use client";

import { TabbiedPattern } from "tabbied/react";
import { glazing } from "tabbied/patterns";

/**
 * Faint decorative band above the footer content. Colors are theme-neutral
 * (low-alpha inks over a transparent background) so no theme needs threading
 * in. Masked at both ends: a long fade-in at the top (the deepest on the
 * site — other bands' fades stay under it) and a shorter fade-out at the
 * bottom. Tabbied skips redraw ticks under prefers-reduced-motion, hidden
 * tabs, and offscreen elements.
 */
/** Fade-in runs 0 → 55%, fade-out covers the last 64px. One `mask-image`
 *  string because the fade-out needs a `calc()`. */
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
