import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { M } from "../../editorial/math";
import { BAR, BLUE_INK, fmt, INK, INK_SOFT, label, PAPER, TABULAR } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BIAS, FIT } from "./data";
import {
  at,
  Axes,
  BIAS_C,
  BIAS_INK,
  type Box,
  Curve,
  Drift,
  Fade,
  fitTree,
  Key,
  line,
  LIT_INK,
  LIT_LINE,
  NOISE_C,
  OK,
  OK_INK,
  pulse,
  Q_SIZE,
  type Scale,
  Say,
  Spot,
  stepPoints,
  Svg,
  trainingSet,
  VAR_C,
  VAR_INK,
  X0,
} from "./parts";

/** One training set, drawn the way each of the five hundred was. */
const SET = trainingSet(BIAS.n, BIAS.sigma, 20261120);
const STUMP = fitTree(SET, 1);
const DEEP = fitTree(SET, 6);
/** The training set's y range, so no point sits on the frame. */
const Y_EDGE = Math.ceil(Math.max(...SET.map(([, v]) => Math.abs(v))) * 10 + 1) / 10;

/** The straight line's two learning curves (questions 2 and 3), in small and
 *  without numbers: what the two errors look like when they are all you have. */
const PREVIEW = (() => {
  const lo = Math.log(FIT.linear.sizes[0]);
  const hi = Math.log(FIT.linear.sizes[FIT.linear.sizes.length - 1]);
  const top = Math.max(...FIT.linear.validation) * 1.05;
  const pts = (ys: number[]) => FIT.linear.sizes.map((n, i) => [(Math.log(n) - lo) / (hi - lo), ys[i] / top] as const);
  return { train: pts(FIT.linear.train), val: pts(FIT.linear.validation) };
})();

const SIM: Box = { left: 190, right: 860, top: 420, bottom: 790 };
const DART = { left: 1240, right: 1740 };
const SUM: Box = { left: 190, right: 1000, top: 470, bottom: 820 };

/** A dart row's dots: each prediction jittered up and down so sixty read as
 *  a cloud, the same on every frame. */
const jitter = (i: number) => (((i * 7919) % 61) / 60 - 0.5) * 2;

/**
 * Question 1. The decomposition said once as an equation, built term by term
 * and kept at the top of the page; then the simulation that measures it: one
 * of five hundred training sets with a stump's and a deep tree's fits, the
 * sixty predictions each makes at one point (bias as a bunch off target,
 * variance as a scatter around it), the three terms by depth with depth 1's
 * error stacked beside them, and what ten times the data does to each.
 */
