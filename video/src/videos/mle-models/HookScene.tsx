import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOGIT } from "./data";
import { artH, Drift, ElevenNumbers, Headline, Kicker, Line, Mark, PlanList, RowsBlock, Spot, VRule, X0, int } from "./parts";

/** The rows block's geometry, shared with question six. */
export const ROWS = { x: 640, cols: 7, cell: 7, gapX: 16 } as const;
const COL_R = ROWS.x;
const TOUCAN_W = 340;

/**
 * The opening: one trained logistic regression, all eleven of its numbers,
 * beside one trained nearest-neighbours model, all 160 of its training rows.
 * Then what that split decides (how a model learns, what it costs to serve,
 * how it fails), and the five groups the eighteen questions fall into, the
 * first lit for question one.
 */
export const HookScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("hook").from;
  const logitAt = n.word("hook", "a trained logistic regression");
  const elevenAt = n.word("hook", "eleven numbers");
  const knnAt = n.word("hook", "a trained nearest-neighbours model");
  const rowsAt = n.word("hook", "every one of its");
  const sixtyAt = n.word("hook", "hundred and sixty training rows");
  const squeezeAt = n.word("hook-why", "Squeezing the data");
  const learnsAt = n.word("hook-why", "how a model learns");
  const servesAt = n.word("hook-why", "what it costs to serve");
  const failsAt = n.word("hook-why", "how it fails");
  const planFrom = n.beat("plan").from;
  const eighteenAt = n.word("plan", "Eighteen questions");
  const thirteenAt = n.word("plan", "thirteen worked through");
  const fiveAt = n.word("plan", "five quick ones");
  const firstAt = n.word("gd-in", "how the numbers are found");
  const end = n.beat("gd-in").to;

  const colTop = y(330);
  const bodyTop = y(384);
  const rowH = h(13);
  const clear = planFrom - 6;

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={logitAt + 4} level={-32} />
      <Sfx name="el-pencil" at={knnAt - 2} level={-36} />
      <Sfx name="el-sprinkle" at={rowsAt} level={-33} />
      {[learnsAt, servesAt, failsAt].map((a) => (
        <Sfx key={a} name="el-tap" at={a} level={-30} />
      ))}
      <Sfx name="el-whoosh" at={eighteenAt - 4} level={-36} />
      <Sfx name="el-tap" at={firstAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <Kicker at={from}>Machine learning engineer interview questions</Kicker>
        <Headline lead="Eleven numbers," turn="or every row." at={elevenAt - 4} turnAt={rowsAt - 4} />

        {/* ── Two trained models ── */}
        <Line at={logitAt - 2} x={X0} y={colTop} size={28} out={clear}>
          Logistic regression
        </Line>
        <ElevenNumbers weights={LOGIT.weights} bias={LOGIT.bias} x={X0 + 4} top={bodyTop} row={h(30)} at={elevenAt - 6} every={2} out={clear} />
        <Line at={elevenAt + 20} x={X0} y={y(732)} size={26} out={clear}>
          {LOGIT.parameters} numbers
        </Line>

        <VRule x={COL_R - 70} top={colTop} bottom={y(770)} at={knnAt - 2} out={clear} />

        <Line at={knnAt - 2} x={COL_R} y={colTop} size={28} out={clear}>
          Nearest neighbours
        </Line>
        <RowsBlock
          x={COL_R}
          top={bodyTop + 6}
          cols={ROWS.cols}
          count={LOGIT.trainRows}
          cell={ROWS.cell}
          cellH={rowH - h(5)}
          gapX={ROWS.gapX}
          gapY={h(5)}
          at={rowsAt}
          rate={3}
          out={clear}
        />
        <Line at={sixtyAt + 6} x={COL_R} y={y(732)} size={26} out={clear}>
          {LOGIT.trainRows} training rows <span style={{ color: INK_SOFT }}>× {LOGIT.features} features = {int(LOGIT.knnStores)} numbers</span>
        </Line>

        {/* ── What the split decides, one line ── */}
        <div style={{ position: "absolute", left: X0, top: y(810), display: "flex", gap: "0.9em", fontSize: 28, whiteSpace: "nowrap" }}>
          <Ink at={squeezeAt} dur={16} out={clear} style={{ position: "relative" }}>
            <span style={{ ...note(28, INK_SOFT) }}>A fixed set of numbers, or the data itself, decides:</span>
          </Ink>
          {[
            { at: learnsAt, text: "How it learns" },
            { at: servesAt, text: "What it costs to serve" },
            { at: failsAt, text: "How it fails" },
          ].map((w) => (
            <Ink key={w.text} at={w.at - 4} dur={12} out={clear} style={{ position: "relative" }}>
              <span style={{ ...note(28, INK) }}>
                <Mark at={w.at}>{w.text}</Mark>
              </span>
            </Ink>
          ))}
        </div>

        {/* ── The plan ── */}
        <Line at={eighteenAt - 2} x={X0} y={y(330)} size={28} color={INK}>
          18 questions
        </Line>
        <PlanList x={X0} top={y(392)} row={h(64)} width={1080} at={thirteenAt - 4} quickAt={fiveAt - 2} litAt={firstAt - 2} lit={0} />

        <Spot id="mle-models-toucan" at={from + 10} left={1400} top={y(360)} width={TOUCAN_W} height={artH("toucan", TOUCAN_W)} />
      </Drift>
    </AbsoluteFill>
  );
};
