"use client";

import { TabbiedPattern } from "tabbied/react";
import { fadedbar } from "tabbied/patterns";
import { CutoutImage } from "@/app/_components/CutoutImage";

/**
 * Full-bleed decorative band between the `/playground` title block and the
 * language chooser: a `fadedbar` Tabbied pattern with the playground
 * illustration over it. Palette follows `FooterPattern` (first entry
 * transparent so the page color shows through; yellow gets a higher alpha
 * because it washes out at the others'). Redraw is deliberately faster than
 * the footer's (2.5s vs 18s) — Tabbied skips ticks under reduced-motion,
 * hidden tabs, and off-screen elements, so it costs nothing when unseen.
 * The artwork is animated (static under reduced motion; see `CutoutImage`).
 * `aria-hidden` throughout: pure decoration.
 */

const ART_SLUG = "playground-hero-cutout";

export function PlaygroundHero() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative left-1/2 mt-6 h-[300px] w-screen -translate-x-1/2 select-none sm:mt-8"
    >
      {/* Lower 260px of the 300px band; the 40px left at the top is the room
          the artwork overhangs into. */}
      <div className="absolute inset-x-0 bottom-0 h-[260px] opacity-60 [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] dark:opacity-50">
        <TabbiedPattern
          pattern={fadedbar}
          palette={[
            "transparent",
            "rgba(128,128,128,0.28)",
            "rgba(20,140,255,0.20)",
            "rgba(255,221,108,0.34)",
            "rgba(32,198,33,0.20)",
          ]}
          cellSize={48}
          height={260}
          redrawInterval={2_500}
        />
      </div>

      {/* The artwork is taller than the pattern so its top breaks the band's
          upper edge; the percentage height keeps the overhang proportional at
          every breakpoint. */}
      <div className="absolute inset-x-0 bottom-0 flex h-[260px] items-end justify-center">
        <CutoutImage
          slug={ART_SLUG}
          decoding="async"
          className="h-[115%] w-auto max-w-[min(100%,52rem)] object-contain"
        />
      </div>
    </div>
  );
}
