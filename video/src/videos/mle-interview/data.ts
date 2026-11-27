// The series this overview introduces: the ten topic videos of the Machine
// Learning Engineer track in series order, each with the questions it answers
// by page, how many of those are asked on two pages and answered once for
// both, its watercolor hero and a short title that fits its column. The
// counts are the plan's
// (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
// "Which video answers which question"), kept here and nowhere else: a
// builder who moves a question changes one number, and the bars and the
// total follow. check.mjs fails when a page's `###` count stops matching the
// parts that answer it, when PARTS stops matching the plan's "Check" line, or
// when the narration stops saying the total. The practice counts are the
// track's own pages, counted by check.mjs into results.json. Pure.

import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-interview";

/** The red panda and the two small spots (coin purse, whiteboard marker) in
 *  illustrations.json; generated and imported by the builder. The red panda
 *  is also the track's YouTube thumbnail animal. */
export const ILLUSTRATIONS = true;

/** A page of the track, by its file stem under
 *  content/interview/machine-learning-engineer/. */
export type Page =
  | "ml-fundamentals"
  | "coding"
  | "statistics-and-probability"
  | "deep-learning"
  | "nlp-and-llms"
  | "ml-system-design"
  | "mlops"
  | "llm-systems-and-evals";

export type Part = {
  n: number;
  title: string;
  video: string;
  /** The hero's illustration id, `<folder>-<creature>`; the creature is the
   *  plan's. Other writers name their own: check.mjs warns if a sibling's
   *  illustrations.json exists and does not hold this id. */
  hero: string;
  /** The page questions this part answers, by page. A question two pages
   *  ask is counted on both pages, as the plan's "Check" line counts it. */
  from: Partial<Record<Page, number>>;
  /** How many of those are the second page's copy of a question answered
   *  once for both (the plan's "together"). */
  together: number;
};

export const PARTS: readonly Part[] = [
  { n: 1, title: "Generalization", video: "mle-generalization", hero: "mle-generalization-flamingo", from: { "ml-fundamentals": 12, "statistics-and-probability": 1 }, together: 1 },
  { n: 2, title: "Models", video: "mle-models", hero: "mle-models-toucan", from: { "ml-fundamentals": 18, "deep-learning": 1 }, together: 1 },
  { n: 3, title: "Coding", video: "mle-coding", hero: "mle-coding-tree-frog", from: { coding: 15 }, together: 0 },
  { n: 4, title: "Statistics", video: "mle-statistics", hero: "mle-statistics-zebra", from: { "statistics-and-probability": 17 }, together: 0 },
  { n: 5, title: "Deep learning", video: "mle-deep-learning", hero: "mle-deep-learning-orangutan", from: { "deep-learning": 15, "ml-fundamentals": 3 }, together: 3 },
  { n: 6, title: "NLP and LLMs", video: "mle-nlp-llms", hero: "mle-nlp-llms-dolphin", from: { "nlp-and-llms": 19, "deep-learning": 3, "ml-fundamentals": 1 }, together: 4 },
  { n: 7, title: "System design", video: "mle-system-design", hero: "mle-system-design-giraffe", from: { "ml-system-design": 17, mlops: 3 }, together: 3 },
  { n: 8, title: "MLOps", video: "mle-mlops", hero: "mle-mlops-walrus", from: { "ml-system-design": 14, mlops: 17 }, together: 7 },
  { n: 9, title: "Serving LLMs", video: "mle-serving-llms", hero: "mle-serving-llms-kingfisher", from: { "llm-systems-and-evals": 4 }, together: 0 },
  { n: 10, title: "LLM evals", video: "mle-llm-evals", hero: "mle-llm-evals-pelican", from: { "llm-systems-and-evals": 6 }, together: 0 },
];

/** The topic videos whose hero is in public/images/<video>/<hero>.webp
 *  already. The ten parts are drawn alongside this one, and a render cannot
 *  look for a file that may not be there (a missing image fails it), so the
 *  series chart draws a part's hero only once its folder is listed here, and
 *  leaves the rest out. check.mjs fails when a listed hero's file is missing
 *  and warns when a hero's file is there but not listed, so switching one on
 *  is one line. */
export const HEROES_IN: ReadonlySet<string> = new Set([
  "mle-generalization",
  "mle-models",
  "mle-coding",
  "mle-statistics",
  "mle-deep-learning",
  "mle-nlp-llms",
  "mle-system-design",
  "mle-mlops",
  "mle-serving-llms",
  "mle-llm-evals",
]);

