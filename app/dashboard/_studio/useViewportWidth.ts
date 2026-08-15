"use client";

// Viewport width for the Studio shell's sidebar breakpoints.
// useSyncExternalStore over resize so it reconciles cleanly on hydration;
// SSR assumes a wide desktop.
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
