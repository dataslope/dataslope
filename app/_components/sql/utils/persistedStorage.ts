"use client";

// Coalesced, idle-deferred localStorage writer: the latest value per key is
// kept in memory and flushed inside requestIdleCallback so synchronous
// writes can't contend with rendering. Writes still flush eagerly on
// pagehide / visibilitychange so nothing is lost on tab close.

type PendingMap = Map<string, string>;

const pending: PendingMap = new Map();
let scheduled = false;

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;
interface IdleWindow {
  requestIdleCallback?: (cb: IdleCallback, opts?: { timeout?: number }) => number;
}

function flush(): void {
  scheduled = false;
  if (pending.size === 0) return;
  for (const [key, value] of pending) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage quota / private-mode errors.
    }
  }
  pending.clear();
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  const w = (typeof window !== "undefined" ? window : undefined) as
    | (Window & IdleWindow)
    | undefined;
  if (w?.requestIdleCallback) {
    w.requestIdleCallback(() => flush(), { timeout: 500 });
  } else if (typeof setTimeout !== "undefined") {
    setTimeout(flush, 100);
  } else {
    flush();
  }
}

/** Queue a localStorage write, coalescing with any other pending
 *  writes for the same key and deferring the actual `setItem` until
 *  the browser is idle. Returns immediately. */
export function persistAsync(key: string, value: string): void {
  pending.set(key, value);
  schedule();
}

/** Force-flush any queued writes. Safe to call on navigation or unload. */
export function flushPersistedStorage(): void {
  flush();
}

let unloadListenerAttached = false;
/** Install pagehide/visibilitychange listeners so queued writes are
 *  not lost if the user closes the tab between an idle callback being
 *  scheduled and firing. Idempotent. */
export function ensurePersistUnloadFlush(): void {
  if (unloadListenerAttached) return;
  if (typeof window === "undefined") return;
  unloadListenerAttached = true;
  const handler = () => flush();
  window.addEventListener("pagehide", handler);
  window.addEventListener("visibilitychange", handler);
}
