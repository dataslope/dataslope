import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { ColumnRule, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MEASURE, money } from "./data";
import { colsOf, DataTable, Drift, geoOf, Listing, listingHeight, listingWidth, MARK_BAD, MARK_OK, OK_INK, TableName, X0 } from "./parts";

const SIZE = 20;
const ROWS = { headH: 42, rowH: 48, bodySize: 22, headSize: 20 } as const;

/** A table's money columns with separators. */
const withMoney = (t: { cols: string[]; rows: string[][] }) => ({
  cols: t.cols,
  rows: t.rows.map((r) => r.map((v, j) => (/amount|revenue/.test(t.cols[j]) ? money(v) : v))),
});

/**
 * Question 7, on the video's own order 7001: booked at 900.00 in March, and
 * in April found to have been 800.00. The ledger takes a reversing row and
 * the corrected one, so today's sum is 800.00 while March's report, rerun,
 * still says the 900.00 it was published with; the same correction made in
 * place turns March into 800.00 under everyone who quoted it. Then the
 * page's two answers for a rule change: version the fact, or a restated
 * column.
 */
export const MeasureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("measure").from;
  const qAt = n.word("measure", "Question seven");
  const textAt = n.word("measure", "How do you handle a slowly changing measure");
  const fixedAt = n.word("measure", "A measure is fixed when the event happens");
  const marchAt = n.word("measure", "booked at nine hundred dollars in March");
  const aprilAt = n.word("measure", "In April, it turns out it was eight hundred");
  const dontAt = n.word("measure-reverse", "Don't update it in place");
  const reverseAt = n.word("measure-reverse", "Insert a reversing row");
  const correctedAt = n.word("measure-reverse", "and the corrected eight hundred");
  const todayAt = n.word("measure-reverse", "Today's total is eight hundred");
  const rerunAt = n.word("measure-why", "March's report, run again");
  const stillAt = n.word("measure-why", "still says nine hundred");
  const overwriteAt = n.word("measure-why", "Overwrite the row instead");
  const changesAt = n.word("measure-why", "last month's number changes");
  const quotedAt = n.word("measure-why", "under everyone who quoted it");
  const rulesAt = n.word("measure-restate", "When the rules change");
  const recognizedAt = n.word("measure-restate", "like revenue recognized a new way");
  const versionAt = n.word("measure-restate", "version the fact");
  const columnAt = n.word("measure-restate", "keep the restated amount in a column of its own");
  const end = n.beat("measure-restate").to;

  // ── Row A: the ledger, and the INSERT that corrects it ──
  const Lg = withMoney(MEASURE.rows);
  const tableTop = y(350);
  const gl = geoOf(Lg, X0, tableTop, h, ROWS);
  const amount = Lg.cols.indexOf("amount");
  const RX = gl.right + 110;
  const R = MEASURE.reverse;
  const rW = listingWidth(R.lines, 21);

  // ── Row B: March, rerun two ways ──
  const rowB = y(600);
  // The rerun is the March report's own SQL, run again after the correction.
  const M = MEASURE.marchReport;
  const O = MEASURE.overwrite;
  const MO = withMoney({ cols: ["march_revenue"], rows: [[MEASURE.marchOverwritten]] });
  const MR = withMoney({ cols: ["march_revenue"], rows: [[MEASURE.marchRerun]] });
  const bW = Math.max(listingWidth(M.lines, SIZE), listingWidth(O.lines, SIZE));
  const BX = X0 + bW + 120;
  const resTop = rowB + listingHeight(3, SIZE) + h(56);
  const gm = geoOf(MR, X0, resTop, h, ROWS);
  const go = geoOf(MO, BX, resTop, h, ROWS);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={marchAt + 4} level={-34} />
      <Sfx name="el-pencil" at={reverseAt} level={-36} />
      <Sfx name="el-tap" at={reverseAt + 10} level={-34} />
      <Sfx name="el-tap" at={correctedAt + 6} level={-34} />
      <Sfx name="el-chime" at={todayAt + 4} level={-37} />
      <Sfx name="el-pop" at={stillAt + 2} level={-34} />
      <Sfx name="el-scratch" at={changesAt + 2} level={-34} />
      <Sfx name="el-pencil" at={versionAt} level={-36} />

      <Drift from={from} to={end + 30}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={54}>
          How do you handle a slowly changing measure in a fact table?
        </QuestionCard>

        {/* ── Row A ── */}
        <Note at={fixedAt} x={X0} y={y(250)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>A measure is fixed when the event happens</span>
        </Note>
        <TableName g={gl} at={marchAt - 4}>
          fact_sales, order <Num>7001</Num>
        </TableName>
        <DataTable
          g={gl}
          cols={colsOf(Lg)}
          at={marchAt - 4}
          rows={[
            { cells: Lg.rows[0], at: marchAt },
            { cells: Lg.rows[1], at: reverseAt + 8, grow: true },
            { cells: Lg.rows[2], at: correctedAt + 4, grow: true },
          ]}
          marks={[
            { row: 0, col: amount, at: marchAt + 8, out: aprilAt },
            { row: 1, col: amount, at: reverseAt + 14, out: todayAt },
            { row: 2, col: amount, at: correctedAt + 10, out: todayAt },
          ]}
        />
        <Note at={todayAt} x={RX} y={tableTop + h(186)}>
          <span style={{ ...note(26, OK_INK), whiteSpace: "nowrap" }}>
            Today&rsquo;s total: <Num>{money(MEASURE.today)}</Num>
          </span>
        </Note>
        <Note at={aprilAt} x={RX} y={tableTop - h(36)} out={dontAt + 6}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            In April: it was <Num>{Lg.rows[2][amount]}</Num>
          </span>
        </Note>
        <Note at={dontAt} x={RX} y={tableTop - h(36)} out={rulesAt - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>Not an update in place: two new rows</span>
        </Note>
        <Listing lines={R.lines} x={RX} top={tableTop + h(20)} width={rW} size={21} at={reverseAt - 2} out={rulesAt - 4} />

        {/* ── Row B: March, rerun ── */}
        <Listing lines={M.lines} x={X0} top={rowB} width={bW} size={SIZE} at={rerunAt - 2} title="March’s report, run again on the ledger" />
        <TableName g={gm} at={stillAt - 4}>
          March, as it runs today
        </TableName>
        <DataTable g={gm} cols={colsOf(MR)} at={stillAt - 4} rows={[{ cells: MR.rows[0], at: stillAt }]} marks={[{ row: 0, col: 0, at: stillAt + 6, color: MARK_OK }]} />
        <Note at={stillAt + 10} x={gm.right + 30} y={gm.rowTop(0) + h(8)}>
          <span style={{ ...note(23, OK_INK), whiteSpace: "nowrap" }}>As published</span>
        </Note>
        <ColumnRule x={BX - 60} top={rowB - h(30)} height={resTop + h(100) - rowB} at={overwriteAt} />
        <Listing lines={O.lines} x={BX} top={rowB} width={bW} size={SIZE} at={overwriteAt - 2} title="The same fix, made in place" />
        <TableName g={go} at={changesAt - 6}>
          March&rsquo;s report, run on it
        </TableName>
        <DataTable g={go} cols={colsOf(MO)} at={changesAt - 6} rows={[{ cells: MO.rows[0], at: changesAt - 2 }]} marks={[{ row: 0, col: 0, at: changesAt + 4, color: MARK_BAD }]} />
        <Note at={quotedAt} x={go.right + 30} y={go.rowTop(0) + h(8)}>
          <span style={{ ...note(23, ACCENT_INK), whiteSpace: "nowrap" }}>Changed under everyone who quoted it</span>
        </Note>

        {/* ── Row A, last: when the rules change ── */}
        <Note at={rulesAt} x={RX} y={tableTop - h(36)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            When the rules change
            <span style={{ color: INK_SOFT, opacity: ease(frame, recognizedAt, 10) }}>: revenue recognized a new way</span>
          </span>
        </Note>
        <Note at={versionAt - 2} x={RX} y={tableTop + h(36)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>Version the fact</span>
        </Note>
        <Note at={columnAt - 2} x={RX} y={tableTop + h(92)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>Or keep a restated column</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
