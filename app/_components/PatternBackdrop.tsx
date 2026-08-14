"use client";

import type { CSSProperties, ReactNode } from "react";
import type { PatternDefinition } from "tabbied";
import { TabbiedPattern } from "tabbied/react";

/**
 * A subtle Tabbied pattern rendered behind a block of content: an
 * absolutely-positioned, aria-hidden, non-interactive layer inset by
 * `insetTop`/`insetBottom`.
 *
 * `fullWidth` breaks the layer out to viewport width (`left-1/2` /
 * `w-screen` / `-translate-x-1/2`): the container must itself be
 * page-centred, and the 100vw box overhangs by the scrollbar width, so the
 * page needs an `overflow-x-clip` ancestor that is NOT the width-constrained
 * wrapper. `fadeBottom` is masked on an inner wrapper; folding it into the
 * horizontal mask would need `mask-composite: intersect`. The palette's
 * first entry is a transparent background so the page color shows through.
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
  /** Ink colors, in palette order after the transparent background. */
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
