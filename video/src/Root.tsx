import React from "react";
import { Composition, Folder } from "remotion";
import "./theme/brand";
import "./theme/fonts";
import { narratedMetadata, type NarratedProps } from "./narration/metadata";
import { SqlExecutionOrder } from "./videos/sql-execution-order/Video";
import { script as sqlScript } from "./videos/sql-execution-order/script";
import { TabsVsSpaces } from "./videos/tabs-vs-spaces/Video";
import { script as tabsScript } from "./videos/tabs-vs-spaces/script";
import { BinarySearch } from "./videos/binary-search/Video";
import { script as binarySearchScript } from "./videos/binary-search/script";
import { FloatingPoint } from "./videos/floating-point/Video";
import { script as floatingPointScript } from "./videos/floating-point/script";
import { EDITORIAL_DEFAULTS, type EditorialProps } from "./editorial/Page";
import { CentralLimitTheorem } from "./videos/central-limit-theorem/Video";
import { script as centralLimitTheoremScript } from "./videos/central-limit-theorem/script";
import { ListVsSet } from "./videos/list-vs-set/Video";
import { script as listVsSetScript } from "./videos/list-vs-set/script";
import { SimpsonsParadox } from "./videos/simpsons-paradox/Video";
import { script as simpsonsParadoxScript } from "./videos/simpsons-paradox/script";
import { LlmTokens } from "./videos/llm-tokens/Video";
import { script as llmTokensScript } from "./videos/llm-tokens/script";
import { EventLoop } from "./videos/event-loop/Video";
import { script as eventLoopScript } from "./videos/event-loop/script";

// Every composition is laid out in 1080p CSS pixels and rendered with
// `--scale=2` for 4K (3840x2160, or 2160x3840 for vertical). Duration comes
// from the narration timeline, so `durationInFrames` here is a placeholder
// that `calculateMetadata` replaces.
const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Landscape">
      <Composition
        id="SqlExecutionOrder"
        component={SqlExecutionOrder}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ timeline: null, captions: true } satisfies NarratedProps}
        calculateMetadata={narratedMetadata<NarratedProps>(sqlScript)}
      />
      <Composition
        id="FloatingPoint"
        component={FloatingPoint}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ timeline: null, captions: true } satisfies NarratedProps}
        calculateMetadata={narratedMetadata<NarratedProps>(floatingPointScript)}
      />
      <Composition
        id="CentralLimitTheorem"
        component={CentralLimitTheorem}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(centralLimitTheoremScript)}
      />
      <Composition
        id="ListVsSet"
        component={ListVsSet}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(listVsSetScript)}
      />
      <Composition
        id="EventLoop"
        component={EventLoop}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ timeline: null, captions: true } satisfies NarratedProps}
        calculateMetadata={narratedMetadata<NarratedProps>(eventLoopScript)}
      />
      <Composition
        id="SimpsonsParadox"
        component={SimpsonsParadox}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(simpsonsParadoxScript)}
      />
    </Folder>
    <Folder name="Vertical">
      <Composition
        id="TabsVsSpaces"
        component={TabsVsSpaces}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 45}
        defaultProps={{ timeline: null, captions: true } satisfies NarratedProps}
        calculateMetadata={narratedMetadata<NarratedProps>(tabsScript)}
      />
      <Composition
        id="BinarySearch"
        component={BinarySearch}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 45}
        defaultProps={{ timeline: null, captions: true } satisfies NarratedProps}
        calculateMetadata={narratedMetadata<NarratedProps>(binarySearchScript)}
      />
      <Composition
        id="LlmTokens"
        component={LlmTokens}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={FPS * 45}
        defaultProps={{ timeline: null, captions: true } satisfies NarratedProps}
        calculateMetadata={narratedMetadata<NarratedProps>(llmTokensScript)}
      />
    </Folder>
  </>
);
