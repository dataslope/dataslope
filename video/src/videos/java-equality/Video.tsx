import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BoxScene } from "./BoxScene";
import { CacheScene } from "./CacheScene";
import { CodeScene } from "./CodeScene";
import { HeapScene } from "./HeapScene";
import { RuleScene } from "./RuleScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "== or .equals()?" (16:9): why two Java strings with the same letters can
 * fail ==, and why two Integers of 127 pass it while two of 128 do not, set
 * as a magazine's science page on the shared editorial kit
 * (src/editorial/). Every listing and output on screen is what
 * Equality.java printed (data.ts).
 *
 * Every scene boundary is a narration cue: a scene starts just before its
 * beat and stays up a few frames into the next, so new audio re-times the
 * cuts along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("refs"))} fade={6}>
        <CodeScene />
      </Scene>
      <Scene from={cut("refs")} to={until(cut("boxing"))} fade={6}>
        <HeapScene />
      </Scene>
      <Scene from={cut("boxing")} to={until(cut("cache"))} fade={6}>
        <BoxScene />
      </Scene>
      <Scene from={cut("cache")} to={until(cut("rule"))} fade={6}>
        <CacheScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const JavaEquality: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
