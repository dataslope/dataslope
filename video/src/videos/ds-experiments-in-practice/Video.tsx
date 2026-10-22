import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ConcurrentScene } from "./ConcurrentScene";
import { DidScene } from "./DidScene";
import { HookScene } from "./HookScene";
import { ManyScene } from "./ManyScene";
import { NetworkScene } from "./NetworkScene";
import { NoveltyScene } from "./NoveltyScene";
import { NullScene } from "./NullScene";
import { PitfallsScene } from "./PitfallsScene";
import { RapidScene } from "./RapidScene";
import { SimpsonScene } from "./SimpsonScene";
import { SrmScene } from "./SrmScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Experimentation II: experiments in practice" (16:9), Part 7 of the Data
 * Scientist interview prep videos, on the editorial page. Fourteen questions
 * from the second half of the track's experimentation page: ten worked
 * through, a scene each (switchback shares interference's), then four quick
 * ones. Every number ran in NumPy, SciPy and statsmodels in Pyodide (check.mjs,
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
  ["pitfalls", PitfallsScene],
  ["srm", SrmScene],
  ["nosig", NullScene],
  ["simpson", SimpsonScene],
  ["novelty", NoveltyScene],
  ["many", ManyScene],
  ["network", NetworkScene],
  ["concurrent", ConcurrentScene],
  ["did", DidScene],
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

export const DsExperimentsInPractice: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
