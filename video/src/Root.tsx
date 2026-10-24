import React from "react";
import { Composition, Folder } from "remotion";
import "./theme/brand";
import "./theme/fonts";
import { narratedMetadata } from "./narration/metadata";
import { EDITORIAL_DEFAULTS, type EditorialProps } from "./editorial/Page";
import { ErdKit } from "./editorial/ErdKit";
import { InterviewKit } from "./editorial/interview";
// Database Design with PostgreSQL, one video per unit.
import { DbWhyDesign } from "./videos/db-why-design/Video";
import { script as dbWhyDesignScript } from "./videos/db-why-design/script";
import { DbEntities } from "./videos/db-entities/Video";
import { script as dbEntitiesScript } from "./videos/db-entities/script";
import { DbRelationships } from "./videos/db-relationships/Video";
import { script as dbRelationshipsScript } from "./videos/db-relationships/script";
import { DbKeys } from "./videos/db-keys/Video";
import { script as dbKeysScript } from "./videos/db-keys/script";
import { DbRelationshipPatterns } from "./videos/db-relationship-patterns/Video";
import { script as dbRelationshipPatternsScript } from "./videos/db-relationship-patterns/script";
import { DbConstraints } from "./videos/db-constraints/Video";
import { script as dbConstraintsScript } from "./videos/db-constraints/script";
import { DbNormalization } from "./videos/db-normalization/Video";
import { script as dbNormalizationScript } from "./videos/db-normalization/script";
import { DbDesigningSchemas } from "./videos/db-designing-schemas/Video";
import { script as dbDesigningSchemasScript } from "./videos/db-designing-schemas/script";
import { DbRelationalHistory } from "./videos/db-relational-history/Video";
import { script as dbRelationalHistoryScript } from "./videos/db-relational-history/script";
// Interview prep, Data Analyst: one video per topic page.
import { LlmTokens } from "./videos/llm-tokens/Video";
import { script as llmTokensScript } from "./videos/llm-tokens/script";
import { LlmMeaning } from "./videos/llm-meaning/Video";
import { script as llmMeaningScript } from "./videos/llm-meaning/script";
import { LlmGeneration } from "./videos/llm-generation/Video";
import { script as llmGenerationScript } from "./videos/llm-generation/script";
import { LlmCost } from "./videos/llm-cost/Video";
import { script as llmCostScript } from "./videos/llm-cost/script";
import { LlmBenchmarks } from "./videos/llm-benchmarks/Video";
import { script as llmBenchmarksScript } from "./videos/llm-benchmarks/script";
import { NlpWhyTextIsHard } from "./videos/nlp-why-text-is-hard/Video";
import { script as nlpWhyTextIsHardScript } from "./videos/nlp-why-text-is-hard/script";
import { NlpCleaningText } from "./videos/nlp-cleaning-text/Video";
import { script as nlpCleaningTextScript } from "./videos/nlp-cleaning-text/script";
import { NlpCountingWords } from "./videos/nlp-counting-words/Video";
import { script as nlpCountingWordsScript } from "./videos/nlp-counting-words/script";
import { NlpTextToFeatures } from "./videos/nlp-text-to-features/Video";
import { script as nlpTextToFeaturesScript } from "./videos/nlp-text-to-features/script";
import { NlpHistory } from "./videos/nlp-history/Video";
import { script as nlpHistoryScript } from "./videos/nlp-history/script";
import { LlmAttentionScore } from "./videos/llm-attention-score/Video";
import { script as llmAttentionScoreScript } from "./videos/llm-attention-score/script";
import { LlmConversationCost } from "./videos/llm-conversation-cost/Video";
import { script as llmConversationCostScript } from "./videos/llm-conversation-cost/script";
import { NlpLemmasAndTags } from "./videos/nlp-lemmas-and-tags/Video";
import { script as nlpLemmasAndTagsScript } from "./videos/nlp-lemmas-and-tags/script";
import { NlpZipfsLaw } from "./videos/nlp-zipfs-law/Video";
import { script as nlpZipfsLawScript } from "./videos/nlp-zipfs-law/script";
import { DaInterview } from "./videos/da-interview/Video";
import { script as daInterviewScript } from "./videos/da-interview/script";
import { DaSql } from "./videos/da-sql/Video";
import { script as daSqlScript } from "./videos/da-sql/script";
import { DaPandas } from "./videos/da-pandas/Video";
import { script as daPandasScript } from "./videos/da-pandas/script";
import { DaStatisticsCommunication } from "./videos/da-statistics-communication/Video";
import { script as daStatisticsCommunicationScript } from "./videos/da-statistics-communication/script";
import { DaSpreadsheets } from "./videos/da-spreadsheets/Video";
import { script as daSpreadsheetsScript } from "./videos/da-spreadsheets/script";
import { DaAdvancedSql } from "./videos/da-advanced-sql/Video";
import { script as daAdvancedSqlScript } from "./videos/da-advanced-sql/script";
import { DaAiAssisted } from "./videos/da-ai-assisted/Video";
import { script as daAiAssistedScript } from "./videos/da-ai-assisted/script";
import { DsInterview } from "./videos/ds-interview/Video";
import { script as dsInterviewScript } from "./videos/ds-interview/script";
import { DsStatistics } from "./videos/ds-statistics/Video";
import { script as dsStatisticsScript } from "./videos/ds-statistics/script";
import { DsProbability } from "./videos/ds-probability/Video";
import { script as dsProbabilityScript } from "./videos/ds-probability/script";
import { DsMlEvaluation } from "./videos/ds-ml-evaluation/Video";
import { script as dsMlEvaluationScript } from "./videos/ds-ml-evaluation/script";
import { DsMlModels } from "./videos/ds-ml-models/Video";
import { script as dsMlModelsScript } from "./videos/ds-ml-models/script";
import { DsDeepLearning } from "./videos/ds-deep-learning/Video";
import { script as dsDeepLearningScript } from "./videos/ds-deep-learning/script";
import { DsExperimentDesign } from "./videos/ds-experiment-design/Video";
import { script as dsExperimentDesignScript } from "./videos/ds-experiment-design/script";
import { DsExperimentsInPractice } from "./videos/ds-experiments-in-practice/Video";
import { script as dsExperimentsInPracticeScript } from "./videos/ds-experiments-in-practice/script";
import { DsProductSense } from "./videos/ds-product-sense/Video";
import { script as dsProductSenseScript } from "./videos/ds-product-sense/script";
import { DsPythonPandas } from "./videos/ds-python-pandas/Video";
import { script as dsPythonPandasScript } from "./videos/ds-python-pandas/script";
import { DsSql } from "./videos/ds-sql/Video";
import { script as dsSqlScript } from "./videos/ds-sql/script";
import { DsLlmEvaluation } from "./videos/ds-llm-evaluation/Video";
import { script as dsLlmEvaluationScript } from "./videos/ds-llm-evaluation/script";
import { DaAbTesting } from "./videos/da-ab-testing/Video";
import { script as daAbTestingScript } from "./videos/da-ab-testing/script";
import { DaVisualization } from "./videos/da-visualization/Video";
import { script as daVisualizationScript } from "./videos/da-visualization/script";
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
import { Sampling } from "./videos/sampling/Video";
import { samplingMetadata } from "./videos/sampling/metadata";
// Statistics course, one video per unit (Units 2 to 4 and 6 to 9).
import { DescribingData } from "./videos/describing-data/Video";
import { script as describingDataScript } from "./videos/describing-data/script";
import { Probability } from "./videos/probability/Video";
import { script as probabilityScript } from "./videos/probability/script";
import { Distributions } from "./videos/distributions/Video";
import { script as distributionsScript } from "./videos/distributions/script";
import { Estimation } from "./videos/estimation/Video";
import { script as estimationScript } from "./videos/estimation/script";
import { TestingHypotheses } from "./videos/testing-hypotheses/Video";
import { script as testingHypothesesScript } from "./videos/testing-hypotheses/script";
import { InterpretingResults } from "./videos/interpreting-results/Video";
import { script as interpretingResultsScript } from "./videos/interpreting-results/script";
import { StatisticsInPractice } from "./videos/statistics-in-practice/Video";
import { script as statisticsInPracticeScript } from "./videos/statistics-in-practice/script";

