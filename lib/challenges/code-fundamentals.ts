/**
 * Single-step code challenges: the fundamentals tier.
 *
 * Every problem here is solvable with one pass over a collection and a
 * dictionary or a counter — no algorithm to recall, just the loop written
 * correctly. They are the challenges a learner meets first, so each one offers
 * both Python and JavaScript and the two are genuinely different solutions
 * rather than a transliteration: `Counter` and `"".join` on one side, `Map`
 * and `Array.prototype.sort` on the other.
 *
 * The checks run as real programs — `__tests__/challengeSolutions` executes
 * each reference solution under `python3` and `node` with the same harness the
 * browser builds — so a solution that does not pass its own checks fails CI.
 */

import { codeChallenge } from "./authoring";
import type { Challenge } from "./types";

// ─── Two Sum ─────────────────────────────────────────────────────────

const TWO_SUM = codeChallenge(
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Beginner",
    topic: "Hash maps",
    description:
      "Find the two positions in a list whose values add up to a target, in one pass.",
    prompt: [
      [
        "Given a list of integers and a target, return the ",
        { code: "[i, j]" },
        " positions of the two values that add up to the target, smaller index first.",
      ],
      "Exactly one pair works, and you may not use the same position twice. The obvious nested loop is O(n²); do it in one pass instead.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "nums", value: "[2, 7, 11, 15]" },
          { name: "target", value: "9" },
          { name: "output", value: "[0, 1]", emphasis: true },
        ],
        note: "2 + 7 = 9, at positions 0 and 1.",
      },
      {
        label: "Example 2",
        fields: [
          { name: "nums", value: "[3, 2, 4]" },
          { name: "target", value: "6" },
          { name: "output", value: "[1, 2]", emphasis: true },
        ],
        note: "The first 3 is not paired with itself.",
      },
    ],
    constraints: [
      [{ code: "2 ≤ len(nums) ≤ 10⁴" }],
      ["Values may be negative"],
      ["Exactly one valid pair exists"],
    ],
    solutionNote: [
      "Walk the list once, and before storing each value ask whether the number that would complete the pair has already been seen. The dictionary maps each value to its index, so the lookup is O(1) and the whole scan is O(n).",
    ],
  },
  {
    python: {
      signature: "def two_sum(nums: list[int], target: int) -> list[int]",
      starter: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, n in enumerate(nums):
        # Has the number that completes this pair already gone by?
        pass
    return []
`,
      solution: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `assert two_sum([2, 7, 11, 15], 9) == [0, 1], f"got {two_sum([2, 7, 11, 15], 9)}"`,
        },
        {
          id: "example2",
          name: "Example 2",
          description: "The pair is not at the front of the list.",
          code: `assert two_sum([3, 2, 4], 6) == [1, 2], f"got {two_sum([3, 2, 4], 6)}"`,
        },
        {
          id: "repeated",
          name: "The same value twice",
          description: "Two equal numbers at different positions are a valid pair.",
          code: `assert two_sum([3, 3], 6) == [0, 1], f"got {two_sum([3, 3], 6)}"`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `assert two_sum([-1, -2, -3, -4], -6) == [1, 3], f"got {two_sum([-1, -2, -3, -4], -6)}"`,
        },
        {
          id: "large",
          name: "Ten thousand numbers",
          description: "A nested loop would be 100 million comparisons here.",
          code: `nums = list(range(1, 10001))
assert two_sum(nums, 19999) == [9998, 9999]`,
        },
      ],
    },
    javascript: {
      signature: "function twoSum(nums: number[], target: number): number[]",
      starter: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    // Has the number that completes this pair already gone by?
  }
  return [];
}
`,
      solution: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = twoSum([2, 7, 11, 15], 9);
if (JSON.stringify(got) !== "[0,1]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "example2",
          name: "Example 2",
          description: "The pair is not at the front of the list.",
          code: `const got = twoSum([3, 2, 4], 6);
if (JSON.stringify(got) !== "[1,2]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "repeated",
          name: "The same value twice",
          description: "Two equal numbers at different positions are a valid pair.",
          code: `const got = twoSum([3, 3], 6);
if (JSON.stringify(got) !== "[0,1]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `const got = twoSum([-1, -2, -3, -4], -6);
if (JSON.stringify(got) !== "[1,3]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "large",
          name: "Ten thousand numbers",
          description: "A nested loop would be 100 million comparisons here.",
          code: `const nums = Array.from({ length: 10000 }, (_, i) => i + 1);
const got = twoSum(nums, 19999);
if (JSON.stringify(got) !== "[9998,9999]") throw new Error("got " + JSON.stringify(got));`,
        },
      ],
    },
  },
);

