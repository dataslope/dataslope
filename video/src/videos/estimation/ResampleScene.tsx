import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, HAIRLINE, halo, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { BOOT, histogram, jitter } from "./data";
import { Bracket, DATA, EST, EST_INK, Headline, IntervalBar, Kicker, lerp, Marked, pulse, Rule, Spot, Svg } from "./parts";

/** Fig. 7: the sixty waits, and one resample of them stacked below. */
const X: XScale = { lo: 0, hi: 20, x0: 160, x1: 1760 };
const STRIP = 330;
const AXIS1 = 384;
const RES_BASE = 492;
const STACK = 13;
/** Fig. 8: the resampled averages, zoomed. */
const XZ: XScale = { lo: 5, hi: 9, x0: 160, x1: 1240 };
const BIN = 0.05;
const HIST_BASE = 852;
const HIST_H = 196;
const COL = 1340;

const JIT = jitter(60, BOOT.n);
const COUNTS = histogram(BOOT.means, XZ.lo, XZ.hi, BIN);
const UNIT = HIST_H / Math.max(...COUNTS);

/** For each draw of a resample, how many earlier draws picked the same value:
 *  its height in the stack. */
const stacked = (picks: readonly number[]) => {
  const seen = new Map<number, number>();
  return picks.map((i) => {
    const k = seen.get(i) ?? 0;
    seen.set(i, k + 1);
    return k;
  });
};
const STACKS = BOOT.picks.map(stacked);

/**
 * Part 3 opens: the bootstrap, step by step on the lesson's sixty waits. One
 * resample is drawn with replacement, value by value, so the repeats stack
 * and the misses go hollow; its average falls into Fig. 8; then two more, and
 * five thousand, and the pile's spread and middle 95% beside the formula's.
 */
