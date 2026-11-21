import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, NextLine, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { BANK, CHALLENGES, CHECK_PAGES, PAGE_QUESTIONS, PARTS, QUESTIONS, TOPIC_PAGES, questionsOf } from "./data";
import { Drift, Headline, Kicker, LEFT_X, Mark, Spot } from "./parts";

/** The ten columns, edge to edge across the page, in px. */
const COL_W = 170;
const GAP = 6;
const LEFT = (1920 - (PARTS.length * COL_W + (PARTS.length - 1) * GAP)) / 2;
const colX = (i: number) => LEFT + i * (COL_W + GAP);
/** Layout units down: the four decisions, one to a line in the serif, while
 *  they are said; then the count and its note under the headline, the bars'
 *  baseline and the tallest bar, and the practice lines (and the bridge in
 *  their place) under the names. */
const PHRASES_Y = 300;
const PHRASE_STEP = 76;
const PHRASE_SIZE = 44;
const COUNT_Y = 236;
const NOTE_Y = 276;
const BASE = 694;
const BAR_MAX = 206;
const LINE_Y = 778;
/** px: the bar, the count over it and the hero standing on the count. */
const BAR_W = 96;
const COUNT_H = 36;
const ART_W = 130;
const ART_H = 100;

const MOST = Math.max(...PARTS.map(questionsOf));

type Phrase = { text: string; at: number; out: number };

/** One of the four decisions, a line of its own in the serif, inking and lit
 *  as it is said; all four leave together on `gone`, rising, as the count
 *  and the chart take the page. */
const PhraseLine: React.FC<{ p: Phrase; top: number; gone: number }> = ({ p, top, gone }) => (
  <Ink at={p.at - 2} dur={16} out={gone} outDur={14} style={{ left: LEFT_X, top, ...headline(PHRASE_SIZE), whiteSpace: "nowrap" }}>
    <span style={{ display: "inline-block", marginLeft: "-0.14em" }}>
      <Mark at={p.at} out={p.out}>
        {p.text}
      </Mark>
    </span>
  </Ink>
);

/** The red panda, back for the opening of the closing scene, where the
 *  hook had it: right of the four decisions, until the chart takes the page. */
const PANDA_X = 1400;
const PANDA_TOP = 280;
const PANDA_W = 360;
const PANDA_H = 503;

/**
 * The series as a chart, after the Backend overview's: "Decisions, and how
 * you'd know" as the headline, with the four things the series argues one to
 * a line under it, each lit as it is said, and the red panda back beside
 * them. They give way to the count: the
 * track's pages ask 167 questions, one answered here and 166 by the ten
 * topic videos, each once (a question two pages share is answered once for
 * both). The ten videos ink in along the baseline as the count starts; on
 * "the rest" each one's share of the 166 rises in pale blue, and each bar,
 * the page questions that video answers, fills it in solid with its own
 * watercolor hero on it as the narration names it. Then the practice on the
 * pages, and the bridge, which lights Part 1 on "data it hasn't seen" and
 * dims the rest.
 */
