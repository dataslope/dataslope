import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Drift, Mark, X0 } from "./parts";

const BASE_Y = 700;
const BLOCK_W = 330;
const BLOCK_GAP = 24;
const LAYER_H = 62;
const LAYER_GAP = 14;

const WIDTH = 4 * BLOCK_W + 3 * BLOCK_GAP;

/** One part of the core loop: a word in the data blue, one of four spread
 *  along the base of the figure with a hairline between each pair. */
const Block: React.FC<{ at: number; children: React.ReactNode }> = ({ at: from, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  return (
    <div style={{ ...note(30, BLUE_INK), fontWeight: 650, whiteSpace: "nowrap", opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
      {children}
    </div>
  );
};

/** A vertical hairline between two of the core loop's parts, as tall as
 *  their text, inking in with the part to its right. */
const Divider: React.FC<{ at: number }> = ({ at: from }) => {
  const frame = useCurrentFrame();
  return <div style={{ width: 1, alignSelf: "stretch", background: HAIRLINE, opacity: ease(frame, from, 14) }} />;
};

/** One layer laid across the top of the loop: what is new, as a row of plain
 *  text set down from above, with a hairline drawing in under it (the
 *  lowest has none: space parts it from the loop). Yellow lights the ones the
 *  narration points at, behind their words. */
const Layer: React.FC<{ y: number; at: number; rule: boolean; lit?: number; dim?: number; children: React.ReactNode }> = ({
  y,
  at: from,
  rule,
  lit,
  dim,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const l = lit === undefined ? 0 : ease(frame, lit, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0) return null;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: X0,
          top: y,
          height: LAYER_H,
          display: "flex",
          alignItems: "center",
          ...note(28, INK),
          fontWeight: 600,
          whiteSpace: "nowrap",
          opacity: p * (1 - d),
          transform: `translateY(${(1 - p) * -12}px)`,
        }}
      >
        <span
          style={{
            padding: "2px 10px 3px",
            margin: "0 -10px",
            borderRadius: 4,
            background: l > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${100 * l}%, transparent)` : undefined,
          }}
        >
          {children}
        </span>
      </div>
      {rule ? (
        <div
          style={{
            position: "absolute",
            left: X0,
            top: y + LAYER_H + LAYER_GAP / 2,
            width: WIDTH * ease(frame, from + 2, 18),
            height: 1,
            background: HAIRLINE,
            opacity: 1 - d,
          }}
        />
      ) : null}
    </>
  );
};

/**
 * Question 1. The core loop as four words along the bottom (statistics,
 * experiments, SQL, product sense), and four layers set down on top of it as
 * they are named: evaluating LLM features, experiments where the treatment is
 * random, checking an assistant's work, and rounds with AI allowed or banned.
 * The recruiter advice sits beside the last of those, the rounds it is about.
 * The bridge then lights the first layer, which most of what follows is
 * about, and the next two, which questions 5 and 7 answer, each named beside
 * its layer; only the rounds layer dims.
 */
export const ChangedScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("changed").from;
  const qAt = n.word("changed", "Question");
  const textAt = n.word("changed", "How have data scientist interviews");
  const loopAt = n.word("changed", "The core loop hasn't");
  const blocks = [
    { text: "statistics", at: n.word("changed", "statistics") },
    { text: "experiments", at: n.word("changed", "experiments") },
    { text: "SQL", at: n.word("changed", "SQL") },
    { text: "product sense", at: n.word("changed", "product sense") },
  ];
  const layers = [
    { text: "evaluating LLM features", at: n.word("changed-layer", "evaluating features built on") },
    { text: "experiments where the treatment is itself random", at: n.word("changed-layer", "Experimenting on AI features") },
    { text: "checking code and analysis an assistant wrote", at: n.word("changed-layer", "Checking code and analysis") },
    { text: "rounds with AI allowed, or banned", at: n.word("changed-layer", "rounds where AI is allowed") },
  ];
  const askAt = n.word("changed-layer", "Ask the recruiter");
  const firstAt = n.word("measure-in", "the first of those");
  const nextAt = n.word("measure-in", "Questions five and seven");
  const end = n.beat("measure-in").to;

  const layerTop = (i: number) => y(BASE_Y) - (i + 1) * (LAYER_H + LAYER_GAP) - 6;
  const SIDE = X0 + 4 * BLOCK_W + 3 * BLOCK_GAP + 30;
  /** What each layer is in the rest of the video, named beside it as the bridge says so. */
  const where = [
    { text: "most of what follows", at: firstAt },
    { text: "question 5", at: nextAt },
    { text: "question 7", at: nextAt + 6 },
  ];

  return (
    <AbsoluteFill>
      {blocks.map((b) => (
        <Sfx key={b.text} name="el-tap" at={b.at} level={-34} />
      ))}
      {layers.map((l) => (
        <Sfx key={l.text} name="el-pop" at={l.at + 2} level={-34} />
      ))}
      <Sfx name="el-pencil" at={askAt + 4} level={-36} />
      <Sfx name="el-chime" at={firstAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          How have data scientist interviews changed with AI?
        </QuestionCard>

        {/* The core loop: four parts spread along the base, a hairline
            centred in each gap, and its name close under them. */}
        <div style={{ position: "absolute", left: X0, top: y(BASE_Y) + 24, width: WIDTH, display: "flex", justifyContent: "space-between", alignItems: "stretch" }}>
          {blocks.map((b, i) => (
            <React.Fragment key={b.text}>
              {i ? <Divider at={b.at - 2} /> : null}
              <Block at={b.at - 2}>{b.text}</Block>
            </React.Fragment>
          ))}
        </div>
        <Note at={loopAt} x={X0} y={y(BASE_Y) + 24 + 36 + 12}>
          <span style={{ ...label(22, BLUE_INK), fontWeight: 700 }}>the core loop, the same as ever</span>
        </Note>

        {layers.map((l, i) => (
          <Layer
            key={l.text}
            y={layerTop(i)}
            at={l.at - 2}
            rule={i > 0}
            lit={i < where.length ? where[i].at - 2 : undefined}
            dim={i === 3 ? firstAt : undefined}
          >
            {l.text}
          </Layer>
        ))}
        <Note at={layers[0].at - 2} x={X0} y={layerTop(3) - 26}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>layered on top, mostly at mid and senior levels</span>
        </Note>
        {where.map((w, i) => (
          <Note key={w.text} at={w.at} x={SIDE} y={layerTop(i) + 16} from="right">
            <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>{w.text}</span>
          </Note>
        ))}
        <Note at={askAt} x={SIDE} y={layerTop(3) - 2} from="right" dim={firstAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <Mark at={askAt + 6}>ask the recruiter,</Mark>
            <br />
            <Mark at={askAt + 14}>round by round</Mark>
          </span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
