/**
 * Tiny localStorage helper for persisting the editor doc of fumadocs
 * `<CodeBlock>`, `<ChallengeCard>`, and `<SqlChallengeCard>` instances
 * across page reloads / navigation.
 *
 * The `<Playground>` deliberately does NOT use this — its source files
 * live in OPFS via `opfsDataStorage` and `playgroundOpfs`, which gives
 * it multi-file workspaces, large quotas, and tab-isolated state. This
 * module is for the lightweight single-buffer surfaces on /learn.
 *
 * Persistence keys are derived from a stable fingerprint of the block's
 * defining inputs (adapter id + starter code + any other identifying
 * props). When an author edits the starter code in MDX the fingerprint
 * changes, so the old saved buffer is no longer surfaced and the user
 * sees the new starter — a cheap form of cache invalidation that
 * doesn't require versioning or explicit migration.
 */

const STORAGE_PREFIX = "dataslope:";

export type PersistKind = "codeblock" | "challenge" | "sql-challenge";

interface PersistedRecord {
  /** The user's current buffer contents. */
  code: string;
  /** Wall-clock time of the last write — kept so future maintenance
   *  passes can clear records nobody has touched in a long while. */
  updatedAt: number;
}

/** FNV-1a 32-bit string hash. Tiny, dependency-free, and stable across
 *  reloads — good enough for "did the author rewrite this snippet?"
 *  cache-busting. NOT a security primitive. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Builds a localStorage key from a `kind` (which surface) and a
 *  free-form `fingerprint` string (which specific block). The
 *  fingerprint is hashed so the resulting key length stays bounded
 *  regardless of how long the starter code is. */
export function persistKey(kind: PersistKind, fingerprint: string): string {
  return `${STORAGE_PREFIX}${kind}:${fnv1a(fingerprint)}`;
}

/** Returns the previously-persisted buffer for `key`, or `null` if
 *  nothing is stored, the value is malformed, or storage is
 *  unavailable (SSR, private mode, quota errors). Never throws — a
 *  failed read just yields the starter code, which is the correct
 *  fallback. */
export function loadPersistedCode(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedRecord>;
    return typeof parsed?.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

/** Writes `code` to localStorage under `key`. Silently no-ops when
 *  storage isn't available or quota is exceeded — losing a buffered
 *  edit is preferable to crashing the editor. */
export function savePersistedCode(key: string, code: string): void {
  if (typeof window === "undefined") return;
  try {
    const record: PersistedRecord = { code, updatedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // QuotaExceededError, SecurityError, etc. — give up on this write.
  }
}

/** Removes any stored buffer for `key`. Called when the user clicks
 *  Reset so the starter source becomes authoritative again. */
export function clearPersistedCode(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
