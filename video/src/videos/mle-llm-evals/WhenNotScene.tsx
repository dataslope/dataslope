import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { INK_SOFT } from "../../editorial/style";
import { ColumnRule } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { Arrow, Box, Drift, Line, Mark, type Rect, Spot, X0 } from "./parts";

const RIGHT_X = 1000;
const BOX_W = 400;
const BOX_CX = RIGHT_X + BOX_W / 2;
/** The pipeline's rows (layout units): label, check, train, serve. */
const ROW = [400, 540, 680, 820] as const;

/**
 * Question 6. The answer as a line under the question, then the four cases
 * on the left, each as said. On the right, the middle path as a pipeline of
 * outlined boxes, top to bottom: the LLM labels data once per label, a small
 * classifier is trained on it and serves every request. On "check", a yellow
 * box drops in before training, the two below making room, with the judge's
 * balance from question 2 beside it. "Shipped, not only prototyped" on a line
 * of its own.
 */
export const WhenNotScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("q6").from;
  const qAt = n.word("q6", "Question six");
  const textAt = n.word("q6", "When should you not");
  const ruleAt = n.word("q6", "a smaller model or a rule");
  const axesAt = n.word("q6", "the axes that matter");
  const cases = [
    { text: "Tabular prediction", at: n.word("q6-list", "tabular prediction") },
    { text: "A strict latency or cost budget", at: n.word("q6-list", "a strict latency") },
    { text: "Calibrated probabilities, or explanations a regulator accepts", at: n.word("q6-list", "calibrated probabilities") },
    { text: "A task a regular expression solves", at: n.word("q6-list", "a regular expression") },
  ];
  const pathAt = n.word("q6-middle", "A common middle path");
  const labelAt = n.word("q6-middle", "use an LLM to label data");
  const trainAt = n.word("q6-middle", "train a small, fast classifier");
  const perLabelAt = n.word("q6-middle", "once per label");
  const perReqAt = n.word("q6-middle", "once per request");
  const checkAt = n.word("q6-check", "check the labels");
  const judgeAt = n.word("q6-check", "The labeler is a judge");
  const shipAt = n.word("q6-why", "who have shipped");
  const protoAt = n.word("q6-why", "only prototyped");
  const end = n.beat("q6-why").to;

  // The pipeline: the train and serve boxes start one row up and move down
  // to make room for the check.
  const room = ease(frame, checkAt - 6, 16);
  const rowY = (i: number) => y(ROW[i]);
  const label: Rect = { cx: BOX_CX, cy: rowY(0), w: BOX_W, h: 70 };
  const check: Rect = { cx: BOX_CX, cy: rowY(1), w: BOX_W, h: 82 };
  const train: Rect = { cx: BOX_CX, cy: rowY(1) + (rowY(2) - rowY(1)) * room, w: BOX_W, h: 70 };
  const serve: Rect = { cx: BOX_CX, cy: rowY(2) + (rowY(3) - rowY(2)) * room, w: BOX_W, h: 70 };
  const g = 8;
  const down = (a: Rect, b: Rect): [number, number][] => [
    [a.cx, a.cy + a.h / 2 + g],
    [b.cx, b.cy - b.h / 2 - g],
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pencil" at={ruleAt + 4} level={-36} />
      {cases.map((c) => (
        <Sfx key={c.text} name="el-tap" at={c.at} level={-31} />
      ))}
      <Sfx name="el-pop" at={labelAt + 2} level={-32} />
      <Sfx name="el-pop" at={trainAt + 2} level={-32} />
      <Sfx name="el-tap" at={perLabelAt + 2} level={-31} />
      <Sfx name="el-whoosh" at={checkAt - 6} level={-36} />
      <Sfx name="el-pop" at={checkAt + 6} level={-31} />
      <Sfx name="el-pop" at={judgeAt} level={-32} />
      <Sfx name="el-chime" at={protoAt + 14} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={6} at={qAt - 4} textAt={textAt - 4} size={60}>
          When should you not use an LLM?
        </QuestionCard>
        <Line x={X0} y={y(286)} at={ruleAt - 4} size={30} weight={600}>
          When <Mark at={ruleAt + 6}>a smaller model or a rule</Mark> does the job better
        </Line>
        <Line x={X0} y={y(286) + 50} at={axesAt} size={22} color={INK_SOFT}>
          on the axes that matter
        </Line>

        {/* The four cases. */}
        {cases.map((c, i) => (
          <Line key={c.text} x={X0} y={y(430) + i * 60} at={c.at - 2} size={26}>
            {c.text}
          </Line>
        ))}
        <Line x={X0} y={y(760)} at={shipAt - 6} size={34} weight={600} style={{ marginLeft: "-0.14em" }}>
          <Mark at={protoAt + 6}>
            Shipped, <span style={{ opacity: ease(frame, protoAt - 2, 10) }}>not only prototyped</span>
          </Mark>
        </Line>

        {/* The middle path, top to bottom. */}
        <ColumnRule x={RIGHT_X - 60} top={y(380)} height={y(860) - y(380)} at={pathAt} />
        <Line x={RIGHT_X} y={y(330)} at={pathAt} size={24} weight={600}>
          A common middle path
        </Line>
        <Box r={label} at={labelAt} title="LLM labels data" size={26} />
        <Line x={label.cx + BOX_W / 2 + 40} y={label.cy - 15} at={perLabelAt} size={24} color={INK_SOFT}>
          once per label
        </Line>
        <Arrow points={down(label, room > 0 ? check : train)} at={trainAt - 4} />
        <Box r={check} at={checkAt + 2} title="Check the labels" sub="against a human-labeled sample" tone="lit" size={26} subSize={21} />
        <Arrow points={down(check, train)} at={checkAt + 10} />
        <Box r={train} at={trainAt} title="Train a small, fast classifier" size={26} />
        <Arrow points={down(train, serve)} at={trainAt + 10} />
        <Box r={serve} at={trainAt + 12} title="Serve it" size={26} />
        <Line x={serve.cx + BOX_W / 2 + 40} y={serve.cy - 15} at={perReqAt} size={24} color={INK_SOFT}>
          every request
        </Line>
        <Spot id="mle-llm-evals-balance" at={judgeAt} left={check.cx + BOX_W / 2 + 100} top={check.cy - 57} width={120} height={114} />
      </Drift>
    </AbsoluteFill>
  );
};
