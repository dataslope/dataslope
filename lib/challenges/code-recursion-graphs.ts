/**
 * Single-step code challenges: recursion, dynamic programming and graphs.
 *
 * What ties these together is that each problem is defined in terms of
 * smaller copies of itself: the ways up a staircase from the ways up shorter
 * ones, a tree's depth from its children's, the edit distance between two
 * strings from the distances between their prefixes, a route through a maze
 * from the routes out of the neighbouring cells. Writing that definition down
 * as a recursive function is the easy half, and the result is usually either
 * correct and exponential or correct and too deep for the call stack. The
 * lesson in each is what to do about it: solve each subproblem once (a table,
 * or a running pair of values), cut the branches that cannot lead anywhere
 * new (backtracking with pruning), or trade the call stack for a stack, queue
 * or heap you manage yourself (flood fill, breadth-first search, union-find,
 * Dijkstra).
 *
 * Most checks include a large case that the naive recursion cannot finish.
 * Where an input is deep enough to run past Python's limit of 1,000 nested
 * calls, the prompt says so, since that is a real constraint of the language
 * rather than a trick.
 *
 * Both languages, graded on one shared set of cases by `dualChallenge`.
 */

import { dualChallenge } from "./authoring";
import type { Value } from "./cases";
import type { Challenge } from "./types";

// ─── Climbing Stairs ─────────────────────────────────────────────────

const CLIMBING_STAIRS = dualChallenge({
  slug: "climbing-stairs",
  title: "Climbing Stairs",
  difficulty: "Beginner",
  topic: "Recurrences",
  description: "Count the ways up a staircase taking one or two steps at a time.",
  prompt: [
    "A staircase has `n` steps, and each move climbs either 1 step or 2. Return the number of different sequences of moves that end exactly on the top step.",
    "Order matters: 1 then 2 and 2 then 1 are different climbs. A staircase of 0 steps has exactly one climb, the one with no moves. `n` goes up to 70, where a recursive answer that splits into two calls at every step makes hundreds of trillions of calls, so work out each count only once.",
  ],
  params: ["n"],
  constraints: [
    "`0 ≤ n ≤ 70`",
    "The answer for `n = 70` is below 2⁵³, so JavaScript numbers hold it exactly",
  ],
  solutionNote:
    "The last move onto step `n` comes from step `n - 1` or from step `n - 2`, so `ways(n) = ways(n - 1) + ways(n - 2)`: the Fibonacci recurrence, starting from `ways(0) = ways(1) = 1`. As plain recursion it solves the same smaller staircases again and again, exponentially often; a loop that carries the counts forward from the bottom does it in `n` additions.",
  python: {
    fn: "climb_stairs",
    signature: "def climb_stairs(n: int) -> int",
    starter: `def climb_stairs(n: int) -> int:
    # The last move lands from one step below or from two steps below.
    return 0
`,
    solution: `def climb_stairs(n: int) -> int:
    ways, next_ways = 1, 1  # climbs of 0 steps and of 1 step
    for _ in range(n):
        ways, next_ways = next_ways, ways + next_ways
    return ways
`,
  },
  javascript: {
    fn: "climbStairs",
    signature: "function climbStairs(n: number): number",
    starter: `function climbStairs(n) {
  // The last move lands from one step below or from two steps below.
  return 0;
}
`,
    solution: `function climbStairs(n) {
  const ways = [1, 1]; // climbs of 0 steps and of 1 step
  for (let step = 2; step <= n; step++) {
    ways[step] = ways[step - 1] + ways[step - 2];
  }
  return ways[n];
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Three steps",
      args: [3],
      expected: 3,
      example: "1+1+1, 1+2 and 2+1.",
    },
    {
      id: "example2",
      name: "Five steps",
      args: [5],
      expected: 8,
      example: "Eight different orders of 1s and 2s that add up to 5.",
    },
    {
      id: "zero",
      name: "No steps at all",
      description: "The empty climb is the one way to do it.",
      args: [0],
      expected: 1,
    },
    { id: "one", name: "A single step", args: [1], expected: 1 },
    { id: "two", name: "Two steps", args: [2], expected: 2 },
    { id: "ten", name: "Ten steps", args: [10], expected: 89 },
    {
      id: "large",
      name: "Seventy steps",
      description: "Plain recursion makes hundreds of trillions of calls here.",
      args: [70],
      expected: 308061521170129,
    },
  ],
});

// ─── Flatten Nested Lists ────────────────────────────────────────────

/** `[1, [2, [3, … [60, []]]]]`: sixty levels, one number on each. */
const SIXTY_DEEP = Array.from({ length: 60 }, (_, i) => 60 - i).reduce<Value[]>(
  (inner, n) => [n, inner],
  [],
);

const FLATTEN_DEEP = dualChallenge({
  slug: "flatten-deep",
  title: "Flatten Nested Lists",
  difficulty: "Beginner",
  topic: "Recursion",
  description: "Unpack lists nested to any depth into one flat list of numbers.",
  prompt: [
    "Given a list whose elements are numbers or further lists (which hold numbers or lists of their own, to any depth), return one flat list of all the numbers, in the order they appear reading left to right.",
    "Unlike flattening a single level, this goes all the way down. Empty lists, at any depth, contribute nothing. Return a new list and leave the input as it was.",
  ],
  params: ["items"],
  constraints: [
    "Every element is a number or a list",
    "Nesting is at most 100 levels deep",
    "At most 10⁴ numbers in total",
  ],
  solutionNote:
    "Treat every element the same way: a number goes straight to the output, and a list is flattened by the very same function before its numbers are added. Nested loops can only unpack as many levels as there are loops, so they pass the shallow examples and leave the next level still nested; the recursion has no such limit, because each call handles one level and hands the rest down.",
  python: {
    fn: "flatten_deep",
    signature: "def flatten_deep(items: list) -> list[int | float]",
    starter: `def flatten_deep(items: list) -> list[int | float]:
    out = []
    for item in items:
        # A number goes straight in; a list needs flattening first.
        out.append(item)
    return out
`,
    solution: `def flatten_deep(items: list) -> list[int | float]:
    out = []

    def walk(values: list) -> None:
        for value in values:
            if isinstance(value, list):
                walk(value)
            else:
                out.append(value)

    walk(items)
    return out
`,
  },
  javascript: {
    fn: "flattenDeep",
    signature: "function flattenDeep(items: unknown[]): number[]",
    starter: `function flattenDeep(items) {
  // A number goes straight in; a nested array needs flattening first.
  return [...items];
}
`,
    solution: `function flattenDeep(items) {
  // items.flat(Infinity) is the built-in; spelled out, it is this recursion.
  return items.flatMap((item) => (Array.isArray(item) ? flattenDeep(item) : [item]));
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Four levels deep",
      args: [[1, [2, [3, [4]], 5]]],
      expected: [1, 2, 3, 4, 5],
      example: "Each level is unpacked where it sits, so the order is unchanged.",
    },
    {
      id: "example2",
      name: "Empty lists vanish",
      args: [[[], [[]], 6, [[], [7]]]],
      expected: [6, 7],
      example: "Empty lists, however deep, leave nothing behind.",
    },
    {
      id: "flat",
      name: "An already flat list",
      args: [[3, 1, 2]],
      expected: [3, 1, 2],
    },
    { id: "empty", name: "An empty list", args: [[]], expected: [] },
    {
      id: "signs",
      name: "Zero, negatives and decimals",
      args: [[0, [-4, [2.5]], -1]],
      expected: [0, -4, 2.5, -1],
    },
    {
      id: "deep",
      name: "Sixty levels deep",
      description: "One number on each level, and an empty list at the bottom.",
      args: [SIXTY_DEEP],
      expected: Array.from({ length: 60 }, (_, i) => i + 1),
    },
    {
      id: "unchanged",
      name: "Leaves the input unchanged",
      description: "The nested lists are still nested after the call.",
      args: [[1, [2, 3], [[4]]]],
      expected: [1, 2, 3, 4],
      noMutation: true,
    },
  ],
});

// ─── Depth of a Nested Tree ──────────────────────────────────────────

/** One tree node, in the `{"name", "children"}` shape the prompt describes. */
const node = (name: string, ...children: Value[]): Value => ({ name, children });

/** A single path of sixty nodes, `level 1` down to `level 60`. */
const SIXTY_CHAIN = Array.from({ length: 60 }, (_, i) => 60 - i).reduce<Value | null>(
  (below, level) => (below ? node(`level ${level}`, below) : node(`level ${level}`)),
  null,
) as Value;

