/**
 * Recovery from a stale build.
 *
 * Every deploy renames the hashed chunks under `/_next/static/` and drops the
 * previous set from the Workers asset store, so a tab opened before a deploy
 * holds a document pointing at files the origin no longer serves. The tab
 * survives until it needs a chunk it has not already downloaded — a
 * client-side navigation to a route it has not visited — and then that chunk
 * 404s. `experimental.staleTimes` (next.config.ts) keeps prefetched payloads
 * reusable for 5-30 minutes, which widens the window a tab can sit in this
 * state.
 *
 * The crash that follows is not reliably a ChunkLoadError. A module whose
 * import came from the missing chunk evaluates with that binding undefined
 * and throws whatever its top-level code happens to throw first — the report
 * this module was written for was `Cannot read properties of undefined
 * (reading 'map')` thrown at module evaluation while rendering the home page,
 * which no message-sniffing heuristic would ever recognise. So the 404 itself
 * is the signal: `STALE_BUILD_WATCHER_SCRIPT` records asset load failures as
 * they happen, and the error boundaries ask this module whether the crash
 * they just caught sits downstream of one.
 *
 * Recovery is a hard reload, the only thing that helps: `reset()` re-renders
 * against the same poisoned module registry, and the boundaries' "Home" link
 * was a client-side navigation into the same missing chunks. The user in the
 * original report escaped by refreshing manually.
 *
 * Deliberately dependency-free (no React, no Next) so app/global-error.tsx,
 * which stands in for a crashed root layout, can use it without widening its
 * own blast radius.
 */

/** Set on `window` by {@link STALE_BUILD_WATCHER_SCRIPT} when a build asset
 *  404s. A global, not storage: the question is only ever "did this document
 *  lose an asset", and a flag that dies with the document cannot leak into a
 *  later, unrelated crash in the same tab. */
export const ASSET_FAILURE_GLOBAL = "__dsStaleBuildAssetFailed";

/** Timestamp of the last reload we forced. In sessionStorage because it has
 *  to survive that reload — otherwise a genuinely broken build loops. */
export const RELOAD_GUARD_KEY = "ds:stale-build-reloaded-at";

/** How long a forced reload suppresses the next one. A reload that fixes
 *  nothing must fall through to the error UI rather than fire again. */
export const RELOAD_COOLDOWN_MS = 60_000;

/** True for URLs of build output, whose names change every deploy. */
export function isBuildAssetUrl(url: unknown): boolean {
  return typeof url === "string" && url.includes("/_next/static/");
}

/** Messages browsers and bundlers use when a chunk cannot be loaded or
 *  instantiated. A useful signal on its own, but not a sufficient one — see
 *  the module comment for why the 404 is tracked separately. */
const STALE_BUILD_MESSAGES = [
  /ChunkLoadError/i,
  /Loading chunk \S+ failed/i,
  /Loading CSS chunk \S+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /module factory is not available/i,
  /is not a valid JavaScript MIME type/i,
];

/** True when the error itself names a chunk failure. */
export function looksLikeStaleBuildError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "";
  if (!message) return false;
  return STALE_BUILD_MESSAGES.some((re) => re.test(message));
}

/** The reload decision, as a pure function so it can be tested without a
 *  document. `assetFailed` is the watcher's flag; `lastReloadAt` is the guard
 *  timestamp (null when we have not reloaded this session). */
export function shouldReloadForStaleBuild({
  assetFailed,
  error,
  now,
  lastReloadAt,
}: {
  assetFailed: boolean;
  error: unknown;
  now: number;
  lastReloadAt: number | null;
}): boolean {
  if (!assetFailed && !looksLikeStaleBuildError(error)) return false;
  if (lastReloadAt !== null && now - lastReloadAt < RELOAD_COOLDOWN_MS) {
    return false;
  }
  return true;
}

/** True when this document has seen a build asset fail to load. */
export function sawBuildAssetFailure(): boolean {
  if (typeof window === "undefined") return false;
  return (window as unknown as Record<string, unknown>)[ASSET_FAILURE_GLOBAL] === true;
}

/** True when the boundary should offer a reload rather than `reset()`, and
 *  say the page went stale rather than blaming the user's work. */
export function isStaleBuildCrash(error: unknown): boolean {
  return sawBuildAssetFailure() || looksLikeStaleBuildError(error);
}

/** `useSyncExternalStore` subscribe for {@link isStaleBuildCrash}. The flag
 *  is written before hydration and never changes afterwards, so there is
 *  nothing to notify; the hook exists to keep the read out of render and off
 *  the server snapshot. */
export function subscribeToStaleBuild(): () => void {
  return () => {};
}

/** Server snapshot for the same hook: a server render has no document and so
 *  never saw a 404. */
export function neverStale(): boolean {
  return false;
}

function readGuard(): number | null {
  try {
    const raw = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null; // private mode; the cooldown guard is best-effort
  }
}

/**
 * Reloads the page when `error` is downstream of a stale build, and reports
 * whether it did.
 */
export function recoverFromStaleBuild(error: unknown): boolean {
  if (typeof window === "undefined") return false;

  const reload = shouldReloadForStaleBuild({
    assetFailed: sawBuildAssetFailure(),
    error,
    now: Date.now(),
    lastReloadAt: readGuard(),
  });
  if (!reload) return false;

  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    /* private mode; reload anyway, the cooldown is best-effort */
  }
  window.location.reload();
  return true;
}

/**
 * Runs in <head>, before any chunk can fail, and flags 404s on build assets.
 * A capture-phase listener because resource load errors do not bubble. Kept
 * as a string, and built from the constants above, so the watcher and the
 * boundaries that read its flag cannot drift apart.
 */
export const STALE_BUILD_WATCHER_SCRIPT = `
(function () {
  try {
    window.addEventListener("error", function (e) {
      var t = e.target;
      if (!t || (t.tagName !== "SCRIPT" && t.tagName !== "LINK")) return;
      var url = t.src || t.href || "";
      if (typeof url !== "string" || url.indexOf("/_next/static/") === -1) return;
      window[${JSON.stringify(ASSET_FAILURE_GLOBAL)}] = true;
    }, true);
  } catch (err) { /* no window.addEventListener: nothing to recover from */ }
})();
`;
