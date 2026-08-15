"use client";

// Concrete SQLite implementation of `SqlEngineAdapter`; keeps the
// per-dialect surface in one place.

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
  storagePrefix: "playground_sqlite_",
  createEngine: (sampleId, workspaceId) => createSqliteEngine(sampleId, workspaceId),
  samples: SQLITE_SAMPLE_DATABASES,
  defaultTabsFor: (sample) => sample.defaultTabs,
};
