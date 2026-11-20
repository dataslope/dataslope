import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useNarration } from "../../narration/NarrationContext";

/** Stub, replaced as the scene is built. */
export const CompoundScene: React.FC = () => {
  const n = useNarration();
  return (
    <AbsoluteFill>
      <QuestionCard n={5} at={n.beat("compound").from}>
        Stub
      </QuestionCard>
    </AbsoluteFill>
  );
};
