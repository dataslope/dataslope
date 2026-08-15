// Shared types/helpers for the three SQL sample catalogues. Dialect-
// specific DDL/seed payloads deliberately stay in their per-dialect files —
// a synthetic emitter layer added complexity without value.

export interface QueryTabSeed {
  /** Human-readable title shown in the tab strip. */
  title: string;
  /** Initial SQL contents of the tab. */
  code: string;
}

/** Fields every dialect's sample-database entry exposes; per-dialect
 *  modules extend this with their own payload. */
export interface SqlSampleDatabaseBase {
  /** Stable id used in localStorage keys and the selector value. */
  id: string;
  /** Name shown in the selector trigger and dropdown. */
  label: string;
  /** Display filename (e.g. `chinook.db`) shown next to the selector. */
  filename: string;
  /** Short description shown under the label in the dropdown. */
  description: string;
  /** Editor tabs opened on the first visit to this database. */
  defaultTabs: QueryTabSeed[];
}

/** Look a sample up by id, falling back to the first sample (or the
 *  provided blank) so the playground always boots even with a stale id. */
export function findSqlSampleById<T extends SqlSampleDatabaseBase>(
  id: string,
  samples: readonly T[],
  blank?: T,
): T {
  if (blank && id === blank.id) return blank;
  return samples.find((s) => s.id === id) ?? samples[0];
}
