import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Axis, Bars, NormalCurve, type XScale } from "../../editorial/charts";
import {
  DIE_MEANS_30,
  DIE_ROLLS,
  histogram,
  HUMP_MEANS_30,
  HUMPS,
  MEANS_30,
  mean,
  SAMPLE_COUNT,
  sd,
  VIDEO,
  WAITS,
} from "./data";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, body, fmt, HAIRLINE, headline, INK, INK_SOFT, note, label } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useFigNumber } from "../sampling/merged";

/** The figure label's row; the column heads start well clear of it. */
const LABEL_Y = 104;
const HEAD_Y = 178;
const POP_BASE = 494;
const POP_H = 160;
/** The "averages of 30" rule between the two rows of charts. */
const STEP_Y = 558;
const MEANS_BASE = 874;
const MEANS_H = 236;
const COL_W = 500;
const colX = (c: number) => 120 + c * 580;

type Column = {
  letter: string;
  title: string;
  sub: string;
  pop: readonly number[];
  popLo: number;
  popHi: number;
  popBin: number;
  popTicks: number[];
  popFmt?: (v: number) => string;
  means: readonly number[];
  mLo: number;
  mHi: number;
  mBin: number;
  mTicks: number[];
  mFmt?: (v: number) => string;
};

/** The mean of 30 die rolls lives on a lattice of thirtieths; bins of 0.1
 *  starting half a step off the lattice hold exactly three values each, so
 *  the histogram shows the distribution instead of a comb. */
const DIE_LO = 68.5 / 30;

const COLUMNS: Column[] = [
  {
    letter: "A",
    title: "Wait times",
    sub: "a long tail to the right",
    pop: WAITS,
    popLo: 0,
    popHi: 50,
    popBin: 2,
    popTicks: [0, 10, 20, 30, 40, 50],
    popFmt: (v) => (v === 50 ? "50 min" : String(v)),
    means: MEANS_30,
    mLo: 3,
    mHi: 17,
    mBin: 0.5,
    mTicks: [5, 10, 15],
    mFmt: (v) => (v === 15 ? "15 min" : String(v)),
  },
  {
    letter: "B",
    title: "One die",
    sub: "flat: each face 1 in 6",
    pop: DIE_ROLLS,
    popLo: 0.5,
    popHi: 6.5,
    popBin: 1,
    popTicks: [1, 2, 3, 4, 5, 6],
    means: DIE_MEANS_30,
    mLo: DIE_LO,
    mHi: DIE_LO + 2.4,
    mBin: 0.1,
    mTicks: [2.5, 3, 3.5, 4, 4.5],
    mFmt: (v) => v.toFixed(1),
  },
  {
    letter: "C",
    title: "Two humps",
    sub: "half near 5, half near 15",
    pop: HUMPS,
    popLo: 0,
    popHi: 20,
    popBin: 0.8,
    popTicks: [0, 5, 10, 15, 20],
    means: HUMP_MEANS_30,
    mLo: 6,
    mHi: 14,
    mBin: 0.32,
    mTicks: [6, 8, 10, 12, 14],
  },
];

const PREPARED = COLUMNS.map((c, i) => {
  const popScale: XScale = { lo: c.popLo, hi: c.popHi, x0: colX(i), x1: colX(i) + COL_W };
  const mScale: XScale = { lo: c.mLo, hi: c.mHi, x0: colX(i), x1: colX(i) + COL_W };
  const popCounts = histogram(c.pop, c.popLo, c.popHi, c.popBin);
  const mCounts = histogram(c.means, c.mLo, c.mHi, c.mBin);
  const mu = mean(c.pop);
  // The CLT's prediction: the population's own spread over root 30.
  const spread = sd(c.pop) / Math.sqrt(30);
  const curvePeak = (SAMPLE_COUNT * c.mBin) / (spread * Math.sqrt(2 * Math.PI));
  return {
    ...c,
    popScale,
    mScale,
    popCounts,
    popUnit: POP_H / Math.max(...popCounts),
    mCounts,
    mUnit: MEANS_H / Math.max(curvePeak, ...mCounts),
    mu,
    spread,
    simSpread: sd(c.means),
    /** How much wider each average's axis is drawn than its population's. */
    zoom: (c.popHi - c.popLo) / (c.mHi - c.mLo),
  };
});

/**
 * "It isn't about wait times": three very different populations side by
 * side, and the same bell under each once they are averaged thirty at a time.
 */
