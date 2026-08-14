"use client";

import { useEffect } from "react";
import {
  applySiteThemeClass,
  getSiteTheme,
  subscribeSiteTheme,
} from "./siteTheme";

/**
 * Keep a playground's editor theme in lockstep with the site-wide light/dark
 * choice: the editor catalog is just GitHub Light/Dark, so the editor theme
 * IS the color scheme, and syncing works in both directions.
 */
export function usePlaygroundThemeSync(
  setEditorTheme: (theme: string) => void,
): void {
  useEffect(() => {
    const sync = () => {
      const theme = getSiteTheme();
      // In an embedded iframe reacting to a cross-document `storage` event the
      // local class can be stale, so re-assert it from the resolved theme.
      applySiteThemeClass(theme);
      setEditorTheme(theme === "dark" ? "github-dark" : "github-light");
    };
    sync();
    return subscribeSiteTheme(sync);
  }, [setEditorTheme]);
}
