import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BatchScene } from "./BatchScene";
import { CleanScene } from "./CleanScene";
import { DedupScene } from "./DedupScene";
import { FileScene } from "./FileScene";
import { GenScene } from "./GenScene";
import { HashScene } from "./HashScene";
import { HookScene } from "./HookScene";
import { IdemScene } from "./IdemScene";
import { IterScene } from "./IterScene";
import { JoinScene } from "./JoinScene";
import { RapidScene } from "./RapidScene";
import { RetryScene } from "./RetryScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Python for data engineering" (16:9), Part 5 of the Data Engineer interview
 * prep videos, on the editorial page. The eighteen questions of the track's
 * Python page: fourteen worked in Python, a scene or a part of one each, then
 * four quickly. Every snippet, console line, error and measurement ran in
 * Pyodide (check.mjs, results.json, data.ts); question 6's times are the
 * course video ListVsSet's.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["gen", GenScene],
  ["file", FileScene],
  ["iter", IterScene],
  ["hash", HashScene],
  ["dedup", DedupScene],
  ["join", JoinScene],
  ["batch", BatchScene],
  ["retry", RetryScene],
  ["idem", IdemScene],
  ["clean", CleanScene],
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

export const DePython: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
