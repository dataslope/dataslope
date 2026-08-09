"use client";

/**
 * Shared `RootProvider` wrapper for the two learner-facing docs layouts
 * (/courses, /interview-prep). Adds two things the plain provider lacks:
 *
 * 1. The current course / interview track as the search dialog's
 *    `defaultTag`. Fumadocs's fetch client forwards it to `/api/search` as
 *    `?tag=…`, where it *boosts* (not filters) rows from the same course and
 *    collection, so searching "bar" inside the Plotly course surfaces the
 *    Plotly bar-chart lesson above ggplot2's. Derived from `usePathname()` in
 *    a client component because layouts do not re-render on navigation, so a
 *    params-derived value there would go stale when the reader moves between
 *    courses.
 *
 * 2. `<HashScrollFix>`, which keeps deep links (search results included)
 *    pointed at their target while late-mounting components (CodeMirror,
 *    KaTeX, Mermaid) shift the page under the initial scroll position, and
 *    `<SearchHighlight>`, which paints the searched words carried on result
 *    URLs as `?hl=…`.
 */
import type { ComponentProps, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RootProvider } from "fumadocs-ui/provider/next";
import { searchScopeFor } from "@/lib/search/ranking";
import HashScrollFix from "./HashScrollFix";
import SearchHighlight from "./SearchHighlight";

export function DocsRootProvider({
  theme,
  children,
}: {
  theme?: ComponentProps<typeof RootProvider>["theme"];
  children: ReactNode;
}) {
  const scope = searchScopeFor(usePathname());
  return (
    <RootProvider
      theme={theme}
      search={scope ? { options: { defaultTag: scope } } : undefined}
    >
      <HashScrollFix />
      <SearchHighlight />
      {children}
    </RootProvider>
  );
}
