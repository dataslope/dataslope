import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AuthScene } from "./AuthScene";
import { CodesScene } from "./CodesScene";
import { HookScene } from "./HookScene";
import { IdemScene } from "./IdemScene";
import { LimitScene } from "./LimitScene";
import { MethodsScene } from "./MethodsScene";
import { PageScene } from "./PageScene";
import { RapidScene } from "./RapidScene";
import { RestScene } from "./RestScene";
import { StylesScene } from "./StylesScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "API design" (16:9), Part 3 of the Backend / Software Engineer interview
 * prep videos, on the editorial page. All sixteen of the page's questions:
 * ten worked through, a scene each (status codes with 401 against 403,
 * sessions and tokens with when to choose them), then six quick ones. The
 * pagination and idempotency figures ran in the site's Postgres, and the
 * token, cursor and gzip sizes in Node (check.mjs, results.json, data.ts);
 * the rest are the page's answers, drawn.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["rest", RestScene],
  ["methods", MethodsScene],
  ["codes", CodesScene],
  ["idem", IdemScene],
  ["page", PageScene],
  ["auth", AuthScene],
  ["limit", LimitScene],
  ["styles", StylesScene],
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

export const BeApiDesign: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
