import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ENCODING, RS, SPACED, STRAWBERRY, VOCAB_ROWS } from "./data";
import { ChipFace, Drift, FIG_Y, FOCUS, FOCUS_INK, Headline, Kicker, lerp, Mark, pulse, Spot, X0 } from "./parts";

/** Fig. 4, the vocabulary: id and piece, one row each. */
const VOC = { x: X0, idW: 150, y0: 400, step: 66 };
/** Fig. 5: the word, its three pieces, then the word with its space. */
const WORD = { x: 720, y: 400, size: 30 };
const SPACED_Y = 612;
const LETTERS_Y = 748;

/**
 * What a token is: a piece of text the vocabulary gives one id. Five rows of
 * o200k_base's vocabulary, then strawberry as it cuts it, three pieces and
 * three ids; with its leading space, one id. Counting its R's means knowing
 * the spelling, because the letters never arrive.
 */
export const StrawScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const tokenFrom = n.beat("token").from;
  const chunkAt = n.word("token", "chunk");
  const vocabAt = n.word("token", "vocabulary");
  const numberAt = n.word("token", "number");
  const idAt = n.word("token", "id");
  const wholeAt = n.word("token", "whole word");
  const pieceAt = n.word("token", "piece");
  const takeAt = n.word("straw", "Take");
  const cutsAt = n.word("straw", "cuts");
  const pieceSaid = [n.word("straw", "ess-tee"), n.word("straw", "raw"), n.word("straw", "berry")];
  const threeIdsAt = n.word("ids", "three ids");
  const idSaid = [n.word("ids", "three oh two"), n.word("ids", "sixteen eighteen"), n.word("ids", "nineteen")];
  const spaceAt = n.word("space", "space");
  const sentenceAt = n.word("space", "sentence");
  const oneIdAt = n.word("space", "one id");
  const rsAt = n.word("letters", "R's");
  const neverAt = n.word("letters", "never saw");
  const recallAt = n.word("letters", "recall");
  const spellingAt = n.word("letters", "spelling");
  const lookingAt = n.word("letters", "looking");
  const end = n.beat("rate").from;

  const rowY = (i: number) => y(VOC.y0) + i * h(VOC.step);
  // Each vocabulary row lights when its piece, or its id, is named.
  const rowGlow = (i: number) => {
    const r = VOCAB_ROWS[i];
    const k = STRAWBERRY.findIndex((p) => p.id === r.id);
    let g = 0;
    if (k >= 0) g += pulse(frame, pieceSaid[k] - 2, 20) + pulse(frame, idSaid[k] - 2, 22);
    if (r.id === SPACED.id) g += pulse(frame, oneIdAt - 2, 26);
    g += pulse(frame, (r.kind === "word" ? wholeAt : pieceAt) - 2, 22);
    return Math.min(1, g);
  };

  // The word splits into its three pieces on "cuts".
  const split = ease(frame, cutsAt - 2, 18);
  const pieceW = STRAWBERRY.map((p) => p.text.length * 0.6 * WORD.size + 2 * Math.round(WORD.size * 0.4) + 4);
  const joinedX = (k: number) => WORD.x + STRAWBERRY.slice(0, k).reduce((s, p) => s + p.text.length * 0.6 * WORD.size, 0);
  const splitX = (k: number) => WORD.x + pieceW.slice(0, k).reduce((s, w) => s + w + 22, 0);

  const letters = "strawberry".split("");
  const lettersIn = ease(frame, rsAt - 4, 14);
  const lettersFade = ease(frame, neverAt, 16);

  return (
    <AbsoluteFill>
      {/* ── Sound: the vocabulary rows, the cut, each id, the one id, the letters ── */}
      {VOCAB_ROWS.map((_, i) => (
        <Sfx key={i} name="el-tap" at={vocabAt + i * 4} level={-30} />
      ))}
      <Sfx name="el-pop" at={takeAt} level={-30} />
      <Sfx name="el-scratch" at={cutsAt - 2} level={-33} />
      {idSaid.map((t, k) => (
        <Sfx key={k} name="el-tap" at={t} level={-25} />
      ))}
      <Sfx name="el-tap" at={oneIdAt} level={-24} />
      <Sfx name="el-pencil" at={rsAt - 4} level={-35} />

      <Kicker at={tokenFrom - 10}>Tokens</Kicker>
      <Headline lead="A chunk of text," turn="and its id." at={tokenFrom - 6} turnAt={idAt - 4} />

      <Drift from={tokenFrom} to={end} amount={0.012} origin="45% 55%">
        {/* Fig. 4: a few rows of the vocabulary. */}
        <FigLabel n="4" title={`Five entries of ${ENCODING}`} at={chunkAt - 4} x={X0} y={y(FIG_Y)} />
        <div style={{ position: "absolute", left: VOC.x, top: rowY(0) - 44, display: "flex", opacity: ease(frame, vocabAt - 4, 12) }}>
          <span style={{ ...label(21, INK_SOFT), width: VOC.idW }}>id</span>
          <span style={label(21, INK_SOFT)}>token</span>
        </div>
        {VOCAB_ROWS.map((r, i) => {
          const p = ease(frame, vocabAt + i * 4, 12);
          const g = rowGlow(i);
          const idP = ease(frame, numberAt - 2 + i * 3, 10);
          return (
            <div
              key={r.id}
              style={{ position: "absolute", left: VOC.x, top: rowY(i), display: "flex", alignItems: "center", opacity: p }}
            >
              <span
                style={{
                  width: VOC.idW,
                  fontFamily: MONO,
                  fontSize: 26,
                  fontWeight: 600,
                  color: g > 0.3 ? FOCUS_INK : INK,
                  opacity: idP,
                  ...TABULAR,
                }}
              >
                {r.id}
              </span>
              <ChipFace text={r.text} size={26} focus={g} />
              <span
                style={{
                  ...note(21, INK_SOFT),
                  marginLeft: 16,
                  opacity: ease(frame, (r.kind === "word" ? wholeAt : pieceAt) - 2, 12),
                  whiteSpace: "nowrap",
                }}
              >
                {r.kind === "word" ? "a whole word" : "a piece"}
              </span>
            </div>
          );
        })}
        <Note at={wholeAt} x={VOC.x} y={rowY(VOCAB_ROWS.length) + 4}>
          <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontWeight: 700 }}>·</span> marks a leading space
          </span>
        </Note>

        {/* Fig. 5: strawberry, as the tokenizer cuts it. */}
        <FigLabel n="5" title="strawberry, cut by the tokenizer" at={takeAt - 4} x={WORD.x} y={y(FIG_Y)} />
        {STRAWBERRY.map((p, k) => {
          const x = lerp(joinedX(k), splitX(k), split);
          const shown = ease(frame, takeAt, 12);
          const glow =
            pulse(frame, pieceSaid[k] - 2, 22) + pulse(frame, idSaid[k] - 2, 22) + pulse(frame, lookingAt + k * 5, 18);
          const idP = ease(frame, idSaid[k] - 2, 10);
          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: x,
                top: y(WORD.y),
                opacity: shown,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              {split < 0.5 ? (
                <span style={{ fontFamily: MONO, fontSize: WORD.size * 1.15, fontWeight: 600, color: INK, lineHeight: 1.6 }}>
                  {p.text}
                </span>
              ) : (
                <ChipFace text={p.text} size={WORD.size} focus={Math.min(1, glow)} />
              )}
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 26,
                  fontWeight: 600,
                  color: INK_SOFT,
                  opacity: idP,
                  transform: `translateY(${(1 - idP) * -6}px)`,
                  ...TABULAR,
                }}
              >
                {p.id}
              </span>
            </div>
          );
        })}
        <Note at={threeIdsAt - 2} x={WORD.x} y={y(WORD.y) + h(110)}>
          <span style={{ ...note(22, INK_SOFT), whiteSpace: "nowrap" }}>what the model gets: three ids</span>
        </Note>

        {/* With its leading space, as it sits in a sentence: one token. */}
        <Note at={spaceAt - 2} x={WORD.x} y={y(SPACED_Y) - 44}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>with the space it has inside a sentence</span>
        </Note>
        <div
          style={{
            position: "absolute",
            left: WORD.x,
            top: y(SPACED_Y),
            opacity: ease(frame, sentenceAt, 12),
            display: "flex",
            alignItems: "center",
            gap: 26,
          }}
        >
          <ChipFace text={SPACED.text} size={WORD.size} focus={pulse(frame, oneIdAt - 2, 26)} />
          <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: INK_SOFT, opacity: ease(frame, oneIdAt - 2, 10), ...TABULAR }}>
            {SPACED.id}
          </span>
          <span style={{ ...note(22, INK_SOFT), opacity: ease(frame, oneIdAt + 4, 10), whiteSpace: "nowrap" }}>one id</span>
        </div>

        {/* The question it cannot answer by looking. */}
        <div
          style={{
            position: "absolute",
            left: WORD.x,
            top: y(LETTERS_Y),
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            opacity: lettersIn * (1 - 0.7 * lettersFade),
          }}
        >
          {letters.map((c, i) => {
            const isR = c === "r";
            const order = letters.slice(0, i).filter((l) => l === "r").length;
            const r = isR ? ease(frame, rsAt + 6 + order * 5, 8) : 0;
            return (
              <span
                key={i}
                style={{
                  width: 40,
                  textAlign: "center",
                  fontFamily: MONO,
                  fontSize: 38,
                  fontWeight: 600,
                  color: r > 0.5 ? FOCUS_INK : INK,
                  borderBottom: isR ? `3px solid color-mix(in srgb, ${FOCUS} ${Math.round(r * 100)}%, transparent)` : "3px solid transparent",
                }}
              >
                {c}
              </span>
            );
          })}
          <span style={{ ...note(26, FOCUS_INK), marginLeft: 22, fontWeight: 650, opacity: ease(frame, rsAt + 18, 10), ...TABULAR }}>
            {RS} R&apos;s
          </span>
        </div>
        <Note at={neverAt + 2} x={WORD.x} y={y(LETTERS_Y) + h(60)}>
          <div style={{ ...body(30), color: INK, whiteSpace: "nowrap" }}>
            The letters never arrive: only <Mark at={recallAt}>{STRAWBERRY.map((p) => p.id).join(", ")}</Mark>
          </div>
          <div style={{ ...note(22, INK_SOFT), marginTop: 8, whiteSpace: "nowrap", opacity: ease(frame, spellingAt, 12) }}>
            so it has to recall facts about the spelling, not look
          </div>
        </Note>
      </Drift>

      {/* The strawberry, in three pieces. */}
      <Spot id="llm-tokens-strawberry" at={takeAt - 2} left={1350} top={y(430)} width={450} height={300} />
    </AbsoluteFill>
  );
};
