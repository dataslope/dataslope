import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { HIGHLIGHT, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { DEFAULT_POS, DEFAULTS } from "./data";
import { Arrow, Chip, chipHeight, Fade, Headline, Kicker, rowLayout, Spot, Tag, X0 } from "./parts";

const SIZE = 32;
const ADV = 0.6 * SIZE;
const FIG_Y = 300;
const ROW_Y = 392;
const STEP = 136;
/** The call's text runs from X0; the arrow and the result sit past the
 *  longest call with its default argument shown. */
const GHOST = `, pos="${DEFAULT_POS}"`;
const CALL_W = Math.max(...DEFAULTS.map((d) => `lemmatize("${d.word}"${GHOST})`.length)) * ADV;
const ARROW_X = X0 + CALL_W + 26;
const RESULT_X = ARROW_X + 96;
const RIGHT_X = 1090;
const PHRASE = ["the", "running", "of", "the", "race"];

/**
 * One call in the code face: lemmatize("word"), its default argument
 * written into it on `ghostAt` (the closing parenthesis moves out to make
 * room), the quoted word highlighted over each of `wordMarks`, and the "n" over
 * `nMark`.
 */
const Call: React.FC<{
  word: string;
  at: number;
  y: number;
  ghostAt: number;
  wordMarks: readonly { at: number; out: number }[];
  nMark: { at: number; out: number };
}> = ({ word, at, y, ghostAt, wordMarks, nMark }) => {
  const frame = useCurrentFrame();
  const g = ease(frame, ghostAt, 16);
  const mark = (m: { at: number; out: number }) => ease(frame, m.at, 10) * (1 - ease(frame, m.out, 12));
  const wm = Math.max(0, ...wordMarks.map(mark));
  const nm = mark(nMark);
  const hl = (k: number): React.CSSProperties =>
    k > 0 ? { background: `color-mix(in srgb, ${HIGHLIGHT} ${(k * 100).toFixed(0)}%, transparent)`, borderRadius: 4 } : {};
  const ghost = GHOST.split(`"${DEFAULT_POS}"`);
  return (
    <Ink at={at} dur={16} style={{ left: X0, top: y, whiteSpace: "pre" }}>
      <div style={{ fontFamily: MONO, fontSize: SIZE, fontWeight: 500, lineHeight: 1.3, color: INK, fontVariantLigatures: "none", display: "flex" }}>
        <span>lemmatize(</span>
        <span style={hl(wm)}>&quot;{word}&quot;</span>
        <span
          style={{
            display: "inline-block",
            overflow: "hidden",
            width: GHOST.length * ADV * g,
            opacity: g,
            color: INK_SOFT,
          }}
        >
          {ghost[0]}
          <span style={hl(nm)}>&quot;{DEFAULT_POS}&quot;</span>
        </span>
        <span>)</span>
      </div>
    </Ink>
  );
};

/**
 * The question: the lesson's lemmatize() with no part of speech hands back
 * running, ran and wa. Its default argument is written into each call, the
 * word it was given is the only thing it sees, and running turns out to be
 * a noun already, "the running of the race".
 */
export const HookScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("hook").from;
  // The first call inks as the lemmatizer is named, its word lit as it is said.
  const callAt = [n.word("hook", "lemmatizer"), n.word("more", "Ran", { nth: 1 }), n.word("more", "was")];
  const askedAt = n.word("hook", "running", { nth: 1 });
  const resultAt = [n.word("hook", "running", { nth: 2 }), n.word("more", "ran", { nth: 2 }), n.word("more", "wa")];
  const otherwiseAt = n.word("noun", "otherwise");
  const treatsAt = n.word("noun", "treats");
  const nounAt = n.word("noun", "noun");
  const oneWordAt = n.word("alone", "one word");
  const sentenceAt = n.word("alone", "sentence");
  const nounAgainAt = n.word("race", "noun", { nth: 1 });
  const raceAt = n.word("race", "the running of the race");
  const raceRunningAt = n.word("race", "running", { nth: 2 });
  const dictionaryAt = n.word("race", "dictionary form");
  const lookupAt = n.word("lookup-in", "lookup");

  // ── Geometry ──
  const chipH = chipHeight(SIZE);
  const rowTop = (i: number) => y(ROW_Y + i * STEP);
  const callTop = (i: number) => rowTop(i) + (chipH - SIZE * 1.3) / 2;
  const phrase = rowLayout(PHRASE, RIGHT_X, SIZE);
  const phraseTop = y(ROW_Y);
  const ghostAt = DEFAULTS.map((_, i) => otherwiseAt + i * 5);
  const runningIdx = PHRASE.indexOf("running");

  return (
    <AbsoluteFill>
      {callAt.map((a, i) => (
        <Sfx key={`c${i}`} name="el-tap" at={a} level={-30} />
      ))}
      {resultAt.map((a, i) => (
        <Sfx key={`r${i}`} name="el-tap" at={a} level={-26} />
      ))}
      {ghostAt.map((a, i) => (
        <Sfx key={`g${i}`} name="el-pencil" at={a} level={-36} />
      ))}
      <Sfx name="el-pop" at={oneWordAt} level={-30} />
      <Sfx name="el-whoosh" at={raceAt - 4} level={-36} />
      <Sfx name="el-tap" at={dictionaryAt} level={-26} />

      <Kicker at={from - 6}>WordNet&apos;s lemmatizer</Kicker>
      <Headline lead="Running goes in," turn="running comes out." at={from - 4} turnAt={resultAt[0] - 2} out={treatsAt - 6} />
      <Headline lead="By default," turn="every word is a noun." at={treatsAt - 6} turnAt={nounAt - 4} />

      {/* Fig. 1: the lesson's three words with no part of speech. */}
      <FigLabel n="1" title="lemmatize() with no part of speech" at={from} x={X0} y={y(FIG_Y)} />
      {DEFAULTS.map((d, i) => {
        const top = rowTop(i);
        const mid = top + chipH / 2;
        return (
          <React.Fragment key={d.word}>
            <Call
              word={d.word}
              at={callAt[i]}
              y={callTop(i)}
              ghostAt={ghostAt[i]}
              wordMarks={[
                ...(i === 0 ? [{ at: askedAt, out: askedAt + 30 }] : []),
                { at: oneWordAt + i * 6, out: sentenceAt + 10 },
              ]}
              nMark={{ at: nounAt, out: oneWordAt - 4 }}
            />
            <Arrow from={[ARROW_X, mid]} to={[RESULT_X - 18, mid]} at={resultAt[i] - 6} dur={10} />
            <Chip
              text={d.lemma}
              x={RESULT_X}
              y={top}
              at={resultAt[i]}
              size={SIZE}
              marks={[{ at: resultAt[i], out: resultAt[i] + 26 }]}
              tones={d.word === "running" ? [{ at: dictionaryAt, tone: "good" }] : []}
            />
          </React.Fragment>
        );
      })}
      <Tag at={dictionaryAt + 4} x={RESULT_X} y={rowTop(0) + chipH + 12} color={INK} size={22}>
        already a dictionary form
      </Tag>

      {/* Fig. 2: running is a noun as well as a verb. */}
      <FigLabel n="2" title="Running, the noun" at={raceAt - 6} x={RIGHT_X} y={y(FIG_Y)} />
      {PHRASE.map((w, i) => (
        <Chip
          key={i}
          text={w}
          x={phrase[i].x}
          y={phraseTop}
          at={raceAt + i * 3}
          size={SIZE}
          marks={i === runningIdx ? [{ at: raceRunningAt, out: dictionaryAt + 30 }] : []}
          tones={i === runningIdx ? [{ at: dictionaryAt, tone: "good" }] : []}
        />
      ))}
      <Tag at={nounAgainAt} x={phrase[runningIdx].mid} y={phraseTop + chipH + 12} align="center" color={INK} size={22}>
        a noun
      </Tag>
      <Ink at={oneWordAt} dur={14} out={raceAt - 10} style={{ left: RIGHT_X, top: phraseTop + 6, whiteSpace: "nowrap" }}>
        <span style={label(26, INK_SOFT)}>
          one word at a time, <Fade at={sentenceAt - 2}>never the sentence</Fade>
        </span>
      </Ink>

      <Spot
        id="nlp-lemmas-and-tags-magnifier"
        at={oneWordAt}
        dim={lookupAt}
        left={1250}
        top={y(530)}
        width={420}
        height={346}
      />
    </AbsoluteFill>
  );
};
