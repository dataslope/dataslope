import React from "react";
import { Composition, Folder, Still } from "remotion";
import "./theme/brand";
import "./theme/fonts";
import { narratedMetadata } from "./narration/metadata";
import { EDITORIAL_DEFAULTS, type EditorialProps } from "./editorial/Page";
import { H as PAGE_H, PaperSource, W as PAGE_W } from "./editorial/ui";
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
import { SamplingBias } from "./videos/sampling-bias/Video";
import { script as samplingBiasScript } from "./videos/sampling-bias/script";
import { SurvivorshipBias } from "./videos/survivorship-bias/Video";
import { script as survivorshipBiasScript } from "./videos/survivorship-bias/script";
import { SamplingDistributions } from "./videos/sampling-distributions/Video";
import { script as samplingDistributionsScript } from "./videos/sampling-distributions/script";
import { StandardError } from "./videos/standard-error/Video";
import { script as standardErrorScript } from "./videos/standard-error/script";
import { ThinkingStatistically } from "./videos/thinking-statistically/Video";
import { script as thinkingStatisticallyScript } from "./videos/thinking-statistically/script";
// Statistics course, Units 2 to 9 (Unit 1 and Unit 5 are above).
import { MeanVsMedian } from "./videos/mean-vs-median/Video";
import { script as meanVsMedianScript } from "./videos/mean-vs-median/script";
import { MeasuringSpread } from "./videos/measuring-spread/Video";
import { script as measuringSpreadScript } from "./videos/measuring-spread/script";
import { ShapeAndOutliers } from "./videos/shape-and-outliers/Video";
import { script as shapeAndOutliersScript } from "./videos/shape-and-outliers/script";
import { PlotFirst } from "./videos/plot-first/Video";
import { script as plotFirstScript } from "./videos/plot-first/script";
import { LongRunFrequency } from "./videos/long-run-frequency/Video";
import { script as longRunFrequencyScript } from "./videos/long-run-frequency/script";
import { ConditioningIndependence } from "./videos/conditioning-independence/Video";
import { script as conditioningIndependenceScript } from "./videos/conditioning-independence/script";
import { MontyHall } from "./videos/monty-hall/Video";
import { script as montyHallScript } from "./videos/monty-hall/script";
import { ExpectedValue } from "./videos/expected-value/Video";
import { script as expectedValueScript } from "./videos/expected-value/script";
import { CountingDistributions } from "./videos/counting-distributions/Video";
import { script as countingDistributionsScript } from "./videos/counting-distributions/script";
import { ProbabilityIsArea } from "./videos/probability-is-area/Video";
import { script as probabilityIsAreaScript } from "./videos/probability-is-area/script";
import { NormalDistribution } from "./videos/normal-distribution/Video";
import { script as normalDistributionScript } from "./videos/normal-distribution/script";
import { FittingDistributions } from "./videos/fitting-distributions/Video";
import { script as fittingDistributionsScript } from "./videos/fitting-distributions/script";
import { ConfidenceIntervals } from "./videos/confidence-intervals/Video";
import { script as confidenceIntervalsScript } from "./videos/confidence-intervals/script";
import { IntervalWidth } from "./videos/interval-width/Video";
import { script as intervalWidthScript } from "./videos/interval-width/script";
import { Bootstrap } from "./videos/bootstrap/Video";
import { script as bootstrapScript } from "./videos/bootstrap/script";
import { TestLogic } from "./videos/test-logic/Video";
import { script as testLogicScript } from "./videos/test-logic/script";
import { PValues } from "./videos/p-values/Video";
import { script as pValuesScript } from "./videos/p-values/script";
import { PHacking } from "./videos/p-hacking/Video";
import { script as pHackingScript } from "./videos/p-hacking/script";
import { ErrorsAndPower } from "./videos/errors-and-power/Video";
import { script as errorsAndPowerScript } from "./videos/errors-and-power/script";
import { TTests } from "./videos/t-tests/Video";
import { script as tTestsScript } from "./videos/t-tests/script";
import { AnovaChiSquare } from "./videos/anova-chi-square/Video";
import { script as anovaChiSquareScript } from "./videos/anova-chi-square/script";
import { CorrelationNonparametric } from "./videos/correlation-nonparametric/Video";
import { script as correlationNonparametricScript } from "./videos/correlation-nonparametric/script";
import { EffectSizes } from "./videos/effect-sizes/Video";
import { script as effectSizesScript } from "./videos/effect-sizes/script";
import { RegressionToMean } from "./videos/regression-to-mean/Video";
import { script as regressionToMeanScript } from "./videos/regression-to-mean/script";
import { SelectionTraps } from "./videos/selection-traps/Video";
import { script as selectionTrapsScript } from "./videos/selection-traps/script";
import { ExploratoryConfirmatory } from "./videos/exploratory-confirmatory/Video";
import { script as exploratoryConfirmatoryScript } from "./videos/exploratory-confirmatory/script";
import { AbTest } from "./videos/ab-test/Video";
import { script as abTestScript } from "./videos/ab-test/script";

