import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { fmt, halo, INK, INK_SOFT, note, PAPER } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { INCOME, normalPdf } from "./data";
import { ASK, ASK_FILL, areaD, askNote, Count, Curve, curveD, DIST, Drift, Head, KBars, lerp, pulse, VRule } from "./parts";

/** Dollars, in thousands on the axis. */
const X: XScale = { lo: -60_000, hi: 160_000, x0: 160, x1: 1700 };
const BASE = 820;
const TALL = 400;
const money = (v: number) => (v === 0 ? "0" : `${v < 0 ? "−" : ""}${fmt(Math.abs(v), 0)}`);

/**
 * Part 3's close: 5,000 skewed incomes, their mean pulled above their
 * median, and a normal forced onto them with the same mean and SD, which
 * puts six percent of people below zero.
 */
export const SkewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const incomesFrom = n.beat("incomes").from;
  const thousandAt = n.word("incomes", "five thousand incomes");
  const tailAt = n.word("incomes", "long tail");
  const earnersEnd = n.word("incomes", "earners", { edge: "end" });
  const meanAt = n.word("incomes", "mean");
  const medianAt = n.word("incomes", "median");
  const forceAt = n.word("force", "Force");
  const sameAt = n.word("force", "same mean");
  const sixAt = n.word("below", "six percent");
  const zeroAt = n.word("below", "below zero");
  const nothingAt = n.word("below", "less than nothing");
  const assumeAt = n.word("check", "don't assume");
  const plotAt = n.word("check", "plot");
  const checkingAt = n.word("fit-in", "checking");
  const fittingAt = n.word("fit-in", "fitting");

  const base = y(BASE);
  const unit = h(TALL) / Math.max(...INCOME.counts);
  const ks = INCOME.counts.map((_, i) => INCOME.lo + (i + 0.5) * INCOME.bin);
  // KBars centres a bar on k with a step of one unit; here a unit is a bin.
  const BX: XScale = { lo: X.lo / INCOME.bin, hi: X.hi / INCOME.bin, x0: X.x0, x1: X.x1 };
  const barAt = (i: number) => lerp(thousandAt - 2, earnersEnd - 4, i / (INCOME.counts.length - 1));
  // The normal forced onto them, in incomes per bin.
  const perBin = (v: number) => INCOME.n * INCOME.bin * normalPdf(v, INCOME.mean, INCOME.sd);
  const py = (c: number) => base - c * unit;
  const tailGlow = (i: number) => pulse(frame, tailAt - 4 + (i - 16) * 1.4, 16);
  const below = ease(frame, zeroAt - 6, 18);
  const dim = ease(frame, checkingAt - 6, 14) * 0.3;
  const zeroX = sx(X, 0);

  return (
    <AbsoluteFill>
      {/* ── Sound: the incomes, the mean and median, the forced normal, the
           impossible area below zero ── */}
      <Sfx name="el-sprinkle" at={thousandAt - 2} level={-34} />
      <Sfx name="el-tap" at={meanAt - 4} level={-29} />
      <Sfx name="el-tap" at={medianAt - 4} level={-30} />
      <Sfx name="el-pencil" at={forceAt - 2} level={-33} />
      <Sfx name="el-pop" at={sixAt - 6} level={-29} />

      <Head parts={[{ text: "Not every shape is a bell.", at: incomesFrom - 4 }]} out={assumeAt - 8} />
      <Head
        parts={[
          { text: "Don't assume it.", at: assumeAt - 4 },
          { text: "Plot it.", at: plotAt - 6, italic: true },
        ]}
      />

      <Drift from={incomesFrom} to={n.beat("fit-in").to + 40}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - dim }}>
          <FigLabel n="12" title={`${fmt(INCOME.n, 0)} incomes, in dollars`} at={thousandAt - 6} x={160} y={y(300)} />
          <Axis scale={X} base={base} ticks={[-50_000, 0, 50_000, 100_000, 150_000]} format={money} at={thousandAt - 6} />
          <KBars
            ks={ks.map((v) => v / INCOME.bin)}
            values={INCOME.counts}
            scale={BX}
            base={base}
            unit={unit}
            width={0.86}
            grow={(i) => ease(frame, barAt(i), 10)}
            fill={(i) => {
              const g = i >= 16 ? tailGlow(i) : 0;
              return g > 0 ? `color-mix(in srgb, ${DIST} ${100 - g * 50}%, ${PAPER})` : DIST;
            }}
          />
          <Note at={tailAt + 2} x={X.x1 - 10} y={base - h(70)} align="right">
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>and {INCOME.beyond} more, up to {fmt(INCOME.max, 0)} →</span>
          </Note>
          <Note at={tailAt + 12} x={X.x1 - 10} y={base - h(40)} align="right">
            <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>a long tail of high earners</span>
          </Note>

          {/* Mean and median. */}
          <VRule x={sx(X, INCOME.mean)} bottom={base} top={base - h(TALL + 50)} at={meanAt - 4} />
          <Note at={meanAt} x={sx(X, INCOME.mean) + 12} y={base - h(TALL + 54)}>
            <span style={{ ...note(23, INK), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>mean {fmt(INCOME.mean, 0)}</span>
          </Note>
          <VRule x={sx(X, INCOME.median)} bottom={base} top={base - h(TALL + 50)} at={medianAt - 4} color={INK_SOFT} dash="3 5" />
          <Note at={medianAt} x={sx(X, INCOME.median) - 12} y={base - h(TALL + 54)} align="right">
            <span style={{ ...note(23, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap", ...halo }}>median {fmt(INCOME.median, 0)}</span>
          </Note>

          {/* The normal forced onto them, and the impossible part of it. */}
          {below > 0 ? (
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <path d={areaD(perBin, X.lo, lerp(X.lo, 0, below), X, py)} fill={ASK_FILL} />
              <line x1={zeroX} x2={zeroX} y1={base} y2={base - h(TALL)} stroke={INK} strokeWidth={2.4} />
            </svg>
          ) : null}
          <Curve
            d={curveD(perBin, X.lo, X.hi, X, py)}
            at={forceAt - 2}
            dur={sameAt - forceAt + 24}
            color={ASK}
            width={3.4 + pulse(frame, fittingAt - 4, 26) * 3}
          />
          <Note at={sameAt + 4} x={sx(X, 80_000)} y={py(perBin(80_000)) - 52}>
            <span style={{ ...askNote(22), whiteSpace: "nowrap", ...halo }}>a normal with the same mean and SD</span>
          </Note>
          <Note at={sixAt - 6} x={zeroX - 16} y={base - h(250)} align="right">
            <span style={{ ...askNote(30), whiteSpace: "nowrap", ...halo }}>
              below zero: <Count at={sixAt - 6} dur={16} to={INCOME.belowZero} suffix="%" />
            </span>
          </Note>
          <Note at={nothingAt - 2} x={zeroX - 16} y={base - h(250) + 42} align="right">
            <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...halo }}>earning less than nothing</span>
          </Note>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};
