import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DATA, Drift, Mark, X0 } from "./parts";

const BASE_Y = 700;
const BLOCK_W = 360;
const BLOCK_GAP = 24;
const LAYER_H = 62;
const LAYER_GAP = 14;

/** One block of the core loop, set into the base of the figure. */
const Block: React.FC<{ x: number; y: number; at: number; children: React.ReactNode }> = ({ x, y, at: from, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: BLOCK_W,
        height: 92,
        borderRadius: 10,
        background: `color-mix(in srgb, ${DATA} ${18 * p}%, ${PAPER})`,
        border: `2px solid ${BLUE_INK}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...note(30, BLUE_INK),
        fontWeight: 650,
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** One layer laid across the top of the loop: what is new. */
const Layer: React.FC<{ y: number; at: number; lit?: number; dim?: number; children: React.ReactNode }> = ({
  y,
  at: from,
  lit,
  dim,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const l = lit === undefined ? 0 : ease(frame, lit, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0) return null;
  const width = 4 * BLOCK_W + 3 * BLOCK_GAP;
  return (
    <div
      style={{
        position: "absolute",
        left: X0,
        top: y,
        width: width * (0.6 + 0.4 * p),
        height: LAYER_H,
        boxSizing: "border-box",
        padding: "0 24px",
        borderRadius: 10,
        border: `2px solid ${ACCENT_INK}`,
        background: `color-mix(in srgb, ${HIGHLIGHT} ${100 * l}%, ${PAPER})`,
        display: "flex",
        alignItems: "center",
        ...note(28, INK),
        fontWeight: 600,
        whiteSpace: "nowrap",
        opacity: p * (1 - d),
      }}
    >
      {children}
    </div>
  );
};

/**
 * Question 1. The core loop as four blocks along the bottom (statistics,
 * experiments, SQL, product sense), and four layers set down on top of it as
 * they are named: evaluating LLM features, experiments where the treatment is
 * random, checking an assistant's work, and rounds with AI allowed or banned.
 * The bridge then lights the first layer, which the rest of the page is about.
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
  const topAt = n.word("changed-layer", "What's layered on top");
  const seniorAt = n.word("changed-layer", "mostly at mid and senior levels");
  const layers = [
    { text: "evaluating LLM features", at: n.word("changed-layer", "evaluating features built on") },
    { text: "experiments where the treatment is itself random", at: n.word("changed-layer", "Experimenting on AI features") },
    { text: "checking code and analysis an assistant wrote", at: n.word("changed-layer", "Checking code and analysis") },
    { text: "rounds with AI allowed, or banned", at: n.word("changed-layer", "rounds where AI is allowed") },
  ];
  const askAt = n.word("changed-layer", "Ask the recruiter");
  const firstAt = n.word("measure-in", "the first of those");
  const end = n.beat("measure-in").to;

  const layerTop = (i: number) => y(BASE_Y) - (i + 1) * (LAYER_H + LAYER_GAP) - 6;

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

        <Note at={loopAt} x={X0} y={y(BASE_Y + 110)}>
          <span style={{ ...label(22, BLUE_INK), fontWeight: 700 }}>the core loop, the same as ever</span>
        </Note>
        {blocks.map((b, i) => (
          <Block key={b.text} x={X0 + i * (BLOCK_W + BLOCK_GAP)} y={y(BASE_Y)} at={b.at - 2}>
            {b.text}
          </Block>
        ))}

        {layers.map((l, i) => (
          <Layer key={l.text} y={layerTop(i)} at={l.at - 2} lit={i === 0 ? firstAt - 2 : undefined} dim={i === 0 ? undefined : firstAt}>
            {l.text}
          </Layer>
        ))}
        <Note at={topAt} x={X0 + 4 * BLOCK_W + 3 * BLOCK_GAP + 30} y={layerTop(3) + 10} from="right">
          <span style={{ ...label(22, ACCENT_INK), fontWeight: 700, whiteSpace: "nowrap" }}>layered on top</span>
        </Note>
        <Note at={seniorAt} x={X0 + 4 * BLOCK_W + 3 * BLOCK_GAP + 30} y={layerTop(3) + 44} from="right">
          <span style={{ ...label(20, INK_SOFT), whiteSpace: "nowrap" }}>mostly mid and senior</span>
        </Note>
        <Note at={askAt} x={X0 + 4 * BLOCK_W + 3 * BLOCK_GAP + 30} y={layerTop(0) + 14} from="right">
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
