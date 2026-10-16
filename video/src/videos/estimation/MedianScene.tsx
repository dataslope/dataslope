import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, halo, headline, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { histogram, jitter, MEDIAN } from "./data";
import { DATA, EST, EST_INK, Headline, IntervalBar, Rule, Slot, Strike, Svg } from "./parts";

/** Fig. 9: the incomes, in thousands of dollars. */
const X: XScale = { lo: 0, hi: 140, x0: 160, x1: 1760 };
const STRIP = 330;
const AXIS1 = 384;
/** Fig. 10: the resampled medians, zoomed, in thousands. */
const XZ: XScale = { lo: 27, hi: 41, x0: 160, x1: 1240 };
const BIN = 0.1;
const HIST_BASE = 852;
const HIST_H = 210;
const COL = 1340;

const K = (v: number) => v / 1000;
const JIT = jitter(120, MEDIAN.n);
const MEDIANS = MEDIAN.medians.map(K);
const FINAL = histogram(MEDIANS, XZ.lo, XZ.hi, BIN);
const UNIT = HIST_H / Math.max(...FINAL);
const dollars = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

/**
 * Part 3, the payoff: the lesson's 120 skewed incomes and the same loop with
 * one word changed. The resampled medians pile up lumpy, on spikes that sit
 * among the real incomes, and their middle 95% is the interval no formula
 * gave.
 */
