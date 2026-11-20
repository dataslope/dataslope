import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { MathRun } from "../../editorial/math";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MLE } from "./data";
import { BAD, BAD_INK, Baseline, Curve, DATA, Drift, Heading, Line, Mark, OK, OK_INK, POINT, Svg, X0 } from "./parts";

const P_X1 = 880;
const R_X0 = 1000;

/**
 * Question 11. A likelihood over a click rate, its peak marked; the log,
 * because 2,000 halves multiply to exactly zero in float64 while their log
 * is −1,386.29; the two losses it becomes (squared error, log loss); and the
 * catch: three clicks in three views peak at 100% (red), while one pretend
 * click and one pretend skip, a prior, give four in five (the curve already
 * on the page, now green), as L2 is a normal prior on the weights.
 */
export const MleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q11").from;
  const qAt = n.word("q11", "Question eleven");
  const textAt = n.word("q11", "What is maximum likelihood estimation?");
  const pickAt = n.word("q11", "Pick the parameters");
  const probableAt = n.word("q11", "most probable");
  const logAt = n.word("q11-log", "You maximize the log");
  const underflowAt = n.word("q11-log", "the product underflows");
  const halfAt = n.word("q11-log", "a probability of one half");
  const zeroAt = n.word("q11-log", "exactly zero");
  const minusAt = n.word("q11-log", "minus thirteen hundred");
  const normalAt = n.word("q11-loss", "For a normal model");
  const squaresAt = n.word("q11-loss", "least squares");
  const logisticAt = n.word("q11-loss", "For logistic regression");
  const lossAt = n.word("q11-loss", "minimizing the log loss");
  const smallAt = n.word("q11-small", "The catch is small samples");
  const threeAt = n.word("q11-small", "Three clicks in three views");
  const hundredAt = n.word("q11-small", "peaks at a hundred percent");
  const pretendAt = n.word("q11-small", "Add one pretend click");
  const fourAt = n.word("q11-small", "four in five");
  const l2At = n.word("q11-small", "An L2 penalty");
  const priorAt = n.word("q11-small", "a normal prior on them");
  const end = n.beat("q11-small").to;

  const base = y(720);
  const height = h(240);
  const px = (v: number) => X0 + v * (P_X1 - X0);
  const smooth = MLE.grid.map((g, i) => [px(g), base - MLE.curveSmoothed[i] * height] as const);
  const raw = MLE.grid.map((g, i) => [px(g), base - MLE.curve33[i] * height] as const);
  const green = ease(frame, fourAt, 14);
  const curveColor = green > 0.5 ? OK : DATA;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={pickAt + 4} level={-35} />
      <Sfx name="el-tap" at={probableAt + 4} level={-31} />
      <Sfx name="el-tap" at={zeroAt} level={-30} />
      <Sfx name="el-tap" at={minusAt} level={-30} />
      <Sfx name="el-tap" at={squaresAt} level={-32} />
      <Sfx name="el-tap" at={lossAt} level={-32} />
      <Sfx name="el-pencil" at={threeAt + 4} level={-35} />
      <Sfx name="el-tap" at={fourAt} level={-30} />
      <Sfx name="el-tap" at={priorAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is Maximum Likelihood Estimation (MLE)?
        </QuestionCard>
        <Line at={pickAt} x={X0} y={y(282)} size={28}>
          Pick the parameters that make the observed data{" "}
          <span style={{ opacity: ease(frame, probableAt - 2, 10) }}>most probable, under your model</span>
        </Line>

        {/* ── The likelihood over a click rate ── */}
        <Heading at={pickAt + 6} x={X0} y={y(370)}>
          Likelihood of <Num>4</Num> clicks in <Num>5</Num> views
        </Heading>
        <Curve points={smooth} at={pickAt + 8} dur={26} color={curveColor} width={3.2} />
        <Baseline x0={X0} x1={P_X1} base={base} at={pickAt + 6} ticks={[0, 0.25, 0.5, 0.75, 1].map((v) => ({ v, x: px(v), text: `${v * 100}%` }))} title="Click rate" />
        <Svg opacity={ease(frame, probableAt, 12)}>
          <line x1={px(MLE.smoothed)} x2={px(MLE.smoothed)} y1={base} y2={base - height - h(20)} stroke={POINT} strokeWidth={3} strokeDasharray="7 5" />
        </Svg>
        <Line at={probableAt + 4} x={px(MLE.smoothed) - 14} y={base - height - h(30)} size={22} align="right" width={400}>
          <Mark at={probableAt + 8}>Maximum likelihood</Mark>
        </Line>
        {/* The small sample: three in three, piling against 100%. */}
        <Curve points={raw} at={threeAt + 4} dur={24} color={BAD} width={3.2} />
        <Line at={hundredAt} x={X0} y={y(792)} size={26} color={BAD_INK} weight={600}>
          <Num>3</Num> clicks in <Num>3</Num> views: peak at <Num>100%</Num>
        </Line>
        <Line at={pretendAt} x={X0} y={y(842)} size={26} color={OK_INK} weight={600}>
          Add a pretend click and skip, a prior:{" "}
          <span style={{ opacity: ease(frame, fourAt - 2, 10) }}>
            <Num>4</Num> in <Num>5</Num>, <Num>80%</Num>
          </span>
        </Line>
        <Line at={smallAt} x={X0 + 14} y={base - height + h(30)} size={22} color={INK_SOFT}>
          The catch: small samples
        </Line>

        <ColumnRule x={(P_X1 + R_X0) / 2 + 10} top={y(370)} height={y(860) - y(370)} at={logAt} />

        {/* ── The log ── */}
        <Heading at={underflowAt - 6} x={R_X0} y={y(370)}>
          The log, because the product underflows
        </Heading>
        <Ink at={halfAt} dur={14} style={{ left: R_X0, top: y(424), whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, INK) }}>
            <MathRun>0.5 × 0.5 × ⋯ × 0.5</MathRun> (<Num>{MLE.labels.toLocaleString("en-US")}</Num> labels){" "}
            <span style={{ opacity: ease(frame, zeroAt - 2, 10), color: BAD_INK, fontWeight: 600 }}>
              = <Num>0.0</Num> in float64
            </span>
          </span>
        </Ink>
        <Ink at={minusAt - 4} dur={14} style={{ left: R_X0, top: y(476), whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, OK_INK), fontWeight: 600 }}>
            Its log:{" "}
            <MathRun>
              <Num>2,000</Num> × log 0.5 = −<Num>1,386.29</Num>
            </MathRun>
          </span>
        </Ink>

        {/* ── What it becomes ── */}
        <Heading at={normalAt} x={R_X0} y={y(572)}>
          Maximize the likelihood, and you get
        </Heading>
        <Line at={normalAt + 4} x={R_X0} y={y(624)} size={26}>
          Normal likelihood →{" "}
          <span style={{ opacity: ease(frame, squaresAt - 4, 10) }}>
            <Mark at={squaresAt}>squared error</Mark>
          </span>
        </Line>
        <Line at={normalAt + 10} x={R_X0} y={y(666)} size={22} color={INK_SOFT}>
          It peaks at the sample mean
        </Line>
        <Line at={logisticAt} x={R_X0} y={y(718)} size={26}>
          Bernoulli likelihood →{" "}
          <span style={{ opacity: ease(frame, lossAt - 4, 10) }}>
            <Mark at={lossAt}>log loss</Mark>
          </span>
        </Line>
        <Line at={logisticAt + 6} x={R_X0} y={y(760)} size={22} color={INK_SOFT}>
          Logistic regression&apos;s objective
        </Line>
        <Line at={l2At} x={R_X0} y={y(830)} size={26} weight={600}>
          L2 penalty = a normal prior on the weights
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