export const ResampleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const bootFrom = n.beat("bootstrap").from;
  const medianAt = n.word("bootstrap", "median");
  const correlationAt = n.word("bootstrap", "correlation");
  const uglyAt = n.word("bootstrap", "ugly");
  const bootstrapsAt = n.word("trick", "bootstrap's");
  const treatAt = n.word("trick", "treat");
  const populationAt = n.word("trick", "population");
  const sixtyAt = n.word("waits", "sixty");
  const skewedAt = n.word("waits", "skewed");
  const drawAt = n.word("resample", "Draw");
  const replacementAt = n.word("resample", "replacement");
  const twiceAt = n.word("resample", "twice");
  const threeAt = n.word("resample", "three times");
  const notAt = n.word("resample", "not at all");
  const averageAt = n.word("again", "Average");
  const againAt = n.word("again", "again");
  const thousandAt = n.word("again", "five thousand");
  const pileAt = n.word("pile", "pile");
  const distributionAt = n.word("pile", "bootstrap distribution");
  const spreadAt = n.word("pile", "spread");
  const fourEightAt = n.word("pile", "zero point four eight");
  const formulaAt = n.word("pile", "formula");
  const fourNineAt = n.word("pile", "zero point four nine");
  const middleAt = n.word("middle", "middle");
  const sixOneAt = n.word("middle", "six point one");
  const eightOhAt = n.word("middle", "eight point oh");
  const tAt = n.word("middle", "t-interval");
  const longAt = n.word("payoff-in", "long way round");
  const payoffAt = n.word("payoff-in", "payoff");
  const elseAt = n.word("payoff-in", "everything else");

  // ── The three resamples drawn one by one, then the rest at once ──
  const draws = [
    { s: drawAt, stagger: 1.05, c: averageAt - 2, fall: averageAt + 12 },
    { s: againAt + 2, stagger: 0.2, c: againAt + 16, fall: againAt + 24 },
    { s: againAt + 26, stagger: 0.16, c: againAt + 38, fall: againAt + 44 },
  ];
  const fastFrom = Math.max(draws[2].fall + 10, thousandAt + 6);
  const fastTo = Math.max(fastFrom + 30, pileAt + 4);
  const landed = (f: number) => {
    let k = draws.filter((d) => f >= d.fall + 12).length;
    if (f >= fastFrom) {
      const p = Math.min(1, (f - fastFrom) / (fastTo - fastFrom));
      k = Math.max(k, Math.round(3 * (BOOT.B / 3) ** p));
    }
    return k;
  };
  const k = landed(frame);
  const counts = histogram(BOOT.means.slice(0, k), XZ.lo, XZ.hi, BIN);
  const active = draws.findIndex((d, i) => frame >= d.s && (i === 2 ? frame < d.fall + 12 : frame < draws[i + 1].s));

  const hollow = ease(frame, notAt - 4, 12);
  const tails = ease(frame, middleAt - 2, 14);
  const center = BOOT.mean;
  const seY = y(HIST_BASE) - h(HIST_H * 0.55);

  return (
    <AbsoluteFill>
      {/* ── Sound: the boot, the sixty waits, the first resample, the first average, the pile, the cuts ── */}
      <Sfx name="el-pop" at={bootstrapsAt - 6} level={-30} />
      <Sfx name="el-sprinkle" at={sixtyAt - 4} level={-33} />
      <Sfx name="el-sprinkle" at={drawAt} level={-35} />
      <Sfx name="el-tap" at={draws[0].fall + 10} level={-28} />
      <Sfx name="el-sprinkle" at={fastFrom} level={-33} />
      <Sfx name="el-pencil" at={middleAt - 2} level={-34} />

      <Kicker at={bootFrom - 10}>The bootstrap</Kicker>
      <Headline at={bootFrom - 4} second={medianAt - 6} out={treatAt - 8} size={64} italic="of a median?">
        What’s the standard error
      </Headline>
      <Headline at={treatAt - 4} second={populationAt - 6} size={64} italic="the population.">
        Treat the sample as
      </Headline>
      <Spot id="estimation-boot" at={bootstrapsAt - 6} left={1590} top={y(84)} width={150} height={210} />
      <Note at={correlationAt - 2} x={92} y={y(232)} out={treatAt - 8}>
        <span style={{ ...body(30, true), color: INK_SOFT, whiteSpace: "nowrap" }}>
          Or of a correlation?{" "}
          <span style={{ opacity: ease(frame, uglyAt - 4, 12) }}>The formula is ugly, or there isn’t one.</span>
        </span>
      </Note>

      {/* ── Fig. 7: the waits, and a resample ── */}
      <FigLabel n="7" title={`${BOOT.n} customer wait times, in minutes`} at={sixtyAt - 8} x={160} y={y(262)} />
      <Svg>
        {BOOT.values.map((v, j) => {
          const a = ease(frame, sixtyAt - 4 + j * 0.35, 7);
          if (a <= 0) return null;
          const never = BOOT.timesDrawn[j] === 0 ? hollow : 0;
          return (
            <circle
              key={j}
              cx={sx(X, v)}
              cy={y(STRIP) + h((JIT[j] - 0.5) * 30)}
              r={6.5 * a}
              fill={never > 0 ? `color-mix(in srgb, ${DATA} ${Math.round(100 - 85 * never)}%, ${PAPER})` : DATA}
              stroke={never > 0 ? DATA : PAPER}
              strokeWidth={never > 0 ? 1.8 : 1.2}
              opacity={0.9}
            />
          );
        })}
      </Svg>
      <Axis scale={X} base={y(AXIS1)} ticks={[0, 5, 10, 15, 20]} at={sixtyAt - 6} />
      <Note at={skewedAt - 2} x={sx(X, 14)} y={y(STRIP) - 44}>
        <span style={{ ...note(22, INK_SOFT), ...halo, whiteSpace: "nowrap" }}>a long tail to the right</span>
      </Note>

      {active >= 0 ? <Resample index={active} draw={draws[active]} /> : null}
      <Ink at={drawAt - 6} dur={12} out={fastFrom} style={{ left: 160, top: y(RES_BASE) - 64, whiteSpace: "nowrap" }}>
        <span style={label(21, INK_SOFT)}>
          Resample {active >= 0 ? active + 1 : 1}: {BOOT.n} draws
          <span style={{ opacity: ease(frame, replacementAt - 4, 10) }}>, with replacement</span>
        </span>
      </Ink>
      <Note at={twiceAt - 2} x={1240} y={y(RES_BASE) - 64} out={averageAt}>
        <span style={{ ...note(22, INK), ...halo, whiteSpace: "nowrap" }}>
          drawn twice: {BOOT.timesDrawn.filter((t) => t === 2).length}
          <span style={{ opacity: ease(frame, threeAt - 2, 10) }}>, three times: {BOOT.timesDrawn.filter((t) => t === 3).length}</span>
        </span>
      </Note>
      <Note at={notAt - 2} x={1240} y={y(RES_BASE) - 30} out={averageAt}>
        <span style={{ ...note(22, INK_SOFT), ...halo, whiteSpace: "nowrap" }}>never drawn: {BOOT.neverDrawn}, hollow above</span>
      </Note>

      {/* ── Fig. 8: the averages ── */}
      <FigLabel n="8" title={`The average of each resample, zoomed to ${XZ.lo} to ${XZ.hi} minutes`} at={averageAt - 6} x={160} y={y(552)} />
      <Axis scale={XZ} base={y(HIST_BASE)} ticks={[5, 6, 7, 8, 9]} at={averageAt - 4} />
      <Bars
        counts={counts}
        lo={XZ.lo}
        bin={BIN}
        scale={XZ}
        base={y(HIST_BASE)}
        unit={h(Math.min(14, HIST_H / Math.max(1, ...counts)))}
        color={EST}
        gap={1}
      />
      {/* The tails beyond the middle 95%, set back. */}
      {tails > 0 ? (
        <Bars
          counts={COUNTS.map((c, i) => {
            const mid = XZ.lo + (i + 0.5) * BIN;
            return mid < BOOT.lo || mid > BOOT.hi ? c : 0;
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
      {draws.map((d, i) => (
        <FallingAverage key={i} index={i} at={d.fall} />
      ))}
      <Ink at={distributionAt - 4} dur={14} style={{ left: sx(XZ, 8.12), top: y(HIST_BASE) - h(HIST_H * 0.55), whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, EST_INK), fontWeight: 650 }}>the bootstrap distribution</span>
      </Ink>
      <Bracket x0={sx(XZ, center - BOOT.bootSe)} x1={sx(XZ, center + BOOT.bootSe)} y={seY} at={spreadAt - 2} color={INK} />
      <Rule x={sx(XZ, BOOT.lo)} y0={y(HIST_BASE)} y1={y(HIST_BASE) - h(HIST_H) - 56} at={sixOneAt - 4} color={INK} width={2.2} />
      <Rule x={sx(XZ, BOOT.hi)} y0={y(HIST_BASE)} y1={y(HIST_BASE) - h(HIST_H) - 56} at={eightOhAt - 4} color={INK} width={2.2} />
      <IntervalBar x0={sx(XZ, BOOT.lo)} x1={sx(XZ, BOOT.hi)} y={y(HIST_BASE) - h(HIST_H) - 50} at={sixOneAt} dur={18} color={INK} width={4} tick={10} />
      <Note at={eightOhAt} x={sx(XZ, BOOT.hi) + 14} y={y(HIST_BASE) - h(HIST_H) - 66}>
        <span style={{ ...note(22, INK), fontWeight: 700, ...halo, whiteSpace: "nowrap" }}>
          middle 95%: {fmt(BOOT.lo)} to {fmt(BOOT.hi)}
        </span>
      </Note>
      <IntervalBar x0={sx(XZ, BOOT.tLo)} x1={sx(XZ, BOOT.tHi)} y={y(HIST_BASE) - h(HIST_H) - 18} at={tAt - 4} dur={16} color={INK_SOFT} width={2.4} tick={8} dash="6 5" />
      <Note at={tAt} x={sx(XZ, BOOT.tHi) + 14} y={y(HIST_BASE) - h(HIST_H) - 32}>
        <span style={{ ...note(21, INK_SOFT), ...halo, whiteSpace: "nowrap" }}>
          t-interval: {fmt(BOOT.tLo)} to {fmt(BOOT.tHi)}
        </span>
      </Note>

      {/* ── Right column: the count, and the two standard errors ── */}
      <div style={{ position: "absolute", left: COL, top: y(560), opacity: ease(frame, averageAt - 4, 12) }}>
        <div style={label(21, INK_SOFT)}>Resamples</div>
        <div style={{ ...headline(72), fontVariantNumeric: "tabular-nums lining-nums", marginTop: 4, color: k >= BOOT.B ? INK : EST_INK }}>
          {k.toLocaleString("en-US")}
        </div>
      </div>
      <Ink at={spreadAt - 4} dur={14} style={{ left: COL, top: y(690), width: 420 }}>
        <div style={{ height: 1, background: HAIRLINE, marginBottom: 12 }} />
        <div style={label(21, INK_SOFT)}>Standard error</div>
      </Ink>
      <Ink at={fourEightAt - 4} dur={14} style={{ left: COL, top: y(738), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ ...headline(52), color: EST_INK }}>{fmt(BOOT.bootSe)}</span>
        <span style={body(26, true)}>the bootstrap’s spread</span>
      </Ink>
      <Ink at={formulaAt - 4} dur={14} style={{ left: COL, top: y(800), whiteSpace: "nowrap", display: "flex", alignItems: "baseline", gap: 14 }}>
        <span style={{ ...headline(52), opacity: ease(frame, fourNineAt - 4, 10) }}>{fmt(BOOT.formulaSe)}</span>
        <span style={body(26, true)}>the formula, s ÷ √{BOOT.n}</span>
      </Ink>
      <Note at={longAt - 4} x={COL} y={y(880)} out={payoffAt - 6}>
        <span style={{ ...body(28, true), color: INK, whiteSpace: "nowrap" }}>For a mean, the long way round.</span>
      </Note>
      <Note at={payoffAt - 4} x={COL} y={y(880)}>
        <span style={{ ...body(28, true), color: EST_INK, whiteSpace: "nowrap" }}>
          The payoff:{" "}
          <Marked at={elseAt - 2} color={HIGHLIGHT}>
            everything else.
          </Marked>
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** One resample: each draw a copy of its value, flying down from the strip to
 *  its place in the stack, then gathering into the resample's average. */
const Resample: React.FC<{ index: number; draw: { s: number; stagger: number; c: number; fall: number } }> = ({ index, draw }) => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const twiceAt = n.word("resample", "twice");
  const threeAt = n.word("resample", "three times");
  const picks = BOOT.picks[index];
  const stack = STACKS[index];
  const counts = new Map<number, number>();
  picks.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
  const c = ease(frame, draw.c, 12);
  const mean = sx(X, BOOT.pickMeans[index]);
  const ring2 = index === 0 ? pulse(frame, twiceAt - 2, 24) : 0;
  const ring3 = index === 0 ? pulse(frame, threeAt - 2, 24) : 0;
  return (
    <Svg>
      {picks.map((p, j) => {
        const t = ease(frame, draw.s + j * draw.stagger, 8);
        if (t <= 0 || c >= 1) return null;
        const x0 = sx(X, BOOT.values[p]);
        const y0 = y(STRIP) + h((JIT[p] - 0.5) * 30);
        const y1 = y(RES_BASE) - h(stack[j] * STACK);
        const times = counts.get(p) ?? 1;
        const ring = times === 2 ? ring2 : times === 3 ? ring3 : 0;
        return (
          <g key={j}>
            <circle
              cx={lerp(lerp(x0, x0, t), mean, c)}
              cy={lerp(lerp(y0, y1, t), y(RES_BASE), c)}
              r={5.5}
              fill={DATA}
              stroke={PAPER}
              strokeWidth={1}
              opacity={1 - 0.5 * c}
            />
            {ring > 0 && stack[j] === times - 1 ? (
              <circle cx={x0} cy={y1 - h((times - 1) * STACK) / 2} r={9 + 5 * (times - 1)} fill="none" stroke={EST} strokeWidth={2.4} opacity={ring} />
            ) : null}
          </g>
        );
      })}
      {c > 0 ? (
        <line x1={mean} x2={mean} y1={y(RES_BASE) - 14} y2={y(RES_BASE) + 14} stroke={EST} strokeWidth={4} strokeLinecap="round" opacity={1 - ease(frame, draw.fall, 6)} />
      ) : null}
    </Svg>
  );
};

/** A resample's average, as one block: it forms on the resample row and falls
 *  into its bin in Fig. 8 (the bars take over once it lands). */
const FallingAverage: React.FC<{ index: number; at: number }> = ({ index, at }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const t = Math.max(0, Math.min(1, (frame - at) / 12));
  if (frame < at || t >= 1) return null;
  const m = BOOT.means[index];
  const bin = Math.floor((m - XZ.lo) / BIN);
  const toX = sx(XZ, XZ.lo + bin * BIN);
  const w = sx(XZ, XZ.lo + (bin + 1) * BIN) - toX - 1;
  const fromX = sx(X, m) - w / 2;
  const below = BOOT.means.slice(0, index).filter((v) => Math.floor((v - XZ.lo) / BIN) === bin).length;
  const endY = y(HIST_BASE) - h((below + 1) * 14);
  const startY = y(RES_BASE) - 8;
  return (
    <Svg>
      <rect x={lerp(fromX, toX, t)} y={startY + (endY - startY) * t * t} width={w} height={h(14)} fill={EST} />
    </Svg>
  );
};
