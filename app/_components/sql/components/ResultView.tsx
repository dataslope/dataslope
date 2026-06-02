"use client";

import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react";
import React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AlertDialog } from "@base-ui-components/react/alert-dialog";
import { Dialog } from "@base-ui-components/react/dialog";
import { Popover } from "@base-ui-components/react/popover";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Menu } from "@base-ui-components/react/menu";
import { Select } from "@base-ui-components/react/select";
import { Checkbox } from "@base-ui-components/react/checkbox";
import { Toast } from "@base-ui-components/react/toast";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import {
  ArrowDownToLine,
  Binary,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  Clock,
  Hash,
  Lock,
  Minus,
  Search,
  SearchX,
  ToggleLeft,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { MdOutlineKey } from "react-icons/md";
import { IoLink } from "react-icons/io5";
import type { QueryExecResult } from "../../runtime/sqlite-wasm";
import type {
  QueryRunResult,
  ResultTableRow,
  ColumnKeyHints,
  ResultSetExportScope,
  ResultSetExportSnapshot,
  SelectedRowsByResult,
  PendingEditsByResult,
} from "../types";
import type { ColumnConstraintInfo } from "../../runtime/sqlite";
import {
  compareCellValues,
  formatCellValue,
  formatCellAsSql,
  parseCellEditValue,
  pendingEditsAfterDeletedRows,
  inferColumnType,
} from "../utils/cellUtils";
import {
  classifyCellEditor,
  toDateEditorValue,
  fromDateEditorValue,
  resolveTemporalEditorKind,
  formatBytesHex,
  bytesToBase64,
  reversibleCellValue,
  type TemporalEditorKind,
} from "../utils/cellEditing";
import {
  filterResultRowIndices,
  canClientFilterResult,
  buildResultFilterWhere,
  dialectFromEngineLabel,
} from "../utils/resultFilter";
import {
  computeColumnStats,
  formatStatNumber,
  formatPercent,
  type ColumnStats,
} from "../utils/columnStats";

// ────────────────────────────────────────────────────────────────────────
// Local helpers
// ────────────────────────────────────────────────────────────────────────

/** Produce a friendly hint for a raw engine error string. Despite the
 *  per-engine sections, this is shared across SQLite, DuckDB, and
 *  PostgreSQL. */
function getEngineErrorHint(error: string): string | null {
  // SQLite patterns
  const nearMatch = error.match(/^near "(.+)": syntax error$/i);
  if (nearMatch) {
    return `Unexpected token "${nearMatch[1]}". Check for typos in SQL keywords or extra characters.`;
  }
  const noTableMatch = error.match(/^no such table: (.+)$/i);
  if (noTableMatch) {
    return `Table "${noTableMatch[1]}" does not exist. Check the Tables pane for available tables.`;
  }
  const noColumnMatch = error.match(/^no such column: (.+)$/i);
  if (noColumnMatch) {
    return `Column "${noColumnMatch[1]}" was not found. Verify column names with View Structure.`;
  }
  const uniqueMatch = error.match(/^UNIQUE constraint failed: (.+)$/i);
  if (uniqueMatch) {
    return `Duplicate value violates the UNIQUE constraint on "${uniqueMatch[1]}".`;
  }
  const notNullMatch = error.match(/^NOT NULL constraint failed: (.+)$/i);
  if (notNullMatch) {
    return `"${notNullMatch[1]}" requires a non-NULL value.`;
  }
  if (/^FOREIGN KEY constraint failed$/i.test(error)) {
    return "The value does not exist in the referenced table.";
  }
  const ambiguousMatch = error.match(/^ambiguous column name: (.+)$/i);
  if (ambiguousMatch) {
    return `Column "${ambiguousMatch[1]}" is ambiguous. Use table-qualified names, e.g. table.column.`;
  }
  // DuckDB patterns
  const duckdbNoTableMatch = error.match(/Table with name "(.+)" does not exist/i);
  if (duckdbNoTableMatch) {
    return `Table "${duckdbNoTableMatch[1]}" does not exist. Check the Tables pane for available tables.`;
  }
  const duckdbNoColMatch = error.match(/Referenced column "(.+)" not found in FROM clause/i);
  if (duckdbNoColMatch) {
    return `Column "${duckdbNoColMatch[1]}" was not found. Verify column names with View Structure.`;
  }
  const duckdbBinderColMatch = error.match(/Binder Error:.*column "(.+)" does not exist/i);
  if (duckdbBinderColMatch) {
    return `Column "${duckdbBinderColMatch[1]}" was not found. Verify column names with View Structure.`;
  }
  // PostgreSQL patterns
  const pgNoTableMatch = error.match(/relation "(.+)" does not exist/i);
  if (pgNoTableMatch) {
    return `Table/view "${pgNoTableMatch[1]}" does not exist. Check the Tables pane for available tables.`;
  }
  const pgNoColMatch = error.match(/column "(.+)" does not exist/i);
  if (pgNoColMatch) {
    return `Column "${pgNoColMatch[1]}" was not found. Verify column names with View Structure.`;
  }
  const pgAmbiguousMatch = error.match(/column reference "(.+)" is ambiguous/i);
  if (pgAmbiguousMatch) {
    return `Column "${pgAmbiguousMatch[1]}" is ambiguous. Use table-qualified names, e.g. table.column.`;
  }
  return null;
}

/** Small self-contained button that copies an error string to the
 *  clipboard and briefly shows a "Copied" confirmation. */
function CopyErrorButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="sql-result-error-copy"
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => undefined);
      }}
    >
      {copied ? "Copied" : "Copy error"}
    </button>
  );
}

/** True for a boolean column type across engines (Postgres `boolean`,
 *  DuckDB Arrow `Bool`, SQLite declared `BOOLEAN`). */
function isBooleanType(type: string | undefined): boolean {
  return /^bool(ean)?$/i.test((type ?? "").trim());
}

/** Interpret a cell value (which may be 1/0, true/false, or "t"/"f"/"true"
 *  /"false" depending on engine) as a boolean for the toggle checkbox. */
function boolTruthy(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "t" || s === "true";
  }
  return false;
}

/** Heuristic: does this string look like a JSON object/array? Used to offer
 *  pretty-print + validation in the edit-in-modal dialog. */
function looksLikeJson(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return t[0] === "{" || t[0] === "[";
}

function quoteIdentSql(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function parseColumnId(id: string): { ci: number; name: string } | null {
  const match = id.match(/^col-(\d+)-(.+)$/);
  if (!match) return null;
  return { ci: Number(match[1]), name: match[2] };
}

function cloneSelections(src: SelectedRowsByResult): SelectedRowsByResult {
  return Object.fromEntries(
    Object.entries(src).map(([idx, rows]) => [idx, new Set(rows)]),
  ) as SelectedRowsByResult;
}

function clonePendingEdits(src: PendingEditsByResult): PendingEditsByResult {
  return Object.fromEntries(
    Object.entries(src).map(([idx, edits]) => [idx, new Map(edits)]),
  ) as PendingEditsByResult;
}

/** Returns a small icon component that visually represents a SQL/inferred
 *  column type. Matches by prefix so "VARCHAR", "NVARCHAR", "CHAR" all
 *  resolve to the text icon, and "DATETIME"/"TIMESTAMP" to the clock icon. */
function DataTypeIcon({ type }: { type: string }) {
  const t = type.toUpperCase();
  if (t === "NULL") return <Minus size={10} aria-hidden="true" />;
  if (
    t.includes("INT") ||
    t.includes("REAL") ||
    t.includes("FLOAT") ||
    t.includes("DOUBLE") ||
    t.includes("NUMERIC") ||
    t.includes("DECIMAL")
  )
    return <Hash size={10} aria-hidden="true" />;
  if (
    t.includes("CHAR") ||
    t.includes("TEXT") ||
    t.includes("CLOB") ||
    t.includes("STRING")
  )
    return <Type size={10} aria-hidden="true" />;
  if (t.includes("BOOL")) return <ToggleLeft size={10} aria-hidden="true" />;
  if (t.includes("BLOB") || t.includes("BINARY") || t.includes("BYTE"))
    return <Binary size={10} aria-hidden="true" />;
  if (t.includes("DATE")) return <Calendar size={10} aria-hidden="true" />;
  if (t.includes("TIME")) return <Clock size={10} aria-hidden="true" />;
  return null;
}

const PAGE_SIZE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 250, label: "250" },
  { value: 500, label: "500" },
  { value: 0, label: "All" },
];

const VIRTUAL_ROW_HEIGHT_ESTIMATE = 30;
const LOAD_MORE_THRESHOLD_ROWS = 25;
// Stage 1 (DuckDB perf): when a paged result still contains more than
// this many DOM rows (e.g. the user disabled pagination, or chose a
// very large page size), switch the rendering path to the same
// virtualizer infinite scroll uses so we don't push thousands of
// <tr> elements into the DOM.
const VIRTUALIZE_ROW_THRESHOLD = 200;

// ─── Result set export button + tooltip ──────────────────────────────────
// Encapsulated so it can track menu-open state with a hook and suppress
// the hover popover while the export dropdown is visible.

type ResultSetExportFormat = "csv" | "json" | "sql" | "parquet" | "xlsx";

interface ResultSetExportButtonProps {
  hasMultiplePages: boolean;
  currentPageRows: number;
  totalRows: number;
  resultSetExportScope: ResultSetExportScope;
  onExportResultSet: (
    format: ResultSetExportFormat,
    scope: ResultSetExportScope,
  ) => void;
  onSetResultSetExportScope: (scope: ResultSetExportScope) => void;
}

function ResultSetExportButton({
  hasMultiplePages,
  currentPageRows,
  totalRows,
  resultSetExportScope,
  onExportResultSet,
  onSetResultSetExportScope,
}: ResultSetExportButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <Menu.Root onOpenChange={setMenuOpen}>
      <Popover.Root
        open={menuOpen ? false : popoverOpen}
        onOpenChange={setPopoverOpen}
      >
        <Popover.Trigger
          openOnHover
          delay={150}
          closeDelay={100}
          render={(triggerProps) => (
            <Menu.Trigger
              {...triggerProps}
              className="sql-result-export-btn"
              aria-label="Export result set"
            >
              <ArrowDownToLine size={11} aria-hidden="true" />
              <span className="sql-result-export-btn-label">Download</span>
            </Menu.Trigger>
          )}
        />
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="center" side="top">
            <Popover.Popup className="bui-popup sql-export-btn-popover">
              Export result set
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" side="top">
          <Menu.Popup className="bui-popup examples-dropdown export-dropdown">
            {hasMultiplePages && (
              <div
                className="sql-result-export-scope-options"
                onClick={(e) => e.stopPropagation()}
              >
                <ToggleGroup
                  value={[resultSetExportScope]}
                  onValueChange={(newVals) => {
                    const next = newVals.find(
                      (v) => v !== resultSetExportScope,
                    );
                    if (next)
                      onSetResultSetExportScope(next as ResultSetExportScope);
                  }}
                  className="sql-scope-toggle-group"
                >
                  <Toggle value="page" className="sql-scope-toggle-item">
                    Page ({currentPageRows})
                  </Toggle>
                  <Toggle value="all" className="sql-scope-toggle-item">
                    All ({totalRows.toLocaleString()})
                  </Toggle>
                </ToggleGroup>
              </div>
            )}
            <Menu.Item
              className="example-item export-item"
              onClick={() => onExportResultSet("csv", resultSetExportScope)}
            >
              <div className="export-item-text">
                <div className="ex-title">
                  CSV <span className="ext-badge">.csv</span>
                </div>
                <div className="ex-desc">Comma-separated values</div>
              </div>
            </Menu.Item>
            <Menu.Item
              className="example-item export-item"
              onClick={() => onExportResultSet("json", resultSetExportScope)}
            >
              <div className="export-item-text">
                <div className="ex-title">
                  JSON <span className="ext-badge">.json</span>
                </div>
                <div className="ex-desc">Array of row objects</div>
              </div>
            </Menu.Item>
            <Menu.Item
              className="example-item export-item"
              onClick={() => onExportResultSet("sql", resultSetExportScope)}
            >
              <div className="export-item-text">
                <div className="ex-title">
                  SQL <span className="ext-badge">.sql</span>
                </div>
                <div className="ex-desc">INSERT statements</div>
              </div>
            </Menu.Item>
            <Menu.Item
              className="example-item export-item"
              onClick={() => onExportResultSet("parquet", resultSetExportScope)}
            >
              <div className="export-item-text">
                <div className="ex-title">
                  Parquet <span className="ext-badge">.parquet</span>
                </div>
                <div className="ex-desc">Apache Parquet binary</div>
              </div>
            </Menu.Item>
            <Menu.Item
              className="example-item export-item"
              onClick={() => onExportResultSet("xlsx", resultSetExportScope)}
            >
              <div className="export-item-text">
                <div className="ex-title">
                  Excel <span className="ext-badge">.xlsx</span>
                </div>
                <div className="ex-desc">Excel workbook (single sheet)</div>
              </div>
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────────

export function sqlValueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return false;
}

export function queryResultsIdentical(
  a: QueryRunResult | null,
  b: QueryRunResult | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (a.sets.length !== b.sets.length) return false;
  for (let i = 0; i < a.sets.length; i++) {
    const sa = a.sets[i];
    const sb = b.sets[i];
    if (sa === null && sb === null) continue;
    if (sa === null || sb === null) return false;
    if (sa.columns.length !== sb.columns.length) return false;
    if (!sa.columns.every((col, j) => col === sb.columns[j])) return false;
    if (sa.values.length !== sb.values.length) return false;
    for (let r = 0; r < sa.values.length; r++) {
      const ra = sa.values[r];
      const rb = sb.values[r];
      if (ra.length !== rb.length) return false;
      for (let c = 0; c < ra.length; c++) {
        if (!sqlValueEqual(ra[c], rb[c])) return false;
      }
    }
  }
  return true;
}

export const ResultView = memo(ResultViewImpl);

/** Minimum time the filter overlay stays on screen once shown. Mirrors the run
 *  overlay's `MIN_ANIMATION_MS`: a fast filter would otherwise flash the overlay
 *  for a single frame ("blink"). Combined with the CSS opacity fade-out, the
 *  overlay reads as a smooth, deliberate state rather than a glitch. */
const FILTER_OVERLAY_MIN_MS = 400;

// How long the post-commit "Undo" bar stays offered before auto-dismissing.
const COMMIT_UNDO_TIMEOUT_MS = 15000;

/** Mirror `active`, but once it becomes true keep it true for at least `minMs`
 *  so a brief activation stays visible long enough to read and to let a CSS
 *  fade-out play. Re-activating while waiting cancels the pending hide. */
