import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ActScene } from "./ActScene";
import { BackpropScene } from "./BackpropScene";
import { CnnScene } from "./CnnScene";
import { DropScene } from "./DropScene";
import { HookScene } from "./HookScene";
import { InitScene } from "./InitScene";
import { NormScene } from "./NormScene";
import { OptScene } from "./OptScene";
import { PerceptronScene } from "./PerceptronScene";
import { RapidScene } from "./RapidScene";
import { RnnScene } from "./RnnScene";
import { VanishScene } from "./VanishScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Deep learning" (16:9), Part 5 of the Machine Learning Engineer interview
 * prep videos, on the editorial page. Fifteen questions from the track's deep
 * learning page: thirteen worked through, most on networks small enough to
 * show (XOR, scikit-learn's digits, a twenty-layer simulation), and two quick
 * ones before the recurrent pair, so the video ends on recurrence and the
 * bridge into attention. Every number ran in Pyodide (check.mjs,
 * results.json, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", PerceptronScene],
  ["q3", ActScene],
  ["q4", BackpropScene],
  ["q5", VanishScene],
  ["q6", InitScene],
  ["q7", NormScene],
  ["q8", OptScene],
  ["q9", DropScene],
  ["q10", CnnScene],
  ["rapid-in", RapidScene],
  ["q14", RnnScene],
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

export const MleDeepLearning: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
