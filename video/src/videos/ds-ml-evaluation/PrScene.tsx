import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { CLS } from "./data";
import { at, Axes, type Box, Curve, Drift, Mark, PanelTitle, type Scale, Svg, WARM, WARM_INK } from "./parts";

const PLOT: Box = { left: 180, right: 940, top: 430, bottom: 790 };
const RIGHT_X = 1090;

/** Precision and recall at a threshold, read off the computed grid. */
const rates = (t: number) => {
  const c = CLS.curve;
  let i = 0;
  while (i < c.length - 1 && c[i + 1][0] <= t) i++;
  const j = Math.min(i + 1, c.length - 1);
  const k = c[j][0] === c[i][0] ? 0 : (t - c[i][0]) / (c[j][0] - c[i][0]);
  return { precision: c[i][1] + (c[j][1] - c[i][1]) * k, recall: c[i][2] + (c[j][2] - c[i][2]) * k };
};

/**
 * Question 8 on the video's own 200,000 simulated cases, 2% positive, scored
 * by one logistic regression: precision and recall against the threshold,
 * with a marker that starts at 0.8 (87% and 10%) and slides down to 0.05
 * (18% and 75%) as the narration lowers it. Then when to favor each, and F1.
 */
export const PrScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("pr").from;
  const qAt = n.word("pr", "Question");
  const textAt = n.word("pr", "Precision versus recall");
  const precAt = n.word("pr", "Precision is the share");
  const recAt = n.word("pr", "Recall is the share");
  const casesAt = n.word("pr-slide", "two hundred thousand cases");
  const eightAt = n.word("pr-slide", "At a threshold of point eight");
  const eightyAt = n.word("pr-slide", "eighty-seven percent");
  const lowerAt = n.word("pr-slide", "Lower it to point oh five");
  const climbAt = n.word("pr-slide", "recall climbs to seventy-five");
  const fallsAt = n.word("pr-slide", "precision falls to eighteen");
  const missAt = n.word("pr-favor", "Favor recall");
  const alarmAt = n.word("pr-favor", "Favor precision");
  const f1At = n.word("pr-favor", "F one");
  const end = n.beat("pr-favor").to;

  const [hi, lo] = [CLS.thresholds.find((t) => t.t === 0.8)!, CLS.thresholds.find((t) => t.t === 0.05)!];
  const xs: Scale = { lo: 0, hi: 1, a: PLOT.left, b: PLOT.right };
  const ys: Scale = { lo: 0, hi: 1, a: y(PLOT.bottom), b: y(PLOT.top) };
  const clip: Box = { left: PLOT.left - 6, right: PLOT.right + 6, top: y(PLOT.top) - 8, bottom: y(PLOT.bottom) + 6 };
  const precision = CLS.curve.map(([t, p]) => [t, p] as const);
  const recall = CLS.curve.map(([t, , r]) => [t, r] as const);

  // The marker: on at 0.8, then down to 0.05 while the narration says so.
  const t = interpolate(frame, [lowerAt, lowerAt + 30], [hi.t, lo.t], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const r = frame < lowerAt ? { precision: hi.precision, recall: hi.recall } : frame >= lowerAt + 30 ? { precision: lo.precision, recall: lo.recall } : rates(t);
  const mP = ease(frame, eightAt, 12);
  const mx = at(xs, t);

  const readout = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={casesAt + 4} level={-34} />
      <Sfx name="el-pop" at={eightAt + 4} level={-32} />
      <Sfx name="el-whoosh" at={lowerAt} level={-36} />
      <Sfx name="el-tap" at={missAt} level={-34} />
      <Sfx name="el-tap" at={alarmAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} out={end - 6} size={60}>
          Precision versus recall: when do you favor each?
        </QuestionCard>
        <Note at={precAt - 2} x={PLOT.left - 60} y={y(270)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: BLUE_INK }}>precision</b>: the share of flagged cases that are real
          </span>
        </Note>
        <Note at={recAt - 2} x={PLOT.left - 60} y={y(318)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            <b style={{ color: WARM_INK }}>recall</b>: the share of real cases you flag
          </span>
        </Note>

        {/* ── Both, against the threshold ── */}
        <PanelTitle x={PLOT.left} y={y(PLOT.top) - h(44)} at={casesAt - 2}>
          {CLS.test.toLocaleString("en-US")} cases, {Math.round(CLS.prevalence * 100)}% of them positive
        </PanelTitle>
        <Axes
          x={xs}
          y={ys}
          xTicks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
          yTicks={[0, 0.5, 1]}
          xFormat={(v) => v.toFixed(1)}
          yFormat={(v) => `${v * 100}%`}
          xTitle="threshold"
          at={casesAt}
        />
        <Curve points={precision} x={xs} y={ys} at={casesAt + 6} dur={24} color={BAR} width={3.6} clip={clip} />
        <Curve points={recall} x={xs} y={ys} at={casesAt + 10} dur={24} color={WARM} width={3.6} clip={clip} />
        <Note at={casesAt + 24} x={at(xs, 0.5) + 30} y={at(ys, rates(0.5).precision) - h(44)}>
          <span style={{ ...label(21, BLUE_INK), fontWeight: 650 }}>precision</span>
        </Note>
        <Note at={casesAt + 28} x={at(xs, 0.5) + 30} y={at(ys, rates(0.5).recall) + h(10)}>
          <span style={{ ...label(21, WARM_INK), fontWeight: 650 }}>recall</span>
        </Note>
        <Svg opacity={mP}>
          <line x1={mx} x2={mx} y1={y(PLOT.top)} y2={y(PLOT.bottom)} stroke={HIGHLIGHT} strokeWidth={10} />
          <circle cx={mx} cy={at(ys, r.precision)} r={9} fill={BAR} />
          <circle cx={mx} cy={at(ys, r.recall)} r={9} fill={WARM} />
        </Svg>

        {/* ── The readout ── */}
        <Note at={eightAt} x={RIGHT_X} y={y(PLOT.top)}>
          <div style={{ ...note(28, INK), ...TABULAR, whiteSpace: "nowrap", lineHeight: 1.7 }}>
            <div>
              threshold <b>{t.toFixed(2)}</b>
            </div>
            <div>
              precision{" "}
              <Mark at={fallsAt}>
                <b style={{ color: BLUE_INK }}>{readout(r.precision)}</b>
              </Mark>
            </div>
            <div style={{ opacity: ease(frame, eightyAt + 8, 10) }}>
              recall{" "}
              <Mark at={climbAt}>
                <b style={{ color: WARM_INK }}>{readout(r.recall)}</b>
              </Mark>
            </div>
          </div>
        </Note>

        {/* ── When to favor each ── */}
        <Note at={missAt - 2} x={RIGHT_X} y={y(610)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            favor <b style={{ color: WARM_INK }}>recall</b> when a miss is costly
          </span>
          <br />
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>a disease screen, fraud</span>
        </Note>
        <Note at={alarmAt - 2} x={RIGHT_X} y={y(700)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            favor <b style={{ color: BLUE_INK }}>precision</b> when a false alarm is
          </span>
          <br />
          <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>a spam filter</span>
        </Note>
        <Note at={f1At - 2} x={RIGHT_X} y={y(800)}>
          <span style={{ ...note(27, INK), whiteSpace: "nowrap" }}>
            <b>F1</b>: the harmonic mean of the two
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
