import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AxisScene } from "./AxisScene";
import { ChooseScene } from "./ChooseScene";
import { DashScene } from "./DashScene";
import { DualScene } from "./DualScene";
import { HistScene } from "./HistScene";
import { HookScene } from "./HookScene";
import { LineScene } from "./LineScene";
import { LogScene } from "./LogScene";
import { PaletteScene } from "./PaletteScene";
import { RapidScene } from "./RapidScene";
import { StoryScene } from "./StoryScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Data visualization" (16:9), Part 6 of the Data Analyst interview prep
 * videos, on the editorial page. All twenty-two of the track's visualization
 * questions: seventeen drawn the wrong way and the right way, two to a scene
 * where they belong together, then a quick round of five. Every number is
 * the page's own chart data, computed by check.mjs (results.json, data.ts).
 *
 * No series intro yet, as in Parts 1 to 5 (see da-sql/Video.tsx for how it
 * goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["choose", ChooseScene],
  ["line", LineScene],
  ["hist", HistScene],
  ["axis", AxisScene],
  ["log", LogScene],
  ["dual", DualScene],
  ["dash", DashScene],
  ["story", StoryScene],
  ["palette", PaletteScene],
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

export const DaVisualization: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