const TREE_DEPTH = dualChallenge({
  slug: "tree-depth",
  title: "Depth of a Nested Tree",
  difficulty: "Beginner",
  topic: "Recursion on nested data",
  description: "Measure how many levels a tree of nested dictionaries goes down.",
  prompt: [
    'A tree is stored as nested dictionaries (objects, in JavaScript): each node is `{"name": ..., "children": [...]}`, and `children` is a list of nodes of the same shape, empty for a leaf. Return the depth of the tree: the number of nodes on the longest path from the root down to a leaf.',
    "Count nodes, not edges, so a lone root has depth 1. The deepest branch can be anywhere, including under the last child of the last child, so every branch has to be measured.",
  ],
  params: ["tree"],
  constraints: [
    "The tree always has at least its root",
    "`children` is always present, and empty for a leaf",
    "At most 200 levels and 10⁴ nodes",
  ],
  solutionNote:
    "A node's depth is one more than the depth of its deepest child, and a leaf's depth is 1; that sentence is the whole function, with `max` over the children doing the comparing. The two usual slips are counting edges instead of nodes, which scores a lone root 0, and taking the maximum of no children at a leaf, which raises in Python and gives `-Infinity` from `Math.max()` in JavaScript.",
  python: {
    fn: "tree_depth",
    signature: "def tree_depth(tree: dict) -> int",
    starter: `def tree_depth(tree: dict) -> int:
    # One for this node, plus the depth of its deepest child.
    return 1
`,
    solution: `def tree_depth(tree: dict) -> int:
    return 1 + max((tree_depth(child) for child in tree["children"]), default=0)
`,
  },
  javascript: {
    fn: "treeDepth",
    signature:
      "function treeDepth(tree: { name: string; children: object[] }): number",
    starter: `function treeDepth(tree) {
  // One for this node, plus the depth of its deepest child.
  return 1;
}
`,
    solution: `function treeDepth(tree) {
  // Math.max() of nothing is -Infinity, so the 0 is what makes a leaf 1.
  return 1 + Math.max(0, ...tree.children.map((child) => treeDepth(child)));
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Three levels",
      args: [node("root", node("a", node("a1")), node("b"))],
      expected: 3,
      example: "root, a, a1 is the longest path: three nodes.",
    },
    {
      id: "example2",
      name: "A lone root",
      args: [node("root")],
      expected: 1,
      example: "One node is one level.",
    },
    {
      id: "star",
      name: "Every child is a leaf",
      args: [node("team", node("ana"), node("ben"), node("cy"), node("dee"))],
      expected: 2,
    },
    {
      id: "last",
      name: "The deepest branch is the last one",
      args: [
        node(
          "home",
          node("notes.txt"),
          node("music"),
          node("docs", node("2024", node("taxes", node("receipts.pdf")))),
        ),
      ],
      expected: 5,
    },
    {
      id: "middle",
      name: "The deepest branch is in the middle",
      description: "Deeper than the first child, and the last child is a leaf.",
      args: [
        node(
          "r",
          node("a", node("a1")),
          node("b", node("b1", node("b2"))),
          node("c"),
        ),
      ],
      expected: 4,
    },
    {
      id: "chain",
      name: "Sixty levels in a single path",
      args: [SIXTY_CHAIN],
      expected: 60,
    },
  ],
});

// ─── Non-Adjacent Maximum ────────────────────────────────────────────

const HOUSE_ROBBER = dualChallenge({
  slug: "house-robber",
  title: "Non-Adjacent Maximum",
  difficulty: "Intermediate",
  topic: "Dynamic programming",
  description: "Pick values for the largest total without ever taking two neighbours.",
  prompt: [
    "Given a list of non-negative integers, choose some of them so that no two chosen values sit next to each other in the list, and return the largest total you can reach. Choosing nothing is allowed, so an empty list gives 0.",
    "Taking every other value is not the answer: sometimes the best choice skips two in a row. The list can hold 100,000 values, so trying every selection is out, and so is a recursion 100,000 calls deep in Python; build the answer in one pass.",
  ],
  params: ["nums"],
  constraints: ["`0 ≤ len(nums) ≤ 10⁵`", "`0 ≤ nums[i] ≤ 10⁴`"],
  solutionNote:
    "Walking left to right, the best total up to each value is either the best total up to the previous value (skip this one) or this value plus the best total up to two back (take it). Those two running numbers are the only history needed, so it is one pass with no table. The alternating shortcut, the larger of the even positions and the odd positions, fails on `[5, 1, 1, 5]`, where the best choice takes both ends.",
  python: {
    fn: "max_non_adjacent",
    signature: "def max_non_adjacent(nums: list[int]) -> int",
    starter: `def max_non_adjacent(nums: list[int]) -> int:
    # At each value: take it (plus the best from two back) or skip it.
    return 0
`,
    solution: `def max_non_adjacent(nums: list[int]) -> int:
    take, skip = 0, 0  # best totals that do / do not use the previous value
    for value in nums:
        take, skip = skip + value, max(take, skip)
    return max(take, skip)
`,
  },
  javascript: {
    fn: "maxNonAdjacent",
    signature: "function maxNonAdjacent(nums: number[]): number",
    starter: `function maxNonAdjacent(nums) {
  // At each value: take it (plus the best from two back) or skip it.
  return 0;
}
`,
    solution: `function maxNonAdjacent(nums) {
  // [best up to two values back, best up to the previous value]
  const [, best] = nums.reduce(
    ([twoBack, oneBack], value) => [oneBack, Math.max(oneBack, twoBack + value)],
    [0, 0],
  );
  return best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Five values",
      args: [[2, 7, 9, 3, 1]],
      expected: 12,
      example: "2 + 9 + 1, and no two of them are neighbours.",
    },
    {
      id: "example2",
      name: "Skipping two in a row",
      args: [[5, 1, 1, 5]],
      expected: 10,
      example: "Both ends. Taking every other value gives only 6.",
    },
    { id: "empty", name: "An empty list", args: [[]], expected: 0 },
    { id: "single", name: "A single value", args: [[4]], expected: 4 },
    {
      id: "pair",
      name: "Two neighbours",
      description: "Only one of them can be taken.",
      args: [[3, 8]],
      expected: 8,
    },
    { id: "zeros", name: "All zeros", args: [[0, 0, 0]], expected: 0 },
    {
      id: "large",
      name: "A hundred thousand values",
      description:
        "Trying every selection is hopeless here, and a recursion this deep overflows Python's call stack.",
      pyArgs: "[(i * 37 + 11) % 101 for i in range(100000)]",
      jsArgs: "Array.from({ length: 100000 }, (_, i) => (i * 37 + 11) % 101)",
      expected: 3003960,
    },
  ],
});

// ─── Paths Through a Grid ────────────────────────────────────────────

