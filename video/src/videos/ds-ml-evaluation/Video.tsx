import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AucScene } from "./AucScene";
import { BiasScene } from "./BiasScene";
import { CalScene } from "./CalScene";
import { CvScene } from "./CvScene";
import { GdScene } from "./GdScene";
import { HookScene } from "./HookScene";
import { LearnScene } from "./LearnScene";
import { PrScene } from "./PrScene";
import { RapidScene } from "./RapidScene";
import { RegScene } from "./RegScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Machine learning I: training and evaluating" (16:9), Part 3 of the Data
 * Scientist interview prep videos, on the editorial page. Fifteen questions
 * from the first half of the track's machine learning page: twelve worked
 * through on real fits, a scene or part of one each, then three quick ones.
 * Every number and curve ran in scikit-learn 1.8.0 in Pyodide (check.mjs,
 * results.json, data.ts).
 *
 * No series intro yet, as in the Data Analyst videos (see da-sql/Video.tsx
 * for how it goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["bias", BiasScene],
  ["reg", RegScene],
  ["cv", CvScene],
  ["learn", LearnScene],
  ["pr", PrScene],
  ["auc", AucScene],
  ["cal", CalScene],
  ["gd", GdScene],
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

export const DsMlEvaluation: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
