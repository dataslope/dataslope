import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";

/** Placeholder for "From ids to meaning", Unit 2 of How Large Language Models Work; its builder replaces it. */
const Scenes: React.FC = () => {
  const { beat } = useNarration();
  return (
    <Scene from={0} to={beat("hook").from} fade={8}>
      <SeriesIntro course="How Large Language Models Work" unit="Unit 2" title="From ids to meaning" />
    </Scene>
  );
};

export const LlmMeaning: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
