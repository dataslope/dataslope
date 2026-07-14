"use client";

// Tracks the viewport width so the Studio shell can pick between the design's
// sidebar states (full / icon rail / drawer) at its exact breakpoints — 640px
// for the phone drawer, 900px (or 1240px while a builder shows its live
// preview) for auto-collapsing to the rail. useSyncExternalStore over resize
// so it reconciles cleanly on hydration; SSR assumes a wide desktop (the
// layout the sidebar defaults to).
import { useSyncExternalStore } from "react";

const SSR_WIDTH = 1400;

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

function getSnapshot(): number {
  return window.innerWidth;
}

function getServerSnapshot(): number {
  return SSR_WIDTH;
}

export function useViewportWidth(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
