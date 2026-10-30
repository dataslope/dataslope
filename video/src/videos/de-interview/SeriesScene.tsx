import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, PAPER, headline, label, note } from "../../editorial/style";
import { Ink, Num, NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANK, CHALLENGE_PAGES, PARTS, QUESTIONS } from "./data";
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

const MOST = Math.max(...PARTS.map((p) => p.questions));

/**
 * The series as a chart: the eleven topic videos in the track's order, each a
 * column with its hero, its part number and title under the baseline, and a
 * bar for the questions it answers. The heroes ink in along the track as
 * "eleven videos" is said, and ride up on their bars as the total is said.
 * SQL's two videos and data modeling's two are marked as pairs; then how each
 * video runs, the practice on the pages (concept checks on every one,
 * challenges on three, a bank of multiple-choice questions for the whole
 * track), and the bridge, which lights Part 1.
 */
export const SeriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("series").from;
  const elevenAt = n.word("series", "eleven videos");
  const totalAt = n.word("series", "a hundred and fifty-seven questions");
  const onceAt = n.word("series", "each answered once");
  const sqlAt = n.word("series", "Sequel and data modeling");
  const modelAt = n.word("series", "data modeling take two videos");
  const figureAt = n.word("series-how", "the questions worth a figure");
  const quickAt = n.word("series-how", "a quick round");
  const everyAt = n.word("practice", "Every topic page has concept checks");
  const browserAt = n.word("practice", "three add challenges");
  const bankAt = n.word("practice", "a bank of a hundred and ten");
  const startsAt = n.word("next", "the series starts there");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;

  const colX = (i: number) => LEFT + i * (COL_W + GAP);
  const base = y(BASE);
  const inAt = (i: number) => elevenAt + 3 + i * 3;
  const growAt = (i: number) => totalAt + i * 2;
  const pairs = [
    { a: 0, b: 1, at: sqlAt },
    { a: 2, b: 3, at: modelAt },
  ];
  const barH = (i: number) => h(BAR_MAX) * (PARTS[i].questions / MOST);

  return (
    <AbsoluteFill>
      {PARTS.map((p, i) => (
        <Sfx key={p.n} name="el-tap" at={inAt(i)} level={-37} />
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

        {pairs.map((pr) => {
          const q = ease(frame, pr.at, 14) * (1 - ease(frame, figureAt - 6, 14));
          if (q <= 0) return null;
          const top = Math.min(base - barH(pr.a), base - barH(pr.b)) - ART_H - 24;
          return (
            <div
              key={pr.a}
              style={{
                position: "absolute",
                left: colX(pr.a) - 4,
                top,
                width: colX(pr.b) + COL_W - colX(pr.a) + 8,
                height: base + h(118) - top,
                borderRadius: 16,
                background: HIGHLIGHT,
                opacity: q,
              }}
            />
          );
        })}

        <div
          style={{
            position: "absolute",
            left: colX(0) - 8,
            width: colX(PARTS.length - 1) + COL_W - colX(0) + 16,
            top: base,
            height: 1.5,
            background: HAIRLINE,
            opacity: ease(frame, elevenAt - 2, 16),
          }}
        />

        {PARTS.map((p, i) => {
          const pIn = ease(frame, inAt(i) - 2, 14);
          if (pIn <= 0) return null;
          const grow = ease(frame, growAt(i), 22);
          const bh = barH(i) * grow;
          const lit = i === 0 ? ease(frame, startsAt - 2, 12) : 0;
          const dim = i === 0 ? 0 : ease(frame, startsAt, 16) * 0.5;
          const cx = colX(i) + COL_W / 2;
          return (
            <React.Fragment key={p.n}>
              {lit > 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: colX(i) - 4,
                    top: base - barH(i) - ART_H - 24,
                    width: COL_W + 8,
                    height: barH(i) + ART_H + 24 + h(118),
                    borderRadius: 16,
                    background: HIGHLIGHT,
                    opacity: lit,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "absolute",
                  left: cx - BAR_W / 2,
                  top: base - bh,
                  width: BAR_W,
                  height: bh,
                  borderRadius: "8px 8px 0 0",
                  background: BAR,
                  opacity: 1 - dim,
                  display: "flex",
                  justifyContent: "center",
                  paddingTop: 8,
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                <span style={{ ...label(24, PAPER), fontWeight: 700, opacity: ease(frame, growAt(i) + 14, 10) }}>
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
          Each video: the questions worth a figure,{" "}
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
            · <Num>{CHALLENGE_PAGES}</Num> pages: challenges that run in the browser
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

        <NextLine at={nextAt} x={LEFT} y={y(LINE_Y) + h(6)} width={1000}>
          SQL, window functions and query patterns
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
