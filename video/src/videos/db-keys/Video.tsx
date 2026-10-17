import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { ChooseScene } from "./ChooseScene";
import { DeleteScene } from "./DeleteScene";
import { EmailScene } from "./EmailScene";
import { IdentityScene } from "./IdentityScene";
import { KindsScene } from "./KindsScene";
import { OrphanScene } from "./OrphanScene";
import { PointScene } from "./PointScene";
import { RosterScene } from "./RosterScene";
import { RulesScene } from "./RulesScene";
import { WalletScene } from "./WalletScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Keys and integrity" (16:9), Unit 4 of Database Design with PostgreSQL, on
 * the editorial page. One argument in four parts, every table, statement and
 * error from PGlite (check.mjs, results.json, data.ts):
 *
 *   1. Primary keys: IdentityScene, RulesScene, RosterScene.
 *   2. Natural or surrogate: KindsScene, WalletScene, EmailScene.
 *   3. Foreign keys: PointScene, OrphanScene.
 *   4. Referential integrity: DeleteScene, ChooseScene.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", IdentityScene],
  ["rules", RulesScene],
  ["roster", RosterScene],
  ["kinds", KindsScene],
  ["wallet", WalletScene],
  ["email", EmailScene],
  ["fk", PointScene],
  ["defend", OrphanScene],
  ["delete", DeleteScene],
  ["choose", ChooseScene],
];

const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("hook"))} fade={8}>
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 4" title="Keys and integrity" />
      </Scene>
      {SCENES.map(([id, Body], i) => {
        const next = SCENES[i + 1];
        return (
          <Scene key={id} from={cut(id)} to={next ? until(cut(next[0])) : durationInFrames + OVERLAP} fade={6}>
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const DbKeys: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
