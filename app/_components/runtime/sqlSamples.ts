// Shared types and helpers used by the three SQL playground sample
// catalogues (sqliteSamples.ts / postgresSamples.ts / duckdbSamples.ts).
// The dialect-specific DDL/seed payloads stay in their per-dialect
// files because the SQL itself is what differs between SQLite,
// Postgres and DuckDB — consolidating it behind a synthetic emitter
// layer added complexity without value during the Stage 4 audit.

export interface QueryTabSeed {
  /** Human-readable title shown in the tab strip. */
  title: string;
  /** Initial SQL contents of the tab. */
  code: string;
}

/** Fields every dialect's sample-database entry exposes. Per-dialect
 *  modules extend this with their own payload (e.g. SQLite ships a
 *  `seed(db)` callback, Postgres/DuckDB inline the SQL as a `sql`
 *  string). */
export interface SqlSampleDatabaseBase {
  /** Stable id used in localStorage keys and the selector value. */
  id: string;
  /** Human-readable name shown in the selector trigger and dropdown. */
  label: string;
  /** Display filename (e.g. `chinook.db`) shown next to the selector
   *  trigger so the user sees the same on-disk metaphor used by other
   *  tools. */
  filename: string;
  /** Short description shown under the label in the selector dropdown. */
  description: string;
  /** Default editor tabs opened on the first visit to this database. */
  defaultTabs: QueryTabSeed[];
}

/** Look a sample up by id, falling back to the first registered
 *  sample (or, if provided, a "blank" entry) so the playground always
 *  boots into a usable state even after the user deletes a sample we
 *  shipped in a previous release. Shared between every dialect. */
export function findSqlSampleById<T extends SqlSampleDatabaseBase>(
  id: string,
  samples: readonly T[],
  blank?: T,
): T {
  if (blank && id === blank.id) return blank;
  return samples.find((s) => s.id === id) ?? samples[0];
}
