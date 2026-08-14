"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import imageManifest from "@/lib/generated/images";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";

/** Playground illustration over the facade's CTA (same cut-out as the
 *  /playground hero). `null` when the slug is missing renders nothing. */
const PLAYGROUND_ART_SLUG = "playground-hero-cutout";
const playgroundArt = (() => {
  const entry = imageManifest[PLAYGROUND_ART_SLUG];
  if (!entry) return null;
  return {
    src: `/images/${PLAYGROUND_ART_SLUG}.${entry.formats[entry.formats.length - 1]}`,
    width: entry.width,
    height: entry.height,
  };
})();

/**
 * Showcase embed of the real playground in a same-origin <iframe> — the
 * playground takes over the host document on mount, and the iframe isolates
 * that from the marketing page. It is a click-to-activate facade: booting a
 * WASM engine costs hundreds of MB, so the real route only loads after a
 * click, and a launched playground far offscreen for a while is unloaded
 * again (tabs/workspace persist in localStorage and OPFS).
 */

/** How far past the viewport the live playground may sit before it counts as
 *  "away", so flicking past the showcase doesn't arm the unload timer. */
const SUSPEND_MARGIN_PX = 600;
/** How long the live playground must stay away before it is unloaded. */
const SUSPEND_AFTER_MS = 30_000;

function FacadeGlyph({ id }: { id: string }) {
  const Icon = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span className="inline-flex shrink-0 items-center" aria-hidden="true">
      <Icon size={Math.round(18 * factor)} />
    </span>
  );
}

/** Mock playground window shown before launch. The outer div carries the
 *  click handler; the ShimmerButton inside is the real keyboard-focusable
 *  <button> (nesting it inside a <button> root would be invalid HTML). */
