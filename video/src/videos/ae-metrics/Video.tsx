import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AvoidScene } from "./AvoidScene";
import { ChasmScene } from "./ChasmScene";
import { DisagreeScene } from "./DisagreeScene";
import { EntitiesScene } from "./EntitiesScene";
import { FanScene } from "./FanScene";
import { HookScene } from "./HookScene";
import { LayerScene } from "./LayerScene";
import { NonaddScene } from "./NonaddScene";
import { RapidScene } from "./RapidScene";
import { RatioScene } from "./RatioScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Metrics and the semantic layer" (16:9), Part 8 of the Analytics Engineer
 * interview prep videos, on the editorial page. All eighteen of the page's
 * questions: eight worked through, a scene each, then ten quick ones. Every
 * table, total and multiple ran on the site's Postgres (check.mjs,
 * results.json, data.ts), most on the page's own twelve orders; the layer,
 * the semantic model and the drift are the page's answers, drawn.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["disagree", DisagreeScene],
  ["fan", FanScene],
  ["avoid", AvoidScene],
  ["chasm", ChasmScene],
  ["layer", LayerScene],
  ["entities", EntitiesScene],
  ["nonadd", NonaddScene],
  ["ratio", RatioScene],
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

export const AeMetrics: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
