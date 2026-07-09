"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";

/**
 * Showcase embed of the real playground, driven by `playgroundId` from the
 * page's external switcher.
 *
 * We render it in a same-origin <iframe> rather than mounting the playground
 * inline: the playground takes over the host document on mount (adds
 * `body.playground-active` → full-bleed dark background + `overflow:hidden`,
 * and writes editor-theme palette vars onto `<html>`). An iframe fully
 * isolates that from the marketing page while still giving visitors the live
 * editor and schema browser.
 *
 * The playground's own in-header switcher is hidden when it detects it's
 * framed (see `useIsFramed`); switching languages here is done by the page's
 * switcher, which changes `playgroundId` and points the iframe at the new
 * playground route.
 *
 * The playground boots a full WASM engine (PGlite, Pyodide, …) the moment its
 * route mounts, which costs hundreds of MB of memory, far too much to spend
 * on every visitor who merely scrolls past. So the iframe is a *click-to-
 * activate facade*: a mock of the playground window with a Launch button
 * (animated with CSS only, so it still costs ~nothing to keep on screen),
 * and the real route only loads after an explicit click. Once
 * launched, a playground that has been far offscreen for a while is unloaded
 * again to reclaim its memory (its tabs/workspace persist in localStorage and
 * OPFS, so relaunching restores where the visitor left off).
 */

/** How far past the viewport the live playground may sit before it counts as
 *  "away" (matches a couple of scrolled sections, so flicking past the
 *  showcase doesn't arm the unload timer). */
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

/** Mock of the playground window shown before launch: window chrome, a fake
 *  gutter/code skeleton (CSS-animated so the window reads as live, not a dead
 *  image), and the centered Launch CTA. The whole region launches on click,
 *  the outer div carries the click handler and a subtle full-surface hover
 *  tint, while the ShimmerButton inside is the real, keyboard-focusable
 *  <button> (its activation click bubbles up; nesting it inside a <button>
 *  root would be invalid HTML). */
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
      className="group flex size-full cursor-pointer flex-col text-left transition-colors duration-200 hover:bg-[var(--ds-green-50)]/40 dark:hover:bg-[var(--ds-green-500)]/[0.04]"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--ds-gray-200)] bg-white px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[var(--ds-red-500)]/70" />
          <span className="size-2.5 rounded-full bg-[#FFDD6C]" />
          <span className="size-2.5 rounded-full bg-[var(--ds-green-500)]/70" />
        </span>
        <span className="ml-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
          <FacadeGlyph id={playgroundId} />
          {label} playground
        </span>
      </div>

      {/* Body: code-line skeleton behind a centered launch CTA. The bars
          breathe on a staggered pulse and the last line carries a blinking
          caret, so the mock reads as a live editor mid-thought. */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0 flex flex-col gap-3 overflow-hidden p-6 opacity-70 transition-opacity duration-200 group-hover:opacity-100 [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]"
          aria-hidden="true"
        >
          {lineWidths.map((w, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-5 text-right text-xs tabular-nums text-[var(--ds-gray-300)] transition-colors group-hover:text-[var(--ds-green-600)] dark:text-white/20 dark:group-hover:text-[var(--ds-green-500)]">
                {i + 1}
              </span>
              <span
                className="h-3 animate-pulse rounded bg-[var(--ds-gray-200)] transition-colors group-hover:bg-[var(--ds-green-200)] motion-reduce:animate-none dark:bg-white/10 dark:group-hover:bg-[var(--ds-green-500)]/25"
                style={{ width: `${w}%`, animationDelay: `${i * 180}ms` }}
              />
              {i === lineWidths.length - 1 && (
                <span className="animate-blink-cursor -ml-2.5 h-3 w-1.5 rounded-sm bg-[var(--ds-gray-400)] transition-colors group-hover:bg-[var(--ds-green-500)] dark:bg-white/40 dark:group-hover:bg-[var(--ds-green-400)]" />
              )}
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
          {/* Magic UI ShimmerButton with the brand-green shimmer as the accent
              edge; like the hero's PickerSelect trigger, the fill tracks the
              page surface (--color-fd-background) so it reads as part of the
              page in both themes. */}
          <ShimmerButton
            background="var(--color-fd-background)"
            shimmerColor="var(--ds-green-500)"
            shimmerSize="0.15em"
            className="gap-2.5 border-[color:var(--ds-gray-300)] px-6 py-3 text-sm font-semibold text-[var(--ds-gray-900)] shadow-sm transition-colors group-hover:border-[var(--ds-green-600)] group-hover:text-[var(--ds-green-700)] dark:border-white/15 dark:text-white dark:group-hover:border-[var(--ds-green-400)] dark:group-hover:text-[var(--ds-green-400)]"
          >
            <Play size={16} aria-hidden="true" />
            Launch the {label} playground
          </ShimmerButton>
          <span className="text-center text-xs text-[var(--ds-gray-500)] transition-colors group-hover:text-[var(--ds-green-700)] dark:text-[var(--ds-gray-400)] dark:group-hover:text-[var(--ds-green-400)]">
            {suspended
              ? "Paused to free memory, relaunch to pick up where you left off."
              : "Runs entirely in your browser, nothing downloads until you launch it."}
          </span>
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

  // While the playground is live, unload it once it has been far offscreen
  // for a while, the engine's WASM heap is the page's single biggest memory
  // consumer, and a visitor who scrolled on has stopped using it. Tabs and
  // workspace persist (localStorage/OPFS), so relaunching restores them.
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
      // Height tracks width (aspect-ratio), clamped so it stays usable on
      // phones and doesn't get unwieldy on very wide screens.
      // Opaque surface (not a translucent tint) so the striped-shell
      // elevation on the wrapper only shows in the offset sliver.
      className="relative aspect-[16/10] max-h-[820px] min-h-[480px] w-full overflow-hidden rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] transition-colors group-hover:border-[var(--ds-green-500)] dark:border-white/10 dark:bg-[#1a1a1a] dark:group-hover:border-[var(--ds-green-400)]"
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
