"use client";

import { createSchemaSettingsStore } from "../../sql/stores/createSchemaSettingsStore";

// DuckDB settings store. The general appearance settings (font size,
// theme, word wrap, clear before run) plus a system-schemas toggle
// are universal across the schema-aware SQL playgrounds, so the
// implementation lives in `sql/stores/createSchemaSettingsStore`. The
// DuckDB playground intentionally has no SQLite-style PRAGMA tab,
// DuckDB exposes runtime knobs through SET statements
// (`SET threads = N`, `SET memory_limit = '512MB'`,
// `SET TimeZone = 'UTC'`) that users can run from any query tab.
export const useDuckDbSettingsStore = createSchemaSettingsStore();

export type { SchemaSettingsState as DuckDbSettingsState } from "../../sql/stores/createSchemaSettingsStore";
