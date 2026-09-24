/**
 * Single-step code challenges: arrays, two pointers and sliding windows.
 *
 * Each of these is one scan over a sequence where the obvious answer keeps
 * redoing work it has already done: re-adding a window that only moved by
 * one, rescanning for a maximum, trying every pair or every start. The lesson
 * in each is the small piece of state that lets a single pass carry what the
 * restart recomputed: a running minimum, a window's letter counts, a budget of
 * flips, or two indices closing in from the ends because the sorted order says
 * which one may move. Wherever the restart is quadratic (or worse), the checks
 * include a large input so the naive version times out rather than passing.
 *
 * Python and JavaScript, graded on one shared set of cases through
 * `dualChallenge`; `__tests__/challengeSolutions` runs both reference
 * solutions for real.
 */

import { dualChallenge } from "./authoring";
import type { Challenge } from "./types";

// ─── Unique in First-Seen Order ──────────────────────────────────────

const UNIQUE_IN_ORDER = dualChallenge({
  slug: "unique-in-order",
  title: "Unique in First-Seen Order",
  difficulty: "Beginner",
  topic: "Order-preserving dedup",
  description:
    "Drop repeated values from a list while keeping each one where it first appeared.",
  prompt: [
    "Given a list of strings, return a new list with every repeat removed. Each value keeps the place of its first appearance, so the result is in the order the values were first seen, not sorted.",
    "Values are compared exactly: `\"Docs\"` and `\"docs\"` are different. Checking `item not in result` before appending works, but it rescans the result for every item, which is quadratic once there are many distinct values; the large check has a hundred thousand of them.",
  ],
  params: ["items"],
  constraints: [
    "`0 ≤ len(items) ≤ 2 × 10⁵`",
    "Comparison is exact, so case matters",
    "Order is first appearance, not alphabetical",
  ],
  solutionNote:
    "Remember what has been seen in a set, whose membership test takes constant time, and keep a value only the first time it turns up. Python's `dict.fromkeys(items)` and JavaScript's `new Set(items)` both keep insertion order, so either one is the whole answer; the trap is Python's `list(set(items))`, which is just as fast but throws the order away.",
  python: {
    fn: "unique_in_order",
    signature: "def unique_in_order(items: list[str]) -> list[str]",
    starter: `def unique_in_order(items: list[str]) -> list[str]:
    # Track what has been seen in something faster to search than a list.
    return items
`,
    solution: `def unique_in_order(items: list[str]) -> list[str]:
    # Dict keys are unique and remember the order they were inserted in.
    return list(dict.fromkeys(items))
`,
  },
  javascript: {
    fn: "uniqueInOrder",
    signature: "function uniqueInOrder(items: string[]): string[]",
    starter: `function uniqueInOrder(items) {
  // Track what has been seen in something faster to search than an array.
  return items;
}
`,
    solution: `function uniqueInOrder(items) {
  // A Set ignores repeats and iterates in insertion order.
  return [...new Set(items)];
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Repeats are dropped",
      args: [["home", "pricing", "home", "docs", "pricing", "signup"]],
      expected: ["home", "pricing", "docs", "signup"],
      noMutation: true,
      example: "Each page stays where it first appeared.",
    },
    {
      id: "example2",
      name: "First-seen order, not sorted order",
      args: [["zeta", "alpha", "mid", "alpha", "zeta"]],
      expected: ["zeta", "alpha", "mid"],
      example: "Sorting the unique values would put alpha first.",
    },
    {
      id: "case",
      name: "Case matters",
      description: "Three spellings are three different values.",
      args: [["Docs", "docs", "DOCS", "docs"]],
      expected: ["Docs", "docs", "DOCS"],
    },
    {
      id: "all-same",
      name: "One value, repeated",
      args: [["x", "x", "x", "x"]],
      expected: ["x"],
    },
    {
      id: "no-repeats",
      name: "Nothing to remove",
      description: "The list comes back as it was, not sorted.",
      args: [["c", "a", "b"]],
      expected: ["c", "a", "b"],
    },
    { id: "empty", name: "An empty list", args: [[]], expected: [] },
    {
      id: "large",
      name: "Two hundred thousand values",
      description:
        "A hundred thousand of them are distinct, so scanning the result for each one is billions of comparisons.",
      pyArgs: `[f"u{(i * 7919) % 100000}" for i in range(200000)]`,
      pyExpected: `[f"u{(i * 7919) % 100000}" for i in range(100000)]`,
      jsArgs: `Array.from({ length: 200000 }, (_, i) => "u" + ((i * 7919) % 100000))`,
      jsExpected: `Array.from({ length: 100000 }, (_, i) => "u" + ((i * 7919) % 100000))`,
    },
  ],
});

// ─── Move Zeros to the End ───────────────────────────────────────────

const MOVE_ZEROS = dualChallenge({
  slug: "move-zeros",
  title: "Move Zeros to the End",
  difficulty: "Beginner",
  topic: "Stable partitioning",
  description:
    "Push every zero to the back of a list without disturbing the order of everything else.",
  prompt: [
    "Return a new list holding the same integers with every zero moved to the end. The non-zero values keep their original relative order, negatives and repeats included.",
    "Leave the list you were given unchanged. Removing each zero and appending it again edits the caller's list, and every removal shifts everything after it, which is quadratic on a long list.",
  ],
  params: ["nums"],
  constraints: [
    "`0 ≤ len(nums) ≤ 2 × 10⁵`",
    "Values may be negative",
    "Do not modify `nums`",
  ],
  solutionNote:
    "Collect the non-zero values in one pass, which keeps their order because a filter never reorders anything, then pad with as many zeros as were skipped. Sorting with a key that puts zeros last also works, since both languages' sorts are stable, but it spends O(n log n) on what is a single O(n) pass.",
  python: {
    fn: "move_zeros",
    signature: "def move_zeros(nums: list[int]) -> list[int]",
    starter: `def move_zeros(nums: list[int]) -> list[int]:
    # Keep the non-zero values in order, then add the zeros back.
    return list(nums)
`,
    solution: `def move_zeros(nums: list[int]) -> list[int]:
    kept = [x for x in nums if x != 0]
    return kept + [0] * (len(nums) - len(kept))
`,
  },
  javascript: {
    fn: "moveZeros",
    signature: "function moveZeros(nums: number[]): number[]",
    starter: `function moveZeros(nums) {
  // Keep the non-zero values in order, then add the zeros back.
  return [...nums];
}
`,
    solution: `function moveZeros(nums) {
  const kept = nums.filter((x) => x !== 0);
  return kept.concat(Array(nums.length - kept.length).fill(0));
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Zeros move to the back",
      args: [[0, 1, 0, 3, 12]],
      expected: [1, 3, 12, 0, 0],
      noMutation: true,
      example: "1, 3 and 12 keep their order.",
    },
    {
      id: "example2",
      name: "Negatives and repeats keep their places",
      args: [[4, -2, 0, 0, 7, 0, -2]],
      expected: [4, -2, 7, -2, 0, 0, 0],
      noMutation: true,
      example: "A negative is not a zero, and both -2s stay in order.",
    },
    {
      id: "no-zeros",
      name: "No zeros at all",
      description: "The list comes back in its original order, not sorted.",
      args: [[5, 3, 1]],
      expected: [5, 3, 1],
    },
    {
      id: "leading",
      name: "Zeros at the front",
      args: [[0, 0, 9]],
      expected: [9, 0, 0],
      noMutation: true,
    },
    { id: "all-zeros", name: "Nothing but zeros", args: [[0, 0, 0]], expected: [0, 0, 0] },
    { id: "empty", name: "An empty list", args: [[]], expected: [] },
    {
      id: "large",
      name: "Two hundred thousand values",
      description:
        "Half of them are zeros; removing them one at a time shifts the list a hundred thousand times.",
      pyArgs: `[0 if i % 2 == 0 else i for i in range(200000)]`,
      pyExpected: `list(range(1, 200000, 2)) + [0] * 100000`,
      jsArgs: `Array.from({ length: 200000 }, (_, i) => (i % 2 === 0 ? 0 : i))`,
      jsExpected: `[...Array.from({ length: 100000 }, (_, i) => 2 * i + 1), ...Array(100000).fill(0)]`,
      noMutation: true,
    },
  ],
});

