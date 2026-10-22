import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ApproxScene } from "./ApproxScene";
import { HookScene } from "./HookScene";
import { LookupScene } from "./LookupScene";
import { PivotScene } from "./PivotScene";
import { RapidScene } from "./RapidScene";
import { RefsScene } from "./RefsScene";
import { ToolScene } from "./ToolScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Excel & spreadsheets" (16:9), Part 5 of the Data Analyst interview prep
 * videos, on the editorial page. The eighteen questions of the track's
 * spreadsheet page: ten worked on one small workbook, a scene or a part of
 * one each, then eight one-formula answers. Every result was computed in
 * HyperFormula (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in Parts 1 to 4 (see da-sql/Video.tsx for how it
 * goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["pivot", PivotScene],
  ["lookup", LookupScene],
  ["approx", ApproxScene],
  ["refs", RefsScene],
  ["tool", ToolScene],
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

export const DaSpreadsheets: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
