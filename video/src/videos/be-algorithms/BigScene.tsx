import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { TABULAR, label, note } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BIG_O } from "./data";
import { ACCENT, ACCENT_INK, Art, BAR, Drift, HBar, HIGHLIGHT, INK, INK_SOFT, Line, OK_INK, PAPER, Svg, int } from "./parts";

/** The schematic grid: n items down and across; a cell above the diagonal
 *  is one pair the double loop checks. Drawn, not counted (the table is). */
const G = 12;
const PITCH = 22;
const GX = 140;
/** The table's columns: right edges, so the numbers line up. */
const TX = 540;
const COLS = [
  { name: "n", right: TX + 150 },
  { name: "pairs, double loop", right: TX + 470 },
  { name: "one pass", right: TX + 680 },
];
const ROW_H = 56;
const BAR_X = 540;
const BAR_W = 760;

/**
 * Question 1. Big-O as the count of what the code does: a double loop checks
 * every pair (the grid's upper triangle), one pass touches each item once
 * (the row under it). The table puts numbers on both at a hundred, a
 * thousand (counted while it ran, and marked so) and a million; then the
 * million modeled at an assumed rate, 83 minutes against a hundredth of a
 * second, on one scale. The hundred's row lights last: there, the brute
 * force is fine.
 */
