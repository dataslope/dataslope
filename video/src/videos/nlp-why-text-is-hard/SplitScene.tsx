import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { SPLIT } from "./data";
import { ADVANCE, BAD_INK, Chip, chipHeight, chipWidth, CodeStrip, Count, Drift, FIG_Y, Headline, Kicker, MARK, pulse, Svg, X0 } from "./parts";

const SIZE = 30;
const GAP = 22;
const INNER = 8;
const COL_X0 = 486;
const CODE_Y = 334;
const A_Y = 500;
const B_Y = 716;

/** One column per split piece, wide enough for the piece or for the tokens
 *  word_tokenize cuts it into, whichever is wider. */
const COLS = SPLIT.pieces.map((piece, i) => {
  const toks = SPLIT.tokens.map((t, j) => ({ t, j })).filter(({ j }) => SPLIT.tokenPiece[j] === i);
  const tw = toks.reduce((s, { t }) => s + chipWidth(t, SIZE), 0) + INNER * (toks.length - 1);
  return { piece, toks, pw: chipWidth(piece, SIZE), tw, w: Math.max(chipWidth(piece, SIZE), tw) };
});
const COL_XS = (() => {
  const xs: number[] = [];
  let x = COL_X0;
  for (const c of COLS) {
    xs.push(x);
    x += c.w + GAP;
  }
  return xs;
})();
/** Each token's left edge, centred as a group in its piece's column. */
const TOK_XS = (() => {
  const out: number[] = new Array(SPLIT.tokens.length).fill(0);
  COLS.forEach((c, i) => {
    let x = COL_XS[i] + (c.w - c.tw) / 2;
    for (const { t, j } of c.toks) {
      out[j] = x;
      x += chipWidth(t, SIZE) + INNER;
    }
  });
  return out;
})();
const pieceX = (i: number) => COL_XS[i] + (COLS[i].w - COLS[i].pw) / 2;
const P = (w: string) => SPLIT.pieces.indexOf(w);
/** Where the string starts in the listing's line: after `sentence = "`. */
const STR_START = 'sentence = "'.length;
const T = (w: string) => SPLIT.tokens.indexOf(w);

/**
 * Part 1, why split() is not enough: the lesson's sentence through
 * str.split() (eight pieces, the "not" hidden in "can't", punctuation glued
 * on) and through NLTK's word_tokenize() (twelve tokens), each token set
 * under the piece it came from.
 */
