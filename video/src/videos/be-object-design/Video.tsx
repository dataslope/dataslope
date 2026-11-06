import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CohScene } from "./CohScene";
import { CompScene } from "./CompScene";
import { DipScene } from "./DipScene";
import { HookScene } from "./HookScene";
import { LspScene } from "./LspScene";
import { ObsScene } from "./ObsScene";
import { OverScene } from "./OverScene";
import { RapidScene } from "./RapidScene";
import { SolidScene } from "./SolidScene";
import { StratScene } from "./StratScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Designing objects" (16:9), Part 6 of the Backend / Software Engineer
 * interview videos, on the editorial page. Fifteen questions from the
 * track's object-oriented design page, all argued on one small shop: eight
 * worked through, a scene each, then seven quick ones. No code is drawn; the
 * shop's objects are boxes and arrows, and every count, total and test result
 * on screen ran in Pyodide (check.mjs, results.json, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["coh", CohScene],
  ["comp", CompScene],
  ["lsp", LspScene],
  ["solid", SolidScene],
  ["dip", DipScene],
  ["strat", StratScene],
  ["obs", ObsScene],
  ["over", OverScene],
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
          <Scene key={id} from={i === 0 ? 0 : cut(id)} to={next ? until(cut(next[0])) : durationInFrames + OVERLAP} fade={6}>
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const BeObjectDesign: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
