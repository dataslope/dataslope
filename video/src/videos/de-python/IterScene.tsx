import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ITER } from "./data";
import {
  Console,
  consoleHeight,
  Drift,
  FadeIn,
  lineOf,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  OK_INK,
  Title,
  X0,
} from "./parts";
import { Mono } from "./mono";

const TOP = 322;
const SIZE = 22;
const RIGHT_X = 1000;
const ROWS = 4;
/** The four rows of a pass, drawn large: the definitions are the scene's
 *  figure until the listings below take the page. */
const BLOCK = 124;
const PITCH = 150;
/** Frames the cursor spends on each row. */
const STEP = 10;
const PER = ROWS * STEP + 14;

/**
 * One loop over four rows: a cursor steps along them from `at`. An
 * iterable's loop starts on fresh rows every time; an iterator's (`spent`)
 * leaves the rows it has passed greyed, used up.
 */
const Pass: React.FC<{ x: number; top: number; at: number; label: string; spent?: boolean; out: number }> = ({
  x,
  top,
  at,
  label: name,
  spent = false,
  out,
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const pos = t < 0 ? -1 : Math.min(ROWS, Math.floor(t / STEP));
  const gone = ease(frame, out, 10);
  if (gone >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone }}>
      {Array.from({ length: ROWS }, (_, i) => {
        const p = ease(frame, at - 10 + i * 2, 10);
        const read = spent && pos > i;
        const here = pos === i;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + i * PITCH,
              top,
              width: BLOCK,
              height: BLOCK,
              borderRadius: 7,
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
      <div
        style={{
          position: "absolute",
          left: x + ROWS * PITCH + 6,
          top: top + BLOCK / 2 - 15,
          ...note(22, INK_SOFT),
          whiteSpace: "nowrap",
          opacity: ease(frame, at - 10, 10),
        }}
      >
        {name}
      </div>
    </div>
  );
};

/** What Python raises when a spent iterator is asked for more: its kind, in
 *  the error box's red, after the call that raised it. */
const Raised: React.FC<{ x: number; top: number; at: number; out: number; call: string; kind: string }> = ({
  x,
  top,
  at,
  out,
  call,
  kind,
}) => (
  <Note at={at} x={x} y={top} out={out}>
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 18,
        borderLeft: `4px solid ${ACCENT}`,
        background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
        padding: "12px 20px 14px",
        fontFamily: MONO,
        fontSize: 24,
        color: INK,
        whiteSpace: "nowrap",
        fontVariantLigatures: "none",
      }}
    >
      <span>{call}</span>
      <span style={{ color: ACCENT_INK, fontWeight: 600 }}>{kind}</span>
    </div>
  </Note>
);

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
  const dunderIterAt = n.word("iter-next", "dunder iter method");
  const iteratorAt = n.word("iter-next", "An iterator has dunder next");
  const placeAt = n.word("iter-next", "it keeps its place");
  const usedAt = n.word("iter-next", "at the end");
  const stopAt = n.word("iter-next", "it raises stop iteration");
  const listAt = n.word("iter-twice", "Read the list twice");
  const fourAgainAt = n.word("iter-twice", "then four again");
  const genAt = n.word("iter-twice", "Read the generator twice");
  const zeroAt = n.word("iter-twice", "four, then zero");
  const isAt = n.word("iter-twice", "A generator is an iterator");
  const fileAt = n.word("iter-twice", "and so is an open file");
  const itselfAt = n.word("iter-self", "it returns itself");
  const newOneAt = n.word("iter-self", "a list returns a new one");
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
  // The passes are drawn large; they give way to the listings below them.
  const outPasses = listAt - 12;
  const row1 = defTop + h(100);
  const row2 = row1 + BLOCK + h(34);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={freshAt} level={-35} />
      <Sfx name="el-tap" at={usedAt} level={-35} />
      <Sfx name="el-scratch" at={stopAt + 4} level={-34} />
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
          <span style={{ display: "flex", gap: 36, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title size={26}>iterable</Title>
            <span style={{ ...note(22, INK_SOFT) }}>
              <Mono>list</Mono>, <Mono>dict</Mono>
            </span>
          </span>
        </Note>
        <Note at={freshAt} x={X0} y={defTop + h(42)} out={outDefs}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            a fresh iterator for every loop
            <FadeIn at={dunderIterAt - 4}>
              : <Mark at={dunderIterAt + 2} out={listAt}>
                <Mono>__iter__()</Mono>
              </Mark>
            </FadeIn>
          </span>
        </Note>
        <Pass x={X0} top={row1} at={freshAt + 4} label="loop 1" out={outPasses} />
        <Pass x={X0} top={row2} at={freshAt + 4 + PER} label="loop 2" out={outPasses} />
        <Note at={iteratorAt - 2} x={RIGHT_X} y={defTop} out={outDefs}>
          <span style={{ display: "flex", gap: 36, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <Title size={26}>iterator</Title>
            <span style={{ ...note(22, INK_SOFT) }}>
              a generator<span style={{ opacity: ease(useCurrentFrame(), fileAt, 10) }}>, an open file</span>
            </span>
          </span>
        </Note>
        <Note at={iteratorAt} x={RIGHT_X} y={defTop + h(42)} out={outDefs}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={iteratorAt + 6} out={listAt}>
              <Mono>__next__()</Mono>
            </Mark>
            <FadeIn at={placeAt - 2}>: keeps its place, </FadeIn>
            <FadeIn at={usedAt - 2}>
              <Mark at={usedAt + 4} out={listAt}>
                then is used up
              </Mark>
            </FadeIn>
          </span>
        </Note>
        <Pass x={RIGHT_X} top={row1} at={placeAt + 2} label="loop 1" spent out={outPasses} />
        {/* The second loop gets nothing: next() on a spent iterator raises. */}
        <Note at={stopAt - 6} x={RIGHT_X + ROWS * PITCH + 6} y={row2 + BLOCK / 2 - h(15)} out={outPasses}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>loop 2</span>
        </Note>
        <Raised
          x={RIGHT_X}
          top={row2 + BLOCK / 2 - 30}
          at={stopAt}
          out={outPasses}
          call={ITER.stop.lines[ITER.stop.lines.length - 1]}
          kind={ITER.stop.kind}
        />

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
            <Mark at={newOneAt}>
              <Mono>iter(rows) is rows</Mono>: {ITER.list.isIter}
            </Mark>
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
            <Mark at={itselfAt}>
              <Mono>iter(rows) is rows</Mono>: <span style={{ color: ACCENT_INK, fontWeight: 650 }}>{ITER.gen.isIter}</span>
            </Mark>
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
