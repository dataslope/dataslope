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
  fmt,
  HAIRLINE,
  halo,
  headline,
  INK_SOFT,
  label,
  note,
  PAPER,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, LAW, seAt, VIDEO } from "./data";
import { Rule } from "./parts";

const X: XScale = { lo: 0, hi: 1600, x0: 200, x1: 1100 };
const TICKS = [0, 400, 800, 1200, 1600];
const BASE = 830;
const TOP_SE = 6.5;
const CHART_H = 450;
const sy = (se: number) => BASE - (se / TOP_SE) * CHART_H;
const GRID = [2, 4, 6];

/** The lesson's sample sizes that fit on this axis. */
const POINTS = LAW.points.filter((p) => p.n <= X.hi);
const CURVE = Array.from({ length: 400 }, (_, i) => 10 + ((X.hi - 10) * i) / 399);

/** Squares of 100 people: the side is the precision, the area the data.
 *  Their pitch stays square in both layouts (only the base moves through
 *  `y`), because a stretched square would no longer say "area". */
const SQ_PITCH = 24;
const SQ = 21;
const SQ_BASE = 790;
const PEOPLE = 100;

const thousands = (v: number) => v.toLocaleString("en-US");

/**
 * Act 4, "what does that square root cost" to "expensive, fast": the
 * lesson's curve of the standard error against n, steep and then flat, with
 * each halving marked; beside it the same halvings as squares of a hundred
 * people, ending on the ten-by-ten that buys a tenth of the error.
 */
