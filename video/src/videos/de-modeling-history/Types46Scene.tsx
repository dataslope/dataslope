import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TYPES46 } from "./data";
import { AUSTIN_WASH, BOSTON_WASH, colsOf, DataTable, Drift, geoOf, TableName, X0 } from "./parts";

const BAND4 = 320;
const BAND6 = 540;
const TABLE_X = 420;
const ROWS = { headH: 38, rowH: 42, bodySize: 21, headSize: 19 } as const;

/**
 * Question 4, built from the page's Type 2 table. Type 4: the main table
 * keeps customer 42's current row (15 rows in all, one per customer) and a
 * history table of its own holds every version (24 rows). Type 6: Type 2's
 * rows plus current_city on every row, so the point-in-time join gives
 * order 101 Boston as it was and Austin as it is now, from one row; then the
 * price, the current column rewritten on every old row at each move.
 */
export const Types46Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("type46").from;
  const qAt = n.word("type46", "Question four");
  const textAt = n.word("type46", "What are slowly changing dimension types");
  const splitsAt = n.word("type46", "Type four splits the table");
  const mainAt = n.word("type46", "The main dimension keeps only current values");
  const fifteenAt = n.word("type46", "fifteen rows");
  const historyAt = n.word("type46", "the history moves to a table of its own");
  const twentyFourAt = n.word("type46", "twenty-four rows");
  const useAt = n.word("type46", "Use it when history is large");
  const sixAt = n.word("type6", "Type six is one, plus two, plus three");
  const versionsAt = n.word("type6", "It versions rows like Type two");
  const carriesAt = n.word("type6", "every row also carries the current value");
  const o101At = n.word("type6", "order one oh one reports Boston");
  const nowAt = n.word("type6", "Austin as it is now");
  const joinAt = n.word("type6", "without a second join");
  const priceAt = n.word("type6-cost", "The price");
  const rewritesAt = n.word("type6-cost", "every move rewrites that current column");
  const oldAt = n.word("type6-cost", "all of the customer's old rows");
  const end = n.beat("type6-cost").to;

  // ── Type 4 ──
  const M = TYPES46.t4Main;
  const H = TYPES46.t4History;
  const gm = geoOf(M, TABLE_X, y(BAND4) + h(44), h, ROWS);
  const gh = geoOf(H, gm.right + 70, y(BAND4) + h(44), h, ROWS);

  // ── Type 6 ──
  const R = TYPES46.t6Rows;
  const O = TYPES46.t6Orders;
  const gr = geoOf(R, TABLE_X, y(BAND6) + h(44), h, ROWS);
  const go = geoOf(O, TABLE_X, gr.rowTop(R.rows.length) + h(70), h, ROWS);
  const rCur = R.cols.indexOf("current_city");
  const oCity = O.cols.indexOf("city");
  const oCur = O.cols.indexOf("current_city");
  const dim4 = ease(frame, sixAt, 14) * 0.45;

  const bandLabel = (at: number, title: string, sub: string, top: number) => (
    <Note at={at} x={X0} y={top + h(44)}>
      <div style={{ ...note(32, INK), fontWeight: 750, whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap", marginTop: 4 }}>{sub}</div>
    </Note>
  );

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={splitsAt} level={-37} />
      <Sfx name="el-tap" at={fifteenAt} level={-35} />
      <Sfx name="el-tap" at={twentyFourAt} level={-35} />
      <Sfx name="el-pencil" at={versionsAt} level={-36} />
      <Sfx name="el-tap" at={carriesAt + 6} level={-35} />
      <Sfx name="el-pop" at={nowAt} level={-35} />
      <Sfx name="el-pencil" at={rewritesAt + 2} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          What are slowly-changing dimension types 4 and 6?
        </QuestionCard>

        {/* ── Type 4: current values here, history in a table of its own ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - dim4 }}>
          {bandLabel(splitsAt - 2, "Type 4", "split the table", y(BAND4))}
          <TableName g={gm} at={mainAt}>
            customer
          </TableName>
          <DataTable g={gm} cols={colsOf(M)} at={mainAt} rows={[{ cells: M.rows[0], at: mainAt + 6 }]} />
          <Note at={fifteenAt - 2} x={gm.x} y={gm.rowTop(1) + h(12)}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              current only: <b><Num>{TYPES46.mainRows}</Num></b> rows
            </span>
          </Note>
          <TableName g={gh} at={historyAt}>
            customer_history
          </TableName>
          <DataTable g={gh} cols={colsOf(H)} at={historyAt} rows={[{ cells: H.rows[0], at: historyAt + 6 }, { cells: H.rows[1], at: historyAt + 10 }]} />
          <Note at={twentyFourAt - 2} x={gh.x} y={gh.rowTop(2) + h(12)}>
            <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
              every version: <b><Num>{TYPES46.historyRows}</Num></b> rows
            </span>
          </Note>
          <Note at={useAt} x={gh.right + 36} y={gh.rowTop(0)}>
            <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>
              for history that is
              <br />
              large and rarely read
            </span>
          </Note>
        </div>

        {/* ── Type 6: Type 2's rows, and the current value on each ── */}
        {bandLabel(sixAt - 2, "Type 6", "1 + 2 + 3", y(BAND6))}
        <TableName g={gr} at={versionsAt - 2}>
          dim_customer, with current_city
        </TableName>
        <DataTable
          g={gr}
          cols={colsOf(R)}
          at={versionsAt - 2}
          rows={[
            { cells: R.rows[0], at: versionsAt + 2 },
            { cells: R.rows[1], at: versionsAt + 6 },
          ]}
          marks={[
            { row: 0, col: R.cols.indexOf("city"), at: versionsAt + 10, out: carriesAt, color: BOSTON_WASH },
            { row: 1, col: R.cols.indexOf("city"), at: versionsAt + 14, out: carriesAt, color: AUSTIN_WASH },
            { row: 0, col: rCur, at: carriesAt + 6, out: o101At },
            { row: 1, col: rCur, at: carriesAt + 10, out: o101At },
            // The price: a move rewrites both rows' current_city.
            { row: 0, col: rCur, at: rewritesAt + 4 },
            { row: 1, col: rCur, at: oldAt },
          ]}
        />
        <TableName g={go} at={o101At - 4}>
          her orders, one join
        </TableName>
        <DataTable
          g={go}
          cols={colsOf(O)}
          at={o101At - 4}
          rows={[
            { cells: O.rows[0], at: o101At },
            { cells: O.rows[1], at: o101At + 4 },
          ]}
          marks={[
            { row: 0, col: oCity, at: o101At + 10, color: BOSTON_WASH },
            { row: 0, col: oCur, at: nowAt + 2, color: AUSTIN_WASH },
          ]}
        />
        <Note at={o101At + 12} x={go.right + 30} y={go.rowTop(0) + h(4)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            Boston as it was
            <span style={{ opacity: ease(frame, nowAt + 4, 10) }}>, Austin as it is now</span>
          </span>
        </Note>
        <Note at={joinAt} x={go.right + 30} y={go.rowTop(0) + h(40)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>no second join</span>
        </Note>
        <Note at={priceAt} x={gr.right + 30} y={gr.rowTop(0) + h(2)}>
          <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
            the price:
            <span style={{ opacity: ease(frame, rewritesAt, 10) }}>
              {" "}a move rewrites
              <br />
              <span style={{ fontWeight: 650 }}>current_city</span> on every old row
            </span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
