import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BayesScene } from "./BayesScene";
import { BiasScene } from "./BiasScene";
import { BootScene } from "./BootScene";
import { CiScene } from "./CiScene";
import { CltScene } from "./CltScene";
import { HookScene } from "./HookScene";
import { MleScene } from "./MleScene";
import { PermScene } from "./PermScene";
import { PowerScene } from "./PowerScene";
import { RapidScene } from "./RapidScene";
import { SeScene } from "./SeScene";
import { TestScene } from "./TestScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Statistics and probability" (16:9), Part 4 of the Machine Learning
 * Engineer interview videos, on the editorial page. One decision runs through
 * the first nine questions: a new model scores 91.0% where the old one scored
 * 90.5%, on the same 2,000 test examples; ship it? Standard error, the CLT and
 * an interval say how much each score wobbles, the bootstrap covers what has
 * no formula, the p-value and the test's steps set up the decision, the
 * paired permutation test makes it, and power sizes the online test. Then the
 * data (selection bias), where a model's number comes from (maximum
 * likelihood), a prior (Bayes), and a quick round of five definitions. Every
 * number is in results.json (check.mjs, Pyodide); the simulations are named
 * as simulations on screen and aloud.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", SeScene],
  ["q2", CltScene],
  ["q4", CiScene],
  ["q5", BootScene],
  ["q6", TestScene],
  ["q8", PermScene],
  ["q9", PowerScene],
  ["q10", BiasScene],
  ["q11", MleScene],
  ["q12", BayesScene],
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
          <Scene key={id} from={i === 0 ? 0 : cut(id)} to={next ? until(cut(next[0])) : durationInFrames + OVERLAP} fade={6}>
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const MleStatistics: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
