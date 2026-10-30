import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { HookScene } from "./HookScene";
import { LookupScene } from "./LookupScene";
import { SentenceScene } from "./SentenceScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Lemmatizing needs the part of speech" (16:9), a deep dive in Natural
 * Language Processing with Python, Unit 2. No series intro: it is embedded
 * on its own beside the lesson, so it opens straight on its question. Every
 * tag, lemma, stem and lookup step is NLTK 3.9.4's (measure.py, data.ts):
 *
 *   1. HookScene: lemmatize() with no part of speech, and why noun.
 *   2. LookupScene: WordNet's three steps, traced on six lookups.
 *   3. SentenceScene: the pos-tagging lesson's sentence tagged, mapped and
 *      lemmatized without tags and with them, beside Porter's stems, and
 *      the fix as one call.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("list"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("list")} to={until(cut("tagger"))} fade={6}>
        <LookupScene />
      </Scene>
      <Scene from={cut("tagger")} to={durationInFrames + OVERLAP} fade={6}>
        <SentenceScene />
      </Scene>
    </>
  );
};

export const NlpLemmasAndTags: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
