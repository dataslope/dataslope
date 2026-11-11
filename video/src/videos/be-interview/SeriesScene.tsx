import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { during, ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { NextLine, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BANK, CHALLENGE_LABELS, CHALLENGE_PAGE_NAMES, PARTS, QUESTIONS } from "./data";
import { Drift, Flow, Headline, Kicker, Spot } from "./parts";

const COL_W = 176;
const GAP = 12;
const LEFT = (1920 - (PARTS.length * COL_W + (PARTS.length - 1) * GAP)) / 2;
/** The bars' baseline and the tallest bar's height, in layout units. */
const BASE = 680;
const BAR_MAX = 230;
const BAR_W = 100;
/** The count over each bar, and the hero standing on it, in px. */
const COUNT_H = 36;
const ART_W = 100;
const ART_H = 74;
/** The Python page's two grey lines, top left, over the short bars of
 *  Parts 1 to 3; the arrow leaves from their right, at their middle. */
const GHOST_Y = 300;
const GHOST_W = 640;
const GHOST_H = 80;
/** The practice lines and the bridge, under the names. */
const LINE_Y = 780;

const MOST = Math.max(...PARTS.map((p) => p.questions));

/** "Algorithms, object design and databases". */
const challengeNames = (() => {
  const names = CHALLENGE_PAGE_NAMES.map((p, i) => (i ? CHALLENGE_LABELS[p].toLowerCase() : CHALLENGE_LABELS[p]));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
})();

/**
 * The series as a chart: "decisions, not syntax" as the headline, then the
 * nine topic videos in series order, each a column with its part number and
 * title under the baseline, a bar for the questions it answers and its own
 * watercolor hero standing on the bar. The names ink in along the baseline as
 * "nine videos" is said, and each bar rises, its hero with it, as the
 * narration names that video. Then the Python fundamentals page, which the
 * series leaves out, as a grey outline with an arrow into Part 5, where its
 * design questions are answered; the practice on the pages; and the bridge,
 * which lights Parts 1 and 2 on "design" and dims the rest.
 */
export const SeriesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("series").from;
  const decisionsAt = n.word("series", "argues decisions");
  const syntaxAt = n.word("series", "not syntax");
  const nineAt = n.word("series-parts", "nine videos");
  const totalAt = n.word("series-parts", "a hundred and twenty-five");
  const onceAt = n.word("series-parts", "each once");
  const riseAt = [
    n.word("series-parts", "system design in two parts"),
    n.word("series-parts", "system design in two parts") + 8,
    n.word("series-parts", "API design"),
    n.word("series-parts", "databases"),
    n.word("series-parts", "concurrency"),
    n.word("series-parts", "designing objects"),
    n.word("series-parts", "reading code"),
    n.word("series-parts", "algorithms"),
    n.word("series-parts", "the AI-allowed round"),
  ];
  const pythonAt = n.word("series-python", "The Python fundamentals page");
  const leftOutAt = n.word("series-python", "is left out");
  const designQAt = n.word("series-python", "Its design questions");
  const underAt = n.word("series-python", "covered under concurrency");
  const concurrencyAt = n.word("series-python", "concurrency");
  const topics = [
    { text: "threads", at: n.word("series-python", "threads") },
    { text: "processes", at: n.word("series-python", "processes") },
    { text: "async", at: n.word("series-python", "async") },
    { text: "the GIL", at: n.word("series-python", "the global interpreter lock") },
  ];
  const checksAt = n.word("practice", "Every topic page has concept checks");
  const threeAt = n.word("practice", "three of them add challenges");
  const bankAt = n.word("practice", "a bank of a hundred and ten");
  const practiceFrom = n.beat("practice").from;
  const designAt = n.word("next", "was design");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;

  const colX = (i: number) => LEFT + i * (COL_W + GAP);
  const base = y(BASE);
  const nameAt = (i: number) => nineAt + 2 + i * 3;
  const barH = (i: number) => h(BAR_MAX) * (PARTS[i].questions / MOST);
  const concurrency = PARTS.findIndex((p) => p.video === "be-concurrency");
  const lit = (i: number) =>
    i === concurrency ? during(frame, concurrencyAt - 2, practiceFrom - 4, 10) : i <= 1 ? ease(frame, designAt - 2, 12) : 0;
  const dimmed = (i: number) => (i <= 1 ? 0 : ease(frame, designAt, 16) * 0.55);

  const ghostTop = y(GHOST_Y);
  const ghostMid = ghostTop + h(GHOST_H) / 2;
  const heroTop = (i: number) => base - barH(i) - COUNT_H - 8 - ART_H;
  const python = ease(frame, pythonAt - 2, 14);

  return (
    <AbsoluteFill>
      {PARTS.map((p, i) => (
        <Sfx key={p.n} name="el-tap" at={nameAt(i)} level={-37} />
      ))}
      {PARTS.map((p, i) => (
        <Sfx key={`pop-${p.n}`} name="el-pop" at={riseAt[i]} level={i === 1 ? -33 : -30} />
      ))}
      <Sfx name="el-tap" at={pythonAt} level={-33} />
      <Sfx name="el-pencil" at={underAt} level={-35} />
      <Sfx name="el-tap" at={checksAt} level={-34} />
      <Sfx name="el-tap" at={bankAt} level={-34} />
      <Sfx name="el-chime" at={nextAt} level={-34} />

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>The series</Kicker>
        <Headline lead="Decisions," turn="not syntax." at={decisionsAt} turnAt={syntaxAt} size={62} />
        <div style={{ position: "absolute", left: 96, top: y(234), ...note(28, INK), whiteSpace: "nowrap" }}>
          <span style={{ opacity: ease(frame, nineAt - 2, 12) }}>Nine videos, </span>
          <span style={{ opacity: ease(frame, totalAt - 2, 12) }}>
            <span style={{ fontWeight: 500 }}>
              <Num>{QUESTIONS}</Num> of the track&apos;s questions
            </span>
            ,{" "}
          </span>
          <span style={{ opacity: ease(frame, onceAt - 2, 12) }}>each answered once</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: colX(0) - 8,
            width: colX(PARTS.length - 1) + COL_W - colX(0) + 16,
            top: base,
            height: 1.5,
            background: HAIRLINE,
            opacity: ease(frame, nineAt, 16),
          }}
        />

        {PARTS.map((p, i) => {
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
                  height: 66,
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
                  fontWeight: 500,
                  lineHeight: `${COUNT_H}px`,
                  opacity: ease(frame, riseAt[i] + 10, 10) * keep,
                }}
              >
                <Num>{p.questions}</Num>
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
                <div style={{ ...note(22, INK), fontWeight: 500, marginTop: 2, lineHeight: 1.15, whiteSpace: "nowrap" }}>{p.title}</div>
              </div>
              <Spot
                video={p.video}
                id={p.hero}
                at={riseAt[i]}
                dim={i <= 1 ? undefined : designAt}
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

        {/* The page the series leaves out, as two lines of grey text (no
            box), and the arrow that takes its design questions into Part 5. */}
        {python > 0 ? (
          <div
            style={{
              position: "absolute",
              left: LEFT,
              top: ghostTop + 8,
              width: GHOST_W,
              opacity: python * (1 - dimmed(2)),
            }}
          >
            <div style={{ ...note(24, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
              Python fundamentals page<span style={{ opacity: ease(frame, leftOutAt - 2, 12) }}>, left out: it&apos;s syntax</span>
            </div>
            <div style={{ ...note(22, INK_SOFT), marginTop: 14, whiteSpace: "nowrap", opacity: ease(frame, designQAt - 2, 12) }}>
              Its design questions:{" "}
              {topics.map((t, k) => (
                <span key={t.text} style={{ opacity: ease(frame, t.at - 2, 10) }}>
                  {t.text}
                  {k < topics.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <Flow
          points={[
            [LEFT + GHOST_W + 8, ghostMid],
            [colX(concurrency) + COL_W / 2, ghostMid],
            [colX(concurrency) + COL_W / 2, heroTop(concurrency) - 42],
          ]}
          at={underAt}
          dur={16}
          color={INK_SOFT}
          width={2}
          opacity={1 - dimmed(2)}
        />

        {/* The practice on the pages, then the bridge in its place. */}
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: y(LINE_Y),
            ...note(26, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, checksAt - 2, 12) * (1 - ease(frame, nextAt - 16, 10)),
          }}
        >
          Every topic page: concept checks.
          <span style={{ opacity: ease(frame, threeAt - 2, 10) }}> {challengeNames}: challenges that run in the browser.</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: y(LINE_Y) + 58,
            ...note(26, INK),
            whiteSpace: "nowrap",
            opacity: ease(frame, bankAt - 2, 10) * (1 - ease(frame, nextAt - 16, 10)),
          }}
        >
          A bank of <span style={{ fontWeight: 500 }}><Num>{BANK}</Num> multiple-choice questions</span> for the whole track.
        </div>

        <NextLine at={nextAt} x={LEFT} y={y(LINE_Y) + 6} width={1000}>
          approaching system design
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
