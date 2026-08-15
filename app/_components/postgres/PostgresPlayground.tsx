"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import type { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  createSqlEditorExtensions,
  makeSqlAutocompletionExtension,
  makeSqlEditorCompartments,
  makeSqlLangExtension,
} from "../sql/shared/editorSetup";
import { Combobox } from "@base-ui/react/combobox";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import { Switch } from "@base-ui/react/switch";
import { Toast } from "@base-ui/react/toast";
import {
  ArrowDownToLine,
  Share2,
  ArrowUpFromLine,
  FolderOpen,
  Info,
  ChevronDown,
  Columns3,
  Database,
  DatabasePlus,
  FilePlus,
  FileJson,
  FileText,
  GripVertical,
  History,
  Layers,
  Network,
  Pencil,
  Plus,
  Table,
  Trash2,
  TriangleAlert,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
  useSyncExternalStore,
} from "react";
import "../playground.css";
import "../sqlPlayground.css";
import dynamic from "next/dynamic";

// ErDiagramPane pulls in @xyflow/react + elkjs (~hundreds of KB); defer the
// chunk until the ER-diagram tab opens.
const ErDiagramPane = dynamic(
  () => import("../ErDiagramPane").then((m) => m.ErDiagramPane),
  { ssr: false, loading: ErDiagramLoadingFallback },
);
import { themeFor } from "../cmExtensions";
import {
  applyMode,
  applyThemePalette,
  clearThemePalette,
  getStoredEditorTheme,
  setStoredEditorTheme,
} from "../playgroundTheme";
import { usePlaygroundThemeSync } from "../playgroundThemeSync";
import {
  DataslopeRunOverlay,
  DEFAULT_PLAYGROUND_SETTINGS,
  ErDiagramLoadingFallback,
  RuntimeInfoContent,
  detectIsMac,
} from "../playgroundShared";
import { DiamondRippleLoader } from "../mdx/loadingAnimations";
import {
  SqlSettingsPanelContent,
} from "../sql/components/SqlSettingsPanel";
import { SqlSettingsConfirmDialogs } from "../sql/components/SqlSettingsConfirmDialogs";
import { DdlViewerDialog } from "../sql/components/DdlViewerDialog";
import { SwitchDatabaseDialog } from "../sql/components/SwitchDatabaseDialog";
import {
  topoSortByForeignKeys,
  formatSqlDumpValue,
} from "../sql/utils/exportOrder";
import { AddRowDialog } from "../sql/components/AddRowDialog";
import { SqlPlaygroundShell } from "../sql/components/SqlPlaygroundShell";
import { SchemaActionDialogs } from "../sql/components/SchemaActionDialogs";
import { ImportSqlDumpDialog } from "../sql/components/ImportSqlDumpDialog";
import { SqlEditorToolbar } from "../sql/components/SqlEditorToolbar";
import { RenameDatabaseDialog } from "../sql/components/RenameDatabaseDialog";
import { findPostgresSampleDatabase } from "../runtime/postgresSamples";
import { postgresAdapter } from "./postgresAdapter";
import {
  ensureActiveWorkspace,
  saveDraftWorkspace,
  setActiveWorkspaceId,
  switchActiveWorkspace,
} from "../opfs/activeWorkspace";
import { acquireWorkspaceLock, createWorkspace } from "../opfs/workspace";
import { copyConflictedWorkspace } from "../opfs/copyConflictedWorkspace";
import { WorkspaceBadge } from "../workspace/WorkspaceBadge";
import { ShareControls } from "../cloud/ShareControls";
import {
  HeaderDivider,
  MobileMoreSections,
  MobileSaveMenu,
  MoreMenu,
  SaveControl,
  NewWorkspaceControl,
  WorkspaceNameControl,
  useAccountMenuSection,
  type MoreMenuSection,
} from "../PlaygroundHeaderControls";
import { applyEntryFocus } from "../playgroundEntryFocus";
import {
  bundleTabSeeds,
  fetchBundleByRef,
  takePendingBundleRef,
} from "../cloud/materialize";
import {
  sqlTabsForBundle,
  type BuildBundle,
} from "@/lib/workspaces/types";
import { MobileMenuAction, MobileMenuLabel } from "../MobileMenuSheet";
import { type PgEntityKind, type PostgresEngine } from "../runtime/postgres";

const POSTGRES_SAMPLE_DATABASES = postgresAdapter.samples;
const POSTGRES_BLANK_DATABASE = postgresAdapter.blankSample!;
import type { ForeignKeyInfo, TableColumnInfo } from "../runtime/sqlite";
import type { QueryExecResult } from "../runtime/sqlite-wasm";
import type { QueryTab } from "../sqlitePlaygroundTabs";
import { newTabId } from "../sqlitePlaygroundTabs";
import {
  createTabStorage,
} from "../sql/shared/tabStorageUtils";
import { tabsForAdoptedScope } from "../sql/shared/tabScope";
import { readQueryLog, restoreQueryLog } from "../sql/utils/queryLogBundle";
import { SqlTabBar } from "../sql/components/SqlTabBar";
import { SETTINGS_TAB_ID } from "../playgroundTabs";
import type { TabDescriptor } from "../tabs/tabTypes";
import { Settings as SettingsIcon } from "lucide-react";
import { ResultView } from "../sql/components/ResultView";
import { SchemaItem } from "../sql/components/SchemaItem";
import { SchemaLeafItem } from "../sql/components/SchemaLeafItem";
import { SchemaSection } from "../sql/components/SchemaSection";
import { CreateIndexDialog } from "../sql/components/CreateIndexDialog";
import { CreateViewDialog } from "../sql/components/CreateViewDialog";
import { ExplainPlanDialog } from "../sql/components/ExplainPlanDialog";
import {
  buildExplainSql,
  formatExplainResult,
  type ExplainOptions,
} from "../sql/utils/explain";
import { activeSqlForEditor } from "../sql/utils/editorUtils";
import {
  DatabaseSelector,
  type DatabaseSelectorAction,
} from "../sql/components/DatabaseSelector";
import { SqlIconSidebar } from "../sql/components/SqlIconSidebar";
import { GenExprEditor } from "../sql/components/GenExprEditor";
import { ToastList } from "../sql/components/ToastList";
import { ColumnFlag } from "../sql/components/ModifyStructureForm";
import { FkCombobox } from "../sql/components/StructureCombobox";
import { StructureTableHeader } from "../sql/components/StructureTableHeader";
import { QueryHistoryPane } from "../sql/components/QueryHistoryPane";
import { useQueryHistory } from "../sql/hooks/useQueryHistory";
import {
  exportResultToCsv,
  exportResultToJson,
  exportResultToParquet,
  exportResultToSql,
  exportResultToXlsx,
  initXlsxWasm,
  toExcelData,
  toFileSafeName,
  triggerDownload,
} from "../sql/utils/exportUtils";
import {
  isSingleSelectSql,
  hasLimitClause,
  stripSqlComments,
  bareTableSelectSource,
  bareTableSelectSources,
  splitSqlStatements,
  statementAtCursor,
} from "../sql/utils/sqlAnalysis";
import { computeImportColComparison } from "../sql/utils/importUtils";
import { IMPORT_COL_STATUS_LABEL } from "../sql/constants";
import {
  ensurePersistUnloadFlush,
  persistAsync,
} from "../sql/utils/persistedStorage";
import { pushTabHistory } from "../sql/utils/tabUtils";
import { enumHintsFromColumns } from "../sql/utils/cellEditing";
import { useSqlTabManagement } from "../sql/hooks/useSqlTabManagement";
import { useViewDataTabAutoRun } from "../sql/hooks/useViewDataTabAutoRun";
import { useSchemaTree } from "../sql/hooks/useSchemaTree";
import type {
  AddRowDialogState,
  ColumnKeyHints,
  CsvImportState,
  JsonImportState,
  ParquetImportState,
  QueryRunResult,
  ResultSetExportScope,
  ResultSetExportSnapshot,
} from "../sql/types";
import type { RuntimeInfo } from "../types";
import type { SqlCompletionSchema } from "../sql/sqlCompletion";
import { useAskAiSource } from "../ai/contextRegistry";
import { describeSqlSurface } from "../ai/widgetSnapshots";
import { formatSqlSchemaText } from "../ai/sqlSchemaText";
import { usePostgresSettingsStore } from "./stores/usePostgresSettingsStore";
import {
  importRowsIntoPostgres,
  parseCsv,
  inferCsvColumnTypes,
  readParquetFile,
  tableNameFromFilename,
} from "./postgresImport";
import { FK_ACTIONS } from "../sql/constants";
import { computeVisibleTypeGroups } from "../sql/utils/columnTypeSelector";

const PLAYGROUND_ID = postgresAdapter.playgroundId;
const STORAGE_PREFIX = postgresAdapter.storagePrefix;
const { dbScopedKey, loadTabs, saveTabs, setWorkspaceScope, copyScopedKeys } =
  createTabStorage(STORAGE_PREFIX, PLAYGROUND_ID);

const POSTGRES_DB_ACTIONS: readonly DatabaseSelectorAction[] = [
  {
    id: "__new_db__",
    icon: <FilePlus size={14} />,
    label: "New Database",
    description: "Create a blank database",
  },
  {
    id: "__import_sql_dump__",
    icon: <Upload size={14} />,
    label: "Import SQL Dump",
    description: "Open a SQL dump file",
  },
  {
    id: "__rename_db__",
    icon: <Pencil size={14} />,
    label: "Rename Current Database",
    description: "Change the display name",
  },
];
const MAX_EXCEL_SHEET_NAME_LENGTH = 31;
const INFINITE_SCROLL_PAGE_SIZE = 500;
/** Types offered per column when a CSV/JSON import creates the table. Kept in
 *  step with the allowlist `importRowsIntoPostgres` enforces. */
const IMPORT_TYPE_CHOICES = [
  "text",
  "bigint",
  "integer",
  "double precision",
  "numeric",
  "boolean",
  "date",
  "timestamptz",
  "uuid",
  "jsonb",
] as const;
// Minimum time (ms) the "running" overlay is shown so the 180ms CSS
// transition can complete and be clearly visible to the user.
const MIN_ANIMATION_MS = 300;

// ─── Postgres structure drawer types ────────────────────────────────────

interface PgStructureColumn {
  id: string;
  /** Existing columns keep their pre-edit name; new unsaved columns use null. */
  originalName: string | null;
  name: string;
  type: string;
  nullable: boolean;
  /** Raw SQL default expression; an empty string means no DEFAULT clause. */
  defaultValue: string;
  isPk: boolean;
  unique: boolean;
  autoIncrement: boolean;
  fkTable: string;
  fkColumn: string;
  fkOnDelete: string;
  fkOnUpdate: string;
  /** Non-null when this is a generated column. `expression` may be edited;
   *  `originalExpression` records the pre-edit value for change detection.
   *  PostgreSQL only supports STORED generated columns. */
  generated: {
    expression: string;
    originalExpression: string;
  } | null;
}

interface PgStructureDialogState {
  tableName: string;
  newTableName: string;
  columns: PgStructureColumn[];
  originalSignature: string;
}

let _pgStructureIdCounter = 0;
function newPgStructureId(): string {
  return `pgc_${++_pgStructureIdCounter}`;
}

const PG_TYPE_GROUPS = [
  {
    label: "Numbers",
    types: [
      "smallint",
      "integer",
      "bigint",
      "serial",
      "bigserial",
      "numeric",
      "decimal",
      "real",
      "double precision",
    ],
  },
  {
    label: "Text",
    types: ["text", "varchar", "varchar(255)", "char", "char(1)"],
  },
  { label: "Boolean / identifiers", types: ["boolean", "uuid"] },
  { label: "JSON", types: ["json", "jsonb"] },
  {
    label: "Date / time",
    types: ["date", "time", "timestamp", "timestamptz", "interval"],
  },
  { label: "Binary", types: ["bytea"] },
  {
    label: "Arrays / extensions",
    types: ["text[]", "integer[]", "uuid[]", "geometry", "geography"],
  },
] as const;

