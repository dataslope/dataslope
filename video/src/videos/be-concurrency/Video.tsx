import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AsyncScene } from "./AsyncScene";
import { BlockScene } from "./BlockScene";
import { ChooseScene } from "./ChooseScene";
import { ConcScene } from "./ConcScene";
import { DeadScene } from "./DeadScene";
import { GilScene } from "./GilScene";
import { HookScene } from "./HookScene";
import { ProcScene } from "./ProcScene";
import { RaceScene } from "./RaceScene";
import { RapidScene } from "./RapidScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Concurrency" (16:9), Part 5 of the Backend / Software Engineer interview
 * videos, on the editorial page. The page's sixteen questions: nine worked
 * through, a scene each (questions 5 and 6 share one), then seven quickly.
 * Every number came out of check.mjs (results.json, data.ts): the race and
 * the deadlock are every possible order of a small model, counted, and the
 * event loop is the page's own asyncio block, run.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["conc", ConcScene],
  ["proc", ProcScene],
  ["race", RaceScene],
  ["gil", GilScene],
  ["dead", DeadScene],
  ["async", AsyncScene],
  ["block", BlockScene],
  ["choose", ChooseScene],
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

export const BeConcurrency: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
