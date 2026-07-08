"use client";

/**
 * Minimal, dependency-free light/dark theme controller for the home route.
 *
 * Why not next-themes? The `/learn` route gets its theming from Fumadocs's
 * `RootProvider`, which wraps next-themes. next-themes isn't a direct
 * dependency of this app (it's pulled in transitively under fumadocs-ui), so
 * importing it from a top-level route isn't guaranteed to resolve. Instead we
 * replicate the exact contract next-themes uses so the choice is SHARED across
 * routes:
 *
 *   - persisted under the `localStorage["theme"]` key (next-themes' default), and
 *   - applied as a `.dark` class on `<html>` (the class strategy Fumadocs uses).
 *
 * That means toggling the theme here and then navigating to `/learn` (a
 * client-side transition that keeps the same document) is picked up by
 * Fumadocs's provider, and vice-versa.
 *
 * The home route defaults to LIGHT: a missing or non-"dark" stored value is
 * treated as light. A pre-hydration inline script (see `app/page.tsx`) applies
 * the stored class before first paint so there's no flash. The live value is
 * read via `useSyncExternalStore`, so we never set React state inside an effect.
 */

import { useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
// Same-tab notification: `storage` events only fire in *other* tabs, so we
// also dispatch this so the toggling tab re-reads the snapshot immediately.
const CHANGE_EVENT = "ds-theme-change";

/** Read the persisted theme, treating anything other than "dark" (unset,
 *  "system", "light") as light, matching the home route's light default. */
function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  // Set an EXPLICIT class for the active theme (both `dark` and `light`),
  // mirroring next-themes. Components that detect the scheme (e.g. the
  // challenge card's CodeMirror theme picker) treat a missing class as "ask
  // the OS", so without an explicit `light` class, a light page on a
  // dark-OS device would render its editors dark.
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function serverSnapshot(): Theme {
  return "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    readStoredTheme,
    serverSnapshot,
  );

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode / quota, the class + snapshot still update below */
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const toggle = useCallback(() => {
    setTheme(readStoredTheme() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggle };
}
