import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { M } from "../../editorial/math";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BAR, Box, Chip, DATA_DEEP, Drift, Flow, Grid, INK, INK_SOFT, Line, Q_SIZE, Svg } from "./parts";

/** The block, in the layout's coordinates: boxes from the top down. */
const BX = 220;
const BW = 340;
const COLS = [910, 1222, 1534];
const COL_W = 270;

/**
 * Question 6. Left: one transformer block as outlined boxes, data flowing up
 * in blue, attention then feed-forward, each with a residual line around it
 * into an add-and-norm box; the block stacked N times behind; token
 * embeddings plus positional encodings at the bottom. Right: the three kinds
 * by their attention masks, each lit as it is named: full (encoder-only,
 * BERT), lower triangle (decoder-only, GPT), and both (encoder-decoder, T5).
 */
export const BlockScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q6").from;
  const qAt = n.word("q6", "Question six");
  const textAt = n.word("q6", "Describe the transformer");
  const stackAt = n.word("q6-a", "A stack of blocks");
  const mhaAt = n.word("q6-a", "multi-head self-attention");
  const ffAt = n.word("q6-a", "a feed-forward network");
  const resAt = n.word("q6-a", "a residual connection");
  const normAt = n.word("q6-a", "layer norm");
  const ignoresAt = n.word("q6-a", "Attention ignores order");
  const posAt = n.word("q6-a", "positional encodings add it");
  const encAt = n.word("q6-kinds", "Encoder-only models");
  const bertAt = n.word("q6-kinds", "like BERT");
  const bothAt = n.word("q6-kinds", "attend both ways");
  const decAt = n.word("q6-kinds", "Decoder-only models");
  const gptAt = n.word("q6-kinds", "like GPT");
  const maskAt = n.word("q6-kinds", "mask the future");
  const edAt = n.word("q6-kinds", "Encoder-decoder models");
  const t5At = n.word("q6-kinds", "like T5");
  const seqAt = n.word("q6-kinds", "turn one sequence into another");
  const end = n.beat("q6-kinds").to;

  // Boxes, top to bottom.
  const B = {
    out: y(316),
    norm2: y(392),
    ff: y(470),
    norm1: y(560),
    attn: y(638),
    group: [y(368), y(724)] as const,
    sum: y(770),
    emb: y(818),
  };
  const NH = h(50);
  const cx = BX + BW / 2;
  const rx = BX + BW + 46;

  // The masks, each 5 by 5, lit as named.
  const MASK = 180;
  const mTop = y(452);

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={mhaAt} level={-32} />
      <Sfx name="el-tap" at={ffAt} level={-32} />
      <Sfx name="el-pencil" at={resAt} level={-36} />
      <Sfx name="el-tap" at={posAt} level={-32} />
      <Sfx name="el-sprinkle" at={bothAt} level={-34} />
      <Sfx name="el-sprinkle" at={maskAt} level={-34} />
      <Sfx name="el-sprinkle" at={seqAt} level={-34} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          Describe the transformer architecture.
        </QuestionCard>

        {/* The stack: two blocks behind the one drawn. */}
        <Svg opacity={ease(frame, stackAt, 14)}>
          {[2, 1].map((k) => (
            <rect
              key={k}
              x={BX - 50 + k * 12}
              y={B.group[0] - k * 12}
              width={BW + 200}
              height={B.group[1] - B.group[0]}
              rx={10}
              fill="none"
              stroke={INK_SOFT}
              strokeWidth={1.5}
              opacity={0.45}
            />
          ))}
          <rect x={BX - 50} y={B.group[0]} width={BW + 200} height={B.group[1] - B.group[0]} rx={10} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="7 6" />
        </Svg>
        <Line at={stackAt + 8} x={BX + BW + 196} y={(B.group[0] + B.group[1]) / 2 - 18} size={28}>
          <M>× N</M>
        </Line>

        {/* Inside one block. */}
        <Box x={BX} y={B.attn} w={BW} h={NH} at={mhaAt}>
          Multi-head attention
        </Box>
        <Box x={BX} y={B.norm1} w={BW} h={h(42)} at={normAt}>
          Add &amp; layer norm
        </Box>
        <Box x={BX} y={B.ff} w={BW} h={NH} at={ffAt}>
          Feed-forward
        </Box>
        <Box x={BX} y={B.norm2} w={BW} h={h(42)} at={normAt + 6}>
          Add &amp; layer norm
        </Box>
        {/* The data path, up through the block. */}
        <Flow points={[[cx, B.sum - 14], [cx, B.attn + NH + 6]]} at={mhaAt - 4} color={BAR} />
        <Flow points={[[cx, B.attn - 4], [cx, B.norm1 + h(42) + 6]]} at={normAt - 2} color={BAR} />
        <Flow points={[[cx, B.norm1 - 4], [cx, B.ff + NH + 6]]} at={ffAt + 2} color={BAR} />
        <Flow points={[[cx, B.ff - 4], [cx, B.norm2 + h(42) + 6]]} at={normAt + 4} color={BAR} />
        <Flow points={[[cx, B.norm2 - 4], [cx, B.out + 8]]} at={normAt + 10} color={BAR} />
        {/* The residuals: around each sublayer, into its add-and-norm. */}
        <Flow
          points={[
            [cx, B.attn + NH + h(22)],
            [rx, B.attn + NH + h(22)],
            [rx, B.norm1 + h(21)],
            [BX + BW + 8, B.norm1 + h(21)],
          ]}
          at={resAt}
          dur={18}
          color={BAR}
          width={2}
          head={12}
        />
        <Flow
          points={[
            [cx, B.norm1 - h(14)],
            [rx, B.norm1 - h(14)],
            [rx, B.norm2 + h(21)],
            [BX + BW + 8, B.norm2 + h(21)],
          ]}
          at={resAt + 8}
          dur={18}
          color={BAR}
          width={2}
          head={12}
        />
        <Line at={resAt + 10} x={rx + 18} y={B.ff + h(8)} size={21} color={INK_SOFT}>
          residual
        </Line>

        {/* Order goes in at the bottom. */}
        <Box x={BX - 70} y={B.emb} w={250} h={h(44)} at={ignoresAt} tone="data">
          Token embeddings
        </Box>
        <Box x={BX + 200} y={B.emb} w={280} h={h(44)} at={posAt} tone="data">
          Positional encodings
        </Box>
        <Svg opacity={ease(frame, posAt + 4, 10)}>
          <circle cx={cx} cy={B.sum} r={13} fill="none" stroke={BAR} strokeWidth={2.2} />
          <line x1={cx - 7} x2={cx + 7} y1={B.sum} y2={B.sum} stroke={BAR} strokeWidth={2.2} />
          <line x1={cx} x2={cx} y1={B.sum - 7} y2={B.sum + 7} stroke={BAR} strokeWidth={2.2} />
          <line x1={BX + 55} y1={B.emb - 2} x2={cx - 11} y2={B.sum + 6} stroke={BAR} strokeWidth={2} />
          <line x1={BX + 340} y1={B.emb - 2} x2={cx + 11} y2={B.sum + 6} stroke={BAR} strokeWidth={2} />
        </Svg>

        {/* The three kinds, by what each position may attend to. */}
        <ColumnRule x={(COLS[0] + COL_W + COLS[1]) / 2 - 6} top={y(330)} height={h(420)} at={decAt} />
        <ColumnRule x={(COLS[1] + COL_W + COLS[2]) / 2 - 6} top={y(330)} height={h(420)} at={edAt} />
        {[
          { title: "Encoder-only", model: "BERT", at: encAt, modelAt: bertAt, lines: ["Attends both ways,", "for understanding"] },
          { title: "Decoder-only", model: "GPT", at: decAt, modelAt: gptAt, lines: ["Masks the future,", "for generation"] },
          { title: "Encoder-decoder", model: "T5", at: edAt, modelAt: t5At, lines: ["One sequence", "into another"] },
        ].map((k, i) => (
          <React.Fragment key={k.title}>
            <Line at={k.at} x={COLS[i]} y={y(330)} size={26} weight={600}>
              {k.title}
            </Line>
            <Chip x={COLS[i]} y={y(388)} at={k.modelAt} tone="ink" size={22}>
              {k.model}
            </Chip>
            <Line at={k.at + 10} x={COLS[i]} y={mTop + MASK + h(34)} size={22}>
              {k.lines[0]}
            </Line>
            <Line at={k.at + 14} x={COLS[i]} y={mTop + MASK + h(34) + 34} size={22}>
              {k.lines[1]}
            </Line>
          </React.Fragment>
        ))}
        <Grid x={COLS[0]} y={mTop} n={5} size={MASK} gap={4} at={bothAt} />
        <Grid x={COLS[1]} y={mTop} n={5} size={MASK} gap={4} at={maskAt} on={(r, c) => c <= r} />
        <Grid x={COLS[2]} y={mTop + 45} n={5} size={88} gap={3} at={seqAt} />
        <Grid x={COLS[2] + 100} y={mTop + 45} n={5} size={88} gap={3} at={seqAt + 8} on={(r, c) => c <= r} color={DATA_DEEP} />
        <Line at={seqAt + 4} x={COLS[2] + 44} y={mTop + 145} size={20} color={INK_SOFT} align="center" width={100}>
          encoder
        </Line>
        <Line at={seqAt + 12} x={COLS[2] + 144} y={mTop + 145} size={20} color={INK_SOFT} align="center" width={100}>
          decoder
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
