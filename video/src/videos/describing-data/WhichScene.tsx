import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BINS } from "./data";
import { Bracket, DATA, Drift, lerp, Mark, Pulse, SOFT_FILL, STAT, STAT_INK, Svg, Tag } from "./parts";

const W = 680;
const COL = [160, 1060] as const;
const ROW1_BASE = 540;
const ROW1_H = 150;
const ROW2_MID = 735;
const BOX_H = 56;
const VIOLIN_H = 62;

const scaleAt = (x0: number): XScale => ({ lo: BINS.lo, hi: BINS.hi, x0, x1: x0 + W });

/**
 * Part 4 closes: which plot when, the lesson's four, all drawn from the same
 * thousand values as the bin trap, so the box plot's blindness to the second
 * peak is there to see beside the violin that shows it. Then the habit, and
 * the bridge to probability.
 */
export const WhichScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const plotsFrom = n.beat("plots").from;
  const histAt = n.word("plots", "histogram");
  const shapeOfAt = n.word("plots", "shape");
  const fewAt = n.word("plots", "few bin widths");
  const percentilesAt = n.word("ecdf", "percentiles");
  const ecdfAt = n.word("ecdf", "ECDF");
  const shareAt = n.word("ecdf", "at or below");
  const boxAt = n.word("box", "box plots");
  const quartilesAt = n.word("box", "quartiles");
  const secondAt = n.word("box", "second peak");
  const violinAt = n.word("violin", "violin");
  const shapeAt = n.word("violin", "shape");
  const habitFrom = n.beat("habit").from;
  const firstAt = n.word("habit", "FIRST");
  const haveAt = n.word("next", "data you have");
  const seenAt = n.word("next", "haven't seen");
  const meansAt = n.word("next", "means");
  const eachAt = n.word("ecdf", "each point");
  const summarizeAt = n.word("habit", "summarize");
  const summaryAt = n.word("next", "summary");
  const plotWordAt = n.word("next", "plot");
  const whatAt = n.word("next", "what a probability");
  const evenAt = n.word("next", "even");
  const needAt = n.word("next", "need probability");
  const startingAt = n.word("next", "starting");

  const fade = 1 - ease(frame, seenAt - 4, 20) * 0.6;
  /** After the last word, the four figures clear away one at a time. */
  const clear = (i: number) => 1 - ease(frame, evenAt + 6 + i * 14, 14);
  const glow = ease(frame, plotWordAt - 2, 8) * (1 - ease(frame, plotWordAt + 12, 14));

  // ── Histogram: twenty bins, flicked to eighty and back on "a few bin widths" ──
  const hs = scaleAt(COL[0]);
  const base1 = y(ROW1_BASE);
  const flick = ease(frame, fewAt - 2, 10) * (1 - ease(frame, fewAt + 16, 12));
  const coarse = BINS.sets["20"];
  const fine = BINS.sets["80"];
  const histUnit = h(ROW1_H) / Math.max(...fine.density);
  const histIn = (i: number) => ease(frame, histAt - 4 + i * 0.3, 12);

  // ── ECDF ──
  const es = scaleAt(COL[1]);
  const steps = BINS.ecdf.map((v, i) => [sx(es, v), base1 - ((i + 1) / BINS.ecdf.length) * h(ROW1_H)] as const);
  const ecdfPath =
    `M${es.x0},${base1} L${steps[0][0]},${base1} ` +
    steps.map(([x, yy], i) => `L${x},${i ? steps[i - 1][1] : base1} L${x},${yy}`).join(" ") +
    ` L${es.x1},${base1 - h(ROW1_H)}`;
  const ecdfDraw = ease(frame, ecdfAt - 4, 26);
  const readX = sx(es, BINS.box.median);
  const readY = base1 - 0.5 * h(ROW1_H);
  const read = ease(frame, shareAt - 4, 16);

  // ── Box plot ──
  const bs = scaleAt(COL[0]);
  const mid2 = y(ROW2_MID);
  const box = ease(frame, boxAt - 4, 16);
  const q1 = sx(bs, BINS.box.q1);
  const q3 = sx(bs, BINS.box.q3);
  const med = sx(bs, BINS.box.median);
  const wLo = sx(bs, BINS.box.whiskerLo);
  const wHi = sx(bs, BINS.box.whiskerHi);

  // ── Violin ──
  const vs = scaleAt(COL[1]);
  const peak = Math.max(...BINS.kde.density);
  const violinDraw = ease(frame, violinAt - 4, 22);
  const upper = BINS.kde.grid.map((g, i) => `${i ? "L" : "M"}${sx(vs, g).toFixed(1)},${(mid2 - (BINS.kde.density[i] / peak) * h(VIOLIN_H)).toFixed(1)}`).join(" ");
  const lower = [...BINS.kde.grid]
    .map((g, i) => [g, i] as const)
    .reverse()
    .map(([g, i]) => `L${sx(vs, g).toFixed(1)},${(mid2 + (BINS.kde.density[i] / peak) * h(VIOLIN_H)).toFixed(1)}`)
    .join(" ");
  const lowerFwd = BINS.kde.grid.map((g, i) => `${i ? "L" : "M"}${sx(vs, g).toFixed(1)},${(mid2 + (BINS.kde.density[i] / peak) * h(VIOLIN_H)).toFixed(1)}`).join(" ");
  const secondPeakX = BINS.kde.grid.reduce((best, g, i) => (g > 12 && BINS.kde.density[i] > BINS.kde.density[best] ? i : best), BINS.kde.grid.findIndex((g) => g > 12));

  const panel = (x: number, top: number, title: string, use: string, at: number) => (
    <Ink at={at - 6} dur={14} style={{ left: x, top, whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 14 }}>
      <span style={{ ...label(25, INK), fontWeight: 700 }}>{title}</span>
      <span style={{ ...note(21, INK_SOFT) }}>{use}</span>
    </Ink>
  );

  return (
    <AbsoluteFill>
      {/* ── Sound: each of the four plots, the bridge ── */}
      <Sfx name="el-sprinkle" at={histAt - 4} level={-34} />
      <Sfx name="el-pencil" at={ecdfAt - 4} level={-33} />
      <Sfx name="el-pop" at={boxAt - 4} level={-30} />
      <Sfx name="el-pencil" at={violinAt - 4} level={-33} />
      <Sfx name="el-chime" at={n.beat("habit").to + 4} level={-32} />

      {/* ── Headlines ── */}
      <Ink at={plotsFrom - 4} dur={20} out={habitFrom - 6} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Which plot, when?
      </Ink>
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(80), opacity: 1 - 0.5 * ease(frame, needAt - 2, 16) }}>
        <Ink at={firstAt - 6} dur={18} style={{ position: "relative", ...headline(80, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          Plot first.
        </Ink>
        <Ink at={summarizeAt - 4} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
          Summarize second.
        </Ink>
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: fade }}>
        <Drift from={plotsFrom} to={meansAt + 40} scale={0.02} origin={[960, y(640)]}>

          <div style={{ position: "absolute", inset: 0, opacity: clear(0) }}>
            {panel(COL[0], y(330), "Histogram", "the shape of one variable", shapeOfAt)}
          {/* Histogram. */}
          <Svg>
            {Array.from({ length: 80 }, (_, i) => {
              const d = lerp(coarse.density[Math.floor(i / 4)], fine.density[i], flick) * histIn(Math.floor(i / 4)) * (1 + glow * 0.06);
              if (d <= 0) return null;
              const fw = W / 80;
              return <rect key={i} x={hs.x0 + i * fw} y={base1 - d * histUnit} width={fw + 0.4} height={d * histUnit} fill={DATA} />;
            })}
            {Array.from({ length: 19 }, (_, j) => (
              <rect key={j} x={hs.x0 + ((j + 1) * W) / 20 - 1} y={base1 - h(ROW1_H) - 4} width={2} height={h(ROW1_H) + 4} fill={PAPER} opacity={1 - flick} />
            ))}
            <line x1={hs.x0} x2={hs.x1} y1={base1 + 0.5} y2={base1 + 0.5} stroke={INK} strokeWidth={1.5} opacity={ease(frame, histAt - 6, 12)} />
          </Svg>

          </div>

          <div style={{ position: "absolute", inset: 0, opacity: clear(1) }}>
            {panel(COL[1], y(330), "ECDF", "percentiles, with nothing to tune", percentilesAt)}
          {/* ECDF, and one percentile read off it. */}
          <Svg opacity={ease(frame, ecdfAt - 6, 10)}>
            <line x1={es.x0} x2={es.x1} y1={base1 + 0.5} y2={base1 + 0.5} stroke={INK} strokeWidth={1.5} />
            <line x1={es.x0} x2={es.x1} y1={base1 - h(ROW1_H)} y2={base1 - h(ROW1_H)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="3 5" />
            <path d={ecdfPath} fill="none" stroke={DATA} strokeWidth={3} strokeLinejoin="round" pathLength={1} strokeDasharray={`${ecdfDraw} 1`} />
          </Svg>
          {read > 0 ? (
            <Svg opacity={read}>
              <line x1={readX} x2={readX} y1={base1} y2={lerp(base1, readY, read)} stroke={STAT} strokeWidth={2} strokeDasharray="6 5" />
              <line x1={readX} x2={lerp(readX, es.x0, read)} y1={readY} y2={readY} stroke={STAT} strokeWidth={2} strokeDasharray="6 5" />
              <circle cx={readX} cy={readY} r={5} fill={STAT} />
            </Svg>
          ) : null}
          <Pulse x={readX} y={readY} at={eachAt - 2} color={STAT} r={6} />
          <Pulse x={readX} y={readY} at={haveAt} color={STAT} r={6} />
          <Tag x={es.x0 - 8} y={readY - 14} opacity={read} color={STAT_INK} size={21} bold align="right">
            half
          </Tag>
          <Tag x={es.x0 - 8} y={base1 - h(ROW1_H) - 14} opacity={ease(frame, ecdfAt, 12)} color={INK_SOFT} size={20} align="right">
            all
          </Tag>
          <Tag x={readX + 10} y={base1 + 10} opacity={read} color={STAT_INK} size={21} align="left">
            at or below {fmt(BINS.box.median, 1)}
          </Tag>

          </div>

          <div style={{ position: "absolute", inset: 0, opacity: clear(2) }}>
            {panel(COL[0], y(600), "Box plot", "groups side by side", boxAt)}
          {/* Box plot. */}
          {box > 0 ? (
            <Svg opacity={box}>
              <line x1={wLo} x2={q1} y1={mid2} y2={mid2} stroke={INK} strokeWidth={2} />
              <line x1={q3} x2={wHi} y1={mid2} y2={mid2} stroke={INK} strokeWidth={2} />
              <line x1={wLo} x2={wLo} y1={mid2 - 14} y2={mid2 + 14} stroke={INK} strokeWidth={2} />
              <line x1={wHi} x2={wHi} y1={mid2 - 14} y2={mid2 + 14} stroke={INK} strokeWidth={2} />
              <rect x={med - (med - q1) * box} y={mid2 - h(BOX_H) / 2} width={(q3 - q1) * box} height={h(BOX_H)} fill={SOFT_FILL} stroke={DATA} strokeWidth={2.4} />
              <line x1={med} x2={med} y1={mid2 - h(BOX_H) / 2} y2={mid2 + h(BOX_H) / 2} stroke={INK} strokeWidth={3.2} />
            </Svg>
          ) : null}
          <Pulse x={q1} y={mid2 - h(BOX_H) / 2} at={quartilesAt - 2} color={INK} r={5} />
          <Pulse x={med} y={mid2 - h(BOX_H) / 2} at={summaryAt - 2} color={INK} r={6} />
          <Pulse x={q3} y={mid2 - h(BOX_H) / 2} at={quartilesAt + 4} color={INK} r={5} />
          {ease(frame, secondAt - 4, 14) > 0 ? (
            <Svg opacity={ease(frame, secondAt - 4, 14)}>
              <rect x={sx(bs, 13)} y={mid2 - h(BOX_H) / 2 - 8} width={sx(bs, 17) - sx(bs, 13)} height={h(BOX_H) + 16} fill={HIGHLIGHT} opacity={0.45} />
            </Svg>
          ) : null}
          <Bracket x0={sx(bs, 13)} x1={sx(bs, 17)} y={mid2 + h(BOX_H) / 2 + 14} at={secondAt - 2} color={STAT} />
          <Tag x={sx(bs, 15)} y={mid2 + h(BOX_H) / 2 + 30} opacity={ease(frame, secondAt + 2, 12)} color={STAT_INK} size={21}>
            the second peak is in here, unseen
          </Tag>

          </div>

          <div style={{ position: "absolute", inset: 0, opacity: clear(3) }}>
            {panel(COL[1], y(600), "Violin", "the shape a box leaves out", violinAt)}
          {/* Violin. */}
          <Svg opacity={ease(frame, violinAt - 6, 10)}>
            <path d={`${upper} ${lower} Z`} fill={SOFT_FILL} opacity={violinDraw} />
            <path d={upper} fill="none" stroke={DATA} strokeWidth={2.6} pathLength={1} strokeDasharray={`${violinDraw} 1`} />
            <path d={lowerFwd} fill="none" stroke={DATA} strokeWidth={2.6} pathLength={1} strokeDasharray={`${violinDraw} 1`} />
            <rect x={sx(vs, BINS.box.q1)} y={mid2 - 6} width={sx(vs, BINS.box.q3) - sx(vs, BINS.box.q1)} height={12} fill={INK} opacity={0.75 * violinDraw} />
            <circle cx={sx(vs, BINS.box.median)} cy={mid2} r={5} fill={PAPER} opacity={violinDraw} />
          </Svg>
          <Pulse
            x={sx(vs, BINS.kde.grid[secondPeakX])}
            y={mid2 - (BINS.kde.density[secondPeakX] / peak) * h(VIOLIN_H)}
            at={shapeAt - 2}
            color={STAT}
            r={7}
          />
          <Tag
            x={sx(vs, BINS.kde.grid[secondPeakX])}
            y={mid2 - (BINS.kde.density[secondPeakX] / peak) * h(VIOLIN_H) - 40}
            opacity={ease(frame, shapeAt, 12)}
            color={STAT_INK}
            size={21}
          >
            the second peak
          </Tag>
          </div>

        </Drift>
      </div>

      <NextLine at={startingAt - 2} x={160} y={y(850)} width={1000}>
        <Mark at={whatAt}>what a probability means</Mark>.
      </NextLine>
    </AbsoluteFill>
  );
};
