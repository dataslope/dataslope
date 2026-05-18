"use client";

import { useState, useEffect, useRef, useContext, createContext, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, ElkEdgeSection, ElkPoint } from "elkjs";
import type { TableColumnInfo, ForeignKeyInfo } from "./runtime/sqlite";
import { MdOutlineKey } from "react-icons/md";
import { IoLink } from "react-icons/io5";
import { ChevronRight, Table } from "lucide-react";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { Menu } from "@base-ui-components/react/menu";
import { Popover } from "@base-ui-components/react/popover";

// ────────────────────────────────────────────────────────────────────────────
// Contexts — table action callbacks + node selection state
// ────────────────────────────────────────────────────────────────────────────

interface ErTableActions {
  onPreview: (name: string) => void;
  onModifyStructure?: (name: string) => void;
  onAddRow?: (name: string) => void;
  onCount: (name: string) => void;
  onCopy: (name: string) => void;
  onTruncate?: (name: string) => void;
  onDrop: (name: string) => void;
  onViewDDL: (name: string) => void;
  onExport: (name: string, format: "csv" | "json" | "sql" | "parquet" | "xlsx") => void;
  onGetRowCount: (name: string) => number | Promise<number>;
}

interface ErSelectionState {
  selectedTable: string | null;
  connectedTables: Set<string>;
  connectedEdgeIds: Set<string>;
}

const TableActionsContext = createContext<ErTableActions | null>(null);
const SelectionContext = createContext<ErSelectionState>({
  selectedTable: null,
  connectedTables: new Set(),
  connectedEdgeIds: new Set(),
});

// ────────────────────────────────────────────────────────────────────────────
// Node dimensions (must match CSS for correct port positions)
// ────────────────────────────────────────────────────────────────────────────

const NODE_W = 230;
const COL_HEADER_H = 36;
const COL_ROW_H = 25;
const COL_FOOTER_PAD = 8;
// Top padding of the .er-table-columns section (must match the CSS).
// Used to vertically center port positions on each column row.
const COL_TOP_PAD = 4;

function calcNodeHeight(colCount: number): number {
  return COL_HEADER_H + Math.max(colCount, 1) * COL_ROW_H + COL_FOOTER_PAD;
}

// ────────────────────────────────────────────────────────────────────────────
// Custom table node
// ────────────────────────────────────────────────────────────────────────────

interface ErTableNodeData {
  tableName: string;
  columns: TableColumnInfo[];
  fkColumns: Set<string>;
  [key: string]: unknown;
}

function columnHandleId(
  columnName: string,
  side: "left" | "right",
  type: "source" | "target",
): string {
  return `${columnName}::${side}::${type}`;
}

