"use client";

import { useState } from "react";

/**
 * True when this document is running inside an iframe (e.g. the home page's
 * embedded playground), false when it's the top-level page. Computed once on
 * mount, framing doesn't change during a component's lifetime. Playgrounds
 * render client-only (`ssr: false`), so reading `window` in the lazy
 * initializer is safe and free of hydration mismatches.
 */
export function useIsFramed(): boolean {
  return useState(
    () => typeof window !== "undefined" && window.self !== window.top,
  )[0];
}
