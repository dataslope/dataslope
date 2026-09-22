/**
 * Single-step code challenges: reshaping data.
 *
 * Nothing here needs an algorithm you have to recall — the work is putting a
 * collection or a string into a different shape, correctly, including at the
 * edges. That is most of what data code actually does, and the edges are
 * where it usually breaks: an empty input, a last chunk that is short, a
 * bucket with nothing in it, a value of zero that is not the same as missing.
 *
 * Each ships in Python and JavaScript, and
 * `__tests__/challengeSolutions` runs both reference solutions for real.
 */

import { codeChallenge } from "./authoring";
import type { Challenge } from "./types";

const CHUNK_LIST = codeChallenge(
  {
    slug: "chunk-list",
    title: "Chunk a List",
    difficulty: "Beginner",
    topic: "Slicing",
    description: "Split a list into fixed-size pieces, with a short last piece.",
    prompt: [
      "Split a list into consecutive pieces of a given size. The last piece is whatever is left over, so it may be shorter.",
      [
        "A size below 1 has no sensible answer — return an empty list rather than looping forever.",
      ],
    ],
    examples: [
      {
        label: "Uneven split",
        fields: [
          { name: "items", value: "[1, 2, 3, 4, 5]" },
          { name: "size", value: "2" },
          { name: "output", value: "[[1, 2], [3, 4], [5]]", emphasis: true },
        ],
        note: "Five items into pieces of two leaves one over.",
      },
      {
        label: "Size larger than the list",
        fields: [
          { name: "items", value: "[1, 2]" },
          { name: "size", value: "10" },
          { name: "output", value: "[[1, 2]]", emphasis: true },
        ],
        note: "One piece, containing everything.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(items) ≤ 10⁵" }],
      ["The pieces together must contain every item, in order"],
      [{ code: "size < 1" }, " returns an empty list"],
    ],
    solutionNote: [
      "Stepping the range by the chunk size, rather than incrementing by one and tracking a counter, makes the off-by-one impossible: each slice starts exactly where the last one ended, and a slice that runs past the end is simply short.",
    ],
  },
  {
    python: {
      signature: "def chunk(items: list, size: int) -> list[list]",
      starter: `def chunk(items: list, size: int) -> list[list]:
    if size < 1:
        return []
    # Step through the list one chunk at a time.
    return []
`,
      solution: `def chunk(items: list, size: int) -> list[list]:
    if size < 1:
        return []
    return [items[i:i + size] for i in range(0, len(items), size)]
`,
      tests: [
        {
          id: "uneven",
          name: "The last piece may be short",
          code: `got = chunk([1, 2, 3, 4, 5], 2)
assert got == [[1, 2], [3, 4], [5]], f"got {got}"`,
        },
        {
          id: "exact",
          name: "An exact fit",
          code: `assert chunk([1, 2, 3, 4], 2) == [[1, 2], [3, 4]], f"got {chunk([1, 2, 3, 4], 2)}"`,
        },
        {
          id: "oversized",
          name: "A size larger than the list",
          code: `assert chunk([1, 2], 10) == [[1, 2]], f"got {chunk([1, 2], 10)}"`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `assert chunk([], 3) == []`,
        },
        {
          id: "bad-size",
          name: "A size below 1",
          description: "Must return, not loop forever.",
          code: `assert chunk([1, 2, 3], 0) == []
assert chunk([1, 2, 3], -1) == []`,
        },
        {
          id: "large",
          name: "A hundred thousand items",
          code: `got = chunk(list(range(100000)), 1000)
assert len(got) == 100, f"expected 100 chunks, got {len(got)}"
assert got[99] == list(range(99000, 100000))`,
        },
      ],
    },
    javascript: {
      signature: "function chunk(items: unknown[], size: number): unknown[][]",
      starter: `function chunk(items, size) {
  if (size < 1) return [];
  // Step through the list one chunk at a time.
  return [];
}
`,
      solution: `function chunk(items, size) {
  if (size < 1) return [];
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
`,
      tests: [
        {
          id: "uneven",
          name: "The last piece may be short",
          code: `const got = chunk([1, 2, 3, 4, 5], 2);
if (JSON.stringify(got) !== "[[1,2],[3,4],[5]]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "exact",
          name: "An exact fit",
          code: `const got = chunk([1, 2, 3, 4], 2);
if (JSON.stringify(got) !== "[[1,2],[3,4]]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "oversized",
          name: "A size larger than the list",
          code: `const got = chunk([1, 2], 10);
if (JSON.stringify(got) !== "[[1,2]]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `if (JSON.stringify(chunk([], 3)) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "bad-size",
          name: "A size below 1",
          description: "Must return, not loop forever.",
          code: `if (JSON.stringify(chunk([1, 2, 3], 0)) !== "[]") throw new Error("size 0 should be []");
if (JSON.stringify(chunk([1, 2, 3], -1)) !== "[]") throw new Error("negative size should be []");`,
        },
        {
          id: "large",
          name: "A hundred thousand items",
          code: `const items = Array.from({ length: 100000 }, (_, i) => i);
const got = chunk(items, 1000);
if (got.length !== 100) throw new Error("expected 100 chunks, got " + got.length);
if (got[99][999] !== 99999) throw new Error("last chunk ends at " + got[99][999]);`,
        },
      ],
    },
  },
);

const FLATTEN_ONE_LEVEL = codeChallenge(
  {
    slug: "flatten-one-level",
    title: "Flatten One Level",
    difficulty: "Beginner",
    topic: "Nesting",
    description:
      "Concatenate a list of lists into one list, without going deeper than a single level.",
    prompt: [
      "Turn a list of lists into a single list, in order.",
      "Flatten exactly one level: anything nested deeper stays nested. An empty inner list contributes nothing.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "rows", value: "[[1, 2], [3]]" },
          { name: "output", value: "[1, 2, 3]", emphasis: true },
        ],
      },
      {
        label: "Deeper nesting is kept",
        fields: [
          { name: "rows", value: "[[[1]], [2]]" },
          { name: "output", value: "[[1], 2]", emphasis: true },
        ],
        note: "One level off the outside, and no further.",
      },
    ],
    constraints: [
      ["Every element of the outer list is itself a list"],
      ["Order is preserved"],
      ["Empty inner lists simply disappear"],
    ],
    solutionNote: [
      "The one-level restriction is the point. A recursive flatten is a different function with different edge cases, and reaching for it when the data is a list of rows is how a list that happens to contain a list gets silently torn apart.",
    ],
  },
  {
    python: {
      signature: "def flatten(rows: list[list]) -> list",
      starter: `def flatten(rows: list[list]) -> list:
    out = []
    for row in rows:
        # Add this row's items to the output, without recursing.
        pass
    return out
`,
      solution: `def flatten(rows: list[list]) -> list:
    out = []
    for row in rows:
        out.extend(row)
    return out
`,
      tests: [
        {
          id: "basic",
          name: "Two rows become one list",
          code: `assert flatten([[1, 2], [3]]) == [1, 2, 3], f"got {flatten([[1, 2], [3]])}"`,
        },
        {
          id: "one-level",
          name: "Deeper nesting is kept",
          description: "Flattening must stop after one level.",
          code: `assert flatten([[[1]], [2]]) == [[1], 2], f"got {flatten([[[1]], [2]])}"`,
        },
        {
          id: "empty-rows",
          name: "Empty inner lists contribute nothing",
          code: `assert flatten([[1], [], [2]]) == [1, 2], f"got {flatten([[1], [], [2]])}"`,
        },
        {
          id: "empty",
          name: "No rows at all",
          code: `assert flatten([]) == []
assert flatten([[]]) == []`,
        },
        {
          id: "strings",
          name: "Works on any element type",
          code: `assert flatten([["a"], ["b", "c"]]) == ["a", "b", "c"]`,
        },
      ],
    },
    javascript: {
      signature: "function flatten(rows: unknown[][]): unknown[]",
      starter: `function flatten(rows) {
  const out = [];
  for (const row of rows) {
    // Add this row's items to the output, without recursing.
  }
  return out;
}
`,
      solution: `function flatten(rows) {
  const out = [];
  for (const row of rows) {
    out.push(...row);
  }
  return out;
}
`,
      tests: [
        {
          id: "basic",
          name: "Two rows become one list",
          code: `const got = flatten([[1, 2], [3]]);
if (JSON.stringify(got) !== "[1,2,3]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "one-level",
          name: "Deeper nesting is kept",
          description: "Flattening must stop after one level.",
          code: `const got = flatten([[[1]], [2]]);
if (JSON.stringify(got) !== "[[1],2]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty-rows",
          name: "Empty inner lists contribute nothing",
          code: `const got = flatten([[1], [], [2]]);
if (JSON.stringify(got) !== "[1,2]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "No rows at all",
          code: `if (JSON.stringify(flatten([])) !== "[]") throw new Error("expected []");
if (JSON.stringify(flatten([[]])) !== "[]") throw new Error("expected [] for [[]]");`,
        },
        {
          id: "strings",
          name: "Works on any element type",
          code: `const got = flatten([["a"], ["b", "c"]]);
if (JSON.stringify(got) !== '["a","b","c"]') throw new Error("got " + JSON.stringify(got));`,
        },
      ],
    },
  },
);

const PAIRS_TO_GROUPS = codeChallenge(
  {
    slug: "pairs-to-groups",
    title: "Pairs to Groups",
    difficulty: "Beginner",
    topic: "Grouping",
    description: "Collect key–value pairs into one entry per key.",
    prompt: [
      [
        "Given a list of ",
        { code: "[key, value]" },
        " pairs, group the values by key. Return ",
        { code: "[key, values]" },
        " entries sorted by key, with each key's values in the order they appeared.",
      ],
      "Repeated values are kept, not deduplicated. This is a GROUP BY written by hand.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "pairs", value: '[["a", 1], ["b", 2], ["a", 3]]' },
          { name: "output", value: '[["a", [1, 3]], ["b", [2]]]', emphasis: true },
        ],
        note: "Keys sorted; values in the order they arrived.",
      },
      {
        label: "Repeats are kept",
        fields: [
          { name: "pairs", value: '[["x", 1], ["x", 1]]' },
          { name: "output", value: '[["x", [1, 1]]]', emphasis: true },
        ],
      },
    ],
    constraints: [
      ["Keys are strings"],
      ["Sort the result by key"],
      ["Within a key, preserve the input order"],
    ],
    solutionNote: [
      "One pass to build the groups, one sort at the end over the keys only — never a sort of the pairs themselves, which would be more work and would destroy the arrival order you were asked to preserve.",
    ],
  },
  {
    python: {
      signature: "def group_pairs(pairs: list[list]) -> list[list]",
      starter: `def group_pairs(pairs: list[list]) -> list[list]:
    groups = {}
    for key, value in pairs:
        # Append to this key's list, creating it the first time.
        pass
    return []
`,
      solution: `def group_pairs(pairs: list[list]) -> list[list]:
    groups = {}
    for key, value in pairs:
        groups.setdefault(key, []).append(value)
    return [[key, groups[key]] for key in sorted(groups)]
`,
      tests: [
        {
          id: "basic",
          name: "Values collect under their key",
          code: `got = group_pairs([["a", 1], ["b", 2], ["a", 3]])
assert got == [["a", [1, 3]], ["b", [2]]], f"got {got}"`,
        },
        {
          id: "sorted",
          name: "Keys come out sorted",
          code: `got = group_pairs([["z", 1], ["a", 2]])
assert got == [["a", [2]], ["z", [1]]], f"got {got}"`,
        },
        {
          id: "order-kept",
          name: "Values keep their arrival order",
          code: `got = group_pairs([["k", 3], ["k", 1], ["k", 2]])
assert got == [["k", [3, 1, 2]]], f"got {got}"`,
        },
        {
          id: "duplicates",
          name: "Repeated values are kept",
          code: `assert group_pairs([["x", 1], ["x", 1]]) == [["x", [1, 1]]]`,
        },
        {
          id: "empty",
          name: "No pairs",
          code: `assert group_pairs([]) == []`,
        },
      ],
    },
    javascript: {
      signature: "function groupPairs(pairs: [string, unknown][]): [string, unknown[]][]",
      starter: `function groupPairs(pairs) {
  const groups = new Map();
  for (const [key, value] of pairs) {
    // Append to this key's list, creating it the first time.
  }
  return [];
}
`,
      solution: `function groupPairs(pairs) {
  const groups = new Map();
  for (const [key, value] of pairs) {
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  }
  return [...groups.keys()].sort().map((key) => [key, groups.get(key)]);
}
`,
      tests: [
        {
          id: "basic",
          name: "Values collect under their key",
          code: `const got = groupPairs([["a", 1], ["b", 2], ["a", 3]]);
if (JSON.stringify(got) !== '[["a",[1,3]],["b",[2]]]') {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "sorted",
          name: "Keys come out sorted",
          code: `const got = groupPairs([["z", 1], ["a", 2]]);
if (JSON.stringify(got) !== '[["a",[2]],["z",[1]]]') {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "order-kept",
          name: "Values keep their arrival order",
          code: `const got = groupPairs([["k", 3], ["k", 1], ["k", 2]]);
if (JSON.stringify(got) !== '[["k",[3,1,2]]]') {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "duplicates",
          name: "Repeated values are kept",
          code: `const got = groupPairs([["x", 1], ["x", 1]]);
if (JSON.stringify(got) !== '[["x",[1,1]]]') throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "No pairs",
          code: `if (JSON.stringify(groupPairs([])) !== "[]") throw new Error("expected []");`,
        },
      ],
    },
  },
);

const HISTOGRAM_BUCKETS = codeChallenge(
  {
    slug: "histogram-buckets",
    title: "Histogram Buckets",
    difficulty: "Intermediate",
    topic: "Bucketing",
    description:
      "Count values into fixed-width buckets, keeping the empty buckets in the middle.",
    prompt: [
      [
        "Count how many values fall into each bucket of a given width. Buckets start at the smallest value and run until the largest is covered, and each is reported as ",
        { code: "[bucket_start, count]" },
        ".",
      ],
      "A bucket with nothing in it still appears — a histogram that silently drops its empty bars is a lie about the distribution.",
    ],
    examples: [
      {
        label: "With a gap",
        fields: [
          { name: "values", value: "[1, 2, 3, 7]" },
          { name: "width", value: "3" },
          {
            name: "output",
            value: "[[1, 3], [4, 0], [7, 1]]",
            emphasis: true,
          },
        ],
        note: "Nothing falls between 4 and 6, and that bucket still reports 0.",
      },
      {
        label: "Negative values",
        fields: [
          { name: "values", value: "[-5, -1, 0, 4]" },
          { name: "width", value: "5" },
          { name: "output", value: "[[-5, 2], [0, 2]]", emphasis: true },
        ],
      },
    ],
    constraints: [
      ["Values are integers and may be negative"],
      ["A bucket covers ", { code: "start" }, " up to but not including ", { code: "start + width" }],
      ["Empty values, or a width below 1, return an empty list"],
    ],
    solutionNote: [
      "Creating every bucket up front and then filling them is what keeps the empty ones. Building the list from the values you happen to see gives you a histogram with the gaps closed up, which is the same mistake a ",
      { code: "GROUP BY" },
      " makes on a date column with quiet days.",
    ],
  },
  {
    python: {
      signature: "def histogram(values: list[int], width: int) -> list[list[int]]",
      starter: `def histogram(values: list[int], width: int) -> list[list[int]]:
    if not values or width < 1:
        return []
    low = min(values)
    high = max(values)
    # Create every bucket first, then drop the values into them.
    return []
`,
      solution: `def histogram(values: list[int], width: int) -> list[list[int]]:
    if not values or width < 1:
        return []
    low = min(values)
    high = max(values)
    buckets = [[low + i * width, 0] for i in range((high - low) // width + 1)]
    for value in values:
        buckets[(value - low) // width][1] += 1
    return buckets
`,
      tests: [
        {
          id: "gap",
          name: "An empty bucket in the middle is kept",
          code: `got = histogram([1, 2, 3, 7], 3)
assert got == [[1, 3], [4, 0], [7, 1]], f"got {got}"`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `got = histogram([-5, -1, 0, 4], 5)
assert got == [[-5, 2], [0, 2]], f"got {got}"`,
        },
        {
          id: "single-bucket",
          name: "Everything in one bucket",
          code: `assert histogram([1, 2, 3], 10) == [[1, 3]], f"got {histogram([1, 2, 3], 10)}"`,
        },
        {
          id: "width-one",
          name: "A width of one gives a bucket per value",
          code: `got = histogram([1, 3], 1)
assert got == [[1, 1], [2, 0], [3, 1]], f"got {got}"`,
        },
        {
          id: "empty",
          name: "No values, or a width below 1",
          code: `assert histogram([], 5) == []
assert histogram([1, 2], 0) == []`,
        },
      ],
    },
    javascript: {
      signature: "function histogram(values: number[], width: number): number[][]",
      starter: `function histogram(values, width) {
  if (values.length === 0 || width < 1) return [];
  const low = Math.min(...values);
  const high = Math.max(...values);
  // Create every bucket first, then drop the values into them.
  return [];
}
`,
      solution: `function histogram(values, width) {
  if (values.length === 0 || width < 1) return [];
  const low = Math.min(...values);
  const high = Math.max(...values);
  const count = Math.floor((high - low) / width) + 1;
  const buckets = Array.from({ length: count }, (_, i) => [low + i * width, 0]);
  for (const value of values) {
    buckets[Math.floor((value - low) / width)][1] += 1;
  }
  return buckets;
}
`,
      tests: [
        {
          id: "gap",
          name: "An empty bucket in the middle is kept",
          code: `const got = histogram([1, 2, 3, 7], 3);
if (JSON.stringify(got) !== "[[1,3],[4,0],[7,1]]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `const got = histogram([-5, -1, 0, 4], 5);
if (JSON.stringify(got) !== "[[-5,2],[0,2]]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "single-bucket",
          name: "Everything in one bucket",
          code: `const got = histogram([1, 2, 3], 10);
if (JSON.stringify(got) !== "[[1,3]]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "width-one",
          name: "A width of one gives a bucket per value",
          code: `const got = histogram([1, 3], 1);
if (JSON.stringify(got) !== "[[1,1],[2,0],[3,1]]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "No values, or a width below 1",
          code: `if (JSON.stringify(histogram([], 5)) !== "[]") throw new Error("expected []");
if (JSON.stringify(histogram([1, 2], 0)) !== "[]") throw new Error("width 0 should be []");`,
        },
      ],
    },
  },
);

const VALUE_RANGE = codeChallenge(
  {
    slug: "value-range",
    title: "Value Range",
    difficulty: "Beginner",
    topic: "Scanning",
    description: "Report the smallest value, the largest, and the distance between.",
    prompt: [
      [
        "Return ",
        { code: "[minimum, maximum, span]" },
        " for a list of numbers, where the span is the largest minus the smallest.",
      ],
      "An empty list has no range at all, so return an empty list rather than guessing at zeros.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "values", value: "[3, 1, 2]" },
          { name: "output", value: "[1, 3, 2]", emphasis: true },
        ],
      },
      {
        label: "One value",
        fields: [
          { name: "values", value: "[5]" },
          { name: "output", value: "[5, 5, 0]", emphasis: true },
        ],
        note: "A single value is its own minimum and maximum.",
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(values) ≤ 10⁵" }],
      ["Values may be negative"],
      ["An empty list returns an empty list"],
    ],
    solutionNote: [
      "Returning an empty list for empty input rather than ",
      { code: "[0, 0, 0]" },
      " is the whole judgement call here: zero is a real measurement and \"nothing to measure\" is not, and a caller that cannot tell them apart will eventually plot one as the other.",
    ],
  },
  {
    python: {
      signature: "def value_range(values: list[float]) -> list[float]",
      starter: `def value_range(values: list[float]) -> list[float]:
    if not values:
        return []
    # Smallest, largest, and the distance between them.
    return []
`,
      solution: `def value_range(values: list[float]) -> list[float]:
    if not values:
        return []
    low = min(values)
    high = max(values)
    return [low, high, high - low]
`,
      tests: [
        {
          id: "basic",
          name: "An unsorted list",
          code: `assert value_range([3, 1, 2]) == [1, 3, 2], f"got {value_range([3, 1, 2])}"`,
        },
        {
          id: "single",
          name: "A single value",
          code: `assert value_range([5]) == [5, 5, 0], f"got {value_range([5])}"`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `assert value_range([-5, -1]) == [-5, -1, 4], f"got {value_range([-5, -1])}"`,
        },
        {
          id: "empty",
          name: "An empty list has no range",
          description: "Not [0, 0, 0].",
          code: `assert value_range([]) == []`,
        },
        {
          id: "large",
          name: "A hundred thousand values",
          code: `assert value_range(list(range(100000))) == [0, 99999, 99999]`,
        },
      ],
    },
    javascript: {
      signature: "function valueRange(values: number[]): number[]",
      starter: `function valueRange(values) {
  if (values.length === 0) return [];
  // Smallest, largest, and the distance between them.
  return [];
}
`,
      solution: `function valueRange(values) {
  if (values.length === 0) return [];
  let low = values[0];
  let high = values[0];
  for (const value of values) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return [low, high, high - low];
}
`,
      tests: [
        {
          id: "basic",
          name: "An unsorted list",
          code: `const got = valueRange([3, 1, 2]);
if (JSON.stringify(got) !== "[1,3,2]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "single",
          name: "A single value",
          code: `const got = valueRange([5]);
if (JSON.stringify(got) !== "[5,5,0]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "negatives",
          name: "Negative values",
          code: `const got = valueRange([-5, -1]);
if (JSON.stringify(got) !== "[-5,-1,4]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "An empty list has no range",
          description: "Not [0, 0, 0].",
          code: `if (JSON.stringify(valueRange([])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "large",
          name: "A hundred thousand values",
          description: "Math.min(...values) blows the call stack at this size.",
          code: `const values = Array.from({ length: 100000 }, (_, i) => i);
const got = valueRange(values);
if (JSON.stringify(got) !== "[0,99999,99999]") throw new Error("got " + JSON.stringify(got));`,
        },
      ],
    },
  },
);

const NORMALIZE_WHITESPACE = codeChallenge(
  {
    slug: "normalize-whitespace",
    title: "Normalize Whitespace",
    difficulty: "Beginner",
    topic: "Strings",
    description:
      "Collapse every run of whitespace to one space and trim the ends.",
    prompt: [
      "Collapse runs of whitespace — spaces, tabs, newlines — into a single space, and remove any at the start or end.",
      "A string of nothing but whitespace normalizes to an empty string.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "text", value: '"  the   quick\\tfox "' },
          { name: "output", value: '"the quick fox"', emphasis: true },
        ],
      },
      {
        label: "Whitespace only",
        fields: [
          { name: "text", value: '"   "' },
          { name: "output", value: '""', emphasis: true },
        ],
      },
    ],
    constraints: [
      ["Tabs and newlines count as whitespace"],
      ["The result never starts or ends with a space"],
      ["An empty string stays empty"],
    ],
    solutionNote: [
      "Splitting on whitespace and re-joining with a single space does trimming, collapsing and tab handling in one step, because a split with no separator argument treats any run of whitespace as one separator and discards empties at the ends.",
    ],
  },
  {
    python: {
      signature: "def normalize(text: str) -> str",
      starter: `def normalize(text: str) -> str:
    # Splitting on whitespace and rejoining does all three jobs at once.
    return text
`,
      solution: `def normalize(text: str) -> str:
    return " ".join(text.split())
`,
      tests: [
        {
          id: "collapse",
          name: "Runs collapse and the ends are trimmed",
          code: `got = normalize("  the   quick\\tfox ")
assert got == "the quick fox", f"got {got!r}"`,
        },
        {
          id: "newlines",
          name: "Newlines count as whitespace",
          code: `assert normalize("a\\n\\nb") == "a b", f"got {normalize(chr(97) + chr(10) + chr(98))!r}"`,
        },
        {
          id: "already-clean",
          name: "Clean text is unchanged",
          code: `assert normalize("a b c") == "a b c"`,
        },
        {
          id: "whitespace-only",
          name: "Whitespace only becomes empty",
          code: `assert normalize("   ") == ""
assert normalize("") == ""`,
        },
        {
          id: "single-word",
          name: "A single padded word",
          code: `assert normalize("   word   ") == "word"`,
        },
      ],
    },
    javascript: {
      signature: "function normalize(text: string): string",
      starter: `function normalize(text) {
  // Trim the ends, then collapse every run of whitespace.
  return text;
}
`,
      solution: `function normalize(text) {
  return text.trim().replace(/\\s+/g, " ");
}
`,
      tests: [
        {
          id: "collapse",
          name: "Runs collapse and the ends are trimmed",
          code: `const got = normalize("  the   quick\\tfox ");
if (got !== "the quick fox") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "newlines",
          name: "Newlines count as whitespace",
          code: `const got = normalize("a\\n\\nb");
if (got !== "a b") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "already-clean",
          name: "Clean text is unchanged",
          code: `if (normalize("a b c") !== "a b c") throw new Error("got " + normalize("a b c"));`,
        },
        {
          id: "whitespace-only",
          name: "Whitespace only becomes empty",
          code: `if (normalize("   ") !== "") throw new Error("got " + JSON.stringify(normalize("   ")));
if (normalize("") !== "") throw new Error("empty string changed");`,
        },
        {
          id: "single-word",
          name: "A single padded word",
          code: `if (normalize("   word   ") !== "word") throw new Error("got " + normalize("   word   "));`,
        },
      ],
    },
  },
);

const TITLE_CASE = codeChallenge(
  {
    slug: "title-case",
    title: "Title Case",
    difficulty: "Beginner",
    topic: "Strings",
    description:
      "Capitalize the first letter of every word and lowercase the rest.",
    prompt: [
      "Capitalize the first letter of each word and lowercase everything else, with words separated by a single space in the output.",
      "Runs of whitespace in the input count as one separator, and leading or trailing whitespace disappears.",
    ],
    examples: [
      {
        label: "Example 1",
        fields: [
          { name: "text", value: '"hello WORLD"' },
          { name: "output", value: '"Hello World"', emphasis: true },
        ],
        note: "The shouted word is brought back down.",
      },
      {
        label: "Messy spacing",
        fields: [
          { name: "text", value: '"  the   QUICK fox "' },
          { name: "output", value: '"The Quick Fox"', emphasis: true },
        ],
      },
    ],
    constraints: [
      ["Words are separated by whitespace"],
      ["The rest of each word is lowercased, not left alone"],
      ["An empty string stays empty"],
    ],
    solutionNote: [
      "Lowercasing the tail is what separates this from a naive capitalize: leaving it alone turns ",
      { code: '"WORLD"' },
      " into ",
      { code: '"WORLD"' },
      " rather than ",
      { code: '"World"' },
      ", which is exactly the case that shows up in pasted data.",
    ],
  },
  {
    python: {
      signature: "def title_case(text: str) -> str",
      starter: `def title_case(text: str) -> str:
    words = text.split()
    # Capitalize each word, and lowercase the rest of it.
    return " ".join(words)
`,
      solution: `def title_case(text: str) -> str:
    return " ".join(word[:1].upper() + word[1:].lower() for word in text.split())
`,
      tests: [
        {
          id: "basic",
          name: "A shouted word is brought down",
          code: `assert title_case("hello WORLD") == "Hello World", f"got {title_case('hello WORLD')!r}"`,
        },
        {
          id: "spacing",
          name: "Messy spacing is normalized",
          code: `got = title_case("  the   QUICK fox ")
assert got == "The Quick Fox", f"got {got!r}"`,
        },
        {
          id: "mixed",
          name: "Mixed case inside a word",
          code: `assert title_case("mCdOnAlD") == "Mcdonald", f"got {title_case('mCdOnAlD')!r}"`,
        },
        {
          id: "empty",
          name: "Empty and whitespace-only input",
          code: `assert title_case("") == ""
assert title_case("   ") == ""`,
        },
        {
          id: "single-letter",
          name: "Single-letter words",
          code: `assert title_case("a b c") == "A B C", f"got {title_case('a b c')!r}"`,
        },
      ],
    },
    javascript: {
      signature: "function titleCase(text: string): string",
      starter: `function titleCase(text) {
  const words = text.split(/\\s+/).filter(Boolean);
  // Capitalize each word, and lowercase the rest of it.
  return words.join(" ");
}
`,
      solution: `function titleCase(text) {
  return text
    .split(/\\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
`,
      tests: [
        {
          id: "basic",
          name: "A shouted word is brought down",
          code: `const got = titleCase("hello WORLD");
if (got !== "Hello World") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "spacing",
          name: "Messy spacing is normalized",
          code: `const got = titleCase("  the   QUICK fox ");
if (got !== "The Quick Fox") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "mixed",
          name: "Mixed case inside a word",
          code: `const got = titleCase("mCdOnAlD");
if (got !== "Mcdonald") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "Empty and whitespace-only input",
          description: "Splitting an empty string must not produce a stray word.",
          code: `if (titleCase("") !== "") throw new Error("got " + JSON.stringify(titleCase("")));
if (titleCase("   ") !== "") throw new Error("got " + JSON.stringify(titleCase("   ")));`,
        },
        {
          id: "single-letter",
          name: "Single-letter words",
          code: `const got = titleCase("a b c");
if (got !== "A B C") throw new Error("got " + JSON.stringify(got));`,
        },
      ],
    },
  },
);

const IS_PALINDROME = codeChallenge(
  {
    slug: "is-palindrome",
    title: "Palindrome Check",
    difficulty: "Beginner",
    topic: "Two pointers",
    description:
      "Decide whether a phrase reads the same backwards, ignoring case and punctuation.",
    prompt: [
      "Return whether the text reads the same forwards and backwards, considering only letters and digits and ignoring case.",
      "An empty string, or one with no letters or digits at all, counts as a palindrome.",
    ],
    examples: [
      {
        label: "A phrase",
        fields: [
          { name: "text", value: '"A man, a plan, a canal: Panama"' },
          { name: "output", value: "True", emphasis: true },
        ],
        note: "Punctuation and case are ignored.",
      },
      {
        label: "Not a palindrome",
        fields: [
          { name: "text", value: '"race a car"' },
          { name: "output", value: "False", emphasis: true },
        ],
      },
    ],
    constraints: [
      [{ code: "0 ≤ len(text) ≤ 10⁵" }],
      ["Only letters and digits count"],
      ["Comparison ignores case"],
    ],
    solutionNote: [
      "Filtering to the characters that matter first, then comparing the result to its reverse, is the version you can read. The two-pointer walk that skips junk in place saves the copy and is worth writing once you have this working — but it is three chances to get an index wrong, and this is not where you want them.",
    ],
  },
  {
    python: {
      signature: "def is_palindrome(text: str) -> bool",
      starter: `def is_palindrome(text: str) -> bool:
    kept = [ch.lower() for ch in text if ch.isalnum()]
    # Does it read the same backwards?
    return True
`,
      solution: `def is_palindrome(text: str) -> bool:
    kept = [ch.lower() for ch in text if ch.isalnum()]
    return kept == kept[::-1]
`,
      tests: [
        {
          id: "phrase",
          name: "A phrase with punctuation",
          code: `assert is_palindrome("A man, a plan, a canal: Panama") is True`,
        },
        {
          id: "not",
          name: "Not a palindrome",
          code: `assert is_palindrome("race a car") is False`,
        },
        {
          id: "digits",
          name: "Digits count",
          code: `assert is_palindrome("12321") is True
assert is_palindrome("12345") is False`,
        },
        {
          id: "empty",
          name: "Empty, and punctuation only",
          code: `assert is_palindrome("") is True
assert is_palindrome(".,!") is True`,
        },
        {
          id: "large",
          name: "A long palindrome",
          code: `big = "a" * 50000 + "b" + "a" * 50000
assert is_palindrome(big) is True`,
        },
      ],
    },
    javascript: {
      signature: "function isPalindrome(text: string): boolean",
      starter: `function isPalindrome(text) {
  const kept = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Does it read the same backwards?
  return true;
}
`,
      solution: `function isPalindrome(text) {
  const kept = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return kept === [...kept].reverse().join("");
}
`,
      tests: [
        {
          id: "phrase",
          name: "A phrase with punctuation",
          code: `if (isPalindrome("A man, a plan, a canal: Panama") !== true) {
  throw new Error("expected true");
}`,
        },
        {
          id: "not",
          name: "Not a palindrome",
          code: `if (isPalindrome("race a car") !== false) throw new Error("expected false");`,
        },
        {
          id: "digits",
          name: "Digits count",
          code: `if (isPalindrome("12321") !== true) throw new Error("expected true for 12321");
if (isPalindrome("12345") !== false) throw new Error("expected false for 12345");`,
        },
        {
          id: "empty",
          name: "Empty, and punctuation only",
          code: `if (isPalindrome("") !== true) throw new Error("expected true for empty");
if (isPalindrome(".,!") !== true) throw new Error("expected true for punctuation");`,
        },
        {
          id: "large",
          name: "A long palindrome",
          code: `const big = "a".repeat(50000) + "b" + "a".repeat(50000);
if (isPalindrome(big) !== true) throw new Error("expected true");`,
        },
      ],
    },
  },
);

const DIGITAL_ROOT = codeChallenge(
  {
    slug: "digital-root",
    title: "Digital Root",
    difficulty: "Beginner",
    topic: "Loops",
    description:
      "Sum a number's digits repeatedly until a single digit is left.",
    prompt: [
      "Add up a number's digits. If the result has more than one digit, do it again, and keep going until a single digit is left.",
      "A number that is already a single digit is its own answer.",
    ],
    examples: [
      {
        label: "Two rounds",
        fields: [
          { name: "n", value: "12345" },
          { name: "output", value: "6", emphasis: true },
        ],
        note: "1+2+3+4+5 = 15, then 1+5 = 6.",
      },
      {
        label: "Already single",
        fields: [
          { name: "n", value: "9" },
          { name: "output", value: "9", emphasis: true },
        ],
      },
    ],
    constraints: [
      [{ code: "0 ≤ n" }],
      ["The answer is always between 0 and 9"],
      [{ code: "0" }, " returns ", { code: "0" }],
    ],
    solutionNote: [
      "A ",
      { code: "while" },
      " loop over the digits is the honest answer and the one to write. There is also a closed form — the digital root of a positive number is ",
      { code: "1 + (n - 1) % 9" },
      " — which is worth knowing precisely because it is the kind of clever that needs a comment next to it.",
    ],
  },
  {
    python: {
      signature: "def digital_root(n: int) -> int",
      starter: `def digital_root(n: int) -> int:
    while n >= 10:
        # Replace n with the sum of its digits.
        pass
    return n
`,
      solution: `def digital_root(n: int) -> int:
    while n >= 10:
        n = sum(int(digit) for digit in str(n))
    return n
`,
      tests: [
        {
          id: "two-rounds",
          name: "Two rounds of summing",
          code: `assert digital_root(12345) == 6, f"got {digital_root(12345)}"`,
        },
        {
          id: "one-round",
          name: "One round",
          code: `assert digital_root(38) == 2, f"got {digital_root(38)}"`,
        },
        {
          id: "single",
          name: "Already a single digit",
          code: `assert digital_root(9) == 9
assert digital_root(0) == 0`,
        },
        {
          id: "nines",
          name: "A long run of nines",
          code: `assert digital_root(999999999999) == 9, f"got {digital_root(999999999999)}"`,
        },
        {
          id: "range",
          name: "The answer is always a single digit",
          code: `for n in range(0, 200):
    assert 0 <= digital_root(n) <= 9, f"digital_root({n}) = {digital_root(n)}"`,
        },
      ],
    },
    javascript: {
      signature: "function digitalRoot(n: number): number",
      starter: `function digitalRoot(n) {
  while (n >= 10) {
    // Replace n with the sum of its digits.
  }
  return n;
}
`,
      solution: `function digitalRoot(n) {
  while (n >= 10) {
    n = String(n)
      .split("")
      .reduce((total, digit) => total + Number(digit), 0);
  }
  return n;
}
`,
      tests: [
        {
          id: "two-rounds",
          name: "Two rounds of summing",
          code: `const got = digitalRoot(12345);
if (got !== 6) throw new Error("got " + got);`,
        },
        {
          id: "one-round",
          name: "One round",
          code: `const got = digitalRoot(38);
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "single",
          name: "Already a single digit",
          code: `if (digitalRoot(9) !== 9) throw new Error("got " + digitalRoot(9));
if (digitalRoot(0) !== 0) throw new Error("got " + digitalRoot(0));`,
        },
        {
          id: "nines",
          name: "A long run of nines",
          code: `const got = digitalRoot(999999999999);
if (got !== 9) throw new Error("got " + got);`,
        },
        {
          id: "range",
          name: "The answer is always a single digit",
          code: `for (let n = 0; n < 200; n++) {
  const r = digitalRoot(n);
  if (r < 0 || r > 9) throw new Error("digitalRoot(" + n + ") = " + r);
}`,
        },
      ],
    },
  },
);

export const CODE_SHAPING: Challenge[] = [
  CHUNK_LIST,
  FLATTEN_ONE_LEVEL,
  PAIRS_TO_GROUPS,
  HISTOGRAM_BUCKETS,
  VALUE_RANGE,
  NORMALIZE_WHITESPACE,
  TITLE_CASE,
  IS_PALINDROME,
  DIGITAL_ROOT,
];