// ─── Balanced Brackets ───────────────────────────────────────────────

const BALANCED_BRACKETS = codeChallenge(
  {
    slug: "balanced-brackets",
    title: "Balanced Brackets",
    difficulty: "Beginner",
    topic: "Stacks",
    description:
      "Decide whether a string of brackets opens and closes in the right order.",
    prompt: [
      [
        "Given a string containing only ",
        { code: "()" },
        ", ",
        { code: "[]" },
        " and ",
        { code: "{}" },
        ", return whether every bracket closes in the right order.",
      ],
      "A closing bracket must match the most recently opened one that is still open, and nothing may be left open at the end.",
    ],
    examples: [
      {
        label: "Balanced",
        fields: [
          { name: "s", value: '"{[]}"' },
          { name: "output", value: "True", emphasis: true },
        ],
        note: "The square brackets close before the braces they sit inside.",
      },
      {
        label: "Not balanced",
        fields: [
          { name: "s", value: '"([)]"' },
          { name: "output", value: "False", emphasis: true },
        ],
        note: "The round bracket closes while the square one is still open.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(s) ≤ 10⁴" }],
      ["The string contains bracket characters only"],
      ["An empty string is balanced"],
    ],
    solutionNote: [
      "Push every opening bracket and pop on every closing one: if the popped bracket is not the matching partner, the string is broken. The stack is empty at the end exactly when everything that opened also closed.",
    ],
  },
  {
    python: {
      signature: "def is_balanced(s: str) -> bool",
      starter: `def is_balanced(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        # Push openers; on a closer, check what comes off the stack.
        pass
    return True
`,
      solution: `def is_balanced(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack
`,
      tests: [
        {
          id: "simple",
          name: "Three pairs in a row",
          code: `assert is_balanced("()[]{}") is True`,
        },
        {
          id: "nested",
          name: "Properly nested",
          code: `assert is_balanced("{[]}") is True`,
        },
        {
          id: "interleaved",
          name: "Interleaved brackets are not balanced",
          description: "Closing out of order must be rejected.",
          code: `assert is_balanced("([)]") is False`,
        },
        {
          id: "unclosed",
          name: "Something left open",
          code: `assert is_balanced("(") is False
assert is_balanced("([]") is False`,
        },
        {
          id: "empty",
          name: "The empty string is balanced",
          code: `assert is_balanced("") is True`,
        },
      ],
    },
    javascript: {
      signature: "function isBalanced(s: string): boolean",
      starter: `function isBalanced(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    // Push openers; on a closer, check what comes off the stack.
  }
  return true;
}
`,
      solution: `function isBalanced(s) {
  const pairs = { ")": "(", "]": "[", "}": "{" };
  const stack = [];
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push(ch);
    } else if (pairs[ch]) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}
`,
      tests: [
        {
          id: "simple",
          name: "Three pairs in a row",
          code: `if (isBalanced("()[]{}") !== true) throw new Error("expected true");`,
        },
        {
          id: "nested",
          name: "Properly nested",
          code: `if (isBalanced("{[]}") !== true) throw new Error("expected true");`,
        },
        {
          id: "interleaved",
          name: "Interleaved brackets are not balanced",
          description: "Closing out of order must be rejected.",
          code: `if (isBalanced("([)]") !== false) throw new Error("expected false");`,
        },
        {
          id: "unclosed",
          name: "Something left open",
          code: `if (isBalanced("(") !== false) throw new Error("expected false for '('");
if (isBalanced("([]") !== false) throw new Error("expected false for '([]'");`,
        },
        {
          id: "empty",
          name: "The empty string is balanced",
          code: `if (isBalanced("") !== true) throw new Error("expected true");`,
        },
      ],
    },
  },
);

