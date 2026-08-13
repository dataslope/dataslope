"use client";

/**
 * Carries one lesson's precompiled React bundles from the page down to the
 * `<CodeBlock adapter="react">`s inside its MDX — the same shape, and for
 * the same reason, as `BlockOutputs.tsx` next door: the blocks are authored
 * as JSX inside the content, so a context is the only way to reach them.
 *
 * What crosses to the client is this lesson's slice, not the manifest. A
 * react lesson carries two or three bundles of a few kB each; the whole-site
 * manifest stays on the server.
 *
 * Absent context, absent lesson, absent entry — every miss degrades to the
 * same thing, the empty preview panel a react block showed before any of
 * this existed, with Run still working.
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
