import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useNarration } from "../../narration/NarrationContext";
import { ds } from "../../theme/brand";
import { Axis, Bars, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import {
  ACCENT,
  ACCENT_INK,
  body,
  fmt,
  HAIRLINE,
  halo,
  headline,
  HIGHLIGHT,
  INK,
  INK_SOFT,
  label,
  note,
  PAPER,
} from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import {
  histogram,
  ILLUSTRATIONS,
  mulberry32,
  N,
  peak,
  PILE,
  POPULATION,
  SAMPLE,
  SAMPLE_COUNT,
  sampleValues,
  VIDEO,
} from "./data";
import { Bracket, money, POP_FILL, Rule, SAMPLE_FILL } from "./parts";

// ── Layout, in the page's layout coordinates (through y() and h()) ──────────

/** One x-axis for all three rows, so their widths can be compared directly. */
const X: XScale = { lo: 0, hi: 100, x0: 150, x1: 1230 };
const TICKS = [0, 20, 40, 60, 80, 100];
/** The right-hand column: headlines, notes, the counter and the table. */
const RX = 1330;
const RW = 494;

/** Row 1, the population: full size while it is introduced, then the top row. */
const POP_BIG = { label: 340, base: 860, height: 400 };
const POP_ROW = { label: 112, base: 318, height: 150 };
const POP_UNIT = 1 / peak(POPULATION.hist);

/** Row 2, one sample: a block per customer, in $5 bins. */
const SAMPLE_LABEL = 380;
const SAMPLE_BASE = 600;
const SAMPLE_BIN = 5;
const STEP = 18;
const BLOCK = 16;

/** Row 3, the averages, in $1 bins. */
const MEANS_LABEL = 662;
const MEANS_BASE = 880;
const MEANS_H = 160;
const MEAN_BIN = 1;
/** The tallest a single early block is drawn, before the pile has to zoom out. */
const EARLY = 16;
const DROP = 13;

/** Where each of the forty values lands in row 2: its bin and its height in
 *  the stack, in the order the values were drawn. */
const SLOTS = (() => {
  const seen = new Map<number, number>();
  return SAMPLE.values.map((v) => {
    const j = Math.floor(v / SAMPLE_BIN);
    const s = seen.get(j) ?? 0;
    seen.set(j, s + 1);
    return { v, j, s };
  });
})();
const STACK = Math.max(...SLOTS.map((s) => s.s + 1));
const blockLeft = (j: number) => sx(X, j * SAMPLE_BIN) + 2;
const BLOCK_W = sx(X, SAMPLE_BIN) - sx(X, 0) - 4;
const blockTop = (s: number) => SAMPLE_BASE - (s + 1) * STEP + (STEP - BLOCK);

/** Where the sample's average forms, above its blocks. */
const MERGE_Y = SAMPLE_BASE - STACK * STEP - 30;
/** The strip on the population row where later samples' customers light up. */
const stripY = (j: number) => POP_ROW.base - 22 - JITTER[j % JITTER.length] * 44;

const JITTER = (() => {
  const r = mulberry32(40);
  return Array.from({ length: 64 }, () => r());
})();

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const meanBinLeft = (v: number) => sx(X, Math.floor(v / MEAN_BIN) * MEAN_BIN) + 1;
const MEAN_W = sx(X, MEAN_BIN) - sx(X, 0) - 2;
const meansHist = (k: number) => histogram(PILE.means.slice(0, k), 30, 70, MEAN_BIN);

/** Brackets sit where a bell is one standard deviation wide: at 61% of its
 *  peak, the height of a normal curve one SD out. */
const AT_SD = Math.exp(-0.5);

/**
 * The three distributions on one axis, built up one row at a time: the
 * population, one sample of forty out of it, and the averages of five
 * thousand samples. Spans the beats "pop" to "why"; "third" and "compare"
 * open new phases without a cut, so the rows never move.
 */
export const ThreeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const popFrom = n.beat("pop").from;
  const millionAt = n.word("pop", "million");
  const avgAt = n.word("center", "average");
  const spreadAt = n.word("center", "spread");
  const eighteenAt = n.word("center", "eighteen");
  const fixedAt = n.word("unknown", "fixed");
  const sampleFrom = n.beat("sample").from;
  const pickAt = n.word("sample", "Pick");
  const randomAt = n.word("sample", "random");
  const wideAt = n.word("snapshot", "wide");
  const twentyAt = n.word("snapshot", "twenty");
  const histAt = n.word("data", "histogram");
  const dataTo = n.beat("data").to;
  const thirdFrom = n.beat("third").from;
  const kindAt = n.word("third", "kind");
  const averageAt = n.word("third", "Average");
  const numberAt = n.word("third", "number");
  const blockAt = n.word("block", "block");
  const pick2 = n.word("repeat", "pick");
  const more2 = n.word("repeat", "forty more", { nth: 2 });
  const thousandAt = n.word("repeat", "Five thousand");
  const piledAt = n.word("pile", "piled");
  const fiftyAt = n.word("pile", "fifty");
  const underAt = n.word("pile", "under");
  const pileTo = n.beat("pile").to;
  const compareFrom = n.beat("compare").from;
  const oneAxisAt = n.word("compare", "one axis");
  const widthsAt = n.word("compare", "widths");
  const rawAt = n.word("raw", "raw");
  const statAt = n.word("statistic", "statistic");
  const gapAt = n.word("why", "gap");
  const middleAt = n.word("why", "middle");

  // ── Row 1 morph: the population shrinks to the top row ──
  const morphAt = sampleFrom - 14;
  const m = ease(frame, morphAt, 26);
  const popBase = lerp(POP_BIG.base, POP_ROW.base, m);
  const popH = lerp(POP_BIG.height, POP_ROW.height, m);
  const p1Out = morphAt - 6;

  // Phase exits for the right-hand column, early in the pause before the next
  // phase, so the old text is gone before the new one inks in.
  const p2Out = dataTo + 24;
  const p3Out = pileTo + 24;

  // ── The pile: the first sample, two more by hand, then thousands ──
  const fallAt = blockAt;
  const steps = [
    { s: pick2, c: pick2 + 13, d: pick2 + 24 },
    { s: more2, c: more2 + 13, d: more2 + 24 },
  ];
  const fastFrom = more2 + 24 + DROP + 4;
  const fastTo = Math.max(fastFrom + 30, piledAt);
  const growth = (f: number) => {
    const p = Math.max(0, Math.min(1, (f - fastFrom) / (fastTo - fastFrom)));
    return Math.min(SAMPLE_COUNT, Math.round(3 * (SAMPLE_COUNT / 3) ** p));
  };
  let k = (frame >= fallAt + DROP ? 1 : 0) + steps.filter((st) => frame >= st.d + DROP).length;
  if (frame >= fastFrom) k = growth(frame);
  const kBefore = frame >= fastFrom ? growth(frame - 2) : k;
  const counts = meansHist(k).counts;
  const before = meansHist(Math.min(k, kBefore)).counts;
  const recent = counts.map((c, i) => c - (before[i] ?? 0));
  const unit = Math.min(EARLY, MEANS_H / Math.max(1, ...counts));
  const fastSample = frame >= fastFrom && frame < fastTo + 4 ? Math.max(0, k - 1) : -1;

  const counterIn = ease(frame, fallAt + DROP - 2, 12) * (1 - ease(frame, p3Out, 10));

  // ── Compare phase ──
  const emphasis = ease(frame, widthsAt - 2, 12);

  return (
    <AbsoluteFill>
      {/* ══ Phase 1: the population, at full size ══ */}
      <Ink at={popFrom - 12} dur={14} out={p1Out} style={{ left: 96, top: y(112) }}>
        <span style={label(22, INK_SOFT)}>The first distribution</span>
      </Ink>
      <Ink at={popFrom - 8} dur={20} out={p1Out} style={{ left: 92, top: y(150), ...headline(92), whiteSpace: "nowrap" }}>
        The population
      </Ink>
      <Ink at={fixedAt - 4} dur={18} out={p1Out} style={{ left: 96, top: y(262), whiteSpace: "nowrap" }}>
        <span style={{ ...body(36, true), color: INK }}>Wide, fixed, and almost never seen.</span>
      </Ink>
      {ILLUSTRATIONS ? <Basket at={millionAt} out={p1Out} /> : null}

      <FigLabel
        n="2"
        title="The population: a million customers' spend"
        at={popFrom - 6}
        x={150}
        y={y(lerp(POP_BIG.label, POP_ROW.label, m))}
      />
      <Bars
        counts={POPULATION.hist.counts}
        lo={POPULATION.hist.lo}
        bin={POPULATION.hist.bin}
        scale={X}
        base={y(popBase)}
        unit={h(popH * POP_UNIT)}
        color={POP_FILL}
        grow={(i) => ease(frame, popFrom - 6 + Math.abs(i - 25) * 0.7, 14)}
      />
      <Axis scale={X} base={y(popBase)} ticks={TICKS} format={money} at={popFrom - 8} />

      {/* Average and spread. */}
      <Rule
        x={sx(X, POPULATION.mean)}
        y0={y(popBase)}
        y1={y(popBase - popH - 26)}
        at={avgAt - 4}
        dur={16}
        out={p1Out}
        color={INK}
      />
      <Note at={avgAt} x={sx(X, POPULATION.mean) + 14} y={y(popBase - popH - 40)} out={p1Out}>
        <span style={{ ...note(24, INK), fontWeight: 650, ...halo }}>average ${fmt(POPULATION.mean)}</span>
      </Note>
      <Bracket
        x0={sx(X, POPULATION.mean - POPULATION.sd)}
        x1={sx(X, POPULATION.mean + POPULATION.sd)}
        y={y(popBase - popH * AT_SD)}
        at={spreadAt - 2}
        width={2.4 + emphasis}
      />
      <Note at={eighteenAt - 2} x={sx(X, POPULATION.mean + POPULATION.sd) + 14} y={y(popBase - popH * AT_SD) - 15}>
        <span style={{ ...note(24, INK), fontWeight: 650, ...halo }}>± ${fmt(POPULATION.sd)}</span>
      </Note>

      {/* ══ Phase 2: one sample ══ */}
      <Ink at={sampleFrom - 4} dur={14} out={p2Out} style={{ left: RX, top: y(112) }}>
        <span style={label(22, INK_SOFT)}>The second distribution</span>
      </Ink>
      <Ink at={sampleFrom} dur={18} out={p2Out} style={{ left: RX - 4, top: y(146), ...headline(64), whiteSpace: "nowrap" }}>
        One sample
      </Ink>
      <Ink at={pickAt} dur={16} out={p2Out} style={{ left: RX, top: y(236), width: RW }}>
        <span style={{ ...body(32, true), color: INK }}>Forty customers, picked at random.</span>
      </Ink>
      <Note at={histAt} x={RX} y={y(360)} width={RW} out={p2Out}>
        <div style={{ ...body(30), color: INK }}>What a histogram of your data shows.</div>
        <div style={{ ...note(22, INK_SOFT), marginTop: 12 }}>Raw values, one block per customer.</div>
      </Note>

      <FigLabel n="3" title={`One sample of ${N} customers`} at={sampleFrom} x={150} y={y(SAMPLE_LABEL)} />
      <Axis scale={X} base={y(SAMPLE_BASE)} ticks={TICKS} format={money} at={sampleFrom + 2} />
      <SampleBlocks pickAt={pickAt} fallAt={randomAt + 2} popBase={y(popBase)} />
      <Bracket
        x0={sx(X, SAMPLE.mean - SAMPLE.sd)}
        x1={sx(X, SAMPLE.mean + SAMPLE.sd)}
        y={y(SAMPLE_BASE - STACK * STEP * AT_SD)}
        at={wideAt - 2}
        width={2.4 + emphasis}
      />
      <Note at={twentyAt - 2} x={sx(X, SAMPLE.mean + SAMPLE.sd) + 14} y={y(SAMPLE_BASE - STACK * STEP * AT_SD) - 15}>
        <span style={{ ...note(24, INK), fontWeight: 650, ...halo }}>± ${fmt(SAMPLE.sd)}</span>
      </Note>

      {/* ══ Phase 3: the sampling distribution ══ */}
      <Ink at={thirdFrom - 4} dur={14} out={p3Out} style={{ left: RX, top: y(112) }}>
        <span style={label(22, INK_SOFT)}>The third distribution</span>
      </Ink>
      <Ink at={thirdFrom} dur={20} out={p3Out} style={{ left: RX - 4, top: y(146), ...headline(64), lineHeight: 1.04 }}>
        The sampling
        <br />
        distribution
      </Ink>
      <Ink at={kindAt} dur={16} out={p3Out} style={{ left: RX, top: y(300), width: RW }}>
        <span style={{ ...body(32, true), color: ACCENT_INK }}>One average per sample.</span>
      </Ink>
      <div style={{ position: "absolute", left: RX, top: y(560), opacity: counterIn }}>
        <div style={label(21, INK_SOFT)}>Samples drawn</div>
        <div
          style={{
            ...headline(104),
            fontVariantNumeric: "tabular-nums lining-nums",
            marginTop: 6,
            color: k >= SAMPLE_COUNT ? INK : ACCENT_INK,
          }}
        >
          {k.toLocaleString("en-US")}
        </div>
        <div style={{ ...body(28, true), marginTop: 4 }}>of {N} customers each</div>
      </div>
      <Note at={fiftyAt} x={RX} y={y(790)} width={RW} out={p3Out}>
        <div style={{ ...note(24, ACCENT_INK), fontWeight: 700 }}>Centered on ${fmt(PILE.mean)}</div>
        <div style={{ ...note(21, INK_SOFT), marginTop: 6 }}>The population&apos;s average is ${fmt(POPULATION.mean)}.</div>
      </Note>

      <FigLabel n="4" title={`The average of each sample of ${N}`} at={thirdFrom} x={150} y={y(MEANS_LABEL)} />
      <Axis scale={X} base={y(MEANS_BASE)} ticks={TICKS} format={money} at={thirdFrom + 2} />
      <Bars
        counts={counts}
        lo={30}
        bin={MEAN_BIN}
        scale={X}
        base={y(MEANS_BASE)}
        unit={h(unit)}
        color={ACCENT}
        gap={2}
        overlay={frame < fastTo + 6 ? { counts: recent, color: ds("red", 800) } : undefined}
      />
      <Averaging averageAt={averageAt} numberAt={numberAt} blockAt={blockAt} />
      {steps.map((st, i) => (
        <StripSample key={i} index={i + 1} step={st} popBase={y(popBase)} />
      ))}
      {fastSample >= 1 ? <FastDots index={fastSample} /> : null}
      <Note at={thousandAt} x={RX} y={y(752)} from="up" out={piledAt + 10}>
        <span style={note(22, INK_SOFT)}>each a different {N} of the million</span>
      </Note>
      <Rule
        x={sx(X, PILE.mean)}
        y0={y(MEANS_BASE)}
        y1={y(MEANS_BASE - MEANS_H - 14)}
        at={fiftyAt - 4}
        dur={16}
        color={INK}
        width={2}
      />
      <Bracket
        x0={sx(X, PILE.mean - PILE.sd)}
        x1={sx(X, PILE.mean + PILE.sd)}
        y={y(MEANS_BASE - MEANS_H * AT_SD)}
        at={underAt - 2}
        color={ACCENT}
        width={2.6 + emphasis}
      />
      <Note at={underAt + 2} x={sx(X, PILE.mean + PILE.sd) + 14} y={y(MEANS_BASE - MEANS_H * AT_SD) - 15}>
        <span style={{ ...note(24, ACCENT_INK), fontWeight: 700, ...halo }}>± ${fmt(PILE.sd)}</span>
      </Note>

      {/* ══ Phase 4: one axis, three widths ══ */}
      <Gridlines at={oneAxisAt - 4} top={y(POP_ROW.base - POP_ROW.height - 6)} bottom={y(MEANS_BASE)} />
      <div
        style={{
          position: "absolute",
          left: RX - 4,
          top: y(112),
          display: "flex",
          flexDirection: "column",
          ...headline(64),
          lineHeight: 1.04,
        }}
      >
        <Ink at={compareFrom - 6} dur={18} style={{ position: "relative", whiteSpace: "nowrap" }}>
          One axis,
        </Ink>
        <Ink
          at={widthsAt - 4}
          dur={18}
          style={{ position: "relative", ...headline(64, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          three widths.
        </Ink>
      </div>
      <WidthTable rawAt={rawAt} statAt={statAt} middleAt={middleAt} />
      <Note at={gapAt} x={RX} y={y(640)} width={RW}>
        <span style={{ ...body(30, true), color: INK }}>
          That gap is why {N} customers can pin down the average of a million.
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** The basket of shopping, beside the population while it is introduced. */
const Basket: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { y } = useLayout();
  const p = pop(frame, at - 6, fps, 16);
  return (
    <Illustration
      video={VIDEO}
      id="sampling-distributions-basket"
      style={{
        position: "absolute",
        left: RX + 10,
        top: y(380),
        width: 440,
        height: 300,
        opacity: p * (1 - ease(frame, out, 12)),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** The forty customers: lit up on the population, then dropped into row 2 as
 *  one block each. */
const SampleBlocks: React.FC<{ pickAt: number; fallAt: number; popBase: number }> = ({ pickAt, fallAt, popBase }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const FALL = 16;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {SLOTS.map(({ v, j, s }, i) => {
        const appear = ease(frame, pickAt + i * 0.5, 6);
        if (appear <= 0) return null;
        const start = fallAt + i * 0.9;
        const t = Math.max(0, Math.min(1, (frame - start) / FALL));
        const left = blockLeft(j);
        const top = y(blockTop(s));
        if (t >= 1) {
          return <rect key={i} x={left} y={top} width={BLOCK_W} height={h(BLOCK)} fill={SAMPLE_FILL} />;
        }
        // From the strip on the population to the block's centre, under gravity.
        const x0 = sx(X, v);
        const y0 = popBase - h(22 + JITTER[i] * 44);
        const x1 = left + BLOCK_W / 2;
        const y1 = top + h(BLOCK) / 2;
        return (
          <circle
            key={i}
            cx={lerp(x0, x1, t)}
            cy={lerp(y0, y1, t * t)}
            r={7 * appear}
            fill={SAMPLE_FILL}
            stroke={PAPER}
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
};

/** "Average those forty": a red copy of each block slides into the average,
 *  which becomes one block and falls into row 3. */
const Averaging: React.FC<{ averageAt: number; numberAt: number; blockAt: number }> = ({
  averageAt,
  numberAt,
  blockAt,
}) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const c = ease(frame, averageAt, 18);
  const formed = ease(frame, averageAt + 14, 6);
  const landed = frame >= blockAt + DROP;
  if (c <= 0 || landed) return null;
  const mx = sx(X, SAMPLE.mean);
  const t = Math.max(0, Math.min(1, (frame - blockAt) / DROP));
  const startTop = MERGE_Y - EARLY / 2;
  const endTop = MEANS_BASE - EARLY;
  // The average is a dot until it drops, then a block in its bin.
  const top = startTop + (endTop - startTop) * t * t;
  const labelIn = ease(frame, numberAt - 2, 10) * (1 - ease(frame, blockAt - 4, 6));
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {formed < 1
          ? SLOTS.map(({ j, s }, i) => (
              <circle
                key={i}
                cx={lerp(blockLeft(j) + BLOCK_W / 2, mx, c)}
                cy={y(lerp(blockTop(s) + BLOCK / 2, MERGE_Y, c))}
                r={6}
                fill={ACCENT}
                stroke={PAPER}
                strokeWidth={1.2}
                opacity={1 - formed}
              />
            ))
          : null}
        {formed > 0 && frame < blockAt ? (
          <circle cx={mx} cy={y(MERGE_Y)} r={10 * formed} fill={ACCENT} stroke={PAPER} strokeWidth={1.5} />
        ) : null}
        {frame >= blockAt ? (
          <rect x={meanBinLeft(SAMPLE.mean)} y={y(top)} width={MEAN_W} height={h(EARLY)} fill={ACCENT} />
        ) : null}
      </svg>
      <div
        style={{
          position: "absolute",
          left: mx + 16,
          top: y(MERGE_Y) - 17,
          opacity: labelIn,
          whiteSpace: "nowrap",
          ...note(26, ACCENT_INK),
          fontWeight: 700,
          ...halo,
        }}
      >
        ${fmt(SAMPLE.mean)}
      </div>
    </>
  );
};

type Step = { s: number; c: number; d: number };

/** A later sample: its customers light up on the population, slide together
 *  into their average, and the average falls into row 3. */
const StripSample: React.FC<{ index: number; step: Step; popBase: number }> = ({ index, step, popBase }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const values = sampleValues(index);
  if (!values || frame < step.s || frame >= step.d + DROP) return null;
  const mean = PILE.means[index];
  const mx = sx(X, mean);
  const c = ease(frame, step.c, 9);
  const formed = ease(frame, step.c + 7, 4);
  const bin = Math.floor(mean / MEAN_BIN);
  const below = PILE.means.slice(0, index).filter((v) => Math.floor(v / MEAN_BIN) === bin).length;
  const t = Math.max(0, Math.min(1, (frame - step.d) / DROP));
  const stripMid = popBase - h(44);
  const startTop = stripMid - h(EARLY) / 2;
  const endTop = y(MEANS_BASE - (below + 1) * EARLY);
  const top = startTop + (endTop - startTop) * t * t;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {formed < 1
        ? values.map((v, j) => {
            const appear = ease(frame, step.s + j * 0.25, 6);
            if (appear <= 0) return null;
            return (
              <circle
                key={j}
                cx={lerp(sx(X, Math.max(0, Math.min(100, v))), mx, c)}
                cy={lerp(popBase - h(22 + JITTER[j] * 44), stripMid, c)}
                r={6.5 * appear}
                fill={c > 0.5 ? ACCENT : SAMPLE_FILL}
                stroke={PAPER}
                strokeWidth={1.5}
                opacity={1 - formed}
              />
            );
          })
        : null}
      {formed > 0 ? (
        <rect x={meanBinLeft(mean)} y={top} width={MEAN_W} height={h(EARLY) * formed} fill={ACCENT} />
      ) : null}
    </svg>
  );
};

/** During the fast build, the newest sample's customers, swapped every frame,
 *  while there are measured values to show. */
const FastDots: React.FC<{ index: number }> = ({ index }) => {
  const { y } = useLayout();
  const values = sampleValues(index);
  if (!values) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.6 }}>
      {values.map((v, j) => (
        <circle key={j} cx={sx(X, Math.max(0, Math.min(100, v)))} cy={y(stripY(j))} r={5} fill={SAMPLE_FILL} />
      ))}
    </svg>
  );
};

/** Faint verticals at every tick, through all three rows: one axis. */
const Gridlines: React.FC<{ at: number; top: number; bottom: number }> = ({ at, top, bottom }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  if (p <= 0) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.55 * p }}>
      {TICKS.map((v) => (
        <line
          key={v}
          x1={sx(X, v)}
          x2={sx(X, v)}
          y1={bottom}
          y2={bottom + (top - bottom) * p}
          stroke={HAIRLINE}
          strokeWidth={1.2}
          strokeDasharray="2 6"
        />
      ))}
    </svg>
  );
};

/** The three spreads, grouped by what they describe. */
const WidthTable: React.FC<{ rawAt: number; statAt: number; middleAt: number }> = ({ rawAt, statAt, middleAt }) => {
  const frame = useCurrentFrame();
  const { y } = useLayout();
  const mark = ease(frame, middleAt - 2, 12);
  const row = (name: string, value: string, color: string, top: number, at: number, highlight = 0) => {
    const p = ease(frame, at, 12);
    return (
      <div
        style={{
          position: "absolute",
          left: RX,
          top: y(top),
          width: RW,
          opacity: p,
          transform: `translateX(${(1 - p) * -14}px)`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          borderBottom: `1px solid ${HAIRLINE}`,
          paddingBottom: 8,
        }}
      >
        <span style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "-0.15em",
              top: "0.12em",
              bottom: "0.02em",
              width: `calc((100% + 0.3em) * ${highlight})`,
              background: HIGHLIGHT,
              opacity: highlight > 0 ? 1 : 0,
            }}
          />
          <span style={{ position: "relative", ...body(32), color: INK }}>{name}</span>
        </span>
        <span style={{ ...note(28, color), fontWeight: 700 }}>{value}</span>
      </div>
    );
  };
  return (
    <>
      <Note at={rawAt - 4} x={RX} y={y(282)} width={RW}>
        <span style={label(21, INK_SOFT)}>Raw values, one per customer</span>
      </Note>
      {row("The population", `± $${fmt(POPULATION.sd)}`, INK, 322, rawAt - 2)}
      {row("One sample", `± $${fmt(SAMPLE.sd)}`, INK, 382, rawAt + 2, mark)}
      <Note at={statAt - 4} x={RX} y={y(466)} width={RW}>
        <span style={label(21, ACCENT_INK)}>A statistic, one per sample</span>
      </Note>
      {row("Sample averages", `± $${fmt(PILE.sd)}`, ACCENT_INK, 506, statAt)}
    </>
  );
};
