import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HERO } from "./data";
import { Box, Chip, DATA, DATA_TINT, Doc, type DocRow, Drift, Headline, Kicker, LineArrow, Mark, say, Spot, X0 } from "./parts";

const FIG_Y = 360;
const BOX_H = 120;
const DOC_ROWS: DocRow[] = [
  { kind: "h", w: 0.5 },
  { kind: "t", w: 0.9 },
  { kind: "t", w: 0.8 },
  { kind: "t", w: 0.95 },
  { kind: "t", w: 0.6 },
];
const STEPS = [
  { text: "extract", x: 0, w: 136 },
  { text: "clean", x: 154, w: 110 },
  { text: "split", x: 282, w: 104 },
  { text: "embed", x: 404, w: 122 },
  { text: "index", x: 544, w: 112 },
  { text: "keep fresh", x: 674, w: 172 },
  { text: "delete", x: 864, w: 122 },
] as const;

/**
 * The opening, on Part 10's bridge: a pipeline that used to end in a
 * dashboard now ends in an AI assistant, which can answer only from what is
 * in its index. Then the pipeline's steps as chips, the fundamentals that
 * carry over, and the two new parts lit (the vector store, the embedding
 * bill), and how the eleven questions run. The llama stands at the right.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const newestAt = n.word("hook", "The newest pipelines");
  const dashAt = n.word("hook", "end in a dashboard");
  const feedAt = n.word("hook", "They feed an AI assistant");
  const onlyAt = n.word("hook", "can only answer from");
  const indexAt = n.word("hook", "what's in its index");
  const steps = [
    n.word("hook-steps", "Extract"),
    n.word("hook-steps", "clean"),
    n.word("hook-steps", "split"),
    n.word("hook-steps", "embed"),
    n.word("hook-steps", "index"),
    n.word("hook-steps", "keep fresh"),
    n.word("hook-steps", "delete"),
  ];
  const carryAt = n.word("hook-steps", "The fundamentals carry over");
  const storeAt = n.word("hook-steps", "the vector store");
  const billAt = n.word("hook-steps", "the embedding bill");
  const elevenAt = n.word("plan", "Eleven questions");
  const everyAt = n.word("plan", "every one gets worked through");
  const end = n.beat("plan").to;

  const midY = y(FIG_Y) + BOX_H / 2;
  const IDX = { x: X0 + 330, w: 270 };
  const ASK = { x: IDX.x + IDX.w + 120, w: 290 };
  const dash = ease(frame, dashAt, 10) * (1 - ease(frame, feedAt - 4, 10));
  const STEP_Y = y(640);

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={newestAt + 6} level={-36} />
      <Sfx name="el-pop" at={feedAt + 2} level={-32} />
      <Sfx name="el-pencil" at={indexAt + 6} level={-36} />
      {steps.map((s, i) => (
        <Sfx key={i} name="el-tap" at={s} level={-36} />
      ))}
      <Sfx name="el-chime" at={billAt + 10} level={-35} />

      <Drift from={0} to={end + 40}>
        <Kicker at={6}>Data engineer interview prep</Kicker>
        <Headline lead="The newest pipelines" turn="feed an AI assistant." at={newestAt - 2} turnAt={feedAt - 2} size={68} />

        {/* Documents, a pipeline, the index, and what reads it. */}
        <Doc x={X0} y={y(FIG_Y) - 6} w={120} rows={DOC_ROWS} at={newestAt + 4} />
        <Doc x={X0 + 34} y={y(FIG_Y) + 8} w={120} rows={DOC_ROWS} at={newestAt + 8} />
        <Doc x={X0 + 68} y={y(FIG_Y) + 22} w={120} rows={DOC_ROWS} at={newestAt + 12} />
        <Note at={newestAt + 10} x={X0} y={y(FIG_Y) + 172}>
          <span style={say(22, INK_SOFT)}>documents</span>
        </Note>
        <LineArrow from={[X0 + 205, midY]} to={[IDX.x - 14, midY]} at={newestAt + 14} />
        <Note at={newestAt + 16} x={X0 + 214} y={midY - 40}>
          <span style={say(20, INK_SOFT)}>a pipeline</span>
        </Note>
        <Box x={IDX.x} y={y(FIG_Y)} w={IDX.w} h={BOX_H} at={newestAt + 18} tone={DATA} fill={DATA_TINT} size={28}>
          <span style={{ color: BLUE_INK }}>vector index</span>
        </Box>
        <LineArrow from={[IDX.x + IDX.w + 14, midY]} to={[ASK.x - 14, midY]} at={dashAt - 4} />
        {dash > 0 ? (
          <div style={{ opacity: dash }}>
            <Box x={ASK.x} y={y(FIG_Y)} w={ASK.w} h={BOX_H} at={dashAt} dashed size={26} weight={500}>
              <span style={{ color: INK_SOFT }}>a dashboard</span>
            </Box>
          </div>
        ) : null}
        <Box x={ASK.x} y={y(FIG_Y)} w={ASK.w} h={BOX_H} at={feedAt + 2} tone={INK} size={28}>
          AI assistant
        </Box>
        <Note at={onlyAt} x={IDX.x} y={y(FIG_Y) + BOX_H + 22}>
          <span style={say(24, INK)}>
            <Mark at={indexAt + 4}>it answers only from what&apos;s in here</Mark>
          </span>
        </Note>

        {/* The steps, and what is new among them. */}
        {STEPS.map((s, i) => (
          <Chip
            key={s.text}
            x={X0 + s.x}
            y={STEP_Y}
            at={steps[i] - 2}
            size={26}
            ink={i === 3 || i === 4 ? BLUE_INK : INK}
            lit={i === 3 ? billAt - 2 : i === 4 ? storeAt - 2 : undefined}
          >
            {s.text}
          </Chip>
        ))}
        <Note at={carryAt} x={X0} y={STEP_Y + 84}>
          <span style={say(26, INK_SOFT)}>the fundamentals carry over</span>
        </Note>
        <Note at={storeAt - 4} x={X0} y={STEP_Y + 134}>
          <span style={{ ...note(28, INK), fontWeight: 650, whiteSpace: "nowrap" }}>
            what&apos;s new: <Mark at={storeAt + 2}>the vector store</Mark>
            <span style={{ opacity: ease(frame, billAt - 4, 10) }}>
              , <Mark at={billAt + 2}>the embedding bill</Mark>
            </span>
          </span>
        </Note>
        <Note at={elevenAt - 2} x={X0} y={y(880)}>
          <span style={{ ...note(32, INK), whiteSpace: "nowrap" }}>
            11 questions<span style={{ opacity: ease(frame, everyAt - 2, 10) }}>, every one worked through</span>
          </span>
        </Note>

        <Spot id={HERO.id} at={feedAt + 8} left={1340} top={y(330)} width={480} height={Math.round((480 * HERO.h) / HERO.w)} />
      </Drift>
    </AbsoluteFill>
  );
};
