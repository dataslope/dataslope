import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, INK, INK_SOFT, note } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { ART, HOOK } from "./data";
import { BAD, BAD_INK, Chip, chipWidth, Count, Drift, FIG_Y, Headline, Kicker, Mark, pulse, Spot, X0 } from "./parts";

/** One character cell of the flat string, in px. */
const CELL = 26;
const STRIP_X = Math.round((1920 - HOOK.chars * CELL) / 2);
const CHIP_SIZE = 24;

/** Where each token's characters sit in the string. */
const SPANS = (() => {
  const out: { start: number; end: number }[] = [];
  let at = 0;
  for (const t of HOOK.tokens) {
    const start = HOOK.text.indexOf(t, at);
    out.push({ start, end: start + t.length });
    at = start + t.length;
  }
  return out;
})();
/** The three characters the questions are about: the apostrophe in "can't",
 *  the period after "Dr" and the dollar sign. */
const ASKED = [HOOK.text.indexOf("'"), HOOK.text.indexOf("Dr.") + 2, HOOK.text.indexOf("$")];

/** A word in the sentence the narration asks about: highlighted on `at`,
 *  with its question hung under it on a short leader. */
const Asked: React.FC<{ at: number; question: string; children: React.ReactNode }> = ({ at, question, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at + 4, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <Mark at={at}>{children}</Mark>
      {/* The leader drops from the word's middle; the question starts under
          the word's left edge, so neighbouring questions never meet. */}
      <span
        style={{
          position: "absolute",
          left: 0,
          top: "100%",
          width: "100%",
          height: 0,
          transform: `translateY(${(1 - p) * -6}px)`,
          opacity: p,
          pointerEvents: "none",
        }}
      >
        <span style={{ position: "absolute", left: "calc(50% - 1px)", top: 4, width: 2, height: 22 * p, background: INK_SOFT }} />
        <span style={{ position: "absolute", left: 2, top: 32, ...note(24, INK), fontStyle: "italic", whiteSpace: "nowrap" }}>{question}</span>
      </span>
    </span>
  );
};

