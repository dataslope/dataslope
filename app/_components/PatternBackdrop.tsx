"use client";

import type { ReactNode } from "react";
import type { PatternDefinition } from "tabbied";
import { TabbiedPattern } from "tabbied/react";

/**
 * A subtle Tabbied pattern rendered behind a block of content.
 *
 * `TabbiedPattern` fills its containing block, so the pattern layer is just
 * an absolutely-positioned box: no measuring, no resize observer. The
 * `insetTop` / `insetBottom` props pull that box in vertically so the
 * pattern starts a little after the content begins and stops a little
 * before it ends, which reads as a backdrop the content sits on rather than
 * a band it happens to overlap.
 *
 * Colour follows `FooterPattern`: the palette's first entry is the
 * background and is left transparent so the page colour shows through, and
 * the inks are low-alpha mid-grey and brand blue, light enough to read as
 * texture on white and to stay visible on the dark theme's #121212 without
 * glaring.
 *
 * Motion is opt-in via `redrawInterval`. Tabbied already skips ticks under
 * `prefers-reduced-motion`, while the tab is hidden, and while the element
 * is outside the viewport, so a backdrop nobody has scrolled to costs
 * nothing.
 *
 * The pattern layer is `aria-hidden` and non-interactive; only the children
 * take pointer events.
 */
export function PatternBackdrop({
  pattern,
  insetTop = 0,
  insetBottom = 0,
  insetX = 0,
  cellSize = 48,
  redrawInterval,
  maskEdges = true,
  className = "",
  children,
}: {
  pattern: PatternDefinition;
  /** Distance from the content's top edge to where the pattern starts. */
  insetTop?: number | string;
  /** Distance from the content's bottom edge to where the pattern ends.
   *  Negative values push the pattern past the content, which is how you
   *  get it to emerge from underneath an opaque card. */
  insetBottom?: number | string;
  /** Horizontal inset; negative widens the pattern past the content. */
  insetX?: number | string;
  cellSize?: number;
  redrawInterval?: number;
  /** Fade the pattern out at the left and right edges (default true). */
  maskEdges?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute select-none opacity-40 dark:opacity-35 ${
          maskEdges
            ? "[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
            : ""
        }`}
        style={{ top: insetTop, bottom: insetBottom, left: insetX, right: insetX }}
      >
        <TabbiedPattern
          pattern={pattern}
          palette={[
            "transparent",
            "rgba(128,128,128,0.24)",
            "rgba(20,140,255,0.18)",
          ]}
          cellSize={cellSize}
          redrawInterval={redrawInterval}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
