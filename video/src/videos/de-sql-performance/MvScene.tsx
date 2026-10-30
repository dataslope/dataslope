import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, headline, label, note } from "../../editorial/style";
import { NextLine, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MV, SLOW, thousands } from "./data";
import { colsOf, DataTable, Drift, geoOf, Listing, listingHeight, MARK_OK, MARK_RED, OK_INK, PlanBox, rowsAt, TableName, X0 } from "./parts";

const TOP = 300;
const SIZE = 21;
const PLAN = 20;
const R_X = 1060;
const BASE_X = 960;

/**
 * Question 10, and the close. The view's definition; then, as the narration
 * says a day is one row of 366, the plan Postgres printed for a day read
 * from the view (365 rows filtered) beside the same day computed from the
 * orders (997,268 filtered). Then staleness: 500 orders inserted on
 * 2024-12-31, the view's row still saying 2,732 (in red) while the orders
 * hold 3,232; REFRESH, and the cell takes the new count. When to use one
 * lands on the right, and the bridge to Part 3 under it all.
 */
export const MvScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("mv").from;
  const qAt = n.word("mv", "Question ten");
  const textAt = n.word("mv", "What is a materialized view");
  const storedAt = n.word("mv", "a query's result, stored");
  const dailyAt = n.word("mv-fast", "Daily revenue");
  const daysAt = n.word("mv-fast", "three hundred sixty-six rows");
  const dashAt = n.word("mv-fast", "a dashboard reads one");
  const insteadAt = n.word("mv-fast", "instead of the orders");
  const staleAt = n.word("mv-stale", "The price is staleness");
  const addAt = n.word("mv-stale", "Add five hundred orders");
  const stillAt = n.word("mv-stale", "the view still says");
  const refreshAt = n.word("mv-stale", "until it's refreshed");
  const useAt = n.word("mv-when", "Use one for");
  const expensiveAt = n.word("mv-when", "an expensive aggregation");
  const oftenAt = n.word("mv-when", "read far more often");
  const lagAt = n.word("mv-when", "some lag is fine");
  const shapesAt = n.word("next", "each one shapes a table");
  const nextAt = n.word("next", "Next: dimensional modeling");
  const end = n.beat("next").to;

  const createTop = y(TOP);
  const plansTop = createTop + listingHeight(MV.create.length, SIZE) + h(64);
  const insertTop = plansTop;
  const viewTop = insertTop + listingHeight(MV.insert.length, SIZE) + h(70);
  const vg = geoOf(MV.stale, X0, viewTop, h, { rowH: 48, extra: MV.fresh.rows });
  const ordersCol = MV.stale.cols.indexOf("orders");
  const revenueCol = MV.stale.cols.indexOf("revenue");

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={storedAt + 2} level={-35} />
      <Sfx name="el-pop" at={daysAt + 2} level={-32} />
      <Sfx name="el-scratch" at={stillAt + 6} level={-33} />
      <Sfx name="el-pop" at={refreshAt + 8} level={-32} />
      <Sfx name="el-chime" at={end - 30} level={-33} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is a materialized view, and when would you use one?
        </QuestionCard>

        <Listing lines={MV.create} x={X0} top={createTop} width={800} size={SIZE} at={storedAt - 4} marks={[{ line: "MATERIALIZED", at: storedAt + 6 }]} />

        {/* ── Fast: one row of 366, against the million orders ── */}
        <Note at={dailyAt} x={R_X} y={createTop + h(10)} out={staleAt}>
          <div style={{ ...label(21, INK_SOFT) }}>
            daily_revenue, from <Num>{thousands(SLOW.orders)}</Num> orders
          </div>
          <div style={{ ...headline(72), color: BLUE_INK, opacity: ease(frame, daysAt, 10) }}>
            <Num>{MV.days}</Num> rows
          </div>
        </Note>
        <Note at={dashAt - 2} x={X0} y={plansTop - h(40)} out={staleAt}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>One day, from the view</span>
        </Note>
        <PlanBox lines={MV.dayPlan} x={X0} top={plansTop} width={780} size={PLAN} at={dashAt} out={staleAt} marks={[{ line: "Rows Removed", at: dashAt + 14, color: MARK_OK }]} />
        <Note at={insteadAt - 2} x={BASE_X} y={plansTop - h(40)} out={staleAt}>
          <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>The same day, from the orders</span>
        </Note>
        <PlanBox lines={MV.basePlan} x={BASE_X} top={plansTop} width={800} size={PLAN} at={insteadAt} out={staleAt} marks={[{ line: "Rows Removed", at: insteadAt + 14, color: MARK_RED }]} />

        {/* ── Stale until refreshed ── */}
        <Listing lines={MV.insert} x={X0} top={insertTop} width={800} size={SIZE} at={addAt - 2} />
        <TableName g={vg} at={stillAt - 4}>
          daily_revenue, New Year&rsquo;s Eve
        </TableName>
        <DataTable
          g={vg}
          cols={colsOf(MV.stale, { orders: { ink: BLUE_INK }, revenue: { ink: BLUE_INK } })}
          at={stillAt - 4}
          rows={rowsAt(MV.stale.rows, stillAt)}
          marks={[{ row: 0, col: ordersCol, at: stillAt + 8, out: refreshAt + 8, color: MARK_RED }]}
          swaps={[
            { row: 0, col: ordersCol, at: refreshAt + 10, value: MV.fresh.rows[0][ordersCol], color: OK_INK },
            { row: 0, col: revenueCol, at: refreshAt + 12, value: MV.fresh.rows[0][revenueCol], color: OK_INK },
          ]}
        />
        <Note at={stillAt + 10} x={vg.right + 40} y={vg.rowTop(0) - h(4)} out={refreshAt + 4}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
            the orders now hold <Num>{thousands(Number(MV.truth.rows[0][ordersCol]))}</Num>
          </span>
        </Note>
        <Note at={refreshAt} x={vg.right + 40} y={vg.rowTop(0) - h(10)}>
          <Listing lines={MV.refresh} x={0} top={0} width={560} size={20} at={refreshAt} />
        </Note>

        {/* ── When to use one ── */}
        <Note at={useAt} x={R_X} y={createTop + h(10)}>
          <div style={{ ...label(22, INK), whiteSpace: "nowrap" }}>Use one when</div>
          {[
            { at: expensiveAt, text: "the query is an expensive aggregation" },
            { at: oftenAt, text: "it is read far more than its data changes" },
            { at: lagAt, text: "some lag is fine" },
          ].map((it) => (
            <div key={it.text} style={{ ...note(24, INK), whiteSpace: "nowrap", marginTop: h(10), opacity: ease(frame, it.at, 10) }}>
              {it.text}
            </div>
          ))}
        </Note>

        <div style={{ position: "absolute", left: R_X, top: viewTop + h(10), ...note(24, INK_SOFT), width: 700, opacity: ease(frame, shapesAt, 12) }}>
          An index, a partition, a stored result: each shapes a table around its queries.
        </div>
        <NextLine at={nextAt} x={X0} y={y(920)} width={1000}>
          dimensional modeling
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