// ─── Run-Length Encoding ─────────────────────────────────────────────

const RUN_LENGTH_ENCODE = codeChallenge(
  {
    slug: "run-length-encode",
    title: "Run-Length Encoding",
    difficulty: "Beginner",
    topic: "Strings",
    description:
      "Compress a string by replacing each run of repeated characters with the character and its count.",
    prompt: [
      [
        "Replace every run of repeated characters with the character followed by the length of the run: ",
        { code: '"aaabbc"' },
        " becomes ",
        { code: '"a3b2c1"' },
        ".",
      ],
      "Every character gets a count, even when the run is one long. An empty string encodes to an empty string.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "s", value: '"aaabbc"' },
          { name: "output", value: '"a3b2c1"', emphasis: true },
        ],
      },
      {
        label: "Example 2",
        fields: [
          { name: "s", value: '"abc"' },
          { name: "output", value: '"a1b1c1"', emphasis: true },
        ],
        note: "Runs of one still get a count, so this gets longer, not shorter.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(s) ≤ 10⁵" }],
      ["Lowercase letters only"],
      ["Runs can be longer than nine characters"],
    ],
    solutionNote: [
      "The bug to watch for is the last run: the loop only emits a run when it sees a different character, so the final one has to be flushed after the loop ends. Building a list of pieces and joining once avoids quadratic string concatenation.",
    ],
  },
  {
    python: {
      signature: "def encode(s: str) -> str",
      starter: `def encode(s: str) -> str:
    if not s:
        return ""
    out = []
    run = 1
    for i in range(1, len(s)):
        # Extend the run, or close it off and start a new one.
        pass
    return "".join(out)
`,
      solution: `def encode(s: str) -> str:
    if not s:
        return ""
    out = []
    run = 1
    for i in range(1, len(s)):
        if s[i] == s[i - 1]:
            run += 1
        else:
            out.append(s[i - 1] + str(run))
            run = 1
    out.append(s[-1] + str(run))
    return "".join(out)
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `assert encode("aaabbc") == "a3b2c1", f"got {encode('aaabbc')}"`,
        },
        {
          id: "singles",
          name: "Every run is one long",
          code: `assert encode("abc") == "a1b1c1", f"got {encode('abc')}"`,
        },
        {
          id: "empty",
          name: "Empty input, empty output",
          code: `assert encode("") == ""`,
        },
        {
          id: "one-char",
          name: "A single character",
          description: "The last run must be flushed after the loop.",
          code: `assert encode("a") == "a1", f"got {encode('a')}"`,
        },
        {
          id: "two-digit",
          name: "Runs longer than nine",
          description: "The count is a number, not a digit.",
          code: `assert encode("a" * 12) == "a12", f"got {encode('a' * 12)}"
assert encode("a" * 100 + "b") == "a100b1"`,
        },
      ],
    },
    javascript: {
      signature: "function encode(s: string): string",
      starter: `function encode(s) {
  if (s.length === 0) return "";
  const out = [];
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    // Extend the run, or close it off and start a new one.
  }
  return out.join("");
}
`,
      solution: `function encode(s) {
  if (s.length === 0) return "";
  const out = [];
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) {
      run += 1;
    } else {
      out.push(s[i - 1] + run);
      run = 1;
    }
  }
  out.push(s[s.length - 1] + run);
  return out.join("");
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = encode("aaabbc");
if (got !== "a3b2c1") throw new Error("got " + got);`,
        },
        {
          id: "singles",
          name: "Every run is one long",
          code: `const got = encode("abc");
if (got !== "a1b1c1") throw new Error("got " + got);`,
        },
        {
          id: "empty",
          name: "Empty input, empty output",
          code: `if (encode("") !== "") throw new Error("got " + encode(""));`,
        },
        {
          id: "one-char",
          name: "A single character",
          description: "The last run must be flushed after the loop.",
          code: `if (encode("a") !== "a1") throw new Error("got " + encode("a"));`,
        },
        {
          id: "two-digit",
          name: "Runs longer than nine",
          description: "The count is a number, not a digit.",
          code: `if (encode("a".repeat(12)) !== "a12") throw new Error("got " + encode("a".repeat(12)));
