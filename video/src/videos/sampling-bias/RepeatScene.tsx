import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { Axis, sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { body, fmt, halo, headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx, type SoundName } from "../../sound/Sfx";
import {
  binsOf,
  EASY_MAX,
  EASY_MIN,
  mean,
  RANDOM_ABOVE,
  RANDOM_BELOW,
  REPEAT_COUNT,
  REPEAT_EASY,
  REPEAT_RANDOM,
  SAMPLE_N,
  TRUE_MEAN,
} from "./data";
import { Arrow, Bracket, EASY, EASY_INK, RANDOM, RANDOM_INK, TruthLine, Underline } from "./parts";

/** Fig. 2 again, now across the page: averages from 66 to 84. */
const X: XScale = { lo: 66, hi: 84, x0: 160, x1: 1760 };
const MEAN_BIN = 0.25;
const BASE = 860;
/** The tallest pile, in px. */
const PILE_H = 290;
const FALL = 9;

const RANDOM_BINS = binsOf(REPEAT_RANDOM, X.lo, X.hi, MEAN_BIN);
const EASY_BINS = binsOf(REPEAT_EASY, X.lo, X.hi, MEAN_BIN);
const UNIT = Math.min(16, PILE_H / Math.max(...RANDOM_BINS.counts, ...EASY_BINS.counts));
const EASY_CENTER = mean(REPEAT_EASY);
const RANDOM_TOP = BASE - Math.max(...RANDOM_BINS.counts) * UNIT;
const EASY_TOP = BASE - Math.max(...EASY_BINS.counts) * UNIT;
const PIPS: readonly SoundName[] = ["pip-1", "pip-2", "pip-3", "pip-4", "pip-5", "pip-6"];

/**
 * A pip for each pair of averages that lands (both methods at once, one
 * pile on each side of the stereo field), thinned to one every 2.5 frames
 * once they come faster than that, so the end of the fall reads as a patter
 * rather than a buzz. Each halving of the gap takes 4.5 dB off a pip, which
 * keeps the patter about as loud as the first slow drops.
 */
const pipsFor = (hits: readonly number[]) => {
  const out: { at: number; name: SoundName; level: number }[] = [];
  let last = -Infinity;
  hits.forEach((at, i) => {
    const gap = at - last;
    if (gap < 2.5) return;
    out.push({ at, name: PIPS[(i * 5 + Math.floor(i / 3)) % PIPS.length], level: -27 - Math.min(7, Math.max(0, 4.5 * Math.log2(8 / gap))) });
    last = at;
  });
  return out;
};

/**
 * "Was that just bad luck?" to "It's bias": a hundred samples of 500 by each
 * method, their averages piling up on either side of the truth, or all on one
 * side of it.
 */
export const RepeatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const againFrom = n.beat("again").from;
  const drawAt = n.word("again", "Draw");
  const hundredAt = n.word("again", "hundred");
  const eachAt = n.word("again", "each", { edge: "end" });
  const bothFrom = n.beat("both").from;
  const sidesAt = n.word("both", "both sides");
  const halfAt = n.word("both", "half above");
  const everyFrom = n.beat("every").from;
  const timeAt = n.word("every", "every single");
  const nameFrom = n.beat("name").from;
  const biasAt = n.word("name", "bias");

  // Sample i (both methods at once) lands at land[i]: the first is already
  // down, the next few slowly, then faster and faster.
  const start = drawAt + 6;
  const span = Math.max(40, eachAt + 8 - start);
  const land = (i: number) => (i === 0 ? -Infinity : start + span * (i / (REPEAT_COUNT - 1)) ** 0.42);
  const k = Array.from({ length: REPEAT_COUNT }, (_, i) => i).filter((i) => frame >= land(i)).length;
  // A block lands FALL frames after it starts to fall.
  const pips = pipsFor(Array.from({ length: REPEAT_COUNT - 1 }, (_, i) => land(i + 1) + FALL - 1));

  const truthX = sx(X, TRUE_MEAN);
  const easyX = sx(X, EASY_CENTER);

  return (
    <AbsoluteFill>
      <Sfx name="swish" at={hundredAt} level={-34} />
      {pips.map((p) => (
        <Sfx key={p.at} name={p.name} at={p.at} level={p.level} />
      ))}
      <Sfx name="swish" at={timeAt - 4} level={-34} />
      <Sfx name="swish-long" at={nameFrom + 6} level={-35} />
      <Sfx name="chime-low" at={biasAt - 2} level={-30} />

      <Ink at={againFrom - 4} dur={18} style={{ left: 92, top: y(150), ...headline(84), whiteSpace: "nowrap" }}>
        Was that just bad luck?
      </Ink>
      <Ink at={drawAt - 4} dur={18} style={{ left: 92, top: y(246), ...headline(84, true), whiteSpace: "nowrap" }}>
        Draw again, <Underline at={hundredAt}>a hundred times.</Underline>
      </Ink>

      {/* Counter, top right. */}
      <div style={{ position: "absolute", left: 1400, top: y(120), opacity: ease(frame, drawAt, 12) }}>
        <div style={label(20, INK_SOFT)}>Samples drawn, each way</div>
        <div style={{ ...headline(108), fontVariantNumeric: "tabular-nums lining-nums", marginTop: 6 }}>{k}</div>
        <div style={{ ...body(26, true), marginTop: 4 }}>of {SAMPLE_N} customers</div>
      </div>

      <FigLabel n="2" title={`The average of each sample of ${SAMPLE_N}`} at={againFrom} x={160} y={y(384)} />
      <Axis scale={X} base={y(BASE)} ticks={[66, 68, 70, 72, 74, 76, 78, 80, 82, 84]} at={againFrom} />
      <TruthLine x={truthX} bottom={y(BASE)} top={y(452)} at={againFrom} />
      <div
        style={{
          position: "absolute",
          right: 1920 - truthX + 12,
          top: y(440),
          whiteSpace: "nowrap",
          opacity: ease(frame, againFrom + 6, 12),
          ...halo,
        }}
      >
        <span style={note(21, INK_SOFT)}>true average </span>
        <span style={{ ...note(22, INK), fontWeight: 700 }}>{fmt(TRUE_MEAN)}</span>
      </div>

      <Pile means={REPEAT_RANDOM} bins={RANDOM_BINS} land={land} color={RANDOM} first={againFrom} />
      <Pile means={REPEAT_EASY} bins={EASY_BINS} land={land} color={EASY} first={againFrom} />

      {/* "Both sides of seventy, about half above and half below." */}
      <Note at={sidesAt} x={truthX - 14} y={y(RANDOM_TOP - 50)} align="right" from="right" out={nameFrom}>
        <span style={{ ...note(24, RANDOM_INK), fontWeight: 700, ...halo }}>{RANDOM_BELOW} below</span>
      </Note>
      <Note at={halfAt} x={truthX + 14} y={y(RANDOM_TOP - 50)} out={nameFrom}>
        <span style={{ ...note(24, RANDOM_INK), fontWeight: 700, ...halo }}>{RANDOM_ABOVE} above</span>
      </Note>
      <Note at={bothFrom} x={160} y={y(700)}>
        <div style={{ ...label(21, RANDOM_INK) }}>At random</div>
        <div style={{ ...body(30, true), color: INK, marginTop: 4 }}>a miss either way</div>
      </Note>

      {/* "Near eighty, every single time." */}
      <Bracket x0={sx(X, EASY_MIN)} x1={sx(X, EASY_MAX)} y={y(EASY_TOP - 30)} at={timeAt - 4} color={EASY} />
      <Note at={timeAt} x={sx(X, EASY_MAX) + 22} y={y(EASY_TOP - 52)}>
        <div style={{ ...note(24, EASY_INK), fontWeight: 700, ...halo }}>
          all {REPEAT_COUNT} from {fmt(EASY_MIN)}
        </div>
        <div style={{ ...note(24, EASY_INK), fontWeight: 700, ...halo }}>to {fmt(EASY_MAX)}</div>
      </Note>
      <Note at={everyFrom} x={860} y={y(700)}>
        <div style={{ ...label(21, EASY_INK) }}>The easy way</div>
        <div style={{ ...body(30, true), color: INK, marginTop: 4 }}>a miss one way, every time</div>
      </Note>

      {/* The name for it. */}
      <Arrow from={[truthX, y(500)]} to={[easyX - 2, y(500)]} at={nameFrom + 6} dur={22} color={EASY} width={3} />
      <Ink at={biasAt - 6} dur={16} style={{ left: (truthX + easyX) / 2 - 200, top: y(426), width: 400, textAlign: "center" }}>
        <span style={{ ...headline(56, true), color: EASY_INK, ...halo }}>Bias</span>
        <span style={{ ...note(24, EASY_INK), fontWeight: 700, marginLeft: 16, ...halo }}>
          +{fmt(EASY_CENTER - TRUE_MEAN)}
        </span>
      </Ink>
    </AbsoluteFill>
  );
};

/** A pile of averages: each block falls into its bin as its sample lands. */
const Pile: React.FC<{
  means: readonly number[];
  bins: ReturnType<typeof binsOf>;
  land: (i: number) => number;
  color: string;
  /** When the lesson's own sample, already down, fades in with the axis. */
  first: number;
}> = ({ means, bins, land, color, first }) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {means.map((_, i) => {
        const { bin, level } = bins.slot[i];
        if (bin < 0) return null;
        const at = land(i);
        if (frame < at) return null;
        const x = sx(X, X.lo + bin * MEAN_BIN);
        const w = sx(X, X.lo + (bin + 1) * MEAN_BIN) - x - 2;
        const rest = BASE - (level + 1) * UNIT;
        const t = Math.min(1, (frame - at) / FALL);
        const top = rest - 120 * (1 - t * t);
        return (
          <rect
            key={i}
            x={x + 1}
            y={y(top)}
            width={w}
            height={h(UNIT) - 1.5}
            fill={color}
            opacity={i === 0 ? ease(frame, first, 16) : Math.min(1, 0.3 + t)}
          />
        );
      })}
    </svg>
  );
};
