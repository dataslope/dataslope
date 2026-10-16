import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Leader, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ERD } from "./data";
import { Drift, Mark, pulse, Pulse, STAT_INK, Svg } from "./parts";

const CUSTOMERS_X = 220;
const ORDERS_X = 1180;
const TOP = 470;

/**
 * The lesson's customers-and-orders diagram, built as it is named: the boxes,
 * the facts inside, the line, the key markers, then the line read end to
 * end. Columns, types and keys are what Postgres stored for the lesson's
 * DDL. It closes on the bridge to Unit 3: the lines carry as much meaning as
 * the boxes.
 */
export const ErdScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("pieces").from;
  const diagramAt = n.word("pieces", "diagram");
  const threeAt = n.word("pieces", "three pieces");
  const boxesAt = n.word("pieces", "Boxes");
  const factsAt = n.word("pieces", "facts");
  const linesAt = n.word("pieces", "lines");
  const relAt = n.word("pieces", "relationships");
  const pkAt = n.word("keys", "PK");
  const primaryAt = n.word("keys", "primary key");
  const fkAt = n.word("keys", "FK");
  const foreignAt = n.word("keys", "foreign key");
  const readAt = n.word("line", "read the line");
  const oneAt = n.word("line", "One customer");
  const zeroAt = n.word("line", "zero or many");
  const eachAt = n.word("line", "each order");
  const exactlyAt = n.word("line", "exactly one");
  const lookAt = n.word("next", "look");
  const oneLineAt = n.word("next", "one line");
  const aloneAt = n.word("next", "alone");
  const betweenAt = n.word("next", "lines between");
  const boxesEndAt = n.word("next", "boxes");
  const end = n.beat("next").to;

  const customers = useEntityLayout({ x: CUSTOMERS_X, y: y(TOP), width: 400, name: "customers", columns: ERD.customers });
  // orders sits one row higher, so its foreign key is level with the key it names.
  const fkRow = ERD.orders.findIndex((c) => c.name === ERD.fk.col);
  const refRow = ERD.customers.findIndex((c) => c.name === ERD.fk.refCol);
  const orders = useEntityLayout({
    x: ORDERS_X,
    y: y(TOP) + (refRow - fkRow) * customers.row,
    width: 480,
    name: "orders",
    columns: ERD.orders,
  });
  const a = customers.anchor("right", ERD.fk.refCol);
  const b = orders.anchor("left", ERD.fk.col);
  const lineY = a[1];
  const midX = (a[0] + b[0]) / 2;

  const rowsAt = (cols: readonly { name: string }[], start: number) =>
    Object.fromEntries(cols.map((c, i) => [c.name, start + i * 4]));
  const pkCols = (cols: readonly { name: string; key?: string }[]) => cols.filter((c) => c.key?.includes("PK"));

  // "Read the line": a highlighter laid under it, swelling again as it is named.
  const glow = ease(frame, readAt - 2, 14) * (1 - ease(frame, eachAt + 30, 20)) + pulse(frame, lookAt, 40) + ease(frame, oneLineAt, 16) * 0.8;
  const boxSwell = pulse(frame, boxesEndAt - 2, 26);
  const tagsOut = pkAt - 6;

  return (
    <AbsoluteFill>
      {/* ── Sound: the boxes, the line drawing, the keys, a bell in the pause ── */}
      <Sfx name="el-pop" at={boxesAt} level={-30} />
      <Sfx name="el-tap" at={factsAt + 4} level={-30} />
      <Sfx name="el-pencil" at={linesAt} level={-33} />
      <Sfx name="el-tap" at={fkAt} level={-30} />
      <Sfx name="el-chime" at={n.beat("line").to + 6} level={-32} />
      <Sfx name="el-pencil" at={betweenAt} level={-35} />

      <Drift from={foreignAt + 10} to={end + 80} scale={0.025} origin={[960, 520]}>
        {/* ── Headline: three pieces, named one by one ── */}
        <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80) }}>
          <Ink at={from - 6} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
            <Mark at={threeAt}>Three pieces:</Mark>
          </Ink>
          {(
            [
              ["boxes,", boxesAt],
              ["facts,", factsAt],
              ["lines.", linesAt],
            ] as const
          ).map(([w, at]) => (
            <Ink key={w} at={at - 4} dur={14} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
              {w}
            </Ink>
          ))}
        </div>

        {/* ── The diagram ── */}
        <Svg opacity={Math.min(1, glow)}>
          <line x1={a[0]} x2={b[0]} y1={lineY} y2={lineY} stroke={HIGHLIGHT} strokeWidth={18 + Math.max(0, glow - 1) * 10} strokeLinecap="round" />
        </Svg>
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${CUSTOMERS_X + 200}px ${lineY}px`, transform: `scale(${1 + boxSwell * 0.02})` }}>
          <Entity
            layout={customers}
            at={boxesAt - 4}
            rowAt={rowsAt(ERD.customers, factsAt)}
            marks={Object.fromEntries(pkCols(ERD.customers).map((c) => [c.name, { at: pkAt, tone: "key" as const }]))}
          />
        </div>
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${ORDERS_X + 240}px ${lineY}px`, transform: `scale(${1 + boxSwell * 0.02})` }}>
          <Entity
            layout={orders}
            at={boxesAt + 2}
            rowAt={rowsAt(ERD.orders, factsAt + 6)}
            marks={{
              ...Object.fromEntries(pkCols(ERD.orders).map((c) => [c.name, { at: pkAt + 3, tone: "key" as const }])),
              [ERD.fk.col]: { at: fkAt, tone: "key" as const },
            }}
          />
        </div>
        <Relation
          name="customers places orders"
          points={[a, b]}
          from="exactly-one"
          to="zero-or-many"
          at={linesAt}
          dur={20}
          label="places"
          labelAt={oneAt + 6}
          labelPos={[midX - 30, lineY - 40]}
        />

        <Ink at={diagramAt - 4} dur={16} style={{ left: CUSTOMERS_X, top: y(330), whiteSpace: "nowrap" }}>
          <span style={label(22, INK_SOFT)}>The lesson&apos;s diagram: customers and orders</span>
        </Ink>

        {/* The three pieces, tagged as they are named. */}
        <Note at={boxesAt + 2} out={tagsOut} x={CUSTOMERS_X} y={customers.top - 52}>
          <span style={{ ...note(22, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" }}>an entity</span>
        </Note>
        <Leader points={[[CUSTOMERS_X - 20, customers.rows[1].mid], [CUSTOMERS_X - 4, customers.rows[1].mid]]} at={factsAt + 6} out={tagsOut} dot={false} />
        <Note at={factsAt + 6} out={tagsOut} x={CUSTOMERS_X - 30} y={customers.rows[1].mid - 15} align="right">
          <span style={{ ...note(22, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap" }}>an attribute</span>
        </Note>
        <Note at={relAt} out={tagsOut} x={midX} y={lineY + 26} from="up">
          <span style={{ ...note(22, INK_SOFT), fontStyle: "italic", whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
            a relationship
          </span>
        </Note>

        {/* The key markers, read. */}
        <Note at={primaryAt - 2} x={CUSTOMERS_X} y={customers.bottom + 22} from="up">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            PK <span style={{ color: INK_SOFT }}>primary key</span>
          </span>
        </Note>
        <Note at={foreignAt - 2} x={ORDERS_X} y={orders.bottom + 22} from="up">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            FK <span style={{ color: INK_SOFT }}>foreign key, to {ERD.fk.table}</span>
          </span>
        </Note>

        {/* Reading the line from each end. */}
        <Pulse x={a[0] + 10} y={lineY} at={oneAt} color={INK} />
        <Pulse x={b[0] - 12} y={lineY} at={zeroAt} color={INK} />
        <Pulse x={a[0] + 10} y={lineY} at={exactlyAt} color={INK} />
        <Note at={oneAt + 2} x={a[0] + 8} y={lineY + 30} from="up">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <Mark at={exactlyAt}>exactly one</Mark>
          </span>
        </Note>
        <Note at={zeroAt + 2} x={b[0] - 8} y={lineY + 30} from="up" align="right">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>zero or many</span>
        </Note>

        <Note at={aloneAt - 4} x={midX} y={lineY - 96} from="up">
          <span style={{ ...note(23, STAT_INK), fontWeight: 600, whiteSpace: "nowrap", display: "inline-block", transform: "translateX(-50%)" }}>
            The line says as much as the boxes
          </span>
        </Note>
      </Drift>

      <NextLine at={betweenAt} x={120} y={y(830)} width={760}>
        how entities relate.
      </NextLine>
    </AbsoluteFill>
  );
};
