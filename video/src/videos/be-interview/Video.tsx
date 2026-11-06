import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AiScene } from "./AiScene";
import { HookScene } from "./HookScene";
import { SeriesScene } from "./SeriesScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The interview, now" (16:9), Part 0 of the Backend / Software Engineer
 * interview videos, on the editorial page: the two follow-ups every later
 * part trains for, with the capybara beside them, over the five things the
 * rounds probe; how AI split the coding round in two, why take-homes lost
 * their signal and where the time went; and the series itself as a chart of
 * its nine topic videos, ending on the bridge into Part 1.
 *
 * No series intro and no question cards, as in the other interview
 * overviews.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["ai", AiScene],
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

export const BeInterview: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
