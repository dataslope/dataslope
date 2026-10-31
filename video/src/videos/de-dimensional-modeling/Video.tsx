import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AdditiveScene } from "./AdditiveScene";
import { GrainScene } from "./GrainScene";
import { HookScene } from "./HookScene";
import { KeysScene } from "./KeysScene";
import { MismatchScene } from "./MismatchScene";
import { NfScene } from "./NfScene";
import { NormScene } from "./NormScene";
import { OltpScene } from "./OltpScene";
import { RapidScene } from "./RapidScene";
import { StarScene } from "./StarScene";
import { TypesScene } from "./TypesScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Data modeling I: dimensional modeling" (16:9), Part 3 of the Data
 * Engineer interview prep videos, on the editorial page. Fifteen questions
 * from the first half of the track's data-modeling page: ten worked through,
 * a scene each (facts and the star share one), then five quick ones. Every
 * table and number ran in DuckDB-Wasm (check.mjs, results.json, data.ts);
 * every schema is drawn with the ERD kit.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["facts", StarScene],
  ["grain", GrainScene],
  ["mismatch", MismatchScene],
  ["norm", NormScene],
  ["nf", NfScene],
  ["oltp", OltpScene],
  ["keys", KeysScene],
  ["types", TypesScene],
  ["additive", AdditiveScene],
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

export const DeDimensionalModeling: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
