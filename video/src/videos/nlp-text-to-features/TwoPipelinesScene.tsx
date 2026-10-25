import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { body, label, note } from "../../editorial/style";
import { FigLabel, Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { PIPE } from "./data";
import { Chip, ChipRow, CHIP_LINE, FIG_Y, Headline, HIGHLIGHT, INK, INK_SOFT, Kicker, LOST, LOST_INK, Mark, pulse, SURFACE, X0 } from "./parts";

const REVIEW_Y = 330;
const TOPIC_Y = 436;
const DROPPED_Y = 506;
const READ_Y = 578;
const SENT_Y = 660;
const PAIRS_Y = 750;
const ROW_X = 440;
/** Each pipeline's recipe, at the end of its row once the row has closed up. */
const RECIPE_X = 1230;
const RECIPE_H = 40;

/** Fig. 2's menu, short: tokenize, then the four optional steps. */
const STEPS = ["tokenize", "lowercase", "stopwords", "stem", "n-grams"] as const;
type Step = (typeof STEPS)[number];

/** The review as written, split so its words can be marked. */
const REVIEW_WORDS = PIPE.review.split(" ");
const bare = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");
/** The lesson's keep set, in the order its code writes it. */
const SPOKEN_KEEP = ["not", "no", "nor", "never", "but"];

/** The topic pipeline drops every stopword; the sentiment one keeps these. */
const isDroppedByTopic = (w: string) => PIPE.stop.has(w);
const isDroppedBySentiment = (w: string) => PIPE.stop.has(w) && !PIPE.keep.has(w);

/**
 * The lesson's one review through its two pipelines. The topic pipeline
 * strikes every stopword and closes up, leaving plot, good, acting,
 * brilliant: right for what the review is about, wrong for how it feels.
 * The sentiment pipeline keeps "not" and "but" and adds word pairs, among
 * them ("not", "good"). Beside each row, Fig. 2's menu lights the steps that
 * pipeline takes, so the one menu ends as two recipes: tokenize, lowercase
 * and drop every stopword; or tokenize, lowercase, drop all stopwords but the
 * negations and "but", and add n-grams. Neither stems or lemmatizes.
 */
export const TwoPipelinesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  // ── Cues ──
  const start = n.beat("review").from;
  const sentenceAt = n.word("review", "The plot");
  const readEnd = n.word("review", "brilliant", { edge: "end" });
  const topicAt = n.word("topic", "topic pipeline");
  const dropsAt = n.word("topic", "drops every stopword");
  const notButAt = n.word("topic", "not and but");
  const listAt = n.word("topic", "NLTK's list");
  const leftAt = n.word("topic", "what's left");
  const fineAt = n.word("about", "fine");
  const feelingAt = n.word("about", "for feeling");
  const saysGoodAt = n.word("about", "says good");
  const brilliantAt = n.word("topic", "brilliant");
  const sentAt = n.word("sentiment", "sentiment pipeline");
  const keepsAt = n.word("sentiment", "keeps the negations");
  const pairsAt = n.word("sentiment", "word pairs");
  const notGoodAt = n.word("sentiment", "not good");
  const unitAt = n.word("sentiment", "as a unit");
  // Fig. 2's menu comes back beside each pipeline once its row has closed
  // up, and lights the steps that pipeline takes (the lesson's code).
  const topicRecipeAt = leftAt + 8;
  const sentRecipeAt = keepsAt + 16;
  const leftWordAt: Record<string, number> = {
    plot: n.word("topic", "plot"),
    good: n.word("topic", "good"),
    acting: n.word("topic", "acting"),
    brilliant: n.word("topic", "brilliant"),
  };
  const read = interpolate(frame, [sentenceAt, readEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const topicStops = PIPE.alpha.map((w, k) => (isDroppedByTopic(w) ? k : -1)).filter((k) => k >= 0);
  const sentStops = PIPE.alpha.map((w, k) => (isDroppedBySentiment(w) ? k : -1)).filter((k) => k >= 0);
  const content = new Set(["plot", "acting"]);

  return (
    <AbsoluteFill>
      {/* ── Sound: the review, each strike, the rows closing up, the pairs ── */}
      <Sfx name="el-pencil" at={sentenceAt - 4} level={-36} />
      {topicStops.map((k, i) => (
        <Sfx key={k} name="el-scratch" at={dropsAt + i * 3} level={-36} />
      ))}
      <Sfx name="el-whoosh" at={leftAt - 4} level={-34} />
      <Sfx name="el-tap" at={saysGoodAt - 2} level={-28} />
      <Sfx name="el-whoosh" at={keepsAt + 14} level={-35} />
      {PIPE.bigrams.map((_, k) => (
        <Sfx key={k} name="el-tap" at={pairsAt + k * 3} level={-31} />
      ))}
      <Sfx name="el-tap" at={brilliantAt + 6} level={-33} />
      <Sfx name="el-tap" at={sentRecipeAt + 8} level={-33} />

      <Kicker at={start - 10}>Choosing the pipeline</Kicker>
      <Headline at={start - 4} second={start + 10} italic="two pipelines.">
        One review,
      </Headline>
      <FigLabel n="3" title="One review through two pipelines, from the lesson" at={start - 2} x={X0} y={y(FIG_Y)} />

      {/* The review, as the lesson writes it, underlined as it is read. */}
      <Ink at={sentenceAt - 4} dur={22} style={{ left: X0, top: y(REVIEW_Y), ...body(42), color: INK, whiteSpace: "nowrap" }}>
        <span style={{ position: "relative", display: "inline-block" }}>
          {REVIEW_WORDS.map((w, k) => (
            <React.Fragment key={k}>
              {k > 0 ? " " : null}
              {PIPE.keep.has(bare(w)) ? <Mark at={notButAt + (bare(w) === "but" ? 6 : 0)}>{w}</Mark> : w}
            </React.Fragment>
          ))}
          <span
            style={{
              position: "absolute",
              left: 0,
              bottom: "-0.08em",
              height: 2,
              width: `${read * 100}%`,
              background: INK_SOFT,
              opacity: 1 - ease(frame, topicAt, 12),
            }}
          />
        </span>
      </Ink>

      {/* ── The topic pipeline ── */}
      <Ink at={topicAt - 4} dur={14} style={{ left: X0, top: y(TOPIC_Y), whiteSpace: "nowrap" }}>
        <div style={label(24, INK)}>Topic pipeline</div>
        <div style={{ ...note(20, INK_SOFT), marginTop: 6 }}>drops every stopword</div>
      </Ink>
      <ChipRow x={ROW_X} y={y(TOPIC_Y)}>
        {PIPE.alpha.map((w, k) => {
          const i = topicStops.indexOf(k);
          return (
            <Chip
              key={k}
              text={w}
              at={topicAt + k * 1.5}
              strike={i >= 0 ? dropsAt + i * 3 : undefined}
              drop={i >= 0 ? leftAt - 4 : undefined}
              mark={content.has(w) ? fineAt - 2 : undefined}
              bump={i < 0 ? leftWordAt[w] : undefined}
              markOut={feelingAt - 4}
              tone={w === "good" ? LOST : undefined}
              toneAt={feelingAt}
            />
          );
        })}
      </ChipRow>
      <Note at={listAt - 2} x={X0} y={y(REVIEW_Y) + 68}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          <i>not</i> and <i>but</i> are both on NLTK’s English stopword list
        </span>
      </Note>
      {/* What the topic pipeline threw away, as it closes up. */}
      <Note at={leftAt - 2} x={X0} y={y(DROPPED_Y) + 8}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>dropped</span>
      </Note>
      <ChipRow x={ROW_X} y={y(DROPPED_Y)}>
        {topicStops.map((k, i) => (
          <Chip key={k} text={PIPE.alpha[k]} size={22} at={leftAt + i * 2} strike={leftAt + 6 + i * 2} ink={INK_SOFT} mark={PIPE.keep.has(PIPE.alpha[k]) ? feelingAt + 4 : undefined} />
        ))}
      </ChipRow>
      {/* Its recipe: tokenize, lowercase, drop every stopword. */}
      <Recipe
        top={y(TOPIC_Y)}
        at={topicRecipeAt}
        lit={{ tokenize: topicRecipeAt, lowercase: brilliantAt + 4, stopwords: brilliantAt + 8 }}
        skipAt={fineAt - 2}
      />
      <Note at={topicRecipeAt + 6} x={RECIPE_X} y={y(TOPIC_Y) + 50}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>Fig. 2’s menu, as this pipeline takes it</span>
      </Note>
      <Note at={fineAt - 2} x={ROW_X} y={y(READ_Y)}>
        <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
          <span style={{ color: INK_SOFT }}>What it’s about: </span>plot, acting
        </span>
      </Note>
      <Note at={saysGoodAt - 2} x={ROW_X + 480} y={y(READ_Y)}>
        <span style={{ ...note(24, LOST_INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          <span style={{ color: INK_SOFT, fontWeight: 500 }}>How it feels: </span>
          <i>good</i>
        </span>
      </Note>

      {/* ── The sentiment pipeline ── */}
      <Ink at={sentAt - 4} dur={14} style={{ left: X0, top: y(SENT_Y), whiteSpace: "nowrap" }}>
        <div style={label(24, INK)}>Sentiment pipeline</div>
        <div style={{ ...note(20, INK_SOFT), marginTop: 6 }}>keeps the negations</div>
      </Ink>
      <ChipRow x={ROW_X} y={y(SENT_Y)}>
        {PIPE.alpha.map((w, k) => {
          const i = sentStops.indexOf(k);
          return (
            <Chip
              key={k}
              text={w}
              at={sentAt + k * 1.5}
              strike={i >= 0 ? keepsAt - 2 + i * 3 : undefined}
              drop={i >= 0 ? keepsAt + 14 : undefined}
              mark={PIPE.keep.has(w) ? keepsAt + 4 : undefined}
              markOut={pairsAt - 2}
            />
          );
        })}
      </ChipRow>
      {/* Its recipe: the same, but sparing the negations, plus word pairs. */}
      <Recipe
        top={y(SENT_Y)}
        at={sentRecipeAt}
        lit={{ tokenize: sentRecipeAt, lowercase: sentRecipeAt + 8, stopwords: sentRecipeAt + 12, "n-grams": pairsAt }}
        skipAt={unitAt - 2}
      />
      <Note at={sentRecipeAt + 12} x={RECIPE_X} y={y(SENT_Y) + 50}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>
          drops every stopword except {[...PIPE.keep].sort((a, b) => SPOKEN_KEEP.indexOf(a) - SPOKEN_KEEP.indexOf(b)).map((w, k, all) => (
            <React.Fragment key={w}>
              {k > 0 ? (k === all.length - 1 ? " and " : ", ") : null}
              <i>{w}</i>
            </React.Fragment>
          ))}
        </span>
      </Note>
      <Note at={pairsAt - 4} x={X0} y={y(PAIRS_Y) + 8}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>word pairs</span>
      </Note>
      <ChipRow x={ROW_X} y={y(PAIRS_Y)}>
        {PIPE.bigrams.map(([a, b], k) => (
          <Chip key={k} text={`${a} ${b}`} at={pairsAt + k * 3} mark={a === "not" && b === "good" ? notGoodAt - 2 : undefined} />
        ))}
      </ChipRow>
      <Note at={unitAt - 2} x={ROW_X} y={y(PAIRS_Y) + 64}>
        <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>
          <i>not good</i> survives as one feature.
        </span>
      </Note>
    </AbsoluteFill>
  );
};

/** Fig. 2's menu as one pipeline's recipe: every step starts as the menu's
 *  dashed option, a step the pipeline takes turns solid (with a brief
 *  highlight as it lights), and the steps it skips fade at `skipAt`. */
const Recipe: React.FC<{ top: number; at: number; lit: Partial<Record<Step, number>>; skipAt: number }> = ({ top, at, lit, skipAt }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: RECIPE_X, top, display: "flex", gap: 6 }}>
      {STEPS.map((s, k) => {
        const p = ease(frame, at + k * 2, 12);
        const litAt = lit[s];
        const on = litAt === undefined ? 0 : ease(frame, litAt, 10);
        const glow = litAt === undefined ? 0 : pulse(frame, litAt, 24);
        const off = litAt === undefined ? ease(frame, skipAt, 14) : 0;
        return (
          <div
            key={s}
            style={{
              position: "relative",
              height: RECIPE_H,
              padding: "0 10px",
              display: "flex",
              alignItems: "center",
              opacity: p * (1 - 0.6 * off),
              transform: `translateY(${(1 - p) * 8}px)`,
            }}
          >
            <div style={{ position: "absolute", inset: 0, borderRadius: 10, border: `2px dashed ${CHIP_LINE}`, opacity: 1 - on }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 10,
                border: `2px solid ${INK}`,
                background: `color-mix(in srgb, ${HIGHLIGHT} ${(glow * 100).toFixed(0)}%, ${SURFACE})`,
                opacity: on,
              }}
            />
            <span style={{ position: "relative", ...label(20, on > 0.5 ? INK : INK_SOFT), whiteSpace: "nowrap" }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
};
