"use client";

import { createSchemaSettingsStore } from "../../sql/stores/createSchemaSettingsStore";

// DuckDB settings store (shared implementation in createSchemaSettingsStore).
// Intentionally no SQLite-style PRAGMA tab: DuckDB exposes runtime knobs via
// SET statements users can run from any query tab.
export const useDuckDbSettingsStore = createSchemaSettingsStore();

export type { SchemaSettingsState as DuckDbSettingsState } from "../../sql/stores/createSchemaSettingsStore";
