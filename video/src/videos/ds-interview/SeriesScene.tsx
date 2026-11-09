import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, TABULAR, label, note } from "../../editorial/style";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANK, CHALLENGE_PAGES, PARTS, QUESTIONS } from "./data";
import { Drift, Headline, Hero, Kicker, Mark, X0 } from "./parts";

const TILE_W = 260;
const GAP = 24;
const ROW_Y = [290, 562];
/** Five tiles on the first row, six on the second, so each two-video topic
 *  sits side by side on one row. */
const FIRST_ROW = 5;
const ART = 112;
const LINE_Y = 834;

/**
 * The series as a strip of its eleven topic videos, five then six, each its
 * own watercolor hero over a centred caption with its question count, inking
 * in along the track, no tiles. The two topics that take two videos are
 * marked as pairs, their titles under the highlighter; then the
 * total, how every video runs, the practice on the pages (concept checks on
 * every one, challenges on four, and one bank of multiple-choice questions for
 * the whole track, on a line of its own), and the bridge into Part 1: the
 * Statistics and Probability titles light as the track's first two, and Part
 * 1 stays lit for "Next".
 */
export const SeriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("series").from;
  const orderAt = n.word("series", "in the track's order");
  const elevenAt = n.word("series", "eleven videos");
  const totalAt = n.word("series", "a hundred and fifty-eight questions");
  const mlAt = n.word("series", "Machine learning and experimentation");
  const expAt = n.word("series", "experimentation each get two videos");
  const figureAt = n.word("series", "the questions worth a figure");
  const oneLineAt = n.word("series", "the one-line answers");
  const everyAt = n.word("practice", "Every one has");
  const checksAt = n.word("practice", "concept checks");
  const browserAt = n.word("practice", "four add challenges");
  const bankAt = n.word("practice", "a bank of a hundred and ten");
  // The bridge lights the two tiles it names, Statistics then Probability, and
  // keeps only Part 1 lit once "Next" is said.
  const openAt = n.word("next", "statistics and probability");
  const probAt = n.word("next", "and probability");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;

  const row = (i: number) => (i < FIRST_ROW ? 0 : 1);
  const col = (i: number) => (i < FIRST_ROW ? i : i - FIRST_ROW);
  const tileX = (i: number) => X0 + (row(i) === 0 ? (TILE_W + GAP) / 2 : 0) + col(i) * (TILE_W + GAP);
  const tileY = (i: number) => y(ROW_Y[row(i)]);
  const inAt = (i: number) => elevenAt + 4 + i * 4;
  const pairs = [
    { a: 2, b: 3, at: mlAt },
    { a: 5, b: 6, at: expAt },
  ];

  return (
    <AbsoluteFill>
      {PARTS.map((p, i) => (
        <Sfx key={p.n} name="el-tap" at={inAt(i)} level={-37} />
      ))}
      <Sfx name="el-pop" at={totalAt + 4} level={-32} />
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>The series</Kicker>
        <Headline lead="In the track's order," turn="eleven videos." at={orderAt - 4} turnAt={elevenAt} size={64} />

        {PARTS.map((p, i) => {
          const pIn = ease(frame, inAt(i) - 2, 14);
          if (pIn <= 0) return null;
          const dimFrom = i === 1 ? nextAt : openAt;
          const dim = i === 0 ? 0 : ease(frame, dimFrom, 16) * 0.5;
          // What the narration points at goes under the highlighter: each
          // two-video pair while it is named, then Statistics and Probability
          // as the bridge names them, Part 1 alone once "Next" is said.
          const pair = pairs.find((pr) => pr.a === i || pr.b === i);
          const mark = pair
            ? { at: pair.at, out: figureAt - 6 }
            : i === 0
              ? { at: openAt - 2, out: undefined }
              : i === 1
                ? { at: probAt - 2, out: nextAt }
                : null;
          return (
            <React.Fragment key={p.n}>
              {/* A hero and its caption, centred under it: no tile, the
                  space between columns does the grouping. */}
              <div
                style={{
                  position: "absolute",
                  left: tileX(i),
                  top: tileY(i) + ART + 26,
                  width: TILE_W,
                  textAlign: "center",
                  opacity: pIn * (1 - dim),
                  transform: `translateY(${(1 - pIn) * 14}px)`,
                }}
              >
                <div style={{ ...label(19, BLUE_INK), ...TABULAR }}>Part {p.n}</div>
                <div style={{ ...note(24, INK), fontWeight: 500, marginTop: 4, lineHeight: 1.12, whiteSpace: "nowrap" }}>
                  {mark ? (
                    <Mark at={mark.at} out={mark.out}>
                      {p.title}
                    </Mark>
                  ) : (
                    p.title
                  )}
                </div>
                <div style={{ ...note(20, INK_SOFT), marginTop: 6, ...TABULAR }}>{p.questions} questions</div>
              </div>
              <Hero
                video={p.video}
                id={p.hero}
                at={inAt(i)}
                left={tileX(i) + (TILE_W - ART) / 2}
                top={tileY(i) + 14}
                width={ART}
                height={ART}
                dim={i === 0 ? undefined : dimFrom}
              />
            </React.Fragment>
          );
        })}

        <div
          style={{
            position: "absolute",
            right: 1920 - (X0 + 6 * TILE_W + 5 * GAP),
            top: y(ROW_Y[0]) - h(60),
            ...label(24, INK),
            ...TABULAR,
            opacity: ease(frame, totalAt - 2, 12) * (1 - ease(frame, openAt, 16) * 0.5),
          }}
        >
          {QUESTIONS} questions in all
        </div>

        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(LINE_Y),
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, figureAt - 2, 12) * (1 - ease(frame, everyAt - 12, 10)),
          }}
        >
          In each: the questions worth a figure first,{" "}
          <span style={{ opacity: ease(frame, oneLineAt - 2, 12) }}>then the one-line answers.</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(LINE_Y),
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, everyAt - 2, 12) * (1 - ease(frame, nextAt - 16, 10)),
          }}
        >
          Every page: <span style={{ opacity: ease(frame, checksAt - 2, 10) }}>concept checks</span>
          <span style={{ opacity: ease(frame, browserAt - 2, 10) }}> · {CHALLENGE_PAGES} pages: challenges that run in your browser</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y(LINE_Y + 44),
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, bankAt - 2, 10) * (1 - ease(frame, nextAt - 16, 10)),
          }}
        >
          A bank of <span style={{ fontWeight: 500 }}>{BANK} multiple-choice questions</span>, for the whole track
        </div>

        {/* Its rule clears the tiles by about 40px, and the practice lines have
            faded before it inks in across where they stood. */}
        <NextLine at={nextAt} x={X0} y={y(LINE_Y) + h(12)} width={1000}>
          Statistics
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
