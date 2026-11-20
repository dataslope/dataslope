import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RATIO } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Listing,
  listingHeight,
  MARK,
  MARK_BLUE,
  MARK_GREEN,
  MARK_RED,
  OK_INK,
  rowsAt,
  StrikeBar,
  TableName,
  X0,
} from "./parts";

const TOP = 330;
const SIZE = 20;
const R_X = 900;

const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Question 12 on the video's own two days, sized as the page's "a 1-order
 * day and a 10,000-order day": each day's order value, 200.00 and 50.00; the
 * average of the two, 125.00, in red; the sum over the sum, 50.01, in green.
 * Then the model keeps the two components and drops the stored ratio.
 */
export const RatioScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ratio").from;
  const qAt = n.word("ratio", "Question twelve");
  const textAt = n.word("ratio", "Why compute ratios");
  const asked = n.word("ratio", "averaging per-row ratios") + 2;
  const sameAt = n.word("ratio-avg", "weighs every row the same");
  const oneAt = n.word("ratio-avg", "One day has a single order");
  const nextAt = n.word("ratio-avg", "The next has ten thousand orders");
  const avgAt = n.word("ratio-avg", "Average the two days' order values");
  const got125At = n.word("ratio-avg", "a hundred twenty-five dollars");
  const sumAt = n.word("ratio-sum", "Sum the revenue");
  const ordersAt = n.word("ratio-sum", "sum the orders");
  const divideAt = n.word("ratio-sum", "then divide");
  const fiftyAt = n.word("ratio-sum", "just over fifty dollars");
  const reallyAt = n.word("ratio-sum", "what the average order really was");
  const keepsAt = n.word("ratio-store", "keeps the numerator and the denominator");
  const grainAt = n.word("ratio-store", "divides at whatever grain");
  const end = n.beat("ratio-store").to;

  const D = RATIO.perDay;
  const dg = geoOf(D, X0, y(TOP) + listingHeight(D.lines.length, SIZE) + h(24), h, { rowH: 52 });
  const c = (name: string) => D.cols.indexOf(name);
  const A = RATIO.averaged;
  const ag = geoOf(A, R_X, y(TOP) + listingHeight(A.lines.length, SIZE) + h(20), h, { rowH: 50 });
  const S = RATIO.summed;
  const sTop = y(560);
  const sg = geoOf(S, R_X, sTop + listingHeight(S.lines.length, SIZE) + h(20), h, { rowH: 50 });
  const revenue = D.rows.reduce((s, r) => s + Number(r[c("revenue")]), 0);
  const orders = D.rows.reduce((s, r) => s + Number(r[c("orders")]), 0);
  const aovX = dg.xs[c("aov")] + dg.pad - 6;
  const aovW = dg.widths[c("aov")] - 2 * dg.pad + 12;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={oneAt + 4} level={-33} />
      <Sfx name="el-tap" at={nextAt + 4} level={-33} />
      <Sfx name="el-pop" at={got125At} level={-32} />
      <Sfx name="el-pop" at={fiftyAt} level={-32} />
      <Sfx name="el-scratch" at={keepsAt + 10} level={-34} />
      <Sfx name="el-chime" at={grainAt + 4} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={60}>
          Why compute ratios from summed components instead of averaging per-row ratios?
        </QuestionCard>

        {/* ── Two days, and each day's order value ── */}
        <Listing lines={D.lines} x={X0} top={y(TOP)} size={SIZE} at={asked} marks={[{ line: "AS aov", at: sameAt + 2, out: oneAt }]} />
        <TableName g={dg} at={asked + 6}>
          daily_orders
        </TableName>
        <DataTable
          g={dg}
          cols={colsOf(D, { aov: { ink: BLUE_INK } })}
          at={asked + 6}
          rows={[
            { cells: D.rows[0], at: oneAt + 2 },
            { cells: D.rows[1], at: nextAt + 2 },
          ]}
          marks={[
            ...D.rows.map((_, row) => ({ row, col: c("aov"), at: avgAt + 2 + row * 4, out: sumAt, color: MARK })),
            ...D.rows.map((_, row) => ({ row, col: c("revenue"), at: sumAt + 2 + row * 3, out: keepsAt, color: MARK_BLUE })),
            ...D.rows.map((_, row) => ({ row, col: c("orders"), at: ordersAt + 2 + row * 3, out: keepsAt, color: MARK_BLUE })),
            ...D.rows.map((_, row) => ({ row, col: c("revenue"), at: keepsAt + 2, color: MARK_GREEN })),
            ...D.rows.map((_, row) => ({ row, col: c("orders"), at: keepsAt + 2, color: MARK_GREEN })),
          ]}
        />
        <StrikeBar x={aovX} y={dg.top + dg.headH / 2} w={aovW} at={keepsAt + 10} />
        {D.rows.map((_, row) => (
          <StrikeBar key={row} x={aovX} y={dg.rowMid(row)} w={aovW} at={keepsAt + 14 + row * 3} />
        ))}
        <Note at={nextAt + 10} x={X0} y={dg.rowTop(D.rows.length) + h(24)} out={keepsAt}>
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>Two rows, weighed the same by an average</span>
        </Note>
        <Note at={keepsAt + 4} x={X0} y={dg.rowTop(D.rows.length) + h(24)}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>Keep the numerator and the denominator</span>
        </Note>
        <Note at={grainAt} x={X0} y={dg.rowTop(D.rows.length) + h(68)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>Divide at the grain the report asks for</span>
        </Note>

        {/* ── The average of the ratios ── */}
        <Listing lines={A.lines} x={R_X} top={y(TOP)} size={SIZE} at={avgAt - 2} marks={[{ line: "AVG(", text: "AVG(revenue / NULLIF(orders, 0))", at: avgAt + 8 }]} />
        <DataTable g={ag} cols={colsOf(A, { avg_of_ratios: { ink: ACCENT_INK } })} at={avgAt + 6} rows={rowsAt(A.rows, got125At - 4)} marks={[{ row: 0, col: 0, at: got125At, color: MARK_RED }]} />
        <Note at={got125At + 6} x={ag.right + 30} y={ag.rowTop(0) + h(6)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>The 1-order day counts as much as the 10,000</span>
        </Note>

        {/* ── The sum over the sum ── */}
        <Listing lines={S.lines} x={R_X} top={sTop} size={SIZE} at={sumAt - 2} marks={[{ line: "SUM(revenue)", text: "SUM(revenue) / NULLIF(SUM(orders), 0)", at: divideAt }]} />
        <DataTable g={sg} cols={colsOf(S, { ratio_of_sums: { ink: OK_INK } })} at={divideAt + 4} rows={rowsAt(S.rows, fiftyAt - 4)} marks={[{ row: 0, col: 0, at: fiftyAt, color: MARK_GREEN }]} />
        <Note at={reallyAt} x={sg.right + 30} y={sg.rowTop(0) + h(6)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>
            {money(revenue)} over {orders.toLocaleString("en-US")} orders
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
