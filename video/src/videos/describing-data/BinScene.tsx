import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BINS } from "./data";
import { DATA, Drift, lerp, Mark, Pulse, STAT, Svg, Tag } from "./parts";

type Level = "5" | "20" | "80";
const LEVELS: Level[] = ["5", "20", "80"];
/** Fine bins (of 0.25) per bin at each level: the three binnings nest. */
const PER: Record<Level, number> = { "5": 16, "20": 4, "80": 1 };
const FINE = 80;
const BIG: XScale = { lo: 2, hi: 22, x0: 260, x1: 1660 };
const BIG_BASE = 840;
const SMALL_BASE = 800;
/** The density at fine bin i, as level L draws it. */
const density = (level: Level, i: number) => BINS.sets[level].density[Math.floor(i / PER[level])];

/** A histogram of the thousand values at one binning, or between two. */
const Histogram: React.FC<{
  scale: XScale;
  base: number;
  unit: number;
  from: Level;
  to: Level;
  t: number;
  grow?: number;
  opacity?: number;
}> = ({ scale, base, unit, from, to, t, grow = 1, opacity = 1 }) => {
  const fineW = (scale.x1 - scale.x0) / FINE;
  const bounds = (level: Level) =>
    Array.from({ length: Number(level) - 1 }, (_, j) => scale.x0 + (j + 1) * PER[level] * fineW);
  return (
    <Svg opacity={opacity}>
      {Array.from({ length: FINE }, (_, i) => {
        const d = lerp(density(from, i), density(to, i), t) * grow;
        if (d <= 0) return null;
        return <rect key={i} x={scale.x0 + i * fineW} y={base - d * unit} width={fineW + 0.4} height={d * unit} fill={DATA} />;
      })}
      {/* Paper between bars: each binning's own edges. */}
      {LEVELS.map((level) => {
        const o = level === to ? t : level === from ? 1 - t : 0;
        if (o <= 0) return null;
        const w = Number(level) > 40 ? 1 : 2.5;
        return bounds(level).map((x, j) => (
          <rect key={`${level}-${j}`} x={x - w / 2} y={base - 0.42 * unit} width={w} height={0.42 * unit} fill={PAPER} opacity={o} />
        ));
      })}
      <line x1={scale.x0} x2={scale.x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
    </Svg>
  );
};

/**
 * Part 4, second scene: the bin trap, on the lesson's own chart data. One
 * thousand values re-binned live at five, twenty and eighty bins, a slider
 * for the knob, then the three side by side.
 */
export const BinScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const binsFrom = n.beat("bins").from;
  const histAt = n.word("bins", "histogram's");
  const knobAt = n.word("bins", "knob");
  const fiveAt = n.word("bins", "five bins");
  const twentyAt = n.word("bins", "twenty");
  const eightyAt = n.word("bins", "eighty");
  const wideAt = n.word("wide", "Wide");
  const blocksAt = n.word("wide", "blocks");
  const narrowAt = n.word("wide", "Narrow");
  const peakAt = n.word("wide", "peak");
  const believeAt = n.word("believe", "believe");
  const lookAt = n.word("believe", "look");

  // The sequence of binnings the big panel shows.
  const steps: { level: Level; at: number }[] = [
    { level: "5", at: histAt },
    { level: "20", at: twentyAt - 4 },
    { level: "80", at: eightyAt - 4 },
    { level: "5", at: wideAt - 4 },
    { level: "80", at: narrowAt - 4 },
    { level: "20", at: believeAt - 4 },
  ];
  let k = 0;
  while (k + 1 < steps.length && frame >= steps[k + 1].at) k++;
  const cur = steps[k];
  const prev = k > 0 ? steps[k - 1] : cur;
  const t = k === 0 ? 1 : ease(frame, cur.at, 18);
  const grow = ease(frame, histAt - 2, 20);
  const unit = h(2250);
  const three = ease(frame, lookAt - 6, 20);

  // The knob: a slider whose handle follows the bin count.
  const slot = (level: Level) => LEVELS.indexOf(level);
  const handle = lerp(slot(prev.level), slot(cur.level), t);
  const SL = { x0: 1240, x1: 1640, y: y(392) };
  const hx = lerp(SL.x0, SL.x1, handle / 2);
  const knobIn = ease(frame, knobAt - 4, 14) * (1 - three);
  const levelName = t < 0.5 ? prev.level : cur.level;

  const small = (i: number): XScale => ({ lo: 2, hi: 22, x0: 160 + i * 560, x1: 160 + i * 560 + 480 });

  return (
    <AbsoluteFill>
      {/* ── Sound: the first bars, each re-binning, the three panels ── */}
      <Sfx name="el-sprinkle" at={histAt - 2} level={-34} />
      <Sfx name="el-tap" at={twentyAt - 4} level={-29} />
      <Sfx name="el-tap" at={eightyAt - 4} level={-29} />
      <Sfx name="el-tap" at={wideAt - 4} level={-30} />
      <Sfx name="el-tap" at={narrowAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={lookAt - 6} level={-33} />

      {/* ── Headline ── */}
      <Ink at={binsFrom - 4} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Bin width is a <Mark at={knobAt - 2}>knob</Mark>.
      </Ink>

      <FigLabel n="12" title="One thousand values, the same in every panel" at={histAt - 6} x={160} y={y(330)} />

      {/* ── The knob ── */}
      {knobIn > 0 ? (
        <>
          <Svg opacity={knobIn}>
            <line x1={SL.x0} x2={SL.x1} y1={SL.y} y2={SL.y} stroke={INK_SOFT} strokeWidth={3} strokeLinecap="round" />
            {LEVELS.map((level, i) => (
              <line key={level} x1={lerp(SL.x0, SL.x1, i / 2)} x2={lerp(SL.x0, SL.x1, i / 2)} y1={SL.y - 9} y2={SL.y + 9} stroke={INK_SOFT} strokeWidth={2} />
            ))}
            <circle cx={hx} cy={SL.y} r={14} fill={STAT} stroke={PAPER} strokeWidth={2.5} />
          </Svg>
          <Pulse x={hx} y={SL.y} at={fiveAt - 2} color={STAT} r={14} />
          {LEVELS.map((level, i) => (
            <Tag key={level} x={lerp(SL.x0, SL.x1, i / 2)} y={SL.y + 22} opacity={knobIn} color={level === levelName ? INK : INK_SOFT} size={21} bold={level === levelName}>
              {level} bins
            </Tag>
          ))}
        </>
      ) : null}

      {/* ── One panel, re-binned live ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - three }}>
        <Drift from={binsFrom} to={lookAt} scale={0.02} origin={[960, y(BIG_BASE)]}>
          <Histogram scale={BIG} base={y(BIG_BASE)} unit={unit} from={prev.level} to={cur.level} t={t} grow={grow} />
          {[2, 7, 12, 17, 22].map((v) => (
            <Tag key={v} x={sx(BIG, v)} y={y(BIG_BASE) + 12} opacity={ease(frame, histAt, 14)} color={INK_SOFT} size={20}>
              {v}
            </Tag>
          ))}
          <Tag x={sx(BIG, 9)} y={y(BIG_BASE) - h(430)} opacity={ease(frame, blocksAt - 4, 10) * (1 - ease(frame, narrowAt - 6, 10))} color={INK_SOFT} size={22}>
            a few blocks
          </Tag>
          <Pulse x={sx(BIG, 2 + 0.25 * 26.5)} y={y(BIG_BASE) - density("80", 26) * unit} at={peakAt - 4} color={STAT} r={6} />
          <Pulse x={sx(BIG, 2 + 0.25 * 37.5)} y={y(BIG_BASE) - density("80", 37) * unit} at={peakAt} color={STAT} r={6} />
          <Pulse x={sx(BIG, 2 + 0.25 * 49.5)} y={y(BIG_BASE) - density("80", 49) * unit} at={peakAt + 4} color={STAT} r={6} />
        </Drift>
      </div>

      {/* ── Then all three, side by side ── */}
      {three > 0 ? (
        <Drift from={lookAt} to={lookAt + 90} scale={0.015} origin={[960, y(SMALL_BASE)]}>
          {LEVELS.map((level, i) => {
            const p = ease(frame, lookAt - 6 + i * 5, 18);
            return (
              <React.Fragment key={level}>
                <Histogram scale={small(i)} base={y(SMALL_BASE)} unit={h(1800)} from={level} to={level} t={1} opacity={p} />
                <Tag x={small(i).x0} y={y(SMALL_BASE) - h(400)} opacity={p} size={23} bold align="left">
                  {level} bins
                </Tag>
              </React.Fragment>
            );
          })}
        </Drift>
      ) : null}
      <Ink at={believeAt - 4} dur={16} style={{ left: 160, top: y(910), whiteSpace: "nowrap" }}>
        <span style={{ ...label(22, INK_SOFT) }}>The data doesn't say which one is right</span>
      </Ink>
    </AbsoluteFill>
  );
};
