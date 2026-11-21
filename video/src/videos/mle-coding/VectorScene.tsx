import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { VECTOR } from "./data";
import { ART, Arrow, artBox, BAR, Bars, BLUE_FILL, Cell, Drift, Fade, HIGHLIGHT, INK, INK_SOFT, int, Line, Mark, Mono, OK, OK_INK, PAPER, pulse, Spot, X0 } from "./parts";

const NAME_W = 280;
const BAR_X = X0 + NAME_W;
const BAR_W = 1000;
/** The loop's lane: a queue, the interpreter, and what has come out. */
const Q_X = 400;
const CELL = 24;
const PITCH = 30;
const CHIP_X = 724;
const CHIP_W = 220;
const OUT_X = 990;
const N_CELLS = 9;
/** Frames per element through the interpreter. */
const STEP = 12;
/** The product's lane: one contiguous strip. */
const STRIP = 24;
const STRIP_W = 26;

/**
 * Question 1. One user against a hundred thousand rows of sixty-four, timed
 * once in Pyodide three ways: the loop's bar first, the matrix product's
 * last and green, the ratio between them (VECTOR.ratio, never milliseconds).
 * Then why, as two lanes: the loop's elements going through the interpreter
 * one at a time, and the product as one call over a contiguous strip, four
 * numbers lit at once for SIMD. The follow-up fills the middle bar, NumPy
 * called once per row, and lands the rule.
 */