export const MedianScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const medianFrom = n.beat("median").from;
  const incomesAt = n.word("median", "incomes");
  const skewedAt = n.word("median", "skewed");
  const medianAt = n.word("median", "median");
  const honestAt = n.word("median", "honest");
  const loopAt = n.word("word", "same loop");
  const oneWordAt = n.word("word", "one word");
  const medianWordAt = n.word("word", "median");
  const pileAt = n.word("lumpy", "pile");
  const lumpyAt = n.word("lumpy", "lumpy");
  const sawAt = n.word("lumpy", "values you actually saw");
  const middleAt = n.word("range", "middle");
  const thirtyAt = n.word("range", "thirty thousand");
  const thirtySevenAt = n.word("range", "thirty-seven");
  const formulaAt = n.word("range", "No formula");

  // The pile: five thousand medians, piling up from "pile" to "lumpy".
  const fastFrom = pileAt - 6;
  const fastTo = Math.max(fastFrom + 36, lumpyAt + 8);
  const p = Math.min(1, Math.max(0, (frame - fastFrom) / (fastTo - fastFrom)));
  const k = frame < fastFrom ? 0 : Math.round(MEDIAN.B ** p);
  const counts = histogram(MEDIANS.slice(0, k), XZ.lo, XZ.hi, BIN);
  const tails = ease(frame, middleAt - 2, 14);
  const near = MEDIAN.values.map(K).filter((v) => v >= XZ.lo && v <= XZ.hi);

  return (
    <AbsoluteFill>
      {/* ── Sound: the incomes, the struck word, the pile, the interval ── */}
      <Sfx name="el-sprinkle" at={incomesAt - 6} level={-33} />
      <Sfx name="el-tap" at={medianAt - 2} level={-28} />
      <Sfx name="el-scratch" at={oneWordAt - 2} level={-30} />
      <Sfx name="el-sprinkle" at={fastFrom} level={-33} />
      <Sfx name="el-pencil" at={thirtyAt - 4} level={-34} />

      <Headline at={medianFrom - 4} second={oneWordAt - 4} size={64} italic="one word changed.">
        The same loop,
      </Headline>

      {/* ── Fig. 9: the incomes ── */}
      <FigLabel n="9" title={`${MEDIAN.n} incomes, in thousands of dollars`} at={incomesAt - 8} x={160} y={y(262)} />
      <Svg>
        {MEDIAN.values.map((v, j) => {
          const a = ease(frame, incomesAt - 6 + j * 0.2, 7);
          if (a <= 0) return null;
          return <circle key={j} cx={sx(X, K(v))} cy={y(STRIP) + h((JIT[j] - 0.5) * 30)} r={5.5 * a} fill={DATA} stroke={PAPER} strokeWidth={1} opacity={0.85} />;
        })}
      </Svg>
      <Axis scale={X} base={y(AXIS1)} ticks={[0, 20, 40, 60, 80, 100, 120, 140]} at={incomesAt - 6} />
      <Note at={skewedAt - 2} x={sx(X, 70)} y={y(STRIP) - 46}>
        <span style={{ ...note(22, INK_SOFT), ...halo, whiteSpace: "nowrap" }}>a few large incomes, far out</span>
      </Note>
      <Rule x={sx(X, K(MEDIAN.median))} y0={y(STRIP) + h(26)} y1={y(STRIP) - h(30)} at={medianAt - 2} color={EST} width={4} />
      <Note at={honestAt - 4} x={sx(X, K(MEDIAN.median)) - 12} y={y(STRIP) - 52} align="right" from="right">
        <span style={{ ...note(22, EST_INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>median {dollars(MEDIAN.median)}</span>
      </Note>

      {/* ── The one word ── */}
      <div style={{ position: "absolute", left: 160, top: y(440), display: "flex", alignItems: "baseline", gap: "0.3em", whiteSpace: "nowrap", ...note(30, INK) }}>
        <Slot at={loopAt - 4}>For each of {MEDIAN.B.toLocaleString("en-US")} resamples, record its</Slot>
        <Slot at={loopAt + 2}>
          <Strike at={oneWordAt - 2}>
            <span style={{ fontWeight: 650 }}>mean</span>
          </Strike>
        </Slot>
        <Slot at={medianWordAt - 4} style={{ color: EST_INK, fontWeight: 700 }}>
          median
        </Slot>
      </div>

      {/* ── Fig. 10: the medians ── */}
      <FigLabel n="10" title={`${MEDIAN.B.toLocaleString("en-US")} resampled medians, in thousands`} at={pileAt - 8} x={160} y={y(536)} />
      <Axis scale={XZ} base={y(HIST_BASE)} ticks={[27, 29, 31, 33, 35, 37, 39, 41]} at={pileAt - 8} />
      <Bars counts={counts} lo={XZ.lo} bin={BIN} scale={XZ} base={y(HIST_BASE)} unit={h(Math.min(12, HIST_H / Math.max(1, ...counts)))} color={EST} gap={1} />
      {tails > 0 ? (
        <Bars
          counts={FINAL.map((c, i) => {
            const mid = XZ.lo + (i + 0.5) * BIN;
            return mid < K(MEDIAN.lo) || mid > K(MEDIAN.hi) ? c : 0;
          })}
          lo={XZ.lo}
          bin={BIN}
          scale={XZ}
          base={y(HIST_BASE)}
          unit={h(UNIT)}
          color={ds("red", 200)}
          gap={1}
          opacity={tails}
        />
      ) : null}
      {/* The real incomes in this stretch, under the spikes. */}
      <Svg opacity={ease(frame, sawAt - 4, 14)}>
        {near.map((v, i) => (
          <line key={i} x1={sx(XZ, v)} x2={sx(XZ, v)} y1={y(HIST_BASE) + 36} y2={y(HIST_BASE) + 50} stroke={DATA} strokeWidth={2.4} />
        ))}
      </Svg>
      <Note at={sawAt} x={sx(XZ, 37.6)} y={y(HIST_BASE) - h(HIST_H * 0.62)}>
        <span style={{ ...note(22, INK), ...halo, whiteSpace: "nowrap" }}>
          only {MEDIAN.distinct} different values
          <br />
          <span style={{ color: DATA }}>blue ticks: the incomes</span>
        </span>
      </Note>
      <Rule x={sx(XZ, K(MEDIAN.lo))} y0={y(HIST_BASE)} y1={y(HIST_BASE) - h(HIST_H) - 40} at={thirtyAt - 4} color={INK} width={2.2} />
      <Rule x={sx(XZ, K(MEDIAN.hi))} y0={y(HIST_BASE)} y1={y(HIST_BASE) - h(HIST_H) - 40} at={thirtySevenAt - 4} color={INK} width={2.2} />
      <IntervalBar
        x0={sx(XZ, K(MEDIAN.lo))}
        x1={sx(XZ, K(MEDIAN.hi))}
        y={y(HIST_BASE) - h(HIST_H) - 30}
        at={thirtyAt}
        dur={22}
        color={INK}
        width={4}
        tick={10}
      />

      {/* ── Right column: the count, then the interval ── */}
      <div style={{ position: "absolute", left: COL, top: y(560), opacity: ease(frame, pileAt - 6, 12) }}>
        <div style={label(21, INK_SOFT)}>Resamples</div>
        <div style={{ ...headline(72), fontVariantNumeric: "tabular-nums lining-nums", marginTop: 4, color: k >= MEDIAN.B ? INK : EST_INK }}>
          {k.toLocaleString("en-US")}
        </div>
      </div>
      <Ink at={middleAt - 4} dur={14} style={{ left: COL, top: y(700), width: 420 }}>
        <div style={{ height: 1, background: HAIRLINE, marginBottom: 12 }} />
        <div style={label(21, INK_SOFT)}>95% interval for the median</div>
      </Ink>
      <div style={{ position: "absolute", left: COL, top: y(748), display: "flex", gap: "0.3em", whiteSpace: "nowrap", ...headline(44) }}>
        <Slot at={thirtyAt - 2}>{dollars(MEDIAN.lo)}</Slot>
        <Slot at={thirtySevenAt - 4}>to {dollars(MEDIAN.hi)}</Slot>
      </div>
      <Ink at={formulaAt - 4} dur={16} style={{ left: COL, top: y(818), whiteSpace: "nowrap" }}>
        <span style={{ ...body(30, true), color: EST_INK }}>No formula needed.</span>
      </Ink>
    </AbsoluteFill>
  );
};
