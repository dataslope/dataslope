"use client";

/**
 * Keeps `#hash` navigation pointed at its target while late-mounting
 * components (CodeMirror, KaTeX, Mermaid) shift the page after the browser's
 * initial scroll: re-align the viewport on every document resize for a short
 * settle window; any scroll intent (wheel, touch, scroll keys) cancels it.
 * Keyed on `pathname` only: in-page hash navigation (a TOC click) happens
 * after layout has settled, and re-running would fight the native jump.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** How long after arrival late-mounting components may still shift layout. */
const SETTLE_MS = 3000;

/** Keys that express scroll intent; anything else (typing in Ask AI, tabbing)
 *  should not cancel the correction window. */
const SCROLL_KEYS = new Set([
  "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar",
]);

export default function HashScrollFix() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;

    const align = () => target.scrollIntoView({ block: "start", behavior: "instant" });

    align();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(align);
    const controller = new AbortController();
    const cancel = () => {
      observer.disconnect();
      controller.abort();
    };
    const { signal } = controller;
    window.addEventListener("wheel", cancel, { passive: true, signal });
    window.addEventListener("touchstart", cancel, { passive: true, signal });
    window.addEventListener(
      "keydown",
      (e) => {
        if (SCROLL_KEYS.has(e.key)) cancel();
      },
      { signal },
    );
    observer.observe(document.body);
    const timer = window.setTimeout(cancel, SETTLE_MS);

    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [pathname]);

  return null;
}
