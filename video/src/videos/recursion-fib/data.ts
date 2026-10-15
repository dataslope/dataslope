// Every number the video shows, read from measurements.json: the output of
// fib.cpp, built with g++ -O2 -Wall and run by measure.sh. Nothing here is
// simulated or typed in by hand; the derivations below only rearrange what
// the program printed. Pure (no Remotion, no DOM).
//
//   - The two call trees are fib.cpp's own call logs for fib(5), naive and
//     memoized: every call, its parent and how deep the stack was, in the
//     order g++ made them (left operand first).
//   - Calls and stack depths for n = 10 to 50 come from counting twins of
//     the two functions; times from the functions themselves, best of many
//     rounds (fib.cpp says how).
import M from "./measurements.json";

export const VIDEO = "recursion-fib";

/**
 * Whether public/images/recursion-fib/ holds the two watercolors from
 * illustrations.json. Set to true once `npm run illustrations --
 * recursion-fib` has written both WebPs. Every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = false;

type Call = (typeof M.naiveTree)[number];

/** A call placed in a drawn tree. `slot` runs across in leaf widths. */
export type Placed = {
  i: number;
  n: number;
  parent: number;
  depth: number;
  kind: string;
  slot: number;
  /** The chain of n's from the root, "5/4/3": the same call in both trees. */
  path: string;
};

const childrenOf = (calls: readonly Call[], i: number) =>
  calls.flatMap((c, j) => (c.parent === i ? [j] : []));

/** A tidy layout: leaves take the next slot left to right, and a parent sits
 *  centred over its first and last child. */
const place = (calls: readonly Call[]): { nodes: Placed[]; leaves: number } => {
  const slot: number[] = new Array(calls.length).fill(0);
  let next = 0;
  const visit = (i: number) => {
    const kids = childrenOf(calls, i);
    if (kids.length === 0) {
      slot[i] = next++;
      return;
    }
    kids.forEach(visit);
    slot[i] = (slot[kids[0]] + slot[kids[kids.length - 1]]) / 2;
  };
  visit(0);
  const paths: string[] = [];
  calls.forEach((c, i) => {
    paths[i] = c.parent < 0 ? String(c.n) : `${paths[c.parent]}/${c.n}`;
  });
  return {
    nodes: calls.map((c, i) => ({ i, n: c.n, parent: c.parent, depth: c.depth, kind: c.kind, slot: slot[i], path: paths[i] })),
    leaves: next,
  };
};

export const TREE_N = M.treeN;

/**
 * Naive fib(5), every call. A call redoes earlier work when it computes an n
 * (2 or more: 0 and 1 are answered on the spot) that an earlier call already
 * computed, and so does every call beneath it. `repeat` marks that whole
 * branch; `branchRoot` marks the call that starts it.
 */
const naive = place(M.naiveTree);
const recomputes = (c: Placed) => c.n >= 2 && M.naiveTree.slice(0, c.i).some((d) => d.n === c.n);
const inRepeat = (i: number): boolean => i >= 0 && (recomputes(naive.nodes[i]) || inRepeat(naive.nodes[i].parent));
export const NAIVE_TREE = naive.nodes.map((c) => ({
  ...c,
  repeat: inRepeat(c.i),
  branchRoot: recomputes(c) && !inRepeat(c.parent),
}));
export const NAIVE_LEAVES = naive.leaves;
export const NAIVE_CALLS = NAIVE_TREE.length;
export const DISTINCT = new Set(NAIVE_TREE.map((c) => c.n)).size;
/** Calls inside a repeated branch. */
export const REPEATS = NAIVE_TREE.filter((c) => c.repeat).length;
/** How many times each n is called in fib(5). */
export const TIMES_CALLED = (n: number) => NAIVE_TREE.filter((c) => c.n === n).length;

/** The deepest the stack gets, and the calls open at that moment: the first
 *  call to reach that depth and its ancestors. */
export const TREE_DEPTH = Math.max(...NAIVE_TREE.map((c) => c.depth));
const deepest = NAIVE_TREE.find((c) => c.depth === TREE_DEPTH)!;
const pathTo = (i: number): number[] => (i < 0 ? [] : [...pathTo(NAIVE_TREE[i].parent), i]);
/** Indices into NAIVE_TREE, root first. */
export const DEEP_PATH = pathTo(deepest.i);

