import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, TABULAR, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CohortGrid } from "./CohortGrid";
import { COHORT } from "./data";
import { colsOf, DataTable, Drift, geoOf, Listing, MARK_OK, rowsAt, TableName, X0 } from "./parts";

const TOP = 350;
const SQL_X = 640;
const SIZE = 16;
const GRID_X = 640;
const GRID_TOP = 420;

/**
 * Question 4, on the video's own activity log. A few of its rows; the page's
 * cohort query, its first CTE marked as the cohort is named and the
 * DATE_DIFF as the months since; the counts per cohort and offset, with
 * January's 8, 6, 4, 3 picked out; then those counts as shares of each
 * cohort's month zero, which is the opening's chart again, staircase and all.
 */
export const CohortScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cohort").from;
  const qAt = n.word("cohort", "Question");
  const textAt = n.word("cohort", "How do you write a cohort retention query");
  const logAt = n.word("cohort", "Here's an activity log");
  const earliestAt = n.word("cohort", "Take each user's earliest month");
  const cohortAt = n.word("cohort", "that's their cohort");
  const labelAt = n.word("cohort", "label every event");
  const countAt = n.word("cohort-count", "Count distinct users");
  const eightAt = n.word("cohort-count", "eight users");
  const sixAt = n.word("cohort-count", "then six");
  const divideAt = n.word("cohort-rate", "Divide each count");
  const sharesAt = n.word("cohort-rate", "the counts become shares");
  const pctAt = [
    n.word("cohort-rate", "a hundred"),
    n.word("cohort-rate", "seventy-five"),
    n.word("cohort-rate", "fifty"),
    n.word("cohort-rate", "thirty-eight percent"),
  ];
  const stairAt = n.word("cohort-rate", "That's the staircase");
  const end = n.beat("session-in").to;

  const sample = COHORT.sample;
  const sg = geoOf(sample, X0, y(TOP), h, { rowH: 44 });
  const P = COHORT.page;
  const pg = geoOf(P, X0, y(TOP), h, { rowH: 40, headH: 42, bodySize: 22, headSize: 19 });
  const cohortCol = P.cols.indexOf("cohort");
  const retained = P.cols.indexOf("retained");
  const january = P.rows.flatMap((r, i) => (r[cohortCol] === P.rows[0][cohortCol] ? [i] : []));
  // The four counts are spoken in a row: eight, then six, four and three.
  const countMarkAt = (k: number) => (k === 0 ? eightAt + 2 : sixAt + 2 + (k - 1) * 9);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={earliestAt + 6} level={-34} />
      <Sfx name="el-pencil" at={labelAt + 6} level={-34} />
      {january.map((_, k) => (
        <Sfx key={k} name="el-tap" at={countMarkAt(k)} level={-34} />
      ))}
      <Sfx name="el-sprinkle" at={sharesAt} level={-34} />
      <Sfx name="el-pencil" at={stairAt + 2} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you write a cohort retention query?
        </QuestionCard>

        {/* ── The log ── */}
        <TableName g={sg} at={logAt} out={countAt}>
          activity
        </TableName>
        <DataTable g={sg} cols={colsOf(sample, { user_id: { ink: BLUE_INK } })} at={logAt} out={countAt} rows={rowsAt(sample.rows, logAt + 4)} />
        <Note at={logAt + 10} x={X0} y={sg.rowTop(sample.rows.length) + h(14)} out={countAt}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
            the first 6 of {COHORT.events} events
            <br />
            from {COHORT.users} users, made up for this video
          </span>
        </Note>

        {/* ── The page's query ── */}
        <Listing
          lines={P.lines}
          x={SQL_X}
          top={y(TOP)}
          width={900}
          size={SIZE}
          at={earliestAt - 4}
          out={divideAt}
          marks={[
            { line: 1, at: earliestAt + 4 },
            { line: 7, at: labelAt + 4 },
            { line: 11, at: countAt + 4, color: MARK_OK },
          ]}
        />
        <Note at={cohortAt + 2} x={SQL_X + 900} y={y(TOP) + h(28)} out={divideAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            each user&rsquo;s
            <br />
            cohort month
          </span>
        </Note>

        {/* ── Counts per cohort and offset ── */}
        <DataTable
          g={pg}
          cols={colsOf(P, { retained: { ink: BLUE_INK } })}
          at={countAt}
          out={divideAt + 6}
          rows={rowsAt(P.rows, countAt + 4, 2)}
          bands={[{ row: 0, at: eightAt - 4, color: MARK_OK }]}
          marks={january.map((row, k) => ({ row, col: retained, at: countMarkAt(k) }))}
        />

        {/* ── As shares: the opening's chart ── */}
        <div
          style={{
            position: "absolute",
            left: GRID_X,
            top: y(GRID_TOP) - h(100),
            ...note(26, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, divideAt + 2, 12),
          }}
        >
          <QMono>retained</QMono> ÷ the cohort&rsquo;s month 0
        </div>
        <CohortGrid
          x={GRID_X}
          top={y(GRID_TOP)}
          cell={128}
          cellH={h(74)}
          at={divideAt + 4}
          fill={(r, c) => (r === 0 ? pctAt[c] : sharesAt + c * 6 + r * 3)}
          rowMark={{ row: 0, at: pctAt[0] - 4 }}
          stairAt={stairAt}
        />
      </Drift>
    </AbsoluteFill>
  );
};
