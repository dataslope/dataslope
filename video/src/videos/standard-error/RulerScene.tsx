import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  BAR,
  body,
  fmt,
  HAIRLINE,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  note,
  PAPER,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, mulberry32, TIMES, VIDEO } from "./data";
import { Rule, Span } from "./parts";

/** The 120 times, on their own axis. */
const X: XScale = { lo: 0, hi: 16, x0: 160, x1: 1760 };
const TICKS = [0, 2, 4, 6, 8, 10, 12, 14, 16];
const STRIP_TOP = 336;
const STRIP_H = 56;
const BASE = 418;
/** The stretch of that axis the ruler magnifies, in seconds. */
const ZOOM: readonly [number, number] = [7.0, 9.4];
/** The ruler: the same stretch, drawn wide, marked every standard error. */
const R: XScale = { lo: ZOOM[0], hi: ZOOM[1], x0: 280, x1: 1640 };
const RULER_TOP = 604;
const RULER_H = 76;
const STEPS = Array.from({ length: 11 }, (_, i) => i - 5);

const JITTER = (() => {
  const r = mulberry32(120);
  return TIMES.values.map(() => r());
})();

const seconds = (v: number) => (v === 16 ? "16 s" : String(v));
const signed = (k: number) => (k === 0 ? "0" : k > 0 ? `+${k}` : `−${-k}`);

/**
 * Act 5, "why does this number matter" to the end: the lesson's 120
 * conversion times, their average, and a ruler laid under it marked in
 * standard errors. Two of them either way is the rough interval; a test
 * reads the same ruler from a tested value.
 */