function PlaygroundFacade({
  playgroundId,
  label,
  suspended,
  onLaunch,
}: {
  playgroundId: string;
  label: string;
  suspended: boolean;
  onLaunch: () => void;
}) {
  // Deterministic skeleton "code line" widths (percent).
  const lineWidths = [42, 68, 55, 30, 74, 48, 22, 61];
  return (
    <div
      onClick={onLaunch}
      className="group flex size-full cursor-pointer flex-col text-left transition-colors duration-200 hover:bg-[var(--ds-blue-50)]/40 dark:hover:bg-[var(--ds-blue-500)]/[0.04]"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--ds-gray-200)] bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[var(--ds-red)]" />
          <span className="size-2.5 rounded-full bg-[var(--ds-yellow)]" />
          <span className="size-2.5 rounded-full bg-[var(--ds-green)]" />
        </span>
        <span className="ml-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--ds-gray-500)] transition-colors group-hover:text-[var(--ds-blue-600)] dark:text-[var(--ds-gray-400)] dark:group-hover:text-[var(--ds-blue-400)]">
          <FacadeGlyph id={playgroundId} />
          {label} playground
        </span>
      </div>

      {/* Code-line skeleton behind the launch CTA, animated so the mock
          reads as a live editor. */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0 flex flex-col gap-3 overflow-hidden p-6 opacity-70 transition-opacity duration-200 group-hover:opacity-100 [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]"
          aria-hidden="true"
        >
          {lineWidths.map((w, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-5 text-right text-xs tabular-nums text-[var(--ds-gray-300)] transition-colors group-hover:text-[var(--ds-blue-600)] dark:text-white/20 dark:group-hover:text-[var(--ds-blue-500)]">
                {i + 1}
              </span>
              <span
                className="h-3 animate-pulse rounded bg-[var(--ds-gray-200)] transition-colors group-hover:bg-[var(--ds-blue-200)] motion-reduce:animate-none dark:bg-white/10 dark:group-hover:bg-[var(--ds-blue-500)]/25"
                style={{ width: `${w}%`, animationDelay: `${i * 180}ms` }}
              />
              {i === lineWidths.length - 1 && (
                <span className="animate-blink-cursor -ml-2.5 h-3 w-1.5 rounded-sm bg-[var(--ds-gray-400)] transition-colors group-hover:bg-[var(--ds-blue-500)] dark:bg-white/40 dark:group-hover:bg-[var(--ds-blue-400)]" />
              )}
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          {/* Artwork + CTA centered as one group; the negative margin pulls
              the button onto the illustration (the cut-out's transparent
              margin would otherwise leave a gap). Rests at 80% opacity so
              the CTA stays loudest. */}
          {playgroundArt && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playgroundArt.src}
              width={playgroundArt.width}
              height={playgroundArt.height}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="pointer-events-none -mb-7 hidden w-[min(72%,320px)] select-none object-contain opacity-80 transition-opacity duration-200 group-hover:opacity-100 sm:block"
            />
          )}
          {/* Fill tracks the page surface (--color-fd-background) so it
              reads as part of the page in both themes. */}
          <ShimmerButton
            background="var(--color-fd-background)"
            shimmerColor="var(--ds-blue-500)"
            shimmerSize="0.15em"
            className="gap-2.5 border-[color:var(--ds-gray-300)] px-6 py-3 text-sm font-semibold text-[var(--ds-gray-900)] shadow-sm transition-colors group-hover:border-[var(--ds-blue-600)] group-hover:text-[var(--ds-blue-700)] dark:border-white/15 dark:text-white dark:group-hover:border-[var(--ds-blue-400)] dark:group-hover:text-[var(--ds-blue-400)]"
          >
            <Play size={16} aria-hidden="true" />
            {/* Short label on phones, full label from `sm` up. */}
            <span className="sm:hidden">Preview playground</span>
            <span className="hidden sm:inline">
              Preview the {label} playground
            </span>
          </ShimmerButton>
          {suspended && (
            <span className="mt-3 text-center text-xs text-[var(--ds-gray-500)] transition-colors group-hover:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-400)] dark:group-hover:text-[var(--ds-blue-400)]">
              Paused to free memory, relaunch to pick up where you left off.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmbeddedPlayground({
  playgroundId,
  label,
}: {
  playgroundId: string;
  /** Human-readable language name for the facade (e.g. "PostgreSQL"). */
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  // Set when a live playground was unloaded after drifting offscreen, so the
  // facade can explain why it needs another click.
  const [suspended, setSuspended] = useState(false);

  // Unload a live playground once far offscreen for a while — the WASM heap
  // is the page's biggest memory consumer. Tabs/workspace persist, so
  // relaunching restores them.
  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          if (timer !== undefined) {
            window.clearTimeout(timer);
            timer = undefined;
          }
        } else if (timer === undefined) {
          timer = window.setTimeout(() => {
            setActive(false);
            setSuspended(true);
          }, SUSPEND_AFTER_MS);
        }
      },
      { rootMargin: `${SUSPEND_MARGIN_PX}px` },
    );
    io.observe(el);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      io.disconnect();
    };
  }, [active]);

  const src = `/playground/${playgroundId}`;

  return (
    <div
      ref={ref}
      // Aspect-ratio height, clamped for phones and very wide screens.
      // Opaque surface so the striped-shell elevation only shows in the
      // offset sliver.
      className="relative aspect-[16/10] max-h-[820px] min-h-[480px] w-full overflow-hidden rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] transition-colors group-hover:border-[var(--ds-blue-500)] dark:border-white/10 dark:bg-[#1a1a1a] dark:group-hover:border-[var(--ds-blue-400)]"
    >
      {active ? (
        // key on src so switching languages cleanly reloads the iframe.
        <iframe
          key={src}
          src={src}
          title="Dataslope playground"
          className="size-full border-0"
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <PlaygroundFacade
          playgroundId={playgroundId}
          label={label}
          suspended={suspended}
          onLaunch={() => setActive(true)}
        />
      )}
    </div>
  );
}
