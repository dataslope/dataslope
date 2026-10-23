import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { CacheScene } from "./CacheScene";
import { HookScene } from "./HookScene";
import { LeversScene } from "./LeversScene";
import { MarketScene } from "./MarketScene";
import { MonthScene } from "./MonthScene";
import { RequestScene } from "./RequestScene";
import { ResendScene } from "./ResendScene";
import { SheetScene } from "./SheetScene";
import { ThinkScene } from "./ThinkScene";
import { WhyScene } from "./WhyScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "What a token costs" (16:9), Unit 4 of How Large Language Models Work. One
 * argument in three parts, every price, bill and token from the lessons' own
 * code (measure.py, data.ts):
 *
 *   1. The price sheet: HookScene, SheetScene, WhyScene, CacheScene,
 *      MarketScene.
 *   2. Estimating: RequestScene, ResendScene, ThinkScene, MonthScene.
 *   3. Controlling it: LeversScene (and the bridge to Unit 5).
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
        <SeriesIntro course="How Large Language Models Work" unit="Unit 4" title="What a token costs" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("sheet"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("sheet")} to={until(cut("why"))} fade={6}>
        <SheetScene />
      </Scene>
      <Scene from={cut("why")} to={until(cut("cached"))} fade={6}>
        <WhyScene />
      </Scene>
      <Scene from={cut("cached")} to={until(cut("market"))} fade={6}>
        <CacheScene />
      </Scene>
      <Scene from={cut("market")} to={until(cut("request"))} fade={6}>
        <MarketScene />
      </Scene>
      <Scene from={cut("request")} to={until(cut("resend"))} fade={6}>
        <RequestScene />
      </Scene>
      <Scene from={cut("resend")} to={until(cut("think"))} fade={6}>
        <ResendScene />
      </Scene>
      <Scene from={cut("think")} to={until(cut("month"))} fade={6}>
        <ThinkScene />
      </Scene>
      <Scene from={cut("month")} to={until(cut("levers"))} fade={6}>
        <MonthScene />
      </Scene>
      <Scene from={cut("levers")} to={durationInFrames + OVERLAP} fade={6}>
        <LeversScene />
      </Scene>
    </>
  );
};

export const LlmCost: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
