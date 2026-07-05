"use client";

/**
 * Global navigation loading indicator.
 *
 * App Router navigations to heavy routes (playgrounds, course pages) can
 * take a few seconds before the new page commits, during which the old page
 * just sits there and the site feels unresponsive. This component — mounted
 * once in the root layout — shows the brand "diamond assemble + quarter-turn"
 * loader in a small corner badge while a navigation is in flight.
 *
 * There is no global "navigation started" event in the App Router, so start
 * is detected the way the top-loader libraries do it: a capture-phase click
 * listener on `document` that recognises left-clicks on same-origin,
 * same-tab, non-download links whose path/query differ from the current URL
 * (capture phase, because next/link calls preventDefault before the bubble
 * phase — `defaultPrevented` can't distinguish an SPA navigation from an
 * app-handled click). Back/forward is covered by `popstate`. Programmatic
 * `router.push` calls are not detected — link clicks are how users reach
 * playgrounds and courses.
 *
 * "Navigation finished" is the router state actually changing:
 * usePathname/useSearchParams only update when the new route commits, so an
 * effect keyed on them hides the badge. Two timers keep it honest: the badge
 * only appears after SHOW_DELAY_MS (fast navigations never flash it), and a
 * safety timeout clears it if a detected "navigation" never commits (the
 * click was intercepted by app code, or the fetch failed).
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DiamondAssembleTurnLoader } from "@/app/_components/mdx/loadingAnimations";
import styles from "./NavigationLoadingIndicator.module.css";

/** Only show the badge once a navigation has been pending this long, so
 *  fast (prefetched / cached) navigations never flash it. */
const SHOW_DELAY_MS = 250;

/** Failsafe: hide the badge if no route change commits — the click never
 *  actually navigated (app code intercepted it) or the navigation failed. */
const SAFETY_TIMEOUT_MS = 12_000;

function isModifiedClick(e: MouseEvent): boolean {
  return e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
}

/** True when the anchor click will trigger a client-side navigation to a
 *  DIFFERENT page: same-origin, same-tab, not a download, and not a
 *  same-path navigation (hash-only jumps never change the router state,
 *  which is what hides the badge again). */
function isPageNavigation(anchor: HTMLAnchorElement): boolean {
  const target = anchor.getAttribute("target");
  if (target && target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;

  const { pathname, search } = window.location;
  return url.pathname !== pathname || url.search !== search;
}

function IndicatorImpl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable across renders (timers are refs, setVisible is stable) so the
  // start/stop closures in the listener effect below never go stale.
  const stop = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    showTimer.current = null;
    safetyTimer.current = null;
    setVisible(false);
  }, []);

  const start = useCallback(() => {
    stop();
    showTimer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    safetyTimer.current = setTimeout(stop, SAFETY_TIMEOUT_MS);
  }, [stop]);

  /** The last committed path + query, for the popstate handler to tell a
   *  real back/forward navigation from a hash-only jump. Normalised through
   *  URLSearchParams so it compares equal to location.search regardless of
   *  percent-encoding differences. */
  const committedUrl = useRef("");

  // The route committed — the navigation is done.
  useEffect(() => {
    committedUrl.current = `${pathname}?${searchParams.toString()}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the route commit IS the "navigation finished" signal; hiding the badge here is the point
    stop();
  }, [pathname, searchParams, stop]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || isModifiedClick(e)) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isPageNavigation(anchor)) return;
      start();
    };

    // Back/forward can also be slow when the target isn't in the router
    // cache. By the time popstate fires, location already reflects the
    // destination, so a hash-only jump (same path + query as the router's
    // current state) is skipped the same way link clicks are.
    const onPopState = () => {
      const location = window.location;
      const destination = `${location.pathname}?${new URLSearchParams(
        location.search,
      ).toString()}`;
      if (destination === committedUrl.current) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      stop();
    };
  }, [start, stop]);

  return (
    <>
      {/* Always mounted so the live region exists before its text changes —
          screen readers only announce content that appears in an existing
          aria-live container. */}
      <span role="status" aria-live="polite" className={styles.srStatus}>
        {visible ? "Loading page…" : ""}
      </span>
      {visible && (
        <div className={styles.badge} aria-hidden="true">
          <DiamondAssembleTurnLoader size={36} label="Loading page…" />
        </div>
      )}
    </>
  );
}

/** Suspense wrapper: useSearchParams requires a boundary so the root
 *  layout's static shell doesn't bail out to client rendering. */
export default function NavigationLoadingIndicator() {
  return (
    <Suspense fallback={null}>
      <IndicatorImpl />
    </Suspense>
  );
}
