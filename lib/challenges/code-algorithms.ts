/**
 * Single-step code challenges: the algorithms tier.
 *
 * Each of these has a naive answer that is correct but quadratic, and a linear
 * or log-linear one that is the actual lesson — grouping by a canonical key,
 * sorting before a single sweep, carrying a running best, probing a sorted
 * array by halves. The checks include a deliberately large input so the naive
 * version times out rather than quietly passing.
 *
 * Like the fundamentals tier these ship in Python and JavaScript, and
 * `__tests__/challengeSolutions` runs both reference solutions for real.
 */

import { codeChallenge } from "./authoring";
import type { Challenge } from "./types";

// ─── Group Anagrams ──────────────────────────────────────────────────

const GROUP_ANAGRAMS = codeChallenge(
  {
    slug: "group-anagrams",
    title: "Group Anagrams",
    difficulty: "Intermediate",
    topic: "Hash maps",
    description:
      "Collect words that are rearrangements of each other, using a canonical key.",
    prompt: [
      "Group the words that are anagrams of one another: same letters, any order.",
      "Sort the words inside each group alphabetically, and sort the groups by their first word. Comparing every word against every other is O(n²); find a key that equal-letter words share instead.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          {
            name: "words",
            value: '["eat", "tea", "tan", "ate", "nat", "bat"]',
          },
          {
            name: "output",
            value: '[["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]',
            emphasis: true,
          },
        ],
        note: "Three groups, each sorted, ordered by their first word.",
      },
      {
        label: "No anagrams",
        fields: [
          { name: "words", value: '["cat", "dog"]' },
          { name: "output", value: '[["cat"], ["dog"]]', emphasis: true },
        ],
        note: "A word with no partner is still a group.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(words) ≤ 10⁴" }],
      ["Lowercase letters only"],
      ["Duplicate words stay in their group, twice"],
    ],
    solutionNote: [
      "The key is the word with its letters sorted: every anagram of a word produces the same key, so one pass fills a dictionary from each key to its words. Sorting the letters of each word costs O(k log k) on word length, which is nothing next to the O(n²) pairwise comparison it replaces.",
    ],
  },
  {
    python: {
      signature: "def group_anagrams(words: list[str]) -> list[list[str]]",
      starter: `def group_anagrams(words: list[str]) -> list[list[str]]:
    groups = {}
    for word in words:
        # What key do all the anagrams of this word share?
        pass
    return []
`,
      solution: `def group_anagrams(words: list[str]) -> list[list[str]]:
    groups = {}
    for word in words:
        key = "".join(sorted(word))
        groups.setdefault(key, []).append(word)
    return sorted((sorted(group) for group in groups.values()), key=lambda g: g[0])
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `got = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
assert got == [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]], f"got {got}"`,
        },
        {
          id: "no-anagrams",
          name: "Words with no partner",
          code: `assert group_anagrams(["cat", "dog"]) == [["cat"], ["dog"]], \\
    f"got {group_anagrams(['cat', 'dog'])}"`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `assert group_anagrams([]) == []`,
        },
        {
          id: "duplicates",
          name: "A repeated word appears twice",
          description: "Duplicates are anagrams of each other.",
          code: `assert group_anagrams(["ab", "ab"]) == [["ab", "ab"]], \\
    f"got {group_anagrams(['ab', 'ab'])}"`,
        },
        {
          id: "empty-word",
          name: "The empty word",
          code: `assert group_anagrams([""]) == [[""]], f"got {group_anagrams([''])}"`,
        },
        {
          id: "large",
          name: "Ten thousand words",
          description: "Pairwise comparison would be 100 million checks.",
          code: `words = ["abc", "cba", "bca"] * 3000 + ["zz"]
got = group_anagrams(words)
assert len(got) == 2, f"expected 2 groups, got {len(got)}"
assert len(got[0]) == 9000, f"expected 9000 anagrams, got {len(got[0])}"`,
        },
      ],
    },
    javascript: {
      signature: "function groupAnagrams(words: string[]): string[][]",
      starter: `function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    // What key do all the anagrams of this word share?
  }
  return [];
}
`,
      solution: `function groupAnagrams(words) {
  const groups = new Map();
  for (const word of words) {
    const key = [...word].sort().join("");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return [...groups.values()]
    .map((group) => group.sort())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = groupAnagrams(["eat", "tea", "tan", "ate", "nat", "bat"]);
const want = JSON.stringify([["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]);
if (JSON.stringify(got) !== want) throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "no-anagrams",
          name: "Words with no partner",
          code: `const got = groupAnagrams(["cat", "dog"]);
if (JSON.stringify(got) !== JSON.stringify([["cat"], ["dog"]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `if (JSON.stringify(groupAnagrams([])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "duplicates",
          name: "A repeated word appears twice",
          description: "Duplicates are anagrams of each other.",
          code: `const got = groupAnagrams(["ab", "ab"]);
if (JSON.stringify(got) !== JSON.stringify([["ab", "ab"]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "empty-word",
          name: "The empty word",
          code: `const got = groupAnagrams([""]);
if (JSON.stringify(got) !== JSON.stringify([[""]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "large",
          name: "Ten thousand words",
          description: "Pairwise comparison would be 100 million checks.",
          code: `const words = [];
for (let i = 0; i < 3000; i++) words.push("abc", "cba", "bca");
words.push("zz");
const got = groupAnagrams(words);
if (got.length !== 2) throw new Error("expected 2 groups, got " + got.length);
if (got[0].length !== 9000) throw new Error("expected 9000 anagrams, got " + got[0].length);`,
        },
      ],
    },
  },
);

// ─── Merge Intervals ─────────────────────────────────────────────────

const MERGE_INTERVALS = codeChallenge(
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Intermediate",
    topic: "Sorting",
    description:
      "Collapse a list of possibly overlapping ranges into the smallest set that covers the same span.",
    prompt: [
      [
        "Given a list of ",
        { code: "[start, end]" },
        " intervals, merge every pair that overlaps and return the result sorted by start.",
      ],
      "Intervals that merely touch (one ends where the next begins) count as overlapping. The input is not sorted.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "intervals", value: "[[1, 3], [2, 6], [8, 10], [15, 18]]" },
          { name: "output", value: "[[1, 6], [8, 10], [15, 18]]", emphasis: true },
        ],
        note: "[1,3] and [2,6] overlap, so they become [1,6].",
      },
      {
        label: "Touching",
        fields: [
          { name: "intervals", value: "[[1, 4], [4, 5]]" },
          { name: "output", value: "[[1, 5]]", emphasis: true },
        ],
        note: "Sharing an endpoint is enough to merge.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(intervals) ≤ 10⁴" }],
      [{ code: "start ≤ end" }, " for every interval"],
      ["An interval can be fully contained in another"],
    ],
    solutionNote: [
      "Sorting by start is what turns this into one sweep: once the list is ordered, an interval can only ever overlap the one currently being built, so a single comparison per interval is enough. Extend with ",
      { code: "max(end, current_end)" },
      " rather than the incoming end; otherwise a fully contained interval shrinks the range it sits inside.",
    ],
  },
  {
    python: {
      signature:
        "def merge_intervals(intervals: list[list[int]]) -> list[list[int]]",
      starter: `def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    merged = []
    for start, end in sorted(intervals):
        # Extend the interval being built, or start a new one.
        pass
    return merged
`,
      solution: `def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `got = merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]])
assert got == [[1, 6], [8, 10], [15, 18]], f"got {got}"`,
        },
        {
          id: "touching",
          name: "Touching intervals merge",
          code: `assert merge_intervals([[1, 4], [4, 5]]) == [[1, 5]], \\
    f"got {merge_intervals([[1, 4], [4, 5]])}"`,
        },
        {
          id: "unsorted",
          name: "The input is not sorted",
          code: `assert merge_intervals([[5, 6], [1, 2]]) == [[1, 2], [5, 6]], \\
    f"got {merge_intervals([[5, 6], [1, 2]])}"`,
        },
        {
          id: "contained",
          name: "A fully contained interval",
          description: "Merging must not shrink the outer range.",
          code: `assert merge_intervals([[1, 10], [2, 3]]) == [[1, 10]], \\
    f"got {merge_intervals([[1, 10], [2, 3]])}"`,
        },
        {
          id: "empty",
          name: "No intervals",
          code: `assert merge_intervals([]) == []`,
        },
        {
          id: "chain",
          name: "A chain that merges into one",
          code: `chain = [[i, i + 1] for i in range(0, 1000)]
assert merge_intervals(chain) == [[0, 1000]], f"got {merge_intervals(chain)}"`,
        },
      ],
    },
    javascript: {
      signature: "function mergeIntervals(intervals: number[][]): number[][]",
      starter: `function mergeIntervals(intervals) {
  const merged = [];
  const ordered = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [start, end] of ordered) {
    // Extend the interval being built, or start a new one.
  }
  return merged;
}
`,
      solution: `function mergeIntervals(intervals) {
  const merged = [];
  const ordered = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [start, end] of ordered) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = mergeIntervals([[1, 3], [2, 6], [8, 10], [15, 18]]);
