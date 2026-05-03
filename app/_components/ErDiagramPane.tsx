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
      <Handle type="target" position={Position.Left} />
      <div className="er-table-header">{tableName}</div>
      <div className="er-table-columns">
        {(columns as TableColumnInfo[]).map((col) => (
          <div key={col.name} className="er-table-col-row">
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
          </div>
        ))}
        {(columns as TableColumnInfo[]).length === 0 && (
          <div className="er-table-col-row er-table-col-empty">
            No columns
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes: NodeTypes = { erTable: ErTableNode };

// ────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ────────────────────────────────────────────────────────────────────────────

const NODE_W = 230;
const H_GAP = 100;
const COL_HEADER_H = 36;
const COL_ROW_H = 25;
const COL_FOOTER_PAD = 8;
const ROW_V_GAP = 50;

function calcNodeHeight(colCount: number): number {
  return COL_HEADER_H + Math.max(colCount, 1) * COL_ROW_H + COL_FOOTER_PAD;
}

// ────────────────────────────────────────────────────────────────────────────
// ER Diagram Pane
// ────────────────────────────────────────────────────────────────────────────

export interface ErDiagramPaneProps {
  tables: string[];
  columnsByEntity: Record<string, TableColumnInfo[]>;
  foreignKeysByEntity: Record<string, ForeignKeyInfo[]>;
}

export function ErDiagramPane({
  tables,
  columnsByEntity,
  foreignKeysByEntity,
}: ErDiagramPaneProps) {
  const { nodes, edges } = useMemo(() => {
    if (tables.length === 0) return { nodes: [], edges: [] };

    // Arrange tables in a grid: ~3 columns for small schemas,
    // sqrt-based for larger ones.
    const numCols = tables.length <= 3 ? tables.length : Math.ceil(Math.sqrt(tables.length));
    const numRows = Math.ceil(tables.length / numCols);

    // Compute per-row max heights so tall tables don't overlap with the
    // row below them.
    const rowMaxH: number[] = Array.from({ length: numRows }, () => 0);
    tables.forEach((name, i) => {
      const row = Math.floor(i / numCols);
      const h = calcNodeHeight(columnsByEntity[name]?.length ?? 0);
      if (h > rowMaxH[row]) rowMaxH[row] = h;
    });

    // Cumulative row Y starting positions.
    const rowY: number[] = [0];
    for (let r = 0; r < numRows - 1; r++) {
      rowY.push(rowY[r] + rowMaxH[r] + ROW_V_GAP);
    }

    const nodes: Node[] = tables.map((tableName, i) => {
      const col = i % numCols;
      const row = Math.floor(i / numCols);
      const cols = columnsByEntity[tableName] ?? [];
      const fkColumns = new Set(
        (foreignKeysByEntity[tableName] ?? []).map((fk) => fk.from),
      );
      return {
        id: tableName,
        type: "erTable",
        position: {
          x: col * (NODE_W + H_GAP),
          y: rowY[row],
        },
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
        edges.push({
          id,
          source: srcTable,
          target: fk.table,
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
        minZoom={0.05}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        colorMode="dark"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
