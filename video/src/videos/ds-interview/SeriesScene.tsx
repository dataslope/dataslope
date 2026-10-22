import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANK, PARTS, QUESTIONS } from "./data";
import { Drift, Headline, Hero, Kicker, X0 } from "./parts";

const TILE_W = 260;
const TILE_H = 250;
const GAP = 24;
const ROW_Y = [290, 562];
/** Five tiles on the first row, six on the second, so each two-video topic
 *  sits side by side on one row. */
const FIRST_ROW = 5;
const ART = 112;
const LINE_Y = 834;

/**
 * The series as a strip of its eleven topic videos, five then six, each tile
 * with its own watercolor hero and its question count, inking in along the
 * track. The two topics that take two videos are marked as pairs; then the
 * total, how every video runs, the practice on every page, and the bridge
 * into Part 1, whose tile lights up.
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
  const practiceAt = n.word("practice", "Each page carries practice");
  const checksAt = n.word("practice", "concept checks");
  const browserAt = n.word("practice", "challenges that run in your browser");
  const bankAt = n.word("practice", "a hundred and ten");
  const openAt = n.word("next", "probability and statistics questions");
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
        <Headline lead="Eleven videos," turn="in the track's order." at={from + 2} turnAt={orderAt} size={64} />

        {pairs.map((pr) => {
          const q = ease(frame, pr.at, 14) * (1 - ease(frame, figureAt - 6, 14));
          if (q <= 0) return null;
          return (
            <div
              key={pr.a}
              style={{
                position: "absolute",
                left: tileX(pr.a) - 10,
                top: tileY(pr.a) - 10,
                width: tileX(pr.b) + TILE_W - tileX(pr.a) + 20,
                height: h(TILE_H) + 20,
                borderRadius: 18,
                background: HIGHLIGHT,
                opacity: q,
              }}
            />
          );
        })}

        {PARTS.map((p, i) => {
          const pIn = ease(frame, inAt(i) - 2, 14);
          if (pIn <= 0) return null;
          const first = i === 0 ? ease(frame, openAt - 2, 12) : 0;
          const dim = i === 0 ? 0 : ease(frame, openAt, 16) * 0.5;
          return (
            <React.Fragment key={p.n}>
              <div
                style={{
                  position: "absolute",
                  left: tileX(i),
                  top: tileY(i),
                  width: TILE_W,
                  height: h(TILE_H),
                  boxSizing: "border-box",
                  border: `1.5px solid ${first > 0 ? BLUE_INK : HAIRLINE}`,
                  borderRadius: 12,
                  background: first > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${first * 60}%, ${PAPER})` : PAPER,
                  opacity: pIn * (1 - dim),
                  transform: `translateY(${(1 - pIn) * 14}px)`,
                }}
              >
                <div style={{ position: "absolute", left: 20, right: 16, top: ART + 26 }}>
                  <div style={{ ...label(19, BLUE_INK), ...TABULAR }}>Part {p.n}</div>
                  <div style={{ ...note(24, INK), fontWeight: 650, marginTop: 4, lineHeight: 1.12 }}>{p.title}</div>
                  <div style={{ ...note(20, INK_SOFT), marginTop: 6, ...TABULAR }}>{p.questions} questions</div>
                </div>
              </div>
              <Hero
                video={p.video}
                id={p.hero}
                at={inAt(i)}
                left={tileX(i) + (TILE_W - ART) / 2}
                top={tileY(i) + 14}
                width={ART}
                height={ART}
                dim={i === 0 ? undefined : openAt}
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
            opacity: ease(frame, figureAt - 2, 12) * (1 - ease(frame, practiceAt - 4, 10)),
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
            ...TABULAR,
            opacity: 1 - ease(frame, nextAt - 8, 10),
          }}
        >
          <span style={{ opacity: ease(frame, practiceAt, 12) }}>On every page: </span>
          <span style={{ opacity: ease(frame, checksAt - 2, 10) }}>concept checks · </span>
          <span style={{ opacity: ease(frame, browserAt - 2, 10) }}>challenges that run in your browser · </span>
          <span style={{ opacity: ease(frame, bankAt - 2, 10), fontWeight: 650 }}>{BANK} multiple-choice questions</span>
        </div>

        <NextLine at={nextAt} x={X0} y={y(LINE_Y) - h(8)} width={1000}>
          Statistics
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