export const CostScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const costFrom = n.beat("cost").from;
  const costAt = n.word("cost", "cost");
  const curveFrom = n.beat("curve").from;
  const hundredAt = n.word("curve", "hundred people");
  const twoAt = n.word("curve", "two");
  const fourAt = n.word("four", "four hundred");
  const sixteenAt = n.word("four", "sixteen hundred");
  const tenthAt = n.word("hundred", "tenth");
  const timesAt = n.word("hundred", "hundred times");
  const expensiveAt = n.word("hundred", "expensive");

  const curveP = ease(frame, curveFrom - 4, 34);
  const d = CURVE.map((v, i) => `${i ? "L" : "M"}${sx(X, v).toFixed(1)},${y(sy(LAW.sigma / Math.sqrt(v))).toFixed(1)}`).join(" ");

  const marks = [
    { n: 100, at: hundredAt, labelAt: twoAt, align: "left" as const },
    { n: 400, at: fourAt, labelAt: fourAt + 6, align: "left" as const },
    { n: 1600, at: sixteenAt, labelAt: sixteenAt + 6, align: "right" as const },
  ];

  const groups = [
    { side: 1, at: hundredAt, x: 1200 },
    { side: 2, at: fourAt, x: 1300 },
    { side: 4, at: sixteenAt, x: 1418 },
    { side: 10, at: tenthAt, x: 1576 },
  ];

  return (
    <AbsoluteFill>
      {/* ── Sound: the coins, the curve, each size marked, the hundred squares ── */}
      <Sfx name="el-pop" at={costAt - 6} level={-30} />
      <Sfx name="el-pencil" at={curveFrom - 4} level={-33} />
      {marks.map((mk) => (
        <Sfx key={mk.n} name="el-tap" at={mk.at} level={-29} />
      ))}
      <Sfx name="el-sprinkle" at={tenthAt} level={-34} />

      <Ink at={costFrom - 6} dur={20} style={{ left: 92, top: y(112), ...headline(56), whiteSpace: "nowrap" }}>
        What the square root costs.
      </Ink>
      <Ink at={expensiveAt - 4} dur={18} style={{ left: 94, top: y(186), ...headline(44, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
        Precision gets expensive, fast.
      </Ink>
      {ILLUSTRATIONS ? (
        <Illustration
          video={VIDEO}
          id="standard-error-coins"
          style={{
            position: "absolute",
            left: 1540,
            top: y(104),
            width: 260,
            height: 312,
            opacity: pop(frame, costAt - 6, fps, 16),
            transform: `translateY(${bob(frame, 4, 120) + (1 - pop(frame, costAt - 6, fps, 16)) * 30}px)`,
          }}
        />
      ) : null}

      {/* ── Fig. 5: the curve ── */}
      <FigLabel n="5" title={`Standard error by sample size, when the data spreads by ${LAW.sigma}`} at={curveFrom - 8} x={160} y={y(276)} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: ease(frame, curveFrom - 8, 14) }}>
        {GRID.map((g) => (
          <g key={g}>
            <line x1={X.x0} x2={X.x1} y1={y(sy(g))} y2={y(sy(g))} stroke={HAIRLINE} strokeWidth={1} strokeDasharray="3 6" />
            <text
              x={X.x0 - 16}
              y={y(sy(g)) + 7}
              textAnchor="end"
              style={{ fontFamily: SANS, fontSize: 21, fontWeight: 500, fill: INK_SOFT }}
            >
              {g}
            </text>
          </g>
        ))}
      </svg>
      <Axis scale={X} base={y(BASE)} ticks={TICKS} at={curveFrom - 8} format={thousands} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path
          d={d}
          fill="none"
          stroke={ACCENT}
          strokeWidth={3}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${curveP} 1`}
          opacity={curveP > 0 ? 1 : 0}
        />
        {POINTS.map((p, i) => {
          const at = curveFrom - 4 + 34 * ((sx(X, p.n) - X.x0) / (X.x1 - X.x0)) ** 0.6 + i;
          const s = pop(frame, at, fps, 15);
          if (s <= 0.01) return null;
          return <circle key={p.n} cx={sx(X, p.n)} cy={y(sy(p.se))} r={5.5 * s} fill={ACCENT} stroke={PAPER} strokeWidth={1.5} />;
        })}
      </svg>

      {marks.map((mk) => {
        const se = seAt(mk.n);
        const px = sx(X, mk.n);
        const py = y(sy(se));
        const ring = pop(frame, mk.at, fps, 13);
        return (
          <React.Fragment key={mk.n}>
            <Rule x={px} y0={y(BASE)} y1={py} at={mk.at - 2} dur={10} color={INK_SOFT} width={1.4} dash="4 5" />
            {ring > 0.01 ? (
              <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
                <circle cx={px} cy={py} r={10 * ring} fill="none" stroke={ACCENT_INK} strokeWidth={2.4} />
              </svg>
            ) : null}
            <Note
              at={mk.labelAt}
              x={mk.align === "left" ? px + 14 : px - 14}
              y={py - 44}
              align={mk.align}
              from={mk.align === "left" ? "left" : "right"}
            >
              <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, ...halo }}>{fmt(se, 1)}</span>
            </Note>
            {mk.n % 400 !== 0 ? (
              <Note at={mk.at} x={px - 60} width={120} y={y(BASE) + 34} from="up" style={{ textAlign: "center" }}>
                <span style={{ ...note(21, ACCENT_INK), fontWeight: 700 }}>{thousands(mk.n)}</span>
              </Note>
            ) : null}
          </React.Fragment>
        );
      })}
      <Note at={curveFrom + 10} x={X.x1} y={y(BASE) + 62} align="right">
        <span style={label(19, INK_SOFT)}>people in the sample</span>
      </Note>

      {/* ── The squares ── */}
      <Ink at={hundredAt - 4} dur={14} style={{ left: 1200, top: y(484) }}>
        <span style={label(20, INK_SOFT)}>Each square is {PEOPLE} people</span>
      </Ink>
      {groups.map((g) => (
        <Squares key={g.side} side={g.side} at={g.at} x={g.x} />
      ))}
      {groups.map((g) => {
        const people = g.side * g.side * PEOPLE;
        const se = LAW.sigma / Math.sqrt(people);
        const at = g.side === 10 ? timesAt : g.at + 4;
        return (
          <Note key={g.side} at={at} x={g.x} y={y(SQ_BASE) + 14}>
            <div style={{ ...headline(30), fontVariantNumeric: "tabular-nums lining-nums" }}>{thousands(people)}</div>
            <div style={{ ...note(20, ACCENT_INK), fontWeight: 600, marginTop: 2 }}>error {fmt(se, 1)}</div>
          </Note>
        );
      })}
    </AbsoluteFill>
  );
};

/** A `side` by `side` block of squares, bottom-aligned, filling row by row
 *  from the bottom left. */
const Squares: React.FC<{ side: number; at: number; x: number }> = ({ side, at, x }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { y } = useLayout();
  const total = side * side;
  const each = side >= 10 ? 0.28 : 2;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: total }, (_, i) => {
        const row = Math.floor(i / side);
        const col = i % side;
        const p = pop(frame, at + i * each, fps, 18);
        if (p <= 0.01) return null;
        const cx = x + col * SQ_PITCH + SQ / 2;
        const cy = y(SQ_BASE) - row * SQ_PITCH - SQ / 2;
        const s = SQ * Math.min(1.1, p);
        return <rect key={i} x={cx - s / 2} y={cy - s / 2} width={s} height={s} fill={BAR} />;
      })}
    </svg>
  );
};

