import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, halo, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { HALF_MILLION, MILLION, ROWS, SET_NS_RANGE } from "./data";
import { Fig, LIST, LIST_INK, SET, SET_INK } from "./kit";

/** a: both, in milliseconds. */
const A: XScale = { lo: 0, hi: 1_000_000, x0: 214, x1: 1180 };
const A_BASE = 766;
const A_TOP = 262;
const A_MAX = 6;
/** b: the set alone, in nanoseconds. */
const B: XScale = { lo: 0, hi: 1_000_000, x0: 1520, x1: 1790 };
const B_BASE = 560;
const B_TOP = 300;
const B_MAX = 30;
const TITLE_Y = 178;
const X_TICKS = [0, 200_000, 400_000, 600_000, 800_000, 1_000_000];
const k = (v: number) => (v === 0 ? "0" : `${v / 1000}k`);

/**
 * Grow both collections and time the same lookup at every size: the list's
 * time climbs in a straight line, the set's never leaves the floor. Panel b
 * puts the set on a scale it can be read on.
 */
export const GrowthScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const start = n.beat("grow").from;
  const growAt = n.word("grow", "grow");
  const doublesAt = n.word("grow", "doubles", { nth: 1 });
  const tooAt = n.word("grow", "doubles too");
  const flatAt = n.word("flat", "flat");
  const nearAt = n.word("flat", "twenty-three");
  const everyAt = n.word("flat", "every size");

  const aUnit = h((A_BASE - A_TOP) / A_MAX);
  const ay = (ms: number) => y(A_BASE) - ms * aUnit;
  const bUnit = h((B_BASE - B_TOP) / B_MAX);
  const by = (ns: number) => y(B_BASE) - ns * bUnit;

  const drawList = ease(frame, growAt, Math.max(24, doublesAt - growAt - 4));
  const drawSet = ease(frame, growAt + 6, 30);
  const drawInset = ease(frame, flatAt - 2, 24);
  const half = ease(frame, doublesAt - 2, 12);
  const twice = ease(frame, tooAt - 2, 12);

  const listPts = ROWS.map((r) => [sx(A, r.n), ay(r.listMs)] as const);
  const setPts = ROWS.map((r) => [sx(A, r.n), ay(r.setNs / 1e6)] as const);
  const insetPts = ROWS.map((r) => [sx(B, r.n), by(r.setNs)] as const);
  const path = (pts: readonly (readonly [number, number])[]) => pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
  // How much taller b draws a nanosecond than a does: a's blue line, magnified.
  const zoom = bUnit / (aUnit / 1e6);
  const zoomRounded = Number(zoom.toPrecision(1));

  const hx = sx(A, HALF_MILLION.n);
  const mx = sx(A, MILLION.n);
  const hy = ay(HALF_MILLION.listMs);
  const my = ay(MILLION.listMs);

  return (
    <AbsoluteFill>
      <Fig n="3" at={start - 14} x={A.x0 - 94} y={y(104)}>
        Time to find the last value, as both collections grow
      </Fig>
      {/* The legend, at the right end of the label's line. */}
      <Note at={start - 6} x={1790} y={y(104) + 1} align="right" from="right">
        <span style={{ ...note(22, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 12 }}>
          <Swatch color={LIST} /> <span style={{ color: LIST_INK, fontWeight: 650 }}>list</span>
          <span style={{ width: 14 }} />
          <Swatch color={SET} /> <span style={{ color: SET_INK, fontWeight: 650 }}>set</span>
        </span>
      </Note>

      {/* ── a: both, in milliseconds ── */}
      <Ink at={start - 10} dur={14} style={{ left: A.x0 - 94, top: y(TITLE_Y), display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={label(22, INK_SOFT)}>a</span>
        <span style={{ ...body(30, true), color: INK }}>Both, in milliseconds</span>
      </Ink>
      <Grid
        scale={A}
        base={y(A_BASE)}
        unit={aUnit}
        ticks={[0, 1, 2, 3, 4, 5]}
        format={(v) => (v === 5 ? `${v} ms` : String(v))}
        xTicks={X_TICKS}
        xFormat={(v) => (v === 1_000_000 ? "1M items" : k(v))}
        at={start - 8}
      />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={path(setPts)} fill="none" stroke={SET} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${drawSet} 1`} />
        <path
          d={path(listPts)}
          fill="none"
          stroke={LIST}
          strokeWidth={3.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${drawList} 1`}
        />
        {listPts.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={6} fill={LIST} opacity={ease(frame, growAt + (i / (ROWS.length - 1)) * (doublesAt - growAt - 4), 6)} />
        ))}
      </svg>

      {/* Doubling: 500,000 items, then a million. */}
      {half > 0 ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: half }}>
          <g stroke={LIST} strokeWidth={1.8} strokeDasharray="6 6">
            <line x1={A.x0} x2={hx} y1={hy} y2={hy} />
            <line x1={hx} x2={hx} y1={y(A_BASE)} y2={hy} />
            <line x1={A.x0} x2={mx} y1={my} y2={my} opacity={twice} />
          </g>
          {twice > 0 ? (
            <g stroke={INK} strokeWidth={1.8} fill="none" opacity={twice}>
              <path d={`M${mx + 28},${hy} L${mx + 40},${hy} L${mx + 40},${my} L${mx + 28},${my}`} />
            </g>
          ) : null}
        </svg>
      ) : null}
      <Note at={doublesAt} x={hx - 18} y={hy - 66} align="right">
        <div style={{ ...note(22, LIST_INK), fontWeight: 650, ...halo }}>{fmt(HALF_MILLION.listMs)} ms</div>
        <div style={{ ...note(20, INK_SOFT), ...halo }}>at 500,000 items</div>
      </Note>
      <Note at={tooAt} x={mx - 18} y={my - 66} align="right">
        <div style={{ ...note(22, LIST_INK), fontWeight: 650, ...halo }}>{fmt(MILLION.listMs)} ms</div>
        <div style={{ ...note(20, INK_SOFT), ...halo }}>at 1,000,000</div>
      </Note>
      <Note at={tooAt + 6} x={mx + 52} y={(hy + my) / 2 - 30}>
        <div style={{ ...note(24, INK), fontWeight: 700 }}>×{fmt(MILLION.listMs / HALF_MILLION.listMs, 1)} the time</div>
        <div style={{ ...note(20, INK_SOFT) }}>for ×2 the items</div>
      </Note>
      <Note at={flatAt} x={sx(A, 560_000)} y={y(A_BASE) - 48} from="up">
        <span style={{ ...note(22, SET_INK), fontWeight: 650, ...halo }}>the set, on the floor at every size</span>
      </Note>

      {/* ── b: the set alone, in nanoseconds ── */}
      <Ink at={flatAt - 6} dur={14} style={{ left: B.x0 - 84, top: y(TITLE_Y), display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={label(22, INK_SOFT)}>b</span>
        <span style={{ ...body(30, true), color: INK }}>The set, in nanoseconds</span>
      </Ink>
      <Grid
        scale={B}
        base={y(B_BASE)}
        unit={bUnit}
        ticks={[0, 10, 20, 30]}
        format={(v) => (v === B_MAX ? `${v} ns` : String(v))}
        xTicks={[0, 500_000, 1_000_000]}
        xFormat={(v) => (v === 1_000_000 ? "1M" : k(v))}
        at={flatAt - 4}
        labelGap={50}
      />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={path(insetPts)} fill="none" stroke={SET} strokeWidth={3.2} strokeLinejoin="round" pathLength={1} strokeDasharray={`${drawInset} 1`} />
        {insetPts.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r={5.5} fill={SET} opacity={ease(frame, flatAt + i * 2, 6)} />
        ))}
      </svg>
      <Ink at={nearAt - 2} dur={16} style={{ left: B.x0 - 84, top: y(B_BASE) + 62, width: B.x1 - B.x0 + 84 }}>
        <div style={{ ...note(24, SET_INK), fontWeight: 700 }}>
          {fmt(SET_NS_RANGE[0], 1)} to {fmt(SET_NS_RANGE[1], 1)} ns
        </div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 4 }}>at every size, 100k to 1M</div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 14, opacity: ease(frame, everyAt - 2, 10) }}>
          The blue line in a, drawn {zoomRounded.toLocaleString("en-US")} times taller.
        </div>
      </Ink>

      <Note at={start + 10} x={A.x0 - 94} y={y(866)}>
        <span style={note(20, INK_SOFT)}>
          Measured with timeit: best of 30 runs per size, CPython 3.13 on one 2.1 GHz Xeon core.
        </span>
      </Note>
    </AbsoluteFill>
  );
};

