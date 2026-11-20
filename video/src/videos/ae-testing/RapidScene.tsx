import React from "react";
import { AbsoluteFill } from "remotion";
import { QuestionCard } from "../../editorial/interview";
import { useNarration } from "../../narration/NarrationContext";

/** Stub, replaced as the scene is built. */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  return (
    <AbsoluteFill>
      <QuestionCard n={11} at={n.beat("rapid-in").from}>
        Stub
      </QuestionCard>
    </AbsoluteFill>
  );
};