const want = JSON.stringify([[1, 6], [8, 10], [15, 18]]);
if (JSON.stringify(got) !== want) throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "touching",
          name: "Touching intervals merge",
          code: `const got = mergeIntervals([[1, 4], [4, 5]]);
if (JSON.stringify(got) !== JSON.stringify([[1, 5]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "unsorted",
          name: "The input is not sorted",
          code: `const got = mergeIntervals([[5, 6], [1, 2]]);
if (JSON.stringify(got) !== JSON.stringify([[1, 2], [5, 6]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "contained",
          name: "A fully contained interval",
          description: "Merging must not shrink the outer range.",
          code: `const got = mergeIntervals([[1, 10], [2, 3]]);
if (JSON.stringify(got) !== JSON.stringify([[1, 10]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "empty",
          name: "No intervals",
          code: `if (JSON.stringify(mergeIntervals([])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "chain",
          name: "A chain that merges into one",
          code: `const chain = Array.from({ length: 1000 }, (_, i) => [i, i + 1]);
const got = mergeIntervals(chain);
if (JSON.stringify(got) !== JSON.stringify([[0, 1000]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
      ],
    },
  },
);

// ─── Maximum Subarray Sum ────────────────────────────────────────────

const MAX_SUBARRAY_SUM = codeChallenge(
  {
    slug: "max-subarray-sum",
    title: "Maximum Subarray Sum",
    difficulty: "Intermediate",
    topic: "Dynamic programming",
    description:
      "Find the largest total any contiguous run of values can reach, in a single pass.",
    prompt: [
      "Return the largest sum of any contiguous, non-empty run of values in the list.",
      "Checking every start and end is O(n²). One pass is enough: at each position you only need to know whether the run so far is worth keeping.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "nums", value: "[-2, 1, -3, 4, -1, 2, 1, -5, 4]" },
          { name: "output", value: "6", emphasis: true },
        ],
        note: "[4, -1, 2, 1] sums to 6.",
      },
      {
        label: "All negative",
        fields: [
          { name: "nums", value: "[-3, -1, -2]" },
          { name: "output", value: "-1", emphasis: true },
        ],
        note: "The run must be non-empty, so the answer is the least bad value.",
      },
    ],
    constraints: [
      [{ code: "1 ≤ len(nums) ≤ 10⁵" }],
      ["The run must contain at least one value"],
      ["Values may be negative"],
    ],
    solutionNote: [
      "This is Kadane's algorithm. The insight is that a running total which has gone negative is worse than starting over, so at each value you take the better of ",
      { code: "value" },
      " and ",
      { code: "running + value" },
      ". Seeding both the running and the best total with the first element, rather than 0, is what makes the all-negative case come out right.",
    ],
  },
  {
    python: {
      signature: "def max_subarray_sum(nums: list[int]) -> int",
      starter: `def max_subarray_sum(nums: list[int]) -> int:
    best = current = nums[0]
    for n in nums[1:]:
        # Extend the current run, or start again from here.
        pass
    return best
`,
      solution: `def max_subarray_sum(nums: list[int]) -> int:
    best = current = nums[0]
    for n in nums[1:]:
        current = max(n, current + n)
        best = max(best, current)
    return best
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `got = max_subarray_sum([-2, 1, -3, 4, -1, 2, 1, -5, 4])
assert got == 6, f"got {got}"`,
        },
        {
          id: "all-negative",
          name: "Every value is negative",
          description: "The answer is the largest single value, not 0.",
          code: `assert max_subarray_sum([-3, -1, -2]) == -1, \\
    f"got {max_subarray_sum([-3, -1, -2])}"`,
        },
        {
          id: "single",
          name: "A single value",
          code: `assert max_subarray_sum([7]) == 7
assert max_subarray_sum([-7]) == -7`,
        },
        {
          id: "all-positive",
          name: "Every value is positive",
          description: "The whole list is the best run.",
          code: `assert max_subarray_sum([1, 2, 3]) == 6, f"got {max_subarray_sum([1, 2, 3])}"`,
        },
        {
          id: "dip",
          name: "A dip worth crossing",
          description: "A small negative in the middle should not end the run.",
          code: `assert max_subarray_sum([5, -1, 5]) == 9, f"got {max_subarray_sum([5, -1, 5])}"`,
        },
        {
          id: "large",
          name: "Two thousand values",
          description: "Checking every start and end would be 4 million sums.",
          code: `nums = [1] * 1000 + [-1] * 1000
assert max_subarray_sum(nums) == 1000, f"got {max_subarray_sum(nums)}"`,
        },
      ],
    },
    javascript: {
      signature: "function maxSubarraySum(nums: number[]): number",
      starter: `function maxSubarraySum(nums) {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i++) {
    // Extend the current run, or start again from here.
  }
  return best;
}
`,
      solution: `function maxSubarraySum(nums) {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = maxSubarraySum([-2, 1, -3, 4, -1, 2, 1, -5, 4]);
if (got !== 6) throw new Error("got " + got);`,
        },
        {
          id: "all-negative",
          name: "Every value is negative",
          description: "The answer is the largest single value, not 0.",
          code: `const got = maxSubarraySum([-3, -1, -2]);
if (got !== -1) throw new Error("got " + got);`,
        },
        {
          id: "single",
          name: "A single value",
          code: `if (maxSubarraySum([7]) !== 7) throw new Error("got " + maxSubarraySum([7]));
if (maxSubarraySum([-7]) !== -7) throw new Error("got " + maxSubarraySum([-7]));`,
        },
        {
          id: "all-positive",
          name: "Every value is positive",
          description: "The whole list is the best run.",
          code: `const got = maxSubarraySum([1, 2, 3]);
if (got !== 6) throw new Error("got " + got);`,
        },
        {
          id: "dip",
          name: "A dip worth crossing",
          description: "A small negative in the middle should not end the run.",
          code: `const got = maxSubarraySum([5, -1, 5]);
if (got !== 9) throw new Error("got " + got);`,
        },
        {
          id: "large",
          name: "Two thousand values",
          description: "Checking every start and end would be 4 million sums.",
          code: `const nums = [].concat(Array(1000).fill(1), Array(1000).fill(-1));
const got = maxSubarraySum(nums);
if (got !== 1000) throw new Error("got " + got);`,
        },
      ],
    },
  },
);

