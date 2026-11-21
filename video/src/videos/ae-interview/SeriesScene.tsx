import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { NextLine, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ALL_QUESTIONS, BANK, CHALLENGE_LABELS, CHALLENGE_PAGE_NAMES, QUESTIONS, TOPIC_PARTS, questionsOf } from "./data";
import { Drift, Headline, Kicker, Spot } from "./parts";

const COL_W = 176;
const GAP = 12;
const LEFT = (1920 - (TOPIC_PARTS.length * COL_W + (TOPIC_PARTS.length - 1) * GAP)) / 2;
const RIGHT = 1920 - LEFT;
/** The bars' baseline and the tallest bar's height, in layout units. */
const BASE = 613;
const BAR_MAX = 176;
const BAR_W = 100;
/** The count over each bar, and the hero standing on it, in px: 100 wide,
 *  so two heroes side by side keep 88px between them. */
const COUNT_H = 36;
const ART_W = 100;
const ART_H = 76;
/** The names' block under the baseline holds two lines of title, so a title
 *  that wraps does not push the line under it. */
const NAMES_H = 92;
/** The total under the names, then the practice and the bridge. */
const TOTAL_Y = 727;
const PRACTICE_Y = 793;
/** The practice's three columns and the hairline between each two. */
const PRACTICE_GAP = 120;

const MOST = Math.max(...TOPIC_PARTS.map(questionsOf));

/** "Dimensional modeling, advanced SQL, data warehousing". */
const challengeNames = CHALLENGE_PAGE_NAMES.map((p, i) => (i ? CHALLENGE_LABELS[p].replace(/^\w/, (c) => c.toLowerCase()) : CHALLENGE_LABELS[p])).join(", ");

/** One column of the practice: its name, and a line under it. It holds its
 *  place before it inks, so the row never reflows. */
const Practice: React.FC<{ at: number; title: React.ReactNode; children: React.ReactNode }> = ({ at, title, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 14);
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
      <div style={{ ...note(26, INK), whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ ...note(22, INK_SOFT), marginTop: 10, whiteSpace: "nowrap" }}>{children}</div>
    </div>
  );
};

/** The hairline between two practice columns, as tall as their text,
 *  inking in with the column to its right. */
const Rule: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  return <div style={{ width: 1, alignSelf: "stretch", background: HAIRLINE, opacity: ease(frame, at - 2, 14) }} />;
};

/**
 * The series as a chart. "Decisions, and how they fail" is the headline,
 * with code only as evidence under it. Then the nine topic videos in series
 * order, each a column with its part number and title under the baseline, a
 * bar for the questions it answers and its own watercolor hero standing on
 * the bar. The names ink in along the baseline as "This series" is said, and
 * each bar rises, its hero with it, as the narration names that video. Under
 * the names, the total they answer, 147, and on the right the one this
 * overview answers. Then the practice on the pages, as three columns, and the
 * bridge, which lights Part 1 on "grain" and dims the rest.
 */
