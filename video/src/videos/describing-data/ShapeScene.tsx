import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, fmt, headline, HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HEIGHTS, SKEW, type Shape } from "./data";
import { Arrow, DATA, Drift, Kicker, lerp, Mark, Pulse, SECOND, SECOND_INK, STAT, STAT_INK, Svg, Tag } from "./parts";

const PANEL_W = 480;
const PANEL_X = { left: 170, symmetric: 720, right: 1270 } as const;
/** The right-skewed panel while it is taught alone: large, and centered. */
const SOLO_W = 1000;
const SOLO_X = 960 - SOLO_W / 2;
const PANEL_BASE = 720;
const PANEL_TOP = 420;
/** The two height groups. */
const HX: XScale = { lo: 140, hi: 210, x0: 220, x1: 1700 };
const H_BASE = 850;

const signed = (v: number) => `${v < 0 ? "−" : "+"}${fmt(Math.abs(v), 1)}`;

/** One of the three skew panels: bars, then the median and the mean. */
const Panel: React.FC<{
  shape: Shape;
  x: number;
  w?: number;
  name: string;
  at: number;
  marks: number;
  gapAt: number;
  tail?: "left" | "right";
  tailAt?: number;
}> = ({ shape, x, w = PANEL_W, name, at, marks, gapAt, tail, tailAt = 0 }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const X: XScale = { lo: shape.lo, hi: shape.hi, x0: x, x1: x + w };
  const base = y(PANEL_BASE);
  const peak = Math.max(...shape.counts);
  const unit = (base - y(PANEL_TOP) - h(40)) / peak;
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const m = ease(frame, marks - 4, 14);
  const top = y(PANEL_TOP) + h(10);
  const medX = sx(X, shape.median);
  const meanX = sx(X, shape.mean);
  const tailFrom = tail === "right" ? sx(X, shape.lo + (shape.hi - shape.lo) * 0.52) : sx(X, shape.lo + (shape.hi - shape.lo) * 0.48);
  const tailTo = tail === "right" ? sx(X, shape.hi - 1) : sx(X, shape.lo + 1);
  return (
    <>
      <Tag x={x} y={y(PANEL_TOP) - h(40)} opacity={p} size={23} bold align="left">
        {name}
      </Tag>
      <Bars counts={shape.counts} lo={shape.lo} bin={shape.bin} scale={X} base={base} unit={unit} gap={2} grow={(i) => ease(frame, at + i * 0.6, 12)} />
      <Svg opacity={p}>
        <line x1={X.x0} x2={X.x1} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.4} />
      </Svg>
      {m > 0 ? (
        <Svg opacity={m}>
          <line x1={medX} x2={medX} y1={top} y2={base} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <line x1={meanX} x2={meanX} y1={top} y2={base} stroke={STAT} strokeWidth={3.4} strokeLinecap="round" />
        </Svg>
      ) : null}
      {tail ? (
        <Arrow from={[tailFrom, base - h(150)]} to={[tailTo, base - h(150)]} at={tailAt} dur={18} color={INK_SOFT} width={2.2} />
      ) : null}
      <Tag x={x + w / 2} y={base + h(16)} opacity={ease(frame, gapAt - 4, 12)} size={22}>
        mean − median <span style={{ color: STAT_INK, fontWeight: 700 }}>{signed(shape.gap)}</span>
      </Tag>
    </>
  );
};

/**
 * Part 3 opens: skew named for its tail, on the lesson's three samples, then
 * two height groups mixed in one column, whose mean falls in the valley.
 */
