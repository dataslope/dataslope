"use client";

// Concrete SQLite implementation of `SqlEngineAdapter`. The SQLite
// playground imports this and routes its engine factory / identity
// constants through it so the per-dialect surface lives in one place
// (Stage 3 scaffolding from the playground refactor plan).

import type { SqlEngineAdapter } from "./shared/engineAdapter";
import { createSqliteEngine, type SqliteEngine } from "../runtime/sqlite";
import {
  SQLITE_SAMPLE_DATABASES,
  type SqliteSampleDatabase,
} from "../runtime/sqliteSamples";

export const sqliteAdapter: SqlEngineAdapter<
  SqliteEngine,
  SqliteSampleDatabase
> = {
  dialect: "sqlite",
  playgroundId: "sqlite",
  // Legacy storage prefix kept verbatim so users' existing
  // localStorage state (tabs, settings, page sizes) is preserved.
  storagePrefix: "pg_sqlite_",
  createEngine: (sampleId) => createSqliteEngine(sampleId),
  samples: SQLITE_SAMPLE_DATABASES,
  defaultTabsFor: (sample) => sample.defaultTabs,
};
