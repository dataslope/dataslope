import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { endSymbols, MARKER } from "../../components/crowsfoot";
import { Entity, Relation, useEntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { headline, HIGHLIGHT, INK, INK_SOFT, note } from "../../editorial/style";
import { Ink, Leader, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ERD } from "./data";
import { Fig, KEY_INK } from "./kit";
import { BoxPulse, Drift, Mark, pulse, Pulse, STAT_INK, Svg } from "./parts";

const CUSTOMERS_X = 220;
const ORDERS_X = 1180;
const TOP = 470;
/** Fig. 12's label: its own line over "an entity", well under the headline. */
const FIG_Y = 350;

/**
 * The lesson's customers-and-orders diagram, built as it is named: the boxes,
 * the facts inside, the line, the key markers (the foreign key is what the
 * line stands for), then the line read end to end: start at a box, and the
 * far end says how many. Each end's label lands as its count is spoken, and
 * the symbols are decoded last, one by one. Columns, types and keys are what
 * Postgres stored for the lesson's DDL. It closes on the bridge to Unit 3:
 * the lines carry as much meaning as the boxes.
 */
export const ErdScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("pieces").from;
  const threeAt = n.word("pieces", "three pieces");
  const boxesAt = n.word("pieces", "Boxes");
  const factsAt = n.word("pieces", "facts");
  const linesAt = n.word("pieces", "lines");
  const relAt = n.word("pieces", "relationships");
  const pkAt = n.word("keys", "PK");
  const primaryAt = n.word("keys", "primary key");
  const identifiesAt = n.word("keys", "identifies each row");
  const fkAt = n.word("keys", "FK");
  const foreignAt = n.word("keys", "foreign key");
  const custIdAt = n.word("keys", "customer ID");
  const theIdAt = n.word("keys", "the ID");
  const standsAt = n.word("keys", "line stands for");
  const readAt = n.word("line", "read the line");
  const oneAt = n.word("line", "One customer", { nth: 1 });
  const zeroAt = n.word("line", "zero or many", { nth: 1 });
  const eachAt = n.word("line", "each order");
  const exactlyAt = n.word("line", "exactly one", { nth: 1 });
  // The ends decoded: each counts the box it touches.
  const touchesAt = n.word("line", "Each end");
  const barsAt = n.word("line", "two bars");
  const oneKeyAt = n.word("line", "exactly one", { nth: 2 });
  const circleAt = n.word("line", "a circle");
  const footAt = n.word("line", "crow's foot");
  const manyKeyAt = n.word("line", "zero or many", { nth: 2 });
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
  // Each end's symbols, from the same layout the markers are drawn with.
  const oneEnd = endSymbols(a, b, "exactly-one");
  const manyEnd = endSymbols(b, a, "zero-or-many");
  const barsX = (oneEnd.near[0] + oneEnd.far![0]) / 2;
  const footX = b[0] - MARKER / 2;
  const row = (layout: typeof customers, name: string) => {
    const i = layout.columns.findIndex((c) => c.name === name);
    return { x: layout.x, y: layout.rows[i].top, width: layout.width, height: layout.row };
  };

  const rowsAt = (cols: readonly { name: string }[], start: number) =>
    Object.fromEntries(cols.map((c, i) => [c.name, start + i * 4]));
  const pkCols = (cols: readonly { name: string; key?: string }[]) => cols.filter((c) => c.key?.includes("PK"));

  // "Read the line": a highlighter laid under it, swelling again as it is named.
  const glow =
    pulse(frame, standsAt - 2, 40) +
    ease(frame, readAt - 2, 14) * (1 - ease(frame, eachAt + 30, 20)) +
    pulse(frame, lookAt, 40) +
    ease(frame, oneLineAt, 16) * 0.8;
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

      <Drift from={primaryAt} to={end + 80} scale={0.025} origin={[960, 520]}>
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

        <Fig n="12" at={boxesAt - 6} x={CUSTOMERS_X} y={y(FIG_Y)}>
          The lesson&apos;s diagram: customers and orders
        </Fig>

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
            PK <span style={{ color: INK_SOFT }}>primary key,</span> UK <span style={{ color: INK_SOFT }}>unique</span>
          </span>
        </Note>
        <Note at={foreignAt - 2} x={ORDERS_X} y={orders.bottom + 22} from="up">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            FK <span style={{ color: INK_SOFT }}>foreign key, to {ERD.fk.table}</span>
          </span>
        </Note>

        {/* "The column that identifies each row": both primary keys. */}
        <BoxPulse {...row(customers, ERD.fk.refCol)} at={identifiesAt} color={KEY_INK} />
        <BoxPulse {...row(orders, "id")} at={identifiesAt + 4} color={KEY_INK} />

        {/* The foreign key is the line: an order's customer_id holds a customers id. */}
        <BoxPulse {...row(orders, ERD.fk.col)} at={custIdAt} color={STAT_INK} />
        <BoxPulse {...row(customers, ERD.fk.refCol)} at={theIdAt + 4} color={STAT_INK} />

        {/* Reading the line: start at a box, and the far end says how many. */}
        <BoxPulse x={customers.x} y={customers.y} width={customers.width} height={customers.head} at={oneAt} />
        <Pulse x={footX} y={lineY} at={zeroAt} r={8} grow={18} color={INK} />
        <BoxPulse x={orders.x} y={orders.y} width={orders.width} height={orders.head} at={eachAt} />
        <Pulse x={barsX} y={lineY} at={exactlyAt} r={8} grow={18} color={INK} />
        <Note at={exactlyAt - 2} x={a[0] + 28} y={lineY + 30} from="up">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <Mark at={oneKeyAt}>exactly one</Mark>
          </span>
        </Note>
        <Note at={zeroAt + 2} x={b[0] - 28} y={lineY + 30} from="up" align="right">
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
            <Mark at={manyKeyAt}>zero or many</Mark>
          </span>
        </Note>

        {/* Decoding the ends: each counts the box it touches. */}
        <Pulse x={barsX} y={lineY} at={touchesAt} r={8} grow={18} color={STAT_INK} />
        <Pulse x={footX} y={lineY} at={touchesAt + 4} r={8} grow={18} color={STAT_INK} />
        <Pulse x={barsX} y={lineY} at={barsAt} r={8} grow={18} color={STAT_INK} />
        <Pulse x={manyEnd.far![0]} y={lineY} at={circleAt} r={6} grow={14} color={STAT_INK} />
        <Pulse x={manyEnd.near[0]} y={lineY} at={footAt} r={8} grow={18} color={STAT_INK} />

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
