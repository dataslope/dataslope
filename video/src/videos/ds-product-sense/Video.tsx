import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { DropScene } from "./DropScene";
import { HookScene } from "./HookScene";
import { LeadScene } from "./LeadScene";
import { NoiseScene } from "./NoiseScene";
import { NorthScene } from "./NorthScene";
import { RapidScene } from "./RapidScene";
import { RecScene } from "./RecScene";
import { SaveScene } from "./SaveScene";
import { SizeScene } from "./SizeScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Product sense & metrics" (16:9), Part 8 of the Data Scientist interview
 * prep videos, on the editorial page. Fourteen questions of the track's
 * product-sense page: eleven worked through on one made-up recipe app, a
 * scene or part of one each, then three in a sentence. The page has no data
 * of its own, so every product number is the video's own and labelled so;
 * the arithmetic on them came out of check.mjs (results.json, data.ts).
 *
 * No series intro yet, as in the other parts.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["north", NorthScene],
  ["lead", LeadScene],
  ["save", SaveScene],
  ["drop", DropScene],
  ["noise", NoiseScene],
  ["rec", RecScene],
  ["market", SizeScene],
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

export const DsProductSense: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
