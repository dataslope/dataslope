import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ClaimScene } from "./ClaimScene";
import { ErasureScene } from "./ErasureScene";
import { FixScene } from "./FixScene";
import { InstanceofScene } from "./InstanceofScene";
import { RuleScene } from "./RuleScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Type erasure" (16:9): TypeScript checks types and then deletes them, so a
 * type on data from outside the program is only a claim until a check that
 * runs confirms it. Set on the shared editorial page (src/editorial/); every
 * listing, compiler message and line of output on screen is the real thing,
 * compiled and run by verify.py (data.ts).
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
      <Scene from={0} to={until(cut("instanceof"))} fade={6}>
        <ErasureScene />
      </Scene>
      <Scene from={cut("instanceof")} to={until(cut("claim"))} fade={6}>
        <InstanceofScene />
      </Scene>
      <Scene from={cut("claim")} to={until(cut("fix"))} fade={6}>
        <ClaimScene />
      </Scene>
      <Scene from={cut("fix")} to={until(cut("rule"))} fade={6}>
        <FixScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const TypeErasure: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
