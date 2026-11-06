import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { Ink, Num, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANK, CHALLENGE_PAGE_NAMES, PAGE_QUESTIONS, PARTS, QUESTIONS } from "./data";
import { Drift, Kicker, Spot } from "./parts";

const COL_W = 148;
const GAP = 8;
const LEFT = (1920 - (PARTS.length * COL_W + (PARTS.length - 1) * GAP)) / 2;
/** The bars' baseline, and the tallest bar's height, in layout units. */
const BASE = 690;
const BAR_MAX = 250;
const BAR_W = 92;
/** Each hero's box, in px, standing on its bar. */
const ART_W = 140;
const ART_H = 112;
const LINE_Y = 834;
/** The small spots' column, bottom right: under Part 11's title and right of
 *  the longest line beside it (the practice line, to about x 1554). */
const SPOT_CX = 1740;

const MOST = Math.max(...PARTS.map((p) => p.questions));

/**
 * The series as a chart: the eleven topic videos in the track's order, each a
 * column with its hero, its part number and title under the baseline, and a
 * bar for the questions it answers. The names ink in along the baseline as
 * "This series follows the track" is said, the heroes on "eleven videos", and
 * the heroes ride up on their bars as the total is said. "Each answered once"
 * is glossed under the headline: the pages ask more, and a question two pages
 * share is answered in one video.
 * SQL's two videos and data modeling's two are marked as pairs, each its own
 * box; then how each video runs, the practice on the pages (concept checks on
 * every one, challenges on three, named, a bank of multiple-choice questions
 * for the whole track), and the bridge, which lights SQL's two parts on "hard
 * sequel" and then Part 1 alone, where the series starts.
 */
