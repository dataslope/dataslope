import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CE } from "./data";
import { ACCENT, ACCENT_INK, at, Axes, type Box, Curve, Drift, Fade, Line, Mark, MARK_BAD, OK, OK_INK, pct, scales, Svg, X0 } from "./parts";

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
/** The confident wrong answer the first figure marks. */
const WRONG = 0.02;

/**
 * Question 5. Cross-entropy as −log p of the true class, rising without
 * bound as p goes to zero, a confident wrong answer marked at the steep end.
 * Then each loss's gradient on the score for a true label of 1: squared
 * error's carries the sigmoid's slope and sinks to zero exactly where the
 * model is confidently wrong; cross-entropy's is just the error. Then the
 * page's model, started confidently wrong, trained both ways.
 */
export const CeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ce").from;
  const qAt = n.word("ce", "Question five");
  const textAt = n.word("ce", "What is cross-entropy loss");
  const minusAt = n.word("ce", "It's minus the log");
  const trueAt = n.word("ce", "given to the true class");
  const confAt = n.word("ce", "a confident wrong answer");
  const limitAt = n.word("ce", "costs without limit");
  const behindAt = n.word("ce-grad", "Behind a sigmoid");
  const slopeAt = n.word("ce-grad", "multiplied by the sigmoid's slope");
  const zeroAt = n.word("ce-grad", "nearly zero");
  const wrongAt = n.word("ce-grad", "confidently wrong");
  const ceAt = n.word("ce-grad", "Cross-entropy's gradient");
  const errorAt = n.word("ce-grad", "just the error");
  const runFrom = n.beat("ce-run").from;
  const startAt = n.word("ce-run", "Start the page's model confidently wrong");
  const fourteenAt = n.word("ce-run", "fourteen percent");
  const ceRunAt = n.word("ce-run", "Cross-entropy reaches");
  const twentyFourAt = n.word("ce-run", "twenty-four steps");
  const mseAt = n.word("ce-run", "Squared error, at the same rate");
  const twoThirtyAt = n.word("ce-run", "two hundred and thirty-four");
  const end = n.beat("param-in").to;

  // ── −log p ──
  const left: Box = { left: X0 + 70, top: y(440), width: 640, height: h(310) };
  const L = scales(left, [0, 1], [0, 5]);
  const nll = Array.from({ length: 200 }, (_, i) => {
    const p = 0.005 + (i / 199) * 0.995;
    return [p, -Math.log(p)] as const;
  });

  // ── The two gradients on the score, true label 1 ──
  const right: Box = { left: 1090, top: y(440), width: 640, height: h(310) };
  const G = scales(right, [-8, 4], [-1.1, 0.15]);
  const zs = Array.from({ length: 241 }, (_, i) => -8 + i * 0.05);
  const ceGrad = zs.map((z) => [z, sigmoid(z) - 1] as const);
  const mseGrad = zs.map((z) => [z, 2 * (sigmoid(z) - 1) * sigmoid(z) * (1 - sigmoid(z))] as const);

  // ── Training from a confidently wrong start ──
  const run: Box = { left: X0 + 70, top: y(410), width: 1240, height: h(380) };
  const T = scales(run, [0, 300], [0, 1]);
  const acc = (a: readonly number[]) => [[0, CE.start] as const, ...a.slice(0, 300).map((v, i) => [i + 1, v] as const)];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={minusAt} level={-35} />
      <Sfx name="el-pop" at={confAt} level={-31} />
      <Sfx name="el-pencil" at={behindAt} level={-36} />
      <Sfx name="el-pencil" at={ceAt} level={-36} />
      <Sfx name="el-pencil" at={ceRunAt} level={-36} />
      <Sfx name="el-tap" at={twentyFourAt} level={-30} />
      <Sfx name="el-tap" at={twoThirtyAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={5} at={qAt - 4} textAt={textAt - 4} size={52}>
          What is cross-entropy loss, and why is it preferred over MSE for classification?
        </QuestionCard>

        <Fade at={minusAt - 6} out={runFrom - 6}>
          <Line at={minusAt - 2} x={X0} y={y(300)} size={30}>
            <MathRun>
              Loss = −log <I>p</I>
            </MathRun>
            <span style={{ color: INK_SOFT, opacity: ease(frame, trueAt - 2, 10) }}>
              , <MathRun><I>p</I></MathRun> the probability of the true class
            </span>
          </Line>
          <Axes x={L.x} y={L.y} xTicks={[0, 0.5, 1]} yTicks={[0, 1, 2, 3, 4, 5]} xTitle="p, true class" yTitle="Loss" at={minusAt} />
          <Curve points={nll} x={L.x} y={L.y} at={minusAt + 4} dur={26} color={INK} clip={left} />
          <Svg opacity={ease(frame, confAt, 10)}>
            <circle cx={at(L.x, WRONG)} cy={at(L.y, -Math.log(WRONG))} r={10} fill={ACCENT} />
          </Svg>
          {/* Both labels sit between gridlines, never on one. */}
          <Line at={confAt} x={at(L.x, WRONG) + 24} y={at(L.y, 3.6) - 18} size={23} color={ACCENT_INK}>
            Confident and wrong: <MathRun><I>p</I> = {WRONG}</MathRun>, loss {(-Math.log(WRONG)).toFixed(1)}
          </Line>
          <Line at={limitAt} x={at(L.x, WRONG) + 24} y={at(L.y, 4.55) - 18} size={23} color={INK}>
            No limit as <MathRun><I>p</I> → 0</MathRun>
          </Line>

          {/* The gradients on the score. */}
          <Svg opacity={ease(frame, wrongAt - 2, 12)}>
            <rect x={right.left} y={right.top} width={at(G.x, -3) - right.left} height={right.height} fill={MARK_BAD} opacity={0.6} />
          </Svg>
          <Line at={wrongAt} x={right.left + 12} y={right.top + h(12)} size={21} color={ACCENT_INK}>
            Confidently wrong
          </Line>
          <Axes x={G.x} y={G.y} xTicks={[-8, -4, 0, 4]} yTicks={[-1, -0.5, 0]} xTitle="Score, true label 1" yTitle="Gradient on the score" at={behindAt - 4} />
          <Curve points={mseGrad} x={G.x} y={G.y} at={slopeAt} dur={26} color={ACCENT} width={3.4} clip={right} />
          <Curve points={ceGrad} x={G.x} y={G.y} at={ceAt} dur={26} color={OK} width={3.4} clip={right} />
          <Line at={slopeAt} x={right.left} y={y(296)} size={26} color={ACCENT_INK}>
            Squared error:{" "}
            <MathRun>
              2(<I>p</I> − 1) <Mark at={slopeAt + 8} color={MARK_BAD}><I>σ</I>′(<I>z</I>)</Mark>
            </MathRun>
            <span style={{ opacity: ease(frame, zeroAt, 10) }}> → 0</span>
          </Line>
          <Line at={ceAt} x={right.left} y={y(342)} size={26} color={OK_INK}>
            Cross-entropy:{" "}
            <MathRun>
              <I>p</I> − 1
            </MathRun>
            <span style={{ opacity: ease(frame, errorAt, 10) }}>, just the error</span>
          </Line>
        </Fade>

        {/* ── From a confidently wrong start ── */}
        <Fade at={runFrom - 4}>
          <Line at={startAt} x={X0} y={y(300)} size={26} color={INK_SOFT}>
            The page&apos;s model, started confidently wrong; full-batch steps at rate {CE.rate}
          </Line>
          <Axes
            x={T.x}
            y={T.y}
            xTicks={[0, 50, 100, 150, 200, 250, 300]}
            yTicks={[0, 0.25, 0.5, 0.75, 1]}
            yFormat={(v) => pct(v)}
            xTitle="Step"
            yTitle="Training accuracy"
            at={startAt}
          />
          <Svg opacity={ease(frame, ceRunAt - 6, 12)}>
            <line x1={run.left} x2={run.left + run.width} y1={at(T.y, CE.target)} y2={at(T.y, CE.target)} stroke={INK} strokeWidth={1.6} strokeDasharray="6 6" />
          </Svg>
          <Line at={ceRunAt - 6} x={run.left + run.width + 16} y={at(T.y, CE.target) - 16} size={22}>
            {pct(CE.target)}
          </Line>
          <Svg opacity={ease(frame, fourteenAt - 2, 10)}>
            <circle cx={at(T.x, 0)} cy={at(T.y, CE.start)} r={8} fill={INK} />
          </Svg>
          <Line at={fourteenAt - 2} x={at(T.x, 0) + 18} y={at(T.y, CE.start) + 6} size={22}>
            {pct(CE.start)} right
          </Line>
          <Curve points={acc(CE.ceAccuracy)} x={T.x} y={T.y} at={ceRunAt} dur={30} color={OK} width={3.6} clip={run} />
          <Curve points={acc(CE.mseAccuracy)} x={T.x} y={T.y} at={mseAt} dur={40} color={ACCENT} width={3.6} clip={run} />
          {[
            { s: CE.ceSteps, c: OK, ink: OK_INK, a: twentyFourAt, name: "Cross-entropy" },
            { s: CE.mseSteps, c: ACCENT, ink: ACCENT_INK, a: twoThirtyAt, name: "Squared error" },
          ].map((m) => (
            <React.Fragment key={m.s}>
              <Svg opacity={ease(frame, m.a - 2, 10)}>
                <line x1={at(T.x, m.s)} x2={at(T.x, m.s)} y1={at(T.y, CE.target)} y2={run.top + run.height} stroke={m.c} strokeWidth={2} strokeDasharray="3 5" />
                <circle cx={at(T.x, m.s)} cy={at(T.y, CE.target)} r={8} fill={m.c} />
              </Svg>
              {/* Under the 75% gridline, clear of it. */}
              <Line at={m.a - 2} x={at(T.x, m.s) + 16} y={at(T.y, 0.75) + h(10)} size={24} color={m.ink}>
                {m.name}: {m.s} steps
              </Line>
            </React.Fragment>
          ))}
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