// ─── Sorted Squares ──────────────────────────────────────────────────

const SORTED_SQUARES = dualChallenge({
  slug: "sorted-squares",
  title: "Sorted Squares",
  difficulty: "Beginner",
  topic: "Two pointers from both ends",
  description: "Square every value of a sorted list and return the squares in sorted order.",
  prompt: [
    "`nums` is sorted in ascending order and may contain negatives. Return the square of every value, in ascending order.",
    "Squaring and then sorting is correct, and O(n log n). The sorted input allows a single O(n) pass instead: the largest square always comes from one end of the list or the other.",
  ],
  params: ["nums"],
  constraints: [
    "`0 ≤ len(nums) ≤ 2 × 10⁵`",
    "`nums` is sorted ascending",
    "`-10⁵ ≤ nums[i] ≤ 10⁵`",
  ],
  solutionNote:
    "Squaring reverses the order of the negatives, so the squares fall and then rise: the smallest is somewhere in the middle, but the largest is always at one of the two ends. Keep a pointer at each end, write the larger square into the last free slot and move that pointer inward, and the result fills from the back in one pass.",
  python: {
    fn: "sorted_squares",
    signature: "def sorted_squares(nums: list[int]) -> list[int]",
    starter: `def sorted_squares(nums: list[int]) -> list[int]:
    # The largest square is at one end or the other.
    return [x * x for x in nums]
`,
    solution: `def sorted_squares(nums: list[int]) -> list[int]:
    out = [0] * len(nums)
    lo, hi = 0, len(nums) - 1
    for pos in range(len(nums) - 1, -1, -1):
        if abs(nums[lo]) > abs(nums[hi]):
            out[pos] = nums[lo] ** 2
            lo += 1
        else:
            out[pos] = nums[hi] ** 2
            hi -= 1
    return out
`,
  },
  javascript: {
    fn: "sortedSquares",
    signature: "function sortedSquares(nums: number[]): number[]",
    starter: `function sortedSquares(nums) {
  // The largest square is at one end or the other.
  return nums.map((x) => x * x);
}
`,
    solution: `function sortedSquares(nums) {
  const out = new Array(nums.length);
  let lo = 0;
  let hi = nums.length - 1;
  for (let pos = nums.length - 1; pos >= 0; pos--) {
    if (Math.abs(nums[lo]) > Math.abs(nums[hi])) {
      out[pos] = nums[lo] ** 2;
      lo++;
    } else {
      out[pos] = nums[hi] ** 2;
      hi--;
    }
  }
  return out;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Negatives reorder when squared",
      args: [[-4, -1, 0, 3, 10]],
      expected: [0, 1, 9, 16, 100],
      example: "-4 squares to 16, which belongs after 9.",
    },
    {
      id: "example2",
      name: "Equal squares from both sides",
      args: [[-7, -3, 2, 3, 11]],
      expected: [4, 9, 9, 49, 121],
      example: "-3 and 3 both give 9, and they end up side by side.",
    },
    {
      id: "all-negative",
      name: "Every value negative",
      description: "The order reverses completely.",
      args: [[-5, -3, -1]],
      expected: [1, 9, 25],
    },
    { id: "all-positive", name: "Every value positive", args: [[1, 2, 3]], expected: [1, 4, 9] },
    { id: "single", name: "A single value", args: [[-2]], expected: [4] },
    { id: "empty", name: "An empty list", args: [[]], expected: [] },
    {
      id: "large",
      name: "Two hundred thousand values",
      description: "Half of them negative.",
      pyArgs: `list(range(-100000, 100000))`,
      pyExpected: `sorted(x * x for x in range(-100000, 100000))`,
      jsArgs: `Array.from({ length: 200000 }, (_, i) => i - 100000)`,
      jsExpected: `Array.from({ length: 200000 }, (_, i) => (i - 100000) ** 2).sort((a, b) => a - b)`,
    },
  ],
});

// ─── Best Day to Buy and Sell ────────────────────────────────────────

const BEST_TIME_TO_TRADE = dualChallenge({
  slug: "best-time-to-trade",
  title: "Best Day to Buy and Sell",
  difficulty: "Beginner",
  topic: "Running minimum",
  description:
    "Find the most one trade can make from a series of daily prices, buying before selling.",
  prompt: [
    "`prices[i]` is a stock's price on day `i`. Buy on one day, sell on a later day, and return the largest profit that one trade can make. When no trade makes money (prices only fall or stay flat, or there are fewer than two days), return `0`.",
    "The highest price minus the lowest is not the answer when the lowest comes after the highest. Trying every buy day against every later sell day is O(n²); one pass that remembers something about the days behind it is enough.",
  ],
  params: ["prices"],
  constraints: [
    "`0 ≤ len(prices) ≤ 2 × 10⁵`",
    "`0 ≤ prices[i] ≤ 10⁵`",
    "The sell day must come after the buy day",
  ],
  solutionNote:
    "Walk the days in order carrying the lowest price seen so far: the best sale on any day is that day's price minus that minimum, so the answer is the largest of those differences. Starting the best profit at `0` rather than at the first difference is what makes a falling market come out as no trade instead of a loss.",
  python: {
    fn: "max_profit",
    signature: "def max_profit(prices: list[int]) -> int",
    starter: `def max_profit(prices: list[int]) -> int:
    # Carry the cheapest price seen so far.
    return 0
`,
    solution: `def max_profit(prices: list[int]) -> int:
    best = 0
    lowest = float("inf")
    for price in prices:
        lowest = min(lowest, price)
        best = max(best, price - lowest)
    return best
`,
  },
  javascript: {
    fn: "maxProfit",
    signature: "function maxProfit(prices: number[]): number",
    starter: `function maxProfit(prices) {
  // Carry the cheapest price seen so far.
  return 0;
}
`,
    solution: `function maxProfit(prices) {
  let lowest = Infinity;
  let best = 0;
  for (const price of prices) {
    lowest = Math.min(lowest, price);
    best = Math.max(best, price - lowest);
  }
  return best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Buy low, sell later",
      args: [[7, 1, 5, 3, 6, 4]],
      expected: 5,
      example: "Buy at 1, sell at 6 three days later.",
    },
    {
      id: "example2",
      name: "Prices only fall",
      args: [[7, 6, 4, 3, 1]],
      expected: 0,
      example: "Every sale would lose money, so the best trade is no trade.",
    },
    {
      id: "low-after-high",
      name: "The cheapest day comes after the dearest",
      description:
        "Buying at 1 and selling at 8 would mean selling first; the best real trade is 3 to 8.",
      args: [[3, 8, 1, 4]],
      expected: 5,
    },
    { id: "flat", name: "Flat prices", args: [[4, 4, 4]], expected: 0 },
    { id: "single", name: "A single day", args: [[5]], expected: 0 },
    { id: "empty", name: "No prices at all", args: [[]], expected: 0 },
    {
      id: "large",
      name: "Two hundred thousand days",
      description:
        "A long fall and then a long climb; every buy day against every later day is twenty billion pairs.",
      pyArgs: `list(range(100000, 0, -1)) + list(range(100000))`,
      jsArgs: `[...Array.from({ length: 100000 }, (_, i) => 100000 - i), ...Array.from({ length: 100000 }, (_, i) => i)]`,
      expected: 99999,
    },
  ],
});

