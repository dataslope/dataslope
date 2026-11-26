import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { label } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BACKPROP } from "./data";
import { at, BAR, BLUE_FILL, Box, Drift, Fade, Flow, HBar, INK, INK_SOFT, int, Line, LOOK, LOOK_INK, Mark, OK_INK, pulse, type Scale, Svg } from "./parts";

const STACK_X = 200;
const STACK_W = 230;
const SERVE_X = 720;
const SERVE_W = 190;
const SLAB_X = STACK_X + STACK_W + 22;
const SLAB_W = 46;
const RIGHT_X = 1010;
const BAR_W = 680;

/**
 * Question 4. The digits network (64, 128, 128, 10) as a stack: the forward
 * pass inks upward in blue and leaves each layer's activations beside it;
 * the backward pass runs down from the loss in yellow, multiplying. Then
 * what that buys: one gradient by nudging every weight costs 26,123 forward
 * passes, by backprop 1 + 1.68. Nudging is still the test (twenty weights,
 * both ways, on the diagonal), and the kept activations are the bill, which
 * serving does not pay.
 */
export const BackpropScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q4").from;
  const qAt = n.word("q4", "Question four");
  const textAt = n.word("q4", "Explain backpropagation");
  const fwdAt = n.word("q4-a", "The forward pass");
  const keepsAt = n.word("q4-a", "keeps its activations");
  const bwdAt = n.word("q4-a", "The backward pass");
  const multAt = n.word("q4-a", "multiplying local derivatives");
  const sweepAt = n.word("q4-a", "in one sweep");
  const paramsAt = n.word("q4-cost", "twenty-six thousand parameters");
  const nudgeAt = n.word("q4-cost", "Nudging each");
  const passesAt = n.word("q4-cost", "twenty-six thousand forward passes");
  const oneAt = n.word("q4-cost", "Backprop takes one");
  const sevenAt = n.word("q4-cost", "one point seven");
  const testAt = n.word("q4-check", "how you test a backward pass");
  const twentyAt = n.word("q4-check", "on twenty weights");
  const agreeAt = n.word("q4-check", "the two agree");
  const millionAt = n.word("q4-check", "one part in a million");
  const memAt = n.word("q4-memory", "The price is memory");
  const batchAt = n.word("q4-memory", "batch size");
  const depthAt = n.word("q4-memory", "and depth");
  const servingAt = n.word("q4-memory", "than serving");
  const ckptAt = n.word("q4-ckpt", "Gradient checkpointing");
  const someAt = n.word("q4-ckpt", "keep only some");
  const recomputeAt = n.word("q4-ckpt", "recompute the rest");
  const end = n.beat("q4-ckpt").to;

  // ── The stack, from the input up to the loss ──
  const sizes = BACKPROP.sizes;
  const layers = [
    { name: "Input", size: sizes[0] },
    { name: "Hidden", size: sizes[1] },
    { name: "Hidden", size: sizes[2] },
    { name: "Output", size: sizes[3] },
  ];
  const BH = h(50);
  const rowY = (i: number) => y(716) - i * h(86);
  const lossY = rowY(4);
  const kept = [0, 1, 2, 3];
  /** Checkpointing keeps every other layer's activations; the rest fade. */
  const dropped = [1, 3];
  const thin = ease(frame, someAt, 14);
  const grow = ease(frame, batchAt, 16);
  const sheets = 3 + Math.round(3 * grow);

  // ── The gradient check ──
  const PLOT = 240;
  const plotTop = y(632);
  const sx: Scale = { lo: -0.06, hi: 0.03, a: RIGHT_X + 40, b: RIGHT_X + 40 + PLOT };
  const sy: Scale = { lo: -0.06, hi: 0.03, a: plotTop + PLOT, b: plotTop };

  return (
    <AbsoluteFill>
      <Sfx name="el-whoosh" at={fwdAt} level={-36} />
      <Sfx name="el-tap" at={keepsAt} level={-31} />
      <Sfx name="el-whoosh" at={bwdAt} level={-36} />
      <Sfx name="el-pop" at={passesAt} level={-31} />
      <Sfx name="el-pop" at={oneAt} level={-31} />
      <Sfx name="el-sprinkle" at={twentyAt} level={-34} />
      <Sfx name="el-chime" at={millionAt + 20} level={-33} />
      <Sfx name="el-tap" at={servingAt} level={-31} />
      <Sfx name="el-tap" at={someAt} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={4} at={qAt - 4} textAt={textAt - 4}>
          Explain backpropagation and the chain rule.
        </QuestionCard>

        <Line at={fwdAt - 6} x={STACK_X} y={y(290)} size={24} color={INK_SOFT}>
          {"Training: the digits network"}
        </Line>
        {/* The stack, input at the bottom. */}
        {layers.map((l, i) => (
          <React.Fragment key={i}>
            <Box x={STACK_X} y={rowY(i) - BH / 2} w={STACK_W} h={BH} at={fwdAt + i * 5} size={24}>
              {l.name} <Num>{l.size}</Num>
            </Box>
            <Flow points={[[STACK_X + STACK_W / 2, rowY(i) - BH / 2 - 2], [STACK_X + STACK_W / 2, rowY(i + 1) + BH / 2 + 4]]} at={fwdAt + i * 5 + 3} width={2.2} head={12} />
          </React.Fragment>
        ))}
        <Box x={STACK_X} y={lossY - BH / 2} w={STACK_W} h={BH} at={fwdAt + 20} size={24} hue="yellow" hueAt={bwdAt}>
          Loss
        </Box>

        {/* The forward pass, upward in blue. */}
        <Flow points={[[STACK_X - 34, rowY(0) + BH / 2], [STACK_X - 34, lossY - BH / 2]]} at={fwdAt} dur={24} color={BAR} width={5} head={17} />

        {/* Each layer's activations, kept for the backward pass. */}
        <Svg>
          {kept.map((i) => {
            const p = ease(frame, keepsAt + i * 4, 10);
            if (p <= 0) return null;
            const lit = pulse(frame, depthAt + i * 6, 16);
            const k = sheets;
            return Array.from({ length: k }, (_, s) => (
              <rect
                key={`${i}-${s}`}
                x={SLAB_X + s * 3}
                y={rowY(i) + BH / 2 - 12 - s * 7}
                width={SLAB_W}
                height={10}
                rx={2}
                fill={lit > 0 ? `color-mix(in srgb, ${LOOK} ${Math.round(lit * 100)}%, ${BAR})` : s < k - 1 ? BLUE_FILL : BAR}
                opacity={p * (dropped.includes(i) ? 1 - 0.8 * thin : 1)}
              />
            ));
          })}
        </Svg>
        <Line at={keepsAt + 10} x={SLAB_X - 4} y={rowY(0) + BH / 2 + h(14)} size={22} color={INK_SOFT}>
          kept
        </Line>

        {/* The backward pass, down from the loss in yellow, multiplying. */}
        <Flow
          points={[[SLAB_X + SLAB_W + 52, lossY], [SLAB_X + SLAB_W + 52, rowY(0) + BH / 2]]}
          at={bwdAt}
          dur={Math.max(24, multAt - bwdAt + 10)}
          color={LOOK}
          width={5}
          head={17}
        />
        {[3, 2, 1, 0].map((i, k) => (
          <Line key={i} at={multAt + k * 6} x={SLAB_X + SLAB_W + 70} y={rowY(i) + h(30) - 15} size={24} color={LOOK_INK}>
            ×
          </Line>
        ))}
        <Line at={sweepAt} x={SLAB_X + SLAB_W + 32} y={rowY(0) + BH / 2 + h(14)} size={22} color={LOOK_INK}>
          one sweep
        </Line>

        {/* ── The chain rule: one local derivative per layer, multiplied ── */}
        <Fade at={bwdAt} out={paramsAt - 10}>
          <Line at={bwdAt} x={RIGHT_X} y={y(296)} size={22} color={INK_SOFT}>
            The chain rule, for the first layer&apos;s weights
          </Line>
          <Line at={bwdAt + 6} x={RIGHT_X} y={y(346)} size={34}>
            <MathRun>
              ∂<I>L</I>/∂<I>W</I>
              <sub>1</sub> ={" "}
              {[
                <>
                  ∂<I>L</I>/∂<I>o</I>
                </>,
                <>
                  ∂<I>o</I>/∂<I>h</I>
                  <sub>2</sub>
                </>,
                <>
                  ∂<I>h</I>
                  <sub>2</sub>/∂<I>h</I>
                  <sub>1</sub>
                </>,
                <>
                  ∂<I>h</I>
                  <sub>1</sub>/∂<I>W</I>
                  <sub>1</sub>
                </>,
              ].map((f, k) => (
                <React.Fragment key={k}>
                  {k ? " × " : ""}
                  <Mark at={multAt + k * 8}>{f}</Mark>
                </React.Fragment>
              ))}
            </MathRun>
          </Line>
          <Line at={multAt + 30} x={RIGHT_X} y={y(420)} size={22} color={INK_SOFT}>
            Each factor is one layer&apos;s local derivative, computed on the way down
          </Line>
        </Fade>

        {/* ── What one gradient costs ── */}
        <Line at={paramsAt - 2} x={RIGHT_X} y={y(290)} size={24} color={INK}>
          This network: <Num>{int(BACKPROP.params)}</Num> parameters
        </Line>
        <HBar
          x={RIGHT_X}
          y={y(350)}
          width={BAR_W}
          at={nudgeAt}
          dur={Math.max(18, passesAt - nudgeAt + 6)}
          label="Nudge each weight: a forward pass apiece"
          valueText={<Num>{int(BACKPROP.nudgePasses)}</Num>}
        />
        <HBar
          x={RIGHT_X}
          y={y(452)}
          width={(BAR_W * (1 + BACKPROP.backwardOverForward)) / BACKPROP.nudgePasses}
          at={oneAt}
          color={OK}
          ink={OK_INK}
          label="Backprop: one forward pass, then one backward"
          valueText={
            <span style={{ opacity: ease(frame, sevenAt, 10) }}>
              <Num>1</Num> + <Num>{BACKPROP.backwardOverForward}</Num> = <Num>{(1 + BACKPROP.backwardOverForward).toFixed(2)}</Num>
            </span>
          }
        />
        <Line at={sevenAt + 8} x={RIGHT_X} y={y(546)} size={22} color={INK_SOFT}>
          Forward passes per gradient, counting multiply-adds
        </Line>

        {/* ── The gradient check: twenty weights, both ways ── */}
        <Line at={testAt} x={RIGHT_X} y={plotTop - h(48)} size={22} color={INK_SOFT}>
          <Num>{BACKPROP.checked}</Num> weights: by nudging, and by backprop
        </Line>
        <Svg>
          <g opacity={ease(frame, testAt, 12)}>
            <line x1={sx.a} x2={sx.b} y1={at(sy, 0)} y2={at(sy, 0)} stroke={INK_SOFT} strokeWidth={1} />
            <line x1={at(sx, 0)} x2={at(sx, 0)} y1={sy.a} y2={sy.b} stroke={INK_SOFT} strokeWidth={1} />
            <line x1={at(sx, -0.06)} y1={at(sy, -0.06)} x2={at(sx, 0.03)} y2={at(sy, 0.03)} stroke={OK} strokeWidth={2} strokeDasharray="6 6" />
            <text x={sx.b + 10} y={at(sy, 0) + 7} style={{ ...label(20, INK_SOFT), fill: INK_SOFT }}>
              nudging
            </text>
            <text x={at(sx, 0) - 10} y={sy.b + 4} textAnchor="end" style={{ ...label(20, INK_SOFT), fill: INK_SOFT }}>
              backprop
            </text>
          </g>
          {BACKPROP.pairs.map(([num, bp], i) => {
            const s = ease(frame, twentyAt + i * 1.2, 8);
            return s > 0 ? <circle key={i} cx={at(sx, num)} cy={at(sy, bp)} r={6 * s} fill={BAR} opacity={0.85} /> : null;
          })}
        </Svg>
        <Line at={agreeAt} x={RIGHT_X + PLOT + 196} y={plotTop + h(60)} size={24} color={INK}>
          All on the diagonal
        </Line>
        <Line at={millionAt} x={RIGHT_X + PLOT + 196} y={plotTop + h(104)} size={24} color={OK_INK}>
          Worst gap:{" "}
          <MathRun>
            <Num>2.9</Num> × 10<sup>−7</sup>
          </MathRun>
        </Line>

        {/* ── The bill: kept activations, which serving never keeps ── */}
        <Line at={servingAt - 8} x={SERVE_X} y={y(290)} size={24} color={INK_SOFT}>
          Serving
        </Line>
        {layers.map((l, i) => (
          <React.Fragment key={i}>
            <Box x={SERVE_X} y={rowY(i) - BH / 2} w={SERVE_W} h={BH} at={servingAt - 6 + i * 3} size={24}>
              {l.name} <Num>{l.size}</Num>
            </Box>
            {i < 3 ? (
              <Flow points={[[SERVE_X + SERVE_W / 2, rowY(i) - BH / 2 - 2], [SERVE_X + SERVE_W / 2, rowY(i + 1) + BH / 2 + 4]]} at={servingAt - 4 + i * 3} width={2.2} head={12} />
            ) : null}
          </React.Fragment>
        ))}
        <Line at={memAt} x={STACK_X - 50} y={y(826)} size={26} color={INK}>
          Kept activations grow with batch size
          <span style={{ opacity: ease(frame, depthAt - 2, 10) }}> and depth</span>
        </Line>
        <Line at={servingAt} x={SERVE_X} y={rowY(0) + BH / 2 + h(14)} size={22} color={INK_SOFT}>
          keeps none
        </Line>
        <Line at={ckptAt} x={STACK_X - 50} y={y(826) + h(46)} size={26} color={OK_INK}>
          Checkpointing: keep a few
          <span style={{ opacity: ease(frame, recomputeAt, 10) }}>, recompute the rest</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
