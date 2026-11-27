import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { ENSEMBLE } from "./data";
import { ACCENT_INK, at, Axes, Box, type Box as PlotBox, Curve, DATA, Drift, Fade, Flow, Line, Mark, POINT, Q_SIZE, scales, Svg, VRule, X0 } from "./parts";

/**
 * Question 11. Bagging as models side by side into an average, boosting as
 * models in a chain, outlined boxes lit as each is named. Then the floor
 * under averaging: the page's formula for the variance of an average of
 * correlated models, at the page chart's two correlations.
 */
export const BagScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("bag").from;
  const qAt = n.word("bag", "Question eleven");
  const textAt = n.word("bag", "What are ensembles?");
  const bagAt = n.word("bag", "Bagging trains models independently");
  const bootAt = n.word("bag", "each on a bootstrap sample");
  const avgAt = n.word("bag", "and averages them");
  const varAt = n.word("bag", "mainly cutting variance");
  const boostAt = n.word("bag", "Boosting trains them in sequence");
  const corrAt = n.word("bag", "each correcting the last");
  const biasAt = n.word("bag", "mainly cutting bias");
  const overAt = n.word("bag", "it overfits unless regularized");
  const floorFrom = n.beat("bag-floor").from;
  const floorAt = n.word("bag-floor", "Averaging has a floor");
  const addAt = n.word("bag-floor", "adding models cuts the variance");
  const levelAt = n.word("bag-floor", "down to a level");
  const corrdAt = n.word("bag-floor", "how correlated their errors are");
  const end = n.beat("bag-floor").to;

  // The diagrams sit under a one-line answer to "What are ensembles?".
  const top = y(372);
  // Bagging: three models side by side, into an average.
  const bw = 200;
  const bh = h(70);
  const bxs = [X0, X0 + 240, X0 + 480];
  const mTop = top + h(80);
  const avgTop = mTop + bh + h(110);
  const avgX = X0 + 240;
  // Boosting: three models in a chain.
  const cx0 = 1010;
  const cxs = [cx0, cx0 + 270, cx0 + 540];
  const cw = 200;
  const chainTop = mTop + h(70);
  const out = floorFrom - 6;

  const chart: PlotBox = { left: X0 + 70, top: y(380), width: 1100, height: h(400) };
  const F = scales(chart, [1, 40], [0, 1]);

  return (
    <AbsoluteFill>
      {bxs.map((_, i) => (
        <Sfx key={i} name="el-tap" at={bagAt + 4 + i * 4} level={-32} />
      ))}
      <Sfx name="el-pencil" at={avgAt} level={-35} />
      {cxs.map((_, i) => (
        <Sfx key={i} name="el-tap" at={boostAt + 4 + i * 6} level={-32} />
      ))}
      <Sfx name="el-pencil" at={addAt} level={-35} />
      <Sfx name="el-tap" at={levelAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What are ensembles? Explain bagging and boosting.
        </QuestionCard>

        <Fade at={textAt + 20} out={out}>
          {/* ── What an ensemble is: the page's "combine multiple models" ── */}
          <Line at={textAt + 26} x={X0} y={y(296)} size={28}>
            Ensembles combine many models into one prediction
          </Line>

          {/* ── Bagging ── */}
          <Line at={bagAt - 2} x={X0} y={top} size={30}>
            Bagging
          </Line>
          {bxs.map((x, i) => (
            <Box key={i} x={x} y={mTop} w={bw} h={bh} at={bagAt + 4 + i * 4} title={`Model ${i + 1}`} sub={<span style={{ opacity: ease(frame, bootAt, 10) }}>bootstrap sample</span>} size={23} />
          ))}
          {bxs.map((x, i) => (
            <Flow
              key={i}
              points={
                i === 1
                  ? [
                      [x + bw / 2, mTop + bh + 8],
                      [x + bw / 2, avgTop - 4],
                    ]
                  : [
                      [x + bw / 2, mTop + bh + 8],
                      [x + bw / 2, mTop + bh + h(40)],
                      [avgX + bw / 2 + (i - 1) * 50, mTop + bh + h(40)],
                      [avgX + bw / 2 + (i - 1) * 50, avgTop - 4],
                    ]
              }
              at={avgAt + i * 3}
            />
          ))}
          <Box x={avgX} y={avgTop} w={bw} h={bh} at={avgAt + 10} title="Average" size={23} color={DATA} />
          <Line at={varAt - 2} x={X0} y={avgTop + bh + h(50)} size={26}>
            <Mark at={varAt}>Mainly cuts variance</Mark>
          </Line>

          <VRule x={920} top={top} bottom={y(820)} at={boostAt - 2} />

          {/* ── Boosting ── */}
          <Line at={boostAt - 2} x={cx0} y={top} size={30}>
            Boosting
          </Line>
          {cxs.map((x, i) => (
            <Box key={i} x={x} y={chainTop} w={cw} h={bh} at={boostAt + 4 + i * 6} title={`Model ${i + 1}`} size={23} />
          ))}
          {[0, 1].map((i) => (
            <Flow key={i} points={[[cxs[i] + cw + 8, chainTop + bh / 2], [cxs[i + 1] - 8, chainTop + bh / 2]]} at={boostAt + 8 + i * 6} />
          ))}
          <Line at={corrAt - 2} x={cx0} y={chainTop + bh + h(28)} size={24} color={INK_SOFT}>
            Each corrects the last
          </Line>
          <Line at={biasAt - 2} x={cx0} y={avgTop + bh + h(50)} size={26}>
            <Mark at={biasAt}>Mainly cuts bias</Mark>
          </Line>
          <Line at={overAt - 2} x={cx0} y={avgTop + bh + h(100)} size={26} color={ACCENT_INK}>
            Overfits unless regularized
          </Line>
        </Fade>

        {/* ── The floor under averaging ── */}
        <Fade at={floorFrom - 4}>
          <Line at={floorAt - 2} x={X0} y={y(300)} size={28}>
            Variance of an average of <MathRun><I>n</I></MathRun> models, correlation <MathRun><I>ρ</I></MathRun>:{" "}
            <MathRun>
              <I>ρ</I> + (1 − <I>ρ</I>) / <I>n</I>
            </MathRun>
          </Line>
          <Axes x={F.x} y={F.y} xTicks={[1, 10, 20, 30, 40]} yTicks={[0, 0.25, 0.5, 0.75, 1]} xTitle="Models averaged" yTitle="Variance, as a share of one model's" at={floorAt} />
          {(["0.6", "0.3"] as const).map((r, i) => {
            const pts = ENSEMBLE.formula[r];
            const rho = Number(r);
            const color = i ? ds("blue", 800) : DATA;
            return (
              <React.Fragment key={r}>
                <Svg opacity={ease(frame, levelAt + i * 4, 12)}>
                  <line x1={F.x.a} x2={F.x.b} y1={at(F.y, rho)} y2={at(F.y, rho)} stroke={POINT} strokeWidth={2.4} strokeDasharray="7 6" />
                </Svg>
                <Curve points={pts} x={F.x} y={F.y} at={addAt + i * 6} dur={30} color={color} width={3.6} />
                <Line at={addAt + 24 + i * 6} x={chart.left + chart.width + 18} y={at(F.y, pts[pts.length - 1][1]) - 18} size={24} color={color}>
                  <MathRun>
                    <I>ρ</I> = {r}
                  </MathRun>
                </Line>
              </React.Fragment>
            );
          })}
          <Line at={corrdAt - 2} x={chart.left + 360} y={at(F.y, 0.875)} size={24}>
            Floors set by <Mark at={corrdAt + 4}>how correlated the errors are</Mark>
          </Line>
          <Line at={floorAt + 20} x={chart.left + chart.width + 18} y={chart.top + chart.height - h(30)} size={21} color={INK_SOFT}>
            The page&apos;s formula, not a fit
          </Line>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
