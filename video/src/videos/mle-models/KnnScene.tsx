import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, PAPER, svgText } from "../../editorial/style";
import { I, MathRun } from "../../editorial/math";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { KNN } from "./data";
import { ACCENT_INK, at, type Box, int, C0, C1, CLASS, Dots, Drift, Frame, Line, Mark, MARK_OK, OK_INK, Q_SIZE, scales, Svg, X0 } from "./parts";

const ClassDot: React.FC<{ color: string }> = ({ color }) => (
  <svg width={20} height={20} style={{ display: "inline-block", verticalAlign: "-2px", margin: "0 6px 0 2px" }}>
    <circle cx={10} cy={10} r={8} fill={color} />
  </svg>
);

/**
 * Question 7, on the simulated customers (age and income, standardized):
 * one new point, its fifteen nearest training rows ringed, and their vote,
 * eleven to four. Then the trade-offs, and what fixes the one that matters at
 * scale.
 */
export const KnnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("knn").from;
  const qAt = n.word("knn", "Question seven");
  const textAt = n.word("knn", "How does k-nearest neighbours");
  const findsAt = n.word("knn", "It finds the k training rows");
  const newAt = n.word("knn", "closest to a new point");
  const distAt = n.word("knn", "straight-line distance");
  const majAt = n.word("knn", "takes their majority class");
  const meanAt = n.word("knn", "or their mean");
  const hereAt = n.word("knn", "Here, fifteen neighbours");
  const voteAt = n.word("knn", "vote eleven to four");
  const noTrainAt = n.word("knn-trade", "There's no training step");
  const slowAt = n.word("knn-trade", "inference is slow");
  const highAt = n.word("knn-trade", "in high dimensions");
  const farAt = n.word("knn-trade", "about equally far away");
  const cvAt = n.word("knn-trade", "Pick k by cross-validation");
  const annAt = n.word("knn-trade", "approximate nearest-neighbour indexes");
  const speedAt = n.word("knn-trade", "a lot of speed");
  const end = n.beat("knn-trade").to;

  const side = 570;
  const box: Box = { left: X0 + 70, top: y(320), width: side, height: side };
  const { x: sx, y: sy } = scales(box, [-1.85, 1.85], [-1.85, 1.85]);
  const q = KNN.vote.q;
  const qx = at(sx, q[0]);
  const qy = at(sy, q[1]);
  const rpx = at(sx, q[0] + KNN.vote.radius) - qx;
  const dots = KNN.z.map(([a, b], i) => ({
    x: at(sx, a),
    y: at(sy, b),
    at: from + 10 + (i / KNN.z.length) * 20,
    color: CLASS[KNN.label[i]],
  }));
  const ring = ease(frame, hereAt, 14);
  const R = 900;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={from + 10} level={-34} />
      <Sfx name="el-tap" at={newAt} level={-30} />
      <Sfx name="el-pencil" at={hereAt} level={-35} />
      <Sfx name="el-pop" at={voteAt} level={-31} />
      <Sfx name="el-tap" at={cvAt} level={-31} />
      <Sfx name="el-tap" at={annAt} level={-31} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          How does k-nearest neighbours (kNN) work?
        </QuestionCard>

        {/* ── The customers, and one new point ── */}
        <Frame box={box} at={from + 6} />
        <Dots dots={dots} r={3.4} opacity={0.85} />
        <Line at={from + 14} x={box.left} y={box.top + box.height + 14} size={21} color={INK_SOFT}>
          Age, standardized
        </Line>
        <Line at={from + 14} x={box.left + box.width} y={box.top + box.height + 14} size={21} color={INK_SOFT} align="right" width={400}>
          {int(KNN.rows)} simulated customers
        </Line>
        <Svg opacity={ease(frame, from + 14, 10)}>
          <text x={box.left - 18} y={box.top + box.height / 2} textAnchor="middle" transform={`rotate(-90 ${box.left - 18} ${box.top + box.height / 2})`} style={svgText(label(21, INK_SOFT))}>
            Income, standardized
          </text>
        </Svg>
        <Svg opacity={ring}>
          <circle cx={qx} cy={qy} r={(rpx + 10) * ring} fill="none" stroke={INK} strokeWidth={1.8} strokeDasharray="5 5" />
          {KNN.vote.neighbors.map((i, k) => {
            const p = ease(frame, hereAt + 6 + k, 8);
            return <circle key={i} cx={at(sx, KNN.z[i][0])} cy={at(sy, KNN.z[i][1])} r={6.5 * p} fill={CLASS[KNN.label[i]]} stroke={INK} strokeWidth={1.6} />;
          })}
        </Svg>
        <Svg opacity={ease(frame, newAt - 2, 10)}>
          <circle cx={qx} cy={qy} r={10} fill={PAPER} stroke={INK} strokeWidth={3} />
          <circle cx={qx} cy={qy} r={3.5} fill={INK} />
        </Svg>
        <Line at={newAt} x={qx - 130} y={qy - rpx - 58} size={22}>
          New point
        </Line>

        {/* ── How it predicts ── */}
        <Line at={findsAt - 2} x={R} y={y(330)} size={28}>
          The <MathRun><I>k</I></MathRun> closest training rows
        </Line>
        <Line at={distAt - 2} x={R} y={y(380)} size={24} color={INK_SOFT}>
          Usually by straight-line distance
        </Line>
        <Line at={majAt - 2} x={R} y={y(430)} size={28}>
          Their majority class
          <span style={{ opacity: ease(frame, meanAt, 10) }}>, or their mean</span>
        </Line>
        <Line at={voteAt - 4} x={R} y={y(500)} size={32}>
          <span style={{ color: INK_SOFT }}>15 neighbours:</span> <ClassDot color={C0} />
          {KNN.vote.zeros} <span style={{ color: INK_SOFT }}>to</span> <ClassDot color={C1} />
          {KNN.vote.ones}
        </Line>

        {/* ── The trade-offs ── */}
        <Line at={noTrainAt - 2} x={R} y={y(600)} size={26}>
          No training step
        </Line>
        <Line at={slowAt - 2} x={R} y={y(646)} size={26} color={ACCENT_INK}>
          Slow inference
        </Line>
        <Line at={highAt - 2} x={R} y={y(692)} size={26} color={ACCENT_INK}>
          High dimensions
          <span style={{ opacity: ease(frame, farAt - 2, 10) }}>: every point about equally far</span>
        </Line>
        <Line at={cvAt - 2} x={R} y={y(770)} size={26} color={OK_INK}>
          <Mark at={cvAt + 4} color={MARK_OK}>
            Pick <MathRun><I>k</I></MathRun> by cross-validation
          </Mark>
        </Line>
        <Line at={annAt - 2} x={R} y={y(820)} size={26} color={OK_INK}>
          At scale: an approximate nearest-neighbour index
        </Line>
        <Line at={speedAt - 4} x={R} y={y(864)} size={23} color={INK_SOFT}>
          A little accuracy for a lot of speed
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