export const SeriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("series").from;
  const decisionsAt = n.word("series", "modeling decisions");
  const failAt = n.word("series", "the ways they fail");
  const codeAt = n.word("series", "Code comes on screen");
  const evidenceAt = n.word("series", "only as evidence");
  // The map of the nine is drawn as the series is named, so the headline
  // never stands over an empty page; the bars wait for "series-list".
  const mapAt = n.word("series", "This series");
  const totalAt = n.word("series-parts", "hundred and forty-seven");
  const onceAt = n.word("series-parts", "each once");
  const riseAt = [
    n.word("series-list", "facts and grain"),
    n.word("series-list", "dimensions that change"),
    n.word("series-list", "how dbt builds a project"),
    n.word("series-list", "incremental models"),
    n.word("series-list", "advanced SQL"),
    n.word("series-list", "warehouses and what they cost"),
    n.word("series-list", "testing"),
    n.word("series-list", "metrics"),
    n.word("series-list", "the assistants that read them"),
  ];
  const checksAt = n.word("practice", "concept checks");
  const challengesAt = n.word("practice", "three of them add challenges");
  const bankAt = n.word("practice", "a hundred and ten");
  const grainAt = n.word("next", "its grain");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;

  const colX = (i: number) => LEFT + i * (COL_W + GAP);
  const base = y(BASE);
  const nameAt = (i: number) => mapAt + 2 + i * 3;
  const barH = (i: number) => h(BAR_MAX) * (questionsOf(TOPIC_PARTS[i]) / MOST);
  const lit = (i: number) => (i === 0 ? ease(frame, grainAt - 2, 12) : 0);
  const dimmed = (i: number) => (i === 0 ? 0 : ease(frame, grainAt, 16) * 0.55);
  const practiceOut = 1 - ease(frame, nextAt - 16, 10);

  return (
    <AbsoluteFill>
      {TOPIC_PARTS.map((p, i) => (
        <Sfx key={p.n} name="el-tap" at={nameAt(i)} level={-37} />
      ))}
      {TOPIC_PARTS.map((p, i) => (
        <Sfx key={`pop-${p.n}`} name="el-pop" at={riseAt[i]} level={-30} />
      ))}
      <Sfx name="el-tap" at={totalAt} level={-33} />
      <Sfx name="el-tap" at={checksAt} level={-34} />
      <Sfx name="el-tap" at={challengesAt} level={-34} />
      <Sfx name="el-tap" at={bankAt} level={-34} />
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>The series</Kicker>
        <Headline lead="Decisions," turn="and how they fail." at={decisionsAt} turnAt={failAt} size={62} />
        <div style={{ position: "absolute", left: 96, top: y(229), ...note(26, INK_SOFT), whiteSpace: "nowrap", opacity: ease(frame, codeAt - 2, 12) }}>
          Code only <span style={{ opacity: ease(frame, evidenceAt - 2, 12) }}>as evidence</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: colX(0) - 8,
            width: RIGHT - LEFT + 16,
            top: base,
            height: 1.5,
            background: HAIRLINE,
            opacity: ease(frame, mapAt, 16),
          }}
        />

        {TOPIC_PARTS.map((p, i) => {
          const pIn = ease(frame, nameAt(i) - 2, 14);
          if (pIn <= 0) return null;
          const grow = ease(frame, riseAt[i], 18);
          const bh = barH(i) * grow;
          const cx = colX(i) + COL_W / 2;
          const keep = 1 - dimmed(i);
          return (
            <React.Fragment key={p.n}>
              {/* Lit: the column the narration points at, behind its name. */}
              <div
                style={{
                  position: "absolute",
                  left: colX(i) + 4,
                  width: COL_W - 8,
                  top: base + 8,
                  height: NAMES_H - 10,
                  borderRadius: 10,
                  background: HIGHLIGHT,
                  opacity: lit(i),
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: cx - BAR_W / 2,
                  top: base - bh,
                  width: BAR_W,
                  height: bh,
                  borderRadius: "8px 8px 0 0",
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
                  top: base - bh - COUNT_H,
                  textAlign: "center",
                  ...note(26, BLUE_INK),
                  lineHeight: `${COUNT_H}px`,
                  opacity: ease(frame, riseAt[i] + 10, 10) * keep,
                }}
              >
                <Num>{questionsOf(p)}</Num>
              </div>
              <div
                style={{
                  position: "absolute",
                  left: colX(i) + 4,
                  width: COL_W - 8,
                  top: base + 14,
                  textAlign: "center",
                  opacity: pIn * keep,
                  transform: `translateY(${(1 - pIn) * 10}px)`,
                }}
              >
                <div style={label(20, BLUE_INK)}>
                  Part <Num>{p.n}</Num>
                </div>
                <div style={{ ...note(22, INK), marginTop: 2, lineHeight: 1.15, textWrap: "balance" }}>{p.title}</div>
              </div>
              <Spot
                video={p.video}
                id={p.hero}
                at={riseAt[i]}
                dim={i === 0 ? undefined : grainAt}
                left={cx - ART_W / 2}
                top={base - bh - COUNT_H - 8 - ART_H}
                width={ART_W}
                height={ART_H}
                phase={i * 23}
                amp={3}
              />
            </React.Fragment>
          );
        })}

        {/* The total the nine answer, and the one this overview does. */}
        <div
          style={{
            position: "absolute",
            left: LEFT,
            width: RIGHT - LEFT,
            top: y(TOTAL_Y),
            display: "flex",
            justifyContent: "space-between",
            ...note(26, INK),
            whiteSpace: "nowrap",
          }}
        >
          <span>
            <span style={{ opacity: ease(frame, totalAt - 2, 12) }}>
              <Num>{QUESTIONS}</Num> questions
            </span>
            <span style={{ color: INK_SOFT, opacity: ease(frame, onceAt - 2, 12) }}>, each answered once</span>
          </span>
          <span style={{ color: INK_SOFT, opacity: ease(frame, totalAt + 24, 12) }}>
            <span style={{ color: INK }}>
              +<Num>{ALL_QUESTIONS - QUESTIONS}</Num> here
            </span>
            , <Num>{ALL_QUESTIONS}</Num> in all
          </span>
        </div>

        {/* The practice on the pages, three columns, then the bridge in
            their place. */}
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: y(PRACTICE_Y),
            display: "flex",
            gap: PRACTICE_GAP / 2,
            alignItems: "stretch",
            opacity: practiceOut,
          }}
        >
          <Practice at={checksAt} title="Concept checks">
            On every topic page
          </Practice>
          <Rule at={challengesAt} />
          <Practice at={challengesAt} title="Challenges that run in the browser">
            {challengeNames}
          </Practice>
          <Rule at={bankAt} />
          <Practice
            at={bankAt}
            title={
              <>
                <Num>{BANK}</Num> multiple-choice questions
              </>
            }
          >
            One bank for the whole track
          </Practice>
        </div>

        <NextLine at={nextAt} x={LEFT} y={y(PRACTICE_Y) - 6} width={1000}>
          facts, dimensions and grain
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
