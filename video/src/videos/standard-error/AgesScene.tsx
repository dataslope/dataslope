import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { Axis, normalPdf, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_INK,
  body,
  fmt,
  headline,
  INK_SOFT,
  label,
  note,
  PAPER,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AGE_DOTS, AGES } from "./data";
import { Rule, Span } from "./parts";
import { PartName } from "../sampling/PartName";
import { Marker, swell } from "../sampling/emphasis";

/** One-year bins, so each column of dots is one year of age. */
const X: XScale = { lo: 10, hi: 80, x0: 160, x1: 1760 };
const TICKS = [10, 20, 30, 40, 50, 60, 70, 80];
const BASE = 772;
const PITCH = 19;
const R = 8;
const SD_Y = 476;
const SE_Y = 404;
const BELL_BASE = 382;
const BELL_H = 50;

const years = (v: number) => (v === 80 ? "80 years" : String(v));

/**
 * Act 1, hook to "sampling distribution": the two names, then two hundred
 * ages as a dot plot. The standard deviation is a bracket across the data;
 * the average is a red line that moves when the sample changes, and the
 * standard error is how far: a bracket a fourteenth as wide.
 */
export const AgesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const deviationAt = n.word("hook", "deviation");
  const errorAt = n.word("hook", "error");
  // "get mixed up": the word the two names share is marked in both.
  const mixedAt = n.word("hook", "mixed up");
  // "came from one sample": the two hundred dots, once more, as one sample.
  const oneSampleAt = n.word("move", "one sample");
  const spreadAt = n.word("hook", "spread");
  const takeAt = n.word("sd", "Take");
  const dataAt = n.word("sd", "spread of the data");
  const halfAt = n.word("sd", "ten and a half");
  const averageAt = n.word("move", "average");
  const differentAt = n.word("move", "different");
  const movesAt = n.word("move", "moves");
  const howFarAt = n.word("se", "How far");
  const seAt = n.word("se", "standard error");
  const estimateAt = n.word("se", "spread of the estimate");
  const widthAt = n.word("se", "width");

  const mx = sx(X, AGES.mean);
  const spacing = (movesAt - differentAt) / AGES.others.length;

  return (
    <AbsoluteFill>
      {/* ── Sound (merged video only; the standalone has sfx off): the ages, the
          standard deviation, the other samples' averages, the standard error,
          its bell ── */}
      <Sfx name="el-sprinkle" at={takeAt} level={-34} />
      <Sfx name="el-pencil" at={dataAt} level={-34} />
      <Sfx name="el-sprinkle" at={differentAt} level={-35} />
      <Sfx name="el-pencil" at={howFarAt} level={-34} />
      <Sfx name="el-pop" at={widthAt - 4} level={-30} />

      {/* ── The two names, each with what it is the spread of ── */}
      <Ink at={2} dur={14} style={{ left: 96, top: y(112) }}>
        <span style={label(20, ACCENT_INK)}>
          <PartName />Two spreads, easily confused
        </span>
      </Ink>
      {/* Each name, then what it is the spread of: "the spread of" on both
          lines when the narration says they both measure one, and the
          object only when it is named. One flow per line, so the words
          follow each other in any face. */}
      <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", alignItems: "baseline", gap: "0.3em", ...headline(64), whiteSpace: "nowrap" }}>
        <Ink at={deviationAt - 6} dur={18} style={{ position: "relative" }}>
          <span style={{ display: "inline-block", transformOrigin: "right 80%", transform: `scale(${swell(frame, mixedAt - 2, 0.06, 20)})` }}>
            <Marker at={mixedAt - 2} out={spreadAt - 6}>Standard</Marker>
          </span>{" "}
          deviation
        </Ink>
        <span style={{ display: "flex", alignItems: "baseline", gap: "0.25em", ...body(36, true), color: BLUE_INK }}>
          <Ink at={spreadAt - 2} dur={14} style={{ position: "relative" }}>
            the spread of
          </Ink>
          <Ink at={dataAt + 4} dur={12} style={{ position: "relative" }}>
            the data
          </Ink>
        </span>
      </div>
      <div style={{ position: "absolute", left: 92, top: y(236), display: "flex", alignItems: "baseline", gap: "0.3em", ...headline(64, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
        <Ink at={errorAt - 6} dur={18} style={{ position: "relative" }}>
          <span style={{ display: "inline-block", transformOrigin: "right 80%", transform: `scale(${swell(frame, mixedAt + 4, 0.06, 20)})` }}>
            <Marker at={mixedAt + 4} out={spreadAt - 4}>Standard</Marker>
          </span>{" "}
          error
        </Ink>
        <span style={{ display: "flex", alignItems: "baseline", gap: "0.25em", ...body(36, true), color: ACCENT_INK }}>
          <Ink at={spreadAt + 4} dur={14} style={{ position: "relative" }}>
            the spread of
          </Ink>
          <Ink at={estimateAt + 4} dur={12} style={{ position: "relative" }}>
            the estimate
          </Ink>
        </span>
      </div>

      {/* ── Fig. 1: the ages ── */}
      <FigLabel n="1" title={`Ages of ${AGES.n} customers, in years`} at={takeAt - 6} x={160} y={y(330)} />
      <Axis scale={X} base={y(BASE)} ticks={TICKS} at={takeAt - 6} format={years} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {AGE_DOTS.map((d, i) => {
          const p = pop(frame, takeAt + i * 0.2, fps, 16);
          if (p <= 0.01) return null;
          const cx = sx(X, d.bin + 0.5);
          return (
            <circle
              key={i}
              cx={cx}
              cy={y(BASE - 10 - d.row * PITCH)}
              r={R * Math.min(1.15, p) * swell(frame, oneSampleAt - 2 + i * 0.06, 0.3, 16)}
              fill={BAR}
              stroke={PAPER}
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
      <Note at={takeAt + 30} x={160} y={y(826)} out={differentAt}>
        <span style={note(21, INK_SOFT)}>Each dot is one customer.</span>
      </Note>

      {/* The standard deviation: a bracket one SD either side of the average. */}
      <Span x0={sx(X, AGES.mean - AGES.sd)} x1={sx(X, AGES.mean + AGES.sd)} y={y(SD_Y)} at={dataAt} dur={18} color={BLUE_INK} />
      <Note at={halfAt - 2} x={sx(X, AGES.mean + AGES.sd) + 18} y={y(SD_Y - 15)}>
        <div style={{ ...note(24, BLUE_INK), fontWeight: 700 }}>± {fmt(AGES.sd)} years</div>
        <div style={note(20, INK_SOFT)}>one standard deviation</div>
      </Note>

      {/* The average, and the averages other samples would have had. */}
      {AGES.others.map((o, i) => {
        const at = differentAt + i * spacing;
        const flash = 1 - ease(frame, at + 5, 12);
        return (
          <Rule
            key={i}
            x={sx(X, o)}
            y0={y(BASE)}
            y1={y(SE_Y + 26)}
            at={at}
            dur={7}
            color={ACCENT}
            width={2}
            opacity={0.32 + 0.68 * flash}
          />
        );
      })}
      <Rule x={mx} y0={y(BASE)} y1={y(SE_Y)} at={averageAt - 2} dur={16} color={ACCENT} width={2.6} dash="7 6" />
      <Note at={averageAt + 6} x={sx(X, AGES.mean - AGES.se) - 16} y={y(SE_Y) - 16} align="right">
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 600 }}>average {fmt(AGES.mean)}</span>
      </Note>
      <Note at={differentAt + 8} x={160} y={y(826)}>
        <span style={note(21, INK_SOFT)}>
          Faint red lines: the averages of {AGES.others.length} other samples of {AGES.n} from the same population.
        </span>
      </Note>

      {/* The standard error: how far the average moves. */}
      <Span x0={sx(X, AGES.mean - AGES.se)} x1={sx(X, AGES.mean + AGES.se)} y={y(SE_Y)} at={howFarAt} dur={12} color={ACCENT} width={3} tick={10} />
      <Note at={seAt} x={sx(X, AGES.mean + AGES.se) + 16} y={y(SE_Y) - 16}>
        <div style={{ ...note(24, ACCENT_INK), fontWeight: 700 }}>± {fmt(AGES.se)} years</div>
        <div style={note(20, INK_SOFT)}>one standard error</div>
      </Note>
      <Bell at={widthAt - 4} mx={mx} />
      <Note at={widthAt + 4} x={mx + 44} y={y(BELL_BASE - BELL_H - 8)}>
        <span style={{ ...note(20, ACCENT_INK), fontWeight: 600 }}>its sampling distribution</span>
      </Note>
    </AbsoluteFill>
  );
};

/** The average's own distribution, one standard error wide, drawn over it. */
const Bell: React.FC<{ at: number; mx: number }> = ({ at, mx }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, at, 18);
  if (p <= 0) return null;
  const pxPerYear = sx(X, 1) - sx(X, 0);
  const s = AGES.se;
  const peak = normalPdf(0, 0, s);
  const d = Array.from({ length: 81 }, (_, i) => {
    const v = -3.2 * s + (6.4 * s * i) / 80;
    const yy = y(BELL_BASE) - (normalPdf(v, 0, s) / peak) * BELL_H * p;
    return `${i ? "L" : "M"}${(mx + v * pxPerYear).toFixed(1)},${yy.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={`${d} Z`} fill={ACCENT} opacity={0.18 * p} />
      <path d={d} fill="none" stroke={ACCENT} strokeWidth={2.6} strokeLinejoin="round" />
    </svg>
  );
};

