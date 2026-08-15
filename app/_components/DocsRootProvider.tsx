"use client";

/**
 * Shared `RootProvider` wrapper for the learner-facing docs layouts
 * (/courses, /interview-prep). Adds the current course/track as the search
 * dialog's `defaultTag` (`/api/search` boosts, not filters, same-course
 * rows), derived from `usePathname()` because layouts don't re-render on
 * navigation, plus `<HashScrollFix>` and `<SearchHighlight>`.
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
