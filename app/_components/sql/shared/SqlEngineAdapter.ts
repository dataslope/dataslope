import type { Extension } from "@codemirror/state";
import type { QueryExecResult } from "sql.js";
import type { ComponentType, ReactNode } from "react";
import type {
  SqlCompletionSchema,
  SqlDialect,
} from "../sqlCompletion";

export interface SqlSampleTab {
  title: string;
  code: string;
}

export interface SqlSample {
  id: string;
  label: string;
  filename: string;
  defaultTabs?: readonly SqlSampleTab[];
  description?: string;
}

export interface SqlColumnInfo {
  name: string;
  type: string;
  notNull?: boolean;
  defaultValue?: string | null;
  pk?: number;
}

export interface SqlForeignKeyInfo {
  from: string;
  to_table: string;
  to_column: string;
  on_delete?: string;
  on_update?: string;
}

export interface SqlRunResult {
  sets: (QueryExecResult | null)[];
  elapsedMs: number;
  error?: string;
}

export interface SqlEntityRef {
  name: string;
  kind: "table" | "view" | "index" | "trigger";
  schema?: string;
}

export interface SqlEngineHandle {
  exec(sql: string): Promise<(QueryExecResult | null)[]>;
  execParams?(
    sql: string,
    params: readonly unknown[],
  ): Promise<(QueryExecResult | null)[]>;
  listTables(schema?: string): Promise<string[]>;
  listViews(schema?: string): Promise<string[]>;
  listIndexes(schema?: string): Promise<string[]>;
  listTriggers(schema?: string): Promise<string[]>;
  listColumns(name: string, schema?: string): Promise<SqlColumnInfo[]>;
  listForeignKeys(
    name: string,
    schema?: string,
  ): Promise<SqlForeignKeyInfo[]>;
  listSchemas?(showSystem: boolean): Promise<string[]>;
  destroy(): Promise<void> | void;
}

export interface SqlStructureDialogProps {
  engine: SqlEngineHandle | null;
  schema?: string;
  onClose: () => void;
  onChanged: () => void;
}

export interface SqlEngineAdapter {
  dialect: SqlDialect;
  displayName: string;
  storagePrefix: string;
  defaultPageSize: number;

  createEngine(sampleId: string): Promise<SqlEngineHandle>;
  listSamples(): readonly SqlSample[];
  findSample(id: string): SqlSample | undefined;

  quoteIdent(name: string): string;
  supportsSchemas: boolean;
  supportsPragmas: boolean;

  initialCompletionSchema?: SqlCompletionSchema;
  editorExtensions?: readonly Extension[];
  extraSettingsItems?: ReactNode;
  afterEngineCreated?(engine: SqlEngineHandle): Promise<void> | void;
  renderAddTableDialog?: ComponentType<SqlStructureDialogProps>;
  renderModifyStructureDrawer?: ComponentType<SqlStructureDialogProps>;
}
