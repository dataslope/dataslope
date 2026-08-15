/**
 * localStorage persistence for the single-buffer surfaces (CodeBlock,
 * ChallengeCard, SqlChallengeCard). `<Playground>` deliberately uses OPFS
 * instead. Keys are hashed fingerprints of the block's defining inputs, so
 * editing the starter code in MDX invalidates the saved buffer for free.
 */

const STORAGE_PREFIX = "dataslope:";

export type PersistKind =
  | "codeblock"
  | "challenge"
  | "sql-challenge"
  | "sql-codeblock";

interface PersistedRecord {
  code: string;
  /** Last-write time, kept for future stale-record cleanup. */
  updatedAt: number;
}

/** FNV-1a 32-bit string hash. Cache-busting only, NOT a security primitive. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Key from surface `kind` + block `fingerprint` (hashed to bound key length). */
export function persistKey(kind: PersistKind, fingerprint: string): string {
  return `${STORAGE_PREFIX}${kind}:${fnv1a(fingerprint)}`;
}

/** Persisted buffer for `key`, or null when missing/malformed/unavailable.
 *  Never throws — a failed read falls back to the starter code. */
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

/** Write `code` under `key`; silently no-ops when storage is unavailable
 *  (losing a buffered edit beats crashing the editor). */
export function savePersistedCode(key: string, code: string): void {
  if (typeof window === "undefined") return;
  try {
    const record: PersistedRecord = { code, updatedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // QuotaExceededError, SecurityError, etc.
  }
}

/** Remove the stored buffer (Reset) so the starter source is authoritative. */
export function clearPersistedCode(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
