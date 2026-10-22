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
    <Folder name="Interview-Data-Analyst">
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
    </Folder>
    <Folder name="Assets">
      {/* The ERD kit (editorial/erd.tsx) on one page, for review. */}
      <Composition id="ErdKit" component={ErdKit} width={1920} height={1080} fps={FPS} durationInFrames={150} />
      {/* The interview kit (editorial/interview.tsx): a question card and a rapid-fire list. */}
      <Composition id="InterviewKit" component={InterviewKit} width={1920} height={1080} fps={FPS} durationInFrames={150} />
    </Folder>
  </>
);
