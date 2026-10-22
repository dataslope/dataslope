import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AnovaScene } from "./AnovaScene";
import { ChiScene } from "./ChiScene";
import { CiScene } from "./CiScene";
import { CltScene } from "./CltScene";
import { EffectScene } from "./EffectScene";
import { HackScene } from "./HackScene";
import { HookScene } from "./HookScene";
import { MleScene } from "./MleScene";
import { PvalueScene } from "./PvalueScene";
import { RapidScene } from "./RapidScene";
import { SampleScene } from "./SampleScene";
import { StepsScene } from "./StepsScene";
import { ZtScene } from "./ZtScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Statistics" (16:9), Part 1 of the Data Scientist interview prep videos,
 * on the editorial page. Nineteen questions of the track's statistics page,
 * in the order its ideas build (sampling, estimation, testing): sixteen
 * worked through, a scene or a part of one each, then a quick round of
 * three either-or questions. Every number ran in NumPy and SciPy in Pyodide
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
  ["param", SampleScene],
  ["clt", CltScene],
  ["mle", MleScene],
  ["ci", CiScene],
  ["steps", StepsScene],
  ["pvalue", PvalueScene],
  ["zt", ZtScene],
  ["chi", ChiScene],
  ["anova", AnovaScene],
  ["effect", EffectScene],
  ["hack", HackScene],
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

export const DsStatistics: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
