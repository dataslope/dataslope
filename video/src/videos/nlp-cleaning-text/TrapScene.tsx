import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, body, INK, INK_SOFT, label } from "../../editorial/style";
import { FigLabel, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { MONO } from "../../theme/fonts";
import { CUSTOM, type Filtered, NEGATION, REVIEW } from "./data";
import { Chip, chipHeight, chipWidth, Headline, Kicker, LabelEnd, lerp, type MarkSpan, rowLayout, Tag, X0 } from "./parts";

const SIZE = 32;
const SMALL = 28;
const FIG_Y = 300;
const LIST_Y = 354;
const LIST_STEP = 56;
const RIGHT_X = 680;
const REVIEW_Y = 354;
const GHOST_Y = 440;
const FIG13_Y = 548;
const FORMULA_Y = 600;
const KEPT_Y = 704;

/** The words of Fig. 11, in the order the narration reads them. */
const READ = ["not", "no", "nor", "but", "don't", "won't", "never"];

/** A chip that sits in a line of text instead of at a page position. */
const Inline: React.FC<{ text: string; at: number; marks?: readonly MarkSpan[] }> = ({ text, at, marks }) => (
  <span style={{ position: "relative", display: "inline-block", width: chipWidth(text, SMALL), height: chipHeight(SMALL) }}>
    <Chip text={text} x={0} y={0} at={at} size={SMALL} marks={marks} />
  </span>
);

/** An operator or a word in the formula line, fading in on `at`. */
const Op: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ at, children, style }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return <span style={{ opacity: p, display: "inline-block", transform: `translateY(${(1 - p) * 6}px)`, ...style }}>{children}</span>;
};

/**
 * One review filtered twice. Its tokens fall to a ghost row as they are
 * dropped, `drop` from its own frame; what survives closes ranks on `close`.
 */
const Filter: React.FC<{
  f: Filtered;
  top: number;
  ghost?: number;
  at: readonly number[];
  drop: number;
  close: number;
  tone: "good" | "plain";
  toneAt: number;
  bad?: { token: string; at: number };
  marks?: Record<string, number>;
  marksOut?: number;
}> = ({ f, top, ghost, at, drop, close, tone, toneAt, bad, marks = {}, marksOut }) => {
  const frame = useCurrentFrame();
  const row = rowLayout(f.tokens, RIGHT_X, SIZE);
  const final = rowLayout(f.content, RIGHT_X, SIZE);
  const c = ease(frame, close, 18);
  let k = 0;
  let d = 0;
  return (
    <>
      {f.tokens.map((t, i) => {
        if (f.isStop[i]) {
          const when = drop + d++ * 3;
          const fall = ease(frame, when, 16);
          return (
            <Chip
              key={i}
              text={t}
              x={row[i].x}
              y={ghost === undefined ? top : lerp(top, ghost, fall)}
              at={at[i]}
              size={SIZE}
              gone={ghost === undefined ? undefined : when}
              out={ghost === undefined ? when : undefined}
              tones={bad && bad.token === t ? [{ at: bad.at, tone: "bad" }] : []}
              marks={marks[t] !== undefined ? [{ at: marks[t], out: marksOut }] : []}
            />
          );
        }
        const x = lerp(row[i].x, final[k++].x, c);
        return (
          <Chip
            key={i}
            text={t}
            x={x}
            y={top}
            at={at[i]}
            size={SIZE}
            tones={tone === "good" ? [{ at: toneAt, tone: "good" }] : []}
            marks={marks[t] !== undefined ? [{ at: marks[t], out: marksOut }] : []}
          />
        );
      })}
    </>
  );
};

/**
 * The negation trap: the stoplist holds not, no, nor and but (never, oddly,
 * is not on it), so the lesson's negative review filters down to "movie
 * good". The lesson's custom list (minus the negations, plus the domain's
 * noise) filters the same review to "not good".
 */
