/**
 * Single-step code challenges: the classics.
 *
 * These are the problems that come up in interviews, and each one has a
 * specific insight that turns a slow or clumsy answer into a clean one —
 * a prefix and suffix pass instead of division, a hash of running totals
 * instead of nested loops, an index instead of a scan per row. The prompts
 * name the naive approach and say why it is not enough, because the point is
 * the technique rather than getting any answer at all.
 *
 * Both languages, and `__tests__/challengeSolutions` runs both reference
 * solutions for real.
 */

import { codeChallenge } from "./authoring";
import type { Challenge } from "./types";

const LONGEST_COMMON_PREFIX = codeChallenge(
  {
    slug: "longest-common-prefix",
    title: "Longest Common Prefix",
    difficulty: "Beginner",
    topic: "Strings",
    description: "Find the longest opening that every word in a list shares.",
    prompt: [
      "Return the longest string that every word in the list starts with. When there is nothing in common, return an empty string.",
      "An empty list has no common prefix either.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "words", value: '["flower", "flow", "flight"]' },
          { name: "output", value: '"fl"', emphasis: true },
        ],
      },
      {
        label: "Nothing shared",
        fields: [
          { name: "words", value: '["dog", "racecar", "car"]' },
          { name: "output", value: '""', emphasis: true },
        ],
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(words) ≤ 10⁴" }],
      ["Lowercase letters only"],
      ["The empty list returns an empty string"],
    ],
    solutionNote: [
      "Comparing every word against a shrinking candidate stops as soon as the prefix runs out, so the work is bounded by the shortest word rather than the longest. The edge that catches people is a list containing an empty string: the answer is immediately empty, and any loop that assumes at least one character will run off the end.",
    ],
  },
  {
    python: {
      signature: "def longest_common_prefix(words: list[str]) -> str",
      starter: `def longest_common_prefix(words: list[str]) -> str:
    if not words:
        return ""
    prefix = words[0]
    for word in words[1:]:
        # Shrink the prefix until this word starts with it.
        pass
    return prefix
`,
      solution: `def longest_common_prefix(words: list[str]) -> str:
    if not words:
        return ""
    prefix = words[0]
    for word in words[1:]:
        while not word.startswith(prefix):
            prefix = prefix[:-1]
            if not prefix:
                return ""
    return prefix
`,
      tests: [
        {
          id: "basic",
          name: "A shared opening",
          code: `got = longest_common_prefix(["flower", "flow", "flight"])
assert got == "fl", f"got {got!r}"`,
        },
        {
          id: "nothing",
          name: "Nothing in common",
          code: `assert longest_common_prefix(["dog", "racecar", "car"]) == ""`,
        },
        {
          id: "single",
          name: "A single word is its own prefix",
          code: `assert longest_common_prefix(["alone"]) == "alone"`,
        },
        {
          id: "empty-word",
          name: "An empty string in the list",
          description: "Nothing can be shared with it.",
          code: `assert longest_common_prefix(["", "abc"]) == ""
assert longest_common_prefix(["abc", ""]) == ""`,
        },
        {
          id: "empty-list",
          name: "An empty list",
          code: `assert longest_common_prefix([]) == ""`,
        },
        {
          id: "identical",
          name: "Identical words",
          code: `assert longest_common_prefix(["same", "same"]) == "same"`,
        },
      ],
    },
    javascript: {
      signature: "function longestCommonPrefix(words: string[]): string",
      starter: `function longestCommonPrefix(words) {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const word of words.slice(1)) {
    // Shrink the prefix until this word starts with it.
  }
  return prefix;
}
`,
      solution: `function longestCommonPrefix(words) {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const word of words.slice(1)) {
    while (!word.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (prefix === "") return "";
    }
  }
  return prefix;
}
`,
      tests: [
        {
          id: "basic",
          name: "A shared opening",
          code: `const got = longestCommonPrefix(["flower", "flow", "flight"]);
if (got !== "fl") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "nothing",
          name: "Nothing in common",
          code: `const got = longestCommonPrefix(["dog", "racecar", "car"]);
if (got !== "") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "single",
          name: "A single word is its own prefix",
          code: `if (longestCommonPrefix(["alone"]) !== "alone") throw new Error("got " + longestCommonPrefix(["alone"]));`,
        },
        {
          id: "empty-word",
          name: "An empty string in the list",
          description: "Nothing can be shared with it.",
          code: `if (longestCommonPrefix(["", "abc"]) !== "") throw new Error("expected empty");
if (longestCommonPrefix(["abc", ""]) !== "") throw new Error("expected empty");`,
        },
        {
          id: "empty-list",
          name: "An empty list",
          code: `if (longestCommonPrefix([]) !== "") throw new Error("expected empty");`,
        },
        {
          id: "identical",
          name: "Identical words",
          code: `if (longestCommonPrefix(["same", "same"]) !== "same") throw new Error("mismatch");`,
        },
      ],
    },
  },
);