const GRID_PATHS = dualChallenge({
  slug: "grid-paths",
  title: "Paths Through a Grid",
  difficulty: "Intermediate",
  topic: "Grid dynamic programming",
  description: "Count the right-and-down routes across a grid that avoid blocked cells.",
  prompt: [
    "A grid is a list of rows in which `0` is an open cell and `1` is blocked. Starting in the top-left cell you may move only right or down, one cell at a time, and never onto a blocked cell. Return how many different routes reach the bottom-right cell.",
    "If the start or the end is blocked there are no routes, so return 0. A 1 × 1 open grid has one route: you are already there. Grids go up to 28 × 28, where there can be tens of trillions of routes, so count them without walking each one.",
  ],
  params: ["grid"],
  constraints: [
    "`1 ≤ rows, columns ≤ 28`",
    "Every row has the same length",
    "Answers stay below 2⁵³, so JavaScript numbers are exact",
  ],
  solutionNote:
    "A route into a cell arrives from the cell above it or the cell to its left, so the number of routes to a cell is the sum of those two counts, and a blocked cell holds 0. Filling the grid row by row computes every count once. The classic slip is seeding the whole top row and left column with 1: an obstacle on the edge has to cut off every cell beyond it, not just itself.",
  python: {
    fn: "count_paths",
    signature: "def count_paths(grid: list[list[int]]) -> int",
    starter: `def count_paths(grid: list[list[int]]) -> int:
    # Routes into a cell come from the cell above and the cell to the left.
    return 1
`,
    solution: `def count_paths(grid: list[list[int]]) -> int:
    ways = [0] * len(grid[0])  # routes into each cell of the current row
    ways[0] = 1
    for row in grid:
        for c, blocked in enumerate(row):
            if blocked:
                ways[c] = 0
            elif c > 0:
                ways[c] += ways[c - 1]
    return ways[-1]
`,
  },
  javascript: {
    fn: "countPaths",
    signature: "function countPaths(grid: number[][]): number",
    starter: `function countPaths(grid) {
  // Routes into a cell come from the cell above and the cell to the left.
  return 1;
}
`,
    solution: `function countPaths(grid) {
  const rows = grid.length;
  const cols = grid[0].length;
  const ways = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) continue;
      if (r === 0 && c === 0) ways[r][c] = 1;
      else ways[r][c] = (r > 0 ? ways[r - 1][c] : 0) + (c > 0 ? ways[r][c - 1] : 0);
    }
  }
  return ways[rows - 1][cols - 1];
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A blocked centre",
      args: [
        [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0],
        ],
      ],
      expected: 2,
      example: "Either along the top then down, or down then along the bottom.",
    },
    {
      id: "example2",
      name: "An obstacle on the top edge",
      args: [
        [
          [0, 1, 0],
          [0, 0, 0],
        ],
      ],
      expected: 1,
      example: "The blocked cell cuts off the rest of the top row.",
    },
    { id: "single", name: "A single open cell", args: [[[0]]], expected: 1 },
    {
      id: "start-blocked",
      name: "The start is blocked",
      args: [
        [
          [1, 0],
          [0, 0],
        ],
      ],
      expected: 0,
    },
    {
      id: "end-blocked",
      name: "The end is blocked",
      args: [
        [
          [0, 0],
          [0, 1],
        ],
      ],
      expected: 0,
    },
    {
      id: "diagonal",
      name: "A diagonal wall",
      description: "Right-and-down moves cannot get past it, though cells beyond it are open.",
      args: [
        [
          [0, 0, 1],
          [0, 1, 0],
          [1, 0, 0],
        ],
      ],
      expected: 0,
    },
    {
      id: "large",
      name: "A 28 × 28 grid",
      description: "Walking every route one at a time would take tens of trillions of steps.",
      pyArgs: "[[1 if (r * 3 + c * 5) % 13 == 4 else 0 for c in range(28)] for r in range(28)]",
      jsArgs:
        "Array.from({ length: 28 }, (_, r) => Array.from({ length: 28 }, (_, c) => ((r * 3 + c * 5) % 13 === 4 ? 1 : 0)))",
      expected: 33499850735812,
    },
  ],
});

// ─── Word Break ──────────────────────────────────────────────────────

const WORD_BREAK = dualChallenge({
  slug: "word-break",
  title: "Word Break",
  difficulty: "Intermediate",
  topic: "Dynamic programming over prefixes",
  description: "Decide whether a string splits into a sequence of dictionary words.",
  prompt: [
    "Given a string `s` and a list of dictionary `words`, return whether `s` can be cut into pieces so that every piece is one of the words. A word can be used any number of times, and the pieces must cover `s` completely, in order.",
    "An empty `s` needs no pieces, so it can always be split. Trying every way to cut the string works on short inputs and blows up on long ones: with a dictionary of short runs of `a`, a string of 200 `a`s ending in a `b` can be cut in an astronomical number of ways, and none of them accounts for the `b`.",
  ],
  params: ["s", "words"],
  constraints: [
    "`0 ≤ len(s) ≤ 300`, lowercase letters only",
    "`0 ≤ len(words) ≤ 1000`, each word 1 to 20 lowercase letters",
  ],
  solutionNote:
    "Record, for every prefix of `s`, whether it can be split: the prefix of length `i` can be if some shorter splittable prefix is followed by a dictionary word that ends exactly at `i`. Each prefix is decided once, from answers already recorded, so the work grows only with the length of `s` times the number of words tried at each position. Plain backtracking asks about the same suffix again every time it arrives there by a different route, which is exponential on a long run of `a`s with no way to finish.",
  python: {
    fn: "word_break",
    signature: "def word_break(s: str, words: list[str]) -> bool",
    starter: `def word_break(s: str, words: list[str]) -> bool:
    # Which prefixes of s can already be split into words?
    return False
`,
    solution: `def word_break(s: str, words: list[str]) -> bool:
    vocabulary = set(words)
    lengths = sorted({len(word) for word in vocabulary})
    splittable = [True] + [False] * len(s)  # splittable[i]: can s[:i] be split?
    for end in range(1, len(s) + 1):
        splittable[end] = any(
            size <= end and splittable[end - size] and s[end - size:end] in vocabulary
            for size in lengths
        )
    return splittable[-1]
`,
  },
  javascript: {
    fn: "wordBreak",
    signature: "function wordBreak(s: string, words: string[]): boolean",
    starter: `function wordBreak(s, words) {
  // Which prefixes of s can already be split into words?
  return false;
}
`,
    solution: `function wordBreak(s, words) {
  const vocabulary = new Set(words);
  const deadEnds = new Set(); // positions already known to lead nowhere
  const splitsFrom = (start) => {
    if (start === s.length) return true;
    if (deadEnds.has(start)) return false;
    for (const word of vocabulary) {
      if (s.startsWith(word, start) && splitsFrom(start + word.length)) return true;
    }
    deadEnds.add(start);
    return false;
  };
  return splitsFrom(0);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A word used twice",
      args: ["applepenapple", ["apple", "pen"]],
      expected: true,
      example: "apple + pen + apple.",
    },
    {
      id: "example2",
      name: "Every split leaves a scrap",
      args: ["catsandog", ["cats", "dog", "sand", "and", "cat"]],
      expected: false,
      example: "Both cat + sand and cats + and leave og behind.",
    },
    {
      id: "empty",
      name: "An empty string",
      description: "Zero words cover it.",
      args: ["", ["a"]],
      expected: true,
    },
    {
      id: "no-words",
      name: "An empty dictionary",
      args: ["abc", []],
      expected: false,
    },
    {
      id: "greedy",
      name: "Greedy matching goes wrong",
      description:
        "Taking goals, the longest word that fits, leaves pecial; taking go, the shortest, leaves alspecial. Only goal then special works.",
      args: ["goalspecial", ["go", "goal", "goals", "special"]],
      expected: true,
    },
    {
      id: "adversarial",
      name: "Two hundred a's and a b",
      description: "Backtracking tries an astronomical number of ways to cut the a's before giving up.",
      pyArgs: '"a" * 200 + "b", ["a" * k for k in range(1, 11)]',
      jsArgs: '"a".repeat(200) + "b", Array.from({ length: 10 }, (_, k) => "a".repeat(k + 1))',
      expected: false,
    },
    {
      id: "long-true",
      name: "The same run, with a word that ends it",
      description: "Adding ab to the dictionary makes the long string splittable.",
      pyArgs: '"a" * 200 + "b", ["a" * k for k in range(1, 11)] + ["ab"]',
      jsArgs:
        '"a".repeat(200) + "b", [...Array.from({ length: 10 }, (_, k) => "a".repeat(k + 1)), "ab"]',
      expected: true,
    },
  ],
});

// ─── All Subsets ─────────────────────────────────────────────────────

