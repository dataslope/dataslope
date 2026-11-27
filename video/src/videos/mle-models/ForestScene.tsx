import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { ENSEMBLE } from "./data";
import { artH, at, Axes, type Box, Curve, DATA, Drift, Fade, Line, Mark, OK, OK_INK, pct, POINT, scales, Spot, Svg, X0 } from "./parts";

const TREES = [1, 2, 5, 10, 25, 50, 100, 200, 300];
const SPOT_W = 190;

/**
 * Question 12, on scikit-learn's handwritten digits. One 8 × 8 image, eight
 * of its pixels lit for the features one split may try. Then accuracy as
 * trees are averaged, bagged trees against a forest: the forest's trees are
 * weaker alone and stronger together, with one full tree as the reference.
 */
export const ForestScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("forest").from;
  const qAt = n.word("forest", "Question twelve");
  const textAt = n.word("forest", "How does a random forest differ");
  const bagsAt = n.word("forest", "It bags trees");
  const splitAt = n.word("forest", "at each split");
  const fewAt = n.word("forest", "a random few features");
  const eightAt = n.word("forest", "eight of the sixty-four pixels");
  const digitsAt = n.word("forest", "handwritten digits");
  const runFrom = n.beat("forest-run").from;
  const oneAt = n.word("forest-run", "One tree scores eighty-four percent");
  const weakerAt = n.word("forest-run", "Each forest tree is weaker");
  const seventyAt = n.word("forest-run", "seventy-six percent against eighty-two");
  const overlapAt = n.word("forest-run", "their mistakes overlap less");
  const togetherAt = n.word("forest-run", "together they score ninety-eight");
  const end = n.beat("forest-run").to;

  // The digit, 8 × 8, square cells.
  const cell = 40;
  const ch = cell;
  const dx = X0;
  const dy = y(340);
  const lit = new Set(ENSEMBLE.split);

  // Accuracy as trees are averaged.
  const R = 960;
  const chart: Box = { left: R + 50, top: y(380), width: 620, height: h(390) };
  const C = scales(chart, [1, 300], [0.7, 1], { x: true });
  const curve = (c: Record<string, number>) => TREES.map((t) => [t, c[String(t)]] as const);
  const out = runFrom - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={digitsAt - 20} level={-35} />
      <Sfx name="el-tap" at={eightAt} level={-30} />
      <Sfx name="el-pencil" at={oneAt} level={-35} />
      <Sfx name="el-pencil" at={weakerAt} level={-35} />
      <Sfx name="el-tap" at={togetherAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={54}>
          How does a random forest differ from a single decision tree?
        </QuestionCard>

        {/* ── One digit, and the pixels one split may try ── */}
        <Svg opacity={ease(frame, splitAt - 10, 14)}>
          {ENSEMBLE.digit.map((v, i) => {
            const r = Math.floor(i / 8);
            const c = i % 8;
            const p = ease(frame, splitAt - 10 + i * 0.4, 8);
            const shade = v === 0 ? ds("gray", 100) : `color-mix(in srgb, ${ds("blue", 900)} ${Math.round((v / 16) * 100)}%, ${ds("blue", 100)})`;
            return <rect key={i} x={dx + c * (cell + 3)} y={dy + r * (ch + 3)} width={cell} height={ch} rx={4} fill={shade} opacity={p} />;
          })}
          {ENSEMBLE.digit.map((_, i) => {
            if (!lit.has(i)) return null;
            const r = Math.floor(i / 8);
            const c = i % 8;
            const p = ease(frame, eightAt + ENSEMBLE.split.indexOf(i) * 2, 8);
            return <rect key={`l${i}`} x={dx + c * (cell + 3) - 3} y={dy + r * (ch + 3) - 3} width={cell + 6} height={ch + 6} rx={6} fill="none" stroke={POINT} strokeWidth={4} opacity={p} />;
          })}
        </Svg>
        <Line at={digitsAt - 2} x={dx} y={dy + 8 * (ch + 3) + h(16)} size={22} color={INK_SOFT}>
          One 8 × 8 digit: {ENSEMBLE.pixels} pixel features
        </Line>
        <Spot id="mle-models-trees" at={bagsAt} left={dx + 8 * (cell + 3) + 110} top={dy + 10} width={SPOT_W} height={artH("trees", SPOT_W)} />

        <Fade at={bagsAt - 4} out={out}>
          <Line at={bagsAt - 2} x={R} y={y(360)} size={30}>
            Bagged trees
          </Line>
          <Line at={splitAt - 2} x={R} y={y(420)} size={30}>
            Each split tries <Mark at={fewAt}>a random few features</Mark>
          </Line>
          <Line at={eightAt - 2} x={R} y={y(480)} size={26} color={INK_SOFT}>
            Here, {ENSEMBLE.tried} of {ENSEMBLE.pixels} pixels: the square root
          </Line>
        </Fade>

        {/* ── Accuracy, trees averaged ── */}
        <Fade at={runFrom - 4}>
          <Axes
            x={C.x}
            y={C.y}
            xTicks={[1, 10, 100, 300]}
            yTicks={[0.7, 0.8, 0.9, 1]}
            yFormat={(v) => pct(v)}
            xTitle="Trees averaged"
            yTitle={`Accuracy, ${ENSEMBLE.test} held-out digits`}
            at={runFrom}
          />
          <Svg opacity={ease(frame, oneAt, 12)}>
            <line x1={chart.left} x2={chart.left + chart.width} y1={at(C.y, ENSEMBLE.tree)} y2={at(C.y, ENSEMBLE.tree)} stroke={INK} strokeWidth={1.8} strokeDasharray="7 6" />
          </Svg>
          <Line at={oneAt + 4} x={chart.left + chart.width + 16} y={at(C.y, ENSEMBLE.tree) - 16} size={22}>
            One tree: {pct(ENSEMBLE.tree)}
          </Line>
          <Curve points={curve(ENSEMBLE.baggedCurve)} x={C.x} y={C.y} at={weakerAt} dur={34} color={DATA} width={3.6} />
          <Curve points={curve(ENSEMBLE.forestCurve)} x={C.x} y={C.y} at={weakerAt + 8} dur={34} color={OK} width={3.6} />
          <Line at={togetherAt - 2} x={chart.left + chart.width + 16} y={at(C.y, ENSEMBLE.forest) - 36} size={24} color={OK_INK}>
            Forest {pct(ENSEMBLE.forest, 1)}
          </Line>
          <Line at={togetherAt + 4} x={chart.left + chart.width + 16} y={at(C.y, ENSEMBLE.bagged) - 2} size={24} color={DATA}>
            Bagged {pct(ENSEMBLE.bagged, 1)}
          </Line>
          <Line at={seventyAt - 2} x={X0} y={y(760)} size={26}>
            Single trees, on average: <span style={{ color: OK_INK }}>forest {pct(ENSEMBLE.forestSingle)}</span>,{" "}
            <span style={{ color: DATA }}>bagged {pct(ENSEMBLE.baggedSingle)}</span>
          </Line>
          <Line at={overlapAt - 2} x={X0} y={y(812)} size={26}>
            <Mark at={overlapAt + 4}>Mistakes that overlap less</Mark>
          </Line>
          <Svg opacity={ease(frame, weakerAt + 10, 10)}>
            <circle cx={at(C.x, 1)} cy={at(C.y, ENSEMBLE.forestCurve["1"])} r={7} fill={OK} />
            <circle cx={at(C.x, 1)} cy={at(C.y, ENSEMBLE.baggedCurve["1"])} r={7} fill={DATA} />
          </Svg>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
