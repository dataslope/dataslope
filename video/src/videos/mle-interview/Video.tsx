import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { HookScene } from "./HookScene";
import { LlmScene } from "./LlmScene";
import { RoundsScene } from "./RoundsScene";
import { SeriesScene } from "./SeriesScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The interview, now" (16:9), Part 0 of the Machine Learning Engineer
 * interview videos, on the editorial page: the system design prompt then
 * and now, with the red panda beside it; the three rounds and the four areas
 * they probe, each with the parts that answer it; what LLMs added; and the
 * series itself as a chart of its ten topic videos, ending on the bridge
 * into Part 1.
 *
 * No series intro and no question cards, as in the other interview
 * overviews.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["rounds", RoundsScene],
  ["llm", LlmScene],
  ["series", SeriesScene],
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
            // The first scene is fully up at frame 0 (its kicker already
            // inked), so the video's first frame is not a blank page.
            from={i === 0 ? -6 : cut(id)}
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

export const MleInterview: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