export const BigScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("big").from;
  const qAt = n.word("big", "Question one");
  const textAt = n.word("big", "What is Big-O notation");
  const saysAt = n.word("big", "It says how time or memory grows");
  const loopAt = n.word("big-count", "A double loop");
  const pairsAt = n.word("big-count", "checks under five thousand pairs");
  const instantAt = n.word("big-count", "Instant");
  const millionAt = n.word("big-million", "At a million items");
  const trillionAt = n.word("big-million", "half a trillion");
  const modelAt = n.word("big-model", "Model it at a hundred million checks a second");
  const minutesAt = n.word("big-model", "about eighty-three minutes");
  const passAt = n.word("big-model", "One pass over the million");
  const hundredthAt = n.word("big-model", "a hundredth of a second");
  const whyAt = n.word("big-why", "That's why they care");
  const gameAt = n.word("big-why", "The usual game");
  const dropAt = n.word("big-next", "But constants are dropped");
  const fineAt = n.word("big-next", "the brute force is often fine");
  const sayAt = n.word("big-next", "Say what it costs");
  const end = n.beat("big-next").to;

  const gTop = y(372);
  const tTop = y(334);
  const rowTop = (i: number) => tTop + 46 + i * ROW_H;
  const rows = [
    { ...BIG_O.rows[0], at: pairsAt },
    { ...BIG_O.rows[1], at: instantAt },
    { ...BIG_O.rows[2], at: trillionAt - 4 },
  ];
  // The grid's pairs fill row by row while "checks ... pairs" is said.
  const fill = (i: number) => ease(frame, loopAt + 6 + i * 2.2, 8);
  const passTop = gTop + G * PITCH + 70;
  const lit = ease(frame, fineAt, 12);

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={loopAt + 6} level={-31} />
      {rows.map((r) => (
        <Sfx key={r.n} name="el-tap" at={r.at} level={-31} />
      ))}
      <Sfx name="el-pencil" at={modelAt} level={-35} />
      <Sfx name="el-pop" at={minutesAt} level={-30} />
      <Sfx name="el-tap" at={hundredthAt} level={-32} />
      <Sfx name="el-chime" at={sayAt} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={62}>
          What is Big-O notation, and why do interviewers care?
        </QuestionCard>
        <Line at={saysAt} x={96} y={y(262)} size={26} color={INK_SOFT}>
          How time or memory grows with the input size <i>n</i>, constants ignored
        </Line>

        {/* Every pair, and one pass. */}
        <Line at={loopAt - 2} x={GX} y={gTop - 46} size={22} weight={650}>
          Double loop: every pair
        </Line>
        <Svg>
          {Array.from({ length: G * G }, (_, k) => {
            const i = Math.floor(k / G);
            const j = k % G;
            const pair = j > i;
            const p = ease(frame, loopAt + (i + j) * 0.6, 8);
            if (p <= 0) return null;
            return (
              <rect
                key={k}
                x={GX + j * PITCH + 2}
                y={gTop + i * PITCH + 2}
                width={PITCH - 4}
                height={PITCH - 4}
                rx={4}
                fill={pair ? BAR : PAPER}
                stroke={pair ? "none" : INK_SOFT}
                strokeWidth={1.2}
                opacity={pair ? fill(i) : p * 0.55}
              />
            );
          })}
        </Svg>
        <Line at={loopAt + 30} x={GX} y={passTop - 46} size={22} weight={650}>
          One pass: each item once
        </Line>
        <Svg>
          {Array.from({ length: G }, (_, j) => (
            <rect key={j} x={GX + j * PITCH + 2} y={passTop + 2} width={PITCH - 4} height={PITCH - 4} rx={4} fill={OK} opacity={ease(frame, loopAt + 32 + j, 8)} />
          ))}
        </Svg>

        {/* The table: n, pairs, one pass. */}
        <div style={{ position: "absolute", left: 0, top: tTop, opacity: ease(frame, loopAt, 12) }}>
          {COLS.map((c) => (
            <div key={c.name} style={{ position: "absolute", left: c.right - 360, width: 360, textAlign: "right", ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>
              {c.name}
            </div>
          ))}
        </div>
        <Svg opacity={ease(frame, loopAt, 12)}>
          <line x1={TX} x2={COLS[2].right} y1={tTop + 36} y2={tTop + 36} stroke={INK} strokeWidth={1.4} />
        </Svg>
        {/* The hundred's row, lit where the brute force is fine. */}
        <div
          style={{
            position: "absolute",
            left: TX - 12,
            top: rowTop(0) + 4,
            width: COLS[2].right - TX + 24,
            height: ROW_H - 8,
            background: HIGHLIGHT,
            borderRadius: 4,
            opacity: lit * 0.7,
          }}
        />
        {rows.map((r, i) => {
          const p = ease(frame, r.at, 12);
          if (p <= 0) return null;
          const big = i === 2;
          const cells = [int(r.n), int(r.pairs), int(r.pass)];
          return (
            <React.Fragment key={r.n}>
              {cells.map((v, k) => (
                <div
                  key={k}
                  style={{
                    position: "absolute",
                    left: COLS[k].right - 360,
                    width: 360,
                    top: rowTop(i) + 12,
                    textAlign: "right",
                    ...note(26, k === 1 && big ? ACCENT_INK : k === 2 ? OK_INK : INK),
                    ...TABULAR,
                    fontWeight: k === 0 ? 600 : 700,
                    opacity: p,
                    transform: `translateY(${(1 - p) * 8}px)`,
                  }}
                >
                  {v}
                </div>
              ))}
              {r.counted ? (
                <div style={{ position: "absolute", left: COLS[2].right + 44, top: rowTop(i) + 14, ...note(22, INK_SOFT), fontStyle: "italic", opacity: p, whiteSpace: "nowrap" }}>
                  counted as it ran
                </div>
              ) : null}
            </React.Fragment>
          );
        })}

        {/* The million, modeled at an assumed rate: both on one scale. */}
        <Line at={modelAt} x={BAR_X} y={y(566)} size={22} color={INK_SOFT} weight={600}>
          Model: <Num>100</Num> million checks a second, an assumption
        </Line>
        <HBar
          x={BAR_X}
          y={y(606)}
          w={BAR_W}
          max={BIG_O.pairsMinutes * 60}
          value={BIG_O.pairsMinutes * 60}
          at={modelAt + 8}
          dur={Math.max(16, minutesAt - modelAt - 8)}
          color={ACCENT}
          ink={ACCENT_INK}
          label="The double loop over a million"
          valueText={<>about <Num>{Math.round(BIG_O.pairsMinutes)}</Num> minutes</>}
        />
        <HBar
          x={BAR_X}
          y={y(690)}
          w={BAR_W}
          max={BIG_O.pairsMinutes * 60}
          value={BIG_O.passSeconds}
          at={passAt}
          color={OK}
          ink={OK_INK}
          label="One pass over the million"
          valueText={<><Num>{BIG_O.passSeconds}</Num> s</>}
        />
        <Art name="hourglass" at={minutesAt} left={1590} top={y(320)} h={200} />

        {/* Why they care, and where the brute force is fine. */}
        <Line at={whyAt} x={GX} y={y(786)} size={26} weight={600}>
          It predicts whether a solution survives its real input.
          <span style={{ opacity: ease(frame, gameAt, 10) }}>
            {" "}
            The usual game: <span style={{ color: ACCENT_INK, fontWeight: 700 }}>O(n²)</span> → <span style={{ color: OK_INK, fontWeight: 700 }}>O(n)</span>
          </span>
        </Line>
        <Line at={dropAt} x={GX} y={y(836)} size={26} weight={600}>
          Constants dropped: at <Num>100</Num> the brute force is often fine, and simpler.
          <span style={{ opacity: ease(frame, sayAt, 10), color: INK_SOFT }}> Say where it stops being fine.</span>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