const ALL_SUBSETS = dualChallenge({
  slug: "all-subsets",
  title: "All Subsets",
  difficulty: "Intermediate",
  topic: "Backtracking",
  description: "List every subset of a set of distinct numbers, in a fixed order.",
  prompt: [
    "Given a list of distinct integers, return every subset of them, including the empty subset and the whole list.",
    "Each subset lists its values in ascending order. The subsets themselves are sorted shortest first, and subsets of the same length are in lexicographic order: compare them value by value, as numbers, and the first difference decides. The input can be in any order and can hold negatives; leave it unmodified.",
  ],
  params: ["nums"],
  constraints: [
    "`0 ≤ len(nums) ≤ 15`",
    "The values are distinct",
    "A list of n values has exactly 2ⁿ subsets",
  ],
  solutionNote:
    "Sort the values, then make one decision per value, in or out; every path through those decisions is a different subset, so there are exactly 2ⁿ of them and nothing to deduplicate. Choosing values in sorted order keeps each subset ascending for free, but the list of subsets still has to come out shortest first, either by sorting it afterwards or by generating one size at a time. In JavaScript every one of those sorts needs a numeric comparator, because the default one compares `10` and `-3` as text.",
  python: {
    fn: "all_subsets",
    signature: "def all_subsets(nums: list[int]) -> list[list[int]]",
    starter: `def all_subsets(nums: list[int]) -> list[list[int]]:
    # Each value is either in a subset or out of it.
    return [[]]
`,
    solution: `def all_subsets(nums: list[int]) -> list[list[int]]:
    values = sorted(nums)
    subsets: list[list[int]] = []
    chosen: list[int] = []

    def decide(i: int) -> None:
        if i == len(values):
            subsets.append(chosen[:])
            return
        chosen.append(values[i])  # values[i] in
        decide(i + 1)
        chosen.pop()  # values[i] out
        decide(i + 1)

    decide(0)
    subsets.sort(key=lambda subset: (len(subset), subset))
    return subsets
`,
  },
  javascript: {
    fn: "allSubsets",
    signature: "function allSubsets(nums: number[]): number[][]",
    starter: `function allSubsets(nums) {
  // Each value is either in a subset or out of it.
  return [[]];
}
`,
    solution: `function allSubsets(nums) {
  const values = [...nums].sort((a, b) => a - b);
  const subsets = [];
  const picked = [];
  // Pick \`size\` values, each after the last one picked: lexicographic order.
  const choose = (size, from) => {
    if (picked.length === size) {
      subsets.push([...picked]);
      return;
    }
    for (let i = from; i <= values.length - (size - picked.length); i++) {
      picked.push(values[i]);
      choose(size, i + 1);
      picked.pop();
    }
  };
  for (let size = 0; size <= values.length; size++) choose(size, 0);
  return subsets;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Three values",
      args: [[1, 2, 3]],
      expected: [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]],
      example: "Shortest first; subsets of equal length in lexicographic order.",
    },
    {
      id: "example2",
      name: "Negatives and two-digit values",
      args: [[10, -3, 2]],
      expected: [[], [-3], [2], [10], [-3, 2], [-3, 10], [2, 10], [-3, 2, 10]],
      example: "Values compare as numbers, so 2 comes before 10.",
    },
    {
      id: "empty",
      name: "No values",
      description: "The empty set still has one subset: itself.",
      args: [[]],
      expected: [[]],
    },
    { id: "single", name: "A single value", args: [[5]], expected: [[], [5]] },
    {
      id: "unchanged",
      name: "Leaves the input unsorted",
      description: "The caller's list keeps its original order.",
      args: [[3, 1, 2]],
      expected: [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]],
      noMutation: true,
    },
    {
      id: "large",
      name: "Twelve values, 4,096 subsets",
      description: "Given in descending order, so nothing arrives pre-sorted.",
      pyArgs: "list(range(12, 0, -1))",
      jsArgs: "Array.from({ length: 12 }, (_, i) => 12 - i)",
      // Built independently of any backtracking: one subset per bitmask.
      pyExpected:
        "sorted(([v for v in range(1, 13) if m >> (v - 1) & 1] for m in range(4096)), key=lambda s: (len(s), s))",
      jsExpected: `Array.from({ length: 4096 }, (_, m) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((v) => (m >> (v - 1)) & 1))
  .sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    const i = a.findIndex((x, j) => x !== b[j]);
    return i === -1 ? 0 : a[i] - b[i];
  })`,
    },
  ],
});

// ─── Unique Permutations ─────────────────────────────────────────────

const UNIQUE_PERMUTATIONS = dualChallenge({
  slug: "unique-permutations",
  title: "Unique Permutations",
  difficulty: "Intermediate",
  topic: "Backtracking with duplicates",
  description: "List every distinct ordering of a list that may repeat values.",
  prompt: [
    "Given a list of integers that may contain repeats, return every distinct way to order all of them. Two orderings that differ only by swapping equal values are the same ordering, and it appears once.",
    "Return the orderings in lexicographic order, comparing value by value as numbers. An empty list has exactly one ordering, the empty one. Twelve values can have 479 million orderings and fewer than a thousand distinct ones, so avoid producing the repeats in the first place rather than filtering them out afterwards.",
  ],
  params: ["nums"],
  constraints: [
    "`0 ≤ len(nums) ≤ 12`",
    "At most 10⁴ distinct orderings",
    "`nums` itself is left unchanged",
  ],
  solutionNote:
    "Sort the values, then fill positions left to right, and at each position try each distinct value that still has copies left, never the same value twice at one position. Every ordering is then built exactly once, and they come out in lexicographic order. Generating all n! orderings and removing duplicates afterwards is correct and hopeless: the twelve values in the last check have 479 million orderings and only 924 distinct ones.",
  python: {
    fn: "unique_permutations",
    signature: "def unique_permutations(nums: list[int]) -> list[list[int]]",
    starter: `def unique_permutations(nums: list[int]) -> list[list[int]]:
    # At each position, try each distinct value that still has copies left.
    return [sorted(nums)]
`,
    solution: `from collections import Counter


def unique_permutations(nums: list[int]) -> list[list[int]]:
    left = Counter(nums)  # copies of each value not yet placed
    values = sorted(left)
    orderings: list[list[int]] = []
    current: list[int] = []

    def place() -> None:
        if len(current) == len(nums):
            orderings.append(current[:])
            return
        for value in values:  # each distinct value once per position
            if left[value]:
                left[value] -= 1
                current.append(value)
                place()
                current.pop()
                left[value] += 1

    place()
    return orderings
`,
  },
  javascript: {
    fn: "uniquePermutations",
    signature: "function uniquePermutations(nums: number[]): number[][]",
    starter: `function uniquePermutations(nums) {
  // At each position, try each distinct value that still has copies left.
  return [[...nums].sort((a, b) => a - b)];
}
`,
    solution: `function uniquePermutations(nums) {
  const values = [...nums].sort((a, b) => a - b);
  const used = values.map(() => false);
  const current = [];
  const orderings = [];
  const place = () => {
    if (current.length === values.length) {
      orderings.push([...current]);
      return;
    }
    for (let i = 0; i < values.length; i++) {
      // Of several equal values, only the first unused one may go next.
      if (used[i] || (i > 0 && values[i] === values[i - 1] && !used[i - 1])) continue;
      used[i] = true;
      current.push(values[i]);
      place();
      current.pop();
      used[i] = false;
    }
  };
  place();
  return orderings;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A repeated value",
      args: [[1, 1, 2]],
      expected: [
        [1, 1, 2],
        [1, 2, 1],
        [2, 1, 1],
      ],
      example: "Swapping the two 1s gives nothing new.",
    },
    {
      id: "example2",
      name: "All distinct",
      args: [[3, 1, 2]],
      expected: [
        [1, 2, 3],
        [1, 3, 2],
        [2, 1, 3],
        [2, 3, 1],
        [3, 1, 2],
        [3, 2, 1],
      ],
      example: "Three distinct values have all 3! = 6 orderings.",
    },
    { id: "empty", name: "An empty list", args: [[]], expected: [[]] },
    {
      id: "same",
      name: "Every value the same",
      args: [[7, 7, 7]],
      expected: [[7, 7, 7]],
    },
    {
      id: "numeric",
      name: "Negatives and two-digit values",
      description: "Ordered as numbers, not as text, and the input list is left as it was.",
      args: [[10, -1, 10]],
      expected: [
        [-1, 10, 10],
        [10, -1, 10],
        [10, 10, -1],
      ],
      noMutation: true,
    },
    {
      id: "large",
      name: "Six 1s and six 2s",
      description: "479 million orderings, of which 924 are distinct.",
      pyArgs: "[2, 1] * 6",
      jsArgs: "Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 2 : 1))",
      // Each distinct ordering is a choice of which six positions hold the 1s.
      pyExpected:
        'sorted([1 if m >> i & 1 else 2 for i in range(12)] for m in range(4096) if bin(m).count("1") == 6)',
      jsExpected: `Array.from({ length: 4096 }, (_, m) => m)
  .filter((m) => m.toString(2).split("1").length === 7)
  .map((m) => Array.from({ length: 12 }, (_, i) => ((m >> i) & 1 ? 1 : 2)))
  .sort((a, b) => {
    const i = a.findIndex((x, j) => x !== b[j]);
    return i === -1 ? 0 : a[i] - b[i];
  })`,
    },
  ],
});

// ─── Generate Parentheses ────────────────────────────────────────────

