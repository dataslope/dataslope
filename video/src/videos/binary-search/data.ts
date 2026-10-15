// The round the video plays, computed rather than typed: the same loop the
// lesson teaches (content/courses/mastering-dsa-cpp/searching.mdx), on the
// numbers 1..100. If a change here ever disagreed with the narration, the
// cues in the scenes would throw, because each one looks up the spoken guess.

export const LO = 1;
export const HI = 100;
export const TARGET = 77;
export const MAX_TRIES = 7;

export type Answer = "higher" | "lower" | "win";
export type Guess = {
  /** The range still in play before this guess, inclusive. */
  lo: number;
  hi: number;
  left: number;
  guess: number;
  answer: Answer;
};

/** Binary search on lo..hi, recording every guess. The middle is
 *  `lo + (hi - lo) / 2` rounded down, the lesson's overflow-safe form. */
export function play(target: number, lo: number, hi: number): Guess[] {
  const out: Guess[] = [];
  while (lo <= hi) {
    const guess = lo + Math.floor((hi - lo) / 2);
    const left = hi - lo + 1;
    if (guess === target) {
      out.push({ lo, hi, left, guess, answer: "win" });
      return out;
    }
    const answer: Answer = guess < target ? "higher" : "lower";
    out.push({ lo, hi, left, guess, answer });
    if (answer === "higher") lo = guess + 1;
    else hi = guess - 1;
  }
  return out;
}

/** 50 H, 75 H, 88 L, 81 L, 78 L, 76 H, 77: all seven tries. */
export const ROUND = play(TARGET, LO, HI);
if (ROUND.length !== MAX_TRIES) {
  throw new Error(`Expected ${MAX_TRIES} guesses for ${TARGET}, got ${ROUND.length}`);
}

/** The range in play after guess i has been answered. */
export const rangeAfter = (i: number) => {
  const g = ROUND[i];
  if (g.answer === "win") return { lo: g.guess, hi: g.guess };
  return g.answer === "higher" ? { lo: g.guess + 1, hi: g.hi } : { lo: g.lo, hi: g.guess - 1 };
};

/** The beat that speaks each guess, in order. */
export const GUESS_BEATS = ["first", "second", "third", "rest", "rest", "rest", "win"];

/** Why 7: the powers of two up to the first one past 100. */
export const POWERS = Array.from({ length: MAX_TRIES }, (_, i) => 2 ** (i + 1));

/** Worst-case guesses for n numbers: the smallest k with 2^k > n. */
export const triesFor = (n: number) => Math.ceil(Math.log2(n + 1));

export const SCALE_ROWS = [
  { n: 100, label: "100" },
  { n: 1_000_000, label: "1,000,000" },
  { n: 1_000_000_000, label: "1,000,000,000" },
].map((r) => ({ ...r, tries: triesFor(r.n) }));

// 7, 20, 30: the numbers the narration says.
if (SCALE_ROWS.map((r) => r.tries).join() !== "7,20,30") {
  throw new Error(`Scale table disagrees with the narration: ${SCALE_ROWS.map((r) => r.tries)}`);
}

/** The catch: a sorted row, then the same values shuffled so the middle
 *  says "lower" while the target sits to the right. */
export const SORTED = [12, 25, 31, 47, 58, 66, 90];
export const SHUFFLED = [58, 12, 90, 31, 66, 25, 47];
export const CATCH_TARGET = 25;
