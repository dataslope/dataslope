import React from "react";
import { AbsoluteFill } from "remotion";
import { useLayout } from "../../editorial/layout";
import { NextLine } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { BigMap, Drift, Headline, Spot, X0 } from "./parts";

const GIRAFFE_H = 500;

/**
 * The close: the system drawn whole again, as the opening drew it, and lit
 * in turn as it is named (features in, predictions out, labels back); the
 * giraffe returns; then the bridge into Part 8.
 */
export const CloseScene: React.FC = () => {
  const n = useNarration();
  const { y } = useLayout();

  const from = n.beat("close").from;
  const inAt = n.word("close", "Features in");
  const outAt = n.word("close", "predictions out");
  const backAt = n.word("close", "labels back");
  const systemAt = n.word("close", "the system around the model");
  const nextAt = n.word("next", "Next");
  const end = n.beat("next").to;
  const gW = Math.round((GIRAFFE_H * 547) / 1023);

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={from + 4} level={-31} />
      <Sfx name="el-tap" at={inAt} level={-31} />
      <Sfx name="el-tap" at={outAt} level={-31} />
      <Sfx name="el-pencil" at={backAt} level={-35} />
      <Sfx name="el-chime" at={systemAt + 30} level={-33} />
      <Sfx name="el-whoosh" at={nextAt} level={-36} />

      <Drift from={from} to={end + 60}>
        <Headline lead="The system around the model" at={from - 4} size={64} />
        <BigMap
          notebookAt={from - 2}
          modelAt={from + 2}
          featuresAt={from}
          answerAt={from + 4}
          backAt={from + 8}
          lit={{ features: inAt, answer: outAt, back: backAt }}
        />
        <Spot id="giraffe" at={from + 4} x={1440} y={y(300)} w={gW} />
        <NextLine at={nextAt} x={X0} y={y(820)} width={1100}>
          shipping and monitoring models
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