const Swatch: React.FC<{ color: string }> = ({ color }) => (
  <svg width={34} height={10} style={{ overflow: "visible" }}>
    <line x1={2} x2={32} y1={5} y2={5} stroke={color} strokeWidth={4} strokeLinecap="round" />
  </svg>
);

/** Faint horizontal rules with their values at the left, and an x axis. */
const Grid: React.FC<{
  scale: XScale;
  base: number;
  unit: number;
  ticks: readonly number[];
  format: (v: number) => string;
  xTicks: readonly number[];
  xFormat: (v: number) => string;
  at: number;
  labelGap?: number;
}> = ({ scale, base, unit, ticks, format, xTicks, xFormat, at, labelGap = 16 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const t = ease(frame, at + 6, 12);
  if (p <= 0) return null;
  const text: React.CSSProperties = {
    fontFamily: SANS,
    fontSize: 20,
    fontWeight: 500,
    fill: INK_SOFT,
    fontVariantNumeric: "tabular-nums",
  };
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {ticks.map((v) => {
        const gy = base - v * unit;
        return (
          <g key={v} opacity={v === 0 ? 1 : t}>
            <line
              x1={scale.x0}
              x2={scale.x0 + (scale.x1 - scale.x0) * p}
              y1={gy + 0.5}
              y2={gy + 0.5}
              stroke={v === 0 ? INK : HAIRLINE}
              strokeWidth={v === 0 ? 1.6 : 1}
              opacity={v === 0 ? 1 : 0.45}
            />
            <text x={scale.x0 - labelGap} y={gy + 7} textAnchor="end" style={text}>
              {format(v)}
            </text>
          </g>
        );
      })}
      <g opacity={t}>
        {xTicks.map((v) => {
          const x = sx(scale, v);
          return (
            <g key={v}>
              <line x1={x} x2={x} y1={base + 1} y2={base + 7} stroke={INK} strokeWidth={1.2} />
              <text x={x} y={base + 30} textAnchor="middle" style={text}>
                {xFormat(v)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