if (encode("a".repeat(100) + "b") !== "a100b1") throw new Error("long run mismatch");`,
        },
      ],
    },
  },
);

// ─── First Unique Character ──────────────────────────────────────────

const FIRST_UNIQUE_CHARACTER = codeChallenge(
  {
    slug: "first-unique-character",
    title: "First Unique Character",
    difficulty: "Beginner",
    topic: "Counting",
    description:
      "Return the position of the first character that appears exactly once, or -1 when there is none.",
    prompt: [
      [
        "Return the index of the first character in the string that appears exactly once. When every character repeats, return ",
        { code: "-1" },
        ".",
      ],
      "Two passes is the intended shape: count first, then scan for the first count of one. Comparison is case-sensitive.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "s", value: '"leetcode"' },
          { name: "output", value: "0", emphasis: true },
        ],
        note: '"l" appears once and comes first.',
      },
      {
        label: "Example 2",
        fields: [
          { name: "s", value: '"loveleetcode"' },
          { name: "output", value: "2", emphasis: true },
        ],
        note: '"l" and "o" both repeat, so "v" at index 2 wins.',
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(s) ≤ 10⁵" }],
      ["Lowercase letters only"],
      ["Return ", { code: "-1" }, " when nothing is unique"],
    ],
    solutionNote: [
      "Counting in the first pass is what makes the second pass cheap: without it you would rescan the string for every character, which is O(n²). The order of the scan, not the order of the counts, is what decides the answer.",
    ],
  },
  {
    python: {
      signature: "def first_unique(s: str) -> int",
      starter: `from collections import Counter


def first_unique(s: str) -> int:
    counts = Counter(s)
    for i, ch in enumerate(s):
        # The first character whose count is 1 wins.
        pass
    return -1
`,
      solution: `from collections import Counter


