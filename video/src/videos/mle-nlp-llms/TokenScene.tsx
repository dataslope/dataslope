import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { label } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { TOKENS } from "./data";
import {
  ACCENT_INK,
  BAD_FILL,
  BAR,
  BLUE_INK,
  Chip,
  Clear,
  Code,
  ColHead,
  commas,
  DATA_DEEP,
  DATA_FILL,
  Drift,
  Flow,
  GOLD,
  INK,
  INK_SOFT,
  lerp,
  Line,
  Mark,
  OK_INK,
  Q_SIZE,
  Spot,
  Svg,
  X0,
} from "./parts";

const COL_W = 380;
const COL = { words: X0, chars: 575, subs: 1030 };
/** The balance, top right beside the question. */
const BAL = { x: 1592, arm: 132 };
/** How an unseen word is written on the page. */
const CASED: Record<string, string> = { rlhf: "RLHF", lora: "LoRA" };

/**
 * Question 1. A balance names the trade (vocabulary against sequence length)
 * and tips with each answer. Three columns: whole words, built from the
 * track's seven other pages and read against the NLP page, where the unseen
 * words all become one red "unknown"; characters, five times the positions
 * and twenty-five times the pairs; subwords, "hallucination" cut in two by
 * o200k_base. Then the vocabulary's own price, the embedding table, at the
 * right, and the balance tips back.
 */
