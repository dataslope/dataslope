import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BiasScene } from "./BiasScene";
import { CoefScene } from "./CoefScene";
import { CorrScene } from "./CorrScene";
import { HookScene } from "./HookScene";
import { MedianScene } from "./MedianScene";
import { MetricScene } from "./MetricScene";
import { PresentScene } from "./PresentScene";
import { QuantileScene } from "./QuantileScene";
import { RapidScene } from "./RapidScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Statistics & communication" (16:9), Part 3 of the Data Analyst interview
 * prep videos, on the editorial page. Fourteen questions of the track's
 * statistics and communication page: ten that hide a trap, a scene or a part
 * of one each, then a rapid-fire round of four. Every number ran in pandas
 * 3.0.2 and NumPy in Pyodide (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in Parts 1 and 2 (see da-sql/Video.tsx for how it
 * goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["median", MedianScene],
  ["corr", CorrScene],
  ["coef", CoefScene],
  ["bias", BiasScene],
  ["metric", MetricScene],
  ["quantile", QuantileScene],
  ["present", PresentScene],
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

export const DaStatisticsCommunication: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
