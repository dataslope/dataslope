import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CloseScene } from "./CloseScene";
import { CostScene } from "./CostScene";
import { DailyScene } from "./DailyScene";
import { DesignScene } from "./DesignScene";
import { GradeScene } from "./GradeScene";
import { HookScene } from "./HookScene";
import { HourScene } from "./HourScene";
import { InjectionScene } from "./InjectionScene";
import { JitterScene } from "./JitterScene";
import { PromptScene } from "./PromptScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The AI-allowed round" (16:9), Part 9 and the last of the Backend / Software
 * Engineer interview prep videos, on the editorial page. The page's seven
 * questions this part keeps, all worked through, a scene each (the LLM
 * feature's jitter follow-up gets its own), then the close of the series,
 * which has no "Next" line. Every listing and number comes from the page or
 * from check.mjs (results.json, data.ts); the retry waves are a seeded
 * simulation, and say so.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["grade", GradeScene],
  ["hour", HourScene],
  ["prompt", PromptScene],
  ["design", DesignScene],
  ["design-jitter", JitterScene],
  ["cost", CostScene],
  ["inj", InjectionScene],
  ["daily", DailyScene],
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

export const BeAiRound: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