export const BiasScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("bias").from;
  const qAt = n.word("bias", "Question one");
  const textAt = n.word("bias", "Explain");
  const biasDefAt = n.word("bias-def", "Bias is error");
  const varDefAt = n.word("bias-def", "variance, from fitting");
  const noiseDefAt = n.word("bias-def", "With noise");
  const eqBiasAt = n.word("bias-def", "bias squared");
  const eqVarAt = n.word("bias-def", "variance and noise");
  const eqNoiseAt = n.word("bias-def", "noise sum");
  const eqSumAt = n.word("bias-def", "the expected squared error");
  const simAt = n.word("bias-sim", "A simulation");
  const drawAt = n.word("bias-sim", "Draw five hundred");
  const curveAt = n.word("bias-sim", "a known curve");
  const treeAt = n.word("bias-sim", "fit a tree");
  const pointAt = n.word("bias-dart", "At one point");
  const stumpsAt = n.word("bias-dart", "the stumps' predictions");
  const offAt = n.word("bias-dart", "off target");
  const biasAt = n.word("bias-dart", "that's bias");
  const deepAt = n.word("bias-dart", "Trees six deep");
  const scatterAt = n.word("bias-dart", "and scatter");
  const varAt = n.word("bias-dart", "that's variance");
  const sumAt = n.word("bias-sum", "Averaged along the curve");
  const twoOhAt = n.word("bias-sum", "point two oh");
  const sevenAt = n.word("bias-sum", "point oh seven bias");
  const fourAt = n.word("bias-sum", "point oh four variance");
  const nineAt = n.word("bias-sum", "point oh nine noise");
  const threeAt = n.word("bias-sum", "Depth three is lowest");
  const fourteenAt = n.word("bias-sum", "point one four");
  const climbAt = n.word("bias-sum", "climb back up");
  const allVarAt = n.word("bias-sum", "almost all of it variance");
  const dataAt = n.word("bias-data", "The follow-up");
  const tenAt = n.word("bias-data", "ten times the data");
  const fallsAt = n.word("bias-data", "its variance falls");
  const ohThreeAt = n.word("bias-data", "point oh three");
  const stumpAt = n.word("bias-data", "The stump's bias");
  const notAt = n.word("bias-data", "doesn't fall at all");
  const realAt = n.word("bias-real", "On a real problem");
  const readAt = n.word("bias-real", "you read the two");
  const end = n.beat("bias-real").to;

  // ── The equation: built under the definitions, then raised to the top ──
  const lift = ease(frame, simAt - 4, 22);
  const eqTop = y(600) + (y(252) - y(600)) * lift;
  const term = (at0: number) => ease(frame, at0 - 2, 12);

  // ── The simulation's one training set ──
  const sx: Scale = { lo: 0, hi: 1, a: SIM.left, b: SIM.right };
  const sy: Scale = { lo: -Y_EDGE, hi: Y_EDGE, a: y(SIM.bottom), b: y(SIM.top) };
  const simClip: Box = { left: SIM.left - 8, right: SIM.right + 8, top: y(SIM.top) - 10, bottom: y(SIM.bottom) + 10 };
  const truth = BIAS.curve.map(([a, b]) => [a, b] as const);
  const pts = SET.map(([px, py], i) => ({ x: at(sx, px), y: at(sy, py), at: drawAt + i * 0.6 }));
  const markX = at(sx, BIAS.x0);
  const markY = at(sy, BIAS.truthAt0);

  // ── The darts ──
  const dx: Scale = { lo: 0.4, hi: 1.6, a: DART.left, b: DART.right };
  const rowY = { stump: y(536), deep: y(670) };
  const axisY = y(770);
  const targetX = at(dx, BIAS.truthAt0);
  const stumpMean = at(dx, BIAS.dart["1"].mean);
  const deepLo = at(dx, BIAS.dart["6"].mean - BIAS.dart["6"].sd);
  const deepHi = at(dx, BIAS.dart["6"].mean + BIAS.dart["6"].sd);

  // ── The decomposition by depth ──
  const ex: Scale = { lo: 1, hi: 12, a: SUM.left, b: SUM.right };
  const ey: Scale = { lo: 0, hi: 0.22, a: y(SUM.bottom), b: y(SUM.top) };
  const sumClip: Box = { left: SUM.left - 12, right: SUM.right + 12, top: y(SUM.top) - 14, bottom: y(SUM.bottom) + 8 };
  const rows = BIAS.rows;
  const series = (k: "bias2" | "variance" | "sum") => rows.map((r) => [r.depth, r[k]] as const);
  const best = rows.find((r) => r.depth === BIAS.best) ?? rows[2];
  const bestP = ease(frame, threeAt, 12);
  const noiseY = at(ey, BIAS.noise);
  const d1 = rows[0];
  const BAR_X = 1300;
  const BAR_W = 110;
  const barScale = (v: number) => (v / 0.22) * (y(SUM.bottom) - y(SUM.top));
  const stack = [
    { v: d1.noise, color: NOISE_C, at: nineAt, name: "noise", ink: INK_SOFT },
    { v: d1.variance, color: VAR_C, at: fourAt, name: "variance", ink: VAR_INK },
    { v: d1.bias2, color: BIAS_C, at: sevenAt, name: <M>bias²</M>, ink: BIAS_INK },
  ];

  // ── Ten times the data ──
  const d6 = rows.find((r) => r.depth === 6) ?? rows[5];
  const ten6 = BIAS.tenfold.rows.find((r) => r.depth === 6) ?? BIAS.tenfold.rows[2];
  const ten1 = BIAS.tenfold.rows[0];
  const PB = y(800);
  const pairScale = (v: number) => (v / 0.1) * h(300);
  const pairs = [
    { title: "Depth 6: variance", x: 1180, a: d6.variance, b: ten6.variance, at: fallsAt, bAt: ohThreeAt, color: VAR_C, after: OK, afterInk: OK_INK },
    { title: <>Stump: <M>bias²</M></>, x: 1500, a: d1.bias2, b: ten1.bias2, at: stumpAt, bAt: notAt, color: BIAS_C, after: BIAS_C, afterInk: INK },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={biasDefAt} level={-32} />
      <Sfx name="el-tap" at={varDefAt} level={-32} />
      <Sfx name="el-tap" at={noiseDefAt} level={-32} />
      <Sfx name="el-whoosh" at={simAt - 4} level={-37} />
      <Sfx name="el-sprinkle" at={drawAt} level={-36} />
      <Sfx name="el-pencil" at={curveAt} level={-36} />
      <Sfx name="el-pencil" at={treeAt + 2} level={-36} />
      <Sfx name="el-pop" at={pointAt} level={-30} />
      <Sfx name="el-sprinkle" at={stumpsAt} level={-36} />
      <Sfx name="el-sprinkle" at={deepAt} level={-36} />
      <Sfx name="el-pencil" at={biasAt} level={-36} />
      <Sfx name="el-pencil" at={varAt} level={-36} />
      <Sfx name="el-whoosh" at={sumAt - 4} level={-37} />
      <Sfx name="el-pop" at={threeAt + 2} level={-30} />
      <Sfx name="el-tap" at={fallsAt} level={-30} />
      <Sfx name="el-tap" at={notAt} level={-30} />
      <Sfx name="el-chime" at={end + 4} level={-34} />

      <Drift from={from} to={end + 40} scale={0.016}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          Explain the bias–variance trade-off, and its decomposition.
        </QuestionCard>

        {/* ── The definitions, then the equation they add up to ── */}
        <Fade from={biasDefAt - 6} out={simAt - 6}>
          {[
            { at: biasDefAt, name: "Bias", ink: BIAS_INK, text: "a model too simple for the pattern" },
            { at: varDefAt, name: "Variance", ink: VAR_INK, text: "fitting one training sample’s quirks" },
            { at: noiseDefAt, name: "Noise", ink: INK_SOFT, text: "no model can remove it" },
          ].map((d, i) => (
            <Say key={d.name} at={d.at - 2} x={X0} y={y(300) + i * h(80)}>
              <span style={line(36, INK, 400)}>
                <b style={{ color: d.ink, fontWeight: 500 }}>{d.name}:</b> {d.text}
              </span>
            </Say>
          ))}
        </Fade>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: eqTop,
            fontSize: 54 - 16 * lift,
            color: INK,
            whiteSpace: "nowrap",
            display: "flex",
            gap: "0.3em",
            alignItems: "baseline",
          }}
        >
          <span style={{ color: BIAS_INK, opacity: term(eqBiasAt) }}>
            <M>bias²</M>
          </span>
          <span style={{ opacity: term(eqVarAt) }}>
            <M>+</M>
          </span>
          <span style={{ color: VAR_INK, opacity: term(eqVarAt) }}>
            <M>variance</M>
          </span>
          <span style={{ opacity: term(eqNoiseAt) }}>
            <M>+</M>
          </span>
          <span style={{ color: INK_SOFT, opacity: term(eqNoiseAt) }}>
            <M>noise</M>
          </span>
          <span style={{ opacity: term(eqSumAt) }}>
            <M>= expected squared error on new data</M>
          </span>
        </div>

        {/* ── One training set, its curve and two trees' fits ── */}
        <Fade from={simAt - 2} out={sumAt - 6}>
          <Say at={drawAt - 4} x={SIM.left} y={y(SIM.top) - h(70)}>
            <span style={line(24, INK_SOFT)}>One of 500 training sets: 50 points</span>
          </Say>
          <Axes x={sx} y={sy} xTicks={[0, 0.5, 1]} yTicks={[-1, 0, 1]} xFormat={(v) => String(v)} at={simAt} />
          <Curve points={truth} x={sx} y={sy} at={curveAt - 2} dur={22} color={INK} width={2.2} clip={simClip} />
          <Svg>
            {pts.map((p, i) => {
              const s = ease(frame, p.at, 8);
              return s > 0 ? <circle key={i} cx={p.x} cy={p.y} r={6 * s} fill={BAR} opacity={0.7} /> : null;
            })}
          </Svg>
          <Curve points={stepPoints(STUMP)} x={sx} y={sy} at={treeAt} dur={16} color={BIAS_C} width={3.6} clip={simClip} />
          <Curve points={stepPoints(DEEP)} x={sx} y={sy} at={treeAt + 12} dur={26} color={VAR_C} width={3} clip={simClip} />
          <Say at={treeAt + 4} x={SIM.left} y={y(SIM.bottom) + h(56)}>
            <div style={{ display: "flex", gap: 30, fontSize: 22 }}>
              <Key color={INK}>the known curve</Key>
              <Key color={BIAS_C}>a stump (depth 1)</Key>
              <Key color={VAR_C}>a tree 6 deep</Key>
            </div>
          </Say>
          {/* The one point the darts are thrown at. */}
          <Svg opacity={ease(frame, pointAt, 12)}>
            <line x1={markX} x2={markX} y1={y(SIM.top) - 6} y2={y(SIM.bottom)} stroke={LIT_LINE} strokeWidth={3} strokeDasharray="6 6" />
            <circle cx={markX} cy={markY} r={9 + 4 * pulse(frame, pointAt, 18)} fill={PAPER} stroke={INK} strokeWidth={3} />
          </Svg>

          {/* ── Sixty predictions at that point, from each kind of tree ── */}
          <Say at={pointAt + 2} x={1060} y={y(SIM.top) - h(70)}>
            <span style={line(24, INK_SOFT)}>
              Sixty trees’ predictions at <M>x = 0.25</M>
            </span>
          </Say>
          <Spot id="mle-generalization-target" at={pointAt + 4} x={1620} y={y(318)} w={140} />
          <Svg opacity={ease(frame, pointAt + 6, 14)}>
            <line x1={DART.left} x2={DART.right} y1={axisY} y2={axisY} stroke={INK} strokeWidth={1.6} />
            {[0.5, 1, 1.5].map((v) => (
              <line key={v} x1={at(dx, v)} x2={at(dx, v)} y1={axisY} y2={axisY + 8} stroke={INK} strokeWidth={1.4} />
            ))}
            <line x1={targetX} x2={targetX} y1={rowY.stump - h(70)} y2={axisY} stroke={INK} strokeWidth={2.4} />
          </Svg>
          {[0.5, 1.5].map((v) => (
            <Say key={v} at={pointAt + 8} x={at(dx, v)} y={axisY + h(16)} width={80} align="center">
              <span style={{ ...label(21, INK_SOFT), ...TABULAR }}>{v}</span>
            </Say>
          ))}
          <Say at={pointAt + 10} x={targetX} y={axisY + h(16)} width={200} align="center">
            <span style={{ ...label(21, INK), whiteSpace: "nowrap" }}>
              <span style={TABULAR}>1</span>: the curve
            </span>
          </Say>
          {(["1", "6"] as const).map((d) => {
            const isStump = d === "1";
            const yy = isStump ? rowY.stump : rowY.deep;
            const start = isStump ? stumpsAt : deepAt;
            return (
              <React.Fragment key={d}>
                <Svg>
                  {BIAS.dart[d].first.map((v, i) => {
                    const s = ease(frame, start + i * 0.35, 8);
                    return s > 0 ? (
                      <circle key={i} cx={at(dx, v)} cy={yy + jitter(i + (isStump ? 0 : 13)) * h(24)} r={6 * s} fill={isStump ? BIAS_C : VAR_C} opacity={0.62} />
                    ) : null;
                  })}
                </Svg>
                <Say at={start - 2} x={DART.left - 26} y={yy - 15} width={220} align="right">
                  <span style={line(22, isStump ? BIAS_INK : VAR_INK)}>{isStump ? "stumps" : "trees 6 deep"}</span>
                </Say>
              </React.Fragment>
            );
          })}
          {/* Bias: from the stumps' average to the target. */}
          <Svg opacity={ease(frame, offAt, 12)}>
            <path
              d={`M${stumpMean},${rowY.stump - h(40)} L${stumpMean},${rowY.stump - h(52)} L${stumpMean + (targetX - stumpMean) * ease(frame, offAt, 16)},${rowY.stump - h(52)}`}
              fill="none"
              stroke={LIT_LINE}
              strokeWidth={3.4}
            />
            <line x1={targetX} x2={targetX} y1={rowY.stump - h(52)} y2={rowY.stump - h(40)} stroke={LIT_LINE} strokeWidth={3.4} opacity={ease(frame, offAt + 12, 6)} />
          </Svg>
          <Say at={biasAt - 2} x={(stumpMean + targetX) / 2} y={rowY.stump - h(96)} width={200} align="center">
            <span style={line(24, LIT_INK)}>bias</span>
          </Say>
          {/* Variance: the deep trees' spread, one standard deviation each side. */}
          <Svg opacity={ease(frame, scatterAt, 12)}>
            <path
              d={`M${deepLo},${rowY.deep - h(40)} L${deepLo},${rowY.deep - h(52)} L${deepHi},${rowY.deep - h(52)} L${deepHi},${rowY.deep - h(40)}`}
              fill="none"
              stroke={LIT_LINE}
              strokeWidth={3.4}
              pathLength={1}
              strokeDasharray={`${ease(frame, scatterAt, 18)} 1`}
            />
          </Svg>
          <Say at={varAt - 2} x={deepHi + 14} y={rowY.deep - h(68)}>
            <span style={line(24, LIT_INK)}>variance</span>
          </Say>
        </Fade>

        {/* ── The three terms by depth ── */}
        <Fade from={sumAt - 4} out={realAt - 6}>
          <Say at={sumAt} x={SUM.left} y={y(SUM.top) - h(112)}>
            <span style={line(24, INK_SOFT)}>Averaged along the curve, by the tree’s depth</span>
          </Say>
          <Say at={sumAt + 6} x={SUM.left} y={y(SUM.top) - h(66)}>
            <div style={{ display: "flex", gap: 26, fontSize: 21 }}>
              <Key color={INK} size={21}>
                sum
              </Key>
              <Key color={BIAS_C} size={21}>
                <M>bias²</M>
              </Key>
              <Key color={VAR_C} dash size={21}>
                variance
              </Key>
              <Key color={NOISE_C} band size={21}>
                noise
              </Key>
              <span style={{ opacity: ease(frame, fourteenAt + 10, 12), display: "inline-flex", alignItems: "center", gap: 10, fontSize: 21 }}>
                <svg width={14} height={14}>
                  <circle cx={7} cy={7} r={5} fill={PAPER} stroke={INK} strokeWidth={2} />
                </svg>
                <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>error measured directly</span>
              </span>
            </div>
          </Say>
          <Axes
            x={ex}
            y={ey}
            xTicks={[1, 3, 6, 9, 12]}
            yTicks={[0, 0.1, 0.2]}
            yFormat={(v) => fmt(v)}
            xTitle="tree depth"
            at={sumAt + 2}
          />
          <Svg opacity={ease(frame, nineAt, 14)}>
            <rect x={SUM.left} y={noiseY} width={(SUM.right - SUM.left) * ease(frame, nineAt, 18)} height={y(SUM.bottom) - noiseY} fill={NOISE_C} opacity={0.22} />
            <line x1={SUM.left} x2={SUM.right} y1={noiseY} y2={noiseY} stroke={NOISE_C} strokeWidth={2.4} opacity={ease(frame, nineAt + 10, 10)} />
          </Svg>
          <Curve points={series("bias2")} x={ex} y={ey} at={sevenAt} dur={20} color={BIAS_C} width={3.4} clip={sumClip} />
          <Curve points={series("variance")} x={ex} y={ey} at={fourAt} dur={20} color={VAR_C} width={3.4} dash="9 7" clip={sumClip} />
          <Curve points={series("sum")} x={ex} y={ey} at={twoOhAt} dur={climbAt + 14 - twoOhAt} color={INK} width={3.8} clip={sumClip} />
          <Svg>
            {rows.map((r, i) => {
              const s = ease(frame, fourteenAt + 10 + i * 1.2, 8);
              return s > 0 ? (
                <circle key={r.depth} cx={at(ex, r.depth)} cy={at(ey, r.measured)} r={5 * s} fill={PAPER} stroke={INK} strokeWidth={2} />
              ) : null;
            })}
            <circle cx={at(ex, best.depth)} cy={at(ey, best.sum)} r={(15 + 5 * pulse(frame, fourteenAt, 20)) * bestP} fill="none" stroke={OK} strokeWidth={3.4} />
          </Svg>
          <Say at={fourteenAt - 2} x={at(ex, best.depth) - 14} y={at(ey, best.sum) + h(26)}>
            <span style={line(24, OK_INK)}>
              depth 3: <span style={TABULAR}>{fmt(best.sum)}</span>
            </span>
          </Say>
          <Say at={allVarAt - 2} x={SUM.right - 230} y={at(ey, rows[11].variance) - h(46)}>
            <span style={line(23, VAR_INK)}>mostly variance</span>
          </Say>

          {/* Depth 1's error, stacked, as said. */}
          <Fade from={twoOhAt - 4} out={dataAt - 4}>
            <Say at={twoOhAt - 4} x={BAR_X} y={y(SUM.top) - h(112)}>
              <span style={line(24, INK_SOFT)}>A stump’s error</span>
            </Say>
            {stack.map((s, i) => {
              const below = stack.slice(0, i).reduce((a, b) => a + b.v, 0);
              const p = ease(frame, s.at - 2, 14);
              const top = y(SUM.bottom) - barScale(below + s.v);
              return (
                <React.Fragment key={i}>
                  <div
                    style={{
                      position: "absolute",
                      left: BAR_X,
                      top: top + barScale(s.v) * (1 - p),
                      width: BAR_W,
                      height: barScale(s.v) * p,
                      background: s.color,
                      opacity: i === 0 ? 0.7 : 1,
                    }}
                  />
                  <Say at={s.at} x={BAR_X + BAR_W + 22} y={top + barScale(s.v) / 2 - 17}>
                    <span style={line(26, s.ink)}>
                      <span style={TABULAR}>{fmt(s.v)}</span> {s.name}
                    </span>
                  </Say>
                </React.Fragment>
              );
            })}
            <div style={{ position: "absolute", left: BAR_X - 10, top: y(SUM.bottom), width: BAR_W + 20, height: 2, background: INK, opacity: ease(frame, twoOhAt - 4, 10) }} />
            <Say at={twoOhAt} x={BAR_X} y={y(SUM.bottom) - barScale(d1.sum) - h(52)} width={BAR_W} align="center">
              <span style={{ ...line(30, INK), ...TABULAR }}>{fmt(d1.sum)}</span>
            </Say>
          </Fade>

          {/* ── Ten times the data: what moves and what doesn't ── */}
          <Fade from={dataAt - 2}>
            <Say at={tenAt - 2} x={1180} y={y(SUM.top) - h(112)}>
              <span style={line(24, INK_SOFT)}>Ten times the data: 50 points, then 500</span>
            </Say>
            {pairs.map((p) => (
              <React.Fragment key={p.x}>
                <Say at={p.at - 4} x={p.x} y={y(SUM.top) - h(40)}>
                  <span style={line(24, INK)}>{p.title}</span>
                </Say>
                {[
                  { v: p.a, bx: p.x, color: p.color, ink: p.color === VAR_C ? VAR_INK : BIAS_INK, at: p.at, name: "50" },
                  { v: p.b, bx: p.x + 120, color: p.after, ink: p.afterInk, at: p.bAt, name: "500" },
                ].map((b) => {
                  const g = ease(frame, b.at - 2, 16);
                  return (
                    <React.Fragment key={b.name}>
                      <div
                        style={{
                          position: "absolute",
                          left: b.bx,
                          top: PB - pairScale(b.v) * g,
                          width: 84,
                          height: pairScale(b.v) * g,
                          background: b.color,
                          borderRadius: "4px 4px 0 0",
                        }}
                      />
                      <Say at={b.at + 4} x={b.bx + 42} y={PB - pairScale(b.v) - h(44)} width={120} align="center">
                        <span style={{ ...line(26, b.ink), ...TABULAR }}>{fmt(b.v)}</span>
                      </Say>
                      <Say at={b.at} x={b.bx + 42} y={PB + h(12)} width={120} align="center">
                        <span style={{ ...label(21, INK_SOFT), ...TABULAR }}>{b.name}</span>
                      </Say>
                    </React.Fragment>
                  );
                })}
                <div style={{ position: "absolute", left: p.x - 10, top: PB, width: 224, height: 2, background: INK, opacity: ease(frame, p.at - 4, 10) }} />
              </React.Fragment>
            ))}
            <Say at={notAt + 6} x={1180} y={PB + h(64)}>
              <span style={line(28, INK)}>More data cures variance, not bias</span>
            </Say>
          </Fade>
        </Fade>

        {/* ── What a real problem lets you see: the two errors, in small ── */}
        <Say at={realAt} x={X0} y={y(380)}>
          <span style={line(36, INK, 400)}>On a real problem: one dataset, no known curve.</span>
        </Say>
        <Say at={readAt} x={X0} y={y(380) + h(76)}>
          <span style={line(36, INK, 400)}>
            What you can see: <b style={{ color: BLUE_INK, fontWeight: 500 }}>training error</b> and <b style={{ fontWeight: 500 }}>validation error</b>
          </span>
        </Say>
        <Axes x={{ lo: 0, hi: 1, a: 200, b: 900 }} y={{ lo: 0, hi: 1, a: y(840), b: y(600) }} xTicks={[]} xTitle="training rows" at={readAt + 4} />
        <Curve points={PREVIEW.train} x={{ lo: 0, hi: 1, a: 200, b: 900 }} y={{ lo: 0, hi: 1, a: y(840), b: y(600) }} at={readAt + 10} dur={20} color={BAR} width={3.4} />
        <Curve points={PREVIEW.val} x={{ lo: 0, hi: 1, a: 200, b: 900 }} y={{ lo: 0, hi: 1, a: y(840), b: y(600) }} at={readAt + 16} dur={20} color={INK} width={3.4} />
        <Say at={readAt + 22} x={920} y={y(840) - (y(840) - y(600)) * PREVIEW.train[PREVIEW.train.length - 1][1] - 30}>
          <span style={line(23, BLUE_INK)}>training</span>
        </Say>
        <Say at={readAt + 28} x={920} y={y(840) - (y(840) - y(600)) * PREVIEW.val[PREVIEW.val.length - 1][1] + 4}>
          <span style={line(23, INK)}>validation</span>
        </Say>
      </Drift>
    </AbsoluteFill>
  );
};