const GENERATE_PARENTHESES = dualChallenge({
  slug: "generate-parentheses",
  title: "Generate Parentheses",
  difficulty: "Intermediate",
  topic: "Backtracking with constraints",
  description: "Produce every balanced arrangement of n pairs of parentheses.",
  prompt: [
    "Return every string of `n` opening and `n` closing parentheses that is balanced: reading left to right, the number of `)` never gets ahead of the number of `(`, and the two are equal at the end.",
    "Return them sorted, with `(` before `)` (their order as characters). `n = 0` gives a list holding one empty string. Generating all 4ⁿ strings of the right length and keeping the balanced ones wastes nearly all the work: at `n = 12` that is almost 17 million candidates for 208,012 answers.",
  ],
  params: ["n"],
  constraints: ["`0 ≤ n ≤ 12`", "Strings are made of `(` and `)` only"],
  solutionNote:
    "Build each string one character at a time and only ever add a character that keeps it valid: `(` while fewer than `n` have been opened, `)` while fewer have been closed than opened. Every branch then ends in a balanced string, so no work is thrown away, and trying `(` before `)` at each position emits the strings already sorted.",
  python: {
    fn: "generate_parentheses",
    signature: "def generate_parentheses(n: int) -> list[str]",
    starter: `def generate_parentheses(n: int) -> list[str]:
    # Add "(" while any are left to open, ")" while one is still open.
    return ["()" * n]
`,
    solution: `def generate_parentheses(n: int) -> list[str]:
    found: list[str] = []

    def grow(prefix: str, opened: int, closed: int) -> None:
        if closed == n:
            found.append(prefix)
            return
        if opened < n:
            grow(prefix + "(", opened + 1, closed)
        if closed < opened:
            grow(prefix + ")", opened, closed + 1)

    grow("", 0, 0)
    return found
`,
    extra: [
      {
        id: "large",
        name: "Twelve pairs, 208,012 strings",
        description: "Filtering all 16.7 million candidate strings is too slow here.",
        code: `got = generate_parentheses(12)
assert len(got) == 208012, f"expected 208012 strings, got {len(got)}"
assert len(set(got)) == len(got), "some strings appear more than once"
assert got == sorted(got), "the strings are not in sorted order"
assert got[0] == "(" * 12 + ")" * 12, f"the first string is {got[0]!r}"
assert got[-1] == "()" * 12, f"the last string is {got[-1]!r}"
assert all(len(s) == 24 and s.count("(") == 12 for s in got), "a string has the wrong length or mix"
for s in got[::997]:
    depth = 0
    for ch in s:
        depth += 1 if ch == "(" else -1
        assert depth >= 0, f"{s!r} is not balanced"`,
      },
    ],
  },
  javascript: {
    fn: "generateParentheses",
    signature: "function generateParentheses(n: number): string[]",
    starter: `function generateParentheses(n) {
  // Add "(" while any are left to open, ")" while one is still open.
  return ["()".repeat(n)];
}
`,
    solution: `function generateParentheses(n) {
  const found = [];
  const chars = [];
  const place = (opened, closed) => {
    if (closed === n) {
      found.push(chars.join(""));
      return;
    }
    if (opened < n) {
      chars.push("(");
      place(opened + 1, closed);
      chars.pop();
    }
    if (closed < opened) {
      chars.push(")");
      place(opened, closed + 1);
      chars.pop();
    }
  };
  place(0, 0);
  return found;
}
`,
    extra: [
      {
        id: "large",
        name: "Twelve pairs, 208,012 strings",
        description: "Filtering all 16.7 million candidate strings is too slow here.",
        code: `const got = generateParentheses(12);
if (got.length !== 208012) throw new Error("expected 208012 strings, got " + got.length);
for (let i = 1; i < got.length; i++) {
  if (got[i - 1] >= got[i]) {
    throw new Error("not sorted and distinct at " + i + ": " + JSON.stringify(got[i - 1]) + " then " + JSON.stringify(got[i]));
  }
}
if (got[0] !== "(".repeat(12) + ")".repeat(12)) throw new Error("the first string is " + JSON.stringify(got[0]));
if (got[got.length - 1] !== "()".repeat(12)) throw new Error("the last string is " + JSON.stringify(got[got.length - 1]));
for (const s of got) {
  if (s.length !== 24) throw new Error(JSON.stringify(s) + " has the wrong length");
}
for (let i = 0; i < got.length; i += 997) {
  let depth = 0;
  for (const ch of got[i]) {
    depth += ch === "(" ? 1 : -1;
    if (depth < 0) throw new Error(JSON.stringify(got[i]) + " is not balanced");
  }
  if (depth !== 0) throw new Error(JSON.stringify(got[i]) + " is not balanced");
}`,
      },
    ],
  },
  cases: [
    {
      id: "example1",
      name: "Three pairs",
      args: [3],
      expected: ["((()))", "(()())", "(())()", "()(())", "()()()"],
      example: "Five balanced strings, sorted with ( before ).",
    },
    {
      id: "example2",
      name: "No pairs",
      args: [0],
      expected: [""],
      example: "One arrangement of nothing: the empty string.",
    },
    { id: "one", name: "One pair", args: [1], expected: ["()"] },
    { id: "two", name: "Two pairs", args: [2], expected: ["(())", "()()"] },
    {
      id: "four",
      name: "Four pairs",
      args: [4],
      expected: [
        "(((())))",
        "((()()))",
        "((())())",
        "((()))()",
        "(()(()))",
        "(()()())",
        "(()())()",
        "(())(())",
        "(())()()",
        "()((()))",
        "()(()())",
        "()(())()",
        "()()(())",
        "()()()()",
      ],
    },
  ],
});

// ─── Count the Islands ───────────────────────────────────────────────

