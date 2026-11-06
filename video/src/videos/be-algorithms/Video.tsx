import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AmortScene } from "./AmortScene";
import { BfsScene } from "./BfsScene";
import { BigScene } from "./BigScene";
import { DijkScene } from "./DijkScene";
import { HashScene } from "./HashScene";
import { HookScene } from "./HookScene";
import { PqScene } from "./PqScene";
import { QuickScene } from "./QuickScene";
import { RapidOneScene } from "./RapidOneScene";
import { RapidTwoScene } from "./RapidTwoScene";
import { StackScene } from "./StackScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Algorithms as reasoning" (16:9), Part 8 of the Backend / Software
 * Engineer interview prep videos, on the editorial page. All thirty-five of
 * the track's algorithms questions: eight worked through, a scene each, three
 * more answered inside them, then twenty-four in two quick rounds. Every
 * count ran in Pyodide (check.mjs, results.json, data.ts); no code is typed,
 * each answer is a structure drawn and an operation counted.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["big", BigScene],
  ["hash", HashScene],
  ["amort", AmortScene],
  ["stack", StackScene],
  ["bfs", BfsScene],
  ["pq", PqScene],
  ["dijk", DijkScene],
  ["quick", QuickScene],
  ["rapid-in", RapidOneScene],
  ["rapid2-in", RapidTwoScene],
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

export const BeAlgorithms: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
