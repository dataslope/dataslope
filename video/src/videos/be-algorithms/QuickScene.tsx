import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { Num } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { QUICKSORT } from "./data";
import { ACCENT, ACCENT_INK, Art, BAR, Drift, OK, HIGHLIGHT, INK, INK_SOFT, Line, Mark, OK_INK, PAPER, Svg, int, VRule } from "./parts";

/** Two panels on one horizontal scale: a thousand items across 720px. */
const W = 720;
const LX = 140;
const RXP = 1040;
/** Vertical scale, the same in both: one level of splits a row. */
const STAIR_H = 360;
/** The random run's band, enlarged this many times below it. */
const ZOOM = 20;

/**
 * Question 8. A thousand numbers already in order, drawn as a ramp of bars.
 * Pivoting on the last, each level of the recursion is one row, its splits
 * drawn across it: every split peels off one, so the rows make a staircase
 * 999 levels deep, its area the 499,500 comparisons, and Python's recursive
 * form stops at its limit. Random pivots on the same input, at the same
 * scale, make a band 21 levels thin, enlarged twenty times below it to show
 * its splits: 10,962 comparisons.
 */
export const QuickScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("quick").from;
  const qAt = n.word("quick", "Question eight");
  const textAt = n.word("quick", "How does quicksort work");
  const pickAt = n.word("quick", "Pick a pivot");
  const sortAt = n.word("quick", "and sort each side");
  const avgAt = n.word("quick", "On average, n log n");
  const worstAt = n.word("quick-sorted", "The worst case is n squared");
  const pivotAt = n.word("quick-sorted", "Pivot a thousand sorted numbers on the last");
  const peelsAt = n.word("quick-sorted", "each split peels off one");
  const halfAt = n.word("quick-sorted", "half a million comparisons");
  const levelsAt = n.word("quick-sorted", "nearly a thousand levels");
  const limitAt = n.word("quick-limit", "Written recursively");
  const pastAt = n.word("quick-limit", "past Python's default limit");
  const randomAt = n.word("quick-random", "Random pivots on the same input");
  const elevenAt = n.word("quick-random", "eleven thousand comparisons");
  const twentyAt = n.word("quick-random", "twenty-one levels");
  const commonAt = n.word("quick-next", "And sorted input is common");
  const randomizeAt = n.word("quick-next", "so randomize");
  const edgeAt = n.word("quick-next", "Quicksort's edge over merge sort");
  const placeAt = n.word("quick-next", "sorting in place");
  const end = n.beat("quick-next").to;

  const N = QUICKSORT.n;
  const rampTop = y(370);
  const RAMP_H = 50;
  const stairTop = rampTop + RAMP_H + 16;
  const perLevel = STAIR_H / QUICKSORT.lastPivotSorted.depth;
  const ix = (x0: number, i: number) => x0 + (i / N) * W;

  // The staircase: level d splits [0, n - d], one row each, drawn down to
  // the level reached so far.
  const stairP = ease(frame, peelsAt, Math.max(30, levelsAt - peelsAt));
  const depthShown = Math.round(stairP * QUICKSORT.lastPivotSorted.depth);
  const stairBottom = stairTop + depthShown * perLevel;
  // A step every level; drawn as one path, the steps are finer than a pixel.
  const stair = `M${LX},${stairTop} L${ix(LX, N)},${stairTop} L${ix(LX, N - depthShown)},${stairBottom} L${LX},${stairBottom} Z`;

  // The random run, row by row.
  const randP = ease(frame, randomAt + 4, 24);
  const bandTop = stairTop;
  const insetTop = bandTop + QUICKSORT.randomPivotSorted.depth * perLevel + 46;
  const insetRow = perLevel * ZOOM;
  const randDepth = Math.round(randP * QUICKSORT.randomPivotSorted.depth);
  const parts = QUICKSORT.randomPartitions.filter(([d]) => d <= randDepth);
  const insetBottom = insetTop + QUICKSORT.randomPivotSorted.depth * insetRow;

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={sortAt} level={-30} />
      <Sfx name="el-tap" at={pivotAt} level={-32} />
      <Sfx name="el-pencil" at={peelsAt} level={-35} />
      <Sfx name="el-tap" at={halfAt} level={-32} />
      <Sfx name="el-scratch" at={pastAt} level={-35} />
      <Sfx name="el-sprinkle" at={randomAt + 4} level={-32} />
      <Sfx name="el-tap" at={elevenAt} level={-32} />
      <Sfx name="el-chime" at={placeAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={8} at={qAt - 4} textAt={textAt - 4} size={62}>
          How does quicksort work, and what is its worst-case?
        </QuestionCard>
        <Line at={pickAt} x={96} y={y(262)} size={24} color={INK_SOFT}>
          Pick a pivot, split the rest into smaller and larger, sort each side
          <span style={{ opacity: ease(frame, avgAt, 10) }}>
            : <b style={{ color: INK }}>O(n log n)</b> on average
          </span>
        </Line>
        <Art name="cards" at={sortAt} out={randomAt - 24} left={1290} top={y(470)} h={150} />

        {/* Last-element pivot on sorted input. */}
        <Line at={worstAt} x={LX} y={rampTop - 50} size={22} weight={650}>
          Worst case: <Num>{int(N)}</Num> sorted numbers, pivot on the last
        </Line>
        <Svg opacity={ease(frame, pivotAt - 6, 12)}>
          <path d={`M${LX},${rampTop + RAMP_H} L${ix(LX, N)},${rampTop + RAMP_H} L${ix(LX, N)},${rampTop} Z`} fill={BAR} />
          <rect x={ix(LX, N) - 4} y={rampTop - 2} width={6} height={RAMP_H + 2} fill={HIGHLIGHT} stroke={INK} strokeWidth={1} opacity={ease(frame, pivotAt + 4, 8)} />
        </Svg>
        <Svg>
          {depthShown > 0 ? <path d={stair} fill={`color-mix(in srgb, ${ACCENT} 22%, ${PAPER})`} stroke={ACCENT} strokeWidth={1.6} /> : null}
          {/* The pivots, one per level, along the staircase's edge. */}
          {depthShown > 0 ? <line x1={ix(LX, N)} y1={stairTop} x2={ix(LX, N - depthShown)} y2={stairBottom} stroke={HIGHLIGHT} strokeWidth={4} /> : null}
        </Svg>
        <Line at={levelsAt} x={600} y={y(590)} size={24} weight={700}>
          <Num>{QUICKSORT.lastPivotSorted.depth}</Num> levels
        </Line>
        <Line at={halfAt} x={600} y={y(628)} size={24} weight={700} color={ACCENT_INK}>
          <Num>{int(QUICKSORT.lastPivotSorted.compares)}</Num> comparisons
        </Line>
        <Line at={halfAt + 10} x={600} y={y(666)} size={22} color={INK_SOFT}>
          n(n − 1)/2, about n²/2
        </Line>
        <Line at={limitAt} x={520} y={y(712)} size={22} weight={600}>
          Recursive: past Python&apos;s limit of <Num>{int(QUICKSORT.recursionLimit)}</Num>
        </Line>
        <div
          style={{
            position: "absolute",
            left: 520,
            top: y(752),
            fontFamily: MONO,
            fontSize: 20,
            fontWeight: 600,
            lineHeight: 1.4,
            color: ACCENT_INK,
            opacity: ease(frame, pastAt, 10),
            whiteSpace: "pre",
          }}
        >
          {QUICKSORT.recursiveLastPivot.replace(": ", ":\n")}
        </div>

        <VRule x={1004} top={rampTop - 50} bottom={insetBottom + 262} at={randomAt} />

        {/* Random pivots, the same input, the same scale. */}
        <Line at={randomAt} x={RXP} y={rampTop - 50} size={22} weight={650}>
          Random pivots, the same input
        </Line>
        <Svg opacity={ease(frame, randomAt, 12)}>
          <path d={`M${RXP},${rampTop + RAMP_H} L${ix(RXP, N)},${rampTop + RAMP_H} L${ix(RXP, N)},${rampTop} Z`} fill={BAR} />
          {/* At the shared scale: a band a few pixels thin. */}
          {parts.map(([d, lo, hi], i) => (
            <rect key={`b${i}`} x={ix(RXP, lo)} y={bandTop + (d - 1) * perLevel} width={Math.max(0.6, ix(RXP, hi + 1) - ix(RXP, lo) - 0.6)} height={perLevel} fill={OK} />
          ))}
          {/* The same band, twenty times taller. */}
          <path
            d={`M${RXP},${bandTop + QUICKSORT.randomPivotSorted.depth * perLevel + 4} L${RXP},${insetTop - 6} M${RXP + W},${bandTop + QUICKSORT.randomPivotSorted.depth * perLevel + 4} L${RXP + W},${insetTop - 6}`}
            stroke={INK_SOFT}
            strokeWidth={1.2}
            strokeDasharray="3 4"
            opacity={ease(frame, randomAt + 10, 10)}
          />
          {parts.map(([d, lo, hi], i) => (
            <rect
              key={`z${i}`}
              x={ix(RXP, lo)}
              y={insetTop + (d - 1) * insetRow + 1}
              width={Math.max(0.8, ix(RXP, hi + 1) - ix(RXP, lo) - 1.2)}
              height={insetRow - 2}
              rx={1}
              fill={`color-mix(in srgb, ${OK} 55%, ${PAPER})`}
              stroke={OK}
              strokeWidth={0.6}
            />
          ))}
        </Svg>
        <Line at={randomAt + 10} x={RXP + W - 300} y={insetTop - 40} size={21} color={INK_SOFT} weight={600} width={300} align="right">
          the band, <Num>{ZOOM}</Num> times taller
        </Line>
        <Line at={twentyAt} x={RXP} y={insetBottom + 20} size={24} weight={700}>
          <Num>{QUICKSORT.randomPivotSorted.depth}</Num> levels
        </Line>
        <Line at={elevenAt} x={RXP + 180} y={insetBottom + 20} size={24} weight={700} color={OK_INK}>
          <Num>{int(QUICKSORT.randomPivotSorted.compares)}</Num> comparisons
        </Line>

        {/* Why it matters. */}
        <Line at={commonAt} x={RXP} y={insetBottom + 86} size={24}>
          Sorted input is common: rows by ID, events by time.
        </Line>
        <Line at={randomizeAt} x={RXP} y={insetBottom + 128} size={24} weight={700} color={OK_INK}>
          Randomize the pivot.
        </Line>
        <Line at={edgeAt} x={RXP} y={insetBottom + 190} size={24}>
          Its edge over merge sort: it sorts <Mark at={placeAt}>in place</Mark>
        </Line>
        <Line at={edgeAt + 10} x={RXP} y={insetBottom + 232} size={24} color={INK_SOFT}>
          where merge sort needs a buffer as big as the input
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
