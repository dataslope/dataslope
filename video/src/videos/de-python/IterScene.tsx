import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ITER } from "./data";
import {
  Console,
  consoleHeight,
  Drift,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK_INK,
  Title,
  X0,
} from "./parts";

const TOP = 322;
const SIZE = 22;
const RIGHT_X = 1000;
const ROWS = 4;

/**
 * Four rows read by a cursor. An iterable's cursor starts again from the
 * first row on every pass (`passes` of them); an iterator's makes one pass,
 * and the rows it has passed stay greyed: it is used up.
 */
const Pass: React.FC<{ x: number; top: number; at: number; passes: number; spent?: boolean }> = ({
  x,
  top,
  at,
  passes,
  spent = false,
}) => {
  const frame = useCurrentFrame();
  const STEP = 10;
  const per = ROWS * STEP + 14;
  const t = frame - at;
  const pass = Math.min(passes - 1, Math.floor(Math.max(0, t) / per));
  const inPass = t - pass * per;
  const pos = t < 0 ? -1 : Math.min(ROWS, Math.floor(inPass / STEP));
  return (
    <>
      {Array.from({ length: ROWS }, (_, i) => {
        const p = ease(frame, at - 10 + i * 2, 10);
        const read = spent && (pass > 0 || pos > i);
        const here = pos === i && !(spent && pass > 0);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + i * 66,
              top,
              width: 54,
              height: 54,
              borderRadius: 5,
              boxSizing: "border-box",
              border: `2px solid ${here ? BLUE_INK : read ? `color-mix(in srgb, ${INK} 20%, transparent)` : BAR}`,
              background: here
                ? `color-mix(in srgb, ${BAR} 60%, ${PAPER})`
                : read
                  ? `color-mix(in srgb, ${INK} 6%, ${PAPER})`
                  : `color-mix(in srgb, ${BAR} 18%, ${PAPER})`,
              opacity: p,
            }}
          />
        );
      })}
    </>
  );
};

/**
 * Question 5, on the page's four rows in a file of the video's own. An
 * iterable hands out a fresh pass every time; an iterator keeps its place and
 * is used up. A list read twice prints 4 4, the generator 4 0 (iter(rows) is
 * rows: False, then True). Then the trap: counted for the log, then loaded,
 * 4 and 0, and no error; and the two fixes.
 */
