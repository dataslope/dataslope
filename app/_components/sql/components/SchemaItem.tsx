"use client";

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Popover } from "@base-ui-components/react/popover";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Menu } from "@base-ui-components/react/menu";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  Table,
} from "lucide-react";
import { IoLink } from "react-icons/io5";
import { MdOutlineKey } from "react-icons/md";
import type { ForeignKeyInfo, TableColumnInfo } from "../../runtime/sqlite";
import { SINGLE_CLICK_DELAY_MS } from "../constants";

export interface SchemaItemProps {
  name: string;
  kind: "table" | "view";
  expanded: boolean;
  columns: TableColumnInfo[] | undefined;
  foreignKeys: ForeignKeyInfo[] | undefined;
  onToggleExpanded: (name: string) => void;
  onPreview: (name: string, kind: "table" | "view") => void;
  /** Tables open the Modify Structure drawer; views still use the
   *  read-only "View Structure" PRAGMA path because their structure
   *  is derived from their CREATE VIEW statement, not editable. */
  onModifyStructure?: (name: string) => void;
  onStructure?: (name: string, kind: "table" | "view") => void;
  /** Tables only — opens the Add Row drawer. */
  onAddRow?: (name: string) => void;
  onCount: (name: string, kind: "table" | "view") => void;
  onCopy: (name: string) => void;
  /** Tables only — Truncate is meaningless on a view. */
  onTruncate?: (name: string) => void;
  onDrop: (name: string, kind: "table" | "view") => void;
  onViewDDL: (name: string, kind: "table" | "view") => void;
  onExport: (name: string, format: "csv" | "json" | "sql" | "parquet" | "xlsx") => void;
  onGetRowCount: (name: string) => number;
}

