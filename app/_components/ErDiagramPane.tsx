"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { TableColumnInfo, ForeignKeyInfo } from "./runtime/sqlite";
import { MdOutlineKey } from "react-icons/md";
import { IoLink } from "react-icons/io5";

// ────────────────────────────────────────────────────────────────────────────
// Custom table node
// ────────────────────────────────────────────────────────────────────────────

interface ErTableNodeData {
  tableName: string;
  columns: TableColumnInfo[];
  fkColumns: Set<string>;
  [key: string]: unknown;
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
// Layout helpers
// ────────────────────────────────────────────────────────────────────────────

const NODE_W = 230;
const H_GAP = 140;
const COL_HEADER_H = 36;
const COL_ROW_H = 25;
const COL_FOOTER_PAD = 8;
const ROW_V_GAP = 60;

function calcNodeHeight(colCount: number): number {
  return COL_HEADER_H + Math.max(colCount, 1) * COL_ROW_H + COL_FOOTER_PAD;
}

function columnHandleId(
  columnName: string,
  side: "left" | "right",
  type: "source" | "target",
): string {
  return `${columnName}::${side}::${type}`;
}

function layoutTables(
  tables: string[],
  columnsByEntity: Record<string, TableColumnInfo[]>,
  foreignKeysByEntity: Record<string, ForeignKeyInfo[]>,
): Map<string, { x: number; y: number }> {
  const tableSet = new Set(tables);
  const rankByTable = new Map<string, number>();
  tables.forEach((table) => rankByTable.set(table, 0));

  for (let i = 0; i < tables.length; i += 1) {
    let changed = false;
    for (const table of tables) {
      const parentRanks = (foreignKeysByEntity[table] ?? [])
        .filter((fk) => tableSet.has(fk.table) && fk.table !== table)
        .map((fk) => rankByTable.get(fk.table) ?? 0);
      if (parentRanks.length === 0) continue;
      const nextRank = Math.max(...parentRanks) + 1;
      if (nextRank > (rankByTable.get(table) ?? 0)) {
        rankByTable.set(table, nextRank);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const groups = new Map<number, string[]>();
  for (const table of tables) {
    const rank = rankByTable.get(table) ?? 0;
    groups.set(rank, [...(groups.get(rank) ?? []), table]);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [rank, group] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const ordered = [...group].sort((a, b) => {
      const aConnections = connectionCount(a, foreignKeysByEntity);
      const bConnections = connectionCount(b, foreignKeysByEntity);
      if (aConnections !== bConnections) return bConnections - aConnections;
      return tables.indexOf(a) - tables.indexOf(b);
    });
    let y = 0;
    for (const table of ordered) {
      positions.set(table, {
        x: rank * (NODE_W + H_GAP),
        y,
      });
      y += calcNodeHeight(columnsByEntity[table]?.length ?? 0) + ROW_V_GAP;
    }
  }
  return positions;
}

function connectionCount(
  table: string,
  foreignKeysByEntity: Record<string, ForeignKeyInfo[]>,
): number {
  let count = foreignKeysByEntity[table]?.length ?? 0;
  for (const fks of Object.values(foreignKeysByEntity)) {
    count += fks.filter((fk) => fk.table === table).length;
  }
  return count;
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
  const { nodes, edges } = useMemo(() => {
    if (tables.length === 0) return { nodes: [], edges: [] };

    const positions = layoutTables(tables, columnsByEntity, foreignKeysByEntity);

    const nodes: Node[] = tables.map((tableName, i) => {
      const cols = columnsByEntity[tableName] ?? [];
      const fkColumns = new Set(
        (foreignKeysByEntity[tableName] ?? []).map((fk) => fk.from),
      );
      const position = positions.get(tableName) ?? {
        x: i * (NODE_W + H_GAP),
        y: 0,
      };
      return {
        id: tableName,
        type: "erTable",
        position,
        data: { tableName, columns: cols, fkColumns },
      };
    });

    const tableSet = new Set(tables);
    const edges: Edge[] = [];
    for (const [srcTable, fks] of Object.entries(foreignKeysByEntity)) {
      if (!tableSet.has(srcTable)) continue;
      for (const fk of fks) {
        if (!tableSet.has(fk.table)) continue;
        // Deduplicate: a self-referencing or multi-column FK might
        // produce the same source→target pair more than once.
        const id = `${srcTable}::${fk.from}→${fk.table}::${fk.to}`;
        if (edges.some((e) => e.id === id)) continue;
        const srcX = positions.get(srcTable)?.x ?? 0;
        const targetX = positions.get(fk.table)?.x ?? 0;
        const sourceSide = srcX > targetX ? "left" : "right";
        const targetSide = srcX > targetX ? "right" : "left";
        edges.push({
          id,
          source: srcTable,
          sourceHandle: columnHandleId(fk.from, sourceSide, "source"),
          target: fk.table,
          targetHandle: columnHandleId(fk.to, targetSide, "target"),
          label: `${fk.from} → ${fk.to}`,
          type: "smoothstep",
          style: { stroke: "var(--accent)", strokeWidth: 1.5 },
          labelStyle: { fontSize: 10, fill: "var(--text-dim)" },
          labelBgStyle: { fill: "var(--bg2)", fillOpacity: 0.9 },
          labelBgPadding: [4, 2] as [number, number],
        });
      }
    }

    return { nodes, edges };
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
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        colorMode={isDark ? "dark" : "light"}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
