import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { I, MathRun } from "../../editorial/math";
import { INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { ColumnRule, Ink, Leader, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MODELS, SE } from "./data";
import { Area, Baseline, Curve, DATA, Drift, Heading, Line, Mark, MUTED, mulberry32, normalPoints, POINT, pulse, Svg, X0, QMark } from "./parts";

const COLS = 50;
const ROWS = 40;
const CELL = 7;
const PITCH = 10;
const R_X0 = 960;
const R_X1 = 1780;
/** The sampling curve's accuracy range, in points. */
const LO = 88.8;
const HI = 93.2;

/** Which of the 2,000 examples the new model gets wrong: 9% of them, placed
 *  by a seeded draw so the strip is the same on every frame. */
const WRONG = (() => {
  const total = COLS * ROWS;
  const wrong = Math.round(total * (1 - MODELS.new));
  const rand = mulberry32(2000);
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Set(order.slice(0, wrong));
})();

/**
 * Question 1. On the left, the standard deviation: 2,000 right-or-wrong
 * examples as cells, and the spread of one of them, 0.29. On the right, the
 * standard error: the accuracy's own spread across repeated samples, a
 * narrow curve on 91.0%, with one standard error (0.64 points) set beside the
 * models' half-point gap, which is shorter. Then the standard error against
 * n: halving it takes four times the data.
 */
export const SeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "What is the difference");
  const sdAt = n.word("q1", "Standard deviation is the spread");
  const singleAt = n.word("q1", "single observations");
  const eachAt = n.word("q1", "Each test example");
  const sdValueAt = n.word("q1", "point two nine");
  const seAt = n.word("q1-se", "Standard error is the spread");
  const acrossAt = n.word("q1-se", "across repeated samples");
  const rootAt = n.word("q1-se", "over the square root of n");
  const twoKAt = n.word("q1-se", "On two thousand examples");
  const thirdsAt = n.word("q1-se", "two thirds of a percentage point");
  const gapAt = n.word("q1-se", "more than the gap");
  const neverAt = n.word("q1-n", "never the standard deviation");
  const rootRateAt = n.word("q1-n", "square-root rate");
  const halvingAt = n.word("q1-n", "Halving it");
  const thirdAt = n.word("q1-n", "a third of a point");
  const eightAt = n.word("q1-n", "eight thousand examples");
  const fourAt = n.word("q1-n", "four times the data");
  const end = n.beat("q1-n").to;

  // ── Left: the 2,000 examples ──
  const blockTop = y(470);
  const cellsAt = (i: number) => eachAt + (i % COLS) * 0.35 + Math.floor(i / COLS) * 0.15;

  // ── Right: the accuracy's sampling spread ──
  const sx = (v: number) => R_X0 + ((v - LO) / (HI - LO)) * (R_X1 - R_X0);
  const base = y(650);
  const height = h(140);
  const mu = MODELS.new * 100;
  const sePts = SE.se * 100;
  const curve = normalPoints({ mu, sd: sePts, lo: LO, hi: HI, x0: R_X0, x1: R_X1, base, height });
  const swap = rootRateAt;
  const spreadOut = swap;
  const seRowY = base + h(112);
  const gapRowY = base + h(162);

  // ── Right, then: the standard error against n ──
  const nx = (k: number) => R_X0 + 20 + ((Math.log10(k) - 2) / (Math.log10(16000) - 2)) * (R_X1 - R_X0 - 40);
  const nBase = y(830);
  const ny = (v: number) => nBase - (v / 3) * (nBase - y(540));
  const nCurve = Array.from({ length: 121 }, (_, i) => {
    const k = 10 ** (2 + (i / 120) * (Math.log10(16000) - 2));
    return [nx(k), ny((SE.sd / Math.sqrt(k)) * 100)] as const;
  });
  const dot2k = [nx(SE.n), ny(SE.se * 100)] as const;
  const dot8k = [nx(SE.nHalf), ny(SE.half * 100)] as const;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={eachAt} level={-32} />
      <Sfx name="el-tap" at={sdValueAt} level={-30} />
      <Sfx name="el-pencil" at={acrossAt + 2} level={-35} />
      <Sfx name="el-tap" at={thirdsAt} level={-30} />
      <Sfx name="el-pencil" at={gapAt} level={-35} />
      <Sfx name="el-pencil" at={swap + 6} level={-35} />
      <Sfx name="el-tap" at={halvingAt} level={-31} />
      <Sfx name="el-tap" at={eightAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is the difference between <QMark at={n.word("q1", "standard deviation and standard error", { nth: 1 })}>standard deviation</QMark> and{" "}
          <QMark at={n.word("q1", "standard error?")} after="?">standard error</QMark>
        </QuestionCard>

        {/* ── Left: the standard deviation ── */}
        <Heading at={sdAt} x={X0} y={y(320)}>
          Standard deviation
        </Heading>
        <Line at={singleAt - 4} x={X0} y={y(362)} size={24} color={INK_SOFT}>
          The spread of single observations
        </Line>
        <Svg>
          {Array.from({ length: COLS * ROWS }, (_, i) => {
            const p = ease(frame, cellsAt(i), 8);
            if (p <= 0) return null;
            const c = i % COLS;
            const r = Math.floor(i / COLS);
            return (
              <rect
                key={i}
                x={X0 + c * PITCH}
                y={blockTop + r * PITCH}
                width={CELL}
                height={CELL}
                rx={1.5}
                fill={WRONG.has(i) ? MUTED : DATA}
                opacity={p}
              />
            );
          })}
        </Svg>
        <Ink at={eachAt + 18} dur={14} style={{ left: X0, top: blockTop + ROWS * PITCH + 20, whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, ...note(22, INK_SOFT) }}>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: DATA }} />
            <span>Right</span>
            <span style={{ width: 16, height: 16, borderRadius: 3, background: MUTED, marginLeft: 18 }} />
            <span>Wrong</span>
            <span style={{ marginLeft: 18 }}>
              <Num>{SE.n.toLocaleString("en-US")}</Num> examples at <Num>{(SE.p * 100).toFixed(0)}%</Num>
            </span>
          </div>
        </Ink>
        <Ink at={sdValueAt - 4} dur={14} style={{ left: X0, top: y(412), whiteSpace: "nowrap" }}>
          <span style={{ ...note(28, INK) }}>
            <MathRun>
              <I>σ</I> = √(0.91 × 0.09) =
            </MathRun>{" "}
            <span style={{ display: "inline-block", transform: `scale(${1 + 0.12 * pulse(frame, neverAt + 4, 20)})`, transformOrigin: "0% 60%" }}>
              <Mark at={sdValueAt + 2}>
                <MathRun style={{ fontWeight: 600 }}>{SE.sd.toFixed(2)}</MathRun>
              </Mark>
            </span>
          </span>
        </Ink>

        <ColumnRule x={(X0 + COLS * PITCH + R_X0) / 2} top={y(320)} height={y(860) - y(320)} at={seAt} />

        {/* ── Right: the standard error ── */}
        <Heading at={seAt} x={R_X0} y={y(320)}>
          Standard error
        </Heading>
        <Line at={acrossAt - 4} x={R_X0} y={y(362)} size={24} color={INK_SOFT}>
          The spread of the accuracy across repeated samples
        </Line>
        <Ink at={rootAt} dur={14} style={{ left: R_X0, top: y(412), whiteSpace: "nowrap" }}>
          <span style={{ ...note(28, INK), ...TABULAR }}>
            <MathRun>
              SE = <I>σ</I> / √<I>n</I>
            </MathRun>
            <span style={{ opacity: ease(frame, thirdsAt - 2, 10) }}>
              {" "}
              ={" "}
              <MathRun>
                {SE.sd.toFixed(2)} / √{SE.n.toLocaleString("en-US")}
              </MathRun>{" "}
              = <Mark at={thirdsAt + 4}>{sePts.toFixed(2)} points</Mark>
            </span>
          </span>
        </Ink>

        {/* The new model's accuracy across repeated test sets of 2,000. */}
        <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, spreadOut, 12) }}>
          <Area points={curve} x0={R_X0} x1={R_X1} base={base} at={twoKAt + 6} color={DATA} opacity={0.18} />
          <Curve points={curve} at={twoKAt} dur={20} color={DATA} width={3} />
          <Baseline
            x0={R_X0}
            x1={R_X1}
            base={base}
            at={twoKAt - 4}
            ticks={[89, 90, 91, 92, 93].map((v) => ({ v, x: sx(v), text: `${v}%` }))}
            title="The new model's accuracy, test set to test set"
          />
          {/* One standard error, from 91.0% down, set against the gap. */}
          <Svg opacity={ease(frame, thirdsAt + 4, 10)}>
            <line x1={sx(mu - sePts)} x2={sx(mu)} y1={seRowY} y2={seRowY} stroke={INK} strokeWidth={4} strokeLinecap="round" />
            <line x1={sx(mu - sePts)} x2={sx(mu - sePts)} y1={seRowY - 10} y2={seRowY + 10} stroke={INK} strokeWidth={2} />
            <line x1={sx(mu)} x2={sx(mu)} y1={seRowY - 10} y2={seRowY + 10} stroke={INK} strokeWidth={2} />
          </Svg>
          <Line at={thirdsAt + 6} x={sx(mu) + 20} y={seRowY - 16} size={24}>
            One standard error: <Num>{sePts.toFixed(2)}</Num>
          </Line>
          <Svg opacity={ease(frame, gapAt, 10)}>
            <line
              x1={sx(MODELS.old * 100)}
              x2={sx(MODELS.old * 100) + (sx(mu) - sx(MODELS.old * 100)) * ease(frame, gapAt, 14)}
              y1={gapRowY}
              y2={gapRowY}
              stroke={POINT}
              strokeWidth={8}
              strokeLinecap="round"
            />
          </Svg>
          <Line at={gapAt + 6} x={sx(mu) + 20} y={gapRowY - 16} size={24}>
            The gap: <Num>0.50</Num>
          </Line>
        </div>

        {/* ── Right, then: the standard error against n ── */}
        <Baseline
          x0={R_X0}
          x1={R_X1}
          base={nBase}
          at={swap + 6}
          ticks={[100, 1000, 10000].map((v) => ({ v, x: nx(v), text: v.toLocaleString("en-US") }))}
          title="Test examples"
        />
        <Svg opacity={ease(frame, swap + 10, 12)}>
          {[1, 2, 3].map((v) => (
            <line key={v} x1={R_X0} x2={R_X1} y1={ny(v)} y2={ny(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
          ))}
        </Svg>
        {[1, 2, 3].map((v) => (
          <Line key={v} at={swap + 10} x={R_X0 - 14} y={ny(v) - 14} size={20} color={INK_SOFT} align="right" width={60}>
            <Num>{v}</Num>
          </Line>
        ))}
        <Line at={swap + 10} x={R_X0 + 20} y={y(540) - h(44)} size={20} color={INK_SOFT}>
          Standard error, in points
        </Line>
        <Curve points={nCurve} at={swap + 10} dur={24} color={DATA} width={3} />
        <Svg>
          {[
            { p: dot2k, at: halvingAt - 4 },
            { p: dot8k, at: eightAt },
          ].map((d, i) => {
            const s = ease(frame, d.at, 8);
            return s > 0 ? <circle key={i} cx={d.p[0]} cy={d.p[1]} r={8 * s * (1 + 0.3 * pulse(frame, d.at, 16))} fill={i ? POINT : DATA} /> : null;
          })}
        </Svg>
        <Line at={halvingAt - 2} x={dot2k[0] - 16} y={dot2k[1] + 12} size={24} align="right" width={300}>
          <Num>2,000</Num>: <Num>{(SE.se * 100).toFixed(2)}</Num>
        </Line>
        <Leader points={[[dot8k[0], ny(1.5) + 40], [dot8k[0], dot8k[1] - 12]]} at={eightAt + 2} dot={false} width={1.4} />
        <Line at={eightAt} x={dot8k[0] + 60} y={ny(1.5)} size={24} align="right" width={500}>
          <Num>8,000</Num>: <Num>{(SE.half * 100).toFixed(2)}</Num>, <Mark at={thirdAt + 2}>a third of a point</Mark>
        </Line>
        <Ink at={fourAt} dur={14} style={{ left: nx(400), top: y(560), whiteSpace: "nowrap" }}>
          <span style={{ ...label(30, INK), fontWeight: 600 }}>
            <Mark at={fourAt + 4}>
              <Num>4</Num>× the data, ½ the error
            </Mark>
          </span>
        </Ink>
      </Drift>
    </AbsoluteFill>
  );
};
