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
  FolderTree,
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
import { SqlSettingsPanelContent } from "../sql/components/SqlSettingsPanel";
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
import { RenameDatabaseDialog } from "../sql/components/RenameDatabaseDialog";
import { SqlEditorToolbar } from "../sql/components/SqlEditorToolbar";
import { findDuckDbSampleDatabase } from "../runtime/duckdbSamples";
import { duckdbAdapter } from "./duckdbAdapter";
import {
  ensureActiveWorkspace,
  saveDraftWorkspace,
  switchActiveWorkspace,
} from "../opfs/activeWorkspace";
import { acquireWorkspaceLock, createWorkspace } from "../opfs/workspace";
import {
  deleteDataEntry as opfsDeleteDataEntry,
  loadDataFiles as opfsLoadDataFiles,
  readDataFile as opfsReadDataFile,
  renameDataEntry as opfsRenameDataEntry,
  upsertDataFolder as opfsUpsertDataFolder,
  writeDataFile as opfsWriteDataFile,
} from "../files/opfsDataStorage";
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
import { useCreepingBootFraction } from "../challengeShared";
import { type DuckDbEngine, DUCKDB_VERSION } from "../runtime/duckdb";

const DUCKDB_SAMPLE_DATABASES = duckdbAdapter.samples;
const DUCKDB_BLANK_DATABASE = duckdbAdapter.blankSample!;
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
import { buildExplainSql, formatExplainResult } from "../sql/utils/explain";
import { activeSqlForEditor } from "../sql/utils/editorUtils";
import {
  DatabaseSelector,
  type DatabaseSelectorAction,
} from "../sql/components/DatabaseSelector";
import { GenExprEditor } from "../sql/components/GenExprEditor";
import { SqlIconSidebar } from "../sql/components/SqlIconSidebar";
import { ToastList } from "../sql/components/ToastList";
import { ColumnFlag } from "../sql/components/ModifyStructureForm";
import { FkCombobox } from "../sql/components/StructureCombobox";
import { StructureTableHeader } from "../sql/components/StructureTableHeader";
import { QueryHistoryPane } from "../sql/components/QueryHistoryPane";
import { useQueryHistory } from "../sql/hooks/useQueryHistory";
import { FilesPanel, type VirtualFile } from "./FilesPanel";
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
import { useDuckDbSettingsStore } from "./stores/useDuckDbSettingsStore";
import {
  importRowsIntoDuckDb,
  parseCsv,
  readParquetFile,
  tableNameFromFilename,
  isDuckDbReadableFile,
} from "./duckdbImport";
import { FK_ACTIONS } from "../sql/constants";
import { computeVisibleTypeGroups } from "../sql/utils/columnTypeSelector";

const PLAYGROUND_ID = duckdbAdapter.playgroundId;
const STORAGE_PREFIX = duckdbAdapter.storagePrefix;
const { dbScopedKey, loadTabs, saveTabs, setWorkspaceScope } =
  createTabStorage(STORAGE_PREFIX, PLAYGROUND_ID);

const DUCKDB_DB_ACTIONS: readonly DatabaseSelectorAction[] = [
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
// Minimum time (ms) the "running" overlay is shown so the 180ms CSS
// transition can complete and be clearly visible to the user.
const MIN_ANIMATION_MS = 300;

// ─── DuckDB structure drawer types ────────────────────────────────────

interface DuckDbStructureColumn {
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
   *  DuckDB only supports STORED generated columns. */
  generated: {
    expression: string;
    originalExpression: string;
  } | null;
}

interface DuckDbStructureDialogState {
  tableName: string;
  newTableName: string;
  columns: DuckDbStructureColumn[];
  originalSignature: string;
}

let _duckdbStructureIdCounter = 0;
function newDuckDbStructureId(): string {
  return `pgc_${++_duckdbStructureIdCounter}`;
}

const DUCKDB_TYPE_GROUPS = [
  {
    label: "Numbers",
    types: [
      "TINYINT",
      "SMALLINT",
      "INTEGER",
      "BIGINT",
      "HUGEINT",
      "UTINYINT",
      "USMALLINT",
      "UINTEGER",
      "UBIGINT",
      "DECIMAL(18,3)",
      "REAL",
      "DOUBLE",
    ],
  },
  {
    label: "Text",
    types: ["VARCHAR", "VARCHAR(255)", "TEXT", "CHAR(1)"],
  },
  { label: "Boolean / identifiers", types: ["BOOLEAN", "UUID"] },
  { label: "JSON", types: ["JSON"] },
  {
    label: "Date / time",
    types: ["DATE", "TIME", "TIMESTAMP", "TIMESTAMPTZ", "INTERVAL"],
  },
  { label: "Binary", types: ["BLOB"] },
  {
    label: "Nested",
    // The free-text type input still accepts arbitrary composite
    // expressions like `STRUCT(name VARCHAR, value DOUBLE)`.
    types: ["INTEGER[]", "VARCHAR[]", "MAP(VARCHAR, INTEGER)"],
  },
] as const;

const DUCKDB_TYPE_OPTIONS: readonly string[] = DUCKDB_TYPE_GROUPS.flatMap(
  (group) => group.types,
);
// DuckDB has no serial pseudo-types; "identity" uses `GENERATED BY DEFAULT
// AS IDENTITY` on any integer-family type. Exposed as a boolean so the form
// reuses the existing column UI.
const DUCKDB_IDENTITY_TYPES = new Set([
  "tinyint",
  "smallint",
  "integer",
  "bigint",
  "ubigint",
  "uinteger",
  "usmallint",
  "utinyint",
  "hugeint",
]);
// Accepts DuckDB type text including parameterized types
// (`DECIMAL(10,2)`), array suffixes (`INTEGER[]`), and nested types
// (`STRUCT(...)`, `MAP(K, V)`, `LIST(T)`).
const DUCKDB_TYPE_VALIDATION_REGEX =
  /^[A-Za-z_][A-Za-z0-9_]*(?:\s+[A-Za-z_][A-Za-z0-9_]*)*(?:\s*\([^()]*(?:\([^()]*\)[^()]*)*\))?(?:\s*\[\s*\])*$/;

function normalizeDuckDbFkAction(action: string | undefined): string {
  const normalized = (action || "NO ACTION").trim().toUpperCase();
  return FK_ACTIONS.includes(normalized as (typeof FK_ACTIONS)[number])
    ? normalized
    : "NO ACTION";
}

function isDuckDbIdentityType(type: string): boolean {
  return DUCKDB_IDENTITY_TYPES.has(type.trim().toLowerCase());
}

function duckdbStructureSignature(
  state: Pick<DuckDbStructureDialogState, "newTableName" | "columns">,
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
      fkOnDelete: normalizeDuckDbFkAction(c.fkOnDelete),
      fkOnUpdate: normalizeDuckDbFkAction(c.fkOnUpdate),
      generated: c.generated
        ? { expression: c.generated.expression.trim() }
        : null,
    })),
  });
}

function validateDuckDbStructure(
  state: DuckDbStructureDialogState | null,
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
    errors.push("Table name must be a valid unquoted DuckDB identifier.");
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
      errors.push(`"${name}" is not a valid unquoted DuckDB identifier.`);
      invalidColumnIds.add(col.id);
    } else if (seen.has(lower)) {
      errors.push(`Duplicate column name "${name}".`);
      invalidColumnIds.add(col.id);
      invalidColumnIds.add(seen.get(lower)!);
    } else {
      seen.set(lower, col.id);
    }
    const type = col.type.trim();
    if (!type || !DUCKDB_TYPE_VALIDATION_REGEX.test(type)) {
      errors.push(`"${name || "Unnamed column"}" has an invalid type.`);
      invalidColumnIds.add(col.id);
    }
    if (
      col.autoIncrement &&
      !/^(tinyint|smallint|integer|bigint|hugeint|utinyint|usmallint|uinteger|ubigint)(\s*\([^)]*\))?$/i.test(type)
    ) {
      errors.push(
        `"${name || "Unnamed column"}" must use an integer-family type for an IDENTITY column.`,
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
    isDirty: duckdbStructureSignature(state) !== state.originalSignature,
  };
}