/** Memoized fib(5), every call, with each call matched to the naive call in
 *  the same place in the tree. */
const memo = place(M.memoTree);
export const MEMO_TREE = memo.nodes;
export const MEMO_LEAVES = memo.leaves;
export const MEMO_CALLS = MEMO_TREE.length;
export const MEMO_HITS = MEMO_TREE.filter((c) => c.kind === "hit").length;
export const memoAt = (path: string) => MEMO_TREE.find((c) => c.path === path);

// The memo answers exactly the calls that started a repeated branch, and
// makes every other call the naive version made outside those branches.
{
  const kept = NAIVE_TREE.filter((c) => !c.repeat || c.branchRoot).map((c) => c.path);
  const hits = NAIVE_TREE.filter((c) => c.branchRoot).map((c) => c.path);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((p) => b.includes(p));
  if (!same(kept, MEMO_TREE.map((c) => c.path)) || !same(hits, MEMO_TREE.filter((c) => c.kind === "hit").map((c) => c.path))) {
    throw new Error("the memoized tree is not the naive tree with its repeated branches cut");
  }
}

/** The memo vector after fibMemo(5): -1 where nothing was stored. */
export const MEMO_TABLE = M.memoTable;
/** Each `memo[n] = ...`, in the order it happened. */
export const MEMO_WRITES = M.memoWrites;

/** One row of Figs. 3 and 6. */
export type Row = {
  n: number;
  value: number;
  naiveCalls: number;
  memoCalls: number;
  naiveDepth: number;
  memoDepth: number;
  naiveSeconds: number;
  memoSeconds: number;
};
export const ROWS: readonly Row[] = M.counts.map((c) => {
  const t = M.times.find((r) => r.n === c.n);
  if (!t) throw new Error(`No time for n = ${c.n}`);
  if (c.value !== c.memoValue) throw new Error(`fib(${c.n}) and fibMemo(${c.n}) disagree`);
  return {
    n: c.n,
    value: c.value,
    naiveCalls: c.naiveCalls,
    memoCalls: c.memoCalls,
    naiveDepth: c.naiveDepth,
    memoDepth: c.memoDepth,
    naiveSeconds: t.naiveSeconds,
    memoSeconds: t.memoSeconds,
  };
});
export const row = (n: number) => {
  const r = ROWS.find((x) => x.n === n);
  if (!r) throw new Error(`No row for n = ${n}`);
  return r;
};
export const FORTY = row(40);
export const FIFTY = row(50);

/** Each row's naive calls over the row before. */
export const RATIOS = ROWS.slice(1).map((r, i) => r.naiveCalls / ROWS[i].naiveCalls);

/** The memoized calls follow 2n - 1 at every n measured. */
export const MEMO_IS_2N_MINUS_1 = ROWS.every((r) => r.memoCalls === 2 * r.n - 1);
if (!MEMO_IS_2N_MINUS_1) throw new Error("memo calls are not 2n - 1");
if (!ROWS.every((r) => r.naiveDepth === r.n && r.memoDepth === r.n)) {
  throw new Error("a stack depth is not n");
}

/** How the times were taken, for the notes under Figs. 3 and 6. */
const ghz = /@\s*([\d.]+)\s*GHz/.exec(M.cpu)?.[1];
export const MACHINE = {
  compiler: M.compiler,
  flags: M.flags,
  cpu: /xeon/i.test(M.cpu) ? `Intel Xeon${ghz ? ` at ${ghz} GHz` : ""}` : M.cpu,
  rounds: M.rounds,
  roundsSlow: M.roundsSlow,
};

/** "40,730,022,147" */
export const commas = (v: number) => Math.round(v).toLocaleString("en-US");

/** A time with three significant figures in the unit that suits it:
 *  "173 ns", "13.0 µs", "4.61 ms", "1.20 s". */
export const fmtTime = (s: number) => {
  const units: [number, string][] = [
    [1, "s"],
    [1e-3, "ms"],
    [1e-6, "µs"],
    [1e-9, "ns"],
  ];
  const [scale, unit] = units.find(([u]) => s >= u) ?? units[units.length - 1];
  const v = s / scale;
  return `${v >= 100 ? Math.round(v) : v.toPrecision(3)} ${unit}`;
};
