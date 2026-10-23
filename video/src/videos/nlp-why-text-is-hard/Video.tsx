import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";

/** Placeholder for "Why text is hard", Unit 1 of Natural Language Processing with Python; its builder replaces it. */
const Scenes: React.FC = () => {
  const { beat } = useNarration();
  return (
    <Scene from={0} to={beat("hook").from} fade={8}>
      <SeriesIntro course="Natural Language Processing with Python" unit="Unit 1" title="Why text is hard" />
    </Scene>
  );
};

export const NlpWhyTextIsHard: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
