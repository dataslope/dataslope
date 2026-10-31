import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { GroupScene } from "./GroupScene";
import { HookScene } from "./HookScene";
import { IdemScene } from "./IdemScene";
import { PressureScene } from "./PressureScene";
import { RapidScene } from "./RapidScene";
import { SemanticsScene } from "./SemanticsScene";
import { TimeScene } from "./TimeScene";
import { TopicScene } from "./TopicScene";
import { WindowsScene } from "./WindowsScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Streaming & messaging" (16:9), Part 8 of the Data Engineer interview prep
 * videos, on the editorial page. Fifteen questions from the track's
 * streaming page (and four moved from Pipelines and one from Orchestration):
 * twelve worked through in seven scenes on the video's own stream of twelve
 * clicks, then three quick ones. Every number comes from a seeded model in
 * Pyodide (check.mjs, results.json, data.ts); no Kafka runs here.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["topic", TopicScene],
  ["group", GroupScene],
  ["semantics", SemanticsScene],
  ["idem", IdemScene],
  ["time", TimeScene],
  ["windows", WindowsScene],
  ["pressure", PressureScene],
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

export const DeStreaming: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
