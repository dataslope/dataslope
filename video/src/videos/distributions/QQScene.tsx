import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { QQ_PLOTS } from "./data";
import { ASK, askNote, DIST, Drift, Head, lerp, Svg } from "./parts";

type Panel = {
  key: "normal" | "skewed";
  title: string;
  x0: number;
  lo: number;
  hi: number;
  ticks: readonly number[];
};
const PANELS: readonly Panel[] = [
  { key: "normal", title: "Normal data, a normal fit", x0: 220, lo: 20, hi: 80, ticks: [20, 40, 60, 80] },
  { key: "skewed", title: "Skewed data, a normal fit", x0: 1060, lo: -20, hi: 120, ticks: [0, 40, 80, 120] },
];
const SIZE = 620;
const TOP = 360;
const PLOT_H = 440;
/** How many points at each end count as the tails. */
const TAIL = 36;

/**
 * Part 4, second scene: the check. A Q-Q plot pairs the data's sorted
 * values with where the fitted model puts them. Normal data fitted by a
 * normal sits on the line; skewed data fitted by a normal bends away at
 * both ends.
 */
export const QQScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const qqFrom = n.beat("qq").from;
  const plotAt = n.word("qq", "Q-Q plot");
  const quantilesAt = n.word("qq", "data's quantiles");
  const modelsAt = n.word("qq", "model's");
  const rightAt = n.word("qq", "right");
  const pointsAt = n.word("qq", "the points");
  const lineEnd = n.word("qq", "line", { edge: "end" });
  const skewedAt = n.word("bend", "skewed data");
  const bendAt = n.word("bend", "bend away");
  const endsAt = n.word("bend", "ends");
  const tailsAt = n.word("bend", "tails");
  const costlyAt = n.word("bend", "costly");

  const top = y(TOP);
  const bottom = top + h(PLOT_H);
  const scaleFor = (p: Panel): XScale => ({ lo: p.lo, hi: p.hi, x0: p.x0, x1: p.x0 + SIZE });
  const yFor = (p: Panel) => (v: number) => bottom - ((v - p.lo) / (p.hi - p.lo)) * (bottom - top);
  const start = { normal: pointsAt - 6, skewed: skewedAt - 4 };
  const span = { normal: lineEnd - pointsAt + 18, skewed: bendAt - skewedAt + 10 };

  return (
    <AbsoluteFill>
      {/* ── Sound: each panel's points arriving, the bend turning red ── */}
      <Sfx name="el-pencil" at={rightAt - 4} level={-35} />
      <Sfx name="el-sprinkle" at={pointsAt - 6} level={-34} />
      <Sfx name="el-sprinkle" at={skewedAt - 4} level={-34} />
      <Sfx name="el-tap" at={endsAt - 4} level={-28} />

      <Head
        parts={[
          { text: "So look:", at: qqFrom - 4 },
          { text: "a Q-Q plot.", at: plotAt - 4, italic: true },
        ]}
      />

      <Drift from={qqFrom} to={n.beat("bend").to + 40}>
        {PANELS.map((p, pi) => {
          const X = scaleFor(p);
          const py = yFor(p);
          const qq = QQ_PLOTS[p.key];
          const at = pi === 0 ? quantilesAt - 4 : skewedAt - 8;
          const axes = ease(frame, at, 14);
          const diag = ease(frame, pi === 0 ? rightAt - 4 : skewedAt - 6, 18);
          const reveal = (i: number) => ease(frame, start[p.key] + (i / qq.sample.length) * span[p.key], 6);
          return (
            <React.Fragment key={p.key}>
              <FigLabel n={String(12 + pi)} title={p.title} at={at} x={p.x0 - 60} y={y(300)} />
              <Svg opacity={axes}>
                <line x1={p.x0} x2={p.x0 + SIZE} y1={bottom + 0.5} y2={bottom + 0.5} stroke={INK} strokeWidth={1.5} />
                <line x1={p.x0 - 0.5} x2={p.x0 - 0.5} y1={top} y2={bottom} stroke={INK} strokeWidth={1.5} />
                {p.ticks.map((t) => (
                  <g key={t}>
                    <line x1={sx(X, t)} x2={sx(X, t)} y1={bottom} y2={bottom + 6} stroke={INK} strokeWidth={1.2} />
                    <text x={sx(X, t)} y={bottom + 28} textAnchor="middle" style={{ fontFamily: SANS, fontSize: 20, fill: INK_SOFT }}>
                      {t}
                    </text>
                    <line x1={p.x0 - 6} x2={p.x0} y1={py(t)} y2={py(t)} stroke={INK} strokeWidth={1.2} />
                    <text x={p.x0 - 12} y={py(t) + 7} textAnchor="end" style={{ fontFamily: SANS, fontSize: 20, fill: INK_SOFT }}>
                      {t}
                    </text>
                  </g>
                ))}
              </Svg>
              {/* The line the points would sit on if the model were right. */}
              <Svg>
                <line
                  x1={sx(X, p.lo)}
                  y1={py(p.lo)}
                  x2={lerp(sx(X, p.lo), sx(X, p.hi), diag)}
                  y2={lerp(py(p.lo), py(p.hi), diag)}
                  stroke={INK}
                  strokeWidth={1.8}
                  strokeDasharray="7 6"
                  opacity={diag > 0 ? 0.75 : 0}
                />
              </Svg>
              <Svg>
                {qq.sample.map((s, i) => {
                  const a = reveal(i);
                  if (a <= 0) return null;
                  const t = qq.theoretical[i];
                  if (t < p.lo || t > p.hi || s < p.lo || s > p.hi) return null;
                  const end = i < TAIL || i >= qq.sample.length - TAIL;
                  const red = p.key === "skewed" && end ? ease(frame, endsAt - 4 + (i < TAIL ? 0 : 6), 12) : 0;
                  return (
                    <circle
                      key={i}
                      cx={sx(X, t)}
                      cy={py(s)}
                      r={4.6 * a}
                      fill={red > 0 ? `color-mix(in srgb, ${ASK} ${red * 100}%, ${DIST})` : DIST}
                      stroke={PAPER}
                      strokeWidth={0.8}
                      opacity={0.85}
                    />
                  );
                })}
              </Svg>
            </React.Fragment>
          );
        })}

        {/* Axis titles, shared by both panels. */}
        <Ink at={modelsAt - 2} dur={14} style={{ left: 220, top: bottom + h(52), whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>across: where the fitted model puts each quantile</span>
        </Ink>
        <Ink at={quantilesAt} dur={14} style={{ left: 220, top: y(TOP) - h(40), whiteSpace: "nowrap" }}>
          <span style={label(21, INK_SOFT)}>up: the data's own, sorted</span>
        </Ink>
        <Note at={lineEnd - 6} x={sx(scaleFor(PANELS[0]), 52)} y={yFor(PANELS[0])(36)}>
          <span style={{ ...note(22, INK), fontWeight: 650, whiteSpace: "nowrap" }}>on the line: the fit holds</span>
        </Note>

        {/* The skewed panel's ends. */}
        <Note at={tailsAt - 4} x={sx(scaleFor(PANELS[1]), 66)} y={yFor(PANELS[1])(112)}>
          <span style={{ ...askNote(23), whiteSpace: "nowrap" }}>the upper tail runs away</span>
        </Note>
        <Note at={tailsAt + 4} x={sx(scaleFor(PANELS[1]), 8)} y={yFor(PANELS[1])(-4)}>
          <span style={{ ...askNote(23), whiteSpace: "nowrap" }}>the lower tail, too</span>
        </Note>
        <Note at={costlyAt - 2} x={sx(scaleFor(PANELS[1]), 40)} y={yFor(PANELS[1])(-4) + 38}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>where the costly mistakes live</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
