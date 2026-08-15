"use client";

/**
 * Minimal light/dark theme controller for the home route. next-themes is only
 * a transitive dependency (under fumadocs-ui), so instead of importing it we
 * replicate its exact contract — `localStorage["theme"]` key + `.dark` class
 * on `<html>` — so the choice is shared with Fumadocs-themed routes in both
 * directions. Defaults to light; a pre-hydration inline script (app/page.tsx)
 * applies the stored class before first paint.
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
  // Explicit class for both themes, mirroring next-themes: scheme-detecting
  // components treat a missing class as "ask the OS", so a light page on a
  // dark-OS device would otherwise render its editors dark.
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
