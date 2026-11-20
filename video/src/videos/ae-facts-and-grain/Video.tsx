import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AdditiveScene } from "./AdditiveScene";
import { BridgeScene } from "./BridgeScene";
import { ClosingScene } from "./ClosingScene";
import { FactsScene } from "./FactsScene";
import { GrainScene } from "./GrainScene";
import { HashScene } from "./HashScene";
import { HookScene } from "./HookScene";
import { RapidOneScene } from "./RapidOneScene";
import { RapidTwoScene } from "./RapidTwoScene";
import { RatioScene } from "./RatioScene";
import { RoleScene } from "./RoleScene";
import { SkScene } from "./SkScene";
import { StarScene } from "./StarScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Facts, dimensions and grain" (16:9), Part 1 of the Analytics Engineer
 * interview videos, on the editorial page. The dimensional-modeling page's
 * twenty-two questions for this part: nine worked through, a scene each,
 * then thirteen quick ones over two pages of the rapid round, and the
 * bridge to Part 2. Every table and number ran in Postgres (check.mjs,
 * results.json, data.ts); every schema is drawn with the ERD kit.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["facts", FactsScene],
  ["grain", GrainScene],
  ["star", StarScene],
  ["sk", SkScene],
  ["hash", HashScene],
  ["additive", AdditiveScene],
  ["ratio", RatioScene],
  ["role", RoleScene],
  ["bridge", BridgeScene],
  ["rapid-in", RapidOneScene],
  ["r-confirmed", RapidTwoScene],
  ["next", ClosingScene],
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

export const AeFactsAndGrain: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
