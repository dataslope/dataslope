import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { headline, INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ALSO_ON_TRACK, PROBES, ROUNDS } from "./data";
import { Drift, Kicker, LEFT_X, Mark, PartTag, RIGHT_X, Rule, Settle, Spot, Topics } from "./parts";

/** The three rounds, as three columns of one serif title each, a hairline
 *  centred in each gap. px across, layout units down. */
const COL_W = 400;
const COL_GAP = 80;
const colX = (c: number) => LEFT_X + c * (COL_W + COL_GAP);
const TITLE_Y = 184;
const TITLE_SIZE = 48;
/** The whiteboard marker (991 by 757), right of the third round, level
 *  with the titles. */
const MARKER_X = 1590;
const MARKER_W = 150;
const MARKER_H = 115;
/** The caption over the probes, then the probes as a ruled list: a hairline,
 *  28px under it the name (and the parts that answer it at the right end),
 *  the topics under the name. The track's other pages, set apart below. */
const CAPTION_Y = 266;
const LIST_Y = 318;
const ROW_STEP = 108;
const MORE_Y = LIST_Y + 4 * ROW_STEP + 30;
const NAME_SIZE = 28;
/** In px, from a row's rule. */
const NAME_DY = 28;
const TOPICS_DY = 78;

type Topic = { text: string; at: number };

/** One row of the list: its rule, its name (lit by the highlighter while
 *  its topics are said), its topics and the parts that answer it. */
const Row: React.FC<{
  top: number;
  name: string;
  at: number;
  litOut?: number;
  topics: Topic[];
  parts: readonly number[];
  partsAt: number;
  /** When the row's rule draws: the four probes' rules all draw on "four
   *  areas", so the list's shape is there before its rows fill it. */
  ruleAt?: number;
  soft?: boolean;
}> = ({ top, name, at, litOut, topics, parts, partsAt, ruleAt = at - 6, soft }) => (
  <>
    <Rule at={ruleAt} top={top} />
    <Settle at={at} top={top + NAME_DY} width={RIGHT_X - LEFT_X}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ ...note(NAME_SIZE, soft ? INK_SOFT : INK), fontWeight: 600, whiteSpace: "nowrap", marginLeft: "-0.14em" }}>
          {litOut === undefined ? <span style={{ margin: "0 0.14em" }}>{name}</span> : <Mark at={at} out={litOut}>{name}</Mark>}
        </span>
        <PartTag parts={parts} at={partsAt} />
      </div>
    </Settle>
    <Settle at={topics[0]?.at ?? at} top={top + TOPICS_DY}>
      <Topics items={topics} />
    </Settle>
  </>
);

/**
 * The rounds, from the track's index: three rounds as three columns (coding,
 * ML concepts, ML system design), the whiteboard marker beside the third;
 * then, on "four areas", the index's four probes as a ruled list, each name
 * lit yellow while it is read and its topics inking word by word, with the
 * parts that answer it at the right end, so the map of the series starts
 * here. The track's three other pages close the list, set apart.
 */
