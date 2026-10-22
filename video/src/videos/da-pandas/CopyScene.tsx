import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QMono, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { COPY } from "./data";
import {
  colsOf,
  DataTable,
  Drift,
  ErrorBox,
  geoOf,
  Listing,
  listingHeight,
  MARK_OK,
  Mono,
  TableName,
  X0,
} from "./parts";

const TOP = 340;
const MID_X = 640;
const RIGHT_X = 1240;
const SIZE = 24;
/** JetBrains Mono's advance, in em. */
const ADVANCE = 0.6;

/**
 * Questions 11 and 12, under pandas 3's copy-on-write, on the page's
 * view-and-copy frame. The chained assignment, bracketed into its two steps,
 * leaves the frame as it was and warns ChainedAssignmentError; .loc in one
 * step sets both North amounts to 0. Then a subset set to 0 leaves a fresh
 * parent unchanged, with no warning.
 */
export const CopyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("copy").from;
  const qAt = n.word("copy", "Question");
  const textAt = n.word("copy", "Why do you");
  const asked = n.beat("copy").to;
  const chainAt = n.word("copy-chain", "chained assignment");
  const filterAt = n.word("copy-chain", "filter the North rows");
  const setAt = n.word("copy-chain", "set their amount");
  const secondAt = n.word("copy-chain", "The second step");
  const unchangedAt = n.word("copy-three", "doesn't change");
  const errorAt = n.word("copy-three", "chained assignment error");
  const olderAt = n.word("copy-three", "Older pandas");
  const fixAt = n.word("copy-fix", "The fix");
  const zeroAt = n.word("copy-fix", "both North amounts are zero");
  const q12At = n.word("copy-view", "Question twelve");
  const sharesAt = n.word("copy-view", "shares memory");
  const copyNotAt = n.word("copy-view", "A copy doesn't");
  const actsAt = n.word("copy-view", "acts as a copy");
  const subsetAt = n.word("copy-view", "Set the subset to zero");
  const parentAt = n.word("copy-view", "the parent is unchanged");
  const callAt = n.word("copy-view", "Call copy");
  const end = n.beat("vector-in").to;

  const g = geoOf(COPY.frame, X0, y(TOP), h);
  const north = COPY.frame.rows.flatMap((r, i) => (r[1] === "North" ? [i] : []));
  const out11 = q12At - 4;

  // The chained line, bracketed into its two steps by character position.
  const line = COPY.chained.lines[0];
  const split = line.indexOf("]") + 1 + line.slice(line.indexOf("]") + 1).indexOf("]") + 1;
  const padX = Math.round(SIZE * 0.8);
  const charX = (i: number) => MID_X + padX + i * ADVANCE * SIZE;
  const lineH = listingHeight(1, SIZE);
  const bracketY = y(TOP) + lineH + h(10);
  const steps = [
    { from: 0, to: split, at: filterAt, text: "1. filter the North rows" },
    { from: split, to: line.length, at: setAt, text: "2. set their amount" },
  ];
  const warnTop = bracketY + h(84);

  const loc = COPY.loc;
  const pg = geoOf(COPY.parent, X0, y(TOP), h);
  const subLines = listingHeight(COPY.subset.lines.length, SIZE);
  const sg = geoOf(COPY.subset, MID_X, y(TOP) + subLines + h(66), h);
  const pNorth = COPY.parent.rows.flatMap((r, i) => (r[1] === "North" ? [i] : []));

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={filterAt + 2} level={-34} />
      <Sfx name="el-pencil" at={setAt + 2} level={-34} />
      <Sfx name="el-scratch" at={errorAt} level={-30} />
      <Sfx name="el-pop" at={zeroAt + 4} level={-32} />
      <Sfx name="el-pop" at={parentAt + 4} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} out={q12At - 4} size={56}>
          Why do you get a <QMono>SettingWithCopyWarning</QMono>, and how do you avoid it?
        </QuestionCard>
        <QuestionCard n={12} at={q12At} textAt={q12At + 10}>
          What&apos;s the difference between a view and a copy?
        </QuestionCard>

        {/* ── The page's frame ── */}
        <TableName g={g} at={asked - 6} out={out11}>
          df
        </TableName>
        <DataTable
          g={g}
          cols={colsOf(COPY.frame)}
          at={asked - 6}
          out={out11}
          rows={COPY.frame.rows.map((cells, i) => ({ cells, at: asked - 2 + i * 2 }))}
          bands={north.map((row) => ({ row, at: unchangedAt, out: fixAt }))}
          swaps={north.map((row) => ({ row, col: 2, at: zeroAt, value: loc.rows[row][2] }))}
          marks={north.map((row) => ({ row, col: 2, at: zeroAt + 6, color: MARK_OK }))}
        />

        {/* ── Chained assignment, in its two steps ── */}
        <Listing lines={COPY.chained.lines} x={MID_X} top={y(TOP)} width={1100} size={SIZE} at={chainAt - 4} out={fixAt - 4} />
        {steps.map((s, k) => {
          const p = ease(frame, s.at, 12);
          const o = ease(frame, fixAt - 4, 10);
          const left = charX(s.from) + 4;
          const width = charX(s.to) - charX(s.from) - 8;
          return (
            <div key={k} style={{ position: "absolute", left, top: bracketY, width, opacity: p * (1 - o) }}>
              <div
                style={{
                  height: 10,
                  borderLeft: `2px solid ${INK_SOFT}`,
                  borderRight: `2px solid ${INK_SOFT}`,
                  borderBottom: `2px solid ${INK_SOFT}`,
                  clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
                }}
              />
              <div style={{ ...note(23, INK), whiteSpace: "nowrap", marginTop: 8 }}>{s.text}</div>
            </div>
          );
        })}
        <Note at={secondAt} x={MID_X} y={bracketY + h(50)} out={errorAt - 4}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>step 2 writes to step 1&apos;s result, not to df</span>
        </Note>
        <ErrorBox
          x={MID_X}
          top={warnTop}
          width={1100}
          at={errorAt - 4}
          kind={COPY.chained.warning.kind}
          message={COPY.chained.warning.message}
          out={fixAt - 4}
          size={21}
        />
        <Note at={unchangedAt - 2} x={X0} y={g.rowTop(COPY.frame.rows.length) + h(24)} out={fixAt - 4}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>df doesn&apos;t change</span>
        </Note>
        <Note at={olderAt} x={MID_X} y={warnTop + h(140)} out={fixAt - 4}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>
            older pandas: <Mono>SettingWithCopyWarning</Mono>
          </span>
        </Note>

        {/* ── The fix: one step ── */}
        <Listing
          lines={loc.lines}
          x={MID_X}
          top={y(TOP)}
          width={760}
          size={SIZE}
          at={fixAt}
          out={out11}
          marks={[{ line: loc.lines.length - 1, at: fixAt + 12, color: MARK_OK }]}
        />

        {/* ── Question 12: a subset, and its parent ── */}
        <TableName g={pg} at={q12At + 4}>
          df
        </TableName>
        <DataTable
          g={pg}
          cols={colsOf(COPY.parent)}
          at={q12At + 4}
          rows={COPY.parent.rows.map((cells, i) => ({ cells, at: q12At + 8 + i * 2 }))}
          marks={pNorth.map((row, k) => ({ row, col: 2, at: parentAt + 4 + k * 4, color: MARK_OK }))}
        />
        <Note at={sharesAt - 4} x={RIGHT_X} y={y(TOP)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>a view shares memory with its parent</span>
        </Note>
        <Note at={copyNotAt - 2} x={RIGHT_X} y={y(TOP) + h(48)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>a copy doesn&apos;t</span>
        </Note>
        <Note at={actsAt - 4} x={RIGHT_X} y={y(TOP) + h(96)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>in pandas 3, it acts as a copy</span>
        </Note>
        <Listing lines={COPY.subset.lines} x={MID_X} top={y(TOP)} width={560} size={SIZE} at={subsetAt - 4} />
        <TableName g={sg} at={subsetAt + 6}>
          north
        </TableName>
        <DataTable
          g={sg}
          cols={colsOf(COPY.subset)}
          at={subsetAt + 6}
          rows={COPY.subset.rows.map((cells, i) => ({ cells, at: subsetAt + 10 + i * 3 }))}
        />
        <Note at={callAt - 2} x={MID_X} y={sg.rowTop(COPY.subset.rows.length) + h(30)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>
            want a copy? call <Mono>.copy()</Mono>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