// ─── Best K-Day Stretch ──────────────────────────────────────────────

const MAX_WINDOW_SUM = dualChallenge({
  slug: "max-window-sum",
  title: "Best K-Day Stretch",
  difficulty: "Beginner",
  topic: "Fixed-size window",
  description:
    "Find the k consecutive days with the highest combined takings by sliding one window along.",
  prompt: [
    "`takings[i]` is a shop's net takings on day `i`, and a day with more refunds than sales is negative. Return the largest total of any `k` consecutive days.",
    "Adding up every window from scratch costs `k` additions per window, which runs to billions on the large check. Neighboring windows differ by just two days: one entering, one leaving.",
  ],
  params: ["takings", "k"],
  constraints: [
    "`1 ≤ k ≤ len(takings) ≤ 3 × 10⁵`",
    "Values may be negative",
    "Return the total, not the window",
  ],
  solutionNote:
    "Sum the first `k` days once, then move the window a day at a time: add the day entering, subtract the day leaving, and keep the best total seen. Start the best at the first window's total, not at `0`, or a run of losing days reports a profit that no window made.",
  python: {
    fn: "best_stretch",
    signature: "def best_stretch(takings: list[int], k: int) -> int",
    starter: `def best_stretch(takings: list[int], k: int) -> int:
    # Slide one window along rather than re-adding each one.
    return 0
`,
    solution: `def best_stretch(takings: list[int], k: int) -> int:
    window = sum(takings[:k])
    best = window
    for i in range(k, len(takings)):
        window += takings[i] - takings[i - k]
        best = max(best, window)
    return best
`,
  },
  javascript: {
    fn: "bestStretch",
    signature: "function bestStretch(takings: number[], k: number): number",
    starter: `function bestStretch(takings, k) {
  // Slide one window along rather than re-adding each one.
  return 0;
}
`,
    solution: `function bestStretch(takings, k) {
  let window = takings.slice(0, k).reduce((sum, x) => sum + x, 0);
  let best = window;
  for (let i = k; i < takings.length; i++) {
    window += takings[i] - takings[i - k];
    best = Math.max(best, window);
  }
  return best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Three days in a row",
      args: [[2, 1, 5, 1, 3, 2], 3],
      expected: 9,
      example: "The days taking 5, 1 and 3.",
    },
    {
      id: "example2",
      name: "Every window loses money",
      args: [[-3, -1, -4, -2], 2],
      expected: -4,
      example: "The best stretch is the smallest loss, not 0.",
    },
    { id: "whole", name: "One window covering every day", args: [[4, -1, 2], 3], expected: 5 },
    { id: "k-one", name: "Windows of a single day", args: [[3, 9, -2, 9], 1], expected: 9 },
    {
      id: "best-last",
      name: "The best window is the last one",
      description: "A loop that stops one window early misses it.",
      args: [[1, 1, 1, 10, 10], 2],
      expected: 20,
    },
    {
      id: "large",
      name: "Three hundred thousand days",
      description:
        "Windows of 150,000 days; adding each one up from scratch is over twenty billion additions.",
      pyArgs: `[(i * 7919) % 1001 - 500 for i in range(300000)], 150000`,
      jsArgs: `Array.from({ length: 300000 }, (_, i) => ((i * 7919) % 1001) - 500), 150000`,
      expected: 3050,
    },
  ],
});

// ─── Container With Most Water ───────────────────────────────────────

const CONTAINER_MOST_WATER = dualChallenge({
  slug: "container-most-water",
  title: "Container With Most Water",
  difficulty: "Intermediate",
  topic: "Two pointers",
  description: "Pick the two walls that hold the most water between them.",
  prompt: [
    "`heights[i]` is the height of a wall standing at position `i`. Any two walls make a container that holds `min(heights[i], heights[j]) * (j - i)` units of water; the walls between them do not get in the way. Return the most water any pair can hold, or `0` when there are fewer than two walls.",
    "Trying every pair is O(n²), which the large check will not wait for. Start with the widest pair and work out which of its two walls can be given up without losing the best answer.",
  ],
  params: ["heights"],
  constraints: ["`0 ≤ len(heights) ≤ 2 × 10⁵`", "`0 ≤ heights[i] ≤ 10⁵`"],
  solutionNote:
    "Start with the outermost pair and always move the shorter wall inward. Every other container that keeps the shorter wall is narrower and no taller, so none of them can beat the one just measured; giving that wall up loses nothing, while moving the taller wall instead could only shrink the result. Each step discards one wall, so the scan is O(n).",
  python: {
    fn: "most_water",
    signature: "def most_water(heights: list[int]) -> int",
    starter: `def most_water(heights: list[int]) -> int:
    # Start at both ends; which wall is safe to give up?
    return 0
`,
    solution: `def most_water(heights: list[int]) -> int:
    lo, hi = 0, len(heights) - 1
    best = 0
    while lo < hi:
        width = hi - lo
        if heights[lo] < heights[hi]:
            best = max(best, heights[lo] * width)
            lo += 1
        else:
            best = max(best, heights[hi] * width)
            hi -= 1
    return best
`,
  },
  javascript: {
    fn: "mostWater",
    signature: "function mostWater(heights: number[]): number",
    starter: `function mostWater(heights) {
  // Start at both ends; which wall is safe to give up?
  return 0;
}
`,
    solution: `function mostWater(heights) {
  let lo = 0;
  let hi = heights.length - 1;
  let best = 0;
  while (lo < hi) {
    best = Math.max(best, Math.min(heights[lo], heights[hi]) * (hi - lo));
    if (heights[lo] < heights[hi]) lo++;
    else hi--;
  }
  return best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two walls far apart",
      args: [[1, 8, 6, 2, 5, 4, 8, 3, 7]],
      expected: 49,
      example: "The 8 at position 1 and the 7 at position 8: 7 × 7.",
    },
    {
      id: "example2",
      name: "Width beats height",
      args: [[6, 1, 1, 20, 20, 1, 6]],
      expected: 36,
      example: "The two 20s are only one apart; the 6s at the ends hold 6 × 6.",
    },
    {
      id: "equal-ends",
      name: "Equal walls at both ends",
      args: [[4, 3, 2, 1, 4]],
      expected: 16,
    },
    { id: "two", name: "Exactly two walls", args: [[1, 1]], expected: 1 },
    { id: "one", name: "A single wall holds nothing", args: [[5]], expected: 0 },
    { id: "empty", name: "No walls at all", args: [[]], expected: 0 },
    {
      id: "large",
      name: "Two hundred thousand walls",
      description: "Every pair is twenty billion containers.",
      pyArgs: `[(i * 7919) % 10007 for i in range(200000)]`,
      jsArgs: `Array.from({ length: 200000 }, (_, i) => (i * 7919) % 10007)`,
      expected: 1993075566,
    },
  ],
});

// ─── Longest Substring Without Repeats ───────────────────────────────