export const TokenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q1").from;
  const qAt = n.word("q1", "Question one");
  const textAt = n.word("q1", "What is tokenization");
  const splitsAt = n.word("q1-a", "splits text");
  const vocabAt = n.word("q1-a", "vocabulary against length");
  const lengthAt = n.word("q1-a", "against length");
  const wholeAt = n.word("q1-word", "Whole words");
  const vastAt = n.word("q1-word", "a vast vocabulary");
  const sevenAt = n.word("q1-word", "seven other pages");
  const threeAt = n.word("q1-word", "three thousand words");
  const readAt = n.word("q1-word", "read the NLP page");
  const fifteenAt = n.word("q1-word", "fifteen percent");
  const hallAt = n.word("q1-word", "hallucination among them");
  const unknownAt = n.word("q1-word", "unknown token");
  const charsAt = n.word("q1-char", "Characters never miss");
  const fiveAt = n.word("q1-char", "five times as long");
  const squareAt = n.word("q1-char", "grows with the square");
  const twentyAt = n.word("q1-char", "twenty-five times");
  const subAt = n.word("q1-sub", "Subwords split the difference");
  const freqAt = n.word("q1-sub", "frequent words stay whole");
  const rareAt = n.word("q1-sub", "rare ones break");
  const prodAt = n.word("q1-piece", "two hundred thousand pieces");
  const cutsAt = n.word("q1-piece", "the word hallucination");
  const avgAt = n.word("q1-piece", "one point four");
  const priceAt = n.word("q1-cost", "has a price too");
  const rowAt = n.word("q1-cost", "a row of the embedding table");
  const widthAt = n.word("q1-cost", "a width of four thousand");
  const millionAt = n.word("q1-cost", "eight hundred million weights");
  const rowsAt = n.word("emb-in", "What goes in those rows");
  const end = n.beat("emb-in").to;

  const T = TOKENS;
  const colTop = y(330);
  const body = colTop + 76;

  // ── The balance: vocabulary on the left pan, sequence length on the right ──
  const tilt =
    -12 * ease(frame, vastAt, 22) + 24 * ease(frame, fiveAt, 22) - 12 * ease(frame, subAt + 6, 22) - 6 * ease(frame, priceAt, 22);
  const rad = (tilt * Math.PI) / 180;
  const pivot = { x: BAL.x, y: y(170) };
  const ends = [-1, 1].map((s) => ({ x: pivot.x + s * BAL.arm * Math.cos(rad), y: pivot.y + s * BAL.arm * Math.sin(rad) }));
  const balIn = ease(frame, vocabAt - 6, 16);
  const panIn = [ease(frame, vocabAt, 14), ease(frame, lengthAt, 14)];
  const STRING = h(58);

  // ── Words: seven pages, the NLP page, and what it held that they didn't ──
  const unseen = T.unseenExamples.map((w) => CASED[w] ?? w);
  const pageW = 46;
  const pageH = h(58);
  const stackX = COL.words + 14;
  const nlpX = COL.words + 236;
  const stackTop = body + h(8);
  const rowY = (i: number) => y(608) + i * h(42);

  // ── Characters: the page as characters against the page as tokens ──
  const barW = (v: number) => (COL_W * v) / T.chars;
  const grid = { x: COL.chars, y: y(632), cell: 36, gap: 3 };
  const growth = ease(frame, squareAt + 4, 24);

  // ── The embedding table at the right ──
  const table = { x: 1500, y: y(436), w: 230, rows: 26, rowH: h(11), gap: h(3) };

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={splitsAt + 2} level={-30} />
      <Sfx name="el-tap" at={vocabAt} level={-32} />
      <Sfx name="el-whoosh" at={vastAt} level={-37} />
      <Sfx name="el-sprinkle" at={sevenAt} level={-34} />
      <Sfx name="el-pencil" at={fifteenAt} level={-36} />
      <Sfx name="el-whoosh" at={hallAt} level={-36} />
      <Sfx name="el-tap" at={unknownAt} level={-30} />
      <Sfx name="el-whoosh" at={fiveAt} level={-37} />
      <Sfx name="el-sprinkle" at={squareAt + 4} level={-34} />
      <Sfx name="el-tap" at={cutsAt + 6} level={-30} />
      <Sfx name="el-whoosh" at={subAt + 6} level={-37} />
      <Sfx name="el-sprinkle" at={rowAt} level={-35} />
      <Sfx name="el-pencil" at={millionAt} level={-36} />
      <Sfx name="el-sprinkle" at={rowsAt + 4} level={-36} />

      <Drift from={from} to={end + 40} scale={0.012}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE} width={1240}>
          What is tokenization, and why is subword tokenization standard?
        </QuestionCard>

        {/* The balance. */}
        <Svg opacity={balIn}>
          <line x1={pivot.x} y1={pivot.y} x2={pivot.x} y2={y(330)} stroke={INK} strokeWidth={2.4} />
          <path d={`M${pivot.x - 34},${y(330)} L${pivot.x + 34},${y(330)}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <line x1={ends[0].x} y1={ends[0].y} x2={ends[1].x} y2={ends[1].y} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <circle cx={pivot.x} cy={pivot.y} r={6} fill={INK} />
          {ends.map((e, i) => (
            <g key={i} opacity={panIn[i]}>
              <line x1={e.x} y1={e.y} x2={e.x} y2={e.y + STRING} stroke={INK} strokeWidth={1.6} />
              <path d={`M${e.x - 46},${e.y + STRING} Q${e.x},${e.y + STRING + 30} ${e.x + 46},${e.y + STRING} Z`} fill={DATA_DEEP} />
            </g>
          ))}
        </Svg>
        {[
          { text: "vocabulary", at: vocabAt },
          { text: "sequence length", at: lengthAt },
        ].map((l, i) => (
          <div
            key={l.text}
            style={{
              position: "absolute",
              left: ends[i].x - 100,
              top: ends[i].y + STRING + 30,
              width: 200,
              textAlign: "center",
              ...label(21, INK),
              fontWeight: 500,
              opacity: panIn[i] * balIn,
            }}
          >
            {l.text}
          </div>
        ))}

        <Clear at={wholeAt - 8}>
          <Line at={splitsAt - 2} x={X0} y={y(400)} size={30}>
            Text, cut into the units a model reads
          </Line>
        </Clear>
        <Spot id="scissors" at={splitsAt + 2} out={subAt - 16} x={1140} y={y(452)} w={170} />

        {/* ── Words ── */}
        <ColHead at={wholeAt} x={COL.words} y={colTop} w={COL_W}>
          Words
        </ColHead>
        <Svg>
          {Array.from({ length: 7 }, (_, i) => {
            const p = ease(frame, sevenAt + i * 2, 10);
            if (p <= 0) return null;
            return <rect key={i} x={stackX + i * 6} y={stackTop + (6 - i) * 5} width={pageW} height={pageH} rx={4} fill={DATA_FILL} opacity={p} />;
          })}
          {ease(frame, readAt, 10) > 0 ? (
            <rect x={nlpX} y={stackTop + 15} width={pageW} height={pageH} rx={4} fill={DATA_DEEP} opacity={ease(frame, readAt, 10)} />
          ) : null}
        </Svg>
        <Flow points={[[stackX + 102, stackTop + 15 + pageH / 2], [nlpX - 14, stackTop + 15 + pageH / 2]]} at={readAt} head={11} width={2} />
        <Line at={threeAt} x={stackX + 40} y={stackTop + pageH + h(46)} size={21} align="center" width={200} color={BLUE_INK}>
          <Num>{commas(T.vocabWords)}</Num> words
        </Line>
        <Line at={readAt + 4} x={nlpX + pageW / 2} y={stackTop + pageH + h(46)} size={21} align="center" width={160} color={INK_SOFT}>
          NLP page
        </Line>
        <Line at={fifteenAt} x={COL.words} y={y(560)} size={24} color={ACCENT_INK} weight={600}>
          <Num>{Math.round(T.unseenRunningShare * 100)}%</Num> of its words never seen
        </Line>
        {unseen.map((w, i) => {
          const at = hallAt + i * 4;
          const fly = ease(frame, at, 16);
          if (fly <= 0) return null;
          const fx = lerp(nlpX, COL.words, fly);
          const fy = lerp(stackTop + 20, rowY(i), fly);
          const toUnknown = unknownAt + i * 3;
          return (
            <React.Fragment key={w}>
              <div style={{ position: "absolute", left: fx, top: fy, opacity: Math.min(1, fly * 1.6) }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    border: `2px solid ${INK}`,
                    borderRadius: 7,
                    fontFamily: MONO,
                    fontSize: 21,
                    fontWeight: 500,
                    lineHeight: 1.15,
                    color: INK,
                    whiteSpace: "nowrap",
                  }}
                >
                  {w}
                </span>
              </div>
              <Flow points={[[COL.words + 224, rowY(i) + 17], [COL.words + 266, rowY(i) + 17]]} at={toUnknown} dur={8} head={10} width={2} />
              <Chip x={COL.words + 278} y={rowY(i)} at={toUnknown + 4} tone="red" size={21}>
                unknown
              </Chip>
            </React.Fragment>
          );
        })}

        {/* ── Characters ── */}
        <ColHead at={charsAt} x={COL.chars} y={colTop} w={COL_W}>
          Characters
        </ColHead>
        <Line at={charsAt + 6} x={COL.chars} y={body} size={21} color={INK_SOFT}>
          The NLP page in <Num>{commas(T.chars)}</Num> characters
        </Line>
        <Line at={fiveAt - 4} x={COL.chars} y={body + h(76)} size={21} color={INK_SOFT}>
          and in <Num>{commas(T.subwordTokens)}</Num> subword tokens
        </Line>
        <Svg>
          <rect x={COL.chars} y={body + h(34)} width={barW(T.chars) * ease(frame, charsAt + 8, 18)} height={h(22)} rx={4} fill={BAR} />
          <rect x={COL.chars} y={body + h(110)} width={barW(T.subwordTokens) * ease(frame, fiveAt, 14)} height={h(22)} rx={4} fill={BAR} />
        </Svg>
        <Line at={fiveAt + 8} x={COL.chars} y={y(560)} size={24} weight={600}>
          <Num>{Math.round(T.charPositionsOverTokens)}</Num>× the positions
        </Line>
        <Svg>
          {Array.from({ length: 25 }, (_, k) => {
            const r = Math.floor(k / 5);
            const c = k % 5;
            const first = k === 0;
            const p = first ? ease(frame, squareAt, 10) : ease(frame, squareAt + 4 + (r + c) * 2.4 * growth, 8) * growth;
            if (p <= 0) return null;
            return (
              <rect
                key={k}
                x={grid.x + c * (grid.cell + grid.gap)}
                y={grid.y + r * (grid.cell + grid.gap)}
                width={grid.cell}
                height={grid.cell}
                rx={4}
                fill={first ? BAR : BAD_FILL}
                opacity={Math.min(1, p)}
              />
            );
          })}
        </Svg>
        <Line at={squareAt + 2} x={COL.chars + 5 * (grid.cell + grid.gap) + 14} y={grid.y + 4} size={21} color={BLUE_INK}>
          tokens&apos; pairs
        </Line>
        <Line at={twentyAt} x={COL.chars + 5 * (grid.cell + grid.gap) + 14} y={grid.y + h(108)} size={26} color={ACCENT_INK} weight={600}>
          <Num>{T.charPairsOverTokens}</Num>× the pairs
        </Line>

        {/* ── Subwords ── */}
        <ColHead at={subAt} x={COL.subs} y={colTop} w={COL_W}>
          Subwords
        </ColHead>
        <Chip x={COL.subs} y={body} at={freqAt} tone="green" size={24} mono>
          {T.pieces.embeddings[0].trimStart()}
        </Chip>
        <Line at={freqAt + 8} x={COL.subs + 200} y={body + 3} size={21} color={INK_SOFT}>
          stays whole
        </Line>
        {(() => {
          const split = ease(frame, cutsAt + 4, 14);
          const [a, b] = T.pieces.hallucination.map((p) => p.trimStart());
          const ink = `color-mix(in srgb, ${OK_INK} ${split * 100}%, ${INK})`;
          const chip = (text: string, left: number, key: string) => (
            <span
              key={key}
              style={{
                position: "absolute",
                left,
                top: 0,
                padding: "3px 12px",
                border: `2px solid ${ink}`,
                borderRadius: 8,
                fontFamily: MONO,
                fontSize: 24,
                fontWeight: 500,
                lineHeight: 1.15,
                color: ink,
                whiteSpace: "pre",
              }}
            >
              {text}
            </span>
          );
          const pw = a.length * 14.4 + 28;
          const p = ease(frame, rareAt, 14);
          if (p <= 0) return null;
          return (
            <div style={{ position: "absolute", left: COL.subs, top: body + h(66), opacity: p }}>
              {split <= 0 ? chip(a + b, 0, "whole") : [chip(a, 0, "a"), chip(b, pw + 14 * split - 2 * (1 - split), "b")]}
            </div>
          );
        })()}
        <Line at={cutsAt + 10} x={COL.subs + 300} y={body + h(66) + 3} size={21} color={INK_SOFT}>
          in two
        </Line>
        <Line at={avgAt} x={COL.subs} y={y(560)} size={24} weight={600}>
          <span style={{ color: OK_INK }}>
            <Num>{T.tokensPerWord}</Num>
          </span>{" "}
          tokens a word on this page
        </Line>
        <Line at={prodAt} x={COL.subs} y={y(610)} size={21} color={INK_SOFT}>
          <Code>{T.encoding}</Code>: <Num>{commas(T.vocabSize)}</Num> pieces
        </Line>

        {/* ── The vocabulary's price: one row per piece ── */}
        <Line at={rowAt} x={table.x} y={table.y - h(50)} size={22} weight={600}>
          <Num>{commas(T.vocabSize)}</Num> rows
          <span style={{ opacity: ease(frame, widthAt, 10) }}>
            {" "}× <Num>{commas(T.embeddingWidth)}</Num>
          </span>
        </Line>
        <Svg>
          {Array.from({ length: table.rows }, (_, i) => {
            const p = ease(frame, rowAt + i * 0.8, 8);
            if (p <= 0) return null;
            const wave = Math.max(0, 1 - Math.abs(frame - (rowsAt + 4 + i * 2)) / 5);
            const lit = i === 9 ? 1 : wave;
            const w = table.w * lerp(0.2, 1, ease(frame, widthAt + 2, 16));
            return <rect key={i} x={table.x} y={table.y + i * (table.rowH + table.gap)} width={w} height={table.rowH} rx={2} fill={lit > 0 ? `color-mix(in srgb, ${GOLD} ${lit * 100}%, ${DATA_FILL})` : DATA_FILL} opacity={p} />;
          })}
        </Svg>
        <Line at={millionAt} x={table.x} y={table.y + table.rows * (table.rowH + table.gap) + h(20)} size={24} weight={600}>
          <Mark at={millionAt + 8}>
            <Num>{Math.round(T.embeddingTable / 1e6)}</Num> million weights
          </Mark>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
