"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  Minus,
  SearchX,
  ToggleLeft,
  Trash2,
  Type,
} from "lucide-react";
import { MdOutlineKey } from "react-icons/md";
import { IoLink } from "react-icons/io5";
import type { QueryExecResult } from "sql.js";
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
import { stripTopLevelOrderBy } from "../utils/sqlAnalysis";

// ────────────────────────────────────────────────────────────────────────
// Local helpers
// ────────────────────────────────────────────────────────────────────────

function getSqliteErrorHint(error: string): string | null {
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
  return null;
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
              <ArrowDownToLine size={13} aria-hidden="true" />
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

export function ResultView({
  result,
  loading,
  keyHints,
  sourceTable,
  constraintInfo,
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
  keyHints?: ColumnKeyHints;
  sourceTable?: string;
  constraintInfo?: ColumnConstraintInfo[];
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
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [pendingDeleteSingleRow, setPendingDeleteSingleRow] = useState<{
    setIdx: number;
    absoluteRow: number;
  } | null>(null);
  const preserveOnNextResultRef = useRef<{
    selectedByIndex: SelectedRowsByResult;
    pendingEditsByIndex: PendingEditsByResult;
    sortingByIndex: Record<number, SortingState>;
  } | null>(null);

  const [activeSetIdx, setActiveSetIdx] = useState<number>(0);
  const flashWrapperRef = useRef<HTMLDivElement>(null);
  const noResultsRef = useRef<HTMLDivElement>(null);
  const resultSetsScrollRef = useRef<HTMLDivElement>(null);
  const prevResultRef = useRef<QueryRunResult | null>(null);

  useEffect(() => {
    const preserved = preserveOnNextResultRef.current;
    preserveOnNextResultRef.current = null;
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setPageStates({});
    setSelectedByIndex(preserved?.selectedByIndex ?? {});
    setPendingDelete(null);
    setPendingDeleteSingleRow(null);
    setPendingEditsByIndex(preserved?.pendingEditsByIndex ?? {});
    setSortingByIndex(preserved?.sortingByIndex ?? {});
    setActiveEditCellByIndex({});
    setActiveSetIdx(0);
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
    }) => {
      preserveOnNextResultRef.current = {
        selectedByIndex:
          overrides?.selectedByIndex ?? cloneSelections(selectedByIndex),
        pendingEditsByIndex:
          overrides?.pendingEditsByIndex ?? clonePendingEdits(pendingEditsByIndex),
        sortingByIndex: overrides?.sortingByIndex ?? { ...sortingByIndex },
      };
    },
    [selectedByIndex, pendingEditsByIndex, sortingByIndex],
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
  }, []);

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

  const commitEdits = useCallback(
    (setIdx: number, set: QueryExecResult) => {
      if (!sourceTable || !onUpdateRows) return;
      const edits = pendingEditsByIndex[setIdx];
      if (!edits || edits.size === 0) return;
      const updates: Array<{
        rowIndex: number;
        column: string;
        value: unknown;
      }> = [];
      for (const [cellKey, value] of edits) {
        const [rowStr, colStr] = cellKey.split(":");
        const absoluteRow = Number(rowStr);
        const colIdx = Number(colStr);
        const colName = set.columns[colIdx];
        if (!colName) continue;
        updates.push({ rowIndex: absoluteRow, column: colName, value });
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
            refetchSql = `${stripTopLevelOrderBy(baseSql)} ORDER BY ${quoteIdentSql(parsed.name)} ${sorting[0].desc ? "DESC" : "ASC"}`;
          }
        }
        refetchSql = refetchSql ?? baseSql;
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
      preserveStateForReload,
    ],
  );

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
      <div className="welcome">
        <div className="welcome-icon">⌬</div>
        <h3>Loading SQLite engine…</h3>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="welcome">
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
    const hint = getSqliteErrorHint(result.error);
    return (
      <div className="sql-result-error">
        <div className="sql-result-error-title">Query failed</div>
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
    const sorting = sortingByIndex[idx] ?? [];
    let totalRows: number;
    let currentPage: number;
    let startIdx: number;
    let visibleRows: QueryExecResult["values"];
    let originalIndices: number[];
    if (isLazy) {
      const effective =
        globalPageSize > 0
          ? globalPageSize
          : Math.max(result.lazyTotalCount ?? 0, 1);
      totalRows = result.lazyTotalCount ?? set.values.length;
      currentPage = isInfiniteAll ? 0 : (result.lazyPage ?? 0);
      startIdx = isInfiniteAll
        ? 0
        : currentPage * (result.lazyPageSize ?? effective);
      visibleRows = set.values;
      originalIndices = set.values.map((_, ri) => startIdx + ri);
    } else {
      const st = getState(idx);
      totalRows = set.values.length;
      const effective =
        globalPageSize > 0 ? globalPageSize : Math.max(totalRows, 1);
      const totalPages = Math.max(1, Math.ceil(totalRows / effective));
      currentPage = Math.min(st.page, totalPages - 1);
      startIdx = currentPage * effective;
      const indexed = set.values.map((values, i) => ({
        values,
        originalIndex: i,
      }));
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
      sorting,
      totalRows,
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
              onClick={() => setActiveSetIdx(idx)}
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
                  const baseForSort = stripTopLevelOrderBy(baseSql);
                  const newSortingByIndex = { ...sortingByIndex, [idx]: resolved };
                  if (resolved.length > 0) {
                    const parsed = parseColumnId(resolved[0].id);
                    if (parsed) {
                      const sortedSql = `${baseForSort} ORDER BY ${quoteIdentSql(parsed.name)} ${resolved[0].desc ? "DESC" : "ASC"}`;
                      preserveStateForReload({ sortingByIndex: newSortingByIndex });
                      onLoadPage(sortedSql, 0);
                    }
                  } else {
                    preserveStateForReload({ sortingByIndex: newSortingByIndex });
                    onLoadPage(baseForSort, 0);
                  }
                }
              };
              const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
              const baseForSort = stripTopLevelOrderBy(baseSql);
              let effectiveLazySql = baseForSort;
              if (sorting.length > 0) {
                const parsed = parseColumnId(sorting[0].id);
                if (parsed) {
                  effectiveLazySql = `${baseForSort} ORDER BY ${quoteIdentSql(parsed.name)} ${sorting[0].desc ? "DESC" : "ASC"}`;
                }
              }
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
                  virtualized={isInfiniteAll}
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
      </div>
      <div className="sql-result-pagers">
        {activeSetData &&
          (() => {
            const idx = safeSetIdx;
            const {
              set,
              isLazy,
              isInfiniteAll,
              sorting,
              totalRows,
              currentPage,
              visibleRows,
            } = activeSetData;
            let handlePageChange: (p: number) => void;
            let handlePageSizeChange: (s: number) => void;
            if (isLazy) {
              const baseSql = result.lazyBaseSql ?? result.lazySql ?? "";
              const baseForSort = stripTopLevelOrderBy(baseSql);
              let effectiveLazySql = baseForSort;
              if (sorting.length > 0) {
                const parsed = parseColumnId(sorting[0].id);
                if (parsed) {
                  effectiveLazySql = `${baseForSort} ORDER BY ${quoteIdentSql(parsed.name)} ${sorting[0].desc ? "DESC" : "ASC"}`;
                }
              }
              handlePageChange = (p: number) => {
                preserveStateForReload();
                onLoadPage(effectiveLazySql, p);
              };
              handlePageSizeChange = (s: number) => {
                preserveStateForReload();
                onSetGlobalPageSize(s);
                onLoadPage(effectiveLazySql, 0, s);
              };
            } else {
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
            const effectivePageSize =
              globalPageSize > 0 ? globalPageSize : Math.max(totalRows, 1);
            const hasMultiplePages =
              globalPageSize > 0 && totalRows > effectivePageSize;
            const safePage = Math.min(
              currentPage,
              Math.max(0, Math.ceil(totalRows / effectivePageSize) - 1),
            );
            const pageStart = safePage * effectivePageSize;
            const currentPageRows = Math.min(
              totalRows - pageStart,
              effectivePageSize,
            );
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
                >
                  {onExportResultSet && (
                    <ResultSetExportButton
                      hasMultiplePages={hasMultiplePages}
                      currentPageRows={currentPageRows}
                      totalRows={totalRows}
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
  const rightClickedCellRef = useRef<{
    colIdx: number;
    value: unknown;
  } | null>(null);

  const [modalEditCell, setModalEditCell] = useState<{
    cellKey: string;
    colName: string;
    value: string;
  } | null>(null);

  // ── Column rename state ────────────────────────────────────────────────
  const [renamedColumns, setRenamedColumns] = useState<Map<number, string>>(
    new Map(),
  );
  const [renameDialog, setRenameDialog] = useState<{
    ci: number;
    originalName: string;
  } | null>(null);
  const [renameInput, setRenameInput] = useState("");

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
    const blocking = constraintInfo.filter(
      (c) => (c.isPrimaryKey && !c.isAutoIncrement) || c.isUnique,
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
                    onToggleVisible(originalIndices, v === true)
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
      ...set.columns.map(
        (c, ci) =>
          ({
            id: `col-${ci}-${c}`,
            accessorFn: (row) => row.values[ci],
            meta: { ci },
            header: ({ column }) => {
              const isPk = keyHints?.pk.has(c) ?? false;
              const fk = keyHints?.fk.get(c);
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
                      </ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.Root>
              );
            },
            cell: (info) => {
              if (!editable) {
                return formatCellValue(info.getValue());
              }
              const absoluteRow = info.row.original.absoluteRow;
              const cellKey = `${absoluteRow}:${ci}`;
              const isActiveEdit = activeEditCell === cellKey;
              const hasPendingEdit = pendingEdits?.has(cellKey) ?? false;
              const pendingValue = pendingEdits?.get(cellKey);
              const rawValue = info.getValue();
              const isNumeric =
                rawValue !== null && typeof rawValue === "number";
              if (isActiveEdit) {
                const editVal = hasPendingEdit
                  ? String(pendingValue ?? "")
                  : formatCellValue(rawValue);
                return (
                  <input
                    className="sql-cell-input"
                    defaultValue={editVal}
                    autoFocus
                    type="text"
                    inputMode={isNumeric ? "decimal" : undefined}
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
                </span>
              );
            },
          }) satisfies ColumnDef<ResultTableRow>,
      ),
    ],
    [
      activeEditCell,
      allVisibleSelected,
      deletable,
      editable,
      keyHints,
      onClearPendingEdit,
      onSetActiveEditCell,
      onSetPendingEdit,
      onToggleRow,
      onToggleVisible,
      pendingEdits,
      selectedRows,
      set.columns,
      set.columnTypes,
      set.values,
      someVisibleSelected,
      originalIndices,
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
            editable && !isSelect && ci >= 0
              ? () => onSetActiveEditCell(cellKey)
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
                  navigator.clipboard.writeText(text).catch(() => undefined);
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
                    const current = pendingEdits?.has(cellKey)
                      ? String(pendingEdits.get(cellKey) ?? "")
                      : formatCellValue(cell.value);
                    setModalEditCell({ cellKey, colName, value: current });
                  }}
                >
                  <div className="ex-title">Edit cell in modal</div>
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
                    navigator.clipboard.writeText(sql).catch(() => undefined);
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
          if (!open) setModalEditCell(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="confirm-backdrop" />
          <Dialog.Popup className="confirm-popup sql-cell-modal-popup">
            <Dialog.Title className="confirm-title">Edit cell</Dialog.Title>
            {modalEditCell && (
              <Dialog.Description className="confirm-desc">
                Column: <strong>{modalEditCell.colName}</strong>
              </Dialog.Description>
            )}
            {modalEditCell && (
              <form
                className="sql-cell-modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSetPendingEdit(modalEditCell.cellKey, modalEditCell.value);
                  setModalEditCell(null);
                }}
              >
                <textarea
                  className="sql-cell-modal-textarea"
                  value={modalEditCell.value}
                  onChange={(e) =>
                    setModalEditCell({
                      ...modalEditCell,
                      value: e.target.value,
                    })
                  }
                  autoFocus
                  rows={8}
                />
                <div className="confirm-actions">
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
    </div>
  );
}

export function ResultPager({
  totalRows,
  loadedRows,
  index,
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

  return (
    <div className="sql-result-pager">
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
          "0 rows"
        ) : (
          <>
            Rows {start + 1}–{end} of{" "}
            <strong className="sql-result-pager-total">{totalRows}</strong>
          </>
        )}
      </span>
      {editable && editCount > 0 && (
        <button
          type="button"
          className="sql-edit-commit-btn"
          onClick={onCommitEdits}
        >
          Update {editCount} cell{editCount === 1 ? "" : "s"}…
        </button>
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
