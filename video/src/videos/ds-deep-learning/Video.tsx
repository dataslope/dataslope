import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ActScene } from "./ActScene";
import { ArchScene } from "./ArchScene";
import { AttnScene } from "./AttnScene";
import { BackpropScene } from "./BackpropScene";
import { BnScene } from "./BnScene";
import { DropScene } from "./DropScene";
import { HookScene } from "./HookScene";
import { NeuronScene } from "./NeuronScene";
import { OptScene } from "./OptScene";
import { OverfitScene } from "./OverfitScene";
import { RapidScene } from "./RapidScene";
import { VanishScene } from "./VanishScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Deep learning" (16:9), Part 5 of the Data Scientist interview prep
 * videos, on the editorial page. Fifteen questions from the track's deep
 * learning page (its gradient descent question is Part 3's): twelve worked
 * on networks small enough to show every number, a scene or part of one
 * each, then three quick ones. No deep-learning framework runs in Pyodide,
 * so every number is NumPy by hand (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in the Data Analyst videos (see da-sql/Video.tsx
 * for how it goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["neuron", NeuronScene],
  ["act", ActScene],
  ["backprop", BackpropScene],
  ["vanish", VanishScene],
  ["opt", OptScene],
  ["overfit", OverfitScene],
  ["dropout", DropScene],
  ["bn", BnScene],
  ["arch", ArchScene],
  ["attn", AttnScene],
  ["rapid-in", RapidScene],
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
          <Scene
            key={id}
            from={i === 0 ? 0 : cut(id)}
            to={next ? until(cut(next[0])) : durationInFrames + OVERLAP}
            fade={6}
          >
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const DsDeepLearning: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