export const SplitScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("split").from;
  const sentenceAt = n.word("split", "sentence");
  const splitAt = n.word("pieces", "split");
  const cutsAt = n.word("pieces", "cuts");
  const eightAt = n.word("pieces", "eight");
  const cantAt = n.word("glued", "can't");
  const hidingAt = n.word("glued", "hiding");
  const commaAt = n.word("glued", "comma");
  const differentAt = n.word("glued", "different word");
  const tokFrom = n.beat("tokens").from;
  const tokenizerAt = n.word("tokens", "tokenizer");
  const twelveAt = n.word("tokens", "twelve");
  const cutsTwoAt = n.word("fixed", "can't");
  const negationAt = n.word("fixed", "negation");
  const punctAt = n.word("fixed", "punctuation");
  const periodAt = n.word("fixed", "period");
  const realFrom = n.beat("real").from;
  const linerAt = n.word("real", "one-liner");
  const systemAt = n.word("do-in", "NLP system");
  const end = n.beat("layers").from;

  const readFrom = n.word("split", "I");
  const readTo = n.word("split", "Jones", { edge: "end" });
  const readP = interpolate(frame, [readFrom - 2, readTo], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const actuallyAt = n.word("do-in", "actually");
  const pieceAt = (i: number) => cutsAt + 2 + i * 3;
  const tokAt = (j: number) => tokenizerAt + 4 + SPLIT.tokenPiece[j] * 3 + j * 0.6;
  const ch = chipHeight(SIZE);
  const aTop = y(A_Y);
  const bTop = y(B_Y);
  const butter = P("butter,");
  const aside = ease(frame, differentAt - 2, 12) * (1 - ease(frame, tokFrom + 4, 12));
  const linkP = (j: number) => ease(frame, tokAt(j) - 6, 10);
  const rowADim = systemAt;

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pencil" at={sentenceAt - 4} level={-35} />
      <Sfx name="el-sprinkle" at={pieceAt(0)} level={-32} />
      <Sfx name="el-tap" at={eightAt - 2} level={-29} />
      <Sfx name="el-scratch" at={cantAt} level={-34} />
      <Sfx name="el-tap" at={commaAt} level={-31} />
      <Sfx name="el-pencil" at={tokenizerAt} level={-35} />
      <Sfx name="el-sprinkle" at={tokAt(0)} level={-31} />
      <Sfx name="el-tap" at={twelveAt - 2} level={-29} />
      <Sfx name="el-whoosh" at={realFrom - 8} level={-35} />

      <Kicker at={from - 10}>Splitting is not enough</Kicker>
      <Headline lead="Split it" turn="on the spaces?" at={from - 6} turnAt={from + 4} out={realFrom - 10} />
      <Headline lead="A real problem," turn="not a one-liner." at={realFrom - 4} turnAt={linerAt - 6} />

      <Drift from={from} to={end} amount={0.012} origin="50% 55%">
        <FigLabel n="6" title="The lesson's sentence, two ways" at={from + 2} x={X0} y={y(FIG_Y)} />
        <CodeStrip line={`sentence = "${SPLIT.text}"`} x={X0} y={y(CODE_Y)} at={sentenceAt - 6} size={26} />
        {/* The highlighter follows the narrator reading the string aloud. */}
        <div
          style={{
            position: "absolute",
            left: X0 + 26 * 0.8 + STR_START * ADVANCE * 26 - 3,
            top: y(CODE_Y) + 12,
            height: 31,
            width: (SPLIT.text.length * ADVANCE * 26 + 6) * readP,
            // Yellow later marks the tokens the tokenizer fixed, so this one
            // lifts as soon as .split() starts cutting.
            opacity: 1 - ease(frame, cutsAt, 12),
            background: MARK,
            mixBlendMode: "multiply",
            borderRadius: 4,
          }}
        />

        {/* ── Row A: split() ── */}
        <Ink at={splitAt - 4} dur={14} style={{ left: X0, top: aTop + 8, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK, fontWeight: 600 }}>.split()</span>
        </Ink>
        <Count value={SPLIT.pieces.length} unit="pieces" at={eightAt - 2} x={1800} y={aTop + 6} align="right" />
        {COLS.map((c, i) => (
          <Chip
            key={i}
            text={c.piece}
            x={pieceX(i)}
            y={aTop}
            at={pieceAt(i)}
            size={SIZE}
            kind="piece"
            bad={i === P("can't") ? cantAt : undefined}
            dim={rowADim}
            badChars={
              i === butter
                ? { from: c.piece.length - 1, to: c.piece.length, at: commaAt }
                : i === P("Jones!")
                  ? { from: c.piece.length - 1, to: c.piece.length, at: commaAt + 6 }
                  : undefined
            }
          />
        ))}
        {/* "hiding its not" */}
        <Ink at={hidingAt} dur={12} out={tokFrom} style={{ left: pieceX(P("can't")), top: aTop + ch + 12, whiteSpace: "nowrap" }}>
          <span style={{ ...body(26, true), color: BAD_INK }}>the not is hidden</span>
        </Ink>
        {/* "a different word from plain butter" */}
        {aside > 0 ? (
          <div
            style={{
              position: "absolute",
              left: pieceX(butter) - 40,
              top: aTop + ch + 12,
              opacity: aside,
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              whiteSpace: "nowrap",
              fontFamily: MONO,
              fontSize: 24,
              color: INK,
            }}
          >
            <span>
              butter<span style={{ color: BAD_INK, fontWeight: 700 }}>,</span>
            </span>
            <span style={{ ...label(22, INK_SOFT) }}>and</span>
            <span>butter</span>
            <span style={{ ...body(26, true), color: BAD_INK }}>two different words</span>
          </div>
        ) : null}

        {/* ── Row B: word_tokenize() ── */}
        <Ink at={tokenizerAt - 4} dur={14} style={{ left: X0, top: bTop + 8, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: MONO, fontSize: 24, color: INK, fontWeight: 600 }}>word_tokenize()</span>
        </Ink>
        <Count value={SPLIT.tokens.length} unit="tokens" at={twelveAt - 2} x={1800} y={bTop + 6} align="right" />
        <Svg>
          {SPLIT.tokens.map((t, j) => {
            const i = SPLIT.tokenPiece[j];
            const x1 = pieceX(i) + COLS[i].pw / 2;
            const x2 = TOK_XS[j] + chipWidth(t, SIZE) / 2;
            const y1 = aTop + ch + 6;
            const y2 = bTop - 8;
            const p = linkP(j);
            if (p <= 0) return null;
            return (
              <line
                key={j}
                x1={x1}
                y1={y1}
                x2={x1 + (x2 - x1) * p}
                y2={y1 + (y2 - y1) * p}
                stroke={INK_SOFT}
                strokeWidth={1.6}
                opacity={0.6}
              />
            );
          })}
        </Svg>
        {SPLIT.tokens.map((t, j) => {
          const hl =
            j === T("n't") ? negationAt - 2 : j === T(",") ? punctAt : j === T("!") ? punctAt + 4 : j === T("Mr.") ? periodAt - 4 : undefined;
          const hl2 = j === T("ca") ? cutsTwoAt : undefined;
          // "What does an NLP system actually do?": a wave runs along the tokens.
          const lift = -10 * pulse(frame, actuallyAt + j * 3, 18);
          return (
            <div key={j} style={{ position: "absolute", inset: 0, transform: `translateY(${lift}px)` }}>
              <Chip text={t} x={TOK_XS[j]} y={bTop} at={tokAt(j)} size={SIZE} hl={hl ?? hl2} />
            </div>
          );
        })}
      </Drift>
    </AbsoluteFill>
  );
};
