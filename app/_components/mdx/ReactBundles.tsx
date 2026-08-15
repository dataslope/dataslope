"use client";

/**
 * Carries one lesson's precompiled React bundles down to the
 * `<CodeBlock adapter="react">`s in its MDX (same shape and reason as
 * BlockOutputs.tsx: a context is the only way in). Only the lesson's slice
 * crosses to the client; every miss degrades to an empty preview panel with
 * Run still working.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { LessonReactBundles, ReactBundle } from "@/lib/reactBundles";

const ReactBundlesContext = createContext<LessonReactBundles | null>(null);

export function ReactBundlesProvider({
  bundles,
  children,
}: {
  bundles: LessonReactBundles | null;
  children: ReactNode;
}) {
  return (
    <ReactBundlesContext.Provider value={bundles}>
      {children}
    </ReactBundlesContext.Provider>
  );
}

/** The precompiled bundle for `key`, or null when there isn't one. */
export function usePrecompiledBundle(key: string): ReactBundle | null {
  const bundles = useContext(ReactBundlesContext);
  return bundles?.[key] ?? null;
}
