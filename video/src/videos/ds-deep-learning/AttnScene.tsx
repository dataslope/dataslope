import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ATTN } from "./data";
import { Cells, Drift, Mark, num, OK, OK_INK, pulse, Svg, Tagline, WARM, X0 } from "./parts";

const TOK_X = 130;
const ROW0 = 450;
const ROW_H = 74;
const GX = 560;
const GW = 116;
const SUM_X = GX + 4 * GW + 34;
const BLEND_X = 1290;
/** The row whose blend is spelled out. */
const PICK = 2;
/** Query, key and value: three chips per token, in three inks. */
const QKV = [
  { name: "q", color: BAR },
  { name: "k", color: WARM },
  { name: "v", color: ds("purple", 500) },
];

/**
 * Question 12: the formula, its parts marked as they are named, with where
 * Q, K and V come from (three learned matrices) and what d is; four tokens
 * each making a query, a key and a value; their dot-product scores, then the softmaxed
 * weights as a heat map whose rows each add to 1.00; and one row's output
 * spelled out as its blend of the four values, then every row at once.
 * The vectors are random, length four (check.mjs), so the weights mean
 * nothing about the words: the arithmetic is the point.
 */
export const AttnScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("attn").from;
  const qAt = n.word("attn", "Question twelve");
  const textAt = n.word("attn", "What is self-attention");
  const makesAt = n.word("attn-qkv", "Three learned matrices");
  const scoreAt = n.word("attn-score", "Score every query against every key");
  const dotAt = n.word("attn-score", "with a dot product");
  const rootAt = n.word("attn-score", "Divide by the square root of d");
  const entriesAt = n.word("attn-score", "the number of entries in each");
  const oneKeyAt = n.word("attn-score", "all its weight on one key");
  const softAt = n.word("attn-score", "softmax each row into weights");
  const hereAt = n.word("attn-grid", "Here are four tokens");
  const rowAt = n.word("attn-grid", "Every row adds up to one");
  const blendAt = n.word("attn-grid", "its row's blend of all four values");
  const onceAt = n.word("attn-grid", "all four rows are computed at once");
  const end = n.beat("attn-grid").to;

  const A = ATTN;
  const toWeights = ease(frame, softAt, 14);
  const rowY = (i: number) => y(ROW0) + i * h(ROW_H);
  const picked = ease(frame, blendAt - 4, 10) * (1 - ease(frame, onceAt, 10));
  const all = ease(frame, onceAt, 10);
  const swell = pulse(frame, onceAt + 4, 24);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={makesAt} level={-36} />
      <Sfx name="el-tap" at={scoreAt + 4} level={-36} />
      <Sfx name="el-whoosh" at={softAt} level={-34} />
      <Sfx name="el-pop" at={rowAt + 4} level={-32} />
      <Sfx name="el-sprinkle" at={onceAt} level={-34} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={12} at={qAt - 4} textAt={textAt - 4} size={60}>
          What is self-attention?
        </QuestionCard>

        <Note at={makesAt - 2} x={X0} y={y(300)}>
          <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 600, color: INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>
            <Mark at={softAt}>softmax(</Mark>
            <Mark at={scoreAt + 2}>QKᵀ</Mark> <Mark at={rootAt}>/ √d</Mark>
            <Mark at={softAt}>)</Mark> V
          </span>
        </Note>
        <Note at={makesAt} x={X0 + 560} y={y(290)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>Q, K, V: each token&apos;s vector × three learned matrices</span>
        </Note>
        <Note at={entriesAt - 2} x={X0 + 560} y={y(326)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap", ...TABULAR }}>
            d = {A.d}, the entries in each q and k;{" "}
            <span style={{ opacity: ease(frame, oneKeyAt - 2, 10) }}>√d keeps the softmax from putting all its weight on one key</span>
          </span>
        </Note>

        {/* ── Four tokens, each with a query, a key and a value ── */}
        {A.tokens.map((t, i) => (
          <React.Fragment key={t}>
            <Tagline x={TOK_X} y={rowY(i) + h(16)} at={makesAt - 4 + i * 2} size={26} color={INK} weight={650}>
              {t}
            </Tagline>
            <Svg opacity={ease(frame, makesAt + 4 + i * 2, 10)}>
              {QKV.map((c, k) => (
                <g key={c.name}>
                  <rect x={TOK_X + 110 + k * 46} y={rowY(i) + h(14)} width={38} height={h(38)} rx={5} fill={`color-mix(in srgb, ${c.color} 30%, ${PAPER})`} stroke={c.color} strokeWidth={2} />
                  <text x={TOK_X + 110 + k * 46 + 19} y={rowY(i) + h(14) + h(38) / 2 + 7} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, fill: INK }}>
                    {c.name}
                  </text>
                </g>
              ))}
            </Svg>
          </React.Fragment>
        ))}
        <Tagline x={TOK_X + 110} y={rowY(0) - h(28)} at={makesAt + 4} size={19}>
          query, key, value
        </Tagline>

        {/* ── The grid: scores, then weights ── */}
        {A.tokens.map((t, j) => (
          <Tagline key={t} x={GX + j * GW + GW / 2} y={rowY(0) - h(34)} width={GW} align="center" at={scoreAt + j * 2} size={21} color={INK}>
            {t}
          </Tagline>
        ))}
        <div style={{ opacity: 1 - toWeights }}>
          <Cells values={A.scores.map((r) => r.map((v) => num(v)))} x={GX} y={rowY(0)} w={GW} h={h(ROW_H)} at={scoreAt + 2} size={24} color={INK_SOFT} bracket={false} />
        </div>
        <Cells
          values={A.weights}
          x={GX}
          y={rowY(0)}
          w={GW}
          h={h(ROW_H)}
          at={softAt + 2}
          size={25}
          bracket={false}
          format={(v) => v.toFixed(2)}
          fill={{ color: OK, at: softAt + 6, max: 0.8 }}
        />
        <Tagline x={GX + 2 * GW} y={rowY(4) + h(10)} width={4 * GW} align="center" at={scoreAt + 6} out={softAt} size={19}>
          each query against each key<span style={{ opacity: ease(frame, dotAt - 2, 10) }}>, by dot product</span>
        </Tagline>
        <Tagline x={GX + 2 * GW} y={rowY(4) + h(10)} width={4 * GW} align="center" at={softAt + 6} size={19}>
          weights: how much each token takes from each
        </Tagline>
        {A.roundedSums.map((s, i) => (
          <Tagline key={i} x={SUM_X} y={rowY(i) + h(20)} at={rowAt + i * 3} size={24} color={OK_INK} weight={700}>
            = {s.toFixed(2)}
          </Tagline>
        ))}
        <Tagline x={SUM_X} y={rowY(0) - h(34)} at={rowAt} size={19}>
          row sum
        </Tagline>
        <Svg>
          {A.tokens.map((_, i) => {
            const o = i === PICK ? Math.max(picked, all) : all;
            if (o <= 0) return null;
            return (
              <rect
                key={i}
                x={GX - 4}
                y={rowY(i) + 1}
                width={4 * GW + 8}
                height={h(ROW_H) - 2}
                rx={6}
                fill="none"
                stroke={i === PICK && picked > 0 ? INK : OK}
                strokeWidth={2.6 + 2 * swell}
                opacity={o}
              />
            );
          })}
        </Svg>
        <Note at={hereAt - 2} x={GX} y={rowY(4) + h(52)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>four tokens, random vectors of length {A.d}</span>
        </Note>

        {/* ── One row's output, spelled out ── */}
        <Note at={blendAt - 2} x={BLEND_X} y={rowY(0)}>
          <span style={{ ...note(25, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            output for &ldquo;{A.tokens[PICK]}&rdquo; =
          </span>
        </Note>
        {A.tokens.map((t, j) => (
          <Note key={t} at={blendAt + 2 + j * 3} x={BLEND_X + 30} y={rowY(0) + h(52) + j * h(46)}>
            <span style={{ ...note(25, INK), whiteSpace: "nowrap", ...TABULAR }}>
              <span style={{ display: "inline-block", width: 28 }}>{j > 0 ? "+" : ""}</span>
              <b style={{ color: OK_INK }}>{A.weights[PICK][j].toFixed(2)}</b> × <span style={{ fontFamily: MONO, fontSize: 23, color: BLUE_INK }}>v</span>
              <span style={{ ...label(20, INK_SOFT) }}>({t})</span>
            </span>
          </Note>
        ))}
        <Note at={onceAt + 2} x={BLEND_X} y={rowY(0) + h(52) + 4 * h(46) + h(20)}>
          <span style={{ ...note(25, OK_INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            <Mark at={onceAt + 6}>all four rows at once</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