// ─── Longest Consecutive Run ─────────────────────────────────────────

const LONGEST_CONSECUTIVE_RUN = codeChallenge(
  {
    slug: "longest-consecutive-run",
    title: "Longest Consecutive Run",
    difficulty: "Intermediate",
    topic: "Sets",
    description:
      "Find the longest stretch of consecutive integers hiding in an unordered list.",
    prompt: [
      "Return the length of the longest run of consecutive integers that appear anywhere in the list. Order does not matter, and duplicates count once.",
      "Sorting would make this easy and O(n log n). Do it in O(n) instead, with a set.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "nums", value: "[100, 4, 200, 1, 3, 2]" },
          { name: "output", value: "4", emphasis: true },
        ],
        note: "1, 2, 3, 4 are all present.",
      },
      {
        label: "No run",
        fields: [
          { name: "nums", value: "[10, 30, 50]" },
          { name: "output", value: "1", emphasis: true },
        ],
        note: "Nothing is adjacent, so the longest run is a single value.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(nums) ≤ 10⁵" }],
      ["Values may be negative and may repeat"],
      ["An empty list has a longest run of ", { code: "0" }],
    ],
    solutionNote: [
      "The trick that makes it linear is refusing to count a run from anywhere but its start: if ",
      { code: "n - 1" },
      " is in the set, some other iteration will walk through ",
      { code: "n" },
      " already. Every value is therefore visited at most twice overall, no matter how the runs are arranged.",
    ],
  },
  {
    python: {
      signature: "def longest_run(nums: list[int]) -> int",
      starter: `def longest_run(nums: list[int]) -> int:
    seen = set(nums)
    best = 0
    for n in seen:
        # Only walk forward from a value that starts a run.
        pass
    return best
`,
      solution: `def longest_run(nums: list[int]) -> int:
    seen = set(nums)
    best = 0
    for n in seen:
        if n - 1 in seen:
            continue
        length = 1
        while n + length in seen:
            length += 1
        best = max(best, length)
    return best
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `assert longest_run([100, 4, 200, 1, 3, 2]) == 4, \\
    f"got {longest_run([100, 4, 200, 1, 3, 2])}"`,
        },
        {
          id: "no-run",
          name: "Nothing is adjacent",
          code: `assert longest_run([10, 30, 50]) == 1, f"got {longest_run([10, 30, 50])}"`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `assert longest_run([]) == 0`,
        },
        {
          id: "duplicates",
          name: "Duplicates count once",
          code: `assert longest_run([1, 1, 2, 2, 3]) == 3, f"got {longest_run([1, 1, 2, 2, 3])}"`,
        },
        {
          id: "negatives",
          name: "A run crossing zero",
          code: `assert longest_run([-2, -1, 0, 1]) == 4, f"got {longest_run([-2, -1, 0, 1])}"`,
        },
        {
          id: "large",
          name: "Five thousand values",
          description: "Restarting the walk from every value would be quadratic.",
          code: `nums = list(range(5000))
assert longest_run(nums) == 5000, f"got {longest_run(nums)}"`,
        },
      ],
    },
    javascript: {
      signature: "function longestRun(nums: number[]): number",
      starter: `function longestRun(nums) {
  const seen = new Set(nums);
  let best = 0;
  for (const n of seen) {
    // Only walk forward from a value that starts a run.
  }
  return best;
}
`,
      solution: `function longestRun(nums) {
  const seen = new Set(nums);
  let best = 0;
  for (const n of seen) {
    if (seen.has(n - 1)) continue;
    let length = 1;
    while (seen.has(n + length)) length += 1;
    best = Math.max(best, length);
  }
  return best;
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = longestRun([100, 4, 200, 1, 3, 2]);
if (got !== 4) throw new Error("got " + got);`,
        },
        {
          id: "no-run",
          name: "Nothing is adjacent",
          code: `const got = longestRun([10, 30, 50]);
if (got !== 1) throw new Error("got " + got);`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `if (longestRun([]) !== 0) throw new Error("got " + longestRun([]));`,
        },
        {
          id: "duplicates",
          name: "Duplicates count once",
          code: `const got = longestRun([1, 1, 2, 2, 3]);
if (got !== 3) throw new Error("got " + got);`,
        },
        {
          id: "negatives",
          name: "A run crossing zero",
          code: `const got = longestRun([-2, -1, 0, 1]);
if (got !== 4) throw new Error("got " + got);`,
        },
        {
          id: "large",
          name: "Five thousand values",
          description: "Restarting the walk from every value would be quadratic.",
          code: `const nums = Array.from({ length: 5000 }, (_, i) => i);
const got = longestRun(nums);
if (got !== 5000) throw new Error("got " + got);`,
        },
      ],
    },
  },
);

// ─── Search Insert Position ──────────────────────────────────────────

const SEARCH_INSERT_POSITION = codeChallenge(
  {
    slug: "search-insert-position",
    title: "Search Insert Position",
    difficulty: "Intermediate",
    topic: "Binary search",
    description:
      "Locate a value in a sorted list, or the position it would take if it were inserted.",
    prompt: [
      "The list is sorted ascending and holds no duplicates. Return the index of the target, or (when it is not there) the index it would occupy if inserted.",
      "The answer is always a valid insertion point, including one past the end. Do it in O(log n).",
    ],
    examples: [
      {
        label: "Found",
        fields: [
          { name: "nums", value: "[1, 3, 5, 6]" },
          { name: "target", value: "5" },
          { name: "output", value: "2", emphasis: true },
        ],
      },
      {
        label: "Not found",
        fields: [
          { name: "nums", value: "[1, 3, 5, 6]" },
          { name: "target", value: "2" },
          { name: "output", value: "1", emphasis: true },
        ],
        note: "2 would sit between 1 and 3.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(nums) ≤ 10⁵" }],
      ["The list is sorted ascending with no duplicates"],
      ["A target past the end returns ", { code: "len(nums)" }],
    ],
    solutionNote: [
      "Searching on the half-open range ",
      { code: "[lo, hi)" },
      " with ",
      { code: "hi" },
      " starting at ",
      { code: "len(nums)" },
      " is what lets the same loop answer both questions: when the target is absent the range closes on the insertion point, and when it is present it closes on its index. Note the asymmetry: ",
      { code: "lo = mid + 1" },
      " but ",
      { code: "hi = mid" },
      ", which is what keeps the loop from spinning.",
    ],
  },
  {
    python: {
      signature: "def search_insert(nums: list[int], target: int) -> int",
      starter: `def search_insert(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        # Narrow the half-open range until it closes.
        pass
    return lo
`,
      solution: `def search_insert(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
`,
      tests: [
        {
          id: "found",
          name: "The target is present",
          code: `assert search_insert([1, 3, 5, 6], 5) == 2, f"got {search_insert([1, 3, 5, 6], 5)}"`,
        },
        {
          id: "between",
          name: "The target belongs in the middle",
          code: `assert search_insert([1, 3, 5, 6], 2) == 1, f"got {search_insert([1, 3, 5, 6], 2)}"`,
        },
        {
          id: "past-end",
          name: "The target is larger than everything",
          code: `assert search_insert([1, 3, 5, 6], 7) == 4, f"got {search_insert([1, 3, 5, 6], 7)}"`,
        },
        {
          id: "before-start",
          name: "The target is smaller than everything",
          code: `assert search_insert([1, 3, 5, 6], 0) == 0, f"got {search_insert([1, 3, 5, 6], 0)}"`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `assert search_insert([], 1) == 0`,
        },
        {
          id: "large",
          name: "A hundred thousand values",
          description: "A linear scan would touch every one of them.",
          code: `nums = list(range(0, 200000, 2))
assert search_insert(nums, 199998) == 99999, f"got {search_insert(nums, 199998)}"
assert search_insert(nums, 199999) == 100000, f"got {search_insert(nums, 199999)}"`,
        },
      ],
    },
    javascript: {
      signature: "function searchInsert(nums: number[], target: number): number",
      starter: `function searchInsert(nums, target) {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    // Narrow the half-open range until it closes.
  }
  return lo;
}
`,
      solution: `function searchInsert(nums, target) {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
`,
      tests: [
        {
          id: "found",
          name: "The target is present",
          code: `const got = searchInsert([1, 3, 5, 6], 5);
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "between",
          name: "The target belongs in the middle",
          code: `const got = searchInsert([1, 3, 5, 6], 2);
if (got !== 1) throw new Error("got " + got);`,
        },
        {
          id: "past-end",
          name: "The target is larger than everything",
          code: `const got = searchInsert([1, 3, 5, 6], 7);
if (got !== 4) throw new Error("got " + got);`,
        },
        {
          id: "before-start",
          name: "The target is smaller than everything",
          code: `const got = searchInsert([1, 3, 5, 6], 0);
if (got !== 0) throw new Error("got " + got);`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `if (searchInsert([], 1) !== 0) throw new Error("got " + searchInsert([], 1));`,
        },
        {
          id: "large",
          name: "A hundred thousand values",
          description: "A linear scan would touch every one of them.",
          code: `const nums = Array.from({ length: 100000 }, (_, i) => i * 2);
if (searchInsert(nums, 199998) !== 99999) {
  throw new Error("got " + searchInsert(nums, 199998));
}
if (searchInsert(nums, 199999) !== 100000) {
  throw new Error("got " + searchInsert(nums, 199999));
}`,
        },
      ],
    },
  },
);

