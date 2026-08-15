"use client";

// Engine adapter contract shared by the three SQL playground shells
// (SQLite / Postgres / DuckDB): only the dialect-specific surface (engine
// factory, sample catalogue, importers, settings store) lives behind this
// interface.

import type { SqlDialect } from "../sqlCompletion";
import type {
  QueryTabSeed,
  SqlSampleDatabaseBase,
} from "../../runtime/sqlSamples";

/** Per-playground `localStorage` key namespace (e.g. `"duckdb_"`), so
 *  per-dialect state never collides. */
export type SqlPlaygroundStoragePrefix = string;

/** Bare-minimum engine surface the shell needs; each per-dialect engine
 *  exposes these plus a larger dialect-specific API. */
export interface SqlEngineLike {
  /** Execute one or more statements, returning the result sets. */
  exec(sql: string): unknown;
  /** Free the underlying database handle. */
  close?(): void | Promise<void>;
}

/** Adapter for one of the three SQL flavors. Plug into the shell to
 *  obtain dialect-specific behaviour. */
export interface SqlEngineAdapter<
  TEngine extends SqlEngineLike = SqlEngineLike,
  TSample extends SqlSampleDatabaseBase = SqlSampleDatabaseBase,
> {
  /** Dialect id used by the editor / completion / formatter wiring. */
  dialect: SqlDialect;
  /** Stable per-playground id (icons, tab routes, runtime info). */
  playgroundId: "sqlite" | "postgres" | "duckdb";
  /** Prefix for the shell's `localStorage` keys. */
  storagePrefix: SqlPlaygroundStoragePrefix;
  /** Construct a fresh engine for a sample database id. `workspaceId`
   *  optionally targets a persistent OPFS workspace; `onProgress` (0..1)
   *  reports WASM download progress. Engines may ignore either. */
  createEngine(
    sampleId: string,
    workspaceId?: string | null,
    onProgress?: (fraction: number) => void,
  ): Promise<TEngine>;
  /** Catalogue of sample databases the database-selector renders. */
  samples: readonly TSample[];
  /** Optional "blank" entry (Postgres and DuckDB expose this). */
  blankSample?: TSample;
  /** Default editor tabs opened on the first visit to a sample. */
  defaultTabsFor(sample: TSample): QueryTabSeed[];
}
