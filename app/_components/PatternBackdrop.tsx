"use client";

import type { CSSProperties, ReactNode } from "react";
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
 * `fullWidth` breaks the pattern layer out of the container and runs it edge
 * to edge, via the same `left-1/2` / `w-screen` / `-translate-x-1/2` escape
 * `PlaygroundHero` uses. It centres on the container's axis, so the container
 * must itself be centred in the page (every current caller is `mx-auto`). The
 * 100vw box overhangs by the scrollbar's width, so the page needs an
 * `overflow-x-clip` ancestor that is *not* the width-constrained wrapper.
 *
 * `fadeBottom` fades the pattern out over that many pixels at its lower edge,
 * so a band that runs past its content dissolves into the page instead of
 * ending on a hard line. It is applied on an inner wrapper rather than
 * combined into the horizontal mask: two mask layers would need
 * `mask-composite: intersect`, and nesting gets the same result with no
 * compositing-support caveat.
 *
 * Colour follows `FooterPattern`: the palette's first entry is the
 * background and is left transparent so the page colour shows through, and
 * the inks are low-alpha, light enough to read as texture on white and to
 * stay visible on the dark theme's #121212 without glaring. `inks` overrides
 * the default mid-grey + brand blue; `fadedbar` and the other presets accept
 * up to five inks and alias unused slots back into the active ones.
 *
 * Motion is opt-in via `redrawInterval`. Tabbied already skips ticks under
 * `prefers-reduced-motion`, while the tab is hidden, and while the element
 * is outside the viewport, so a backdrop nobody has scrolled to costs
 * nothing.
 *
 * The pattern layer is `aria-hidden` and non-interactive; only the children
 * take pointer events.
 */

/** Mid-grey + brand blue, the house pair every band started with. */
const DEFAULT_INKS = ["rgba(128,128,128,0.24)", "rgba(20,140,255,0.18)"];

export function PatternBackdrop({
  pattern,
  insetTop = 0,
  insetBottom = 0,
  insetX = 0,
  fullWidth = false,
  fadeBottom = 0,
  inks = DEFAULT_INKS,
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
  /** Horizontal inset; negative widens the pattern past the content.
   *  Ignored when `fullWidth` is set. */
  insetX?: number | string;
  /** Run the pattern the full width of the viewport instead of stopping at
   *  the container's edges. */
  fullWidth?: boolean;
  /** Length in px of a fade-out at the pattern's bottom edge. 0 disables it. */
  fadeBottom?: number;
  /** Ink colours, in palette order after the transparent background. */
  inks?: string[];
  cellSize?: number;
  redrawInterval?: number;
  /** Fade the pattern out at the left and right edges (default true). */
  maskEdges?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const fade: CSSProperties | undefined = fadeBottom
    ? {
        maskImage: `linear-gradient(to bottom, #000 calc(100% - ${fadeBottom}px), transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to bottom, #000 calc(100% - ${fadeBottom}px), transparent 100%)`,
      }
    : undefined;

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute select-none opacity-40 dark:opacity-35 ${
          fullWidth ? "left-1/2 w-screen -translate-x-1/2" : ""
        } ${
          maskEdges
            ? "[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
            : ""
        }`}
        style={
          fullWidth
            ? { top: insetTop, bottom: insetBottom }
            : {
                top: insetTop,
                bottom: insetBottom,
                left: insetX,
                right: insetX,
              }
        }
      >
        <div className="size-full" style={fade}>
          <TabbiedPattern
            pattern={pattern}
            palette={["transparent", ...inks]}
            cellSize={cellSize}
            redrawInterval={redrawInterval}
          />
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
