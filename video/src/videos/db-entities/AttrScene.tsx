import React from "react";
import { AbsoluteFill } from "remotion";
import { Entity, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ORDER_COLUMNS, ORDER_ROWS, STATUS_COL, TYPE_HOLDS } from "./data";
import { DbTable, HEAD_H, MARK, Mono, ROW_H, tableGeometry } from "./kit";
import { Arrow, Drift, Headline, Kicker, Mark, RowType } from "./parts";

const S = 1.2;
const BOX_X = 150;
const BOX_W = 440;
const TABLE_X = 780;

/**
 * Part 2 opens: an order's facts are its attributes, each a row of the
 * entity and a column of the table, and each column has a domain. The types
 * are the ones Postgres stored for the lesson's DDL.
 */
export const AttrScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const from = n.beat("attributes").from;
  const attributesAt = n.word("attributes", "attributes");
  const orderAt = n.word("attributes", "An order");
  const rowAt: Record<string, number> = {
    status: n.word("attributes", "status"),
    total_cents: n.word("attributes", "total"),
    placed_on: n.word("attributes", "placed"),
  };
  const columnAt = n.word("attributes", "a column");
  const domainAt = n.word("domain", "domain");
  const valuesAt = n.word("domain", "values");
  // Each type's domain, in words, as it is spoken.
  const holdsAt: Record<string, number> = {
    integer: n.word("domain", "whole numbers"),
    date: n.word("domain", "calendar dates"),
    text: n.word("domain", "any text"),
  };
  const end = n.beat("domain").to;

  // No key badge yet: the video names PK when it draws the diagram.
  const orders = useEntityLayout({ x: BOX_X, y: y(350), width: BOX_W, name: "orders", columns: ORDER_COLUMNS.map(({ name }) => ({ name })) });
  // The table's top rule level with the box's top, and both labels on one line.
  const top = orders.top;
  const g = tableGeometry({ x: 0, top: 0, cols: ORDER_ROWS.cols, rows: ORDER_ROWS.rows, headH: h(HEAD_H), rowH: h(ROW_H) });
  const headMid = top + (g.headH / 2) * S;
  const holdsTop = top + g.bottom(ORDER_ROWS.rows.length) * S + 40;

  return (
    <AbsoluteFill>
      {/* ── Sound: each attribute landing, the table, the domains ── */}
      <Sfx name="el-tap" at={rowAt.status} level={-29} />
      <Sfx name="el-tap" at={rowAt.total_cents} level={-30} />
      <Sfx name="el-tap" at={rowAt.placed_on} level={-30} />
      <Sfx name="el-pencil" at={columnAt - 6} level={-34} />
      <Sfx name="el-sprinkle" at={holdsAt.integer + 2} level={-35} />

      <Drift from={valuesAt + 10} to={end + 70} scale={0.02} origin={[900, 560]}>
        <Kicker at={from - 10}>Attributes and domains</Kicker>
        <Headline lead="Facts become columns." leadAt={attributesAt - 6} turn="Each has a domain." turnAt={domainAt - 4} />

        <Ink at={orderAt - 6} dur={14} style={{ left: BOX_X, top: orders.top - 46, whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>The entity, its attributes</span>
        </Ink>
        <Entity layout={orders} at={orderAt - 4} rowAt={{ id: orderAt + 6, ...rowAt }} />
        {ORDER_COLUMNS.map((c, i) => (
          <RowType key={c.name} layout={orders} row={i} at={domainAt + 2 + i * 5}>
            {c.type}
          </RowType>
        ))}

        <Arrow from={[orders.right + 22, headMid]} to={[TABLE_X - 26, headMid]} at={columnAt - 8} dur={14} color={INK_SOFT} />
        <Ink at={columnAt - 6} dur={14} style={{ left: TABLE_X, top: orders.top - 46, whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>The table, a column each</span>
        </Ink>
        <div style={{ position: "absolute", left: TABLE_X, top, transform: `scale(${S})`, transformOrigin: "0 0" }}>
          <DbTable
            g={g}
            cols={ORDER_ROWS.cols}
            rows={ORDER_ROWS.rows.map((cells, i) => ({ cells, at: columnAt + 6 + i * 5 }))}
            at={columnAt - 4}
            numeric={[0, 2]}
            // Only status is marked: "any text at all" is what the next scene tries.
            marks={ORDER_ROWS.rows.map((_, i) => ({ row: i, col: STATUS_COL, at: holdsAt.text + 4 + i * 3, color: MARK }))}
          />
        </div>

        {/* "The values it's allowed to hold": each column's domain, in words,
            arriving as its type's is spoken (both integers together). */}
        {ORDER_COLUMNS.map((c, i) => {
          const sameType = ORDER_COLUMNS.slice(0, i).filter((d) => d.type === c.type).length;
          const at = (holdsAt[c.type] ?? valuesAt) + 2 + sameType * 6;
          const holds = TYPE_HOLDS[c.type] ?? c.type;
          return (
            <Note key={c.name} at={at} x={TABLE_X} y={holdsTop + i * 42}>
              <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", display: "flex", gap: 14 }}>
                <span style={{ width: 170, color: INK }}>
                  <Mono weight={500}>{c.name}</Mono>
                </span>
                <span>
                  holds {c.name === ORDER_ROWS.cols[STATUS_COL] ? <Mark at={at + 4}>{holds}</Mark> : holds}
                </span>
              </span>
            </Note>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