const LONGEST_UNIQUE_SUBSTRING = dualChallenge({
  slug: "longest-unique-substring",
  title: "Longest Substring Without Repeats",
  difficulty: "Intermediate",
  topic: "Sliding window",
  description:
    "Measure the longest stretch of a string in which no character appears twice.",
  prompt: [
    "Return the length of the longest substring of `s` in which every character is different. A substring is contiguous: `\"pwke\"` is not a substring of `\"pwwkew\"`.",
    "Characters are compared exactly, so `\"A\"` and `\"a\"` differ and a space counts. Restarting the scan from every position rereads the same characters again and again; the large check cycles through ten thousand different characters, so that restart costs billions of steps.",
  ],
  params: ["s"],
  constraints: [
    "`0 ≤ len(s) ≤ 2 × 10⁵`",
    "Any characters: letters of either case, digits, spaces, other scripts",
    "Return the length, not the substring",
  ],
  solutionNote:
    "Keep a window with no repeats and remember the last index where each character was seen. When the next character was last seen inside the window, jump the start to just past that index rather than stepping it forward one at a time. The trap is jumping when the old sighting is already left of the start, which drags the window backwards; `\"abba\"` catches it.",
  python: {
    fn: "longest_unique_length",
    signature: "def longest_unique_length(s: str) -> int",
    starter: `def longest_unique_length(s: str) -> int:
    # Remember where each character was last seen.
    return 0
`,
    solution: `def longest_unique_length(s: str) -> int:
    last_seen: dict[str, int] = {}
    start = best = 0
    for i, ch in enumerate(s):
        if last_seen.get(ch, -1) >= start:
            start = last_seen[ch] + 1
        last_seen[ch] = i
        best = max(best, i - start + 1)
    return best
`,
  },
  javascript: {
    fn: "longestUniqueLength",
    signature: "function longestUniqueLength(s: string): number",
    starter: `function longestUniqueLength(s) {
  // Remember where each character was last seen.
  return 0;
}
`,
    solution: `function longestUniqueLength(s) {
  const lastSeen = new Map();
  let start = 0;
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const seenAt = lastSeen.get(s[i]);
    if (seenAt !== undefined && seenAt >= start) start = seenAt + 1;
    lastSeen.set(s[i], i);
    best = Math.max(best, i - start + 1);
  }
  return best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A repeating pattern",
      args: ["abcabcbb"],
      expected: 3,
      example: "abc; every longer stretch repeats a letter.",
    },
    {
      id: "example2",
      name: "Contiguous only",
      args: ["pwwkew"],
      expected: 3,
      example: "wke. The letters p, w, k, e never sit together.",
    },
    {
      id: "abba",
      name: "A repeat from before the window",
      description: "The second a must not pull the window's start back past the b's.",
      args: ["abba"],
      expected: 2,
    },
    { id: "same", name: "One letter repeated", args: ["bbbbb"], expected: 1 },
    {
      id: "case-space",
      name: "Case and spaces count",
      description: "A, a and a space are three different characters.",
      args: ["Aa a"],
      expected: 3,
    },
    { id: "empty", name: "An empty string", args: [""], expected: 0 },
    {
      id: "large",
      name: "Two hundred thousand characters",
      description:
        "Ten thousand distinct characters cycle round; rescanning from every position is two billion steps.",
      pyArgs: `"".join(chr(0x4E00 + i % 10000) for i in range(200000))`,
      jsArgs: `Array.from({ length: 200000 }, (_, i) => String.fromCharCode(0x4e00 + (i % 10000))).join("")`,
      expected: 10000,
    },
  ],
});

// ─── Shortest Run Reaching a Target ──────────────────────────────────

const SHORTEST_SUBARRAY_AT_LEAST = dualChallenge({
  slug: "shortest-subarray-at-least",
  title: "Shortest Run Reaching a Target",
  difficulty: "Intermediate",
  topic: "Variable-size window",
  description: "Find the fewest consecutive values whose sum reaches a target.",
  prompt: [
    "Given a list of positive integers and a `target`, return the length of the shortest run of consecutive values whose sum is at least `target`. If no run reaches it, not even the whole list, return `0`.",
    "Every value being positive is what makes this tractable: a longer run always has a larger sum. Trying every start and extending until the target is reached is O(n²) on the large check, where the shortest qualifying run is fifty thousand values long.",
  ],
  params: ["nums", "target"],
  constraints: [
    "`0 ≤ len(nums) ≤ 2 × 10⁵`",
    "`1 ≤ nums[i] ≤ 10⁵`",
    "`1 ≤ target ≤ 10⁹`",
    "At least, not exactly: a run that overshoots counts",
  ],
  solutionNote:
    "Grow the window on the right, and whenever its sum reaches the target, record its length and drop values from the left for as long as it still does. Because every value is positive, a start that has been dropped can never begin a shorter qualifying run later, so each index enters and leaves once; with negative values that argument fails and a plain window no longer works.",
  python: {
    fn: "shortest_run",
    signature: "def shortest_run(nums: list[int], target: int) -> int",
    starter: `def shortest_run(nums: list[int], target: int) -> int:
    # Grow on the right; shrink from the left while the sum still reaches target.
    return 0
`,
    solution: `def shortest_run(nums: list[int], target: int) -> int:
    best = len(nums) + 1
    total = start = 0
    for end, value in enumerate(nums):
        total += value
        while total >= target:
            best = min(best, end - start + 1)
            total -= nums[start]
            start += 1
    return best if best <= len(nums) else 0
`,
  },
  javascript: {
    fn: "shortestRun",
    signature: "function shortestRun(nums: number[], target: number): number",
    starter: `function shortestRun(nums, target) {
  // Grow on the right; shrink from the left while the sum still reaches target.
  return 0;
}
`,
    solution: `function shortestRun(nums, target) {
  let best = Infinity;
  let total = 0;
  let start = 0;
  nums.forEach((value, end) => {
    total += value;
    while (total >= target) {
      best = Math.min(best, end - start + 1);
      total -= nums[start++];
    }
  });
  return best === Infinity ? 0 : best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two values are enough",
      args: [[2, 3, 1, 2, 4, 3], 7],
      expected: 2,
      example: "4 + 3 reaches 7.",
    },
    {
      id: "example2",
      name: "Nothing reaches the target",
      args: [[1, 1, 1, 1], 10],
      expected: 0,
      example: "The whole list only sums to 4.",
    },
    { id: "single", name: "One value on its own", args: [[1, 4, 4], 4], expected: 1 },
    {
      id: "overshoot",
      name: "At least, not exactly",
      description: "10 + 7 is 17, which reaches 15.",
      args: [[5, 1, 3, 5, 10, 7, 4, 9, 2, 8], 15],
      expected: 2,
    },
    { id: "whole", name: "It takes the whole list", args: [[1, 2, 3, 4, 5], 15], expected: 5 },
    { id: "empty", name: "An empty list", args: [[], 3], expected: 0 },
    {
      id: "large",
      name: "Two hundred thousand values",
      description:
        "The shortest run is 50,001 values long, so extending from every start is billions of additions.",
      pyArgs: `[1] * 150000 + [50000] + [1] * 49999, 100000`,
      jsArgs: `[...Array(150000).fill(1), 50000, ...Array(49999).fill(1)], 100000`,
      expected: 50001,
    },
  ],
});

// ─── Anagram Positions ───────────────────────────────────────────────

