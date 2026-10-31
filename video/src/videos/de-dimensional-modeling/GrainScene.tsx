import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LINE_TOTALS, LINES, money, ORDER_GRAIN } from "./data";
import { colsOf, DataTable, Drift, geoOf, KeyArrow, Mark, MARK_BAD, MARK_OK, Mono, OK, OK_INK, TableName, X0 } from "./parts";

const TABLE_Y = 430;
const ORDERS_X = 1290;

/** A red cross, drawn on `at`, for a column that fails the grain. */
const Cross: React.FC<{ at: number; size?: number }> = ({ at, size = 24 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M5 5 L19 19 M19 5 L5 19" fill="none" stroke={ACCENT} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
    </svg>
  );
};

/**
 * Question 3. The grain declared first (one row per order line), every
 * column tested against it: quantity and amount pass, the order's shipping
 * fee fails, and on order 1001's three lines it sums to 15.00 for a 5.00
 * fee. It moves to a fact at order grain.
 */
export const GrainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("grain").from;
  const qAt = n.word("grain", "Question three");
  const textAt = n.word("grain", "What is the grain of a table");
  const meansAt = n.word("grain", "what one row means");
  const declareAt = n.word("grain", "Declare it before any column");
  const lineAt = n.word("grain", "one row per order line");
  const everyAt = n.word("grain-test", "every column has to make sense");
  const qtyAt = n.word("grain-test", "Quantity and amount do");
  const feeAt = n.word("grain-test", "The shipping fee doesn't");
  const wholeAt = n.word("grain-test", "the whole order");
  const threeAt = n.word("grain-test", "three lines");
  const timesAt = n.word("grain-test", "three times");
  const fifteenAt = n.word("grain-test", "a sum says fifteen");
  const orderGrainAt = n.word("grain-fix", "a fact at order grain");
  const perOrderAt = n.word("grain-fix", "one row per order");
  const catchesAt = n.word("grain-fix", "what catches that");
  const end = n.beat("grain-fix").to;

  const cols = colsOf(LINES);
  const g = geoOf(LINES, X0, y(TABLE_Y), h, { headH: 56, rowH: 68, bodySize: 31, headSize: 24 });
  const fee = LINES.cols.indexOf("shipping_fee");
  const qty = LINES.cols.indexOf("quantity");
  const amt = LINES.cols.indexOf("amount");
  const order = ORDER_GRAIN;
  const og = geoOf(order, ORDERS_X, y(TABLE_Y), h, { headH: 56, rowH: 68, bodySize: 31, headSize: 24 });
  const total = LINE_TOTALS.rows[0][LINE_TOTALS.cols.indexOf("shipping_fee")];
  const paid = order.rows[0][order.cols.indexOf("shipping_fee")];
  const below = g.rowTop(LINES.rows.length);

  // A dash pattern of "0 1" still paints a round cap, so a mark not yet due is not drawn at all.
  const testRow = (j: number, at: number, ok: boolean) =>
    frame < at ? null : (
      <div
        key={j}
        style={{ position: "absolute", left: g.xs[j] + g.widths[j] / 2 - 13, top: g.top - 40, width: 26, height: 26 }}
      >
        {ok ? <Tick at={at} size={26} /> : <Cross at={at} size={26} />}
      </div>
    );

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={lineAt} level={-35} />
      <Sfx name="el-tap" at={qtyAt + 2} level={-28} />
      <Sfx name="el-scratch" at={feeAt + 2} level={-34} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={timesAt + i * 5} level={-31} />
      ))}
      <Sfx name="el-pop" at={fifteenAt + 4} level={-29} />
      <Sfx name="el-whoosh" at={orderGrainAt} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is the grain of a table, and why define it first?
        </QuestionCard>

        {/* The grain, declared before any column. */}
        <Note at={meansAt} x={X0} y={y(270)}>
          <span style={{ ...body(40), color: INK, whiteSpace: "nowrap" }}>
            Grain: <Mark at={lineAt}>one row per order line</Mark>
            <span style={{ ...label(22, INK_SOFT), marginLeft: 22, opacity: ease(frame, declareAt, 10) }}>declared first</span>
          </span>
        </Note>

        <TableName g={g} at={lineAt + 4}>
          <Mono>fact_order_lines</Mono>
        </TableName>
        <DataTable
          g={g}
          cols={cols}
          at={lineAt + 4}
          rows={LINES.rows.map((cells, i) => ({ cells, at: lineAt + 8 + i * 4 }))}
          marks={[
            ...LINES.rows.flatMap((_, i) => [
              { row: i, col: qty, at: qtyAt + 4, out: feeAt, color: MARK_OK },
              { row: i, col: amt, at: qtyAt + 6, out: feeAt, color: MARK_OK },
            ]),
            ...LINES.rows.map((_, i) => ({ row: i, col: fee, at: timesAt + i * 5, color: MARK_BAD })),
          ]}
        />
        {/* Each column tested against the grain, over its title. */}
        <Note at={everyAt} x={g.x} y={g.top - 84}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>does it make sense per line?</span>
        </Note>
        {testRow(qty, qtyAt + 2, true)}
        {testRow(amt, qtyAt + 6, true)}
        {testRow(fee, feeAt + 2, false)}
        <Note at={wholeAt} x={g.right + 30} y={g.rowTop(0) + 6} out={orderGrainAt - 6}>
          <span style={{ ...note(25, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>← per order, not per line</span>
        </Note>
        <Note at={threeAt} x={g.right + 30} y={g.rowTop(1) + 10} out={orderGrainAt - 6}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>order 1001: three lines</span>
        </Note>

        {/* What a sum makes of it. */}
        <Note at={fifteenAt} x={g.xs[fee]} y={below + h(26)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono>SUM(shipping_fee)</Mono> ={" "}
            <span style={{ fontFamily: "inherit", color: ACCENT_INK, fontWeight: 800, fontSize: 30 }}>{money(total)}</span>
          </span>
        </Note>
        <Note at={fifteenAt + 10} x={g.xs[fee]} y={below + h(72)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>for one fee of {money(paid)}</span>
        </Note>

        {/* Where it belongs: a fact at order grain. */}
        <Note at={orderGrainAt - 2} x={ORDERS_X} y={y(270) + 6}>
          <span style={{ ...label(22, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            grain: <span style={{ opacity: ease(frame, perOrderAt, 10) }}>one row per order</span>
          </span>
        </Note>
        <TableName g={og} at={orderGrainAt}>
          <Mono>fact_orders</Mono>
        </TableName>
        <DataTable
          g={og}
          cols={colsOf(order)}
          at={orderGrainAt}
          rows={order.rows.map((cells, i) => ({ cells, at: perOrderAt + i * 4 }))}
          marks={[{ row: 0, col: order.cols.indexOf("shipping_fee"), at: perOrderAt + 8, color: MARK_OK }]}
        />
        {/* The fee moves to the order's grain, where it is counted once. */}
        <KeyArrow from={[g.right + 14, g.rowMid(0)]} to={[og.x - 14, og.rowMid(0)]} at={orderGrainAt + 4} color={OK} />
        <Note at={catchesAt} x={ORDERS_X} y={og.rowTop(1) + h(40)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>
            Declared first,
            <br />
            the grain catches it.
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
