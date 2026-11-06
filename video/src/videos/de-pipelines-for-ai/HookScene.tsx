import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BLUE_INK, HIGHLIGHT, INK, INK_SOFT, note } from "../../editorial/style";
import { Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { HERO } from "./data";
import { Box, DATA, DATA_TINT, Doc, type DocRow, Drift, Headline, Kicker, LineArrow, Mark, say, Spot, X0 } from "./parts";

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
  { text: "extract" },
  { text: "clean" },
  { text: "split" },
  { text: "embed" },
  { text: "index" },
  { text: "keep fresh" },
  { text: "delete" },
] as const;

/**
 * The opening, on Part 10's bridge: a pipeline that used to end in a
 * dashboard now ends in an AI assistant, which knows your documents only
 * from what is in its index. Then the pipeline's steps as a line of words, the fundamentals that
 * carry over, and the two new parts lit (the vector store, the embedding
 * bill), and how the eleven questions run. The llama stands at the right.
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const newestAt = n.word("hook", "The newest pipelines");
  const dashAt = n.word("hook", "end in a dashboard");
  const feedAt = n.word("hook-feed", "They feed an AI assistant");
  const onlyAt = n.word("hook-feed", "knows your documents only");
  const indexAt = n.word("hook-feed", "what's in its index");
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
        <Kicker at={6}>Data engineer interview questions</Kicker>
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
            <Mark at={indexAt + 4}>it knows your documents only from what&apos;s in here</Mark>
          </span>
        </Note>

        {/* The steps, and what is new among them. */}
        {/* The steps as one line of words joined by middle dots, each rising
            in as it is said; the two new ones in blue, the highlighter laid
            behind each as the narration names it. */}
        <div style={{ position: "absolute", left: X0, top: STEP_Y, ...note(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>
          {STEPS.map((s, i) => {
            const p = ease(frame, steps[i] - 2, 12);
            const litAt = i === 3 ? billAt - 2 : i === 4 ? storeAt - 2 : undefined;
            const l = litAt === undefined ? 0 : ease(frame, litAt, 12);
            return (
              <span key={s.text} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>
                {i ? <span style={{ whiteSpace: "pre", color: INK_SOFT, fontWeight: 500 }}> · </span> : null}
                <span
                  style={{
                    color: i === 3 || i === 4 ? BLUE_INK : INK,
                    padding: "1px 8px 2px",
                    margin: "0 -8px",
                    borderRadius: 4,
                    background: l > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${l * 100}%, transparent)` : undefined,
                  }}
                >
                  {s.text}
                </span>
              </span>
            );
          })}
        </div>
        <Note at={carryAt} x={X0} y={STEP_Y + 52}>
          <span style={say(26, INK_SOFT)}>the fundamentals carry over</span>
        </Note>
        <Note at={storeAt - 4} x={X0} y={STEP_Y + 100}>
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