const PG_TYPE_OPTIONS: readonly string[] = PG_TYPE_GROUPS.flatMap(
  (group) => group.types,
);
const PG_SERIAL_TYPES = new Set(["serial", "bigserial", "smallserial"]);
// Accepts common PostgreSQL type text, including multi-word types,
// parameterized types such as varchar(255), and array suffixes.
const PG_TYPE_VALIDATION_REGEX =
  /^[A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*(?:\s*\([^()]*\))?(?:\s*\[\s*\])*$/;

function normalizePgFkAction(action: string | undefined): string {
  const normalized = (action || "NO ACTION").trim().toUpperCase();
  return FK_ACTIONS.includes(normalized as (typeof FK_ACTIONS)[number])
    ? normalized
    : "NO ACTION";
}

function isPgSerialType(type: string): boolean {
  return PG_SERIAL_TYPES.has(type.trim().toLowerCase());
}

function pgStructureSignature(
  state: Pick<PgStructureDialogState, "newTableName" | "columns">,
): string {
  return JSON.stringify({
    table: state.newTableName.trim(),
    columns: state.columns.map((c) => ({
      originalName: c.originalName,
      name: c.name.trim(),
      type: c.type.trim(),
      nullable: c.nullable,
      defaultValue: c.defaultValue.trim(),
      isPk: c.isPk,
      unique: c.unique,
      autoIncrement: c.autoIncrement,
      fkTable: c.fkTable,
      fkColumn: c.fkColumn,
      fkOnDelete: normalizePgFkAction(c.fkOnDelete),
      fkOnUpdate: normalizePgFkAction(c.fkOnUpdate),
      generated: c.generated
        ? { expression: c.generated.expression.trim() }
        : null,
    })),
  });
}

function validatePgStructure(
  state: PgStructureDialogState | null,
  tableColumns: Record<string, TableColumnInfo[]>,
) {
  const invalidColumnIds = new Set<string>();
  const errors: string[] = [];
  let hasTableNameError = false;
  if (!state)
    return {
      invalidColumnIds,
      errors,
      hasTableNameError,
      isValid: false,
      isDirty: false,
    };
  const tableName = state.newTableName.trim();
  const identifierRe = /^[A-Za-z_][A-Za-z0-9_]*$/;
  if (!tableName) {
    errors.push("Table name cannot be empty.");
    hasTableNameError = true;
  } else if (!identifierRe.test(tableName)) {
    errors.push("Table name must be a valid unquoted PostgreSQL identifier.");
    hasTableNameError = true;
  }
  const seen = new Map<string, string>();
  for (const col of state.columns) {
    if (col.generated) {
      if (!col.generated.expression.trim()) {
        errors.push(
          `Generated column "${col.name || col.originalName || "unnamed"}" needs an expression.`,
        );
        invalidColumnIds.add(col.id);
      }
      continue;
    }
    const name = col.name.trim();
    const lower = name.toLowerCase();
    if (!name) {
      errors.push("Column names cannot be empty.");
      invalidColumnIds.add(col.id);
    } else if (!identifierRe.test(name)) {
      errors.push(`"${name}" is not a valid unquoted PostgreSQL identifier.`);
      invalidColumnIds.add(col.id);
    } else if (seen.has(lower)) {
      errors.push(`Duplicate column name "${name}".`);
      invalidColumnIds.add(col.id);
      invalidColumnIds.add(seen.get(lower)!);
    } else {
      seen.set(lower, col.id);
    }
    const type = col.type.trim();
    if (!type || !PG_TYPE_VALIDATION_REGEX.test(type)) {
      errors.push(`"${name || "Unnamed column"}" has an invalid type.`);
      invalidColumnIds.add(col.id);
    }
    if (
      col.autoIncrement &&
      !/^(smallint|integer|bigint|smallserial|serial|bigserial)$/i.test(type)
    ) {
      errors.push(
        `"${name || "Unnamed column"}" must use an integer/serial type for identity/serial.`,
      );
      invalidColumnIds.add(col.id);
    }
    if ((col.fkTable && !col.fkColumn) || (!col.fkTable && col.fkColumn)) {
      errors.push(
        `"${name || "Unnamed column"}" has an incomplete foreign key.`,
      );
      invalidColumnIds.add(col.id);
    }
    if (col.fkTable && col.fkColumn) {
      const targetColumns = tableColumns[col.fkTable] ?? [];
      if (!targetColumns.some((target) => target.name === col.fkColumn)) {
        errors.push(
          `"${name || "Unnamed column"}" references a missing foreign key column.`,
        );
        invalidColumnIds.add(col.id);
      }
    }
  }
  return {
    invalidColumnIds,
    errors: Array.from(new Set(errors)),
    hasTableNameError,
    isValid: errors.length === 0,
    isDirty: pgStructureSignature(state) !== state.originalSignature,
  };
}

function makeNewPgColumn(): PgStructureColumn {
  return {
    id: newPgStructureId(),
    originalName: null,
    name: "",
    type: "text",
    nullable: true,
    defaultValue: "",
    isPk: false,
    unique: false,
    autoIncrement: false,
    fkTable: "",
    fkColumn: "",
    fkOnDelete: "NO ACTION",
    fkOnUpdate: "NO ACTION",
    generated: null,
  };
}

function PgTypeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [inputVal, setInputVal] = useState(value);
  // Whether the user is editing right now. Base UI's Combobox clears its
  // input when it closes with no list item selected — which is *always* the
  // case for a custom type like `numeric(10,2)`, since that matches no group
  // entry. The value was still applied, but the field went back to showing
  // its placeholder, so the user could not see what would be created.
  const focusedRef = useRef(false);
  // The committed type, readable synchronously: the `value` prop in this
  // closure is one render stale during the blur that commits a new one, and
  // guarding against the reset with the stale value would restore the old
  // type. (This used to be a 100ms timer, which raced with Base UI's reset.)
  const committedRef = useRef(value);

  // Sync inputVal when the committed value changes externally (e.g. a
  // different column row is selected) but never mid-edit.
  useEffect(() => {
    committedRef.current = value;
    if (!focusedRef.current) setInputVal(value);
  }, [value]);

  // Show every group while the field is empty or still holds the committed
  // type; only filter once the user types a partial that isn't a known type.
  const visibleGroups = useMemo(
    () =>
      computeVisibleTypeGroups(PG_TYPE_GROUPS, PG_TYPE_OPTIONS, inputVal, value),
    [inputVal, value],
  );

  return (
    <Combobox.Root
      value={PG_TYPE_OPTIONS.includes(inputVal) ? inputVal : null}
      onValueChange={(newValue) => {
        if (newValue) {
          const v = newValue as string;
          committedRef.current = v;
          setInputVal(v);
          onChange(v);
        }
      }}
      inputValue={inputVal}
      onInputValueChange={(v) => {
        // Outside of active editing the committed type wins over the
        // Combobox's close-time reset to "".
        if (!focusedRef.current && v === "" && committedRef.current !== "") {
          setInputVal(committedRef.current);
          return;
        }
        setInputVal(v);
      }}
      filter={null}
      openOnInputClick
      autoHighlight
    >
      <div className="playground-type-input-group">
        <Combobox.Input
          className="sql-rename-input sql-modify-col-type playground-type-input"
          placeholder="e.g. varchar(255)"
          aria-label="Column type"
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            const typed = inputVal.trim();
            let finalVal: string;
            if (
              PG_TYPE_OPTIONS.includes(value) &&
              !PG_TYPE_OPTIONS.includes(typed) &&
              !PG_TYPE_VALIDATION_REGEX.test(typed)
            ) {
              // Original was a known type; typed value is neither a known type
              // nor a valid custom type (e.g. varchar(255)) → revert.
              finalVal = value;
            } else {
              finalVal = typed || value;
              if (finalVal !== value) onChange(finalVal);
            }
            committedRef.current = finalVal;
            setInputVal(finalVal);
          }}
        />
        <Combobox.Trigger
          className="playground-type-trigger"
          aria-label="Open type list"
        >
          <ChevronDown size={14} />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          align="start"
          className="playground-type-positioner"
        >
          <Combobox.Popup className="bui-select-popup playground-type-popup">
            <Combobox.List>
              {visibleGroups.map((group) => (
                <Combobox.Group key={group.label} className="playground-type-group">
                  <Combobox.GroupLabel className="playground-type-group-label">
                    {group.label}
                  </Combobox.GroupLabel>
                  {group.types.map((type) => (
                    <Combobox.Item
                      key={type}
                      value={type}
                      className="bui-select-item"
                    >
                      {type}
                    </Combobox.Item>
                  ))}
                </Combobox.Group>
              ))}
              {visibleGroups.length === 0 && (
                <div className="playground-type-empty">
                  No matching built-in types. You can keep the typed value.
                </div>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function PgStructureColumnRow({
  col,
  onChange,
  onRemove,
  hasError,
  onBlurName,
  knownTables,
  columnsByTable,
}: {
  col: PgStructureColumn;
  onChange: (patch: Partial<PgStructureColumn>) => void;
  onRemove: () => void;
  hasError?: boolean;
  onBlurName?: () => void;
  knownTables: string[];
  columnsByTable: Record<string, TableColumnInfo[]>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const style: React.CSSProperties = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 1 : undefined,
  };
  // A foreign key can only reference a primary-key or UNIQUE column; offering
  // the rest just leads to "there is no unique constraint matching the given
  // keys" at save time. If the target's uniqueness isn't known (an engine that
  // doesn't report it), fall back to the full list rather than an empty one.
  const allFkTargetColumns = col.fkTable
    ? (columnsByTable[col.fkTable] ?? [])
    : [];
  const uniqueFkTargets = allFkTargetColumns.filter(
    (target) => target.pk > 0 || target.unique === true,
  );
  const fkTargetColumns =
    uniqueFkTargets.length > 0 ? uniqueFkTargets : allFkTargetColumns;
  const serialType = isPgSerialType(col.type);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="sql-modify-col-row"
      {...attributes}
    >
      <td className="sql-modify-drag-cell">
        <span
          className="sql-modify-drag-handle"
          title="Drag to reorder"
          {...listeners}
        >
          <GripVertical size={14} aria-hidden="true" />
        </span>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <input
            className={`sql-rename-input sql-modify-col-name${hasError ? " sql-modify-col-name-error" : ""}`}
            value={col.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={onBlurName}
            placeholder="column name"
            aria-label="Column name"
            data-col-id={col.id}
          />
        </label>
      </td>
      <td>
        <PgTypeSelector
          value={col.type}
          onChange={(type) => onChange({ type })}
        />
      </td>
      <td>
        <ColumnFlag
          checked={!col.nullable}
          onChange={(notNull) => onChange({ nullable: !notNull })}
          label="Not null"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.isPk}
          onChange={(isPk) => onChange({ isPk })}
          label="Primary key"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.unique}
          onChange={(unique) => onChange({ unique })}
          label="Unique"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.autoIncrement || serialType}
          onChange={(autoIncrement) => onChange({ autoIncrement })}
          label="Identity / serial"
          showLabel={false}
        />
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <input
            className="sql-rename-input sql-modify-col-default"
            value={col.defaultValue}
            onChange={(e) => onChange({ defaultValue: e.target.value })}
            placeholder="e.g. now() or 0"
            aria-label="Default value"
            disabled={col.autoIncrement || serialType}
          />
        </label>
      </td>
      <td>
        <FkCombobox
          value={col.fkTable}
          onChange={(fkTable) => onChange({ fkTable, fkColumn: "" })}
          options={knownTables}
          placeholder="(none)"
          ariaLabel="Foreign key target table"        />
      </td>
      <td>
        <FkCombobox
          value={col.fkColumn}
          onChange={(fkColumn) => onChange({ fkColumn })}
          options={fkTargetColumns.map((target) => target.name)}
          placeholder="(column)"
          ariaLabel="Foreign key target column"          disabled={!col.fkTable}
        />
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-cascade"
            value={col.fkOnDelete}
            onChange={(e) => onChange({ fkOnDelete: e.target.value })}
            aria-label="On delete action"
            disabled={!col.fkTable}
          >
            {FK_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-cascade"
            value={col.fkOnUpdate}
            onChange={(e) => onChange({ fkOnUpdate: e.target.value })}
            aria-label="On update action"
            disabled={!col.fkTable}
          >
            {FK_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <button
          type="button"
          className="sql-modify-col-remove"
          onClick={onRemove}
          aria-label={`Remove column ${col.name || "unnamed column"}`}
          title="Remove column"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

/** Row for a generated column inside the Postgres structure drawer.
 *  PostgreSQL only supports STORED generated columns, so there is no
 *  storage-type selector, only the expression is editable. */
function PgGeneratedColumnRow({
  col,
  onExpressionChange,
  onRemove,
  theme,
}: {
  col: PgStructureColumn;
  onExpressionChange: (id: string, expression: string) => void;
  onRemove: (id: string) => void;
  theme: string;
}) {
  const gen = col.generated!;
  return (
    <tr className="sql-modify-col-row sql-modify-gen-row">
      <td>
        <div className="sql-modify-gen-name">
          <span
            className="sql-modify-gen-name-text"
            title={col.originalName ?? col.name}
          >
            {col.originalName ?? col.name}
          </span>
        </div>
      </td>
      <td className="sql-modify-gen-storage-cell">
        <span className="sql-modify-col-type-badge">{col.type || "—"}</span>
      </td>
      <td className="sql-modify-gen-expr-cell">
        <GenExprEditor
          value={gen.expression}
          onChange={(expression) => onExpressionChange(col.id, expression)}
          placeholder="e.g. price * quantity"
          ariaLabel={`Generation expression for ${col.originalName}`}
          isPostgres
          theme={theme}
        />
      </td>
      <td className="sql-modify-gen-storage-cell">
        <span className="sql-modify-col-type-badge">Stored</span>
      </td>
      <td>
        <button
          type="button"
          className="sql-modify-col-remove"
          onClick={() => onRemove(col.id)}
          aria-label={`Remove generated column ${col.originalName ?? col.name}`}
          title="Remove column"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

const storageKey = (key: string) => `${STORAGE_PREFIX}${key}`;
const DEFAULT_PAGE_SIZE = 50;

const RUNTIME_INFO: RuntimeInfo = {
  language: "PostgreSQL",
  version: "17",
  engine: "PGlite 0.4.5",
  engineUrl: "https://pglite.dev/",
  notes:
    "Pure-WASM build of PostgreSQL that runs entirely in your browser. Each sample database is rebuilt in memory on every page load.",
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

type ImportFlavor = "csv" | "json" | "parquet";

function PostgresPlaygroundInner() {
  useEffect(() => {
    ensurePersistUnloadFlush();
  }, []);
  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (title: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        // Failures ("warn") linger longer than transient "info" notices.
        toastManager.add({
          title,
          data: { kind },
          timeout: kind === "warn" ? 8000 : undefined,
        });
      });
    },
    [toastManager],
  );

  // ─── Settings store ───────────────────────────────────────────────────
  const fontSize = usePostgresSettingsStore((s) => s.fontSize);
  const setFontSizeState = usePostgresSettingsStore((s) => s.setFontSize);
  const outputFontSizeEnabled = usePostgresSettingsStore(
    (s) => s.outputFontSizeEnabled,
  );
  const setOutputFontSizeEnabledState = usePostgresSettingsStore(
    (s) => s.setOutputFontSizeEnabled,
  );
  const outputFontSize = usePostgresSettingsStore((s) => s.outputFontSize);
  const setOutputFontSizeState = usePostgresSettingsStore(
    (s) => s.setOutputFontSize,
  );
  const editorTheme = usePostgresSettingsStore((s) => s.editorTheme);
  const setEditorThemeState = usePostgresSettingsStore((s) => s.setEditorTheme);
  const wordWrap = usePostgresSettingsStore((s) => s.wordWrap);
  const setWordWrapState = usePostgresSettingsStore((s) => s.setWordWrap);
  const clearBeforeRun = usePostgresSettingsStore((s) => s.clearBeforeRun);
  const setClearBeforeRunState = usePostgresSettingsStore(
    (s) => s.setClearBeforeRun,
  );
  const showSystemSchemas = usePostgresSettingsStore((s) => s.showSystemSchemas);
  const setShowSystemSchemasState = usePostgresSettingsStore(
    (s) => s.setShowSystemSchemas,
  );

  const setFontSize = useCallback(
    (n: number) => {
      setFontSizeState(n);
      persistAsync(storageKey("fontsize"), String(n));
    },
    [setFontSizeState],
  );
  const setOutputFontSizeEnabled = useCallback(
    (b: boolean) => {
      setOutputFontSizeEnabledState(b);
      persistAsync(storageKey("outputfontsize_enabled"), String(b));
    },
    [setOutputFontSizeEnabledState],
  );
  const setOutputFontSize = useCallback(
    (n: number) => {
      setOutputFontSizeState(n);
      persistAsync(storageKey("outputfontsize"), String(n));
    },
    [setOutputFontSizeState],
  );
  const setEditorTheme = useCallback(
    (theme: string) => {
      setEditorThemeState(theme);
      setStoredEditorTheme(theme);
    },
    [setEditorThemeState],
  );
  // Follow the site-wide light/dark choice (shared with the home page + /learn).
  usePlaygroundThemeSync(setEditorTheme);
  const setWordWrap = useCallback(
    (b: boolean) => {
      setWordWrapState(b);
      persistAsync(storageKey("wordwrap"), String(b));
    },
    [setWordWrapState],
  );
  const setClearBeforeRun = useCallback(
    (b: boolean) => {
      setClearBeforeRunState(b);
      persistAsync(storageKey("clearbeforerun"), String(b));
    },
    [setClearBeforeRunState],
  );

  // ─── Engine / UI state ───────────────────────────────────────────────
  const initialDbId =
    typeof window === "undefined"
      ? POSTGRES_SAMPLE_DATABASES[0].id
      : (localStorage.getItem(storageKey("db")) ??
        POSTGRES_SAMPLE_DATABASES[0].id);
  const [activeDbId, setActiveDbId] = useState(initialDbId);
  const [tabs, setTabs] = useState<QueryTab[]>(() =>
    loadTabs(initialDbId, findPostgresSampleDatabase(initialDbId).defaultTabs),
  );
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? "");
  const [resultsByTab, setResultsByTab] = useState<
    Record<string, QueryRunResult | null>
  >({});
  // Synchronous view of the same map, so a mutation handler can find which
  // open tabs show the table it just changed without depending on it (and
  // re-creating every callback on each new result).
  const resultsByTabRef = useRef(resultsByTab);
  useEffect(() => {
    resultsByTabRef.current = resultsByTab;
  }, [resultsByTab]);
  const [loaded, setLoaded] = useState(false);
  // True when this workspace is already open (locked) in another tab, so
  // the shell shows a conflict overlay instead of deadlocking on boot.
  const [workspaceConflict, setWorkspaceConflict] = useState(false);
  // The conflicted workspace, so the overlay can offer a copy of it. A ref:
  // no render depends on the value.
  const conflictWorkspaceRef = useRef<{ id: string; name: string } | null>(null);
  const [conflictCopyBusy, setConflictCopyBusy] = useState(false);
  const [conflictCopyError, setConflictCopyError] = useState<string | null>(
    null,
  );
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading PostgreSQL engine…",
  );
  const [activeWorkspace, setActiveWorkspace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // False for the auto-created draft workspace (kept out of the saved list
  // until the user saves it). Drives the Save affordance in the badge.
  const [workspaceSaved, setWorkspaceSaved] = useState(true);
  const [indexesExpanded, setIndexesExpanded] = useState(true);
  const [viewsExpanded, setViewsExpanded] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [triggersExpanded, setTriggersExpanded] = useState(true);
  // Collapsed by default: most databases have neither, and a serial column's
  // sequence is an implementation detail the user did not create by hand.
  const [sequencesExpanded, setSequencesExpanded] = useState(false);
  const [functionsExpanded, setFunctionsExpanded] = useState(false);
  // Postgres-only, so they live here rather than in the shared schema-tree
  // hook that SQLite and DuckDB also use.
  const [sequences, setSequences] = useState<string[]>([]);
  const [functions, setFunctions] = useState<string[]>([]);
  const [globalPageSize, setGlobalPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [resultSetExportSnapshot, setResultSetExportSnapshot] =
    useState<ResultSetExportSnapshot | null>(null);

  // ─── Schema state ─────────────────────────────────────────────────────
  const [dbLoading, setDbLoading] = useState(false);
  const [createSchemaDialogOpen, setCreateSchemaDialogOpen] = useState(false);
  const [createSchemaName, setCreateSchemaName] = useState("");
  const [createSchemaSubmitting, setCreateSchemaSubmitting] = useState(false);
  const showSystemSchemasRef = useRef(false);
  const engineRef = useRef<PostgresEngine | null>(null);
  const schemaTree = useSchemaTree({
    engineRef,
    defaultSchema: "public",
    showSystemSchemasRef,
    clearEntitiesOnSchemaChange: true,
  });
  const {
    tables,
    setTables,
    views,
    setViews,
    indexes,
    setIndexes,
    triggers,
    setTriggers,
    columnsByEntity,
    setColumnsByEntity,
    foreignKeysByEntity,
    setForeignKeysByEntity,
    expandedEntities,
    setExpandedEntities,
    rowCountByTable,
    setRowCountByTable,
    selectedSchema,
    setSelectedSchema,
    schemas,
    schemaLoading,
    selectedSchemaRef,
    refreshSchemas: refreshSchemasFromHook,
    handleSchemaChange: handleSchemaChangeFromHook,
  } = schemaTree;

  // Synchronous view of the table list so runSqlForTab can decide whether a
  // hand-typed `SELECT * FROM <table>` should be made editable.
  const tablesRef = useRef(tables);
  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  // ─── Query history ────────────────────────────────────────────────────
  const {
    history: queryHistory,
    addHistoryEntry,
    clearHistory,
    replaceHistory,
  } = useQueryHistory(storageKey("query_history"));

  // The query log travels with a cloud save, never with a share link.
  const queryLogKeys = useMemo(
    () => ({
      history: storageKey("query_history"),
      saved: storageKey("saved_queries"),
    }),
    [],
  );

  // ─── Dialog state ─────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Full workspace-manager drawer, opened from the mobile hamburger menu
  // (the header badge that normally opens it is hidden on mobile).
  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmClearStorageOpen, setConfirmClearStorageOpen] = useState(false);
  const [confirmClearAllDataOpen, setConfirmClearAllDataOpen] = useState(false);
  const [pendingDbId, setPendingDbId] = useState<string | null>(null);
  const [pendingDropEntity, setPendingDropEntity] = useState<{
    name: string;
    kind: PgEntityKind;
  } | null>(null);
  const [pendingTruncate, setPendingTruncate] = useState<string | null>(null);
  const [ddlDialog, setDdlDialog] = useState<{
    title: string;
    sql: string;
  } | null>(null);

  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [importCsvDragging, setImportCsvDragging] = useState(false);
  const [importCsvState, setImportCsvState] = useState<CsvImportState | null>(
    null,
  );
  const [importJsonOpen, setImportJsonOpen] = useState(false);
  const [importJsonDragging, setImportJsonDragging] = useState(false);
  const [importJsonState, setImportJsonState] =
    useState<JsonImportState | null>(null);
  const [importParquetOpen, setImportParquetOpen] = useState(false);
  const [importParquetDragging, setImportParquetDragging] = useState(false);
  const [importParquetState, setImportParquetState] =
    useState<ParquetImportState | null>(null);
  const [importSqlDumpOpen, setImportSqlDumpOpen] = useState(false);
  const [importSqlDumpDragging, setImportSqlDumpDragging] = useState(false);

  // ─── Rename / custom filename state ───────────────────────────────────
  const [renameDbOpen, setRenameDbOpen] = useState(false);
  const [renameDbName, setRenameDbName] = useState("");
  const [renameDbExt, setRenameDbExt] = useState(".pg");
  // Overrides the display name for the blank/imported database without
  // touching the sample-database metadata.
  // Persisted alongside the active database id: an imported or renamed
  // database kept its label only in memory, so a reload silently relabelled it
  // `untitled.pg` while the data underneath was unchanged.
  const [customDbFilename, setCustomDbFilenameState] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      try {
        return localStorage.getItem(storageKey("db_filename"));
      } catch {
        return null;
      }
    },
  );
  const setCustomDbFilename = useCallback((filename: string | null) => {
    setCustomDbFilenameState(filename);
    try {
      if (filename === null) localStorage.removeItem(storageKey("db_filename"));
      else localStorage.setItem(storageKey("db_filename"), filename);
    } catch {
      /* ignore */
    }
  }, []);

  // ─── View Structure drawer state ──────────────────────────────────────
  const [viewStructureDialog, setViewStructureDialog] =
    useState<PgStructureDialogState | null>(null);
  const [viewStructureTouchedColIds, setViewStructureTouchedColIds] = useState<
    Set<string>
  >(new Set());
  const [viewStructurePendingFocusId, setViewStructurePendingFocusId] = useState<
    string | null
  >(null);
  const viewStructureBodyRef = useRef<HTMLDivElement | null>(null);
  const schemaSelectorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [addTableDialog, setAddTableDialog] =
    useState<PgStructureDialogState | null>(null);
  const [addTableTouchedColIds, setAddTableTouchedColIds] = useState<
    Set<string>
  >(new Set());
  const [addTablePendingFocusId, setAddTablePendingFocusId] = useState<
    string | null
  >(null);
  const addTableBodyRef = useRef<HTMLDivElement | null>(null);
  const [addRowDialog, setAddRowDialog] = useState<AddRowDialogState | null>(null);
  const [exportNoTabsHover, setExportNoTabsHover] = useState(false);
  const pgStructureSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const pgStructureValidation = useMemo(
    () => validatePgStructure(viewStructureDialog, columnsByEntity),
    [viewStructureDialog, columnsByEntity],
  );
  // New columns only surface empty-name errors once touched (blurred) or
  // named; existing columns show validation errors immediately.
  const viewStructureDisplayValidation = useMemo(() => {
    if (!viewStructureDialog) {
      return {
        invalidColumnIds: new Set<string>(),
        errors: [] as string[],
        hasTableNameError: false,
        isValid: false,
        isDirty: false,
      };
    }
    const displayCols = viewStructureDialog.columns.filter(
      (c) =>
        c.generated ||
        c.originalName !== null ||
        c.name.trim() ||
        viewStructureTouchedColIds.has(c.id),
    );
    return validatePgStructure(
      { ...viewStructureDialog, columns: displayCols },
      columnsByEntity,
    );
  }, [viewStructureDialog, viewStructureTouchedColIds, columnsByEntity]);
  const addTableValidation = useMemo(
    () => validatePgStructure(addTableDialog, columnsByEntity),
    [addTableDialog, columnsByEntity],
  );
  // Columns only surface empty-name errors once touched (blurred) or named.
  const addTableDisplayValidation = useMemo(() => {
    if (!addTableDialog) {
      return {
        invalidColumnIds: new Set<string>(),
        errors: [] as string[],
        hasTableNameError: false,
        isValid: false,
        isDirty: false,
      };
    }
    const displayCols = addTableDialog.columns.filter(
      (c) => c.generated || c.name.trim() || addTableTouchedColIds.has(c.id),
    );
    return validatePgStructure(
      { ...addTableDialog, columns: displayCols },
      columnsByEntity,
    );
  }, [addTableDialog, addTableTouchedColIds, columnsByEntity]);

  // ─── Refs ─────────────────────────────────────────────────────────────
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<EditorView | null>(null);
  // Latches after the first post-mount focus so the entry policy (cursor at
  // end on desktop, no keyboard-popping focus on mobile) applies exactly once.
  const entryFocusDoneRef = useRef(false);
  // Latest autocomplete schema, reused as the Ask AI schema snapshot.
  const askAiSchemaRef = useRef<SqlCompletionSchema | null>(null);
  const langCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  /** MRU history stack (oldest → most-recent), never includes the current tab. */
  const tabHistoryRef = useRef<string[]>([]);
  const activeDbIdRef = useRef(activeDbId);
  const runningRef = useRef(false);
  // Tracks the pending error→ready reset so a new run can cancel it;
  // otherwise failing a run and re-running within 3s would let the stale
  // timer flip the status to "ready" while the new run is still executing.
  const errorResetTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (errorResetTimerRef.current !== null) {
        window.clearTimeout(errorResetTimerRef.current);
      }
    },
    [],
  );
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizerRef = useRef<HTMLDivElement | null>(null);
  const panesRef = useRef<HTMLElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resultsPaneRef = useRef<HTMLElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);
  const settingsOpenRef = useRef(false);

  // ─── Selection tracking ───────────────────────────────────────────────
  const [hasEditorSelection, setHasEditorSelection] = useState(false);
  const setHasEditorSelectionRef = useRef(setHasEditorSelection);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatPopoverOpen, setFormatPopoverOpen] = useState(false);
  const isMac = useSyncExternalStore(
    () => () => {},
    () => detectIsMac(),
    () => false,
  );
  const runActiveTabRef = useRef<() => void>(() => undefined);
  const runSelectionRef = useRef<(sql: string) => void>(() => undefined);
  // PGlite runs one statement batch at a time. A run arriving while the
  // engine is busy is coalesced (latest wins) instead of dropped, and runs
  // when the in-flight one settles — see `drainPendingRun`, called from every
  // engine-busy path's `finally`.
  const runSqlForTabRef = useRef<
    | ((
        tabId: string,
        sql: string,
        source: string,
        sourceTable?: string,
        page?: number,
        baseSql?: string,
        explicitPageSize?: number,
      ) => void)
    | null
  >(null);
  const pendingRunRef = useRef<(() => void) | null>(null);
  const drainPendingRun = useCallback(() => {
    const pending = pendingRunRef.current;
    if (pending) {
      pendingRunRef.current = null;
      pending();
    }
  }, []);

  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const hasMultipleStatements = useMemo(
    () => splitSqlStatements(activeTab?.code ?? "").length > 1,
    [activeTab?.code],
  );
  const isSettingsTabActive = activeTabId === SETTINGS_TAB_ID;
  const openSettingsTab = useCallback(() => {
    if (activeTabIdRef.current === SETTINGS_TAB_ID) {
      // Settings tab is active, close it and return to a query tab.
      setSettingsOpen(false);
      const fallback = tabsRef.current[0]?.id;
      if (fallback) {
        activeTabIdRef.current = fallback;
        setActiveTabId(fallback);
      }
    } else if (settingsOpenRef.current) {
      // Settings tab is in the tab bar but not active, activate it.
      activeTabIdRef.current = SETTINGS_TAB_ID;
      setActiveTabId(SETTINGS_TAB_ID);
    } else {
      // Settings tab is not open, add it and make it active.
      setSettingsOpen(true);
      activeTabIdRef.current = SETTINGS_TAB_ID;
      setActiveTabId(SETTINGS_TAB_ID);
    }
  }, [setSettingsOpen, setActiveTabId]);
  /** Close the Settings tab and return focus to the most-recent query tab. */
  const closeSettingsTab = useCallback(() => {
    setSettingsOpen(false);
    const fallback = tabsRef.current[0]?.id;
    if (fallback && activeTabIdRef.current === SETTINGS_TAB_ID) {
      activeTabIdRef.current = fallback;
      setActiveTabId(fallback);
    }
  }, [setSettingsOpen, setActiveTabId]);
  const result = activeTab ? (resultsByTab[activeTab.id] ?? null) : null;
  const activeSample = findPostgresSampleDatabase(activeDbId);
  // customDbFilename applies only for the blank/imported database slot.
  const displayFilename =
    activeDbId === POSTGRES_BLANK_DATABASE.id && customDbFilename !== null
      ? customDbFilename
      : activeSample.filename;
  // Tab reordering is delegated to the generic TabBar; `setDraggingTabId`
  // remains in the hook signature only, passed a no-op.
  const setDraggingTabId = useCallback(() => {}, []);

  const persistTabs = useCallback(
    (nextTabs: QueryTab[], dbId = activeDbIdRef.current) => {
      tabsRef.current = nextTabs;
      setTabs(nextTabs);
      saveTabs(dbId, nextTabs);
    },
    [],
  );

  // Tabs are read in a `useState` initializer, before the workspace bootstrap
  // has resolved, so they can come from the wrong workspace's keys. Once the
  // real one is known, move onto its keys and re-read if it moved.
  const adoptWorkspaceTabScope = useCallback(
    (workspaceId: string) => {
      const dbId = activeDbIdRef.current;
      const adopted = tabsForAdoptedScope({
        setWorkspaceScope,
        workspaceId,
        readTabs: () =>
          loadTabs(dbId, findPostgresSampleDatabase(dbId).defaultTabs),
        readActiveTabId: () => {
          try {
            return localStorage.getItem(dbScopedKey(dbId, "active_tab"));
          } catch {
            return null;
          }
        },
      });
      if (!adopted) return;
      persistTabs(adopted.tabs, dbId);
      tabHistoryRef.current = [];
      setActiveTabId(adopted.activeTabId);
      setResultsByTab({});
    },
    [persistTabs],
  );

  /** Reloads the sidebar's view of the schema. Returns the table names so a
   *  caller that just replaced the database can report what it loaded. */
  const refreshSchema = useCallback(async (): Promise<string[]> => {
    const engine = engineRef.current;
    if (!engine) return [];
    const schema = selectedSchemaRef.current;
    const [
      nextTables,
      nextViews,
      nextIndexes,
      nextTriggers,
      nextSequences,
      nextFunctions,
    ] = await Promise.all([
      engine.listTables(schema),
      engine.listViews(schema),
      engine.listIndexes(schema),
      engine.listTriggers(schema),
      engine.listSequences(schema),
      engine.listFunctions(schema),
    ]);
    const entries = await Promise.all(
      [...nextTables, ...nextViews].map(async (name) => {
        const [colsResult, fksResult, countResult] = await Promise.allSettled([
          engine.listColumns(name, schema),
          engine.listForeignKeys(name, schema),
          engine.exec(`SELECT COUNT(*) FROM ${quoteIdent(schema)}.${quoteIdent(name)}`),
        ]);
        const cols = colsResult.status === "fulfilled" ? colsResult.value : [];
        const fks = fksResult.status === "fulfilled" ? fksResult.value : [];
        const count =
          countResult.status === "fulfilled"
            ? Number(countResult.value[0]?.values?.[0]?.[0] ?? 0)
            : 0;
        return [name, cols, fks, count] as const;
      }),
    );
    setTables(nextTables);
    setViews(nextViews);
    setIndexes(nextIndexes);
    setTriggers(nextTriggers);
    setSequences(nextSequences);
    setFunctions(nextFunctions);
    setColumnsByEntity(
      Object.fromEntries(entries.map(([name, cols]) => [name, cols])),
    );
    setForeignKeysByEntity(
      Object.fromEntries(entries.map(([name, , fks]) => [name, fks])),
    );
    setRowCountByTable(
      Object.fromEntries(entries.map(([name, , , count]) => [name, count])),
    );
    return nextTables;
  }, []);

  const refreshSchemas = useCallback(
    () => refreshSchemasFromHook(refreshSchema),
    [refreshSchemasFromHook, refreshSchema],
  );

  const handleSchemaChange = useCallback(
    (schema: string) => handleSchemaChangeFromHook(schema, refreshSchema),
    [handleSchemaChangeFromHook, refreshSchema],
  );

  const [createIndexOpen, setCreateIndexOpen] = useState(false);
  const [createViewOpen, setCreateViewOpen] = useState(false);
  const [createViewBody, setCreateViewBody] = useState("");
  // Capture the editor text in this event handler (reading a ref during
  // render is disallowed) so the Create View body can be seeded from it.
  const openCreateView = useCallback(() => {
    setCreateViewBody(editorRef.current?.state.doc.toString() ?? "");
    setCreateViewOpen(true);
  }, []);

  const [explainPlan, setExplainPlan] = useState<{
    querySql: string;
    plan: string;
    options: ExplainOptions;
  } | null>(null);
  // Run EXPLAIN for the selection / statement at the cursor / whole query and
  // show the plan in a read-only modal.
  const runExplain = useCallback(
    (sql: string, opts: ExplainOptions) => {
      const engine = engineRef.current;
      if (!engine) return;
      void (async () => {
        try {
          const sets = await engine.exec(
            buildExplainSql("postgres", sql, opts),
          );
          const set = sets.find((s) => s != null) ?? sets[0];
          setExplainPlan({
            querySql: sql,
            options: opts,
            plan: set
              ? formatExplainResult(set.columns, set.values)
              : "(no plan returned)",
          });
        } catch (err) {
          showToast(
            `Explain failed: ${err instanceof Error ? err.message : String(err)}`,
            "warn",
          );
        }
      })();
    },
    [showToast],
  );

  const handleExplain = useCallback(() => {
    const view = editorRef.current;
    if (!view) return;
    const sql = activeSqlForEditor(view).trim();
    if (!sql) {
      showToast("Nothing to explain, the query is empty.", "warn");
      return;
    }
    runExplain(sql, {});
  }, [runExplain, showToast]);

  // Run a DDL statement from the schema tree's Create Index / Create View
  // dialogs, then refresh the sidebar. Resolves true on success.
  const createSchemaObject = useCallback(
    async (sql: string, successMessage: string): Promise<boolean> => {
      const engine = engineRef.current;
      if (!engine) return false;
      try {
        await engine.exec(sql);
        await refreshSchema();
        showToast(successMessage);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Create failed: ${msg}`, "warn");
        return false;
      }
    },
    [refreshSchema, showToast],
  );

  const getCreateIndexColumns = useCallback(
    async (table: string): Promise<string[]> => {
      const engine = engineRef.current;
      if (!engine) return [];
      const cols = await engine.listColumns(table, selectedSchemaRef.current);
      return cols.map((c) => c.name);
    },
    [selectedSchemaRef],
  );

  function validateSchemaName(name: string, existingSchemas: string[]): string[] {
    const errors: string[] = [];
    const trimmed = name.trim();
    if (!trimmed) {
      errors.push("Schema name cannot be empty.");
    } else if (/^pg_/i.test(trimmed)) {
      errors.push('Schema names beginning with "pg_" are not allowed.');
    } else if (trimmed === "information_schema") {
      errors.push('Schema name "information_schema" is reserved.');
    } else if (existingSchemas.includes(trimmed)) {
      errors.push(`Schema "${trimmed}" already exists.`);
    }
    return errors;
  }

  const handleCreateSchema = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const name = createSchemaName.trim();
    const errors = validateSchemaName(name, schemas);
    if (errors.length > 0) return;
    setCreateSchemaSubmitting(true);
    try {
      await engine.createSchema(name);
      await refreshSchemas();
      selectedSchemaRef.current = name;
      setSelectedSchema(name);
      setExpandedEntities(new Set());
      await refreshSchema();
      setCreateSchemaDialogOpen(false);
      setCreateSchemaName("");
      showToast(`Schema "${name}" created.`);
    } catch (err) {
      showToast(
        `Failed to create schema: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    } finally {
      setCreateSchemaSubmitting(false);
    }
  }, [createSchemaName, schemas, refreshSchemas, refreshSchema, showToast]);

  const runSqlForTab = useCallback(
    async (
      tabId: string,
      sql: string,
      source: string,
      sourceTable?: string,
      page = 0,
      baseSql?: string,
      explicitPageSize?: number,
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (runningRef.current) {
        // Engine busy, queue the latest request (coalescing a burst) instead
        // of dropping it; it runs when the in-flight one settles.
        pendingRunRef.current = () =>
          runSqlForTabRef.current?.(
            tabId,
            sql,
            source,
            sourceTable,
            page,
            baseSql,
            explicitPageSize,
          );
        return;
      }
      const trimmed = sql.trim();
      if (!trimmed) {
        showToast("Nothing to run, the query is empty.", "warn");
        return;
      }
      runningRef.current = true;
      if (errorResetTimerRef.current !== null) {
        window.clearTimeout(errorResetTimerRef.current);
        errorResetTimerRef.current = null;
      }
      setStatusState("running");
      if (clearBeforeRun) {
        setResultsByTab((prev) => ({ ...prev, [tabId]: null }));
      }
      const t0 = performance.now();
      const noComments = stripSqlComments(trimmed);
      // Make a hand-typed full-table preview (`SELECT * FROM <table>`)
      // editable, just like opening the table from the sidebar, but only
      // for an actual table (not a view), so edits never fail on commit.
      const isTable = (name: string) => tablesRef.current.includes(name);
      if (!sourceTable) {
        const detected = bareTableSelectSource(trimmed, noComments);
        if (detected && isTable(detected)) {
          sourceTable = detected;
        }
      }
      const useLazy =
        isSingleSelectSql(trimmed, noComments) && !hasLimitClause(noComments);
      const effectivePageSize =
        explicitPageSize !== undefined ? explicitPageSize : globalPageSize;
      const lazyPageSizeForRun =
        effectivePageSize > 0 ? effectivePageSize : INFINITE_SCROLL_PAGE_SIZE;
      try {
        let sets: (QueryExecResult | null)[];
        let lazySql: string | undefined;
        let lazyBaseSql: string | undefined;
        let lazyTotalCount: number | undefined;
        let lazyPage: number | undefined;
        let lazyPageSize: number | undefined;
        let affectedRows: (number | null)[] | undefined;
        if (useLazy) {
          const lazy = await engine.execPaged(
            trimmed,
            lazyPageSizeForRun,
            page * lazyPageSizeForRun,
          );
          sets = lazy.result;
          lazySql = trimmed.replace(/\s*;+\s*$/, "");
          lazyBaseSql = (baseSql ?? trimmed).replace(/\s*;+\s*$/, "");
          lazyTotalCount = lazy.totalCount;
          lazyPage = page;
          lazyPageSize = lazyPageSizeForRun;
        } else {
          const run = await engine.execWithCounts(trimmed);
          sets = run.sets;
          affectedRows = run.affectedRows;
        }
        const sourceTables =
          sets.length > 1
            ? bareTableSelectSources(trimmed, isTable)
            : [sourceTable ?? null];
        const elapsedMs = performance.now() - t0;
        setResultsByTab((prev) => ({
          ...prev,
          [tabId]: {
            sets,
            elapsedMs,
            source,
            sourceTable,
            sourceTables,
            lazySql,
            lazyBaseSql,
            lazyTotalCount,
            lazyPage,
            lazyPageSize,
            lazyInfinite: effectivePageSize === 0 && useLazy,
            querySql: trimmed.replace(/\s*;+\s*$/, ""),
            affectedRows,
          },
        }));
        addHistoryEntry({
          sql: trimmed,
          source,
          executedAt: Date.now(),
          elapsedMs,
          success: true,
        });
        // Refresh the schema sidebar in the background; don't hold the run
        // lock (which blocks the next re-page) on slow PGlite introspection.
        void refreshSchema().catch(() => undefined);
        // Keep the running overlay up long enough for its CSS transition.
        const waitMs = MIN_ANIMATION_MS - (performance.now() - t0);
        if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
        setStatusState("ready");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const elapsedMs = performance.now() - t0;
        setResultsByTab((prev) => ({
          ...prev,
          [tabId]: {
            sets: [],
            elapsedMs,
            source,
            sourceTable,
            error: message,
            // What actually ran, which "Run selection" makes different from
            // the editor's contents; the error panel shows it beside the
            // message.
            querySql: trimmed,
          },
        }));
        addHistoryEntry({
          sql: trimmed,
          source,
          executedAt: Date.now(),
          elapsedMs,
          success: false,
          error: message,
        });
        setStatusState("error");
        errorResetTimerRef.current = window.setTimeout(() => {
          errorResetTimerRef.current = null;
          setStatusState("ready");
        }, 3000);
      } finally {
        runningRef.current = false;
        drainPendingRun();
      }
    },
    [
      clearBeforeRun,
      globalPageSize,
      refreshSchema,
      showToast,
      addHistoryEntry,
      drainPendingRun,
    ],
  );

  const runActiveTab = useCallback(() => {
    const tab = tabsRef.current.find(
      (candidate) => candidate.id === activeTabIdRef.current,
    );
    if (!tab || tab.kind === "er-diagram" || tab.kind === "query-history")
      return;
    const sql = editorRef.current?.state.doc.toString() ?? tab.code;
    void runSqlForTab(
      tab.id,
      sql,
      tab.title,
      tab.kind === "view-data" ? tab.title : undefined,
    );
  }, [runSqlForTab]);

  const runCurrentSelection = useCallback(() => {
    const view = editorRef.current;
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.empty) return;
    const selected = view.state.sliceDoc(sel.from, sel.to);
    const tab = tabsRef.current.find(
      (candidate) => candidate.id === activeTabIdRef.current,
    );
    if (!tab) return;
    void runSqlForTab(tab.id, selected, tab.title);
  }, [runSqlForTab]);

  // Run just the statement under the editor cursor (the toolbar "Run statement"
  // affordance, mirrors the Ctrl/⌘+Enter keymap).
  const runStatementAtCursor = useCallback(() => {
    const view = editorRef.current;
    const tab = tabsRef.current.find(
      (candidate) => candidate.id === activeTabIdRef.current,
    );
    if (!view || !tab) return;
    const doc = view.state.doc.toString();
    const stmt = statementAtCursor(doc, view.state.selection.main.head);
    void runSqlForTab(tab.id, stmt ? stmt.text : doc, tab.title);
  }, [runSqlForTab]);

  // Keep runActiveTabRef / runSelectionRef in sync with latest callbacks.
  useEffect(() => {
    runActiveTabRef.current = runActiveTab;
    runSelectionRef.current = (sql: string) => {
      const tab = tabsRef.current.find(
        (candidate) => candidate.id === activeTabIdRef.current,
      );
      if (!tab) return;
      void runSqlForTab(tab.id, sql, tab.title);
    };
    runSqlForTabRef.current = runSqlForTab;
  }, [runActiveTab, runSqlForTab]);

  // Table tabs restored from a previous session have no result until they are
  // re-queried; this puts their rows back when the tab is shown.
  useViewDataTabAutoRun({
    tabs,
    activeTabId,
    resultsByTab,
    statusState,
    activeDbId,
    run: runSqlForTab,
  });

  // Focus the newly added column's name input in the View/Edit Structure drawer.
  useEffect(() => {
    if (!viewStructurePendingFocusId) return;
    const input = viewStructureBodyRef.current?.querySelector<HTMLElement>(
      `[data-col-id="${viewStructurePendingFocusId}"]`,
    );
    if (input) {
      input.focus();
      setViewStructurePendingFocusId(null);
    }
  }, [viewStructurePendingFocusId]);

  // Focus the newly added column's name input in the Add Table drawer.
  useEffect(() => {
    if (!addTablePendingFocusId) return;
    const input = addTableBodyRef.current?.querySelector<HTMLElement>(
      `[data-col-id="${addTablePendingFocusId}"]`,
    );
    if (input) {
      input.focus();
      setAddTablePendingFocusId(null);
    }
  }, [addTablePendingFocusId]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
    try {
      localStorage.setItem(
        dbScopedKey(activeDbIdRef.current, "active_tab"),
        activeTabId,
      );
    } catch {
      /* ignore */
    }
  }, [activeTabId]);
  useEffect(() => {
    activeDbIdRef.current = activeDbId;
  }, [activeDbId]);
  useEffect(() => {
    settingsOpenRef.current = settingsOpen;
  }, [settingsOpen]);

  // ─── Hydrate persisted settings on mount ─────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    document.title = "PostgreSQL Playground";
    document.body.classList.add("playground-active");
    const D = DEFAULT_PLAYGROUND_SETTINGS;
    const savedSize =
      Number(localStorage.getItem(storageKey("fontsize")) ?? D.fontSize) ||
      D.fontSize;
    const savedOutputFontEnabled =
      localStorage.getItem(storageKey("outputfontsize_enabled")) === "true";
    const savedOutputSize =
      Number(
        localStorage.getItem(storageKey("outputfontsize")) ?? D.outputFontSize,
      ) || D.outputFontSize;
    const savedTheme =
      getStoredEditorTheme(storageKey("editortheme")) ?? D.editorTheme;
    const savedWordWrap =
      localStorage.getItem(storageKey("wordwrap")) !== "false";
    const savedClearBeforeRun =
      localStorage.getItem(storageKey("clearbeforerun")) === "true";

    setFontSizeState(savedSize);
    setOutputFontSizeEnabledState(savedOutputFontEnabled);
    setOutputFontSizeState(savedOutputSize);
    setEditorThemeState(savedTheme);
    setWordWrapState(savedWordWrap);
    setClearBeforeRunState(savedClearBeforeRun);

    applyMode(savedTheme);
    applyThemePalette(savedTheme);
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${savedSize}px`,
    );
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${savedOutputFontEnabled ? savedOutputSize : savedSize}px`,
    );

    // Restore the active tab id for this database.
    try {
      const savedActiveTab = localStorage.getItem(
        dbScopedKey(initialDbId, "active_tab"),
      );
      if (
        savedActiveTab &&
        tabsRef.current.some((tab) => tab.id === savedActiveTab)
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTabId(savedActiveTab);
      }
    } catch {
      /* ignore */
    }

    return () => {
      document.body.classList.remove("playground-active");
      clearThemePalette();
    };
  }, [
    initialDbId,
    setClearBeforeRunState,
    setEditorThemeState,
    setFontSizeState,
    setOutputFontSizeEnabledState,
    setOutputFontSizeState,
    setWordWrapState,
  ]);

  // ─── Editor + engine init ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    // Releases the workspace lock on teardown so a later remount can
    // re-acquire it instead of colliding with this document's stale lock.
    const lockController = new AbortController();
    if (editorHostRef.current && !editorRef.current) {
      const compartments = makeSqlEditorCompartments();
      const initialTheme =
        getStoredEditorTheme(storageKey("editortheme")) ??
        DEFAULT_PLAYGROUND_SETTINGS.editorTheme;
      const initialWordWrap =
        typeof window === "undefined"
          ? DEFAULT_PLAYGROUND_SETTINGS.wordWrap
          : localStorage.getItem(storageKey("wordwrap")) !== "false";
      const view = new EditorView({
        doc: activeTab?.code ?? "",
        parent: editorHostRef.current,
        extensions: createSqlEditorExtensions({
          dialect: "postgres",
          compartments,
          initialTheme,
          initialWordWrap,
          onSelectionChange: (hasSelection) => {
            setHasEditorSelectionRef.current(hasSelection);
          },
          onDocChange: (code) => {
            const id = activeTabIdRef.current;
            const next = tabsRef.current.map((tab) =>
              tab.id === id ? { ...tab, code } : tab,
            );
            persistTabs(next);
          },
          onRunSelection: (text) => runSelectionRef.current(text),
          onRunAll: () => runActiveTabRef.current(),
        }),
      });
      editorRef.current = view;
      langCompRef.current = compartments.lang;
      completionCompRef.current = compartments.completion;
      themeCompRef.current = compartments.theme;
      wrapCompRef.current = compartments.wrap;
    }
    (async () => {
      try {
        setLoadingMessage("Loading PostgreSQL engine…");
        // Resolve (or auto-create) the active workspace so PGlite can persist
        // its data directory to OPFS. Best-effort: falls back to in-memory.
        let workspaceId: string | null = null;
        try {
          const workspace = await ensureActiveWorkspace(PLAYGROUND_ID);
          workspaceId = workspace.id;
          setActiveWorkspace({ id: workspace.id, name: workspace.name });
          setWorkspaceSaved(workspace.saved);
          adoptWorkspaceTabScope(workspace.id);
          try {
            const hasLock = await acquireWorkspaceLock(workspace.id, {
              signal: lockController.signal,
            });
            if (!cancelled && !hasLock) {
              // The same OPFS-backed workspace can't open in two tabs:
              // PGlite's exclusive OPFS access handle deadlocks the boot at
              // ~90%. Show the conflict overlay (remembering the workspace so
              // it can offer a copy) and skip the boot rather than hang.
              conflictWorkspaceRef.current = {
                id: workspace.id,
                name: workspace.name,
              };
              setWorkspaceConflict(true);
              return;
            }
          } catch {
            /* Web Locks unavailable, proceed without cross-tab exclusivity. */
          }
        } catch {
          /* proceed in-memory */
        }
        if (cancelled) return;
        const engine = await postgresAdapter.createEngine(
          initialDbId,
          workspaceId,
        );
        if (cancelled) {
          // Unmounted mid-create: close the engine so the worker releases its
          // leader-election lock — an abandoned worker stays leader and later
          // engines would proxy SQL to it instead of a fresh database.
          void engine.close();
          return;
        }
        engineRef.current = engine;
        await Promise.all([refreshSchema(), refreshSchemas()]);
        setLoaded(true);
        setStatusState("ready");
      } catch (err) {
        if (cancelled) return;
        setLoadingMessage(
          `Failed to load: ${err instanceof Error ? err.message : String(err)}`,
        );
        setStatusState("error");
      }
    })();
    return () => {
      cancelled = true;
      // Release the workspace lock so the next mount can re-acquire it.
      lockController.abort();
      editorRef.current?.destroy();
      editorRef.current = null;
      langCompRef.current = null;
      completionCompRef.current = null;
      themeCompRef.current = null;
      wrapCompRef.current = null;
      // Close the engine so the PGliteWorker releases its leader-election
      // lock; an unclosed worker stays leader and new workers would proxy
      // SQL to the old database.
      const oldEngine = engineRef.current;
      engineRef.current = null;
      void oldEngine?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const view = editorRef.current;
    if (
      !view ||
      !activeTab ||
      activeTab.kind === "er-diagram" ||
      activeTab.kind === "view-data" ||
      activeTab.kind === "query-history"
    )
      return;
    const current = view.state.doc.toString();
    if (current !== activeTab.code) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: activeTab.code },
      });
    }
    // First focus after mount goes through the shared entry policy (cursor at
    // end on desktop, no keyboard-popping focus on mobile); applied once.
    if (!entryFocusDoneRef.current) {
      entryFocusDoneRef.current = true;
      applyEntryFocus(view);
      return;
    }
    view.focus();
  }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply editor theme.
  useEffect(() => {
    const view = editorRef.current;
    if (view && themeCompRef.current) {
      view.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(editorTheme)),
      });
    }
    applyThemePalette(editorTheme);
    applyMode(editorTheme);
  }, [editorTheme]);

  // Apply word wrap.
  useEffect(() => {
    const view = editorRef.current;
    if (view && wrapCompRef.current) {
      view.dispatch({
        effects: wrapCompRef.current.reconfigure(
          wordWrap ? EditorView.lineWrapping : [],
        ),
      });
    }
  }, [wordWrap]);

  // Apply font size.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--cm-font-size",
      `${fontSize}px`,
    );
    editorRef.current?.requestMeasure();
  }, [fontSize]);

  // Apply output font size.
  useEffect(() => {
    const effective = outputFontSizeEnabled ? outputFontSize : fontSize;
    document.documentElement.style.setProperty(
      "--output-font-size",
      `${effective}px`,
    );
  }, [outputFontSizeEnabled, outputFontSize, fontSize]);

  // Keep showSystemSchemasRef in sync and refresh schemas when toggled.
  useEffect(() => {
    showSystemSchemasRef.current = showSystemSchemas;
    void refreshSchemas();
  }, [showSystemSchemas, refreshSchemas]);

  // Keep autocomplete schema in sync with tables/views. Compared by value so
  // a query / import that doesn't change the visible schema doesn't trigger
  // a full editor re-parse.
  const lastReconfigureKeyRef = useRef<string>("");
  useEffect(() => {
    const view = editorRef.current;
    const completionComp = completionCompRef.current;
    if (!view || !langCompRef.current || !completionComp) return;
    const schema: Record<string, string[]> = {};
    const completionSchema: SqlCompletionSchema = {
      entities: [],
      schemas,
    };
    for (const name of tables) {
      const cols = columnsByEntity[name] ?? [];
      schema[name] = cols.map((column) => column.name);
      completionSchema.entities.push({
        name,
        columns: cols.map((column) => ({
          name: column.name,
          type: column.type,
        })),
        kind: "table",
        foreignKeys: (foreignKeysByEntity[name] ?? []).map((fk) => ({
          column: fk.from,
          refEntity: fk.table,
          refColumn: fk.to,
        })),
      });
    }
    for (const name of views) {
      const cols = columnsByEntity[name] ?? [];
      schema[name] = cols.map((column) => column.name);
      completionSchema.entities.push({
        name,
        columns: cols.map((column) => ({
          name: column.name,
          type: column.type,
        })),
        kind: "view",
      });
    }
    askAiSchemaRef.current = completionSchema;
    const key = JSON.stringify(completionSchema);
    if (key === lastReconfigureKeyRef.current) return;
    view.dispatch({
      effects: [
        completionComp.reconfigure(
          makeSqlAutocompletionExtension(completionSchema, "postgres"),
        ),
      ],
    });
    // `@codemirror/lang-sql` is lazy-loaded, so the lang reconfigure awaits
    // the chunk. `lastReconfigureKeyRef` is only committed after the dispatch
    // fires, so a StrictMode-cancelled effect can't skip the reconfigure.
    let cancelled = false;
    void makeSqlLangExtension("postgres", schema).then((langExt) => {
      if (cancelled) return;
      const currentView = editorRef.current;
      const currentLangComp = langCompRef.current;
      if (!currentView || !currentLangComp) return;
      currentView.dispatch({
        effects: [currentLangComp.reconfigure(langExt)],
      });
      lastReconfigureKeyRef.current = key;
    });
    return () => {
      cancelled = true;
    };
  }, [tables, views, columnsByEntity, foreignKeysByEntity, schemas]);

  // Ask AI context: the playground registers itself so the assistant can see
  // the SQL in the active tab, the last error, and the database schema.
  useAskAiSource({
    kind: "sql-playground",
    label: "Postgres playground",
    getSnapshot: () => ({
      content: describeSqlSurface({
        dialect: "postgres",
        sqlLabel: activeTab ? `tab "${activeTab.title}"` : undefined,
        sql: editorRef.current?.state.doc.toString() ?? activeTab?.code ?? "",
        error: result?.error,
      }),
      schema: formatSqlSchemaText(askAiSchemaRef.current),
    }),
  });

  // Drop result entries whose owning tab no longer exists.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResultsByTab((prev) => {
      const ids = new Set(tabs.map((tab) => tab.id));
      let changed = false;
      const next: typeof prev = {};
      for (const k of Object.keys(prev)) {
        if (ids.has(k)) {
          next[k] = prev[k];
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [tabs]);

  // ─── Database switching ──────────────────────────────────────────────
  const performDbSwitch = useCallback(
    async (nextId: string) => {
      const engine = engineRef.current;
      if (!engine || nextId === activeDbIdRef.current) return;
      setStatusState("loading");
      setDbLoading(true);
      try {
        const sample =
          nextId === POSTGRES_BLANK_DATABASE.id
            ? await engine.loadBlankDatabase()
            : await engine.loadSampleDatabase(nextId);
        setActiveDbId(sample.id);
        // The label belonged to the database being replaced; keeping it would
        // show a stale name over the new one (and over a later New Database).
        setCustomDbFilename(null);
        try {
          localStorage.setItem(storageKey("db"), sample.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(sample.id, sample.defaultTabs);
        persistTabs(nextTabs, sample.id);
        // Try to restore active tab id for this DB.
        let nextActive = nextTabs[0]?.id ?? "";
        try {
          const savedActive = localStorage.getItem(
            dbScopedKey(sample.id, "active_tab"),
          );
          if (savedActive && nextTabs.some((tab) => tab.id === savedActive)) {
            nextActive = savedActive;
          }
        } catch {
          /* ignore */
        }
        tabHistoryRef.current = [];
        setActiveTabId(nextActive);
        setResultsByTab({});
        // Reset to public schema on database switch.
        selectedSchemaRef.current = "public";
        setSelectedSchema("public");
        setExpandedEntities(new Set());
        await Promise.all([refreshSchema(), refreshSchemas()]);
        setStatusState("ready");
        showToast(`Loaded ${sample.filename}.`);
      } catch (err) {
        showToast(
          `Load failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      } finally {
        setDbLoading(false);
      }
    },
    [persistTabs, refreshSchema, refreshSchemas, showToast],
  );

  // "Open in new workspace" switches WITHOUT reloading: a reload races
  // PGlite's per-origin OPFS access-handle pool against the outgoing page's
  // worker ("createSyncAccessHandle ... already an open access handle") and
  // hangs. In-place, the old engine closes before the new one opens.
  const performNewWorkspaceSwitch = useCallback(
    async (nextId: string) => {
      const old = engineRef.current;
      if (!old) return;
      setStatusState("loading");
      setDbLoading(true);
      try {
        const sample = findPostgresSampleDatabase(nextId);
        const newWs = await createWorkspace(
          `${sample.label} Workspace`,
          PLAYGROUND_ID,
        );
        setActiveWorkspaceId(PLAYGROUND_ID, newWs.id);
        engineRef.current = null;
        await old.close();
        const engine = await postgresAdapter.createEngine(nextId, newWs.id);
        engineRef.current = engine;
        setActiveWorkspace({ id: newWs.id, name: newWs.name });
        setActiveDbId(sample.id);
        setCustomDbFilename(null);
        try {
          localStorage.setItem(storageKey("db"), sample.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(sample.id, sample.defaultTabs);
        persistTabs(nextTabs, sample.id);
        tabHistoryRef.current = [];
        setActiveTabId(nextTabs[0]?.id ?? "");
        setResultsByTab({});
        selectedSchemaRef.current = "public";
        setSelectedSchema("public");
        setExpandedEntities(new Set());
        await Promise.all([refreshSchema(), refreshSchemas()]);
        setStatusState("ready");
        showToast(`Loaded ${sample.filename} in a new workspace.`);
      } catch (err) {
        showToast(
          `Load failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      } finally {
        setDbLoading(false);
      }
    },
    [persistTabs, refreshSchema, refreshSchemas, showToast],
  );

  // From the conflict overlay: duplicate the workspace another tab is holding
  // and switch to the duplicate. `copyConflictedWorkspace` reloads on
  // success, so reaching the end of this callback means it failed.
  const handleConflictOpenCopy = useCallback(() => {
    const source = conflictWorkspaceRef.current;
    if (!source) return;
    setConflictCopyBusy(true);
    setConflictCopyError(null);
    void (async () => {
      try {
        const copy = await copyConflictedWorkspace({
          playgroundId: PLAYGROUND_ID,
          sourceId: source.id,
          sourceName: source.name,
          copyScopedKeys,
        });
        if (!copy) {
          setConflictCopyBusy(false);
          setConflictCopyError(
            "This workspace's files couldn't be found, so there was nothing to copy.",
          );
        }
      } catch (err) {
        setConflictCopyBusy(false);
        setConflictCopyError(
          `Couldn't copy the workspace: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    })();
  }, []);

  // From the conflict overlay: create a fresh workspace and switch to it. No
  // engine is open in the conflict case, so a reload is safe and the new
  // workspace id isn't locked.
  const handleConflictNewWorkspace = useCallback(() => {
    void (async () => {
      try {
        const newWs = await createWorkspace("Postgres Workspace", PLAYGROUND_ID);
        switchActiveWorkspace(PLAYGROUND_ID, newWs.id);
      } catch {
        /* If creation fails, a plain reload at least re-checks the lock. */
        window.location.reload();
      }
    })();
  }, []);

  // Save (promote) the current draft workspace into the saved list.
  const handleSaveWorkspace = useCallback(async (name: string) => {
    const saved = saveDraftWorkspace(PLAYGROUND_ID, name);
    if (saved) {
      setWorkspaceSaved(true);
      setActiveWorkspace({ id: saved.id, name: saved.name });
    }
  }, []);

  const requestDbSwitch = useCallback(
    (nextId: string) => {
      if (nextId !== POSTGRES_BLANK_DATABASE.id && nextId === activeDbIdRef.current) return;
      setPendingDbId(nextId);
    },
    [setPendingDbId],
  );

  // ─── Import SQL dump ──────────────────────────────────────────────────
  const performImportSqlDump = useCallback(
    async (sqlText: string, filename: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      setStatusState("loading");
      try {
        // Imports into a sandbox worker first; only swaps in on success,
        // so a failed import leaves the existing database intact.
        await engine.importSqlDump(sqlText);
        setActiveDbId(POSTGRES_BLANK_DATABASE.id);
        setCustomDbFilename(filename);
        try {
          localStorage.setItem(storageKey("db"), POSTGRES_BLANK_DATABASE.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(
          POSTGRES_BLANK_DATABASE.id,
          POSTGRES_BLANK_DATABASE.defaultTabs,
        );
        persistTabs(nextTabs, POSTGRES_BLANK_DATABASE.id);
        let nextActive = nextTabs[0]?.id ?? "";
        try {
          const savedActive = localStorage.getItem(
            dbScopedKey(POSTGRES_BLANK_DATABASE.id, "active_tab"),
          );
          if (savedActive && nextTabs.some((tab) => tab.id === savedActive)) {
            nextActive = savedActive;
          }
        } catch {
          /* ignore */
        }
        tabHistoryRef.current = [];
        setActiveTabId(nextActive);
        setResultsByTab({});
        selectedSchemaRef.current = "public";
        setSelectedSchema("public");
        setExpandedEntities(new Set());
        const [loadedTables] = await Promise.all([
          refreshSchema(),
          refreshSchemas(),
        ]);
        setStatusState("ready");
        // Close on success. Leaving the dropzone live over a database that was
        // just replaced invited dropping a second file onto it by accident.
        setImportSqlDumpOpen(false);
        const n = loadedTables.length;
        showToast(`Loaded "${filename}": ${n} table${n === 1 ? "" : "s"}.`);
      } catch (err) {
        showToast(
          `Import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      }
    },
    [persistTabs, refreshSchema, refreshSchemas, showToast],
  );

  /** Import a dump into a *fresh* workspace, leaving the current one and its
   *  query tabs untouched. The same escape hatch the sample-database switch
   *  offers; importing a dump used to be the one destructive path with no
   *  alternative to overwriting. */
  const performImportSqlDumpInNewWorkspace = useCallback(
    async (sqlText: string, filename: string) => {
      const old = engineRef.current;
      if (!old) return;
      setStatusState("loading");
      setDbLoading(true);
      try {
        const newWs = await createWorkspace(
          `${filename} Workspace`,
          PLAYGROUND_ID,
        );
        setActiveWorkspaceId(PLAYGROUND_ID, newWs.id);
        engineRef.current = null;
        await old.close();
        const engine = await postgresAdapter.createEngine(
          POSTGRES_BLANK_DATABASE.id,
          newWs.id,
        );
        engineRef.current = engine;
        await engine.importSqlDump(sqlText);
        setActiveWorkspace({ id: newWs.id, name: newWs.name });
        setActiveDbId(POSTGRES_BLANK_DATABASE.id);
        setCustomDbFilename(filename);
        try {
          localStorage.setItem(storageKey("db"), POSTGRES_BLANK_DATABASE.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(
          POSTGRES_BLANK_DATABASE.id,
          POSTGRES_BLANK_DATABASE.defaultTabs,
        );
        persistTabs(nextTabs, POSTGRES_BLANK_DATABASE.id);
        tabHistoryRef.current = [];
        setActiveTabId(nextTabs[0]?.id ?? "");
        setResultsByTab({});
        selectedSchemaRef.current = "public";
        setSelectedSchema("public");
        setExpandedEntities(new Set());
        const [loadedTables] = await Promise.all([
          refreshSchema(),
          refreshSchemas(),
        ]);
        setStatusState("ready");
        setImportSqlDumpOpen(false);
        const n = loadedTables.length;
        showToast(
          `Loaded "${filename}" in a new workspace: ${n} table${n === 1 ? "" : "s"}.`,
        );
      } catch (err) {
        showToast(
          `Import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      } finally {
        setDbLoading(false);
      }
    },
    [persistTabs, refreshSchema, refreshSchemas, showToast],
  );

  // Same flow as performImportSqlDump, but boots from a PGDATA tarball (the
  // binary section of a cloud/share bundle) instead of replaying SQL.
  const performImportPgDataDir = useCallback(
    async (image: Uint8Array, filename: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      setStatusState("loading");
      try {
        await engine.importDataDir(new Blob([image as BlobPart]));
        setActiveDbId(POSTGRES_BLANK_DATABASE.id);
        setCustomDbFilename(filename);
        try {
          localStorage.setItem(storageKey("db"), POSTGRES_BLANK_DATABASE.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(
          POSTGRES_BLANK_DATABASE.id,
          POSTGRES_BLANK_DATABASE.defaultTabs,
        );
        persistTabs(nextTabs, POSTGRES_BLANK_DATABASE.id);
        let nextActive = nextTabs[0]?.id ?? "";
        try {
          const savedActive = localStorage.getItem(
            dbScopedKey(POSTGRES_BLANK_DATABASE.id, "active_tab"),
          );
          if (savedActive && nextTabs.some((tab) => tab.id === savedActive)) {
            nextActive = savedActive;
          }
        } catch {
          /* ignore */
        }
        tabHistoryRef.current = [];
        setActiveTabId(nextActive);
        setResultsByTab({});
        selectedSchemaRef.current = "public";
        setSelectedSchema("public");
        setExpandedEntities(new Set());
        await Promise.all([refreshSchema(), refreshSchemas()]);
        setStatusState("ready");
        showToast(`Loaded "${filename}".`);
      } catch (err) {
        showToast(
          `Import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      }
    },
    [persistTabs, refreshSchema, refreshSchemas, showToast],
  );

  const {
    addTab,
    openTabAndRun,
    closeTab,
    resetTabsForCurrentDb,
    reorderTabs,
    openErDiagramTab,
    openQueryHistoryTab,
  } = useSqlTabManagement({
    tabsRef,
    activeTabIdRef,
    activeDbIdRef,
    tabHistoryRef,
    editorRef,
    setTabs,
    setActiveTabId,
    setResultsByTab,
    setDraggingTabId,
    persistTabs,
    saveTabsImmediate: saveTabs,
    findSampleDatabase: findPostgresSampleDatabase,
    showToast,
    runSqlForTab,
  });

  /** Re-run every open tab whose result came from `tableName`, keeping its
   *  page and page size. Data tabs used to hold whatever rows they were opened
   *  with: adding a row from the sidebar left the grid showing "Rows 1–3 of 3"
   *  next to a table that had four. Called after every mutation the UI makes
   *  to a table, and by the result pane's Refresh button. */
  const refreshTabsForTable = useCallback(
    (tableName: string) => {
      const results = resultsByTabRef.current;
      for (const tab of tabsRef.current) {
        const r = results[tab.id];
        if (!r || r.sourceTable !== tableName) continue;
        const baseSql = r.lazyBaseSql ?? r.lazySql;
        const sql = baseSql ?? r.querySql;
        if (!sql) continue;
        void runSqlForTab(
          tab.id,
          sql,
          r.source,
          r.sourceTable,
          r.lazyPage ?? 0,
          baseSql,
          r.lazyPageSize,
        );
      }
    },
    [runSqlForTab],
  );

  /** Re-run the active tab's query, keeping its page and page size. */
  const refreshActiveResult = useCallback(() => {
    const tabId = activeTabIdRef.current;
    const r = resultsByTabRef.current[tabId];
    if (!r) return;
    const baseSql = r.lazyBaseSql ?? r.lazySql;
    const sql = baseSql ?? r.querySql;
    if (!sql) return;
    void runSqlForTab(
      tabId,
      sql,
      r.source,
      r.sourceTable,
      r.lazyPage ?? 0,
      baseSql,
      r.lazyPageSize,
    );
  }, [runSqlForTab]);

  const previewEntity = useCallback(
    (name: string, kind: "table" | "view") => {
      const schema = selectedSchemaRef.current;
      const sql = `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(name)};`;
      const tab: QueryTab = {
        id: newTabId(),
        title: name,
        code: sql,
        pristineCode: sql,
        kind: kind === "table" ? "view-data" : undefined,
      };
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(
        tab.id,
        sql,
        `${kind === "table" ? "Table" : "View"}: ${name}`,
        kind === "table" ? name : undefined,
      );
    },
    [persistTabs, runSqlForTab],
  );

  // ─── Settings actions ────────────────────────────────────────────────
  const restoreDefaultSettings = useCallback(() => {
    const D = DEFAULT_PLAYGROUND_SETTINGS;
    setFontSize(D.fontSize);
    setOutputFontSize(D.outputFontSize);
    setOutputFontSizeEnabled(D.outputFontSizeEnabled);
    setEditorTheme(D.editorTheme);
    setWordWrap(D.wordWrap);
    setClearBeforeRun(D.clearBeforeRun);
    showToast("Default settings restored.");
  }, [
    setFontSize,
    setOutputFontSize,
    setOutputFontSizeEnabled,
    setEditorTheme,
    setWordWrap,
    setClearBeforeRun,
    showToast,
  ]);

  const clearAllLocalStorage = useCallback(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  // Nuclear wipe: clears every storage surface (localStorage, OPFS,
  // IndexedDB, caches) before reloading.
  const clearAllLocalData = useCallback(() => {
    void (async () => {
      try {
        const mod = await import("../storage/clearAllData");
        await mod.clearAllLocalData();
      } catch {
        /* fall through to reload regardless */
      }
      window.location.reload();
    })();
  }, []);

  const handleFormatCode = useCallback(async () => {
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    if (!code.trim()) return;
    setIsFormatting(true);
    try {
      const { format: sqlFormat } = await import("sql-formatter");
      const formatted = sqlFormat(code, { language: "postgresql" });
      if (formatted === code) {
        showToast("Already formatted, nothing to change.");
        return;
      }
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      });
    } catch {
      // silently ignore formatting errors (e.g. unparseable SQL)
    } finally {
      setIsFormatting(false);
    }
  }, [showToast]);

  // ─── Result/sidebar helpers ──────────────────────────────────────────
  // Resolve PK / FK hints for any table by name, so each result set of a
  // multi-statement run is editable against its own table.
  const tableMetaFor = useCallback(
    (tableName: string) => {
      const cols = columnsByEntity[tableName] ?? [];
      const fks = foreignKeysByEntity[tableName] ?? [];
      return {
        keyHints: {
          pk: new Set(cols.filter((col) => col.pk > 0).map((col) => col.name)),
          fk: new Map(fks.map((fk) => [fk.from, fk])),
          readOnly: new Set(
            cols.filter((col) => col.generated).map((col) => col.name),
          ),
          enums: enumHintsFromColumns(cols),
        },
      };
    },
    [columnsByEntity, foreignKeysByEntity],
  );

  const resultKeyHints = useMemo<ColumnKeyHints | undefined>(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    const cols = columnsByEntity[tableName] ?? [];
    const fks = foreignKeysByEntity[tableName] ?? [];
    return {
      pk: new Set(cols.filter((col) => col.pk > 0).map((col) => col.name)),
      fk: new Map(fks.map((fk) => [fk.from, fk])),
      readOnly: new Set(
        cols.filter((col) => col.generated).map((col) => col.name),
      ),
      enums: enumHintsFromColumns(cols),
    };
  }, [result, columnsByEntity, foreignKeysByEntity]);

  const exportResultSet = useCallback(
    async (
      format: "csv" | "json" | "sql" | "parquet" | "xlsx",
      scope: ResultSetExportScope,
    ) => {
      if (!result || result.sets.length === 0) return;
      const set = resultSetExportSnapshot
        ? (result.sets[resultSetExportSnapshot.setIndex] ?? result.sets.find((s) => s !== null))
        : result.sets.find((s) => s !== null);
      if (!set) return;
      const columns = resultSetExportSnapshot?.columns ?? set.columns;
      let rows =
        scope === "page" && resultSetExportSnapshot
          ? resultSetExportSnapshot.rows
          : (resultSetExportSnapshot?.allRows ?? set.values);
      if (scope === "all" && result.lazySql && engineRef.current) {
        rows =
          ((await engineRef.current.exec(result.lazySql)).find((s) => s !== null))?.values ?? rows;
      }
      const title = activeTab?.title ?? "result_set";
      const filename = `${toFileSafeName(title)}.${format}`;
      // Column types drive per-format serialization (booleans, bytea, jsonb,
      // arrays, numerics); `sourceTable` gives the SQL export a real INSERT
      // target instead of the placeholder `result_set`.
      const opts = {
        columnTypes: set.columnTypes,
        tableName: result.sourceTable ?? undefined,
      };
      if (format === "csv") exportResultToCsv(columns, rows, filename, opts);
      else if (format === "json")
        exportResultToJson(columns, rows, filename, opts);
      else if (format === "sql") exportResultToSql(columns, rows, filename, opts);
      else if (format === "parquet")
        await exportResultToParquet(columns, rows, filename, opts);
      else await exportResultToXlsx(columns, rows, filename, opts);
    },
    [activeTab, result, resultSetExportSnapshot],
  );

  const handleLoadPage = useCallback(
    (sql: string, page: number, explicitPageSize?: number) => {
      const tab = tabsRef.current.find(
        (candidate) => candidate.id === activeTabIdRef.current,
      );
      const curResult = tab ? resultsByTab[tab.id] : null;
      if (!tab) return;
      void runSqlForTab(
        tab.id,
        sql,
        curResult?.source ?? tab.title,
        curResult?.sourceTable,
        page,
        curResult?.lazyBaseSql ?? curResult?.lazySql,
        explicitPageSize,
      );
    },
    [resultsByTab, runSqlForTab],
  );

  const handleLoadMorePage = useCallback(
    async (sql: string, page: number) => {
      const engine = engineRef.current;
      if (!engine || runningRef.current) return;
      const tabId = activeTabIdRef.current;
      const curResult = resultsByTab[tabId];
      if (!curResult?.lazySql || !curResult.lazyInfinite) return;
      const pageSize = curResult.lazyPageSize ?? INFINITE_SCROLL_PAGE_SIZE;
      const offset = page * pageSize;
      const currentSet = curResult.sets[0];
      if (!currentSet || currentSet.values.length !== offset) return;
      runningRef.current = true;
      try {
        const lazy = await engine.execPaged(sql, pageSize, offset);
        const nextSet = lazy.result[0];
        if (!nextSet || nextSet.values.length === 0) return;
        setResultsByTab((prev) => {
          const latest = prev[tabId];
          const latestSet = latest?.sets[0];
          if (
            !latest?.lazyInfinite ||
            !latestSet ||
            latestSet.values.length !== offset
          ) {
            return prev;
          }
          return {
            ...prev,
            [tabId]: {
              ...latest,
              sets: [
                {
                  ...latestSet,
                  values: [...latestSet.values, ...nextSet.values],
                },
                ...latest.sets.slice(1),
              ],
              lazyTotalCount: lazy.totalCount,
            },
          };
        });
      } catch {
        // Keep the already-loaded rows visible if the next chunk fails.
      } finally {
        runningRef.current = false;
        // A run queued while this page was loading must not be stranded.
        drainPendingRun();
      }
    },
    [resultsByTab, drainPendingRun],
  );

  const deleteRowsFromTable = useCallback(
    (
      tableName: string,
      pkColumns: string[],
      pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (pkColumns.length === 0 || pkRows.length === 0) return;
      const tabId = activeTabIdRef.current;
      const schema = selectedSchemaRef.current;
      void engine.deleteRows(tableName, pkColumns, pkRows, schema).then((deleted) => {
        showToast(
          `Deleted ${deleted} row${deleted === 1 ? "" : "s"} from "${tableName}".`,
        );
        const sql = `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(tableName)};`;
        void runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Failed to delete rows from "${tableName}": ${msg}`, "warn");
      });
    },
    [runSqlForTab, showToast],
  );

  const updateRowsInTable = useCallback(
    (
      tableName: string,
      updates: ReadonlyArray<{
        rowIndex: number;
        column: string;
        value: unknown;
      }>,
      refetchSql?: string,
      refetchBaseSql?: string,
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (updates.length === 0) return;
      const tabId = activeTabIdRef.current;
      const schema = selectedSchemaRef.current;
      void engine.updateRows(tableName, updates, schema).then((count) => {
        showToast(
          `Updated ${count} cell${count === 1 ? "" : "s"} in "${tableName}".`,
        );
        if (refetchSql) {
          // Caller supplied a sort-preserving SQL; use it as-is and keep the
          // base SQL (without ORDER BY) for subsequent column-header sorting.
          void runSqlForTab(tabId, `${refetchSql};`, `Table: ${tableName}`, tableName, 0, refetchBaseSql ?? refetchSql);
        } else {
          // Re-fetch with PK ordering so the updated row does not move to the
          // end of the result set (PostgreSQL changes a row's ctid on UPDATE,
          // which would otherwise cause it to appear last in heap order).
          const pkCols = (columnsByEntity[tableName] ?? [])
            .filter((col) => col.pk > 0)
            .sort((a, b) => a.pk - b.pk)
            .map((col) => quoteIdent(col.name));
          const orderBy =
            pkCols.length > 0 ? ` ORDER BY ${pkCols.join(", ")}` : "";
          // Pass the bare SELECT (without ORDER BY) as baseSql so that
          // subsequent column-header sorting doesn't produce a double-ORDER-BY
          // syntax error ("... ORDER BY pk ORDER BY col ASC").
          const baseSql = `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(tableName)}`;
          const sql = `${baseSql}${orderBy};`;
          void runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName, 0, baseSql);
        }
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Failed to update cells in "${tableName}": ${msg}`, "warn");
      });
    },
    [runSqlForTab, showToast, columnsByEntity, quoteIdent],
  );

  const duplicateRowInTable = useCallback(
    (tableName: string, columnNames: string[], values: unknown[]) => {
      const engine = engineRef.current;
      if (!engine) return;
      const tabId = activeTabIdRef.current;
      const schema = selectedSchemaRef.current;
      // Exclude generated columns and serial/sequence columns, PostgreSQL
      // forbids explicit values for GENERATED ALWAYS columns and nextval()
      // PKs will duplicate-key on reuse.
      const skipCols = new Set(
        (columnsByEntity[tableName] ?? [])
          .filter(
            (col) =>
              col.generated !== null ||
              (col.defaultValue !== null &&
                /nextval\(/i.test(col.defaultValue)),
          )
          .map((col) => col.name),
      );
      const filteredNames: string[] = [];
      const filteredValues: unknown[] = [];
      for (let i = 0; i < columnNames.length; i++) {
        if (!skipCols.has(columnNames[i])) {
          filteredNames.push(columnNames[i]);
          filteredValues.push(values[i]);
        }
      }
      void (async () => {
        try {
          await engine.insertRow(tableName, filteredNames, filteredValues, schema);
          showToast(`Duplicated row in "${tableName}".`);
          const sql = `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(tableName)};`;
          void runSqlForTab(tabId, sql, `Table: ${tableName}`, tableName);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Duplicate failed: ${msg}`, "warn");
        }
      })();
    },
    [columnsByEntity, quoteIdent, runSqlForTab, showToast],
  );

  const openAddRow = useCallback(
    async (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      try {
        const allCols = await engine.listColumns(name, selectedSchemaRef.current);
        // Generated columns are computed server-side, never accept input.
        const cols = allCols.filter((c) => c.generated === null);
        const initValues: Record<string, string> = {};
        for (const c of cols) initValues[c.name] = "";
        setAddRowDialog({
          tableName: name,
          columns: cols,
          values: initValues,
          addAnother: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't load columns: ${msg}`, "warn");
      }
    },
    [showToast],
  );

  const submitAddRow = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !addRowDialog) return;
    const { tableName, columns, values, addAnother, emptyAsText } =
      addRowDialog;
    // For a blank input on a column with a server-side default, omit the
    // column so the default (nextval, now(), explicit DEFAULT) applies.
    // Otherwise blank means NULL — unless the field's `''` toggle is on, in
    // which case blank is the empty string, which nothing else could express.
    const columnNames: string[] = [];
    const rowValues: unknown[] = [];
    for (const c of columns) {
      const raw = values[c.name] ?? "";
      const wantsEmptyString = raw === "" && (emptyAsText?.[c.name] ?? false);
      if (raw === "" && c.defaultValue !== null && !wantsEmptyString) continue;
      columnNames.push(c.name);
      rowValues.push(raw === "" && !wantsEmptyString ? null : raw);
    }
    try {
      await engine.insertRow(tableName, columnNames, rowValues, selectedSchemaRef.current);
      showToast(`Row added to "${tableName}".`);
      void refreshSchema().catch(() => undefined);
      refreshTabsForTable(tableName);
      if (addAnother) {
        const newValues: Record<string, string> = {};
        for (const c of columns) newValues[c.name] = "";
        setAddRowDialog({ ...addRowDialog, values: newValues });
      } else {
        setAddRowDialog(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Insert failed: ${msg}`, "warn");
    }
  }, [addRowDialog, refreshSchema, refreshTabsForTable, showToast]);

  const copyEntityName = useCallback(
    (name: string) => {
      void navigator.clipboard?.writeText(name);
      showToast(`Copied "${name}".`);
    },
    [showToast],
  );

  const countEntityRows = useCallback(
    (name: string, kind: "table" | "view") => {
      const schema = selectedSchemaRef.current;
      const sql = `SELECT COUNT(*) AS row_count FROM ${quoteIdent(schema)}.${quoteIdent(name)};`;
      const tab: QueryTab = {
        id: newTabId(),
        title: `Count: ${name}`,
        code: sql,
        pristineCode: sql,
      };
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(
        tab.id,
        sql,
        `${kind === "view" ? "View row count" : "Row count"}: ${name}`,
      );
    },
    [persistTabs, runSqlForTab],
  );

  const viewDDL = useCallback(
    async (name: string) => {
      try {
        const ddl = await engineRef.current?.getDDL(name, selectedSchemaRef.current);
        if (!ddl?.trim()) {
          showToast(`No DDL found for "${name}".`, "warn");
          return;
        }
        setDdlDialog({ title: name, sql: ddl });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(`Couldn't read DDL: ${msg}`, "warn");
      }
    },
    [showToast],
  );

  const openEntityStructure = useCallback(
    async (name: string) => {
      const engine = engineRef.current;
      const schema = selectedSchemaRef.current;
      // Display SQL is for the editor tab only, actual execution uses
      // parameterized execParams below to prevent injection.
      const displaySql = `SELECT\n  column_name AS name,\n  data_type AS type,\n  is_nullable,\n  column_default AS default\nFROM information_schema.columns\nWHERE table_schema = '${schema.replace(/'/g, "''")}'\n  AND table_name = '${name.replace(/'/g, "''")}'\nORDER BY ordinal_position;`;
      const tab: QueryTab = {
        id: newTabId(),
        title: `Structure: ${name}`,
        code: displaySql,
        pristineCode: displaySql,
      };
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      if (!engine) return;
      // Run via parameterized query to avoid any injection risk.
      const paramSql = `SELECT column_name AS name, data_type AS type, is_nullable, column_default AS default FROM information_schema.columns WHERE table_schema = $2 AND table_name = $1 ORDER BY ordinal_position`;
      try {
        const sets = await engine.execParams(paramSql, [name, schema]);
        setResultsByTab((prev) => ({
          ...prev,
          [tab.id]: {
            sets,
            elapsedMs: 0,
            source: `Structure: ${name}`,
          },
        }));
      } catch (err) {
        // Non-fatal: the user can always run the query manually from the tab.
        console.error("[Postgres] openEntityStructure failed:", err);
      }
    },
    [persistTabs],
  );

  const requestDropEntity = useCallback(
    (name: string, kind: PgEntityKind) => {
      setPendingDropEntity({ name, kind });
    },
    [],
  );

  const performDropEntity = useCallback(async () => {
    const target = pendingDropEntity;
    if (!target) return;
    setPendingDropEntity(null);
    try {
      await engineRef.current?.dropEntity(target.name, target.kind, selectedSchemaRef.current);
      await refreshSchema();
      showToast(`Dropped ${target.kind} "${target.name}".`);
    } catch (err) {
      showToast(
        `Drop failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [pendingDropEntity, refreshSchema, showToast]);

  const truncateEntity = useCallback((name: string) => {
    setPendingTruncate(name);
  }, []);

  const confirmTruncate = useCallback(async () => {
    const name = pendingTruncate;
    if (!name) return;
    setPendingTruncate(null);
    try {
      await engineRef.current?.truncateTable(name, selectedSchemaRef.current);
      showToast(`Truncated table "${name}".`);
    } catch (err) {
      showToast(
        `Truncate failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [pendingTruncate, showToast]);

  const exportEntity = useCallback(
    async (
      name: string,
      format: "csv" | "json" | "sql" | "parquet" | "xlsx",
    ) => {
      const schema = selectedSchemaRef.current;
      const sets = await engineRef.current?.exec(
        `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(name)}`,
      );
      const set = sets?.[0];
      if (!set) return;
      const filename = `${toFileSafeName(name)}.${format}`;
      const opts = { columnTypes: set.columnTypes, tableName: name };
      if (format === "csv")
        exportResultToCsv(set.columns, set.values, filename, opts);
      else if (format === "json")
        exportResultToJson(set.columns, set.values, filename, opts);
      else if (format === "sql")
        exportResultToSql(set.columns, set.values, filename, opts);
      else if (format === "parquet")
        await exportResultToParquet(set.columns, set.values, filename, opts);
      else await exportResultToXlsx(set.columns, set.values, filename, opts);
    },
    [],
  );

  // Row counts are precomputed by `refreshSchema`, so this is synchronous.
  // SchemaItem caches the first non-null result it sees, so we can't hand
  // back a stale 0 while a real count is in flight.
  const fetchEntityRowCount = useCallback(
    (name: string): number => rowCountByTable[name] ?? 0,
    [rowCountByTable],
  );

  // ─── Resizer (vertical, between results panel and editor) ────────────
  useEffect(() => {
    const resizer = resizerRef.current;
    const panes = panesRef.current;
    const editorPane = editorPaneRef.current;
    const resultsPane = resultsPaneRef.current;
    if (!resizer || !panes || !editorPane || !resultsPane) return;
    let dragging = false;
    let startY = 0;
    let startEditorH = 0;
    let startResultsH = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startY = e.clientY;
      startEditorH = editorPane.offsetHeight;
      startResultsH = resultsPane.offsetHeight;
      resizer.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const total = startEditorH + startResultsH;
      if (total <= 0) return;
      const dy = e.clientY - startY;
      const editorH = Math.min(
        total - Math.round(total * 0.15),
        Math.max(Math.round(total * 0.15), startEditorH + dy),
      );
      const editorFrac = editorH / total;
      panes.style.gridTemplateRows = `auto minmax(0, ${editorFrac}fr) 6px minmax(0, ${1 - editorFrac}fr)`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    resizer.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      resizer.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Clear any inline gridTemplateRows set by the resizer when entering
  // view-data or er-diagram mode.
  useEffect(() => {
    const panes = panesRef.current;
    if (!panes) return;
    if (activeTab?.kind === "view-data" || activeTab?.kind === "er-diagram") {
      panes.style.gridTemplateRows = "";
    }
  }, [activeTab?.kind]);

  // ─── Sidebar resizer (horizontal, between sidebar and panes) ─────────
  useEffect(() => {
    const shell = shellRef.current;
    const resizer = sidebarResizerRef.current;
    if (!shell || !resizer) return;
    try {
      const saved = Number(localStorage.getItem(storageKey("sidebar_w")));
      if (Number.isFinite(saved) && saved >= 160 && saved <= 600) {
        shell.style.setProperty("--sql-sidebar-width", `${saved}px`);
      }
    } catch {
      // ignore
    }
    let dragging = false;
    let startX = 0;
    let startW = 0;
    const onDown = (e: MouseEvent) => {
      dragging = true;
      startX = e.clientX;
      const sidebar = shell.firstElementChild as HTMLElement | null;
      startW = sidebar?.offsetWidth ?? 240;
      resizer.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const shellWidth = shell.offsetWidth;
      const maxW = Math.max(200, Math.min(600, shellWidth - 320));
      const next = Math.max(160, Math.min(maxW, startW + (e.clientX - startX)));
      shell.style.setProperty("--sql-sidebar-width", `${next}px`);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const sidebar = shell.firstElementChild as HTMLElement | null;
      const w = sidebar?.offsetWidth;
      if (w) {
        try {
          localStorage.setItem(storageKey("sidebar_w"), String(w));
        } catch {
          // ignore
        }
      }
    };
    resizer.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      resizer.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // ─── View Structure drawer ────────────────────────────────────────────

  const openViewStructure = useCallback(
    async (name: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      const schema = selectedSchemaRef.current;
      try {
        const [cols, fks, constraints] = await Promise.all([
          engine.listColumns(name, schema),
          engine.listForeignKeys(name, schema),
          engine.getColumnConstraintInfo(name, schema),
        ]);
        const fkByCol = new Map<string, ForeignKeyInfo>();
        for (const fk of fks) fkByCol.set(fk.from, fk);
        const constraintsByCol = new Map(constraints.map((c) => [c.name, c]));
        const columns = cols.map<PgStructureColumn>((c) => {
          const fk = fkByCol.get(c.name);
          const constraint = constraintsByCol.get(c.name);
          const isAutoIncrement =
            constraint?.isAutoIncrement ??
            /^nextval\s*\(/i.test(c.defaultValue ?? "");
          return {
            id: newPgStructureId(),
            originalName: c.name,
            name: c.name,
            type: c.type || "text",
            nullable: !c.notNull,
            defaultValue: isAutoIncrement ? "" : (c.defaultValue ?? ""),
            isPk: c.pk > 0,
            unique: constraint?.isUnique ?? false,
            autoIncrement: isAutoIncrement,
            fkTable: fk?.table ?? "",
            fkColumn: fk?.to ?? "",
            fkOnDelete: normalizePgFkAction(fk?.onDelete),
            fkOnUpdate: normalizePgFkAction(fk?.onUpdate),
            generated: c.generated
              ? {
                  expression: c.generated.expression,
                  originalExpression: c.generated.expression,
                }
              : null,
          };
        });
        const nextDialog = {
          tableName: name,
          newTableName: name,
          columns,
          originalSignature: "",
        };
        setViewStructureDialog({
          ...nextDialog,
          originalSignature: pgStructureSignature(nextDialog),
        });
      } catch (err) {
        showToast(
          `Couldn't load structure: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
      }
    },
    [showToast],
  );

  const submitViewStructure = useCallback(async () => {
    const dialog = viewStructureDialog;
    const engine = engineRef.current;
    if (!dialog || !engine) return;
    const validation = validatePgStructure(dialog, columnsByEntity);
    if (!validation.isValid) {
      showToast(
        validation.errors[0] ?? "Fix validation errors before saving.",
        "warn",
      );
      return;
    }
    if (!validation.isDirty) return;
    try {
      await engine.rebuildTable({
        originalName: dialog.tableName,
        newName: dialog.newTableName.trim(),
        columns: dialog.columns.map((col) => ({
          name: col.name.trim(),
          type: col.type.trim(),
          notNull: !col.nullable,
          primaryKey: col.isPk,
          unique: col.unique,
          autoIncrement: col.autoIncrement || isPgSerialType(col.type),
          defaultValue: col.defaultValue.trim() || undefined,
          foreignKey:
            col.fkTable && col.fkColumn
              ? {
                  table: col.fkTable,
                  column: col.fkColumn,
                  onDelete: normalizePgFkAction(col.fkOnDelete),
                  onUpdate: normalizePgFkAction(col.fkOnUpdate),
                }
              : undefined,
          originalName: col.originalName ?? undefined,
          generated: col.generated
            ? {
                expression: col.generated.expression.trim(),
                storageType: "STORED" as const,
              }
            : undefined,
        })),
      }, selectedSchemaRef.current);
      await refreshSchema();
      showToast(`Updated structure of "${dialog.newTableName.trim()}".`);
      setViewStructureDialog(null);
    } catch (err) {
      showToast(
        `Update failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [viewStructureDialog, columnsByEntity, refreshSchema, showToast]);

  const openAddTable = useCallback(() => {
    setAddTableTouchedColIds(new Set());
    setAddTableDialog({
      tableName: "",
      newTableName: "new_table",
      columns: [
        {
          id: newPgStructureId(),
          originalName: null,
          name: "id",
          type: "bigserial",
          nullable: false,
          defaultValue: "",
          isPk: true,
          unique: false,
          autoIncrement: true,
          fkTable: "",
          fkColumn: "",
          fkOnDelete: "NO ACTION",
          fkOnUpdate: "NO ACTION",
          generated: null,
        },
      ],
      originalSignature: "",
    });
  }, []);

  const submitAddTable = useCallback(async () => {
    const dialog = addTableDialog;
    const engine = engineRef.current;
    if (!dialog || !engine) return;
    const validation = validatePgStructure(dialog, columnsByEntity);
    if (!validation.isValid) {
      // Mark all columns as touched so errors are shown in the form.
      setAddTableTouchedColIds(new Set(dialog.columns.map((c) => c.id)));
      showToast(
        validation.errors[0] ?? "Fix validation errors before saving.",
        "warn",
      );
      return;
    }
    const trimmedName = dialog.newTableName.trim();
    try {
      await engine.createTable(
        trimmedName,
        dialog.columns.map((col) => ({
          name: col.name.trim(),
          type: col.type.trim(),
          notNull: !col.nullable,
          primaryKey: col.isPk,
          unique: col.unique,
          autoIncrement: col.autoIncrement || isPgSerialType(col.type),
          defaultValue: col.defaultValue.trim() || undefined,
          foreignKey:
            col.fkTable && col.fkColumn
              ? {
                  table: col.fkTable,
                  column: col.fkColumn,
                  onDelete: normalizePgFkAction(col.fkOnDelete),
                  onUpdate: normalizePgFkAction(col.fkOnUpdate),
                }
              : undefined,
          generated: col.generated
            ? {
                expression: col.generated.expression.trim(),
                storageType: "STORED" as const,
              }
            : undefined,
        })),
        selectedSchemaRef.current,
      );
      await refreshSchema();
      showToast(`Created table "${trimmedName}".`);
      setAddTableDialog(null);
    } catch (err) {
      showToast(
        `Create failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [addTableDialog, columnsByEntity, refreshSchema, showToast]);

  // ─── Export database helpers ──────────────────────────────────────────

  /** Serializes the active database to a replayable SQL dump. Shared by the
   *  "SQL dump (.sql)" export download and the cloud/share bundle builder
   *  (ShareControls / workspaceCloud). Returns null while the engine is booting. */
  const buildPostgresDumpSql = useCallback(async (): Promise<string | null> => {
    const engine = engineRef.current;
    if (!engine) return null;
    const schema = selectedSchemaRef.current;
    const lines: string[] = [
      `-- PostgreSQL dump`,
      `-- Generated by Dataslope\n`,
    ];
    // Objects are emitted in the only order that replays: standalone
    // sequences → tables (FK-ordered) → data → setval → indexes → functions →
    // views → triggers. Anything a table's own DDL already carries (serial
    // sequences, PK/FK/UNIQUE/CHECK, constraint-backed indexes) is not
    // repeated here.
    const objects = await engine.getSchemaDumpObjects(schema);
    const identityAlways = new Set(objects.identityAlwaysTables);

    if (objects.sequences.length > 0) {
      lines.push("-- Sequences");
      for (const seq of objects.sequences) lines.push(`${seq.sql}\n`);
    }

    // Emit tables in FK dependency order so constraints and INSERTs never
    // reference a table that doesn't exist yet on re-import.
    const fkDeps = new Map<string, string[]>();
    await Promise.all(
      tables.map(async (t) => {
        try {
          const fks = await engine.listForeignKeys(t, schema);
          fkDeps.set(t, fks.map((fk) => fk.table));
        } catch {
          fkDeps.set(t, []);
        }
      }),
    );
    const orderedTables = topoSortByForeignKeys(
      tables,
      (t) => fkDeps.get(t) ?? [],
    );
    for (const tableName of orderedTables) {
      const ddl = await engine.getDDL(tableName, schema);
      // `getDDL` returns a terminated statement; appending another `;` here
      // produced the stray `);;` every CREATE TABLE used to end with.
      if (ddl) lines.push(`${ddl.trimEnd()}\n`);
      // Omit generated columns from INSERTs: writing them fails on re-import
      // ("cannot insert a non-DEFAULT value into column …").
      const colInfo = await engine.listColumns(tableName, schema);
      const generatedCols = new Set(
        colInfo.filter((c) => c.generated).map((c) => c.name),
      );
      const typeByName = new Map(colInfo.map((c) => [c.name, c.type]));
      const sets = await engine.exec(
        `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(tableName)}`,
      );
      const set = sets?.[0];
      if (!set) continue;
      const { columns, values: rows } = set;
      const keepIdx = columns
        .map((c, i) => (generatedCols.has(c) ? -1 : i))
        .filter((i) => i >= 0);
      if (keepIdx.length === 0) continue;
      const quotedCols = keepIdx.map((i) => quoteIdent(columns[i])).join(", ");
      // A `GENERATED ALWAYS AS IDENTITY` column rejects an explicit value
      // unless the INSERT says so, which would fail the restore on row 1.
      const overriding = identityAlways.has(tableName)
        ? " OVERRIDING SYSTEM VALUE"
        : "";
      for (const row of rows) {
        const vals = keepIdx
          .map((i) => formatSqlDumpValue(row[i], typeByName.get(columns[i])))
          .join(", ");
        lines.push(
          `INSERT INTO ${quoteIdent(tableName)} (${quotedCols})${overriding} VALUES (${vals});`,
        );
      }
      lines.push("");
    }

    // After the data: a sequence left at its start value would hand out keys
    // that already exist on the very first insert into a restored table.
    if (objects.sequenceSetvals.length > 0) {
      lines.push("-- Sequence positions");
      lines.push(...objects.sequenceSetvals, "");
    }
    const section = (
      title: string,
      items: readonly { name: string; sql: string }[],
    ) => {
      if (items.length === 0) return;
      lines.push(`-- ${title}`);
      for (const item of items) lines.push(`${item.sql}\n`);
    };
    section("Indexes", objects.indexes);
    section("Functions", objects.functions);
    section("Views", objects.views);
    section("Triggers", objects.triggers);

    return lines.join("\n");
  }, [tables]);

  const exportPostgresDatabase = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || tables.length === 0) return;
    try {
      const sql = await buildPostgresDumpSql();
      if (sql === null) return;
      const baseName =
        displayFilename.replace(/\.[^.]+$/, "") || "database";
      const filename = `${baseName}.sql`;
      triggerDownload(
        new Blob([sql], { type: "text/plain;charset=utf-8" }),
        filename,
      );
      showToast(`Exported ${filename}.`);
    } catch (err) {
      showToast(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [tables, buildPostgresDumpSql, displayFilename, showToast]);

  // Cloud saves + sharing: a SQL bundle carries the database as a PGDATA
  // tarball (full fidelity — sequences, functions, etc.) plus the query
  // tabs; reopening boots straight from the tarball.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const buildCloudBundle = useCallback<BuildBundle>(
    async (opts) => {
      const engine = engineRef.current;
      if (!engine) return null;
      const tarball = await engine.dumpDataDir();
      const image = new Uint8Array(await tarball.arrayBuffer());
      const { tabs: bundleTabs, activeTabIndex } = sqlTabsForBundle(
        tabsRef.current,
        activeTabIdRef.current,
      );
      // Only the cloud-backup path asks for this; a share must not carry it.
      const personal = opts?.includePersonal
        ? readQueryLog(queryLogKeys)
        : undefined;
      return {
        version: 2,
        kind: "sql",
        playground: PLAYGROUND_ID,
        name: activeWorkspace?.name ?? "Postgres Workspace",
        exportedAt: Date.now(),
        sql: {
          dialect: "postgres",
          dbFormat: "pgdata-tar",
          dbBytes: image.byteLength,
          tabs: bundleTabs,
          activeTabIndex,
          databaseLabel: displayFilename,
          personal,
        },
        database: image,
      };
    },
    [activeWorkspace?.name, displayFilename, queryLogKeys],
  );

  // Apply a pending share/cloud bundle once the engine is up. The bundle's
  // queries are pre-seeded into the blank database's stored tabs because
  // performImportSqlDump reloads tabs from localStorage after the import.
  const pendingBundleTriedRef = useRef(false);
  useEffect(() => {
    if (!loaded || pendingBundleTriedRef.current) return;
    pendingBundleTriedRef.current = true;
    const pendingRef = takePendingBundleRef(PLAYGROUND_ID);
    if (!pendingRef) return;
    void (async () => {
      try {
        const bundle = await fetchBundleByRef(pendingRef);
        if (
          bundle.kind !== "sql" ||
          bundle.playground !== PLAYGROUND_ID ||
          !bundle.sql ||
          !bundle.database
        ) {
          throw new Error("This link isn't a PostgreSQL playground.");
        }
        const seeded = bundleTabSeeds(bundle).map((seed) => ({
          ...seed,
          id: newTabId(),
          pristineCode: seed.code,
        }));
        saveTabs(POSTGRES_BLANK_DATABASE.id, seeded);
        try {
          const activeIdx = Math.min(
            Math.max(0, bundle.sql.activeTabIndex ?? 0),
            seeded.length - 1,
          );
          localStorage.setItem(
            dbScopedKey(POSTGRES_BLANK_DATABASE.id, "active_tab"),
            seeded[activeIdx].id,
          );
        } catch {
          /* ignore */
        }
        await performImportPgDataDir(
          bundle.database,
          bundle.sql.databaseLabel ?? bundle.name,
        );
        // A cloud save is the owner's own; a share is someone else's copy,
        // whose `personal` section is not ours to absorb.
        if (pendingRef.source === "cloud") {
          const restored = restoreQueryLog(bundle.sql.personal, queryLogKeys);
          if (restored) replaceHistory(restored.history);
        }
      } catch (err) {
        showToast(
          `Couldn't open the playground: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
      }
    })();
  }, [loaded, performImportPgDataDir, showToast, queryLogKeys, replaceHistory]);

  const exportPostgresDatabaseToXlsx = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || tables.length === 0) return;
    const schema = selectedSchemaRef.current;
    const baseName =
      displayFilename.replace(/\.[^.]+$/, "") || "database";
    const filename = `${baseName}.xlsx`;
    try {
      const mod = await initXlsxWasm();
      const workbook = new mod.Workbook();
      let sheetCount = 0;
      for (const tableName of tables) {
        const sets = await engine.exec(
          `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(tableName)}`,
        );
        const set = sets?.[0];
        if (!set) continue;
        const { columns, values: rows } = set;
        const sheetName =
          tableName.length > MAX_EXCEL_SHEET_NAME_LENGTH
            ? tableName.slice(0, MAX_EXCEL_SHEET_NAME_LENGTH)
            : tableName;
        const worksheet = workbook.addWorksheet();
        worksheet.setName(sheetName);
        worksheet.writeRow(0, 0, columns);
        for (let ri = 0; ri < rows.length; ri++) {
          worksheet.writeRow(ri + 1, 0, rows[ri].map(toExcelData));
        }
        sheetCount++;
      }
      if (sheetCount === 0) {
        showToast("No tables to export.", "warn");
        return;
      }
      const bytes = workbook.saveToBufferSync();
      triggerDownload(
        new Blob([bytes as BlobPart], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        filename,
      );
      showToast(`Exported ${filename}.`);
    } catch (err) {
      showToast(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
        "warn",
      );
    }
  }, [tables, displayFilename, showToast]);

  // ─── Import handlers ─────────────────────────────────────────────────
  const handleCsvFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const { headers, rows } = parseCsv(text);
          if (headers.length === 0) {
            showToast("CSV file appears to be empty.", "warn");
            return;
          }
          setImportCsvState({
            tableName: tableNameFromFilename(file.name),
            headers,
            rows,
            rawText: text,
            targetMode: "new",
            targetTable: tables[0] ?? "",
            colCompare: null,
            columnTypes: inferCsvColumnTypes(headers, rows),
          });
        } catch (err) {
          showToast(
            `Could not parse CSV: ${err instanceof Error ? err.message : String(err)}`,
            "warn",
          );
        }
      };
      reader.readAsText(file);
    },
    [showToast, tables],
  );

  const handleJsonFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text) as unknown;
          if (!Array.isArray(parsed)) {
            showToast(
              "JSON must be an array of objects (e.g. [{...}, {...}]).",
              "warn",
            );
            return;
          }
          if (parsed.length === 0) {
            showToast("JSON array is empty.", "warn");
            return;
          }
          const keySet = new Set<string>();
          for (const obj of parsed) {
            if (obj && typeof obj === "object" && !Array.isArray(obj)) {
              for (const k of Object.keys(obj as Record<string, unknown>)) {
                keySet.add(k);
              }
            }
          }
          const headers = Array.from(keySet);
          if (headers.length === 0) {
            showToast("JSON objects appear to have no keys.", "warn");
            return;
          }
          const rows = parsed.map((obj) => {
            const record = obj as Record<string, unknown>;
            return headers.map((h) => {
              const v = record[h];
              if (v === null || v === undefined) return "";
              if (typeof v === "object") return JSON.stringify(v);
              return String(v);
            });
          });
          setImportJsonState({
            tableName: tableNameFromFilename(file.name),
            headers,
            rows,
            rawText: text,
            targetMode: "new",
            targetTable: tables[0] ?? "",
            colCompare: null,
            columnTypes: inferCsvColumnTypes(headers, rows),
          });
        } catch (err) {
          showToast(
            `Could not parse JSON: ${err instanceof Error ? err.message : String(err)}`,
            "warn",
          );
        }
      };
      reader.readAsText(file);
    },
    [showToast, tables],
  );

  const handleParquetFile = useCallback(
    async (file: File) => {
      try {
        showToast("Reading parquet file…");
        const { columns, rows } = await readParquetFile(file);
        if (columns.length === 0) {
          showToast("Parquet file appears to have no columns.", "warn");
          return;
        }
        setImportParquetState({
          tableName: tableNameFromFilename(file.name),
          columns,
          rows,
          targetMode: "new",
          targetTable: tables[0] ?? "",
          colCompare: null,
        });
      } catch (err) {
        showToast(
          `Parquet import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
      }
    },
    [showToast, tables],
  );

  const submitImport = useCallback(
    async (flavor: ImportFlavor) => {
      const engine = engineRef.current;
      if (!engine) return;
      const fileColumns =
        flavor === "csv"
          ? importCsvState?.headers
          : flavor === "json"
            ? importJsonState?.headers
            : importParquetState?.columns;
      const rows: ReadonlyArray<ReadonlyArray<unknown>> | undefined =
        flavor === "csv"
          ? importCsvState?.rows
          : flavor === "json"
            ? importJsonState?.rows
            : importParquetState?.rows;
      const mode =
        flavor === "csv"
          ? importCsvState?.targetMode
          : flavor === "json"
            ? importJsonState?.targetMode
            : importParquetState?.targetMode;
      const target =
        flavor === "csv"
          ? importCsvState?.targetTable
          : flavor === "json"
            ? importJsonState?.targetTable
            : importParquetState?.targetTable;
      const newTableName =
        flavor === "csv"
          ? importCsvState?.tableName
          : flavor === "json"
            ? importJsonState?.tableName
            : importParquetState?.tableName;
      if (!fileColumns || !rows) return;
      const isExisting = mode === "existing" && target;
      const effectiveTable = isExisting ? target! : (newTableName ?? "").trim();
      if (!effectiveTable) {
        showToast("Table name cannot be empty.", "warn");
        return;
      }
      // Only a "New table" import creates columns, so inferred types apply
      // there; importing into an existing table uses that table's own types.
      const columnTypes = isExisting
        ? undefined
        : flavor === "csv"
          ? importCsvState?.columnTypes
          : flavor === "json"
            ? importJsonState?.columnTypes
            : undefined;
      try {
        await importRowsIntoPostgres(
          engine,
          effectiveTable,
          fileColumns,
          rows,
          {
            createTable: !isExisting,
            columnTypes,
          },
        );
        await refreshSchema();
        if (flavor === "csv") {
          setImportCsvOpen(false);
          setImportCsvState(null);
        } else if (flavor === "json") {
          setImportJsonOpen(false);
          setImportJsonState(null);
        } else {
          setImportParquetOpen(false);
          setImportParquetState(null);
        }
        showToast(
          `Imported ${rows.length} row${rows.length === 1 ? "" : "s"} into "${effectiveTable}".`,
        );
      } catch (err) {
        showToast(
          `${flavor.toUpperCase()} import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
      }
    },
    [
      importCsvState,
      importJsonState,
      importParquetState,
      refreshSchema,
      showToast,
    ],
  );

  // Defined once, rendered in both the sidebar and the mobile drawer menu.
  const databaseSelector = (
    <DatabaseSelector
      value={activeDbId}
      displayFilename={displayFilename}
      samples={POSTGRES_SAMPLE_DATABASES}
      actions={POSTGRES_DB_ACTIONS}
      chevron={<ChevronDown size={12} />}
      onChange={(value) => {
        if (value === "__new_db__") {
          requestDbSwitch(POSTGRES_BLANK_DATABASE.id);
          return;
        }
        if (value === "__import_sql_dump__") {
          setImportSqlDumpOpen(true);
          return;
        }
        if (value === "__rename_db__") {
          const cur = displayFilename;
          const dotIdx = cur.lastIndexOf(".");
          if (dotIdx > 0) {
            setRenameDbName(cur.slice(0, dotIdx));
            setRenameDbExt(cur.slice(dotIdx));
          } else {
            setRenameDbName(cur);
            setRenameDbExt(".pg");
          }
          setRenameDbOpen(true);
          return;
        }
        requestDbSwitch(value);
      }}
    />
  );

  // One definition drives both the desktop ⋯ menu and the mobile
  // drawer's sectioned rows.
  const baseMoreSections: MoreMenuSection[] = [
                {
                  label: "Data",
                  items: [
                    {
                      key: "import",
                      label: "Import…",
                      icon: ArrowUpFromLine,
                      panel: {
                        title: "Import data",
                        render: (close: () => void) => (
                          <>
                            <button
                              type="button"
                              className="example-item"
                              onClick={() => {
                                close();
                                setImportSqlDumpOpen(true);
                              }}
                            >
                              <div className="ex-title">
                                from SQL dump
                                <span className="ext-badge">.sql</span>
                              </div>
                              <div className="ex-desc">
                                Load database from a SQL dump file
                              </div>
                            </button>
                            <button
                              type="button"
                              className="example-item"
                              onClick={() => {
                                close();
                                setImportCsvState(null);
                                setImportCsvOpen(true);
                              }}
                            >
                              <div className="ex-title">
                                from CSV
                                <span className="ext-badge">.csv</span>
                              </div>
                              <div className="ex-desc">Add table from CSV file</div>
                            </button>
                            <button
                              type="button"
                              className="example-item"
                              onClick={() => {
                                close();
                                setImportJsonState(null);
                                setImportJsonOpen(true);
                              }}
                            >
                              <div className="ex-title">
                                from JSON
                                <span className="ext-badge">.json</span>
                              </div>
                              <div className="ex-desc">Add table from JSON array</div>
                            </button>
                            <button
                              type="button"
                              className="example-item"
                              onClick={() => {
                                close();
                                setImportParquetState(null);
                                setImportParquetOpen(true);
                              }}
                            >
                              <div className="ex-title">
                                from Parquet
                                <span className="ext-badge">.parquet</span>
                              </div>
                              <div className="ex-desc">Add table from Parquet file</div>
                            </button>
                          </>
                        ),
                      },
                    },
                    {
                      key: "export",
                      label: "Export database",
                      icon: ArrowDownToLine,
                      panel: {
                        title: "Export database",
                        render: (close: () => void) =>
                          tables.length === 0 ? (
                            <div
                              className="ph-more-info-notes"
                              style={{ padding: 14 }}
                            >
                              Create a table to export the database.
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="example-item"
                                onClick={() => {
                                  close();
                                  void exportPostgresDatabase();
                                }}
                              >
                                <div className="ex-title">
                                  SQL Dump
                                  <span className="ext-badge">.sql</span>
                                </div>
                                <div className="ex-desc">CREATE + INSERT statements</div>
                              </button>
                              <button
                                type="button"
                                className="example-item"
                                onClick={() => {
                                  close();
                                  void exportPostgresDatabaseToXlsx();
                                }}
                              >
                                <div className="ex-title">
                                  Excel Workbook
                                  <span className="ext-badge">.xlsx</span>
                                </div>
                                <div className="ex-desc">One sheet per table</div>
                              </button>
                            </>
                          ),
                      },
                    },
                  ],
                },
                {
                  label: "Tools",
                  items: [
                    {
                      key: "history",
                      label: "Query history",
                      icon: History,
                      onSelect: openQueryHistoryTab,
                    },
                    {
                      key: "er",
                      label: "ER diagram",
                      icon: Network,
                      onSelect: openErDiagramTab,
                    },
                  ],
                },
                {
                  label: "Playground",
                  items: [
                    {
                      key: "info",
                      label: "Runtime info",
                      icon: Info,
                      panel: {
                        title: "Runtime info",
                        render: () => (
                          <div className="ph-more-info">
                            <RuntimeInfoContent info={RUNTIME_INFO} />
                          </div>
                        ),
                      },
                    },
                    {
                      key: "workspaces",
                      label: "Workspaces",
                      icon: FolderOpen,
                      onSelect: () => setWorkspaceManagerOpen(true),
                    },
                    {
                      key: "settings",
                      label: "Settings",
                      icon: SettingsIcon,
                      onSelect: openSettingsTab,
                    },
                  ],
                },
              ];

  // Auth entry point lives in the ⋯ menu's last group (the header has no
  // room). Null while the first session fetch is in flight, so nothing flashes.
  const accountSection = useAccountMenuSection();
  const moreSections: MoreMenuSection[] = accountSection
    ? [...baseMoreSections, accountSection]
    : baseMoreSections;

  return (
    <SqlPlaygroundShell
      playgroundId={PLAYGROUND_ID}
      playgroundTitle="PostgreSQL Playground"
      loaded={loaded}
      statusState={statusState}
      loadingCaption={loadingMessage}
      workspaceConflict={workspaceConflict}
      onOpenNewWorkspace={handleConflictNewWorkspace}
      onOpenCopy={handleConflictOpenCopy}
      copyBusy={conflictCopyBusy}
      copyError={conflictCopyError}
      headerName={
        activeWorkspace ? (
          <>
            <HeaderDivider />
            <span className="ph-name-group">
              <WorkspaceNameControl
                workspaceId={activeWorkspace.id}
                name={activeWorkspace.name}
                onRenamed={(name) =>
                  setActiveWorkspace({ id: activeWorkspace.id, name })
                }
              />
              <NewWorkspaceControl
                playgroundId={PLAYGROUND_ID}
                icon={DatabasePlus}
              />
            </span>
          </>
        ) : null
      }
      headerActions={
        <>
          {activeWorkspace && (
            <WorkspaceBadge
              playgroundId={PLAYGROUND_ID}
              activeWorkspaceId={activeWorkspace.id}
              activeWorkspaceName={activeWorkspace.name}
              managerOpen={workspaceManagerOpen}
              onManagerOpenChange={setWorkspaceManagerOpen}
              unsaved={
                !workspaceSaved &&
                tabs.some((t) => !t.kind && t.code !== t.pristineCode)
              }
              onSave={handleSaveWorkspace}
              buildBundle={buildCloudBundle}
              hideBadge
            />
          )}
          <div className="ph-actions desktop-only">
            {activeWorkspace && (
              <SaveControl
                playgroundId={PLAYGROUND_ID}
                workspaceId={activeWorkspace.id}
                workspaceName={activeWorkspace.name}
                unsaved={
                  !workspaceSaved &&
                  tabs.some((t) => !t.kind && t.code !== t.pristineCode)
                }
                onSave={handleSaveWorkspace}
                buildBundle={buildCloudBundle}
                onNotify={showToast}
              />
            )}
            <ShareControls
              workspaceName={activeWorkspace?.name ?? ""}
              buildBundle={buildCloudBundle}
              shareOpen={shareDialogOpen}
              onShareOpenChange={setShareDialogOpen}
            />
            <MoreMenu sections={moreSections} />
          </div>
        </>
      }
      mobileMenu={
        <>
          <div className="mobile-menu-db-selector">{databaseSelector}</div>
          <MobileMenuLabel>Workspace</MobileMenuLabel>
          {activeWorkspace && (
            <MobileSaveMenu
              playgroundId={PLAYGROUND_ID}
              workspaceId={activeWorkspace.id}
              workspaceName={activeWorkspace.name}
              unsaved={
                !workspaceSaved &&
                tabs.some((t) => !t.kind && t.code !== t.pristineCode)
              }
              onSave={handleSaveWorkspace}
              buildBundle={buildCloudBundle}
              onNotify={showToast}
            />
          )}
          <MobileMenuAction
            icon={Share2}
            label="Share"
            chevron
            onClick={() => setShareDialogOpen(true)}
          />
          <MobileMoreSections sections={moreSections} />
        </>
      }
    >
        <DdlViewerDialog
          open={ddlDialog !== null}
          onOpenChange={(next) => { if (!next) setDdlDialog(null); }}
          title={ddlDialog?.title ?? ""}
          sql={ddlDialog?.sql ?? ""}
          theme={editorTheme}
          isPostgres
          onCopied={() => showToast("Copied DDL to clipboard.")}
          onCopyFailed={() => showToast("Couldn't copy to clipboard.", "warn")}
        />

        <ImportSqlDumpDialog
          open={importSqlDumpOpen}
          dragging={importSqlDumpDragging}
          onClose={() => setImportSqlDumpOpen(false)}
          onDraggingChange={setImportSqlDumpDragging}
          onImport={(sql, filename) => void performImportSqlDump(sql, filename)}
          onImportInNewWorkspace={(sql, filename) =>
            void performImportSqlDumpInNewWorkspace(sql, filename)
          }
          persists={activeWorkspace !== null}
        />

        <RenameDatabaseDialog
          open={renameDbOpen}
          name={renameDbName}
          ext={renameDbExt}
          extensionOptions={[".pg", ".sql", ".dump"]}
          onNameChange={setRenameDbName}
          onExtChange={setRenameDbExt}
          onClose={() => setRenameDbOpen(false)}
          onConfirm={(newFilename) => {
            setCustomDbFilename(newFilename);
            showToast(`Renamed to "${newFilename}".`);
            setRenameDbOpen(false);
          }}
        />

        <SwitchDatabaseDialog
          open={pendingDbId !== null}
          onOpenChange={(next) => { if (!next) setPendingDbId(null); }}
          currentWorkspaceName={activeWorkspace?.name ?? "Default Postgres Workspace"}
          newDbFilename={pendingDbId ? findPostgresSampleDatabase(pendingDbId).filename : ""}
          onOverwrite={() => {
            if (pendingDbId) void performDbSwitch(pendingDbId);
            setPendingDbId(null);
          }}
          onCreateNew={async () => {
            const id = pendingDbId;
            setPendingDbId(null);
            if (id) await performNewWorkspaceSwitch(id);
          }}
        />

        <SchemaActionDialogs
          dropEntityPending={pendingDropEntity}
          onDropEntityOpenChange={(next) => { if (!next) setPendingDropEntity(null); }}
          onDropEntityConfirm={() => void performDropEntity()}
          truncatePending={pendingTruncate}
          onTruncateOpenChange={(next) => { if (!next) setPendingTruncate(null); }}
          onTruncateConfirm={() => void confirmTruncate()}
          dropDetail={
            pendingDropEntity &&
            (pendingDropEntity.kind === "table" ||
              pendingDropEntity.kind === "view") ? (
              <>
                Uses <strong>CASCADE</strong>: objects that depend on it (views,
                foreign keys, …) are dropped too.
              </>
            ) : null
          }
          truncateDetail={
            <>
              Runs <strong>TRUNCATE … RESTART IDENTITY CASCADE</strong>:
              identity/serial counters reset and tables referencing this one via
              foreign keys are truncated too.
            </>
          }
        />

        <SqlSettingsConfirmDialogs
          dialectDisplayName="PostgreSQL"
          restoreOpen={confirmRestoreOpen}
          onRestoreOpenChange={setConfirmRestoreOpen}
          onRestoreConfirm={restoreDefaultSettings}
          clearStorageOpen={confirmClearStorageOpen}
          onClearStorageOpenChange={setConfirmClearStorageOpen}
          onClearStorageConfirm={clearAllLocalStorage}
          clearAllDataOpen={confirmClearAllDataOpen}
          onClearAllDataOpenChange={setConfirmClearAllDataOpen}
          onClearAllDataConfirm={clearAllLocalData}
        />

        {/* ── View/Edit Structure drawer ── */}
        <Dialog.Root
          open={viewStructureDialog !== null}
          onOpenChange={(next) => {
            if (!next) {
              setViewStructureDialog(null);
              setViewStructureTouchedColIds(new Set());
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer sql-structure-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    View/Edit Structure
                  </Dialog.Title>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {viewStructureDialog && (
                <div className="sql-modify-body" ref={viewStructureBodyRef}>
                  <label className="sql-modify-field">
                    <span className="sql-modify-field-label">Table name</span>
                    <div className="sql-modify-table-name-wrap">
                      <Table
                        size={14}
                        className="sql-modify-table-name-icon"
                        aria-hidden="true"
                      />
                      <input
                        className={`sql-rename-input sql-modify-table-name-input${pgStructureValidation.hasTableNameError ? " sql-modify-col-name-error" : ""}`}
                        value={viewStructureDialog.newTableName}
                        onChange={(e) =>
                          setViewStructureDialog((prev) =>
                            prev
                              ? { ...prev, newTableName: e.target.value }
                              : null,
                          )
                        }
                      />
                    </div>
                  </label>
                  {(() => {
                    const regularCols = viewStructureDialog.columns.filter(
                      (c) => !c.generated,
                    );
                    const generatedCols = viewStructureDialog.columns.filter(
                      (c) => c.generated !== null,
                    );
                    return (
                      <>
                        <div className="sql-modify-columns">
                          <div className="sql-modify-cols-header">
                            <span className="sql-modify-cols-title">
                              <Columns3
                                size={13}
                                className="sql-modify-cols-icon"
                                aria-hidden="true"
                              />
                              Columns
                            </span>
                            <span className="sql-modify-cols-count">
                              {regularCols.length}
                            </span>
                          </div>
                          <DndContext
                            sensors={pgStructureSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event: DragEndEvent) => {
                              const { active, over } = event;
                              if (!over || active.id === over.id) return;
                              const cols = viewStructureDialog.columns;
                              const oldIndex = cols.findIndex(
                                (c) => c.id === active.id,
                              );
                              const newIndex = cols.findIndex(
                                (c) => c.id === over.id,
                              );
                              if (oldIndex === -1 || newIndex === -1) return;
                              setViewStructureDialog({
                                ...viewStructureDialog,
                                columns: arrayMove(cols, oldIndex, newIndex),
                              });
                            }}
                          >
                            <SortableContext
                              items={regularCols.map((c) => c.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="sql-modify-table-wrap">
                                <table className="sql-modify-table">
                                  <StructureTableHeader />
                                  <tbody>
                                    {regularCols.map((col) => (
                                      <PgStructureColumnRow
                                        key={col.id}
                                        col={col}
                                        onChange={(patch) =>
                                          setViewStructureDialog((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  columns: prev.columns.map(
                                                    (c) =>
                                                      c.id === col.id
                                                        ? { ...c, ...patch }
                                                        : c,
                                                  ),
                                                }
                                              : null,
                                          )
                                        }
                                        onRemove={() =>
                                          setViewStructureDialog((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  columns: prev.columns.filter(
                                                    (c) => c.id !== col.id,
                                                  ),
                                                }
                                              : null,
                                          )
                                        }
                                        hasError={viewStructureDisplayValidation.invalidColumnIds.has(
                                          col.id,
                                        )}
                                        onBlurName={() =>
                                          setViewStructureTouchedColIds(
                                            (prev) =>
                                              new Set([...prev, col.id]),
                                          )
                                        }
                                        knownTables={tables}
                                        columnsByTable={columnsByEntity}
                                      />
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                        <button
                          type="button"
                          className="confirm-btn confirm-btn-secondary sql-modify-add"
                          onClick={() => {
                            const newCol = makeNewPgColumn();
                            setViewStructurePendingFocusId(newCol.id);
                            setViewStructureDialog((prev) => {
                              if (!prev) return null;
                              const firstGenIdx = prev.columns.findIndex(
                                (col) => col.generated,
                              );
                              const insertAt =
                                firstGenIdx === -1
                                  ? prev.columns.length
                                  : firstGenIdx;
                              const nextColumns = [...prev.columns];
                              nextColumns.splice(insertAt, 0, newCol);
                              return { ...prev, columns: nextColumns };
                            });
                          }}
                        >
                          <Plus size={12} aria-hidden="true" /> Add column
                        </button>
                        {viewStructureDisplayValidation.errors.length > 0 && (
                          <div className="sql-modify-validation" role="alert">
                            {viewStructureDisplayValidation.errors.map((error) => (
                              <div key={error}>{error}</div>
                            ))}
                          </div>
                        )}
                        {generatedCols.length > 0 && (
                          <div className="sql-modify-gen-section">
                            <div className="sql-modify-gen-section-header">
                              Generated columns
                            </div>
                            <div className="sql-modify-table-wrap">
                              <table className="sql-modify-table">
                                <thead>
                                  <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Expression</th>
                                    <th>Storage</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {generatedCols.map((col) => (
                                    <PgGeneratedColumnRow
                                      key={col.id}
                                      col={col}
                                      theme={editorTheme}
                                      onExpressionChange={(id, expression) =>
                                        setViewStructureDialog((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                columns: prev.columns.map(
                                                  (c) =>
                                                    c.id === id && c.generated
                                                      ? {
                                                          ...c,
                                                          generated: {
                                                            ...c.generated,
                                                            expression,
                                                          },
                                                        }
                                                      : c,
                                                ),
                                              }
                                            : null,
                                        )
                                      }
                                      onRemove={(id) =>
                                        setViewStructureDialog((prev) =>
                                          prev
                                            ? {
                                                ...prev,
                                                columns: prev.columns.filter(
                                                  (c) => c.id !== id,
                                                ),
                                              }
                                            : null,
                                        )
                                      }
                                    />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="sql-modify-pg-note">
                              <Pencil size={12} aria-hidden="true" />
                              PostgreSQL generated columns are stored. Editing
                              the expression rebuilds the table structure.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              <footer className="sql-modify-drawer-footer">
                <button
                  type="button"
                  className="confirm-btn confirm-btn-danger sql-modify-drawer-drop"
                  onClick={() => {
                    const name = viewStructureDialog?.tableName;
                    setViewStructureDialog(null);
                    setViewStructureTouchedColIds(new Set());
                    if (name) requestDropEntity(name, "table");
                  }}
                >
                  Drop Table
                </button>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={() => void submitViewStructure()}
                  disabled={
                    !viewStructureDialog ||
                    !pgStructureValidation.isDirty ||
                    !pgStructureValidation.isValid
                  }
                >
                  Save
                </button>
              </footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Add Row drawer ── */}
        <AddRowDialog
          state={addRowDialog}
          setState={setAddRowDialog}
          onSubmit={() => void submitAddRow()}
        />

        <CreateIndexDialog
          open={createIndexOpen}
          onOpenChange={setCreateIndexOpen}
          tables={tables}
          getColumns={getCreateIndexColumns}
          onSubmit={createSchemaObject}
        />
        <CreateViewDialog
          open={createViewOpen}
          onOpenChange={setCreateViewOpen}
          dialect="postgres"
          defaultBody={createViewBody}
          onSubmit={createSchemaObject}
        />
        <ExplainPlanDialog
          open={explainPlan !== null}
          onOpenChange={(next) => {
            if (!next) setExplainPlan(null);
          }}
          querySql={explainPlan?.querySql ?? ""}
          plan={explainPlan?.plan ?? ""}
          options={explainPlan?.options ?? {}}
          onOptionsChange={(next) => {
            if (explainPlan) runExplain(explainPlan.querySql, next);
          }}
          onCopied={() => showToast("Plan copied.")}
          onCopyFailed={() => showToast("Couldn't copy to clipboard.", "warn")}
        />

        {/* ── Add Table drawer ── */}
        <Dialog.Root
          open={addTableDialog !== null}
          onOpenChange={(next) => {
            if (!next) {
              setAddTableDialog(null);
              setAddTableTouchedColIds(new Set());
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    Add Table
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    Create a new table
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {addTableDialog && (
                <div className="sql-modify-body" ref={addTableBodyRef}>
                  <label className="sql-modify-field">
                    <span className="sql-modify-field-label">Table name</span>
                    <input
                      className={`sql-rename-input${addTableDisplayValidation.hasTableNameError ? " sql-modify-col-name-error" : ""}`}
                      value={addTableDialog.newTableName}
                      onChange={(e) =>
                        setAddTableDialog((prev) =>
                          prev
                            ? { ...prev, newTableName: e.target.value }
                            : null,
                        )
                      }
                    />
                  </label>
                  {(() => {
                    const regularCols = addTableDialog.columns.filter(
                      (c) => !c.generated,
                    );
                    return (
                      <>
                        <div className="sql-modify-columns">
                          <DndContext
                            sensors={pgStructureSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event: DragEndEvent) => {
                              const { active, over } = event;
                              if (!over || active.id === over.id) return;
                              const cols = addTableDialog.columns;
                              const oldIndex = cols.findIndex(
                                (c) => c.id === active.id,
                              );
                              const newIndex = cols.findIndex(
                                (c) => c.id === over.id,
                              );
                              if (oldIndex === -1 || newIndex === -1) return;
                              setAddTableDialog({
                                ...addTableDialog,
                                columns: arrayMove(cols, oldIndex, newIndex),
                              });
                            }}
                          >
                            <SortableContext
                              items={regularCols.map((c) => c.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="sql-modify-table-wrap">
                                <table className="sql-modify-table">
                                  <StructureTableHeader />
                                  <tbody>
                                    {regularCols.map((col) => (
                                      <PgStructureColumnRow
                                        key={col.id}
                                        col={col}
                                        onChange={(patch) =>
                                          setAddTableDialog((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  columns: prev.columns.map(
                                                    (c) =>
                                                      c.id === col.id
                                                        ? { ...c, ...patch }
                                                        : c,
                                                  ),
                                                }
                                              : null,
                                          )
                                        }
                                        onRemove={() =>
                                          setAddTableDialog((prev) =>
                                            prev
                                              ? {
                                                  ...prev,
                                                  columns: prev.columns.filter(
                                                    (c) => c.id !== col.id,
                                                  ),
                                                }
                                              : null,
                                          )
                                        }
                                        hasError={addTableDisplayValidation.invalidColumnIds.has(
                                          col.id,
                                        )}
                                        onBlurName={() =>
                                          setAddTableTouchedColIds(
                                            (prev) =>
                                              new Set([...prev, col.id]),
                                          )
                                        }
                                        knownTables={tables}
                                        columnsByTable={columnsByEntity}
                                      />
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                        <button
                          type="button"
                          className="confirm-btn confirm-btn-secondary sql-modify-add"
                          onClick={() => {
                            const newCol = makeNewPgColumn();
                            setAddTablePendingFocusId(newCol.id);
                            setAddTableDialog((prev) => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                columns: [...prev.columns, newCol],
                              };
                            });
                          }}
                        >
                          <Plus size={12} aria-hidden="true" /> Add column
                        </button>
                        {addTableDisplayValidation.errors.length > 0 && (
                          <div className="sql-modify-validation" role="alert">
                            {addTableDisplayValidation.errors.map((error) => (
                              <div key={error}>{error}</div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
              <footer className="sql-modify-drawer-footer">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={() => void submitAddTable()}
                  disabled={!addTableDialog || !addTableValidation.isValid}
                >
                  Create Table
                </button>
              </footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

        {/* ── Import CSV dialog ── */}
        <ImportDialog
          flavor="csv"
          open={importCsvOpen}
          dragging={importCsvDragging}
          onDraggingChange={setImportCsvDragging}
          onClose={() => {
            setImportCsvOpen(false);
            setImportCsvState(null);
            setImportCsvDragging(false);
          }}
          state={importCsvState}
          onStateChange={(updater) =>
            setImportCsvState((prev) => updater(prev))
          }
          tables={tables}
          // eslint-disable-next-line react-hooks/refs
          engine={engineRef.current}
          onPickFile={handleCsvFile}
          onSubmit={() => void submitImport("csv")}
          onError={(msg) => showToast(msg, "warn")}
        />

        {/* ── Import JSON dialog ── */}
        <ImportDialog
          flavor="json"
          open={importJsonOpen}
          dragging={importJsonDragging}
          onDraggingChange={setImportJsonDragging}
          onClose={() => {
            setImportJsonOpen(false);
            setImportJsonState(null);
            setImportJsonDragging(false);
          }}
          state={importJsonState}
          onStateChange={(updater) =>
            setImportJsonState((prev) => updater(prev))
          }
          tables={tables}
          // eslint-disable-next-line react-hooks/refs
          engine={engineRef.current}
          onPickFile={handleJsonFile}
          onSubmit={() => void submitImport("json")}
          onError={(msg) => showToast(msg, "warn")}
        />

        {/* ── Import Parquet dialog ── */}
        <ImportDialog
          flavor="parquet"
          open={importParquetOpen}
          dragging={importParquetDragging}
          onDraggingChange={setImportParquetDragging}
          onClose={() => {
            setImportParquetOpen(false);
            setImportParquetState(null);
            setImportParquetDragging(false);
          }}
          state={importParquetState}
          onStateChange={(updater) =>
            setImportParquetState((prev) => updater(prev))
          }
          tables={tables}
          // eslint-disable-next-line react-hooks/refs
          engine={engineRef.current}
          onPickFile={(f) => void handleParquetFile(f)}
          onSubmit={() => void submitImport("parquet")}
          onError={(msg) => showToast(msg, "warn")}
        />

        <div className="sql-shell postgres-shell" ref={shellRef}>
          <aside className="sql-sidebar" aria-label="Database explorer">
            <div className="sql-db-selector-wrap">{databaseSelector}</div>
            <div className="sql-sidebar-body">
              <SqlIconSidebar
                buttons={[
                  {
                    icon: <Table size={15} aria-hidden="true" />,
                    label: "Tables",
                    onClick: () => {},
                    isActive: true,
                  },
                ]}
              />
              <div className="sql-sidebar-content">
            <div className="sql-schema-selector-wrap">
              <div className="sql-db-selector-row">
                <Select.Root
                  value={selectedSchema}
                  onValueChange={(value) => {
                    const v = String(value);
                    if (v === "__new_schema__") {
                      setCreateSchemaName("");
                      setCreateSchemaDialogOpen(true);
                      return;
                    }
                    void handleSchemaChange(v);
                  }}
                >
                  <Select.Trigger
                    ref={schemaSelectorTriggerRef}
                    className="sql-database-selector sql-schema-selector"
                    aria-label="Select schema"
                  >
                    <Layers
                      size={14}
                      className="sql-db-selector-icon"
                      aria-hidden="true"
                    />
                    <Select.Value className="sql-db-selector-value">
                      {selectedSchema}
                    </Select.Value>
                    <Select.Icon className="playground-switcher-icon">
                      <ChevronDown size={12} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner
                      className="sql-db-positioner"
                      sideOffset={6}
                      alignItemWithTrigger={false}
                    >
                      <Select.Popup className="bui-select-popup sql-db-popup">
                        {(() => {
                          const userSchemas = schemas.filter(
                            (s) =>
                              !s.startsWith("pg_") &&
                              s !== "information_schema",
                          );
                          const systemSchemas = schemas.filter(
                            (s) =>
                              s.startsWith("pg_") ||
                              s === "information_schema",
                          );
                          const schemaItem = (schema: string) => (
                            <Select.Item
                              key={schema}
                              value={schema}
                              className="bui-select-item sql-db-item"
                            >
                              <span
                                className="bui-select-item-icon"
                                aria-hidden="true"
                              >
                                <Layers size={14} />
                              </span>
                              <span className="sql-db-item-text">
                                <Select.ItemText>{schema}</Select.ItemText>
                              </span>
                            </Select.Item>
                          );
                          return (
                            <>
                              {userSchemas.length > 0 && (
                                <div className="sql-db-popup-group-label">
                                  Schemas
                                </div>
                              )}
                              {userSchemas.map(schemaItem)}
                              <Select.Item
                                value="__new_schema__"
                                className="bui-select-item sql-db-item sql-db-item-action"
                              >
                                <span
                                  className="bui-select-item-icon"
                                  aria-hidden="true"
                                >
                                  <Plus size={14} />
                                </span>
                                <span className="sql-db-item-text">
                                  <Select.ItemText>New schema…</Select.ItemText>
                                </span>
                              </Select.Item>
                              {systemSchemas.length > 0 && (
                                <>
                                  <div
                                    role="separator"
                                    aria-orientation="horizontal"
                                    className="sql-db-popup-sep"
                                  />
                                  <div className="sql-db-popup-group-label">
                                    System Catalogs
                                  </div>
                                  {systemSchemas.map(schemaItem)}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </div>
              <Popover.Root
                open={createSchemaDialogOpen}
                onOpenChange={(next) => {
                  setCreateSchemaDialogOpen(next);
                  if (!next) setCreateSchemaName("");
                }}
              >
                <Popover.Portal>
                  <Popover.Positioner
                    anchor={schemaSelectorTriggerRef}
                    sideOffset={6}
                    align="start"
                  >
                    <Popover.Popup className="bui-popup sql-schema-create-popup">
                      <div className="sql-schema-create-title">
                        Create schema
                      </div>
                      <input
                        type="text"
                        className="sql-rename-input"
                        placeholder="Schema name"
                        value={createSchemaName}
                        onChange={(e) => setCreateSchemaName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          const errs = validateSchemaName(
                            createSchemaName,
                            schemas,
                          );
                          if (errs.length === 0 && createSchemaName.trim() !== "") {
                            void handleCreateSchema();
                          }
                        }}
                        autoFocus
                      />
                      {(() => {
                        const errors = validateSchemaName(
                          createSchemaName,
                          schemas,
                        );
                        return errors.length > 0 &&
                          createSchemaName.trim() !== "" ? (
                          <div className="sql-schema-create-error">
                            {errors[0]}
                          </div>
                        ) : null;
                      })()}
                      <div className="sql-schema-create-actions">
                        <button
                          type="button"
                          className="confirm-btn confirm-btn-secondary"
                          onClick={() => setCreateSchemaDialogOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="confirm-btn confirm-btn-primary"
                          disabled={
                            createSchemaSubmitting ||
                            createSchemaName.trim() === "" ||
                            validateSchemaName(createSchemaName, schemas)
                              .length > 0
                          }
                          onClick={() => void handleCreateSchema()}
                        >
                          Create
                        </button>
                      </div>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            </div>
            <div className="sql-tree-wrap">
              {(schemaLoading || dbLoading) && (
                <div className="sql-tree-loading-overlay">
                  <DiamondRippleLoader
                    size={56}
                    label={dbLoading ? "Loading database…" : "Loading schema…"}
                  />
                  <span className="sql-tree-loading-label">
                    {dbLoading ? "Loading database…" : "Loading schema…"}
                  </span>
                </div>
              )}
              <div className="sql-tree">
              <SchemaSection
                label="Tables"
                count={tables.length}
                expanded={tablesExpanded}
                onToggle={() => setTablesExpanded((v) => !v)}
                emptyMessage="No tables."
                onAdd={openAddTable}
                allExpanded={
                  tables.length > 0 &&
                  tables.every((name) => expandedEntities.has(name))
                }
                onExpandAll={() => setExpandedEntities(new Set(tables))}
                onCollapseAll={() => setExpandedEntities(new Set())}
              >
                {tables.map((name) => (
                  <SchemaItem
                    key={name}
                    name={name}
                    kind="table"
                    expanded={expandedEntities.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={(entity) =>
                      setExpandedEntities((prev) => {
                        const next = new Set(prev);
                        if (next.has(entity)) next.delete(entity);
                        else next.add(entity);
                        return next;
                      })
                    }
                    onPreview={previewEntity}
                    onAddRow={(n) => void openAddRow(n)}
                    onTruncate={truncateEntity}
                    onModifyStructure={(n) => void openViewStructure(n)}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={requestDropEntity}
                    onViewDDL={(n) => void viewDDL(n)}
                    onExport={(n, f) => void exportEntity(n, f)}
                    onGetRowCount={fetchEntityRowCount}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Views"
                count={views.length}
                expanded={viewsExpanded}
                onToggle={() => setViewsExpanded((v) => !v)}
                emptyMessage="No views."
                onAdd={openCreateView}
                allExpanded={
                  views.length > 0 &&
                  views.every((name) => expandedEntities.has(name))
                }
                onExpandAll={() =>
                  setExpandedEntities((prev) => {
                    const next = new Set(prev);
                    for (const name of views) next.add(name);
                    return next;
                  })
                }
                onCollapseAll={() =>
                  setExpandedEntities((prev) => {
                    const next = new Set(prev);
                    for (const name of views) next.delete(name);
                    return next;
                  })
                }
              >
                {views.map((name) => (
                  <SchemaItem
                    key={name}
                    name={name}
                    kind="view"
                    expanded={expandedEntities.has(name)}
                    columns={columnsByEntity[name]}
                    foreignKeys={foreignKeysByEntity[name]}
                    onToggleExpanded={(entity) =>
                      setExpandedEntities((prev) => {
                        const next = new Set(prev);
                        if (next.has(entity)) next.delete(entity);
                        else next.add(entity);
                        return next;
                      })
                    }
                    onPreview={previewEntity}
                    onStructure={(n) => openEntityStructure(n)}
                    onCount={countEntityRows}
                    onCopy={copyEntityName}
                    onDrop={requestDropEntity}
                    onViewDDL={(n) => void viewDDL(n)}
                    onExport={(n, f) => void exportEntity(n, f)}
                    onGetRowCount={fetchEntityRowCount}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Indexes"
                count={indexes.length}
                expanded={indexesExpanded}
                onToggle={() => setIndexesExpanded((v) => !v)}
                emptyMessage="No indexes."
                onAdd={() => setCreateIndexOpen(true)}
              >
                {indexes.map((name) => (
                  <SchemaLeafItem
                    key={name}
                    name={name}
                    kind="index"
                    onCopy={copyEntityName}
                    onViewDDL={(n) => void viewDDL(n)}
                    onDrop={requestDropEntity}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Triggers"
                count={triggers.length}
                expanded={triggersExpanded}
                onToggle={() => setTriggersExpanded((v) => !v)}
                emptyMessage="No triggers."
              >
                {triggers.map((name) => (
                  <SchemaLeafItem
                    key={name}
                    name={name}
                    kind="trigger"
                    onCopy={copyEntityName}
                    onViewDDL={(n) => void viewDDL(n)}
                    onDrop={requestDropEntity}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Sequences"
                count={sequences.length}
                expanded={sequencesExpanded}
                onToggle={() => setSequencesExpanded((v) => !v)}
                emptyMessage="No sequences."
              >
                {sequences.map((name) => (
                  <SchemaLeafItem
                    key={name}
                    name={name}
                    kind="sequence"
                    onCopy={copyEntityName}
                    onViewDDL={(n) => void viewDDL(n)}
                    onDrop={requestDropEntity}
                  />
                ))}
              </SchemaSection>
              <SchemaSection
                label="Functions"
                count={functions.length}
                expanded={functionsExpanded}
                onToggle={() => setFunctionsExpanded((v) => !v)}
                emptyMessage="No functions."
              >
                {functions.map((name) => (
                  <SchemaLeafItem
                    key={name}
                    name={name}
                    kind="function"
                    onCopy={copyEntityName}
                    onViewDDL={(n) => void viewDDL(n)}
                    onDrop={requestDropEntity}
                  />
                ))}
              </SchemaSection>
              </div>
            </div>
              </div>
            </div>
          </aside>
          <div
            className="sql-sidebar-resizer"
            ref={sidebarResizerRef}
            role="separator"
            aria-orientation="vertical"
          />
          <main
            ref={panesRef}
            className={`sql-panes postgres-panes${activeTab?.kind === "view-data" ? " sql-panes--view-data" : ""}${activeTab?.kind === "er-diagram" ? " sql-panes--er-diagram" : ""}${activeTab?.kind === "query-history" ? " sql-panes--query-history" : ""}${isSettingsTabActive ? " sql-panes--settings" : ""}`}
          >
            <h1 className="playground-sr-title">PostgreSQL playground</h1>
            <SqlTabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onReorderTabs={reorderTabs}
              extraTabs={
                settingsOpen
                  ? [
                      {
                        id: SETTINGS_TAB_ID,
                        kind: "settings",
                        label: "Settings",
                        icon: <SettingsIcon size={11} aria-hidden="true" />,
                        closeable: true,
                        renameable: false,
                      } as TabDescriptor,
                    ]
                  : undefined
              }
              onExtraTabClose={(tabId) => {
                if (tabId === SETTINGS_TAB_ID) closeSettingsTab();
              }}
              onTabActivate={(tabId) => {
                const prevId = activeTabIdRef.current;
                if (tabId === SETTINGS_TAB_ID) {
                  setActiveTabId(SETTINGS_TAB_ID);
                  return;
                }
                if (prevId !== tabId) {
                  tabHistoryRef.current = pushTabHistory(
                    tabHistoryRef.current,
                    prevId,
                    tabId,
                  );
                }
                setActiveTabId(tabId);
              }}
              onTabClose={closeTab}
              onTabRename={(tabId, title) =>
                persistTabs(
                  tabsRef.current.map((t) =>
                    t.id === tabId ? { ...t, title } : t,
                  ),
                )
              }
              onTabDuplicate={(tabId) => {
                const tab = tabsRef.current.find((t) => t.id === tabId);
                if (!tab) return;
                const dup = { ...tab, id: newTabId(), title: `${tab.title} copy` };
                tabHistoryRef.current = pushTabHistory(
                  tabHistoryRef.current,
                  activeTabIdRef.current,
                  dup.id,
                );
                persistTabs([...tabsRef.current, dup]);
                setActiveTabId(dup.id);
              }}
              onTabCloseOthers={(tabId) => {
                const tab = tabsRef.current.find((t) => t.id === tabId);
                if (!tab) return;
                tabHistoryRef.current = [];
                persistTabs([tab]);
              }}
              onTabCloseAll={() => {
                const fresh = {
                  id: newTabId(),
                  title: "Query 1",
                  code: "",
                  pristineCode: "",
                };
                tabHistoryRef.current = [];
                persistTabs([fresh]);
                setActiveTabId(fresh.id);
                window.setTimeout(() => editorRef.current?.focus(), 0);
              }}
              onAddTab={addTab}
            />
            <div
              className="sql-editor-pane"
              ref={editorPaneRef}
              style={
                activeTab?.kind === "view-data" ||
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history" ||
                isSettingsTabActive
                  ? { display: "none" }
                  : undefined
              }
            >
              <div className="editor-wrap" ref={editorHostRef} />
              <div className="sql-editor-corner-actions">
                <Popover.Root
                  open={isFormatting ? false : formatPopoverOpen}
                  onOpenChange={setFormatPopoverOpen}
                >
                  <Popover.Trigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className="sql-editor-corner-btn"
                        aria-label="Format code"
                        aria-busy={isFormatting}
                        disabled={!loaded || isFormatting}
                        onClick={() => void handleFormatCode()}
                      >
                        {isFormatting ? (
                          <svg
                            viewBox="0 0 13 13"
                            width={13}
                            height={13}
                            className="run-btn-spinner"
                            aria-hidden="true"
                          >
                            <circle
                              cx="6.5"
                              cy="6.5"
                              r="5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeDasharray="15 9"
                            />
                          </svg>
                        ) : (
                          <Wand2 size={13} aria-hidden="true" />
                        )}
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner
                      sideOffset={6}
                      align="center"
                      side="bottom"
                      className="sql-corner-positioner"
                    >
                      <Popover.Popup className="bui-popup sql-corner-popover">
                        Format code
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
                <div className="sql-editor-corner-sep" aria-hidden="true" />
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className="sql-editor-corner-btn"
                        aria-label="View Query History"
                        onClick={openQueryHistoryTab}
                      >
                        <History size={13} aria-hidden="true" />
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner
                      sideOffset={6}
                      align="center"
                      side="bottom"
                      className="sql-corner-positioner"
                    >
                      <Popover.Popup className="bui-popup sql-corner-popover">
                        Query history
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              </div>
              <SqlEditorToolbar
                loaded={loaded}
                running={statusState === "running"}
                hasEditorSelection={hasEditorSelection}
                hasMultipleStatements={hasMultipleStatements}
                isMac={isMac}
                onRunSelection={runCurrentSelection}
                onRunStatement={runStatementAtCursor}
                onRunAll={runActiveTab}
                onExplain={handleExplain}
              />
            </div>
            {tabs.some((t) => t.kind === "er-diagram") && (
              <div
                className="sql-er-pane"
                style={
                  activeTab?.kind !== "er-diagram"
                    ? { display: "none" }
                    : undefined
                }
              >
                <ErDiagramPane
                  tables={tables}
                  columnsByEntity={columnsByEntity}
                  foreignKeysByEntity={foreignKeysByEntity}
                  onPreview={previewEntity}
                  onAddRow={(n) => void openAddRow(n)}
                  onTruncate={truncateEntity}
                  onModifyStructure={(n) => void openViewStructure(n)}
                  onCount={countEntityRows}
                  onCopy={copyEntityName}
                  onDrop={requestDropEntity}
                  onViewDDL={(name) => void viewDDL(name)}
                  onExport={(name, format) => void exportEntity(name, format)}
                  onGetRowCount={fetchEntityRowCount}
                />
              </div>
            )}
            {activeTab?.kind === "query-history" && (
              <div className="sql-er-pane">
                <QueryHistoryPane
                  history={queryHistory}
                  theme={editorTheme}
                  isPostgres={true}
                  onClear={clearHistory}
                  onOpenQueryTab={openTabAndRun}
                  savedStorageKey={storageKey("saved_queries")}
                />
              </div>
            )}
            {isSettingsTabActive && (
              <div className="sql-settings-tab-pane">
                <SqlSettingsPanelContent
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  outputFontSizeEnabled={outputFontSizeEnabled}
                  setOutputFontSizeEnabled={setOutputFontSizeEnabled}
                  outputFontSize={outputFontSize}
                  setOutputFontSize={setOutputFontSize}
                  editorTheme={editorTheme}
                  setEditorTheme={setEditorTheme}
                  wordWrap={wordWrap}
                  setWordWrap={setWordWrap}
                  clearBeforeRun={clearBeforeRun}
                  setClearBeforeRun={setClearBeforeRun}
                  language={PLAYGROUND_ID}
                  onRestoreDefaults={() => setConfirmRestoreOpen(true)}
                  onClearLocalStorage={() => setConfirmClearStorageOpen(true)}
                  onClearAllLocalData={() => setConfirmClearAllDataOpen(true)}
                  onClose={closeSettingsTab}
                  resetTabsLabel={`Reset query tabs for ${activeSample.label}`}
                  onResetTabs={resetTabsForCurrentDb}
                  extraTabs={[
                    {
                      value: "database",
                      trigger: (
                        <>
                          <Database size={14} aria-hidden="true" />
                          <span className="settings-tab-label">Database</span>
                        </>
                      ),
                      panel: (
                        <div className="settings-body">
                          <div className="setting-row">
                            <label className="setting-switch-row">
                              <span className="setting-switch-label">
                                <Layers size={14} aria-hidden="true" />
                                <span>Show system schemas</span>
                              </span>
                              <Switch.Root
                                checked={showSystemSchemas}
                                onCheckedChange={(checked) => {
                                  setShowSystemSchemasState(checked);
                                }}
                                className="bui-switch"
                              >
                                <Switch.Thumb className="bui-switch-thumb" />
                              </Switch.Root>
                            </label>
                          </div>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            )}
            <div
              className="sql-resizer"
              ref={resizerRef}
              role="separator"
              aria-orientation="horizontal"
              style={
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history"
                  ? { display: "none" }
                  : undefined
              }
            />
            <section
              className="sql-results-pane"
              ref={resultsPaneRef}
              style={
                activeTab?.kind === "er-diagram" ||
                activeTab?.kind === "query-history" ||
                isSettingsTabActive
                  ? { display: "none" }
                  : undefined
              }
            >
              <ResultView
                result={result}
                loading={statusState === "loading"}
                engineLabel="PostgreSQL"
                keyHints={resultKeyHints}
                sourceTable={result?.sourceTable}
                tableMetaFor={tableMetaFor}
                onDeleteRows={deleteRowsFromTable}
                onUpdateRows={updateRowsInTable}
                onDuplicateRow={duplicateRowInTable}
                globalPageSize={globalPageSize}
                onSetGlobalPageSize={setGlobalPageSize}
                onLoadPage={handleLoadPage}
                onLoadMorePage={(sql, page) =>
                  void handleLoadMorePage(sql, page)
                }
                onExportSnapshotChange={setResultSetExportSnapshot}
                onExportResultSet={(format, scope) =>
                  void exportResultSet(format, scope)
                }
                onOpenQueryTab={openTabAndRun}
                onRefresh={refreshActiveResult}
              />
              <DataslopeRunOverlay running={statusState === "running"} />
            </section>
          </main>
        </div>
    </SqlPlaygroundShell>
  );
}

// ─── Import dialog component (CSV / JSON / Parquet) ─────────────────────

interface ImportDialogProps<
  S extends CsvImportState | JsonImportState | ParquetImportState,
> {
  flavor: ImportFlavor;
  open: boolean;
  dragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
  onClose: () => void;
  state: S | null;
  onStateChange: (updater: (prev: S | null) => S | null) => void;
  tables: string[];
  engine: PostgresEngine | null;
  onPickFile: (file: File) => void;
  onSubmit: () => void;
  onError: (message: string) => void;
}

function ImportDialog<
  S extends CsvImportState | JsonImportState | ParquetImportState,
>({
  flavor,
  open,
  dragging,
  onDraggingChange,
  onClose,
  state,
  onStateChange,
  tables,
  engine,
  onPickFile,
  onSubmit,
  onError,
}: ImportDialogProps<S>) {
  const flavorConfig = useMemo(() => {
    if (flavor === "csv") {
      return {
        title: "Import CSV File",
        description:
          "Parse a CSV file and import its rows into a new or existing table.",
        accept: ".csv,text/csv",
        dropLabel: "Drop a CSV file here",
        dropHint: "or click to browse, .csv",
        Icon: FileText,
      };
    }
    if (flavor === "json") {
      return {
        title: "Import JSON File",
        description:
          "Parse a JSON array of objects and import its rows into a new or existing table.",
        accept: ".json,application/json",
        dropLabel: "Drop a JSON file here",
        dropHint: "or click to browse, .json (array of objects)",
        Icon: FileJson,
      };
    }
    return {
      title: "Import Parquet File",
      description:
        "Read a Parquet file and add its rows into a new or existing table.",
      accept: ".parquet,application/octet-stream",
      dropLabel: "Drop a Parquet file here",
      dropHint: "or click to browse, .parquet",
      Icon: Database,
    };
  }, [flavor]);

  const fileColumns = state
    ? flavor === "parquet"
      ? (state as ParquetImportState).columns
      : (state as CsvImportState | JsonImportState).headers
    : [];
  const previewRows = state
    ? flavor === "parquet"
      ? (state as ParquetImportState).rows
      : (state as CsvImportState | JsonImportState).rows
    : [];

  const setTargetMode = (mode: "new" | "existing") => {
    onStateChange((prev) => {
      if (!prev) return prev;
      if (mode === "new") {
        return { ...prev, targetMode: "new", colCompare: null } as S;
      }
      const targetTable = prev.targetTable || tables[0] || "";
      return {
        ...prev,
        targetMode: "existing",
        targetTable,
        colCompare: null,
      } as S;
    });
    if (mode === "existing" && engine) {
      const target = state?.targetTable || tables[0] || "";
      if (target) {
        void (async () => {
          try {
            const cols = await engine.listColumns(target);
            onStateChange((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                targetMode: "existing",
                targetTable: target,
                colCompare: computeImportColComparison(fileColumns, cols),
              } as S;
            });
          } catch (err) {
            onStateChange((prev) =>
              prev ? ({ ...prev, colCompare: null } as S) : prev,
            );
            onError(
              `Could not load columns for "${target}": ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          }
        })();
      }
    }
  };

  const setTargetTable = (newTable: string) => {
    if (!engine) return;
    onStateChange((prev) =>
      prev ? ({ ...prev, targetTable: newTable } as S) : prev,
    );
    void (async () => {
      try {
        const cols = await engine.listColumns(newTable);
        onStateChange((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            targetTable: newTable,
            colCompare: computeImportColComparison(fileColumns, cols),
          } as S;
        });
      } catch (err) {
        onStateChange((prev) =>
          prev ? ({ ...prev, colCompare: null } as S) : prev,
        );
        onError(
          `Could not load columns for "${newTable}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    })();
  };

  const setNewTableName = (value: string) => {
    onStateChange((prev) =>
      prev ? ({ ...prev, tableName: value } as S) : prev,
    );
  };

  // Inferred column types are only shown (and only used) when the import
  // creates the table; an existing table already has types of its own.
  const columnTypes =
    state && state.targetMode === "new" && flavor !== "parquet"
      ? ((state as CsvImportState | JsonImportState).columnTypes ?? null)
      : null;

  const setColumnType = (index: number, type: string) => {
    onStateChange((prev) => {
      if (!prev) return prev;
      const cur = (prev as CsvImportState | JsonImportState).columnTypes;
      if (!cur) return prev;
      const next = [...cur];
      next[index] = type;
      return { ...prev, columnTypes: next } as S;
    });
  };

  const Icon = flavorConfig.Icon;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-import-popup">
          <Dialog.Title className="confirm-title">
            {flavorConfig.title}
          </Dialog.Title>
          <Dialog.Description className="confirm-desc">
            {flavorConfig.description}
          </Dialog.Description>
          <div className="sql-import-warning">
            <TriangleAlert
              size={14}
              className="sql-import-warning-icon"
              aria-hidden="true"
            />
            <span>
              This is a playground, your data is only held in browser memory
              and will not be persisted on reload.
            </span>
          </div>
          {!state ? (
            <div
              className={`sql-dropzone${dragging ? " dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                onDraggingChange(true);
              }}
              onDragLeave={() => onDraggingChange(false)}
              onDrop={(e) => {
                e.preventDefault();
                onDraggingChange(false);
                const file = e.dataTransfer.files[0];
                if (file) onPickFile(file);
              }}
            >
              <Icon
                size={28}
                className="sql-dropzone-icon"
                aria-hidden="true"
              />
              <span>{flavorConfig.dropLabel}</span>
              <span className="sql-dropzone-hint">{flavorConfig.dropHint}</span>
              <input
                type="file"
                accept={flavorConfig.accept}
                aria-label={`Choose ${flavor} file`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPickFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          ) : (
            <Fragment>
              <div className="sql-import-target-row">
                <div className="sql-import-mode-btns">
                  <button
                    type="button"
                    className={`sql-import-mode-btn${state.targetMode === "new" ? " active" : ""}`}
                    onClick={() => setTargetMode("new")}
                  >
                    New table
                  </button>
                  <button
                    type="button"
                    className={`sql-import-mode-btn${state.targetMode === "existing" ? " active" : ""}`}
                    disabled={tables.length === 0}
                    onClick={() => setTargetMode("existing")}
                  >
                    Existing table
                  </button>
                </div>
                {state.targetMode === "new" ? (
                  <input
                    className="sql-rename-input"
                    value={state.tableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    placeholder="Table name"
                    autoFocus
                  />
                ) : (
                  <select
                    className="sql-import-target-select"
                    value={state.targetTable}
                    onChange={(e) => setTargetTable(e.target.value)}
                    autoFocus
                  >
                    {tables.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {state.targetMode === "existing" && state.colCompare ? (
                <div className="sql-import-col-compare">
                  <table>
                    <thead>
                      <tr>
                        <th>File column</th>
                        <th>Table column</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.colCompare.map((r, i) => (
                        <tr key={i}>
                          <td>{r.fileCol ?? <em>—</em>}</td>
                          <td>{r.tableCol ?? <em>—</em>}</td>
                          <td className={`cmp-${r.status}`}>
                            {IMPORT_COL_STATUS_LABEL[r.status]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="sql-import-preview">
                  <table>
                    <thead>
                      <tr>
                        {fileColumns.map((h) => (
                          <th key={h}>{h || "(empty)"}</th>
                        ))}
                      </tr>
                      {columnTypes && (
                        <tr>
                          {fileColumns.map((h, i) => (
                            <th key={h} className="sql-import-type-cell">
                              <select
                                className="sql-import-type-select"
                                value={columnTypes[i] ?? "text"}
                                aria-label={`Column type for ${h || "(empty)"}`}
                                onChange={(e) =>
                                  setColumnType(i, e.target.value)
                                }
                              >
                                {IMPORT_TYPE_CHOICES.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>
                              {cell === null ||
                              cell === undefined ||
                              cell === "" ? (
                                <em>NULL</em>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  marginBottom: 8,
                }}
              >
                {previewRows.length} row{previewRows.length === 1 ? "" : "s"} ·{" "}
                {fileColumns.length} column{fileColumns.length === 1 ? "" : "s"}
                {previewRows.length > 5 &&
                  state.targetMode === "new" &&
                  " · showing first 5"}
              </div>
            </Fragment>
          )}
          <div className="confirm-actions" style={{ marginTop: 16 }}>
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            {state && (
              <button
                type="button"
                className="confirm-btn confirm-btn-primary"
                onClick={onSubmit}
              >
                Import
              </button>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function PostgresPlayground() {
  return (
    <Toast.Provider timeout={2400}>
      <PostgresPlaygroundInner />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
