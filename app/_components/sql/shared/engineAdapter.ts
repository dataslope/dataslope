"use client";

// Stage 3 (Decompose) — engine adapter contract shared by the three
// SQL playground shells (SQLite / Postgres / DuckDB).
//
// The full Stage 3 plan is to migrate the three ~5–6 kLOC playground
// monoliths onto a single `SqlPlaygroundShell` that owns the tab bar,
// schema sidebar, results pane, editor and dialogs, and only the
// dialect-specific surface (engine factory, sample catalogue, CSV /
// Parquet importer, settings store) lives in a per-dialect adapter
// behind this interface.
//
// The audit report explicitly gates the actual code migration as the
// "largest, riskiest stage" with a staged rollout (SQLite first, then
// Postgres, then DuckDB), and our hard constraint here is that the
// three playgrounds remain visually and functionally identical to
// users. Codifying the contract here unblocks that incremental
// migration without forcing a single-pass rewrite of 16 kLOC.

import type { SqlDialect } from "../sqlCompletion";
import type {
  QueryTabSeed,
  SqlSampleDatabaseBase,
} from "../../runtime/sqlSamples";

/** A storage namespace each playground uses for `localStorage` keys
 *  (e.g. `"duckdb_"`, `"playground_postgres_"`, `"sqlite:"`). The shell uses
 *  it for tab/settings persistence so per-dialect state never
 *  collides. */
export type SqlPlaygroundStoragePrefix = string;

/** Bare-minimum SQL engine surface the shell needs in order to run a
 *  query and refresh the schema sidebar. Each per-dialect engine
 *  (`SqliteEngine`, `PostgresEngine`, `DuckDbEngine`) already exposes
 *  these, plus a much larger dialect-specific API used by structure
 *  drawers and importers. */
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
  /** Display id (`"sqlite" | "postgres" | "duckdb"`) used for stable
   *  per-playground references (icons, tab routes, runtime info). */
  playgroundId: "sqlite" | "postgres" | "duckdb";
  /** Prefix for any `localStorage` keys the shell writes (tabs,
   *  settings, sidebar widths). */
  storagePrefix: SqlPlaygroundStoragePrefix;
  /** Construct a fresh engine bound to a given sample database id.
   *  `workspaceId` optionally targets a persistent OPFS-backed
   *  workspace; engines that don't support persistence may ignore it. */
  createEngine(sampleId: string, workspaceId?: string | null): Promise<TEngine>;
  /** Catalogue of sample databases the database-selector renders. */
  samples: readonly TSample[];
  /** Optional "empty" / "blank" entry. Postgres and DuckDB expose
   *  this; SQLite currently doesn't because the credit-card sample is
   *  always loaded fresh. */
  blankSample?: TSample;
  /** Default editor tabs opened on the first visit to a sample. */
  defaultTabsFor(sample: TSample): QueryTabSeed[];
}