const ANAGRAM_POSITIONS = dualChallenge({
  slug: "anagram-positions",
  title: "Anagram Positions",
  difficulty: "Intermediate",
  topic: "Window counts",
  description: "List every position in a string where some rearrangement of a pattern begins.",
  prompt: [
    "Return the start index of every substring of `s` that is an anagram of `p`: the same letters, each used the same number of times, in any order. Matches may overlap. List the indices in ascending order.",
    "Sorting or counting each window from scratch costs `len(p)` work per window, which the large check's ten-thousand-letter pattern turns into nearly a billion steps. Neighboring windows differ by one letter in and one letter out.",
  ],
  params: ["s", "p"],
  constraints: [
    "Lowercase letters `a` to `z` only",
    "`0 ≤ len(s) ≤ 10⁵` and `1 ≤ len(p) ≤ 10⁵`",
    "When `p` is longer than `s`, return an empty list",
  ],
  solutionNote:
    "Hold letter counts for `p` and for the current window, and slide: add the letter entering, remove the one leaving, and compare. With 26 letters the comparison is constant work, or it can be kept as a running count of letters whose tallies disagree. Comparing which letters appear instead of how often is the usual slip: it accepts `\"aab\"` as an anagram of `\"abb\"`.",
  python: {
    fn: "anagram_positions",
    signature: "def anagram_positions(s: str, p: str) -> list[int]",
    starter: `def anagram_positions(s: str, p: str) -> list[int]:
    # Keep the window's letter counts up to date as it slides.
    return []
`,
    solution: `def anagram_positions(s: str, p: str) -> list[int]:
    m = len(p)
    if m > len(s):
        return []
    need = [0] * 26
    window = [0] * 26
    for ch in p:
        need[ord(ch) - ord("a")] += 1
    for ch in s[:m]:
        window[ord(ch) - ord("a")] += 1
    found = [0] if window == need else []
    for start in range(1, len(s) - m + 1):
        window[ord(s[start + m - 1]) - ord("a")] += 1
        window[ord(s[start - 1]) - ord("a")] -= 1
        if window == need:
            found.append(start)
    return found
`,
  },
  javascript: {
    fn: "anagramPositions",
    signature: "function anagramPositions(s: string, p: string): number[]",
    starter: `function anagramPositions(s, p) {
  // Keep the window's letter counts up to date as it slides.
  return [];
}
`,
    solution: `function anagramPositions(s, p) {
  const m = p.length;
  const found = [];
  if (m > s.length) return found;
  // diff[c] is how many more of letter c the pattern has than the window.
  const diff = new Int32Array(26);
  for (let i = 0; i < m; i++) diff[p.charCodeAt(i) - 97]++;
  let unbalanced = diff.filter((d) => d !== 0).length;
  const shift = (i, delta) => {
    const c = s.charCodeAt(i) - 97;
    if (diff[c] === 0) unbalanced++;
    diff[c] += delta;
    if (diff[c] === 0) unbalanced--;
  };
  for (let end = 0; end < s.length; end++) {
    shift(end, -1);
    if (end >= m) shift(end - m, +1);
    if (end >= m - 1 && unbalanced === 0) found.push(end - m + 1);
  }
  return found;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two matches",
      args: ["cbaebabacd", "abc"],
      expected: [0, 6],
      example: "cba starts at 0 and bac at 6.",
    },
    {
      id: "example2",
      name: "Matches overlap",
      args: ["abab", "ab"],
      expected: [0, 1, 2],
      example: "ab, ba and ab again, each one letter further on.",
    },
    {
      id: "counts",
      name: "Letter counts matter",
      description: "aab has the right letters in the wrong numbers.",
      args: ["aabb", "abb"],
      expected: [1],
    },
    {
      id: "repeated",
      name: "A pattern of one repeated letter",
      args: ["aaaba", "aa"],
      expected: [0, 1],
    },
    {
      id: "longer",
      name: "The pattern is longer than the string",
      args: ["ab", "abc"],
      expected: [],
    },
    { id: "none", name: "No anagram anywhere", args: ["hello", "xyz"], expected: [] },
    {
      id: "large",
      name: "A hundred thousand letters",
      description:
        "Ten-thousand-letter windows; counting each one from scratch is nearly a billion steps.",
      pyArgs: `"a" * 50000 + "b" * 50000, "ab" * 5000`,
      jsArgs: `"a".repeat(50000) + "b".repeat(50000), "ab".repeat(5000)`,
      expected: [45000],
    },
  ],
});

// ─── Longest Run With K Flips ────────────────────────────────────────

const LONGEST_ONES_WITH_FLIPS = dualChallenge({
  slug: "longest-ones-with-flips",
  title: "Longest Run With K Flips",
  difficulty: "Intermediate",
  topic: "Sliding window with a budget",
  description:
    "Find the longest run of ones a list can have after turning a limited number of zeros into ones.",
  prompt: [
    "`bits` is a list of 0s and 1s. You may flip at most `k` of the zeros to ones. Return the length of the longest run of consecutive ones you can end up with.",
    "Choosing which zeros to flip is the hard way to think about it. Put another way, the question asks for the longest stretch of `bits` that contains at most `k` zeros. `k` may be 0, and it may be more than the number of zeros there are.",
  ],
  params: ["bits", "k"],
  constraints: [
    "`0 ≤ len(bits) ≤ 2 × 10⁵`",
    "Every value is `0` or `1`",
    "`0 ≤ k ≤ 2 × 10⁵`",
  ],
  solutionNote:
    "The flips are a budget: the answer is the longest window holding at most `k` zeros. Extend the window one bit at a time, and whenever it holds `k + 1` zeros, advance the start past the oldest zero in it. Both ends only ever move forward, so the scan is O(n), where extending a run from every start is O(n²).",
  python: {
    fn: "longest_ones",
    signature: "def longest_ones(bits: list[int], k: int) -> int",
    starter: `def longest_ones(bits: list[int], k: int) -> int:
    # Find the longest window holding at most k zeros.
    return 0
`,
    solution: `def longest_ones(bits: list[int], k: int) -> int:
    start = zeros = best = 0
    for end, bit in enumerate(bits):
        if bit == 0:
            zeros += 1
        while zeros > k:
            if bits[start] == 0:
                zeros -= 1
            start += 1
        best = max(best, end - start + 1)
    return best
`,
  },
  javascript: {
    fn: "longestOnes",
    signature: "function longestOnes(bits: number[], k: number): number",
    starter: `function longestOnes(bits, k) {
  // Find the longest window holding at most k zeros.
  return 0;
}
`,
    solution: `function longestOnes(bits, k) {
  let start = 0;
  let zeros = 0;
  let best = 0;
  bits.forEach((bit, end) => {
    if (bit === 0) zeros++;
    while (zeros > k) {
      if (bits[start++] === 0) zeros--;
    }
    best = Math.max(best, end - start + 1);
  });
  return best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two flips",
      args: [[1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0], 2],
      expected: 6,
      example: "Flip the last two zeros and positions 5 to 10 are all ones.",
    },
    {
      id: "example2",
      name: "One flip, two choices",
      args: [[1, 0, 1, 1, 0, 1], 1],
      expected: 4,
      example: "Flipping either zero gives a run of four.",
    },
    {
      id: "no-flips",
      name: "No flips allowed",
      description: "The answer is the longest run already there.",
      args: [[1, 1, 0, 1, 1, 1], 0],
      expected: 3,
    },
    {
      id: "spare-budget",
      name: "More flips than zeros",
      description: "The run cannot be longer than the list.",
      args: [[0, 0, 1], 5],
      expected: 3,
    },
    { id: "all-zeros", name: "Nothing but zeros", args: [[0, 0, 0, 0], 2], expected: 2 },
    { id: "empty", name: "An empty list", args: [[], 1], expected: 0 },
    {
      id: "large",
      name: "Two hundred thousand bits",
      description:
        "Up to 10,000 flips make runs a hundred thousand long; extending one from every start is billions of steps.",
      pyArgs: `[0 if i % 10 == 0 else 1 for i in range(200000)], 10000`,
      jsArgs: `Array.from({ length: 200000 }, (_, i) => (i % 10 === 0 ? 0 : 1)), 10000`,
      expected: 100009,
    },
  ],
});

