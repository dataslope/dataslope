import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DATA, Drift, Mark, X0 } from "./parts";

const BASE_Y = 720;
const BLOCK_W = 384;
const BLOCK_GAP = 24;
const LAYER_H = 62;
const LAYER_GAP = 14;
const WIDTH = 3 * BLOCK_W + 2 * BLOCK_GAP;
const SIDE = X0 + WIDTH + 44;

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
        textAlign: "center",
        padding: "0 16px",
        boxSizing: "border-box",
        ...note(29, BLUE_INK),
        fontWeight: 650,
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** One layer laid across the top of the loop: what is new. Outlined in the
 *  soft ink, since nothing here is a trap; yellow lights the one the
 *  narration points at. */
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
  return (
    <div
      style={{
        position: "absolute",
        left: X0,
        top: y,
        width: WIDTH * (0.6 + 0.4 * p),
        height: LAYER_H,
        boxSizing: "border-box",
        padding: "0 24px",
        borderRadius: 10,
        border: `2px solid ${INK_SOFT}`,
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
 * Question 1, after ds-llm-evaluation's ChangedScene (the same question on
 * the Data Scientist page), copied and re-cued. The core loop as three
 * blocks along the bottom (SQL, modeling, batch and streaming design), and
 * four layers set down on top as they are named: system design for AI data,
 * unstructured data, vector search trade-offs, and AI in your own workflow.
 * Beside the last, what a round that allows an assistant grades: the four
 * things to check in pipeline code. The bridge lights the first layer, the
 * design questions the rest of the video takes, and sets the others back.
 */
export const ChangedScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("changed").from;
  const qAt = n.word("changed", "Question");
  const textAt = n.word("changed", "How have Data Engineer interviews");
  const coreAt = n.word("changed", "The core hasn't");
  const blocks = [
    { text: "SQL", at: n.word("changed", "sequel") },
    { text: "modeling", at: n.word("changed", "modeling") },
    { text: "batch and streaming design", at: n.word("changed", "batch and streaming design") },
  ];
  const layers = [
    { text: "system design for AI data", at: n.word("changed-layer", "system design for AI data") },
    { text: "unstructured data: PDFs and tickets into clean text", at: n.word("changed-layer", "Unstructured data") },
    { text: "vector search trade-offs", at: n.word("changed-layer", "Vector search trade-offs") },
    { text: "AI in your own workflow", at: n.word("changed-layer", "AI in your own workflow") },
  ];
  const roundsAt = n.word("changed-verify", "Some coding rounds allow an assistant");
  const gradeAt = n.word("changed-verify", "grade how you check its code");
  const checks = [
    { text: "idempotency", at: n.word("changed-verify", "idempotency") },
    { text: "partition overwrites", at: n.word("changed-verify", "partition overwrites") },
    { text: "time zones", at: n.word("changed-verify", "time zones") },
    { text: "schema drift", at: n.word("changed-verify", "schema drift") },
  ];
  const pipeAt = n.word("rag-in", "the pipeline itself");
  const end = n.beat("rag-in").to;

  const layerTop = (i: number) => y(BASE_Y) - (i + 1) * (LAYER_H + LAYER_GAP) - 6;

  return (
    <AbsoluteFill>
      {blocks.map((b) => (
        <Sfx key={b.text} name="el-tap" at={b.at} level={-34} />
      ))}
      {layers.map((l) => (
        <Sfx key={l.text} name="el-pop" at={l.at + 2} level={-34} />
      ))}
      <Sfx name="el-pencil" at={gradeAt + 4} level={-36} />
      <Sfx name="el-chime" at={pipeAt} level={-36} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={1} at={qAt - 4} textAt={textAt - 4} size={60}>
          How have Data Engineer interviews changed with AI?
        </QuestionCard>

        <Note at={coreAt} x={X0} y={y(BASE_Y + 110)}>
          <span style={{ ...label(22, BLUE_INK), fontWeight: 700 }}>the core loop, the same as ever</span>
        </Note>
        {blocks.map((b, i) => (
          <Block key={b.text} x={X0 + i * (BLOCK_W + BLOCK_GAP)} y={y(BASE_Y)} at={b.at - 2}>
            {b.text}
          </Block>
        ))}

        {layers.map((l, i) => (
          <Layer key={l.text} y={layerTop(i)} at={l.at - 2} lit={i === 0 ? pipeAt - 2 : undefined} dim={i === 0 ? undefined : pipeAt}>
            {l.text}
          </Layer>
        ))}
        <Note at={layers[0].at - 2} x={X0} y={layerTop(3) - 48}>
          <span style={{ ...label(22, INK_SOFT), fontWeight: 700, whiteSpace: "nowrap" }}>what&apos;s been added on top</span>
        </Note>

        {/* Beside "AI in your own workflow": what a round with an assistant grades. */}
        <Note at={roundsAt} x={SIDE} y={layerTop(3) - 52} from="right" dim={pipeAt}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            rounds that allow an assistant
            <br />
            <Mark at={gradeAt + 4}>grade how you check its code:</Mark>
          </span>
        </Note>
        {checks.map((c, i) => (
          <Note key={c.text} at={c.at - 2} x={SIDE + 24} y={layerTop(3) + 28 + i * 42} from="right" dim={pipeAt}>
            <span style={{ ...note(24, INK_SOFT), fontWeight: 600, whiteSpace: "nowrap" }}>{c.text}</span>
          </Note>
        ))}
        <Note at={pipeAt} x={SIDE} y={layerTop(0) + 14} from="right">
          <span style={{ ...label(22, INK), fontWeight: 700, whiteSpace: "nowrap" }}>now: the pipeline itself</span>
        </Note>
      </Drift>
    </AbsoluteFill>
  );
};
