"use client";

// Concrete Postgres implementation of `SqlEngineAdapter`. The Postgres
// playground imports this and routes its engine factory / identity
// constants through it so the per-dialect surface lives in one place
// (Stage 3 scaffolding from the playground refactor plan).

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
  storagePrefix: "pg_postgres_",
  createEngine: (sampleId, workspaceId) => createPostgresEngine(sampleId, workspaceId),
  samples: POSTGRES_SAMPLE_DATABASES,
  blankSample: POSTGRES_BLANK_DATABASE,
  defaultTabsFor: (sample) => sample.defaultTabs,
};