// ─── Sort Three Colors ───────────────────────────────────────────────

const SORT_THREE_COLORS = dualChallenge({
  slug: "sort-three-colors",
  title: "Sort Three Colors",
  difficulty: "Intermediate",
  topic: "Three-way partitioning",
  description: "Sort a list of 0s, 1s and 2s in place, in a single pass.",
  prompt: [
    "Each value in `colors` is `0`, `1` or `2`, standing for red, white and blue. Sort the list in place, so that all the 0s come first, then the 1s, then the 2s, and return that same list.",
    "Do it in one pass with constant extra space: no library sort, and no counting the values first and writing them back afterwards. Swapping each value toward the end where it belongs is enough, as long as you keep track of which parts of the list are already settled.",
  ],
  params: ["colors"],
  constraints: [
    "`0 ≤ len(colors) ≤ 2 × 10⁵`",
    "Every value is `0`, `1` or `2`",
    "Sort `colors` itself, then return it",
  ],
  solutionNote:
    "This is Dijkstra's Dutch national flag pass. Keep three regions: everything before `low` is 0, everything after `high` is 2, and `mid` scans the unknown stretch between them. A 0 is swapped down to `low` and both advance, a 1 just advances `mid`, and a 2 is swapped up to `high` with only `high` moving, because the value swapped in from the end has not been looked at yet; advancing `mid` past it is the classic bug.",
  python: {
    fn: "sort_colors",
    signature: "def sort_colors(colors: list[int]) -> list[int]",
    starter: `def sort_colors(colors: list[int]) -> list[int]:
    # Keep a boundary for the 0s, one for the 2s, and scan between them.
    return colors
`,
    solution: `def sort_colors(colors: list[int]) -> list[int]:
    low, mid, high = 0, 0, len(colors) - 1
    while mid <= high:
        if colors[mid] == 0:
            colors[low], colors[mid] = colors[mid], colors[low]
            low += 1
            mid += 1
        elif colors[mid] == 1:
            mid += 1
        else:
            colors[mid], colors[high] = colors[high], colors[mid]
            high -= 1
    return colors
`,
    extra: [
      {
        id: "in-place",
        name: "Sorts the list it is given",
        description: "The caller's list is sorted afterwards, not only the returned one.",
        code: `colors = [2, 0, 2, 1, 1, 0]
sort_colors(colors)
assert colors == [0, 0, 1, 1, 2, 2], f"the list passed in is now {colors!r}"`,
      },
    ],
  },
  javascript: {
    fn: "sortColors",
    signature: "function sortColors(colors: number[]): number[]",
    starter: `function sortColors(colors) {
  // Keep a boundary for the 0s, one for the 2s, and scan between them.
  return colors;
}
`,
    solution: `function sortColors(colors) {
  let low = 0;
  let mid = 0;
  let high = colors.length - 1;
  while (mid <= high) {
    if (colors[mid] === 0) {
      [colors[low], colors[mid]] = [colors[mid], colors[low]];
      low++;
      mid++;
    } else if (colors[mid] === 1) {
      mid++;
    } else {
      [colors[mid], colors[high]] = [colors[high], colors[mid]];
      high--;
    }
  }
  return colors;
}
`,
    extra: [
      {
        id: "in-place",
        name: "Sorts the list it is given",
        description: "The caller's list is sorted afterwards, not only the returned one.",
        code: `const colors = [2, 0, 2, 1, 1, 0];
sortColors(colors);
if (JSON.stringify(colors) !== "[0,0,1,1,2,2]") {
  throw new Error("the array passed in is now " + JSON.stringify(colors));
}`,
      },
    ],
  },
  cases: [
    {
      id: "example1",
      name: "Two of each",
      args: [[2, 0, 2, 1, 1, 0]],
      expected: [0, 0, 1, 1, 2, 2],
      example: "Reds, then whites, then blues.",
    },
    {
      id: "example2",
      name: "One of each",
      args: [[2, 0, 1]],
      expected: [0, 1, 2],
    },
    {
      id: "swapped-in",
      name: "A 0 swapped in from the end",
      description: "The value that arrives from the right has not been looked at yet.",
      args: [[1, 2, 0]],
      expected: [0, 1, 2],
    },
    { id: "no-ones", name: "No 1s at all", args: [[2, 2, 0, 0]], expected: [0, 0, 2, 2] },
    { id: "single", name: "A single value", args: [[1]], expected: [1] },
    { id: "empty", name: "An empty list", args: [[]], expected: [] },
    {
      id: "large",
      name: "Two hundred thousand values",
      description: "Swapping neighbors into place one step at a time is far too slow here.",
      pyArgs: `[2 - i % 3 for i in range(200000)]`,
      pyExpected: `[0] * 66666 + [1] * 66667 + [2] * 66667`,
      jsArgs: `Array.from({ length: 200000 }, (_, i) => 2 - (i % 3))`,
      jsExpected: `[...Array(66666).fill(0), ...Array(66667).fill(1), ...Array(66667).fill(2)]`,
    },
  ],
});

// ─── Majority Element ────────────────────────────────────────────────

