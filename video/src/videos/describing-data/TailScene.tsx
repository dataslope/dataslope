import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { TAILS, type Tail } from "./data";
import { Drift, Mark, Pulse, STAT, STAT_INK, Svg, Tag, count } from "./parts";

/** Standardized values: the body from -4 to 4 SD in bars, the far values as dots. */
const X: XScale = { lo: -12, hi: 12, x0: 300, x1: 1500 };
const EDGE = 12;
const COL = 0.25;
const ROWS = { normal: 560, heavy: 830 } as const;
const BODY_H = 190;
const DOT_R = 4.6;
const DOT_STEP = 10.5;

/** Where each far value's dot goes: its column, and how high it stacks. */
function farDots(z: readonly number[]) {
  const heights = new Map<number, number>();
  return z.map((v) => {
    const clamped = Math.max(-EDGE + COL / 2, Math.min(EDGE - COL / 2, v));
    const col = Math.floor(clamped / COL);
    const k = heights.get(col) ?? 0;
    heights.set(col, k + 1);
    return { x: (col + 0.5) * COL, k, beyond: Math.abs(v) > EDGE };
  });
}

/**
 * Part 3, second scene: twenty thousand normal draws against twenty thousand
 * from a heavy-tailed distribution, in standard deviations. Beyond four SD,
 * one against a hundred and twenty-seven.
 */
