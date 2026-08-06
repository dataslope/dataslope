"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";

interface HeroItem {
  /** languageIcons id. */
  id: string;
  name: string;
}

// The scrolling "Learn … " roster, every language the platform supports.
const HERO_ITEMS: HeroItem[] = [
  { id: "python", name: "Python" },
  { id: "r", name: "R" },
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "php", name: "PHP" },
  { id: "c", name: "C" },
  { id: "cpp", name: "C++" },
  { id: "java", name: "Java" },
  { id: "csharp", name: "C#" },
  { id: "sqlite", name: "SQLite" },
  { id: "postgres", name: "PostgreSQL" },
  { id: "duckdb", name: "DuckDB" },
];

// Icons use only the three primary brand 500s, cycled across the roster.
const BRAND_CYCLE = [
  "var(--ds-blue-500)",
  "var(--ds-green-500)",
  "var(--ds-red-500)",
];

/**
 * The ⚡ 🔓 💯 separating this line's phrases, as images rather than characters.
 *
 * Written as literal emoji, these rendered as whatever glyph the visitor's OS
 * ships — so the line looked materially different on Windows and macOS, and the
 * reviewer preferred the Windows drawing. Windows renders them from Segoe UI
 * Emoji, which is proprietary and cannot be embedded on a site. Microsoft's
 * Fluent Emoji is the same design language open-sourced under MIT, so these are
 * its 3D variants, self-hosted: one drawing, identical on every platform.
 *
 * They live in `public/emoji/` rather than `public/images/`, deliberately —
 * `scripts/build-images.mjs` prunes anything under `public/images` that is not
 * in its generated manifest, and these are third-party assets it knows nothing
 * about. Attribution is in THIRD-PARTY-NOTICES.md.
 *
 * Sized in `em` so they scale with the marquee's responsive font size, and
 * `aria-hidden` because they are punctuation between phrases, not content — the
 * line already reads correctly as "Interactive No sign-up Free".
 */
function MarqueeEmoji({ name }: { name: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`/emoji/${name}.webp`}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className="mx-3 inline-block h-[1.1em] w-auto shrink-0 align-[-0.15em] sm:mx-4"
    />
  );
}

function HeroGlyph({ id, color }: { id: string; color: string }) {
  const Icon: IconType | undefined = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span
      className="inline-flex shrink-0 items-center"
      style={{ color, fontSize: `${factor}em` }}
      aria-hidden="true"
    >
      <Icon size="0.85em" />
    </span>
  );
}

/** One full "Learn 🐍 Python …" segment. The row duplicates it, so
 *  "Learn" recurs as a natural refrain between roster loops. */
function RosterSegment() {
  return (
    <span className="mx-6 inline-flex items-center gap-6">
      <span className="text-[var(--ds-gray-900)] dark:text-white">Learn</span>
      {HERO_ITEMS.map((item, i) => (
        <span key={item.name} className="inline-flex items-center gap-3">
          <HeroGlyph id={item.id} color={BRAND_CYCLE[i % BRAND_CYCLE.length]} />
          <span className="text-[var(--ds-gray-900)] dark:text-white">
            {item.name}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * A marquee row scrolled by a requestAnimationFrame loop writing 2D
 * `translateX` styles, deliberately NOT a CSS `animation`.
 *
 * Why not the shared <Marquee> (CSS keyframes): an actively-animating CSS
 * transform promotes each row to its own compositor layer, and at text-7xl
 * those layers are thousands of pixels wide, clipped only at composite time.
 * Chromium has repeatedly drawn stale tiles of those layers with the clip
 * missing (giant marquee glyphs "bleeding" across the page around the sticky
 * header — see PRs #599/#602, which tried to pin the layer tree down with
 * compositor hints and didn't hold). JS per-frame style writes are not a
 * compositing trigger, so these rows paint inside the clipped wrapper on the
 * main thread and the unclipped pixels never exist in any GPU buffer.
 *
 * The loop advances by wall-clock delta (capped so a background-tab resume
 * doesn't jump), wraps at one segment width for a seamless loop, pauses
 * while the hero is offscreen, and leaves the row static under
 * prefers-reduced-motion.
 */
function JsMarquee({
  children,
  secondsPerLoop,
  reverse = false,
  className = "",
}: {
  children: ReactNode;
  /** Seconds for one full segment length to scroll past. */
  secondsPerLoop: number;
  reverse?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const segmentRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    const segment = segmentRef.current;
    if (!track || !segment) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return; // static row; the roster is still readable
    }

    let raf = 0;
    let last = 0;
    let offset = 0;
    let running = false;
    // Re-read on every wrap; cheap, and it tracks font-load reflows without
    // a ResizeObserver.
    let segmentWidth = segment.offsetWidth || 1;

    const step = (now: number) => {
      const dt = Math.min(now - last, 100); // clamp background-tab gaps
      last = now;
      offset += (segmentWidth / (secondsPerLoop * 1000)) * dt;
      if (offset >= segmentWidth) {
        segmentWidth = segment.offsetWidth || 1;
        offset %= segmentWidth;
      }
      track.style.transform = `translateX(${reverse ? offset - segmentWidth : -offset}px)`;
      raf = requestAnimationFrame(step);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Only animate while the hero is actually on screen.
    const io = new IntersectionObserver(
      (entries) => (entries.some((e) => e.isIntersecting) ? start() : stop()),
      { rootMargin: "64px" },
    );
    io.observe(track);
    return () => {
      io.disconnect();
      stop();
    };
  }, [secondsPerLoop, reverse]);

  // Two copies of the segment give the seamless loop; each segment is wider
  // than the clipped container, so two always cover it. The reverse row is
  // pre-shifted one segment left (see `step`) so it scrolls the other way
  // without ever exposing its trailing edge.
  return (
    <div className={`overflow-hidden ${className}`}>
      <div ref={trackRef} className="flex w-max">
        <span ref={segmentRef} className="flex shrink-0">
          {children}
        </span>
        <span className="flex shrink-0" aria-hidden="true">
          {children}
        </span>
      </div>
    </div>
  );
}

export function HeroMarquee() {
  // [contain:paint] clips this wrapper's painting as a unit, and
  // `will-change-transform` keeps it on one stable layer through the BlurFade
  // entrance hand-off. With the rows now painted (not composited — see
  // JsMarquee), any stale raster is at worst a correctly-clipped copy of
  // this 768px-wide box, never an unclipped row.
  return (
    <div className="relative mx-auto w-full max-w-3xl select-none overflow-hidden py-2 will-change-transform [contain:paint]">
      {/* Both lines share one font-size scale so they read as a matched pair. */}
      {/* Line 1, the language roster, scrolling left. */}
      <JsMarquee
        secondsPerLoop={42}
        className="py-1 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
      >
        <RosterSegment />
      </JsMarquee>

      {/* Line 2, the tagline, scrolling the other way, in blue-gray-100. */}
      <JsMarquee
        secondsPerLoop={30}
        reverse
        className="py-1 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
      >
        <span className="mx-8 inline-flex items-center text-[#CED7DB]">
          Interactive
          <MarqueeEmoji name="interactive" />
          No sign-up
          <MarqueeEmoji name="no-signup" />
          Free
          <MarqueeEmoji name="free" />
        </span>
      </JsMarquee>

      {/* Soft edge fades so the scroll dissolves into the page background
          (kept in sync with HomeClient's bg: white / #121212). */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent dark:from-[#121212]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent dark:from-[#121212]" />
    </div>
  );
}
