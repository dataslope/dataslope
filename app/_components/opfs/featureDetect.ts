/**
 * OPFS and related browser capability detection.
 *
 * All functions are pure synchronous checks against globals that are available
 * immediately after the module is imported. They never throw.
 */

/** Returns true when the async OPFS API is available. */
export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    typeof (navigator.storage as { getDirectory?: unknown }).getDirectory ===
      "function"
  );
}

/**
 * Returns true when the synchronous OPFS access-handle API is available
 * (Chrome / Edge 108+, Safari 17.2+). This is required for zero-copy
 * database I/O inside workers. Falls back to the async API when false.
 */
export function hasSyncAccessHandles(): boolean {
  try {
    return (
      typeof FileSystemFileHandle !== "undefined" &&
      "createSyncAccessHandle" in FileSystemFileHandle.prototype
    );
  } catch {
    return false;
  }
}

/** Returns true when the Web Locks API is available. */
export function hasWebLocks(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "locks" in navigator &&
    typeof (navigator as { locks?: { request?: unknown } }).locks?.request ===
      "function"
  );
}
