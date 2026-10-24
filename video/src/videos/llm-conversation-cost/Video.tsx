import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BillsScene } from "./BillsScene";
import { CacheScene } from "./CacheScene";
import { FreshScene } from "./FreshScene";
import { HookScene } from "./HookScene";
import { StairsScene } from "./StairsScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Why a chat's bill grows faster than the chat" (16:9), a deep dive in Unit
 * 4 of How Large Language Models Work. It opens straight on its puzzle (no
 * series intro) and ends on its takeaway; every token count and bill is
 * estimating-cost's own `conversation_cost` (measure.py, data.ts).
 *
 *   HookScene    twice the turns, about three times the bill
 *   StairsScene  no memory, so every turn resends the chat: the staircase;
 *                then the bill as its area, a rectangle and a triangle (one
 *                scene, so the chart never cross-fades with itself)
 *   BillsScene   10, 20, 40 turns, and each doubling heading toward four
 *   CacheScene   the repeat at a twentieth: the staircase flattens
 *   FreshScene   eight short chats against one long one, and the takeaway
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
      <Scene from={0} to={until(cut("memory"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("memory")} to={until(cut("bills"))} fade={6}>
        <StairsScene />
      </Scene>
      <Scene from={cut("bills")} to={until(cut("cache"))} fade={6}>
        <BillsScene />
      </Scene>
      <Scene from={cut("cache")} to={until(cut("fresh"))} fade={6}>
        <CacheScene />
      </Scene>
      <Scene from={cut("fresh")} to={durationInFrames + OVERLAP} fade={6}>
        <FreshScene />
      </Scene>
    </>
  );
};

export const LlmConversationCost: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