export const SeriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("series").from;
  const decisionsAt = n.word("series", "argues the decisions");
  const knowAt = n.word("series", "how you'd know it broke");
  const phraseAt = [
    n.word("series", "why a model fails on new data"),
    n.word("series", "which loss fits a problem"),
    n.word("series", "what serving costs"),
    knowAt,
  ];
  const countFrom = n.beat("series-count").from;
  const phrases: Phrase[] = [
    { text: "Why a model fails on new data", at: phraseAt[0], out: phraseAt[1] },
    { text: "Which loss fits a problem", at: phraseAt[1], out: phraseAt[2] },
    { text: "What serving costs", at: phraseAt[2], out: phraseAt[3] },
    { text: "How you’d know it broke", at: phraseAt[3], out: countFrom - 10 },
  ];
  const countAt = n.word("series-count", "a hundred and sixty-seven");
  const hereAt = n.word("series-count", "This video answers one");
  const restAt = n.word("series-count", "Ten more answer the rest");
  const onceAt = n.word("series-count", "each once");
  const shareAt = n.word("series-count", "a question two pages share");
  const riseAt = [
    n.word("series-parts", "First generalization"),
    n.word("series-parts", "the models and how they learn"),
    n.word("series-parts", "coding"),
    n.word("series-parts", "statistics"),
    n.word("series-parts", "deep learning"),
    n.word("series-parts", "and NLP"),
    n.word("series-parts", "Then system design"),
    n.word("series-parts", "shipping and monitoring models"),
    n.word("series-parts", "serving them"),
    n.word("series-parts", "evaluating them"),
  ];
  const checksAt = n.word("practice", "Every topic page has concept checks");
  const challengesAt = n.word("practice", "five challenges run in the browser");
  const bankAt = n.word("practice", "a hundred and ten multiple-choice questions");
  const seenAt = n.word("next", "whether a model works on data it hasn't seen");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;

  const base = y(BASE);
  // The decisions give way to the count and the chart in the pause before
  // the count, and the ten videos ink in along the baseline as it starts.
  const phrasesOut = countFrom - 10;
  const nameAt = (i: number) => countFrom + 4 + i * 3;
  const barH = (i: number) => h(BAR_MAX) * (questionsOf(PARTS[i]) / MOST);
  const first = PARTS.findIndex((p) => p.video === "mle-generalization");
  const lit = (i: number) => (i === first ? ease(frame, seenAt - 2, 12) : 0);
  const dimmed = (i: number) => (i === first ? 0 : ease(frame, seenAt, 16) * 0.55);
  const practiceOut = 1 - ease(frame, nextAt - 16, 10);

  return (
    <AbsoluteFill>
      {phrases.map((p) => (
        <Sfx key={p.text} name="el-tap" at={p.at} level={-35} />
      ))}
      <Sfx name="el-tap" at={countAt} level={-31} />
      {PARTS.map((p, i) => (
        <Sfx key={p.n} name="el-tap" at={nameAt(i)} level={-38} />
      ))}
      <Sfx name="el-whoosh" at={restAt} level={-37} />
      {PARTS.map((p, i) => (
        <Sfx key={`pop-${p.n}`} name="el-pop" at={riseAt[i]} level={-31} />
      ))}
      <Sfx name="el-tap" at={checksAt} level={-34} />
      <Sfx name="el-tap" at={bankAt} level={-34} />
      <Sfx name="el-pencil" at={seenAt} level={-36} />
      <Sfx name="el-chime" at={nextAt} level={-33} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>The series</Kicker>
        <Headline lead="Decisions," turn="and how you’d know." at={decisionsAt} turnAt={knowAt} size={62} />
        <Spot id="mle-interview-red-panda" at={from - 20} out={phrasesOut} left={PANDA_X} top={y(PANDA_TOP)} width={PANDA_W} height={PANDA_H} amp={4} />
        {phrases.map((p, k) => (
          <PhraseLine key={p.text} p={p} top={y(PHRASES_Y) + k * h(PHRASE_STEP)} gone={phrasesOut} />
        ))}

        {/* The count, one line, each part of it as it is said; the note on
            twin questions under it. */}
        <div style={{ position: "absolute", left: LEFT_X, top: y(COUNT_Y), ...note(28, INK), whiteSpace: "nowrap" }}>
          <span style={{ opacity: ease(frame, countAt - 2, 12) }}>
            The track’s pages ask{" "}
            <span style={{ color: BLUE_INK, fontWeight: 600 }}>
              <Num>{PAGE_QUESTIONS}</Num> questions
            </span>
            :{" "}
          </span>
          <span style={{ opacity: ease(frame, hereAt - 2, 12) }}>
            <Num>{PAGE_QUESTIONS - QUESTIONS}</Num> answered here,{" "}
          </span>
          <span style={{ opacity: ease(frame, restAt - 2, 12) }}>
            <span style={{ color: BLUE_INK, fontWeight: 600 }}>
              <Num>{QUESTIONS}</Num>
            </span>{" "}
            in the ten videos below
          </span>
          <span style={{ opacity: ease(frame, onceAt - 2, 12) }}>, each once</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: LEFT_X,
            top: y(NOTE_Y),
            ...note(22, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, shareAt - 2, 12),
          }}
        >
          A question two pages share is answered once for both
        </div>

        <div
          style={{
            position: "absolute",
            left: colX(0) - 8,
            width: colX(PARTS.length - 1) + COL_W - colX(0) + 16,
            top: base,
            height: 1.5,
            background: HAIRLINE,
            opacity: ease(frame, countFrom, 16),
          }}
        />

        {PARTS.map((p, i) => {
          const pIn = ease(frame, nameAt(i) - 2, 14);
          if (pIn <= 0) return null;
          const grow = ease(frame, riseAt[i], 18);
          const bh = barH(i) * grow;
          // The share of the 166 each video takes, drawn pale as "the rest"
          // is said; the bar fills it in solid as the video is named.
          const ghost = barH(i) * ease(frame, restAt + i * 3, 18);
          const cx = colX(i) + COL_W / 2;
          const keep = 1 - dimmed(i);
          return (
            <React.Fragment key={p.n}>
              {/* Lit: the part the bridge points at, behind its name. */}
              <div
                style={{
                  position: "absolute",
                  left: colX(i) + 4,
                  width: COL_W - 8,
                  top: base + 8,
                  height: 66,
                  borderRadius: 8,
                  background: HIGHLIGHT,
                  opacity: lit(i),
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: cx - BAR_W / 2,
                  top: base - ghost,
                  width: BAR_W,
                  height: ghost,
                  borderRadius: "5px 5px 0 0",
                  background: ds("blue", 100),
                  opacity: ghost > 0.5 ? keep : 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: cx - BAR_W / 2,
                  top: base - bh,
                  width: BAR_W,
                  height: bh,
                  borderRadius: "5px 5px 0 0",
                  background: BAR,
                  // No bar at all before it grows: a rounded box of height 0
                  // still draws a sliver.
                  opacity: bh > 0.5 ? keep : 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: colX(i),
                  width: COL_W,
                  // The count and the hero stand on the bar's full height,
                  // where the pale share already reaches, as it fills in.
                  top: base - barH(i) - COUNT_H,
                  textAlign: "center",
                  ...note(26, BLUE_INK),
                  fontWeight: 600,
                  lineHeight: `${COUNT_H}px`,
                  opacity: ease(frame, riseAt[i] + 10, 10) * keep,
                }}
              >
                <Num>{questionsOf(p)}</Num>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: colX(i),
                  width: COL_W,
                  top: base + 14,
                  textAlign: "center",
                  opacity: pIn * keep,
                  transform: `translateY(${(1 - pIn) * 10}px)`,
                }}
              >
                <div style={label(20, BLUE_INK)}>
                  Part <Num>{p.n}</Num>
                </div>
                <div style={{ ...note(21, INK), fontWeight: 600, marginTop: 2, lineHeight: 1.15, whiteSpace: "nowrap" }}>{p.title}</div>
              </div>
              <Spot
                video={p.video}
                id={p.hero}
                at={riseAt[i]}
                dim={i === first ? undefined : seenAt}
                left={cx - ART_W / 2}
                top={base - barH(i) - COUNT_H - 8 - ART_H}
                width={ART_W}
                height={ART_H}
                phase={i * 23}
                amp={3}
                fit="50% 100%"
              />
            </React.Fragment>
          );
        })}

        {/* The practice on the pages, then the bridge in its place. */}
        <div
          style={{
            position: "absolute",
            left: LEFT_X,
            top: y(LINE_Y),
            ...note(26, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, checksAt - 2, 12) * practiceOut,
          }}
        >
          Concept checks on {CHECK_PAGES === TOPIC_PAGES ? "every" : <Num>{CHECK_PAGES}</Num>} topic page.
          <span style={{ opacity: ease(frame, challengesAt - 2, 10) }}>
            {" "}
            <Num>{CHALLENGES}</Num> challenges that run in the browser.
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left: LEFT_X,
            top: y(LINE_Y) + 50,
            ...note(26, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, bankAt - 2, 10) * practiceOut,
          }}
        >
          <span style={{ fontWeight: 600 }}>
            <Num>{BANK}</Num> multiple-choice questions
          </span>{" "}
          for the whole track.
        </div>

        <NextLine at={nextAt} x={LEFT_X} y={y(LINE_Y) + 6} width={1000}>
          generalization and evaluation
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
