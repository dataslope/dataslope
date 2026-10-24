import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BlendScene, HeadsScene, QkvScene, TrophyScene } from "./AttentionScenes";
import { IdsScene, OrderScene, SpaceScene } from "./EmbeddingScenes";
import { ExpertsScene, ParamsScene, PathScene, TopScene } from "./ShapeScenes";
import { BlindScene, CosineScene, SearchScene } from "./SimilarityScenes";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "From ids to meaning" (16:9), Unit 2 of How Large Language Models Work. One
 * argument in four parts, every id, vector and count from the lessons' own
 * code re-run with NumPy and tiktoken (measure.py, data.ts):
 *
 *   1. Embeddings: IdsScene, SpaceScene, OrderScene.
 *   2. Similarity: CosineScene, SearchScene, BlindScene.
 *   3. Attention: TrophyScene, QkvScene, BlendScene, HeadsScene.
 *   4. The shape of a transformer: PathScene, ParamsScene, ExpertsScene,
 *      TopScene (and the bridge to Unit 3).
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
        <SeriesIntro course="How Large Language Models Work" unit="Unit 2" title="From ids to meaning" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("geometry"))} fade={6}>
        <IdsScene />
      </Scene>
      <Scene from={cut("geometry")} to={until(cut("order"))} fade={6}>
        <SpaceScene />
      </Scene>
      <Scene from={cut("order")} to={until(cut("ruler"))} fade={6}>
        <OrderScene />
      </Scene>
      <Scene from={cut("ruler")} to={until(cut("search"))} fade={6}>
        <CosineScene />
      </Scene>
      <Scene from={cut("search")} to={until(cut("blind"))} fade={6}>
        <SearchScene />
      </Scene>
      <Scene from={cut("blind")} to={until(cut("trophy"))} fade={6}>
        <BlindScene />
      </Scene>
      <Scene from={cut("trophy")} to={until(cut("query-vec"))} fade={6}>
        <TrophyScene />
      </Scene>
      <Scene from={cut("query-vec")} to={until(cut("scores"))} fade={6}>
        <QkvScene />
      </Scene>
      <Scene from={cut("scores")} to={until(cut("heads"))} fade={6}>
        <BlendScene />
      </Scene>
      <Scene from={cut("heads")} to={until(cut("path"))} fade={6}>
        <HeadsScene />
      </Scene>
      <Scene from={cut("path")} to={until(cut("params"))} fade={6}>
        <PathScene />
      </Scene>
      <Scene from={cut("params")} to={until(cut("experts"))} fade={6}>
        <ParamsScene />
      </Scene>
      <Scene from={cut("experts")} to={until(cut("top"))} fade={6}>
        <ExpertsScene />
      </Scene>
      <Scene from={cut("top")} to={durationInFrames + OVERLAP} fade={6}>
        <TopScene />
      </Scene>
    </>
  );
};

export const LlmMeaning: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
