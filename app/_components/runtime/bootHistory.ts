// Per-browser record of which runtimes have booted at least once.
//
// The heavy WASM payloads (Pyodide, WebR, CheerpJ, PGlite, the DuckDB /
// SQLite engines, …) are served with immutable, long-lived HTTP cache
// headers, so after the very first boot in a browser they are read from
// disk cache rather than re-downloaded. The boot overlay, however, still
// appears on every playground visit because each playground recreates its
// engine on mount (engines are torn down on unmount for isolation).
//
// Showing "Downloading … this happens once" on *every* visit is therefore
// misleading: nothing is being downloaded after the first time. This tiny
// localStorage flag lets the overlay distinguish a genuine first-ever cold
// start (show the download reassurance) from a warm revisit (just the
// status line + progress bar, no download copy).
//
// It is intentionally best-effort: if localStorage is unavailable (privacy
// mode, quota) we simply treat every boot as cold, which is harmless.

const KEY_PREFIX = "ds_runtime_booted_";

/** True if `runtimeId` has successfully booted before in this browser. */
export function hasRuntimeBootedBefore(runtimeId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY_PREFIX + runtimeId) === "1";
  } catch {
    return false;
  }
}

/** Record that `runtimeId` has booted, so later visits skip the cold copy. */
export function markRuntimeBooted(runtimeId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PREFIX + runtimeId, "1");
  } catch {
    /* ignore quota / privacy-mode write failures */
  }
}
