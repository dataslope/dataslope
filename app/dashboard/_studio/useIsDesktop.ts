"use client";

// Tracks whether the viewport is desktop-width (≥ 1024px, Tailwind `lg`), the
// breakpoint where the Studio sidebar sits inline (and its toggle collapses it
// to an icon rail) rather than opening as a drawer overlay. useSyncExternalStore
// over matchMedia so it reconciles cleanly on hydration; SSR assumes desktop
// (the layout the sidebar defaults to).
import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
