import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { AreaScene } from "./AreaScene";
import { CastScene } from "./CastScene";
import { ChooseScene } from "./ChooseScene";
import { GeometricScene } from "./GeometricScene";
import { HeightScene } from "./HeightScene";
import { PoissonScene } from "./PoissonScene";
import { QuantileScene } from "./QuantileScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("hook"))} fade={8}>
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 4" title="Distributions" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("poisson"))} fade={6}>
        <CastScene />
      </Scene>
      <Scene from={cut("poisson")} to={until(cut("geometric"))} fade={6}>
        <PoissonScene />
      </Scene>
      <Scene from={cut("geometric")} to={until(cut("choose"))} fade={6}>
        <GeometricScene />
      </Scene>
      <Scene from={cut("choose")} to={until(cut("exact"))} fade={6}>
        <ChooseScene />
      </Scene>
      <Scene from={cut("exact")} to={until(cut("uniform"))} fade={6}>
        <AreaScene />
      </Scene>
      <Scene from={cut("uniform")} to={until(cut("quantile"))} fade={6}>
        <HeightScene />
      </Scene>
      <Scene from={cut("quantile")} to={durationInFrames + OVERLAP} fade={6}>
        <QuantileScene />
      </Scene>
    </>
  );
};

export const Distributions: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