const MAJORITY_ELEMENT = dualChallenge({
  slug: "majority-element",
  title: "Majority Element",
  difficulty: "Intermediate",
  topic: "Boyer-Moore voting",
  description: "Find the value that makes up more than half of a list, if there is one.",
  prompt: [
    "Return the value that appears more than `len(nums) / 2` times in `nums`. If no value does, return `None` in Python or `null` in JavaScript. Exactly half is not a majority.",
    "A dictionary of counts does this in O(n) time and O(n) space. Aim for O(n) time and constant extra space: a single voting pass can find the only possible candidate, but it cannot tell you on its own whether that candidate really is a majority.",
  ],
  params: ["nums"],
  constraints: [
    "`0 ≤ len(nums) ≤ 2 × 10⁵`",
    "Values may be negative",
    "A majority needs strictly more than half",
  ],
  solutionNote:
    "Boyer-Moore voting cancels each occurrence of the current candidate against a different value; a true majority outnumbers everything else combined, so it is the one left standing. The pass always leaves some candidate, though, even when there is no majority (`[1, 1, 2, 2, 3]` ends on 3), so a second pass that counts it is what makes the `None` answer right.",
  python: {
    fn: "majority_element",
    signature: "def majority_element(nums: list[int]) -> int | None",
    starter: `def majority_element(nums: list[int]) -> int | None:
    # Find a candidate, then check it really is a majority.
    return None
`,
    solution: `def majority_element(nums: list[int]) -> int | None:
    candidate, votes = None, 0
    for x in nums:
        if votes == 0:
            candidate = x
        votes += 1 if x == candidate else -1
    if nums.count(candidate) * 2 > len(nums):
        return candidate
    return None
`,
  },
  javascript: {
    fn: "majorityElement",
    signature: "function majorityElement(nums: number[]): number | null",
    starter: `function majorityElement(nums) {
  // Find a candidate, then check it really is a majority.
  return null;
}
`,
    solution: `function majorityElement(nums) {
  let candidate = null;
  let votes = 0;
  for (const x of nums) {
    if (votes === 0) candidate = x;
    votes += x === candidate ? 1 : -1;
  }
  const count = nums.filter((x) => x === candidate).length;
  return count * 2 > nums.length ? candidate : null;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A clear majority",
      args: [[3, 1, 3, 3, 2]],
      expected: 3,
      example: "3 fills three of the five places.",
    },
    {
      id: "example2",
      name: "No majority",
      args: [[1, 1, 2, 2, 3]],
      expected: null,
      example: "1 and 2 appear twice each; a majority of five needs three.",
    },
    {
      id: "half",
      name: "Exactly half is not enough",
      args: [[4, 4, 5, 5]],
      expected: null,
    },
    {
      id: "late",
      name: "The majority arrives late",
      args: [[1, 2, 3, 7, 7, 7, 7]],
      expected: 7,
    },
    { id: "negative", name: "A negative majority", args: [[-2, 7, -2]], expected: -2 },
    { id: "single", name: "A single value", args: [[9]], expected: 9 },
    { id: "empty", name: "An empty list", args: [[]], expected: null },
    {
      id: "large",
      name: "Two hundred thousand values",
      description:
        "A hundred thousand different values come first; counting each of them separately is too slow.",
      pyArgs: `list(range(100000)) + [-1] * 100001`,
      jsArgs: `[...Array.from({ length: 100000 }, (_, i) => i), ...Array(100001).fill(-1)]`,
      expected: -1,
    },
  ],
});

// ─── Three Sum ───────────────────────────────────────────────────────

const THREE_SUM = dualChallenge({
  slug: "three-sum",
  title: "Three Sum",
  difficulty: "Advanced",
  topic: "Sorting plus two pointers",
  description: "List every distinct triplet of values that adds up to zero.",
  prompt: [
    "Return every distinct triplet of values from `nums` that sums to zero. A triplet takes three different positions, but triplets made of the same three values count once, whichever positions they came from.",
    "Write each triplet in ascending order, and sort the list of triplets by first value, then second, then third. Checking every combination of three is O(n³), which the three-thousand-value check will not wait for; once the list is sorted, the other two values of a triplet can be found in a single sweep.",
  ],
  params: ["nums"],
  constraints: [
    "`0 ≤ len(nums) ≤ 3500`",
    "`-10⁵ ≤ nums[i] ≤ 10⁵`",
    "Each triplet ascending, and the triplets in ascending order",
  ],
  solutionNote:
    "Sort once, then fix each value in turn as the smallest of the triplet and close two pointers in from the ends of the rest: a sum that is too small moves the left pointer up, one that is too large moves the right pointer down. Skipping a value equal to the one just used, for the fixed value and after each match, keeps duplicates out without a set and yields the triplets already in order, for O(n²) in all. In JavaScript, sort with a numeric comparator: the default sort compares numbers as strings.",
  python: {
    fn: "three_sum",
    signature: "def three_sum(nums: list[int]) -> list[list[int]]",
    starter: `def three_sum(nums: list[int]) -> list[list[int]]:
    # Sort first; then the other two values can be found from both ends.
    return []
`,
    solution: `def three_sum(nums: list[int]) -> list[list[int]]:
    nums = sorted(nums)
    found = []
    for i, first in enumerate(nums):
        if first > 0:
            break
        if i > 0 and first == nums[i - 1]:
            continue
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            total = first + nums[lo] + nums[hi]
            if total < 0:
                lo += 1
            elif total > 0:
                hi -= 1
            else:
                found.append([first, nums[lo], nums[hi]])
                lo += 1
                hi -= 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
    return found
`,
  },
  javascript: {
    fn: "threeSum",
    signature: "function threeSum(nums: number[]): number[][]",
    starter: `function threeSum(nums) {
  // Sort first; then the other two values can be found from both ends.
  return [];
}
`,
    solution: `function threeSum(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const found = [];
  for (let i = 0; i < sorted.length - 2 && sorted[i] <= 0; i++) {
    if (i > 0 && sorted[i] === sorted[i - 1]) continue;
    let lo = i + 1;
    let hi = sorted.length - 1;
    while (lo < hi) {
      const total = sorted[i] + sorted[lo] + sorted[hi];
      if (total < 0) {
        lo++;
      } else if (total > 0) {
        hi--;
      } else {
        found.push([sorted[i], sorted[lo], sorted[hi]]);
        lo++;
        hi--;
        while (lo < hi && sorted[lo] === sorted[lo - 1]) lo++;
      }
    }
  }
  return found;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two triplets",
      args: [[-1, 0, 1, 2, -1, -4]],
      expected: [
        [-1, -1, 2],
        [-1, 0, 1],
      ],
      example: "The two -1s sit at different positions, so -1, -1, 2 counts.",
    },
    {
      id: "example2",
      name: "One triplet, many ways to pick it",
      args: [[0, 0, 0, 0]],
      expected: [[0, 0, 0]],
      example: "Four zeros give several choices of positions but one triplet of values.",
    },
    {
      id: "none",
      name: "No triplet sums to zero",
      args: [[1, 2, -2, -1]],
      expected: [],
    },
    { id: "short", name: "Fewer than three values", args: [[0, 1]], expected: [] },
    {
      id: "duplicates",
      name: "Duplicates collapse",
      description: "Several choices of positions give -2, 0, 2; it is listed once.",
      args: [[-2, 0, 0, 2, 2, -2, 0]],
      expected: [
        [-2, 0, 2],
        [0, 0, 0],
      ],
    },
    {
      id: "ordering",
      name: "Five triplets, in order",
      args: [[3, -2, 1, 0, -1, -3, 2]],
      expected: [
        [-3, 0, 3],
        [-3, 1, 2],
        [-2, -1, 3],
        [-2, 0, 2],
        [-1, 0, 1],
      ],
    },
    {
      id: "large",
      name: "Three thousand values",
      description: "Every combination of three is four and a half billion sums.",
      pyArgs: `[4 * ((i * 7919) % 3000) - 1199 for i in range(3000)] + [0, 4, -8, 0, 8, 4, -12, 0]`,
      jsArgs: `[...Array.from({ length: 3000 }, (_, i) => 4 * ((i * 7919) % 3000) - 1199), 0, 4, -8, 0, 8, 4, -12, 0]`,
      expected: [
        [-12, 4, 8],
        [-8, 0, 8],
        [-8, 4, 4],
        [0, 0, 0],
      ],
    },
  ],
});

// ─── Trapping Rain Water ─────────────────────────────────────────────

