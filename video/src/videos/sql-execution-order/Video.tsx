import React from "react";
import { AbsoluteFill } from "remotion";
import { Scene } from "../../components/Scene";
import { Captions } from "../../narration/Captions";
import type { NarratedProps } from "../../narration/metadata";
import { NarrationAudio } from "../../narration/NarrationAudio";
import { NarrationProvider, useNarration } from "../../narration/NarrationContext";
import { colors } from "../../theme/brand";
import { ErrorScene } from "./ErrorScene";
import { OutroScene } from "./OutroScene";
import { PatternWipe, WIPE } from "./PatternWipe";
import { QueryCard } from "./QueryCard";
import { RuleScene } from "./RuleScene";
import { TitleScene } from "./TitleScene";
import { TracePanel } from "./TracePanel";

/**
 * "SQL doesn't run in the order you write it" (16:9).
 *
 * Act 1 rearranges the query into execution order and traces ten rows
 * through it; act 2 is the alias error, why it happens and how to fix it;
 * then the rule and the end card. Scene boundaries are narration beats, and
 * every animation inside a scene is cued to a word (see script.ts).
 */
export const SqlExecutionOrder: React.FC<NarratedProps> = ({ timeline, captions }) =>
  timeline ? (
    <NarrationProvider timeline={timeline}>
      <Body captions={captions} />
    </NarrationProvider>
  ) : null;

const Body: React.FC<{ captions: boolean }> = ({ captions }) => {
  const n = useNarration();
  const queryFrom = n.beat("written").from - 6;
  const wipeAt = n.beat("error-setup").from - WIPE.in - 2;
  const swap = wipeAt + WIPE.in;
  const ruleFrom = n.beat("rule").from - 10;
  const outroFrom = n.beat("outro").from - 10;
  const end = n.durationInFrames;

  return (
    <AbsoluteFill style={{ background: colors.page }}>
      <Scene from={0} to={queryFrom + 8}>
        <TitleScene />
      </Scene>
      <Scene from={queryFrom} to={swap} fade={6}>
        <AbsoluteFill style={{ background: colors.page }}>
          <QueryCard />
          <TracePanel />
        </AbsoluteFill>
      </Scene>
      <Scene from={swap} to={ruleFrom + 8} fade={1}>
        <ErrorScene />
      </Scene>
      <Scene from={ruleFrom} to={outroFrom + 8}>
        <RuleScene />
      </Scene>
      <Scene from={outroFrom} to={end + 8}>
        <OutroScene />
      </Scene>
      <PatternWipe at={wipeAt} />
      <NarrationAudio />
      {captions ? <Captions variant="landscape" /> : null}
    </AbsoluteFill>
  );
};
