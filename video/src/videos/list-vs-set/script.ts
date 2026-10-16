import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "List or set?" (16:9), after
 * content/courses/python-basics/sets.mdx, "Sets vs lists for lookup", whose
 * own snippet (`999_999 in big_list` against `999_999 in big_set`) is the
 * listing in Fig. 1.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each checked by running CPython 3.13.16 (measure.py, and the checks
 * listed in data.ts; every number on screen comes from data.ts):
 *   - both lookups return True;
 *   - on a million numbers, `999_999 in big_list` takes 5.53 ms and
 *     `999_999 in big_set` 22.8 ns (timeit, best of 30 interleaved rounds),
 *     a ratio of about 242,000, "over two hundred thousand";
 *   - the list compares items 0, 1, 2 and on, front to back, 1,000,000 times
 *     in all (counted with an `__eq__` that records its calls), and a value
 *     that is not there, such as -1, also costs 1,000,000 comparisons;
 *   - the set's table has 2,097,152 buckets, 999_999 hashes to 999,999 and
 *     sits in bucket 999,999 (read from the C table with ctypes), and the
 *     lookup makes one comparison (counted the same way);
 *   - doubling the list about doubles the lookup: x2.06 from 100k to 200k,
 *     x2.09 from 200k to 400k, x2.05 from 400k to 800k, x2.12 from 500k to 1M;
 *   - the set measures 20.9 to 23.6 ns at every size from 100k to 1M;
 *   - `set(big_list)` on a million takes 36.5 ms, 6.6 full scans of the list,
 *     and its table is 33,554,648 bytes against the list's 8,000,056
 *     (`sys.getsizeof`, confirmed by tracemalloc), 4.2 times the memory. Both
 *     point at the same million int objects, which neither figure counts.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "list-vs-set",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "These two lines of Python ask the same question. Is this number in here?",
      pauseAfter: 0.4,
    },
    {
      id: "answer",
      text: "Both say yes. On a million numbers, the list takes five and a half milliseconds.",
      pauseAfter: 0.3,
    },
    { id: "set-time", text: "The set takes twenty-three nanoseconds.", pauseAfter: 0.35 },
    {
      id: "ratio",
      text: "That is over two hundred thousand times faster, for the same answer.",
      pauseAfter: 0.6,
    },
    {
      id: "scan",
      scene: true,
      text: "A list has no idea where a value lives. So Python starts at the front and compares, one item at a time.",
      pauseAfter: 0.2,
    },
    {
      id: "million",
      text: "Our number is the last one. That makes a million comparisons. Ask for one that is not there, and it checks all million too.",
      pauseAfter: 0.55,
    },
    {
      id: "hash",
      text: "A set is a hash table. Python runs the number through a hash function, and the result picks one bucket out of two million.",
      pauseAfter: 0.25,
    },
    { id: "jump", text: "It goes straight to that bucket and makes one comparison.", pauseAfter: 0.6 },
    {
      id: "grow",
      scene: true,
      text: "Now grow them both. Each time the list doubles, its lookup time doubles too.",
      pauseAfter: 0.3,
    },
    { id: "flat", text: "The set stays flat, near twenty-three nanoseconds at every size.", pauseAfter: 0.6 },
    {
      id: "rule",
      scene: true,
      text: "So if you test membership again and again, turn the list into a set once.",
      pauseAfter: 0.3,
    },
    {
      id: "cost",
      text: "Building it costs about seven scans of the list, and four times the memory. After that, every lookup is nearly free.",
    },
  ],
};
