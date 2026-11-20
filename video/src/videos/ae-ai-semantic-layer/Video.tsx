import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CloseScene } from "./CloseScene";
import { EvalScene } from "./EvalScene";
import { HookScene } from "./HookScene";
import { RapidScene } from "./RapidScene";
import { ReadyScene } from "./ReadyScene";
import { ReviewScene } from "./ReviewScene";
import { SemScene } from "./SemScene";
import { T2sScene } from "./T2sScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "AI and the semantic layer" (16:9), Part 9 and the last of the Analytics
 * Engineer interview prep videos, on the editorial page. Six of the page's
 * seven questions: five worked through, a scene each, on one thread (the
 * page's eight orders and their three readings of "revenue": 1,450, 1,190
 * and the governed 440), then one quick one, then the close of the series.
 * Every table, listing and number is read from results.json through data.ts
 * (check.mjs ran them on the site's Postgres); the semantic layer, the
 * assistant and its requests are drawn.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["t2s", T2sScene],
  ["sem", SemScene],
  ["ready", ReadyScene],
  ["eval", EvalScene],
  ["review", ReviewScene],
  ["rapid-in", RapidScene],
  ["close", CloseScene],
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

export const AeAiSemanticLayer: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
