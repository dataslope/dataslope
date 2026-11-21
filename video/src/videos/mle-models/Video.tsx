import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BagScene } from "./BagScene";
import { BatchScene } from "./BatchScene";
import { CeScene } from "./CeScene";
import { ForestScene } from "./ForestScene";
import { GbScene } from "./GbScene";
import { GdScene } from "./GdScene";
import { HookScene } from "./HookScene";
import { KnnScene } from "./KnnScene";
import { LogitScene } from "./LogitScene";
import { LrScene } from "./LrScene";
import { ParamScene } from "./ParamScene";
import { PcaScene } from "./PcaScene";
import { RapidScene } from "./RapidScene";
import { ScaleScene } from "./ScaleScene";
import { SvmScene } from "./SvmScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Models and how they learn" (16:9), Part 2 of the Machine Learning Engineer
 * interview prep videos, on the editorial page. Eighteen questions from the
 * track's fundamentals page: thirteen worked through, a scene each, then five
 * quick ones. Every number, path, boundary and curve ran in Pyodide with
 * scikit-learn 1.8.0 (check.mjs, results.json, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["gd", GdScene],
  ["batch", BatchScene],
  ["lr", LrScene],
  ["logit", LogitScene],
  ["ce", CeScene],
  ["param", ParamScene],
  ["knn", KnnScene],
  ["svm", SvmScene],
  ["scale", ScaleScene],
  ["pca", PcaScene],
  ["bag", BagScene],
  ["forest", ForestScene],
  ["gb", GbScene],
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

export const MleModels: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
