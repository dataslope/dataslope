import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK_SOFT, label, svgText } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KNN, SCALE } from "./data";
import { ACCENT, ACCENT_INK, at, type Box, CLASS, Drift, Fade, Frame, HBar, int, Line, Mark, MARK_BAD, MARK_OK, OK_INK, pct, Q_SIZE, scales, Svg, X0 } from "./parts";

/**
 * Question 9. The two ways to put features on comparable ranges. The
 * simulated customers twice: in their own units, years against dollars on one
 * scale, where the ages are a smear under a pixel tall; and standardized,
 * where both spread. kNN's score under each, and on income alone. Then
 * gradient descent on the page's rows with one column a hundred times larger,
 * and what to do in production.
 */
export const ScaleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("scale").from;
  const qAt = n.word("scale", "Question nine");
  const textAt = n.word("scale", "What is feature scaling");
  const rangesAt = n.word("scale", "It puts features on comparable ranges");
  const stdAt = n.word("scale", "by standardizing");
  const minmaxAt = n.word("scale", "min-max scaling");
  const simAt = n.word("scale", "Simulate customers");
  const ageAt = n.word("scale", "whose age, in years");
  const incomeAt = n.word("scale", "and income, in dollars");
  const equallyAt = n.word("scale", "matter equally");
  const rawAt = n.word("scale-knn", "Unscaled, kNN scores");
  const aloneAt = n.word("scale-knn", "exactly what income alone scores");
  const spanAt = n.word("scale-knn", "the whole span of ages");
  const fiftyAt = n.word("scale-knn", "no more than fifty dollars");
  const stdKnnAt = n.word("scale-knn", "Standardized, eighty-nine");
  const gdFrom = n.beat("scale-gd").from;
  const multAt = n.word("scale-gd", "Multiply one of the page's columns by a hundred");
  const centsAt = n.word("scale-gd", "as if dollars became cents");
  const eightAt = n.word("scale-gd", "from eight steps");
  const eightyAt = n.word("scale-gd", "to nearly eighty thousand");
  const needAt = n.word("scale-prod", "Distance models, regularized models and gradient training need it");
  const treesAt = n.word("scale-prod", "trees don't");
  const fitAt = n.word("scale-prod", "fit the scaler on training data only");
  const shipAt = n.word("scale-prod", "then ship it with the model");
  const end = n.beat("scale-prod").to;

  // Left: the customers in their own units, one scale for both.
  const PW = 740;
  const top = y(420);
  const ph = h(300);
  const left: Box = { left: X0, top, width: PW, height: ph };
  const inc = { lo: 20000, hi: 150000, a: left.left + 20, b: left.left + PW - 20 };
  const pxPerUnit = (inc.b - inc.a) / (inc.hi - inc.lo);
  const base = top + ph - 24;
  const ageSpan = 50 * pxPerUnit;
  // Right: standardized.
  const right: Box = { left: 1000, top, width: PW, height: ph };
  const S = scales(right, [-1.9, 1.9], [-1.9, 1.9]);
  const out = gdFrom - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={stdAt} level={-31} />
      <Sfx name="el-tap" at={minmaxAt} level={-31} />
      <Sfx name="el-sprinkle" at={incomeAt} level={-33} />
      <Sfx name="el-pop" at={rawAt + 6} level={-32} />
      <Sfx name="el-pop" at={aloneAt} level={-32} />
      <Sfx name="el-sprinkle" at={equallyAt} level={-34} />
      <Sfx name="el-tap" at={stdKnnAt + 6} level={-31} />
      <Sfx name="el-tap" at={eightAt} level={-31} />
      <Sfx name="el-whoosh" at={eightyAt} level={-34} />
      <Sfx name="el-tap" at={fitAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={9} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is feature scaling, and why does it matter?
        </QuestionCard>

        <Fade at={rangesAt - 4} out={out}>
          {/* ── Two ways to comparable ranges ── */}
          <Line at={rangesAt - 2} x={X0} y={y(300)} size={28}>
            Comparable ranges:
          </Line>
          <Line at={stdAt - 2} x={X0 + 300} y={y(300)} size={28}>
            Standardize{" "}
            <MathRun>
              (<I>x</I> − <I>μ</I>) / <I>σ</I>
            </MathRun>
          </Line>
          <Line at={minmaxAt - 2} x={X0 + 800} y={y(300)} size={28}>
            Min-max{" "}
            <MathRun>
              (<I>x</I> − min) / (max − min)
            </MathRun>
          </Line>

          {/* ── The customers in their own units ── */}
          <Line at={simAt - 2} x={X0} y={top - h(56)} size={24}>
            {int(KNN.rows)} simulated customers
            <span style={{ color: INK_SOFT, opacity: ease(frame, equallyAt - 2, 8) }}>: age and income matter equally</span>
          </Line>
          <Frame box={left} at={ageAt - 4} />
          <Svg opacity={ease(frame, incomeAt - 4, 12)}>
            {[50000, 100000, 150000].map((v) => (
              <text key={v} x={at(inc, v)} y={top + ph + 30} textAnchor="middle" style={svgText(label(20, INK_SOFT))}>
                {int(v)}
              </text>
            ))}
            <text x={left.left + PW} y={top + ph + 60} textAnchor="end" style={svgText(label(20, INK_SOFT))}>
              Income, dollars
            </text>
          </Svg>
          <Svg opacity={ease(frame, incomeAt, 20)}>
            {KNN.income.map((v, i) => (
              <circle key={i} cx={at(inc, v)} cy={base - (KNN.age[i] - 20) * pxPerUnit} r={2.6} fill={CLASS[KNN.label[i]]} opacity={0.6} />
            ))}
          </Svg>
          <Line at={ageAt} x={left.left + 24} y={top + h(24)} size={24}>
            Age, 20 to 70 years, at the same scale:
          </Line>
          <Line at={incomeAt + 10} x={left.left + 24} y={top + h(66)} size={24} color={ACCENT_INK}>
            {ageSpan.toFixed(1)} px tall
          </Line>

          {/* ── Standardized ── */}
          <Frame box={right} at={equallyAt - 6} />
          <Svg>
            {KNN.z.map(([a, b], i) => {
              const p = ease(frame, equallyAt - 2 + (i / KNN.z.length) * 16, 8);
              if (p <= 0) return null;
              return <circle key={i} cx={at(S.x, a)} cy={at(S.y, b)} r={2.8 * p} fill={CLASS[KNN.label[i]]} opacity={0.7} />;
            })}
          </Svg>
          <Line at={equallyAt - 4} x={right.left} y={top - h(56)} size={24}>
            The same customers, standardized
          </Line>

          {/* ── kNN on each ── */}
          <Line at={rawAt + 4} x={X0} y={top + ph + h(80)} size={28} color={ACCENT_INK}>
            kNN: {pct(KNN.raw, 1)}
            <span style={{ color: INK_SOFT, opacity: ease(frame, aloneAt - 2, 10) }}>, the same as income alone</span>
          </Line>
          <Line at={spanAt - 2} x={X0} y={top + ph + h(130)} size={24}>
            <Mark at={fiftyAt} color={MARK_BAD}>
              The whole span of ages = 50 dollars of distance
            </Mark>
          </Line>
          <Line at={stdKnnAt + 6} x={right.left} y={top + ph + h(80)} size={28} color={OK_INK}>
            kNN: {pct(KNN.scaled, 1)}
          </Line>
        </Fade>

        {/* ── Gradient descent on the page's rows ── */}
        <Fade at={gdFrom - 4}>
          <Line at={multAt - 2} x={X0} y={y(310)} size={28}>
            Gradient descent on the page&apos;s rows, one column × 100
            <span style={{ color: INK_SOFT, opacity: ease(frame, centsAt, 10) }}>: dollars to cents</span>
          </Line>
          <HBar x={X0} y={y(380)} w={1300} max={SCALE.times100.steps} value={SCALE.asIs.steps} at={eightAt} label="As it is" valueText={`${SCALE.asIs.steps} steps to settle`} />
          <HBar
            x={X0}
            y={y(480)}
            w={1300}
            max={SCALE.times100.steps}
            value={SCALE.times100.steps}
            at={eightyAt}
            label="One column × 100"
            valueText={`${int(SCALE.times100.steps)} steps`}
            color={ACCENT}
            ink={ACCENT_INK}
          />

          {/* ── In production ── */}
          <Line at={needAt - 2} x={X0} y={y(640)} size={28}>
            Needs it: distance models, regularized models, gradient training
          </Line>
          <Line at={treesAt - 2} x={X0} y={y(692)} size={28} color={INK_SOFT}>
            Trees: no
          </Line>
          <Line at={fitAt - 2} x={X0} y={y(780)} size={30} color={OK_INK}>
            <Mark at={fitAt + 4} color={MARK_OK}>
              Fit the scaler on training data only
            </Mark>
            <span style={{ opacity: ease(frame, shipAt - 2, 10) }}>, then ship it with the model</span>
          </Line>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
