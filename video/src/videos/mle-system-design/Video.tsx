import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BatchScene } from "./BatchScene";
import { CloseScene } from "./CloseScene";
import { FraudScene } from "./FraudScene";
import { HookScene } from "./HookScene";
import { LoopScene } from "./LoopScene";
import { QuantScene } from "./QuantScene";
import { RapidScene } from "./RapidScene";
import { RecScene } from "./RecScene";
import { ServingScene } from "./ServingScene";
import { SkewScene } from "./SkewScene";
import { StoreScene } from "./StoreScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "ML system design" (16:9), Part 7 of the Machine Learning Engineer
 * interview videos, on the editorial page. Seventeen questions in the order a
 * prediction goes out and its label comes back: how predictions reach users,
 * the features they need and the bug that bites there, the store that
 * prevents it, what serving costs and how to cut it, where labels come from,
 * then two whole systems built from those parts; six quick ones; and the
 * system whole. The system rides along as a small map in the corner of each
 * deep dive, the part its question is about lit. Every number is in
 * results.json (check.mjs); the simulations are named as simulations on
 * screen and aloud.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", BatchScene],
  ["q2", SkewScene],
  ["q3", StoreScene],
  ["q5", ServingScene],
  ["q7", QuantScene],
  ["q8", LoopScene],
  ["q9", FraudScene],
  ["q10", RecScene],
  ["rapid-in", RapidScene],
  ["close", CloseScene],
];

const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      {SCENES.map(([id, Body], i) => {
        const next = SCENES[i + 1];
        return (
          <Scene key={id} from={i === 0 ? 0 : cut(id)} to={next ? until(cut(next[0])) : durationInFrames + OVERLAP} fade={6}>
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const MleSystemDesign: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