export const RoundsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("rounds").from;
  const threeAt = n.word("rounds", "Expect three rounds");
  const roundAt = [n.word("rounds", "coding"), n.word("rounds", "ML concepts"), n.word("rounds", "ML system design")];
  const fourAt = n.word("rounds", "probe four areas");

  const fundamentalsAt = n.word("rounds-probe", "ML fundamentals");
  const codingAt = n.word("rounds-probe", "Coding");
  const designAt = n.word("rounds-ops", "System design");
  const opsAt = n.word("rounds-ops", "And MLOps");
  const moreAt = n.word("rounds-more", "The track adds pages");
  const partToo = n.word("rounds-more", "gets a part too");
  const end = n.beat("rounds-more").to;

  const topics: Topic[][] = [
    [
      { text: "supervised vs unsupervised", at: n.word("rounds-probe", "supervised and unsupervised learning") },
      { text: "over/underfitting", at: n.word("rounds-probe", "over- and underfitting") },
      { text: "regularization", at: n.word("rounds-probe", "regularization") },
      { text: "metrics", at: n.word("rounds-probe", "metrics and leakage") },
      { text: "leakage", at: n.word("rounds-probe", "leakage") },
    ],
    [
      { text: "data structures and algorithms", at: n.word("rounds-probe", "data structures and algorithms") },
      { text: "NumPy", at: n.word("rounds-probe", "NumPy") },
      { text: "pandas", at: n.word("rounds-probe", "pandas") },
    ],
    [
      { text: "training and serving pipelines", at: n.word("rounds-ops", "training and serving pipelines") },
      { text: "feature stores", at: n.word("rounds-ops", "feature stores") },
      { text: "batch vs online inference", at: n.word("rounds-ops", "batch or online inference") },
      { text: "monitoring and drift", at: n.word("rounds-ops", "monitoring and drift") },
    ],
    [
      { text: "reproducibility", at: n.word("rounds-ops", "reproducibility") },
      { text: "versioning data and models", at: n.word("rounds-ops", "versioning data and models") },
      { text: "CI/CD", at: n.word("rounds-ops", "CI CD") },
      { text: "latency and cost", at: n.word("rounds-ops", "latency and cost") },
    ],
  ];
  const more: Topic[] = [
    { text: "statistics", at: n.word("rounds-more", "statistics") },
    { text: "deep learning", at: n.word("rounds-more", "deep learning") },
    { text: "NLP and LLMs", at: n.word("rounds-more", "NLP and LLMs") },
  ];
  const nameAt = [fundamentalsAt, codingAt, designAt, opsAt];
  // Each name stays lit while its topics are said, and gives the
  // highlighter to the next.
  const litOut = [codingAt, designAt, opsAt, moreAt];

  // The data's topic strings are what the rows show, word for word.
  for (const [i, p] of PROBES.entries()) {
    const shown = topics[i].map((t) => t.text).join(", ");
    if (shown !== p.topics) throw new Error(`the ${p.name} row shows "${shown}", data.ts says "${p.topics}"`);
  }
  if (more.map((t) => t.text).join(", ") !== ALSO_ON_TRACK.topics) {
    throw new Error(`the last row shows other topics than data.ts's "${ALSO_ON_TRACK.topics}"`);
  }

  const titleTop = y(TITLE_Y);

  return (
    <AbsoluteFill>
      {roundAt.map((at, i) => (
        <Sfx key={ROUNDS[i]} name="el-tap" at={at} level={-31} />
      ))}
      <Sfx name="el-pop" at={roundAt[2] + 6} level={-30} />
      <Sfx name="el-pencil" at={fourAt} level={-36} />
      {[...nameAt, moreAt].map((at) => (
        <Sfx key={at} name="el-tap" at={at} level={-30} />
      ))}
      {[...topics.flat(), ...more].map((t) => (
        <Sfx key={t.text} name="el-tap" at={t.at} level={-37} />
      ))}

      <Drift from={from} to={end + 40} scale={0.015}>
        <Kicker at={from}>The rounds</Kicker>

        {ROUNDS.map((r, i) => (
          <React.Fragment key={r}>
            {i > 0 ? <ColumnRule x={colX(i) - COL_GAP / 2} top={titleTop + 4} height={h(52)} at={roundAt[i]} /> : null}
            <Ink at={i === 0 ? Math.min(roundAt[0], threeAt + 20) : roundAt[i]} dur={18} style={{ left: colX(i), top: titleTop, whiteSpace: "nowrap", ...headline(TITLE_SIZE) }}>
              {r}
            </Ink>
          </React.Fragment>
        ))}
        <Spot id="mle-interview-marker" at={roundAt[2] + 6} left={MARKER_X} top={titleTop + 16 - MARKER_H / 2} width={MARKER_W} height={MARKER_H} amp={3} />

        <div
          style={{
            position: "absolute",
            left: LEFT_X,
            top: y(CAPTION_Y),
            ...label(24, INK_SOFT),
            whiteSpace: "nowrap",
            opacity: ease(frame, fourAt - 2, 12),
          }}
        >
          Four areas, probed across all three
        </div>

        {PROBES.map((p, i) => (
          <Row
            key={p.name}
            top={y(LIST_Y) + i * h(ROW_STEP)}
            name={p.name}
            at={nameAt[i]}
            litOut={litOut[i]}
            topics={topics[i]}
            parts={p.parts}
            partsAt={nameAt[i] + 14}
            ruleAt={fourAt + i * 4}
          />
        ))}
        <Row top={y(MORE_Y)} name={ALSO_ON_TRACK.name} at={moreAt} topics={more} parts={ALSO_ON_TRACK.parts} partsAt={partToo} soft />
      </Drift>
    </AbsoluteFill>
  );
};