const COUNT_ISLANDS = dualChallenge({
  slug: "count-islands",
  title: "Count the Islands",
  difficulty: "Intermediate",
  topic: "Flood fill",
  description: "Count the separate patches of land in a grid of land and water.",
  prompt: [
    "A map is a grid of `1`s (land) and `0`s (water). An island is a group of land cells joined edge to edge: up, down, left or right. Cells that touch only at a corner are not joined. Return the number of islands.",
    "An empty grid has none. Leave the grid unmodified: it belongs to the caller, so track the cells you have visited separately rather than overwriting land with water. One test map holds a single snaking island of 30,099 cells, far deeper than a recursive flood fill can go (Python stops at 1,000 nested calls), so keep your own stack or queue.",
  ],
  params: ["grid"],
  constraints: [
    "`0 ≤ rows, columns ≤ 300`",
    "Every row has the same length",
    "Every cell is `0` or `1`",
  ],
  solutionNote:
    "Scan every cell, and each land cell not yet visited starts a new island; a flood fill from it then visits everything joined to it, so none of those cells starts another. Keeping the fill's pending cells in a list you push and pop yourself, and the visited cells in a separate set, means neither a thirty-thousand-cell island nor the caller's grid is at risk. Counting runs of land row by row instead miscounts any island shaped like a U.",
  python: {
    fn: "count_islands",
    signature: "def count_islands(grid: list[list[int]]) -> int",
    starter: `def count_islands(grid: list[list[int]]) -> int:
    # Each unvisited land cell starts an island; flood-fill it from there.
    return 0
`,
    solution: `def count_islands(grid: list[list[int]]) -> int:
    rows = len(grid)
    cols = len(grid[0]) if grid else 0
    seen: set[tuple[int, int]] = set()
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != 1 or (r, c) in seen:
                continue
            islands += 1
            seen.add((r, c))
            stack = [(r, c)]
            while stack:
                y, x = stack.pop()
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == 1 and (ny, nx) not in seen:
                        seen.add((ny, nx))
                        stack.append((ny, nx))
    return islands
`,
  },
  javascript: {
    fn: "countIslands",
    signature: "function countIslands(grid: number[][]): number",
    starter: `function countIslands(grid) {
  // Each unvisited land cell starts an island; flood-fill it from there.
  return 0;
}
`,
    solution: `function countIslands(grid) {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  const seen = new Uint8Array(rows * cols); // one flag per cell, row by row
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 1 || seen[r * cols + c]) continue;
      islands++;
      seen[r * cols + c] = 1;
      const queue = [[r, c]];
      for (let head = 0; head < queue.length; head++) {
        const [y, x] = queue[head];
        for (const [ny, nx] of [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]]) {
          if (ny < 0 || ny >= rows || nx < 0 || nx >= cols) continue;
          if (grid[ny][nx] !== 1 || seen[ny * cols + nx]) continue;
          seen[ny * cols + nx] = 1;
          queue.push([ny, nx]);
        }
      }
    }
  }
  return islands;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Three islands",
      args: [
        [
          [1, 1, 0, 0, 0],
          [1, 1, 0, 0, 0],
          [0, 0, 1, 0, 0],
          [0, 0, 0, 1, 1],
        ],
      ],
      expected: 3,
      example: "A 2 × 2 block, a single cell, and a pair.",
    },
    {
      id: "example2",
      name: "Touching at a corner",
      args: [
        [
          [1, 0],
          [0, 1],
        ],
      ],
      expected: 2,
      example: "Diagonal neighbours are separate islands.",
    },
    {
      id: "u-shape",
      name: "One island shaped like a U",
      description:
        "Its two arms look separate until the bottom row joins them. The grid must come back unchanged, too.",
      args: [
        [
          [1, 0, 1],
          [1, 0, 1],
          [1, 1, 1],
        ],
      ],
      expected: 1,
      noMutation: true,
    },
    {
      id: "water",
      name: "Only water",
      args: [
        [
          [0, 0, 0],
          [0, 0, 0],
        ],
      ],
      expected: 0,
    },
    { id: "empty", name: "An empty grid", args: [[]], expected: 0 },
    {
      id: "land",
      name: "All land",
      args: [
        [
          [1, 1, 1],
          [1, 1, 1],
        ],
      ],
      expected: 1,
    },
    {
      id: "large",
      name: "A 300 × 300 map",
      description:
        "One island snakes through 30,099 cells; below it sit 7,500 single-cell islands.",
      pyArgs:
        "[[1 if r % 2 == 0 or c == (299 if r % 4 == 1 else 0) else 0 for c in range(300)] if r < 199 else [1 if r >= 200 and r % 2 == 0 and c % 2 == 0 else 0 for c in range(300)] for r in range(300)]",
      jsArgs:
        "Array.from({ length: 300 }, (_, r) => Array.from({ length: 300 }, (_, c) => r < 199 ? (r % 2 === 0 || c === (r % 4 === 1 ? 299 : 0) ? 1 : 0) : r >= 200 && r % 2 === 0 && c % 2 === 0 ? 1 : 0))",
      expected: 7501,
    },
  ],
});

// ─── Shortest Path Through a Maze ────────────────────────────────────

const MAZE_SHORTEST_PATH = dualChallenge({
  slug: "maze-shortest-path",
  title: "Shortest Path Through a Maze",
  difficulty: "Intermediate",
  topic: "Breadth-first search on grids",
  description: "Find the fewest steps from the start to the exit of a grid maze.",
  prompt: [
    "A maze is a list of equal-length strings. `S` marks the start, `E` the exit, `#` a wall and `.` open floor. Each step moves one cell up, down, left or right, never onto a wall and never off the grid. Return the smallest number of steps from `S` to `E`, or `-1` when the exit cannot be reached.",
    "The first route a depth-first search stumbles on is usually not the shortest, and trying every route to compare them takes forever on open floor. Explore the maze in order of distance from the start instead.",
  ],
  params: ["maze"],
  constraints: [
    "Exactly one `S` and one `E`",
    "`1 ≤ rows, columns ≤ 200`",
    "`S` and `E` are open floor",
  ],
  solutionNote:
    "Breadth-first search visits cells in order of distance: everything one step from the start, then everything two steps away, so the first time it reaches `E` it has found the shortest route. Mark a cell as seen when it is queued, not when it is taken off the queue, or the same cell is queued once for every neighbour that reaches it. Depth-first search with a visited set finds a route quickly but not the shortest one, and without one it tries every route, which is exponential on open floor.",
  python: {
    fn: "shortest_path",
    signature: "def shortest_path(maze: list[str]) -> int",
    starter: `def shortest_path(maze: list[str]) -> int:
    # Explore in rings: every cell 1 step away, then 2 steps, and so on.
    return -1
`,
    solution: `from collections import deque


def shortest_path(maze: list[str]) -> int:
    rows, cols = len(maze), len(maze[0])
    start = next((r, c) for r, row in enumerate(maze) for c, cell in enumerate(row) if cell == "S")
    steps = {start: 0}
    queue = deque([start])
    while queue:
        r, c = queue.popleft()
        if maze[r][c] == "E":
            return steps[r, c]
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and maze[nr][nc] != "#" and (nr, nc) not in steps:
                steps[nr, nc] = steps[r, c] + 1
                queue.append((nr, nc))
    return -1
`,
  },
  javascript: {
    fn: "shortestPath",
    signature: "function shortestPath(maze: string[]): number",
    starter: `function shortestPath(maze) {
  // Explore in rings: every cell 1 step away, then 2 steps, and so on.
  return -1;
}
`,
    solution: `function shortestPath(maze) {
  const rows = maze.length;
  const cols = maze[0].length;
  // Walls start out "seen", so the search never steps onto one.
  const seen = maze.map((row) => Array.from(row, (cell) => cell === "#"));
  const startRow = maze.findIndex((row) => row.includes("S"));
  const startCol = maze[startRow].indexOf("S");
  seen[startRow][startCol] = true;
  let frontier = [[startRow, startCol]];
  for (let steps = 0; frontier.length > 0; steps++) {
    const next = [];
    for (const [r, c] of frontier) {
      if (maze[r][c] === "E") return steps;
      for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen[nr][nc]) {
          seen[nr][nc] = true;
          next.push([nr, nc]);
        }
      }
    }
    frontier = next;
  }
  return -1;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A small maze",
      args: [["S.#.....", ".##.###.", "....#E..", ".##...#."]],
      expected: 9,
      example: "Down the left side, along the bottom row around the wall, then up into E.",
    },
    {
      id: "example2",
      name: "The exit is walled off",
      args: [["S.#", "..#", "##E"]],
      expected: -1,
      example: "No route reaches E, so the answer is -1.",
    },
    { id: "adjacent", name: "The exit is next door", args: [["SE"]], expected: 1 },
    {
      id: "open",
      name: "Open floor",
      description: "Straight down is 2 steps, however many longer routes there are.",
      args: [["S...", "....", "E..."]],
      expected: 2,
    },
    {
      id: "around",
      name: "Around a wall",
      args: [["E..#", "##.#", "S..."]],
      expected: 6,
    },
    {
      id: "large",
      name: "A 200 × 200 maze",
      description:
        "Fifty bands of open floor joined end to end; the shortest route is 11,847 steps and trying every route never finishes.",
      pyArgs:
        '["".join("S" if (r, c) == (0, 0) else "E" if (r, c) == (199, 0) else "#" if (r % 4 == 3 and c != (199 if r // 4 % 2 == 0 else 0)) or (0 < c < 199 and (r * 5 + c * 3) % 11 == 0) else "." for c in range(200)) for r in range(200)]',
      jsArgs:
        'Array.from({ length: 200 }, (_, r) => Array.from({ length: 200 }, (_, c) => r === 0 && c === 0 ? "S" : r === 199 && c === 0 ? "E" : (r % 4 === 3 && c !== (Math.floor(r / 4) % 2 === 0 ? 199 : 0)) || (c > 0 && c < 199 && (r * 5 + c * 3) % 11 === 0) ? "#" : ".").join(""))',
      expected: 11847,
    },
  ],
});

// ─── Friend Groups ───────────────────────────────────────────────────

const FRIEND_GROUPS = dualChallenge({
  slug: "friend-groups",
  title: "Friend Groups",
  difficulty: "Intermediate",
  topic: "Union-find",
  description: "Count the separate circles of friends, where a friend of a friend is in your circle.",
  prompt: [
    "There are `n` people, numbered `0` to `n - 1`, and a list of friendship `pairs`, each `[a, b]`. Friendship joins groups: when `a` and `b` are friends, everyone in `a`'s group and everyone in `b`'s group form one group. Return how many groups there are.",
    "Someone with no friends is a group of one. A pair can repeat, and a pair can name the same person twice; neither changes anything. With 100,000 people, relabelling every member of a group each time two groups merge is far too slow, and a recursive search runs out of stack following a chain 60,000 friends long.",
  ],
  params: ["n", "pairs"],
  constraints: [
    "`0 ≤ n ≤ 10⁵`",
    "`0 ≤ len(pairs) ≤ 10⁵`",
    "Everyone named in a pair is between `0` and `n - 1`",
  ],
  solutionNote:
    "Give each person a parent pointer, starting at themselves. To find a person's group, follow parents up to the root; to join two groups, point one root at the other, and count a merge only when the two roots differ, so the answer is `n` minus the number of merges. Shortening each path as you walk it and hanging the smaller tree under the larger keep every lookup close to constant time, where relabelling a whole group on every merge is quadratic.",
  python: {
    fn: "friend_groups",
    signature: "def friend_groups(n: int, pairs: list[list[int]]) -> int",
    starter: `def friend_groups(n: int, pairs: list[list[int]]) -> int:
    parent = list(range(n))  # everyone starts as their own group
    # Find each person's root, and join the two roots for every pair.
    return n
`,
    solution: `def friend_groups(n: int, pairs: list[list[int]]) -> int:
    parent = list(range(n))
    size = [1] * n

    def find(person: int) -> int:
        root = person
        while parent[root] != root:
            root = parent[root]
        while parent[person] != root:  # point the whole path at the root
            parent[person], person = root, parent[person]
        return root

    groups = n
    for a, b in pairs:
        root_a, root_b = find(a), find(b)
        if root_a == root_b:
            continue
        if size[root_a] < size[root_b]:
            root_a, root_b = root_b, root_a
        parent[root_b] = root_a  # the smaller group joins the larger
        size[root_a] += size[root_b]
        groups -= 1
    return groups
`,
  },
  javascript: {
    fn: "friendGroups",
    signature: "function friendGroups(n: number, pairs: number[][]): number",
    starter: `function friendGroups(n, pairs) {
  const parent = Array.from({ length: n }, (_, i) => i); // everyone starts alone
  // Find each person's root, and join the two roots for every pair.
  return n;
}
`,
    solution: `function friendGroups(n, pairs) {
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const size = new Int32Array(n).fill(1);
  const find = (person) => {
    while (parent[person] !== person) {
      parent[person] = parent[parent[person]]; // path halving: skip a link
      person = parent[person];
    }
    return person;
  };
  let groups = n;
  for (const [a, b] of pairs) {
    let rootA = find(a);
    let rootB = find(b);
    if (rootA === rootB) continue;
    if (size[rootA] < size[rootB]) [rootA, rootB] = [rootB, rootA];
    parent[rootB] = rootA; // the smaller group joins the larger
    size[rootA] += size[rootB];
    groups--;
  }
  return groups;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two groups",
      args: [
        5,
        [
          [0, 1],
          [1, 2],
          [3, 4],
        ],
      ],
      expected: 2,
      example: "0, 1 and 2 are one group through 1; 3 and 4 are another.",
    },
    {
      id: "example2",
      name: "Nobody has a friend",
      args: [4, []],
      expected: 4,
      example: "Everyone is a group of one.",
    },
    { id: "nobody", name: "No people", args: [0, []], expected: 0 },
    {
      id: "repeats",
      name: "Repeated and one-person pairs",
      description: "Neither a pair listed twice nor a person paired with themselves joins anything new.",
      args: [
        3,
        [
          [0, 1],
          [1, 0],
          [2, 2],
        ],
      ],
      expected: 2,
    },
    {
      id: "late-merge",
      name: "The joining pairs come last",
      description: "Three separate pairs, then two links that chain them into one group.",
      args: [
        6,
        [
          [0, 1],
          [2, 3],
          [4, 5],
          [1, 2],
          [3, 4],
        ],
      ],
      expected: 1,
    },
    {
      id: "large",
      name: "A hundred thousand people",
      description: "A chain of 60,000 friends and 20,000 separate pairs: 20,001 groups.",
      pyArgs:
        "100000, [[i + 1, i] for i in range(59999)] + [[i, i + 1] for i in range(60000, 100000, 2)]",
      jsArgs:
        "100000, Array.from({ length: 59999 }, (_, i) => [i + 1, i]).concat(Array.from({ length: 20000 }, (_, k) => [60000 + 2 * k, 60001 + 2 * k]))",
      expected: 20001,
    },
  ],
});