const PRODUCT_EXCEPT_SELF = codeChallenge(
  {
    slug: "product-except-self",
    title: "Product Except Self",
    difficulty: "Advanced",
    topic: "Prefix and suffix passes",
    description:
      "For each position, multiply every other value, without using division.",
    prompt: [
      "Return a list where each position holds the product of every value except the one at that position.",
      "Division is not allowed, which rules out the obvious trick of multiplying everything and dividing. Two passes over the list are enough.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "nums", value: "[1, 2, 3, 4]" },
          { name: "output", value: "[24, 12, 8, 6]", emphasis: true },
        ],
        note: "2 × 3 × 4, 1 × 3 × 4, 1 × 2 × 4, 1 × 2 × 3.",
      },
      {
        label: "With a zero",
        fields: [
          { name: "nums", value: "[0, 1, 2]" },
          { name: "output", value: "[2, 0, 0]", emphasis: true },
        ],
        note: "Only the zero's own position escapes being multiplied by it.",
      },
    ],
    constraints: [
      [{ code: "1 ≤ len(nums) ≤ 10⁵" }],
      ["No division"],
      ["Values may be zero or negative"],
    ],
    solutionNote: [
      "Walk left to right carrying the product of everything before each position, then right to left carrying the product of everything after, and multiply the two. Banning division is not arbitrary: the divide-everything approach breaks the moment a zero appears, and breaks differently when two do.",
    ],
  },
  {
    python: {
      signature: "def product_except_self(nums: list[int]) -> list[int]",
      starter: `def product_except_self(nums: list[int]) -> list[int]:
    out = [1] * len(nums)
    running = 1
    # One pass carrying what is to the left, one carrying what is to the right.
    return out
`,
      solution: `def product_except_self(nums: list[int]) -> list[int]:
    out = [1] * len(nums)
    running = 1
    for i in range(len(nums)):
        out[i] = running
        running *= nums[i]
    running = 1
    for i in range(len(nums) - 1, -1, -1):
        out[i] *= running
        running *= nums[i]
    return out
`,
      tests: [
        {
          id: "basic",
          name: "Example 1",
          code: `got = product_except_self([1, 2, 3, 4])
assert got == [24, 12, 8, 6], f"got {got}"`,
        },
        {
          id: "zero",
          name: "A single zero",
          description: "Every other position becomes 0.",
          code: `got = product_except_self([0, 1, 2])
assert got == [2, 0, 0], f"got {got}"`,
        },
        {
          id: "two-zeros",
          name: "Two zeros make everything zero",
          code: `got = product_except_self([0, 0, 3])
assert got == [0, 0, 0], f"got {got}"`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `got = product_except_self([-1, 2, -3])
assert got == [-6, 3, -2], f"got {got}"`,
        },
        {
          id: "single",
          name: "A single value",
          code: `assert product_except_self([7]) == [1], f"got {product_except_self([7])}"`,
        },
        {
          id: "large",
          name: "Ten thousand ones",
          description: "A nested loop would be 100 million multiplications.",
          code: `got = product_except_self([1] * 10000)
assert len(got) == 10000 and set(got) == {1}`,
        },
      ],
    },
    javascript: {
      signature: "function productExceptSelf(nums: number[]): number[]",
      starter: `function productExceptSelf(nums) {
  const out = new Array(nums.length).fill(1);
  let running = 1;
  // One pass carrying what is to the left, one carrying what is to the right.
  return out;
}
`,
      solution: `function productExceptSelf(nums) {
  const out = new Array(nums.length).fill(1);
  let running = 1;
  for (let i = 0; i < nums.length; i++) {
    out[i] = running;
    running *= nums[i];
  }
  running = 1;
  for (let i = nums.length - 1; i >= 0; i--) {
    out[i] *= running;
    running *= nums[i];
  }
  return out;
}
`,
      tests: [
        {
          id: "basic",
          name: "Example 1",
          code: `const got = productExceptSelf([1, 2, 3, 4]);
if (JSON.stringify(got) !== "[24,12,8,6]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "zero",
          name: "A single zero",
          description: "Every other position becomes 0.",
          code: `const got = productExceptSelf([0, 1, 2]);
if (JSON.stringify(got) !== "[2,0,0]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "two-zeros",
          name: "Two zeros make everything zero",
          code: `const got = productExceptSelf([0, 0, 3]);
if (JSON.stringify(got) !== "[0,0,0]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `const got = productExceptSelf([-1, 2, -3]);
if (JSON.stringify(got) !== "[-6,3,-2]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "single",
          name: "A single value",
          code: `const got = productExceptSelf([7]);
if (JSON.stringify(got) !== "[1]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "large",
          name: "Ten thousand ones",
          description: "A nested loop would be 100 million multiplications.",
          code: `const got = productExceptSelf(new Array(10000).fill(1));
if (got.length !== 10000) throw new Error("length " + got.length);
if (got.some((v) => v !== 1)) throw new Error("a value was not 1");`,
        },
      ],
    },
  },
);

const ROTATE_ARRAY = codeChallenge(
  {
    slug: "rotate-array",
    title: "Rotate an Array",
    difficulty: "Beginner",
    topic: "Modular arithmetic",
    description: "Shift every element k places to the right, wrapping around.",
    prompt: [
      [
        "Move every element ",
        { code: "k" },
        " places to the right, with the values that fall off the end wrapping to the front. Return a new list; do not change the one you were given.",
      ],
      [
        { code: "k" },
        " can be larger than the list (rotating a list of 5 by 7 is the same as by 2) and it can be negative, which rotates left.",
      ],
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "nums", value: "[1, 2, 3, 4, 5]" },
          { name: "k", value: "2" },
          { name: "output", value: "[4, 5, 1, 2, 3]", emphasis: true },
        ],
      },
      {
        label: "Negative k rotates left",
        fields: [
          { name: "nums", value: "[1, 2, 3, 4, 5]" },
          { name: "k", value: "-1" },
          { name: "output", value: "[2, 3, 4, 5, 1]", emphasis: true },
        ],
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(nums) ≤ 10⁵" }],
      [{ code: "k" }, " may be negative or larger than the list"],
      ["The caller's list must not change"],
    ],
    solutionNote: [
      "Reducing ",
      { code: "k" },
      " modulo the length first is what makes a rotation by a million instant, and it is also what makes the negative case free: in Python ",
      { code: "-1 % 5" },
      " is already 4. JavaScript's ",
      { code: "%" },
      " keeps the sign, so it needs ",
      { code: "((k % n) + n) % n" },
      " to get there.",
    ],
  },
  {
    python: {
      signature: "def rotate(nums: list, k: int) -> list",
      starter: `def rotate(nums: list, k: int) -> list:
    if not nums:
        return []
    k %= len(nums)
    # Take the tail, then the head.
    return list(nums)
`,
      solution: `def rotate(nums: list, k: int) -> list:
    if not nums:
        return []
    k %= len(nums)
    if k == 0:
        return list(nums)
    return nums[-k:] + nums[:-k]
`,
      tests: [
        {
          id: "basic",
          name: "Example 1",
          code: `got = rotate([1, 2, 3, 4, 5], 2)
assert got == [4, 5, 1, 2, 3], f"got {got}"`,
        },
        {
          id: "zero",
          name: "Rotating by zero changes nothing",
          description: "A slice of -0 is not the last zero elements.",
          code: `assert rotate([1, 2, 3], 0) == [1, 2, 3], f"got {rotate([1, 2, 3], 0)}"`,
        },
        {
          id: "wrap",
          name: "k larger than the list",
          code: `assert rotate([1, 2, 3, 4, 5], 7) == rotate([1, 2, 3, 4, 5], 2)
assert rotate([1, 2, 3], 3) == [1, 2, 3]`,
        },
        {
          id: "negative",
          name: "Negative k rotates left",
          code: `got = rotate([1, 2, 3, 4, 5], -1)
assert got == [2, 3, 4, 5, 1], f"got {got}"`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `assert rotate([], 3) == []`,
        },
        {
          id: "no-mutation",
          name: "The caller's list is left alone",
          code: `nums = [1, 2, 3]
rotate(nums, 1)
assert nums == [1, 2, 3], f"the input changed: {nums}"`,
        },
      ],
    },
    javascript: {
      signature: "function rotate(nums: unknown[], k: number): unknown[]",
      starter: `function rotate(nums, k) {
  const n = nums.length;
  if (n === 0) return [];
  const turns = ((k % n) + n) % n;
  // Take the tail, then the head.
  return [...nums];
}
`,
      solution: `function rotate(nums, k) {
  const n = nums.length;
  if (n === 0) return [];
  const turns = ((k % n) + n) % n;
  return [...nums.slice(n - turns), ...nums.slice(0, n - turns)];
}
`,
      tests: [
        {
          id: "basic",
          name: "Example 1",
          code: `const got = rotate([1, 2, 3, 4, 5], 2);
if (JSON.stringify(got) !== "[4,5,1,2,3]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "zero",
          name: "Rotating by zero changes nothing",
          code: `const got = rotate([1, 2, 3], 0);
if (JSON.stringify(got) !== "[1,2,3]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "wrap",
          name: "k larger than the list",
          code: `const a = JSON.stringify(rotate([1, 2, 3, 4, 5], 7));
const b = JSON.stringify(rotate([1, 2, 3, 4, 5], 2));
if (a !== b) throw new Error(a + " vs " + b);
if (JSON.stringify(rotate([1, 2, 3], 3)) !== "[1,2,3]") throw new Error("full turn changed it");`,
        },
        {
          id: "negative",
          name: "Negative k rotates left",
          description: "JavaScript's % keeps the sign of the left operand.",
          code: `const got = rotate([1, 2, 3, 4, 5], -1);
if (JSON.stringify(got) !== "[2,3,4,5,1]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `if (JSON.stringify(rotate([], 3)) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "no-mutation",
          name: "The caller's list is left alone",
          code: `const nums = [1, 2, 3];
rotate(nums, 1);
if (JSON.stringify(nums) !== "[1,2,3]") throw new Error("the input changed: " + JSON.stringify(nums));`,
        },
      ],
    },
  },
);

const COIN_CHANGE = codeChallenge(
  {
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "Advanced",
    topic: "Dynamic programming",
    description:
      "Make an amount from the fewest coins, or report that it cannot be done.",
    prompt: [
      [
        "Given coin denominations and a target amount, return the smallest number of coins that adds up to the amount exactly. Return ",
        { code: "-1" },
        " when no combination works.",
      ],
      "You have unlimited coins of each denomination. Taking the largest coin that fits at each step is the obvious approach and it is wrong: with coins of 1, 3 and 4, making 6 that way takes three coins when two would do.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "coins", value: "[1, 2, 5]" },
          { name: "amount", value: "11" },
          { name: "output", value: "3", emphasis: true },
        ],
        note: "5 + 5 + 1.",
      },
      {
        label: "Impossible",
        fields: [
          { name: "coins", value: "[2]" },
          { name: "amount", value: "3" },
          { name: "output", value: "-1", emphasis: true },
        ],
        note: "An odd amount cannot be made from even coins.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ amount ≤ 10⁴" }],
      ["Each coin may be used any number of times"],
      ["An amount of 0 needs no coins"],
    ],
    solutionNote: [
      "Build the answer for every amount from 1 upward, and each one is the best of \"one coin, plus the already-solved answer for what is left\". That is what makes it correct where the greedy version is not: every combination gets considered, but each sub-amount is solved only once.",
    ],
  },
  {
    python: {
      signature: "def min_coins(coins: list[int], amount: int) -> int",
      starter: `def min_coins(coins: list[int], amount: int) -> int:
    if amount == 0:
        return 0
    # best[v] is the fewest coins that make v; amount + 1 stands for "no way yet".
    best = [0] + [amount + 1] * amount
    return -1
`,
      solution: `def min_coins(coins: list[int], amount: int) -> int:
    if amount == 0:
        return 0
    best = [0] + [amount + 1] * amount
    for value in range(1, amount + 1):
        for coin in coins:
            if coin <= value:
                best[value] = min(best[value], best[value - coin] + 1)
    return best[amount] if best[amount] <= amount else -1
`,
      tests: [
        {
          id: "basic",
          name: "Example 1",
          code: `assert min_coins([1, 2, 5], 11) == 3, f"got {min_coins([1, 2, 5], 11)}"`,
        },
        {
          id: "impossible",
          name: "No combination works",
          code: `assert min_coins([2], 3) == -1, f"got {min_coins([2], 3)}"`,
        },
        {
          id: "zero",
          name: "An amount of zero needs no coins",
          code: `assert min_coins([1], 0) == 0`,
        },
        {
          id: "not-greedy",
          name: "The greedy choice is not always right",
          description: "With 1, 3 and 4, making 6 takes two coins, not three.",
          code: `assert min_coins([1, 3, 4], 6) == 2, f"got {min_coins([1, 3, 4], 6)}"`,
        },
        {
          id: "no-coins",
          name: "No coins at all",
          code: `assert min_coins([], 5) == -1
assert min_coins([], 0) == 0`,
        },
        {
          id: "large",
          name: "An awkward large amount",
          code: `assert min_coins([186, 419, 83, 408], 6249) == 20, \\
    f"got {min_coins([186, 419, 83, 408], 6249)}"`,
        },
      ],
    },
    javascript: {
      signature: "function minCoins(coins: number[], amount: number): number",
      starter: `function minCoins(coins, amount) {
  if (amount === 0) return 0;
  // best[v] is the fewest coins that make v; amount + 1 stands for "no way yet".
  const best = new Array(amount + 1).fill(amount + 1);
  best[0] = 0;
  return -1;
}
`,
      solution: `function minCoins(coins, amount) {
  if (amount === 0) return 0;
  const best = new Array(amount + 1).fill(amount + 1);
  best[0] = 0;
  for (let value = 1; value <= amount; value++) {
    for (const coin of coins) {
      if (coin <= value) best[value] = Math.min(best[value], best[value - coin] + 1);
    }
  }
  return best[amount] <= amount ? best[amount] : -1;
}
`,
      tests: [
        {
          id: "basic",
          name: "Example 1",
          code: `const got = minCoins([1, 2, 5], 11);
if (got !== 3) throw new Error("got " + got);`,
        },
        {
          id: "impossible",
          name: "No combination works",
          code: `const got = minCoins([2], 3);
if (got !== -1) throw new Error("got " + got);`,
        },
        {
          id: "zero",
          name: "An amount of zero needs no coins",
          code: `if (minCoins([1], 0) !== 0) throw new Error("got " + minCoins([1], 0));`,
        },
        {
          id: "not-greedy",
          name: "The greedy choice is not always right",
          description: "With 1, 3 and 4, making 6 takes two coins, not three.",
          code: `const got = minCoins([1, 3, 4], 6);
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "no-coins",
          name: "No coins at all",
          code: `if (minCoins([], 5) !== -1) throw new Error("got " + minCoins([], 5));
if (minCoins([], 0) !== 0) throw new Error("got " + minCoins([], 0));`,
        },
        {
          id: "large",
          name: "An awkward large amount",
          code: `const got = minCoins([186, 419, 83, 408], 6249);
if (got !== 20) throw new Error("got " + got);`,
        },
      ],
    },
  },
);

const SPIRAL_ORDER = codeChallenge(
  {
    slug: "spiral-order",
    title: "Spiral Order",
    difficulty: "Advanced",
    topic: "Matrix traversal",
    description: "Read a grid in a clockwise spiral from the outside in.",
    prompt: [
      "Return the grid's values in spiral order: left to right along the top, down the right side, right to left along the bottom, up the left side, then inward and repeat.",
      "The grid can be rectangular, a single row, a single column, or empty.",
    ],
    examples: [
      {
        label: "Three by three",
        fields: [
          { name: "matrix", value: "[[1, 2, 3], [4, 5, 6], [7, 8, 9]]" },
          {
            name: "output",
            value: "[1, 2, 3, 6, 9, 8, 7, 4, 5]",
            emphasis: true,
          },
        ],
        note: "Around the edge, then the middle.",
      },
      {
        label: "A single row",
        fields: [
          { name: "matrix", value: "[[1, 2, 3]]" },
          { name: "output", value: "[1, 2, 3]", emphasis: true },
        ],
        note: "There is no second pass to make.",
      },
    ],
    constraints: [
      ["The grid may be rectangular"],
      ["Every value appears exactly once"],
      ["An empty grid returns an empty list"],
    ],
    solutionNote: [
      "Four moving boundaries, and each pass pulls one of them inward. The two guards in the second half of the loop are what make single rows and single columns work: without them, a one-row grid gets read left to right and then right to left again, and every value comes out twice.",
    ],
  },
  {
    python: {
      signature: "def spiral_order(matrix: list[list[int]]) -> list[int]",
      starter: `def spiral_order(matrix: list[list[int]]) -> list[int]:
    if not matrix or not matrix[0]:
        return []
    out = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    # Four boundaries, each pulled inward after its pass.
    return out
`,
      solution: `def spiral_order(matrix: list[list[int]]) -> list[int]:
    if not matrix or not matrix[0]:
        return []
    out = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1
    while top <= bottom and left <= right:
        for col in range(left, right + 1):
            out.append(matrix[top][col])
        top += 1
        for row in range(top, bottom + 1):
            out.append(matrix[row][right])
        right -= 1
        if top <= bottom:
            for col in range(right, left - 1, -1):
                out.append(matrix[bottom][col])
            bottom -= 1
        if left <= right:
            for row in range(bottom, top - 1, -1):
                out.append(matrix[row][left])
            left += 1
    return out
`,
      tests: [
        {
          id: "square",
          name: "A three by three grid",
          code: `got = spiral_order([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
assert got == [1, 2, 3, 6, 9, 8, 7, 4, 5], f"got {got}"`,
        },
        {
          id: "rectangular",
          name: "A three by four grid",
          code: `got = spiral_order([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]])
assert got == [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7], f"got {got}"`,
        },
        {
          id: "single-row",
          name: "A single row",
          description: "Values must not come back twice.",
          code: `assert spiral_order([[1, 2, 3]]) == [1, 2, 3], f"got {spiral_order([[1, 2, 3]])}"`,
        },
        {
          id: "single-column",
          name: "A single column",
          code: `assert spiral_order([[1], [2], [3]]) == [1, 2, 3], f"got {spiral_order([[1], [2], [3]])}"`,
        },
        {
          id: "empty",
          name: "An empty grid",
          code: `assert spiral_order([]) == []
assert spiral_order([[]]) == []`,
        },
        {
          id: "complete",
          name: "Every value exactly once",
          code: `grid = [[r * 5 + c for c in range(5)] for r in range(4)]
got = spiral_order(grid)
assert sorted(got) == list(range(20)), f"got {sorted(got)}"`,
        },
      ],
    },
    javascript: {
      signature: "function spiralOrder(matrix: number[][]): number[]",
      starter: `function spiralOrder(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return [];
  const out = [];
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;
  // Four boundaries, each pulled inward after its pass.
  return out;
}
`,
      solution: `function spiralOrder(matrix) {
  if (matrix.length === 0 || matrix[0].length === 0) return [];
  const out = [];
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col++) out.push(matrix[top][col]);
    top += 1;
    for (let row = top; row <= bottom; row++) out.push(matrix[row][right]);
    right -= 1;
    if (top <= bottom) {
      for (let col = right; col >= left; col--) out.push(matrix[bottom][col]);
      bottom -= 1;
    }
    if (left <= right) {
      for (let row = bottom; row >= top; row--) out.push(matrix[row][left]);
      left += 1;
    }
  }
  return out;
}
`,
      tests: [
        {
          id: "square",
          name: "A three by three grid",
          code: `const got = spiralOrder([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
if (JSON.stringify(got) !== "[1,2,3,6,9,8,7,4,5]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "rectangular",
          name: "A three by four grid",
          code: `const got = spiralOrder([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]);
if (JSON.stringify(got) !== "[1,2,3,4,8,12,11,10,9,5,6,7]") {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "single-row",
          name: "A single row",
          description: "Values must not come back twice.",
          code: `const got = spiralOrder([[1, 2, 3]]);
if (JSON.stringify(got) !== "[1,2,3]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "single-column",
          name: "A single column",
          code: `const got = spiralOrder([[1], [2], [3]]);
if (JSON.stringify(got) !== "[1,2,3]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "An empty grid",
          code: `if (JSON.stringify(spiralOrder([])) !== "[]") throw new Error("expected []");
if (JSON.stringify(spiralOrder([[]])) !== "[]") throw new Error("expected [] for [[]]");`,
        },
        {
          id: "complete",
          name: "Every value exactly once",
          code: `const grid = Array.from({ length: 4 }, (_, r) =>
  Array.from({ length: 5 }, (_, c) => r * 5 + c),
);
const got = spiralOrder(grid).sort((a, b) => a - b);
const want = Array.from({ length: 20 }, (_, i) => i);
if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error("got " + JSON.stringify(got));`,
        },
      ],
    },
  },
);

const MERGE_SORTED_LISTS = codeChallenge(
  {
    slug: "merge-sorted-lists",
    title: "Merge Sorted Lists",
    difficulty: "Beginner",
    topic: "Two pointers",
    description:
      "Combine two already-sorted lists into one, without sorting again.",
    prompt: [
      "Both inputs are sorted ascending. Return a single sorted list containing everything from both, keeping duplicates.",
      "Concatenating and sorting is O(n log n) and throws away what you already know. Walking both at once is O(n).",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "a", value: "[1, 3, 5]" },
          { name: "b", value: "[2, 4]" },
          { name: "output", value: "[1, 2, 3, 4, 5]", emphasis: true },
        ],
      },
      {
        label: "No overlap",
        fields: [
          { name: "a", value: "[1, 2]" },
          { name: "b", value: "[8, 9]" },
          { name: "output", value: "[1, 2, 8, 9]", emphasis: true },
        ],
        note: "One list empties long before the other.",
      },
    ],
    constraints: [
      ["Both lists are sorted ascending"],
      ["Duplicates are kept, including across the two lists"],
      ["Either list may be empty"],
    ],
    solutionNote: [
      "Two indices, always taking the smaller head, then draining whatever is left. The leftovers are the part people forget: the loop stops as soon as either list runs out, and everything still in the other one is already sorted and still has to be appended.",
    ],
  },
  {
    python: {
      signature: "def merge(a: list[int], b: list[int]) -> list[int]",
      starter: `def merge(a: list[int], b: list[int]) -> list[int]:
    out = []
    i = j = 0
    while i < len(a) and j < len(b):
        # Take the smaller head.
        pass
    # Whatever is left in either list is already sorted.
    return out
`,
      solution: `def merge(a: list[int], b: list[int]) -> list[int]:
    out = []
    i = j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out
`,
      tests: [
        {
          id: "interleaved",
          name: "Interleaved values",
          code: `assert merge([1, 3, 5], [2, 4]) == [1, 2, 3, 4, 5], f"got {merge([1, 3, 5], [2, 4])}"`,
        },
        {
          id: "no-overlap",
          name: "No overlap, so one list drains first",
          code: `assert merge([1, 2], [8, 9]) == [1, 2, 8, 9], f"got {merge([1, 2], [8, 9])}"`,
        },
        {
          id: "duplicates",
          name: "Duplicates across both lists are kept",
          code: `assert merge([1, 1], [1]) == [1, 1, 1], f"got {merge([1, 1], [1])}"`,
        },
        {
          id: "empty",
          name: "An empty list on either side",
          code: `assert merge([], [1, 2]) == [1, 2]
assert merge([1, 2], []) == [1, 2]
assert merge([], []) == []`,
        },
        {
          id: "large",
          name: "Two long lists",
          code: `evens = list(range(0, 20000, 2))
odds = list(range(1, 20000, 2))
assert merge(evens, odds) == list(range(20000))`,
        },
      ],
    },
    javascript: {
      signature: "function merge(a: number[], b: number[]): number[]",
      starter: `function merge(a, b) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    // Take the smaller head.
  }
  // Whatever is left in either list is already sorted.
  return out;
}
`,
      solution: `function merge(a, b) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      out.push(a[i]);
      i += 1;
    } else {
      out.push(b[j]);
      j += 1;
    }
  }
  return out.concat(a.slice(i), b.slice(j));
}
`,
      tests: [
        {
          id: "interleaved",
          name: "Interleaved values",
          code: `const got = merge([1, 3, 5], [2, 4]);
if (JSON.stringify(got) !== "[1,2,3,4,5]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "no-overlap",
          name: "No overlap, so one list drains first",
          code: `const got = merge([1, 2], [8, 9]);
if (JSON.stringify(got) !== "[1,2,8,9]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "duplicates",
          name: "Duplicates across both lists are kept",
          code: `const got = merge([1, 1], [1]);
if (JSON.stringify(got) !== "[1,1,1]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "An empty list on either side",
          code: `if (JSON.stringify(merge([], [1, 2])) !== "[1,2]") throw new Error("empty left failed");
if (JSON.stringify(merge([1, 2], [])) !== "[1,2]") throw new Error("empty right failed");
if (JSON.stringify(merge([], [])) !== "[]") throw new Error("both empty failed");`,
        },
        {
          id: "large",
          name: "Two long lists",
          code: `const evens = Array.from({ length: 10000 }, (_, i) => i * 2);
const odds = Array.from({ length: 10000 }, (_, i) => i * 2 + 1);
const got = merge(evens, odds);
if (got.length !== 20000) throw new Error("length " + got.length);
for (let i = 0; i < 20000; i++) {
  if (got[i] !== i) throw new Error("position " + i + " holds " + got[i]);
}`,
        },
      ],
    },
  },
);

