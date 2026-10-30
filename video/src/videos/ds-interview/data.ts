// The series this overview introduces: the eleven topic videos in the track's
// order, each with the watercolor hero its own folder holds and the number of
// questions it answers, under a short title that fits its tile on one line
// ("Product sense" for "Product sense & metrics"). The counts are the plan's
// table (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md), and
// each matches the built video's own script header (twelve worked plus three
// quick in ML evaluation, and so on). The practice counts are the track's own
// pages, counted by check.mjs into results.json. Pure.

import results from "./results.json" with { type: "json" };

export const VIDEO = "ds-interview";

/** The otter is generated through the Batch API; this waits on its import. */
export const ILLUSTRATIONS = true;

export type Part = { n: number; title: string; questions: number; video: string; hero: string };

export const PARTS: readonly Part[] = [
  { n: 1, title: "Statistics", questions: 19, video: "ds-statistics", hero: "ds-statistics-hedgehog" },
  { n: 2, title: "Probability", questions: 14, video: "ds-probability", hero: "ds-probability-rabbit" },
  { n: 3, title: "Machine learning I", questions: 15, video: "ds-ml-evaluation", hero: "ds-ml-evaluation-beaver" },
  { n: 4, title: "Machine learning II", questions: 15, video: "ds-ml-models", hero: "ds-ml-models-raccoon" },
  { n: 5, title: "Deep learning", questions: 15, video: "ds-deep-learning", hero: "ds-deep-learning-octopus" },
  { n: 6, title: "Experimentation I", questions: 14, video: "ds-experiment-design", hero: "ds-experiment-design-heron" },
  { n: 7, title: "Experimentation II", questions: 14, video: "ds-experiments-in-practice", hero: "ds-experiments-in-practice-turtle" },
  { n: 8, title: "Product sense", questions: 14, video: "ds-product-sense", hero: "ds-product-sense-squirrel" },
  { n: 9, title: "Python & pandas", questions: 14, video: "ds-python-pandas", hero: "ds-python-pandas-badger" },
  { n: 10, title: "SQL", questions: 15, video: "ds-sql", hero: "ds-sql-seal" },
  { n: 11, title: "LLM evaluation", questions: 9, video: "ds-llm-evaluation", hero: "ds-llm-evaluation-parrot" },
];

/** The track's questions, each answered once: the sum of the parts (158). */
export const QUESTIONS = PARTS.reduce((a, p) => a + p.questions, 0);

/** multiple-choice-questions.mdx, counted: 110 MultipleChoice blocks. */
export const BANK: number = results.bank;

/** The topic pages with runnable challenges (ChallengeCard or
 *  SqlChallengeCard): 4 of the 9. Every one of the 9 has concept checks. */
export const CHALLENGE_PAGES: number = results.challengePages;
