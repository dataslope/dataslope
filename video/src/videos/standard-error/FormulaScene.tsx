import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ease, pop } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  BLUE_INK,
  body,
  fmt,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  note,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { AGES, mulberry32 } from "./data";
import { Marked, Span } from "./parts";
import { useFigNumber } from "../sampling/merged";
import { swell } from "../sampling/emphasis";

const X: XScale = { lo: 10, hi: 80, x0: 160, x1: 1760 };
const TICKS = [10, 20, 30, 40, 50, 60, 70, 80];
const BASE = 750;
const STRIP_TOP = 664;
const STRIP_H = 62;

/** Seeded vertical jitter, so 200 dots read as a strip. */
const JITTER = (() => {
  const r = mulberry32(200);
  return AGES.values.map(() => r());
})();

const years = (v: number) => (v === 80 ? "80 years" : String(v));

/**
 * Act 2, "So how can you measure that" to "less than a year": the one
 * average you get, the shortcut s / root n, the lesson's numbers through it,
 * and the same ages with their average's band drawn to scale.
 */
export const FormulaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();
  const fig = useFigNumber();

  // ── Cues ──
  const oneFrom = n.beat("one").from;
  const seenAt = n.word("one", "one average");
  const divideAt = n.word("divide", "Divide");
  const deviationAt = n.word("divide", "standard deviation");
  const sizeAt = n.word("divide", "sample size");
  const standingAt = n.word("divide", "standing in");
  const rootWordAt = n.word("divide", "square root");
  const tenAt = n.word("numbers", "Ten point five eight");
  const rootAt = n.word("numbers", "square root");
  const zeroAt = n.word("numbers", "zero point seven five");
  const contrastFrom = n.beat("contrast").from;
  const decadesAt = n.word("contrast", "decades");
  const averageAt = n.word("contrast", "average");
  const yearAt = n.word("contrast", "less than a year");

  const mx = sx(X, AGES.mean);

  return (
    <AbsoluteFill>
      {/* ── Sound: the one average, the shortcut, its result, the ages, the band ── */}
      <Sfx name="el-whoosh" at={seenAt - 4} level={-34} />
      <Sfx name="el-tap" at={seenAt + 8} level={-28} />
      <Sfx name="el-pencil" at={divideAt} level={-35} />
      <Sfx name="el-tap" at={zeroAt - 2} level={-28} />
      <Sfx name="el-sprinkle" at={contrastFrom - 6} level={-34} />
      <Sfx name="el-pencil" at={averageAt - 2} level={-34} />

      {/* One line in two inks, the second following the first in the flow. */}
      <div style={{ position: "absolute", left: 92, top: y(112), display: "flex", gap: "0.26em", ...headline(56), whiteSpace: "nowrap" }}>
        <Ink at={oneFrom - 8} dur={20} style={{ position: "relative" }}>
          You only ever see one average.
        </Ink>
        <Ink at={divideAt - 4} dur={16} style={{ position: "relative", ...headline(56, true), color: ACCENT_INK }}>
          So divide.
        </Ink>
      </div>

      {/* ── The shortcut ── */}
      <Ink at={divideAt - 6} dur={14} style={{ left: 120, top: y(214) }}>
        <span style={label(21, INK_SOFT)}>The standard error of an average</span>
      </Ink>
      <Ink at={divideAt} dur={18} style={{ left: 116, top: y(248), ...headline(124, true), whiteSpace: "nowrap" }}>
        <span style={{ color: BLUE_INK }}>s</span> ÷{" "}
        <span style={{ display: "inline-block", transformOrigin: "50% 70%", transform: `scale(${swell(frame, rootWordAt - 2, 0.14, 20)})` }}>
          √<span>n</span>
        </span>
      </Ink>
      <Definition at={deviationAt - 2} top={y(268)} symbol="s" color={BLUE_INK}>
        the standard deviation of the sample
        <span style={{ opacity: ease(frame, standingAt - 2, 14) }}>, our stand-in for σ</span>
      </Definition>
      <Definition at={sizeAt - 2} top={y(332)} symbol="n" color={INK}>
        the sample size
      </Definition>

      {/* ── The lesson's numbers through it ── */}
      <Ink at={tenAt - 8} dur={14} style={{ left: 120, top: y(420) }}>
        <span style={label(21, INK_SOFT)}>For the {AGES.n} ages</span>
      </Ink>
      <div
        style={{
          position: "absolute",
          left: 116,
          top: y(450),
          display: "flex",
          alignItems: "baseline",
          gap: "0.3em",
          ...headline(84),
          fontVariantNumeric: "tabular-nums lining-nums",
          whiteSpace: "nowrap",
        }}
      >
        <Ink at={tenAt - 2} dur={14} style={{ position: "relative", color: BLUE_INK }}>
          {fmt(AGES.sd)}
        </Ink>
        <Ink at={rootAt - 2} dur={14} style={{ position: "relative" }}>
          <span style={{ display: "inline-flex", flexDirection: "column" }}>
            <span>÷ √{AGES.n}</span>
            <span style={{ ...note(21, INK_SOFT), letterSpacing: "normal", marginTop: 4, marginLeft: "1.6em" }}>
              √{AGES.n} is about {fmt(AGES.sqrtN)}
            </span>
          </span>
        </Ink>
        <Ink at={zeroAt - 2} dur={14} style={{ position: "relative" }}>
          = <Marked at={zeroAt + 8} color={HIGHLIGHT}><span style={{ color: ACCENT_INK }}>{fmt(AGES.se)}</span></Marked>
        </Ink>
        <Ink at={zeroAt + 4} dur={14} style={{ position: "relative", ...body(36, true), color: INK_SOFT }}>
          years
        </Ink>
      </div>

      {/* ── The same ages, and their average's band, to one scale ── */}
      <FigLabel n={fig(2)} title={`The same ${AGES.n} ages, and the band their average wobbles in`} at={contrastFrom - 10} x={160} y={y(592)} />
      <Axis scale={X} base={y(BASE)} ticks={TICKS} at={contrastFrom - 8} format={years} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {AGES.values.map((v, i) => {
          const p = pop(frame, contrastFrom - 6 + i * 0.08, fps, 16);
          if (p <= 0.01) return null;
          return (
            <circle
              key={i}
              cx={sx(X, v)}
              cy={y(STRIP_TOP + JITTER[i] * STRIP_H)}
              r={6 * Math.min(1.15, p)}
              fill={BAR}
              opacity={0.85}
            />
          );
        })}
      </svg>
      <Span x0={sx(X, AGES.min)} x1={sx(X, AGES.max)} y={y(STRIP_TOP - 18)} at={decadesAt - 6} dur={20} color={BLUE_INK} />
      <AverageBand at={averageAt - 2} mx={mx} />
      <Note at={decadesAt} x={160} y={y(806)}>
        <span style={{ ...body(32, true), color: BLUE_INK }}>
          The ages: {Math.round(AGES.min)} to {Math.round(AGES.max)} years.
        </span>
      </Note>
      <Note at={yearAt - 2} x={mx - 16} y={y(806)}>
        <span style={{ ...body(32, true), color: ACCENT_INK }}>
          Their average: {fmt(AGES.mean)}, give or take {fmt(AGES.se)}.
        </span>
      </Note>
      <OneAverage from={oneFrom - 4} at={seenAt} out={contrastFrom - 14} />
    </AbsoluteFill>
  );
};

