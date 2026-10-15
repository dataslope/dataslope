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
import { SqlNullTrap } from "./videos/sql-null-trap/Video";
import { script as sqlNullTrapScript } from "./videos/sql-null-trap/script";
import { WhyNormalization } from "./videos/why-normalization/Video";
import { script as whyNormalizationScript } from "./videos/why-normalization/script";
import { BaseRate } from "./videos/base-rate/Video";
import { script as baseRateScript } from "./videos/base-rate/script";
import { Overfitting } from "./videos/overfitting/Video";
import { script as overfittingScript } from "./videos/overfitting/script";
import { CPointers } from "./videos/c-pointers/Video";
import { script as cPointersScript } from "./videos/c-pointers/script";
import { WindowFunctions } from "./videos/window-functions/Video";
import { script as windowFunctionsScript } from "./videos/window-functions/script";
import { LeftJoinTrap } from "./videos/left-join-trap/Video";
import { script as leftJoinTrapScript } from "./videos/left-join-trap/script";
import { PandasGroupby } from "./videos/pandas-groupby/Video";
import { script as pandasGroupbyScript } from "./videos/pandas-groupby/script";
import { RandomWalks } from "./videos/random-walks/Video";
import { script as randomWalksScript } from "./videos/random-walks/script";
import { RecursionFib } from "./videos/recursion-fib/Video";
import { script as recursionFibScript } from "./videos/recursion-fib/script";
import { TypeErasure } from "./videos/type-erasure/Video";
import { script as typeErasureScript } from "./videos/type-erasure/script";
import { BoxSizing } from "./videos/box-sizing/Video";
import { script as boxSizingScript } from "./videos/box-sizing/script";
import { LlmTemperature } from "./videos/llm-temperature/Video";
import { script as llmTemperatureScript } from "./videos/llm-temperature/script";
import { TfIdf } from "./videos/tf-idf/Video";
import { script as tfIdfScript } from "./videos/tf-idf/script";
import { JavaEquality } from "./videos/java-equality/Video";
import { script as javaEqualityScript } from "./videos/java-equality/script";
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
        id="SqlNullTrap"
        component={SqlNullTrap}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(sqlNullTrapScript)}
      />
      <Composition
        id="WhyNormalization"
        component={WhyNormalization}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(whyNormalizationScript)}
      />
      <Composition
        id="BaseRate"
        component={BaseRate}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(baseRateScript)}
      />
      <Composition
        id="Overfitting"
        component={Overfitting}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(overfittingScript)}
      />
      <Composition
        id="CPointers"
        component={CPointers}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(cPointersScript)}
      />
      <Composition
        id="WindowFunctions"
        component={WindowFunctions}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(windowFunctionsScript)}
      />
      <Composition
        id="LeftJoinTrap"
        component={LeftJoinTrap}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(leftJoinTrapScript)}
      />
      <Composition
        id="PandasGroupby"
        component={PandasGroupby}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(pandasGroupbyScript)}
      />
      <Composition
        id="RandomWalks"
        component={RandomWalks}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(randomWalksScript)}
      />
      <Composition
        id="RecursionFib"
        component={RecursionFib}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(recursionFibScript)}
      />
      <Composition
        id="TypeErasure"
        component={TypeErasure}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(typeErasureScript)}
      />
      <Composition
        id="BoxSizing"
        component={BoxSizing}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(boxSizingScript)}
      />
      <Composition
        id="LlmTemperature"
        component={LlmTemperature}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(llmTemperatureScript)}
      />
      <Composition
        id="TfIdf"
        component={TfIdf}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(tfIdfScript)}
      />
      <Composition
        id="JavaEquality"
        component={JavaEquality}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(javaEqualityScript)}
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