/** A part's page questions: the height of its bar (13 to 31; 4 and 6 for
 *  the LLM parts). */
export const questionsOf = (p: Part): number => Object.values(p.from).reduce((a, b) => a + (b ?? 0), 0);

/** The answers a part gives: its page questions less the twins it answers
 *  together (12 to 24). */
export const answersOf = (p: Part): number => questionsOf(p) - p.together;

/** The part number of each topic video, by its folder, so a label that
 *  points at a part follows PARTS if the order changes. */
export const partOf = (video: string): number => {
  const part = PARTS.find((p) => p.video === video);
  if (!part) throw new Error(`no part is the video ${video}`);
  return part.n;
};

/** Answered here, not in PARTS: the LLM page's "How has the ML Engineer
 *  interview changed with LLMs?". */
export const ANSWERED_HERE = { page: "llm-systems-and-evals", questions: 1 } as const;

/** The questions the ten topic videos answer, each once (166), and the
 *  answers that takes (147, since 19 are a second page's copy). */
export const QUESTIONS = PARTS.reduce((a, p) => a + questionsOf(p), 0);
export const ANSWERS = PARTS.reduce((a, p) => a + answersOf(p), 0);
export const TOGETHER = PARTS.reduce((a, p) => a + p.together, 0);

/** The questions the track's eight topic pages ask (167), counted by
 *  check.mjs. */
export const PAGE_QUESTIONS: number = results.totalQuestions;

/** Each page's `###` count, in the track's order. */
export const PAGES: readonly { page: string; questions: number; conceptChecks: number; challenges: number }[] = results.pages;

/** multiple-choice-questions.mdx, counted: 110. */
export const BANK: number = results.bank;

/** The topic pages (8), those with concept checks (all 8), the runnable
 *  challenges (5) and the pages that have them (3: ml-fundamentals,
 *  coding, statistics-and-probability). */
export const TOPIC_PAGES: number = results.topicPages;
export const CHECK_PAGES: number = results.conceptCheckPages;
export const CHALLENGES: number = results.challenges;
export const CHALLENGE_PAGE_NAMES: readonly string[] = results.challengePageNames;

/** The index's three rounds ("rounds"), as the screen names them. */
export const ROUNDS = ["Coding", "ML concepts", "ML system design"] as const;

/** The index's four probes ("rounds-probe", "rounds-ops"), their topics as
 *  the page lists them, and the parts that answer them (monitoring and drift
 *  are Part 8's, the rest of system design Part 7's; MLOps' latency and cost
 *  are Part 7's serving questions, which also answers 3 of the mlops page's
 *  questions, and the rest Part 8's); then the track's other pages
 *  ("rounds-more"). */
export const PROBES: readonly { name: string; topics: string; parts: number[] }[] = [
  { name: "ML fundamentals", topics: "supervised vs unsupervised, over/underfitting, regularization, metrics, leakage", parts: [1, 2] },
  { name: "Coding", topics: "data structures and algorithms, NumPy, pandas", parts: [3] },
  { name: "ML system design", topics: "training and serving pipelines, feature stores, batch vs online inference, monitoring and drift", parts: [7, 8] },
  { name: "MLOps", topics: "reproducibility, versioning data and models, CI/CD, latency and cost", parts: [7, 8] },
];
export const ALSO_ON_TRACK = { name: "Also on the track", topics: "statistics, deep learning, NLP and LLMs", parts: [4, 5, 6] } as const;

/** What the LLM page says is still asked ("llm": "Classical ML did not
 *  leave: expect bias and variance, leakage, metrics, and a coding round"),
 *  and the parts that answer each: the first three are Part 1's, the coding
 *  round Part 3's. */
export const STILL_ASKED: readonly { name: string; parts: number[] }[] = [
  { name: "Bias and variance", parts: [1] },
  { name: "Leakage", parts: [1] },
  { name: "Metrics", parts: [1] },
  { name: "A coding round", parts: [3] },
];

/** What LLMs added ("llm-design" to "llm-not"), the LLM page's four items,
 *  and the parts that answer each. */
export const ADDED: readonly { name: string; parts: number[] }[] = [
  { name: "Application design", parts: [6, 10] },
  { name: "Inference economics", parts: [9] },
  { name: "Evaluation without one right answer", parts: [10] },
  { name: "When not to use an LLM", parts: [10] },
];
