"use client";

import { createSchemaSettingsStore } from "../../sql/stores/createSchemaSettingsStore";

export const usePostgresSettingsStore = createSchemaSettingsStore();

export type { SchemaSettingsState as PostgresSettingsState } from "../../sql/stores/createSchemaSettingsStore";
