import React from "react";
import { AbsoluteFill } from "remotion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRAME } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  geoOf,
  Listing,
  listingHeight,
  MARK,
  MARK_BAD,
  MARK_OK,
  OK_INK,
  RowBracket,
  rowsAt,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const TABLE_X = 190;
const LIST_X = 660;
const SIZE = 19;
const LIST_W = 760;

/**
 * Questions 6, 7 and 8 on the video's own four payments, two of them on
 * January 2. A bracket beside the table is the frame: ROWS grows it one row
 * at a time (100, 350, 425), RANGE takes both January 2 rows together (425
 * twice), the default frame is RANGE's, and no ORDER BY gives every row 605.
 * Then LAST_VALUE on the page's first four days, with the default frame and
 * widened.
 */
export const FrameScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("frame").from;
  const qAt = n.word("frame", "Question");
  const textAt = n.word("frame", "What is a window frame");
  const asked = n.beat("frame").to;
  const sliceAt = n.word("frame-def", "the slice of rows");
  const sameDayAt = n.word("frame-def", "fall on the same day");
  const rowsAt0 = n.word("frame-rows", "Rows counts physical rows");
  const hundredAt = n.word("frame-rows", "a hundred");
  const threeFiftyAt = n.word("frame-rows", "three fifty");
  const fourTwentyFiveAt = n.word("frame-rows", "four twenty-five");
  const rangeAt = n.word("frame-range", "Range goes by");
  const togetherAt = n.word("frame-range", "come in together");
  const bothAt = n.word("frame-range", "Both get four twenty-five");
  const q7At = n.word("default", "Question seven");
  const q7TextAt = n.word("default", "What is the default frame");
  const noFrameAt = n.word("default", "with no frame");
  const runningAt = n.word("default", "a running total, not the total");
  const leaveOutAt = n.word("default", "Leave out order by");
  const sixOhFiveAt = n.word("default", "six oh five");
  const q8At = n.word("last", "Question eight");
  const q8TextAt = n.word("last", "What's the last value gotcha");
  const endsAt = n.word("last", "ends at the current row");
  const ownAt = n.word("last", "the row's own amount");
  const widenAt = n.word("last", "Widen the frame");
  const realAt = n.word("last", "the real last day");
  const end = n.beat("running-in").to;

  const P = FRAME.payments;
  const pg = geoOf(P, TABLE_X, y(TOP), h, { rowH: 56 });
  const peers = P.rows.flatMap((r, i) => (r[1] === P.rows[1][1] ? [i] : []));
  const last = P.rows.length - 1;
  const out78 = q8At - 4;

  // One result table under the listing; its totals change as the frame does.
  const R = FRAME.rows;
  const rg = geoOf(R, LIST_X, y(TOP) + listingHeight(5, SIZE) + h(22), h, { rowH: 50 });
  const tc = R.cols.indexOf("total");
  const swapsFrom = (t: { rows: readonly (readonly string[])[] }, at: number) =>
    t.rows.flatMap((r, row) => (r[tc] !== R.rows[row][tc] ? [{ row, col: tc, at, value: r[tc] }] : []));
  const toRange = swapsFrom(FRAME.range, togetherAt + 6);
  const whole = FRAME.whole;

  // ── Question 8 ──
  const LD = FRAME.lastDefault;
  const LW = FRAME.lastWide;
  const ldg = geoOf(LD, X0, y(TOP) + listingHeight(LD.lines.length, SIZE) + h(22), h, { rowH: 50 });
  const lwg = geoOf(LW, 1000, y(TOP) + listingHeight(LW.lines.length, SIZE) + h(22), h, { rowH: 50 });
  const lc = LD.cols.indexOf("last");

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={hundredAt} level={-34} />
      <Sfx name="el-tap" at={threeFiftyAt} level={-34} />
      <Sfx name="el-tap" at={fourTwentyFiveAt} level={-34} />
      <Sfx name="el-pop" at={togetherAt + 4} level={-32} />
      <Sfx name="el-scratch" at={runningAt} level={-34} />
      <Sfx name="el-pop" at={sixOhFiveAt} level={-32} />
      <Sfx name="el-scratch" at={ownAt} level={-32} />
      <Sfx name="el-pop" at={realAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} out={q7At - 4} size={60}>
          What is a window frame, and how do <QMono>ROWS</QMono> and <QMono>RANGE</QMono> differ?
        </QuestionCard>
        <QuestionCard n={7} at={q7At} textAt={q7TextAt - 2} out={out78} size={60}>
          What is the default frame, and why does it matter?
        </QuestionCard>
        <QuestionCard n={8} at={q8At} textAt={q8TextAt - 2} size={60}>
          What&apos;s the <QMono>LAST_VALUE</QMono> gotcha?
        </QuestionCard>

        {/* ── Four payments, two on one day ── */}
        <TableName g={pg} at={asked - 6} out={out78}>
          payments
        </TableName>
        <DataTable
          g={pg}
          cols={colsOf(P)}
          at={asked - 6}
          out={out78}
          rows={rowsAt(P.rows, asked - 2)}
          bands={peers.map((row) => ({ row, at: sameDayAt, color: MARK }))}
        />
        <Note at={sliceAt} x={TABLE_X} y={pg.rowTop(P.rows.length) + h(24)} out={out78} width={420}>
          <span style={{ ...note(24, INK_SOFT) }}>the frame: the rows the function sees for this one</span>
        </Note>
        <RowBracket
          g={pg}
          out={out78}
          steps={[
            { at: hundredAt - 2, from: 0, to: 0 },
            { at: threeFiftyAt - 2, from: 0, to: 1 },
            { at: fourTwentyFiveAt - 2, from: 0, to: 2 },
            { at: rangeAt + 4, from: 0, to: 1 },
            { at: togetherAt, from: 0, to: 2, current: 1 },
            { at: leaveOutAt + 4, from: 0, to: last },
          ]}
        />

        {/* ── ROWS, then RANGE, then the default, then no ORDER BY ── */}
        <Listing
          lines={R.lines}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={SIZE}
          at={rowsAt0 - 4}
          out={rangeAt - 2}
          marks={[{ line: 2, at: rowsAt0 + 6 }]}
        />
        <Listing
          lines={FRAME.range.lines}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={SIZE}
          at={rangeAt - 2}
          out={noFrameAt - 2}
          marks={[{ line: 2, at: rangeAt + 8 }]}
        />
        <Listing
          lines={FRAME.defaulted.lines}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={SIZE}
          at={noFrameAt - 2}
          out={leaveOutAt - 2}
          marks={[{ line: 1, at: runningAt - 4 }]}
        />
        <Listing
          lines={whole.lines}
          x={LIST_X}
          top={y(TOP)}
          width={LIST_W}
          size={SIZE}
          at={leaveOutAt - 2}
          out={out78}
          marks={[{ line: 1, at: sixOhFiveAt - 6, color: MARK_OK }]}
        />
        <DataTable
          g={rg}
          cols={colsOf(R, { total: { ink: BLUE_INK } })}
          at={rowsAt0}
          out={leaveOutAt - 2}
          rows={rowsAt(R.rows, rowsAt0 + 4)}
          swaps={toRange}
          marks={[
            { row: 0, col: tc, at: hundredAt, out: rangeAt },
            { row: 1, col: tc, at: threeFiftyAt, out: rangeAt },
            { row: 2, col: tc, at: fourTwentyFiveAt, out: rangeAt },
            ...peers.map((row, k) => ({ row, col: tc, at: bothAt + k * 4 })),
          ]}
        />
        {/* No ORDER BY: a second result, every total the partition's. */}
        <DataTable
          g={rg}
          cols={colsOf(whole, { total: { ink: BLUE_INK } })}
          at={leaveOutAt - 2}
          out={out78}
          rows={rowsAt(whole.rows, leaveOutAt, 1)}
          marks={whole.rows.map((_, row) => ({ row, col: tc, at: sixOhFiveAt + 2 + row * 2, color: MARK_OK }))}
        />
        <Note at={noFrameAt + 4} x={LIST_X} y={rg.rowTop(R.rows.length) + h(22)} out={leaveOutAt - 2}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
            no frame: <QMono>RANGE</QMono> from the start to this row
          </span>
        </Note>
        <Note at={runningAt + 4} x={LIST_X} y={rg.rowTop(R.rows.length) + h(62)} out={leaveOutAt - 2}>
          <span style={{ ...note(25, ACCENT_INK), whiteSpace: "nowrap" }}>a running total, not the total</span>
        </Note>
        <Note at={sixOhFiveAt + 6} x={LIST_X} y={rg.rowTop(R.rows.length) + h(22)} out={out78}>
          <span style={{ ...note(25, OK_INK), whiteSpace: "nowrap" }}>no ORDER BY: the whole partition</span>
        </Note>

        {/* ── Question 8: LAST_VALUE, with the default frame and widened ── */}
        <Listing lines={LD.lines} x={X0} top={y(TOP)} width={820} size={SIZE} at={q8At + 6} marks={[{ line: 1, at: endsAt }]} />
        <DataTable
          g={ldg}
          cols={colsOf(LD, { last: { ink: BLUE_INK } })}
          at={q8At + 10}
          rows={rowsAt(LD.rows, q8At + 14)}
          marks={LD.rows.map((_, row) => ({ row, col: lc, at: ownAt + row * 3, color: MARK_BAD }))}
        />
        <Note at={ownAt + 8} x={ldg.right + 24} y={ldg.rowTop(1)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>each row&apos;s own amount</span>
        </Note>
        <Listing lines={LW.lines} x={1000} top={y(TOP)} width={800} size={SIZE} at={widenAt - 4} marks={[{ line: 2, at: widenAt + 6, color: MARK_OK }, { line: 3, at: widenAt + 10, color: MARK_OK }]} />
        <DataTable
          g={lwg}
          cols={colsOf(LW, { last: { ink: BLUE_INK } })}
          at={widenAt + 6}
          rows={rowsAt(LW.rows, widenAt + 10)}
          marks={LW.rows.map((_, row) => ({ row, col: lc, at: realAt + row * 3, color: MARK_OK }))}
        />
        <Note at={realAt + 8} x={1000} y={lwg.rowTop(LW.rows.length) + h(20)}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap", ...TABULAR }}>the real last day: {LW.rows[0][lc]}</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
