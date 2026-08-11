"use client";

import { useEffect } from "react";
import {
  applySiteThemeClass,
  getSiteTheme,
  subscribeSiteTheme,
} from "./siteTheme";

/**
 * Keep a playground's editor theme in lockstep with the site-wide light/dark
 * choice (the `theme` localStorage key + `.dark` class shared with the home
 * page and /learn). The editor catalog is just GitHub Light/Dark, so the
 * "editor theme" IS the color scheme, toggling dark mode anywhere updates
 * the playground, and the playground's General-tab toggle (which calls
 * `setSiteTheme`) updates everywhere else.
 *
 * `setEditorTheme` is the playground's own setter (it updates the store and
 * the CodeMirror theme via the component's `[editorTheme]` effect).
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