// ─── Edit Distance ───────────────────────────────────────────────────

const EDIT_DISTANCE = dualChallenge({
  slug: "edit-distance",
  title: "Edit Distance",
  difficulty: "Advanced",
  topic: "2D dynamic programming",
  description: "Count the fewest single-character edits that turn one string into another.",
  prompt: [
    "Return the smallest number of edits that turn string `a` into string `b`, where an edit inserts one character, deletes one character, or replaces one character with another. Every edit costs 1, and characters compare exactly, so `C` and `c` differ.",
    "There is no swap edit: turning `ab` into `ba` takes two. The last check compares two 600-character strings. The plain recursion (match the last characters, or try all three edits) makes an exponential number of calls there, and even a memoized recursion can nest more than 1,000 calls deep, past Python's limit, so fill a table from the empty prefixes upward instead.",
  ],
  params: ["a", "b"],
  constraints: [
    "`0 ≤ len(a), len(b) ≤ 600`",
    "Printable ASCII characters only",
  ],
  solutionNote:
    "Let `d[i][j]` be the distance between the first `i` characters of `a` and the first `j` of `b`. Reaching or leaving an empty string takes one edit per character, so the first row and column count up from 0; after that, `d[i][j]` is `d[i-1][j-1]` when the two characters match, and otherwise 1 plus the smallest of its three neighbours (replace, delete, insert). Each cell is computed once from cells already filled, and only the previous row is ever read, so two rows of memory are enough.",
  python: {
    fn: "edit_distance",
    signature: "def edit_distance(a: str, b: str) -> int",
    starter: `def edit_distance(a: str, b: str) -> int:
    # d[i][j]: the distance between the first i chars of a and the first j of b.
    return abs(len(a) - len(b))
`,
    solution: `def edit_distance(a: str, b: str) -> int:
    previous = list(range(len(b) + 1))  # from the empty prefix of a
    for i, char_a in enumerate(a, start=1):
        current = [i]
        for j, char_b in enumerate(b, start=1):
            if char_a == char_b:
                current.append(previous[j - 1])
            else:
                current.append(1 + min(previous[j - 1], previous[j], current[j - 1]))
        previous = current
    return previous[-1]
`,
  },
  javascript: {
    fn: "editDistance",
    signature: "function editDistance(a: string, b: string): number",
    starter: `function editDistance(a, b) {
  // d[i][j]: the distance between the first i chars of a and the first j of b.
  return Math.abs(a.length - b.length);
}
`,
    solution: `function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]);
    }
  }
  return d[a.length][b.length];
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Kitten to sitting",
      args: ["kitten", "sitting"],
      expected: 3,
      example: "Replace k with s, replace e with i, and insert g at the end.",
    },
    {
      id: "example2",
      name: "Flaw to lawn",
      args: ["flaw", "lawn"],
      expected: 2,
      example: "Delete the f, then insert n at the end.",
    },
    {
      id: "from-empty",
      name: "From an empty string",
      description: "Three insertions.",
      args: ["", "abc"],
      expected: 3,
    },
    {
      id: "to-empty",
      name: "To an empty string",
      description: "Three deletions.",
      args: ["abc", ""],
      expected: 3,
    },
    {
      id: "swap",
      name: "No swap edit",
      description: "Swapping two neighbouring characters costs two replacements.",
      args: ["ab", "ba"],
      expected: 2,
    },
    {
      id: "case",
      name: "Case counts",
      args: ["Cat", "cat"],
      expected: 1,
    },
    {
      id: "identical",
      name: "Identical strings",
      args: ["same", "same"],
      expected: 0,
    },
    {
      id: "large",
      name: "Two 600-character strings",
      description:
        "The plain recursion makes an exponential number of calls; the table has 360,000 cells.",
      pyArgs:
        '"".join("acgt"[(i * i * 7 + i // 3) % 13 % 4] for i in range(600)), "".join("acgt"[(i * i * 5 + i // 2) % 17 % 4] for i in range(600))',
      jsArgs:
        'Array.from({ length: 600 }, (_, i) => "acgt"[((i * i * 7 + Math.floor(i / 3)) % 13) % 4]).join(""), Array.from({ length: 600 }, (_, i) => "acgt"[((i * i * 5 + Math.floor(i / 2)) % 17) % 4]).join("")',
      expected: 348,
    },
  ],
});

// ─── Combination Sum ─────────────────────────────────────────────────

const COMBINATION_SUM = dualChallenge({
  slug: "combination-sum",
  title: "Combination Sum",
  difficulty: "Advanced",
  topic: "Backtracking with pruning",
  description: "Find every combination of candidate values, repeats allowed, that adds up to a target.",
  prompt: [
    "Given a list of distinct positive `candidates` and a positive `target`, return every combination of candidates that adds up to exactly `target`. Each candidate can be used any number of times, and two combinations that use the same values the same number of times are the same combination, whatever the order.",
    "Write each combination in ascending order, and return the list sorted lexicographically, comparing value by value as numbers. Return `[]` when nothing adds up, and leave `candidates` unmodified. This is not about using the fewest values: every combination is wanted, and choosing values in every possible order to find them visits each one many times over.",
  ],
  params: ["candidates", "target"],
  constraints: [
    "`1 ≤ len(candidates) ≤ 30`, values distinct",
    "`1 ≤ candidates[i] ≤ 200` and `1 ≤ target ≤ 200`",
    "At most 10⁴ combinations in the answer",
  ],
  solutionNote:
    "Sort the candidates and build each combination in ascending order by passing down the index to continue from: a value can repeat, but nothing smaller can follow it, so every combination is produced exactly once and already in sorted order. Once a candidate is larger than what is left of the target, every candidate after it is too, so the loop stops there. Trying every candidate at every position instead finds each combination once per ordering: on the last check that is over 53 billion orderings of 26 answers.",
  python: {
    fn: "combination_sum",
    signature: "def combination_sum(candidates: list[int], target: int) -> list[list[int]]",
    starter: `def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    # Build ascending: after choosing a value, choose only it or larger ones.
    return []
`,
    solution: `def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
    values = sorted(candidates)
    found: list[list[int]] = []
    chosen: list[int] = []

    def extend(start: int, remaining: int) -> None:
        if remaining == 0:
            found.append(chosen[:])
            return
        for i in range(start, len(values)):
            if values[i] > remaining:
                break  # every later value is larger still
            chosen.append(values[i])
            extend(i, remaining - values[i])  # i, not i + 1: it may repeat
            chosen.pop()

    extend(0, target)
    return found
`,
  },
  javascript: {
    fn: "combinationSum",
    signature: "function combinationSum(candidates: number[], target: number): number[][]",
    starter: `function combinationSum(candidates, target) {
  // Build ascending: after choosing a value, choose only it or larger ones.
  return [];
}
`,
    solution: `function combinationSum(candidates, target) {
  const values = [...candidates].sort((a, b) => a - b);
  // Every combination adding up to \`left\` that uses only values[from] onward.
  const build = (from, left) => {
    if (left === 0) return [[]];
    const found = [];
    for (let i = from; i < values.length && values[i] <= left; i++) {
      for (const rest of build(i, left - values[i])) found.push([values[i], ...rest]);
    }
    return found;
  };
  return build(0, target);
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Target 7",
      args: [[2, 3, 6, 7], 7],
      expected: [[2, 2, 3], [7]],
      example: "2 is used twice in the first; 7 on its own is the second.",
    },
    {
      id: "example2",
      name: "Target 8",
      args: [[2, 3, 5], 8],
      expected: [
        [2, 2, 2, 2],
        [2, 3, 3],
        [3, 5],
      ],
      example: "Each combination ascending, and the list in lexicographic order.",
    },
    {
      id: "none",
      name: "Nothing adds up",
      description: "Every sum of 4s and 6s is even.",
      args: [[4, 6], 9],
      expected: [],
    },
    {
      id: "too-small",
      name: "The target is below every candidate",
      args: [[5], 3],
      expected: [],
    },
    {
      id: "numeric",
      name: "Unsorted, two-digit candidates",
      description: "Sorted as numbers, 3 before 9 before 12, and the input list is left as it was.",
      args: [[12, 3, 9], 12],
      expected: [[3, 3, 3, 3], [3, 9], [12]],
      noMutation: true,
    },
    {
      id: "large",
      name: "Target 91 from 40, 3 and 2",
      description: "26 combinations, but over 53 billion orderings of them.",
      args: [[40, 3, 2], 91],
      // Every combination is some count of 2s, 3s and 40s.
      pyExpected:
        "sorted([2] * a + [3] * b + [40] * c for a in range(46) for b in range(31) for c in range(3) if 2 * a + 3 * b + 40 * c == 91)",
      jsExpected: `(() => {
  const all = [];
  for (let a = 0; a <= 45; a++) {
    for (let b = 0; b <= 30; b++) {
      for (let c = 0; c <= 2; c++) {
        if (2 * a + 3 * b + 40 * c === 91) {
          all.push([...Array(a).fill(2), ...Array(b).fill(3), ...Array(c).fill(40)]);
        }
      }
    }
  }
  return all.sort((x, y) => {
    const i = x.findIndex((v, j) => v !== y[j]);
    return i === -1 ? 0 : x[i] - y[i];
  });
})()`,
    },
  ],
});

