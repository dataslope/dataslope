import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { Axis, Bars, NormalCurve, type XScale } from "./charts";
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
import { SERIF } from "./fonts";
import { ACCENT, ACCENT_INK, BAR, body, fmt, HAIRLINE, headline, INK_SOFT, note, label } from "./style";
import { FigLabel, Ink, Note } from "./ui";

const POP_BASE = 470;
const POP_H = 170;
const MEANS_BASE = 862;
const MEANS_H = 250;
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
    sub: "flat: every face equally likely",
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
      <FigLabel n="3" title="Three populations, each averaged thirty at a time" at={open} x={120} y={104} />

      {PREPARED.map((c, i) => {
        const at = appear[i];
        // Column A's bell is the one just built in act 1: it is there from the
        // start. B and C are averaged on "Average thirty".
        const mAt = i === 0 ? open + 4 : averageAt + (i - 1) * 6;
        const centre = (c.mCounts.length - 1) / 2;
        return (
          <React.Fragment key={c.letter}>
            <Ink at={at - 2} dur={16} style={{ left: colX(i), top: 158, whiteSpace: "nowrap" }}>
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
              base={POP_BASE}
              unit={c.popUnit}
              grow={(b) => ease(frame, at + b * 0.6, 12)}
            />
            <Axis scale={c.popScale} base={POP_BASE} ticks={c.popTicks} format={c.popFmt} at={at} size={20} />

            {/* The step between the rows: "average thirty". */}
            <Ink at={mAt - 6} dur={14} style={{ left: colX(i), top: 528, width: COL_W }}>
              <div style={{ height: 1, background: HAIRLINE, marginBottom: 12 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={label(19, INK_SOFT)}>↓ Averages of 30</span>
                <span style={note(20, INK_SOFT)}>
                  spread <b style={{ color: ACCENT_INK }}>{fmt(c.simSpread)}</b>
                </span>
              </div>
            </Ink>
            <Bars
              counts={c.mCounts}
              lo={c.mLo}
              bin={c.mBin}
              scale={c.mScale}
              base={MEANS_BASE}
              unit={c.mUnit}
              color={BAR}
              grow={(b) => ease(frame, mAt + Math.abs(b - centre) * 0.7, 12)}
            />
            <Axis scale={c.mScale} base={MEANS_BASE} ticks={c.mTicks} format={c.mFmt} at={mAt - 4} size={20} />
            <NormalCurve
              scale={c.mScale}
              base={MEANS_BASE}
              unit={c.mUnit}
              mu={c.mu}
              sd={c.spread}
              count={SAMPLE_COUNT}
              bin={c.mBin}
              at={i === 0 ? open + 12 : sameAt - 4 + (i - 1) * 6}
              color={ACCENT}
              width={2.6}
            />
          </React.Fragment>
        );
      })}

      {/* Under the axes, not above the curves: column C's bell peaks right
          where a note at the top of the panel would sit. */}
      <Note at={sameAt + 12} x={1780} y={904} align="right" from="right">
        <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 27, color: ACCENT_INK }}>
          red: the normal curve the theorem predicts
        </span>
      </Note>

      <Illustration
        video={VIDEO}
        id="clt-dice"
        style={{
          position: "absolute",
          left: colX(1) + 360,
          top: 130,
          width: 140,
          height: 136,
          opacity: diceIn,
          transform: `translateY(${bob(frame, 4, 80)}px) rotate(${(1 - diceIn) * -40}deg) scale(${0.6 + diceIn * 0.4})`,
        }}
      />
      <Illustration
        video={VIDEO}
        id="clt-coffee-queue"
        style={{
          position: "absolute",
          left: colX(0) + 330,
          top: 150,
          width: 170,
          height: 118,
          opacity: cupIn,
          transform: `translateY(${bob(frame + 30, 4, 90) + (1 - cupIn) * 20}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
