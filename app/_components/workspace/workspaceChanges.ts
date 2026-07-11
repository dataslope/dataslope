/**
 * A tiny in-tab pub/sub for "the current playground's workspace content just
 * changed." Playgrounds emit a bare pulse from their existing edit-persist
 * sinks (the code editor's persist listener, the SQL families' `saveTabs`);
 * the auto-sync hook (useWorkspaceAutoSync) subscribes and debounces a cloud
 * backup off it.
 *
 * A bare pulse (no id) is deliberate: exactly one playground is mounted per
 * document, so a pulse always means "the workspace on screen changed," and the
 * subscriber already knows which workspace that is. Keeping this a plain module
 * (no React, no "use client") lets the low-level tab-storage utils import it
 * without dragging the client/runtime graph along.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Notify subscribers that the active workspace's content changed. Safe to
 *  call from anywhere (no-op when nobody is listening). */
export function notifyWorkspaceChanged(): void {
  // Copy before iterating so a listener that unsubscribes mid-dispatch can't
  // mutate the set we're walking.
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // A broken subscriber must not wedge the editor's persist path.
    }
  }
}

/** Subscribe to change pulses. Returns an unsubscribe function. */
export function subscribeWorkspaceChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