export const TailScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const tailsFrom = n.beat("tails").from;
  const twentyAt = n.word("tails", "twenty thousand");
  const normalAt = n.word("tails", "normal");
  const oneAt = n.word("tails", "just one");
  const fourAt = n.word("tails", "four standard deviations");
  const heavyAt = n.word("heavy", "heavy-tailed");
  const hundredAt = n.word("heavy", "hundred");
  const routineFrom = n.beat("routine").from;
  const routineAt = n.word("routine", "routine");
  const examples = [n.word("routine", "Financial"), n.word("routine", "insurance"), n.word("routine", "network")];
  const mistakeAt = n.word("outlier-in", "mistake");
  const farAt = n.word("outlier-in", "far out");

  const peak = Math.max(...TAILS.heavy.counts);
  const unit = h(BODY_H) / peak;

  const row = (key: "normal" | "heavy", t: Tail, name: string, barsAt: number, dotsAt: number, spread: number) => {
    const base = y(ROWS[key]);
    const dots = farDots(t.farZ);
    const shown = Math.round(count(frame, dotsAt, 0, t.far, spread));
    const beyondLo = t.farZ.filter((v) => v < -EDGE);
    const beyondHi = t.farZ.filter((v) => v > EDGE);
    return (
      <React.Fragment key={key}>
        <Tag x={160} y={base - h(BODY_H) - 10} opacity={ease(frame, barsAt - 4, 12)} size={23} bold align="left">
          {name}
        </Tag>
        <Bars counts={t.counts} lo={-4} bin={0.25} scale={X} base={base} unit={unit} gap={1.5} grow={(i) => ease(frame, barsAt + Math.abs(i - 15.5) * 0.5, 14)} />
        <Svg opacity={ease(frame, barsAt - 4, 12)}>
          <line x1={X.x0} x2={X.x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.5} />
        </Svg>
        <Svg>
          {dots.map((d, i) => {
            const a = ease(frame, dotsAt + (i / Math.max(1, t.far)) * spread, 6);
            if (a <= 0) return null;
            return (
              <circle
                key={i}
                cx={sx(X, d.x)}
                cy={base - DOT_R - 1.5 - d.k * DOT_STEP - (1 - a) * 18}
                r={DOT_R}
                fill={STAT}
                opacity={a}
              />
            );
          })}
        </Svg>
        {beyondLo.length ? (
          <Tag x={X.x0} y={base + 14} opacity={ease(frame, dotsAt + spread, 12)} color={INK_SOFT} size={20} align="left">
            {beyondLo.length} more past −12, out to {fmt(beyondLo[0], 0).replace("-", "−")}
          </Tag>
        ) : null}
        {beyondHi.length ? (
          <Tag x={X.x1} y={base + 14} opacity={ease(frame, dotsAt + spread, 12)} color={INK_SOFT} size={20} align="right">
            {beyondHi.length} more past +12, out to +{fmt(beyondHi[beyondHi.length - 1], 0)}
          </Tag>
        ) : null}
        <div style={{ position: "absolute", left: 1570, top: base - h(120), opacity: ease(frame, dotsAt - 2, 10), whiteSpace: "nowrap" }}>
          <div style={{ ...note(56, STAT_INK), fontWeight: 700, lineHeight: 1 }}>{shown}</div>
          <div style={{ ...note(21, INK_SOFT), marginTop: 8 }}>of {t.n.toLocaleString("en-US")} beyond 4 SD</div>
        </div>
      </React.Fragment>
    );
  };

  return (
    <AbsoluteFill>
      {/* ── Sound: the two bodies, the one far draw, the many ── */}
      <Sfx name="el-sprinkle" at={twentyAt - 2} level={-34} />
      <Sfx name="el-tap" at={oneAt} level={-28} />
      <Sfx name="el-sprinkle" at={heavyAt - 2} level={-34} />
      <Sfx name="el-sprinkle" at={hundredAt - 2} level={-32} />
      <Sfx name="el-pop" at={examples[0] - 4} level={-31} />

      {/* ── Headlines ── */}
      <Ink at={tailsFrom - 4} dur={20} out={routineFrom - 6} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        How far out do values land?
      </Ink>
      <Ink at={routineFrom - 2} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Heavy tails make <Mark at={routineAt}>rare routine</Mark>.
      </Ink>

      <FigLabel n="9" title="Twenty thousand draws each, in standard deviations from the mean" at={twentyAt - 6} x={160} y={y(320)} />

      <Drift from={tailsFrom} to={mistakeAt + 40} scale={0.02} origin={[900, y(ROWS.heavy)]}>
        {/* Beyond four SD, either side. */}
        {ease(frame, fourAt - 4, 14) > 0 ? (
          <Svg opacity={ease(frame, fourAt - 4, 14)}>
            {[
              [X.x0, sx(X, -4)],
              [sx(X, 4), X.x1],
            ].map(([a, b]) => (
              <rect key={a} x={a} y={y(ROWS.normal) - h(BODY_H) - 6} width={b - a} height={y(ROWS.heavy) - y(ROWS.normal) + h(BODY_H) + 6} fill={HIGHLIGHT} opacity={0.32} />
            ))}
          </Svg>
        ) : null}
        <Tag x={sx(X, -8)} y={y(ROWS.normal) - h(BODY_H) - 4} opacity={ease(frame, fourAt, 12)} color={INK_SOFT} size={21}>
          beyond 4 SD
        </Tag>
        <Tag x={sx(X, 8)} y={y(ROWS.normal) - h(BODY_H) - 4} opacity={ease(frame, fourAt, 12)} color={INK_SOFT} size={21}>
          beyond 4 SD
        </Tag>
        {[-12, -8, -4, 0, 4, 8, 12].map((v) => (
          <Tag key={v} x={sx(X, v)} y={y(ROWS.heavy) + 44} opacity={ease(frame, heavyAt, 14)} color={INK_SOFT} size={20}>
            {v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0"}
          </Tag>
        ))}

        {row("normal", TAILS.normal, "Normal", normalAt - 4, oneAt + 2, 1)}
        {row("heavy", TAILS.heavy, "Heavy-tailed", heavyAt - 4, hundredAt - 4, 34)}
        <Pulse x={sx(X, 4.125)} y={y(ROWS.normal) - DOT_R - 1.5} at={oneAt + 4} color={STAT} r={DOT_R + 2} />
        <Pulse x={sx(X, -EDGE + COL / 2)} y={y(ROWS.heavy) - DOT_R - 1.5} at={farAt - 2} color={STAT} r={8} />
      </Drift>

      {/* Where heavy tails live: the lesson's examples. */}
      <div style={{ position: "absolute", left: 160, top: y(915), display: "flex", gap: 36, whiteSpace: "nowrap" }}>
        {["Financial returns", "insurance losses", "network delays"].map((t, i) => {
          const p = ease(frame, examples[i] - 4, 14);
          return (
            <span key={t} style={{ ...label(23, INK), opacity: p, transform: `translateY(${(1 - p) * 10}px)`, display: "inline-block", ...halo }}>
              {t}
            </span>
          );
        })}
      </div>
      <Ink at={mistakeAt - 6} dur={16} style={{ left: 1100, top: y(915), whiteSpace: "nowrap" }}>
        <span style={{ ...note(23, STAT_INK), fontWeight: 600, background: PAPER }}>Far out is not the same as wrong.</span>
      </Ink>
    </AbsoluteFill>
  );
};
