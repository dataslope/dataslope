// What the mle-llm-evals video draws, read from results.json, which
// check.mjs computed: arithmetic on the page's own inputs (its concept
// checks, its 0.95^10) and on assumptions the narration says aloud, plus the
// track's practice, counted. No judge, retriever or agent runs here. Pure: no
// React, no Remotion, so the scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-llm-evals";

/** The pelican and the two spots (balance scale, chain) in
 *  illustrations.json, in public/images/mle-llm-evals/. */
export const ILLUSTRATIONS = true;

/** "q2-case", "q2-read": the page's third concept check. Shares of pairs:
 *  A wins 0.70 shown first and 0.35 shown second (B wins 0.65 shown first);
 *  the first-shown answer wins 0.675 on average; at least 0.35 of the pairs
 *  changed verdict with the order. */
export const POSITION = results.position as {
  aWinsAFirst: number;
  bWinsAFirst: number;
  bWinsBFirst: number;
  aWinsBFirst: number;
  firstShownWins: number;
  flippedAtLeast: number;
};

/** "q3-example": three queries, one relevant document each, at ranks 1, 3
 *  and not retrieved (null). recall@5 = 2/3, MRR = 0.444. */
export const RAG = results.rag as {
  k: number;
  ranks: (number | null)[];
  reciprocal: number[];
  recallAtK: number;
  mrr: number;
};

/** "q3-follow": the page's fourth concept check, recall@5 of 0.45, so the
 *  right passage is missing 55% of the time. */
export const RECALL_FOLLOW = results.recallFollow as { recallAt5: number; missing: number };

/** "q4-compound", "q4-fewer": per-step success to the power of the steps.
 *  0.95 over 10 (the page's, 0.599), 0.99 over 10 (0.904), 0.95 over 5
 *  (0.774). */
type Chain = { perStep: number; steps: number; task: number };
export const CHAIN = results.chain as { page: Chain; reliable: Chain; shorter: Chain };

/** "q5-numbers", "q5-which": an attempt that succeeds 0.8 of the time,
 *  independently; pass@k = 1 - 0.2^k and pass^k = 0.8^k for k = 1..8.
 *  (pass@k reaches 0.99999 by k = 7, rounded here to 1: label it "≈100%".) */
export const PASS_K = results.passK as { attempt: number; k: number[]; passAtK: number[]; passHatK: number[] };

/** "close-practice": concept checks on every topic page (8 of 8), and the
 *  bank of 110 multiple-choice questions. */
export const PRACTICE = results.practice as { topicPages: number; pagesWithConceptChecks: number; bank: number };

/** Source lines, as the page's footnotes give them. */
export const SOURCES = {
  judge: "Zheng et al., NeurIPS 2023 Datasets and Benchmarks",
  lostInTheMiddle: "Liu et al., Transactions of the ACL, 2024",
  tauBench: "Yao et al., τ-bench, 2024",
} as const;