// Every composition is laid out in 1080p CSS pixels and rendered with
// `--scale=2` for 4K (3840x2160). Duration comes from the narration timeline,
// so `durationInFrames` here is a placeholder that `calculateMetadata`
// replaces.
const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Landscape">
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
    </Folder>
    <Folder name="Statistics">
      {/* Statistics course: one video per unit, in course order; Stats-<unit>- ids sort that way too. */}
      <Composition
        id="Stats-1-ThinkingStatistically"
        component={ThinkingStatistically}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(thinkingStatisticallyScript)}
      />
      <Composition
        id="Stats-2-DescribingData"
        component={DescribingData}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(describingDataScript)}
      />
      <Composition
        id="Stats-3-Probability"
        component={Probability}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(probabilityScript)}
      />
      <Composition
        id="Stats-4-Distributions"
        component={Distributions}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(distributionsScript)}
      />
      {/* Unit 5 as one video, from its five parts below (src/videos/sampling/). */}
      <Composition
        id="Stats-5-Sampling"
        component={Sampling}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={samplingMetadata}
      />
      {/* Unit 5's five parts, each also a video on its own. */}
      <Composition
        id="Stats-5-1-SamplingBias"
        component={SamplingBias}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(samplingBiasScript)}
      />
      <Composition
        id="Stats-5-2-SurvivorshipBias"
        component={SurvivorshipBias}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(survivorshipBiasScript)}
      />
      <Composition
        id="Stats-5-3-SamplingDistributions"
        component={SamplingDistributions}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(samplingDistributionsScript)}
      />
      <Composition
        id="Stats-5-4-CentralLimitTheorem"
        component={CentralLimitTheorem}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(centralLimitTheoremScript)}
      />
      <Composition
        id="Stats-5-5-StandardError"
        component={StandardError}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={EDITORIAL_DEFAULTS}
        calculateMetadata={narratedMetadata<EditorialProps>(standardErrorScript)}
      />
      <Composition
        id="Stats-6-Estimation"
        component={Estimation}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(estimationScript)}
      />
      <Composition
        id="Stats-7-TestingHypotheses"
        component={TestingHypotheses}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(testingHypothesesScript)}
      />
      <Composition
        id="Stats-8-InterpretingResults"
        component={InterpretingResults}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(interpretingResultsScript)}
      />
      <Composition
        id="Stats-9-StatisticsInPractice"
        component={StatisticsInPractice}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(statisticsInPracticeScript)}
      />
    </Folder>
    <Folder name="Database-Design">
      {/* Database Design with PostgreSQL: one video per unit, in course order. */}
      <Composition
        id="DbDesign-1-WhyDesign"
        component={DbWhyDesign}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbWhyDesignScript)}
      />
      <Composition
        id="DbDesign-2-Entities"
        component={DbEntities}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbEntitiesScript)}
      />
      <Composition
        id="DbDesign-3-Relationships"
        component={DbRelationships}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbRelationshipsScript)}
      />
      <Composition
        id="DbDesign-4-Keys"
        component={DbKeys}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbKeysScript)}
      />
      <Composition
        id="DbDesign-5-RelationshipPatterns"
        component={DbRelationshipPatterns}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbRelationshipPatternsScript)}
      />
      <Composition
        id="DbDesign-6-Constraints"
        component={DbConstraints}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbConstraintsScript)}
      />
      <Composition
        id="DbDesign-7-Normalization"
        component={DbNormalization}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbNormalizationScript)}
      />
      <Composition
        id="DbDesign-8-DesigningSchemas"
        component={DbDesigningSchemas}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbDesigningSchemasScript)}
      />
      <Composition
        id="DbDesign-9-RelationalHistory"
        component={DbRelationalHistory}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dbRelationalHistoryScript)}
      />
    </Folder>
    <Folder name="How-LLMs-Work">
      {/* How Large Language Models Work: one video per unit, in course order, narrated by Drew. */}
      <Composition
        id="Llm-1-Tokens"
        component={LlmTokens}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(llmTokensScript)}
      />
      <Composition
        id="Llm-2-Meaning"
        component={LlmMeaning}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(llmMeaningScript)}
      />
      <Composition
        id="Llm-2-1-AttentionScore"
        component={LlmAttentionScore}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(llmAttentionScoreScript)}
      />
      <Composition
        id="Llm-3-Generation"
        component={LlmGeneration}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(llmGenerationScript)}
      />
      <Composition
        id="Llm-4-Cost"
        component={LlmCost}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(llmCostScript)}
      />
      <Composition
        id="Llm-4-1-ConversationCost"
        component={LlmConversationCost}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(llmConversationCostScript)}
      />
      <Composition
        id="Llm-5-Benchmarks"
        component={LlmBenchmarks}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(llmBenchmarksScript)}
      />
    </Folder>
    <Folder name="NLP-Python">
      {/* Natural Language Processing with Python: one video per unit, in course order, narrated by Hope. */}
      <Composition
        id="Nlp-1-WhyTextIsHard"
        component={NlpWhyTextIsHard}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(nlpWhyTextIsHardScript)}
      />
      <Composition
        id="Nlp-2-CleaningText"
        component={NlpCleaningText}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(nlpCleaningTextScript)}
      />
      <Composition
        id="Nlp-2-1-LemmasAndTags"
        component={NlpLemmasAndTags}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(nlpLemmasAndTagsScript)}
      />
      <Composition
        id="Nlp-3-CountingWords"
        component={NlpCountingWords}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(nlpCountingWordsScript)}
      />
      <Composition
        id="Nlp-3-1-ZipfsLaw"
        component={NlpZipfsLaw}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(nlpZipfsLawScript)}
      />
      <Composition
        id="Nlp-4-TextToFeatures"
        component={NlpTextToFeatures}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(nlpTextToFeaturesScript)}
      />
      <Composition
        id="Nlp-5-History"
        component={NlpHistory}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(nlpHistoryScript)}
      />
    </Folder>
    <Folder name="Interview-Data-Analyst">
      <Composition
        id="DataAnalyst-0-Interview"
        component={DaInterview}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daInterviewScript)}
      />
      <Composition
        id="DataAnalyst-1-Sql"
        component={DaSql}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daSqlScript)}
      />
      <Composition
        id="DataAnalyst-2-Pandas"
        component={DaPandas}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daPandasScript)}
      />
      <Composition
        id="DataAnalyst-3-StatisticsCommunication"
        component={DaStatisticsCommunication}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daStatisticsCommunicationScript)}
      />
      <Composition
        id="DataAnalyst-4-AdvancedSql"
        component={DaAdvancedSql}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daAdvancedSqlScript)}
      />
      <Composition
        id="DataAnalyst-5-Spreadsheets"
        component={DaSpreadsheets}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daSpreadsheetsScript)}
      />
      <Composition
        id="DataAnalyst-8-AiAssisted"
        component={DaAiAssisted}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daAiAssistedScript)}
      />
      <Composition
        id="DataAnalyst-7-AbTesting"
        component={DaAbTesting}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daAbTestingScript)}
      />
      <Composition
        id="DataAnalyst-6-Visualization"
        component={DaVisualization}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(daVisualizationScript)}
      />
    </Folder>
    <Folder name="Interview-Data-Scientist">
      <Composition
        id="DataScientist-0-Interview"
        component={DsInterview}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsInterviewScript)}
      />
      <Composition
        id="DataScientist-1-Statistics"
        component={DsStatistics}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsStatisticsScript)}
      />
      <Composition
        id="DataScientist-2-Probability"
        component={DsProbability}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsProbabilityScript)}
      />
      <Composition
        id="DataScientist-3-MlEvaluation"
        component={DsMlEvaluation}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsMlEvaluationScript)}
      />
      <Composition
        id="DataScientist-4-MlModels"
        component={DsMlModels}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsMlModelsScript)}
      />
      <Composition
        id="DataScientist-5-DeepLearning"
        component={DsDeepLearning}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsDeepLearningScript)}
      />
      <Composition
        id="DataScientist-6-ExperimentDesign"
        component={DsExperimentDesign}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsExperimentDesignScript)}
      />
      <Composition
        id="DataScientist-7-ExperimentsInPractice"
        component={DsExperimentsInPractice}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsExperimentsInPracticeScript)}
      />
      <Composition
        id="DataScientist-8-ProductSense"
        component={DsProductSense}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsProductSenseScript)}
      />
      <Composition
        id="DataScientist-9-PythonPandas"
        component={DsPythonPandas}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsPythonPandasScript)}
      />
      <Composition
        id="DataScientist-10-Sql"
        component={DsSql}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsSqlScript)}
      />
      <Composition
        id="DataScientist-11-LlmEvaluation"
        component={DsLlmEvaluation}
        width={1920}
        height={1080}
        fps={FPS}
        durationInFrames={FPS * 60}
        defaultProps={{ ...EDITORIAL_DEFAULTS, sfx: true }}
        calculateMetadata={narratedMetadata<EditorialProps>(dsLlmEvaluationScript)}
      />
    </Folder>
    <Folder name="Assets">
      {/* The ERD kit (editorial/erd.tsx) on one page, for review. */}
      <Composition id="ErdKit" component={ErdKit} width={1920} height={1080} fps={FPS} durationInFrames={150} />
      {/* The interview kit (editorial/interview.tsx): a question card and a rapid-fire list. */}
      <Composition id="InterviewKit" component={InterviewKit} width={1920} height={1080} fps={FPS} durationInFrames={150} />
    </Folder>
  </>
);