// ─── Cheapest Route ──────────────────────────────────────────────────

const CHEAPEST_ROUTE = dualChallenge({
  slug: "cheapest-route",
  title: "Cheapest Route",
  difficulty: "Advanced",
  topic: "Dijkstra's algorithm",
  description: "Find the lowest total cost between two stops in a network of one-way routes.",
  prompt: [
    "A network has `n` stops, numbered `0` to `n - 1`, and a list of one-way `edges`, each `[from, to, cost]` with a non-negative cost. Return the cheapest total cost of travelling from `source` to `target`, or `-1` if `target` cannot be reached. Travelling from a stop to itself costs 0.",
    "The cheapest route may take more hops than the most direct one, two stops can be joined by several edges with different costs, and a cost can be 0. The largest network has 100,000 stops and over 230,000 edges, where scanning every stop to find the next closest one is quadratic. JavaScript has no built-in priority queue, so part of the job there is writing a small binary heap.",
  ],
  params: ["n", "edges", "source", "target"],
  constraints: [
    "`1 ≤ n ≤ 10⁵`",
    "`0 ≤ len(edges) ≤ 3 × 10⁵`",
    "`0 ≤ cost ≤ 1000`",
    "Edges are one-way: `[a, b, c]` goes from `a` to `b` only",
  ],
  solutionNote:
    "Dijkstra's algorithm settles stops in order of their cost from the source, always expanding the cheapest one not yet settled; with no negative costs, nothing found later can undercut it, so the first time `target` comes off the queue its cost is final. A binary heap makes picking the next stop O(log n) instead of a scan of every stop, and pushing a stop again whenever its cost improves, then skipping the stale entries as they come off, is simpler than updating entries in place. Breadth-first search is the trap: the fewest edges is not the lowest total.",
  python: {
    fn: "cheapest_route",
    signature:
      "def cheapest_route(n: int, edges: list[list[int]], source: int, target: int) -> int",
    starter: `import heapq


def cheapest_route(n: int, edges: list[list[int]], source: int, target: int) -> int:
    # Always expand the cheapest stop not yet settled.
    return -1
`,
    solution: `import heapq


def cheapest_route(n: int, edges: list[list[int]], source: int, target: int) -> int:
    routes: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for start, end, cost in edges:
        routes[start].append((end, cost))
    best = [float("inf")] * n
    best[source] = 0
    queue = [(0, source)]
    while queue:
        cost, stop = heapq.heappop(queue)
        if stop == target:
            return cost
        if cost > best[stop]:
            continue  # a stale entry: this stop was reached more cheaply since
        for nxt, step in routes[stop]:
            if cost + step < best[nxt]:
                best[nxt] = cost + step
                heapq.heappush(queue, (cost + step, nxt))
    return -1
`,
  },
  javascript: {
    fn: "cheapestRoute",
    signature:
      "function cheapestRoute(n: number, edges: number[][], source: number, target: number): number",
    starter: `function cheapestRoute(n, edges, source, target) {
  // Always expand the cheapest stop not yet settled.
  return -1;
}
`,
    solution: `function cheapestRoute(n, edges, source, target) {
  const routes = Array.from({ length: n }, () => []);
  for (const [from, to, cost] of edges) routes[from].push([to, cost]);

  // A binary min-heap of [cost, stop] pairs: heap[i] is never cheaper than
  // its parent, heap[(i - 1) >> 1], so the cheapest pair is always heap[0].
  const heap = [];
  const push = (entry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < heap.length && heap[left][0] < heap[smallest][0]) smallest = left;
        if (right < heap.length && heap[right][0] < heap[smallest][0]) smallest = right;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
      }
    }
    return top;
  };

  const best = new Array(n).fill(Infinity);
  best[source] = 0;
  push([0, source]);
  while (heap.length > 0) {
    const [cost, stop] = pop();
    if (stop === target) return cost;
    if (cost > best[stop]) continue; // stale: reached more cheaply since
    for (const [next, step] of routes[stop]) {
      if (cost + step < best[next]) {
        best[next] = cost + step;
        push([cost + step, next]);
      }
    }
  }
  return -1;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "More hops, lower cost",
      args: [
        4,
        [
          [0, 1, 4],
          [0, 2, 1],
          [2, 1, 2],
          [1, 3, 1],
          [2, 3, 5],
        ],
        0,
        3,
      ],
      expected: 4,
      example: "The route 0, 2, 1, 3 costs 1 + 2 + 1; the two-hop routes cost 5 and 6.",
    },
    {
      id: "example2",
      name: "One-way only",
      args: [3, [[1, 0, 2]], 0, 1],
      expected: -1,
      example: "The only edge runs from 1 to 0, not the other way.",
    },
    {
      id: "same",
      name: "Already there",
      args: [1, [], 0, 0],
      expected: 0,
    },
    {
      id: "greedy",
      name: "The cheapest first edge leads nowhere good",
      description: "Following the cheapest edge out of each stop costs 101; the answer is 10.",
      args: [
        4,
        [
          [0, 1, 1],
          [1, 3, 100],
          [0, 2, 5],
          [2, 3, 5],
        ],
        0,
        3,
      ],
      expected: 10,
    },
    {
      id: "parallel",
      name: "Parallel edges and a free one",
      description: "The cheaper of two edges from 0 to 1, then an edge that costs nothing.",
      args: [
        3,
        [
          [0, 1, 5],
          [0, 1, 2],
          [1, 2, 0],
        ],
        0,
        2,
      ],
      expected: 2,
    },
    {
      id: "cycle",
      name: "A loop on the way",
      description: "Going round the loop never helps, and must not run forever.",
      args: [
        4,
        [
          [0, 1, 1],
          [1, 2, 1],
          [2, 0, 1],
          [2, 3, 10],
        ],
        0,
        3,
      ],
      expected: 12,
    },
    {
      id: "large",
      name: "A hundred thousand stops",
      description:
        "Over 230,000 edges; choosing each next stop by scanning every stop is quadratic.",
      pyArgs:
        "100000, [[i, i + 1, 2 + (i * 7) % 5] for i in range(99998, -1, -1)] + [[i, i + 3, 7 + (i * 11) % 5] for i in range(99996, -1, -1)] + [[i + 1, i, 1] for i in range(0, 99999, 3)], 0, 99999",
      jsArgs:
        "100000, [...Array.from({ length: 99999 }, (_, k) => [99998 - k, 99999 - k, 2 + (((99998 - k) * 7) % 5)]), ...Array.from({ length: 99997 }, (_, k) => [99996 - k, 99999 - k, 7 + (((99996 - k) * 11) % 5)]), ...Array.from({ length: 33333 }, (_, k) => [3 * k + 1, 3 * k, 1])], 0, 99999",
      expected: 299995,
    },
  ],
});

export const CODE_RECURSION_GRAPHS: Challenge[] = [
  CLIMBING_STAIRS,
  FLATTEN_DEEP,
  TREE_DEPTH,
  HOUSE_ROBBER,
  GRID_PATHS,
  WORD_BREAK,
  ALL_SUBSETS,
  UNIQUE_PERMUTATIONS,
  GENERATE_PARENTHESES,
  COUNT_ISLANDS,
  MAZE_SHORTEST_PATH,
  FRIEND_GROUPS,
  EDIT_DISTANCE,
  COMBINATION_SUM,
  CHEAPEST_ROUTE,
];