export const TrapScene: React.FC = () => {
  const n = useNarration();
  const frame = useCurrentFrame();
  const { y } = useLayout();

  // ── Cues ──
  const from = n.beat("trap").from;
  const readAt: Record<string, number> = {
    not: n.word("trap", "Not"),
    no: n.word("trap", "No"),
    nor: n.word("trap", "Nor"),
    but: n.word("trap", "But"),
    "don't": n.word("trap", "don't"),
    "won't": n.word("trap", "won't"),
    never: n.word("never", "Never"),
  };
  const reviewAt = n.word("review", "review");
  const said = REVIEW.tokens.map((t) => n.word("review", t, t === "the" ? { nth: 2 } : undefined));
  const twoAt = n.word("flipped", "Two");
  const surviveAt = n.word("flipped", "survive");
  const movieAt = n.word("flipped", "movie");
  const goodAt = n.word("flipped", "good");
  const readsAt = n.word("flipped", "reads");
  const negativeAt = n.word("flipped", "negative");
  const isntAt = n.word("never", "isn't");
  const curateAt = n.word("custom", "curate");
  const sentimentAt = n.word("custom", "sentiment");
  const startAt = n.word("custom", "Start");
  const takeAt = n.word("custom", "take");
  const notAt = n.word("custom", "not");
  const addAt = n.word("custom", "add");
  const movie2At = n.word("custom", "movie", { nth: 1 });
  const runAt = n.word("kept", "Run");
  const survives2At = n.word("kept", "survives");
  const notGoodAt = n.word("kept", "not good");
  const meaningAt = n.word("kept", "meaning");
  const oneAt = n.word("stem-in", "One", { nth: 1 });
  const endingsAt = n.word("stem-in", "endings");

  // ── Geometry ──
  const list = READ.map((w) => {
    const r = NEGATION.find((x) => x.word === w);
    if (!r) throw new Error(`no measurement for ${w}`);
    return r;
  });
  const chipH = chipHeight(SIZE);
  const keptRow = rowLayout(CUSTOM.review.content, RIGHT_X, SIZE);
  const flippedRow = rowLayout(REVIEW.content, RIGHT_X, SIZE);
  const keptAt = CUSTOM.review.tokens.map((_, i) => runAt + 4 + i * 3);
  const dim = 1 - ease(frame, endingsAt, 14) * 0.35;
  // Figs. 11 and 12 step back on the turn to the next part; Fig. 13, the
  // answer, holds a moment longer.
  const back = 1 - ease(frame, oneAt, 14) * 0.45;

  return (
    <AbsoluteFill>
      {READ.map((w) => (
        <Sfx key={w} name="el-tap" at={readAt[w]} level={-27} />
      ))}
      {said.map((a, i) => (
        <Sfx key={`r${i}`} name="el-tap" at={a} level={-29} />
      ))}
      <Sfx name="el-whoosh" at={twoAt} level={-33} />
      <Sfx name="el-pencil" at={sentimentAt - 4} level={-36} />
      {keptAt.filter((_, i) => i % 2 === 0).map((a, i) => (
        <Sfx key={`k${i}`} name="el-tap" at={a} level={-30} />
      ))}
      <Sfx name="el-whoosh" at={survives2At} level={-35} />

      <Kicker at={from - 6}>Stopwords</Kicker>
      <Headline lead="The negation" turn="trap." at={from - 4} turnAt={from + 8} />

      <div style={{ position: "absolute", inset: 0, opacity: dim }}>
        <div style={{ position: "absolute", inset: 0, opacity: back }}>
          {/* Fig. 11: is each negation word on the list? */}
          <FigLabel n="11" title="On the stoplist?" at={from} x={X0} y={y(FIG_Y)} />
          {list.map((r, i) => {
            const top = y(LIST_Y + i * LIST_STEP);
            return (
              <React.Fragment key={r.word}>
                <Chip
                  text={r.word}
                  x={X0}
                  y={top}
                  at={readAt[r.word]}
                  size={SIZE}
                  tones={r.isStop ? [{ at: readAt[r.word] + 6, tone: "bad" }] : []}
                  marks={r.word === "never" ? [{ at: isntAt, out: reviewAt }] : []}
                />
                <Ink at={readAt[r.word] + 4} dur={12} style={{ left: X0 + 150, top: top + chipH / 2 - 17, whiteSpace: "nowrap" }}>
                  <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: r.isStop ? ACCENT_INK : INK_SOFT }}>
                    {r.isStop ? "True" : "False"}
                  </span>
                </Ink>
              </React.Fragment>
            );
          })}

          {/* Fig. 12: the lesson's review through the standard list. */}
          <FigLabel n="12" title="One review, filtered" at={reviewAt - 4} x={RIGHT_X} y={y(FIG_Y)} />
          <Filter
            f={REVIEW}
            top={y(REVIEW_Y)}
            ghost={y(GHOST_Y)}
            at={said}
            drop={twoAt}
            close={surviveAt}
            tone="plain"
            toneAt={surviveAt}
            bad={{ token: "not", at: twoAt + 4 }}
            marks={{ movie: movieAt, good: goodAt, not: negativeAt }}
            marksOut={curateAt}
          />
          <Tag at={readsAt - 4} x={flippedRow[flippedRow.length - 1].right + 26} y={y(REVIEW_Y) + 14} size={24}>
            now reads like praise
          </Tag>
        </div>

        {/* Fig. 13: the lesson's custom list, and the review through it. */}
        <FigLabel n="13" title="A stoplist for movie reviews" at={sentimentAt - 2} x={RIGHT_X} y={y(FIG13_Y)} />
        <LabelEnd at={curateAt} x={1800} y={y(FIG13_Y)} call="(base - keep) | add" />
        <div
          style={{
            position: "absolute",
            left: RIGHT_X,
            top: y(FORMULA_Y),
            display: "flex",
            alignItems: "center",
            gap: 10,
            whiteSpace: "nowrap",
          }}
        >
          <Op at={startAt}>
            <span style={{ ...label(24, INK), fontWeight: 600 }}>NLTK&apos;s list</span>
          </Op>
          <Op at={takeAt} style={{ ...body(40), color: INK, margin: "0 6px" }}>
            −
          </Op>
          {CUSTOM.keep.map((w, i) => (
            <Inline key={w} text={w} at={takeAt + 2 + i * 3} marks={w === "not" ? [{ at: notAt, out: runAt }] : []} />
          ))}
          <Op at={addAt} style={{ ...body(40), color: INK, margin: "0 6px" }}>
            +
          </Op>
          {CUSTOM.add.map((w, i) => (
            <Inline key={w} text={w} at={addAt + 2 + i * 3} marks={w === "movie" ? [{ at: movie2At, out: runAt }] : []} />
          ))}
        </div>
        <Filter
          f={CUSTOM.review}
          top={y(KEPT_Y)}
          at={keptAt}
          drop={survives2At - 6}
          close={survives2At}
          tone="good"
          toneAt={notGoodAt}
          marks={{ not: notGoodAt, good: notGoodAt + 4 }}
        />
        <Tag at={meaningAt - 4} x={keptRow[keptRow.length - 1].right + 26} y={y(KEPT_Y) + 14} size={24} color={BLUE_INK}>
          the meaning made it through
        </Tag>
      </div>
    </AbsoluteFill>
  );
};