const TRAPPING_RAIN_WATER = dualChallenge({
  slug: "trapping-rain-water",
  title: "Trapping Rain Water",
  difficulty: "Advanced",
  topic: "Two pointers",
  description: "Work out how much rain collects between the bars of an elevation map.",
  prompt: [
    "`heights` is an elevation map: bar `i` is `heights[i]` units tall and one unit wide. After it rains, water settles wherever it is walled in on both sides, and spills off either end of the map. Return the total units of water trapped.",
    "The water above a bar rises to the lower of the tallest bar on its left and the tallest bar on its right. Scanning both ways from every bar is O(n²); the large check needs one pass that knows, at each step, which side's maximum is the one that limits the level.",
  ],
  params: ["heights"],
  constraints: ["`0 ≤ len(heights) ≤ 3 × 10⁵`", "`0 ≤ heights[i] ≤ 10⁵`"],
  solutionNote:
    "Walk two pointers in from the ends, carrying the tallest bar seen from each side, and always advance the side whose current bar is lower. The other side is then known to hold a bar at least that tall, so the lower side's level is settled by its own running maximum alone; each bar is visited once and the full prefix and suffix maxima never need storing.",
  python: {
    fn: "trapped_water",
    signature: "def trapped_water(heights: list[int]) -> int",
    starter: `def trapped_water(heights: list[int]) -> int:
    # Work in from both ends, carrying the tallest bar seen on each side.
    return 0
`,
    solution: `def trapped_water(heights: list[int]) -> int:
    lo, hi = 0, len(heights) - 1
    left_max = right_max = water = 0
    while lo < hi:
        if heights[lo] < heights[hi]:
            left_max = max(left_max, heights[lo])
            water += left_max - heights[lo]
            lo += 1
        else:
            right_max = max(right_max, heights[hi])
            water += right_max - heights[hi]
            hi -= 1
    return water
`,
  },
  javascript: {
    fn: "trappedWater",
    signature: "function trappedWater(heights: number[]): number",
    starter: `function trappedWater(heights) {
  // Work in from both ends, carrying the tallest bar seen on each side.
  return 0;
}
`,
    solution: `function trappedWater(heights) {
  let lo = 0;
  let hi = heights.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (lo < hi) {
    if (heights[lo] < heights[hi]) {
      leftMax = Math.max(leftMax, heights[lo]);
      water += leftMax - heights[lo++];
    } else {
      rightMax = Math.max(rightMax, heights[hi]);
      water += rightMax - heights[hi--];
    }
  }
  return water;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Three pools",
      args: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
      expected: 6,
      example: "Pools of 1, 4 and 1 units.",
    },
    {
      id: "example2",
      name: "One deep pool",
      args: [[4, 2, 0, 3, 2, 5]],
      expected: 9,
      example: "Walled by the 4 and the 5, the pool fills to height 4.",
    },
    {
      id: "slope",
      name: "A slope holds nothing",
      description: "Water runs off the low end.",
      args: [[1, 2, 3, 4]],
      expected: 0,
    },
    {
      id: "shorter-wall",
      name: "The shorter wall sets the level",
      description: "The pool fills to 2, not to 5.",
      args: [[5, 0, 0, 2]],
      expected: 4,
    },
    { id: "two-pools", name: "Two pools side by side", args: [[3, 0, 3, 0, 3]], expected: 6 },
    { id: "empty", name: "An empty map", args: [[]], expected: 0 },
    {
      id: "large",
      name: "A valley two hundred thousand bars wide",
      description: "Scanning left and right from every bar is forty billion steps.",
      pyArgs: `[abs(i - 100000) for i in range(200001)]`,
      jsArgs: `Array.from({ length: 200001 }, (_, i) => Math.abs(i - 100000))`,
      expected: 10000000000,
    },
  ],
});

// ─── Minimum Window Substring ────────────────────────────────────────

const MINIMUM_WINDOW_SUBSTRING = dualChallenge({
  slug: "minimum-window-substring",
  title: "Minimum Window Substring",
  difficulty: "Advanced",
  topic: "Covering window",
  description:
    "Find the shortest stretch of a string that contains every character of another, repeats included.",
  prompt: [
    "Return the shortest substring of `s` that contains every character of `t`, repeats included: if `t` has two `a`s, the window needs two `a`s. Characters are case-sensitive. When several windows share the shortest length, return the one that starts earliest; when there is none, return an empty string.",
    "There are O(n²) substrings to check before any counting. Expand a window on the right until it covers `t`, then shrink it from the left while it still does, keeping a running tally of how many required characters are missing so that each step is constant work.",
  ],
  params: ["s", "t"],
  constraints: [
    "`0 ≤ len(s) ≤ 3 × 10⁵` and `1 ≤ len(t) ≤ 10⁴`",
    "ASCII letters only; `\"A\"` and `\"a\"` are different",
  ],
  solutionNote:
    "Count what `t` needs and keep one number for how many of those characters the window still lacks: taking in a needed character lowers it and dropping one raises it, so knowing whether the window covers `t` never needs a scan. Each time it reaches zero, drop characters from the left until the window stops covering, recording the length just before it does. Replacing the best only on a strictly shorter window is what keeps the earliest one on ties.",
  python: {
    fn: "min_window",
    signature: "def min_window(s: str, t: str) -> str",
    starter: `def min_window(s: str, t: str) -> str:
    # Track how many characters of t the window is still missing.
    return ""
`,
    solution: `from collections import Counter


def min_window(s: str, t: str) -> str:
    need = Counter(t)
    missing = len(t)
    best_start, best_len = 0, len(s) + 1
    start = 0
    for end, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1
        if missing == 0:
            # Drop surplus characters from the left; the window stays covering.
            while need[s[start]] < 0:
                need[s[start]] += 1
                start += 1
            if end - start + 1 < best_len:
                best_start, best_len = start, end - start + 1
            # Give up the first needed character and look for the next window.
            need[s[start]] += 1
            missing += 1
            start += 1
    return s[best_start:best_start + best_len] if best_len <= len(s) else ""
`,
  },
  javascript: {
    fn: "minWindow",
    signature: "function minWindow(s: string, t: string): string",
    starter: `function minWindow(s, t) {
  // Track how many characters of t the window is still missing.
  return "";
}
`,
    solution: `function minWindow(s, t) {
  const need = new Map();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);
  let missing = t.length;
  let bestStart = 0;
  let bestLength = Infinity;
  let start = 0;
  for (let end = 0; end < s.length; end++) {
    const count = need.get(s[end]) ?? 0;
    if (count > 0) missing--;
    need.set(s[end], count - 1);
    while (missing === 0) {
      if (end - start + 1 < bestLength) {
        bestStart = start;
        bestLength = end - start + 1;
      }
      const dropped = s[start++];
      need.set(dropped, need.get(dropped) + 1);
      if (need.get(dropped) > 0) missing++;
    }
  }
  return bestLength === Infinity ? "" : s.slice(bestStart, bestStart + bestLength);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "The classic",
      args: ["ADOBECODEBANC", "ABC"],
      expected: "BANC",
      example: "BANC is the shortest stretch holding an A, a B and a C.",
    },
    {
      id: "example2",
      name: "Not enough of a letter",
      args: ["a", "aa"],
      expected: "",
      example: "t needs two a's and s has only one.",
    },
    {
      id: "repeats",
      name: "Repeats in t must be matched",
      description: "\"an\" holds an n and an a, but t asks for two n's.",
      args: ["banana", "nna"],
      expected: "nan",
    },
    {
      id: "tie",
      name: "A tie goes to the earlier window",
      description: "\"ab\" and \"ba\" are both two characters long.",
      args: ["abxba", "ab"],
      expected: "ab",
    },
    {
      id: "case",
      name: "Case matters",
      description: "The capital A does not count as an a.",
      args: ["AbCa", "a"],
      expected: "a",
    },
    { id: "whole", name: "The whole string", args: ["cab", "abc"], expected: "cab" },
    {
      id: "large",
      name: "Two hundred thousand characters",
      description:
        "Two windows tie at 100,003 characters and the earlier one wins; extending from every start is billions of steps.",
      pyArgs: `"ab" + "x" * 100000 + "c" + "x" * 100000 + "ba", "abc"`,
      pyExpected: `"ab" + "x" * 100000 + "c"`,
      jsArgs: `"ab" + "x".repeat(100000) + "c" + "x".repeat(100000) + "ba", "abc"`,
      jsExpected: `"ab" + "x".repeat(100000) + "c"`,
    },
  ],
});

export const CODE_ARRAYS: Challenge[] = [
  UNIQUE_IN_ORDER,
  MOVE_ZEROS,
  SORTED_SQUARES,
  BEST_TIME_TO_TRADE,
  MAX_WINDOW_SUM,
  CONTAINER_MOST_WATER,
  LONGEST_UNIQUE_SUBSTRING,
  SHORTEST_SUBARRAY_AT_LEAST,
  ANAGRAM_POSITIONS,
  LONGEST_ONES_WITH_FLIPS,
  SORT_THREE_COLORS,
  MAJORITY_ELEMENT,
  THREE_SUM,
  TRAPPING_RAIN_WATER,
  MINIMUM_WINDOW_SUBSTRING,
];
