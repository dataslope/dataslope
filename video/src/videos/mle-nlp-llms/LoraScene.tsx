import { Lock } from "lucide-react";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ColumnRule, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { LORA } from "./data";
import { BAR, BLUE_INK, Box, Chip, commas, Drift, INK, INK_SOFT, lerp, Line, Mark, MARK_OK, OK_INK, Q_SIZE, pulse, QUIET, Rule, Spot, Svg, X0 } from "./parts";

/** The frozen matrix and the two thin ones, in page x and layout y. */
const W = { x: X0 + 20, side: 250 };
const THIN = 22;
const RX = 1000;
const BAR_W = 760;

/**
 * Question 12. A frozen square (gray, locked) beside a tall thin matrix
 * times a short wide one (blue, trained); their sizes from results.json
 * (lora), 16,777,216 against 65,536, 0.39% in green. Right: what you train
 * and ship, an 8.4 MB adapter as a sliver beside a 12.9 GB copy, with the
 * assumptions as a note. Then at serving: the thin pair folds into the
 * square ("merge"), or one base model carries several adapters.
 */
export const LoraScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q12").from;
  const qAt = n.word("q12", "Question twelve");
  const textAt = n.word("q12", "What is parameter-efficient");
  const freezesAt = n.word("q12-a", "freezes the model");
  const updateAt = n.word("q12-a", "learns an update");
  const productAt = n.word("q12-a", "the product of two thin ones");
  const matrixAt = n.word("q12-math", "A matrix four thousand");
  const seventeenAt = n.word("q12-math", "nearly seventeen million");
  const rankAt = n.word("q12-math", "At rank eight");
  const sixtyAt = n.word("q12-math", "sixty-five thousand");
  const halfAt = n.word("q12-math", "under half a percent");
  const adaptAt = n.word("q12-ship", "Adapt two matrices");
  const trainAt = n.word("q12-ship", "you train about four million");
  const sixAt = n.word("q12-ship", "six and a half billion");
  const shipAt = n.word("q12-ship", "ship an eight-megabyte adapter");
  const copyAt = n.word("q12-ship", "a thirteen-gigabyte copy");
  const servingAt = n.word("q12-serve", "At serving");
  const mergeAt = n.word("q12-serve", "merge it into the weights");
  const latencyAt = n.word("q12-serve", "adds no latency");
  const separateAt = n.word("q12-serve", "keep it separate");
  const manyAt = n.word("q12-serve", "many adapters");
  const behavesAt = n.word("rag-in", "how a model behaves");
  const knowsAt = n.word("rag-in", "What it knows");
  const end = n.beat("rag-in").to;

  const L = LORA;
  const top = y(330);
  const side = h(W.side);
  const bx = W.x + W.side + 90;
  const ax = bx + THIN + 40;
  const merge = ease(frame, mergeAt + 4, 22);
  const tint = ease(frame, mergeAt + 22, 12);

  // The ship comparison.
  const shipTop = y(420);
  const BH = h(40);
  const adapterW = Math.max(4, (BAR_W * L.adapterMB) / (L.copyGB * 1000));

  // Serving: one base model, many adapters.
  const baseTop = y(720);
  const ADAPTERS = ["support", "legal", "code", "sales"];

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={freezesAt + 4} level={-31} />
      <Sfx name="el-pop" at={productAt + 4} level={-32} />
      <Sfx name="el-pencil" at={seventeenAt} level={-37} />
      <Sfx name="el-pencil" at={sixtyAt} level={-37} />
      <Sfx name="el-tap" at={halfAt + 4} level={-30} />
      <Sfx name="el-whoosh" at={copyAt} level={-36} />
      <Sfx name="el-whoosh" at={mergeAt + 4} level={-35} />
      <Sfx name="el-pop" at={manyAt} level={-30} />
      <Sfx name="el-tap" at={knowsAt} level={-33} />
      {ADAPTERS.map((a, i) => (
        <Sfx key={a} name="el-tap" at={separateAt + 8 + i * 4} level={-36} />
      ))}

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is parameter-efficient fine-tuning, for example LoRA?
        </QuestionCard>

        {/* The frozen matrix, and the update as two thin ones. */}
        <Svg>
          {ease(frame, freezesAt, 14) > 0 ? (
            <rect x={W.x} y={top} width={W.side} height={side} rx={5} fill={`color-mix(in srgb, ${ds("blue", 200)} ${tint * 100}%, ${QUIET})`} opacity={ease(frame, freezesAt, 14)} />
          ) : null}
          {ease(frame, productAt, 14) > 0 ? (
            <g opacity={ease(frame, productAt, 14) * (1 - ease(frame, mergeAt + 20, 8))}>
              <rect x={lerp(bx, W.x + W.side / 2 - THIN / 2, merge)} y={top} width={THIN} height={side * lerp(1, 0.4, merge)} rx={4} fill={BAR} />
              <rect x={lerp(ax, W.x + W.side * 0.3, merge)} y={lerp(top, top + side / 2, merge)} width={W.side * lerp(1, 0.4, merge)} height={THIN} rx={4} fill={BAR} />
            </g>
          ) : null}
        </Svg>
        <div style={{ position: "absolute", left: W.x + W.side / 2 - 22, top: top + side / 2 - 22, opacity: ease(frame, freezesAt + 6, 12) * (1 - tint * 0.6) }}>
          <Lock size={44} color={INK_SOFT} strokeWidth={1.8} />
        </div>
        <Line at={freezesAt + 4} x={W.x} y={top - h(36)} size={22} color={INK_SOFT}>
          frozen
        </Line>
        <Line at={updateAt + 4} out={mergeAt + 16} x={bx} y={top - h(36)} size={22} color={BLUE_INK}>
          trained
        </Line>
        <Line at={productAt} out={mergeAt + 16} x={W.x + W.side + 30} y={top + side / 2 - 22} size={34} color={INK} weight={400}>
          +
        </Line>
        <Line at={productAt + 6} out={mergeAt + 16} x={bx + THIN + 8} y={top + 40} size={24} color={INK}>
          ×
        </Line>
        <Line at={matrixAt} x={W.x} y={top + side + h(20)} size={22} color={INK_SOFT}>
          <Num>{commas(L.width)}</Num> × <Num>{commas(L.width)}</Num>
        </Line>
        <Line at={seventeenAt} x={W.x} y={top + side + h(54)} size={26} weight={600}>
          <Num>{commas(L.full)}</Num>
        </Line>
        {/* These name the thin pair, so they go with it when it merges. */}
        <Line at={rankAt} out={mergeAt + 16} x={bx} y={top + side + h(20)} size={22} color={INK_SOFT}>
          rank <Num>{L.rank}</Num>
        </Line>
        <Line at={sixtyAt} out={mergeAt + 16} x={bx} y={top + side + h(54)} size={26} weight={600} color={BLUE_INK}>
          <Num>{commas(L.adapter)}</Num>
        </Line>
        <Line at={halfAt} x={W.x} y={top + side + h(100)} size={28} weight={600} color={OK_INK}>
          <Mark at={halfAt + 6} color={MARK_OK}>
            <Num>{(L.share * 100).toFixed(2)}%</Num> of the numbers
          </Mark>
        </Line>
        <Line at={mergeAt + 24} x={W.x} y={top + side + h(150)} size={22} color={INK}>
          Merged: <span style={{ color: OK_INK, opacity: ease(frame, latencyAt, 10) }}>no added latency</span>
        </Line>
        {/* The family the question asks about: LoRA is one member (the page's "similar ideas"). */}
        <Line at={productAt + 24} x={W.x} y={top + side + h(204)} size={21} color={INK_SOFT}>
          Other parameter-efficient methods: adapters, prefix tuning
        </Line>

        {/* What you train, and what you ship. */}
        <ColumnRule x={RX - 70} top={y(320)} height={h(560)} at={adaptAt} />
        <Line at={adaptAt} x={RX} y={y(330)} size={22} color={INK_SOFT}>
          <Num>{L.layers}</Num> layers, <Num>{L.matricesPerLayer}</Num> matrices each, rank <Num>{L.rank}</Num>, 16-bit: assumptions
        </Line>
        <Line at={trainAt} x={RX} y={y(370)} size={26}>
          Train <Num>{commas(L.trained)}</Num> of <span style={{ opacity: ease(frame, sixAt, 10) }}><Num>{commas(L.model)}</Num> weights</span>
        </Line>
        <Svg>
          <rect x={RX} y={shipTop + h(40)} width={adapterW * ease(frame, shipAt, 10)} height={BH} rx={2} fill={BAR} />
          <rect x={RX} y={shipTop + h(150)} width={BAR_W * ease(frame, copyAt, 22)} height={BH} rx={4} fill={QUIET} />
        </Svg>
        <Line at={shipAt + 4} x={RX + 20} y={shipTop + h(40) + 4} size={24} color={BLUE_INK} weight={600}>
          <Num>{L.adapterMB.toFixed(1)}</Num> MB adapter
        </Line>
        <Line at={copyAt + 8} x={RX} y={shipTop + h(150) + BH + h(10)} size={24} weight={600}>
          <Num>{L.copyGB.toFixed(1)}</Num> GB full copy
        </Line>

        {/* Serving: one base model, many adapters. */}
        <Box x={RX} y={baseTop} w={230} h={h(64)} at={separateAt} tone="plain" turn={{ tone: "lit", at: knowsAt }}>
          Base model
        </Box>
        {ADAPTERS.map((a, i) => {
          const cy = baseTop + h(32) + (i - 1.5) * h(44);
          return (
            <React.Fragment key={a}>
              <Rule x1={RX + 232} y1={baseTop + h(32)} x2={RX + 300} y2={cy} at={separateAt + 6 + i * 4} width={1.6} color={INK} />
              <Chip
                x={RX + 304}
                y={cy - 17}
                at={separateAt + 8 + i * 4}
                tone="blue"
                size={21}
                style={{ transform: `translateX(${8 * pulse(frame, behavesAt + i * 4, 18)}px)` }}
              >
                adapter: {a}
              </Chip>
            </React.Fragment>
          );
        })}
        <Line at={manyAt + 4} x={RX} y={baseTop + h(130)} size={22} color={INK_SOFT}>
          One frozen base, served once
        </Line>
        <Spot id="plug" at={manyAt} x={1650} y={baseTop - h(30)} w={150} />
        <Line at={servingAt} x={RX} y={baseTop - h(54)} size={22} weight={600}>
          At serving
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
