"use client";

import { TabbiedPattern } from "tabbied/react";
import { mixtape } from "tabbied/patterns";

/**
 * The faint decorative band that sits directly above the footer content.
 *
 * `mixtape` is the reviewer's pick, replacing the `bothways` crossings this
 * started as.
 *
 * Colours are theme-neutral on purpose. The palette's first entry is the
 * background, left transparent so the page colour shows through, and the inks
 * are low-alpha mid-grey and brand blue — light enough to read as texture on
 * white, and to stay visible without glaring on the dark theme's #121212.
 * Passing theme-specific colours would mean threading the current theme in
 * here and re-rendering the doodle on every toggle.
 *
 * The band is masked to fade out at the top, so it emerges from the page
 * rather than starting on a hard edge.
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
export function FooterPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none w-full select-none opacity-60 [mask-image:linear-gradient(to_bottom,transparent,black_55%)] dark:opacity-50"
    >
      <TabbiedPattern
        pattern={mixtape}
        palette={[
          "transparent",
          "rgba(128,128,128,0.30)",
          "rgba(20,140,255,0.22)",
        ]}
        cellSize={56}
        height={220}
        redrawInterval={18_000}
      />
    </div>
  );
}
