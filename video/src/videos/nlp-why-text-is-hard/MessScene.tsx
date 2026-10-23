import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, HAIRLINE, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BAD_INK, FIG_Y, Headline, Kicker, Mark, TOKEN_INK, X0 } from "./parts";

const ROW_Y = [334, 438, 542, 646, 750];
const EX_X = 480;
const TAG_X = 1800;

/** A small soft gloss after a word: "Apple, the company". */
const Gloss: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ ...body(28, true), color: INK_SOFT }}>{children}</span>
);
/** A period, a comma or an apostrophe that carries the trouble, in red. */
const Red: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: BAD_INK, fontWeight: 700 }}>{children}</span>;

/**
 * Part 1, the plainer mess: the lesson's five kinds, one row each, each
 * example inked on its words, and then the later step each one is the reason
 * for, at the right, inked as the narration reads it. Casing is the lesson's
 * "a word capitalized only because it starts a sentence", which lowercasing
 * fixes (its other example, Apple against apple, is one lowercasing breaks).
 */
export const MessScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("contractions").from;
  const hideAt = n.word("contractions", "hide");
  const dontAt = n.word("contractions", "Don't");
  const doAt = n.word("contractions", "do");
  const notAt = n.word("contractions", "not");
  const periodAt = n.word("period", "period");
  const endsAt = n.word("period", "ends");
  const doctorAt = n.word("period", "Doctor");
  const decimalAt = n.word("period", "decimal");
  const capitalAt = n.word("casing", "capital letter");
  const sentenceAt = n.word("casing", "sentence");
  const sameAt = n.word("casing", "new word");
  const formsAt = [n.word("forms", "Run"), n.word("forms", "runs"), n.word("forms", "running"), n.word("forms", "ran")];
  const ideaAt = n.word("forms", "one idea");
  const yorkAt = n.word("units", "New York");
  const placeAt = n.word("units", "one place");
  const twoAt = n.word("units", "two words");
  const splitAt = n.word("split-in", "split");

  const row = (i: number) => y(ROW_Y[i]);
  // Each tag inks as the narration reads it out.
  const tokenizeAt = n.word("reasons", "tokenize");
  const TAG_AT = [
    tokenizeAt - 4,
    tokenizeAt + 4,
    n.word("reasons", "lowercase") - 4,
    n.word("roots", "stem or lemmatize") - 4,
    n.word("roots", "n-grams") - 4,
  ];
  const tagAt = (i: number) => TAG_AT[i];
  // As the narration turns to splitting, the rows it is not about step back.
  const back = ease(frame, splitAt - 2, 18);
  const TAGS = ["tokenize", "tokenize", "lowercase", "stem or lemmatize", "n-grams"];
  const NAMES = [
    { name: "Contractions", at: from - 2 },
    { name: "Punctuation", at: periodAt - 4 },
    { name: "Casing", at: capitalAt - 4 },
    { name: "Word forms", at: formsAt[0] - 4 },
    { name: "Multi-word units", at: yorkAt - 4 },
  ];
  const ex = (i: number): React.CSSProperties => ({ left: EX_X, top: row(i) - 8, whiteSpace: "nowrap" });
  const underline = ease(frame, placeAt - 2, 14);

  return (
    <AbsoluteFill>
      {/* ── Sound ── */}
      {NAMES.map((r) => (
        <Sfx key={r.name} name="el-tap" at={r.at + 2} level={-31} />
      ))}
      <Sfx name="el-pencil" at={ideaAt} level={-35} />
      <Sfx name="el-pencil" at={placeAt - 2} level={-35} />
      {TAGS.map((t, i) => (
        <Sfx key={i} name="el-tap" at={tagAt(i) + 2} level={-33} />
      ))}

      <Kicker at={from - 10}>Text is messy</Kicker>
      <Headline lead="Real text is" turn="messy, too." at={from - 6} turnAt={hideAt - 4} size={68} />
      <FigLabel n="5" title="Five kinds of mess, and the step each one needs" at={from - 2} x={X0} y={y(FIG_Y)} />

      {ROW_Y.map((r, i) => (
        <div
          key={r}
          style={{
            position: "absolute",
            left: X0,
            top: y(r) - 24,
            width: 1680 * ease(frame, NAMES[i].at - 4, 14),
            height: 1,
            background: HAIRLINE,
            opacity: 0.45,
          }}
        />
      ))}
      {NAMES.map((r, i) => (
        <Ink key={r.name} at={r.at} dur={14} style={{ left: X0, top: row(i) + 4, whiteSpace: "nowrap" }}>
          <span style={{ ...label(28, INK), fontWeight: 700 }}>{r.name}</span>
        </Ink>
      ))}

      {/* 1. Contractions */}
      <div style={{ position: "absolute", ...ex(0), display: "flex", alignItems: "baseline", gap: 18, ...body(42), color: INK }}>
        <Ink at={dontAt - 4} dur={12} style={{ position: "relative" }}>
          <span>
            don<Red>'</Red>t
          </span>
        </Ink>
        <Ink at={doAt - 4} dur={10} style={{ position: "relative" }}>
          <span style={{ color: INK_SOFT }}>=</span>
        </Ink>
        <Ink at={doAt - 2} dur={12} style={{ position: "relative" }}>
          <span>do</span>
        </Ink>
        <Ink at={notAt - 4} dur={10} style={{ position: "relative" }}>
          <span style={{ color: INK_SOFT }}>+</span>
        </Ink>
        <Ink at={notAt - 2} dur={12} style={{ position: "relative" }}>
          <Mark at={notAt + 4}>not</Mark>
        </Ink>
      </div>

      {/* 2. Punctuation: one mark, three jobs */}
      <div style={{ position: "absolute", ...ex(1), display: "flex", alignItems: "baseline", gap: 64, ...body(42), color: INK }}>
        <Ink at={endsAt - 2} dur={12} style={{ position: "relative" }}>
          <span>
            the end<Red>.</Red>
          </span>
        </Ink>
        <Ink at={doctorAt - 2} dur={12} style={{ position: "relative" }}>
          <span>
            Dr<Red>.</Red>
          </span>
        </Ink>
        <Ink at={decimalAt - 2} dur={12} style={{ position: "relative" }}>
          <span>
            2<Red>.</Red>5
          </span>
        </Ink>
      </div>

      {/* 3. Casing */}
      <div style={{ position: "absolute", ...ex(2), display: "flex", alignItems: "baseline", gap: 44, ...body(42), color: INK }}>
        <Ink at={capitalAt - 2} dur={14} style={{ position: "relative" }}>
          <span>
            <Red>T</Red>he cat
          </span>
        </Ink>
        <Ink at={sentenceAt - 2} dur={14} style={{ position: "relative" }}>
          <span>the cat</span>
        </Ink>
        <Ink at={sameAt - 4} dur={14} style={{ position: "relative" }}>
          <Gloss>the same word</Gloss>
        </Ink>
      </div>

      {/* 4. Word forms */}
      <div style={{ position: "absolute", ...ex(3), display: "flex", alignItems: "baseline", gap: 30, ...body(42), color: INK }}>
        {["run", "runs", "running", "ran"].map((w, i) => (
          <Ink key={w} at={formsAt[i] - 2} dur={10} style={{ position: "relative" }}>
            <span>{w}</span>
          </Ink>
        ))}
        <Ink at={ideaAt - 2} dur={14} style={{ position: "relative" }}>
          <Gloss>one idea</Gloss>
        </Ink>
      </div>

      {/* 5. Multi-word units */}
      <div style={{ position: "absolute", ...ex(4), display: "flex", alignItems: "baseline", gap: 30, ...body(42), color: INK }}>
        <Ink at={yorkAt - 2} dur={14} style={{ position: "relative" }}>
          <span style={{ position: "relative", display: "inline-block" }}>
            New York
            <span
              style={{
                position: "absolute",
                left: 0,
                bottom: -6,
                width: `${underline * 100}%`,
                height: 3,
                background: INK,
                borderRadius: 2,
              }}
            />
          </span>
        </Ink>
        <Ink at={placeAt - 2} dur={14} style={{ position: "relative" }}>
          <Gloss>one place</Gloss>
        </Ink>
        <Ink at={twoAt - 2} dur={14} style={{ position: "relative" }}>
          <Gloss>in two words</Gloss>
        </Ink>
      </div>

      {/* The step each one is the reason for. */}
      {TAGS.map((t, i) => (
        <Ink key={i} at={tagAt(i)} dur={14} style={{ right: 1920 - TAG_X, top: row(i) + 2, whiteSpace: "nowrap" }}>
          <span style={{ ...label(28, TOKEN_INK), fontWeight: 650 }}>
            {i < 2 ? <Mark at={splitAt + i * 3}>{t}</Mark> : t}
          </span>
        </Ink>
      ))}
      <div
        style={{
          position: "absolute",
          left: X0 - 10,
          top: row(2) - 30,
          width: 1720,
          height: row(4) - row(2) + 96,
          background: PAPER,
          opacity: 0.6 * back,
        }}
      />
    </AbsoluteFill>
  );
};
