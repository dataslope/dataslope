import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BagScene } from "./BagScene";
import { ForestScene } from "./ForestScene";
import { HookScene } from "./HookScene";
import { KmeansScene } from "./KmeansScene";
import { KnnScene } from "./KnnScene";
import { LogitScene } from "./LogitScene";
import { PcaScene } from "./PcaScene";
import { RapidScene } from "./RapidScene";
import { ShapScene } from "./ShapScene";
import { TreeScene } from "./TreeScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Machine learning II: models and features" (16:9), Part 4 of the Data
 * Scientist interview prep videos, on the editorial page. The fifteen
 * questions from the second half of the track's machine learning page:
 * eleven worked through on real fits, a scene or part of one each, then four
 * quick ones. Every number, border and curve ran in scikit-learn 1.8.0 in
 * Pyodide (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in the Data Analyst videos (see da-sql/Video.tsx
 * for how it goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["logit", LogitScene],
  ["tree", TreeScene],
  ["bag", BagScene],
  ["forest", ForestScene],
  ["knn", KnnScene],
  ["kmeans", KmeansScene],
  ["pca", PcaScene],
  ["shap", ShapScene],
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

export const DsMlModels: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
