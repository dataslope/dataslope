import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { ColumnRule, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { jitter } from "./data";
import { Bracket, curvePath, DATA, DOT, Head, Kicker, Label, lerp, Mark, phi, RAW, STAT, STAT_INK, Svg } from "./parts";

/** The schematic mounds: two groups, their gap and their width. */
const CX = 1340;
const UNIT = 120;
const M_BASE = 600;
const M_TALL = 220;
/** The three designs: three plain columns of one width, each a title and
 *  under it a sketch of the data it takes, both set flush to the column's
 *  left edge, with a hairline centred in each of the two equal gaps instead
 *  of a box round each. The widest column as drawn (the middle one's two
 *  strips) runs about 412px, so 420px columns with 170px gaps span the
 *  page's 160 to 1760. */
const DESIGN_Y = 690;
const DESIGN_W = 420;
const DESIGN_GAP = 170;
const DESIGN_X = [0, 1, 2].map((i) => 160 + i * (DESIGN_W + DESIGN_GAP));
const RULE_X = [0, 1].map((i) => DESIGN_X[i] + DESIGN_W + DESIGN_GAP / 2);
/** How far in each sketch's first mark sits, so the sketch can be set flush
 *  left: its leftmost dot's centre, less the dot's radius. */
const DOT_R = 6;
/** A title's line, then its sketch 11px under it, in px. */
const SKETCH_DY = 42;

const J1 = jitter(51, 14);
const J2 = jitter(52, 14);

/**
 * The t-statistic as a ratio, signal over noise, shown on two schematic
 * groups pulled apart and pushed together; then the three designs it comes
 * in.
 */
export const RatioScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const ratioFrom = n.beat("ratio").from;
  const ratioAt = n.word("ratio", "ratio");
  const gapAt = n.word("ratio", "gap you observed");
  const noiseAt = n.word("ratio", "noise");
  const seAt = n.word("ratio", "standard error");
  const bigAt = n.word("big", "big t");
  const dwarfsAt = n.word("big", "dwarfs");
  const smallAt = n.word("big", "small one");
  const wobbleAt = n.word("big", "wobble");
  const designsAt = n.word("designs", "three designs");
  const targetAt = n.word("designs", "target");
  const separateAt = n.word("designs", "two separate groups");
  const sameUnitsAt = n.word("designs", "same units");
  const twiceAt = n.word("designs", "twice");

  // The mounds: as drawn, then apart and narrow (big t), then together and wide (small t).
  const toBig = ease(frame, bigAt - 4, 22);
  const toSmall = ease(frame, smallAt - 4, 22);
  const half = lerp(lerp(1.0, 1.55, toBig), 0.42, toSmall);
  const sd = lerp(lerp(0.62, 0.42, toBig), 0.95, toSmall);
  const mounds = ease(frame, ratioFrom + 4, 20);
  const mx = (v: number) => CX + v * UNIT;
  const my = (u: number) => y(M_BASE) - h(M_TALL) * u;
  const a = -half;
  const b = half;
  const peakY = my(1);
  const widthY = y(M_BASE) - (y(M_BASE) - peakY) * 0.5;
  const sig = ease(frame, gapAt - 2, 14);
  const noi = ease(frame, seAt - 4, 14);

  const design = (i: number, at: number, title: string, inset: number, draw: React.ReactNode) => {
    const p = ease(frame, at - 4, 14);
    if (p <= 0) return null;
    return (
      <div
        style={{
          position: "absolute",
          left: DESIGN_X[i],
          top: y(DESIGN_Y) + 18,
          opacity: p,
          transform: `translateY(${(1 - p) * 18}px)`,
        }}
      >
        <Label size={26}>{title}</Label>
        <svg width={DESIGN_W} height={sketchH} style={{ position: "absolute", left: 0, top: SKETCH_DY, overflow: "visible" }}>
          <g transform={`translate(${-inset} 0)`}>{draw}</g>
        </svg>
      </div>
    );
  };
  const sketchH = h(200) - 70;
  const strip = (j: readonly number[], cx: number, cy: number, spread: number, fill: string) =>
    j.map((v, k) => <circle key={k} cx={cx + (v - 0.5) * spread} cy={cy + ((k % 3) - 1) * 9} r={DOT_R} fill={fill} stroke={PAPER} strokeWidth={1.2} />);
  const stripInset = (j: readonly number[], cx: number, spread: number) => cx + (Math.min(...j) - 0.5) * spread - DOT_R;

  return (
    <AbsoluteFill>
      {/* ── Sound: the two halves of the ratio, the mounds moving, the designs ── */}
      <Sfx name="el-tap" at={gapAt - 2} level={-29} />
      <Sfx name="el-tap" at={seAt - 4} level={-30} />
      <Sfx name="el-whoosh" at={bigAt - 4} level={-34} />
      <Sfx name="el-whoosh" at={smallAt - 4} level={-34} />
      {[targetAt, separateAt, sameUnitsAt].map((at) => (
        <Sfx key={at} name="el-pop" at={at - 4} level={-30} />
      ))}

      <Kicker at={ratioFrom - 10}>t-tests: signal over noise</Kicker>
      <Head a="Signal," b="over noise." at={ratioFrom - 6} bAt={noiseAt - 6} />

      {/* ── The ratio ── */}
      <div style={{ position: "absolute", left: 160, top: y(330), opacity: ease(frame, ratioAt - 6, 14), display: "flex", alignItems: "center", gap: 28 }}>
        {/* "t =" at the size of the terms it equals, as a display formula
            sets it: at twice their size it read as a second line size. */}
        <span style={{ ...body(44, true), color: INK }}>t =</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span style={{ ...body(40, true), color: STAT_INK, opacity: sig, whiteSpace: "nowrap" }}>the gap you observed</span>
          <div style={{ width: 430 * ease(frame, ratioAt - 4, 16), height: 3, background: INK }} />
          <span style={{ ...body(40, true), color: INK, opacity: noi, whiteSpace: "nowrap" }}>its standard error</span>
        </div>
      </div>
      <Note at={bigAt} x={160 + 140} y={y(330) + 200}>
        <Label size={22} color={INK_SOFT} weight={520}>
          <Mark at={dwarfsAt}>big t: the gap dwarfs the noise</Mark>
        </Label>
      </Note>
      <Note at={smallAt + 4} x={160 + 140} y={y(330) + 240}>
        <Label size={22} color={INK_SOFT} weight={520}>
          <Mark at={wobbleAt}>small t: an ordinary wobble</Mark>
        </Label>
      </Note>

      {/* ── The mounds ── */}
      {mounds > 0 ? (
        <Svg opacity={mounds}>
          <line x1={CX - 420} x2={CX + 420} y1={y(M_BASE)} y2={y(M_BASE)} stroke={INK} strokeWidth={1.6} />
          {[a, b].map((m, i) => (
            <path
              key={i}
              d={curvePath((v) => phi((v - m) / sd) / phi(0), -3.5, 3.5, mx, my, y(M_BASE))}
              fill={i ? DATA : RAW}
              opacity={i ? 0.45 : 0.75}
            />
          ))}
          {[a, b].map((m, i) => (
            <line key={`m${i}`} x1={mx(m)} x2={mx(m)} y1={y(M_BASE)} y2={peakY - 8} stroke={i ? DATA : INK_SOFT} strokeWidth={2.4} />
          ))}
        </Svg>
      ) : null}
      {/* The signal: the gap between the two means. */}
      <Bracket x0={mx(a)} x1={mx(b)} y={peakY - 24} at={gapAt - 2} color={STAT} up width={3} />
      <Note at={gapAt + 2} x={(mx(a) + mx(b)) / 2} y={peakY - 74} from="up">
        <span style={{ display: "inline-block", transform: "translateX(-50%)" }}>
          <Label size={22} color={STAT_INK}>
            signal
          </Label>
        </span>
      </Note>
      {/* The noise: each mound is where a group's average could land, so its
          width is the standard error, not the spread of the raw values. */}
      <Bracket x0={mx(b) - sd * UNIT} x1={mx(b) + sd * UNIT} y={widthY} at={seAt - 4} color={INK} width={2.4} />
      <Note at={seAt} x={mx(b) + sd * UNIT + 14} y={widthY - 16}>
        <Label size={22}>noise</Label>
      </Note>
      <Note at={noiseAt} x={CX + 420} y={y(M_BASE) + 12} align="right">
        <Label size={21} color={INK_SOFT} weight={520}>
          each mound: where a group&apos;s average could land
        </Label>
      </Note>

      {/* ── The three designs ── */}
      <Ink at={designsAt - 4} dur={14} style={{ left: 160, top: y(DESIGN_Y) - 46, whiteSpace: "nowrap" }}>
        <Label size={22} color={INK_SOFT}>
          Three designs
        </Label>
      </Ink>
      {design(
        0,
        targetAt,
        "One group against a target",
        stripInset(J1, 200, 220),
        <>
          {strip(J1, 200, sketchH / 2, 220, DOT)}
          <line x1={250} x2={250} y1={4} y2={sketchH - 4} stroke={INK} strokeWidth={2.2} strokeDasharray="6 5" />
        </>,
      )}
      <ColumnRule x={RULE_X[0]} top={y(DESIGN_Y) + 18} height={SKETCH_DY + sketchH} at={separateAt - 2} />
      {design(
        1,
        separateAt,
        "Two separate groups",
        stripInset(J1, 130, 170),
        <>
          {strip(J1, 130, sketchH / 2, 170, RAW)}
          {strip(J2, 320, sketchH / 2, 170, DATA)}
        </>,
      )}
      <ColumnRule x={RULE_X[1]} top={y(DESIGN_Y) + 18} height={SKETCH_DY + sketchH} at={sameUnitsAt - 2} />
      {design(
        2,
        sameUnitsAt,
        "The same units, measured twice",
        90 + Math.min(...J1.slice(0, 6)) * 60 - DOT_R,
        <>
          {J1.slice(0, 6).map((v, k) => {
            const yy = 12 + k * ((sketchH - 24) / 5);
            const x0 = 90 + v * 60;
            const x1 = x0 + 150 + J2[k] * 40;
            return (
              <g key={k}>
                <line x1={x0} x2={lerp(x0, x1, ease(frame, twiceAt - 4 + k * 2, 10))} y1={yy} y2={yy} stroke={STAT} strokeWidth={2} opacity={0.7} />
                <circle cx={x0} cy={yy} r={DOT_R} fill={RAW} stroke={PAPER} strokeWidth={1.2} />
                <circle cx={x1} cy={yy} r={DOT_R * ease(frame, twiceAt + 4 + k * 2, 8)} fill={DATA} stroke={PAPER} strokeWidth={1.2} />
              </g>
            );
          })}
        </>,
      )}
    </AbsoluteFill>
  );
};
