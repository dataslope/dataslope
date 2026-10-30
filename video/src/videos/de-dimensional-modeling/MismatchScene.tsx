import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BUDGET, FIXED, FIXED_TOTALS, money, NAIVE, NAIVE_TOTALS, SALES } from "./data";
import { colsOf, DataTable, Drift, geoOf, MARK, MARK_BAD, MARK_OK, Mono, OK, OK_INK, TableName, Verdict, X0 } from "./parts";

const SALES_Y = 334;
const BUDGET_Y = 712;
const RES_X = 860;
const OPTS = { headH: 50, rowH: 50, bodySize: 25, headSize: 22 } as const;

/** A bracket down the right of some rows, drawn on `at`. */
const Brace: React.FC<{ x: number; y0: number; y1: number; at: number; color: string; out?: number }> = ({ x, y0, y1, at, color, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (y0 + y1) / 2;
  const len = (y1 - y0) / 2;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <path
        d={`M${x},${mid - len * p} L${x + 12},${mid - len * p} M${x + 12},${mid - len * p} L${x + 12},${mid + len * p} M${x + 12},${mid + len * p} L${x},${mid + len * p}`}
        fill="none"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Question 4. The video's own five sales, per transaction, against two days
 * of budget: joined on day and region, each day's budget repeats once per
 * sale and 270.00 of budget sums to 690.00. Rolled up to days first, the
 * join has two rows and the budget is 270.00 again; sales are 190.00 both
 * ways.
 */
export const MismatchScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("mismatch").from;
  const qAt = n.word("mismatch", "Question four");
  const textAt = n.word("mismatch", "What does grain mismatch mean");
  const sameAt = n.word("mismatch", "the same trap between two fact tables");
  const salesAt = n.word("mismatch", "Sales are recorded per transaction");
  const budgetAt = n.word("mismatch", "The budget is one row per day and region");
  const joinAt = n.word("mismatch-join", "Join them on day and region");
  const repeatsAt = n.word("mismatch-join", "repeats once per sale");
  const twoDaysAt = n.word("mismatch-join", "Two days of budget");
  const sumAt = n.word("mismatch-join", "add up to six hundred ninety");
  const fixAt = n.word("mismatch-fix", "The fix");
  const rollAt = n.word("mismatch-fix", "roll the finer table up");
  const thenAt = n.word("mismatch-fix", "then join");
  const perDayAt = n.word("mismatch-fix", "Sales become one row per day");
  const againAt = n.word("mismatch-fix", "two hundred seventy again");
  const end = n.beat("mismatch-fix").to;

  const sg = geoOf(SALES, X0, y(SALES_Y), h, OPTS);
  const bg = geoOf(BUDGET, X0, y(BUDGET_Y), h, OPTS);
  const ng = geoOf(NAIVE, RES_X, y(SALES_Y), h, OPTS);
  const fg = geoOf(FIXED, RES_X, y(SALES_Y), h, OPTS);
  const amount = SALES.cols.indexOf("amount");
  const nBudget = NAIVE.cols.indexOf("budget");
  const fBudget = FIXED.cols.indexOf("budget");
  const fSales = FIXED.cols.indexOf("sales");
  const day = (d: string) => SALES.rows.map((r, i) => (r[0] === d ? i : -1)).filter((i) => i >= 0);
  const days = BUDGET.rows.map((r) => r[0]);
  const naiveOut = fixAt - 2;
  const naiveBudget = NAIVE_TOTALS.rows[0][NAIVE_TOTALS.cols.indexOf("budget")];
  const naiveSales = NAIVE_TOTALS.rows[0][NAIVE_TOTALS.cols.indexOf("sales")];
  const fixedBudget = FIXED_TOTALS.rows[0][FIXED_TOTALS.cols.indexOf("budget")];
  const fixedSales = FIXED_TOTALS.rows[0][FIXED_TOTALS.cols.indexOf("sales")];
  const resBottom = ng.rowTop(NAIVE.rows.length);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={salesAt} level={-33} />
      <Sfx name="el-tap" at={budgetAt} level={-33} />
      <Sfx name="el-whoosh" at={joinAt} level={-35} />
      {NAIVE.rows.map((_, i) => (
        <Sfx key={i} name="el-tap" at={repeatsAt + i * 4} level={-37} />
      ))}
      <Sfx name="el-pop" at={sumAt + 4} level={-32} />
      <Sfx name="el-pencil" at={rollAt + 4} level={-35} />
      <Sfx name="el-chime" at={againAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What does grain mismatch mean, and how do you fix it?
        </QuestionCard>
        <Note at={sameAt} x={X0} y={y(258)}>
          <span style={{ ...label(23, INK_SOFT), fontWeight: 650, whiteSpace: "nowrap" }}>Two fact tables at two grains</span>
        </Note>

        {/* ── The two facts ── */}
        <TableName g={sg} at={salesAt}>
          <Mono>fact_sales</Mono> <span style={{ color: INK_SOFT, fontWeight: 560 }}>· one row per sale</span>
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(SALES)}
          at={salesAt}
          rows={SALES.rows.map((cells, i) => ({ cells, at: salesAt + 4 + i * 3 }))}
          marks={SALES.rows.map((_, i) => ({ row: i, col: amount, at: rollAt + 6 + i * 2, color: MARK_OK }))}
        />
        <TableName g={bg} at={budgetAt}>
          <Mono>fact_budget</Mono> <span style={{ color: INK_SOFT, fontWeight: 560 }}>· one row per day and region</span>
        </TableName>
        <DataTable
          g={bg}
          cols={colsOf(BUDGET)}
          at={budgetAt}
          rows={BUDGET.rows.map((cells, i) => ({ cells, at: budgetAt + 4 + i * 3 }))}
          marks={[
            { row: 0, col: BUDGET.cols.indexOf("budget"), at: twoDaysAt, color: MARK, out: fixAt },
            { row: 1, col: BUDGET.cols.indexOf("budget"), at: twoDaysAt + 4, color: MARK, out: fixAt },
          ]}
        />
        <Note at={twoDaysAt + 6} x={bg.right + 26} y={bg.rowTop(0) + 14} out={fixAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            two days: <b>{money(fixedBudget)}</b>
          </span>
        </Note>

        {/* ── Joined at the sale's grain: the budget repeats ── */}
        <TableName g={ng} at={joinAt} out={naiveOut}>
          joined on day and region
        </TableName>
        <DataTable
          g={ng}
          cols={colsOf(NAIVE)}
          at={joinAt}
          out={naiveOut}
          rows={NAIVE.rows.map((cells, i) => ({ cells, at: joinAt + 6 + i * 3 }))}
          marks={NAIVE.rows.flatMap((_, i) => [
            { row: i, col: nBudget, at: repeatsAt + i * 4, color: MARK },
            { row: i, col: nBudget, at: sumAt, color: MARK_BAD },
          ])}
        />
        {days.map((d) => {
          const rows = NAIVE.rows.map((r, i) => (r[0] === d ? i : -1)).filter((i) => i >= 0);
          return (
            <Brace
              key={d}
              x={ng.right + 10}
              y0={ng.rowTop(rows[0]) + 6}
              y1={ng.rowTop(rows[rows.length - 1] + 1) - 6}
              at={repeatsAt + rows[0] * 4 + 6}
              color={ACCENT_INK}
              out={naiveOut}
            />
          );
        })}
        <Note at={repeatsAt + 10} x={ng.right + 36} y={ng.rowTop(1) + 8} out={naiveOut}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            one budget,
            <br />
            three rows
          </span>
        </Note>
        <Verdict at={sumAt} x={RES_X} y={resBottom + h(26)} label={<Mono>SUM(budget)</Mono>} value={money(naiveBudget)} tone="bad" out={naiveOut} />
        <Verdict at={sumAt + 10} x={RES_X} y={resBottom + h(80)} label={<Mono>SUM(amount)</Mono>} value={money(naiveSales)} out={naiveOut} size={26} />

        {/* ── The fix: sales rolled up to days, then joined ── */}
        {days.map((d, k) => {
          const rows = day(d);
          return (
            <Brace
              key={d}
              x={sg.right + 10}
              y0={sg.rowTop(rows[0]) + 6}
              y1={sg.rowTop(rows[rows.length - 1] + 1) - 6}
              at={rollAt + k * 8}
              color={OK}
            />
          );
        })}
        {days.map((d, k) => {
          const rows = day(d);
          const yMid = (sg.rowTop(rows[0]) + sg.rowTop(rows[rows.length - 1] + 1)) / 2;
          return (
            <Note key={d} at={rollAt + 6 + k * 8} x={sg.right + 34} y={yMid - 16}>
              <span style={{ ...note(24, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>{money(FIXED.rows[k][fSales])}</span>
            </Note>
          );
        })}
        <TableName g={fg} at={thenAt}>
          rolled up to days, then joined
        </TableName>
        <DataTable
          g={fg}
          cols={colsOf(FIXED)}
          at={thenAt}
          rows={FIXED.rows.map((cells, i) => ({ cells, at: perDayAt + i * 4 }))}
          marks={FIXED.rows.map((_, i) => ({ row: i, col: fBudget, at: againAt + i * 4, color: MARK_OK }))}
        />
        <Note at={thenAt + 4} x={RES_X} y={fg.rowTop(FIXED.rows.length) + h(22)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono>WITH daily_sales AS (… GROUP BY sale_date, region)</Mono>
          </span>
        </Note>
        <Verdict at={againAt} x={RES_X} y={fg.rowTop(FIXED.rows.length) + h(80)} label={<Mono>SUM(budget)</Mono>} value={money(fixedBudget)} tone="ok" />
        <Verdict at={againAt + 10} x={RES_X} y={fg.rowTop(FIXED.rows.length) + h(134)} label={<Mono>SUM(sales)</Mono>} value={money(fixedSales)} size={26} />
      </Drift>
    </AbsoluteFill>
  );
};
