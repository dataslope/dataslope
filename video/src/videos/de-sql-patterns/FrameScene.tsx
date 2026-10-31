import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { FRAME } from "./data";
import { colsOf, DataTable, Drift, geoOf, lineOf, Listing, listingHeight, Mark, MARK, RowBracket, rowsAt, TableName } from "./parts";

const TOP = 340;
const TABLE_X = 190;
const LIST_X = 660;
const SIZE = 19;
const LIST_W = 760;

/**
 * Question 6: the first part of da-advanced-sql's FrameScene, copied and
 * re-cued, on its four payments, two of them on January 2. A bracket beside
 * the table is the frame: ROWS, with id breaking the tie, grows it one row at
 * a time (100, 350, 425); RANGE takes both January 2 rows together (425
 * twice). Then when to reach for each, the second of which (a span of time)
 * is question 7.
 */
export const FrameScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("frame").from;
  const textAt = n.word("frame", "What is a window frame");
  // The payments arrive on the question's second half.
  const asked = n.word("frame", "difference between rows and range") + 4;
  const setAt = n.word("frame-def", "the set of rows");
  const sameDayAt = n.word("frame-peers", "land on the same day");
  const rowsAt0 = n.word("frame-rows", "Rows counts physical rows");
  const hundredAt = n.word("frame-rows", "a hundred");
  const threeFiftyAt = n.word("frame-rows", "three fifty");
  const fourTwentyFiveAt = n.word("frame-rows", "four twenty-five");
  const rangeAt = n.word("frame-range", "Range goes by");
  const togetherAt = n.word("frame-range", "come in together");
  const bothAt = n.word("frame-range", "both get four twenty-five");
  const predictableAt = n.word("frame-pick", "Rows is the predictable one");
  const belongAt = n.word("frame-pick", "tied values belong together");
  const spanAt = n.word("frame-pick", "a span of time");
  const bridgeAt = n.beat("moving-in").from;
  const end = n.beat("moving-in").to;

  const P = FRAME.payments;
  const pg = geoOf(P, TABLE_X, y(TOP), h, { rowH: 56 });
  const peers = P.rows.flatMap((r, i) => (r[1] === P.rows[1][1] ? [i] : []));

  // One result table under the listing; its totals change as the frame does.
  const R = FRAME.rows;
  const rg = geoOf(R, LIST_X, y(TOP) + listingHeight(R.lines.length, SIZE) + h(22), h, { rowH: 50 });
  const tc = R.cols.indexOf("total");
  const toRange = FRAME.range.rows.flatMap((r, row) => (r[tc] !== R.rows[row][tc] ? [{ row, col: tc, at: togetherAt + 6, value: r[tc] }] : []));
  const notesY = rg.rowTop(R.rows.length) + h(26);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={hundredAt} level={-34} />
      <Sfx name="el-tap" at={threeFiftyAt} level={-34} />
      <Sfx name="el-tap" at={fourTwentyFiveAt} level={-34} />
      <Sfx name="el-pop" at={togetherAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <>
          <QuestionCard n={6} at={from - 8} textAt={textAt - 4} size={60}>
            What is a window frame, and what is the difference between <QMono>ROWS</QMono> and <QMono>RANGE</QMono>?
          </QuestionCard>

          {/* ── Four payments, two on one day ── */}
          <TableName g={pg} at={asked - 6}>
            payments
          </TableName>
          <DataTable g={pg} cols={colsOf(P)} at={asked - 6} rows={rowsAt(P.rows, asked - 2)} bands={peers.map((row) => ({ row, at: sameDayAt, color: MARK }))} />
          <Note at={setAt} x={TABLE_X} y={pg.rowTop(P.rows.length) + h(24)} width={420}>
            <span style={{ ...note(24, INK_SOFT) }}>the frame: the rows the function sees for this one</span>
          </Note>
          <RowBracket
            g={pg}
            steps={[
              // The definition: the rows up to the current one, which gets the dot.
              { at: setAt + 4, from: 0, to: 1 },
              { at: hundredAt - 2, from: 0, to: 0 },
              { at: threeFiftyAt - 2, from: 0, to: 1 },
              { at: fourTwentyFiveAt - 2, from: 0, to: 2 },
              { at: rangeAt + 4, from: 0, to: 1 },
              { at: togetherAt, from: 0, to: 2, current: 1 },
            ]}
          />

          {/* ── ROWS, then RANGE ── */}
          <Listing
            lines={R.lines}
            x={LIST_X}
            top={y(TOP)}
            width={LIST_W}
            size={SIZE}
            at={rowsAt0 - 4}
            out={rangeAt - 2}
            marks={[{ line: lineOf(R.lines, "ROWS BETWEEN"), at: rowsAt0 + 6 }]}
          />
          <Listing
            lines={FRAME.range.lines}
            x={LIST_X}
            top={y(TOP)}
            width={LIST_W}
            size={SIZE}
            at={rangeAt - 2}
            marks={[{ line: lineOf(FRAME.range.lines, "RANGE BETWEEN"), at: rangeAt + 8 }]}
          />
          <DataTable
            g={rg}
            cols={colsOf(R, { total: { ink: BLUE_INK } })}
            at={rowsAt0}
            rows={rowsAt(R.rows, rowsAt0 + 4)}
            swaps={toRange}
            marks={[
              { row: 0, col: tc, at: hundredAt, out: rangeAt },
              { row: 1, col: tc, at: threeFiftyAt, out: rangeAt },
              { row: 2, col: tc, at: fourTwentyFiveAt, out: rangeAt },
              ...peers.map((row, k) => ({ row, col: tc, at: bothAt + k * 4 })),
            ]}
          />
          <Note at={rangeAt + 10} x={rg.right + 30} y={rg.rowTop(1) + h(8)}>
            <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
              same day: one group
            </span>
          </Note>

          {/* ── When to reach for each ── */}
          <Note at={predictableAt - 2} x={LIST_X} y={notesY}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              <QMono>ROWS</QMono>: physical rows, predictable
            </span>
          </Note>
          <Note at={belongAt - 6} x={LIST_X} y={notesY + h(46)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
              <QMono>RANGE</QMono>: tied values as one group,{" "}
              <span style={{ opacity: ease(frame, spanAt - 2, 10) }}>
                <Mark at={bridgeAt}>or a span of time</Mark>
              </span>
            </span>
          </Note>
        </>
      </Drift>
    </AbsoluteFill>
  );
};
