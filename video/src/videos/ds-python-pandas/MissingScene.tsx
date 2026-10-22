import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MISSING } from "./data";
import {
  colsOf,
  Console,
  DataTable,
  Drift,
  geoOf,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK_INK,
  TableName,
  X0,
} from "./parts";

const TOP = 380;
const SIZE = 20;
const ISNA_X = 560;
const EQ_X = 980;
const FILL_Y = 700;
const COL_X = 1480;

/**
 * Question 7 on the page's four rows, a region and two amounts missing (NaN
 * in red, as pandas prints it). Detect: isna().sum() counts the gaps per
 * column; NaN == NaN is False, so equals finds nothing. Handle: drop or
 * fill; the page fills with the mean, 90, and the two gaps turn green. And a
 * column ten cells tall with six empty, for the gap that is a decision.
 */
export const MissingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("missing").from;
  const qAt = n.word("missing", "Question");
  const textAt = n.word("missing", "How do you detect");
  const asked = n.beat("missing").to;
  const detectAt = n.word("missing-detect", "Detect it with is N A");
  const summedAt = n.word("missing-detect", "Summed, it counts the gaps");
  const oneAt = n.word("missing-detect", "one region");
  const twoAt = n.word("missing-detect", "two amounts");
  const neverAt = n.word("missing-detect", "Never test with equals");
  const itselfAt = n.word("missing-detect", "isn't equal even to itself");
  const dropAt = n.word("missing-handle", "Then drop the rows or fill them");
  const meanAt = n.word("missing-handle", "The page fills with the mean");
  const ninetyAt = n.word("missing-handle", "ninety");
  const sixtyAt = n.word("missing-handle", "sixty percent empty");
  const decisionAt = n.word("missing-handle", "a modeling decision");
  const end = n.beat("missing-handle").to;

  const F = MISSING.frame;
  const g = geoOf(F, X0, y(TOP), h, { rowH: 54, extra: [["", "", "90.0"]] });
  const amount = F.cols.indexOf("amount");
  const gaps = F.rows.flatMap((r, i) => (r[amount] === "NaN" ? [i] : []));
  const S = MISSING.isnaSum;
  const sg = geoOf(S, ISNA_X, y(TOP) + listingHeight(1, SIZE) + h(40), h, { rowH: 54 });
  const filled = MISSING.filled;

  // The empty column: ten cells, six of them gaps.
  const cells = 10;
  const GAPS = [1, 2, 4, 6, 7, 9];
  const cell = h(30);
  const colTop = y(560);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={oneAt} level={-34} />
      <Sfx name="el-tap" at={twoAt} level={-34} />
      <Sfx name="el-scratch" at={itselfAt + 4} level={-32} />
      <Sfx name="el-pencil" at={meanAt + 4} level={-34} />
      <Sfx name="el-pop" at={ninetyAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          How do you detect and handle missing data?
        </QuestionCard>

        <TableName g={g} at={asked - 6}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(F, { amount: { ink: BLUE_INK } })}
          at={asked - 6}
          rows={F.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          swaps={gaps.map((row) => ({ row, col: amount, at: ninetyAt + 4 + (row - gaps[0]) * 3, value: filled.rows[row][amount], color: OK_INK }))}
          marks={gaps.map((row) => ({ row, col: amount, at: ninetyAt + 8 + (row - gaps[0]) * 3, color: MARK_OK }))}
        />

        {/* ── Detect ── */}
        <Listing lines={S.lines} x={ISNA_X} top={y(TOP)} width={320} size={SIZE} at={detectAt - 2} />
        <DataTable
          g={sg}
          cols={colsOf(S)}
          at={summedAt - 2}
          rows={S.rows.map((cells, i) => ({ cells, at: summedAt + 4 + i * 3 }))}
          marks={[
            { row: 0, col: 1, at: oneAt },
            { row: 1, col: 1, at: twoAt },
          ]}
        />
        <Note at={neverAt - 2} x={EQ_X} y={y(TOP) - h(40)}>
          <span style={{ ...note(22, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>never with equals</span>
        </Note>
        <Listing lines={MISSING.nanEq.lines} x={EQ_X} top={y(TOP)} width={300} size={SIZE} at={neverAt} />
        <Console lines={[MISSING.nanEq.value]} x={EQ_X + 320} top={y(TOP) + 2} width={110} at={itselfAt - 4} marks={[{ line: 0, at: itselfAt + 4, color: MARK_BAD }]} />

        {/* ── Handle ── */}
        <Note at={dropAt} x={ISNA_X} y={y(FILL_Y) - h(48)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mono>dropna()</Mono> or <Mono>fillna()</Mono>, depending on why
          </span>
        </Note>
        <Listing lines={filled.lines} x={ISNA_X} top={y(FILL_Y)} width={780} size={SIZE} at={meanAt - 2} marks={[{ line: 0, at: ninetyAt, color: MARK_OK }]} />
        <Note at={ninetyAt} x={ISNA_X} y={y(FILL_Y) + listingHeight(filled.lines.length, SIZE) + h(16)}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            the mean of 100 and 80: <span style={{ color: OK_INK, fontWeight: 650 }}>{Number(MISSING.mean).toFixed(1)}</span>
          </span>
        </Note>

        {/* ── The column that is mostly gaps ── */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: cells }, (_, i) => {
            const gap = GAPS.includes(i);
            const p = ease(frame, sixtyAt - 4 + i * 2, 8);
            if (p <= 0) return null;
            return (
              <rect
                key={i}
                x={COL_X}
                y={colTop + i * cell}
                width={64}
                height={cell - 6}
                rx={3}
                fill={gap ? "none" : BAR}
                stroke={gap ? ACCENT : BAR}
                strokeWidth={2}
                strokeDasharray={gap ? "6 5" : undefined}
                opacity={p}
              />
            );
          })}
        </svg>
        <Note at={sixtyAt + 10} x={COL_X + 90} y={colTop + h(60)}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>{(GAPS.length / cells) * 100}% empty</span>
        </Note>
        <Note at={decisionAt} x={COL_X + 90} y={colTop + h(110)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mark at={decisionAt + 6}>a modeling</Mark>
          </span>
          <br />
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            <Mark at={decisionAt + 12}>decision</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