export const RulerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const rulerFrom = n.beat("ruler").from;
  const rulerAt = n.word("ruler", "ruler");
  const inferenceAt = n.word("ruler", "inference");
  const timesFrom = n.beat("times").from;
  const eightAt = n.word("times", "eight point two");
  const seAt = n.word("times", "zero point two two");
  const stepAt = n.word("interval", "Step");
  const twoAt = n.word("interval", "two standard errors");
  const sevenAt = n.word("interval", "seven point eight");
  const intervalAt = n.word("interval", "confidence interval");
  const testAt = n.word("test", "test");
  const manyAt = n.word("test", "how many");
  const testingAt = n.word("test", "testing");
  const nextAt = n.word("next", "Next");
  // "that interval": the interval lights up on the ruler as it is named, and
  // the line under it finishes on "properly".
  const thatIntervalAt = n.word("next", "that interval");
  const properlyAt = n.word("next", "properly");
  const named = ease(frame, thatIntervalAt - 2, 16);

  const mx = sx(X, TIMES.mean);
  const rx = (v: number) => sx(R, v);
  const zoom = ease(frame, seAt - 4, 18);
  const ruler = ease(frame, seAt, 22);
  const twoLit = ease(frame, twoAt, 10);

  return (
    <AbsoluteFill>
      {/* ── Sound: the ruler, the times, the zoom, the interval, the test ── */}
      <Sfx name="el-pop" at={rulerAt - 6} level={-30} />
      <Sfx name="el-sprinkle" at={timesFrom - 4} level={-34} />
      <Sfx name="el-whoosh" at={seAt} level={-34} />
      <Sfx name="el-pencil" at={stepAt} level={-33} />
      <Sfx name="el-pencil" at={testAt - 2} level={-35} />
      <Sfx name="el-tap" at={testingAt - 2} level={-29} />

      <Ink at={rulerFrom - 6} dur={20} style={{ left: 92, top: y(112), ...headline(56), whiteSpace: "nowrap" }}>
        The standard error is a ruler.
      </Ink>
      <Ink at={inferenceAt - 4} dur={18} style={{ left: 94, top: y(186), ...headline(40, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
        Intervals and tests are measured with it.
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="standard-error-ruler"
          style={{
            position: "absolute",
            left: 1300,
            top: y(110),
            width: 500,
            height: 180,
            opacity: pop(frame, rulerAt - 6, fps, 16),
            transform: `translateY(${bob(frame, 4, 130) + (1 - pop(frame, rulerAt - 6, fps, 16)) * 30}px)`,
          }}
        />
      ) : null}

      {/* ── Fig. 6: the times ── */}
      <FigLabel n="6" title={`${TIMES.n} conversion times, in seconds`} at={timesFrom - 8} x={160} y={y(282)} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <rect
          x={sx(X, ZOOM[0])}
          y={y(STRIP_TOP - 14)}
          width={(sx(X, ZOOM[1]) - sx(X, ZOOM[0])) * zoom}
          height={y(BASE) - y(STRIP_TOP - 14)}
          fill={HIGHLIGHT}
          opacity={0.55}
        />
        {TIMES.values.map((v, i) => {
          const p = pop(frame, timesFrom - 4 + i * 0.12, fps, 16);
          if (p <= 0.01) return null;
          return (
            <circle key={i} cx={sx(X, v)} cy={y(STRIP_TOP + JITTER[i] * STRIP_H)} r={6 * Math.min(1.15, p)} fill={BAR} opacity={0.85} />
          );
        })}
      </svg>
      <Axis scale={X} base={y(BASE)} ticks={TICKS} at={timesFrom - 6} format={seconds} />
      <Rule x={mx} y0={y(BASE)} y1={y(STRIP_TOP - 22)} at={eightAt - 4} dur={12} color={ACCENT} width={2.8} />
      <Note at={eightAt} x={mx + 14} y={y(STRIP_TOP - 40)}>
        <span style={{ ...note(23, ACCENT_INK), fontWeight: 700 }}>average {fmt(TIMES.mean)} s</span>
      </Note>

      {/* ── Fig. 7: the ruler ── */}
      <FigLabel
        n="7"
        title={`Zoomed in, and marked in standard errors of ${fmt(TIMES.se)} s`}
        at={seAt - 2}
        x={R.x0}
        y={y(492)}
      />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ruler > 0 ? 1 : 0 }}>
        <defs>
          <clipPath id="se-ruler-reveal">
            <rect x={R.x0 - 4} y={0} width={(R.x1 - R.x0 + 8) * ruler} height={1080} />
          </clipPath>
        </defs>
        <g clipPath="url(#se-ruler-reveal)">
          <rect
            x={R.x0}
            y={y(RULER_TOP)}
            width={R.x1 - R.x0}
            height={y(RULER_TOP + RULER_H) - y(RULER_TOP)}
            fill={`color-mix(in srgb, ${HIGHLIGHT} 70%, ${PAPER})`}
            stroke={INK}
            strokeWidth={1.6}
          />
          {STEPS.flatMap((k) => [k, k + 0.5]).filter((k) => k <= 5).map((k) => {
            const v = TIMES.mean + k * TIMES.se;
            if (v < R.lo || v > R.hi) return null;
            const major = Number.isInteger(k);
            const lit = major && Math.abs(k) === 2 ? twoLit : 0;
            return (
              <line
                key={k}
                x1={rx(v)}
                x2={rx(v)}
                y1={y(RULER_TOP)}
                y2={y(RULER_TOP) + (major ? 26 : 13)}
                stroke={lit > 0 ? ACCENT_INK : INK}
                strokeWidth={major ? 2 + lit : 1.3}
              />
            );
          })}
          {STEPS.map((k) => {
            const v = TIMES.mean + k * TIMES.se;
            const lit = Math.abs(k) === 2 ? twoLit : 0;
            return (
              <text
                key={k}
                x={rx(v)}
                y={y(RULER_TOP) + 54}
                textAnchor="middle"
                style={{
                  fontFamily: SANS,
                  fontSize: 22,
                  fontWeight: k === 0 || lit > 0 ? 700 : 500,
                  fill: lit > 0 ? ACCENT_INK : k === 0 ? INK : INK_SOFT,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {signed(k)}
              </text>
            );
          })}
        </g>
      </svg>
      <Note at={seAt + 16} x={R.x1} y={y(RULER_TOP + RULER_H) + 14} align="right">
        <span style={label(19, INK_SOFT)}>standard errors from the average</span>
      </Note>

      {/* The interval, lit on the ruler when the bridge names it. */}
      {named > 0 ? (
        <div
          style={{
            position: "absolute",
            left: rx(TIMES.lo),
            width: (rx(TIMES.hi) - rx(TIMES.lo)) * named,
            top: y(RULER_TOP),
            height: y(RULER_TOP + RULER_H) - y(RULER_TOP),
            background: `color-mix(in srgb, ${ACCENT} 16%, transparent)`,
          }}
        />
      ) : null}
      {/* The rough interval: about two standard errors either way. */}
      <Span x0={rx(TIMES.lo)} x1={rx(TIMES.hi)} y={y(RULER_TOP - 22)} at={stepAt} dur={26} color={ACCENT} width={3.2} tick={10} />
      <div style={{ position: "absolute", left: rx(TIMES.lo), top: y(RULER_TOP - 72), display: "flex", alignItems: "baseline", gap: "0.4em", whiteSpace: "nowrap" }}>
        <Ink at={sevenAt - 2} dur={14} style={{ position: "relative", ...note(24, ACCENT_INK), fontWeight: 700 }}>
          {fmt(TIMES.lo)} to {fmt(TIMES.hi)} s,
        </Ink>
        <Ink at={intervalAt - 2} dur={16} style={{ position: "relative", ...body(28, true), color: INK }}>
          a rough 95% confidence interval
        </Ink>
      </div>

      {/* A test: the gap from a tested value, in standard errors. */}
      {/* In two pieces, so it marks the ruler's edge without striking
          through the step labels printed inside it. */}
      <Rule
        x={rx(TIMES.tested)}
        y0={y(RULER_TOP + RULER_H + 54)}
        y1={y(RULER_TOP + RULER_H)}
        at={testAt - 2}
        dur={10}
        color={ds("gray", 700)}
        width={2.4}
      />
      <Rule
        x={rx(TIMES.tested)}
        y0={y(RULER_TOP) + 30}
        y1={y(RULER_TOP) - 10}
        at={testAt + 4}
        dur={8}
        color={ds("gray", 700)}
        width={2.4}
      />
      <Span
        x0={rx(TIMES.tested)}
        x1={rx(TIMES.mean)}
        y={y(RULER_TOP + RULER_H + 40)}
        at={manyAt}
        dur={12}
        color={INK}
        width={2.2}
        tick={8}
      />
      <Note at={testAt + 4} x={rx(TIMES.tested) - 16} y={y(RULER_TOP + RULER_H + 26)} align="right" from="right">
        <span style={note(22, INK)}>tested value, {fmt(TIMES.tested, 1)} s</span>
      </Note>
      <Note at={testingAt - 2} x={rx(TIMES.mean) + 16} y={y(RULER_TOP + RULER_H + 26)}>
        <span style={{ ...note(22, ACCENT_INK), fontWeight: 700 }}>{fmt(TIMES.gapInSe)} standard errors away</span>
      </Note>

      <div style={{ position: "absolute", left: R.x0, right: 1920 - R.x1, top: y(838), height: 1, background: HAIRLINE, opacity: ease(frame, nextAt - 6, 12) }} />
      <Ink at={nextAt - 2} dur={18} style={{ left: R.x0, top: y(856), ...body(34, true), color: INK, whiteSpace: "nowrap" }}>
        Next: that interval, <span style={{ opacity: ease(frame, properlyAt - 2, 12) }}>built properly.</span>
      </Ink>
    </AbsoluteFill>
  );
};

