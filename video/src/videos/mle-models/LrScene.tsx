import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, label, svgText } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { GD, LR } from "./data";
import {
  ACCENT,
  ACCENT_INK,
  at,
  Axes,
  type Box,
  Curve,
  DATA,
  Drift,
  Fade,
  HBar,
  int,
  Line,
  Mark,
  MARK_OK,
  OK,
  OK_INK,
  POINT,
  POINT_INK,
  Q_SIZE,
  scales,
  Svg,
  X0,
} from "./parts";

const LOG_TICK = (v: number) => (v >= 1 ? int(v) : String(v));

/**
 * Question 3, in three figures that take the same place in turn. The page's
 * rows at three rates (0.01 crawling, 0.9 settled in nine steps, 2.5
 * climbing), with the stability limit on a rate axis under them. Then the
 * range test: one run with the rate rising, its flat stretch and the turn at
 * two. Then a schedule's shape, warmup and cosine decay, with what decay does
 * for single-row SGD; and Adam in one line.
 */
export const LrScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("lr").from;
  const qAt = n.word("lr", "Question three");
  const textAt = n.word("lr", "How do you choose the learning rate");
  // A: three rates.
  const bandFrom = n.beat("lr-band").from;
  const smallAt = n.word("lr-band", "Too small");
  const crawlAt = n.word("lr-band", "training crawls");
  const twelveAt = n.word("lr-band", "nearly twelve hundred steps");
  const largeAt = n.word("lr-band", "Too large");
  const climbsAt = n.word("lr-band", "the loss climbs");
  const twoAt = n.word("lr-band", "past about two");
  const nineAt = n.word("lr-band", "At point nine");
  const ninesAt = n.word("lr-band", "settles in nine");
  // B: the range test.
  const rangeFrom = n.beat("lr-range").from;
  const testAt = n.word("lr-range", "run a range test");
  const risingAt = n.word("lr-range", "the rate rising across orders of magnitude");
  const bottomsAt = n.word("lr-range", "bottoms out from about point five");
  const turnsAt = n.word("lr-range", "turns up at two");
  const pickAt = n.word("lr-range", "Pick a rate on the flat stretch");
  const shortAt = n.word("lr-range", "well short of the turn");
  // C: the schedule.
  const schedFrom = n.beat("lr-sched").from;
  const warmAt = n.word("lr-sched", "a short warmup");
  const decayAt = n.word("lr-sched", "then decay toward zero");
  const constAt = n.word("lr-sched", "at a constant rate");
  const cosineAt = n.word("lr-sched", "decayed on a cosine");
  const adamAt = n.word("lr-adam", "Adaptive optimizers like Adam");
  const tuningAt = n.word("lr-adam", "still needs tuning");
  const end = n.beat("logit-in").to;

  const box: Box = { left: X0 + 70, top: y(330), width: 860, height: h(330) };
  const R = 1110;

  // ── A: loss by step at three rates ──
  const A = scales(box, [0, 30], [0.005, 1000], { y: true });
  const steps = (ls: readonly number[]) => ls.slice(0, 31).map((v, i) => [i, Math.min(v, 1e5)] as const);
  const rate = { lo: 0.005, hi: 5, a: box.left, b: box.left + box.width, log: true };
  const rateY = y(820);
  const limit = GD.limit;

  // ── B: the range test ──
  const B = scales(box, [0.0001, 10], [0.005, 100], { x: true, y: true });
  const turn = 2;
  const before = LR.range.filter(([r]) => r <= 1.97);
  const after = LR.range.filter(([r]) => r >= 1.96);
  const flatLo = 0.5;
  const flatHi = 1.75;

  // ── C: a schedule ──
  const C = scales({ ...box, height: h(300) }, [0, LR.steps], [0, 1.1]);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={smallAt} level={-36} />
      <Sfx name="el-whoosh" at={largeAt} level={-35} />
      <Sfx name="el-pencil" at={nineAt} level={-36} />
      <Sfx name="el-tap" at={ninesAt} level={-30} />
      <Sfx name="el-pencil" at={testAt} level={-36} />
      <Sfx name="el-tap" at={turnsAt} level={-30} />
      <Sfx name="el-pop" at={shortAt} level={-32} />
      <Sfx name="el-pencil" at={warmAt} level={-36} />
      <Sfx name="el-tap" at={constAt} level={-31} />
      <Sfx name="el-tap" at={cosineAt} level={-31} />
      <Sfx name="el-chime" at={tuningAt + 20} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={3} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          How do you choose the learning rate, and how do you schedule it?
        </QuestionCard>

        {/* ── A: three rates on the page's rows ── */}
        <Fade at={bandFrom - 6} out={rangeFrom - 6}>
          <Axes
            x={A.x}
            y={A.y}
            xTicks={[0, 10, 20, 30]}
            yTicks={[0.01, 0.1, 1, 10, 100, 1000]}
            yFormat={LOG_TICK}
            xTitle="Step"
            yTitle="Loss"
            at={bandFrom - 4}
          />
          <Curve points={steps(GD.lossPage)} x={A.x} y={A.y} at={smallAt} dur={30} color={INK} clip={box} />
          <Curve points={steps(GD.lossDiverge)} x={A.x} y={A.y} at={largeAt} dur={30} color={ACCENT} clip={box} />
          <Curve points={steps(GD.lossFast)} x={A.x} y={A.y} at={nineAt} dur={24} color={OK} width={3.4} clip={box} />
          <Line at={crawlAt} x={R} y={at(A.y, GD.lossPage[30]) - 18} size={24}>
            0.01 crawls
            <span style={{ opacity: ease(frame, twelveAt, 10), color: INK_SOFT }}>: {int(GD.settle["0.01"] ?? 0)} steps to settle</span>
          </Line>
          <Line at={climbsAt} x={R} y={box.top - 6} size={24} color={ACCENT_INK}>
            2.5 overshoots: the loss climbs
          </Line>
          <Line at={ninesAt - 2} x={R} y={at(A.y, GD.minLoss) - 40} size={24} color={OK_INK}>
            0.9 settles in {GD.settle["0.9"]} steps
          </Line>

          {/* The rates on an axis of their own, the limit dashed. */}
          <Svg opacity={ease(frame, smallAt, 12)}>
            <line x1={rate.a} x2={rate.b} y1={rateY} y2={rateY} stroke={INK} strokeWidth={1.4} />
            {[0.01, 0.1, 1].map((v) => (
              <g key={v}>
                <line x1={at(rate, v)} x2={at(rate, v)} y1={rateY} y2={rateY + 7} stroke={INK} strokeWidth={1.2} />
                <text x={at(rate, v)} y={rateY + 32} textAnchor="middle" style={svgText(label(20, INK_SOFT))}>
                  {v}
                </text>
              </g>
            ))}
            <text x={rate.b} y={rateY + 62} textAnchor="end" style={svgText(label(20, INK_SOFT))}>
              Learning rate
            </text>
          </Svg>
          <Svg opacity={ease(frame, twoAt - 2, 12)}>
            <line x1={at(rate, limit)} x2={at(rate, limit)} y1={rateY - 46} y2={rateY + 10} stroke={INK} strokeWidth={2} strokeDasharray="5 5" />
          </Svg>
          <Line at={twoAt - 2} x={at(rate, limit) + 14} y={rateY - 60} size={22}>
            Limit:{" "}
            <MathRun>
              2 / <I>λ</I>
              <sub style={{ fontSize: "0.68em" }}>max</sub> ≈ {limit.toFixed(2)}
            </MathRun>
          </Line>
          {[
            { v: 0.01, c: INK, a: smallAt },
            { v: GD.divergeRate, c: ACCENT, a: largeAt },
            { v: 0.9, c: OK, a: nineAt },
          ].map((d) => (
            <Svg key={d.v} opacity={ease(frame, d.a, 10)}>
              <circle cx={at(rate, d.v)} cy={rateY} r={9} fill={d.c} />
            </Svg>
          ))}
        </Fade>

        {/* ── B: the range test ── */}
        <Fade at={rangeFrom - 4} out={schedFrom - 6}>
          <Svg opacity={ease(frame, bottomsAt, 12)}>
            <rect x={at(B.x, flatLo)} y={box.top} width={at(B.x, flatHi) - at(B.x, flatLo)} height={box.height} fill={MARK_OK} />
          </Svg>
          <Axes
            x={B.x}
            y={B.y}
            xTicks={[0.0001, 0.001, 0.01, 0.1, 1, 10]}
            yTicks={[0.01, 0.1, 1, 10, 100]}
            yFormat={LOG_TICK}
            xFormat={(v) => (v < 0.01 ? v.toFixed(v < 0.001 ? 4 : 3) : String(v))}
            xTitle="Learning rate, rising"
            yTitle="Loss"
            at={rangeFrom}
          />
          <Curve points={before} x={B.x} y={B.y} at={risingAt} dur={40} color={INK} clip={box} />
          <Curve points={after} x={B.x} y={B.y} at={risingAt + 40} dur={10} color={ACCENT} clip={box} />
          <Svg opacity={ease(frame, turnsAt - 2, 10)}>
            <line x1={at(B.x, turn)} x2={at(B.x, turn)} y1={box.top} y2={box.top + box.height} stroke={POINT} strokeWidth={3} />
          </Svg>
          <Svg opacity={ease(frame, shortAt - 2, 10)}>
            <circle cx={at(B.x, LR.lowest[0])} cy={at(B.y, LR.lowest[1])} r={16} fill="none" stroke={OK} strokeWidth={3} />
          </Svg>
          <Line at={testAt} x={R} y={y(340)} size={26}>
            One short run, the rate rising
          </Line>
          <Line at={risingAt} x={R} y={y(384)} size={24} color={INK_SOFT}>
            from 0.0001 to 10 in 100 steps
          </Line>
          <Line at={bottomsAt} x={R} y={y(470)} size={26} color={OK_INK}>
            Flat from about 0.5
          </Line>
          <Line at={turnsAt} x={R} y={y(520)} size={26} color={POINT_INK}>
            Turns up at 2
          </Line>
          <Line at={pickAt} x={R} y={y(610)} size={28}>
            <Mark at={shortAt}>Pick well short of the turn</Mark>
          </Line>
        </Fade>

        {/* ── C: a schedule ── */}
        <Fade at={schedFrom - 4}>
          <Axes x={C.x} y={C.y} xTicks={[0, 250, 500, 750, 1000]} yTicks={[0, 0.5, 1]} yFormat={(v) => (v === 1 ? "Base" : String(v))} xTitle="Step" yTitle="Rate" at={schedFrom} />
          <Curve points={LR.schedule.filter(([k]) => k <= LR.warmup)} x={C.x} y={C.y} at={warmAt} dur={10} color={POINT} width={4} />
          <Curve points={LR.schedule.filter(([k]) => k >= LR.warmup)} x={C.x} y={C.y} at={decayAt} dur={34} color={DATA} width={4} />
          <Line at={warmAt + 4} x={at(C.x, LR.warmup) + 16} y={at(C.y, 1) - 46} size={22} color={POINT_INK}>
            Warmup
          </Line>
          <Line at={decayAt + 12} x={at(C.x, 600)} y={at(C.y, 0.75) - 10} size={22} color={INK}>
            Cosine decay to zero
          </Line>

          <Line at={constAt - 6} x={R} y={y(330)} size={24} color={INK_SOFT}>
            Single-row SGD, 20 passes:
          </Line>
          <Line at={constAt - 6} x={R} y={y(368)} size={24} color={INK_SOFT}>
            distance left from the best answer
          </Line>
          <HBar x={R} y={y(440)} w={560} max={LR.constant} value={LR.constant} at={constAt} label="Constant rate" valueText={LR.constant.toFixed(2)} color={INK} />
          <HBar x={R} y={y(560)} w={560} max={LR.constant} value={LR.cosine} at={cosineAt} label="Cosine decay" valueText={LR.cosine.toFixed(3)} color={OK} ink={OK_INK} />
        </Fade>
        <Ink at={adamAt - 2} dur={16} style={{ left: R, top: y(720), width: 700 }}>
          <span style={{ ...label(26, INK), lineHeight: 1.35 }}>
            Adam: a step size per weight,
            <span style={{ opacity: ease(frame, tuningAt - 2, 10) }}> but the base rate still needs tuning</span>
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
