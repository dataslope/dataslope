import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BdayScene } from "./BdayScene";
import { CondScene } from "./CondScene";
import { DistScene } from "./DistScene";
import { ExpectScene } from "./ExpectScene";
import { HookScene } from "./HookScene";
import { IndepScene } from "./IndepScene";
import { MemoryScene } from "./MemoryScene";
import { MontyScene } from "./MontyScene";
import { PoisScene } from "./PoisScene";
import { RapidScene } from "./RapidScene";
import { TestScene } from "./TestScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Probability" (16:9), Part 2 of the Data Scientist interview prep videos,
 * on the editorial page. Fourteen questions of the track's probability page:
 * twelve worked through with numbers, a scene or part of one each, then two
 * that take a sentence. Every number came out of NumPy and SciPy in Pyodide
 * (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in the Data Analyst videos.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["cond", CondScene],
  ["test", TestScene],
  ["indep", IndepScene],
  ["expect", ExpectScene],
  ["dist", DistScene],
  ["memory", MemoryScene],
  ["pois", PoisScene],
  ["monty", MontyScene],
  ["bday", BdayScene],
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

export const DsProbability: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
