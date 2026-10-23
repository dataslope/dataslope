import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LIMIT } from "./data";
import { at, Axes, DATA, DATA_LIGHT, Drift, mulberry32, OK, type Scale, Svg, X0 } from "./parts";

const COL_R = 1000;
const IMPRESSIONS = { cols: 20, rows: 2, size: 30, gap: 8, top: 470 };
/** Which of the forty drawn impressions were clicked: a few, by chance. */
const CLICKED = new Set([6, 17, 31]);
const LINE = { x0: COL_R, x1: 1780, y: 520 };
/** Arrival times in one minute, drawn as ticks: a seeded Poisson process. */
const ARRIVALS = (() => {
  const r = mulberry32(310);
  const out: number[] = [];
  let t = 0;
  for (;;) {
    t += -Math.log(1 - r()) / 9;
    if (t >= 1) return out;
    out.push(t);
  }
})();
const PLOT = { left: 300, right: 1500, top: 380, base: 800 };

/**
 * Question 10. A binomial's fixed trials (a strip of impressions, each
 * clicked or not) beside a Poisson's open-ended count (arrivals ticking
 * along a minute). Then the two meet: Binomial(1,000, 0.003) as bars with
 * Poisson(3) as dots on top of them, never more than 0.0003 apart.
 */
export const PoisScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("pois").from;
  const qAt = n.word("pois", "Question");
  const textAt = n.word("pois", "When would you use");
  const binAt = n.word("pois-which", "A binomial needs");
  const sameAt = n.word("pois-which", "the same chance");
  const impAt = n.word("pois-which", "a thousand impressions");
  const clickedAt = n.word("pois-which", "clicked or not");
  const poisAt = n.word("pois-which", "A Poisson counts");
  const ceilingAt = n.word("pois-which", "no natural ceiling");
  const arrivalsAt = n.word("pois-which", "arrivals per minute");
  const meetAt = n.word("pois-limit", "the two meet");
  const thousandAt = n.word("pois-limit", "A thousand trials");
  const rateAt = n.word("pois-limit", "a rate of three");
  const end = n.beat("monty-in").to;

  const colsOut = meetAt - 2;
  const xs: Scale = { lo: -0.5, hi: 10.5, a: PLOT.left, b: PLOT.right };
  const ys: Scale = { lo: 0, hi: 0.25, a: y(PLOT.base), b: y(PLOT.top) };
  const bw = ((PLOT.right - PLOT.left) / 11) * 0.62;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={binAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={impAt + 2} level={-36} />
      <Sfx name="el-tap" at={poisAt + 2} level={-34} />
      <Sfx name="el-sprinkle" at={arrivalsAt} level={-36} />
      <Sfx name="el-whoosh" at={meetAt} level={-36} />
      <Sfx name="el-pop" at={rateAt + 2} level={-32} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={60}>
          When would you use a Poisson instead of a binomial?
        </QuestionCard>

        {/* ── Binomial: a fixed number of trials ── */}
        <Ink at={binAt} dur={14} out={colsOut} style={{ left: X0, top: y(330) }}>
          <span style={{ ...label(32, INK) }}>binomial</span>
        </Ink>
        <Note at={binAt + 8} x={X0} y={y(384)} out={colsOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>a fixed number of trials, each with the same chance</span>
        </Note>
        <Svg opacity={1 - ease(frame, colsOut, 10)}>
          {Array.from({ length: IMPRESSIONS.cols * IMPRESSIONS.rows }, (_, i) => {
            const col = i % IMPRESSIONS.cols;
            const row = Math.floor(i / IMPRESSIONS.cols);
            const p = ease(frame, impAt + i * 0.6, 8);
            const click = CLICKED.has(i) ? ease(frame, clickedAt + 2, 10) : 0;
            const s = IMPRESSIONS.size;
            return p > 0 ? (
              <rect
                key={i}
                x={X0 + col * (s + IMPRESSIONS.gap)}
                y={y(IMPRESSIONS.top) + row * (s + IMPRESSIONS.gap)}
                width={s * p}
                height={s * p}
                rx={4}
                fill={click > 0 ? `color-mix(in srgb, ${DATA} ${click * 100}%, ${PAPER})` : PAPER}
                stroke={DATA}
                strokeWidth={1.8}
              />
            ) : null;
          })}
          <line
            x1={X0 + IMPRESSIONS.cols * (IMPRESSIONS.size + IMPRESSIONS.gap) + 6}
            x2={X0 + IMPRESSIONS.cols * (IMPRESSIONS.size + IMPRESSIONS.gap) + 6}
            y1={y(IMPRESSIONS.top) - 14}
            y2={y(IMPRESSIONS.top) + IMPRESSIONS.rows * (IMPRESSIONS.size + IMPRESSIONS.gap) + 6}
            stroke={INK}
            strokeWidth={4}
            opacity={ease(frame, sameAt, 10)}
          />
        </Svg>
        <Note at={impAt + 10} x={X0} y={y(IMPRESSIONS.top) + IMPRESSIONS.rows * (IMPRESSIONS.size + IMPRESSIONS.gap) + 20} out={colsOut}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>1,000 impressions, each clicked or not</span>
        </Note>

        {/* ── Poisson: no natural ceiling ── */}
        <Ink at={poisAt} dur={14} out={colsOut} style={{ left: COL_R, top: y(330) }}>
          <span style={{ ...label(32, INK) }}>Poisson</span>
        </Ink>
        <Note at={ceilingAt} x={COL_R} y={y(384)} out={colsOut}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>events with no natural ceiling</span>
        </Note>
        <Svg opacity={1 - ease(frame, colsOut, 10)}>
          <line
            x1={LINE.x0}
            x2={LINE.x0 + (LINE.x1 - LINE.x0) * ease(frame, ceilingAt + 4, 20)}
            y1={y(LINE.y)}
            y2={y(LINE.y)}
            stroke={INK}
            strokeWidth={2}
          />
          {ARRIVALS.map((t, i) => {
            const p = ease(frame, arrivalsAt - 6 + t * 30, 6);
            const x = LINE.x0 + t * (LINE.x1 - LINE.x0);
            return p > 0 ? <line key={i} x1={x} x2={x} y1={y(LINE.y) - 30 * p} y2={y(LINE.y)} stroke={DATA} strokeWidth={4} strokeLinecap="round" /> : null;
          })}
        </Svg>
        <Note at={arrivalsAt + 4} x={COL_R} y={y(LINE.y) + 24} out={colsOut}>
          <span style={{ ...label(22, INK_SOFT), whiteSpace: "nowrap" }}>arrivals in one minute</span>
        </Note>

        {/* ── Where they meet ── */}
        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
          yTicks={[0, 0.1, 0.2]}
          yFormat={(v) => v.toFixed(1)}
          xTitle="count"
          at={thousandAt - 4}
        />
        <Svg>
          {LIMIT.binom.map((v, k) => {
            const p = ease(frame, thousandAt + k * 1.5, 12);
            const top = at(ys, v * p);
            return <rect key={k} x={at(xs, k) - bw / 2} y={top} width={bw} height={y(PLOT.base) - top} rx={3} fill={DATA_LIGHT} />;
          })}
          {LIMIT.poisson.map((v, k) => {
            const p = ease(frame, rateAt - 2 + k * 1.5, 10);
            return p > 0 ? <circle key={k} cx={at(xs, k)} cy={at(ys, v)} r={11 * p} fill={OK} /> : null;
          })}
        </Svg>
        <Note at={thousandAt + 6} x={PLOT.right - 300} y={y(PLOT.top) - 6}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <span style={{ display: "inline-block", width: 18, height: 18, background: DATA_LIGHT, marginRight: 10, verticalAlign: "-2px" }} />
            binomial, 1,000 trials at 0.3%
          </span>
        </Note>
        <Note at={rateAt + 2} x={PLOT.right - 300} y={y(PLOT.top) + 36}>
          <span style={{ ...label(23, INK), whiteSpace: "nowrap", ...TABULAR }}>
            <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: 9, background: OK, marginRight: 10, verticalAlign: "-2px" }} />
            Poisson, rate 3
          </span>
        </Note>
        <Note at={rateAt + 16} x={PLOT.right - 300} y={y(PLOT.top) + 90}>
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap" }}>almost exactly the same</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
