import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { ColumnRule, Ink, Leader, Num, OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLT, LLN } from "./data";
import { Baseline, Curve, DATA, Drift, Heading, Hist, Line, Mark, normalPoints, Svg, X0 } from "./parts";

const L_X1 = 780;
const R_X0 = 960;
const R_X1 = 1780;
const BASE = 680;
const BARS_H = 200;
/** The means' axis, in the population's units. */
const M_LO = 1.5;
const M_HI = 5;

/**
 * Questions 2 and 3. The page's own simulation: a heavily skewed population
 * on the left, and the means of 3,000 samples of 40 from it piling up into a
 * bell on the right, its spread simulated beside the formula's. What the
 * theorem covers (means and sums) and what it doesn't (a median, a p95).
 * Then the law of large numbers: one running mean settling onto the
 * population mean where the population was, "where" at its end and "shape"
 * on the bell.
 */
export const CltScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q2").from;
  const qAt = n.word("q2", "Question two");
  const textAt = n.word("q2", "What does the Central Limit Theorem say");
  const largeAt = n.word("q2", "For a large enough sample");
  const normalAt = n.word("q2", "approximately normal");
  const shapeAt = n.word("q2", "whatever the population's shape");
  const finiteAt = n.word("q2", "as long as its variance is finite");
  const justifiesAt = n.word("q2", "That justifies");
  const drawsAt = n.word("q2-sim", "three thousand samples of forty");
  const skewedAt = n.word("q2-sim", "heavily skewed population");
  const bellAt = n.word("q2-sim", "pile up in a bell");
  const simAt = n.word("q2-sim", "point four seven five");
  const formulaAt = n.word("q2-sim", "the formula's point four seven seven");
  const meansAt = n.word("q2-limit", "means and sums");
  const accuracyAt = n.word("q2-limit", "so accuracy and average loss");
  const medianAt = n.word("q2-limit", "For a median");
  const p95At = n.word("q2-limit", "ninety-fifth percentile latency");
  const noFormulaAt = n.word("q2-limit", "no such formula");
  const q3At = n.word("q3", "Question three");
  const q3TextAt = n.word("q3", "What is the Law of Large Numbers");
  const lawAt = n.word("q3", "The law says where");
  const popMeanAt = n.word("q3", "at the population mean");
  const cltAt = n.word("q3", "The CLT says what shape");
  const wayAt = n.word("q3", "on the way there");
  const end = n.beat("q3").to;

  const base = y(BASE);
  const barsH = h(BARS_H);
  const q2Out = q3At - 4;

  // ── Left: the population, then the running mean ──
  const px = (v: number) => X0 + (v / 15) * (L_X1 - X0);
  // ── Right: the means ──
  const mx = (v: number) => R_X0 + ((v - M_LO) / (M_HI - M_LO)) * (R_X1 - R_X0);
  const meanMax = Math.max(...CLT.means.counts);
  const bin = CLT.means.edges[1] - CLT.means.edges[0];
  const bellPeak = (CLT.samples * bin) / (CLT.seSimulated * Math.sqrt(2 * Math.PI));
  const bell = normalPoints({
    mu: CLT.meanOfMeans,
    sd: CLT.seSimulated,
    lo: M_LO + 0.05,
    hi: M_HI - 0.05,
    x0: mx(M_LO + 0.05),
    x1: mx(M_HI - 0.05),
    base,
    height: (bellPeak / meanMax) * barsH,
  });
  const grown = (i: number) => ease(frame, drawsAt + 4 + i * 0.8, 14) * (0.25 + 0.75 * ease(frame, bellAt - 10, 30));

  // ── The running mean (question 3), on a log scale of draws ──
  const RUN_X1 = L_X1 - 40;
  const lx = (k: number) => X0 + (Math.log10(k) / Math.log10(2000)) * (RUN_X1 - X0);
  const lTop = y(500);
  const ly = (v: number) => base - ((v - 1) / (8 - 1)) * (base - lTop);
  const run = LLN.at.map(([k, v]) => [lx(k), ly(v)] as const);
  const runDraw = ease(frame, lawAt + 4, Math.max(20, popMeanAt - lawAt));

  const cols = { top: y(440), bottom: y(780) };

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={shapeAt} level={-33} />
      <Sfx name="el-sprinkle" at={drawsAt + 4} level={-32} />
      <Sfx name="el-pencil" at={bellAt} level={-35} />
      <Sfx name="el-tap" at={simAt} level={-30} />
      <Sfx name="el-tap" at={formulaAt} level={-30} />
      <Sfx name="el-tap" at={meansAt} level={-31} />
      <Sfx name="el-tap" at={medianAt} level={-31} />
      <Sfx name="el-pencil" at={lawAt + 4} level={-35} />
      <Sfx name="el-tap" at={popMeanAt} level={-30} />
      <Sfx name="el-pencil" at={cltAt + 6} level={-35} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={2} at={qAt - 4} textAt={textAt - 4} out={q2Out} size={60}>
          What does the Central Limit Theorem say, and why does it matter?
        </QuestionCard>
        <QuestionCard n={3} at={q3At} textAt={q3TextAt - 2} size={60}>
          What is the Law of Large Numbers, and how is it different from the CLT?
        </QuestionCard>

        {/* ── The theorem, in a line and a half ── */}
        <Ink at={largeAt} dur={16} out={q2Out} style={{ left: X0, top: y(318), whiteSpace: "nowrap" }}>
          <span style={{ ...note(28, INK) }}>
            For a large enough sample, the sample mean is approximately normal,{" "}
            <span style={{ opacity: ease(frame, shapeAt - 2, 10) }}>whatever the population&apos;s shape</span>
          </span>
        </Ink>
        <Ink at={finiteAt} dur={16} out={q2Out} style={{ left: X0, top: y(364), whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK_SOFT) }}>
            If its variance is finite.{" "}
            <span style={{ opacity: ease(frame, justifiesAt - 2, 10) }}>So normal intervals and tests work, even on skewed data</span>
          </span>
        </Ink>

        {/* ── Left: the skewed population ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, q2Out, 12) }}>
          <Heading at={shapeAt} x={X0} y={y(440)}>
            The population
          </Heading>
          <Hist
            counts={CLT.population.counts}
            edges={CLT.population.edges}
            x={px}
            base={base}
            height={barsH}
            grow={(i) => ease(frame, shapeAt + 2 + i * 0.6, 12)}
          />
          <Baseline x0={X0} x1={L_X1} base={base} at={shapeAt} ticks={[0, 5, 10, 15].map((v) => ({ v, x: px(v), text: v }))} />
          <Line at={skewedAt} x={px(5.5)} y={y(520)} size={24} color={INK_SOFT}>
            Heavily skewed: skewness <Num>{CLT.popSkew.toFixed(1)}</Num>
          </Line>
        </div>

        {/* ── Right: the means of 3,000 samples of 40 ── */}
        <Heading at={normalAt} x={R_X0} y={y(440)}>
          Sample means
        </Heading>
        <Line at={drawsAt} x={R_X0} y={y(484)} size={22} color={INK_SOFT}>
          <Num>{CLT.samples.toLocaleString("en-US")}</Num> samples of <Num>{CLT.n}</Num>
        </Line>
        <Hist counts={CLT.means.counts} edges={CLT.means.edges} x={mx} base={base} height={barsH} grow={grown} gap={1.5} />
        <Curve points={bell} at={normalAt + 4} dur={24} color={INK} width={2.6} />
        <Baseline x0={R_X0} x1={R_X1} base={base} at={normalAt} ticks={[2, 3, 4, 5].map((v) => ({ v, x: mx(v), text: v }))} />
        <Ink at={simAt - 2} dur={14} style={{ left: R_X0, top: y(744), whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, INK) }}>
            Spread: simulated{" "}
            <Mark at={simAt + 2}>
              <Num>{CLT.seSimulated.toFixed(3)}</Num>
            </Mark>
            <span style={{ opacity: ease(frame, formulaAt - 2, 10) }}>
              {" "}
              against the formula&apos;s{" "}
              <MathRun>
                <I>σ</I> / √<I>n</I>
              </MathRun>{" "}
              ={" "}
              <Mark at={formulaAt + 4}>
                <Num>{CLT.seFormula.toFixed(3)}</Num>
              </Mark>
            </span>
          </span>
        </Ink>

        {/* ── What it covers, and what it doesn't ── */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, q2Out, 12) }}>
          <Ink at={meansAt} dur={14} style={{ left: X0, top: y(806), whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, ...note(24, INK) }}>
              <span style={{ width: 210 }}>Covered</span>
              <OutlineBadge tone="green">mean</OutlineBadge>
              <OutlineBadge tone="green">sum</OutlineBadge>
              <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, accuracyAt - 2, 10), marginLeft: 10 }}>Accuracy, average loss</span>
            </div>
          </Ink>
          <Ink at={medianAt} dur={14} style={{ left: X0, top: y(866), whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, ...note(24, INK) }}>
              <span style={{ width: 210 }}>No formula</span>
              <OutlineBadge tone="yellow">median</OutlineBadge>
              <span style={{ opacity: ease(frame, p95At - 2, 10) }}>
                <OutlineBadge tone="yellow">p95 latency</OutlineBadge>
              </span>
              <span style={{ ...note(24, INK_SOFT), opacity: ease(frame, noFormulaAt - 2, 10), marginLeft: 10 }}>
                Its spread needs another method
              </span>
            </div>
          </Ink>
        </div>

        {/* ── Question 3: one running mean, settling ── */}
        <Heading at={q3At + 8} x={X0} y={y(440)}>
          One running mean
        </Heading>
        <Svg opacity={ease(frame, lawAt, 12)}>
          {[2, 4, 6, 8].map((v) => (
            <line key={v} x1={X0} x2={RUN_X1} y1={ly(v)} y2={ly(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
          ))}
        </Svg>
        {[2, 4, 6, 8].map((v) => (
          <Line key={v} at={lawAt} x={X0 - 14} y={ly(v) - 14} size={20} color={INK_SOFT} align="right" width={60}>
            <Num>{v}</Num>
          </Line>
        ))}
        <Baseline
          x0={X0}
          x1={RUN_X1}
          base={base}
          at={lawAt - 4}
          ticks={[1, 10, 100, 1000].map((v) => ({ v, x: lx(v), text: v.toLocaleString("en-US") }))}
          title="Draws, log scale"
        />
        <Curve points={[[X0, ly(LLN.truth)], [RUN_X1, ly(LLN.truth)]]} at={popMeanAt - 6} dur={16} color={INK} width={2.2} dash="8 6" />
        <Svg>
          <path
            d={run.map(([px2, py], i) => `${i ? "L" : "M"}${px2.toFixed(1)},${py.toFixed(1)}`).join(" ")}
            fill="none"
            stroke={DATA}
            strokeWidth={3.2}
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${runDraw} 1`}
            opacity={runDraw > 0 ? 1 : 0}
          />
        </Svg>
        <Line at={popMeanAt} x={lx(30)} y={ly(LLN.truth) - h(52)} size={22} color={INK}>
          Population mean <Num>{LLN.truth.toFixed(2)}</Num>
        </Line>
        <Ink at={popMeanAt + 6} dur={14} style={{ left: RUN_X1 + 14, top: ly(LLN.truth) - 20, whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, INK), fontWeight: 600 }}>
            <Mark at={popMeanAt + 10}>Where</Mark>
          </span>
        </Ink>

        {/* "Shape", on the bell from question 2. */}
        <Leader points={[[mx(4.25), y(560)], [mx(3.62), base - h(80)]]} at={cltAt + 6} width={1.6} />
        <Ink at={cltAt + 4} dur={14} style={{ left: mx(4.25) + 8, top: y(560) - 40, whiteSpace: "nowrap" }}>
          <span style={{ ...note(26, INK), fontWeight: 600 }}>
            <Mark at={cltAt + 8}>Shape</Mark>
          </span>
        </Ink>

        <ColumnRule x={(L_X1 + R_X0) / 2} top={cols.top} height={cols.bottom - cols.top} at={normalAt} />

        <Line at={lawAt + 2} x={X0} y={y(806)} size={26}>
          <b>Law of large numbers</b>: where the mean ends up
        </Line>
        <Line at={cltAt} x={R_X0} y={y(806)} size={26}>
          <b>CLT</b>: what shape its error takes
        </Line>
        <Line at={wayAt} x={R_X0} y={y(850)} size={24} color={INK_SOFT}>
          on the way there
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
