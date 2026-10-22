import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { RUNNING } from "./data";
import { colsOf, DataTable, Drift, type FrameStep, geoOf, Listing, listingHeight, MARK_OK, RowBracket, rowsAt, X0 } from "./parts";

const TOP = 330;
const SIZE = 19;
const RESULT_X = 1000;
/** The first days shown, before the gap to the last. */
const SHOWN = 8;

/**
 * Questions 9 and 10 on the page's 24 days of transactions: the running
 * total climbing 100, 350, 425, 605 to 4,255 on the 24th; then the trailing
 * three-day average, its frame a bracket sliding down the rows, clipped to
 * one row and then two at the start; and the centred frame.
 */
export const RunningScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("running").from;
  const qAt = n.word("running", "Question");
  const textAt = n.word("running", "How do you compute a running total");
  const sumAt = n.word("running", "An ordered sum");
  // The question and its answer share a beat: the figure comes as the answer starts.
  const asked = sumAt;
  const totals = [
    n.word("running", "a hundred"),
    n.word("running", "three fifty"),
    n.word("running", "four twenty-five"),
    n.word("running", "six oh five"),
  ];
  const lastAt = n.word("running", "four thousand two hundred fifty-five");
  const q10At = n.word("moving", "Question ten");
  const q10TextAt = n.word("moving", "How do you compute a moving average");
  const avgAt = n.word("moving", "Average over an explicit rows frame");
  const beforeAt = n.word("moving", "the two rows before");
  const lessAt = n.word("moving", "have less behind them");
  const oneAt = n.word("moving", "one value");
  const twoAt = n.word("moving", "and then two");
  const centeredAt = n.word("moving", "A centered average");
  const end = n.beat("latest-in").to;

  const B = RUNNING.both;
  const lastRow = B.rows[B.rows.length - 1];
  const gapRow = ["…", "", "", ""];
  const shown = [...B.rows.slice(0, SHOWN), gapRow, lastRow];
  const table = { cols: B.cols, rows: shown };
  const g = geoOf(table, RESULT_X, y(TOP), h, { rowH: 46 });
  const rt = B.cols.indexOf("running_total");
  const ma = B.cols.indexOf("moving_avg_3");
  const last = shown.length - 1;
  const listH = listingHeight(B.lines.length, SIZE);

  // The trailing frame slides down the shown days as it is described, then
  // the first two days show it clipped to one row and two, then centred.
  const slideFrom = avgAt + 4;
  const slideTo = lessAt - 8;
  const slides = SHOWN - 3;
  const steps: FrameStep[] = [
    ...Array.from({ length: slides + 1 }, (_, k) => ({ at: slideFrom + (k * (slideTo - slideFrom)) / slides, from: k, to: k + 2 })),
    { at: oneAt - 4, from: 0, to: 0 },
    { at: twoAt - 4, from: 0, to: 1 },
    { at: centeredAt + 4, from: 3, to: 5, current: 4 },
  ];

  return (
    <AbsoluteFill>
      {totals.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t} level={-34} />
      ))}
      <Sfx name="el-pop" at={lastAt + 4} level={-32} />
      <Sfx name="el-pencil" at={avgAt + 4} level={-34} />
      <Sfx name="el-tap" at={oneAt} level={-34} />
      <Sfx name="el-tap" at={twoAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} out={q10At - 4} size={60}>
          How do you compute a running total?
        </QuestionCard>
        <QuestionCard n={10} at={q10At} textAt={q10TextAt - 2} size={60}>
          How do you compute a moving average?
        </QuestionCard>

        <Listing
          lines={B.lines}
          x={X0}
          top={y(TOP)}
          width={820}
          size={SIZE}
          at={asked - 6}
          lineAt={[asked - 4, asked, avgAt - 4, avgAt, asked + 2, asked + 4]}
          marks={[
            { line: 1, at: sumAt + 4, out: q10At },
            { line: 3, at: beforeAt - 2 },
          ]}
        />
        <DataTable
          g={g}
          cols={colsOf(table, {
            running_total: { at: sumAt, ink: BLUE_INK, numeric: true },
            moving_avg_3: { at: avgAt + 2, ink: BLUE_INK, numeric: true },
            amount: { numeric: true },
          })}
          at={asked - 4}
          rows={rowsAt(shown, asked)}
          marks={[
            ...totals.map((at, row) => ({ row, col: rt, at, out: q10At })),
            { row: last, col: rt, at: lastAt, out: q10At, color: MARK_OK },
            { row: 0, col: ma, at: oneAt + 2 },
            { row: 1, col: ma, at: twoAt + 2 },
          ]}
        />
        <RowBracket g={g} steps={steps} />
        <Note at={lessAt} x={X0} y={y(TOP) + listH + h(30)}>
          <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>the first days average fewer rows: the frame is clipped</span>
        </Note>
        <Note at={centeredAt} x={X0} y={y(TOP) + listH + h(90)}>
          <span style={{ ...note(25, INK_SOFT), whiteSpace: "nowrap" }}>centred, about each day:</span>
          <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: BLUE_INK, marginTop: 8, whiteSpace: "pre", fontVariantLigatures: "none" }}>
            ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
          </div>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