export const ShapeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const shapeFrom = n.beat("shape").from;
  const shapeAt = n.word("shape", "shape");
  const tailAt = n.word("shape", "long tail");
  const peakAt = n.word("shape", "peak");
  const rightAt = n.word("right-tail", "right");
  const aboveAt = n.word("right-tail", "above");
  const leftAt = n.word("left-tail", "left");
  const belowAt = n.word("left-tail", "below");
  const symAt = n.word("left-tail", "Symmetric");
  const togetherAt = n.word("left-tail", "together");
  const peaksFrom = n.beat("two-peaks").from;
  const peaksAt = n.word("two-peaks", "Two peaks");
  const groupsAt = n.word("two-peaks", "two groups", { nth: 1 });
  const mixAt = n.word("two-peaks", "Mix");
  const valleyAt = n.word("two-peaks", "valley");
  const columnAt = n.word("two-peaks", "one column");
  const heightsAt = n.word("two-peaks", "two groups", { nth: 2 });
  const landsAt = n.word("two-peaks", "lands");
  const neitherAt = n.word("neither", "neither");
  const tailsAt = n.word("tails-in", "tails");
  const middleAt = n.word("tails-in", "middle");
  const mattersAt = n.word("tails-in", "matter");

  const phaseB = ease(frame, peaksFrom - 6, 18);
  /** The right-skewed panel shrinks into its slot as the other two arrive. */
  const shrink = ease(frame, leftAt - 10, 24);
  const rightX = lerp(SOLO_X, PANEL_X.right, shrink);
  const rightW = lerp(SOLO_W, PANEL_W, shrink);
  const split = ease(frame, groupsAt - 2, 18);
  const hb = y(H_BASE);
  const hUnit = h(1.95);
  const meanIn = ease(frame, landsAt - 4, 22);
  const meanX = sx(HX, HEIGHTS.mean);
  const peakH = Math.max(...HEIGHTS.counts) * hUnit;

  // The right-skewed panel's peak, for "not for the peak".
  const right = SKEW.right;
  const rightPeak = right.counts.indexOf(Math.max(...right.counts));
  const rX: XScale = { lo: right.lo, hi: right.hi, x0: rightX, x1: rightX + rightW };
  const rUnit = (y(PANEL_BASE) - y(PANEL_TOP) - h(40)) / Math.max(...right.counts);

  return (
    <AbsoluteFill>
      {/* ── Sound: each panel, the split into two groups, the mean ── */}
      <Sfx name="el-sprinkle" at={shapeAt - 4} level={-34} />
      <Sfx name="el-pencil" at={tailAt - 2} level={-34} />
      <Sfx name="el-sprinkle" at={leftAt - 6} level={-35} />
      <Sfx name="el-sprinkle" at={peaksAt - 4} level={-33} />
      <Sfx name="el-whoosh" at={groupsAt - 2} level={-34} />
      <Sfx name="el-tap" at={landsAt - 4} level={-28} />

      <Kicker at={shapeFrom - 10}>Shape, tails and outliers</Kicker>

      {/* ── Headlines ── */}
      <Ink at={shapeFrom - 4} dur={20} out={peaksFrom - 6} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Skew is named for its tail.
      </Ink>
      <Ink at={peaksFrom - 2} dur={20} style={{ left: 92, top: y(150), ...headline(80), whiteSpace: "nowrap" }}>
        Two peaks, two groups.
      </Ink>

      {/* ── Phase A: three samples of five thousand ── */}
      <div style={{ position: "absolute", inset: 0, opacity: 1 - phaseB, transform: `translateY(${-phaseB * 40}px)` }}>
        <FigLabel n="7" title="Three samples of 5,000, with each one's median and mean" at={shapeAt - 6} x={160} y={y(330)} />
        <Drift from={shapeFrom} to={peaksFrom} scale={0.02} origin={[960, y(PANEL_BASE)]}>
          <Panel shape={SKEW.left} x={PANEL_X.left} name="Left-skewed" at={leftAt - 6} marks={belowAt} gapAt={belowAt + 8} tail="left" tailAt={leftAt} />
          <Panel shape={SKEW.symmetric} x={PANEL_X.symmetric} name="Symmetric" at={symAt - 6} marks={togetherAt} gapAt={togetherAt + 6} />
          <Panel
            shape={SKEW.right}
            x={rightX}
            w={rightW}
            name="Right-skewed"
            at={shapeAt - 2}
            marks={aboveAt}
            gapAt={aboveAt + 8}
            tail="right"
            tailAt={tailAt - 2}
          />
          <Pulse
            x={sx(rX, right.lo + (rightPeak + 0.5) * right.bin)}
            y={y(PANEL_BASE) - right.counts[rightPeak] * rUnit}
            at={peakAt - 2}
            color={INK}
            r={6}
          />
          <Tag
            x={sx(rX, right.lo + (rightPeak + 0.5) * right.bin)}
            y={y(PANEL_BASE) - right.counts[rightPeak] * rUnit - 44}
            opacity={ease(frame, peakAt - 2, 10) * (1 - ease(frame, rightAt - 2, 10))}
            color={INK_SOFT}
            size={21}
          >
            the peak
          </Tag>
          <Tag x={rightX + rightW} y={y(PANEL_BASE) - h(190)} opacity={ease(frame, tailAt + 6, 10) * (1 - ease(frame, aboveAt - 4, 10))} color={INK_SOFT} size={21} align="right">
            the tail
          </Tag>
          <Tag x={rightX + rightW / 2 + 40} y={y(PANEL_TOP) - h(8)} opacity={ease(frame, aboveAt, 12)} size={21} align="left">
            <span style={{ color: INK }}>median</span> · <span style={{ color: STAT_INK }}>mean</span>
          </Tag>
        </Drift>
      </div>

      {/* ── Phase B: two groups' heights in one column ── */}
      {phaseB > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: phaseB }}>
          <FigLabel n="8" title="Heights from two groups, mixed in one column, in cm" at={peaksFrom} x={160} y={y(330)} />
          <Drift from={peaksFrom} to={middleAt + 40} scale={0.02} origin={[960, hb]}>
            {/* The tails, picked out as the next scene's subject. */}
            {ease(frame, tailsAt - 4, 14) > 0 ? (
              <Svg opacity={ease(frame, tailsAt - 4, 14)}>
                <rect x={HX.x0 - 10} y={hb - h(120)} width={sx(HX, 152) - HX.x0 + 10} height={h(120)} fill={HIGHLIGHT} opacity={0.5} />
                <rect x={sx(HX, 198)} y={hb - h(120)} width={HX.x1 + 10 - sx(HX, 198)} height={h(120)} fill={HIGHLIGHT} opacity={0.5} />
              </Svg>
            ) : null}
            <Bars
              counts={HEIGHTS.counts}
              lo={HEIGHTS.lo}
              bin={HEIGHTS.bin}
              scale={HX}
              base={hb}
              unit={hUnit}
              gap={3}
              grow={(i) => ease(frame, peaksAt - 4 + i * 0.8, 12)}
              overlay={{ counts: HEIGHTS.countsB, color: `color-mix(in srgb, ${SECOND} ${(split * 100).toFixed(1)}%, ${DATA})` }}
            />
            <Svg opacity={ease(frame, peaksAt - 6, 14)}>
              <line x1={HX.x0} x2={HX.x1} y1={hb + 0.5} y2={hb + 0.5} stroke={INK} strokeWidth={1.6} />
            </Svg>
            {[150, 165, 175, 185, 200].map((v) => (
              <Tag key={v} x={sx(HX, v)} y={hb + 12} opacity={ease(frame, peaksAt, 14)} color={INK_SOFT} size={20}>
                {v}
              </Tag>
            ))}
            <Tag x={sx(HX, HEIGHTS.muA)} y={hb - peakH - h(64)} opacity={ease(frame, mixAt - 2, 12)} color={BLUE_INK} size={23} bold>
              <Mark at={neitherAt - 2}>one group, around {HEIGHTS.muA}</Mark>
            </Tag>
            <Tag x={sx(HX, HEIGHTS.muB)} y={hb - peakH - h(64)} opacity={ease(frame, heightsAt - 2, 12)} color={SECOND_INK} size={23} bold>
              <Mark at={neitherAt + 4}>another, around {HEIGHTS.muB}</Mark>
            </Tag>
            {meanIn > 0 ? (
              <Svg>
                <line x1={meanX} x2={meanX} y1={hb} y2={hb - (peakH - h(30)) * meanIn} stroke={STAT} strokeWidth={3.6} strokeLinecap="round" />
              </Svg>
            ) : null}
            <Tag x={meanX} y={hb - peakH + h(30) - 34} opacity={ease(frame, valleyAt + 4, 12)} color={STAT_INK} size={23} bold knockout>
              Mean {fmt(HEIGHTS.mean, 1)}
            </Tag>
            <Pulse x={meanX} y={hb - h(100)} at={neitherAt - 2} color={STAT} r={8} />
            <Pulse x={meanX} y={hb - h(100)} at={middleAt - 2} color={STAT} r={8} />
            <Tag x={meanX} y={hb + h(44)} opacity={ease(frame, middleAt - 4, 12)} color={STAT_INK} size={21}>
              the middle
            </Tag>
            <Tag x={sx(HX, 146)} y={hb - h(120) - 32} opacity={ease(frame, mattersAt - 2, 12)} color={INK_SOFT} size={21}>
              a tail
            </Tag>
            <Tag x={sx(HX, 204)} y={hb - h(120) - 32} opacity={ease(frame, mattersAt + 6, 12)} color={INK_SOFT} size={21}>
              a tail
            </Tag>
            <Tag x={sx(HX, 206)} y={hb - h(60)} opacity={ease(frame, columnAt - 2, 12) * (1 - ease(frame, mixAt - 4, 10))} color={INK_SOFT} size={21} align="right">
              one column
            </Tag>
          </Drift>
          <Ink at={tailsAt - 2} dur={16} style={{ left: 160, top: y(910), whiteSpace: "nowrap" }}>
            <span style={label(22, INK_SOFT)}>The tails: how often values land far out</span>
          </Ink>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
