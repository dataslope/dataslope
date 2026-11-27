import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, label } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GD } from "./data";
import { at, Axes, type Box, Bowl, Drift, Flow, Line, Mark, num, POINT, POINT_INK, Q_SIZE, scales, StepPath, Target, X0 } from "./parts";

/** The bowl's plot, shared with question two's three panels. */
export const BOWL_LEVELS = [0.08, 0.32, 0.72, 1.28, 2.0, 2.88, 3.92, 5.12, 6.48];

/**
 * Question 1. The loss over two of the page's three weights as a bowl of
 * contours (the bias held at its best), the gradient at the start pointing
 * uphill and the step going the other way, scaled by the learning rate. Then
 * the page's own run: 500 steps at 0.01 from zero, drawn every tenth step,
 * stopping short of the least-squares answer, still moving.
 */
export const GdScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("gd").from;
  const qAt = n.word("gd", "Question one");
  const textAt = n.word("gd", "How does gradient descent work?");
  const gradAt = n.word("gd", "The gradient of the loss");
  const uphillAt = n.word("gd", "points uphill");
  const stepAt = n.word("gd", "step each weight the other way");
  const rateAt = n.word("gd", "scaled by the learning rate");
  const repeatAt = n.word("gd", "and repeat");
  const rowsAt = n.word("gd-run", "a hundred noisy rows");
  const zeroAt = n.word("gd-run", "From zero");
  const stepsAt = n.word("gd-run", "five hundred steps");
  const reachAt = n.word("gd-run", "reach point nine nine");
  const closeAt = n.word("gd-run", "close");
  const movingAt = n.word("gd-run", "still moving");
  const end = n.beat("gd-run").to;

  // The plot: equal units on both axes, so the contours keep their shape.
  const box: Box = { left: X0, top: y(300), width: 660, height: h(470) };
  const unit = box.width / 3.6;
  const ylo = -1.92;
  const { x: sx, y: sy } = scales(box, [-1.2, 2.4], [ylo, ylo + box.height / unit]);
  const ols: [number, number] = [GD.ols[1], GD.ols[2]];
  const o: [number, number] = [at(sx, 0), at(sy, 0)];
  // The gradient at the start, in the bowl's own terms: H (θ − θ*).
  const [[a, b], [, c]] = GD.bowl;
  const d = [0 - ols[0], 0 - ols[1]];
  const g = [a * d[0] + b * d[1], b * d[0] + c * d[1]];
  const gl = Math.hypot(g[0], g[1]);
  const u = [g[0] / gl, -g[1] / gl]; // page pixels: y grows down
  const L = 150;
  const up: [number, number] = [o[0] + u[0] * L, o[1] + u[1] * L];
  const down: [number, number] = [o[0] - u[0] * L, o[1] - u[1] * L];

  const R = 900;
  const showRun = ease(frame, zeroAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={gradAt} level={-36} />
      <Sfx name="el-whoosh" at={uphillAt} level={-36} />
      <Sfx name="el-whoosh" at={stepAt + 4} level={-36} />
      <Sfx name="el-tap" at={rowsAt} level={-32} />
      <Sfx name="el-sprinkle" at={stepsAt} level={-34} />
      <Sfx name="el-tap" at={movingAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          How does gradient descent work?
        </QuestionCard>

        {/* ── The bowl ── */}
        <Bowl H={GD.bowl} centre={ols} levels={BOWL_LEVELS} x={sx} y={sy} at={gradAt - 6} clip={box} />
        <Axes x={sx} y={sy} xTicks={[-1, 0, 1, 2]} yTicks={[-1, 0, 1]} at={gradAt - 8} />
        <div style={{ position: "absolute", left: box.left + box.width - 40, top: box.top + box.height + 34, ...label(24, INK_SOFT), opacity: ease(frame, gradAt, 12) }}>
          <MathRun>
            <I>θ</I>
            <sub style={{ fontSize: "0.68em" }}>1</sub>
          </MathRun>
        </div>
        <div style={{ position: "absolute", left: box.left - 50, top: box.top - 56, ...label(24, INK_SOFT), opacity: ease(frame, gradAt, 12) }}>
          <MathRun>
            <I>θ</I>
            <sub style={{ fontSize: "0.68em" }}>2</sub>
          </MathRun>
        </div>
        <Target px={[at(sx, ols[0]), at(sy, ols[1])]} at={gradAt + 6} ring={false} />
        <Line at={gradAt + 8} x={at(sx, ols[0]) - 70} y={at(sy, ols[1]) + 26} size={21} color={INK_SOFT}>
          Lowest loss
        </Line>

        {/* The gradient at the start, and the step against it. */}
        <Flow points={[o, up]} at={uphillAt - 2} color={INK} out={zeroAt} />
        <Line at={uphillAt} x={up[0] + 6} y={up[1] - 46} size={22} out={zeroAt}>
          Gradient: uphill
        </Line>
        <Flow points={[o, down]} at={stepAt} color={POINT} width={3.2} out={zeroAt} />
        <Line at={rateAt - 2} x={down[0] + 18} y={down[1] - 14} size={22} color={POINT_INK} out={zeroAt}>
          Step × learning rate
        </Line>

        {/* The page's run: 500 steps at 0.01, every tenth drawn. */}
        <StepPath path={GD.pagePath} x={sx} y={sy} at={stepsAt} every={2.2} color={POINT} r={3.2} clip={box} />

        {/* ── The rule, and the run ── */}
        <Line at={stepAt} x={R} y={y(320)} size={40}>
          <MathRun>
            <I>θ</I> ← <I>θ</I> − <Mark at={rateAt}><I>η</I></Mark> ∇<I>L</I>(<I>θ</I>)
          </MathRun>
        </Line>
        <Line at={rateAt + 6} x={R} y={y(392)} size={24} color={INK_SOFT}>
          <MathRun><I>η</I></MathRun>, the learning rate
          <span style={{ opacity: ease(frame, repeatAt, 10) }}>; repeat</span>
        </Line>

        <Line at={rowsAt - 2} x={R} y={y(500)} size={26}>
          {GD.rows} noisy rows from weights{" "}
          <MathRun>
            <I>θ</I>
            <sub style={{ fontSize: "0.68em" }}>0</sub>, <I>θ</I>
            <sub style={{ fontSize: "0.68em" }}>1</sub>, <I>θ</I>
            <sub style={{ fontSize: "0.68em" }}>2</sub>
          </MathRun>{" "}
          = {GD.true.map((v) => num(v, 0)).join(", ")}
        </Line>
        {/* The plot is a slice: θ1 and θ2, with θ0 (the bias) at its best. */}
        <Line at={rowsAt + 8} x={box.left} y={box.top + box.height + h(84)} size={22} color={INK_SOFT}>
          <MathRun>
            <I>θ</I>
            <sub style={{ fontSize: "0.68em" }}>0</sub>
          </MathRun>
          , the bias, held at its best
        </Line>
        <Line at={zeroAt} x={R} y={y(556)} size={26} color={INK_SOFT}>
          From zero, 500 steps at <MathRun><I>η</I> = 0.01</MathRun>
        </Line>
        <div style={{ opacity: showRun }}>
          <Line at={reachAt - 2} x={R} y={y(640)} size={30}>
            After 500 steps: {GD.learned.map((v) => num(v)).join(", ")}
          </Line>
          <Line at={closeAt - 2} x={R} y={y(700)} size={26} color={INK_SOFT}>
            Least squares: {GD.ols.map((v) => num(v)).join(", ")}
          </Line>
          <Line at={movingAt - 2} x={R} y={y(770)} size={30} color={INK}>
            <Mark at={movingAt}>Close, and still moving</Mark>
          </Line>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
