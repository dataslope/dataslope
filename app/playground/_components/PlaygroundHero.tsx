"use client";

import { TabbiedPattern } from "tabbied/react";
import { fadedbar } from "tabbied/patterns";
import imageManifest from "@/lib/generated/images";

/**
 * The full-bleed decorative band between the `/playground` title block and the
 * language chooser: a `fadedbar` Tabbied pattern with the playground
 * illustration (a marmot, a fox, and a penguin on a slide, a seesaw, and a
 * climbing block) sitting over it.
 *
 * Full-bleed rather than inside `<main>`'s `max-w-6xl`, via the standard
 * left-1/2 / -translate-x-1/2 / w-screen escape, so the pattern runs edge to
 * edge while the artwork stays centered on the page's own axis.
 *
 * Colour follows `FooterPattern`: theme-neutral low-alpha inks, with the
 * palette's first entry left transparent so the page colour shows through.
 * Grey and blue are joined by brand yellow and green, which is the full
 * four-colour brand set the illustrations use — the band sits directly under
 * the playground artwork, so the two now share a palette. Yellow carries a
 * higher alpha than the others because it is the lightest of the four and
 * washes out against white at the alpha the rest use.
 *
 * Motion is deliberately faster here than in the footer (2.5s against 18s).
 * The footer band is ambient texture a reader passes over; this one is the
 * page's hero, where a visible reseed reads as "this thing is alive" rather
 * than as a distraction. The inks are faint enough that a redraw registers
 * peripherally instead of pulling focus off the language grid. Tabbied still
 * skips ticks under `prefers-reduced-motion`, while the tab is hidden, and
 * while the element is outside the viewport, so the shorter interval costs
 * nothing when nobody is looking.
 *
 * The band is masked to fade out at both ends so it emerges from the page
 * rather than starting and stopping on hard edges.
 *
 * `aria-hidden` throughout: the pattern and the illustration are decoration,
 * and the heading above them already says what the page is.
 */

const ART_SLUG = "playground-hero-cutout";

export function PlaygroundHero() {
  const art = imageManifest[ART_SLUG];
  const artSrc = art
    ? `/images/${ART_SLUG}.${art.formats[art.formats.length - 1]}`
    : null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative left-1/2 mt-6 h-[300px] w-screen -translate-x-1/2 select-none sm:mt-8"
    >
      {/* The pattern occupies the lower 260px of the 300px band, which is the
          nudge down: the 40px it leaves at the top is the room the artwork
          overhangs into. */}
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

      {/* The artwork sits on the pattern's baseline and is taller than the
          pattern, so its top breaks the band's upper edge rather than sitting
          inside it — the same "resting on the edge" treatment the pricing
          cards give their marmots. A percentage height keeps the overhang
          proportional at every breakpoint. It is centered on the page axis
          rather than the viewport's, so it stays aligned with the heading. */}
      <div className="absolute inset-x-0 bottom-0 flex h-[260px] items-end justify-center">
        {artSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artSrc}
            width={art!.width}
            height={art!.height}
            alt=""
            decoding="async"
            className="h-[115%] w-auto max-w-[min(100%,52rem)] object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}