export const IterScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("iter").from;
  const qAt = n.word("iter", "Question five");
  const textAt = n.word("iter", "What's the difference");
  const iterableAt = n.word("iter-def", "An iterable");
  const freshAt = n.word("iter-def", "hands out a fresh iterator each time");
  const iteratorAt = n.word("iter-def", "An iterator keeps its place");
  const usedAt = n.word("iter-def", "it's used up");
  const listAt = n.word("iter-twice", "Read the list twice");
  const fourAgainAt = n.word("iter-twice", "then four again");
  const genAt = n.word("iter-twice", "Read the generator twice");
  const zeroAt = n.word("iter-twice", "four, then zero");
  const isAt = n.word("iter-twice", "A generator is an iterator");
  const fileAt = n.word("iter-twice", "and so is an open file");
  const bitesAt = n.word("iter-trap", "Here's how it bites");
  const countAt = n.word("iter-trap", "count the rows for the log");
  const loadAt = n.word("iter-trap", "then load them");
  const countedAt = n.word("iter-trap", "Four counted, zero loaded");
  const errorAt = n.word("iter-trap", "and no error");
  const listFixAt = n.word("iter-trap", "make a list");
  const againAt = n.word("iter-trap", "create the generator again");
  const end = n.beat("hash-in").to;

  const defTop = y(TOP);
  const twiceTop = y(560);
  const LI = ITER.list.lines;
  const GI = ITER.gen.lines;
  const liH = listingHeight(LI.length, SIZE);
  const T = ITER.trap.lines;
  const outDefs = bitesAt - 4;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={freshAt} level={-35} />
      <Sfx name="el-tap" at={usedAt} level={-35} />
      <Sfx name="el-pop" at={fourAgainAt} level={-34} />
      <Sfx name="el-scratch" at={zeroAt + 6} level={-33} />
      <Sfx name="el-pencil" at={countAt} level={-36} />
      <Sfx name="el-scratch" at={countedAt + 8} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={60}>
          What&apos;s the difference between an iterable and an iterator?
        </QuestionCard>

        {/* ── The two definitions, each with its pass over four rows ── */}
        <Note at={iterableAt - 2} x={X0} y={defTop} out={outDefs}>
          <span style={{ display: "flex", gap: 18, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title size={26}>iterable</Title>
            <span style={{ ...note(22, INK_SOFT) }}>
              <Mono>list</Mono>, <Mono>dict</Mono>
            </span>
          </span>
        </Note>
        <Note at={freshAt} x={X0} y={defTop + h(42)} out={outDefs}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>a fresh iterator for every loop</span>
        </Note>
        <div style={{ opacity: 1 - ease(useCurrentFrame(), outDefs, 10) }}>
          <Pass x={X0} top={defTop + h(96)} at={freshAt + 4} passes={2} />
        </div>
        <Note at={iteratorAt - 2} x={RIGHT_X} y={defTop} out={outDefs}>
          <span style={{ display: "flex", gap: 18, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title size={26}>iterator</Title>
            <span style={{ ...note(22, INK_SOFT) }}>
              a generator<span style={{ opacity: ease(useCurrentFrame(), fileAt, 10) }}>, an open file</span>
            </span>
          </span>
        </Note>
        <Note at={iteratorAt + 4} x={RIGHT_X} y={defTop + h(42)} out={outDefs}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            keeps its place, and <Mark at={usedAt}>is used up at the end</Mark>
          </span>
        </Note>
        <div style={{ opacity: 1 - ease(useCurrentFrame(), outDefs, 10) }}>
          <Pass x={RIGHT_X} top={defTop + h(96)} at={iteratorAt + 8} passes={2} spent />
        </div>

        {/* ── Read twice ── */}
        <Note at={listAt - 4} x={X0} y={twiceTop - h(40)}>
          <Title>a list, read twice</Title>
        </Note>
        <Listing lines={LI} x={X0} top={twiceTop} width={800} size={SIZE} at={listAt - 2} />
        <Console
          lines={ITER.list.out}
          x={X0}
          top={twiceTop + liH + h(14)}
          width={300}
          at={fourAgainAt - 6}
          marks={[{ line: 0, at: fourAgainAt, color: MARK_OK }]}
        />
        <Note at={isAt} x={X0 + 330} y={twiceTop + liH + h(22)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono>iter(rows) is rows</Mono>: {ITER.list.isIter}
          </span>
        </Note>

        <Note at={genAt - 4} x={RIGHT_X} y={twiceTop - h(40)}>
          <Title>a generator, read twice</Title>
        </Note>
        <Listing lines={GI} x={RIGHT_X} top={twiceTop} width={800} size={SIZE} at={genAt - 2} />
        <Console
          lines={ITER.gen.out}
          x={RIGHT_X}
          top={twiceTop + liH + h(14)}
          width={300}
          at={zeroAt - 6}
          marks={[{ line: 0, at: zeroAt + 4, color: MARK_BAD }]}
        />
        <Note at={isAt} x={RIGHT_X + 330} y={twiceTop + liH + h(22)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Mono>iter(rows) is rows</Mono>: <span style={{ color: ACCENT_INK, fontWeight: 650 }}>{ITER.gen.isIter}</span>
          </span>
        </Note>

        {/* ── The trap: counted, then loaded ── */}
        <Note at={bitesAt} x={X0} y={defTop - h(40)}>
          <Title color={ACCENT_INK}>counted for the log, then loaded</Title>
        </Note>
        <Listing
          lines={T}
          x={X0}
          top={defTop}
          width={800}
          size={SIZE}
          at={bitesAt + 2}
          marks={[
            { line: lineOf(T, "n = sum("), at: countAt, out: loadAt },
            { line: lineOf(T, "loaded = list(rows)"), at: loadAt, color: MARK_BAD },
          ]}
        />
        <Console
          lines={ITER.trap.out}
          x={RIGHT_X}
          top={defTop + h(10)}
          width={300}
          at={countedAt - 4}
          marks={[{ line: 0, at: countedAt + 8, color: MARK_BAD }]}
        />
        <Note at={errorAt} x={RIGHT_X + 330} y={defTop + h(18)}>
          <span style={{ ...note(24, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>zero rows loaded, no error</span>
        </Note>
        <Note at={listFixAt} x={RIGHT_X} y={defTop + consoleHeight(1) + h(40)}>
          <span style={{ ...note(24, OK_INK), whiteSpace: "nowrap" }}>
            two passes: <Mono>rows = list(...)</Mono>
            <span style={{ opacity: ease(useCurrentFrame(), againAt, 10) }}>, or call <Mono>parse_rows</Mono> again</span>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
