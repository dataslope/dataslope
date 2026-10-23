import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { OpenScene } from "./OpenScene";
import { CloseScene } from "./CloseScene";
import { ElizaScene } from "./ElizaScene";
import { GeorgetownScene } from "./GeorgetownScene";
import { IdfScene } from "./IdfScene";
import { ShannonScene } from "./ShannonScene";
import { TuringScene } from "./TuringScene";
import { VectorScene } from "./VectorScene";
import { ZipfScene } from "./ZipfScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "How the field got here" (16:9), Unit 5 of Natural Language Processing with
 * Python and the course's last video: seven stories in the order they
 * happened, between a timeline that opens the video and returns to close it.
 * Every count, reply, weight and neighbour from measure.py (data.ts), every
 * date and quotation from the sources in script.ts:
 *
 *   Opening: OpenScene (Fig. 1).
 *   1. Zipf, the 1930s: ZipfScene (Figs. 2, 3).
 *   2. Shannon, 1948: ShannonScene (Figs. 4, 5).
 *   3. Turing, 1950: TuringScene (Fig. 6).
 *   4. Georgetown–IBM, 1954: GeorgetownScene (Figs. 7, 8).
 *   5. ELIZA, 1966: ElizaScene (Fig. 9).
 *   6. Spärck Jones, 1972: IdfScene (Fig. 10).
 *   7. word2vec, 2013: VectorScene (Figs. 11, 12).
 *   Close: CloseScene (Fig. 1 again). The course's last video: no NextLine.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("hook"))} fade={8}>
        <SeriesIntro course="Natural Language Processing with Python" unit="Unit 5" title="How the field got here" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("zipf"))} fade={6}>
        <OpenScene />
      </Scene>
      <Scene from={cut("zipf")} to={until(cut("shannon"))} fade={6}>
        <ZipfScene />
      </Scene>
      <Scene from={cut("shannon")} to={until(cut("turing"))} fade={6}>
        <ShannonScene />
      </Scene>
      <Scene from={cut("turing")} to={until(cut("georgetown"))} fade={6}>
        <TuringScene />
      </Scene>
      <Scene from={cut("georgetown")} to={until(cut("eliza"))} fade={6}>
        <GeorgetownScene />
      </Scene>
      <Scene from={cut("eliza")} to={until(cut("sparck"))} fade={6}>
        <ElizaScene />
      </Scene>
      <Scene from={cut("sparck")} to={until(cut("w2v"))} fade={6}>
        <IdfScene />
      </Scene>
      <Scene from={cut("w2v")} to={until(cut("close"))} fade={6}>
        <VectorScene />
      </Scene>
      <Scene from={cut("close")} to={durationInFrames + OVERLAP} fade={6}>
        <CloseScene />
      </Scene>
    </>
  );
};

export const NlpHistory: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