export const SeriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("series").from;
  const trackAt = n.word("series", "This series");
  const elevenAt = n.word("series", "eleven videos");
  const totalAt = n.word("series", "a hundred and fifty-seven questions");
  const onceAt = n.word("series", "each answered once");
  const sqlAt = n.word("series", "Sequel and data modeling");
  const modelAt = n.word("series", "data modeling take two videos");
  const figureAt = n.word("series-how", "the harder questions");
  const quickAt = n.word("series-how", "a quick round");
  const everyAt = n.word("practice", "Every topic page has concept checks");
  const browserAt = n.word("practice", "three add challenges");
  const bankAt = n.word("practice", "a bank of a hundred and ten");
  const hardAt = n.word("next", "hard sequel");
  const startsAt = n.word("next", "the series starts there");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;
  const browserWordAt = n.word("practice", "the browser");

  const colX = (i: number) => LEFT + i * (COL_W + GAP);
  const base = y(BASE);
  // The parts' names ink in as the series is named, their heroes
  // as "eleven videos" is said, and their bars as the total is.
  const nameAt = (i: number) => trackAt + 2 + i * 3;
  const inAt = (i: number) => elevenAt + 3 + i * 3;
  const growAt = (i: number) => totalAt + i * 2;
  const pairs = [
    { a: 0, b: 1, at: sqlAt },
    { a: 2, b: 3, at: modelAt },
  ];
  const barH = (i: number) => h(BAR_MAX) * (PARTS[i].questions / MOST);
  const lit = ease(frame, hardAt - 2, 12);
  const narrow = ease(frame, startsAt, 14);
  const litTop = base - Math.max(barH(0), barH(1)) - ART_H - 24;

  return (
    <AbsoluteFill>
      {PARTS.map((p, i) => (
        <Sfx key={p.n} name="el-tap" at={nameAt(i)} level={-37} />
      ))}
      <Sfx name="el-whoosh" at={totalAt} level={-36} />
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>The series</Kicker>
        {/* The headline in three inks, each as it is said: Headline's lead and
            turn, then the turn's last words in the same italic. */}
        <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(62) }}>
          <Ink at={elevenAt - 4} dur={20} style={{ position: "relative", whiteSpace: "nowrap" }}>
            Eleven videos,
          </Ink>
          <Ink at={totalAt} dur={18} style={{ position: "relative", ...headline(62, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
            {QUESTIONS} questions,
          </Ink>
          <Ink at={onceAt} dur={18} style={{ position: "relative", ...headline(62, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
            each answered once.
          </Ink>
        </div>
        {/* Why "once": the pages ask more questions than the series answers,
            because some are asked on two pages. */}
        <div style={{ position: "absolute", left: 96, top: y(150) + h(84), ...note(24, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, onceAt + 8, 14) }}>
          The topic pages ask <Num>{PAGE_QUESTIONS}</Num>; a question two pages share is answered once, in one video.
        </div>

        {pairs.map((pr) => {
          const q = ease(frame, pr.at, 14) * (1 - ease(frame, figureAt - 6, 14));
          if (q <= 0) return null;
          const top = Math.min(base - barH(pr.a), base - barH(pr.b)) - ART_H - 24;
          return (
            <div
              key={pr.a}
              style={{
                position: "absolute",
                // Inset 4px inside the pair's columns, so the two pairs stand
                // apart by a 16px gap instead of touching as one block of four.
                left: colX(pr.a) + 4,
                top,
                width: colX(pr.b) + COL_W - colX(pr.a) - 8,
                height: base + h(118) - top,
                borderRadius: 16,
                background: HIGHLIGHT,
                opacity: q,
              }}
            />
          );
        })}

        {/* The bridge: "hard sequel" lights SQL's two parts, and "the series
            starts there" narrows the light to Part 1 as the rest dim. */}
        {lit > 0 ? (
          <div
            style={{
              position: "absolute",
              left: colX(0) + 4,
              top: litTop,
              width: COL_W - 8 + (colX(1) - colX(0)) * (1 - narrow),
              height: base + h(118) - litTop,
              borderRadius: 16,
              background: HIGHLIGHT,
              opacity: lit,
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            left: colX(0) - 8,
            width: colX(PARTS.length - 1) + COL_W - colX(0) + 16,
            top: base,
            height: 1.5,
            background: HAIRLINE,
            opacity: ease(frame, from + 6, 16),
          }}
        />

        {PARTS.map((p, i) => {
          const pIn = ease(frame, nameAt(i) - 2, 14);
          if (pIn <= 0) return null;
          const grow = ease(frame, growAt(i), 22);
          const bh = barH(i) * grow;
          const dim = i === 0 ? 0 : ease(frame, startsAt, 16) * 0.5;
          const cx = colX(i) + COL_W / 2;
          return (
            <React.Fragment key={p.n}>
              <div
                style={{
                  position: "absolute",
                  left: cx - BAR_W / 2,
                  top: base - bh,
                  width: BAR_W,
                  height: bh,
                  borderRadius: "8px 8px 0 0",
                  background: BAR,
                  // No bar at all before it grows: a padded box of height 0
                  // still drew an 8px sliver.
                  opacity: bh > 0.5 ? 1 - dim : 0,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 8,
                    textAlign: "center",
                    ...label(24, PAPER),
                    fontWeight: 700,
                    opacity: ease(frame, growAt(i) + 14, 10),
                  }}
                >
                  <Num>{p.questions}</Num>
                </span>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: colX(i),
                  width: COL_W,
                  top: base + 12,
                  textAlign: "center",
                  opacity: pIn * (1 - dim),
                  transform: `translateY(${(1 - pIn) * 10}px)`,
                }}
              >
                <div style={label(19, BLUE_INK)}>
                  Part <Num>{p.n}</Num>
                </div>
                <div style={{ ...note(21, INK), fontWeight: 650, marginTop: 2, lineHeight: 1.15, textWrap: "balance" }}>{p.title}</div>
              </div>
              <Spot
                video={p.video}
                id={p.hero}
                at={inAt(i)}
                dim={i === 0 ? undefined : startsAt}
                left={cx - ART_W / 2}
                top={base - bh - ART_H - 8}
                width={ART_W}
                height={ART_H}
                phase={i * 23}
                amp={3}
              />
            </React.Fragment>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: y(LINE_Y),
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, figureAt - 2, 12) * (1 - ease(frame, everyAt - 12, 10)),
          }}
        >
          Each video: the harder questions, in figures,{" "}
          <span style={{ opacity: ease(frame, quickAt - 2, 12) }}>then, in most, a quick round of one-line answers.</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: y(LINE_Y),
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, everyAt - 2, 12) * (1 - ease(frame, nextAt - 16, 10)),
          }}
        >
          Every topic page: concept checks
          <span style={{ opacity: ease(frame, browserAt - 2, 10) }}>
            {" "}
            · {CHALLENGE_PAGE_NAMES} pages: challenges that run in the browser
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: y(LINE_Y + 44),
            ...note(28, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, bankAt - 2, 10) * (1 - ease(frame, nextAt - 16, 10)),
          }}
        >
          A bank of <span style={{ fontWeight: 650 }}>{BANK} multiple-choice questions</span>, for the whole track
        </div>

        {/* One small spot at a time, under the last column and beside the
            line it illustrates, each gone as its line fades: a stopwatch for
            the quick round, then a laptop for the challenges that run in the
            browser. 853 by 1018 and 1005 by 832. */}
        <Spot id="de-interview-stopwatch" at={quickAt} out={everyAt - 12} left={SPOT_CX - 65} top={base + 133} width={130} height={155} phase={20} amp={3} />
        <Spot id="de-interview-laptop" at={browserWordAt} out={nextAt - 16} left={SPOT_CX - 92} top={base + 133} width={185} height={153} phase={50} amp={3} />

        <NextLine at={nextAt} x={LEFT} y={y(LINE_Y) + h(6)} width={1000}>
          SQL, window functions and query patterns
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
