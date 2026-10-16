import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { normalPdf, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { OVERLAP } from "./data";
import { Bracket, Drift, GROUP_COLOR, Headline, lerp, Marker, Ring, Spot, STAT_INK, Svg } from "./parts";

/** Standard deviations: group A sits at 0, group B at d. */
const X: XScale = { lo: -3.5, hi: 4.5, x0: 160, x1: 1180 };
const BASE = 800;
const PEAK = 360;
const TABLE_X = 1330;
const TABLE_Y = 330;
const ROW = 74;
const COLS = [0, 120, 290];

/** The shared area of two unit normals d apart, as a path. */
const shared = (d: number, base: number, unit: number) => {
  const steps = 160;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const v = X.lo + ((X.hi - X.lo) * i) / steps;
    const yy = base - unit * Math.min(normalPdf(v, 0, 1), normalPdf(v, d, 1));
    pts.push(`${i ? "L" : "M"}${sx(X, v).toFixed(1)},${yy.toFixed(1)}`);
  }
  return `${pts.join(" ")} L${X.x1},${base} L${X.x0},${base} Z`;
};

/**
 * Cohen's d: the gap between two averages in standard deviations. Group B
 * starts one SD over, then slides to 0.2, 0.5 and 0.8 as each is named, the
 * shared area shading in, and a table filling beside it.
 */
