import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useNarration } from "../../narration/NarrationContext";

/** Stub, replaced as the scene is built. */
export const CiScene: React.FC = () => {
  const n = useNarration();
  return (
    <AbsoluteFill>
      <QuestionCard n={7} at={n.beat("ci").from}>
        Stub
      </QuestionCard>
    </AbsoluteFill>
  );
};
