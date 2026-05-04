"use client";

import { useState, useEffect, useRef } from "react";
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

// ────────────────────────────────────────────────────────────────────────────
// Node dimensions (must match CSS for correct port positions)
// ────────────────────────────────────────────────────────────────────────────

const NODE_W = 230;
const COL_HEADER_H = 36;
const COL_ROW_H = 25;
const COL_FOOTER_PAD = 8;

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
  return (
    <div className="er-table-node">
      <div className="er-table-header">{tableName}</div>
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
                <MdOutlineKey
                  className="er-col-icon er-pk-icon"
                  aria-label="Primary key"
                />
              )}
              {(fkColumns as Set<string>).has(col.name) && (
                <IoLink
                  className="er-col-icon er-fk-icon"
                  aria-label="Foreign key"
                />
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
}

const nodeTypes: NodeTypes = { erTable: ErTableNode };

// ────────────────────────────────────────────────────────────────────────────
// Custom ELK edge — renders bend-point paths produced by the ELK router
// ────────────────────────────────────────────────────────────────────────────

interface ElkEdgeData {
  path: string;
  labelX: number;
  labelY: number;
  label: string;
  [key: string]: unknown;
}

function ElkEdgeComponent({ data, style, markerEnd }: EdgeProps) {
  const { path, label, labelX, labelY } = data as ElkEdgeData;
  if (!path) return null;
  return (
    <>
      <BaseEdge path={path} style={style} markerEnd={markerEnd} />
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
      const portY = COL_HEADER_H + i * COL_ROW_H + COL_ROW_H / 2;
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

      edgeMetadata.set(id, {
        srcTable,
        tgtTable: fk.table,
        label: `${fk.from} → ${fk.to}`,
      });

      const srcCols = columnsByEntity[srcTable] ?? [];
      const tgtCols = columnsByEntity[fk.table] ?? [];
      const hasSrcPort = srcCols.some((c) => c.name === fk.from);
      const hasTgtPort = tgtCols.some((c) => c.name === fk.to);

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
}

export function ErDiagramPane({
  tables,
  columnsByEntity,
  foreignKeysByEntity,
  isDark = true,
}: ErDiagramPaneProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const layoutGen = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const gen = ++layoutGen.current;

    const runLayout = async () => {
      if (tables.length === 0) {
        setNodes([]);
        setEdges([]);
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
    };

    runLayout().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [tables, columnsByEntity, foreignKeysByEntity]);

  if (tables.length === 0) {
    return (
      <div className="er-diagram-empty">
        No tables found. Create some tables first.
      </div>
    );
  }

  return (
    <div className="er-diagram-wrap">
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
      >
        <Background color="var(--border)" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
