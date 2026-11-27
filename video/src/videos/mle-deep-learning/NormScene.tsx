import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { note, TABULAR } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NORM } from "./data";
import { ACCENT_INK, Drift, INK, INK_SOFT, Line, LOOK, Mark, OK_INK, Pixels, Svg } from "./parts";

const CELL = 11;
const PITCH = 106;
const BN_X = 1060;
const LN_X = 1450;
const COL_W = 300;

/** A value as it is set in the table: a true minus, a plus where it matters. */
const signed = (v: number, plus = false) => (v < 0 ? `−${(-v).toFixed(2)}` : `${plus && v > 0 ? "+" : ""}${v === 0 ? "0" : v.toFixed(2)}`);

/**
 * Question 7. One digit, a 6 whose pixel at row 4, column 4 is 0.5, in two
 * mini-batches: beside seven digits bright at that pixel, and beside seven
 * dark ones. Batch norm gives it -2.43 in the first and +2.62 in the second,
 * and 0 when it is alone in its batch, whatever it is. Layer norm, across the
 * digit's own 64 pixels, gives 0.45 every time.
 */
export const NormScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q7").from;
  const qAt = n.word("q7", "Question seven");
  const textAt = n.word("q7", "What is batch normalization");
  const shiftsAt = n.word("q7-a", "Batch norm shifts and scales");
  const acrossAt = n.word("q7-a", "across the mini-batch");
  const learnedAt = n.word("q7-a", "a learned scale and shift");
  const neighborsAt = n.word("q7-batch", "depends on the neighbors");
  const pixelAt = n.word("q7-batch", "This pixel");
  const brighterAt = n.word("q7-batch", "seven brighter digits");
  const minusAt = n.word("q7-batch", "minus two point four");
  const darkerAt = n.word("q7-batch", "seven darker ones");
  const plusAt = n.word("q7-batch", "plus two point six");
  const oneAt = n.word("q7-one", "In a batch of one");
  const zeroAt = n.word("q7-one", "normalizes to zero");
  const runningAt = n.word("q7-one", "hence running averages");
  const leftAt = n.word("q7-one", "Left in training mode");
  const ignoresAt = n.word("q7-one", "ignores its input");
  const lnAt = n.word("q7-ln", "Layer norm normalizes");
  const sameAt = n.word("q7-ln", "the same value in any batch");
  const freeAt = n.word("q7-ln", "Free of batch size");
  const transAt = n.word("q7-ln", "what transformers use");
  const end = n.beat("opt-in").to;

  const rows = [
    { title: "A mini-batch", more: ": seven brighter at this pixel", moreAt: brighterAt, ids: NORM.brightBatch, vals: NORM.brightValues, top: y(400), at: shiftsAt + 6, bn: NORM.bnBright, bnAt: minusAt, bnInk: INK },
    { title: "Another", more: ": seven darker", moreAt: darkerAt, ids: NORM.darkBatch, vals: NORM.darkValues, top: y(580), at: neighborsAt, bn: NORM.bnDark, bnAt: plusAt, bnInk: INK },
    { title: "Alone", more: "", moreAt: oneAt, ids: [NORM.image], vals: [NORM.value], top: y(760), at: oneAt, bn: NORM.bnAlone, bnAt: zeroAt, bnInk: ACCENT_INK },
  ];
  const D = 8 * CELL;
  const ring = ease(frame, pixelAt, 14);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={acrossAt} level={-34} />
      <Sfx name="el-tap" at={minusAt} level={-30} />
      <Sfx name="el-sprinkle" at={neighborsAt} level={-35} />
      <Sfx name="el-tap" at={plusAt} level={-30} />
      <Sfx name="el-pop" at={zeroAt} level={-31} />
      <Sfx name="el-tap" at={sameAt} level={-30} />
      <Sfx name="el-chime" at={transAt + 20} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is batch normalization, and how does layer norm differ?
        </QuestionCard>

        {/* ── The two norms' headers ── */}
        <Line at={shiftsAt} x={BN_X} y={y(296)} size={24}>
          Batch norm
        </Line>
        <Line at={shiftsAt + 8} x={BN_X} y={y(330)} size={26}>
          <MathRun>
            <I>γ</I> (<I>x</I> − <I>μ</I>) / <I>σ</I> + <I>β</I>
          </MathRun>
        </Line>
        <Line at={acrossAt} x={BN_X} y={y(368)} size={20} color={INK_SOFT}>
          <MathRun>
            <I>μ</I>, <I>σ</I>
          </MathRun>{" "}
          <Mark at={neighborsAt}>across the batch</Mark>
          <span style={{ opacity: ease(frame, learnedAt, 10) }}>
            ;{" "}
            <MathRun>
              <I>γ</I>, <I>β</I>
            </MathRun>{" "}
            learned
          </span>
        </Line>
        <ColumnRule x={(BN_X + COL_W + LN_X) / 2 + 20} top={y(296)} height={y(860) - y(296)} at={lnAt} />
        <Line at={lnAt} x={LN_X} y={y(296)} size={24}>
          Layer norm
        </Line>
        <Line at={lnAt + 8} x={LN_X} y={y(330)} size={22} color={INK_SOFT}>
          Across one digit&apos;s <span style={TABULAR}>64</span> pixels
        </Line>

        {/* ── The batches, the pixel picked out in every digit ── */}
        {rows.map((r) => (
          <React.Fragment key={r.title}>
            <Line at={r.at} x={120} y={r.top - h(38)} size={22} color={INK_SOFT}>
              {r.title}
              <span style={{ opacity: ease(frame, r.moreAt, 10) }}>{r.more}</span>
            </Line>
            {r.ids.map((id, k) => (
              <React.Fragment key={k}>
                <Pixels
                  values={NORM.images[String(id)]}
                  x={120 + k * PITCH}
                  y={r.top}
                  cell={CELL}
                  gap={0}
                  at={r.at + 2 + k * 2}
                  pick={{ index: NORM.pixel, at: r.at + 10 }}
                />
                {r.ids.length > 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: 120 + k * PITCH,
                      width: D,
                      top: r.top + D + 8,
                      textAlign: "center",
                      ...note(20, k === 0 ? INK : INK_SOFT),
                      ...TABULAR,
                      opacity: ease(frame, r.at + 12 + k * 2, 10),
                    }}
                  >
                    {r.vals[k].toFixed(2)}
                  </div>
                ) : null}
              </React.Fragment>
            ))}
            {/* The value, batch-normalized, in this batch. */}
            <div
              style={{
                position: "absolute",
                left: BN_X,
                top: r.top + D / 2 - 20,
                ...note(30, r.bnInk),
                fontWeight: 600,
                ...TABULAR,
                opacity: ease(frame, r.bnAt, 10),
              }}
            >
              {r.bn === 0 ? signed(0) : <Mark at={r.bnAt + 2}>{signed(r.bn, true)}</Mark>}
            </div>
            <div
              style={{
                position: "absolute",
                left: LN_X,
                top: r.top + D / 2 - 20,
                ...note(30, OK_INK),
                fontWeight: 600,
                ...TABULAR,
                opacity: ease(frame, sameAt + 4, 10),
              }}
            >
              {NORM.layerNorm.toFixed(2)}
            </div>
          </React.Fragment>
        ))}
        {/* The same 6, ringed in every batch. */}
        <Svg>
          {ring > 0
            ? rows.map((r) => (
                <rect
                  key={r.title}
                  x={120 - 8}
                  y={r.top - 8}
                  width={D + 16}
                  height={D + 16}
                  rx={6}
                  fill="none"
                  stroke={LOOK}
                  strokeWidth={3}
                  opacity={ease(frame, Math.max(pixelAt, r.at + 8), 10)}
                />
              ))
            : null}
        </Svg>

        {/* ── Alone: its own mean ── */}
        <Line at={oneAt + 6} x={120 + PITCH + 30} y={rows[2].top - h(4)} size={24} color={INK}>
          Batch of one: its own mean, so <span style={{ ...TABULAR }}>0</span> whatever the input
        </Line>
        <Line at={runningAt} x={120 + PITCH + 30} y={rows[2].top + h(36)} size={24} color={INK_SOFT}>
          So inference uses running averages
        </Line>
        <Line at={leftAt} x={120 + PITCH + 30} y={rows[2].top + h(76)} size={24} color={ACCENT_INK}>
          Left in training mode: <Mark at={ignoresAt}>it ignores its input</Mark>
        </Line>
        {/* The batch-of-one result is per feature: a convolution's batch norm
            also averages each channel over the image's own pixels. */}
        <Line at={ignoresAt + 14} x={120 + PITCH + 30} y={rows[2].top + h(120)} size={22} color={INK_SOFT}>
          One value per feature here, as after a dense layer
        </Line>
        <Line at={freeAt} x={LN_X} y={rows[2].top + D + h(26)} size={22} color={OK_INK}>
          Free of batch size
          <span style={{ opacity: ease(frame, transAt, 10) }}>: transformers</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
