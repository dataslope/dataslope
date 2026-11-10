/**
 * The series, in order: each course's units and each interview track's
 * parts, the videos that make each one, and the title its opener shows.
 *
 * `npm run render:series` stitches a series into one video from this list:
 * before each unit or part, its opener (Columns-7's three lines: the series'
 * name, "Unit n" or "Part n", and the title), then its videos. The openers
 * are compositions in the Studio's `Series-Openers` folder, built from here
 * (src/reveals/presets.ts). A course's openers are blue, an interview
 * track's green, like their thumbnails.
 *
 * Plain TypeScript with no imports, so the Node scripts (render-all,
 * render-series) can import it as it is.
 *
 * A unit with two videos plays both after its one opener: a deep dive
 * (`Llm-2-1-…`) follows its unit video. Statistics Unit 5 is the merged
 * `Stats-5-Sampling`, not its five parts.
 */
export type SeriesUnit = {
  /** The number its opener shows: "Unit 3", "Part 0". */
  n: number;
  /** The opener's third line, in the series' hue. */
  title: string;
  /** The compositions it plays, in order. */
  videos: string[];
};

export type SeriesDef = {
  kind: "course" | "interview";
  /** The opener's first line. */
  name: string;
  units: SeriesUnit[];
};

export const SERIES = {
  Statistics: {
    kind: "course",
    name: "Statistics for Data Science with Python",
    units: [
      { n: 1, title: "Thinking statistically", videos: ["Stats-1-ThinkingStatistically"] },
      { n: 2, title: "Describing data", videos: ["Stats-2-DescribingData"] },
      { n: 3, title: "Probability", videos: ["Stats-3-Probability"] },
      { n: 4, title: "Distributions", videos: ["Stats-4-Distributions"] },
      { n: 5, title: "Sampling", videos: ["Stats-5-Sampling"] },
      { n: 6, title: "Estimation", videos: ["Stats-6-Estimation"] },
      { n: 7, title: "Testing hypotheses", videos: ["Stats-7-TestingHypotheses"] },
      { n: 8, title: "Interpreting results", videos: ["Stats-8-InterpretingResults"] },
      { n: 9, title: "Statistics in practice", videos: ["Stats-9-StatisticsInPractice"] },
    ],
  },
  DatabaseDesign: {
    kind: "course",
    name: "Database Design with PostgreSQL",
    units: [
      { n: 1, title: "Why design matters", videos: ["DbDesign-1-WhyDesign"] },
      { n: 2, title: "Entities and attributes", videos: ["DbDesign-2-Entities"] },
      { n: 3, title: "Relationships", videos: ["DbDesign-3-Relationships"] },
      { n: 4, title: "Keys and integrity", videos: ["DbDesign-4-Keys"] },
      { n: 5, title: "Relationship patterns", videos: ["DbDesign-5-RelationshipPatterns"] },
      { n: 6, title: "Constraints", videos: ["DbDesign-6-Constraints"] },
      { n: 7, title: "Normalization", videos: ["DbDesign-7-Normalization"] },
      { n: 8, title: "Designing schemas", videos: ["DbDesign-8-DesigningSchemas"] },
      { n: 9, title: "The relational revolution", videos: ["DbDesign-9-RelationalHistory"] },
    ],
  },
  LargeLanguageModels: {
    kind: "course",
    name: "How Large Language Models Work",
    units: [
      { n: 1, title: "Tokens", videos: ["Llm-1-Tokens"] },
      { n: 2, title: "Embeddings and attention", videos: ["Llm-2-Meaning", "Llm-2-1-AttentionScore"] },
      { n: 3, title: "Choosing the next token", videos: ["Llm-3-Generation"] },
      { n: 4, title: "What a model costs", videos: ["Llm-4-Cost", "Llm-4-1-ConversationCost"] },
      { n: 5, title: "Benchmarks and evaluation", videos: ["Llm-5-Benchmarks"] },
    ],
  },
  NaturalLanguageProcessing: {
    kind: "course",
    name: "Natural Language Processing with Python",
    units: [
      { n: 1, title: "Why text is hard", videos: ["Nlp-1-WhyTextIsHard"] },
      { n: 2, title: "Cleaning text", videos: ["Nlp-2-CleaningText", "Nlp-2-1-LemmasAndTags"] },
      { n: 3, title: "Counting words", videos: ["Nlp-3-CountingWords", "Nlp-3-1-ZipfsLaw"] },
      { n: 4, title: "From text to features", videos: ["Nlp-4-TextToFeatures"] },
      { n: 5, title: "How the field got here", videos: ["Nlp-5-History"] },
    ],
  },
  DataAnalyst: {
    kind: "interview",
    name: "Data Analyst Interview Questions",
    units: [
      { n: 0, title: "The interview, now", videos: ["DataAnalyst-0-Interview"] },
      { n: 1, title: "SQL", videos: ["DataAnalyst-1-Sql"] },
      { n: 2, title: "Pandas", videos: ["DataAnalyst-2-Pandas"] },
      { n: 3, title: "Statistics and communication", videos: ["DataAnalyst-3-StatisticsCommunication"] },
      { n: 4, title: "Advanced SQL", videos: ["DataAnalyst-4-AdvancedSql"] },
      { n: 5, title: "Spreadsheets", videos: ["DataAnalyst-5-Spreadsheets"] },
      { n: 6, title: "Visualization", videos: ["DataAnalyst-6-Visualization"] },
      { n: 7, title: "A/B testing and metrics", videos: ["DataAnalyst-7-AbTesting"] },
      { n: 8, title: "AI-assisted analysis", videos: ["DataAnalyst-8-AiAssisted"] },
    ],
  },
  DataScientist: {
    kind: "interview",
    name: "Data Scientist Interview Questions",
    units: [
      { n: 0, title: "The interview, now", videos: ["DataScientist-0-Interview"] },
      { n: 1, title: "Statistics", videos: ["DataScientist-1-Statistics"] },
      { n: 2, title: "Probability", videos: ["DataScientist-2-Probability"] },
      { n: 3, title: "Evaluating models", videos: ["DataScientist-3-MlEvaluation"] },
      { n: 4, title: "Machine learning models", videos: ["DataScientist-4-MlModels"] },
      { n: 5, title: "Deep learning", videos: ["DataScientist-5-DeepLearning"] },
      { n: 6, title: "Experiment design", videos: ["DataScientist-6-ExperimentDesign"] },
      { n: 7, title: "Experiments in practice", videos: ["DataScientist-7-ExperimentsInPractice"] },
      { n: 8, title: "Product sense and metrics", videos: ["DataScientist-8-ProductSense"] },
      { n: 9, title: "Python and pandas", videos: ["DataScientist-9-PythonPandas"] },
      { n: 10, title: "SQL for data science", videos: ["DataScientist-10-Sql"] },
      { n: 11, title: "Evaluating LLMs", videos: ["DataScientist-11-LlmEvaluation"] },
    ],
  },
  DataEngineer: {
    kind: "interview",
    name: "Data Engineer Interview Questions",
    units: [
      { n: 0, title: "The interview, now", videos: ["DataEngineer-0-Interview"] },
      { n: 1, title: "SQL patterns", videos: ["DataEngineer-1-SqlPatterns"] },
      { n: 2, title: "SQL performance", videos: ["DataEngineer-2-SqlPerformance"] },
      { n: 3, title: "Dimensional modeling", videos: ["DataEngineer-3-DimensionalModeling"] },
      { n: 4, title: "Tracking change over time", videos: ["DataEngineer-4-ModelingHistory"] },
      { n: 5, title: "Python for data engineering", videos: ["DataEngineer-5-Python"] },
      { n: 6, title: "Pipelines and systems", videos: ["DataEngineer-6-Pipelines"] },
      { n: 7, title: "Distributed processing", videos: ["DataEngineer-7-DistributedProcessing"] },
      { n: 8, title: "Streaming and messaging", videos: ["DataEngineer-8-Streaming"] },
      { n: 9, title: "Warehousing and storage", videos: ["DataEngineer-9-Warehousing"] },
      { n: 10, title: "Orchestration and reliability", videos: ["DataEngineer-10-Orchestration"] },
      { n: 11, title: "Pipelines for AI", videos: ["DataEngineer-11-PipelinesForAi"] },
    ],
  },
  BackendEngineer: {
    kind: "interview",
    name: "Backend Engineer Interview Questions",
    units: [
      { n: 0, title: "The interview, now", videos: ["BackendEngineer-0-Interview"] },
      { n: 1, title: "Approaching system design", videos: ["BackendEngineer-1-SystemDesign"] },
      { n: 2, title: "Scaling a design", videos: ["BackendEngineer-2-Scaling"] },
      { n: 3, title: "API design", videos: ["BackendEngineer-3-ApiDesign"] },
      { n: 4, title: "Databases", videos: ["BackendEngineer-4-Databases"] },
      { n: 5, title: "Concurrency", videos: ["BackendEngineer-5-Concurrency"] },
      { n: 6, title: "Designing objects", videos: ["BackendEngineer-6-ObjectDesign"] },
      { n: 7, title: "Reading and reviewing code", videos: ["BackendEngineer-7-CodeReview"] },
      { n: 8, title: "Algorithms as reasoning", videos: ["BackendEngineer-8-Algorithms"] },
      { n: 9, title: "The AI-allowed round", videos: ["BackendEngineer-9-AiRound"] },
    ],
  },
} satisfies Record<string, SeriesDef>;

export type SeriesKey = keyof typeof SERIES;

/** "Unit 3" or "Part 0": a unit's label on its opener. */
export const unitLabel = (s: SeriesDef, u: SeriesUnit) => `${s.kind === "course" ? "Unit" : "Part"} ${u.n}`;

/** The opener composition before a unit: `Series-Statistics-3`. */
export const openerId = (key: string, u: SeriesUnit) => `Series-${key}-${u.n}`;

/**
 * The folder under out/ the rendered openers go in, apart from the videos
 * (`out/openers/Series-Statistics-3-4k.mp4`), as thumbnails have
 * `out/thumbnails/`. render-all writes them there and render-series reads
 * them from there.
 */
export const OPENERS_OUT = "openers";
