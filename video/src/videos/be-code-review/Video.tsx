import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BugsScene } from "./BugsScene";
import { DebugScene } from "./DebugScene";
import { HookScene } from "./HookScene";
import { ReviewScene } from "./ReviewScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Reading and reviewing code" (16:9), Part 7 of the Backend / Software
 * Engineer interview videos, on the editorial page. The one video in the
 * series with code on screen, to be read: the page's eight-line
 * merge_intervals, the assistant's diff and its tests, and every run of them
 * (check.mjs, Pyodide, results.json, data.ts). Three questions, each a scene:
 * the bugs assistants write, the debugging round worked on our eight lines,
 * and the review of the diff as it arrived.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["bugs", BugsScene],
  ["debug", DebugScene],
  ["review", ReviewScene],
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

export const BeCodeReview: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
