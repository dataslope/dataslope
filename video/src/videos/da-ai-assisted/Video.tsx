import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ChangedScene } from "./ChangedScene";
import { CheckScene } from "./CheckScene";
import { HallucinateScene } from "./HallucinateScene";
import { HookScene } from "./HookScene";
import { MistakesScene } from "./MistakesScene";
import { PrivacyScene } from "./PrivacyScene";
import { RapidScene } from "./RapidScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "AI-assisted analysis" (16:9), Part 8 and the last of the Data Analyst
 * interview prep videos, on the editorial page. Nine questions of the track's
 * AI-assisted analysis page: six in full, a scene or a part of one each, then
 * three short ones and the series' closing line. Every query and result ran
 * in DuckDB (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in Parts 1 to 7 (see da-sql/Video.tsx for how it
 * goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["changed", ChangedScene],
  ["check", CheckScene],
  ["mistakes", MistakesScene],
  ["hallucinate", HallucinateScene],
  ["privacy", PrivacyScene],
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

export const DaAiAssisted: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
