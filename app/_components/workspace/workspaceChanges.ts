/**
 * Tiny in-tab pub/sub for "the current workspace's content changed";
 * useWorkspaceAutoSync debounces a cloud backup off it. A bare pulse (no id)
 * is deliberate: exactly one playground is mounted per document. Kept a
 * plain module (no React/"use client") so low-level tab-storage utils can
 * import it without dragging the client graph along.
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
