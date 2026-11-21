import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AucScene } from "./AucScene";
import { BiasScene } from "./BiasScene";
import { CvScene } from "./CvScene";
import { FitScene } from "./FitScene";
import { HookScene } from "./HookScene";
import { ImbScene } from "./ImbScene";
import { LeakScene } from "./LeakScene";
import { PrScene } from "./PrScene";
import { RapidScene } from "./RapidScene";
import { RegScene } from "./RegScene";
import { SplitScene } from "./SplitScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Generalization and evaluation" (16:9), Part 1 of the Machine Learning
 * Engineer interview videos, on the editorial page. Twelve questions from the
 * track's ML fundamentals page, run as one argument in three movements: why a
 * model fails on data it hasn't seen (1 to 4), how to measure that honestly
 * (5 to 7) and which number to report (8 to 10), then two quick ones. It
 * opens on a model of pure noise that cross-validates at 85%, and question six
 * finds the leak. Every number and curve ran in scikit-learn 1.8.0 in Pyodide
 * (check.mjs, results.json, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["bias", BiasScene],
  ["fit", FitScene],
  ["reg", RegScene],
  ["split", SplitScene],
  ["leak", LeakScene],
  ["cv", CvScene],
  ["pr", PrScene],
  ["auc", AucScene],
  ["imb", ImbScene],
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

export const MleGeneralization: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
