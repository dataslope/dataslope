import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BlendScene } from "./BlendScene";
import { DotScene } from "./DotScene";
import { QuestionScene } from "./QuestionScene";
import { RecapScene } from "./RecapScene";
import { WeightsScene } from "./WeightsScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade: past the
 *  next scene's first word (LEAD frames in), so the outgoing figures fade
 *  across the incoming ones' first inking and the page is never blank. */
const OVERLAP = 14;

/**
 * "How one attention score is computed" (16:9), a deep dive in How Large
 * Language Models Work, Unit 2: the lesson's own query, keys and values
 * (attention-intuition.mdx), one step at a time, every number from
 * measure.py (data.ts):
 *
 *   1. QuestionScene: the trophy sentence and the three tokens the lesson
 *      keeps, and query, key and value.
 *   2. DotScene: the query and keys as arrows; each dot product written out;
 *      cosine as the same sum on arrows of length one, and what keeping the
 *      lengths does to the pronoun's short key.
 *   3. WeightsScene: why divide (how big long vectors' sums get); divide by
 *      the square root of two; softmax as e to each scaled score, then each
 *      over the total; the shares without the division.
 *   4. BlendScene: the new vector as the weighted values; the query turned to
 *      suitcase, and the weights and the blend swapping.
 *   5. RecapScene: the five steps to the pronoun's new vector, and every
 *      token against itself and the tokens before it, in many heads.
 *
 * No series intro and no bridge: a deep dive opens on its question and ends
 * on its takeaway. Every scene boundary is a narration cue.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("arrows"))} fade={6}>
        <QuestionScene />
      </Scene>
      <Scene from={cut("arrows")} to={until(cut("scale"))} fade={6}>
        <DotScene />
      </Scene>
      <Scene from={cut("scale")} to={until(cut("blend"))} fade={6}>
        <WeightsScene />
      </Scene>
      <Scene from={cut("blend")} to={until(cut("recap"))} fade={6}>
        <BlendScene />
      </Scene>
      <Scene from={cut("recap")} to={durationInFrames + OVERLAP} fade={6}>
        <RecapScene />
      </Scene>
    </>
  );
};

export const LlmAttentionScore: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