function ErTableNode({ data }: NodeProps) {
  const { tableName, columns, fkColumns } = data as ErTableNodeData;
  const actions = useContext(TableActionsContext);
  const selection = useContext(SelectionContext);

  // Determine whether this node should be visually dimmed.
  const isActive =
    !selection.selectedTable ||
    selection.connectedTables.has(tableName);

  // Count primary key columns to detect composite PKs.
  const pkCount = (columns as TableColumnInfo[]).filter((c) => c.pk > 0).length;

  // Row count is fetched lazily the first time the Export submenu opens.
  const [exportRowCount, setExportRowCount] = useState<number | null>(null);
  const ensureRowCount = useCallback(() => {
    if (exportRowCount === null && actions?.onGetRowCount) {
      void Promise.resolve(actions.onGetRowCount(tableName)).then(setExportRowCount);
    }
  }, [exportRowCount, actions, tableName]);

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

  const nodeContent = (
    <div className="er-table-node" style={isActive ? undefined : { opacity: 0.4 }}>
      <div className="er-table-header">
        <Table size={12} className="er-table-header-icon" aria-hidden="true" />
        <span className="er-table-header-name">{tableName}</span>
      </div>
      <div className="er-table-columns">
        {(columns as TableColumnInfo[]).map((col) => (
          <div key={col.name} className="er-table-col-row">
            <Handle
              id={columnHandleId(col.name, "left", "source")}
              type="source"
              position={Position.Left}
              className="er-table-col-handle er-table-col-handle-left"
            />
            <Handle
              id={columnHandleId(col.name, "left", "target")}
              type="target"
              position={Position.Left}
              className="er-table-col-handle er-table-col-handle-left"
            />
            <span className="er-table-col-icons">
              {col.pk > 0 && (
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={120}
                    closeDelay={80}
                    render={(triggerProps) => (
                      <span {...triggerProps} className="er-col-icon-trigger">
                        <MdOutlineKey
                          className="er-col-icon er-pk-icon"
                          aria-label={pkCount > 1 ? "Composite primary key" : "Primary key"}
                        />
                      </span>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner sideOffset={6} side="top" className="er-icon-popover-positioner">
                      <Popover.Popup className="bui-popup er-icon-popover">
                        <MdOutlineKey className="er-icon-popover-icon er-pk-icon" />
                        <span>{pkCount > 1 ? "Composite primary key" : "Primary key"}</span>
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              )}
              {(fkColumns as Set<string>).has(col.name) && (
                <Popover.Root>
                  <Popover.Trigger
                    openOnHover
                    delay={120}
                    closeDelay={80}
                    render={(triggerProps) => (
                      <span {...triggerProps} className="er-col-icon-trigger">
                        <IoLink
                          className="er-col-icon er-fk-icon"
                          aria-label="Foreign key"
                        />
                      </span>
                    )}
                  />
                  <Popover.Portal>
                    <Popover.Positioner sideOffset={6} side="top" className="er-icon-popover-positioner">
                      <Popover.Popup className="bui-popup er-icon-popover">
                        <IoLink className="er-icon-popover-icon er-fk-icon" />
                        <span>Foreign key</span>
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              )}
            </span>
            <span className="er-table-col-name">{col.name}</span>
            <span className="er-table-col-type">{col.type || "—"}</span>
            <Handle
              id={columnHandleId(col.name, "right", "source")}
              type="source"
              position={Position.Right}
              className="er-table-col-handle er-table-col-handle-right"
            />
            <Handle
              id={columnHandleId(col.name, "right", "target")}
              type="target"
              position={Position.Right}
              className="er-table-col-handle er-table-col-handle-right"
            />
          </div>
        ))}
        {(columns as TableColumnInfo[]).length === 0 && (
          <div className="er-table-col-row er-table-col-empty">
            No columns
          </div>
        )}
      </div>
    </div>
  );

  if (!actions) return nodeContent;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={(props) => <div {...props}>{nodeContent}</div>}
      />
      <ContextMenu.Portal>
        <ContextMenu.Positioner sideOffset={6}>
          <ContextMenu.Popup className="bui-popup examples-dropdown">
            <div className="ctx-table-name">
              <Table size={12} className="ctx-name-icon" aria-hidden="true" />
              {tableName}
            </div>
            <ContextMenu.Item
              className="example-item"
              onClick={() => actions.onPreview(tableName)}
            >
              <div className="ex-title">View Data</div>
            </ContextMenu.Item>
            {actions.onAddRow && (
              <ContextMenu.Item
                className="example-item"
                onClick={() => actions.onAddRow!(tableName)}
              >
                <div className="ex-title">Add Row</div>
              </ContextMenu.Item>
            )}
            {actions.onModifyStructure && (
              <ContextMenu.Item
                className="example-item"
                onClick={() => actions.onModifyStructure!(tableName)}
              >
                <div className="ex-title">View/Edit Structure</div>
              </ContextMenu.Item>
            )}
            <ContextMenu.Item
              className="example-item"
              onClick={() => actions.onCount(tableName)}
            >
              <div className="ex-title">Count Rows</div>
            </ContextMenu.Item>
            <ContextMenu.Item
              className="example-item"
              onClick={() => actions.onViewDDL(tableName)}
            >
              <div className="ex-title">View DDL</div>
            </ContextMenu.Item>
            <ContextMenu.Item
              className="example-item"
              onClick={() => actions.onCopy(tableName)}
            >
              <div className="ex-title">Copy Name</div>
            </ContextMenu.Item>
            {/* Export submenu — opens to the side showing all 4 formats */}
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
                      onClick={() => actions.onExport(tableName, "csv")}
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
                      onClick={() => actions.onExport(tableName, "json")}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          JSON <span className="ext-badge">.json</span>
                        </div>
                        <div className="ex-desc">Array of objects</div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => actions.onExport(tableName, "sql")}
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
                      onClick={() => actions.onExport(tableName, "parquet")}
                    >
                      <div className="export-item-text">
                        <div className="ex-title">
                          Parquet <span className="ext-badge">.parquet</span>
                        </div>
                        <div className="ex-desc">
                          Apache Parquet columnar format
                        </div>
                      </div>
                    </Menu.Item>
                    <Menu.Item
                      className="example-item export-item"
                      onClick={() => actions.onExport(tableName, "xlsx")}
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
            {actions.onTruncate && (
              <ContextMenu.Item
                className="example-item"
                onClick={() => actions.onTruncate!(tableName)}
              >
                <div className="ex-title">Truncate</div>
              </ContextMenu.Item>
            )}
            <ContextMenu.Item
              className="example-item"
              onClick={() => actions.onDrop(tableName)}
            >
              <div className="ex-title">Drop Table</div>
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

const nodeTypes: NodeTypes = { erTable: ErTableNode };

// ────────────────────────────────────────────────────────────────────────────
// Custom ELK edge — renders bend-point paths produced by the ELK router.
// When a table is selected, connected edges are highlighted and animated;
// unconnected edges are shown in a low-saturation subtle color.
// ────────────────────────────────────────────────────────────────────────────

interface ElkEdgeData {
  path: string;
  labelX: number;
  labelY: number;
  label: string;
  [key: string]: unknown;
}

function ElkEdgeComponent({ id, data, style }: EdgeProps) {
  const selection = useContext(SelectionContext);
  const { path, label, labelX, labelY } = data as ElkEdgeData;

  const isAnySelected = !!selection.selectedTable;
  const isConnected = !isAnySelected || selection.connectedEdgeIds.has(id);

  let stroke = (style?.stroke as string) ?? "var(--text-muted)";
  let strokeWidth = (style?.strokeWidth as number) ?? 1.5;
  // Connected-and-selected edges render the flowing animation alone,
  // without a backdrop track underneath. Unconnected edges stay dim.
  const showConnectedFlow = isAnySelected && isConnected;
  if (showConnectedFlow) {
    stroke = "var(--primary)";
    strokeWidth = 2.5;
  } else if (isAnySelected && !isConnected) {
    stroke = "var(--border)";
    strokeWidth = 1;
  }

  if (!path) return null;

  return (
    <>
      {!showConnectedFlow && (
        <BaseEdge path={path} style={{ ...style, stroke, strokeWidth }} />
      )}
      {showConnectedFlow && (
        <path
          d={path}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray="12 6"
          className="er-edge-flowing"
        />
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              color: "var(--text-dim)",
              background: "var(--bg2)",
              padding: "1px 4px",
              borderRadius: 2,
              pointerEvents: "none",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes: EdgeTypes = { elkEdge: ElkEdgeComponent };

// ────────────────────────────────────────────────────────────────────────────
// ELK singleton
// ────────────────────────────────────────────────────────────────────────────

const elk = new ELK();

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Unique ELK port id — encodes table + column + side. */
function elkPortId(
  tableName: string,
  colName: string,
  side: "west" | "east",
): string {
  // Use a separator that cannot appear in normal SQL identifiers.
  return `${tableName}\x00${colName}\x00${side}`;
}

/** Convert ELK edge sections to an SVG polyline path string. */
function sectionsToPath(sections: ElkEdgeSection[]): {
  path: string;
  labelX: number;
  labelY: number;
} {
  if (!sections || sections.length === 0) {
    return { path: "", labelX: 0, labelY: 0 };
  }
  // Concatenate all sections into one point sequence.
  const points: ElkPoint[] = [];
  for (const section of sections) {
    if (points.length === 0) points.push(section.startPoint);
    if (section.bendPoints) points.push(...section.bendPoints);
    points.push(section.endPoint);
  }
  if (points.length < 2) return { path: "", labelX: 0, labelY: 0 };

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }

  // Place the label near the middle of the path.
  const mid = Math.floor((points.length - 1) / 2);
  const next = Math.min(mid + 1, points.length - 1);
  const labelX = (points[mid].x + points[next].x) / 2;
  const labelY = (points[mid].y + points[next].y) / 2;

  return { path: d, labelX, labelY };
}

// ────────────────────────────────────────────────────────────────────────────
// Async ELK layout
// ────────────────────────────────────────────────────────────────────────────

interface EdgeMeta {
  srcTable: string;
  tgtTable: string;
  srcColumn: string;
  tgtColumn: string;
  hasSrcPort: boolean;
  hasTgtPort: boolean;
  label: string;
}

async function computeElkLayout(
  tables: string[],
  columnsByEntity: Record<string, TableColumnInfo[]>,
  foreignKeysByEntity: Record<string, ForeignKeyInfo[]>,
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const tableSet = new Set(tables);

  // ── Build ELK nodes with fixed-position ports ─────────────────────────────
  const elkChildren = tables.map((tableName) => {
    const cols = columnsByEntity[tableName] ?? [];
    const h = calcNodeHeight(cols.length);

    const ports = cols.flatMap((col, i) => {
      // COL_TOP_PAD accounts for the 4px top padding of .er-table-columns
      // so the port is vertically centered on the column row in the DOM.
      const portY = COL_HEADER_H + COL_TOP_PAD + i * COL_ROW_H + COL_ROW_H / 2;
      return [
        {
          id: elkPortId(tableName, col.name, "west"),
          x: 0,
          y: portY,
          width: 0,
          height: 0,
        },
        {
          id: elkPortId(tableName, col.name, "east"),
          x: NODE_W,
          y: portY,
          width: 0,
          height: 0,
        },
      ];
    });

    return {
      id: tableName,
      width: NODE_W,
      height: h,
      layoutOptions: { "elk.portConstraints": "FIXED_POS" },
      ports,
    };
  });

  // ── Build ELK edges ───────────────────────────────────────────────────────
  const edgeMetadata = new Map<string, EdgeMeta>();
  const elkEdges: ElkExtendedEdge[] = [];
  const edgeSet = new Set<string>();

  for (const [srcTable, fks] of Object.entries(foreignKeysByEntity)) {
    if (!tableSet.has(srcTable)) continue;
    for (const fk of fks) {
      if (!tableSet.has(fk.table)) continue;
      const id = `${srcTable}::${fk.from}→${fk.table}::${fk.to}`;
      if (edgeSet.has(id)) continue;
      edgeSet.add(id);

      const srcCols = columnsByEntity[srcTable] ?? [];
      const tgtCols = columnsByEntity[fk.table] ?? [];
      const hasSrcPort = srcCols.some((c) => c.name === fk.from);
      const hasTgtPort = tgtCols.some((c) => c.name === fk.to);

      edgeMetadata.set(id, {
        srcTable,
        tgtTable: fk.table,
        srcColumn: fk.from,
        tgtColumn: fk.to,
        hasSrcPort,
        hasTgtPort,
        label: `${fk.from} → ${fk.to}`,
      });

      elkEdges.push({
        id,
        sources: [
          hasSrcPort ? elkPortId(srcTable, fk.from, "east") : srcTable,
        ],
        targets: [
          hasTgtPort ? elkPortId(fk.table, fk.to, "west") : fk.table,
        ],
      });
    }
  }

  // ── Run ELK ───────────────────────────────────────────────────────────────
  const layouted = await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "80",
      // Minimum gap between nodes in adjacent layers (i.e. between two
      // connected tables laid out left-to-right). The default (20px) is
      // far too tight for edge labels to render without being clipped.
      "elk.layered.spacing.nodeNodeBetweenLayers": "160",
      "elk.layered.spacing.edgeNodeBetweenLayers": "80",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
    children: elkChildren,
    edges: elkEdges,
  });

  // ── Map ELK nodes → React Flow nodes ─────────────────────────────────────
  const rfNodes: Node[] = (layouted.children ?? []).map((elkNode) => {
    const tableName = elkNode.id;
    const cols = columnsByEntity[tableName] ?? [];
    const fkColumns = new Set(
      (foreignKeysByEntity[tableName] ?? []).map((fk) => fk.from),
    );
    return {
      id: tableName,
      type: "erTable",
      position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
      data: { tableName, columns: cols, fkColumns },
    };
  });

  // ── Map ELK edges → React Flow edges ─────────────────────────────────────
  const rfEdges = (layouted.edges ?? []).reduce<Edge[]>((acc, elkEdge) => {
    const meta = edgeMetadata.get(elkEdge.id);
    if (!meta) return acc;
    const { path, labelX, labelY } = sectionsToPath(
      (elkEdge as ElkExtendedEdge).sections ?? [],
    );
    acc.push({
      id: elkEdge.id,
      source: meta.srcTable,
      target: meta.tgtTable,
      sourceHandle: meta.hasSrcPort
        ? columnHandleId(meta.srcColumn, "right", "source")
        : undefined,
      targetHandle: meta.hasTgtPort
        ? columnHandleId(meta.tgtColumn, "left", "target")
        : undefined,
      type: "elkEdge",
      data: { path, labelX, labelY, label: meta.label },
      style: { stroke: "var(--text-muted)", strokeWidth: 1.5 },
    });
    return acc;
  }, []);

  return { nodes: rfNodes, edges: rfEdges };
}

// ────────────────────────────────────────────────────────────────────────────
// ER Diagram Pane
// ────────────────────────────────────────────────────────────────────────────

export interface ErDiagramPaneProps {
  tables: string[];
  columnsByEntity: Record<string, TableColumnInfo[]>;
  foreignKeysByEntity: Record<string, ForeignKeyInfo[]>;
  isDark?: boolean;
  // Context-menu callbacks — same actions as the .sql-tree sidebar.
  // All are optional; if none are provided the context menu is omitted.
  onPreview?: (name: string, kind: "table" | "view") => void;
  onModifyStructure?: (name: string) => void;
  onAddRow?: (name: string) => void;
  onCount?: (name: string, kind: "table" | "view") => void;
  onCopy?: (name: string) => void;
  onTruncate?: (name: string) => void;
  onDrop?: (name: string, kind: "table" | "view") => void;
  onViewDDL?: (name: string, kind: "table" | "view") => void;
  onExport?: (name: string, format: "csv" | "json" | "sql" | "parquet" | "xlsx") => void;
  onGetRowCount?: (name: string) => number | Promise<number>;
}

export function ErDiagramPane({
  tables,
  columnsByEntity,
  foreignKeysByEntity,
  isDark = true,
  onPreview,
  onModifyStructure,
  onAddRow,
  onCount,
  onCopy,
  onTruncate,
  onDrop,
  onViewDDL,
  onExport,
  onGetRowCount,
}: ErDiagramPaneProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const layoutGen = useRef(0);
  // Track when this render cycle started so we can enforce a minimum
  // loading-animation duration and avoid a jarring "blink" for fast layouts.
  const loadStartRef = useRef(Date.now());
  const MIN_LOADING_MS = 800;

  // Reset selection synchronously when tables change (avoids useEffect state update).
  const [prevTables, setPrevTables] = useState(tables);
  if (prevTables !== tables) {
    setPrevTables(tables);
    if (selectedTable !== null) setSelectedTable(null);
  }

  // Build stable action object for the context menu context. All ERD nodes
  // are tables, so we lock `kind` to "table" when forwarding to the parent.
  const tableActions = useMemo<ErTableActions | null>(() => {
    if (!onPreview || !onCount || !onCopy || !onDrop || !onViewDDL || !onExport || !onGetRowCount)
      return null;
    return {
      onPreview: (name) => onPreview(name, "table"),
      onModifyStructure,
      onAddRow,
      onCount: (name) => onCount(name, "table"),
      onCopy,
      onTruncate,
      onDrop: (name) => onDrop(name, "table"),
      onViewDDL: (name) => onViewDDL(name, "table"),
      onExport,
      onGetRowCount,
    };
  }, [
    onPreview,
    onModifyStructure,
    onAddRow,
    onCount,
    onCopy,
    onTruncate,
    onDrop,
    onViewDDL,
    onExport,
    onGetRowCount,
  ]);

  // Derive which tables + edges are connected to the selected node.
  const selectionInfo = useMemo<ErSelectionState>(() => {
    if (!selectedTable) {
      return { selectedTable: null, connectedTables: new Set(), connectedEdgeIds: new Set() };
    }
    const connectedTables = new Set<string>([selectedTable]);
    const connectedEdgeIds = new Set<string>();
    for (const edge of edges) {
      if (edge.source === selectedTable || edge.target === selectedTable) {
        connectedEdgeIds.add(edge.id);
        connectedTables.add(edge.source);
        connectedTables.add(edge.target);
      }
    }
    return { selectedTable, connectedTables, connectedEdgeIds };
  }, [selectedTable, edges]);

  useEffect(() => {
    let cancelled = false;
    const gen = ++layoutGen.current;
    let pendingTimeoutId: number | undefined;
    // Reset the start time each time the layout recomputes so the minimum
    // duration applies to the current loading session.
    loadStartRef.current = Date.now();
    setIsLoading(true);

    const finishLoading = () => {
      const elapsed = Date.now() - loadStartRef.current;
      const remaining = MIN_LOADING_MS - elapsed;
      if (remaining > 0) {
        pendingTimeoutId = window.setTimeout(() => {
          if (!cancelled && layoutGen.current === gen) setIsLoading(false);
        }, remaining);
      } else {
        setIsLoading(false);
      }
    };

    const runLayout = async () => {
      if (tables.length === 0) {
        setNodes([]);
        setEdges([]);
        finishLoading();
        return;
      }
      const { nodes: n, edges: e } = await computeElkLayout(
        tables,
        columnsByEntity,
        foreignKeysByEntity,
      );
      if (cancelled || layoutGen.current !== gen) return; // stale — discard
      setNodes(n);
      setEdges(e);
      finishLoading();
    };

    runLayout().catch(console.error);
    return () => {
      cancelled = true;
      if (pendingTimeoutId !== undefined) window.clearTimeout(pendingTimeoutId);
    };
  // `finishLoading` is defined inside the effect and does not need to be listed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, columnsByEntity, foreignKeysByEntity]);

  if (tables.length === 0) {
    return (
      <div className="er-diagram-empty">
        No tables found. Create some tables first.
      </div>
    );
  }

  return (
    <SelectionContext.Provider value={selectionInfo}>
      <TableActionsContext.Provider value={tableActions}>
        <div className="er-diagram-wrap">
          {isLoading && (
            <div className="er-diagram-loading-overlay" aria-hidden="true">
              <div className="er-diagram-loading-wave">
                <svg viewBox="0 0 240 40" preserveAspectRatio="none">
                  <path
                    className="dataslope-wave dataslope-wave--back"
                    d="M0 26 C 20 14, 40 14, 60 26 S 100 38, 120 26 S 160 14, 180 26 S 220 38, 240 26 S 280 14, 300 26 S 340 38, 360 26 S 400 14, 420 26 S 460 38, 480 26 L 480 40 L 0 40 Z"
                  />
                  <path
                    className="dataslope-wave dataslope-wave--front"
                    d="M0 30 C 20 20, 40 20, 60 30 S 100 40, 120 30 S 160 20, 180 30 S 220 40, 240 30 S 280 20, 300 30 S 340 40, 360 30 S 400 20, 420 30 S 460 40, 480 30 L 480 40 L 0 40 Z"
                  />
                </svg>
              </div>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.2}
            maxZoom={2}
            // Nodes are not draggable: ELK edge paths are absolute coordinates
            // and would not follow node movements.
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            colorMode={isDark ? "dark" : "light"}
            style={{ background: "var(--bg)" }}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_event, node) => {
              setSelectedTable((prev) => (prev === node.id ? null : node.id));
            }}
            onPaneClick={() => setSelectedTable(null)}
          >
            <Background color="var(--border)" />
            <Controls showInteractive={false} />
          </ReactFlow>
          {selectedTable && (
            <div className="er-selection-hint">
              {selectionInfo.connectedEdgeIds.size > 0 ? (
                <>
                  <strong>{selectedTable}</strong> and its foreign key
                  relationships are highlighted. Unrelated tables are faded out.
                </>
              ) : (
                <>
                  <strong>{selectedTable}</strong> is highlighted. It is not
                  linked to any other tables through foreign keys.
                </>
              )}
            </div>
          )}
        </div>
      </TableActionsContext.Provider>
    </SelectionContext.Provider>
  );
}
