// The series this overview introduces: the eleven topic videos in the track's
// order, each with the watercolor hero its own folder holds and the number of
// questions it answers, under a short title that fits its column. The counts
// are the plan's table
// (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), kept
// here and nowhere else: a builder who moves a question changes one number,
// and the bars and the total follow. check.mjs fails when the narration no
// longer says the total, or the practice, these numbers make. The
// practice counts are the track's own pages, counted by check.mjs into
// results.json. Pure.

import results from "./results.json" with { type: "json" };

export const VIDEO = "de-interview";

/** The meerkat is generated and imported (public/images/de-interview/). */
export const ILLUSTRATIONS = true;

export type Part = { n: number; title: string; questions: number; video: string; hero: string };

export const PARTS: readonly Part[] = [
  { n: 1, title: "SQL I", questions: 22, video: "de-sql-patterns", hero: "de-sql-patterns-koala" },
  { n: 2, title: "SQL II", questions: 10, video: "de-sql-performance", hero: "de-sql-performance-cheetah" },
  { n: 3, title: "Modeling I", questions: 15, video: "de-dimensional-modeling", hero: "de-dimensional-modeling-starfish" },
  { n: 4, title: "Modeling II", questions: 15, video: "de-modeling-history", hero: "de-modeling-history-chameleon" },
  { n: 5, title: "Python", questions: 18, video: "de-python", hero: "de-python-ant" },
  { n: 6, title: "Pipelines", questions: 11, video: "de-pipelines", hero: "de-pipelines-mole" },
  { n: 7, title: "Distributed", questions: 17, video: "de-distributed", hero: "de-distributed-honeybee" },
  { n: 8, title: "Streaming", questions: 15, video: "de-streaming", hero: "de-streaming-salmon" },
  { n: 9, title: "Warehousing", questions: 9, video: "de-warehousing", hero: "de-warehousing-hamster" },
  { n: 10, title: "Orchestration", questions: 14, video: "de-orchestration", hero: "de-orchestration-collie" },
  { n: 11, title: "Pipelines for AI", questions: 11, video: "de-pipelines-for-ai", hero: "de-pipelines-for-ai-llama" },
];

/** The track's questions, each answered once: the sum of the parts. */
export const QUESTIONS = PARTS.reduce((a, p) => a + p.questions, 0);

/** The questions the topic pages ask, before a question two pages share is
 *  answered once (182). */
export const PAGE_QUESTIONS: number = results.pageQuestions;

/** multiple-choice-questions.mdx, counted: 110 MultipleChoice blocks. */
export const BANK: number = results.bank;

/** The topic pages with concept checks (all 9) and with runnable challenges
 *  (ChallengeCard or SqlChallengeCard: SQL, Python, Data warehousing). */
export const TOPIC_PAGES: number = results.topicPages;
export const CHECK_PAGES: number = results.conceptCheckPages;
export const CHALLENGE_PAGES: number = results.challengePages;