function makeNewDuckDbColumn(): DuckDbStructureColumn {
  return {
    id: newDuckDbStructureId(),
    originalName: null,
    name: "",
    type: "VARCHAR",
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

function DuckDbTypeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [inputVal, setInputVal] = useState(value);
  // Prevents the Combobox's internal blur-reset from overriding our state.
  const blurLockRef = useRef<string | null>(null);

  // Sync inputVal when the committed value changes externally (e.g. a
  // different column row is selected) but not while we own the blur lock.
  useEffect(() => {
    if (blurLockRef.current === null) {
      setInputVal(value);
    }
  }, [value]);

  // Show every group while the field is empty or still holds the committed
  // type; only filter once the user types a partial that isn't a known type.
  const visibleGroups = useMemo(
    () =>
      computeVisibleTypeGroups(
        DUCKDB_TYPE_GROUPS,
        DUCKDB_TYPE_OPTIONS,
        inputVal,
        value,
      ),
    [inputVal, value],
  );

  return (
    <Combobox.Root
      value={DUCKDB_TYPE_OPTIONS.includes(inputVal) ? inputVal : null}
      onValueChange={(newValue) => {
        if (newValue) {
          const v = newValue as string;
          blurLockRef.current = v;
          setInputVal(v);
          onChange(v);
          setTimeout(() => {
            blurLockRef.current = null;
          }, 0);
        }
      }}
      inputValue={inputVal}
      onInputValueChange={(v) => {
        // Ignore any reset the Combobox tries to apply while the blur lock
        // is held (it resets to "" when no item is selected on close).
        if (blurLockRef.current !== null) {
          setInputVal(blurLockRef.current);
          return;
        }
        setInputVal(v);
      }}
      filter={null}
      openOnInputClick
      autoHighlight
    >
      <div className="duckdb-type-input-group">
        <Combobox.Input
          className="sql-rename-input sql-modify-col-type duckdb-type-input"
          placeholder="e.g. varchar(255)"
          aria-label="Column type"
          onBlur={() => {
            const typed = inputVal.trim();
            let finalVal: string;
            if (
              DUCKDB_TYPE_OPTIONS.includes(value) &&
              !DUCKDB_TYPE_OPTIONS.includes(typed) &&
              !DUCKDB_TYPE_VALIDATION_REGEX.test(typed)
            ) {
              // Original was a known type; typed value is neither a known type
              // nor a valid custom type (e.g. varchar(255)) → revert.
              finalVal = value;
            } else {
              finalVal = typed || value;
              if (finalVal !== value) onChange(finalVal);
            }
            blurLockRef.current = finalVal;
            setInputVal(finalVal);
            setTimeout(() => {
              blurLockRef.current = null;
            }, 100);
          }}
        />
        <Combobox.Trigger
          className="duckdb-type-trigger"
          aria-label="Open type list"
        >
          <ChevronDown size={14} />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          align="start"
          className="duckdb-type-positioner"
        >
          <Combobox.Popup className="bui-select-popup duckdb-type-popup">
            <Combobox.List>
              {visibleGroups.map((group) => (
                <Combobox.Group key={group.label} className="duckdb-type-group">
                  <Combobox.GroupLabel className="duckdb-type-group-label">
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
                <div className="duckdb-type-empty">
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

function DuckDbStructureColumnRow({
  col,
  onChange,
  onRemove,
  hasError,
  onBlurName,
  knownTables,
  columnsByTable,
}: {
  col: DuckDbStructureColumn;
  onChange: (patch: Partial<DuckDbStructureColumn>) => void;
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
  const fkTargetColumns = col.fkTable
    ? (columnsByTable[col.fkTable] ?? [])
    : [];
  const serialType = isDuckDbIdentityType(col.type);

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
        <DuckDbTypeSelector
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
          label="Identity"
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

/** Row for a generated column inside the DuckDB structure drawer.
 *  DuckDB only supports STORED generated columns, so there is no
 *  storage-type selector, only the expression is editable. */
function PgGeneratedColumnRow({
  col,
  onExpressionChange,
  onRemove,
  theme,
}: {
  col: DuckDbStructureColumn;
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
  language: "DuckDB",
  version: DUCKDB_VERSION,
  engine: `duckdb-wasm ${DUCKDB_VERSION}`,
  engineUrl: "https://duckdb.org/docs/api/wasm/overview",
  notes:
    "Pure-WASM build of DuckDB that runs entirely in your browser. Each sample database is rebuilt in memory on every page load. DuckDB does not support triggers or VIRTUAL generated columns; STORED generated columns are supported.",
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

type ImportFlavor = "csv" | "json" | "parquet";

function DuckDbPlaygroundInner() {
  // Coalesced localStorage writer for settings, install the
  // pagehide/visibilitychange flush listener once per playground mount.
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
  const fontSize = useDuckDbSettingsStore((s) => s.fontSize);
  const setFontSizeState = useDuckDbSettingsStore((s) => s.setFontSize);
  const outputFontSizeEnabled = useDuckDbSettingsStore(
    (s) => s.outputFontSizeEnabled,
  );
  const setOutputFontSizeEnabledState = useDuckDbSettingsStore(
    (s) => s.setOutputFontSizeEnabled,
  );
  const outputFontSize = useDuckDbSettingsStore((s) => s.outputFontSize);
  const setOutputFontSizeState = useDuckDbSettingsStore(
    (s) => s.setOutputFontSize,
  );
  const editorTheme = useDuckDbSettingsStore((s) => s.editorTheme);
  const setEditorThemeState = useDuckDbSettingsStore((s) => s.setEditorTheme);
  const wordWrap = useDuckDbSettingsStore((s) => s.wordWrap);
  const setWordWrapState = useDuckDbSettingsStore((s) => s.setWordWrap);
  const clearBeforeRun = useDuckDbSettingsStore((s) => s.clearBeforeRun);
  const setClearBeforeRunState = useDuckDbSettingsStore(
    (s) => s.setClearBeforeRun,
  );
  const showSystemSchemas = useDuckDbSettingsStore((s) => s.showSystemSchemas);
  const setShowSystemSchemasState = useDuckDbSettingsStore(
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
      ? DUCKDB_SAMPLE_DATABASES[0].id
      : (localStorage.getItem(storageKey("db")) ??
        DUCKDB_SAMPLE_DATABASES[0].id);
  const [activeDbId, setActiveDbId] = useState(initialDbId);
  const [tabs, setTabs] = useState<QueryTab[]>(() =>
    loadTabs(initialDbId, findDuckDbSampleDatabase(initialDbId).defaultTabs),
  );
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? "");
  const [resultsByTab, setResultsByTab] = useState<
    Record<string, QueryRunResult | null>
  >({});
  const [loaded, setLoaded] = useState(false);
  // Real DuckDB-wasm download progress (0..1), smoothed for the boot
  // overlay's progress bar.
  const [bootRawFraction, setBootRawFraction] = useState<number | null>(null);
  const bootDisplayFraction = useCreepingBootFraction(bootRawFraction, !loaded);
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading DuckDB engine…",
  );
  const [activeWorkspace, setActiveWorkspace] = useState<{
    id: string;
    name: string;
  } | null>(null);
  // False for the auto-created draft workspace (kept out of the saved list
  // until the user saves it). Drives the Save affordance in the badge.
  const [workspaceSaved, setWorkspaceSaved] = useState(true);
  const handleSaveWorkspace = useCallback(async (name: string) => {
    const saved = saveDraftWorkspace(PLAYGROUND_ID, name);
    if (saved) {
      setWorkspaceSaved(true);
      setActiveWorkspace({ id: saved.id, name: saved.name });
    }
  }, []);
  // Mirror activeWorkspace.id in a ref so file-pane handlers can read it
  // synchronously without rebuilding on every workspace switch.
  const workspaceIdRef = useRef<string | null>(null);
  useEffect(() => {
    workspaceIdRef.current = activeWorkspace?.id ?? null;
  }, [activeWorkspace]);
  const [indexesExpanded, setIndexesExpanded] = useState(true);
  const [viewsExpanded, setViewsExpanded] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(true);
  const [globalPageSize, setGlobalPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [resultSetExportSnapshot, setResultSetExportSnapshot] =
    useState<ResultSetExportSnapshot | null>(null);

  // ─── Schema selector state ────────────────────────────────────────────
  const [dbLoading, setDbLoading] = useState(false);
  const [createSchemaDialogOpen, setCreateSchemaDialogOpen] = useState(false);
  const [createSchemaName, setCreateSchemaName] = useState("");
  const [createSchemaSubmitting, setCreateSchemaSubmitting] = useState(false);
  const showSystemSchemasRef = useRef(true);
  const engineRef = useRef<DuckDbEngine | null>(null);
  const schemaTree = useSchemaTree({
    engineRef,
    defaultSchema: "main",
    showSystemSchemasRef,
    clearEntitiesOnSchemaChange: false,
  });
  const {
    tables,
    setTables,
    views,
    setViews,
    indexes,
    setIndexes,
    // DuckDB has no triggers; the setter keeps the shared refreshSchema
    // shape uniform with the Postgres playground.
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

  // ─── Sidebar files view (DuckDB virtual filesystem) ───────────────────
  const [sidebarView, setSidebarView] = useState<"schema" | "files">("schema");
  const [virtualFiles, setVirtualFiles] = useState<VirtualFile[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

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
    kind: "table" | "view" | "index" | "trigger";
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
  const [renameDbExt, setRenameDbExt] = useState(".duckdb");
  // Overrides the display name for the blank/imported database slot.
  const [customDbFilename, setCustomDbFilename] = useState<string | null>(null);

  // ─── View Structure drawer state ──────────────────────────────────────
  const [viewStructureDialog, setViewStructureDialog] =
    useState<DuckDbStructureDialogState | null>(null);
  const [viewStructureTouchedColIds, setViewStructureTouchedColIds] = useState<
    Set<string>
  >(new Set());
  const [viewStructurePendingFocusId, setViewStructurePendingFocusId] = useState<
    string | null
  >(null);
  const viewStructureBodyRef = useRef<HTMLDivElement | null>(null);
  const schemaSelectorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [addTableDialog, setAddTableDialog] =
    useState<DuckDbStructureDialogState | null>(null);
  const [addTableTouchedColIds, setAddTableTouchedColIds] = useState<
    Set<string>
  >(new Set());
  const [addTablePendingFocusId, setAddTablePendingFocusId] = useState<
    string | null
  >(null);
  const addTableBodyRef = useRef<HTMLDivElement | null>(null);
  const [addRowDialog, setAddRowDialog] = useState<AddRowDialogState | null>(null);
  const [exportNoTabsHover, setExportNoTabsHover] = useState(false);
  const duckdbStructureSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const duckdbStructureValidation = useMemo(
    () => validateDuckDbStructure(viewStructureDialog, columnsByEntity),
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
    return validateDuckDbStructure(
      { ...viewStructureDialog, columns: displayCols },
      columnsByEntity,
    );
  }, [viewStructureDialog, viewStructureTouchedColIds, columnsByEntity]);
  const addTableValidation = useMemo(
    () => validateDuckDbStructure(addTableDialog, columnsByEntity),
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
    return validateDuckDbStructure(
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
    () => () => { },
    () => detectIsMac(),
    () => false,
  );
  const runActiveTabRef = useRef<() => void>(() => undefined);
  const runSelectionRef = useRef<(sql: string) => void>(() => undefined);
  // DuckDB runs one statement batch at a time. A run arriving while the
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
  const activeSample = findDuckDbSampleDatabase(activeDbId);
  // customDbFilename applies only for the blank/imported database slot.
  const displayFilename =
    activeDbId === DUCKDB_BLANK_DATABASE.id && customDbFilename !== null
      ? customDbFilename
      : activeSample.filename;
  // Tab reordering is delegated to the generic TabBar; `setDraggingTabId`
  // remains in the hook signature only, passed a no-op.
  const setDraggingTabId = useCallback(() => {}, []);

  // Trailing-edge debounce of `saveTabs` so typing doesn't pay a synchronous
  // stringify + localStorage write per keystroke; state still updates
  // immediately. Pending writes flush on tab/db switch and unmount.
  const pendingSaveRef = useRef<{ dbId: string; tabs: QueryTab[] } | null>(
    null,
  );
  const saveTimerRef = useRef<number | null>(null);
  const flushPendingSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (pending) {
      pendingSaveRef.current = null;
      saveTabs(pending.dbId, pending.tabs);
    }
  }, []);
  useEffect(() => {
    // Best-effort persistence when the tab is hidden or unloaded.
    const handler = () => flushPendingSave();
    window.addEventListener("visibilitychange", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("visibilitychange", handler);
      window.removeEventListener("pagehide", handler);
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const persistTabs = useCallback(
    (nextTabs: QueryTab[], dbId = activeDbIdRef.current) => {
      tabsRef.current = nextTabs;
      setTabs(nextTabs);
      pendingSaveRef.current = { dbId, tabs: nextTabs };
      if (saveTimerRef.current === null) {
        saveTimerRef.current = window.setTimeout(() => {
          saveTimerRef.current = null;
          const pending = pendingSaveRef.current;
          if (pending) {
            pendingSaveRef.current = null;
            saveTabs(pending.dbId, pending.tabs);
          }
        }, 500);
      }
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
          loadTabs(dbId, findDuckDbSampleDatabase(dbId).defaultTabs),
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

  const refreshSchema = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const schema = selectedSchemaRef.current;
    const [nextTables, nextViews, nextIndexes, nextTriggers] =
      await Promise.all([
        engine.listTables(schema),
        engine.listViews(schema),
        engine.listIndexes(schema),
        engine.listTriggers(),
      ]);
    // Cap concurrency so a large catalog doesn't queue dozens of queries on
    // the DuckDB worker at once.
    const entityNames = [...nextTables, ...nextViews];
    const entries: Array<readonly [string, TableColumnInfo[], ForeignKeyInfo[]]> =
      new Array(entityNames.length);
    const CONCURRENCY = 6;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, entityNames.length) }, async () => {
      while (true) {
        const i = cursor++;
        if (i >= entityNames.length) return;
        const name = entityNames[i];
        const [colsResult, fksResult] = await Promise.allSettled([
          engine.listColumns(name, schema),
          engine.listForeignKeys(name, schema),
        ]);
        const cols = colsResult.status === "fulfilled" ? colsResult.value : [];
        const fks = fksResult.status === "fulfilled" ? fksResult.value : [];
        entries[i] = [name, cols, fks] as const;
      }
    });
    await Promise.all(workers);
    // Drop row-count cache entries for removed entities; keep counts for
    // still-present tables so the sidebar doesn't blink.
    const surviving = new Set(entityNames);
    setTables(nextTables);
    setViews(nextViews);
    setIndexes(nextIndexes);
    setTriggers(nextTriggers);
    setColumnsByEntity(
      Object.fromEntries(entries.map(([name, cols]) => [name, cols])),
    );
    setForeignKeysByEntity(
      Object.fromEntries(entries.map(([name, , fks]) => [name, fks])),
    );
    setRowCountByTable((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const k of Object.keys(prev)) {
        if (surviving.has(k)) {
          next[k] = prev[k];
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [quoteIdent]);

  const refreshSchemas = useCallback(
    () => refreshSchemasFromHook(refreshSchema),
    [refreshSchemasFromHook, refreshSchema],
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
  } | null>(null);
  // Run EXPLAIN for the selection / statement at the cursor / whole query and
  // show the plan in a read-only modal.
  const handleExplain = useCallback(() => {
    const view = editorRef.current;
    const engine = engineRef.current;
    if (!view || !engine) return;
    const sql = activeSqlForEditor(view).trim();
    if (!sql) {
      showToast("Nothing to explain, the query is empty.", "warn");
      return;
    }
    void (async () => {
      try {
        const sets = await engine.exec(buildExplainSql("duckdb", sql));
        const set = sets.find((s) => s != null) ?? sets[0];
        setExplainPlan({
          querySql: sql,
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
  }, [showToast]);

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
          sets = await engine.exec(trimmed);
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
        // lock (which blocks the next re-page) on schema introspection.
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
    document.title = "DuckDB Playground";
    document.body.classList.add("duckdb-active");
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
      document.body.classList.remove("duckdb-active");
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
          dialect: "duckdb",
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
        setLoadingMessage("Loading DuckDB engine…");
        // Resolve (or auto-create) the active workspace so DuckDB can restore
        // OPFS state. Best-effort: no OPFS just means purely in-memory.
        let workspaceId: string | null = null;
        try {
          const workspace = await ensureActiveWorkspace(PLAYGROUND_ID);
          workspaceId = workspace.id;
          setActiveWorkspace({ id: workspace.id, name: workspace.name });
          setWorkspaceSaved(workspace.saved);
          adoptWorkspaceTabScope(workspace.id);
          const noticeKey = `playground_ws_warned_${workspace.id}`;
          try {
            if (window.sessionStorage.getItem(noticeKey) !== "1") {
              const hasLock = await acquireWorkspaceLock(workspace.id, {
                signal: lockController.signal,
              });
              if (!cancelled && !hasLock) {
                window.sessionStorage.setItem(noticeKey, "1");
                showToast(
                  "This workspace is already open in another tab. Edits here may conflict, switch workspaces via the badge in the header.",
                  "warn",
                );
              }
            }
          } catch {
            /* sessionStorage / Locks unavailable, ignore. */
          }
        } catch {
          /* proceed in-memory */
        }
        const engine = await duckdbAdapter.createEngine(
          initialDbId,
          workspaceId,
          setBootRawFraction,
        );
        if (cancelled) {
          // Unmounted mid-bootstrap: the engine never reaches engineRef, so
          // the unmount cleanup can't destroy it — do it here instead.
          void engine.destroy();
          return;
        }
        engineRef.current = engine;
        await refreshSchemas();
        await refreshSchema();
        setLoaded(true);
        setStatusState("ready");

        // Rehydrate uploaded data files from OPFS into DuckDB's virtual
        // filesystem so they stay queryable across reloads. Best-effort.
        if (workspaceId) {
          try {
            const persisted = await opfsLoadDataFiles(workspaceId);
            if (cancelled) return;
            for (const entry of persisted) {
              if (entry.isFolder) continue;
              const bytes = await opfsReadDataFile(workspaceId, entry.path);
              if (cancelled) return;
              if (!bytes) continue;
              try {
                await engine.registerFileBuffer(entry.path, bytes);
              } catch {
                /* skip unreadable entry, UI still shows it as available */
              }
            }
            if (!cancelled && persisted.length > 0) {
              setVirtualFiles(persisted);
              const folders = new Set<string>();
              for (const e of persisted) {
                const segments = e.path.split("/");
                segments.pop();
                let cur = "";
                for (const s of segments) {
                  cur = cur ? `${cur}/${s}` : s;
                  folders.add(cur);
                }
              }
              setExpandedFolders((prev) => new Set([...prev, ...folders]));
            }
          } catch {
            /* OPFS rehydrate best-effort */
          }
        }
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
      // Release the per-mount DuckDB connection. The shared WASM module stays
      // in module state (no re-download), but an open connection would race
      // with the one a remount creates next.
      const engine = engineRef.current;
      engineRef.current = null;
      if (engine) {
        void engine.destroy();
      }
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

  // Sync showSystemSchemas ref and re-fetch schemas when the toggle changes.
  useEffect(() => {
    showSystemSchemasRef.current = showSystemSchemas;
    void refreshSchemas();
  }, [showSystemSchemas, refreshSchemas]);

  // Keep autocomplete schema in sync with tables/views. Compared by value:
  // refreshSchema() always creates fresh objects, so reference equality would
  // re-parse the entire editor doc on every query even when nothing changed.
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
    // Reconfigure completion immediately so new tables/views show up in
    // autocomplete the moment the schema lands.
    view.dispatch({
      effects: [
        completionComp.reconfigure(
          makeSqlAutocompletionExtension(completionSchema, "duckdb"),
        ),
      ],
    });
    // `@codemirror/lang-sql` is lazy-loaded, so the lang reconfigure awaits
    // the chunk; the view + key checks guard against stale dispatches.
    // `lastReconfigureKeyRef` is only marked up-to-date once the lang
    // dispatch fires, so a StrictMode-cancelled effect can't make the next
    // run skip the reconfigure.
    let cancelled = false;
    void makeSqlLangExtension("duckdb", schema).then((langExt) => {
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
    label: "DuckDB playground",
    getSnapshot: () => ({
      content: describeSqlSurface({
        dialect: "duckdb",
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
      // Persist pending edits before the outgoing database's tabs go out of scope.
      flushPendingSave();
      setStatusState("loading");
      setDbLoading(true);
      // Clear sidebar schema state up front so the previous database's
      // entities never render under the new database's label mid-bootstrap.
      setTables([]);
      setViews([]);
      setIndexes([]);
      setTriggers([]);
      setColumnsByEntity({});
      setForeignKeysByEntity({});
      setRowCountByTable({});
      setExpandedEntities(new Set());
      // Reset the file tree: switching databases reinitialises DuckDB's
      // virtual filesystem, so registered user files are gone anyway.
      setVirtualFiles([]);
      setExpandedFolders(new Set());
      try {
        const sample =
          nextId === DUCKDB_BLANK_DATABASE.id
            ? await engine.loadBlankDatabase()
            : await engine.loadSampleDatabase(nextId);
        setActiveDbId(sample.id);
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
        selectedSchemaRef.current = "main";
        setSelectedSchema("main");
        await refreshSchemas();
        await refreshSchema();
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
    [flushPendingSave, persistTabs, refreshSchema, refreshSchemas, showToast],
  );

  const requestDbSwitch = useCallback(
    (nextId: string) => {
      if (nextId !== DUCKDB_BLANK_DATABASE.id && nextId === activeDbIdRef.current) return;
      setPendingDbId(nextId);
    },
    [setPendingDbId],
  );

  const handleSchemaChange = useCallback(
    (schema: string) => handleSchemaChangeFromHook(schema, refreshSchema),
    [handleSchemaChangeFromHook, refreshSchema],
  );

  const submitCreateSchema = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || !createSchemaName.trim()) return;
    setCreateSchemaSubmitting(true);
    const newSchemaName = createSchemaName.trim();
    try {
      await engine.createSchema(newSchemaName);
      setCreateSchemaDialogOpen(false);
      setCreateSchemaName("");
      await refreshSchemas();
      await handleSchemaChange(newSchemaName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Failed to create schema: ${msg}`, "warn");
    } finally {
      setCreateSchemaSubmitting(false);
    }
  }, [createSchemaName, handleSchemaChange, refreshSchemas, showToast]);

  // ─── Virtual filesystem (Files panel) ─────────────────────────────────
  const registerVirtualFile = useCallback(
    async (path: string, bytes: Uint8Array) => {
      const engine = engineRef.current;
      if (!engine) return;
      // Capture size first: the postMessage transfer to the DuckDB-WASM
      // worker detaches the ArrayBuffer, making bytes.length 0 after the await.
      const size = bytes.length;
      await engine.registerFileBuffer(path, bytes);
      setVirtualFiles((prev) => {
        const filtered = prev.filter((f) => f.path !== path);
        return [...filtered, { path, size, isFolder: false }];
      });
      // Auto-expand all ancestor folders so the new file is visible.
      const segments = path.split("/").filter(Boolean);
      if (segments.length > 1) {
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          let cur = "";
          for (let i = 0; i < segments.length - 1; i++) {
            cur = cur ? `${cur}/${segments[i]}` : segments[i];
            next.add(cur);
          }
          return next;
        });
      }
    },
    [],
  );

  const handleFilesUpload = useCallback(
    (fileList: FileList, parentPath: string) => {
      void (async () => {
        for (const file of Array.from(fileList)) {
          try {
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            const path = parentPath ? `${parentPath}/${file.name}` : file.name;
            // Persist to OPFS *before* handing the buffer to the DuckDB-WASM
            // worker — the postMessage transfer detaches the ArrayBuffer, so
            // the bytes aren't readable after `registerFileBuffer`.
            const wsId = workspaceIdRef.current;
            if (wsId) {
              try {
                await opfsWriteDataFile(wsId, path, bytes);
              } catch {
                /* OPFS write best-effort */
              }
            }
            await registerVirtualFile(path, bytes);
            showToast(`Uploaded "${path}".`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            showToast(`Failed to upload "${file.name}": ${msg}`, "warn");
          }
        }
      })();
    },
    [registerVirtualFile, showToast],
  );

  const handleFilesDownload = useCallback(
    (path: string) => {
      void (async () => {
        const engine = engineRef.current;
        if (!engine) return;
        try {
          const bytes = await engine.readFileBuffer(path);
          if (!bytes) {
            showToast(`Could not read "${path}".`, "warn");
            return;
          }
          const blob = new Blob([new Uint8Array(bytes)]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = path.split("/").pop() ?? path;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Download failed: ${msg}`, "warn");
        }
      })();
    },
    [showToast],
  );

  const handleFilesDelete = useCallback(
    (path: string) => {
      void (async () => {
        const engine = engineRef.current;
        if (!engine) return;
        // Remove the path itself plus any children if it's a folder.
        const prefix = `${path}/`;
        const toRemove = virtualFiles.filter(
          (f) => f.path === path || f.path.startsWith(prefix),
        );
        for (const entry of toRemove) {
          if (!entry.isFolder) {
            await engine.dropFile(entry.path);
          }
        }
        // Drop the OPFS copy too so the file doesn't reappear on reload.
        const wsId = workspaceIdRef.current;
        if (wsId) {
          try {
            await opfsDeleteDataEntry(wsId, path);
          } catch {
            /* OPFS delete best-effort */
          }
        }
        setVirtualFiles((prev) =>
          prev.filter(
            (f) => f.path !== path && !f.path.startsWith(prefix),
          ),
        );
        showToast(`Deleted "${path}".`);
      })();
    },
    [virtualFiles, showToast],
  );

  const handleFilesRename = useCallback(
    (oldPath: string, newPath: string) => {
      void (async () => {
        const engine = engineRef.current;
        if (!engine) return;
        const oldPrefix = `${oldPath}/`;
        const newPrefix = `${newPath}/`;
        try {
          // Snapshot the affected entries so the iteration isn't affected by
          // the state update below.
          const affected = virtualFiles.filter(
            (f) => f.path === oldPath || f.path.startsWith(oldPrefix),
          );
          for (const entry of affected) {
            if (entry.isFolder) continue;
            const bytes = await engine.readFileBuffer(entry.path);
            if (!bytes) continue;
            const dest = entry.path === oldPath
              ? newPath
              : `${newPrefix}${entry.path.slice(oldPrefix.length)}`;
            await engine.dropFile(entry.path);
            await engine.registerFileBuffer(dest, bytes);
          }
          // Mirror the rename inside OPFS.
          const wsId = workspaceIdRef.current;
          if (wsId) {
            try {
              await opfsRenameDataEntry(wsId, oldPath, newPath);
            } catch {
              /* OPFS rename best-effort */
            }
          }
          setVirtualFiles((prev) =>
            prev.map((f) => {
              if (f.path === oldPath) return { ...f, path: newPath };
              if (f.path.startsWith(oldPrefix)) {
                return {
                  ...f,
                  path: `${newPrefix}${f.path.slice(oldPrefix.length)}`,
                };
              }
              return f;
            }),
          );
          showToast(`Renamed to "${newPath}".`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Rename failed: ${msg}`, "warn");
        }
      })();
    },
    [virtualFiles, showToast],
  );

  const handleFilesCreateFolder = useCallback(
    (parentPath: string, name: string) => {
      const path = parentPath ? `${parentPath}/${name}` : name;
      setVirtualFiles((prev) => {
        if (prev.some((f) => f.path === path)) return prev;
        return [...prev, { path, size: 0, isFolder: true }];
      });
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.add(path);
        if (parentPath) next.add(parentPath);
        return next;
      });
      // Persist the folder marker so empty folders survive reloads.
      const wsId = workspaceIdRef.current;
      if (wsId) {
        void opfsUpsertDataFolder(wsId, path);
      }
    },
    [],
  );

  const toggleFilesFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleFilesMove = useCallback(
    (sourcePath: string, destFolderPath: string) => {
      void (async () => {
        const engine = engineRef.current;
        if (!engine) return;
        // Keep the source's leaf name, placed under destFolderPath ("" = root).
        const leaf = sourcePath.split("/").pop() ?? sourcePath;
        const newPath = destFolderPath ? `${destFolderPath}/${leaf}` : leaf;
        if (newPath === sourcePath) return;
        // Same mechanics as rename: drop + re-register each file.
        const oldPrefix = `${sourcePath}/`;
        const newPrefix = `${newPath}/`;
        try {
          const affected = virtualFiles.filter(
            (f) => f.path === sourcePath || f.path.startsWith(oldPrefix),
          );
          for (const entry of affected) {
            if (entry.isFolder) continue;
            const bytes = await engine.readFileBuffer(entry.path);
            if (!bytes) continue;
            const dest =
              entry.path === sourcePath
                ? newPath
                : `${newPrefix}${entry.path.slice(oldPrefix.length)}`;
            await engine.dropFile(entry.path);
            await engine.registerFileBuffer(dest, bytes);
          }
          // Mirror the move inside OPFS (also renames a folder's children).
          const wsId = workspaceIdRef.current;
          if (wsId) {
            try {
              await opfsRenameDataEntry(wsId, sourcePath, newPath);
            } catch {
              /* OPFS rename best-effort */
            }
          }
          setVirtualFiles((prev) =>
            prev.map((f) => {
              if (f.path === sourcePath) return { ...f, path: newPath };
              if (f.path.startsWith(oldPrefix)) {
                return {
                  ...f,
                  path: `${newPrefix}${f.path.slice(oldPrefix.length)}`,
                };
              }
              return f;
            }),
          );
          if (destFolderPath) {
            setExpandedFolders((prev) => {
              const next = new Set(prev);
              next.add(destFolderPath);
              return next;
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          showToast(`Move failed: ${msg}`, "warn");
        }
      })();
    },
    [virtualFiles, showToast],
  );

  // ─── Import SQL dump ──────────────────────────────────────────────────
  const performImportSqlDump = useCallback(
    async (sqlText: string, filename: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      setStatusState("loading");
      try {
        // importSqlDump runs the SQL on a blank schema and restores the
        // previous sample on failure, so a failed import never strands the user.
        await engine.importSqlDump(sqlText);
        setTables([]);
        setViews([]);
        setIndexes([]);
        setTriggers([]);
        setColumnsByEntity({});
        setForeignKeysByEntity({});
        setRowCountByTable({});
        setExpandedEntities(new Set());
        setActiveDbId(DUCKDB_BLANK_DATABASE.id);
        setCustomDbFilename(filename);
        try {
          localStorage.setItem(storageKey("db"), DUCKDB_BLANK_DATABASE.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(
          DUCKDB_BLANK_DATABASE.id,
          DUCKDB_BLANK_DATABASE.defaultTabs,
        );
        persistTabs(nextTabs, DUCKDB_BLANK_DATABASE.id);
        let nextActive = nextTabs[0]?.id ?? "";
        try {
          const savedActive = localStorage.getItem(
            dbScopedKey(DUCKDB_BLANK_DATABASE.id, "active_tab"),
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
        await refreshSchema();
        setStatusState("ready");
        showToast(`Loaded "${filename}".`);
      } catch (err) {
        // importSqlDump restored the previous sample on failure; re-read
        // the schema so the sidebar reflects the restored state.
        try {
          await refreshSchema();
        } catch {
          /* ignore */
        }
        showToast(
          `Import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      }
    },
    [persistTabs, refreshSchema, showToast],
  );

  // Same flow as performImportSqlDump, but loads a binary .duckdb image
  // (the binary section of a cloud/share bundle) instead of replaying SQL.
  const performImportDuckDbImage = useCallback(
    async (image: Uint8Array, filename: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      setStatusState("loading");
      try {
        // importBinaryImage copies the image into a blank catalog and
        // restores the previous sample on failure.
        await engine.importBinaryImage(image);
        setTables([]);
        setViews([]);
        setIndexes([]);
        setTriggers([]);
        setColumnsByEntity({});
        setForeignKeysByEntity({});
        setRowCountByTable({});
        setExpandedEntities(new Set());
        setActiveDbId(DUCKDB_BLANK_DATABASE.id);
        setCustomDbFilename(filename);
        try {
          localStorage.setItem(storageKey("db"), DUCKDB_BLANK_DATABASE.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(
          DUCKDB_BLANK_DATABASE.id,
          DUCKDB_BLANK_DATABASE.defaultTabs,
        );
        persistTabs(nextTabs, DUCKDB_BLANK_DATABASE.id);
        let nextActive = nextTabs[0]?.id ?? "";
        try {
          const savedActive = localStorage.getItem(
            dbScopedKey(DUCKDB_BLANK_DATABASE.id, "active_tab"),
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
        await refreshSchema();
        setStatusState("ready");
        showToast(`Loaded "${filename}".`);
      } catch (err) {
        // importBinaryImage restored the previous sample on failure; re-read
        // the schema so the sidebar reflects the restored state.
        try {
          await refreshSchema();
        } catch {
          /* ignore */
        }
        showToast(
          `Import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      }
    },
    [persistTabs, refreshSchema, showToast],
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
    findSampleDatabase: findDuckDbSampleDatabase,
    showToast,
    runSqlForTab,
  });

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

  const queryFileWithSelect = useCallback(
    (path: string) => {
      const filename = path.split("/").pop() ?? path;
      const sql = `SELECT * FROM "${path}";`;
      const tab: QueryTab = {
        id: newTabId(),
        title: filename,
        code: sql,
        pristineCode: sql,
      };
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(tab.id, sql, `File: ${filename}`);
    },
    [persistTabs, runSqlForTab],
  );

  // Build a table from a file via DuckDB's replacement scan (`CREATE TABLE …
  // AS SELECT * FROM 'file'`); the name derives from the file name, suffixed
  // with a counter if taken so a repeat invocation doesn't error out.
  const createTableFromFile = useCallback(
    (path: string) => {
      const filename = path.split("/").pop() ?? path;
      const schema = selectedSchemaRef.current;
      const base = tableNameFromFilename(filename);
      const taken = new Set(tablesRef.current);
      let tableName = base;
      for (let n = 2; taken.has(tableName); n++) {
        tableName = `${base}_${n}`;
      }
      const sql = `CREATE TABLE ${quoteIdent(schema)}.${quoteIdent(tableName)} AS SELECT * FROM "${path}";`;
      const tab: QueryTab = {
        id: newTabId(),
        title: tableName,
        code: sql,
        pristineCode: sql,
      };
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(tab.id, sql, `File: ${filename}`);
    },
    [persistTabs, runSqlForTab, selectedSchemaRef],
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
      // Native DuckDB dialect — the same one lesson code blocks use — so the
      // identical query formats the same way in both places.
      const formatted = sqlFormat(code, { language: "duckdb" });
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
      if (format === "csv") exportResultToCsv(columns, rows, filename);
      else if (format === "json") exportResultToJson(columns, rows, filename);
      else if (format === "sql") exportResultToSql(columns, rows, filename);
      else if (format === "parquet")
        await exportResultToParquet(columns, rows, filename);
      else await exportResultToXlsx(columns, rows, filename);
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
          // end of the result set (DuckDB has no implicit row identifier,
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
      // Strip generated columns, DuckDB rejects INSERTs that target them.
      const generatedCols = new Set(
        (columnsByEntity[tableName] ?? [])
          .filter((col) => col.generated !== null)
          .map((col) => col.name),
      );
      const filteredNames: string[] = [];
      const filteredValues: unknown[] = [];
      for (let i = 0; i < columnNames.length; i++) {
        if (!generatedCols.has(columnNames[i])) {
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
    const { tableName, columns, values, addAnother } = addRowDialog;
    const columnNames: string[] = [];
    const rowValues: unknown[] = [];
    for (const c of columns) {
      const raw = values[c.name] ?? "";
      if (raw === "" && c.defaultValue !== null) continue;
      columnNames.push(c.name);
      rowValues.push(raw === "" ? null : raw);
    }
    try {
      await engine.insertRow(tableName, columnNames, rowValues, selectedSchemaRef.current);
      showToast(`Row added to "${tableName}".`);
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
  }, [addRowDialog, showToast]);

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
      // Display SQL is for the editor tab only, actual execution uses
      // parameterized execParams below to prevent injection.
      const schema = selectedSchemaRef.current;
      const safeSch = schema.replace(/'/g, "''");
      const displaySql = `SELECT\n  column_name AS name,\n  data_type AS type,\n  is_nullable,\n  column_default AS default\nFROM information_schema.columns\nWHERE table_schema = '${safeSch}'\n  AND table_name = '${name.replace(/'/g, "''")}'\nORDER BY ordinal_position;`;
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
      const paramSql = `SELECT column_name AS name, data_type AS type, is_nullable, column_default AS default FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position`;
      try {
        const sets = await engine.execParams(paramSql, [schema, name]);
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
        console.error("[DuckDB] openEntityStructure failed:", err);
      }
    },
    [persistTabs],
  );

  const requestDropEntity = useCallback(
    (name: string, kind: "table" | "view" | "index" | "trigger") => {
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
      const sets = await engineRef.current?.exec(
        `SELECT * FROM ${quoteIdent(name)}`,
      );
      const set = sets?.[0];
      if (!set) return;
      const filename = `${toFileSafeName(name)}.${format}`;
      if (format === "csv")
        exportResultToCsv(set.columns, set.values, filename);
      else if (format === "json")
        exportResultToJson(set.columns, set.values, filename);
      else if (format === "sql")
        exportResultToSql(set.columns, set.values, filename);
      else if (format === "parquet")
        await exportResultToParquet(set.columns, set.values, filename);
      else await exportResultToXlsx(set.columns, set.values, filename);
    },
    [],
  );

  // Row counts are fetched lazily to avoid an N+1 COUNT(*) fan-out during
  // refreshSchema. Cached results return synchronously so the sidebar
  // doesn't blink; in-flight requests are de-duplicated per table.
  const rowCountInFlightRef = useRef<Map<string, Promise<number>>>(new Map());
  const fetchEntityRowCount = useCallback(
    (name: string): number | Promise<number> => {
      const cached = rowCountByTable[name];
      if (cached !== undefined) return cached;
      const inflight = rowCountInFlightRef.current.get(name);
      if (inflight) return inflight;
      const engine = engineRef.current;
      if (!engine) return 0;
      const schema = selectedSchemaRef.current;
      const promise = (async () => {
        try {
          const result = await engine.exec(
            `SELECT COUNT(*) FROM ${quoteIdent(schema)}.${quoteIdent(name)}`,
          );
          const count = Number(result[0]?.values?.[0]?.[0] ?? 0);
          setRowCountByTable((prev) =>
            prev[name] === count ? prev : { ...prev, [name]: count },
          );
          return count;
        } catch {
          return 0;
        } finally {
          rowCountInFlightRef.current.delete(name);
        }
      })();
      rowCountInFlightRef.current.set(name, promise);
      return promise;
    },
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
      try {
        const schema = selectedSchemaRef.current;
        const [cols, fks, constraints] = await Promise.all([
          engine.listColumns(name, schema),
          engine.listForeignKeys(name, schema),
          engine.getColumnConstraintInfo(name, schema),
        ]);
        const fkByCol = new Map<string, ForeignKeyInfo>();
        for (const fk of fks) fkByCol.set(fk.from, fk);
        const constraintsByCol = new Map(constraints.map((c) => [c.name, c]));
        const columns = cols.map<DuckDbStructureColumn>((c) => {
          const fk = fkByCol.get(c.name);
          const constraint = constraintsByCol.get(c.name);
          const isAutoIncrement =
            constraint?.isAutoIncrement ??
            /^nextval\s*\(/i.test(c.defaultValue ?? "");
          return {
            id: newDuckDbStructureId(),
            originalName: c.name,
            name: c.name,
            type: c.type || "VARCHAR",
            nullable: !c.notNull,
            defaultValue: isAutoIncrement ? "" : (c.defaultValue ?? ""),
            isPk: c.pk > 0,
            unique: constraint?.isUnique ?? false,
            autoIncrement: isAutoIncrement,
            fkTable: fk?.table ?? "",
            fkColumn: fk?.to ?? "",
            fkOnDelete: normalizeDuckDbFkAction(fk?.onDelete),
            fkOnUpdate: normalizeDuckDbFkAction(fk?.onUpdate),
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
          originalSignature: duckdbStructureSignature(nextDialog),
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
    const validation = validateDuckDbStructure(dialog, columnsByEntity);
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
          autoIncrement: col.autoIncrement || isDuckDbIdentityType(col.type),
          defaultValue: col.defaultValue.trim() || undefined,
          foreignKey:
            col.fkTable && col.fkColumn
              ? {
                table: col.fkTable,
                column: col.fkColumn,
                onDelete: normalizeDuckDbFkAction(col.fkOnDelete),
                onUpdate: normalizeDuckDbFkAction(col.fkOnUpdate),
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
      });
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
          id: newDuckDbStructureId(),
          originalName: null,
          name: "id",
          type: "BIGINT",
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
    const validation = validateDuckDbStructure(dialog, columnsByEntity);
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
          autoIncrement: col.autoIncrement || isDuckDbIdentityType(col.type),
          defaultValue: col.defaultValue.trim() || undefined,
          foreignKey:
            col.fkTable && col.fkColumn
              ? {
                table: col.fkTable,
                column: col.fkColumn,
                onDelete: normalizeDuckDbFkAction(col.fkOnDelete),
                onUpdate: normalizeDuckDbFkAction(col.fkOnUpdate),
              }
              : undefined,
          generated: col.generated
            ? {
              expression: col.generated.expression.trim(),
              storageType: "STORED" as const,
            }
            : undefined,
        })),
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
   *  .sql export and the cloud/share bundle builder. Null while booting. */
  const buildDuckDbDumpSql = useCallback(async (): Promise<string | null> => {
    const engine = engineRef.current;
    if (!engine) return null;
    const lines: string[] = [
      `-- DuckDB dump`,
      `-- Generated by Dataslope\n`,
    ];
    const schema = selectedSchemaRef.current;
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
        if (ddl) {
          lines.push(`${ddl};\n`);
        }
        // Omit generated columns from INSERTs so the dump re-imports cleanly.
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
        for (const row of rows) {
          const vals = keepIdx
            .map((i) => formatSqlDumpValue(row[i], typeByName.get(columns[i])))
            .join(", ");
          lines.push(
            `INSERT INTO ${quoteIdent(tableName)} (${quotedCols}) VALUES (${vals});`,
          );
        }
        lines.push("");
      }
    return lines.join("\n");
  }, [tables]);

  const exportDuckDbDatabase = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || tables.length === 0) return;
    try {
      const sql = await buildDuckDbDumpSql();
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
  }, [tables, buildDuckDbDumpSql, displayFilename, showToast]);

  // Cloud saves + sharing: a SQL bundle carries the database as its native
  // .duckdb image plus the query tabs; reopening loads the image instead of
  // replaying a dump.
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const buildCloudBundle = useCallback<BuildBundle>(
    async (opts) => {
      const engine = engineRef.current;
      if (!engine) return null;
      const image = await engine.exportBinaryImage();
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
        name: activeWorkspace?.name ?? "DuckDB Workspace",
        exportedAt: Date.now(),
        sql: {
          dialect: "duckdb",
          dbFormat: "duckdb-image",
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
          throw new Error("This link isn't a DuckDB playground.");
        }
        const seeded = bundleTabSeeds(bundle).map((seed) => ({
          ...seed,
          id: newTabId(),
          pristineCode: seed.code,
        }));
        saveTabs(DUCKDB_BLANK_DATABASE.id, seeded);
        try {
          const activeIdx = Math.min(
            Math.max(0, bundle.sql.activeTabIndex ?? 0),
            seeded.length - 1,
          );
          localStorage.setItem(
            dbScopedKey(DUCKDB_BLANK_DATABASE.id, "active_tab"),
            seeded[activeIdx].id,
          );
        } catch {
          /* ignore */
        }
        await performImportDuckDbImage(
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
  }, [loaded, performImportDuckDbImage, showToast, queryLogKeys, replaceHistory]);

  const exportDuckDbDatabaseToXlsx = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || tables.length === 0) return;
    const baseName =
      displayFilename.replace(/\.[^.]+$/, "") || "database";
    const filename = `${baseName}.xlsx`;
    try {
      const mod = await initXlsxWasm();
      const workbook = new mod.Workbook();
      let sheetCount = 0;
      const xlsxSchema = selectedSchemaRef.current;
      for (const tableName of tables) {
        const sets = await engine.exec(
          `SELECT * FROM ${quoteIdent(xlsxSchema)}.${quoteIdent(tableName)}`,
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
          });
          // Register with DuckDB's virtual filesystem so read_csv('file.csv')
          // works and the file appears in the Files panel.
          void registerVirtualFile(file.name, new TextEncoder().encode(text));
        } catch (err) {
          showToast(
            `Could not parse CSV: ${err instanceof Error ? err.message : String(err)}`,
            "warn",
          );
        }
      };
      reader.readAsText(file);
    },
    [showToast, tables, registerVirtualFile],
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
          });
          void registerVirtualFile(
            file.name,
            new TextEncoder().encode(text),
          );
        } catch (err) {
          showToast(
            `Could not parse JSON: ${err instanceof Error ? err.message : String(err)}`,
            "warn",
          );
        }
      };
      reader.readAsText(file);
    },
    [showToast, tables, registerVirtualFile],
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
        const buf = await file.arrayBuffer();
        await registerVirtualFile(file.name, new Uint8Array(buf));
      } catch (err) {
        showToast(
          `Parquet import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
      }
    },
    [showToast, tables, registerVirtualFile],
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
      try {
        await importRowsIntoDuckDb(
          engine,
          effectiveTable,
          fileColumns,
          rows,
          {
            createTable: !isExisting,
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
      samples={DUCKDB_SAMPLE_DATABASES}
      actions={DUCKDB_DB_ACTIONS}
      chevron={<ChevronDown size={12} />}
      onChange={(value) => {
        if (value === "__new_db__") {
          requestDbSwitch(DUCKDB_BLANK_DATABASE.id);
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
            setRenameDbExt(".duckdb");
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
                                  void exportDuckDbDatabase();
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
                                  void exportDuckDbDatabaseToXlsx();
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
      playgroundTitle="DuckDB Playground"
      loaded={loaded}
      bootFraction={bootDisplayFraction}
      statusState={statusState}
      loadingCaption={loadingMessage}
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
        />

        {/* ── Create Schema popover ── */}
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
                <div className="sql-schema-create-title">Create schema</div>
                <input
                  className="sql-rename-input"
                  value={createSchemaName}
                  onChange={(e) => setCreateSchemaName(e.target.value)}
                  placeholder="schema name"
                  aria-label="Schema name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && createSchemaName.trim()) {
                      void submitCreateSchema();
                    }
                  }}
                />
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
                    disabled={!createSchemaName.trim() || createSchemaSubmitting}
                    onClick={() => void submitCreateSchema()}
                  >
                    Create
                  </button>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        <RenameDatabaseDialog
          open={renameDbOpen}
          name={renameDbName}
          ext={renameDbExt}
          extensionOptions={[".duckdb", ".db", ".ddb"]}
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
          currentWorkspaceName={activeWorkspace?.name ?? "Default DuckDB Workspace"}
          newDbFilename={pendingDbId ? findDuckDbSampleDatabase(pendingDbId).filename : ""}
          onOverwrite={() => {
            if (pendingDbId) void performDbSwitch(pendingDbId);
            setPendingDbId(null);
          }}
          onCreateNew={async () => {
            if (!pendingDbId) return;
            try {
              localStorage.setItem(storageKey("db"), pendingDbId);
            } catch { /* ignore */ }
            const label = findDuckDbSampleDatabase(pendingDbId).label;
            const newWs = await createWorkspace(`${label} Workspace`, PLAYGROUND_ID);
            setPendingDbId(null);
            switchActiveWorkspace(PLAYGROUND_ID, newWs.id);
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
                Dependent objects are <strong>not</strong> cascaded; if another
                object depends on it the drop may fail.
              </>
            ) : null
          }
          truncateDetail={
            <>
              Runs as a plain <strong>DELETE FROM</strong> (DuckDB has no
              TRUNCATE): identity/sequence counters are <strong>not</strong>{" "}
              reset.
            </>
          }
        />

        <SqlSettingsConfirmDialogs
          dialectDisplayName="DuckDB"
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
                        className={`sql-rename-input sql-modify-table-name-input${duckdbStructureValidation.hasTableNameError ? " sql-modify-col-name-error" : ""}`}
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
                            sensors={duckdbStructureSensors}
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
                                      <DuckDbStructureColumnRow
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
                            const newCol = makeNewDuckDbColumn();
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
                              DuckDB generated columns are stored. Editing
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
                    !duckdbStructureValidation.isDirty ||
                    !duckdbStructureValidation.isValid
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
          dialect="duckdb"
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
                            sensors={duckdbStructureSensors}
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
                                      <DuckDbStructureColumnRow
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
                            const newCol = makeNewDuckDbColumn();
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

        <div className="sql-shell duckdb-shell" ref={shellRef}>
          <aside className="sql-sidebar" aria-label="Database explorer">
            <div className="sql-db-selector-wrap">{databaseSelector}</div>
            <div className="sql-sidebar-body">
              <SqlIconSidebar
                buttons={[
                  {
                    icon: <Table size={15} aria-hidden="true" />,
                    label: "Tables",
                    onClick: () => setSidebarView("schema"),
                    isActive: sidebarView === "schema",
                  },
                  {
                    icon: <FolderTree size={15} aria-hidden="true" />,
                    label: "Files",
                    onClick: () => setSidebarView("files"),
                    isActive: sidebarView === "files",
                  },
                ]}
              />
              <div className="sql-sidebar-content">
            {sidebarView === "schema" && (
            <div className="sql-schema-selector-wrap">
              <div className="sql-db-selector-row">
                <Select.Root
                  value={selectedSchema}
                  onValueChange={(value) => {
                    const v = String(value);
                    if (v === "__new_schema__") {
                      if (!loaded) return;
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
                          const userSchemas = schemas.filter((s) => !s.startsWith("pg_") && s !== "information_schema");
                          const systemSchemas = schemas.filter((s) => s.startsWith("pg_") || s === "information_schema");
                          const schemaItem = (schema: string) => (
                            <Select.Item
                              key={schema}
                              value={schema}
                              className="bui-select-item sql-db-item"
                            >
                              <span className="bui-select-item-icon" aria-hidden="true">
                                <Layers size={14} />
                              </span>
                              <span className="sql-db-item-text">
                                <Select.ItemText>{schema}</Select.ItemText>
                              </span>
                            </Select.Item>
                          );
                          return (
                            <>
                              <div className="sql-db-popup-group-label">Schemas</div>
                              {userSchemas.map(schemaItem)}
                              <Select.Item
                                value="__new_schema__"
                                disabled={!loaded}
                                className="bui-select-item sql-db-item sql-db-item-action"
                              >
                                <span className="bui-select-item-icon" aria-hidden="true">
                                  <Plus size={14} />
                                </span>
                                <span className="sql-db-item-text">
                                  <Select.ItemText>New schema…</Select.ItemText>
                                </span>
                              </Select.Item>
                              {systemSchemas.length > 0 && (
                                <>
                                  <div role="separator" aria-orientation="horizontal" className="sql-db-popup-sep" />
                                  <div className="sql-db-popup-group-label">System Catalogs</div>
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
            </div>
            )}
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
              {sidebarView === "files" && (
                <FilesPanel
                  files={virtualFiles}
                  expandedFolders={expandedFolders}
                  onToggleFolder={toggleFilesFolder}
                  onUpload={handleFilesUpload}
                  onDownload={handleFilesDownload}
                  onDelete={handleFilesDelete}
                  onRename={handleFilesRename}
                  onCreateFolder={handleFilesCreateFolder}
                  onMove={handleFilesMove}
                  onOpenQuery={queryFileWithSelect}
                  onCreateTable={createTableFromFile}
                  canCreateTable={isDuckDbReadableFile}
                />
              )}
              {sidebarView === "schema" && (
                <>
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
                  {/* DuckDB has no triggers: the TRIGGERS section is
                      intentionally omitted (listTriggers() always
                      resolves to []). */}
                </>
              )}
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
            className={`sql-panes duckdb-panes${activeTab?.kind === "view-data" ? " sql-panes--view-data" : ""}${activeTab?.kind === "er-diagram" ? " sql-panes--er-diagram" : ""}${activeTab?.kind === "query-history" ? " sql-panes--query-history" : ""}${isSettingsTabActive ? " sql-panes--settings" : ""}`}
          >
            <h1 className="playground-sr-title">DuckDB playground</h1>
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
                engineLabel="DuckDB"
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
  engine: DuckDbEngine | null;
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
              `Could not load columns for "${target}": ${err instanceof Error ? err.message : String(err)
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
          `Could not load columns for "${newTable}": ${err instanceof Error ? err.message : String(err)
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

export default function DuckDbPlayground() {
  return (
    <Toast.Provider timeout={2400}>
      <DuckDbPlaygroundInner />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
