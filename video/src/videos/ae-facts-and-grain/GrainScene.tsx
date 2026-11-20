import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, body, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GRAIN } from "./data";
import { colsOf, Cross, DataTable, Drift, geoOf, KeyArrow, Mark, MARK_OK, money, Mono, OK, OK_INK, Spot, TableName, X0 } from "./parts";

const TABLE_Y = 470;
const GRAIN_Y = 290;
const RIGHT_X = 1170;
const OPTS = { headH: 52, rowH: 62, bodySize: 27, headSize: 22 } as const;

/**
 * Question 2. The grain said first, "one row per order line", as the order-
 * line fact's title; every column tested against it: quantity and amount
 * pass, the shipping fee fails, and on order 1001's three lines it sums to
 * 15.00 for one 5.00 fee (Data Engineer Part 3's rows, re-run). It moves to
 * a fact at order grain, 5.00 once, or is split across the lines by amount,
 * 2.46 + 0.69 + 1.85, which add back to 5.00. Nothing errors: a declared
 * grain is what catches it. The parcel, the order shipped once, pops in as
 * the fee is named.
 */
export const GrainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("grain").from;
  const qAt = n.word("grain", "Question two");
  const textAt = n.word("grain", "What is the grain");
  const repAt = n.word("grain", "what one row represents");
  const sayAt = n.word("grain", "Say it before any column");
  const lineAt = n.word("grain", "one row per order line");
  const everyAt = n.word("grain-test", "every column has to make sense");
  const qtyAt = n.word("grain-test", "Quantity and amount do");
  const feeAt = n.word("grain-test", "A shipping fee doesn't");
  const onceAt = n.word("grain-test", "charged once per order");
  const threeAt = n.word("grain-test", "an order with three lines");
  const timesAt = n.word("grain-test", "three times");
  const fifteenAt = n.word("grain-test", "the sum says fifteen");
  const moveAt = n.word("grain-fix", "Move it to a fact at order grain");
  const splitAt = n.word("grain-fix", "or split it across the lines");
  const fiveAt = n.word("grain-fix", "add back to five");
  const errorsAt = n.word("grain-why", "Nothing errors");
  const wrongAt = n.word("grain-why", "The total is simply wrong");
  const catchesAt = n.word("grain-why", "a declared grain catches it");
  const end = n.beat("grain-why").to;

  const L = GRAIN.lines;
  const g = geoOf(L, X0, y(TABLE_Y), h, OPTS);
  const fee = L.cols.indexOf("shipping_fee");
  const qty = L.cols.indexOf("quantity");
  const amt = L.cols.indexOf("amount");
  const O = GRAIN.orderGrain;
  const og = geoOf(O, RIGHT_X, y(TABLE_Y), h, OPTS);
  const S = GRAIN.split;
  const sg = geoOf(S, RIGHT_X, og.rowTop(1) + h(96), h, { headH: 46, rowH: 50, bodySize: 24, headSize: 21 });
  const total = GRAIN.totals.rows[0][GRAIN.totals.cols.indexOf("shipping_fee")];
  const paid = O.rows[0][O.cols.indexOf("shipping_fee")];
  const share = S.cols.indexOf("fee_share");
  const shares = S.rows.map((r) => r[share]);
  const shareSum = shares.reduce((t, v) => t + Number(v), 0).toFixed(2);
  if (shareSum !== Number(paid).toFixed(2)) throw new Error(`the shares add to ${shareSum}, not ${paid}`);
  const below = g.rowTop(L.rows.length);

  // A dash pattern of "0 1" still paints a round cap, so a mark not yet due
  // is not drawn at all.
  const testRow = (j: number, at: number, ok: boolean) =>
    frame < at ? null : (
      <div key={j} style={{ position: "absolute", left: g.xs[j] + g.widths[j] / 2 - 13, top: g.top - 40, width: 26, height: 26 }}>
        {ok ? <Tick at={at} size={26} /> : <Cross at={at} size={26} />}
      </div>
    );

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={lineAt} level={-35} />
      <Sfx name="el-tap" at={qtyAt + 2} level={-29} />
      <Sfx name="el-pop" at={feeAt} level={-30} />
      <Sfx name="el-scratch" at={feeAt + 6} level={-35} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="el-tap" at={timesAt + i * 5} level={-31} />
      ))}
      <Sfx name="el-tap" at={fifteenAt + 4} level={-28} />
      <Sfx name="el-whoosh" at={moveAt} level={-35} />
      <Sfx name="el-sprinkle" at={splitAt + 6} level={-34} />
      <Sfx name="el-chime" at={catchesAt + 6} level={-35} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is the grain, and why pin it down first?
        </QuestionCard>
        {/* The parcel, the order that ships once, clear of the question and
            of the order-grain table under it. */}
        <Spot art="parcel" at={feeAt} left={1590} top={y(196)} width={170} />

        {/* The grain, said before any column, as the table's title. */}
        <Note at={repAt} x={X0} y={y(GRAIN_Y) - h(46)}>
          <span style={{ ...label(23, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
            The grain: what one row represents, <span style={{ opacity: ease(frame, sayAt, 12) }}>said first</span>
          </span>
        </Note>
        <Note at={sayAt + 2} x={X0 - 2} y={y(GRAIN_Y)}>
          <span style={{ ...body(44), color: INK, whiteSpace: "nowrap" }}>
            <Mark at={lineAt}>One row per order line</Mark>
          </span>
        </Note>

        <TableName g={g} at={lineAt + 4}>
          <Mono>fact_order_lines</Mono>
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(L)}
          at={lineAt + 4}
          rows={L.rows.map((cells, i) => ({ cells, at: lineAt + 8 + i * 4 }))}
          marks={[
            ...L.rows.flatMap((_, i) => [
              { row: i, col: qty, at: qtyAt + 4, out: feeAt, color: MARK_OK },
              { row: i, col: amt, at: qtyAt + 6, out: feeAt, color: MARK_OK },
            ]),
            ...L.rows.map((_, i) => ({ row: i, col: fee, at: timesAt + i * 5 })),
          ]}
        />
        {/* Each column tested against the grain, over its title. */}
        <Note at={everyAt} x={g.right + 30} y={g.top - h(44)} out={moveAt - 6}>
          <span style={{ ...label(21, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>Does it make sense per line?</span>
        </Note>
        {testRow(qty, qtyAt + 2, true)}
        {testRow(amt, qtyAt + 6, true)}
        {testRow(fee, feeAt + 6, false)}
        <Note at={onceAt} x={g.right + 30} y={g.rowTop(0) + h(12)} out={moveAt - 6}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Charged once per order</span>
        </Note>
        <Note at={threeAt} x={g.right + 30} y={g.rowTop(1) + h(14)} out={moveAt - 6}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Order 1001, three lines</span>
        </Note>

        {/* What a sum makes of it. */}
        <Note at={fifteenAt} x={g.xs[fee]} y={below + h(28)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono>SUM(shipping_fee)</Mono> = <span style={{ color: ACCENT_INK, fontWeight: 500 }}>{money(total)}</span>
          </span>
        </Note>
        <Note at={fifteenAt + 10} x={g.xs[fee]} y={below + h(72)}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>for one fee of {money(paid)}</span>
        </Note>

        {/* Where it belongs: a fact at order grain, or split by amount. */}
        <Note at={moveAt - 2} x={RIGHT_X} y={y(GRAIN_Y) + h(8)}>
          <span style={{ ...label(23, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>Grain: one row per order</span>
        </Note>
        <TableName g={og} at={moveAt}>
          <Mono>fact_orders</Mono>
        </TableName>
        <DataTable
          g={og}
          cols={colsOf(O)}
          at={moveAt}
          rows={O.rows.map((cells, i) => ({ cells, at: moveAt + 6 + i * 4 }))}
          marks={[{ row: 0, col: O.cols.indexOf("shipping_fee"), at: moveAt + 12, color: MARK_OK }]}
        />
        <KeyArrow from={[g.right + 14, g.rowMid(0)]} to={[og.x - 14, og.rowMid(0)]} at={moveAt + 4} color={OK} />

        <TableName g={sg} at={splitAt}>
          Or split by amount
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(S)}
          at={splitAt}
          rows={S.rows.map((cells, i) => ({ cells, at: splitAt + 4 + i * 4 }))}
          marks={S.rows.map((_, row) => ({ row, col: share, at: fiveAt + row * 3, color: MARK_OK }))}
        />
        <Note at={fiveAt + 4} x={RIGHT_X} y={sg.rowTop(S.rows.length) + h(20)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            {shares.map((v, i) => (
              <React.Fragment key={i}>
                {i ? " + " : ""}
                <Num>{v}</Num>
              </React.Fragment>
            ))}{" "}
            = <b style={{ color: OK_INK }}>{money(shareSum)}</b>
          </span>
        </Note>

        {/* Why it matters: nothing errors. */}
        <Note at={errorsAt} x={X0} y={below + h(140)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            Nothing errors.
            <span style={{ opacity: ease(frame, wrongAt, 10) }}>
              {" "}
              The total is <span style={{ color: ACCENT_INK, fontWeight: 500 }}>simply wrong</span>.
            </span>
          </span>
        </Note>
        <Note at={catchesAt} x={X0} y={below + h(188)}>
          <span style={{ ...note(26, OK_INK), fontWeight: 500, whiteSpace: "nowrap" }}>A declared grain catches it before anyone sums.</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
