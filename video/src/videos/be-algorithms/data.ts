import results from "./results.json" with { type: "json" };

// Every number and output the be-algorithms video says or shows, read from
// results.json: what check.mjs ran in Pyodide 314.0.7 (Python 3.14.2), the
// runtime of the page's own blocks, and the arithmetic it did from stated
// assumptions. Three kinds, kept apart (check.mjs explains each): the page's
// printed outputs (PAGE), counts taken while something ran on the video's
// own inputs, and arithmetic. Nothing is timed. Pure (no Remotion, no DOM).

export const VIDEO = "be-algorithms";

/** Whether public/images/be-algorithms/ holds the watercolors from
 *  illustrations.json. They are not generated yet (phase 2). */
export const ILLUSTRATIONS = false;

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
 *  resize, slots after]. And the doubling array's, as arithmetic. */
export const AMORTIZED = C.amortized;

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

/** 8. Quicksort on a thousand sorted numbers, and on shuffled ones. */
export const QUICKSORT = C.quicksort;

/** The quick rounds' numbers, and the adjacency arithmetic. */
export const RAPID = { ...C.rapid, adjacency: A.adjacency } as const;