/** The 200 ages, full width where Fig. 2 will draw them, collapsing into the
 *  one average a study ever gets to see; they give way to Fig. 2 itself. */
const OneAverage: React.FC<{ from: number; at: number; out: number }> = ({ from, at, out }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const appear = ease(frame, from, 16) * (1 - ease(frame, out, 12));
  const c = ease(frame, at - 4, 18);
  const mx = sx(X, AGES.mean);
  const mid = STRIP_TOP + STRIP_H / 2;
  if (appear <= 0) return null;
  return (
    <>
      <div style={{ position: "absolute", left: 160, top: y(592), opacity: appear }}>
        <span style={label(22, INK_SOFT)}>One sample of {AGES.n} ages</span>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: appear }}>
        {AGES.values.map((v, i) => (
          <circle key={`at-${i}`} cx={sx(X, v)} cy={y(STRIP_TOP + JITTER[i] * STRIP_H)} r={6} fill={BAR} opacity={0.22 * c} />
        ))}
        {AGES.values.map((v, i) => (
          <circle
            key={i}
            cx={sx(X, v) + (mx - sx(X, v)) * c}
            cy={y(STRIP_TOP + JITTER[i] * STRIP_H + (mid - STRIP_TOP - JITTER[i] * STRIP_H) * c)}
            r={6}
            fill={BAR}
            opacity={(1 - c) * 0.85}
          />
        ))}
        <circle cx={mx} cy={y(mid)} r={13 * ease(frame, at + 8, 10)} fill={ACCENT} />
      </svg>
      <Note at={at + 12} x={mx + 26} y={y(mid) - 16} out={out}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 700 }}>one average, {fmt(AGES.mean)}</span>
      </Note>
    </>
  );
};

/** One symbol of the formula and what it stands for. */
const Definition: React.FC<{ at: number; top: number; symbol: string; color: string; children: React.ReactNode }> = ({
  at,
  top,
  symbol,
  color,
  children,
}) => (
  <Ink at={at} dur={16} style={{ left: 640, top, display: "flex", alignItems: "baseline", gap: 22, whiteSpace: "nowrap" }}>
    <span style={{ ...headline(46, true), color, width: 34 }}>{symbol}</span>
    <span style={{ ...body(32), color: INK }}>{children}</span>
  </Ink>
);

/** The average's band, plus and minus one standard error, drawn to the
 *  same scale as the ages it summarises. */
const AverageBand: React.FC<{ at: number; mx: number }> = ({ at, mx }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  const x0 = sx(X, AGES.mean - AGES.se);
  const x1 = sx(X, AGES.mean + AGES.se);
  const top = y(STRIP_TOP - 30);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: p }}>
      <rect x={x0} y={top} width={x1 - x0} height={y(BASE) - top} fill={ACCENT} opacity={0.3} />
      <line x1={mx} x2={mx} y1={top} y2={y(BASE)} stroke={ACCENT} strokeWidth={2.6} />
    </svg>
  );
};
