// The series this overview introduces: the eight topic videos in the track's
// order, each with the watercolor hero its own folder holds and the number of
// questions it answers (the plan's table,
// agent-outputs/20261021-2314-data-analyst-interview-video-plan.md). Pure.

export const VIDEO = "da-interview";

export type Part = { n: number; title: string; questions: number; video: string; hero: string };

export const PARTS: readonly Part[] = [
  { n: 1, title: "SQL", questions: 24, video: "da-sql", hero: "da-sql-desk" },
  { n: 2, title: "Pandas", questions: 30, video: "da-pandas", hero: "da-pandas-panda" },
  { n: 3, title: "Statistics & communication", questions: 14, video: "da-statistics-communication", hero: "da-statistics-communication-elephant" },
  { n: 4, title: "Advanced SQL", questions: 20, video: "da-advanced-sql", hero: "da-advanced-sql-penguin" },
  { n: 5, title: "Excel & spreadsheets", questions: 18, video: "da-spreadsheets", hero: "da-spreadsheets-marmot" },
  { n: 6, title: "Data visualization", questions: 22, video: "da-visualization", hero: "da-visualization-duck" },
  { n: 7, title: "A/B testing & metrics", questions: 19, video: "da-ab-testing", hero: "da-ab-testing-fox" },
  { n: 8, title: "AI-assisted analysis", questions: 9, video: "da-ai-assisted", hero: "da-ai-assisted-owl" },
];

/** The track's questions, each answered once: the sum of the parts. */
export const QUESTIONS = PARTS.reduce((a, p) => a + p.questions, 0);

/** multiple-choice-questions.mdx, counted: 110 MultipleChoice blocks. */
export const BANK = 110;
