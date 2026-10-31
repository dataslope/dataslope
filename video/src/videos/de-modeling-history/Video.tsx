import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BridgeScene } from "./BridgeScene";
import { HistoryScene } from "./HistoryScene";
import { HookScene } from "./HookScene";
import { LateScene } from "./LateScene";
import { RapidScene } from "./RapidScene";
import { SnapScene } from "./SnapScene";
import { Type0Scene } from "./Type0Scene";
import { Type2Scene } from "./Type2Scene";
import { Types46Scene } from "./Types46Scene";
import { VaultScene } from "./VaultScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Data modeling II: history and special dimensions" (16:9), Part 4 of the
 * Data Engineer interview prep videos, on the editorial page. Fifteen
 * questions from the second half of the track's data-modeling page: nine
 * worked through, a scene each (the bridge table shares its scene with the
 * many-to-many question), then six quick ones. Every table ran in DuckDB, the
 * UUID index sizes in Postgres (check.mjs, results.json, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["scd", HistoryScene],
  ["type2", Type2Scene],
  ["type0", Type0Scene],
  ["type46", Types46Scene],
  ["late", LateScene],
  ["snap", SnapScene],
  ["bridge", BridgeScene],
  ["vault", VaultScene],
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

export const DeModelingHistory: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
