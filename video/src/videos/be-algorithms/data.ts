import results from "./results.json" with { type: "json" };

// Every number and output the be-algorithms video says or shows, read from
// results.json: what check.mjs ran in Pyodide 314.0.7 (Python 3.14.2), the
// runtime of the page's own blocks, and the arithmetic it did from stated
// assumptions. Three kinds, kept apart (check.mjs explains each): the page's
// printed outputs (PAGE), counts taken while something ran on the video's
// own inputs, and arithmetic. Nothing is timed. Pure (no Remotion, no DOM).

export const VIDEO = "be-algorithms";

/** Whether public/images/be-algorithms/ holds the watercolors from
 *  illustrations.json: the pangolin and four spots. */
export const ILLUSTRATIONS = true;

export const RUNTIME: string = results.runtime;

/** What the page's snippets print, line by line, by the heading they sit
 *  under (check.mjs, PAGE). */
export const PAGE: Readonly<Record<string, readonly string[]>> = results.page;

const C = results.counts;
const A = results.arithmetic;

/** 1. Big-O: pairs a double loop checks against one pass. The 1,000 row is
 *  counted; the others are n(n - 1)/2 and n. The rate is an assumption, and
 *  the screen labels it one. */
export const BIG_O = {
  rows: [
    { n: A.bigO.small, pairs: A.bigO.smallPairs, pass: A.bigO.small, counted: false },
    { n: C.bigO.n, pairs: C.bigO.pairsChecked, pass: C.bigO.hashLookups, counted: true },
    { n: A.bigO.big, pairs: A.bigO.bigPairs, pass: A.bigO.big, counted: false },
  ],
  rate: A.bigO.rate,
  pairsMinutes: A.bigO.pairsMinutes,
  passSeconds: A.bigO.passSeconds,
} as const;

/** The chance that `keys` keys hashed uniformly into `buckets` buckets put
 *  two in one bucket: 1 - (1 - 1/b)(1 - 2/b)...(1 - (k-1)/b), the formula
 *  check.mjs evaluates for `collisions`. */
export const sharedChance = (keys: number, buckets: number) => {
  let none = 1;
  for (let i = 1; i < keys; i++) none *= 1 - i / buckets;
  return 1 - none;
};

/** 2. Two Sum on the challenge's example, the birthday bound, and the hash
 *  set's worst case (__eq__ calls). */
export const HASH = {
  twoSum: { nums: [2, 7, 11, 15], target: 9, answer: PAGE.twoSum[0] },
  buckets: A.collisions.buckets,
  evenMoneyKeys: A.collisions.evenMoneyKeys,
  pAtEvenMoney: A.collisions.atEvenMoney,
  pAt40: A.collisions.at40,
  keys: C.hashWorst.keys,
  eqSpread: C.hashWorst.spreadInsertEq,
  eqSame: C.hashWorst.sameInsertEq,
  eqMissSame: C.hashWorst.sameMissEq,
} as const;

/** 3. A Python list's resizes over a million appends: [items before the
 *  resize, slots after] in `steps`. And the doubling array's, as arithmetic. */
export const AMORTIZED = C.amortized;

/** Copies made by the first `k` appends to a Python list, if each resize
 *  copied every item so far: the sum over the resizes `k` has reached. */
export const listCopiesAt = (k: number) => AMORTIZED.steps.reduce((sum, [items]) => (items < k ? sum + items : sum), 0);

/** The doubling array's capacities: 1, 2, 4, ... up to the last below a
 *  million (check.mjs's dbl_caps), each copied in full when it fills. */
export const DOUBLING_CAPS = Array.from({ length: AMORTIZED.doublingResizes }, (_, i) => 2 ** i);

/** Copies a doubling array has made by its `k`th append. */
export const doublingCopiesAt = (k: number) => DOUBLING_CAPS.reduce((sum, cap) => (cap < k ? sum + cap : sum), 0);

/** 4. "([)]" and "{[]}" through a counter, a queue and a stack. */
export const BRACKETS = C.brackets as readonly { s: string; count: boolean; queue: boolean; stack: boolean }[];

/** 5. The page's graph, its BFS order (the page's run) and a DFS order, and
 *  the million-node tree's frontiers. */
export const TRAVERSAL = {
  graph: { A: ["B", "C"], B: ["D"], C: ["D"], D: [] } as Record<string, string[]>,
  bfsOrder: ["A", "B", "C", "D"],
  dfsOrder: C.traversal.dfsOrder,
  nodes: C.traversal.nodes,
  levels: C.traversal.levels,
  bfsPeak: C.traversal.bfsPeak,
  dfsPeak: C.traversal.dfsPeak,
  listShifts: C.traversal.listShifts,
} as const;

/** 5, the other shape: a chain of a million, each node pointing at the next.
 *  BFS's queue peak, the path DFS keeps (its depth), and what a recursive DFS
 *  does on it. */
export const CHAIN = C.chain;

/** 6. The heap of a million. */
export const HEAP = C.heap;

/** 7. The page's graph and printed distances, then the video's own graph
 *  with a negative edge: the settling version against Bellman-Ford. */
export const DIJKSTRA = {
  pageGraph: { A: [["B", 1], ["C", 4]], B: [["C", 2], ["D", 5]], C: [["D", 1]], D: [] } as Record<string, [string, number][]>,
  pagePrinted: PAGE.dijkstra[0],
  negGraph: C.dijkstra.neg as unknown as Record<string, [string, number][]>,
  settled: C.dijkstra.settled as Record<string, number>,
  settledOrder: C.dijkstra.settledOrder,
  bellmanFord: C.dijkstra.bellmanFord as Record<string, number>,
  bfRounds: C.dijkstra.bfRounds,
  bfEdges: C.dijkstra.bfEdges,
} as const;

/** 8. Quicksort on a thousand sorted numbers, and on shuffled ones;
 *  `randomPartitions` is every partition of the random-pivot run, [depth,
 *  lo, hi]. The last-pivot run's partition at depth d is [0, n - d]. */
export const QUICKSORT = C.quicksort;

/** The inputs of the page's snippets whose outputs the quick rounds draw,
 *  as check.mjs's PAGE runs them (the outputs are PAGE's, above). */
export const PAGE_INPUTS = {
  mergeSort: [38, 27, 43, 3, 9, 82, 10],
  inorder: [5, 3, 7, 1, 4],
  twoPointers: { nums: [1, 2, 3, 4, 6], target: 6 },
  window: "abcabcbb",
  bits: [4, 1, 2, 1, 2],
  permutations: [1, 2, 3],
  topo: { A: ["C"], B: ["C"], C: ["D"], D: [] } as Record<string, string[]>,
  cyclic: { A: ["B"], B: ["C"], C: ["A"] } as Record<string, string[]>,
} as const;

/** The quick rounds' numbers, and the adjacency arithmetic. `backtrackTried`
 *  is every candidate the backtracking run tried, in order, [path, can still
 *  succeed], on orderings of 1, 2, 3 with no digit in its own place. */
export const RAPID = { ...C.rapid, adjacency: A.adjacency } as const;
