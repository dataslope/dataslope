"use client";

// Concrete DuckDB implementation of `SqlEngineAdapter`; keeps the
// per-dialect surface in one place.

import type { SqlEngineAdapter } from "../sql/shared/engineAdapter";
import { createDuckDbEngine, type DuckDbEngine } from "../runtime/duckdb";
import {
  DUCKDB_BLANK_DATABASE,
  DUCKDB_SAMPLE_DATABASES,
  type DuckDbSampleDatabase,
} from "../runtime/duckdbSamples";

export const duckdbAdapter: SqlEngineAdapter<
  DuckDbEngine,
  DuckDbSampleDatabase
> = {
  dialect: "duckdb",
  playgroundId: "duckdb",
  storagePrefix: "duckdb_",
  createEngine: (sampleId, workspaceId, onProgress) =>
    createDuckDbEngine(sampleId, workspaceId, onProgress),
  samples: DUCKDB_SAMPLE_DATABASES,
  blankSample: DUCKDB_BLANK_DATABASE,
  defaultTabsFor: (sample) => sample.defaultTabs,
};
