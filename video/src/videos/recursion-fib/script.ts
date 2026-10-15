import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Recursive Fibonacci, and the memo that fixes it" (16:9),
 * after content/courses/mastering-dsa-cpp/recursion.mdx ("Naive Fibonacci")
 * and content/courses/mastering-dsa-cpp/dynamic-programming.mdx ("Fibonacci,
 * four ways": stage two, memoization). The two listings on screen are those
 * lessons' `fib` and `fibMemo`, with `long long` in place of `int` so that
 * fib(50) fits.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, every one from running fib.cpp (g++ 13.3.0, -O2) and read from its
 * output, measurements.json, in data.ts:
 *   - fib(40) returns 102,334,155 after 331,160,281 calls;
 *   - fib(5) makes 15 calls: fib(3) twice, fib(2) three times; six distinct
 *     values, so nine calls repeat earlier work;
 *   - at most 5 calls of fib(5) are open at once (the deepest the stack
 *     gets), and the deepest is n for every n measured, naive or memoized;
 *   - naive calls for n = 10, 20, 30, 40, 50: 177; 21,891; 2,692,537;
 *     331,160,281; 40,730,022,147. Each row is about 123 times the last;
 *   - naive fib(50) took 25.0 s, the best of 3 runs, on one core of a
 *     shared 2.80 GHz Xeon (cloud container);
 *   - with the memo, fib(5) makes 9 calls, two of them answered from the
 *     table, and fib(n) makes 2n - 1 calls: 99 for n = 50;
 *   - memoized fib(50) took 472 ns, making the table included (best of
 *     21 rounds of about 100,000 calls each): under a microsecond.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "recursion-fib",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "This is Fibonacci in C plus plus, written straight from the definition.",
      pauseAfter: 0.3,
    },
    {
      id: "calls",
      text: "It is correct. But to get fib of forty, it makes three hundred thirty-one million calls.",
      pauseAfter: 0.6,
    },
    { id: "tree", text: "Here is every call for fib of five. Fifteen in all.", pauseAfter: 0.3 },
    {
      id: "repeat",
      text: "Fib of three is computed twice, and fib of two three times. Each repeat redoes its whole branch.",
      pauseAfter: 0.5,
    },
    {
      id: "stack",
      text: "The stack only holds one path down the tree at a time, so it never gets more than five calls deep.",
      pauseAfter: 0.3,
    },
    { id: "point", text: "Depth is not the problem. The count is.", pauseAfter: 0.5 },
    {
      id: "count",
      text: "Fib of ten makes one hundred seventy-seven calls. Twenty, about twenty-two thousand. Thirty, two point seven million.",
      pauseAfter: 0.3,
    },
    {
      id: "factor",
      text: "Every ten more multiplies the work by about a hundred and twenty-three.",
      pauseAfter: 0.3,
    },
    {
      id: "fifty",
      text: "Fib of fifty makes over forty billion calls, and takes twenty-five seconds.",
      pauseAfter: 0.6,
    },
    {
      id: "fix",
      text: "The fix is to write each answer down. Check a table before computing, and store the result after.",
      pauseAfter: 0.4,
    },
    {
      id: "collapse",
      text: "Every repeat becomes a lookup, and the tree collapses to one path. Fib of five takes nine calls.",
      pauseAfter: 0.5,
    },
    {
      id: "linear",
      text: "Fib of fifty now takes ninety-nine calls, two more for each step up in n, and under a microsecond.",
      pauseAfter: 0.4,
    },
    {
      id: "depth",
      text: "The stack is still fifty calls deep. Memoization removes the repeats, not the recursion.",
      pauseAfter: 0.5,
    },
    {
      id: "rule",
      text: "That is the seed of dynamic programming. When a recursion asks the same question twice, keep the first answer.",
    },
  ],
};
