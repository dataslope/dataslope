"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
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
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Combobox } from "@base-ui-components/react/combobox";
import { Dialog } from "@base-ui-components/react/dialog";
import { Menu } from "@base-ui-components/react/menu";
import { Popover } from "@base-ui-components/react/popover";
import { Select } from "@base-ui-components/react/select";
import { Switch } from "@base-ui-components/react/switch";
import { Toast } from "@base-ui-components/react/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  Database,
  FilePlus,
  FileJson,
  FileText,
  GripVertical,
  History,
  Layers,
  Network,
  Pencil,
  Play,
  Plus,
  Table,
  Trash2,
  TriangleAlert,
  Upload,
  Wand2,
  X,
  FolderTree,
} from "lucide-react";
import { FaInfo } from "react-icons/fa";
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
import { flushSync } from "react-dom";
import "../playground.css";
import "../sqlPlayground.css";
import dynamic from "next/dynamic";

// ErDiagramPane pulls in @xyflow/react and elkjs/lib/elk.bundled.js
// (~hundreds of KB of layout-algorithm code). It only renders when
// the user opens the ER-diagram tab, so defer the chunk until then.
const ErDiagramPane = dynamic(
  () => import("../ErDiagramPane").then((m) => m.ErDiagramPane),
  { ssr: false },
);
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
} from "../languageIcons";
import { PLAYGROUNDS } from "../playgrounds";
import { themeFor } from "../cmExtensions";
import {
  applyMode,
  applyThemePalette,
  clearThemePalette,
  getStoredEditorTheme,
  setStoredEditorTheme,
} from "../playgroundTheme";
import {
  DataslopeRunOverlay,
  DEFAULT_PLAYGROUND_SETTINGS,
  RuntimeInfoContent,
  detectIsMac,
} from "../playgroundShared";
import { SqlSettingsPanel } from "../sql/components/SqlSettingsPanel";
import { SqlSettingsConfirmDialogs } from "../sql/components/SqlSettingsConfirmDialogs";
import { DdlViewerDialog } from "../sql/components/DdlViewerDialog";
import { SwitchDatabaseDialog } from "../sql/components/SwitchDatabaseDialog";
import { SchemaActionDialogs } from "../sql/components/SchemaActionDialogs";
import { ImportSqlDumpDialog } from "../sql/components/ImportSqlDumpDialog";
import { RenameDatabaseDialog } from "../sql/components/RenameDatabaseDialog";
import { findDuckDbSampleDatabase } from "../runtime/duckdbSamples";
import { duckdbAdapter } from "./duckdbAdapter";
import { type DuckDbEngine } from "../runtime/duckdb";

const DUCKDB_SAMPLE_DATABASES = duckdbAdapter.samples;
const DUCKDB_BLANK_DATABASE = duckdbAdapter.blankSample!;
import type { ForeignKeyInfo, TableColumnInfo } from "../runtime/sqlite";
import type { QueryExecResult } from "sql.js";
import type { QueryTab } from "../sqlitePlaygroundTabs";
import { newTabId } from "../sqlitePlaygroundTabs";
import { SqlTab, SqlTabDragOverlay } from "../sql/components/SqlTab";
import { ResultView } from "../sql/components/ResultView";
import { SchemaItem } from "../sql/components/SchemaItem";
import { SchemaLeafItem } from "../sql/components/SchemaLeafItem";
import { SchemaSection } from "../sql/components/SchemaSection";
import {
  DatabaseSelector,
  type DatabaseSelectorAction,
} from "../sql/components/DatabaseSelector";
import { ToastList } from "../sql/components/ToastList";
import { GenExprEditor } from "../sql/components/GenExprEditor";
import { ColumnFlag } from "../sql/components/ModifyStructureForm";
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
} from "../sql/utils/sqlAnalysis";
import { computeImportColComparison } from "../sql/utils/importUtils";
import {
  ensurePersistUnloadFlush,
  persistAsync,
} from "../sql/utils/persistedStorage";
import { pickFallbackTab, pushTabHistory } from "../sql/utils/tabUtils";
import type {
  AddRowDialogState,
  ColumnKeyHints,
  CsvImportState,
  ImportColComparison,
  JsonImportState,
  ParquetImportState,
  QueryRunResult,
  ResultSetExportScope,
  ResultSetExportSnapshot,
} from "../sql/types";
import type { RuntimeInfo } from "../types";
import type { SqlCompletionSchema } from "../sql/sqlCompletion";
import { useDuckDbSettingsStore } from "./stores/useDuckDbSettingsStore";
import {
  importRowsIntoDuckDb,
  parseCsv,
  readParquetFile,
  tableNameFromFilename,
} from "./duckdbImport";
import { FK_ACTIONS } from "../sql/constants";

const PLAYGROUND_ID = duckdbAdapter.playgroundId;
const STORAGE_PREFIX = duckdbAdapter.storagePrefix;

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
    // DuckDB ships first-class composite types. The free-text type
    // input still accepts arbitrary expressions like
    // `STRUCT(name VARCHAR, value DOUBLE)`.
    types: ["INTEGER[]", "VARCHAR[]", "MAP(VARCHAR, INTEGER)"],
  },
] as const;