/**
 * Part 1 opens: how many words is the lesson's opening sentence? Fig. 1 asks
 * its three questions under the words they are about, Fig. 2 is the same
 * sentence as a computer gets it (62 characters, one cell each), and Fig. 3
 * is what NLP makes of it: word_tokenize's 16 tokens, each set under the
 * characters it came from, the spaces gone. The narration then reads Fig. 3
 * as the answer to the opening question, marking the tokens each clause is
 * about (can't in two, Dr. whole, the dollar sign alone).
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  // ── Cues ──
  const hookFrom = n.beat("hook").from;
  const sentenceAt = n.word("hook", "sentence");
  const howAt = n.word("hook", "How many");
  const qAt = [n.word("questions", "can't"), n.word("questions", "period"), n.word("questions", "dollar")];
  const stringAt = n.word("human", "flat string");
  const charsAt = n.word("human", "sixty-two");
  const startsAt = n.word("implied", "word starts");
  const endsAt = n.word("implied", "sentence ends");
  const meansAt = n.word("implied", "means");
  const nlpFrom = n.beat("nlp").from;
  const turnsAt = n.word("nlp", "turns");
  const structureAt = n.word("nlp", "structure", { nth: 1 });
  const sixteenAt = n.word("sixteen", "sixteen");
  // The answer, read off Fig. 3: which tokens each clause is about.
  const answerAt: Record<string, number> = {
    ca: n.word("sixteen", "can't"),
    "n't": n.word("sixteen", "can't") + 4,
    "Dr.": n.word("sixteen", "Doctor"),
    $: n.word("sixteen", "dollar sign"),
  };
  const hardAt = n.word("ambig-in", "hard");
  const end = n.beat("ambiguity").from;

  // ── Geometry (layout units, through y()) ──
  const SENT_Y = 300;
  const STRIP_LABEL_Y = 520;
  const STRIP_Y = 566;
  const TOK_LABEL_Y = 700;
  const TOK_Y = 746;
  const cellH = h(48);
  const stripTop = y(STRIP_Y);
  const cellsIn = (i: number) => stringAt - 2 + i * 0.55;
  const askedAt = [startsAt, endsAt, meansAt];
  const chipAt = (i: number) => structureAt - 2 + i * 1.6;
  const rise = 170 * (1 - ease(frame, stringAt - 16, 22));

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      <Sfx name="el-pencil" at={sentenceAt - 6} level={-35} />
      {qAt.map((t) => (
        <Sfx key={t} name="el-tap" at={t + 2} level={-31} />
      ))}
      <Sfx name="el-pop" at={stringAt - 4} level={-31} />
      <Sfx name="el-sprinkle" at={cellsIn(0)} level={-32} />
      <Sfx name="el-tap" at={charsAt - 2} level={-29} />
      {askedAt.map((t) => (
        <Sfx key={t} name="el-tap" at={t} level={-32} />
      ))}
      <Sfx name="el-whoosh" at={nlpFrom - 6} level={-35} />
      <Sfx name="el-sprinkle" at={chipAt(0)} level={-31} />
      <Sfx name="el-tap" at={sixteenAt - 2} level={-29} />

      <Kicker at={hookFrom - 10}>Text is unstructured</Kicker>
      <Headline lead="How many words" turn="are in this sentence?" at={hookFrom - 6} turnAt={howAt + 6} out={nlpFrom - 10} />
      {/* The definition gets a headline of its own while it is spoken. */}
      <Headline lead="Natural language processing" at={nlpFrom - 4} out={turnsAt - 10} />
      <Headline lead="NLP turns text" turn="into structure." at={turnsAt - 4} turnAt={structureAt - 4} />

      {/* The string, a ribbon: it arrives with "flat string". */}
      <Spot id={ART.ribbon} at={stringAt - 4} left={1470} top={y(92)} width={330} height={213} />

      <Drift from={hookFrom} to={end} amount={0.012} origin="50% 40%">
        {/* ── Fig. 1: the sentence and its questions. It holds the middle of
            the page alone, then rises to make room for Fig. 2. ── */}
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${rise}px)` }}>
          <FigLabel n="1" title="The lesson's opening sentence" at={sentenceAt - 8} x={X0} y={y(FIG_Y)} />
          <Ink at={sentenceAt - 4} dur={22} style={{ left: X0, top: y(SENT_Y), whiteSpace: "nowrap" }}>
            <span style={{ ...body(50), color: INK }}>
              I <Asked at={qAt[0]} question="one word, or two?">can't</Asked> believe{" "}
              <Asked at={qAt[1]} question="the end of a sentence?">Dr.</Asked> Smith's startup raised{" "}
              <Asked at={qAt[2]} question="a word?">$2.5M,</Asked> it's unreal!
            </span>
          </Ink>
        </div>

        {/* ── Fig. 2: the same sentence as a computer gets it ── */}
        <FigLabel n="2" title="What a computer gets" at={stringAt - 6} x={X0} y={y(STRIP_LABEL_Y)} />
        <Count value={HOOK.chars} unit="characters" at={charsAt - 2} x={1920 - X0} y={y(STRIP_LABEL_Y) - 2} align="right" size={26} />
        {Array.from(HOOK.text).map((ch, i) => {
          const p = ease(frame, cellsIn(i), 8);
          if (p <= 0) return null;
          const k = ASKED.indexOf(i);
          const flare = k < 0 ? 0 : ease(frame, askedAt[k], 10);
          const swell = k < 0 ? 0 : pulse(frame, askedAt[k], 22);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: STRIP_X + i * CELL,
                top: stripTop,
                width: CELL,
                height: cellH,
                boxSizing: "border-box",
                border: `1px solid color-mix(in srgb, ${flare > 0 ? BAD : INK_SOFT} ${Math.round(45 + flare * 55)}%, transparent)`,
                marginLeft: i === 0 ? 0 : -1,
                background: flare > 0 ? `color-mix(in srgb, ${BAD} ${Math.round(flare * 14)}%, transparent)` : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 24,
                color: INK,
                opacity: p,
                transform: `translateY(${(1 - p) * 8 - swell * 6}px)`,
              }}
            >
              {ch === " " ? "" : ch}
            </div>
          );
        })}
        {/* A question mark over each character the questions were about. */}
        {ASKED.map((ci, k) => (
          <Ink
            key={ci}
            at={askedAt[k]}
            dur={10}
            out={structureAt - 10}
            style={{ left: STRIP_X + ci * CELL - 7, top: stripTop + cellH + 2, width: 40, textAlign: "center" }}
          >
            <span style={{ ...note(28, BAD_INK), fontWeight: 700 }}>?</span>
          </Ink>
        ))}

        {/* ── Fig. 3: what NLP makes of it ── */}
        <FigLabel n="3" title="Structure a program can compute with" at={structureAt - 8} x={X0} y={y(TOK_LABEL_Y)} />
        <Count value={HOOK.tokens.length} unit="tokens" at={sixteenAt - 2} x={1920 - X0} y={y(TOK_LABEL_Y) - 2} align="right" size={26} />
        {HOOK.tokens.map((t, i) => {
          const { start, end: stop } = SPANS[i];
          const mid = STRIP_X + ((start + stop) / 2) * CELL;
          const w = chipWidth(t, CHIP_SIZE);
          return <Chip key={i} text={t} x={mid - w / 2} y={y(TOK_Y)} at={chipAt(i)} size={CHIP_SIZE} hl={answerAt[t]} />;
        })}
        {/* Under the strip, a faint tick from each token's characters. */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: ease(frame, structureAt, 14) * (1 - ease(frame, hardAt, 20)) * 0.5 }}>
          {SPANS.map(({ start, end: stop }, i) => (
            <line
              key={i}
              x1={STRIP_X + start * CELL + 3}
              x2={STRIP_X + stop * CELL - 3}
              y1={stripTop + cellH + 8}
              y2={stripTop + cellH + 8}
              stroke={INK}
              strokeWidth={2}
            />
          ))}
        </svg>
      </Drift>
    </AbsoluteFill>
  );
};
