import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, fmt, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { type Calibration, CLS } from "./data";
import { at, type Box, Curve, Drift, Mark, OK, OK_INK, type Scale, Svg } from "./parts";

const SIDE = 470;
const PLOT: Box = { left: 230, right: 230 + SIDE, top: 360, bottom: 360 + SIDE };
const NOTE_X = 860;

/**
 * Question 11 on the same 200,000 cases: predicted probability against the
 * share actually positive, in ten bins, over the diagonal where a score means
 * what it says. The plain model near the line; the class-weighted one along
 * the floor (its 0.85 bin is 8.5% positive); then that same weighted curve
 * moves, bin by bin, onto its recalibrated self (Platt scaling), back on the
 * line, turning from red to green as it goes.
 */
export const CalScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("cal").from;
  const qAt = n.word("cal", "Question");
  const textAt = n.word("cal", "What is model calibration");
  const asked = n.word("cal", "Whether a score means what it says");
  const eightAt = n.word("cal", "of the cases scored point eight");
  const eightyAt = n.word("cal", "about eighty percent");
  const plainAt = n.word("cal-curve", "The plain model");
  const weightedAt = n.word("cal-curve", "The weighted one doesn't");
  const nineAt = n.word("cal-curve", "under nine percent");
  const boughtAt = n.word("cal-curve", "The weights bought recall");
  const brokeAt = n.word("cal-curve", "broke the probabilities");
  const fitAt = n.word("cal-curve", "Fit a calibration on held-out data");
  const plattAt = n.word("cal-curve", "Platt scaling");
  const lineAt = n.word("cal-curve", "back on the line");
  const end = n.beat("cal-curve").to;

  const xs: Scale = { lo: 0, hi: 1, a: PLOT.left, b: PLOT.right };
  const ys: Scale = { lo: 0, hi: 1, a: y(PLOT.bottom), b: y(PLOT.top) };
  const clip: Box = { left: PLOT.left - 12, right: PLOT.right + 12, top: y(PLOT.top) - 12, bottom: y(PLOT.bottom) + 12 };
  const pts = (c: Calibration) => c.pred.map((p, i) => [p, c.obs[i]] as const);
  const frameP = ease(frame, asked, 16);
  const ptr = ease(frame, eightAt, 12);
  const w = CLS.calWeighted;
  const k = w.pred.findIndex((p) => p > 0.8 && p < 0.9);
  const wx = at(xs, w.pred[k]);
  const wy = at(ys, w.obs[k]);
  const ringP = ease(frame, nineAt - 2, 12) * (1 - ease(frame, fitAt, 12));
  // The weighted model is what gets recalibrated, so its own curve moves.
  const morph = ease(frame, fitAt + 4, Math.max(20, lineAt - fitAt - 8));
  const r = CLS.calRecal;
  const moving = w.pred.map((p, i) => [p + (r.pred[i] - p) * morph, w.obs[i] + (r.obs[i] - w.obs[i]) * morph] as const);
  const movingColor = morph <= 0 ? ACCENT : morph >= 1 ? OK : `color-mix(in srgb, ${OK} ${(100 * morph).toFixed(1)}%, ${ACCENT})`;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={asked + 4} level={-34} />
      <Sfx name="el-pencil" at={plainAt + 2} level={-34} />
      <Sfx name="el-scratch" at={weightedAt + 4} level={-32} />
      <Sfx name="el-pop" at={nineAt} level={-32} />
      <Sfx name="el-pop" at={lineAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={11} at={qAt - 4} textAt={textAt - 4} out={end - 6} size={60}>
          What is model calibration?
        </QuestionCard>

        {/* ── The frame and its diagonal ── */}
        <Svg opacity={frameP}>
          <path d={`M${PLOT.left},${y(PLOT.top)} L${PLOT.left},${y(PLOT.bottom)} L${PLOT.right},${y(PLOT.bottom)}`} fill="none" stroke={INK} strokeWidth={1.6} />
          <line
            x1={PLOT.left}
            y1={y(PLOT.bottom)}
            x2={PLOT.left + SIDE * frameP}
            y2={y(PLOT.bottom) - (y(PLOT.bottom) - y(PLOT.top)) * frameP}
            stroke={INK_SOFT}
            strokeWidth={2}
            strokeDasharray="6 7"
          />
          {[0, 0.5, 1].map((v) => (
            <React.Fragment key={v}>
              <text x={at(xs, v)} y={y(PLOT.bottom) + 30} textAnchor="middle" style={{ ...label(19, INK_SOFT), fontVariantNumeric: "tabular-nums" }}>
                {v}
              </text>
              <text x={PLOT.left - 12} y={at(ys, v) + 6} textAnchor="end" style={{ ...label(19, INK_SOFT), fontVariantNumeric: "tabular-nums" }}>
                {v * 100}%
              </text>
            </React.Fragment>
          ))}
          <text x={PLOT.right} y={y(PLOT.bottom) + 60} textAnchor="end" style={{ ...label(20, INK_SOFT), fontWeight: 650 }}>
            the model&apos;s score
          </text>
          <text x={PLOT.left} y={y(PLOT.top) - 18} textAnchor="start" style={{ ...label(20, INK_SOFT), fontWeight: 650 }}>
            share actually positive
          </text>
        </Svg>
        {/* A score of 0.8 that means 80%. */}
        <Svg opacity={ptr * (1 - ease(frame, weightedAt, 12))}>
          <circle cx={at(xs, 0.8)} cy={at(ys, 0.8)} r={16 * ptr} fill={HIGHLIGHT} />
          <circle cx={at(xs, 0.8)} cy={at(ys, 0.8)} r={5} fill={INK} />
        </Svg>
        <Note at={eightyAt - 2} x={at(xs, 0.8) - 24} y={at(ys, 0.8) - h(64)} align="right" out={weightedAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap", ...TABULAR }}>scored 0.8: about 80% positive</span>
        </Note>

        {/* ── Three models ── */}
        <Curve points={pts(CLS.calPlain)} x={xs} y={ys} at={plainAt} dur={22} color={BAR} width={3.4} clip={clip} dots={6} dim={fitAt} />
        <Curve points={moving} x={xs} y={ys} at={weightedAt + 2} dur={22} color={movingColor} width={3.4 + 0.4 * morph} clip={clip} dots={6} />
        <Svg opacity={ringP}>
          <circle cx={wx} cy={wy} r={16 * ringP} fill="none" stroke={ACCENT} strokeWidth={3} />
          <line x1={wx} x2={wx} y1={wy - 18} y2={at(ys, w.pred[k]) + 4} stroke={ACCENT} strokeWidth={1.6} strokeDasharray="3 5" />
        </Svg>
        {/* ── The key, in the order the narration names them ── */}
        <Note at={plainAt} x={NOTE_X} y={y(400)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>plain model</b>: near the diagonal
          </span>
        </Note>
        <Note at={weightedAt} x={NOTE_X} y={y(470)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: ACCENT_INK }}>class-weighted</b>: far below it
          </span>
        </Note>
        <Note at={nineAt} x={NOTE_X} y={y(512)}>
          <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap", ...TABULAR }}>
            scored {fmt(w.pred[k])}: {fmt(w.obs[k] * 100, 1)}% positive
          </span>
        </Note>
        <Note at={boughtAt - 2} x={NOTE_X} y={y(586)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            The weights bought recall
            <span style={{ opacity: ease(frame, brokeAt - 2, 10) }}>
              {" "}
              and <span style={{ color: ACCENT_INK, fontWeight: 650 }}>broke the probabilities</span>.
            </span>
          </span>
        </Note>
        <Note at={fitAt - 2} x={NOTE_X} y={y(676)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: OK_INK }}>class-weighted, recalibrated</b> on held-out data
          </span>
          <br />
          <span style={{ ...note(24, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, plattAt - 2, 10) }}>Platt scaling or isotonic regression</span>
        </Note>
        <Note at={lineAt - 2} x={NOTE_X} y={y(792)}>
          <span style={{ ...note(30, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={lineAt + 4}>back on the line</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
