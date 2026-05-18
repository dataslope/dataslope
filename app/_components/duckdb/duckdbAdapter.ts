"use client";

// Concrete DuckDB implementation of `SqlEngineAdapter`. The DuckDB
// playground imports this and routes its engine factory / identity
// constants through it so the per-dialect surface lives in one place
// (Stage 3 scaffolding from the playground refactor plan).

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
  createEngine: (sampleId, workspaceId) => createDuckDbEngine(sampleId, workspaceId),
  samples: DUCKDB_SAMPLE_DATABASES,
  blankSample: DUCKDB_BLANK_DATABASE,
  defaultTabsFor: (sample) => sample.defaultTabs,
};
