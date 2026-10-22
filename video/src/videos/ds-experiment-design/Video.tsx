import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CupedScene } from "./CupedScene";
import { DesignScene } from "./DesignScene";
import { ErrorsScene } from "./ErrorsScene";
import { HookScene } from "./HookScene";
import { PeekScene } from "./PeekScene";
import { RapidScene } from "./RapidScene";
import { SidesScene } from "./SidesScene";
import { SizeScene } from "./SizeScene";
import { SprtScene } from "./SprtScene";
import { UnitScene } from "./UnitScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Experimentation I: designing the test" (16:9), Part 6 of the Data
 * Scientist interview prep videos, on the editorial page. Fourteen questions
 * from the first half of the track's experimentation page: eleven worked
 * through on simulated experiments, a scene or part of one each, then three
 * quick ones. Every number ran in Pyodide with NumPy, SciPy and statsmodels
 * (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in the Data Analyst videos (see da-sql/Video.tsx
 * for how it goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["design", DesignScene],
  ["unit", UnitScene],
  ["errors", ErrorsScene],
  ["size", SizeScene],
  ["sides", SidesScene],
  ["peek", PeekScene],
  ["sprt", SprtScene],
  ["cuped", CupedScene],
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

export const DsExperimentDesign: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
