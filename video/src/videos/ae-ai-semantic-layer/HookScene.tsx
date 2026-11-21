import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, label, note } from "../../editorial/style";
import { ColumnRule, Ink, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { artBox, Box, Bracket, Drift, Flow, Headline, Kicker, line, SERIES, Spot, X0 } from "./parts";

/** The project's lineage, staging to mart, in a row. */
const MODELS = ["stg_orders", "int_orders", "fct_orders"];
const MODEL_W = 240;
const MODEL_GAP = 70;
const MODEL_H = 70;
/** The two readers above it. */
const ANALYST = { x: 190, w: 200 };
const ASSISTANT = { x: 560, w: 250 };

/** The six questions, as the plan lists them in short form. */
const PLAN = [
  "Text-to-SQL over raw tables",
  "What a semantic layer changes",
  "An AI-ready dbt project",
  "Evaluating an assistant",
  "Reviewing a model it wrote",
  "Connecting to governed metrics",
];
const PLAN_ROW = 36;
const QUICK_X = 700;

/**
 * The opening: a dbt project's lineage, read by an analyst and now by an
 * assistant (the dolphin) that takes it literally and answers questions
 * nobody reviews; then the six questions, five worked through and one quick.
 */
export const HookScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const everyAt = n.word("hook", "Every model in a dbt project");
  const readerAt = n.word("hook", "one more reader");
  const lmAt = n.word("hook", "a language model");
  const readsAt = n.word("hook", "It reads the same tables");
  const analystAt = n.word("hook", "an analyst does");
  const literallyAt = n.word("hook", "takes them literally");
  const thousandsAt = n.word("hook", "thousands of questions");
  const sixAt = n.word("plan", "Six questions");
  const fiveAt = n.word("plan", "Five are worked through");
  const quickAt = n.word("plan", "one quick one");
  const end = n.beat("plan").to;

  const readerTop = y(286);
  const bracketY = y(392);
  const modelTop = y(410);
  const modelMid = modelTop + h(MODEL_H) / 2;
  const xs = MODELS.map((_, i) => X0 + i * (MODEL_W + MODEL_GAP));
  const lineageRight = xs[2] + MODEL_W;
  const dolphin = artBox("ae-ai-semantic-layer-dolphin", 440);
  const planTop = y(630);
  const rowsTop = y(708);

  return (
    <AbsoluteFill>
      {MODELS.map((m, i) => (
        <Sfx key={m} name="el-tap" at={everyAt + 2 + i * 5} level={-32} />
      ))}
      <Sfx name="el-pop" at={readerAt} level={-30} />
      <Sfx name="el-pencil" at={readsAt} level={-35} />
      <Sfx name="el-tap" at={analystAt} level={-33} />
      <Sfx name="el-tap" at={literallyAt} level={-32} />
      <Sfx name="el-tap" at={thousandsAt} level={-32} />
      <Sfx name="el-sprinkle" at={fiveAt} level={-33} />

      <Drift from={0} to={end + 30}>
        <Kicker at={everyAt}>{SERIES} · AI and the semantic layer</Kicker>
        <Headline lead="Every model has" turn="one more reader." at={everyAt} turnAt={readerAt - 2} size={64} />

        {/* The lineage: staging, intermediate, mart. */}
        {MODELS.map((m, i) => (
          <Box key={m} x={xs[i]} y={modelTop} w={MODEL_W} h={h(MODEL_H)} at={everyAt + 2 + i * 5} title={m} mono size={24} />
        ))}
        {[0, 1].map((i) => (
          <Flow key={i} points={[[xs[i] + MODEL_W + 8, modelMid], [xs[i + 1] - 8, modelMid]]} at={everyAt + 8 + i * 5} />
        ))}

        {/* Its readers: an analyst, and now an assistant. */}
        <Box x={ASSISTANT.x} y={readerTop} w={ASSISTANT.w} h={h(MODEL_H)} at={readerAt} title="Assistant" size={26} />
        <Ink at={lmAt} dur={14} style={{ left: ASSISTANT.x + ASSISTANT.w + 26, top: readerTop + h(MODEL_H) / 2 - 16, whiteSpace: "nowrap" }}>
          <span style={{ ...note(24, INK_SOFT) }}>a language model</span>
        </Ink>
        <Flow points={[[ASSISTANT.x + ASSISTANT.w / 2, readerTop + h(MODEL_H) + 6], [ASSISTANT.x + ASSISTANT.w / 2, bracketY - 6]]} at={readsAt} />
        <Bracket x0={X0} x1={lineageRight} y={bracketY} at={readsAt + 6} lip={12} />
        <Box x={ANALYST.x} y={readerTop} w={ANALYST.w} h={h(MODEL_H)} at={analystAt} title="Analyst" tone="soft" size={26} />
        <Flow points={[[ANALYST.x + ANALYST.w / 2, readerTop + h(MODEL_H) + 6], [ANALYST.x + ANALYST.w / 2, bracketY - 6]]} at={analystAt + 4} color={INK_SOFT} />

        {/* What changes with this reader. */}
        <Ink at={literallyAt} dur={16} style={{ left: X0, top: y(516) }}>
          <span style={line(30, INK)}>Takes them literally</span>
        </Ink>
        <Ink at={thousandsAt} dur={16} style={{ left: X0, top: y(516) + h(48) }}>
          <span style={line(30, INK)}>Answers thousands of questions nobody reviews</span>
        </Ink>

        <Spot id="ae-ai-semantic-layer-dolphin" at={readerAt} left={1330} top={y(290)} {...dolphin} />

        {/* The plan: five worked through, one quick. */}
        <Ink at={sixAt} dur={14} style={{ left: X0, top: planTop }}>
          <span style={{ ...label(26, INK), fontWeight: 500, whiteSpace: "nowrap" }}>Six questions</span>
        </Ink>
        <Ink at={fiveAt} dur={12} style={{ left: X0, top: rowsTop - h(44) }}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Worked through</span>
        </Ink>
        <Ink at={quickAt} dur={12} style={{ left: QUICK_X, top: rowsTop - h(44) }}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Quick</span>
        </Ink>
        {PLAN.map((q, i) => {
          const quick = i === 5;
          return (
            <Ink
              key={q}
              at={quick ? quickAt + 4 : fiveAt + 4 + i * 4}
              dur={12}
              style={{ left: quick ? QUICK_X : X0, top: rowsTop + (quick ? 0 : i) * h(PLAN_ROW) }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.6em", fontSize: 24, whiteSpace: "nowrap" }}>
                <span style={{ ...label(24, INK_SOFT), width: 18, textAlign: "right" }}>
                  <Num>{i + 1}</Num>
                </span>
                <span style={{ ...note(24, INK) }}>{q}</span>
              </div>
            </Ink>
          );
        })}
        <ColumnRule x={QUICK_X - 44} top={rowsTop - h(44)} height={h(44) + 5 * h(PLAN_ROW) - 8} at={quickAt} />
      </Drift>
    </AbsoluteFill>
  );
};
