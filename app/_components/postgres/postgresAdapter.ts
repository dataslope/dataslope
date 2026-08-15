"use client";

// Concrete Postgres implementation of `SqlEngineAdapter`; keeps the
// per-dialect surface in one place.

import type { SqlEngineAdapter } from "../sql/shared/engineAdapter";
import { createPostgresEngine, type PostgresEngine } from "../runtime/postgres";
import {
  POSTGRES_BLANK_DATABASE,
  POSTGRES_SAMPLE_DATABASES,
  type PostgresSampleDatabase,
} from "../runtime/postgresSamples";

export const postgresAdapter: SqlEngineAdapter<
  PostgresEngine,
  PostgresSampleDatabase
> = {
  dialect: "postgres",
  playgroundId: "postgres",
  storagePrefix: "playground_postgres_",
  createEngine: (sampleId, workspaceId) => createPostgresEngine(sampleId, workspaceId),
  samples: POSTGRES_SAMPLE_DATABASES,
  blankSample: POSTGRES_BLANK_DATABASE,
  defaultTabsFor: (sample) => sample.defaultTabs,
};
