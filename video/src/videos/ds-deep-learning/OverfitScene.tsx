import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OVERFIT } from "./data";
import { at, Axes, Curve, Dots, Drift, Mark, OK, OK_INK, type Scale, Svg, Tagline, VLine } from "./parts";

const LOSS = { left: 180, right: 1000, top: 380, bottom: 800 };
const FIT = { left: 1130, right: 1760, top: 380, bottom: 640 };
const FIX_Y = 700;

/**
 * Question 7 on the video's own toy network (one hidden layer of 100 tanh
 * units, twenty noisy points from sin 3x, 4,000 full-batch Adam steps):
 * training loss keeps falling while validation loss bottoms at epoch 160
 * and climbs to more than twice that low; beside it, the curve it ends up
 * drawing through the twenty points. Then the fixes, early stopping marked
 * at the low point.
 */
export const OverfitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("overfit").from;
  const qAt = n.word("overfit", "Question seven");
  const textAt = n.word("overfit", "How does overfitting show up");
  const curvesAt = n.word("overfit", "In the loss curves");
  const toyAt = n.word("overfit", "This toy network");
  const trainAt = n.word("overfit", "Training loss keeps falling");
  const valAt = n.word("overfit", "Validation loss bottoms out");
  const lowAt = n.word("overfit", "a hundred and sixty");
  const climbAt = n.word("overfit", "then climbs to more than twice");
  const noiseAt = n.word("overfit", "memorizing the noise");
  const fixes = [
    { text: "more data, or augmented data", at: n.word("overfit-fix", "more data") },
    { text: "dropout", at: n.word("overfit-fix", "Dropout") },
    { text: "weight decay", at: n.word("overfit-fix", "Weight decay") },
    { text: "early stopping", at: n.word("overfit-fix", "Early stopping") },
    { text: "a smaller network", at: n.word("overfit-fix", "Or a smaller network") },
  ];
  const stopAt = fixes[3].at;
  const end = n.beat("overfit-fix").to;

  const O = OVERFIT;
  const xs: Scale = { lo: 0, hi: 4000, a: LOSS.left, b: LOSS.right };
  const ys: Scale = { lo: 0, hi: 0.3, a: y(LOSS.bottom), b: y(LOSS.top) };
  const clip = { left: LOSS.left - 4, right: LOSS.right + 6, top: y(LOSS.top) - 10, bottom: y(LOSS.bottom) + 4 };
  const train = O.epochs.map((e, i) => [e, O.train[i]] as const);
  const val = O.epochs.map((e, i) => [e, O.val[i]] as const);

  const fx: Scale = { lo: -1, hi: 1, a: FIT.left, b: FIT.right };
  const fy: Scale = { lo: -2, hi: 2, a: y(FIT.bottom), b: y(FIT.top) };
  const fitClip = { left: FIT.left, right: FIT.right, top: y(FIT.top) - 4, bottom: y(FIT.bottom) + 4 };
  const fit = O.grid.map((g, i) => [g, O.fit[i]] as const);
  const lowP = ease(frame, lowAt, 10);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={trainAt} level={-36} />
      <Sfx name="el-pencil" at={valAt} level={-36} />
      <Sfx name="el-pop" at={lowAt + 2} level={-32} />
      <Sfx name="el-scratch" at={noiseAt} level={-34} />
      {fixes.map((f) => (
        <Sfx key={f.text} name="el-tap" at={f.at} level={-38} />
      ))}

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={54} width={1740}>
          How does overfitting show up in a neural network, and how do you fight it?
        </QuestionCard>

        {/* ── The loss curves ── */}
        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 1000, 2000, 3000, 4000]}
          yTicks={[0, 0.1, 0.2, 0.3]}
          xFormat={(v) => v.toLocaleString("en-US")}
          yFormat={(v) => v.toFixed(1)}
          xTitle="training epochs"
          yTitle="loss (mean squared error)"
          at={curvesAt - 4}
        />
        <Curve points={train} x={xs} y={ys} at={trainAt - 2} dur={40} color={BAR} width={3.6} clip={clip} />
        <Curve points={val} x={xs} y={ys} at={valAt - 2} dur={44} color={ACCENT} width={3.6} clip={clip} />
        <Tagline x={at(xs, 3000)} y={at(ys, O.train[150]) + h(14)} at={trainAt + 10} size={22} color={BLUE_INK}>
          training
        </Tagline>
        <Tagline x={at(xs, 2400)} y={at(ys, O.val[120]) - h(46)} at={valAt + 12} size={22} color={ACCENT_INK}>
          validation
        </Tagline>
        <Dots dots={[{ x: at(xs, O.bestEpoch), y: at(ys, O.bestVal), at: lowAt }]} r={9} color={OK} opacity={1} />
        <Svg opacity={ease(frame, lowAt + 2, 10)}>
          <line x1={at(xs, O.bestEpoch) + 6} y1={at(ys, O.bestVal) - 10} x2={at(xs, 300)} y2={at(ys, 0.163)} stroke={OK} strokeWidth={1.6} />
        </Svg>
        <Note at={lowAt + 2} x={at(xs, 300) + 6} y={at(ys, 0.163) - h(30)}>
          <span style={{ ...note(23, OK_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            lowest: {O.bestVal.toFixed(3)}, epoch {O.bestEpoch}
          </span>
        </Note>
        <Note at={climbAt + 4} x={at(xs, 4000) - 330} y={at(ys, O.endVal) - h(52)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap", ...TABULAR }}>
            {O.endVal.toFixed(3)} by the end: over twice the low
          </span>
        </Note>
        <VLine
          x={at(xs, O.bestEpoch)}
          top={y(LOSS.top) - 6}
          bottom={y(LOSS.bottom)}
          at={stopAt - 2}
          color={OK}
          dash="6 6"
          width={2.4}
          label={<span style={{ ...note(23, OK_INK), fontWeight: 700, whiteSpace: "nowrap" }}>stop here</span>}
          labelY={at(ys, 0.285)}
        />
        <div
          style={{
            position: "absolute",
            left: at(xs, O.bestEpoch) - 7,
            top: at(ys, O.bestVal) - 7,
            width: 14,
            height: 14,
            borderRadius: 7,
            border: `3px solid ${OK}`,
            background: PAPER,
            opacity: lowP * ease(frame, stopAt, 10),
          }}
        />

        {/* ── What it ends up drawing ── */}
        <Tagline x={FIT.left} y={y(FIT.top) - h(46)} at={toyAt} size={22} color={INK}>
          a toy network: {O.hidden} hidden units, {O.n} noisy points
        </Tagline>
        <div
          style={{
            position: "absolute",
            left: FIT.left,
            top: y(FIT.top),
            width: FIT.right - FIT.left,
            height: y(FIT.bottom) - y(FIT.top),
            boxSizing: "border-box",
            border: `1px solid color-mix(in srgb, ${INK_SOFT} 40%, transparent)`,
            opacity: ease(frame, toyAt, 12),
          }}
        />
        <Dots dots={O.points.map(([a, b], i) => ({ x: at(fx, a), y: at(fy, b), at: toyAt + 2 + i * 0.8 }))} r={6} opacity={0.85} />
        <Curve points={fit} x={fx} y={fy} at={noiseAt - 8} dur={22} color={ACCENT} width={3} clip={fitClip} />
        <Note at={noiseAt + 2} x={FIT.left + 10} y={y(FIT.bottom) + h(10)}>
          <span style={{ ...note(23, ACCENT_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            at the end: it <Mark at={noiseAt + 8}>bends to fit the noise</Mark>
          </span>
        </Note>

        {/* ── The fixes ── */}
        <div style={{ position: "absolute", left: FIT.left, top: y(FIX_Y), width: 650, display: "flex", flexWrap: "wrap", gap: 12 }}>
          {fixes.map((f) => {
            const p = ease(frame, f.at - 2, 10);
            const isStop = f.at === stopAt;
            return (
              <div
                key={f.text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px 6px 10px",
                  borderRadius: 22,
                  border: `2px solid ${isStop ? OK : INK_SOFT}`,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 8}px)`,
                  ...label(23, isStop ? OK_INK : INK),
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {p > 0 ? <Tick at={f.at + 2} size={20} /> : null}
                {f.text}
              </div>
            );
          })}
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
