"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
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
 * route mounts, which costs hundreds of MB of memory — far too much to spend
 * on every visitor who merely scrolls past. So the iframe is a *click-to-
 * activate facade*: a static mock of the playground window with a Launch
 * button, and the real route only loads after an explicit click. Once
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

/** Static, animation-free mock of the playground window shown before launch:
 *  window chrome, a fake gutter/code skeleton, and the centered Launch CTA. */
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
  // Deterministic skeleton "code line" widths (percent) — static divs, so the
  // facade costs nothing to keep on screen.
  const lineWidths = [42, 68, 55, 30, 74, 48, 22, 61];
  return (
    <button
      type="button"
      onClick={onLaunch}
      aria-label={`Launch the ${label} playground`}
      className="group flex size-full cursor-pointer flex-col text-left"
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

      {/* Body: code-line skeleton behind a centered launch CTA */}
      <div className="relative flex-1">
        <div
          className="absolute inset-0 flex flex-col gap-3 overflow-hidden p-6 opacity-70 [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]"
          aria-hidden="true"
        >
          {lineWidths.map((w, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-5 text-right text-xs tabular-nums text-[var(--ds-gray-300)] dark:text-white/20">
                {i + 1}
              </span>
              <span
                className="h-3 rounded bg-[var(--ds-gray-200)] dark:bg-white/10"
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-[var(--ds-gray-300)] bg-white px-6 py-3 text-sm font-semibold text-[var(--ds-gray-900)] shadow-sm transition-colors group-hover:border-[var(--ds-blue-500)] group-hover:text-[var(--ds-blue-700)] dark:border-white/15 dark:bg-[#1a1a1a] dark:text-white dark:group-hover:border-[var(--ds-blue-400)] dark:group-hover:text-[var(--ds-blue-400)]">
            <Play size={16} aria-hidden="true" />
            Launch the {label} playground
          </span>
          <span className="text-center text-xs text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            {suspended
              ? "Paused to free memory — relaunch to pick up where you left off."
              : "Runs entirely in your browser — nothing downloads until you launch it."}
          </span>
        </div>
      </div>
    </button>
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
  // for a while — the engine's WASM heap is the page's single biggest memory
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
      className="relative aspect-[16/10] max-h-[820px] min-h-[480px] w-full overflow-hidden rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] shadow-sm dark:border-white/10 dark:bg-white/5"
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