export function SchemaItem({
  name,
  kind,
  expanded,
  columns,
  foreignKeys,
  onToggleExpanded,
  onPreview,
  onModifyStructure,
  onStructure,
  onAddRow,
  onCount,
  onCopy,
  onTruncate,
  onDrop,
  onViewDDL,
  onExport,
  onGetRowCount,
}: SchemaItemProps) {
  const [exportRowCount, setExportRowCount] = useState<number | null>(null);
  const ensureRowCount = useCallback(() => {
    if (exportRowCount === null) {
      setExportRowCount(onGetRowCount(name));
    }
  }, [exportRowCount, onGetRowCount, name]);

  // Hover-to-open state for the Export submenu.
  const [exportOpen, setExportOpen] = useState(false);
  const exportCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleExportPointerEnter = useCallback(() => {
    if (exportCloseTimer.current) {
      clearTimeout(exportCloseTimer.current);
      exportCloseTimer.current = null;
    }
    ensureRowCount();
    setExportOpen(true);
  }, [ensureRowCount]);
  const handleExportPointerLeave = useCallback(() => {
    exportCloseTimer.current = setTimeout(() => setExportOpen(false), 120);
  }, []);
  const Icon = kind === "view" ? Eye : Table;
  const pkCount = useMemo(
    () => (columns ?? []).filter((c) => c.pk > 0).length,
    [columns],
  );
  const fkByCol = useMemo(() => {
    const m = new Map<string, ForeignKeyInfo>();
    for (const fk of foreignKeys ?? []) m.set(fk.from, fk);
    return m;
  }, [foreignKeys]);
  // Click vs. double-click disambiguation. The native browser fires a
  // `click` event for each press inside a double-click, so without a
  // delay a double-click would also toggle the row's expanded state.
  const clickTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
    };
  }, []);
  const handleSingleClick = useCallback(() => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      onToggleExpanded(name);
    }, SINGLE_CLICK_DELAY_MS);
  }, [name, onToggleExpanded]);
  const handleDoubleClick = useCallback(() => {
    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onPreview(name, kind);
  }, [name, kind, onPreview]);
  const itemHint = `Double-click to preview, click to ${expanded ? "collapse" : "expand"}`;
  return (
    <div className="sql-tree-entity">
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <div {...props} className="sql-tree-entity-trigger">
              <Popover.Root>
                <Popover.Trigger
                  openOnHover
                  delay={180}
                  closeDelay={80}
                  render={(triggerProps) => (
                    <button
                      type="button"
                      {...triggerProps}
                      className="sql-tree-item"
                      onClick={handleSingleClick}
                      onDoubleClick={handleDoubleClick}
                      aria-expanded={expanded}
                    >
                      <span className="sql-tree-chevron" aria-hidden="true">
                        {expanded ? (
                          <ChevronDown size={11} />
                        ) : (
                          <ChevronRight size={11} />
                        )}
                      </span>
                      <Icon size={12} aria-hidden="true" />
                      <span className="sql-tree-item-name">{name}</span>
                    </button>
                  )}
                />
                <Popover.Portal>
                  <Popover.Positioner
                    className="sql-tree-popover-positioner"
                    sideOffset={6}
                    side="right"
                    align="start"
                  >
                    <Popover.Popup className="bui-popup sql-tree-popover">
                      <span className="sql-tree-popover-name">
                        <Icon size={12} aria-hidden="true" />
                        <strong>{name}</strong>
                      </span>
                      <span>{itemHint}</span>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </Popover.Root>
              {expanded && (
                <ul className="sql-tree-columns" role="list">
                  {columns === undefined ? (
                    <li className="sql-tree-column-loading">Loading…</li>
                  ) : columns.length === 0 ? (
                    <li className="sql-tree-column-loading">No columns.</li>
                  ) : (
                    columns.map((c) => {
                      const fk = fkByCol.get(c.name);
                      return (
                        <li key={c.cid} className="sql-tree-column">
                          <span className="sql-tree-column-icons">
                            {c.pk > 0 && (
                              <Popover.Root>
                                <Popover.Trigger
                                  openOnHover
                                  delay={150}
                                  closeDelay={100}
                                  className="sql-tree-column-pk"
                                  aria-label={pkCount > 1 ? "Composite primary key" : "Primary key"}
                                >
                                  <MdOutlineKey size={11} aria-hidden="true" />
                                </Popover.Trigger>
                                <Popover.Portal>
                                  <Popover.Positioner
                                    sideOffset={6}
                                    side="right"
                                    className="sql-key-icon-popover-positioner"
                                  >
                                    <Popover.Popup className="bui-popup sql-key-icon-popover">
                                      <MdOutlineKey size={11} className="sql-key-icon-popover-icon" aria-hidden="true" />
                                      <span>{pkCount > 1 ? "Composite primary key" : "Primary key"}</span>
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
                                  className="sql-tree-column-fk"
                                  aria-label={`Foreign key → ${fk.table}.${fk.to}`}
                                >
                                  <IoLink size={12} aria-hidden="true" />
                                </Popover.Trigger>
                                <Popover.Portal>
                                  <Popover.Positioner
                                    sideOffset={6}
                                    side="right"
                                    className="sql-key-icon-popover-positioner"
                                  >
                                    <Popover.Popup className="bui-popup sql-key-icon-popover">
                                      <IoLink size={12} className="sql-key-icon-popover-icon" aria-hidden="true" />
                                      <span>Foreign key</span>
                                    </Popover.Popup>
                                  </Popover.Positioner>
                                </Popover.Portal>
                              </Popover.Root>
                            )}
                          </span>
                          <span className="sql-tree-column-name">{c.name}</span>
                          <span className="sql-tree-column-type">
                            {c.type || "—"}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner sideOffset={6}>
            <ContextMenu.Popup className="bui-popup examples-dropdown">
              <div className="ctx-table-name">
                <Icon size={12} className="ctx-name-icon" aria-hidden="true" />
                {name}
              </div>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onPreview(name, kind)}
              >
                <div className="ex-title">View Data</div>
              </ContextMenu.Item>
              {kind === "table" && onAddRow && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => onAddRow(name)}
                >
                  <div className="ex-title">Add Row</div>
                </ContextMenu.Item>
              )}
              {kind === "table" && onModifyStructure ? (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => onModifyStructure(name)}
                >
                  <div className="ex-title">View/Edit Structure</div>
                </ContextMenu.Item>
              ) : (
                onStructure && (
                  <ContextMenu.Item
                    className="example-item"
                    onClick={() => onStructure(name, kind)}
                  >
                    <div className="ex-title">View/Edit Structure</div>
                  </ContextMenu.Item>
                )
              )}
              <ContextMenu.Item
                className="example-item"
                onClick={() => onCount(name, kind)}
              >
                <div className="ex-title">Count Rows</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onViewDDL(name, kind)}
              >
                <div className="ex-title">View DDL</div>
              </ContextMenu.Item>
              <ContextMenu.Item
                className="example-item"
                onClick={() => onCopy(name)}
              >
                <div className="ex-title">Copy Name</div>
              </ContextMenu.Item>
              <Menu.Root open={exportOpen} onOpenChange={setExportOpen}>
                <Menu.Trigger
                  className="example-item ctx-export-trigger ctx-export-trigger-bordered"
                  onPointerEnter={handleExportPointerEnter}
                  onPointerLeave={handleExportPointerLeave}
                >
                  <div className="ex-title ctx-export-title">
                    Export
                    <ChevronRight size={10} className="ctx-export-arrow" />
                  </div>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner side="right" align="start" sideOffset={4}>
                    <Menu.Popup
                      className="bui-popup examples-dropdown export-dropdown"
                      onPointerEnter={handleExportPointerEnter}
                      onPointerLeave={handleExportPointerLeave}
                    >
                      {exportRowCount !== null && (
                        <div className="sql-result-export-group-label">
                          {exportRowCount.toLocaleString()} rows
                        </div>
                      )}
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "csv")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">CSV <span className="ext-badge">.csv</span></div>
                          <div className="ex-desc">Comma-separated values</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "json")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">JSON <span className="ext-badge">.json</span></div>
                          <div className="ex-desc">Array of row objects</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "sql")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">SQL <span className="ext-badge">.sql</span></div>
                          <div className="ex-desc">INSERT statements</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "parquet")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">Parquet <span className="ext-badge">.parquet</span></div>
                          <div className="ex-desc">Apache Parquet binary</div>
                        </div>
                      </Menu.Item>
                      <Menu.Item
                        className="example-item export-item"
                        onClick={() => onExport(name, "xlsx")}
                      >
                        <div className="export-item-text">
                          <div className="ex-title">Excel <span className="ext-badge">.xlsx</span></div>
                          <div className="ex-desc">Excel workbook (single sheet)</div>
                        </div>
                      </Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
              {kind === "table" && onTruncate && (
                <ContextMenu.Item
                  className="example-item"
                  onClick={() => onTruncate(name)}
                >
                  <div className="ex-title">Truncate</div>
                </ContextMenu.Item>
              )}
              <ContextMenu.Item
                className="example-item"
                onClick={() => onDrop(name, kind)}
              >
                <div className="ex-title">
                  Drop {kind === "view" ? "View" : "Table"}
                </div>
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    </div>
  );
}