export const VectorScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "Why does NumPy");
  const scoreAt = n.word("q1-time", "Score a hundred thousand items");
  // The task inks in as the question finishes, so the page is not left on
  // the question alone while it is read.
  const loopQAt = n.word("q1", "loop");
  const sixtyAt = n.word("q1-time", "sixty-four numbers each");
  const timedAt = n.word("q1-time", "Timed once");
  const loopAt = n.word("q1-time", "a plain loop");
  const hundredAt = n.word("q1-time", "roughly a hundred times slower");
  const productAt = n.word("q1-time", "one matrix product");
  const sameAt = n.word("q1-time", "with the same answers");
  const bytecodeAt = n.word("q1-why", "The loop runs interpreted bytecode");
  const everyAt = n.word("q1-why", "for every multiply");
  const callAt = n.word("q1-why", "The product is one call into precompiled C");
  const bufferAt = n.word("q1-why", "contiguous, typed buffer");
  const severalAt = n.word("q1-why", "several numbers at once");
  const perRowAt = n.word("q1-row", "calling NumPy once per row");
  const thirtyAt = n.word("q1-row", "roughly thirty times slower");
  const interpAt = n.word("q1-row", "the interpreter still runs once per row");
  const oneOpAt = n.word("q1-row", "Put the whole step in one array operation");
  const loopsAt = n.word("q1-row", "keep loops for steps that depend on the step before");
  const end = n.beat("q1-row").to;

  const barsTop = y(318);
  const rowH = h(62);
  const ratio = (r: number) => `×${Math.round(r)}`;
  const watch = artBox(ART.stopwatch, 150);

  // The loop's lane: element k goes in at laneFrom + k * STEP, and the whole
  // queue starts over once it is through, so the lane keeps moving.
  const laneFrom = bytecodeAt + 8;
  const cycle = N_CELLS * STEP + 24;
  const t = frame - laneFrom;
  const k = t < 0 ? -1 : Math.floor((t % cycle) / STEP);
  const within = t < 0 ? 0 : ((t % cycle) % STEP) / STEP;
  const lane1 = y(606);
  const chipH = h(58);
  const chipLit = Math.max(pulse(frame, interpAt, 24), k >= 0 && k < N_CELLS && within > 0.35 && within < 0.7 ? 0.6 : 0);
  // The product's lane: four numbers at once, stepping across the strip.
  const lane2 = y(744);
  const simdFrom = severalAt;
  const group = frame < simdFrom ? -1 : Math.floor((frame - simdFrom) / 7) % (STRIP / 4);
  const stripOn = ease(frame, callAt - 2, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={scoreAt} level={-34} />
      <Sfx name="el-pop" at={loopAt + 2} level={-31} />
      <Sfx name="el-pop" at={productAt + 2} level={-31} />
      <Sfx name="el-tap" at={hundredAt + 4} level={-30} />
      <Sfx name="el-pop" at={timedAt} level={-30} />
      <Sfx name="el-pencil" at={bytecodeAt} level={-36} />
      <Sfx name="el-whoosh" at={callAt + 2} level={-36} />
      <Sfx name="el-tap" at={severalAt} level={-33} />
      <Sfx name="el-pop" at={perRowAt + 4} level={-31} />
      <Sfx name="el-tap" at={thirtyAt + 4} level={-30} />
      <Sfx name="el-chime" at={loopsAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          Why does NumPy vectorization beat a Python <Mono>for</Mono> loop?
        </QuestionCard>

        <Line at={Math.min(scoreAt, loopQAt + 4)} x={X0} y={y(262)} size={24} color={INK_SOFT}>
          <Num>{int(VECTOR.items)}</Num> items
          <Fade at={sixtyAt}>
            {" "}× <Num>{VECTOR.dims}</Num> numbers, scored against one user
          </Fade>
        </Line>

        <Bars
          x={X0}
          top={barsTop}
          width={BAR_W}
          rowH={rowH}
          nameW={NAME_W}
          max={VECTOR.ms.loop}
          bars={[
            {
              name: "Python loop",
              value: VECTOR.ms.loop,
              color: BAR,
              at: loopAt,
              dur: 30,
              endAt: hundredAt + 2,
              end: (
                <Mark at={hundredAt + 4}>
                  <span style={{ ...note(26, INK), fontWeight: 600 }}>{ratio(VECTOR.ratio.loop)}</span>
                </Mark>
              ),
            },
            {
              name: "NumPy per row",
              value: VECTOR.ms.perRow,
              color: BAR,
              at: perRowAt + 4,
              dur: 24,
              litAt: perRowAt,
              endAt: thirtyAt,
              end: (
                <Mark at={thirtyAt + 4}>
                  <span style={{ ...note(26, INK), fontWeight: 600 }}>{ratio(VECTOR.ratio.perRow)}</span>
                </Mark>
              ),
            },
            {
              name: "one matrix product",
              value: VECTOR.ms.matrix,
              color: OK,
              at: productAt,
              dur: 10,
              endAt: productAt + 8,
              end: (
                <span style={{ ...note(26, OK_INK), fontWeight: 600 }}>
                  ×1
                  <span style={{ ...note(24, INK_SOFT), fontWeight: 500, marginLeft: 22, opacity: ease(frame, sameAt, 10) }}>
                    the same scores as the loop: largest difference {VECTOR.maxDiff}
                  </span>
                </span>
              ),
            },
          ]}
        />
        <Line at={timedAt} x={BAR_X} y={barsTop + 3 * rowH + h(10)} size={22} color={INK_SOFT}>
          Timed once in Pyodide, the browser&apos;s Python: the ratio is the point
        </Line>
        <Spot id={ART.stopwatch.id} at={timedAt} out={bytecodeAt - 12} left={1600} top={y(452)} {...watch} />

        {/* ── Why: the loop's lane ── */}
        <div style={{ position: "absolute", left: X0, top: lane1 + chipH / 2 - 16, width: NAME_W - 24, textAlign: "right", ...label(23, INK), opacity: ease(frame, bytecodeAt - 4, 10) }}>
          Python loop
        </div>
        {ease(frame, bytecodeAt, 10) > 0
          ? Array.from({ length: N_CELLS }, (_, i) => {
              const appear = ease(frame, bytecodeAt + i, 8);
              let x: number;
              let yy = lane1 + chipH / 2 - CELL / 2;
              let fill = BLUE_FILL;
              if (k < 0 || i > k) {
                // Waiting: the queue moves up as each one goes in.
                x = Q_X + (k < 0 ? i : i - k - 1 + (1 - Math.min(1, within * 2.2))) * PITCH;
              } else if (i < k) {
                x = OUT_X + i * PITCH;
                fill = BAR;
              } else {
                // In transit: into the chip, then out to its place.
                const a = Q_X + 0 * PITCH;
                const mid = CHIP_X + CHIP_W / 2 - CELL / 2;
                const b = OUT_X + i * PITCH;
                x = within < 0.5 ? a + (mid - a) * Math.min(1, within / 0.35) : mid + (b - mid) * Math.min(1, (within - 0.5) / 0.4);
                fill = within < 0.5 ? BLUE_FILL : BAR;
                yy += 0;
              }
              const inChip = k === i && within > 0.3 && within < 0.75;
              return (
                <div
                  key={i}
                  style={{ position: "absolute", left: x, top: yy, width: CELL, height: CELL, borderRadius: 4, background: fill, opacity: appear * (inChip ? 0 : 1) }}
                />
              );
            })
          : null}
        <Cell
          x={CHIP_X}
          y={lane1}
          w={CHIP_W}
          h={chipH}
          size={23}
          opacity={ease(frame, bytecodeAt, 10)}
          band={chipLit}
          style={{ background: chipLit > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(chipLit * 100)}%, ${PAPER})` : PAPER }}
        >
          Interpreter
        </Cell>
        <Line at={everyAt} x={OUT_X + N_CELLS * PITCH + 34} y={lane1 + chipH / 2 - 15} size={22} color={INK_SOFT}>
          bytecode for every multiply
        </Line>

        {/* ── Why: the product's lane ── */}
        <div style={{ position: "absolute", left: X0, top: lane2 + 12 - 16, width: NAME_W - 24, textAlign: "right", ...label(23, INK), opacity: ease(frame, callAt - 4, 10) }}>
          one matrix product
        </div>
        <Arrow points={[[Q_X, lane2 - h(26)], [Q_X + STRIP * STRIP_W, lane2 - h(26)]]} at={callAt} dur={18} color={INK} width={2.4} head={14} />
        <div style={{ position: "absolute", left: Q_X, top: lane2, display: "flex", opacity: stripOn }}>
          {Array.from({ length: STRIP }, (_, i) => {
            const lit = group >= 0 && Math.floor(i / 4) === group;
            return (
              <div
                key={i}
                style={{
                  width: STRIP_W,
                  height: CELL,
                  background: lit ? BAR : BLUE_FILL,
                  borderLeft: i ? `1.5px solid ${PAPER}` : undefined,
                  boxSizing: "border-box",
                  borderRadius: i === 0 ? "4px 0 0 4px" : i === STRIP - 1 ? "0 4px 4px 0" : 0,
                }}
              />
            );
          })}
        </div>
        <div style={{ position: "absolute", left: Q_X + STRIP * STRIP_W + 40, top: lane2 - h(52), display: "flex", flexDirection: "column", gap: h(10) }}>
          <span style={{ ...note(22, INK), opacity: ease(frame, callAt + 4, 10), whiteSpace: "nowrap" }}>One call into precompiled C</span>
          <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, bufferAt, 10), whiteSpace: "nowrap" }}>over a contiguous, typed buffer</span>
          <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, severalAt - 2, 10), whiteSpace: "nowrap" }}>SIMD: several numbers per instruction</span>
        </div>

        {/* ── The rule ── */}
        <Line at={oneOpAt} x={X0} y={y(824)} size={27} color={OK_INK} weight={600}>
          One array operation per step
        </Line>
        <Line at={loopsAt} x={X0} y={y(824) + h(46)} size={25} color={INK_SOFT}>
          Loops only for steps that depend on the step before
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