// Every composition is laid out in 1080p CSS pixels and rendered with
// `--scale=2` for 4K (3840x2160). Duration comes from the narration timeline,
// so `durationInFrames` here is a placeholder that `calculateMetadata`
// replaces.
const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Landscape">
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
        id="SimpsonsParadox"
        component={SimpsonsParadox}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(simpsonsParadoxScript)}
      />
      <Composition
        id="SamplingBias"
        component={SamplingBias}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(samplingBiasScript)}
      />
      <Composition
        id="SurvivorshipBias"
        component={SurvivorshipBias}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(survivorshipBiasScript)}
      />
      <Composition
        id="SamplingDistributions"
        component={SamplingDistributions}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(samplingDistributionsScript)}
      />
      <Composition
        id="StandardError"
        component={StandardError}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(standardErrorScript)}
      />
      <Composition
        id="ThinkingStatistically"
        component={ThinkingStatistically}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(thinkingStatisticallyScript)}
      />
      {/* Statistics course, Units 2 to 9, in course order. */}
      <Composition
        id="MeanVsMedian"
        component={MeanVsMedian}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(meanVsMedianScript)}
      />
      <Composition
        id="MeasuringSpread"
        component={MeasuringSpread}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(measuringSpreadScript)}
      />
      <Composition
        id="ShapeAndOutliers"
        component={ShapeAndOutliers}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(shapeAndOutliersScript)}
      />
      <Composition
        id="PlotFirst"
        component={PlotFirst}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(plotFirstScript)}
      />
      <Composition
        id="LongRunFrequency"
        component={LongRunFrequency}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(longRunFrequencyScript)}
      />
      <Composition
        id="ConditioningIndependence"
        component={ConditioningIndependence}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(conditioningIndependenceScript)}
      />
      <Composition
        id="MontyHall"
        component={MontyHall}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(montyHallScript)}
      />
      <Composition
        id="ExpectedValue"
        component={ExpectedValue}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(expectedValueScript)}
      />
      <Composition
        id="CountingDistributions"
        component={CountingDistributions}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(countingDistributionsScript)}
      />
      <Composition
        id="ProbabilityIsArea"
        component={ProbabilityIsArea}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(probabilityIsAreaScript)}
      />
      <Composition
        id="NormalDistribution"
        component={NormalDistribution}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(normalDistributionScript)}
      />
      <Composition
        id="FittingDistributions"
        component={FittingDistributions}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(fittingDistributionsScript)}
      />
      <Composition
        id="ConfidenceIntervals"
        component={ConfidenceIntervals}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(confidenceIntervalsScript)}
      />
      <Composition
        id="IntervalWidth"
        component={IntervalWidth}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(intervalWidthScript)}
      />
      <Composition
        id="Bootstrap"
        component={Bootstrap}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(bootstrapScript)}
      />
      <Composition
        id="TestLogic"
        component={TestLogic}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(testLogicScript)}
      />
      <Composition
        id="PValues"
        component={PValues}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(pValuesScript)}
      />
      <Composition
        id="PHacking"
        component={PHacking}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(pHackingScript)}
      />
      <Composition
        id="ErrorsAndPower"
        component={ErrorsAndPower}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(errorsAndPowerScript)}
      />
      <Composition
        id="TTests"
        component={TTests}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(tTestsScript)}
      />
      <Composition
        id="AnovaChiSquare"
        component={AnovaChiSquare}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(anovaChiSquareScript)}
      />
      <Composition
        id="CorrelationNonparametric"
        component={CorrelationNonparametric}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(correlationNonparametricScript)}
      />
      <Composition
        id="EffectSizes"
        component={EffectSizes}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(effectSizesScript)}
      />
      <Composition
        id="RegressionToMean"
        component={RegressionToMean}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(regressionToMeanScript)}
      />
      <Composition
        id="SelectionTraps"
        component={SelectionTraps}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(selectionTrapsScript)}
      />
      <Composition
        id="ExploratoryConfirmatory"
        component={ExploratoryConfirmatory}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(exploratoryConfirmatoryScript)}
      />
      <Composition
        id="AbTest"
        component={AbTest}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(abTestScript)}
      />
    </Folder>
    <Folder name="Assets">
      {/* The editorial page's grain, rendered to public/editorial/ by `npm run paper`. */}
      <Still id="PaperTexture" component={PaperSource} width={PAGE_W} height={PAGE_H} />
    </Folder>
  </>
);