export const ShapesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = useNarration();
  const { y, h } = useLayout();
  const fig = useFigNumber();
  const start = n.beat("any-shape").from;
  // The scene window opens 8 frames before the beat; its first marks start
  // inking a little before that, so the cut is a true cross-fade.
  const open = start - 14;
  const appear = [open + 2, n.word("any-shape", "Die"), n.word("any-shape", "two humps")];
  const averageAt = n.word("any-bell", "Average");
  const sameAt = n.word("any-bell", "same bell");
  const diceIn = pop(frame, appear[1] - 4, fps, 12);
  const cupIn = pop(frame, open + 4, fps, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the dice, the third population, the averages, the curves ── */}
      <Sfx name="el-pop" at={appear[1] - 4} level={-30} />
      <Sfx name="el-pop" at={appear[2]} level={-30} />
      <Sfx name="el-pop" at={averageAt} level={-30} />
      <Sfx name="el-pencil" at={sameAt - 4} level={-34} />

      <FigLabel n={fig(3)} title="Three populations, each averaged thirty at a time" at={open} x={120} y={y(LABEL_Y)} />
      {/* The legend for the curves, at the right end of the label row. */}
      <Note at={sameAt + 12} x={1780} y={y(LABEL_Y) + 2} align="right" from="right">
        <span style={{ ...note(22, INK_SOFT), display: "inline-flex", alignItems: "center", gap: 12 }}>
          <svg width={36} height={10} style={{ overflow: "visible" }}>
            <line x1={2} x2={34} y1={5} y2={5} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
          </svg>
          the normal curve the theorem predicts
        </span>
      </Note>

      {PREPARED.map((c, i) => {
        const at = appear[i];
        // Column A's bell is the one just built in act 1: it is there from the
        // start. B and C are averaged on "Average thirty".
        const mAt = i === 0 ? open + 4 : averageAt + (i - 1) * 6;
        const centre = (c.mCounts.length - 1) / 2;
        return (
          <React.Fragment key={c.letter}>
            <Ink at={at - 2} dur={16} style={{ left: colX(i), top: y(HEAD_Y), whiteSpace: "nowrap" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={label(20, ACCENT_INK)}>{c.letter}</span>
                <span style={headline(46)}>{c.title}</span>
              </div>
              <div style={{ ...body(26, true), marginTop: 6, marginLeft: 30 }}>{c.sub}</div>
            </Ink>
            <Bars
              counts={c.popCounts}
              lo={c.popLo}
              bin={c.popBin}
              scale={c.popScale}
              base={y(POP_BASE)}
              unit={h(c.popUnit)}
              grow={(b) => ease(frame, at + b * 0.6, 12)}
            />
            <Axis scale={c.popScale} base={y(POP_BASE)} ticks={c.popTicks} format={c.popFmt} at={at} size={20} />

            {/* The step between the rows: "average thirty". */}
            <Ink at={mAt - 6} dur={14} style={{ left: colX(i), top: y(STEP_Y), width: COL_W }}>
              <div style={{ height: 1, background: HAIRLINE, marginBottom: 12 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={label(19, INK_SOFT)}>↓ Averages of 30</span>
                <span style={note(20, INK_SOFT)}>
                  spread <b style={{ color: ACCENT_INK }}>{fmt(c.simSpread)}</b>
                </span>
              </div>
              {/* Each pile fills its panel: say how far it is magnified, so
                  its width is not read against the population's. */}
              <div style={{ ...note(19, INK_SOFT), marginTop: 2 }}>axis zoomed in {fmt(c.zoom, 1)}×</div>
            </Ink>
            <Bars
              counts={c.mCounts}
              lo={c.mLo}
              bin={c.mBin}
              scale={c.mScale}
              base={y(MEANS_BASE)}
              unit={h(c.mUnit)}
              color={ACCENT}
              grow={(b) => ease(frame, mAt + Math.abs(b - centre) * 0.7, 12)}
            />
            <Axis scale={c.mScale} base={y(MEANS_BASE)} ticks={c.mTicks} format={c.mFmt} at={mAt - 4} size={20} />
            <NormalCurve
              scale={c.mScale}
              base={y(MEANS_BASE)}
              unit={h(c.mUnit)}
              mu={c.mu}
              sd={c.spread}
              count={SAMPLE_COUNT}
              bin={c.mBin}
              at={i === 0 ? open + 12 : sameAt - 4 + (i - 1) * 6}
              color={INK}
              width={2.4}
            />
          </React.Fragment>
        );
      })}

      <Illustration
        video={VIDEO}
        id="clt-dice"
        style={{
          position: "absolute",
          left: colX(1) + 372,
          top: y(HEAD_Y - 18),
          width: 132,
          height: 128,
          opacity: diceIn,
          transform: `translateY(${bob(frame, 4, 80)}px) rotate(${(1 - diceIn) * -40}deg) scale(${0.6 + diceIn * 0.4})`,
        }}
      />
      <Illustration
        video={VIDEO}
        id="clt-coffee-queue"
        style={{
          position: "absolute",
          left: colX(0) + 336,
          top: y(HEAD_Y - 4),
          width: 164,
          height: 114,
          opacity: cupIn,
          transform: `translateY(${bob(frame + 30, 4, 90) + (1 - cupIn) * 20}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
