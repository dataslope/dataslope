import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useNarration } from "../../narration/NarrationContext";

/** Stub, replaced as the scene is built. */
export const FreshScene: React.FC = () => {
  const n = useNarration();
  return (
    <AbsoluteFill>
      <QuestionCard n={6} at={n.beat("fresh").from}>
        Stub
      </QuestionCard>
    </AbsoluteFill>
  );
};
