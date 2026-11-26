import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ACCENT, ACCENT_INK, BAR, Drift, Flow, GOLD, INK, INK_SOFT, Line, Mark, OK, OK_INK, Q_SIZE, Svg, X0 } from "./parts";

const WORDS = ["the", "river", "bank", "flooded", "after", "heavy", "rain", "fell"];
const CX = 330;
const STEP = 160;
const CW = 118;

/** One position: an outlined box with its word, its outline and text in
 *  `color` while lit (never a fill). */
const Cell: React.FC<{ x: number; y: number; h: number; word: string; at: number; color?: string; lit: number }> = ({ x, y, h, word, at, color = GOLD, lit }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const line = lit > 0 ? `color-mix(in srgb, ${color} ${lit * 100}%, ${INK})` : INK;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: CW,
        height: h,
        boxSizing: "border-box",
        border: `${2 + lit}px solid ${line}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: 21,
        fontWeight: 500,
        color: color === GOLD ? INK : line,
        opacity: p,
      }}
    >
      {word}
    </div>
  );
};

/**
 * Question 7. Two rows of the same eight words. The RNN passes one hidden
 * state along (a labelled dot, thinning as it goes), lighting one box at a
 * time; its costs in red, "forgetful" with its reason, vanishing gradients. The transformer
 * joins every pair directly and lights every box at once (green), "in
 * training" marked as it is said, since generation still runs one token at a
 * time.
 */
export const RnnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q7").from;
  const qAt = n.word("q7", "Question seven");
  const textAt = n.word("q7", "Why did transformers replace");
  const rnnAt = n.word("q7-a", "An RNN squeezes");
  const hiddenAt = n.word("q7-a", "one hidden state");
  const slowAt = n.word("q7-a", "slow to train");
  const forgetAt = n.word("q7-a", "forgetful over distance");
  const gradAt = n.word("q7-grad", "gradients shrink");
  const transAt = n.word("q7-tf", "A transformer links");
  const directAt = n.word("q7-tf", "any two tokens directly");
  const trainingAt = n.word("q7-tf", "in training");
  const onceAt = n.word("q7-tf", "every position at once");
  const gpuAt = n.word("q7-tf", "what a GPU is built for");
  const costAt = n.word("cost-in", "attention's own cost");
  const end = n.beat("cost-in").to;

  const r1 = y(330);
  const r2 = y(650);
  const CH = h(52);
  const cellX = (i: number) => CX + i * STEP;
  // The hidden state walks the row one box at a time.
  const walk = (i: number) => hiddenAt + 4 + i * 9;
  const litRnn = (i: number) => Math.min(ease(frame, walk(i), 6), 1 - ease(frame, walk(i + 1), 6) * 0.85);
  const stateX = (() => {
    const t = (frame - walk(0)) / 9;
    const i = Math.max(0, Math.min(WORDS.length - 1, t));
    return cellX(0) + CW / 2 + i * STEP;
  })();
  const fade = Math.max(0.15, 1 - Math.max(0, (frame - walk(0)) / 9) * 0.13);
  const stateIn = ease(frame, walk(0), 6) * (1 - ease(frame, transAt, 10) * 0.6);
  const all = ease(frame, onceAt, 10);
  const red = ease(frame, costAt, 18);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={rnnAt + 4} level={-32} />
      {WORDS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={walk(i)} level={-38} />
      ))}
      <Sfx name="el-pencil" at={directAt} level={-35} />
      <Sfx name="el-sprinkle" at={onceAt} level={-32} />
      <Sfx name="el-pencil" at={costAt} level={-36} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={7} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          Why did transformers replace RNNs for most NLP?
        </QuestionCard>

        {/* ── The RNN: one state, passed along ── */}
        <Ink at={rnnAt} dur={12} style={{ left: X0, top: r1 + 10, whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK), fontWeight: 600 }}>RNN</span>
        </Ink>
        {WORDS.map((w, i) => (
          <Cell key={w} x={cellX(i)} y={r1} h={CH} word={w} at={rnnAt + 2 + i * 1.5} lit={litRnn(i)} />
        ))}
        {WORDS.slice(1).map((_, i) => (
          <Flow key={i} points={[[cellX(i) + CW + 4, r1 + CH / 2], [cellX(i + 1) - 6, r1 + CH / 2]]} at={walk(i) + 2} dur={8} head={10} width={2} />
        ))}
        {/* The state: what it carries of the first word thins as it goes. */}
        <Svg opacity={stateIn}>
          <circle cx={stateX} cy={r1 - h(18)} r={9} fill={BAR} opacity={fade} />
        </Svg>
        {/* Named, so the faint dot at the end reads as the state that thinned. */}
        <div
          style={{
            position: "absolute",
            left: stateX + 20,
            top: r1 - h(18) - 14,
            opacity: ease(frame, walk(0), 6) * (1 - ease(frame, transAt, 10) * 0.35),
            ...label(21, INK_SOFT),
            whiteSpace: "nowrap",
          }}
        >
          hidden state
        </div>
        <Line at={slowAt} x={CX} y={r1 + CH + h(24)} size={24} color={ACCENT_INK} weight={600}>
          One step at a time: slow to train
        </Line>
        <Line at={forgetAt} x={CX} y={r1 + CH + h(62)} size={24} color={ACCENT_INK} weight={600}>
          Forgetful over distance<span style={{ opacity: ease(frame, gradAt, 12) }}>: gradients vanish</span>
        </Line>

        {/* ── The transformer: every pair joined, every box at once ── */}
        <Ink at={transAt} dur={12} style={{ left: X0, top: r2 + 10, whiteSpace: "nowrap" }}>
          <span style={{ ...label(26, INK), fontWeight: 600 }}>Transformer</span>
        </Ink>
        {WORDS.map((w, i) => (
          <Cell key={w} x={cellX(i)} y={r2} h={CH} word={w} at={transAt + 2 + i * 1.5} lit={all} color={OK} />
        ))}
        <Svg>
          {WORDS.flatMap((_, a) =>
            WORDS.map((__, b) => {
              if (b <= a) return null;
              const p = ease(frame, directAt + (b - a) * 1.5, 12);
              if (p <= 0) return null;
              const x1 = cellX(a) + CW / 2;
              const x2 = cellX(b) + CW / 2;
              const lift = h(14) + 0.1 * (x2 - x1);
              return (
                <path
                  key={`${a}-${b}`}
                  d={`M${x1},${r2 - 6} Q${(x1 + x2) / 2},${r2 - 6 - lift * 2} ${x2},${r2 - 6}`}
                  fill="none"
                  stroke={red > 0 ? `color-mix(in srgb, ${ACCENT} ${red * 100}%, ${BAR})` : BAR}
                  strokeWidth={1.4 + red * 0.6}
                  opacity={0.6 + red * 0.2}
                  pathLength={1}
                  strokeDasharray={`${p} 1`}
                />
              );
            }),
          )}
        </Svg>
        <Line at={onceAt} x={CX} y={r2 + CH + h(24)} size={24} color={OK_INK} weight={600}>
          Every position at once, <Mark at={trainingAt + 4}>in training</Mark>
        </Line>
        <Line at={gpuAt} x={CX} y={r2 + CH + h(62)} size={24} color={INK}>
          What a GPU is built for
        </Line>
        <Line at={onceAt + 24} x={CX} y={r2 + CH + h(100)} size={21} color={INK_SOFT}>
          Generating still goes one token at a time
        </Line>
        <Line at={costAt + 10} x={1060} y={r2 + CH + h(24)} size={24} color={ACCENT_INK} weight={600}>
          Every pair: attention&apos;s cost
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
