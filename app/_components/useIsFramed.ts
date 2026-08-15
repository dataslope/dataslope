"use client";

import { useState } from "react";

/**
 * True when this document runs inside an iframe. Computed once on mount
 * (framing can't change); playgrounds render client-only (`ssr: false`), so
 * reading `window` in the lazy initializer can't cause hydration mismatches.
 */
export function useIsFramed(): boolean {
  return useState(
    () => typeof window !== "undefined" && window.self !== window.top,
  )[0];
}