const SUBARRAY_SUM_COUNT = codeChallenge(
  {
    slug: "subarray-sum-count",
    title: "Subarrays That Sum to K",
    difficulty: "Advanced",
    topic: "Prefix sums",
    description:
      "Count the contiguous runs that add up to a target, in one pass.",
    prompt: [
      [
        "Count how many contiguous runs of the list add up to ",
        { code: "k" },
        ". Runs that overlap both count, and a run must have at least one element.",
      ],
      "Checking every start and end is O(n²). One pass is enough if you keep track of what you have already added up.",
    ],
    examples: [
      {
        label: "Overlapping runs",
        fields: [
          { name: "nums", value: "[1, 1, 1]" },
          { name: "k", value: "2" },
          { name: "output", value: "2", emphasis: true },
        ],
        note: "Positions 0 and 1, or 1 and 2: both work.",
      },
      {
        label: "With a zero sum",
        fields: [
          { name: "nums", value: "[1, -1, 0]" },
          { name: "k", value: "0" },
          { name: "output", value: "3", emphasis: true },
        ],
        note: "[1,-1], [0] and [1,-1,0].",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(nums) ≤ 10⁵" }],
      ["Values may be negative, so a sliding window will not work"],
      ["Count runs, not the runs themselves"],
    ],
    solutionNote: [
      "Carry a running total, and for each position ask how many earlier positions had a running total of ",
      { code: "total - k" },
      ": each one marks a run ending here that sums to ",
      { code: "k" },
      ". Seeding the map with ",
      { code: "{0: 1}" },
      " is what lets a run starting at position 0 be counted; without it every answer is short by the number of runs that begin at the front.",
    ],
  },
  {
    python: {
      signature: "def count_subarrays(nums: list[int], k: int) -> int",
      starter: `def count_subarrays(nums: list[int], k: int) -> int:
    # One running total seen before anything is added: the empty prefix.
    seen = {0: 1}
    total = 0
    count = 0
    for n in nums:
        # How many earlier prefixes would leave exactly k behind?
        pass
    return count
`,
      solution: `def count_subarrays(nums: list[int], k: int) -> int:
    seen = {0: 1}
    total = 0
    count = 0
    for n in nums:
        total += n
        count += seen.get(total - k, 0)
        seen[total] = seen.get(total, 0) + 1
    return count
`,
      tests: [
        {
          id: "overlapping",
          name: "Overlapping runs both count",
          code: `assert count_subarrays([1, 1, 1], 2) == 2, f"got {count_subarrays([1, 1, 1], 2)}"`,
        },
        {
          id: "from-the-front",
          name: "A run starting at the first element",
          description: "This is the one the empty-prefix seed is for.",
          code: `assert count_subarrays([1, 2, 3], 3) == 2, f"got {count_subarrays([1, 2, 3], 3)}"`,
        },
        {
          id: "negatives",
          name: "Negative values and a target of zero",
          code: `assert count_subarrays([1, -1, 0], 0) == 3, f"got {count_subarrays([1, -1, 0], 0)}"`,
        },
        {
          id: "none",
          name: "No run adds up",
          code: `assert count_subarrays([1, 2, 3], 100) == 0`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `assert count_subarrays([], 0) == 0`,
        },
        {
          id: "large",
          name: "Ten thousand values",
          description: "Checking every start and end would be 100 million sums.",
          code: `nums = [1] * 10000
assert count_subarrays(nums, 1) == 10000, f"got {count_subarrays(nums, 1)}"`,
        },
      ],
    },
    javascript: {
      signature: "function countSubarrays(nums: number[], k: number): number",
      starter: `function countSubarrays(nums, k) {
  // One running total seen before anything is added: the empty prefix.
  const seen = new Map([[0, 1]]);
  let total = 0;
  let count = 0;
  for (const n of nums) {
    // How many earlier prefixes would leave exactly k behind?
  }
  return count;
}
`,
      solution: `function countSubarrays(nums, k) {
  const seen = new Map([[0, 1]]);
  let total = 0;
  let count = 0;
  for (const n of nums) {
    total += n;
    count += seen.get(total - k) ?? 0;
    seen.set(total, (seen.get(total) ?? 0) + 1);
  }
  return count;
}
`,
      tests: [
        {
          id: "overlapping",
          name: "Overlapping runs both count",
          code: `const got = countSubarrays([1, 1, 1], 2);
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "from-the-front",
          name: "A run starting at the first element",
          description: "This is the one the empty-prefix seed is for.",
          code: `const got = countSubarrays([1, 2, 3], 3);
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "negatives",
          name: "Negative values and a target of zero",
          code: `const got = countSubarrays([1, -1, 0], 0);
if (got !== 3) throw new Error("got " + got);`,
        },
        {
          id: "none",
          name: "No run adds up",
          code: `if (countSubarrays([1, 2, 3], 100) !== 0) throw new Error("expected 0");`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `if (countSubarrays([], 0) !== 0) throw new Error("expected 0");`,
        },
        {
          id: "large",
          name: "Ten thousand values",
          description: "Checking every start and end would be 100 million sums.",
          code: `const nums = new Array(10000).fill(1);
const got = countSubarrays(nums, 1);
if (got !== 10000) throw new Error("got " + got);`,
        },
      ],
    },
  },
);

const INNER_JOIN_ROWS = codeChallenge(
  {
    slug: "inner-join-rows",
    title: "Inner Join Two Tables",
    difficulty: "Intermediate",
    topic: "Hash joins",
    description:
      "Join two lists of rows on a shared key, the way a database would.",
    prompt: [
      [
        "Both inputs are lists of ",
        { code: "[key, value]" },
        " rows. Return every combination that shares a key, as ",
        { code: "[key, left_value, right_value]" },
        ", sorted.",
      ],
      "A key on both sides more than once produces every pairing, which is exactly what a SQL inner join does. Scanning the right-hand list once per left row is O(n × m); index it first and the join is O(n + m).",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "left", value: '[["a", "1"], ["b", "2"]]' },
          { name: "right", value: '[["a", "x"], ["c", "y"]]' },
          { name: "output", value: '[["a", "1", "x"]]', emphasis: true },
        ],
        note: 'Only "a" is on both sides.',
      },
      {
        label: "Fan-out",
        fields: [
          { name: "left", value: '[["a", "1"]]' },
          { name: "right", value: '[["a", "x"], ["a", "y"]]' },
          {
            name: "output",
            value: '[["a", "1", "x"], ["a", "1", "y"]]',
            emphasis: true,
          },
        ],
        note: "One row in, two rows out.",
      },
    ],
    constraints: [
      ["Keys and values are strings"],
      ["Sort the result by key, then left value, then right value"],
      ["A key missing from either side contributes nothing"],
    ],
    solutionNote: [
      "Building a dictionary from the smaller side and probing it once per row of the other is a hash join, and it is what a database does when it cannot use an index. Notice what falls out of it for free: the fan-out when a key repeats is not a special case, it is just a key whose bucket holds more than one row.",
    ],
  },
  {
    python: {
      signature:
        "def inner_join(left: list[list[str]], right: list[list[str]]) -> list[list[str]]",
      starter: `def inner_join(left: list[list[str]], right: list[list[str]]) -> list[list[str]]:
    index = {}
    for key, other in right:
        # Group the right-hand rows by key so each can be found in one step.
        pass
    out = []
    return sorted(out)
`,
      solution: `def inner_join(left: list[list[str]], right: list[list[str]]) -> list[list[str]]:
    index = {}
    for key, other in right:
        index.setdefault(key, []).append(other)
    out = []
    for key, value in left:
        for other in index.get(key, []):
            out.append([key, value, other])
    return sorted(out)
`,
      tests: [
        {
          id: "basic",
          name: "Only shared keys survive",
          code: `got = inner_join([["a", "1"], ["b", "2"]], [["a", "x"], ["c", "y"]])
assert got == [["a", "1", "x"]], f"got {got}"`,
        },
        {
          id: "fan-out",
          name: "A repeated key on the right fans out",
          code: `got = inner_join([["a", "1"]], [["a", "x"], ["a", "y"]])
assert got == [["a", "1", "x"], ["a", "1", "y"]], f"got {got}"`,
        },
        {
          id: "both-sides",
          name: "Repeated on both sides gives every pairing",
          code: `got = inner_join([["a", "1"], ["a", "2"]], [["a", "x"], ["a", "y"]])
assert len(got) == 4, f"expected 4 rows, got {got}"
assert got[0] == ["a", "1", "x"], f"got {got[0]}"`,
        },
        {
          id: "no-match",
          name: "Nothing in common",
          code: `assert inner_join([["a", "1"]], [["b", "x"]]) == []`,
        },
        {
          id: "empty",
          name: "An empty side",
          code: `assert inner_join([], [["a", "x"]]) == []
assert inner_join([["a", "1"]], []) == []`,
        },
        {
          id: "large",
          name: "Ten thousand rows a side",
          description: "A scan per row would be 100 million comparisons.",
          code: `left = [["k" + str(i), "l"] for i in range(10000)]
right = [["k" + str(i), "r"] for i in range(10000)]
got = inner_join(left, right)
assert len(got) == 10000, f"got {len(got)} rows"`,
        },
      ],
    },
    javascript: {
      signature:
        "function innerJoin(left: [string, string][], right: [string, string][]): string[][]",
      starter: `function innerJoin(left, right) {
  const index = new Map();
  for (const [key, other] of right) {
    // Group the right-hand rows by key so each can be found in one step.
  }
  const out = [];
  return out.sort(compareRows);
}

function compareRows(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}
`,
      solution: `function innerJoin(left, right) {
  const index = new Map();
  for (const [key, other] of right) {
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(other);
  }
  const out = [];
  for (const [key, value] of left) {
    for (const other of index.get(key) ?? []) {
      out.push([key, value, other]);
    }
  }
  return out.sort(compareRows);
}

function compareRows(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}
`,
      tests: [
        {
          id: "basic",
          name: "Only shared keys survive",
          code: `const got = innerJoin([["a", "1"], ["b", "2"]], [["a", "x"], ["c", "y"]]);
if (JSON.stringify(got) !== '[["a","1","x"]]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "fan-out",
          name: "A repeated key on the right fans out",
          code: `const got = innerJoin([["a", "1"]], [["a", "x"], ["a", "y"]]);
if (JSON.stringify(got) !== '[["a","1","x"],["a","1","y"]]') {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "both-sides",
          name: "Repeated on both sides gives every pairing",
          code: `const got = innerJoin([["a", "1"], ["a", "2"]], [["a", "x"], ["a", "y"]]);
if (got.length !== 4) throw new Error("expected 4 rows, got " + JSON.stringify(got));
if (JSON.stringify(got[0]) !== '["a","1","x"]') throw new Error("got " + JSON.stringify(got[0]));`,
        },
        {
          id: "no-match",
          name: "Nothing in common",
          code: `const got = innerJoin([["a", "1"]], [["b", "x"]]);
if (JSON.stringify(got) !== "[]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "An empty side",
          code: `if (JSON.stringify(innerJoin([], [["a", "x"]])) !== "[]") throw new Error("empty left failed");
if (JSON.stringify(innerJoin([["a", "1"]], [])) !== "[]") throw new Error("empty right failed");`,
        },
        {
          id: "large",
          name: "Ten thousand rows a side",
          description: "A scan per row would be 100 million comparisons.",
          code: `const left = Array.from({ length: 10000 }, (_, i) => ["k" + i, "l"]);
const right = Array.from({ length: 10000 }, (_, i) => ["k" + i, "r"]);
const got = innerJoin(left, right);
if (got.length !== 10000) throw new Error("got " + got.length + " rows");`,
        },
      ],
    },
  },
);

const TOPOLOGICAL_ORDER = codeChallenge(
  {
    slug: "topological-order",
    title: "Topological Order",
    difficulty: "Advanced",
    topic: "Graphs",
    description:
      "Order tasks so that every dependency comes before the thing that needs it.",
    prompt: [
      [
        "Given node names and ",
        { code: "[before, after]" },
        " edges, return an order in which every node appears after everything it depends on.",
      ],
      [
        "Where several nodes are ready at once, take the alphabetically first, so the answer is deterministic. When the dependencies form a cycle no order exists: return an empty list.",
      ],
    ],
    examples: [
      {
        label: "A diamond",
        fields: [
          { name: "nodes", value: '["a", "b", "c", "d"]' },
          {
            name: "edges",
            value: '[["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"]]',
          },
          { name: "output", value: '["a", "b", "c", "d"]', emphasis: true },
        ],
        note: "b and c are both ready after a; b goes first alphabetically.",
      },
      {
        label: "A cycle",
        fields: [
          { name: "nodes", value: '["a", "b"]' },
          { name: "edges", value: '[["a", "b"], ["b", "a"]]' },
          { name: "output", value: "[]", emphasis: true },
        ],
        note: "Neither can go first, so there is no order.",
      },
    ],
    constraints: [
      ["Every name in an edge is also in the node list"],
      ["Break ties alphabetically"],
      ["A cycle returns an empty list"],
    ],
    solutionNote: [
      "Count how many things each node is waiting on, start with the ones waiting on nothing, and each time you place a node decrement its dependants. The cycle check is the elegant part: nodes inside a cycle never reach a count of zero, so if the order is shorter than the node list, something is stuck; no separate cycle detection pass needed.",
    ],
  },
  {
    python: {
      signature:
        "def topological_order(nodes: list[str], edges: list[list[str]]) -> list[str]",
      starter: `def topological_order(nodes: list[str], edges: list[list[str]]) -> list[str]:
    waiting_on = {node: 0 for node in nodes}
    unlocks = {node: [] for node in nodes}
    for before, after in edges:
        # Record the dependency in both directions.
        pass
    ready = sorted(node for node in nodes if waiting_on[node] == 0)
    order = []
    return order
`,
      solution: `def topological_order(nodes: list[str], edges: list[list[str]]) -> list[str]:
    waiting_on = {node: 0 for node in nodes}
    unlocks = {node: [] for node in nodes}
    for before, after in edges:
        unlocks[before].append(after)
        waiting_on[after] += 1
    ready = sorted(node for node in nodes if waiting_on[node] == 0)
    order = []
    while ready:
        node = ready.pop(0)
        order.append(node)
        for nxt in unlocks[node]:
            waiting_on[nxt] -= 1
            if waiting_on[nxt] == 0:
                ready.append(nxt)
                ready.sort()
    return order if len(order) == len(nodes) else []
`,
      tests: [
        {
          id: "chain",
          name: "A straight chain",
          code: `got = topological_order(["c", "b", "a"], [["a", "b"], ["b", "c"]])
assert got == ["a", "b", "c"], f"got {got}"`,
        },
        {
          id: "diamond",
          name: "A diamond, with an alphabetical tie-break",
          code: `got = topological_order(
    ["a", "b", "c", "d"],
    [["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"]],
)
assert got == ["a", "b", "c", "d"], f"got {got}"`,
        },
        {
          id: "no-edges",
          name: "No dependencies at all",
          description: "Everything is ready, so the order is alphabetical.",
          code: `got = topological_order(["c", "a", "b"], [])
assert got == ["a", "b", "c"], f"got {got}"`,
        },
        {
          id: "cycle",
          name: "A cycle has no order",
          code: `assert topological_order(["a", "b"], [["a", "b"], ["b", "a"]]) == []`,
        },
        {
          id: "partial-cycle",
          name: "A cycle anywhere spoils the whole order",
          code: `got = topological_order(["a", "b", "c"], [["a", "b"], ["b", "c"], ["c", "b"]])
assert got == [], f"got {got}"`,
        },
        {
          id: "single",
          name: "A single node",
          code: `assert topological_order(["only"], []) == ["only"]
assert topological_order([], []) == []`,
        },
      ],
    },
    javascript: {
      signature:
        "function topologicalOrder(nodes: string[], edges: [string, string][]): string[]",
      starter: `function topologicalOrder(nodes, edges) {
  const waitingOn = new Map(nodes.map((n) => [n, 0]));
  const unlocks = new Map(nodes.map((n) => [n, []]));
  for (const [before, after] of edges) {
    // Record the dependency in both directions.
  }
  const ready = nodes.filter((n) => waitingOn.get(n) === 0).sort();
  const order = [];
  return order;
}
`,
      solution: `function topologicalOrder(nodes, edges) {
  const waitingOn = new Map(nodes.map((n) => [n, 0]));
  const unlocks = new Map(nodes.map((n) => [n, []]));
  for (const [before, after] of edges) {
    unlocks.get(before).push(after);
    waitingOn.set(after, waitingOn.get(after) + 1);
  }
  const ready = nodes.filter((n) => waitingOn.get(n) === 0).sort();
  const order = [];
  while (ready.length > 0) {
    const node = ready.shift();
    order.push(node);
    for (const next of unlocks.get(node)) {
      waitingOn.set(next, waitingOn.get(next) - 1);
      if (waitingOn.get(next) === 0) {
        ready.push(next);
        ready.sort();
      }
    }
  }
  return order.length === nodes.length ? order : [];
}
`,
      tests: [
        {
          id: "chain",
          name: "A straight chain",
          code: `const got = topologicalOrder(["c", "b", "a"], [["a", "b"], ["b", "c"]]);
if (JSON.stringify(got) !== '["a","b","c"]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "diamond",
          name: "A diamond, with an alphabetical tie-break",
          code: `const got = topologicalOrder(
  ["a", "b", "c", "d"],
  [["a", "b"], ["a", "c"], ["b", "d"], ["c", "d"]],
);
if (JSON.stringify(got) !== '["a","b","c","d"]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "no-edges",
          name: "No dependencies at all",
          description: "Everything is ready, so the order is alphabetical.",
          code: `const got = topologicalOrder(["c", "a", "b"], []);
if (JSON.stringify(got) !== '["a","b","c"]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "cycle",
          name: "A cycle has no order",
          code: `const got = topologicalOrder(["a", "b"], [["a", "b"], ["b", "a"]]);
if (JSON.stringify(got) !== "[]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "partial-cycle",
          name: "A cycle anywhere spoils the whole order",
          code: `const got = topologicalOrder(["a", "b", "c"], [["a", "b"], ["b", "c"], ["c", "b"]]);
if (JSON.stringify(got) !== "[]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "single",
          name: "A single node",
          code: `if (JSON.stringify(topologicalOrder(["only"], [])) !== '["only"]') {
  throw new Error("single node failed");
}
if (JSON.stringify(topologicalOrder([], [])) !== "[]") throw new Error("empty failed");`,
        },
      ],
    },
  },
);

export const CODE_CLASSICS: Challenge[] = [
  LONGEST_COMMON_PREFIX,
  PRODUCT_EXCEPT_SELF,
  ROTATE_ARRAY,
  COIN_CHANGE,
  SPIRAL_ORDER,
  MERGE_SORTED_LISTS,
  SUBARRAY_SUM_COUNT,
  INNER_JOIN_ROWS,
  TOPOLOGICAL_ORDER,
];