export const DScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const from = n.beat("dscene").from;

  // ── Cues ──
  const gapAt = n.word("dscene", "gap");
  const sdAt = n.word("dscene", "standard deviations");
  const unitsAt = n.word("one", "no units");
  const oneAt = n.word("one", "d of one");
  const fullAt = n.word("one", "one full");
  const apartAt = n.word("one", "apart");
  const at = [n.word("labels", "zero point two"), n.word("labels", "zero point five"), n.word("labels", "zero point eight")];
  const evenAt = n.word("overlap", "Even large");
  const overlapAt = n.word("overlap", "overlap");
  const shareAt = n.word("overlap", "share");
  const eightAt = n.word("overlap", "zero point eight");
  const thirdsAt = n.word("overlap", "two thirds");
  const labelsAt = n.word("stake", "labels");
  const startAt = n.word("stake", "only a start");
  const bigAt = n.word("stake", "big");
  const stakeAt = n.word("stake", "at stake");
  const unlikeAt = n.word("sweep-in", "unlike");
  const sizeAt = n.word("sweep-in", "size");
  const dataAt = n.word("sweep-in", "how much data");
  const haveAt = n.word("sweep-in", "have");
  const end = n.beat("sweep-in").to;

  // Where B's average sits: 1, then 0.2, 0.5 and 0.8 on their words.
  const d = [1, ...OVERLAP.map((o) => o.d)].reduce((cur, next, i) => (i === 0 ? cur : lerp(cur, next, ease(frame, at[i - 1] - 6, 18))), 1);
  const unit = h(PEAK) / normalPdf(0, 0, 1);
  const base = y(BASE);
  const curve = (mu: number, p: number) => {
    const steps = 140;
    const k = Math.round(steps * p);
    return Array.from({ length: k + 1 }, (_, i) => {
      const v = X.lo + ((X.hi - X.lo) * i) / steps;
      return `${i ? "L" : "M"}${sx(X, v).toFixed(1)},${(base - unit * normalPdf(v, mu, 1)).toFixed(1)}`;
    }).join(" ");
  };
  const drawA = ease(frame, from - 4, 26);
  const drawB = ease(frame, gapAt - 8, 26);
  const shade = ease(frame, overlapAt - 6, 16);
  const gapIn = ease(frame, gapAt + 4, 12);
  const ruler = ease(frame, sdAt - 4, 16);
  const oneBold = ease(frame, fullAt - 2, 10) * (1 - ease(frame, at[0] - 8, 10));
  const peakY = base - unit * normalPdf(0, 0, 1);
  const sharedNow = 2 * (1 - normalCdf(d / 2));

  return (
    <AbsoluteFill>
      {/* ── Sound: the curves, B sliding to each value, the shared area ── */}
      <Sfx name="el-pencil" at={from - 4} level={-35} />
      <Sfx name="el-pencil" at={gapAt - 8} level={-35} />
      {at.map((a) => (
        <Sfx key={a} name="el-whoosh" at={a - 6} level={-34} />
      ))}
      <Sfx name="el-sprinkle" at={overlapAt - 6} level={-34} />
      <Sfx name="el-pop" at={startAt} level={-30} />

      <Headline
        top={y(150)}
        size={72}
        parts={[
          { text: "Cohen's d:", at: from - 6 },
          { text: "the gap, in standard deviations.", at: sdAt - 8, italic: true },
        ]}
      />

      <Drift from={stakeAt - 10} to={end + 30} amount={0.025} origin={[670, 620]}>
        <FigLabel n="2" title="Two groups, d standard deviations apart" at={from - 4} x={160} y={y(270)} />

        <Svg>
          {shade > 0 ? <path d={shared(d, base, unit)} fill={HIGHLIGHT} opacity={0.75 * shade} /> : null}
          {drawA > 0 ? <path d={curve(0, drawA)} fill="none" stroke={GROUP_COLOR.men} strokeWidth={4} strokeLinejoin="round" /> : null}
          {drawB > 0 ? <path d={curve(d, drawB)} fill="none" stroke={GROUP_COLOR.women} strokeWidth={4} strokeLinejoin="round" /> : null}
          {gapIn > 0 ? (
            <>
              <line x1={sx(X, 0)} x2={sx(X, 0)} y1={base} y2={peakY} stroke={GROUP_COLOR.men} strokeWidth={2} opacity={gapIn} />
              <line x1={sx(X, d)} x2={sx(X, d)} y1={base} y2={peakY} stroke={GROUP_COLOR.women} strokeWidth={2} opacity={gapIn} />
            </>
          ) : null}
          {/* The ruler: the axis marked off in standard deviations. */}
          <line x1={X.x0} x2={lerp(X.x0, X.x1, ruler)} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
          {[-3, -2, -1, 0, 1, 2, 3, 4].map((v, i) => {
            const t = ease(frame, sdAt - 2 + i * 1.5, 8);
            return t > 0 ? <line key={v} x1={sx(X, v)} x2={sx(X, v)} y1={base} y2={base + 12 * t} stroke={INK} strokeWidth={1.4} /> : null;
          })}
          {oneBold > 0 ? (
            <rect x={sx(X, 0)} y={base + 2} width={sx(X, 1) - sx(X, 0)} height={10} fill={HIGHLIGHT} opacity={oneBold} />
          ) : null}
        </Svg>
        {[-3, -2, -1, 0, 1, 2, 3, 4].map((v, i) => (
          <div
            key={v}
            style={{
              position: "absolute",
              left: sx(X, v),
              top: base + 18,
              transform: "translateX(-50%)",
              opacity: ease(frame, sdAt + i * 1.5, 8),
              ...note(20, INK_SOFT),
            }}
          >
            {v === 0 ? "0" : `${v > 0 ? "+" : "−"}${Math.abs(v)}`}
          </div>
        ))}
        <Note at={sdAt + 10} x={X.x1} y={base + 52} align="right">
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>standard deviations from group A&apos;s average</span>
        </Note>

        <Ring x={(sx(X, 0) + sx(X, d)) / 2} y={peakY - 18} at={apartAt - 2} r0={20} r1={80} />
        <Svg>
          {ease(frame, shareAt - 4, 24) > 0 ? (
            <path
              d={shared(d, base, unit)}
              fill="none"
              stroke={INK}
              strokeWidth={2.4}
              pathLength={1}
              strokeDasharray={`${ease(frame, shareAt - 4, 24)} 1`}
              opacity={1 - ease(frame, startAt, 12) * 0.7}
            />
          ) : null}
        </Svg>

        {/* The gap, and its size in the ruler's units. */}
        <Bracket x0={sx(X, 0)} x1={sx(X, d)} y={peakY - 18} at={gapAt + 2} up={false} tick={10} />
        <div
          style={{
            position: "absolute",
            left: (sx(X, 0) + sx(X, d)) / 2,
            top: peakY - 64,
            transform: "translateX(-50%)",
            opacity: ease(frame, oneAt - 4, 10),
            ...note(26, STAT_INK),
            fontWeight: 700,
            whiteSpace: "nowrap",
            ...halo,
          }}
        >
          d = {fmt(d, d === 1 ? 0 : 1)}
        </div>
        <Note at={unitsAt - 2} x={160} y={y(318)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
            <Marker at={unitsAt}>no units</Marker>: the same for dollars, milliseconds or test scores
          </span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: sx(X, d) + 70,
            top: peakY + h(150),
            opacity: shade,
            ...note(24, INK),
            fontWeight: 650,
            whiteSpace: "nowrap",
            ...halo,
          }}
        >
          {Math.round(sharedNow * 100)}% shared
        </div>
      </Drift>

      {/* ── Cohen's guideposts, row by row ── */}
      {["d", "Cohen's label", "shared"].map((t, i) => (
        <div
          key={t}
          style={{
            position: "absolute",
            left: TABLE_X + COLS[i],
            top: y(TABLE_Y),
            whiteSpace: "nowrap",
            opacity: ease(frame, i === 2 ? overlapAt - 4 : at[0] - 10, 12),
            ...label(21, INK_SOFT),
          }}
        >
          {t}
        </div>
      ))}
      <div
        style={{
          position: "absolute",
          left: TABLE_X,
          top: y(TABLE_Y) + 38,
          width: 440 * ease(frame, at[0] - 8, 14),
          height: 2,
          background: INK,
        }}
      />
      {OVERLAP.map((o, i) => {
        const rowY = y(TABLE_Y) + 56 + i * ROW;
        const lit = ease(frame, at[i] - 4, 8) * (1 - (i < 2 ? ease(frame, at[i + 1] - 4, 8) : 0));
        const startDim = ease(frame, labelsAt - 4, 12) * 0.6;
        return (
          <React.Fragment key={o.d}>
            <div
              style={{
                position: "absolute",
                left: TABLE_X - 14,
                top: rowY - 4,
                width: 468,
                height: ROW - 14,
                background: HIGHLIGHT,
                opacity: 0.5 * lit,
              }}
            />
            <Ink at={at[i] - 4} dur={12} style={{ left: TABLE_X + COLS[0], top: rowY + 6, whiteSpace: "nowrap" }}>
              <span style={{ ...note(30, INK), fontWeight: 700 }}>{fmt(o.d, 1)}</span>
            </Ink>
            <Ink at={at[i] + 2} dur={12} style={{ left: TABLE_X + COLS[1], top: rowY + 2, whiteSpace: "nowrap", opacity: 1 - startDim }}>
              <span style={{ ...body(34, true), color: INK }}>{o.label}</span>
            </Ink>
            <Ink
              at={i === 2 ? eightAt - 2 : overlapAt + i * 4}
              dur={12}
              style={{ left: TABLE_X + COLS[2], top: rowY + 6, whiteSpace: "nowrap" }}
            >
              <span style={{ ...note(30, i === 2 ? STAT_INK : INK), fontWeight: 700 }}>
                {i === 2 ? <Marker at={thirdsAt - 2}>{Math.round(o.shared * 100)}%</Marker> : `${Math.round(o.shared * 100)}%`}
              </span>
            </Ink>
            <div
              style={{
                position: "absolute",
                left: TABLE_X,
                top: rowY + ROW - 16,
                width: 440,
                height: 1,
                background: HAIRLINE,
                opacity: 0.5 * ease(frame, at[i], 12),
              }}
            />
          </React.Fragment>
        );
      })}
      <Ring x={TABLE_X + COLS[2] + 34} y={y(TABLE_Y) + 56 + 2 * ROW + 24} at={thirdsAt - 2} r1={64} />
      <Ring x={TABLE_X + COLS[1] + 50} y={y(TABLE_Y) + 56 + 2 * ROW + 24} at={evenAt - 2} r1={70} />
      <Note at={startAt - 2} x={TABLE_X} y={y(TABLE_Y) + 56 + 3 * ROW + 6}>
        <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>
          only a start: <Marker at={stakeAt - 2}>what&apos;s at stake</Marker> decides big
        </span>
      </Note>
      <Spot id="interpreting-results-caliper" at={bigAt - 4} left={1620} top={y(640)} width={140} height={360} />
      <Ring x={(sx(X, 0) + sx(X, d)) / 2} y={peakY - 52} at={sizeAt - 2} r0={30} r1={90} />
      <Ring x={TABLE_X + 200} y={y(TABLE_Y) + 56 + 3 * ROW + 60} at={haveAt - 2} r0={30} r1={120} />
      <Note at={unlikeAt - 2} x={TABLE_X} y={y(TABLE_Y) + 56 + 3 * ROW + 46}>
        <span style={{ ...note(22, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          and no <Marker at={dataAt - 2}>sample size</Marker> in the formula
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** Φ, for the shared area as group B slides. */
function normalCdf(x: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - (Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)) * d;
  return x >= 0 ? p : 1 - p;
}
