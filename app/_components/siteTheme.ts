// Canonical site-wide light/dark controller. Contract matches
// next-themes/Fumadocs so the choice is shared across routes and same-origin
// documents: persisted under localStorage["theme"] ("light" | "dark"), applied
// as a `.dark`/`.light` class on <html>. localStorage is the source of truth
// (survives across documents, fires `storage` events); the class is derived.

export type SiteTheme = "light" | "dark";

const STORAGE_KEY = "theme";
// Same-tab notification: `storage` events only fire in OTHER documents, so we
// also dispatch this event so the toggling document reacts immediately.
const CHANGE_EVENT = "ds-theme-change";

/** Resolve the current site theme. Prefers an explicit stored value (reliable
 *  and shared across frames), then the `.dark`/`.light` class, then the OS
 *  preference, defaulting to light. */
export function getSiteTheme(): SiteTheme {
  if (typeof window !== "undefined") {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* localStorage unavailable */
    }
    if (stored === "dark") return "dark";
    if (stored === "light") return "light";
  }
  if (typeof document !== "undefined") {
    const cl = document.documentElement.classList;
    if (cl.contains("dark")) return "dark";
    if (cl.contains("light")) return "light";
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

/** Apply the explicit `.dark`/`.light` class for this document. */
export function applySiteThemeClass(theme: SiteTheme): void {
  if (typeof document === "undefined") return;
  const r = document.documentElement;
  r.classList.toggle("dark", theme === "dark");
  r.classList.toggle("light", theme === "light");
  // Overwrite the inline `color-scheme` next-themes leaves on <html>;
  // otherwise a light toggle here keeps a stale dark scrollbar until refresh.
  r.style.colorScheme = theme;
}

/** Persist + apply the site theme and notify listeners (this document and,
 *  via the `storage` event, other same-origin documents/frames). */
export function setSiteTheme(theme: SiteTheme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode / quota, class + event still update below */
  }
  applySiteThemeClass(theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/** Subscribe to site-theme changes from any source: this tab's toggle
 *  (CHANGE_EVENT), other tabs/frames (`storage`), and class toggles made
 *  directly on <html> by next-themes on /learn (MutationObserver). */
export function subscribeSiteTheme(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  let observer: MutationObserver | null = null;
  if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
    observer?.disconnect();
  };
}