def first_unique(s: str) -> int:
    counts = Counter(s)
    for i, ch in enumerate(s):
        if counts[ch] == 1:
            return i
    return -1
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `assert first_unique("leetcode") == 0, f"got {first_unique('leetcode')}"`,
        },
        {
          id: "example2",
          name: "Example 2",
          description: "The unique character is not at the front.",
          code: `assert first_unique("loveleetcode") == 2, f"got {first_unique('loveleetcode')}"`,
        },
        {
          id: "none-unique",
          name: "Everything repeats",
          code: `assert first_unique("aabb") == -1, f"got {first_unique('aabb')}"`,
        },
        {
          id: "empty",
          name: "Empty string",
          code: `assert first_unique("") == -1`,
        },
        {
          id: "last",
          name: "The unique character is last",
          code: `assert first_unique("aabbc") == 4, f"got {first_unique('aabbc')}"`,
        },
      ],
    },
    javascript: {
      signature: "function firstUnique(s: string): number",
      starter: `function firstUnique(s) {
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (let i = 0; i < s.length; i++) {
    // The first character whose count is 1 wins.
  }
  return -1;
}
`,
      solution: `function firstUnique(s) {
  const counts = new Map();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  for (let i = 0; i < s.length; i++) {
    if (counts.get(s[i]) === 1) return i;
  }
  return -1;
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = firstUnique("leetcode");
if (got !== 0) throw new Error("got " + got);`,
        },
        {
          id: "example2",
          name: "Example 2",
          description: "The unique character is not at the front.",
          code: `const got = firstUnique("loveleetcode");
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "none-unique",
          name: "Everything repeats",
          code: `const got = firstUnique("aabb");
if (got !== -1) throw new Error("got " + got);`,
        },
        {
          id: "empty",
          name: "Empty string",
          code: `if (firstUnique("") !== -1) throw new Error("got " + firstUnique(""));`,
        },
        {
          id: "last",
          name: "The unique character is last",
          code: `const got = firstUnique("aabbc");
if (got !== 4) throw new Error("got " + got);`,
        },
      ],
    },
  },
);

// ─── Moving Average ──────────────────────────────────────────────────

const MOVING_AVERAGE = codeChallenge(
  {
    slug: "moving-average",
    title: "Moving Average",
    difficulty: "Beginner",
    topic: "Sliding window",
    description:
      "Smooth a series with a fixed-width rolling mean, without re-summing the window each step.",
    prompt: [
      [
        "Return the rolling mean of every window of ",
        { code: "k" },
        " consecutive values, rounded to 2 decimal places. A series of ",
        { code: "n" },
        " values has ",
        { code: "n - k + 1" },
        " windows.",
      ],
      [
        "When ",
        { code: "k" },
        " is larger than the series, return an empty list. Slide the window rather than re-summing it: add the value entering and subtract the one leaving.",
      ],
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "values", value: "[1, 2, 3, 4, 5]" },
          { name: "k", value: "2" },
          { name: "output", value: "[1.5, 2.5, 3.5, 4.5]", emphasis: true },
        ],
      },
      {
        label: "Example 2",
        fields: [
          { name: "values", value: "[1, 2, 3, 4, 5]" },
          { name: "k", value: "3" },
          { name: "output", value: "[2.0, 3.0, 4.0]", emphasis: true },
        ],
        note: "Three windows, each averaging three values.",
      },
    ],
    constraints: [
      [{ code: "1 ≤ k" }, " and ", { code: "0 ≤ len(values) ≤ 10⁵" }],
      ["Round each average to 2 decimal places"],
      [{ code: "k > len(values)" }, " returns an empty list"],
    ],
    solutionNote: [
      "Re-summing each window is O(n × k); carrying a running total and adjusting it by the two values at the window's edges is O(n). With integer inputs the running total stays exact, so nothing drifts as the window slides.",
    ],
  },
  {
    python: {
      signature: "def moving_average(values: list[float], k: int) -> list[float]",
      starter: `def moving_average(values: list[float], k: int) -> list[float]:
    if k > len(values):
        return []
    out = []
    window = sum(values[:k])
    # Slide the window: add what enters, subtract what leaves.
    return out
`,
      solution: `def moving_average(values: list[float], k: int) -> list[float]:
    if k > len(values):
        return []
    out = []
    window = sum(values[:k])
    out.append(round(window / k, 2))
    for i in range(k, len(values)):
        window += values[i] - values[i - k]
        out.append(round(window / k, 2))
    return out
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `assert moving_average([1, 2, 3, 4, 5], 2) == [1.5, 2.5, 3.5, 4.5], \\
    f"got {moving_average([1, 2, 3, 4, 5], 2)}"`,
        },
        {
          id: "example2",
          name: "Example 2",
          code: `assert moving_average([1, 2, 3, 4, 5], 3) == [2.0, 3.0, 4.0], \\
    f"got {moving_average([1, 2, 3, 4, 5], 3)}"`,
        },
        {
          id: "whole-series",
          name: "A window as wide as the series",
          description: "Exactly one window, so exactly one average.",
          code: `assert moving_average([4, 8], 2) == [6.0], f"got {moving_average([4, 8], 2)}"`,
        },
        {
          id: "too-wide",
          name: "A window wider than the series",
          code: `assert moving_average([1, 2], 5) == []
assert moving_average([], 1) == []`,
        },
        {
          id: "rounding",
          name: "Averages are rounded to 2 places",
          code: `assert moving_average([1, 2, 2], 3) == [1.67], f"got {moving_average([1, 2, 2], 3)}"`,
        },
        {
          id: "large",
          name: "A hundred-wide window over a long series",
          code: `assert moving_average(list(range(1, 101)), 100) == [50.5]`,
        },
      ],
    },
    javascript: {
      signature: "function movingAverage(values: number[], k: number): number[]",
      starter: `function movingAverage(values, k) {
  if (k > values.length) return [];
  const out = [];
  let window = 0;
  for (let i = 0; i < k; i++) window += values[i];
  // Slide the window: add what enters, subtract what leaves.
  return out;
}
`,
      solution: `function movingAverage(values, k) {
  if (k > values.length) return [];
  const out = [];
  let window = 0;
  for (let i = 0; i < k; i++) window += values[i];
  out.push(Math.round((window / k) * 100) / 100);
  for (let i = k; i < values.length; i++) {
    window += values[i] - values[i - k];
    out.push(Math.round((window / k) * 100) / 100);
  }
  return out;
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const got = movingAverage([1, 2, 3, 4, 5], 2);
if (JSON.stringify(got) !== "[1.5,2.5,3.5,4.5]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "example2",
          name: "Example 2",
          code: `const got = movingAverage([1, 2, 3, 4, 5], 3);
if (JSON.stringify(got) !== "[2,3,4]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "whole-series",
          name: "A window as wide as the series",
          description: "Exactly one window, so exactly one average.",
          code: `const got = movingAverage([4, 8], 2);
if (JSON.stringify(got) !== "[6]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "too-wide",
          name: "A window wider than the series",
          code: `if (JSON.stringify(movingAverage([1, 2], 5)) !== "[]") throw new Error("expected []");
if (JSON.stringify(movingAverage([], 1)) !== "[]") throw new Error("expected [] for empty input");`,
        },
        {
          id: "rounding",
          name: "Averages are rounded to 2 places",
          code: `const got = movingAverage([1, 2, 2], 3);
if (JSON.stringify(got) !== "[1.67]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "large",
          name: "A hundred-wide window over a long series",
          code: `const series = Array.from({ length: 100 }, (_, i) => i + 1);
const got = movingAverage(series, 100);
if (JSON.stringify(got) !== "[50.5]") throw new Error("got " + JSON.stringify(got));`,
        },
      ],
    },
  },
);