function useMinVisible(active: boolean, minMs: number): boolean {
  const [visible, setVisible] = useState(active);
  const shownAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (active) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!visible) {
        shownAtRef.current = performance.now();
        // Show on the activation edge; the delayed hide runs from a timer.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVisible(true);
      }
    } else if (visible && !timerRef.current) {
      const remaining = Math.max(
        0,
        minMs - (performance.now() - shownAtRef.current),
      );
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setVisible(false);
      }, remaining);
    }
  }, [active, visible, minMs]);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  return visible;
}

function ResultViewImpl({
  result,
  loading,
  engineLabel = "SQLite",
  keyHints: propKeyHints,
  sourceTable: propSourceTable,
  constraintInfo: propConstraintInfo,
  tableMetaFor,
  onDeleteRows,
  onUpdateRows,
  onDuplicateRow,
  globalPageSize,
  onSetGlobalPageSize,
  onLoadPage,
  onLoadMorePage,
  onExportSnapshotChange,
  onExportResultSet,
  onOpenQueryTab,
}: {
  result: QueryRunResult | null;
  loading: boolean;
  /** Human-readable engine name shown in the loading placeholder
   *  (e.g. "PostgreSQL", "DuckDB", "SQLite"). Defaults to "SQLite". */
  engineLabel?: string;
  keyHints?: ColumnKeyHints;
  sourceTable?: string;
  constraintInfo?: ColumnConstraintInfo[];
  /** Resolves a table's editing metadata by name. Used to pick up the PK / FK /
   *  constraint hints for whichever result set is active, so every tab of a
   *  multi-statement run is editable against its own table. */
  tableMetaFor?: (table: string) => {
    keyHints?: ColumnKeyHints;
    constraintInfo?: ColumnConstraintInfo[];
  } | undefined;
  onDeleteRows?: (
    tableName: string,
    pkColumns: string[],
    pkRows: ReadonlyArray<ReadonlyArray<unknown>>,
  ) => void;
  onUpdateRows?: (
    tableName: string,
    updates: ReadonlyArray<{
      rowIndex: number;
      column: string;
      value: unknown;
      pk?: ReadonlyArray<{ column: string; value: unknown }>;
    }>,
    refetchSql?: string,
    refetchBaseSql?: string,
  ) => void;
  onDuplicateRow?: (
    tableName: string,
    columnNames: string[],
    values: unknown[],
  ) => void;
  globalPageSize: number;
  onSetGlobalPageSize: (n: number) => void;
  onLoadPage: (sql: string, page: number, explicitPageSize?: number) => void;
  onLoadMorePage?: (sql: string, page: number) => void;
  onExportSnapshotChange?: (snapshot: ResultSetExportSnapshot | null) => void;
  onExportResultSet?: (
    format: "csv" | "json" | "sql" | "parquet" | "xlsx",
    scope: ResultSetExportScope,
  ) => void;
  onOpenQueryTab?: (title: string, sql: string) => void;
}) {
  const [resultSetExportScope, setResultSetExportScope] =
    useState<ResultSetExportScope>("all");
  const [pageStates, setPageStates] = useState<
    Record<number, { page: number }>
  >({});
  // In-grid filter ("find in results") text, keyed by result-set index. A
  // view-only narrowing of the materialized rows — see `utils/resultFilter`.
  const [filterByIndex, setFilterByIndex] = useState<Record<number, string>>(
    {},
  );
  const [sortingByIndex, setSortingByIndex] = useState<
    Record<number, SortingState>
  >({});
  const [selectedByIndex, setSelectedByIndex] = useState<SelectedRowsByResult>(
    {},
  );
  const [pendingEditsByIndex, setPendingEditsByIndex] =
    useState<PendingEditsByResult>({});
  const [activeEditCellByIndex, setActiveEditCellByIndex] = useState<
    Record<number, string | null>
  >({});
  // One-step undo of the most recent committed cell edit(s) (UX-10). Set
  // synchronously when `commitEdits` runs and survives the post-commit refetch
  // (it's component state the result-change effect deliberately leaves alone),
  // so the bar appears once the reloaded grid shows the new values. Auto-
  // dismisses after a short window; clicking it re-applies the *previous*
  // values (PK-addressed, so still correct after the row moved under MVCC).
  const [commitUndo, setCommitUndo] = useState<{
    tableName: string;
    reverseUpdates: ReadonlyArray<{
      rowIndex: number;
      column: string;
      value: unknown;
      pk?: ReadonlyArray<{ column: string; value: unknown }>;
    }>;
    refetchSql?: string;
    refetchBaseSql?: string;
    cellCount: number;
  } | null>(null);
  const commitUndoTimerRef = useRef<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [pendingDeleteSingleRow, setPendingDeleteSingleRow] = useState<{
    setIdx: number;
    absoluteRow: number;
  } | null>(null);
  // Result-set indices currently showing a *server-side* filtered re-query
  // (pushdown, for engine-paged results). Maps idx → the pre-filter total row
  // count (for the "filtered from N" readout). Its presence means further
  // filter edits re-query the engine — even after the filtered result becomes
  // small enough to fit in memory — rather than switching to client-filtering.
  const [serverFilterByIndex, setServerFilterByIndex] = useState<
    Record<number, number>
  >({});
  const preserveOnNextResultRef = useRef<{
    selectedByIndex: SelectedRowsByResult;
    pendingEditsByIndex: PendingEditsByResult;
    sortingByIndex: Record<number, SortingState>;
    filterByIndex?: Record<number, string>;
    serverFilterByIndex?: Record<number, number>;
    /** Active result-set tab, kept across an edit/sort/filter reload so a
     *  commit on "Set 2" doesn't bounce the view back to "Set 1". */
    activeSetIdx?: number;
  } | null>(null);
  // Keep a ref to the latest sortingByIndex so the result-change effect can
  // read it without adding sortingByIndex as a dependency (which would loop).
  const sortingByIndexRef = useRef<Record<number, SortingState>>(sortingByIndex);
  // eslint-disable-next-line react-hooks/refs
  sortingByIndexRef.current = sortingByIndex;
  // Cache sorting state per result-object so it survives tab switches.
  const sortingCacheRef = useRef<WeakMap<QueryRunResult, Record<number, SortingState>>>(
    new WeakMap(),
  );

  const [activeSetIdx, setActiveSetIdx] = useState<number>(0);
  // True while a filter keystroke is debouncing (or its re-query is in flight):
  // drives a loading overlay over the result table so the wait is visible.
  const [filterPending, setFilterPending] = useState(false);
  // Hold the overlay on screen for a minimum time (then fade) so a fast filter
  // doesn't blink — see `useMinVisible` / FILTER_OVERLAY_MIN_MS.
  const filterOverlayActive = useMinVisible(filterPending, FILTER_OVERLAY_MIN_MS);
  const flashWrapperRef = useRef<HTMLDivElement>(null);
  const noResultsRef = useRef<HTMLDivElement>(null);
  const resultSetsScrollRef = useRef<HTMLDivElement>(null);
  const prevResultRef = useRef<QueryRunResult | null>(null);
  // After a server-side filter reload (which steals focus), re-focus the
  // filter input so typing continues uninterrupted.
  const focusFilterAfterReloadRef = useRef(false);

  useEffect(() => {
    // Save sorting for the outgoing result so it can be restored on tab switch back.
    if (prevResultRef.current) {
      sortingCacheRef.current.set(prevResultRef.current, {
        ...sortingByIndexRef.current,
      });
    }
    const preserved = preserveOnNextResultRef.current;
    preserveOnNextResultRef.current = null;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPageStates({});
    setFilterByIndex(preserved?.filterByIndex ?? {});
    setServerFilterByIndex(preserved?.serverFilterByIndex ?? {});
    setSelectedByIndex(preserved?.selectedByIndex ?? {});
    setPendingDelete(null);
    setPendingDeleteSingleRow(null);
    setPendingEditsByIndex(preserved?.pendingEditsByIndex ?? {});
    // Prefer explicit preserved state (after a reload), then cached state
    // (returning to a tab), then fall back to a clean slate.
    const cachedSorting = result ? sortingCacheRef.current.get(result) : undefined;
    setSortingByIndex(preserved?.sortingByIndex ?? cachedSorting ?? {});
    setActiveEditCellByIndex({});
    setActiveSetIdx(preserved?.activeSetIdx ?? 0);
    // A fresh result (or a filter/sort/edit reload) settles any pending filter
    // overlay — the rows shown now already reflect the applied filter.
    setFilterPending(false);
    // Scroll the result table back to the top whenever a new result arrives
    // (fresh query run or lazy page navigation).
    resultSetsScrollRef.current?.scrollTo(0, 0);
    if (focusFilterAfterReloadRef.current) {
      focusFilterAfterReloadRef.current = false;
      // A server-side filter reload re-mounts the grid and steals focus —
      // restore it to the filter input (and its caret) so typing continues.
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>(
          ".sql-result-filter-input",
        );
        if (el) {
          el.focus();
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      });
    }
    const el = flashWrapperRef.current;
    const noEl = noResultsRef.current;
    if (el) {
      const identical = queryResultsIdentical(result, prevResultRef.current);
      prevResultRef.current = result;
      el.classList.remove("sql-result-flash-anim");
      if (identical && result !== null) {
        void el.offsetWidth;
        el.classList.add("sql-result-flash-anim");
      }
    } else if (noEl) {
      prevResultRef.current = result;
      noEl.classList.remove("sql-result-flash-anim");
      void noEl.offsetWidth;
      noEl.classList.add("sql-result-flash-anim");
    } else {
      prevResultRef.current = result;
    }
  }, [result]);

  const preserveStateForReload = useCallback(
    (overrides?: {
      selectedByIndex?: SelectedRowsByResult;
      pendingEditsByIndex?: PendingEditsByResult;
      sortingByIndex?: Record<number, SortingState>;
      filterByIndex?: Record<number, string>;
      serverFilterByIndex?: Record<number, number>;
    }) => {
      preserveOnNextResultRef.current = {
        selectedByIndex:
          overrides?.selectedByIndex ?? cloneSelections(selectedByIndex),
        pendingEditsByIndex:
          overrides?.pendingEditsByIndex ?? clonePendingEdits(pendingEditsByIndex),
        sortingByIndex: overrides?.sortingByIndex ?? { ...sortingByIndex },
        // Filter + server-filter state are preserved by default so a sort /
        // edit reload of a filtered result keeps the filter; an explicit
        // override (or a fresh query, which doesn't preserve at all) clears it.
        filterByIndex: overrides?.filterByIndex ?? { ...filterByIndex },
        serverFilterByIndex:
          overrides?.serverFilterByIndex ?? { ...serverFilterByIndex },
        activeSetIdx,
      };
    },
    [
      selectedByIndex,
      pendingEditsByIndex,
      sortingByIndex,
      filterByIndex,
      serverFilterByIndex,
      activeSetIdx,
    ],
  );

  // Compose the lazy SQL for a server-side filter + sort pushdown: wrap the
  // original base query as a subquery with a native `WHERE` (LIKE/ILIKE), then
  // apply ORDER BY for the active sort. Either part may be absent. This is the
  // DBeaver model — the filtered query re-pages through the engine, so infinite
  // scroll is preserved instead of loading the whole result into memory.
  const composeLazyQuery = useCallback(
    (
      baseSql: string,
      filterText: string,
      columns: readonly string[],
      sorting: SortingState,
    ) => {
      let sql = baseSql.replace(/\s*;+\s*$/, "");
      const where = filterText.trim()
        ? buildResultFilterWhere(
            columns,
            filterText,
            dialectFromEngineLabel(engineLabel),
          )
        : null;
      if (where) sql = `SELECT * FROM (${sql}) AS _filter WHERE ${where}`;
      if (sorting.length > 0) {
        const parsed = parseColumnId(sorting[0].id);
        if (parsed) {
          sql = `SELECT * FROM (${sql}) AS __sort ORDER BY ${quoteIdentSql(parsed.name)} ${sorting[0].desc ? "DESC" : "ASC"}`;
        }
      }
      return sql;
    },
    [engineLabel],
  );

  // Push a server-side filter for an engine-paged result: re-query the original
  // base wrapped with a `WHERE` so only matching rows stream in (infinite
  // scroll preserved). An empty term reloads the unfiltered base. Selection /
  // pending edits are cleared because the row set (and absolute indices) change.
  const triggerServerFilter = useCallback(
    (
      idx: number,
      value: string,
      columns: readonly string[],
      unfilteredTotal: number,
    ) => {
      if (!result) return;
      const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
      if (!baseSql) return;
      const sorting = sortingByIndex[idx] ?? [];
      const sql = composeLazyQuery(baseSql, value, columns, sorting);
      const nextFilter = { ...filterByIndex };
      if (value) nextFilter[idx] = value;
      else delete nextFilter[idx];
      const nextServer = { ...serverFilterByIndex };
      if (value.trim()) nextServer[idx] = serverFilterByIndex[idx] ?? unfilteredTotal;
      else delete nextServer[idx];
      focusFilterAfterReloadRef.current = true;
      preserveStateForReload({
        filterByIndex: nextFilter,
        serverFilterByIndex: nextServer,
        selectedByIndex: {},
        pendingEditsByIndex: {},
      });
      onLoadPage(sql, 0);
    },
    [
      result,
      sortingByIndex,
      filterByIndex,
      serverFilterByIndex,
      composeLazyQuery,
      preserveStateForReload,
      onLoadPage,
    ],
  );

  // Apply a server-side (pushdown) filter. The keystroke debounce now lives in
  // the filter input (`FilterInput`), so this fires on an already-settled value:
  // mark the set as server-filtered up front (so the grid stops client-filtering
  // the rows it's about to replace) and re-query immediately.
  const applyServerFilter = useCallback(
    (
      idx: number,
      value: string,
      columns: readonly string[],
      unfilteredTotal: number,
    ) => {
      setServerFilterByIndex((prev) => {
        const next = { ...prev };
        if (value.trim()) next[idx] = prev[idx] ?? unfilteredTotal;
        else delete next[idx];
        return next;
      });
      triggerServerFilter(idx, value, columns, unfilteredTotal);
    },
    [triggerServerFilter],
  );

  const getState = useCallback(
    (idx: number) => pageStates[idx] ?? { page: 0 },
    [pageStates],
  );

  const setPage = useCallback((idx: number, page: number) => {
    setPageStates((prev) => {
      const cur = prev[idx] ?? { page: 0 };
      return { ...prev, [idx]: { ...cur, page } };
    });
    resultSetsScrollRef.current?.scrollTo(0, 0);
  }, []);

  // Update the in-grid filter for a result set and jump back to its first page
  // so the user always sees the start of the filtered view.
  const setFilter = useCallback((idx: number, value: string) => {
    setFilterByIndex((prev) => {
      if ((prev[idx] ?? "") === value) return prev;
      const next = { ...prev };
      if (value) next[idx] = value;
      else delete next[idx];
      return next;
    });
    setPageStates((prev) => ({ ...prev, [idx]: { page: 0 } }));
  }, []);

  // Editable identity is per active result set, not per query: a multi-statement
  // run can show several `SELECT * FROM <table>` tabs, each editable against its
  // own table. `result.sourceTables` carries the table per set (positionally
  // aligned with `sets`); fall back to the whole-query `sourceTable` for a
  // single set. The PK / FK / constraint hints below all follow that table, so
  // every reference to `sourceTable` / `keyHints` / `constraintInfo` downstream
  // resolves against whichever set the user is looking at.
  const activeSetClamped = result
    ? Math.max(0, Math.min(activeSetIdx, result.sets.length - 1))
    : 0;
  const sourceTable = useMemo<string | undefined>(() => {
    if (!result) return undefined;
    const perSet = result.sourceTables?.[activeSetClamped];
    if (perSet != null) return perSet;
    // Older results (and the single-set case) only carry the query-wide table.
    return result.sets.length <= 1 ? propSourceTable : undefined;
  }, [result, activeSetClamped, propSourceTable]);
  const activeMeta = useMemo(
    () => (sourceTable && tableMetaFor ? tableMetaFor(sourceTable) : undefined),
    [sourceTable, tableMetaFor],
  );
  const singleSet = !result || result.sets.length <= 1;
  const keyHints = activeMeta?.keyHints ?? (singleSet ? propKeyHints : undefined);
  const constraintInfo =
    activeMeta?.constraintInfo ?? (singleSet ? propConstraintInfo : undefined);

  const pkColumnsForSet = useCallback(
    (set: QueryExecResult): string[] | null => {
      if (!sourceTable || !onDeleteRows) return null;
      const pk = keyHints?.pk;
      if (!pk || pk.size === 0) return null;
      const ordered: string[] = [];
      for (const col of set.columns) {
        if (pk.has(col)) ordered.push(col);
      }
      if (ordered.length !== pk.size) return null;
      return ordered;
    },
    [sourceTable, onDeleteRows, keyHints],
  );

  const isEditable = !!(sourceTable && onUpdateRows);

  const toggleRowSelected = useCallback(
    (setIdx: number, absoluteRow: number) => {
      setSelectedByIndex((prev) => {
        const cur = new Set(prev[setIdx] ?? []);
        if (cur.has(absoluteRow)) cur.delete(absoluteRow);
        else cur.add(absoluteRow);
        return { ...prev, [setIdx]: cur };
      });
    },
    [],
  );

  const setVisibleSelection = useCallback(
    (setIdx: number, visibleAbsoluteIndices: number[], select: boolean) => {
      setSelectedByIndex((prev) => {
        const cur = new Set(prev[setIdx] ?? []);
        if (select) {
          for (const i of visibleAbsoluteIndices) cur.add(i);
        } else {
          for (const i of visibleAbsoluteIndices) cur.delete(i);
        }
        return { ...prev, [setIdx]: cur };
      });
    },
    [],
  );

  const setPendingEdit = useCallback(
    (setIdx: number, cellKey: string, value: unknown) => {
      setPendingEditsByIndex((prev) => {
        const cur = new Map(prev[setIdx] ?? []);
        cur.set(cellKey, value);
        return { ...prev, [setIdx]: cur };
      });
    },
    [],
  );

  const clearPendingEdit = useCallback((setIdx: number, cellKey: string) => {
    setPendingEditsByIndex((prev) => {
      const cur = new Map(prev[setIdx] ?? []);
      cur.delete(cellKey);
      if (cur.size === 0) {
        const next = { ...prev };
        delete next[setIdx];
        return next;
      }
      return { ...prev, [setIdx]: cur };
    });
  }, []);

  const setActiveEditCell = useCallback(
    (setIdx: number, cellKey: string | null) => {
      setActiveEditCellByIndex((prev) => ({ ...prev, [setIdx]: cellKey }));
    },
    [],
  );

  /** Discard every pending edit for one result set (the per-result Cancel). */
  const discardEdits = useCallback((setIdx: number) => {
    setPendingEditsByIndex((prev) => {
      if (!prev[setIdx]) return prev;
      const next = { ...prev };
      delete next[setIdx];
      return next;
    });
    setActiveEditCellByIndex((prev) => ({ ...prev, [setIdx]: null }));
  }, []);

  /** Discard pending edits across all result sets (the Escape shortcut). */
  const discardAllEdits = useCallback(() => {
    setPendingEditsByIndex((prev) =>
      Object.keys(prev).length === 0 ? prev : {},
    );
    setActiveEditCellByIndex({});
  }, []);

  // Escape cancels pending cell edits. While a cell input is focused its own
  // onKeyDown reverts just that cell; when nothing is being typed, Escape here
  // discards *all* pending edits (paired with the Cancel button in the footer).
  useEffect(() => {
    if (Object.keys(pendingEditsByIndex).length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return; // don't hijack Escape from a focused field
      discardAllEdits();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingEditsByIndex, discardAllEdits]);

  const commitEdits = useCallback(
    (setIdx: number, set: QueryExecResult) => {
      if (!sourceTable || !onUpdateRows) return;
      const edits = pendingEditsByIndex[setIdx];
      if (!edits || edits.size === 0) return;
      // Resolve primary-key column indices once so each edited row can be
      // identified by its PK value(s) — stable even if the row has moved
      // position since the previous edit (Postgres changes ctid on UPDATE).
      const pkCols = pkColumnsForSet(set);
      const pkColIndexes = pkCols
        ? pkCols.map((c) => set.columns.indexOf(c))
        : null;
      const lazyOffset =
        result?.lazySql !== undefined && result?.lazyPage !== undefined
          ? result.lazyPage * (result.lazyPageSize ?? globalPageSize)
          : 0;
      type CellUpdate = {
        rowIndex: number;
        column: string;
        value: unknown;
        pk?: ReadonlyArray<{ column: string; value: unknown }>;
      };
      const updates: CellUpdate[] = [];
      // Reverse updates (prior values) power the one-step post-commit undo. We
      // only offer undo when *every* edited cell's prior value round-trips
      // cleanly (see `reversibleCellValue`); otherwise `undoable` is cleared.
      const reverseUpdates: CellUpdate[] = [];
      let undoable = true;
      for (const [cellKey, value] of edits) {
        const [rowStr, colStr] = cellKey.split(":");
        const absoluteRow = Number(rowStr);
        const colIdx = Number(colStr);
        const colName = set.columns[colIdx];
        if (!colName) continue;
        const originalRow = set.values[absoluteRow - lazyOffset];
        let pk: Array<{ column: string; value: unknown }> | undefined;
        if (pkCols && pkColIndexes && pkColIndexes.every((i) => i >= 0)) {
          if (originalRow) {
            pk = pkCols.map((c, i) => ({
              column: c,
              value: originalRow[pkColIndexes[i]],
            }));
          }
        }
        updates.push({ rowIndex: absoluteRow, column: colName, value, pk });
        const rev = originalRow
          ? reversibleCellValue(originalRow[colIdx])
          : { ok: false, value: undefined };
        if (rev.ok) {
          reverseUpdates.push({
            rowIndex: absoluteRow,
            column: colName,
            value: rev.value,
            pk,
          });
        } else {
          undoable = false;
        }
      }
      if (updates.length === 0) return;
      const nextPendingEdits = clonePendingEdits(pendingEditsByIndex);
      delete nextPendingEdits[setIdx];
      preserveStateForReload({ pendingEditsByIndex: nextPendingEdits });
      setPendingEditsByIndex(nextPendingEdits);
      setActiveEditCellByIndex((prev) => ({ ...prev, [setIdx]: null }));
      // Preserve the current sort order so the re-fetch after the update
      // uses the same ORDER BY the user has applied, not the default order.
      const baseSql = result?.lazyBaseSql ?? result?.lazySql;
      let refetchSql: string | undefined;
      let refetchBaseSql: string | undefined;
      if (baseSql) {
        refetchBaseSql = baseSql;
        const sorting = sortingByIndex[setIdx] ?? [];
        if (sorting.length > 0) {
          const parsed = parseColumnId(sorting[0].id);
          if (parsed) {
            refetchSql = `SELECT * FROM (${baseSql}) AS __sort ORDER BY ${quoteIdentSql(parsed.name)} ${sorting[0].desc ? "DESC" : "ASC"}`;
          }
        } else {
          // With no user-applied sort, order the re-fetch by the table's
          // primary key so the edited row keeps its position. Postgres and
          // DuckDB move an updated row to the end of the heap (MVCC), so an
          // unordered re-fetch would otherwise make the row jump to the
          // bottom of the grid right after a cell edit.
          const pkCols = pkColumnsForSet(set);
          if (pkCols && pkCols.length > 0) {
            const orderBy = pkCols.map((c) => quoteIdentSql(c)).join(", ");
            refetchSql = `SELECT * FROM (${baseSql}) AS __sort ORDER BY ${orderBy}`;
          }
        }
        refetchSql = refetchSql ?? baseSql;
      } else if (result?.querySql) {
        // Materialized result (no lazy paging) — e.g. a query with its own
        // `LIMIT`. Re-run the *exact* original query so the result keeps its
        // shape/LIMIT, instead of letting the engine fall back to
        // `SELECT * FROM <table>` (which drops the LIMIT and shows every row).
        // Sorting for a materialized result is applied client-side and is
        // preserved across the reload by `preserveStateForReload`.
        refetchSql = result.querySql;
        refetchBaseSql = result.querySql;
      }
      // Offer a one-step undo of this commit. Set synchronously (before the
      // refetch that `onUpdateRows` kicks off) and left untouched by the
      // result-change effect, so the bar shows once the reloaded grid renders.
      if (commitUndoTimerRef.current !== null) {
        window.clearTimeout(commitUndoTimerRef.current);
        commitUndoTimerRef.current = null;
      }
      if (undoable && reverseUpdates.length === updates.length) {
        setCommitUndo({
          tableName: sourceTable,
          reverseUpdates,
          refetchSql,
          refetchBaseSql,
          cellCount: updates.length,
        });
        commitUndoTimerRef.current = window.setTimeout(() => {
          commitUndoTimerRef.current = null;
          setCommitUndo(null);
        }, COMMIT_UNDO_TIMEOUT_MS);
      } else {
        // A non-reversible commit clears any stale undo offer.
        setCommitUndo(null);
      }
      onUpdateRows(sourceTable, updates, refetchSql, refetchBaseSql);
    },
    [
      sourceTable,
      onUpdateRows,
      pendingEditsByIndex,
      selectedByIndex,
      sortingByIndex,
      result,
      globalPageSize,
      preserveStateForReload,
      pkColumnsForSet,
    ],
  );

  /** Re-apply the previous values captured by the last commit (UX-10 undo). */
  const handleUndoCommit = useCallback(() => {
    if (!commitUndo || !onUpdateRows) return;
    if (commitUndoTimerRef.current !== null) {
      window.clearTimeout(commitUndoTimerRef.current);
      commitUndoTimerRef.current = null;
    }
    const snap = commitUndo;
    setCommitUndo(null);
    onUpdateRows(
      snap.tableName,
      snap.reverseUpdates,
      snap.refetchSql,
      snap.refetchBaseSql,
    );
  }, [commitUndo, onUpdateRows]);

  /** Dismiss the undo offer without reverting. */
  const dismissCommitUndo = useCallback(() => {
    if (commitUndoTimerRef.current !== null) {
      window.clearTimeout(commitUndoTimerRef.current);
      commitUndoTimerRef.current = null;
    }
    setCommitUndo(null);
  }, []);

  // Clear the auto-dismiss timer on unmount. (The undo bar is hidden for a
  // different table by the render guard `commitUndo.tableName === sourceTable`,
  // so no per-table reset effect is needed.)
  useEffect(
    () => () => {
      if (commitUndoTimerRef.current !== null) {
        window.clearTimeout(commitUndoTimerRef.current);
      }
    },
    [],
  );

  // Commit the pending edits when exactly one result set has them — used by the
  // Ctrl/⌘+Enter shortcut. (Restricting to a single set avoids a stale-closure
  // double-commit; the multi-set case is rare and still has per-set footer
  // buttons.)
  const commitSinglePendingSet = useCallback(() => {
    const indices = Object.keys(pendingEditsByIndex).filter(
      (k) => (pendingEditsByIndex[Number(k)]?.size ?? 0) > 0,
    );
    if (indices.length !== 1) return;
    const idx = Number(indices[0]);
    const set = result?.sets[idx];
    if (set) commitEdits(idx, set);
  }, [pendingEditsByIndex, result, commitEdits]);

  // Ctrl/⌘+Enter commits pending cell edits. Scoped to when focus is NOT in the
  // CodeMirror editor, whose own keymap owns Ctrl/⌘+Enter for "run query" — so
  // the two never collide (the editor binding only fires while it's focused).
  useEffect(() => {
    if (Object.keys(pendingEditsByIndex).length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.closest(".cm-editor")) return;
      e.preventDefault();
      commitSinglePendingSet();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingEditsByIndex, commitSinglePendingSet]);

  const requestDelete = useCallback((setIdx: number) => {
    setPendingDelete(setIdx);
  }, []);

  const performDelete = useCallback(() => {
    if (pendingDelete === null || !result || !sourceTable || !onDeleteRows) {
      setPendingDelete(null);
      return;
    }
    const set = result.sets[pendingDelete];
    if (!set) {
      setPendingDelete(null);
      return;
    }
    const pkCols = pkColumnsForSet(set);
    if (!pkCols || pkCols.length === 0) {
      setPendingDelete(null);
      return;
    }
    const pkColIndexes = pkCols.map((c) => set.columns.indexOf(c));
    const selected = selectedByIndex[pendingDelete];
    if (!selected || selected.size === 0) {
      setPendingDelete(null);
      return;
    }
    const lazyOffset =
      result.lazySql !== undefined && result.lazyPage !== undefined
        ? result.lazyPage * (result.lazyPageSize ?? globalPageSize)
        : 0;
    const pkRows: unknown[][] = [];
    for (const rowIdx of selected) {
      const row = set.values[rowIdx - lazyOffset];
      if (!row) continue;
      pkRows.push(pkColIndexes.map((ci) => row[ci]));
    }
    const selectedRows = new Set(selected);
    const nextSelectedByIndex = cloneSelections(selectedByIndex);
    delete nextSelectedByIndex[pendingDelete];
    const nextPendingEdits = pendingEditsAfterDeletedRows(
      pendingEditsByIndex,
      pendingDelete,
      selectedRows,
    );
    preserveStateForReload({
      selectedByIndex: nextSelectedByIndex,
      pendingEditsByIndex: nextPendingEdits,
    });
    setPendingDelete(null);
    setSelectedByIndex(nextSelectedByIndex);
    setPendingEditsByIndex(nextPendingEdits);
    onDeleteRows(sourceTable, pkCols, pkRows);
  }, [
    pendingDelete,
    globalPageSize,
    pendingEditsByIndex,
    result,
    sourceTable,
    onDeleteRows,
    pkColumnsForSet,
    selectedByIndex,
    sortingByIndex,
    preserveStateForReload,
  ]);

  const requestDeleteSingleRow = useCallback(
    (setIdx: number, absoluteRow: number) => {
      setPendingDeleteSingleRow({ setIdx, absoluteRow });
    },
    [],
  );

  const performDeleteSingleRow = useCallback(() => {
    if (
      pendingDeleteSingleRow === null ||
      !result ||
      !sourceTable ||
      !onDeleteRows
    ) {
      setPendingDeleteSingleRow(null);
      return;
    }
    const { setIdx, absoluteRow } = pendingDeleteSingleRow;
    const set = result.sets[setIdx];
    if (!set) {
      setPendingDeleteSingleRow(null);
      return;
    }
    const pkCols = pkColumnsForSet(set);
    if (!pkCols || pkCols.length === 0) {
      setPendingDeleteSingleRow(null);
      return;
    }
    const lazyOffset =
      result.lazySql !== undefined && result.lazyPage !== undefined
        ? result.lazyPage * (result.lazyPageSize ?? globalPageSize)
        : 0;
    const row = set.values[absoluteRow - lazyOffset];
    if (!row) {
      setPendingDeleteSingleRow(null);
      return;
    }
    const pkColIndexes = pkCols.map((c) => set.columns.indexOf(c));
    const pkValues = pkColIndexes.map((ci) => row[ci]);
    const deletedRows = new Set([absoluteRow]);
    const nextPendingEdits = pendingEditsAfterDeletedRows(
      pendingEditsByIndex,
      setIdx,
      deletedRows,
    );
    preserveStateForReload({ pendingEditsByIndex: nextPendingEdits });
    setPendingDeleteSingleRow(null);
    setPendingEditsByIndex(nextPendingEdits);
    onDeleteRows(sourceTable, pkCols, [pkValues]);
  }, [
    pendingDeleteSingleRow,
    globalPageSize,
    pendingEditsByIndex,
    result,
    sourceTable,
    onDeleteRows,
    pkColumnsForSet,
    selectedByIndex,
    sortingByIndex,
    preserveStateForReload,
  ]);

  useEffect(() => {
    if (!onExportSnapshotChange) return;
    if (!result || result.error || result.sets.length === 0) {
      onExportSnapshotChange(null);
      return;
    }
    const setIndex = Math.max(
      0,
      Math.min(activeSetIdx, result.sets.length - 1),
    );
    const set = result.sets[setIndex];
    if (!set) {
      onExportSnapshotChange(null);
      return;
    }
    const isLazy = result.lazySql !== undefined && setIndex === 0;
    const effective =
      globalPageSize > 0
        ? globalPageSize
        : Math.max(
            isLazy
              ? (result.lazyTotalCount ?? set.values.length)
              : set.values.length,
            1,
          );
    if (isLazy) {
      onExportSnapshotChange({
        setIndex,
        columns: set.columns,
        allRows: set.values,
        rows: set.values,
        totalRows: result.lazyTotalCount ?? set.values.length,
        pageSize: result.lazyInfinite ? 0 : effective,
        currentPage: result.lazyPage ?? 0,
      });
      return;
    }
    const sorting = sortingByIndex[setIndex] ?? [];
    const st = getState(setIndex);
    let rows = set.values;
    if (sorting.length > 0) {
      const parsed = parseColumnId(sorting[0].id);
      if (parsed) {
        rows = [...set.values].sort((a, b) => {
          const cmp = compareCellValues(a[parsed.ci], b[parsed.ci]);
          return sorting[0].desc ? -cmp : cmp;
        });
      }
    }
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / effective));
    const currentPage = Math.min(st.page, totalPages - 1);
    const start = currentPage * effective;
    const visibleRows =
      globalPageSize > 0 ? rows.slice(start, start + effective) : rows;
    onExportSnapshotChange({
      setIndex,
      columns: set.columns,
      allRows: rows,
      rows: visibleRows,
      totalRows,
      pageSize: effective,
      currentPage,
    });
  }, [
    result,
    globalPageSize,
    activeSetIdx,
    sortingByIndex,
    getState,
    onExportSnapshotChange,
  ]);

  if (loading) {
    return (
      <div className="welcome" data-result-empty="loading">
        <div className="welcome-icon">⌬</div>
        <h3>Loading {engineLabel} engine…</h3>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="welcome" data-result-empty="idle">
        <div className="welcome-icon">⌬</div>
        <h3>Run a query to see results</h3>
        <p>
          Press <kbd className="kbd">Run</kbd> or use the keyboard shortcut to
          execute the active tab. Double-click any table or view in the sidebar
          to open it in a new tab.
        </p>
      </div>
    );
  }
  if (result.error) {
    const hint = getEngineErrorHint(result.error);
    return (
      <div className="sql-result-error">
        <div className="sql-result-error-header">
          <span className="sql-result-error-title">Query failed</span>
          <span className="sql-result-error-engine">{engineLabel}</span>
          <CopyErrorButton text={result.error} />
        </div>
        <pre className="sql-result-error-body">{result.error}</pre>
        {hint && <div className="sql-result-error-hint">{hint}</div>}
      </div>
    );
  }
  if (result.sets.length === 0) {
    return (
      <div ref={noResultsRef} className="sql-result-ok">
        <CheckCircle size={14} aria-hidden="true" />
        Statement executed successfully — no result set returned.
      </div>
    );
  }
  const pendingCount =
    pendingDelete !== null ? (selectedByIndex[pendingDelete]?.size ?? 0) : 0;

  const safeSetIdx = Math.max(
    0,
    Math.min(activeSetIdx, result.sets.length - 1),
  );

  const computeSetRenderData = (idx: number) => {
    const set = result.sets[idx];
    if (!set) return null;
    const isLazy = result.lazySql !== undefined && idx === 0;
    const isInfiniteAll = isLazy && result.lazyInfinite === true;
    // A server-side (pushdown) filter is active: the loaded rows are already
    // the SQL-filtered matches, so they must not be client-filtered again.
    const serverFiltered = isLazy && serverFilterByIndex[idx] !== undefined;
    const sorting = sortingByIndex[idx] ?? [];
    let totalRows: number;
    // The full (pre-filter) row count. Drives the export button, which always
    // operates on the whole result regardless of the in-grid filter.
    let unfilteredTotal: number;
    let currentPage: number;
    let startIdx: number;
    let visibleRows: QueryExecResult["values"];
    let originalIndices: number[];
    // Whether the in-grid filter can be offered: the whole result must be in
    // memory (every materialized result, or a lazy result that fit one page /
    // is fully loaded). See `canClientFilterResult`.
    let canFilter: boolean;
    const rawFilter = (filterByIndex[idx] ?? "").trim();
    if (isLazy) {
      const effective =
        globalPageSize > 0
          ? globalPageSize
          : Math.max(result.lazyTotalCount ?? 0, 1);
      totalRows = result.lazyTotalCount ?? set.values.length;
      // For a server-side filtered result the loaded rows ARE the matches and
      // `totalRows` is the filtered count, so surface the captured pre-filter
      // total for the "filtered from N" readout.
      unfilteredTotal = serverFiltered
        ? (serverFilterByIndex[idx] ?? totalRows)
        : totalRows;
      currentPage = isInfiniteAll ? 0 : (result.lazyPage ?? 0);
      startIdx = isInfiniteAll
        ? 0
        : currentPage * (result.lazyPageSize ?? effective);
      // A bare `SELECT … ` (no LIMIT) runs through the engine-paged lazy path
      // on all three engines. When the loaded rows are the *whole* result
      // (single page that fit, or "All" fully loaded) we client-filter them
      // directly (exact displayed-text match); otherwise the filter is pushed
      // down to SQL (see `triggerServerFilter`) and the rows already match.
      canFilter = canClientFilterResult({
        isLazy,
        loadedRows: set.values.length,
        totalRows,
        startIdx,
      });
      if (canFilter && rawFilter && !serverFiltered) {
        // startIdx is 0 here (fullyLoaded), so each row's index in `set.values`
        // is its absolute position — keep it as the original index so edits /
        // selection / delete stay correct.
        const matchedIdx = filterResultRowIndices(
          set.values,
          set.columns,
          rawFilter,
        );
        visibleRows = matchedIdx.map((ri) => set.values[ri]);
        originalIndices = matchedIdx;
        totalRows = matchedIdx.length;
      } else {
        visibleRows = set.values;
        originalIndices = set.values.map((_, ri) => startIdx + ri);
      }
    } else {
      const st = getState(idx);
      unfilteredTotal = set.values.length;
      canFilter = true;
      // In-grid filter: narrow the materialized rows to those whose displayed
      // text matches, *before* sorting/paginating, so the page count and row
      // readout reflect the filtered view. `originalIndex` stays the index into
      // the full `set.values` so cell edits, selection and delete remain
      // correct. Engine-independent and never re-queries the database.
      let indexed = set.values.map((values, i) => ({
        values,
        originalIndex: i,
      }));
      if (rawFilter) {
        const matched = new Set(
          filterResultRowIndices(set.values, set.columns, rawFilter),
        );
        indexed = indexed.filter((item) => matched.has(item.originalIndex));
      }
      totalRows = indexed.length;
      const effective =
        globalPageSize > 0 ? globalPageSize : Math.max(totalRows, 1);
      const totalPages = Math.max(1, Math.ceil(totalRows / effective));
      currentPage = Math.min(st.page, totalPages - 1);
      startIdx = currentPage * effective;
      let sortedIndexed = indexed;
      if (sorting.length > 0) {
        const parsed = parseColumnId(sorting[0].id);
        if (parsed) {
          sortedIndexed = [...indexed].sort((a, b) => {
            const cmp = compareCellValues(
              a.values[parsed.ci],
              b.values[parsed.ci],
            );
            return sorting[0].desc ? -cmp : cmp;
          });
        }
      }
      const visibleIndexed =
        globalPageSize > 0
          ? sortedIndexed.slice(startIdx, startIdx + effective)
          : sortedIndexed;
      visibleRows = visibleIndexed.map((item) => item.values);
      originalIndices = visibleIndexed.map((item) => item.originalIndex);
    }
    return {
      set,
      isLazy,
      isInfiniteAll,
      serverFiltered,
      sorting,
      totalRows,
      unfilteredTotal,
      canFilter,
      currentPage,
      startIdx,
      visibleRows,
      originalIndices,
    };
  };

  const activeSetData = computeSetRenderData(safeSetIdx);
  const activeSetIsNull = result.sets[safeSetIdx] === null;

  return (
    <>
      {result.sets.length > 1 && (
        <div
          className="sql-result-set-tabs"
          role="tablist"
          aria-label="Result sets"
        >
          {result.sets.map((set, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={safeSetIdx === idx}
              aria-label={`Result set ${idx + 1} of ${result.sets.length}`}
              className={`sql-result-set-tab${safeSetIdx === idx ? " active" : ""}`}
              onClick={() => {
                setActiveSetIdx(idx);
                setFilterPending(false);
              }}
            >
              {set === null && <CheckCircle size={12} aria-hidden="true" />}
              Set {idx + 1}
            </button>
          ))}
        </div>
      )}
      <div
        ref={flashWrapperRef}
        className="sql-result-flash-wrapper sql-result-flash-anim"
      >
        <div ref={resultSetsScrollRef} className="sql-result-sets">
          {activeSetIsNull && (
            <div ref={noResultsRef} className="sql-result-ok">
              <CheckCircle size={14} aria-hidden="true" />
              Statement executed successfully — no result set returned.
            </div>
          )}
          {activeSetData &&
            (() => {
              const idx = safeSetIdx;
              const {
                set,
                isLazy,
                isInfiniteAll,
                sorting,
                visibleRows,
                originalIndices,
                totalRows,
              } = activeSetData;
              const pkCols = pkColumnsForSet(set);
              const selected = selectedByIndex[idx];
              const pendingEdits = pendingEditsByIndex[idx];
              const handleSortingChange = (
                newSorting:
                  | SortingState
                  | ((old: SortingState) => SortingState),
              ) => {
                const resolved =
                  typeof newSorting === "function"
                    ? newSorting(sorting)
                    : newSorting;
                setSortingByIndex((prev) => ({ ...prev, [idx]: resolved }));
                setPageStates((prev) => ({ ...prev, [idx]: { page: 0 } }));
                if (isLazy) {
                  const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
                  const newSortingByIndex = { ...sortingByIndex, [idx]: resolved };
                  // Re-page with the active server-side filter (if any) AND the
                  // new sort composed together, so sorting a filtered result
                  // keeps the filter.
                  const sortedSql = composeLazyQuery(
                    baseSql,
                    filterByIndex[idx] ?? "",
                    set.columns,
                    resolved,
                  );
                  // eslint-disable-next-line react-hooks/refs
                  preserveStateForReload({ sortingByIndex: newSortingByIndex });
                  onLoadPage(sortedSql, 0);
                }
              };
              // Load-more pages the exact query that produced the current rows
              // (it already encodes any pushed-down filter + sort), so infinite
              // scroll streams the filtered result rather than the full table.
              const effectiveLazySql =
                result.lazySql ?? result.lazyBaseSql ?? "";
              // The original (unfiltered) base query, surfaced to the table body
              // for its column "Filter NULL / NON-NULL" context-menu actions.
              const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
              const lazyPageSize = result.lazyPageSize ?? visibleRows.length;
              const hasMoreRows =
                isInfiniteAll && visibleRows.length < totalRows;
              return (
                <ResultTableBody
                  key={idx}
                  set={set}
                  visible={visibleRows}
                  originalIndices={originalIndices}
                  sorting={sorting}
                  onSortingChange={handleSortingChange}
                  keyHints={keyHints}
                  deletable={pkCols !== null}
                  editable={isEditable}
                  sourceTable={sourceTable}
                  constraintInfo={constraintInfo}
                  selectedRows={selected}
                  pendingEdits={pendingEdits}
                  activeEditCell={activeEditCellByIndex[idx] ?? null}
                  onToggleRow={(absoluteRow) =>
                    toggleRowSelected(idx, absoluteRow)
                  }
                  onToggleVisible={(absoluteIndices, select) =>
                    setVisibleSelection(idx, absoluteIndices, select)
                  }
                  onSetPendingEdit={(cellKey, value) =>
                    setPendingEdit(idx, cellKey, value)
                  }
                  onClearPendingEdit={(cellKey) =>
                    clearPendingEdit(idx, cellKey)
                  }
                  onSetActiveEditCell={(cellKey) =>
                    setActiveEditCell(idx, cellKey)
                  }
                  onDeleteSingleRow={
                    pkCols !== null
                      ? (absoluteRow) =>
                          requestDeleteSingleRow(idx, absoluteRow)
                      : undefined
                  }
                  onDuplicateRow={
                    sourceTable && onDuplicateRow
                      ? (columnNames, values) =>
                          onDuplicateRow(sourceTable, columnNames, values)
                      : undefined
                  }
                  // Always virtualize when rendering more than
                  // VIRTUALIZE_ROW_THRESHOLD rows (covers the
                  // "no page limit" + large result-set case the
                  // Stage 1 audit flagged). Infinite-scroll mode
                  // always needs virtualization.
                  virtualized={
                    isInfiniteAll ||
                    visibleRows.length > VIRTUALIZE_ROW_THRESHOLD
                  }
                  scrollParentRef={resultSetsScrollRef}
                  hasMoreRows={hasMoreRows}
                  onLoadMoreRows={
                    isInfiniteAll && onLoadMorePage && lazyPageSize > 0
                      ? () =>
                          onLoadMorePage(
                            effectiveLazySql,
                            Math.floor(visibleRows.length / lazyPageSize),
                          )
                      : undefined
                  }
                  baseSql={baseSql || undefined}
                  onOpenQueryTab={onOpenQueryTab}
                />
              );
            })()}
        </div>
        {activeSetData && (
          <div
            className={`sql-result-filter-overlay${
              filterOverlayActive ? " active" : ""
            }`}
            aria-hidden={!filterOverlayActive}
          >
            <span className="sql-result-filter-spinner" />
            <span className="sql-result-filter-overlay-label">Filtering…</span>
          </div>
        )}
      </div>
      <div className="sql-result-pagers">
        {activeSetData &&
          (() => {
            const idx = safeSetIdx;
            const {
              set,
              isLazy,
              isInfiniteAll,
              serverFiltered,
              totalRows,
              unfilteredTotal,
              canFilter,
              currentPage,
              visibleRows,
            } = activeSetData;
            let handlePageChange: (p: number) => void;
            let handlePageSizeChange: (s: number) => void;
            if (isLazy) {
              const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
              // Page / page-size changes re-page the *current* query, which
              // already encodes any pushed-down filter + sort — so they keep the
              // filter instead of reverting to the full table.
              const effectiveLazySql = result.lazySql ?? baseSql;
              handlePageChange = (p: number) => {
                // eslint-disable-next-line react-hooks/refs
                preserveStateForReload();
                onLoadPage(effectiveLazySql, p);
              };
              handlePageSizeChange = (s: number) => {
                preserveStateForReload();
                onSetGlobalPageSize(s);
                onLoadPage(effectiveLazySql, 0, s);
              };
            } else {
              // eslint-disable-next-line react-hooks/refs
              handlePageChange = (p: number) => setPage(idx, p);
              handlePageSizeChange = (s: number) => {
                onSetGlobalPageSize(s);
                setPage(idx, 0);
              };
            }
            const pkCols = pkColumnsForSet(set);
            const selected = selectedByIndex[idx];
            const selectedCount = selected?.size ?? 0;
            const pendingEdits = pendingEditsByIndex[idx];
            const editCount = pendingEdits?.size ?? 0;
            // Export operates on the *result* the engine returned. For a
            // server-side (pushed-down) filter that IS the filtered set; for a
            // client-side view-only filter it's still the full result. So the
            // export button's page/total counts use `exportTotal`.
            const exportTotal = serverFiltered ? totalRows : unfilteredTotal;
            const effectivePageSize =
              globalPageSize > 0 ? globalPageSize : Math.max(exportTotal, 1);
            const hasMultiplePages =
              globalPageSize > 0 && exportTotal > effectivePageSize;
            const safePage = Math.min(
              currentPage,
              Math.max(0, Math.ceil(exportTotal / effectivePageSize) - 1),
            );
            const pageStart = safePage * effectivePageSize;
            const currentPageRows = Math.min(
              exportTotal - pageStart,
              effectivePageSize,
            );
            // Filtering: in-memory results filter client-side (exact displayed
            // text); engine-paged (or already server-filtered) results push the
            // filter down to SQL and re-query, so infinite scroll is preserved
            // instead of loading every row. Keystroke debouncing happens in the
            // filter input, so this runs on an already-settled value.
            const serverMode = isLazy && (!canFilter || serverFiltered);
            const handleFilterChange = (v: string) => {
              setFilter(idx, v);
              if (serverMode) {
                // eslint-disable-next-line react-hooks/refs
                applyServerFilter(idx, v, set.columns, unfilteredTotal);
              }
            };
            return (
              <>
                <ResultPager
                  key={idx}
                  totalRows={totalRows}
                  loadedRows={isInfiniteAll ? visibleRows.length : undefined}
                  index={idx}
                  pageSize={globalPageSize}
                  page={currentPage}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  deletable={pkCols !== null}
                  editable={isEditable}
                  editCount={editCount}
                  selectedCount={selectedCount}
                  onRequestDelete={() => requestDelete(idx)}
                  // eslint-disable-next-line react-hooks/refs
                  onCommitEdits={() => commitEdits(idx, set)}
                  onDiscardEdits={() => discardEdits(idx)}
                  elapsedMs={result?.elapsedMs}
                  elapsedIsError={!!result?.error}
                  filterValue={filterByIndex[idx] ?? ""}
                  onFilterChange={handleFilterChange}
                  onFilterPendingChange={setFilterPending}
                  filterUnfilteredTotal={unfilteredTotal}
                >
                  {onExportResultSet && (
                    <ResultSetExportButton
                      hasMultiplePages={hasMultiplePages}
                      currentPageRows={currentPageRows}
                      totalRows={exportTotal}
                      resultSetExportScope={resultSetExportScope}
                      onExportResultSet={onExportResultSet}
                      onSetResultSetExportScope={setResultSetExportScope}
                    />
                  )}
                </ResultPager>
              </>
            );
          })()}
      </div>
      {commitUndo &&
        commitUndo.tableName === sourceTable &&
        Object.keys(pendingEditsByIndex).length === 0 && (
          <div className="sql-edit-undo-bar" role="status">
            <span className="sql-edit-undo-text">
              Updated {commitUndo.cellCount} cell
              {commitUndo.cellCount === 1 ? "" : "s"} in{" "}
              <strong>{commitUndo.tableName}</strong>.
            </span>
            <button
              type="button"
              className="sql-edit-undo-btn"
              onClick={handleUndoCommit}
            >
              <Undo2 size={12} aria-hidden="true" />
              Undo
            </button>
            <button
              type="button"
              className="sql-edit-undo-dismiss"
              aria-label="Dismiss"
              onClick={dismissCommitUndo}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        )}
      <AlertDialog.Root
        open={pendingDelete !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="confirm-backdrop" />
          <AlertDialog.Popup className="confirm-popup">
            <AlertDialog.Title className="confirm-title">
              Delete {pendingCount} row{pendingCount === 1 ? "" : "s"}?
            </AlertDialog.Title>
            <AlertDialog.Description className="confirm-desc">
              {pendingCount} row{pendingCount === 1 ? "" : "s"} will be
              permanently deleted from{" "}
              <strong>{sourceTable ?? "this table"}</strong>. The change is
              in-memory only and will be undone next page load, but cannot be
              reversed within this session.
            </AlertDialog.Description>
            <div className="confirm-actions">
              <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </AlertDialog.Close>
              <AlertDialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={performDelete}
              >
                Delete row{pendingCount === 1 ? "" : "s"}
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <AlertDialog.Root
        open={pendingDeleteSingleRow !== null}
        onOpenChange={(next) => {
          if (!next) setPendingDeleteSingleRow(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="confirm-backdrop" />
          <AlertDialog.Popup className="confirm-popup">
            <AlertDialog.Title className="confirm-title">
              Delete this row?
            </AlertDialog.Title>
            <AlertDialog.Description className="confirm-desc">
              This row will be permanently deleted from{" "}
              <strong>{sourceTable ?? "this table"}</strong>. The change is
              in-memory only and will be undone next page load, but cannot be
              reversed within this session.
            </AlertDialog.Description>
            <div className="confirm-actions">
              <AlertDialog.Close className="confirm-btn confirm-btn-secondary">
                Cancel
              </AlertDialog.Close>
              <AlertDialog.Close
                className="confirm-btn confirm-btn-danger"
                onClick={performDeleteSingleRow}
              >
                Delete row
              </AlertDialog.Close>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

/** Human label for the detected column kind, shown as a caption. */
const COLUMN_STATS_KIND_LABEL: Record<ColumnStats["kind"], string> = {
  numeric: "Numeric",
  text: "Text",
  boolean: "Boolean",
  blob: "Binary",
  mixed: "Mixed",
  empty: "Empty",
};

/** One label/value row in the stats grid. */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="sql-col-stats-row">
      <span className="sql-col-stats-label">{label}</span>
      <span className="sql-col-stats-value">{value}</span>
    </div>
  );
}

/** Presentational column-statistics body for the inspector dialog. */
function ColumnStatsView({
  name,
  rowCount,
  stats,
}: {
  name: string;
  rowCount: number;
  stats: ColumnStats;
}) {
  const { numeric, text, top } = stats;
  return (
    <div className="sql-col-stats">
      <div className="sql-col-stats-grid">
        <StatRow label="Rows" value={formatStatNumber(rowCount)} />
        <StatRow label="Non-null" value={formatStatNumber(stats.nonNull)} />
        <StatRow
          label="Null"
          value={`${formatStatNumber(stats.nulls)} (${formatPercent(
            stats.nullFraction,
          )})`}
        />
        <StatRow label="Distinct" value={formatStatNumber(stats.distinct)} />
        {numeric && (
          <>
            <StatRow label="Min" value={formatStatNumber(numeric.min)} />
            <StatRow label="Max" value={formatStatNumber(numeric.max)} />
            <StatRow label="Mean" value={formatStatNumber(numeric.mean)} />
            <StatRow label="Median" value={formatStatNumber(numeric.median)} />
            <StatRow label="Sum" value={formatStatNumber(numeric.sum)} />
          </>
        )}
        {text && (
          <>
            <StatRow
              label="Min length"
              value={formatStatNumber(text.minLength)}
            />
            <StatRow
              label="Max length"
              value={formatStatNumber(text.maxLength)}
            />
            <StatRow
              label="Avg length"
              value={formatStatNumber(text.avgLength)}
            />
          </>
        )}
      </div>
      {top.length > 0 && (
        <div className="sql-col-stats-top">
          <div className="sql-col-stats-top-title">Most frequent values</div>
          <ul className="sql-col-stats-top-list">
            {top.map((t, i) => (
              <li key={i} className="sql-col-stats-top-item">
                <span className="sql-col-stats-top-val" title={t.label}>
                  {t.label === "" ? "(empty string)" : t.label}
                </span>
                <span className="sql-col-stats-top-count">
                  {formatStatNumber(t.count)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="sql-col-stats-foot">
        {`${COLUMN_STATS_KIND_LABEL[stats.kind]} column · based on ${formatStatNumber(
          rowCount,
        )} loaded row${rowCount === 1 ? "" : "s"} of `}
        <strong>{name}</strong>
      </div>
    </div>
  );
}

export function ResultTableBody({
  set,
  visible,
  originalIndices,
  sorting,
  onSortingChange,
  keyHints,
  deletable,
  editable,
  sourceTable,
  constraintInfo,
  selectedRows,
  pendingEdits,
  activeEditCell,
  onToggleRow,
  onToggleVisible,
  onSetPendingEdit,
  onClearPendingEdit,
  onSetActiveEditCell,
  onDeleteSingleRow,
  onDuplicateRow,
  virtualized = false,
  scrollParentRef,
  hasMoreRows = false,
  onLoadMoreRows,
  baseSql,
  onOpenQueryTab,
}: {
  set: QueryExecResult & { columnTypes?: string[] };
  visible: QueryExecResult["values"];
  originalIndices: number[];
  sorting: SortingState;
  onSortingChange: (
    updater: SortingState | ((old: SortingState) => SortingState),
  ) => void;
  keyHints?: ColumnKeyHints;
  deletable: boolean;
  editable: boolean;
  sourceTable?: string;
  constraintInfo?: ColumnConstraintInfo[];
  selectedRows?: Set<number>;
  pendingEdits?: Map<string, unknown>;
  activeEditCell: string | null;
  onToggleRow: (absoluteRow: number) => void;
  onToggleVisible: (absoluteIndices: number[], select: boolean) => void;
  onSetPendingEdit: (cellKey: string, value: unknown) => void;
  onClearPendingEdit: (cellKey: string) => void;
  onSetActiveEditCell: (cellKey: string | null) => void;
  onDeleteSingleRow?: (absoluteRow: number) => void;
  onDuplicateRow?: (columnNames: string[], values: unknown[]) => void;
  virtualized?: boolean;
  scrollParentRef?: React.RefObject<HTMLDivElement | null>;
  hasMoreRows?: boolean;
  onLoadMoreRows?: () => void;
  baseSql?: string;
  onOpenQueryTab?: (title: string, sql: string) => void;
}) {
  const toastManager = Toast.useToastManager();
  const rightClickedCellRef = useRef<{
    colIdx: number;
    value: unknown;
  } | null>(null);

  const [modalEditCell, setModalEditCell] = useState<{
    cellKey: string;
    colName: string;
    value: string;
    // Present for binary (BLOB / bytea) cells: a read-only hex + base64 view.
    // When set, the modal is a viewer (no editable textarea / Apply).
    binary?: { hex: string; base64: string; length: number };
  } | null>(null);
  // Validation message for the edit-in-modal dialog (e.g. invalid JSON).
  const [modalError, setModalError] = useState<string | null>(null);

  // ── Column rename state ────────────────────────────────────────────────
  const [renamedColumns, setRenamedColumns] = useState<Map<number, string>>(
    new Map(),
  );
  const [renameDialog, setRenameDialog] = useState<{
    ci: number;
    originalName: string;
  } | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // ── Column statistics dialog ───────────────────────────────────────────
  // Computed once, from the loaded rows, when the dialog opens (a snapshot —
  // no reactive recompute while the modal is up).
  const [statsDialog, setStatsDialog] = useState<{
    name: string;
    rowCount: number;
    stats: ColumnStats;
  } | null>(null);

  // Keep mutable refs so that click handlers inside the columns useMemo
  // always access the latest values without needing them in the dep array.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const renamedColumnsRef = useRef(renamedColumns);
  renamedColumnsRef.current = renamedColumns;
  const handleSortingChangeRef = useRef<
    (updater: SortingState | ((old: SortingState) => SortingState)) => void
  >(() => undefined);
  const baseSqlRef = useRef(baseSql);
  baseSqlRef.current = baseSql;
  const sourceTableRef = useRef(sourceTable);
  sourceTableRef.current = sourceTable;
  const onOpenQueryTabRef = useRef(onOpenQueryTab);
  onOpenQueryTabRef.current = onOpenQueryTab;

  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(next);
    },
    [onSortingChange, sorting],
  );
  handleSortingChangeRef.current = handleSortingChange;

  const { canDuplicate, uniqueConstraintReason } = useMemo(() => {
    if (!onDuplicateRow) {
      return { canDuplicate: false, uniqueConstraintReason: "" };
    }
    if (!constraintInfo || constraintInfo.length === 0) {
      return { canDuplicate: true, uniqueConstraintReason: "" };
    }
    // Auto-increment / IDENTITY columns regenerate on insert, so neither
    // a PK nor a UNIQUE constraint on such a column actually blocks
    // duplication — the new row gets a fresh value.
    const blocking = constraintInfo.filter(
      (c) => (c.isPrimaryKey || c.isUnique) && !c.isAutoIncrement,
    );
    if (blocking.length > 0) {
      const names = blocking.map((c) => c.name).join(", ");
      return {
        canDuplicate: false,
        uniqueConstraintReason: `Column${blocking.length > 1 ? "s" : ""} with unique constraint${blocking.length > 1 ? "s" : ""}: ${names}`,
      };
    }
    return { canDuplicate: true, uniqueConstraintReason: "" };
  }, [onDuplicateRow, constraintInfo]);

  const allVisibleSelected =
    deletable &&
    originalIndices.length > 0 &&
    originalIndices.every((i) => selectedRows?.has(i));
  const someVisibleSelected =
    deletable &&
    !allVisibleSelected &&
    originalIndices.some((i) => selectedRows?.has(i));
  // The editor cell reads the live pending-edit / active-cell state through
  // refs so the `columns` memo below does NOT depend on them. Without this the
  // memo recomputes on every keystroke, TanStack rebuilds the columns, and the
  // inline <input> remounts each keystroke — which re-fires autofocus+select
  // (so the value re-selects as you type) and resets the caret.
  const pendingEditsRef = useRef(pendingEdits);
  pendingEditsRef.current = pendingEdits;
  const activeEditCellRef = useRef(activeEditCell);
  activeEditCellRef.current = activeEditCell;
  // `originalIndices` is rebuilt every render by the parent (new array, same
  // content) — read it via a ref in the `columns` memo so that memo (and thus
  // the editor <input>) doesn't churn/remount on each keystroke.
  const originalIndicesRef = useRef(originalIndices);
  originalIndicesRef.current = originalIndices;
  const data = useMemo<ResultTableRow[]>(
    () =>
      visible.map((values, ri) => ({
        absoluteRow: originalIndices[ri],
        values,
      })),
    [visible, originalIndices],
  );

  const columns = useMemo<ColumnDef<ResultTableRow>[]>(
    () => [
      ...(deletable
        ? [
            {
              id: "select",
              enableSorting: false,
              header: () => (
                <Checkbox.Root
                  className="sql-result-row-checkbox"
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onCheckedChange={(v) =>
                    onToggleVisible(originalIndicesRef.current, v === true)
                  }
                  aria-label={
                    allVisibleSelected
                      ? "Deselect all visible rows"
                      : "Select all visible rows"
                  }
                >
                  <Checkbox.Indicator className="sql-result-row-checkbox-ind">
                    {allVisibleSelected ? "✓" : "–"}
                  </Checkbox.Indicator>
                </Checkbox.Root>
              ),
              cell: ({ row }: { row: { original: ResultTableRow } }) => {
                const absoluteRow = row.original.absoluteRow;
                const checked = selectedRows?.has(absoluteRow) ?? false;
                return (
                  <Checkbox.Root
                    className="sql-result-row-checkbox"
                    checked={checked}
                    onCheckedChange={() => onToggleRow(absoluteRow)}
                    aria-label={
                      checked
                        ? `Deselect row ${absoluteRow + 1}`
                        : `Select row ${absoluteRow + 1}`
                    }
                  >
                    <Checkbox.Indicator className="sql-result-row-checkbox-ind">
                      ✓
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                );
              },
            } satisfies ColumnDef<ResultTableRow>,
          ]
        : []),
      ...set.columns.map((c, ci) => {
        const resolvedType =
          set.columnTypes?.[ci] || inferColumnType(set.values, ci);
        const isBoolCol = isBooleanType(resolvedType);
        const editorKind = classifyCellEditor(resolvedType);
        return {
            id: `col-${ci}-${c}`,
            accessorFn: (row) => row.values[ci],
            meta: { ci },
            header: ({ column }) => {
              const isPk = keyHints?.pk.has(c) ?? false;
              const fk = keyHints?.fk.get(c);
              const isReadOnly = keyHints?.readOnly?.has(c) ?? false;
              const sorted = column.getIsSorted();
              const colType =
                set.columnTypes?.[ci] || inferColumnType(set.values, ci);
              const displayName = renamedColumnsRef.current.get(ci) ?? c;
              const sortTitle =
                sorted === "asc"
                  ? "Sorted ascending — click to sort descending"
                  : sorted === "desc"
                    ? "Sorted descending — click to clear sort"
                    : "Click to sort ascending";
              const colId = `col-${ci}-${c}`;

              // Build the filter SQL for Filter NULL / Filter NON-NULL items.
              const quotedCol = `"${c.replace(/"/g, '""')}"`;
              const filterBaseSql = sourceTableRef.current
                ? `SELECT * FROM "${sourceTableRef.current.replace(/"/g, '""')}"`
                : baseSqlRef.current
                  ? `SELECT * FROM (\n${baseSqlRef.current}\n) AS _q`
                  : null;

              const headerContent = (
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={150}
                    closeDelay={100}
                    render={(triggerProps) => (
                      <button
                        {...triggerProps}
                        type="button"
                        className="sql-result-th-btn"
                        onClick={column.getToggleSortingHandler()}
                        aria-label={sortTitle}
                      >
                        <span className="sql-result-th-top">
                          <span className="sql-result-th-label">
                            {isPk && (
                              <Popover.Root>
                                <Popover.Trigger
                                  openOnHover
                                  delay={150}
                                  closeDelay={100}
                                  render={(triggerProps) => (
                                    <span
                                      {...triggerProps}
                                      className="sql-result-th-key-trigger"
                                    >
                                      <MdOutlineKey
                                        size={12}
                                        className="sql-result-th-pk"
                                        aria-label="Primary key"
                                      />
                                    </span>
                                  )}
                                />
                                <Popover.Portal>
                                  <Popover.Positioner
                                    sideOffset={6}
                                    side="top"
                                    className="sql-key-icon-popover-positioner"
                                  >
                                    <Popover.Popup className="bui-popup sql-key-icon-popover">
                                      <MdOutlineKey
                                        size={11}
                                        className="sql-key-icon-popover-icon"
                                        aria-hidden="true"
                                      />
                                      <span>Primary key</span>
                                    </Popover.Popup>
                                  </Popover.Positioner>
                                </Popover.Portal>
                              </Popover.Root>
                            )}
                            {fk && (
                              <Popover.Root>
                                <Popover.Trigger
                                  openOnHover
                                  delay={150}
                                  closeDelay={100}
                                  render={(triggerProps) => (
                                    <span
                                      {...triggerProps}
                                      className="sql-result-th-key-trigger"
                                    >
                                      <IoLink
                                        size={12}
                                        className="sql-result-th-fk"
                                        aria-label={`Foreign key → ${fk.table}.${fk.to}`}
                                      />
                                    </span>
                                  )}
                                />
                                <Popover.Portal>
                                  <Popover.Positioner
                                    sideOffset={6}
                                    side="top"
                                    className="sql-key-icon-popover-positioner"
                                  >
                                    <Popover.Popup className="bui-popup sql-key-icon-popover">
                                      <IoLink
                                        size={12}
                                        className="sql-key-icon-popover-icon"
                                        aria-hidden="true"
                                      />
                                      <span>Foreign key</span>
                                    </Popover.Popup>
                                  </Popover.Positioner>
                                </Popover.Portal>
                              </Popover.Root>
                            )}
                            <span>{displayName}</span>
                            {isReadOnly && (
                              <span
                                className="sql-result-th-readonly"
                                title="Read-only — generated column"
                              >
                                <Lock size={10} aria-label="Read-only column" />
                              </span>
                            )}
                          </span>
                          <span
                            className={
                              sorted
                                ? "sql-result-th-chevron sql-result-th-chevron-active"
                                : "sql-result-th-chevron"
                            }
                            aria-hidden="true"
                          >
                            {sorted === "asc" ? (
                              <ChevronUp size={11} />
                            ) : (
                              <ChevronDown size={11} />
                            )}
                          </span>
                        </span>
                        <span className="sql-result-th-type">
                          <DataTypeIcon type={colType} />
                          {colType}
                        </span>
                      </button>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner
                      sideOffset={6}
                      side="top"
                      className="sql-result-th-btn-positioner"
                    >
                      <Popover.Popup className="bui-popup sql-result-th-btn-popover">
                        {sortTitle}
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              );

              return (
                <ContextMenu.Root>
                  <ContextMenu.Trigger
                    render={(props) => (
                      <div {...props} className="sql-result-th-ctx-trigger">
                        {headerContent}
                      </div>
                    )}
                  />
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner sideOffset={4}>
                      <ContextMenu.Popup className="bui-popup examples-dropdown sql-th-context-menu">
                        <ContextMenu.Item
                          className="example-item"
                          onClick={() => {
                            setRenameDialog({ ci, originalName: c });
                            setRenameInput(
                              renamedColumnsRef.current.get(ci) ?? c,
                            );
                          }}
                        >
                          <div className="ex-title">Rename column</div>
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="example-item"
                          disabled={sorted === "asc"}
                          onClick={() => {
                            handleSortingChangeRef.current([
                              { id: colId, desc: false },
                            ]);
                          }}
                        >
                          <div className="ex-title">Sort ascending</div>
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="example-item"
                          disabled={sorted === "desc"}
                          onClick={() => {
                            handleSortingChangeRef.current([
                              { id: colId, desc: true },
                            ]);
                          }}
                        >
                          <div className="ex-title">Sort descending</div>
                        </ContextMenu.Item>
                        {sorted !== false && (
                          <ContextMenu.Item
                            className="example-item"
                            onClick={() => {
                              handleSortingChangeRef.current([]);
                            }}
                          >
                            <div className="ex-title">Reset sort</div>
                          </ContextMenu.Item>
                        )}
                        {filterBaseSql && onOpenQueryTabRef.current && (
                          <>
                            <ContextMenu.Item
                              className="example-item"
                              onClick={() => {
                                const sql = `${filterBaseSql} WHERE ${quotedCol} IS NULL;`;
                                onOpenQueryTabRef.current?.(
                                  `Filter: ${c} IS NULL`,
                                  sql,
                                );
                              }}
                            >
                              <div className="ex-title">Filter NULL values</div>
                            </ContextMenu.Item>
                            <ContextMenu.Item
                              className="example-item"
                              onClick={() => {
                                const sql = `${filterBaseSql} WHERE ${quotedCol} IS NOT NULL;`;
                                onOpenQueryTabRef.current?.(
                                  `Filter: ${c} IS NOT NULL`,
                                  sql,
                                );
                              }}
                            >
                              <div className="ex-title">
                                Filter NON-NULL values
                              </div>
                            </ContextMenu.Item>
                          </>
                        )}
                        <ContextMenu.Item
                          className="example-item"
                          onClick={() => {
                            const colValues = visibleRef.current.map(
                              (row) => row[ci] ?? null,
                            );
                            setStatsDialog({
                              name: displayName,
                              rowCount: colValues.length,
                              stats: computeColumnStats(colValues),
                            });
                          }}
                        >
                          <div className="ex-title">Column statistics</div>
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="example-item"
                          onClick={() => {
                            const values = visibleRef.current.map(
                              (row) => row[ci] ?? null,
                            );
                            navigator.clipboard
                              .writeText(JSON.stringify(values))
                              .catch(() => undefined);
                          }}
                        >
                          <div className="ex-title">Copy as JSON</div>
                        </ContextMenu.Item>
                        <ContextMenu.Item
                          className="example-item"
                          onClick={() => {
                            const text = visibleRef.current
                              .map((row) => formatCellValue(row[ci] ?? null))
                              .join("\n");
                            navigator.clipboard
                              .writeText(text)
                              .catch(() => undefined);
                          }}
                        >
                          <div className="ex-title">Copy column values</div>
                        </ContextMenu.Item>
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              );
            },
            cell: (info) => {
              // Generated / computed columns can't be updated; render them
              // read-only so an edit can't be started that would only fail at
              // commit time.
              const isReadOnly = keyHints?.readOnly?.has(c) ?? false;
              if (!editable || isReadOnly) {
                return formatCellValue(info.getValue());
              }
              const absoluteRow = info.row.original.absoluteRow;
              const cellKey = `${absoluteRow}:${ci}`;
              const isActiveEdit = activeEditCellRef.current === cellKey;
              const hasPendingEdit =
                pendingEditsRef.current?.has(cellKey) ?? false;
              const pendingValue = pendingEditsRef.current?.get(cellKey);
              const rawValue = info.getValue();
              // Binary columns aren't editable inline — a text/date picker
              // would corrupt the bytes. Render a read-only marker; the row
              // context menu's "Edit cell in modal" opens a hex/base64 viewer.
              if (editorKind === "blob" || rawValue instanceof Uint8Array) {
                return (
                  <span
                    className={
                      rawValue === null ? "sql-cell-null" : "sql-cell-blob"
                    }
                    title="Binary value — right-click → Edit cell in modal to view bytes"
                  >
                    {formatCellValue(rawValue)}
                  </span>
                );
              }
              // Boolean columns render as a tri-state checkbox toggle instead
              // of a 0/1 text input. Clicking flips true/false (NULL via the
              // row context menu's "Set to NULL").
              if (isBoolCol) {
                const effective = hasPendingEdit ? pendingValue : rawValue;
                const isNull = effective === null || effective === undefined;
                const checked = boolTruthy(effective);
                return (
                  <input
                    type="checkbox"
                    className={
                      hasPendingEdit
                        ? "sql-cell-bool sql-cell-edited"
                        : "sql-cell-bool"
                    }
                    checked={checked}
                    ref={(el) => {
                      if (el) el.indeterminate = isNull;
                    }}
                    aria-label={`Toggle ${c}`}
                    onChange={() => {
                      const next = isNull ? true : !checked;
                      const origNull =
                        rawValue === null || rawValue === undefined;
                      if (!origNull && next === boolTruthy(rawValue)) {
                        if (hasPendingEdit) onClearPendingEdit(cellKey);
                      } else {
                        onSetPendingEdit(cellKey, next);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  />
                );
              }
              const isNumeric =
                rawValue !== null && typeof rawValue === "number";
              if (isActiveEdit) {
                // Date/time columns get a native picker when the stored value
                // is a recognizable date string. The committed value preserves
                // the original's exact format (separator, fractional seconds,
                // timezone suffix), so it round-trips just like the free-text
                // editor — see cellEditing.ts. Falls back to the text input
                // below when the value isn't a parseable temporal string.
                if (
                  editorKind === "date" ||
                  editorKind === "datetime" ||
                  editorKind === "time"
                ) {
                  const source = hasPendingEdit ? pendingValue : rawValue;
                  // A `date`-typed column whose value actually carries a
                  // time-of-day is edited with a datetime picker so the hours
                  // and minutes are editable too (not silently dropped).
                  const kind = resolveTemporalEditorKind(
                    editorKind as TemporalEditorKind,
                    source,
                  );
                  const dateInputVal = toDateEditorValue(source, kind);
                  if (dateInputVal !== null) {
                    const inputType =
                      kind === "date"
                        ? "date"
                        : kind === "time"
                          ? "time"
                          : "datetime-local";
                    return (
                      <input
                        className="sql-cell-input sql-cell-input-date"
                        type={inputType}
                        defaultValue={dateInputVal}
                        step={kind === "date" ? undefined : 1}
                        autoFocus
                        aria-label={`Edit ${c}`}
                        onChange={(e) => {
                          const raw = e.target.value;
                          // Clearing a native picker is a no-op; use the row
                          // context menu's "Set to NULL" to null the cell.
                          if (raw === "") return;
                          const stored = fromDateEditorValue(raw, kind, rawValue);
                          if (stored !== formatCellValue(rawValue)) {
                            onSetPendingEdit(cellKey, stored);
                          } else if (hasPendingEdit) {
                            onClearPendingEdit(cellKey);
                          }
                        }}
                        onBlur={() => onSetActiveEditCell(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.currentTarget as HTMLInputElement).blur();
                          } else if (e.key === "Escape") {
                            // Escape reverts this cell's pending edit and exits.
                            e.stopPropagation();
                            onClearPendingEdit(cellKey);
                            onSetActiveEditCell(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                      />
                    );
                  }
                }
                const editVal = hasPendingEdit
                  ? String(pendingValue ?? "")
                  : formatCellValue(rawValue);
                return (
                  <input
                    className="sql-cell-input"
                    defaultValue={editVal}
                    autoFocus
                    type="text"
                    /* size={1} so the input's intrinsic width doesn't widen the
                       column; `width:100%` still fills the cell. */
                    size={1}
                    aria-label={`Edit ${c}`}
                    inputMode={isNumeric ? "decimal" : undefined}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const newVal = parseCellEditValue(raw, isNumeric);
                      if (newVal !== rawValue) {
                        onSetPendingEdit(cellKey, newVal);
                      } else if (hasPendingEdit) {
                        onClearPendingEdit(cellKey);
                      }
                    }}
                    onBlur={() => {
                      onSetActiveEditCell(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        (e.currentTarget as HTMLInputElement).blur();
                      } else if (e.key === "Escape") {
                        // Escape reverts this cell's pending edit and exits.
                        e.stopPropagation();
                        onClearPendingEdit(cellKey);
                        onSetActiveEditCell(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                  />
                );
              }
              return (
                <span
                  className={
                    hasPendingEdit
                      ? "sql-cell-edited"
                      : rawValue === null
                        ? "sql-cell-null"
                        : undefined
                  }
                  title={editable ? "Double-click to edit" : undefined}
                >
                  {hasPendingEdit
                    ? formatCellValue(pendingValue)
                    : formatCellValue(rawValue)}
                  {hasPendingEdit && (
                    <button
                      type="button"
                      className="sql-cell-discard"
                      title="Discard this edit"
                      aria-label={`Discard pending edit to ${c}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearPendingEdit(cellKey);
                      }}
                      onDoubleClick={(e) => e.stopPropagation()}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            },
          } satisfies ColumnDef<ResultTableRow>;
      }),
    ],
    // `activeEditCell` and `pendingEdits` are read via refs (above), and the
    // `on*` callbacks are stable in behaviour — each is an inline arrow in the
    // parent that only forwards to a stable setter bound to a stable `idx`, so
    // a stale identity is equivalent. Excluding both keeps this memo stable
    // across keystrokes so the editor <input> doesn't remount each keystroke
    // (which would re-select the value and reset the caret).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      allVisibleSelected,
      deletable,
      editable,
      keyHints,
      selectedRows,
      set.columns,
      set.columnTypes,
      set.values,
      someVisibleSelected,
    ],
  );
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table is required for stable result-table customization.
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  });
  const tableRows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () =>
      virtualized ? (scrollParentRef?.current ?? null) : null,
    estimateSize: () => VIRTUAL_ROW_HEIGHT_ESTIMATE,
    overscan: 20,
  });
  const virtualRows = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const renderedRows = virtualized
    ? virtualRows.map((virtualRow) => ({
        row: tableRows[virtualRow.index],
        virtualRow,
      }))
    : tableRows.map((row) => ({ row, virtualRow: null }));
  const paddingTop =
    virtualized && virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualized && virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() -
        (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;
  const loadMoreRequestedForCountRef = useRef<number | null>(null);
  useEffect(() => {
    loadMoreRequestedForCountRef.current = null;
  }, [tableRows.length]);
  const lastVirtualIndex = virtualRows[virtualRows.length - 1]?.index ?? -1;
  useEffect(() => {
    if (!virtualized || !hasMoreRows || !onLoadMoreRows) return;
    if (lastVirtualIndex < tableRows.length - LOAD_MORE_THRESHOLD_ROWS) return;
    if (loadMoreRequestedForCountRef.current === tableRows.length) return;
    loadMoreRequestedForCountRef.current = tableRows.length;
    onLoadMoreRows();
  }, [
    hasMoreRows,
    lastVirtualIndex,
    onLoadMoreRows,
    tableRows.length,
    virtualized,
  ]);

  const colSpan = table.getAllLeafColumns().length;

  const renderRow = (row: (typeof tableRows)[number]) => {
    const absoluteRow = row.original.absoluteRow;
    const rowValues = row.original.values;
    const checked = selectedRows?.has(absoluteRow) ?? false;
    const cells = row.getVisibleCells().map((cell) => {
      const isSelect = cell.column.id === "select";
      const rawVal = isSelect ? undefined : cell.getValue();
      const ci = isSelect
        ? -1
        : ((cell.column.columnDef.meta as { ci: number } | undefined)?.ci ??
          -1);
      const cellKey = `${absoluteRow}:${ci}`;
      const hasPendingEdit =
        !isSelect && ci >= 0 && (pendingEdits?.has(cellKey) ?? false);
      // Binary cells are inspected via the modal viewer, not edited inline.
      const isBlobCell =
        !isSelect &&
        ci >= 0 &&
        (rawVal instanceof Uint8Array ||
          classifyCellEditor(set.columnTypes?.[ci]) === "blob");
      return (
        <td
          key={cell.id}
          className={
            isSelect
              ? "sql-result-td-select"
              : hasPendingEdit
                ? "sql-cell-edited-td"
                : rawVal === null
                  ? "sql-cell-null"
                  : undefined
          }
          onContextMenu={
            !isSelect && ci >= 0
              ? () => {
                  rightClickedCellRef.current = {
                    colIdx: ci,
                    value: rawVal,
                  };
                }
              : undefined
          }
          onDoubleClick={
            editable && !isSelect && ci >= 0 && !isBlobCell
              ? () => {
                  // Generated/read-only columns can't be edited — explain why
                  // instead of silently doing nothing on double-click.
                  const colName = set.columns[ci] ?? "";
                  if (keyHints?.readOnly?.has(colName)) {
                    toastManager.add({
                      title: `"${colName}" is a generated column — its value is computed from other columns and can't be edited.`,
                      data: { kind: "info" },
                    });
                    return;
                  }
                  onSetActiveEditCell(cellKey);
                }
              : undefined
          }
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      );
    });
    return (
      <ContextMenu.Root key={absoluteRow}>
        <ContextMenu.Trigger
          render={(props) => (
            <tr
              {...props}
              className={checked ? "sql-result-row-selected" : undefined}
            >
              {cells}
            </tr>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={4}>
            <ContextMenu.Popup className="bui-popup examples-dropdown sql-row-context-menu">
              <ContextMenu.Item
                className="example-item"
                onClick={() => {
                  const cell = rightClickedCellRef.current;
                  const text = cell !== null ? formatCellValue(cell.value) : "";
                  navigator.clipboard
                    .writeText(text)
                    .then(() => {
                      toastManager.add({ title: "Cell value copied", data: { kind: "info" } });
                    })
                    .catch(() => undefined);
                }}
              >
                <div className="ex-title">Copy cell value</div>
              </ContextMenu.Item>
              {editable && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => {
                    const cell = rightClickedCellRef.current;
                    if (cell === null || cell.colIdx < 0) return;
                    const colName = set.columns[cell.colIdx] ?? "";
                    const cellKey = `${absoluteRow}:${cell.colIdx}`;
                    // Binary values open a read-only hex/base64 viewer — editing
                    // bytes as text would corrupt them on commit.
                    if (cell.value instanceof Uint8Array) {
                      setModalEditCell({
                        cellKey,
                        colName,
                        value: formatCellValue(cell.value),
                        binary: {
                          hex: formatBytesHex(cell.value),
                          base64: bytesToBase64(cell.value),
                          length: cell.value.length,
                        },
                      });
                      return;
                    }
                    if (keyHints?.readOnly?.has(colName)) {
                      toastManager.add({
                        title: `Column "${colName}" is read-only (generated).`,
                        data: { kind: "info" },
                      });
                      return;
                    }
                    const current = pendingEdits?.has(cellKey)
                      ? String(pendingEdits.get(cellKey) ?? "")
                      : formatCellValue(cell.value);
                    setModalEditCell({ cellKey, colName, value: current });
                  }}
                >
                  <div className="ex-title">Edit cell in modal</div>
                </ContextMenu.Item>
              )}
              {editable && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => {
                    const cell = rightClickedCellRef.current;
                    if (cell === null || cell.colIdx < 0) return;
                    const colName = set.columns[cell.colIdx] ?? "";
                    if (keyHints?.readOnly?.has(colName)) {
                      toastManager.add({
                        title: `Column "${colName}" is read-only (generated).`,
                        data: { kind: "info" },
                      });
                      return;
                    }
                    onSetPendingEdit(`${absoluteRow}:${cell.colIdx}`, null);
                  }}
                >
                  <div className="ex-title">Set to NULL</div>
                </ContextMenu.Item>
              )}
              <ContextMenu.Item
                className="example-item"
                onClick={() => {
                  const obj = Object.fromEntries(
                    set.columns.map((c, i) => [c, rowValues[i]]),
                  );
                  navigator.clipboard
                    .writeText(JSON.stringify(obj, null, 2))
                    .then(() => {
                      toastManager.add({ title: "Row copied as JSON", data: { kind: "info" } });
                    })
                    .catch(() => undefined);
                }}
              >
                <div className="ex-title">Copy row as JSON</div>
              </ContextMenu.Item>
              {sourceTable && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => {
                    const cols = set.columns
                      .map((c) => quoteIdentSql(c))
                      .join(", ");
                    const vals = rowValues
                      .map((v) => formatCellAsSql(v))
                      .join(", ");
                    const sql = `INSERT INTO ${quoteIdentSql(sourceTable)} (${cols}) VALUES (${vals});`;
                    navigator.clipboard
                      .writeText(sql)
                      .then(() => {
                        toastManager.add({ title: "Row copied as SQL", data: { kind: "info" } });
                      })
                      .catch(() => undefined);
                  }}
                >
                  <div className="ex-title">Copy row as SQL</div>
                </ContextMenu.Item>
              )}
              {onDuplicateRow &&
                (canDuplicate ? (
                  <ContextMenu.Item
                    className="example-item"
                    onClick={() => {
                      const autoIncCols = new Set(
                        (constraintInfo ?? [])
                          .filter((c) => c.isAutoIncrement)
                          .map((c) => c.name),
                      );
                      const cols: string[] = [];
                      const vals: unknown[] = [];
                      set.columns.forEach((c, i) => {
                        if (!autoIncCols.has(c)) {
                          cols.push(c);
                          vals.push(rowValues[i]);
                        }
                      });
                      onDuplicateRow(cols, vals);
                    }}
                  >
                    <div className="ex-title">Duplicate row</div>
                  </ContextMenu.Item>
                ) : (
                  <Popover.Root>
                    <Popover.Trigger
                      openOnHover
                      delay={200}
                      closeDelay={100}
                      className="example-item sql-ctx-disabled"
                      render={<div />}
                      aria-disabled="true"
                    >
                      <div className="ex-title">Duplicate row</div>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Positioner side="right" sideOffset={8}>
                        <Popover.Popup className="bui-popup sql-unique-popover">
                          {uniqueConstraintReason ||
                            "Cannot duplicate: unique constraint"}
                        </Popover.Popup>
                      </Popover.Positioner>
                    </Popover.Portal>
                  </Popover.Root>
                ))}
              {onDeleteSingleRow && (
                <ContextMenu.Item
                  className="example-item sql-ctx-danger"
                  onClick={() => onDeleteSingleRow(absoluteRow)}
                >
                  <div className="ex-title">Delete row</div>
                </ContextMenu.Item>
              )}
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    );
  };

  return (
    <div className="sql-result-set">
      <div className="sql-result-table-wrap">
        <table className="sql-result-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={
                      header.column.id === "select"
                        ? "sql-result-th-select"
                        : header.column.getIsSorted()
                          ? "sql-result-th-sorted"
                          : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={colSpan}
                  style={{ height: paddingTop, padding: 0 }}
                />
              </tr>
            )}
            {renderedRows.map(({ row }) => (
              <React.Fragment key={row.id}>{renderRow(row)}</React.Fragment>
            ))}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={colSpan}
                  style={{ height: paddingBottom, padding: 0 }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {tableRows.length === 0 && (
        <div className="sql-result-empty-msg">
          <SearchX size={14} aria-hidden="true" />
          No rows returned.
        </div>
      )}
      {/* Edit-in-modal dialog */}
      <Dialog.Root
        open={modalEditCell !== null}
        onOpenChange={(open) => {
          if (!open) {
            setModalEditCell(null);
            setModalError(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-cell-modal-popup">
            <Dialog.Title className="confirm-title">
              {modalEditCell?.binary ? "View binary cell" : "Edit cell"}
            </Dialog.Title>
            {modalEditCell && (
              <Dialog.Description className="confirm-desc">
                Column: <strong>{modalEditCell.colName}</strong>
                {modalEditCell.binary
                  ? ` · ${modalEditCell.binary.length} bytes`
                  : ""}
              </Dialog.Description>
            )}
            {modalEditCell?.binary && (
              <div className="sql-cell-modal-form sql-blob-viewer">
                <div className="sql-blob-viewer-field">
                  <span className="sql-blob-viewer-label">Hex</span>
                  <textarea
                    className="sql-cell-modal-textarea sql-cell-modal-textarea-mono"
                    value={modalEditCell.binary.hex}
                    readOnly
                    rows={8}
                    spellCheck={false}
                    aria-label={`${modalEditCell.colName} bytes as hex`}
                  />
                </div>
                <div className="sql-blob-viewer-field">
                  <span className="sql-blob-viewer-label">Base64</span>
                  <textarea
                    className="sql-cell-modal-textarea sql-cell-modal-textarea-mono"
                    value={modalEditCell.binary.base64}
                    readOnly
                    rows={3}
                    spellCheck={false}
                    aria-label={`${modalEditCell.colName} bytes as base64`}
                  />
                </div>
                <div className="confirm-actions">
                  <Dialog.Close className="confirm-btn confirm-btn-secondary">
                    Close
                  </Dialog.Close>
                </div>
              </div>
            )}
            {modalEditCell && !modalEditCell.binary && (
              <form
                className="sql-cell-modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  // Validate JSON-looking values so the user can't commit a
                  // malformed document that the engine would then reject.
                  if (looksLikeJson(modalEditCell.value)) {
                    try {
                      JSON.parse(modalEditCell.value);
                    } catch (err) {
                      setModalError(
                        `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
                      );
                      return;
                    }
                  }
                  setModalError(null);
                  onSetPendingEdit(modalEditCell.cellKey, modalEditCell.value);
                  setModalEditCell(null);
                }}
              >
                <textarea
                  className="sql-cell-modal-textarea sql-cell-modal-textarea-mono"
                  value={modalEditCell.value}
                  onChange={(e) => {
                    setModalError(null);
                    setModalEditCell({
                      ...modalEditCell,
                      value: e.target.value,
                    });
                  }}
                  autoFocus
                  rows={12}
                  spellCheck={false}
                />
                {modalError && (
                  <div className="sql-cell-modal-error">{modalError}</div>
                )}
                <div className="confirm-actions">
                  {looksLikeJson(modalEditCell.value) && (
                    <button
                      type="button"
                      className="confirm-btn confirm-btn-secondary sql-cell-modal-format"
                      onClick={() => {
                        try {
                          const formatted = JSON.stringify(
                            JSON.parse(modalEditCell.value),
                            null,
                            2,
                          );
                          setModalError(null);
                          setModalEditCell({
                            ...modalEditCell,
                            value: formatted,
                          });
                        } catch (err) {
                          setModalError(
                            `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
                          );
                        }
                      }}
                    >
                      Format JSON
                    </button>
                  )}
                  <Dialog.Close className="confirm-btn confirm-btn-secondary">
                    Cancel
                  </Dialog.Close>
                  <button
                    type="submit"
                    className="confirm-btn confirm-btn-primary"
                  >
                    Apply
                  </button>
                </div>
              </form>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      {/* Rename column dialog */}
      <Dialog.Root
        open={renameDialog !== null}
        onOpenChange={(open) => {
          if (!open) setRenameDialog(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-rename-col-popup">
            <Dialog.Title className="confirm-title">Rename column</Dialog.Title>
            {renameDialog && (
              <Dialog.Description className="confirm-desc">
                Original name: <strong>{renameDialog.originalName}</strong>
              </Dialog.Description>
            )}
            <form
              className="sql-cell-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (renameDialog === null) return;
                const trimmed = renameInput.trim();
                setRenamedColumns((prev) => {
                  const next = new Map(prev);
                  if (trimmed && trimmed !== renameDialog.originalName) {
                    next.set(renameDialog.ci, trimmed);
                  } else {
                    next.delete(renameDialog.ci);
                  }
                  return next;
                });
                setRenameDialog(null);
              }}
            >
              <input
                type="text"
                className="sql-rename-input"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                autoFocus
                placeholder="Column display name"
              />
              <div className="confirm-actions">
                <Dialog.Close className="confirm-btn confirm-btn-secondary">
                  Cancel
                </Dialog.Close>
                <button
                  type="submit"
                  className="confirm-btn confirm-btn-primary"
                  disabled={!renameInput.trim()}
                >
                  Rename
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      {/* Column statistics dialog */}
      <Dialog.Root
        open={statsDialog !== null}
        onOpenChange={(open) => {
          if (!open) setStatsDialog(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-col-stats-popup">
            <Dialog.Title className="confirm-title">
              Column statistics
            </Dialog.Title>
            {statsDialog && (
              <ColumnStatsView
                name={statsDialog.name}
                rowCount={statsDialog.rowCount}
                stats={statsDialog.stats}
              />
            )}
            <div className="confirm-actions">
              <Dialog.Close className="confirm-btn confirm-btn-primary">
                Close
              </Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/** Idle delay before a filter keystroke is actually applied (client recompute
 *  or engine re-query). Typing only updates the input's own local text, so
 *  characters are never dropped while a heavy render / reload is in flight. */
const FILTER_DEBOUNCE_MS = 300;

/** The in-grid filter field. Owns its displayed text locally so keystrokes are
 *  never lost to a re-render or a server-filter reload, and debounces the
 *  *applied* filter (`onChange`) so the table isn't re-filtered / re-queried on
 *  every keystroke. `onPendingChange` reports the debounce window so the parent
 *  can show a loading overlay over the result table. */
function FilterInput({
  value,
  onChange,
  onPendingChange,
}: {
  /** The currently *applied* filter (what the rows reflect). */
  value: string;
  /** Commit a new filter — called debounced while typing, immediately on clear. */
  onChange: (value: string) => void;
  /** Notified when a debounced commit is pending (true) / settled (false). */
  onPendingChange?: (pending: boolean) => void;
}) {
  const [text, setText] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The last value we handed to `onChange`. Lets us (a) re-sync the field when
  // the applied filter changes from the *outside* (a fresh query, a reload that
  // restores a different filter) without ever clobbering text the user is still
  // typing, and (b) skip a no-op commit when typing returns to the applied value.
  const committedRef = useRef(value);

  // External changes to the applied filter (not echoes of our own commits)
  // reset the field; in-flight typing is left untouched.
  useEffect(() => {
    if (value !== committedRef.current) {
      committedRef.current = value;
      setText(value);
    }
  }, [value]);

  const clearTimer = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  // Commit with no debounce (clear button / Escape) so clearing is instant.
  const commitNow = useCallback(
    (next: string) => {
      clearTimer();
      committedRef.current = next;
      setText(next);
      onPendingChange?.(false);
      onChange(next);
    },
    [clearTimer, onChange, onPendingChange],
  );

  const handleType = useCallback(
    (next: string) => {
      setText(next); // instant + local: keystrokes are never dropped
      clearTimer();
      if (next === committedRef.current) {
        // Typed back to the applied value — nothing to (re-)apply.
        onPendingChange?.(false);
        return;
      }
      onPendingChange?.(true);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        committedRef.current = next;
        onPendingChange?.(false);
        onChange(next);
      }, FILTER_DEBOUNCE_MS);
    },
    [clearTimer, onChange, onPendingChange],
  );

  // Clear any pending debounce (and its overlay) on unmount.
  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <div className="sql-result-filter">
      <Search size={12} aria-hidden="true" className="sql-result-filter-icon" />
      <input
        className="sql-result-filter-input"
        type="text"
        value={text}
        placeholder="Filter rows…"
        aria-label="Filter rows in this result"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => handleType(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && text) {
            // Clear (and don't let the document-level Esc handler also
            // discard pending edits).
            e.preventDefault();
            e.stopPropagation();
            commitNow("");
          }
        }}
      />
      {text && (
        <button
          type="button"
          className="sql-result-filter-clear"
          aria-label="Clear filter"
          title="Clear filter"
          onClick={() => commitNow("")}
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function ResultPager({
  totalRows,
  loadedRows,
  pageSize,
  page,
  onPageChange,
  onPageSizeChange,
  deletable,
  editable,
  editCount,
  selectedCount,
  onRequestDelete,
  onCommitEdits,
  onDiscardEdits,
  elapsedMs,
  elapsedIsError,
  filterValue,
  onFilterChange,
  onFilterPendingChange,
  filterUnfilteredTotal,
  children,
}: {
  totalRows: number;
  loadedRows?: number;
  index: number;
  pageSize: number;
  page: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  deletable: boolean;
  editable: boolean;
  editCount: number;
  selectedCount: number;
  onRequestDelete: () => void;
  onCommitEdits: () => void;
  onDiscardEdits: () => void;
  elapsedMs?: number;
  elapsedIsError?: boolean;
  /** In-grid filter text. When `onFilterChange` is provided the filter field
   *  is shown; omit both to hide it. */
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  /** Notified while a debounced filter commit is pending, so the parent can
   *  show a loading overlay over the result table. */
  onFilterPendingChange?: (pending: boolean) => void;
  /** Full row count before filtering, for the "filtered from N" readout. */
  filterUnfilteredTotal?: number;
  children?: React.ReactNode;
}) {
  const effective = pageSize > 0 ? pageSize : Math.max(totalRows, 1);
  const totalPages = Math.max(1, Math.ceil(totalRows / effective));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * effective;
  const end =
    pageSize === 0 && loadedRows !== undefined
      ? Math.min(totalRows, loadedRows)
      : Math.min(totalRows, start + effective);

  const [pageInput, setPageInput] = useState(String(safePage + 1));
  const [prevSafePage, setPrevSafePage] = useState(safePage);
  if (prevSafePage !== safePage) {
    setPrevSafePage(safePage);
    setPageInput(String(safePage + 1));
  }

  const commitPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= totalPages) {
      onPageChange(n - 1);
    } else {
      setPageInput(String(safePage + 1));
    }
  };

  // The in-grid filter field is offered whenever a change handler is wired and
  // there's at least one row to filter. It's always interactive: in-memory
  // results filter client-side, engine-paged results push the filter down to
  // SQL (the parent decides). `isFiltering` (a non-blank value) switches the
  // row readout to the "of N" / "filtered from N" form.
  const filterText = filterValue ?? "";
  const showFilter = !!onFilterChange && (filterUnfilteredTotal ?? 0) > 0;
  const isFiltering = showFilter && filterText.trim().length > 0;

  return (
    <div className="sql-result-pager">
      {showFilter && (
        // ResultPager is itself keyed by result-set index at its call site, so
        // FilterInput remounts (and its local text resets) when the active set
        // changes — each set keeps its own filter.
        <FilterInput
          value={filterText}
          onChange={(v) => onFilterChange?.(v)}
          onPendingChange={onFilterPendingChange}
        />
      )}
      <span className="sql-result-pager-info">
        {editable && editCount > 0 ? (
          <>
            {editCount} cell{editCount === 1 ? "" : "s"} edited
          </>
        ) : deletable && selectedCount > 0 ? (
          <>
            {selectedCount} row{selectedCount === 1 ? "" : "s"} selected
          </>
        ) : totalRows === 0 ? (
          isFiltering ? (
            <>
              No matching rows
              {filterUnfilteredTotal != null && (
                <span className="sql-result-pager-filtered-note">
                  {" "}
                  (of {filterUnfilteredTotal})
                </span>
              )}
            </>
          ) : (
            "0 rows"
          )
        ) : (
          <>
            Rows {start + 1}–{end} of{" "}
            <strong className="sql-result-pager-total">{totalRows}</strong>
            {isFiltering && filterUnfilteredTotal != null && (
              <span className="sql-result-pager-filtered-note">
                {" "}
                · filtered from {filterUnfilteredTotal}
              </span>
            )}
          </>
        )}
        {elapsedMs != null && (
          <span
            className={`sql-pager-elapsed${elapsedIsError ? " sql-pager-elapsed-err" : ""}`}
            title="Last execution time"
            aria-label="Last execution time"
          >
            <Clock size={11} aria-hidden="true" />
            <span>{(elapsedMs / 1000).toFixed(3)}s</span>
          </span>
        )}
      </span>
      {editable && editCount > 0 && (
        <span className="sql-edit-actions">
          <button
            type="button"
            className="sql-edit-cancel-btn"
            onClick={onDiscardEdits}
            title="Discard pending edits (Esc)"
          >
            Cancel
          </button>
          <button
            type="button"
            className="sql-edit-commit-btn"
            onClick={onCommitEdits}
            title="Commit pending edits (Ctrl/⌘+Enter)"
          >
            Update {editCount} cell{editCount === 1 ? "" : "s"}…
          </button>
        </span>
      )}
      {deletable && selectedCount > 0 && (
        <button
          type="button"
          className="sql-result-selection-delete"
          onClick={onRequestDelete}
        >
          <Trash2 size={12} aria-hidden="true" />
          <span>Delete selected</span>
        </button>
      )}
      <div className="sql-result-pager-size">
        <span>Rows per page</span>
        <Select.Root
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <Select.Trigger
            className="sql-result-pager-size-trigger"
            aria-label="Rows per page"
          >
            <Select.Value>
              {PAGE_SIZE_OPTIONS.find((opt) => opt.value === pageSize)?.label ??
                String(pageSize)}
            </Select.Value>
            <ChevronDown size={10} aria-hidden="true" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={4} alignItemWithTrigger={false}>
              <Select.Popup className="bui-select-popup">
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={String(opt.value)}
                    className="bui-select-item"
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
      <div className="sql-result-pager-controls">
        {safePage > 0 && (
          <button
            type="button"
            className="sql-result-pager-btn"
            onClick={() => onPageChange(0)}
            aria-label="First page"
            title="First page"
          >
            <ChevronsLeft size={13} aria-hidden="true" />
          </button>
        )}
        {safePage > 0 && (
          <button
            type="button"
            className="sql-result-pager-btn"
            onClick={() => onPageChange(Math.max(0, safePage - 1))}
            aria-label="Previous page"
            title="Previous page"
          >
            <ChevronLeft size={13} aria-hidden="true" />
          </button>
        )}
        <span className="sql-result-pager-page">
          <input
            className="sql-result-pager-page-input"
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPageInput();
              else if (e.key === "Escape") setPageInput(String(safePage + 1));
            }}
            aria-label="Page number"
          />
          {" / "}
          {totalPages}
        </span>
        {safePage < totalPages - 1 && (
          <button
            type="button"
            className="sql-result-pager-btn"
            onClick={() => onPageChange(Math.min(totalPages - 1, safePage + 1))}
            aria-label="Next page"
            title="Next page"
          >
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        )}
        {safePage < totalPages - 1 && (
          <button
            type="button"
            className="sql-result-pager-btn"
            onClick={() => onPageChange(totalPages - 1)}
            aria-label="Last page"
            title="Last page"
          >
            <ChevronsRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
