import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { label, note, TABULAR } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { NAIVE, NEGATIVE, POSITIVE, signed, type Trace } from "./data";
import { Chip, FIG_Y, Headline, INK, INK_SOFT, Kicker, LOST_INK, Mark, NEG, NEG_INK, POS, POS_INK, Strike, TokenCol, TokenRow, X0 } from "./parts";

/** Fig. 14: the lexicon, two columns of chips. */
const LEX_X = [X0, 370];
const LEX_HEAD_Y = 340;
const LEX_Y0 = 392;
const LEX_STEP = 54;
/** Fig. 15: the three reviews, one row each. */
const FIG15_X = 690;
const REVIEW_Y = [392, 530, 668];
const SUM_X = 1170;
const VERDICT_X = 1290;
const CHIP = 28;
const BLIND_Y = 812;

const inkFor = (label: string) => (label === "positive" ? POS_INK : label === "negative" ? NEG_INK : INK_SOFT);

/**
 * Part 4 opens: the lesson's lexicon, seven positive words and seven
 * negative, and its naive counter on its three reviews. "It is not good"
 * comes out positive: the counter sees "good" and never reads the "not".
 */
export const LexiconScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const start = n.beat("lexicon").from;
  const listsAt = n.word("lexicon", "two word lists");
  const posAt = n.word("lexicon", "seven positive");
  const negAt = n.word("lexicon", "seven negative");
  const addAt = n.word("score", "Add one");
  const takeAt = n.word("score", "take one away");
  const signAt = n.word("score", "read the sign");
  const rowAt = [n.word("naive", "I love this movie"), n.word("naive", "This film is terrible"), n.word("naive", "It is not good")];
  const verdictAt = [n.word("naive", "positive", { nth: 1 }), n.word("naive", "negative"), n.word("naive", "positive", { nth: 2 })];
  const seesAt = n.word("wrong", "sees good");
  const neverAt = n.word("wrong", "never reads the not");
  const countingAt = n.word("blind", "Counting words");
  const orderAt = n.word("blind", "blind to order");

  const lists = [
    { title: "Positive", words: POSITIVE, color: POS, ink: POS_INK, at: posAt, sign: "+1", signAt: addAt },
    { title: "Negative", words: NEGATIVE, color: NEG, ink: NEG_INK, at: negAt, sign: "−1", signAt: takeAt },
  ];
  const aside = ease(frame, rowAt[0] - 18, 22);
  const wrongIdx = NAIVE.findIndex((r) => r.steps.some((s) => s.token === "not"));
  const wrongMark = ease(frame, neverAt + 6, 12);

  return (
    <AbsoluteFill>
      {/* ── Sound: the two lists, each review, each verdict, the strike ── */}
      <Sfx name="el-sprinkle" at={posAt} level={-34} />
      <Sfx name="el-sprinkle" at={negAt} level={-34} />
      {rowAt.map((t, i) => (
        <Sfx key={i} name="el-pencil" at={t - 4} level={-37} />
      ))}
      {verdictAt.map((t, i) => (
        <Sfx key={i} name="el-tap" at={t - 2} level={-28} />
      ))}
      <Sfx name="el-scratch" at={neverAt + 6} level={-32} />

      <Kicker at={start - 10}>Rule-based sentiment</Kicker>
      <Headline at={start - 4} second={start + 10} out={verdictAt[2] - 6} italic={
          <>
            and the <Mark at={signAt - 2}>sign</Mark> of their sum.
          </>
        }
      >
        Two word lists,
      </Headline>
      <Headline at={seesAt - 2} second={neverAt - 2} italic="never the not.">
        It sees good,
      </Headline>

      {/* ── Fig. 14: the lexicon. It is the whole page until the reviews arrive, then steps aside. ── */}
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${560 * (1 - aside)}px) scale(${1 + 0.22 * (1 - aside)})`, transformOrigin: `${X0}px ${y(FIG_Y)}px` }}>
      <FigLabel n="14" title="The lesson’s lexicon" at={listsAt - 4} x={X0} y={y(FIG_Y)} />
      {lists.map((l, c) => (
        <React.Fragment key={l.title}>
          <Ink at={l.at - 4} dur={12} style={{ left: LEX_X[c], top: y(LEX_HEAD_Y), display: "flex", gap: 12, alignItems: "baseline", whiteSpace: "nowrap" }}>
            <span style={label(24, l.ink)}>{l.title}</span>
            <SignBadge at={l.signAt - 2} color={l.ink}>
              {l.sign}
            </SignBadge>
          </Ink>
          {l.words.map((w, k) => (
            <div key={w} style={{ position: "absolute", left: LEX_X[c], top: y(LEX_Y0 + k * LEX_STEP) }}>
              <Chip text={w} size={24} at={l.at + k * 1.5} tone={l.color} bump={l.signAt - 2 + k * 2} />
            </div>
          ))}
        </React.Fragment>
      ))}

      </div>

      {/* ── Fig. 15: the naive counter ── */}
      <FigLabel n="15" title="The naive counter, on the lesson’s three reviews" at={rowAt[0] - 8} x={FIG15_X} y={y(FIG_Y)} />
      <Note at={rowAt[0] - 4} x={SUM_X} y={y(LEX_HEAD_Y)}>
        <span style={label(21, INK_SOFT)}>sum</span>
      </Note>
      <Note at={rowAt[0] - 4} x={VERDICT_X} y={y(LEX_HEAD_Y)}>
        <span style={label(21, INK_SOFT)}>verdict</span>
      </Note>
      {NAIVE.map((r, i) => (
        <ReviewRow
          key={r.text}
          trace={r}
          top={y(REVIEW_Y[i])}
          at={rowAt[i]}
          verdictAt={verdictAt[i]}
          markAt={i === wrongIdx ? seesAt - 2 : undefined}
          notAt={i === wrongIdx ? neverAt : undefined}
          struck={i === wrongIdx ? neverAt + 6 : undefined}
        />
      ))}
      <Note at={neverAt + 8} x={VERDICT_X} y={y(REVIEW_Y[wrongIdx]) + 52}>
        <span style={{ ...note(22, LOST_INK), fontWeight: 650, whiteSpace: "nowrap", opacity: wrongMark }}>wrong</span>
      </Note>

      <Note at={countingAt - 2} x={FIG15_X} y={y(BLIND_Y)}>
        <span style={{ ...note(25, INK), whiteSpace: "nowrap" }}>
          One word at a time is a bag of words: <span style={{ opacity: ease(frame, orderAt - 2, 10) }}>blind to order.</span>
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** "+1" or "−1" in a small round badge, inked on `at`. */
const SignBadge: React.FC<{ at: number; color: string; children: React.ReactNode }> = ({ at, color, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  return (
    <span style={{ ...note(22, color), ...TABULAR, fontWeight: 700, opacity: p, transform: `translateY(${(1 - p) * 6}px)`, display: "inline-block" }}>
      {children}
    </span>
  );
};

/** One review: its tokens as chips, a badge under each lexicon word, the sum
 *  and the verdict. */
const ReviewRow: React.FC<{
  trace: Trace;
  top: number;
  at: number;
  verdictAt: number;
  markAt?: number;
  notAt?: number;
  struck?: number;
}> = ({ trace, top, at, verdictAt, markAt, notAt, struck }) => {
  const frame = useCurrentFrame();
  const sum = ease(frame, verdictAt - 6, 10);
  const v = ease(frame, verdictAt - 2, 10);
  return (
    <>
      <TokenRow x={FIG15_X} top={top}>
        {trace.steps.map((s, k) => {
          const scored = s.polarity !== 0;
          const isNot = s.token === "not" && notAt !== undefined;
          const isGood = s.token === "good" && markAt !== undefined;
          return (
            <TokenCol
              key={k}
              chip={
                <Chip
                  text={s.token}
                  size={CHIP}
                  at={at + k * 2}
                  tone={scored ? (s.polarity > 0 ? POS : NEG) : undefined}
                  toneAt={at + k * 2 + 6}
                  mark={isNot ? notAt : isGood ? markAt : undefined}
                  style={{ marginRight: 0 }}
                />
              }
              below={
                scored ? (
                  <span style={{ ...note(22, s.polarity > 0 ? POS_INK : NEG_INK), ...TABULAR, fontWeight: 700, opacity: ease(frame, at + k * 2 + 8, 10) }}>
                    {signed(s.polarity)}
                  </span>
                ) : isNot ? (
                  <span style={{ ...note(21, LOST_INK), fontWeight: 600, opacity: ease(frame, notAt + 2, 10) }}>never read</span>
                ) : null
              }
            />
          );
        })}
      </TokenRow>
      <div style={{ position: "absolute", left: SUM_X, top: top + 4, ...note(30, INK), ...TABULAR, fontWeight: 700, opacity: sum }}>
        {signed(trace.score)}
      </div>
      <div style={{ position: "absolute", left: VERDICT_X, top: top + 4, ...note(30, inkFor(trace.label)), fontWeight: 650, opacity: v }}>
        {struck !== undefined ? <Strike at={struck}>{trace.label}</Strike> : trace.label}
      </div>
    </>
  );
};
