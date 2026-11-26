import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK, INK_SOFT } from "../../editorial/style";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { LOGIT, SERVING } from "./data";
import { ROWS } from "./HookScene";
import { ACCENT_INK, Drift, ElevenNumbers, int, Line, Mark, RowsBlock, VRule, X0 } from "./parts";

/** The right column sits 40 px right of the hook's, so the longest line on
 *  the left ("A fixed set of numbers, and only those") keeps clear of the
 *  hairline, which is centred in the gap. */
const COL_R = ROWS.x + 40;
const COLS = 9;

/**
 * Question 6. The opening's two models again, named: a parametric model is
 * its eleven numbers, a non-parametric one keeps its training rows. Then ten
 * million rows: the numbers stay eleven, the rows block fills, and every
 * prediction measures every row.
 */
export const ParamScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("param").from;
  const qAt = n.word("param", "Question six");
  const textAt = n.word("param", "What's the difference");
  const paramAt = n.word("param", "Parametric models learn a fixed set of numbers");
  const aloneAt = n.word("param", "predict from those alone");
  const linearAt = n.word("param", "like linear models and neural networks");
  const nonAt = n.word("param", "Non-parametric ones use the training data");
  const growAt = n.word("param", "and grow with it");
  const knnAt = n.word("param", "like kNN or a kernel SVM");
  const servingAt = n.word("param-cost", "That's a serving decision");
  const tenAt = n.word("param-cost", "At ten million rows");
  const stillAt = n.word("param-cost", "is still eleven numbers");
  const keepsAt = n.word("param-cost", "keeps all ten million");
  const checksAt = n.word("param-cost", "checks every one");
  const end = n.beat("param-cost").to;

  const colTop = y(330);
  const figTop = y(470);
  const rowStep = h(24);
  const under = figTop + rowStep * 11 + h(22);
  const rowH = h(13);
  const rowsY = figTop + 4;
  const grown = ease(frame, tenAt, 40);
  const count = Math.round(LOGIT.trainRows + grown * (COLS * 20 - LOGIT.trainRows));

  return (
    <AbsoluteFill>
      <Sfx name="el-tap" at={paramAt} level={-31} />
      <Sfx name="el-sprinkle" at={nonAt} level={-34} />
      <Sfx name="el-sprinkle" at={tenAt} level={-32} />
      <Sfx name="el-tap" at={stillAt} level={-30} />
      <Sfx name="el-tap" at={checksAt} level={-30} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={52}>
          What&apos;s the difference between a parametric and a non-parametric model?
        </QuestionCard>

        {/* ── Parametric ── */}
        <Line at={paramAt - 2} x={X0} y={colTop} size={30}>
          Parametric
        </Line>
        <Line at={paramAt + 4} x={X0} y={colTop + h(48)} size={24}>
          A fixed set of numbers
          <span style={{ opacity: ease(frame, aloneAt, 10) }}>, and only those</span>
        </Line>
        <Line at={linearAt - 2} x={X0} y={colTop + h(88)} size={24} color={INK_SOFT}>
          Linear models, neural networks
        </Line>
        <ElevenNumbers weights={LOGIT.weights} bias={LOGIT.bias} x={X0 + 4} top={figTop} row={rowStep} at={paramAt + 8} every={2} size={22} />
        <Line at={stillAt - 2} x={X0} y={under} size={26}>
          <Mark at={stillAt}>Still {LOGIT.parameters} numbers</Mark>
        </Line>

        <VRule x={COL_R - 62} top={colTop} bottom={y(860)} at={nonAt - 2} />

        {/* ── Non-parametric ── */}
        <Line at={nonAt - 2} x={COL_R} y={colTop} size={30}>
          Non-parametric
        </Line>
        <Line at={nonAt + 4} x={COL_R} y={colTop + h(48)} size={24}>
          Predicts from the training data
          <span style={{ opacity: ease(frame, growAt, 10) }}>, and grows with it</span>
        </Line>
        <Line at={knnAt - 2} x={COL_R} y={colTop + h(88)} size={24} color={INK_SOFT}>
          kNN, kernel SVMs
        </Line>
        <RowsBlock x={COL_R} top={rowsY} cols={COLS} count={count} cell={ROWS.cell} cellH={rowH - h(5)} gapX={ROWS.gapX} gapY={h(5)} at={nonAt} rate={4} />
        <Line at={nonAt + 10} x={COL_R} y={under} size={26} out={tenAt}>
          {LOGIT.trainRows} training rows
        </Line>
        <Line at={tenAt + 4} x={COL_R} y={under} size={26}>
          <Mark at={keepsAt}>{int(SERVING.rows)} rows</Mark>
          <span style={{ color: INK_SOFT }}>
            {" "}
            × {SERVING.features} features: {Math.round(SERVING.bytes / 1e6)} MB as float32
          </span>
        </Line>
        <Line at={checksAt - 2} x={COL_R} y={under + h(54)} size={26} color={ACCENT_INK}>
          {int(SERVING.distancesPerPrediction)} distances per prediction
        </Line>
        <Line at={servingAt} x={X0} y={under + h(54)} size={26} color={INK}>
          A serving decision
        </Line>
      </Drift>
    </AbsoluteFill>
  );
};
