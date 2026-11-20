import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { BAR, Chip, DATA_FILL, Drift, Flow, GOLD, HIGHLIGHT, INK, INK_SOFT, Line, Mark, Q_SIZE, Svg, X0 } from "./parts";

const WORDS = ["the", "river", "bank", "flooded", "after", "heavy", "rain"];
const ADV = 22 * 0.6;
const widths = WORDS.map((w) => w.length * ADV + 26);
const xs = widths.map((_, i) => X0 + 330 + widths.slice(0, i).reduce((a, b) => a + b + 14, 0));
const mid = (i: number) => xs[i] + widths[i] / 2;

/** One row of word chips with a hidden slot, and arrows from the words it
 *  is predicted from. */
const Row: React.FC<{ top: number; slot: number; from: readonly number[]; at: number; hideAt: number; arrowsAt: number; lift: number }> = ({
  top,
  slot,
  from,
  at,
  hideAt,
  arrowsAt,
  lift,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {WORDS.map((w, i) => {
        const p = ease(frame, at + i * 1.5, 10);
        if (p <= 0) return null;
        const hidden = i === slot && frame >= hideAt;
        return (
          <div
            key={w}
            style={{
              position: "absolute",
              left: xs[i],
              top,
              width: widths[i],
              boxSizing: "border-box",
              padding: "3px 0",
              textAlign: "center",
              border: `2px ${hidden ? "dashed" : "solid"} ${hidden ? GOLD : INK}`,
              background: hidden ? HIGHLIGHT : undefined,
              borderRadius: 7,
              fontFamily: MONO,
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1.15,
              color: INK,
              opacity: p,
            }}
          >
            {hidden ? "?" : w}
          </div>
        );
      })}
      {from.map((j, k) => {
        const side = j < slot ? -1 : 1;
        const off = side * (10 + 18 * (Math.abs(j - slot) - 1));
        const up = lift + Math.abs(j - slot) * 12;
        return (
          <Flow
            key={j}
            points={[
              [mid(j), top - 6],
              [mid(j), top - up],
              [mid(slot) + off, top - up],
              [mid(slot) + off, top - 8],
            ]}
            at={arrowsAt + k * 2}
            head={10}
            width={1.8}
            color={BAR}
          />
        );
      })}
    </>
  );
};

/**
 * Question 10. A huge corpus as rows of pages, the text its own label. Then
 * one sentence twice: masked language modeling (BERT) hides a word and
 * predicts it from both sides; causal language modeling (GPT) predicts the
 * next word from the left alone, which is what lets it generate.
 */
export const PretrainScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("q10").from;
  const qAt = n.word("q10", "Question ten");
  const textAt = n.word("q10", "What is pretraining");
  const hugeAt = n.word("q10-a", "a huge unlabeled corpus");
  const ownAt = n.word("q10-a", "the text is its own label");
  const mlmAt = n.word("q10-a", "Masked language modeling");
  const hidesAt = n.word("q10-a", "hides tokens");
  const bothAt = n.word("q10-a", "from both sides");
  const clmAt = n.word("q10-a", "Causal language modeling");
  const nextAt = n.word("q10-a", "predicts the next token");
  const leftAt = n.word("q10-a", "from the left alone");
  const genAt = n.word("q10-a", "lets it generate");
  const end = n.beat("q10-a").to;

  const corpusTop = y(320);
  const r1 = y(560);
  const r2 = y(800);
  const MASK = 3;
  const NEXT = WORDS.length - 1;

  return (
    <AbsoluteFill>
      <Sfx name="el-sprinkle" at={hugeAt + 2} level={-34} />
      <Sfx name="el-tap" at={hidesAt + 4} level={-31} />
      <Sfx name="el-pencil" at={bothAt} level={-36} />
      <Sfx name="el-pencil" at={leftAt} level={-36} />
      <Sfx name="el-tap" at={genAt + 4} level={-31} />

      <Drift from={from} to={end + 40} scale={0.014}>
        <QuestionCard n={10} at={qAt - 4} textAt={textAt - 4} size={Q_SIZE}>
          What is pretraining, and what objectives are used?
        </QuestionCard>

        {/* A huge unlabeled corpus. */}
        <Svg>
          {Array.from({ length: 30 }, (_, i) => {
            const p = ease(frame, hugeAt + i * 0.7, 8);
            if (p <= 0) return null;
            const c = i % 15;
            const r = Math.floor(i / 15);
            return <rect key={i} x={X0 + c * 40} y={corpusTop + r * h(50)} width={30} height={h(40)} rx={4} fill={DATA_FILL} opacity={p} />;
          })}
        </Svg>
        <Line at={hugeAt + 8} x={X0 + 640} y={corpusTop + h(8)} size={26}>
          A huge unlabeled corpus
        </Line>
        <Line at={ownAt} x={X0 + 640} y={corpusTop + h(50)} size={26} color={INK_SOFT}>
          The text is its own label
        </Line>

        {/* Masked: from both sides. */}
        <Line at={mlmAt} x={X0} y={r1 - h(4)} size={24} weight={600}>
          Masked
        </Line>
        <Line at={mlmAt + 4} x={X0} y={r1 + h(30)} size={21} color={INK_SOFT}>
          language modeling
        </Line>
        <Chip x={X0} y={r1 + h(68)} at={mlmAt + 8} tone="ink" size={21}>
          BERT
        </Chip>
        <Row top={r1} slot={MASK} from={[0, 1, 2, 4, 5, 6]} at={mlmAt + 4} hideAt={hidesAt + 4} arrowsAt={bothAt} lift={h(62)} />
        <Line at={bothAt + 12} x={xs[6] + widths[6] + 40} y={r1 + 4} size={22} color={INK_SOFT}>
          from both sides
        </Line>

        {/* Causal: from the left alone. */}
        <Line at={clmAt} x={X0} y={r2 - h(4)} size={24} weight={600}>
          Causal
        </Line>
        <Line at={clmAt + 4} x={X0} y={r2 + h(30)} size={21} color={INK_SOFT}>
          language modeling
        </Line>
        <Chip x={X0} y={r2 + h(68)} at={clmAt + 8} tone="ink" size={21}>
          GPT
        </Chip>
        <Row top={r2} slot={NEXT} from={[0, 1, 2, 3, 4, 5]} at={clmAt + 4} hideAt={clmAt} arrowsAt={leftAt} lift={h(62)} />
        <Line at={nextAt} x={xs[6] + widths[6] + 40} y={r2 + 4} size={22} color={INK_SOFT}>
          the next token, from the left
        </Line>
        <Line at={genAt} x={xs[6] + widths[6] + 40} y={r2 + h(40)} size={24} weight={600}>
          <Mark at={genAt + 6}>which lets it generate</Mark>
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