const DUCKDB_TYPE_OPTIONS: readonly string[] = DUCKDB_TYPE_GROUPS.flatMap(
  (group) => group.types,
);
// DuckDB doesn't ship Postgres-style serial pseudo-types; "identity"
// columns use `GENERATED BY DEFAULT AS IDENTITY` on any integer
// family type. We still expose the boolean as "identity" so the form
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

  const query = inputVal.trim().toLowerCase();
  const visibleGroups = useMemo(
    () =>
      DUCKDB_TYPE_GROUPS.map((group) => ({
        ...group,
        types: group.types.filter((type) => type.toLowerCase().includes(query)),
      })).filter((group) => group.types.length > 0),
    [query],
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
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-table"
            value={col.fkTable}
            onChange={(e) =>
              onChange({ fkTable: e.target.value, fkColumn: "" })
            }
            aria-label="Foreign key target table"
          >
            <option value="">(none)</option>
            {knownTables.map((table) => (
              <option key={table} value={table}>
                {table}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-column"
            value={col.fkColumn}
            onChange={(e) => onChange({ fkColumn: e.target.value })}
            aria-label="Foreign key target column"
            disabled={!col.fkTable}
          >
            <option value="">(column)</option>
            {fkTargetColumns.map((target) => (
              <option key={target.name} value={target.name}>
                {target.name}
              </option>
            ))}
          </select>
        </label>
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
 *  storage-type selector — only the expression is editable. */
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
const dbScopedKey = (dbId: string, key: string) =>
  `${STORAGE_PREFIX}db_${dbId}_${key}`;
const DEFAULT_PAGE_SIZE = 50;

const RUNTIME_INFO: RuntimeInfo = {
  language: "DuckDB",
  version: "1.30",
  engine: "duckdb-wasm 1.30",
  engineUrl: "https://duckdb.org/docs/api/wasm/overview",
  notes:
    "Pure-WASM build of DuckDB that runs entirely in your browser. Each sample database is rebuilt in memory on every page load. DuckDB does not support triggers or VIRTUAL generated columns; STORED generated columns are supported.",
};

const IMPORT_COL_STATUS_LABEL: Record<ImportColComparison["status"], string> = {
  matched: "✓ Matched",
  extra: "⚠ Not in table",
  optional: "○ Optional",
  required: "✗ Required",
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function makeTabs(defaults: { title: string; code: string }[]): QueryTab[] {
  return defaults.map((seed) => ({
    ...seed,
    id: newTabId(),
    pristineCode: seed.code,
  }));
}

function loadTabs(dbId: string): QueryTab[] {
  const sample = findDuckDbSampleDatabase(dbId);
  if (typeof window === "undefined") return makeTabs(sample.defaultTabs);
  try {
    const raw = localStorage.getItem(dbScopedKey(dbId, "tabs"));
    if (raw) {
      const parsed = JSON.parse(raw) as QueryTab[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((tab) => ({
          id: typeof tab.id === "string" ? tab.id : newTabId(),
          title: typeof tab.title === "string" ? tab.title : "Query",
          code: typeof tab.code === "string" ? tab.code : "",
          pristineCode:
            typeof tab.pristineCode === "string"
              ? tab.pristineCode
              : typeof tab.code === "string"
                ? tab.code
                : "",
          kind: tab.kind === "view-data" ? "view-data" : undefined,
        }));
      }
    }
  } catch {
    // Fall back to defaults.
  }
  return makeTabs(sample.defaultTabs);
}

function saveTabs(dbId: string, tabs: QueryTab[]): void {
  try {
    localStorage.setItem(
      dbScopedKey(dbId, "tabs"),
      JSON.stringify(
        tabs.filter(
          (tab) => tab.kind !== "er-diagram" && tab.kind !== "query-history",
        ),
      ),
    );
  } catch {
    // Ignore storage quota / private-mode errors.
  }
}

function tabsAreDirty(
  tabs: QueryTab[],
  defaults: { title: string; code: string }[],
): boolean {
  if (tabs.length !== defaults.length) return true;
  for (let i = 0; i < tabs.length; i += 1) {
    if (
      tabs[i].title !== defaults[i].title ||
      tabs[i].code !== defaults[i].code
    ) {
      return true;
    }
  }
  return false;
}

type ImportFlavor = "csv" | "json" | "parquet";

function DuckDbPlaygroundInner() {
  const router = useRouter();
  // Coalesced localStorage writer for settings — install the
  // pagehide/visibilitychange flush listener once per playground mount.
  useEffect(() => {
    ensurePersistUnloadFlush();
  }, []);
  const toastManager = Toast.useToastManager();
  const showToast = useCallback(
    (title: string, kind: "info" | "warn" = "info") => {
      startTransition(() => {
        toastManager.add({ title, data: { kind } });
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
  const [tabs, setTabs] = useState<QueryTab[]>(() => loadTabs(initialDbId));
  const [activeTabId, setActiveTabId] = useState(() => tabs[0]?.id ?? "");
  const [resultsByTab, setResultsByTab] = useState<
    Record<string, QueryRunResult | null>
  >({});
  const [loaded, setLoaded] = useState(false);
  const [statusState, setStatusState] = useState<
    "loading" | "ready" | "running" | "error"
  >("loading");
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading DuckDB engine…",
  );
  const [tables, setTables] = useState<string[]>([]);
  const [views, setViews] = useState<string[]>([]);
  const [indexesExpanded, setIndexesExpanded] = useState(true);
  const [viewsExpanded, setViewsExpanded] = useState(true);
  const [tablesExpanded, setTablesExpanded] = useState(true);
  // Triggers are not supported by DuckDB so the corresponding sidebar
  // section is omitted entirely. We still keep the setter so the
  // shared `refreshSchema()` logic from the Postgres playground can
  // keep its single, uniform shape.
  const [, setTriggers] = useState<string[]>([]);
  const [indexes, setIndexes] = useState<string[]>([]);
  const [columnsByEntity, setColumnsByEntity] = useState<
    Record<string, TableColumnInfo[]>
  >({});
  const [foreignKeysByEntity, setForeignKeysByEntity] = useState<
    Record<string, ForeignKeyInfo[]>
  >({});
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(
    new Set(),
  );
  const [globalPageSize, setGlobalPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [resultSetExportSnapshot, setResultSetExportSnapshot] =
    useState<ResultSetExportSnapshot | null>(null);
  const [rowCountByTable, setRowCountByTable] = useState<
    Record<string, number>
  >({});

  // ─── Schema selector state ────────────────────────────────────────────
  const [selectedSchema, setSelectedSchema] = useState("main");
  const [schemas, setSchemas] = useState<string[]>(["main"]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(false);
  const [createSchemaDialogOpen, setCreateSchemaDialogOpen] = useState(false);
  const [createSchemaName, setCreateSchemaName] = useState("");
  const [createSchemaSubmitting, setCreateSchemaSubmitting] = useState(false);
  const selectedSchemaRef = useRef("main");
  const showSystemSchemasRef = useRef(true);

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
  } = useQueryHistory();

  // ─── Dialog state ─────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [confirmClearStorageOpen, setConfirmClearStorageOpen] = useState(false);
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
  const [importDuckDbOpen, setImportDuckDbOpen] = useState(false);
  const [importDuckDbDragging, setImportDuckDbDragging] = useState(false);

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
  // Only include NEW columns (originalName === null) that have been touched
  // (blurred) or already have a non-empty name so that empty-name errors
  // don't appear until the user has had a chance to type something.
  // Existing columns always show validation errors immediately.
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
  // Only include columns that have been touched (blurred) or already have a
  // non-empty name so that empty-name errors don't appear until the user
  // has had a chance to type something.
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
  const langCompRef = useRef<Compartment | null>(null);
  const completionCompRef = useRef<Compartment | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  const engineRef = useRef<DuckDbEngine | null>(null);
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  /** MRU history stack (oldest → most-recent), never includes the current tab. */
  const tabHistoryRef = useRef<string[]>([]);
  const activeDbIdRef = useRef(activeDbId);
  const runningRef = useRef(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizerRef = useRef<HTMLDivElement | null>(null);
  const panesRef = useRef<HTMLElement | null>(null);
  const editorPaneRef = useRef<HTMLDivElement | null>(null);
  const resultsPaneRef = useRef<HTMLElement | null>(null);
  const resizerRef = useRef<HTMLDivElement | null>(null);

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

  const activeTab =
    tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;
  const result = activeTab ? (resultsByTab[activeTab.id] ?? null) : null;
  const activeSample = findDuckDbSampleDatabase(activeDbId);
  // customDbFilename applies only for the blank/imported database slot.
  const displayFilename =
    activeDbId === DUCKDB_BLANK_DATABASE.id && customDbFilename !== null
      ? customDbFilename
      : activeSample.filename;
  const tabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  const tabDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const draggingTab = draggingTabId
    ? tabs.find((t) => t.id === draggingTabId) ?? null
    : null;

  // Trailing-edge debounce of `saveTabs` so a fast typist doesn't pay a
  // synchronous JSON.stringify + localStorage.setItem on every keystroke.
  // We still update `tabsRef.current` + React state immediately so the rest
  // of the component sees fresh tab text right away — only the persist
  // is deferred. Pending writes are flushed on tab/db switch and unmount.
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

  const handleTabDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    setDraggingTabId(id);
    setActiveTabId(id);
  }, []);

  const handleTabDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingTabId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const current = tabsRef.current;
      const oldIndex = current.findIndex((t) => t.id === active.id);
      const newIndex = current.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      persistTabs(arrayMove(current, oldIndex, newIndex));
    },
    [persistTabs],
  );

  const handleTabDragCancel = useCallback(() => {
    setDraggingTabId(null);
  }, []);

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
    // Cap concurrency so a large catalog doesn't queue dozens of queries
    // on the DuckDB worker at once. Two queries per table (columns + FKs)
    // are cheap, so a small pool keeps the worker responsive.
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
    // Drop stale row-count cache entries for entities that no longer
    // exist; keep cached counts for still-present tables so the
    // sidebar doesn't blink between "(N rows)" and a Promise resolution.
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

  const refreshSchemas = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextSchemas = await engine.listSchemas(showSystemSchemasRef.current);
    setSchemas(nextSchemas);
    if (!nextSchemas.includes(selectedSchemaRef.current)) {
      selectedSchemaRef.current = "main";
      setSelectedSchema("main");
      await refreshSchema();
    }
  }, [refreshSchema]);

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
      if (!engine || runningRef.current) return;
      const trimmed = sql.trim();
      if (!trimmed) {
        showToast("Nothing to run — the query is empty.", "warn");
        return;
      }
      runningRef.current = true;
      setStatusState("running");
      if (clearBeforeRun) {
        setResultsByTab((prev) => ({ ...prev, [tabId]: null }));
      }
      const t0 = performance.now();
      const noComments = stripSqlComments(trimmed);
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
        const elapsedMs = performance.now() - t0;
        setResultsByTab((prev) => ({
          ...prev,
          [tabId]: {
            sets,
            elapsedMs,
            source,
            sourceTable,
            lazySql,
            lazyBaseSql,
            lazyTotalCount,
            lazyPage,
            lazyPageSize,
            lazyInfinite: effectivePageSize === 0 && useLazy,
          },
        }));
        addHistoryEntry({
          sql: trimmed,
          source,
          executedAt: Date.now(),
          elapsedMs,
          success: true,
        });
        await refreshSchema();
        // Keep the running overlay visible long enough for the 180ms CSS
        // transition to complete and be perceptible to the user.
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
        window.setTimeout(() => setStatusState("ready"), 3000);
      } finally {
        runningRef.current = false;
      }
    },
    [clearBeforeRun, globalPageSize, refreshSchema, showToast, addHistoryEntry],
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
  }, [runActiveTab, runSqlForTab]);

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
        const engine = await duckdbAdapter.createEngine(initialDbId);
        if (cancelled) {
          // The component already unmounted while bootstrap was in flight.
          // The engine never reaches engineRef, so the unmount cleanup
          // can't destroy it — do it here instead so its connection
          // doesn't outlive this mount and interfere with the next one.
          void engine.destroy();
          return;
        }
        engineRef.current = engine;
        await refreshSchemas();
        await refreshSchema();
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
      editorRef.current?.destroy();
      editorRef.current = null;
      langCompRef.current = null;
      completionCompRef.current = null;
      themeCompRef.current = null;
      wrapCompRef.current = null;
      // Release the per-mount DuckDB connection. The shared DuckDB-Wasm
      // module is kept in module-level state on purpose so the WASM
      // bundle doesn't have to be re-downloaded, but leaving the
      // connection open lets its catalog work race with the connection
      // a remount creates next.
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

  // Keep autocomplete schema in sync with current tables/views. Skip the
  // dispatch when nothing actually changed — refreshSchema() always
  // creates fresh `columnsByEntity` / `foreignKeysByEntity` objects, so
  // reference equality would fire this effect (and re-parse the entire
  // editor doc) on every query / CSV import even when the visible schema
  // hasn't moved.
  const lastReconfigureKeyRef = useRef<string>("");
  useEffect(() => {
    const view = editorRef.current;
    const completionComp = completionCompRef.current;
    if (!view || !langCompRef.current || !completionComp) return;
    const schema: Record<string, string[]> = {};
    const completionSchema: SqlCompletionSchema = { entities: [] };
    for (const name of tables) {
      const cols = columnsByEntity[name]?.map((column) => column.name) ?? [];
      schema[name] = cols;
      completionSchema.entities.push({ name, columns: cols, kind: "table" });
    }
    for (const name of views) {
      const cols = columnsByEntity[name]?.map((column) => column.name) ?? [];
      schema[name] = cols;
      completionSchema.entities.push({ name, columns: cols, kind: "view" });
    }
    const key = JSON.stringify(completionSchema.entities);
    if (key === lastReconfigureKeyRef.current) return;
    // Dispatch the completion reconfigure immediately so user-defined
    // tables/views show up in autocomplete the moment the schema lands.
    view.dispatch({
      effects: [
        completionComp.reconfigure(
          makeSqlAutocompletionExtension(completionSchema, "duckdb"),
        ),
      ],
    });
    // `@codemirror/lang-sql` is lazy-loaded (Stage 5.3) so the lang
    // compartment reconfigure has to await the chunk. The view + key
    // checks below guard against stale dispatches if the user typed,
    // imported, or destroyed the editor before the chunk resolved.
    // We only mark `lastReconfigureKeyRef` as up-to-date once the lang
    // dispatch actually fires — that way a StrictMode-cancelled effect
    // won't make the next run incorrectly skip the lang reconfigure.
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
  }, [tables, views, columnsByEntity]);

  // Drop result entries whose owning tab no longer exists.
  useEffect(() => {
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
      // Persist any pending edits to the outgoing database before
      // its tabs go out of scope.
      flushPendingSave();
      setStatusState("loading");
      setDbLoading(true);
      // Clear the sidebar schema state up front so the previous database's
      // tables/views/indexes can never render under the new database's
      // label while the bootstrap and `refreshSchema()` calls below are in
      // flight.
      setTables([]);
      setViews([]);
      setIndexes([]);
      setTriggers([]);
      setColumnsByEntity({});
      setForeignKeysByEntity({});
      setRowCountByTable({});
      setExpandedEntities(new Set());
      // Reset the in-memory file tree — switching databases reinitialises
      // DuckDB's virtual filesystem too, so any previously registered
      // user files (CSV/JSON/Parquet) are no longer queryable anyway.
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
        const nextTabs = loadTabs(sample.id);
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
      if (nextId === activeDbIdRef.current) return;
      const curSample = findDuckDbSampleDatabase(activeDbIdRef.current);
      if (tabsAreDirty(tabsRef.current, curSample.defaultTabs)) {
        setPendingDbId(nextId);
        return;
      }
      void performDbSwitch(nextId);
    },
    [performDbSwitch],
  );

  const handleSchemaChange = useCallback(
    async (schema: string) => {
      // Base UI Select fires onValueChange(null) when no item matches the
      // controlled value (e.g. while the schema list is empty during a
      // fetch). Ignore those spurious calls to prevent "null" poisoning
      // selectedSchemaRef and the subsequent SQL queries.
      if (!schema || schema === "null") return;
      selectedSchemaRef.current = schema;
      setSelectedSchema(schema);
      setSchemaLoading(true);
      try {
        await refreshSchema();
      } finally {
        setSchemaLoading(false);
      }
    },
    [refreshSchema],
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
      await engine.registerFileBuffer(path, bytes);
      setVirtualFiles((prev) => {
        const filtered = prev.filter((f) => f.path !== path);
        return [...filtered, { path, size: bytes.length, isFolder: false }];
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
        // Determine which entries are removed (the path itself plus any
        // children if it's a folder) so we can drop them all from the
        // virtual filesystem.
        const prefix = `${path}/`;
        const toRemove = virtualFiles.filter(
          (f) => f.path === path || f.path.startsWith(prefix),
        );
        for (const entry of toRemove) {
          if (!entry.isFolder) {
            await engine.dropFile(entry.path);
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
          // Snapshot the entries we're renaming up-front so the iteration
          // isn't affected by the state update below.
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
        // Compute the new path: keep the source's leaf name, place it
        // under destFolderPath (or at the root if dest is "").
        const leaf = sourcePath.split("/").pop() ?? sourcePath;
        const newPath = destFolderPath ? `${destFolderPath}/${leaf}` : leaf;
        if (newPath === sourcePath) return;
        // Reuse the rename helper — same mechanics: drop+re-register
        // each file, update the in-memory list. Auto-expand the dest
        // folder so the moved entry is visible after the drop.
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
      setTables([]);
      setViews([]);
      setIndexes([]);
      setTriggers([]);
      setColumnsByEntity({});
      setForeignKeysByEntity({});
      setRowCountByTable({});
      setExpandedEntities(new Set());
      try {
        await engine.loadBlankDatabase();
        await engine.exec(sqlText);
        setActiveDbId(DUCKDB_BLANK_DATABASE.id);
        setCustomDbFilename(filename);
        try {
          localStorage.setItem(storageKey("db"), DUCKDB_BLANK_DATABASE.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(DUCKDB_BLANK_DATABASE.id);
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
        showToast(
          `Import failed: ${err instanceof Error ? err.message : String(err)}`,
          "warn",
        );
        setStatusState("ready");
      }
    },
    [persistTabs, refreshSchema, showToast],
  );

  const performImportDuckDb = useCallback(
    async (bytes: Uint8Array, filename: string) => {
      const engine = engineRef.current;
      if (!engine) return;
      setStatusState("loading");
      setTables([]);
      setViews([]);
      setIndexes([]);
      setTriggers([]);
      setColumnsByEntity({});
      setForeignKeysByEntity({});
      setRowCountByTable({});
      setExpandedEntities(new Set());
      try {
        await engine.importFromBinary(bytes);
        setActiveDbId(DUCKDB_BLANK_DATABASE.id);
        setCustomDbFilename(filename);
        try {
          localStorage.setItem(storageKey("db"), DUCKDB_BLANK_DATABASE.id);
        } catch {
          /* ignore */
        }
        const nextTabs = loadTabs(DUCKDB_BLANK_DATABASE.id);
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
        setImportDuckDbOpen(false);
        setImportDuckDbDragging(false);
        await refreshSchemas();
        await refreshSchema();
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

  const addTab = useCallback(() => {
    const tab: QueryTab = {
      id: newTabId(),
      title: `Query ${tabsRef.current.length + 1}`,
      code: "",
      pristineCode: "",
    };
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
    const next = [...tabsRef.current, tab];
    tabsRef.current = next;
    activeTabIdRef.current = tab.id;
    flushSync(() => {
      setTabs(next);
      setActiveTabId(tab.id);
    });
    editorRef.current?.focus();
    saveTabs(activeDbIdRef.current, next);
    // Keep all referenced bindings in the dependency list; saveTabs and
    // state setters are stable, so suppress exhaustive-deps' extra warning.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabsRef, activeTabIdRef, activeDbIdRef, tabHistoryRef, editorRef, setTabs, setActiveTabId, saveTabs]);

  const openTabAndRun = useCallback(
    (title: string, sql: string) => {
      const tab: QueryTab = {
        id: newTabId(),
        title,
        code: sql,
        pristineCode: sql,
      };
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, tab.id);
      persistTabs([...tabsRef.current, tab]);
      setActiveTabId(tab.id);
      void runSqlForTab(tab.id, sql, title);
    },
    [persistTabs, runSqlForTab],
  );

  const closeTab = useCallback(
    (id: string) => {
      const currentTabs = tabsRef.current;
      const next = currentTabs.filter((tab) => tab.id !== id);
      const finalTabs =
        next.length > 0
          ? next
          : [{ id: newTabId(), title: "Query 1", code: "", pristineCode: "" }];
      persistTabs(finalTabs);
      // Prune closed tab from history before selecting fallback.
      tabHistoryRef.current = tabHistoryRef.current.filter((hid) => hid !== id);
      if (activeTabIdRef.current === id) {
        const fallback = pickFallbackTab(finalTabs, id, currentTabs, tabHistoryRef.current);
        setActiveTabId(fallback.id);
      }
      setResultsByTab((prev) => {
        const { [id]: _deleted, ...rest } = prev;
        void _deleted;
        return rest;
      });
    },
    [persistTabs],
  );

  const resetTabsForCurrentDb = useCallback(() => {
    const sample = findDuckDbSampleDatabase(activeDbIdRef.current);
    const fresh = makeTabs(sample.defaultTabs);
    tabHistoryRef.current = [];
    persistTabs(fresh);
    setActiveTabId(fresh[0]?.id ?? "");
    setResultsByTab({});
    showToast(`Reset query tabs for ${sample.label}.`);
  }, [persistTabs, showToast]);

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

  const openErDiagramTab = useCallback(() => {
    const currentTabs = tabsRef.current;
    const currentActiveTabId = activeTabIdRef.current;
    const existing = currentTabs.find((tab) => tab.kind === "er-diagram");
    if (existing) {
      if (existing.id === currentActiveTabId) {
        const next = currentTabs.filter((t) => t.id !== existing.id);
        const finalTabs =
          next.length > 0
            ? next
            : [
              {
                id: newTabId(),
                title: "Query 1",
                code: "",
                pristineCode: "",
              },
            ];
        persistTabs(finalTabs);
        setActiveTabId(finalTabs[0].id);
        return;
      }
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, existing.id);
      setActiveTabId(existing.id);
      return;
    }
    const tab: QueryTab = {
      id: newTabId(),
      title: "ER Diagram",
      code: "",
      pristineCode: "",
      kind: "er-diagram",
    };
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, tab.id);
    persistTabs([...currentTabs, tab]);
    setActiveTabId(tab.id);
  }, [persistTabs]);

  const openQueryHistoryTab = useCallback(() => {
    const currentTabs = tabsRef.current;
    const currentActiveTabId = activeTabIdRef.current;
    const existing = currentTabs.find((tab) => tab.kind === "query-history");
    if (existing) {
      if (existing.id === currentActiveTabId) {
        const next = currentTabs.filter((t) => t.id !== existing.id);
        const finalTabs =
          next.length > 0
            ? next
            : [
              {
                id: newTabId(),
                title: "Query 1",
                code: "",
                pristineCode: "",
              },
            ];
        persistTabs(finalTabs);
        setActiveTabId(finalTabs[0].id);
        return;
      }
      tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, existing.id);
      setActiveTabId(existing.id);
      return;
    }
    const tab: QueryTab = {
      id: newTabId(),
      title: "Query History",
      code: "",
      pristineCode: "",
      kind: "query-history",
    };
    tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, currentActiveTabId, tab.id);
    persistTabs([...currentTabs, tab]);
    setActiveTabId(tab.id);
  }, [persistTabs]);

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

  const handleFormatCode = useCallback(async () => {
    const view = editorRef.current;
    if (!view) return;
    const code = view.state.doc.toString();
    if (!code.trim()) return;
    setIsFormatting(true);
    try {
      const { format: sqlFormat } = await import("sql-formatter");
      const formatted = sqlFormat(code, { language: "sql" });
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: formatted },
      });
    } catch {
      // silently ignore formatting errors (e.g. unparseable SQL)
    } finally {
      setIsFormatting(false);
    }
  }, []);

  // ─── Result/sidebar helpers ──────────────────────────────────────────
  const resultKeyHints = useMemo<ColumnKeyHints | undefined>(() => {
    const tableName = result?.sourceTable;
    if (!tableName) return undefined;
    const cols = columnsByEntity[tableName] ?? [];
    const fks = foreignKeysByEntity[tableName] ?? [];
    return {
      pk: new Set(cols.filter((col) => col.pk > 0).map((col) => col.name)),
      fk: new Map(fks.map((fk) => [fk.from, fk])),
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
      }
    },
    [resultsByTab],
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
      // Strip generated columns — DuckDB rejects INSERTs that target them.
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
      // Display SQL is for the editor tab only — actual execution uses
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

  // Row counts are fetched lazily on first use to avoid an N+1
  // `SELECT COUNT(*)` fan-out during refreshSchema (which fires after
  // every query and every CSV import). Cached results are returned
  // synchronously so the sidebar doesn't blink. In-flight requests are
  // de-duplicated per table.
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

  const exportDuckDbBinary = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || tables.length === 0) return;
    try {
      const bytes = await engine.exportAsBinary();
      const baseName =
        displayFilename.replace(/\.[^.]+$/, "") || "database";
      const filename = `${baseName}.duckdb`;
      triggerDownload(
        new Blob([bytes], { type: "application/octet-stream" }),
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

  const exportDuckDbDatabase = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || tables.length === 0) return;
    try {
      const lines: string[] = [
        `-- DuckDB dump`,
        `-- Generated by Dataslope\n`,
      ];
      const schema = selectedSchemaRef.current;
      for (const tableName of tables) {
        const ddl = await engine.getDDL(tableName, schema);
        if (ddl) {
          lines.push(`${ddl};\n`);
        }
        const sets = await engine.exec(
          `SELECT * FROM ${quoteIdent(schema)}.${quoteIdent(tableName)}`,
        );
        const set = sets?.[0];
        if (!set) continue;
        const { columns, values: rows } = set;
        const quotedCols = columns.map((c) => quoteIdent(c)).join(", ");
        for (const row of rows) {
          const vals = row
            .map((v) => {
              if (v === null || v === undefined) return "NULL";
              if (typeof v === "number") return String(v);
              return `'${String(v).replace(/'/g, "''")}'`;
            })
            .join(", ");
          lines.push(
            `INSERT INTO ${quoteIdent(tableName)} (${quotedCols}) VALUES (${vals});`,
          );
        }
        lines.push("");
      }
      const sql = lines.join("\n");
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
  }, [tables, displayFilename, showToast]);

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
        new Blob([bytes], {
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
          // Register the raw bytes with DuckDB's virtual filesystem so
          // queries like `SELECT * FROM read_csv('file.csv')` work and
          // surface the file in the Files panel.
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

  return (
    <div className="pg-root">
      {!loaded && (
        <div
          className={`pyodide-loading${statusState === "error" ? " has-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          <div className="loading-hero" aria-hidden="true">
            <div className="loading-hero-track">
              <span className="loading-hero-text">DuckDB Playground</span>
              <span className="loading-hero-text">DuckDB Playground</span>
              <span className="loading-hero-text">DuckDB Playground</span>
            </div>
          </div>
          <div className="loading-bottom">
            <div className="loading-quip">{loadingMessage}</div>
            <div className="loading-bar-wrap">
              <div className="loading-bar" />
            </div>
          </div>
        </div>
      )}
      <div className="pg-app">
        <header className="pg-header">
          <div className="logo">
            <Link href="/" aria-label="Dataslope home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/dataslope-logo-blue.svg"
                alt="Dataslope logo"
                className="brand-logo"
              />
            </Link>
            <Link href="/" className="brand-name">
              Dataslope
            </Link>
            <Select.Root
              value={PLAYGROUND_ID}
              onValueChange={(value) => {
                const selectedPlayground = PLAYGROUNDS.find(
                  (playground) => playground.id === value,
                );
                if (
                  selectedPlayground &&
                  selectedPlayground.id !== PLAYGROUND_ID
                ) {
                  router.push(selectedPlayground.href);
                }
              }}
            >
              <Select.Trigger
                className="playground-switcher"
                aria-label="Switch playground"
              >
                {(() => {
                  const Icon = PLAYGROUND_ICONS[PLAYGROUND_ID];
                  const factor =
                    PLAYGROUND_ICON_SIZE_FACTOR[PLAYGROUND_ID] ?? 1;
                  return Icon ? (
                    <span
                      className="playground-switcher-lang-icon"
                      style={{ color: "var(--text)" }}
                      aria-hidden="true"
                    >
                      <Icon size={Math.round(16 * factor)} />
                    </span>
                  ) : null;
                })()}
                <Select.Value />
                <Select.Icon className="playground-switcher-icon">
                  <ChevronDown size={12} />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner
                  className="pg-lang-switcher-positioner"
                  sideOffset={6}
                  alignItemWithTrigger={false}
                >
                  <Select.Popup className="bui-select-popup pg-lang-switcher-popup">
                    {PLAYGROUNDS.map((playground) => {
                      const Icon = PLAYGROUND_ICONS[playground.id];
                      const factor =
                        PLAYGROUND_ICON_SIZE_FACTOR[playground.id] ?? 1;
                      return (
                        <Select.Item
                          key={playground.id}
                          value={playground.id}
                          className="bui-select-item"
                        >
                          {Icon && (
                            <span
                              className="bui-select-item-icon"
                              aria-hidden="true"
                            >
                              <Icon size={Math.round(16 * factor)} />
                            </span>
                          )}
                          <Select.ItemText>{playground.label}</Select.ItemText>
                        </Select.Item>
                      );
                    })}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="header-sep" />
          <div className="header-actions desktop-only">
            <Menu.Root>
              <Menu.Trigger
                className="header-btn"
                title="Import data"
                aria-label="Import"
                disabled={!loaded}
              >
                <ArrowUpFromLine size={14} aria-hidden="true" />
                <span className="btn-label">Import</span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="start">
                  <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                    <div className="import-section-label">Database</div>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => setImportSqlDumpOpen(true)}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from SQL dump
                          <span className="ext-badge">.sql</span>
                        </div>
                        <div className="ex-desc">
                          Load database from a SQL dump file
                        </div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => setImportDuckDbOpen(true)}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from DuckDB
                          <span className="ext-badge">.duckdb</span>
                        </div>
                        <div className="ex-desc">
                          Load database from a DuckDB file
                        </div>
                      </div>
                    </Menu.Item>
                    <div className="import-section-label">Tables</div>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportCsvState(null);
                        setImportCsvOpen(true);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from CSV
                          <span className="ext-badge">.csv</span>
                        </div>
                        <div className="ex-desc">Add table from CSV file</div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportJsonState(null);
                        setImportJsonOpen(true);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from JSON
                          <span className="ext-badge">.json</span>
                        </div>
                        <div className="ex-desc">Add table from JSON array</div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => {
                        setImportParquetState(null);
                        setImportParquetOpen(true);
                      }}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          from Parquet
                          <span className="ext-badge">.parquet</span>
                        </div>
                        <div className="ex-desc">
                          Add table from Parquet file
                        </div>
                      </div>
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            {tables.length === 0 && loaded ? (
              <Popover.Root
                open={exportNoTabsHover}
                onOpenChange={setExportNoTabsHover}
              >
                <div
                  style={{ cursor: "not-allowed" }}
                  onMouseEnter={() => setExportNoTabsHover(true)}
                  onMouseLeave={() => setExportNoTabsHover(false)}
                  onFocus={() => setExportNoTabsHover(true)}
                  onBlur={() => setExportNoTabsHover(false)}
                  tabIndex={0}
                  role="button"
                  aria-disabled="true"
                  aria-label="Export (create a table to enable)"
                >
                  <Popover.Trigger
                    className="header-btn"
                    disabled
                    style={{ pointerEvents: "none" }}
                    title="Export database"
                    aria-label="Export"
                  >
                    <ArrowDownToLine size={14} aria-hidden="true" />
                    <span className="btn-label">Export DB</span>
                  </Popover.Trigger>
                </div>
                <Popover.Portal>
                  <Popover.Positioner
                    sideOffset={6}
                    align="start"
                    className="sql-export-disabled-positioner"
                  >
                    <Popover.Popup className="bui-popup sql-export-disabled-popup">
                      Create a table to export the database
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
            ) : (
              <Menu.Root>
                <Menu.Trigger
                  className="header-btn"
                  title="Export database"
                  aria-label="Export"
                  disabled={!loaded}
                >
                  <ArrowDownToLine size={14} aria-hidden="true" />
                  <span className="btn-label">Export DB</span>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={6} align="start">
                    <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
                      <div className="sql-result-export-group-label">
                        DuckDB Database
                      </div>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => void exportDuckDbBinary()}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">
                            DuckDB Binary
                            <span className="ext-badge">.duckdb</span>
                          </div>
                          <div className="ex-desc">
                            Native DuckDB file format
                          </div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => void exportDuckDbDatabase()}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">
                            SQL Dump
                            <span className="ext-badge">.sql</span>
                          </div>
                          <div className="ex-desc">
                            CREATE + INSERT statements
                          </div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => void exportDuckDbDatabaseToXlsx()}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">
                            Excel Workbook
                            <span className="ext-badge">.xlsx</span>
                          </div>
                          <div className="ex-desc">One sheet per table</div>
                        </div>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            )}
            <Popover.Root>
              <Popover.Trigger
                className="header-btn icon-only"
                title="Runtime info"
                aria-label="Runtime info"
              >
                <FaInfo size={13} aria-hidden="true" />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner sideOffset={6} align="end">
                  <Popover.Popup className="bui-popup info-popover">
                    <RuntimeInfoContent info={RUNTIME_INFO} />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <button
              type="button"
              className="header-btn icon-only"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              aria-label="Settings"
            >
              <svg
                className="stroke-icon"
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        <SqlSettingsPanel
          open={settingsOpen}
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
          onClose={() => setSettingsOpen(false)}
          onRestoreDefaults={() => setConfirmRestoreOpen(true)}
          onClearLocalStorage={() => setConfirmClearStorageOpen(true)}
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
                <div className="settings-panel-pane">
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
                </div>
              ),
            },
          ]}
        />

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

        {/* ── Import DuckDB binary dialog ── */}
        <Dialog.Root
          open={importDuckDbOpen}
          onOpenChange={(next) => {
            if (!next) {
              setImportDuckDbOpen(false);
              setImportDuckDbDragging(false);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop" />
            <Dialog.Popup className="confirm-popup sql-import-popup">
              <Dialog.Title className="confirm-title">
                Import DuckDB File
              </Dialog.Title>
              <Dialog.Description className="confirm-desc">
                Open a local <code>.duckdb</code> file as a new in-memory
                database.
              </Dialog.Description>
              <div className="sql-import-warning">
                <TriangleAlert
                  size={14}
                  className="sql-import-warning-icon"
                  aria-hidden="true"
                />
                <span>
                  This will replace the current database with the contents of
                  the file. Your file will <strong>not</strong> be uploaded or
                  persisted — it is only loaded into browser memory and will be
                  gone on reload.
                </span>
              </div>
              <div
                className={`sql-dropzone${importDuckDbDragging ? " dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setImportDuckDbDragging(true);
                }}
                onDragLeave={() => setImportDuckDbDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setImportDuckDbDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const buf = ev.target?.result;
                    if (!(buf instanceof ArrayBuffer)) return;
                    void performImportDuckDb(new Uint8Array(buf), file.name);
                  };
                  reader.readAsArrayBuffer(file);
                }}
              >
                <Upload
                  size={28}
                  className="sql-dropzone-icon"
                  aria-hidden="true"
                />
                <span>Drop a DuckDB file here</span>
                <span className="sql-dropzone-hint">
                  or click to browse — .duckdb
                </span>
                <input
                  type="file"
                  accept=".duckdb"
                  aria-label="Choose DuckDB file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const buf = ev.target?.result;
                      if (!(buf instanceof ArrayBuffer)) return;
                      void performImportDuckDb(new Uint8Array(buf), file.name);
                    };
                    reader.readAsArrayBuffer(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="confirm-actions" style={{ marginTop: 16 }}>
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

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
          extensionOptions={[".duckdb", ".sql", ".db"]}
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
          currentDbFilename={displayFilename}
          onConfirm={() => {
            if (pendingDbId) void performDbSwitch(pendingDbId);
            setPendingDbId(null);
          }}
        />

        <SchemaActionDialogs
          dropEntityPending={pendingDropEntity}
          onDropEntityOpenChange={(next) => { if (!next) setPendingDropEntity(null); }}
          onDropEntityConfirm={() => void performDropEntity()}
          truncatePending={pendingTruncate}
          onTruncateOpenChange={(next) => { if (!next) setPendingTruncate(null); }}
          onTruncateConfirm={() => void confirmTruncate()}
        />

        <SqlSettingsConfirmDialogs
          dialectDisplayName="DuckDB"
          restoreOpen={confirmRestoreOpen}
          onRestoreOpenChange={setConfirmRestoreOpen}
          onRestoreConfirm={restoreDefaultSettings}
          clearStorageOpen={confirmClearStorageOpen}
          onClearStorageOpenChange={setConfirmClearStorageOpen}
          onClearStorageConfirm={clearAllLocalStorage}
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
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    View/Edit Structure
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    <Table size={12} className="sql-modify-drawer-entity-icon" aria-hidden="true" />
                    {viewStructureDialog?.tableName ?? ""}
                  </Dialog.Description>
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
                    <input
                      className={`sql-rename-input${duckdbStructureValidation.hasTableNameError ? " sql-modify-col-name-error" : ""}`}
                      value={viewStructureDialog.newTableName}
                      onChange={(e) =>
                        setViewStructureDialog((prev) =>
                          prev
                            ? { ...prev, newTableName: e.target.value }
                            : null,
                        )
                      }
                    />
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
                                  <thead>
                                    <tr>
                                      <th
                                        className="sql-modify-drag-cell"
                                        aria-label="Drag handle"
                                      />
                                      <th>Name</th>
                                      <th>Type</th>
                                      <th>Not null</th>
                                      <th>Primary</th>
                                      <th>Unique</th>
                                      <th>Identity</th>
                                      <th>Default</th>
                                      <th>FK table</th>
                                      <th>FK column</th>
                                      <th>On delete</th>
                                      <th>On update</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
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
        <Dialog.Root
          open={addRowDialog !== null}
          onOpenChange={(next) => {
            if (!next) setAddRowDialog(null);
          }}
        >
          <Dialog.Portal>
            <Dialog.Backdrop className="confirm-backdrop sql-modify-backdrop" />
            <Dialog.Popup className="sql-modify-drawer">
              <header className="sql-modify-drawer-header">
                <div className="sql-modify-drawer-heading">
                  <Dialog.Title className="sql-modify-drawer-title">
                    Add Row
                  </Dialog.Title>
                  <Dialog.Description className="sql-modify-drawer-subtitle">
                    {addRowDialog?.tableName ?? ""}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  className="sql-modify-drawer-close"
                  aria-label="Close"
                >
                  <X size={16} aria-hidden="true" />
                </Dialog.Close>
              </header>
              {addRowDialog && (
                <div className="sql-modify-body">
                  <div className="sql-add-row-fields">
                    {addRowDialog.columns.map((c) => {
                      const hasDefault = c.defaultValue !== null;
                      const placeholder = hasDefault
                        ? `auto (${c.defaultValue})`
                        : c.notNull
                          ? "required"
                          : "NULL if empty";
                      return (
                        <label key={c.name} className="sql-add-row-field">
                          <span className="sql-add-row-field-label">
                            <span className="sql-add-row-field-name">
                              {c.name}
                            </span>
                            <span className="sql-add-row-field-type">
                              {c.type || "—"}
                            </span>
                          </span>
                          <input
                            className="sql-rename-input"
                            value={addRowDialog.values[c.name] ?? ""}
                            onChange={(e) =>
                              setAddRowDialog((prev) =>
                                prev
                                  ? {
                                    ...prev,
                                    values: {
                                      ...prev.values,
                                      [c.name]: e.target.value,
                                    },
                                  }
                                  : null,
                              )
                            }
                            placeholder={placeholder}
                            aria-label={c.name}
                          />
                        </label>
                      );
                    })}
                  </div>
                  <label className="sql-add-row-another">
                    <input
                      type="checkbox"
                      checked={addRowDialog.addAnother}
                      onChange={(e) =>
                        setAddRowDialog((prev) =>
                          prev
                            ? { ...prev, addAnother: e.target.checked }
                            : null,
                        )
                      }
                    />
                    Keep open to add another row
                  </label>
                </div>
              )}
              <footer className="sql-modify-drawer-footer">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  className="confirm-btn confirm-btn-primary"
                  onClick={() => void submitAddRow()}
                  disabled={!addRowDialog}
                >
                  Add Row
                </button>
              </footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>

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
                                  <thead>
                                    <tr>
                                      <th
                                        className="sql-modify-drag-cell"
                                        aria-label="Drag handle"
                                      />
                                      <th>Name</th>
                                      <th>Type</th>
                                      <th>Not null</th>
                                      <th>Primary</th>
                                      <th>Unique</th>
                                      <th>Identity</th>
                                      <th>Default</th>
                                      <th>FK table</th>
                                      <th>FK column</th>
                                      <th>On delete</th>
                                      <th>On update</th>
                                      <th>Actions</th>
                                    </tr>
                                  </thead>
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
          engine={engineRef.current}
          onPickFile={(f) => void handleParquetFile(f)}
          onSubmit={() => void submitImport("parquet")}
          onError={(msg) => showToast(msg, "warn")}
        />

        <div className="sql-shell duckdb-shell" ref={shellRef}>
          <aside className="sql-sidebar" aria-label="Database explorer">
            <div className="sql-db-selector-wrap">
              <DatabaseSelector
                value={activeDbId}
                displayFilename={displayFilename}
                samples={DUCKDB_SAMPLE_DATABASES}
                actions={DUCKDB_DB_ACTIONS}
                chevron={<ChevronDown size={12} />}
                onChange={(value) => {
                  if (value === "__new_db__") {
                    void performDbSwitch(DUCKDB_BLANK_DATABASE.id);
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
            </div>
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
                    className="sql-db-selector sql-schema-selector"
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
            <div className="sql-tree">
              {(schemaLoading || dbLoading) && (
                <div className="sql-tree-loading-overlay">
                  <span className="sql-tree-loading-label">
                    {dbLoading ? "Loading database…" : "Loading schema…"}
                  </span>
                  <DataslopeRunOverlay running />
                </div>
              )}
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
                />
              )}
              {sidebarView === "schema" && (
                <>
                  <SchemaSection
                    label="TABLES"
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
                    label="VIEWS"
                    count={views.length}
                    expanded={viewsExpanded}
                    onToggle={() => setViewsExpanded((v) => !v)}
                    emptyMessage="No views."
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
                    label="INDEXES"
                    count={indexes.length}
                    expanded={indexesExpanded}
                    onToggle={() => setIndexesExpanded((v) => !v)}
                    emptyMessage="No indexes."
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
                  {/*
                DuckDB has no triggers — the entire TRIGGERS sidebar
                section from the Postgres playground is intentionally
                omitted to avoid confusing users with a perpetually
                empty group. `engine.listTriggers()` always resolves
                to `[]` for the same reason.
              */}
                </>
              )}
            </div>
            <div className="sql-sidebar-footer">
              <button
                type="button"
                className="sql-sidebar-btn"
                onClick={openErDiagramTab}
                title="View ER Diagram"
                aria-label="View ER Diagram"
              >
                <Network size={13} aria-hidden="true" />
                <span>ER Diagram</span>
              </button>
              <button
                type="button"
                className={`sql-sidebar-btn${sidebarView === "files" ? " sql-sidebar-btn-active" : ""}`}
                onClick={() =>
                  setSidebarView((v) => (v === "files" ? "schema" : "files"))
                }
                title={
                  sidebarView === "files"
                    ? "Show database schema"
                    : "Show virtual filesystem"
                }
                aria-label="Toggle Files panel"
              >
                <FolderTree size={13} aria-hidden="true" />
                <span>Files</span>
              </button>
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
            className={`sql-panes duckdb-panes${activeTab?.kind === "view-data" ? " sql-panes--view-data" : ""}${activeTab?.kind === "er-diagram" ? " sql-panes--er-diagram" : ""}${activeTab?.kind === "query-history" ? " sql-panes--query-history" : ""}`}
          >
            <div className="sql-tabbar">
              <DndContext
                sensors={tabDragSensors}
                collisionDetection={closestCenter}
                onDragStart={handleTabDragStart}
                onDragEnd={handleTabDragEnd}
                onDragCancel={handleTabDragCancel}
              >
                <SortableContext
                  items={tabIds}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="sql-tabs" role="tablist">
                    {tabs.map((tab) => (
                      <SqlTab
                        key={tab.id}
                        tab={tab}
                        active={tab.id === activeTabId}
                        onActivate={() => {
                          const prevId = activeTabIdRef.current;
                          if (prevId !== tab.id) {
                            tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, prevId, tab.id);
                          }
                          setActiveTabId(tab.id);
                        }}
                        onClose={() => closeTab(tab.id)}
                        onRename={(title) =>
                          persistTabs(
                            tabsRef.current.map((candidate) =>
                              candidate.id === tab.id
                                ? { ...candidate, title }
                                : candidate,
                            ),
                          )
                        }
                        onDuplicate={() => {
                          const dup = {
                            ...tab,
                            id: newTabId(),
                            title: `${tab.title} copy`,
                          };
                          tabHistoryRef.current = pushTabHistory(tabHistoryRef.current, activeTabIdRef.current, dup.id);
                          persistTabs([...tabsRef.current, dup]);
                          setActiveTabId(dup.id);
                        }}
                        onCloseOthers={() => {
                          tabHistoryRef.current = [];
                          persistTabs([tab]);
                        }}
                        onCloseAll={() => {
                          const fresh = {
                            id: newTabId(),
                            title: "Query 1",
                            code: "",
                            pristineCode: "",
                          };
                          tabHistoryRef.current = [];
                          persistTabs([fresh]);
                          setActiveTabId(fresh.id);
                          window.setTimeout(
                            () => editorRef.current?.focus(),
                            0,
                          );
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={null}>
                  {draggingTab ? (
                    <SqlTabDragOverlay tab={draggingTab} active={draggingTab.id === activeTabId} />
                  ) : null}
                </DragOverlay>
              </DndContext>
              <button
                type="button"
                className="sql-tab-add"
                // Prevent the button from stealing focus on mouse-down so
                // focus stays wherever it was.  The editor focus is
                // handled synchronously inside addTab.
                onMouseDown={(e) => e.preventDefault()}
                onClick={addTab}
                aria-label="New query tab"
              >
                <Plus size={12} aria-hidden="true" />
              </button>
            </div>
            <div
              className="sql-editor-pane"
              ref={editorPaneRef}
              style={
                activeTab?.kind === "view-data" ||
                  activeTab?.kind === "er-diagram" ||
                  activeTab?.kind === "query-history"
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
              <div className="sql-toolbar">
                <div className="sql-toolbar-shortcuts">
                  <span
                    className="kbd-group"
                    title={
                      isMac
                        ? "Cmd + Enter — run selection or all"
                        : "Ctrl + Enter — run selection or all"
                    }
                  >
                    <kbd className="kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
                    <span className="kbd-plus" aria-hidden="true">
                      +
                    </span>
                    <kbd className="kbd">Enter</kbd>
                  </span>
                </div>
                <div className="sql-toolbar-actions">
                  {hasEditorSelection ? (
                    <div
                      className={`run-btn-split${statusState === "running" ? " running" : ""}`}
                    >
                      <button
                        type="button"
                        className="run-btn-split-main"
                        disabled={!loaded || statusState === "running"}
                        onClick={runCurrentSelection}
                      >
                        {statusState === "running" ? (
                          <svg viewBox="0 0 12 12" className="run-btn-spinner">
                            <circle
                              cx="6"
                              cy="6"
                              r="4.5"
                              fill="none"
                              stroke="white"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeDasharray="14 8"
                            />
                          </svg>
                        ) : (
                          <Play size={10} aria-hidden="true" />
                        )}
                        {statusState === "running"
                          ? "Running…"
                          : "Run Selection"}
                      </button>
                      <span
                        className="run-btn-split-divider"
                        aria-hidden="true"
                      />
                      <Menu.Root>
                        <Menu.Trigger
                          className="run-btn-split-chevron"
                          disabled={!loaded || statusState === "running"}
                          aria-label="Run options"
                        >
                          <ChevronDown size={11} aria-hidden="true" />
                        </Menu.Trigger>
                        <Menu.Portal>
                          <Menu.Positioner sideOffset={6} align="end">
                            <Menu.Popup className="bui-popup run-split-dropdown">
                              <Menu.Item
                                className="run-split-item"
                                onClick={runCurrentSelection}
                                disabled={!loaded || statusState === "running"}
                              >
                                <span className="run-split-item-label">
                                  Run Selection
                                </span>
                                <span className="run-split-item-kbd">
                                  {isMac ? "⌘Enter" : "Ctrl+Enter"}
                                </span>
                              </Menu.Item>
                              <Menu.Item
                                className="run-split-item"
                                onClick={runActiveTab}
                                disabled={!loaded || statusState === "running"}
                              >
                                <span className="run-split-item-label">
                                  Run All
                                </span>
                                <span className="run-split-item-kbd">
                                  {isMac ? "⌘⇧Enter" : "Ctrl+Shift+Enter"}
                                </span>
                              </Menu.Item>
                            </Menu.Popup>
                          </Menu.Positioner>
                        </Menu.Portal>
                      </Menu.Root>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`run-btn${statusState === "running" ? " running" : ""}`}
                      disabled={!loaded || statusState === "running"}
                      onClick={runActiveTab}
                    >
                      {statusState === "running" ? (
                        <svg viewBox="0 0 12 12" className="run-btn-spinner">
                          <circle
                            cx="6"
                            cy="6"
                            r="4.5"
                            fill="none"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray="14 8"
                          />
                        </svg>
                      ) : (
                        <Play size={10} aria-hidden="true" />
                      )}
                      {statusState === "running" ? "Running…" : "Run"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {activeTab?.kind === "er-diagram" ? (
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
            ) : activeTab?.kind === "query-history" ? (
              <div className="sql-er-pane">
                <QueryHistoryPane
                  history={queryHistory}
                  theme={editorTheme}
                  isPostgres={true}
                  onClear={clearHistory}
                  onOpenQueryTab={openTabAndRun}
                />
              </div>
            ) : null}
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
                  activeTab?.kind === "query-history"
                  ? { display: "none" }
                  : undefined
              }
            >
              <ResultView
                result={result}
                loading={statusState === "loading"}
                keyHints={resultKeyHints}
                sourceTable={result?.sourceTable}
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
      </div>
    </div>
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
        dropHint: "or click to browse — .csv",
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
        dropHint: "or click to browse — .json (array of objects)",
        Icon: FileJson,
      };
    }
    return {
      title: "Import Parquet File",
      description:
        "Read a Parquet file and add its rows into a new or existing table.",
      accept: ".parquet,application/octet-stream",
      dropLabel: "Drop a Parquet file here",
      dropHint: "or click to browse — .parquet",
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
              This is a playground — your data is only held in browser memory
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
