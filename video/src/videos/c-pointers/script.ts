import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Pointers in C" (16:9), after
 * content/courses/c-programming-for-beginners/pointers.mdx: its opening
 * `int n = 42; int *p = &n;`, its `*p = 100`, and its own
 * `swap(int *a, int *b)` called as `swap(&x, &y)` with `x = 1, y = 2`. The
 * swap that changes nothing is the same function taking `int a, int b`, the
 * by-value rule of functions.mdx ("Parameters are local copies").
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each checked by compiling with gcc 13.3.0 (-Wall -Wextra, no
 * warnings) and running on x86_64 Linux. The programs are the listings on
 * screen; data.ts has their output and the run the addresses come from:
 *   - `int *p = &n;` stores n's address in p: `p` and `&n` print the same;
 *   - `*p` reads 42, and after `*p = 100;` printing n gives 100;
 *   - sizeof(int) is 4 and sizeof(int *) is 8 on this machine;
 *   - addresses differ on every run (ASLR is on: randomize_va_space is 2),
 *     so the figures say which run they show;
 *   - `swap(int a, int b)` called as `swap(x, y)` swaps its copies (they hold
 *     2 and 1 inside it, at addresses of their own) and prints
 *     "after:  x = 1, y = 2";
 *   - `swap(int *a, int *b)` called as `swap(&x, &y)` gets a equal to &x and
 *     b equal to &y, and prints "after:  x = 2, y = 1".
 *
 * Written to be spoken: short sentences, no symbols, no parentheses. "&" is
 * said "ampersand" and "*" is said "star". It is also written the way a
 * person talks, for a voice that reads it in one take (scripts/narrate.mjs):
 * contractions, a question the next sentence answers, an ellipsis where a
 * speaker would hold, capitals on the one word a line leans on, and a single
 * [curious] audio tag. Tags and capitals are directions to the voice; the
 * timeline leaves tags out of the words, and cues match either case.
 */
export const script: NarrationScript = {
  id: "c-pointers",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "box",
      text: "In C, every variable is a box in memory... and every box has an address.",
      pauseAfter: 0.4,
    },
    { id: "n", text: "Here, n holds forty-two. And ampersand n? That's the address of that box.", pauseAfter: 0.35 },
    {
      id: "pointer",
      text: "[curious] So what's a pointer? It's just a variable that holds an address. Int star p, set to ampersand n, stores where n lives.",
      pauseAfter: 0.4,
    },
    {
      id: "star",
      text: "Star p goes to that address. Reading star p gives you forty-two, and writing one hundred through it changes n ITSELF.",
      pauseAfter: 0.5,
    },
    {
      id: "sizes",
      text: "On this machine, an int takes four bytes, and a pointer takes eight. The addresses change on every run, but p always holds the address of n.",
      pauseAfter: 0.7,
    },
    {
      id: "trap",
      scene: true,
      text: "Now, here's the classic trap. This swap takes two ints and trades them.",
      pauseAfter: 0.35,
    },
    {
      id: "copies",
      text: "But C passes copies. So swap gets two new boxes, a and b, holding one and two.",
      pauseAfter: 0.3,
    },
    { id: "nothing", text: "The copies trade... and x and y? They stay exactly as they were.", pauseAfter: 1.0 },
    {
      id: "fix",
      scene: true,
      text: "So, pass the addresses instead. Call swap with ampersand x and ampersand y, and a and b now hold where x and y live.",
      pauseAfter: 0.35,
    },
    {
      id: "works",
      text: "Now star a and star b reach back into main's boxes, so x and y REALLY trade.",
      pauseAfter: 1.5,
    },
    {
      id: "rule",
      scene: true,
      text: "And that's all a pointer is. Ampersand asks where a variable lives, and star goes there.",
    },
  ],
};
