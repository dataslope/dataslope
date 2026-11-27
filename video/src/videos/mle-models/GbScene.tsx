import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, PAPER } from "../../editorial/style";
import { OutlineBadge } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { BOOST } from "./data";
import { ACCENT, ACCENT_INK, at, Axes, Box, type Box as PlotBox, Curve, DATA, Drift, Fade, int, Line, Mark, mulberry32, OK, OK_INK, Q_SIZE, scales, Svg, X0 } from "./parts";

/** A schematic's residuals: twelve signed values, seeded, no data behind
 *  them (the narration describes the mechanism, not a run). */
const RESID = (() => {
  const rnd = mulberry32(11);
  return Array.from({ length: 12 }, () => (rnd() - 0.5) * 2);
})();
/** How much of each residual one small tree leaves, in the schematic. */
const KEEP = 0.6;

/**
 * Question 13. Residuals as bars that shrink as each small tree is added,
 * the trees summed in a row beneath; what the libraries add. Then the
 * follow-up on a synthetic benchmark: validation error against trees at
 * three learning rates, the two minima marked, and why the count is a
 * latency budget.
 */
export const GbScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("gb").from;
  const qAt = n.word("gb", "Question thirteen");
  const textAt = n.word("gb", "What is gradient boosting?");
  const addsAt = n.word("gb", "It adds shallow trees one at a time");
  const oneAtATime = n.word("gb", "one at a time");
  const fittedAt = n.word("gb", "each fitted to the negative gradient");
  const negAt = n.word("gb", "negative gradient");
  const residAt = n.word("gb", "the residuals");
  const libsAt = n.word("gb", "XGBoost, LightGBM and CatBoost");
  const sampAt = n.word("gb", "add sampling");
  const penAt = n.word("gb", "L one and L two penalties");
  const histAt = n.word("gb", "histogram splits");
  const rateFrom = n.beat("gb-rate").from;
  const howAt = n.word("gb-rate", "how many trees");
  const benchAt = n.word("gb-rate", "On a synthetic benchmark");
  const oneAt = n.word("gb-rate", "a learning rate of one");
  const twelveAt = n.word("gb-rate", "lowest after twelve trees");
  const climbsAt = n.word("gb-rate", "then climbs");
  const pointAt = n.word("gb-rate", "At point one");
  const fallingAt = n.word("gb-rate", "keeps falling until seven hundred and eighty-four");
  const halfAt = n.word("gb-rate", "less than half the error");
  const earlyAt = n.word("gb-prod", "Early stopping on validation picks the count");
  const everyAt = n.word("gb-prod", "every tree runs again for each prediction");
  const budgetAt = n.word("gb-prod", "a latency budget");
  const end = n.beat("gb-prod").to;

  // ── The mechanism: residuals shrink as trees are added ──
  // The residuals draw first and hold, finished, for about a second before
  // the first tree lands, so its shrink is seen from a whole starting state.
  const trees = [oneAtATime + 8, negAt + 6, residAt + 8];
  const added = trees.filter((t) => frame >= t).length;
  const shrink = trees.reduce((k, t) => k * (1 - (1 - KEEP) * ease(frame, t, 14)), 1);
  const base = y(540);
  const unit = h(150);
  const bx = X0 + 20;
  const bw = 40;
  const tw = 160;
  const tTop = y(700);
  const out = rateFrom - 6;

  // ── The follow-up ──
  const chart: PlotBox = { left: X0 + 70, top: y(380), width: 900, height: h(400) };
  const C = scales(chart, [1, 1000], [0, 12], { x: true });
  const pts = (v: readonly number[], from = 0, to = v.length) => v.slice(from, to).map((e, i) => [from + i + 1, e] as const);
  const r1 = BOOST.runs["1.0"];
  const r3 = BOOST.runs["0.3"];
  const r01 = BOOST.runs["0.1"];
  const R = 1180;

  return (
    <AbsoluteFill>
      {trees.map((t) => (
        <Sfx key={t} name="el-tap" at={t} level={-31} />
      ))}
      <Sfx name="el-tap" at={sampAt} level={-33} />
      <Sfx name="el-tap" at={penAt} level={-33} />
      <Sfx name="el-tap" at={histAt} level={-33} />
      <Sfx name="el-pencil" at={oneAt} level={-35} />
      <Sfx name="el-pop" at={twelveAt} level={-31} />
      <Sfx name="el-pencil" at={pointAt} level={-35} />
      <Sfx name="el-pop" at={fallingAt + 20} level={-31} />
      <Sfx name="el-chime" at={budgetAt + 24} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={13} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is gradient boosting?
        </QuestionCard>

        <Fade at={addsAt - 6} out={out}>
          <Line at={addsAt - 4} x={X0} y={y(310)} size={24} color={INK_SOFT}>
            What is left to explain, row by row, after {added} {added === 1 ? "tree" : "trees"}
          </Line>
          <Svg>
            <line x1={bx - 10} x2={bx + RESID.length * (bw + 12)} y1={base} y2={base} stroke={INK} strokeWidth={1.6} />
            {RESID.map((r, i) => {
              const v = r * shrink * unit * ease(frame, addsAt - 4 + i, 10);
              return <rect key={i} x={bx + i * (bw + 12)} y={v > 0 ? base - v : base} width={bw} height={Math.abs(v)} rx={4} fill={DATA} />;
            })}
          </Svg>
          {trees.map((t, i) => (
            <React.Fragment key={t}>
              <Box x={X0 + i * (tw + 50)} y={tTop} w={tw} h={h(64)} at={t} title={`Tree ${i + 1}`} size={23} />
              {i > 0 ? (
                <Line at={t} x={X0 + i * (tw + 50) - 34} y={tTop + h(14)} size={26}>
                  +
                </Line>
              ) : null}
            </React.Fragment>
          ))}

          <Line at={addsAt - 2} x={R - 300} y={y(330)} size={28}>
            Shallow trees, added one at a time
          </Line>
          <Line at={fittedAt - 2} x={R - 300} y={y(384)} size={26}>
            Each fits the negative gradient of the loss
          </Line>
          <Line at={residAt - 2} x={R - 300} y={y(432)} size={26} color={INK_SOFT}>
            For squared error: <Mark at={residAt + 2}>the residuals</Mark>
          </Line>
          <Line at={libsAt - 2} x={R - 300} y={y(560)} size={26}>
            XGBoost, LightGBM and CatBoost add:
          </Line>
          <div style={{ position: "absolute", left: R - 300, top: y(616), display: "flex", gap: 18, fontSize: 24 }}>
            {[
              { at: sampAt, t: "Sampling" },
              { at: penAt, t: "L1 and L2 penalties" },
              { at: histAt, t: "Histogram splits" },
            ].map((b) => (
              <OutlineBadge key={b.t} tone="ink" size={24} style={{ opacity: ease(frame, b.at - 2, 10), background: PAPER, fontFamily: SANS }}>
                {b.t}
              </OutlineBadge>
            ))}
          </div>
        </Fade>

        {/* ── How many trees ── */}
        <Fade at={rateFrom - 4}>
          <Line at={howAt - 2} x={X0} y={y(296)} size={26} color={INK_SOFT}>
            Friedman #1, depth-3 trees: validation error
          </Line>
          <Axes x={C.x} y={C.y} xTicks={[1, 10, 100, 1000]} yTicks={[0, 4, 8, 12]} xFormat={(v) => int(v)} xTitle="Trees" yTitle="Mean squared error" at={benchAt} />
          <Curve points={pts(r3.validation)} x={C.x} y={C.y} at={pointAt} dur={30} color={INK_SOFT} width={1.8} clip={chart} />
          <Curve points={pts(r1.validation, 0, r1.best)} x={C.x} y={C.y} at={oneAt} dur={18} color={INK} width={3.4} clip={chart} />
          <Curve points={pts(r1.validation, r1.best - 1)} x={C.x} y={C.y} at={climbsAt - 2} dur={24} color={ACCENT} width={3.4} clip={chart} />
          <Curve points={pts(r01.validation)} x={C.x} y={C.y} at={pointAt + 4} dur={36} color={OK} width={3.4} clip={chart} />
          {[
            // Each label between two gridlines and clear of the curves.
            { run: r1, a: twelveAt, ink: INK, c: INK, name: "Rate 1.0", below: h(38) },
            { run: r01, a: fallingAt + 20, ink: OK_INK, c: OK, name: "Rate 0.1", below: h(16) },
          ].map((m) => (
            <React.Fragment key={m.name}>
              <Svg opacity={ease(frame, m.a - 2, 10)}>
                <circle cx={at(C.x, m.run.best)} cy={at(C.y, m.run.bestValidation)} r={8} fill={m.c} stroke={PAPER} strokeWidth={2} />
              </Svg>
              <Line at={m.a - 2} x={at(C.x, m.run.best) - 10} y={at(C.y, m.run.bestValidation) + m.below} size={23} color={m.ink} align="right" width={400}>
                {m.run.best} trees: {m.run.bestValidation.toFixed(2)}
              </Line>
            </React.Fragment>
          ))}
          <Line at={oneAt} x={R} y={y(400)} size={26}>
            Rate 1.0:{" "}
            <span style={{ opacity: ease(frame, twelveAt, 10) }}>
              best at {r1.best}
            </span>
          </Line>
          <Line at={climbsAt} x={R} y={y(446)} size={24} color={ACCENT_INK}>
            Then climbs
          </Line>
          <Line at={pointAt} x={R} y={y(520)} size={26} color={OK_INK}>
            Rate 0.1: best at {r01.best}
          </Line>
          <Line at={halfAt - 2} x={R} y={y(566)} size={24} color={OK_INK}>
            Less than half the error
          </Line>
          <Line at={pointAt + 10} x={R} y={y(630)} size={22} color={INK_SOFT}>
            Rate 0.3: the thin line between
          </Line>
          <Line at={earlyAt - 2} x={R} y={y(712)} size={24}>
            Early stopping on validation picks the count
          </Line>
          <Line at={everyAt - 2} x={R} y={y(758)} size={24}>
            Every tree runs for each prediction:
          </Line>
          <Line at={budgetAt - 4} x={R} y={y(804)} size={24}>
            <Mark at={budgetAt}>The count is a latency budget</Mark>
          </Line>
        </Fade>
      </Drift>
    </AbsoluteFill>
  );
};
