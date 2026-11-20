import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useNarration } from "../../narration/NarrationContext";

/** Stub, replaced as the scene is built. */
export const MetricScene: React.FC = () => {
  const n = useNarration();
  return (
    <AbsoluteFill>
      <QuestionCard n={10} at={n.beat("metric").from}>
        Stub
      </QuestionCard>
    </AbsoluteFill>
  );
};
