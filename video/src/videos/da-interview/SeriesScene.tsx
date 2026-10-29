import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANK, CHALLENGE_PAGES, PARTS, QUESTIONS, TOPIC_PAGES } from "./data";
import { Drift, Headline, Hero, Kicker, X0 } from "./parts";

const COLS = 4;
const CARD_W = 400;
const GAP = 25;
const GRID_Y = 300;
const CARD_H = 196;
const ROW_GAP = 26;
const ART = 132;
/** Where a card's count sits: under a title of two lines (label 24, gap 6,
 *  two title lines of 31, gap 8, from the text's top at 26). */
const COUNT_TOP = 126;

/**
 * The series as a grid of its eight topic videos, each with its own
 * watercolor hero and its question count, inking in along the track; then
 * the total (each question answered once, so a card's count is not its
 * page's), the practice the pages carry, and the bridge into Part 1, whose
 * card lights up.
 */
export const SeriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("series").from;
  const pageAt = n.word("series", "one video per topic page");
  const totalAt = n.word("series", "a hundred and fifty-six questions");
  const onceAt = n.word("series", "each answered once");
  const worksAt = n.word("series-how", "works through the questions");
  const practiceAt = n.word("practice", "every page");
  const checksAt = n.word("practice", "concept checks");
  const runnableAt = n.word("practice", "runnable challenges");
  const bankAt = n.word("practice", "a bank");
  const nextAt = n.word("next", "Next");
  const screenAt = n.word("next", "the series starts there");
  const end = n.beat("next").to;

  const cardX = (i: number) => X0 + (i % COLS) * (CARD_W + GAP);
  const cardY = (i: number) => y(GRID_Y) + Math.floor(i / COLS) * (h(CARD_H) + h(ROW_GAP));
  const inAt = (i: number) => pageAt + i * 5;
  const practiceY = cardY(PARTS.length - 1) + h(CARD_H) + h(40);

  return (
    <AbsoluteFill>
      {PARTS.map((p, i) => (
        <Sfx key={p.n} name="el-tap" at={inAt(i)} level={-36} />
      ))}
      <Sfx name="el-pop" at={totalAt + 4} level={-32} />
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>The series</Kicker>
        <Headline lead="Eight videos," turn="one per topic page." at={from + 2} turnAt={pageAt} size={64} />

        {PARTS.map((p, i) => {
          const pIn = ease(frame, inAt(i) - 2, 14);
          if (pIn <= 0) return null;
          const first = i === 0 ? ease(frame, screenAt - 2, 12) : 0;
          const dim = i === 0 ? 0 : ease(frame, screenAt, 16) * 0.5;
          return (
            <React.Fragment key={p.n}>
              <div
                style={{
                  position: "absolute",
                  left: cardX(i),
                  top: cardY(i),
                  width: CARD_W,
                  height: h(CARD_H),
                  boxSizing: "border-box",
                  border: `1.5px solid ${first > 0 ? BLUE_INK : HAIRLINE}`,
                  borderRadius: 12,
                  background: first > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${first * 60}%, ${PAPER})` : PAPER,
                  opacity: pIn * (1 - dim),
                  transform: `translateY(${(1 - pIn) * 14}px)`,
                }}
              >
                <div style={{ position: "absolute", left: ART + 32, top: 26, right: 20 }}>
                  <div style={{ ...label(20, BLUE_INK), ...TABULAR }}>Part {p.n}</div>
                  <div style={{ ...note(27, INK), fontWeight: 650, marginTop: 6, lineHeight: 1.15 }}>{p.title}</div>
                </div>
                {/* Its own line, where a two-line title leaves it, so every
                    count in a row shares a baseline. */}
                <div style={{ position: "absolute", left: ART + 32, top: COUNT_TOP, ...note(22, INK_SOFT), ...TABULAR }}>
                  {p.questions} questions
                </div>
              </div>
              <Hero video={p.video} id={p.hero} at={inAt(i)} left={cardX(i) + 14} top={cardY(i) + (h(CARD_H) - ART) / 2} width={ART} height={ART} dim={i === 0 ? undefined : screenAt} />
            </React.Fragment>
          );
        })}

        <div
          style={{
            position: "absolute",
            right: 1920 - (cardX(COLS - 1) + CARD_W),
            top: y(GRID_Y) - h(98),
            ...label(24, INK),
            ...TABULAR,
            opacity: ease(frame, totalAt - 2, 12) * (1 - ease(frame, screenAt, 16) * 0.5),
          }}
        >
          {QUESTIONS} questions in all
        </div>
        <div
          style={{
            position: "absolute",
            right: 1920 - (cardX(COLS - 1) + CARD_W),
            top: y(GRID_Y) - h(62),
            ...note(22, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, onceAt - 2, 12) * (1 - ease(frame, screenAt, 16) * 0.5),
          }}
        >
          each answered once, in the video of the page it belongs to
        </div>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: practiceY,
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, worksAt - 2, 12) * (1 - ease(frame, practiceAt - 4, 10)),
          }}
        >
          Each video: the questions that need a figure, then the rest, quickly.
        </div>
        <div style={{ position: "absolute", left: X0, top: practiceY, ...note(28, INK), whiteSpace: "nowrap" }}>
          <span style={{ opacity: ease(frame, practiceAt, 12) }}>Every page: </span>
          <span style={{ opacity: ease(frame, checksAt - 2, 10) }}>concept checks</span>
          <span style={{ opacity: ease(frame, runnableAt - 2, 10) }}>
            {" · "}
            {CHALLENGE_PAGES} of {TOPIC_PAGES} pages: runnable challenges
          </span>
        </div>
        <div style={{ position: "absolute", left: X0, top: practiceY + h(44), ...note(28, INK), whiteSpace: "nowrap", opacity: ease(frame, bankAt - 2, 10) }}>
          A bank of <span style={{ fontWeight: 650 }}>{BANK} multiple-choice questions</span>, across the track
        </div>

        <NextLine at={nextAt} x={X0} y={practiceY + h(114)} width={1000}>
          SQL
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