// ─── Latest Record per Key ───────────────────────────────────────────

const LATEST_RECORD_PER_KEY = codeChallenge(
  {
    slug: "latest-record-per-key",
    title: "Latest Record per Key",
    difficulty: "Intermediate",
    topic: "Deduplication",
    description:
      "Collapse a change log down to the current state: one record per key, the most recent one.",
    prompt: [
      [
        "A change log arrives as ",
        { code: "[key, timestamp, value]" },
        " records, in no particular order. Return the current state: one record per key (the one with the highest timestamp) sorted by key.",
      ],
      "When two records for the same key share a timestamp, the one that appears later in the input wins.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          {
            name: "records",
            value: '[["a", 1, "new"], ["b", 2, "old"], ["a", 3, "done"]]',
          },
          {
            name: "output",
            value: '[["a", 3, "done"], ["b", 2, "old"]]',
            emphasis: true,
          },
        ],
        note: 'The earlier "a" record is superseded.',
      },
      {
        label: "Tie",
        fields: [
          {
            name: "records",
            value: '[["a", 1, "first"], ["a", 1, "second"]]',
          },
          { name: "output", value: '[["a", 1, "second"]]', emphasis: true },
        ],
        note: "Same timestamp, so the later record wins.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(records) ≤ 10⁵" }],
      ["Keys are strings; timestamps are integers"],
      ["Sort the result by key"],
    ],
    solutionNote: [
      "This is what a SQL ",
      { code: "ROW_NUMBER() ... QUALIFY rn = 1" },
      " does, written by hand. Keeping a dictionary from each key to its best record needs one pass and no sort of the records themselves; only the keys get sorted at the end. Comparing with ",
      { code: ">=" },
      " rather than ",
      { code: ">" },
      " is what makes the later of two tied records win.",
    ],
  },
  {
    python: {
      signature:
        "def latest_per_key(records: list[list]) -> list[list]",
      starter: `def latest_per_key(records: list[list]) -> list[list]:
    newest = {}
    for key, timestamp, value in records:
        # Keep this record only if nothing newer has been seen for the key.
        pass
    return [newest[key] for key in sorted(newest)]
`,
      solution: `def latest_per_key(records: list[list]) -> list[list]:
    newest = {}
    for key, timestamp, value in records:
        if key not in newest or timestamp >= newest[key][1]:
            newest[key] = [key, timestamp, value]
    return [newest[key] for key in sorted(newest)]
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `got = latest_per_key([["a", 1, "new"], ["b", 2, "old"], ["a", 3, "done"]])
assert got == [["a", 3, "done"], ["b", 2, "old"]], f"got {got}"`,
        },
        {
          id: "tie",
          name: "A tied timestamp keeps the later record",
          code: `got = latest_per_key([["a", 1, "first"], ["a", 1, "second"]])
assert got == [["a", 1, "second"]], f"got {got}"`,
        },
        {
          id: "out-of-order",
          name: "The newest record arrives first",
          description: "A later record must not overwrite a newer one.",
          code: `got = latest_per_key([["z", 5, "x"], ["z", 2, "y"]])
assert got == [["z", 5, "x"]], f"got {got}"`,
        },
        {
          id: "sorted",
          name: "The result is sorted by key",
          code: `got = latest_per_key([["b", 1, "x"], ["a", 1, "y"]])
assert got == [["a", 1, "y"], ["b", 1, "x"]], f"got {got}"`,
        },
        {
          id: "empty",
          name: "An empty log",
          code: `assert latest_per_key([]) == []`,
        },
        {
          id: "large",
          name: "A long log over few keys",
          code: `records = [["k" + str(i % 100), i, str(i)] for i in range(100000)]
got = latest_per_key(records)
assert len(got) == 100, f"expected 100 keys, got {len(got)}"
assert got[0] == ["k0", 99900, "99900"], f"got {got[0]}"`,
        },
      ],
    },
    javascript: {
      signature:
        "function latestPerKey(records: [string, number, string][]): [string, number, string][]",
      starter: `function latestPerKey(records) {
  const newest = new Map();
  for (const [key, timestamp, value] of records) {
    // Keep this record only if nothing newer has been seen for the key.
  }
  return [...newest.keys()].sort().map((key) => newest.get(key));
}
`,
      solution: `function latestPerKey(records) {
  const newest = new Map();
  for (const [key, timestamp, value] of records) {
    const current = newest.get(key);
    if (!current || timestamp >= current[1]) newest.set(key, [key, timestamp, value]);
  }
  return [...newest.keys()].sort().map((key) => newest.get(key));
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = latestPerKey([["a", 1, "new"], ["b", 2, "old"], ["a", 3, "done"]]);
const want = JSON.stringify([["a", 3, "done"], ["b", 2, "old"]]);
if (JSON.stringify(got) !== want) throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "tie",
          name: "A tied timestamp keeps the later record",
          code: `const got = latestPerKey([["a", 1, "first"], ["a", 1, "second"]]);
if (JSON.stringify(got) !== JSON.stringify([["a", 1, "second"]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "out-of-order",
          name: "The newest record arrives first",
          description: "A later record must not overwrite a newer one.",
          code: `const got = latestPerKey([["z", 5, "x"], ["z", 2, "y"]]);
if (JSON.stringify(got) !== JSON.stringify([["z", 5, "x"]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "sorted",
          name: "The result is sorted by key",
          code: `const got = latestPerKey([["b", 1, "x"], ["a", 1, "y"]]);
if (JSON.stringify(got) !== JSON.stringify([["a", 1, "y"], ["b", 1, "x"]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "empty",
          name: "An empty log",
          code: `if (JSON.stringify(latestPerKey([])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "large",
          name: "A long log over few keys",
          code: `const records = Array.from({ length: 100000 }, (_, i) => [
  "k" + (i % 100), i, String(i),
]);
const got = latestPerKey(records);
if (got.length !== 100) throw new Error("expected 100 keys, got " + got.length);
if (JSON.stringify(got[0]) !== JSON.stringify(["k0", 99900, "99900"])) {
  throw new Error("got " + JSON.stringify(got[0]));
}`,
        },
      ],
    },
  },
);

// ─── Sessionize Events ───────────────────────────────────────────────

const SESSIONIZE_EVENTS = codeChallenge(
  {
    slug: "sessionize-events",
    title: "Sessionize Events",
    difficulty: "Advanced",
    topic: "Gap-and-island",
    description:
      "Split a timeline of events into sessions whenever the silence between them runs too long.",
    prompt: [
      [
        "Given event timestamps in seconds, already sorted ascending, split them into sessions: a new session starts whenever the gap from the previous event is ",
        { code: "strictly greater" },
        " than ",
        { code: "gap" },
        " seconds.",
      ],
      "Return the number of events in each session, in order. An empty timeline has no sessions.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "timestamps", value: "[0, 10, 20, 2000, 2010]" },
          { name: "gap", value: "60" },
          { name: "output", value: "[3, 2]", emphasis: true },
        ],
        note: "The jump from 20 to 2000 is well past a minute, so a second session begins.",
      },
      {
        label: "Exactly at the boundary",
        fields: [
          { name: "timestamps", value: "[0, 60]" },
          { name: "gap", value: "60" },
          { name: "output", value: "[2]", emphasis: true },
        ],
        note: "A gap of exactly 60 is not greater than 60, so the session continues.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(timestamps) ≤ 10⁵" }],
      ["Timestamps are sorted ascending and may repeat"],
      ["The counts always add up to the number of events"],
    ],
    solutionNote: [
      'This is the "gap and island" pattern: walk the timeline once, and every time the gap exceeds the threshold, start a new island. The boundary is the part worth getting exactly right: ',
      { code: "strictly greater" },
      " means a gap equal to the threshold keeps the session alive, which is the convention most analytics tools use.",
    ],
  },
  {
    python: {
      signature: "def sessionize(timestamps: list[int], gap: int) -> list[int]",
      starter: `def sessionize(timestamps: list[int], gap: int) -> list[int]:
    if not timestamps:
        return []
    sizes = [1]
    for previous, current in zip(timestamps, timestamps[1:]):
        # Extend the open session, or start a new one.
        pass
    return sizes
`,
      solution: `def sessionize(timestamps: list[int], gap: int) -> list[int]:
    if not timestamps:
        return []
    sizes = [1]
    for previous, current in zip(timestamps, timestamps[1:]):
        if current - previous > gap:
            sizes.append(1)
        else:
            sizes[-1] += 1
    return sizes
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `got = sessionize([0, 10, 20, 2000, 2010], 60)
assert got == [3, 2], f"got {got}"`,
        },
        {
          id: "boundary",
          name: "A gap exactly at the threshold keeps the session",
          code: `assert sessionize([0, 60], 60) == [2], f"got {sessionize([0, 60], 60)}"`,
        },
        {
          id: "past-boundary",
          name: "One second past the threshold splits it",
          code: `assert sessionize([0, 61], 60) == [1, 1], f"got {sessionize([0, 61], 60)}"`,
        },
        {
          id: "single",
          name: "A single event",
          code: `assert sessionize([5], 60) == [1]`,
        },
        {
          id: "empty",
          name: "An empty timeline",
          code: `assert sessionize([], 60) == []`,
        },
        {
          id: "large",
          name: "A long timeline",
          description: "Every count must still add up to the number of events.",
          code: `stamps = [i * 30 for i in range(1000)] + [100000 + i * 30 for i in range(500)]
got = sessionize(stamps, 60)
assert got == [1000, 500], f"got {got}"
assert sum(got) == len(stamps)`,
        },
      ],
    },
    javascript: {
      signature: "function sessionize(timestamps: number[], gap: number): number[]",
      starter: `function sessionize(timestamps, gap) {
  if (timestamps.length === 0) return [];
  const sizes = [1];
  for (let i = 1; i < timestamps.length; i++) {
    // Extend the open session, or start a new one.
  }
  return sizes;
}
`,
      solution: `function sessionize(timestamps, gap) {
  if (timestamps.length === 0) return [];
  const sizes = [1];
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] - timestamps[i - 1] > gap) {
      sizes.push(1);
    } else {
      sizes[sizes.length - 1] += 1;
    }
  }
  return sizes;
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = sessionize([0, 10, 20, 2000, 2010], 60);
if (JSON.stringify(got) !== "[3,2]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "boundary",
          name: "A gap exactly at the threshold keeps the session",
          code: `const got = sessionize([0, 60], 60);
if (JSON.stringify(got) !== "[2]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "past-boundary",
          name: "One second past the threshold splits it",
          code: `const got = sessionize([0, 61], 60);
if (JSON.stringify(got) !== "[1,1]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "single",
          name: "A single event",
          code: `if (JSON.stringify(sessionize([5], 60)) !== "[1]") throw new Error("expected [1]");`,
        },
        {
          id: "empty",
          name: "An empty timeline",
          code: `if (JSON.stringify(sessionize([], 60)) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "large",
          name: "A long timeline",
          description: "Every count must still add up to the number of events.",
          code: `const stamps = [].concat(
  Array.from({ length: 1000 }, (_, i) => i * 30),
  Array.from({ length: 500 }, (_, i) => 100000 + i * 30),
);
const got = sessionize(stamps, 60);
if (JSON.stringify(got) !== "[1000,500]") throw new Error("got " + JSON.stringify(got));
const total = got.reduce((a, b) => a + b, 0);
if (total !== stamps.length) throw new Error("counts total " + total);`,
        },
      ],
    },
  },
);

export const CODE_ALGORITHMS: Challenge[] = [
  GROUP_ANAGRAMS,
  MERGE_INTERVALS,
  MAX_SUBARRAY_SUM,
  LONGEST_CONSECUTIVE_RUN,
  SEARCH_INSERT_POSITION,
  LATEST_RECORD_PER_KEY,
  SESSIONIZE_EVENTS,
];
