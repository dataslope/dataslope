import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AbScene } from "./AbScene";
import { ChangedScene } from "./ChangedScene";
import { CheckScene } from "./CheckScene";
import { HookScene } from "./HookScene";
import { JudgeScene } from "./JudgeScene";
import { MeasureScene } from "./MeasureScene";
import { PrevScene } from "./PrevScene";
import { RapidScene } from "./RapidScene";
import { SizeScene } from "./SizeScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "LLM evaluation" (16:9), Part 11 and the last of the Data Scientist
 * interview prep videos, on the editorial page. The page's nine questions:
 * seven worked through, a scene each, then two in a sentence or two, and the
 * close of the series. Every number is the page's own arithmetic or labelled
 * as the video's own, and came out of check.mjs (results.json, data.ts).
 *
 * No series intro yet, as in the other parts.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["changed", ChangedScene],
  ["measure", MeasureScene],
  ["size", SizeScene],
  ["judge", JudgeScene],
  ["ab", AbScene],
  ["prev", PrevScene],
  ["check", CheckScene],
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

export const DsLlmEvaluation: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