// ─── Median Value ────────────────────────────────────────────────────

const MEDIAN_VALUE = codeChallenge(
  {
    slug: "median-value",
    title: "Median Value",
    difficulty: "Beginner",
    topic: "Summary statistics",
    description:
      "Return the middle value of an unsorted series, averaging the two middles when the count is even.",
    prompt: [
      "Return the median of a list of numbers. The input is not sorted, and you should not change it.",
      "With an odd count the median is the middle value; with an even count it is the mean of the two middle values.",
    ],
    examples: [
      {
        label: "Odd count",
        fields: [
          { name: "values", value: "[3, 1, 2]" },
          { name: "output", value: "2.0", emphasis: true },
        ],
        note: "Sorted, the series is 1, 2, 3.",
      },
      {
        label: "Even count",
        fields: [
          { name: "values", value: "[4, 1, 3, 2]" },
          { name: "output", value: "2.5", emphasis: true },
        ],
        note: "The two middles are 2 and 3.",
      },
    ],
    constraints: [
      [{ code: "1 ≤ len(values) ≤ 10⁵" }],
      ["Values may be negative and may repeat"],
      ["The caller's list must not be reordered"],
    ],
    solutionNote: [
      "Sorting is the honest O(n log n) answer and the right one to write first. The detail people miss is the even case: with four values the middles are at indices 1 and 2, which is ",
      { code: "n // 2 - 1" },
      " and ",
      { code: "n // 2" },
      ", not the single index the odd case uses.",
    ],
  },
  {
    python: {
      signature: "def median(values: list[float]) -> float",
      starter: `def median(values: list[float]) -> float:
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    # Odd counts take the middle; even counts average the two middles.
    return 0.0
`,
      solution: `def median(values: list[float]) -> float:
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2:
        return float(ordered[mid])
    return (ordered[mid - 1] + ordered[mid]) / 2
`,
      tests: [
        {
          id: "odd",
          name: "Odd count",
          code: `assert median([3, 1, 2]) == 2.0, f"got {median([3, 1, 2])}"`,
        },
        {
          id: "even",
          name: "Even count averages the two middles",
          code: `assert median([4, 1, 3, 2]) == 2.5, f"got {median([4, 1, 3, 2])}"`,
        },
        {
          id: "single",
          name: "A single value",
          code: `assert median([5]) == 5.0, f"got {median([5])}"`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `assert median([-5, -1, -3]) == -3.0, f"got {median([-5, -1, -3])}"`,
        },
        {
          id: "no-mutation",
          name: "The caller's list is left alone",
          description: "Sort a copy, not the argument.",
          code: `values = [3, 1, 2]
median(values)
assert values == [3, 1, 2], f"the input was reordered: {values}"`,
        },
        {
          id: "large",
          name: "A thousand values",
          code: `assert median(list(range(1, 1001))) == 500.5`,
        },
      ],
    },
    javascript: {
      signature: "function median(values: number[]): number",
      starter: `function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const n = ordered.length;
  const mid = Math.floor(n / 2);
  // Odd counts take the middle; even counts average the two middles.
  return 0;
}
`,
      solution: `function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const n = ordered.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return ordered[mid];
  return (ordered[mid - 1] + ordered[mid]) / 2;
}
`,
      tests: [
        {
          id: "odd",
          name: "Odd count",
          code: `const got = median([3, 1, 2]);
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "even",
          name: "Even count averages the two middles",
          code: `const got = median([4, 1, 3, 2]);
if (got !== 2.5) throw new Error("got " + got);`,
        },
        {
          id: "single",
          name: "A single value",
          code: `if (median([5]) !== 5) throw new Error("got " + median([5]));`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `const got = median([-5, -1, -3]);
if (got !== -3) throw new Error("got " + got);`,
        },
        {
          id: "no-mutation",
          name: "The caller's array is left alone",
          description: "Array.prototype.sort sorts in place; copy first.",
          code: `const values = [3, 1, 2];
median(values);
if (JSON.stringify(values) !== "[3,1,2]") {
  throw new Error("the input was reordered: " + JSON.stringify(values));
}`,
        },
        {
          id: "default-sort",
          name: "Numbers sort numerically, not as text",
          description: "A default sort would put 100 before 9.",
          code: `const got = median([9, 100, 11]);
if (got !== 11) throw new Error("got " + got);`,
        },
      ],
    },
  },
);

// ─── CSV Column Total ────────────────────────────────────────────────

const CSV_COLUMN_TOTAL = codeChallenge(
  {
    slug: "csv-column-total",
    title: "CSV Column Total",
    difficulty: "Beginner",
    topic: "Parsing",
    description:
      "Sum one named column of a small CSV, treating blank cells as zero.",
    prompt: [
      [
        "You are given a CSV as a list of lines (the first line is the header) and the name of a column. Return the sum of that column, rounded to 2 decimal places.",
      ],
      [
        "Blank cells count as zero. When the column is not in the header, or the CSV has no data rows, return ",
        { code: "0.0" },
        ".",
      ],
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          {
            name: "rows",
            value: '["item,qty,price", "mug,2,7.50", "cup,3,2.25"]',
          },
          { name: "column", value: '"price"' },
          { name: "output", value: "9.75", emphasis: true },
        ],
      },
      {
        label: "Blank cells",
        fields: [
          { name: "rows", value: '["a,b", "1,", "2,3"]' },
          { name: "column", value: '"b"' },
          { name: "output", value: "3.0", emphasis: true },
        ],
        note: "The missing value is zero, not an error.",
      },
    ],
    constraints: [
      ["Cells contain no quoted commas: a plain split is enough"],
      ["Values may be integers or decimals"],
      ["Round the total to 2 decimal places"],
    ],
    solutionNote: [
      "Find the column's position once from the header rather than per row; everything after that is a scan. Guarding the blank cell before converting it is what keeps a real-world CSV from raising halfway through.",
    ],
  },
  {
    python: {
      signature: "def column_total(rows: list[str], column: str) -> float",
      starter: `def column_total(rows: list[str], column: str) -> float:
    if not rows:
        return 0.0
    header = rows[0].split(",")
    # Find the column once, then add up the cells beneath it.
    return 0.0
`,
      solution: `def column_total(rows: list[str], column: str) -> float:
    if not rows:
        return 0.0
    header = rows[0].split(",")
    if column not in header:
        return 0.0
    index = header.index(column)
    total = 0.0
    for line in rows[1:]:
        cell = line.split(",")[index].strip()
        if cell:
            total += float(cell)
    return round(total, 2)
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `rows = ["item,qty,price", "mug,2,7.50", "cup,3,2.25"]
assert column_total(rows, "price") == 9.75, f"got {column_total(rows, 'price')}"`,
        },
        {
          id: "other-column",
          name: "A different column",
          description: "The column is found by name, not by position.",
          code: `rows = ["item,qty,price", "mug,2,7.50", "cup,3,2.25"]
assert column_total(rows, "qty") == 5.0, f"got {column_total(rows, 'qty')}"`,
        },
        {
          id: "blank-cells",
          name: "Blank cells count as zero",
          code: `assert column_total(["a,b", "1,", "2,3"], "b") == 3.0, \\
    f"got {column_total(['a,b', '1,', '2,3'], 'b')}"`,
        },
        {
          id: "header-only",
          name: "Header with no data rows",
          code: `assert column_total(["item,qty"], "qty") == 0.0`,
        },
        {
          id: "unknown-column",
          name: "A column that is not there",
          code: `assert column_total(["item,qty", "mug,2"], "price") == 0.0`,
        },
        {
          id: "decimals",
          name: "Decimal totals are rounded",
          description: "0.1 + 0.2 is not exactly 0.3 in binary floating point.",
          code: `assert column_total(["v", "0.1", "0.2"], "v") == 0.3, \\
    f"got {column_total(['v', '0.1', '0.2'], 'v')}"`,
        },
      ],
    },
    javascript: {
      signature: "function columnTotal(rows: string[], column: string): number",
      starter: `function columnTotal(rows, column) {
  if (rows.length === 0) return 0;
  const header = rows[0].split(",");
  // Find the column once, then add up the cells beneath it.
  return 0;
}
`,
      solution: `function columnTotal(rows, column) {
  if (rows.length === 0) return 0;
  const header = rows[0].split(",");
  const index = header.indexOf(column);
  if (index === -1) return 0;
  let total = 0;
  for (const line of rows.slice(1)) {
    const cell = line.split(",")[index].trim();
    if (cell) total += Number(cell);
  }
  return Math.round(total * 100) / 100;
}
`,
      tests: [
        {
          id: "example1",
          name: "Example 1",
          code: `const rows = ["item,qty,price", "mug,2,7.50", "cup,3,2.25"];
const got = columnTotal(rows, "price");
if (got !== 9.75) throw new Error("got " + got);`,
        },
        {
          id: "other-column",
          name: "A different column",
          description: "The column is found by name, not by position.",
          code: `const rows = ["item,qty,price", "mug,2,7.50", "cup,3,2.25"];
const got = columnTotal(rows, "qty");
if (got !== 5) throw new Error("got " + got);`,
        },
        {
          id: "blank-cells",
          name: "Blank cells count as zero",
          code: `const got = columnTotal(["a,b", "1,", "2,3"], "b");
if (got !== 3) throw new Error("got " + got);`,
        },
        {
          id: "header-only",
          name: "Header with no data rows",
          code: `const got = columnTotal(["item,qty"], "qty");
if (got !== 0) throw new Error("got " + got);`,
        },
        {
          id: "unknown-column",
          name: "A column that is not there",
          code: `const got = columnTotal(["item,qty", "mug,2"], "price");
if (got !== 0) throw new Error("got " + got);`,
        },
        {
          id: "decimals",
          name: "Decimal totals are rounded",
          description: "0.1 + 0.2 is not exactly 0.3 in binary floating point.",
          code: `const got = columnTotal(["v", "0.1", "0.2"], "v");
if (got !== 0.3) throw new Error("got " + got);`,
        },
      ],
    },
  },
);

export const CODE_FUNDAMENTALS: Challenge[] = [
  TWO_SUM,
  BALANCED_BRACKETS,
  RUN_LENGTH_ENCODE,
  FIRST_UNIQUE_CHARACTER,
  MOVING_AVERAGE,
  MEDIAN_VALUE,
  CSV_COLUMN_TOTAL,
];
