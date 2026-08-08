/**
 * Three quadratic sorts measured against each other, and against a curve of a
 * different order.
 *
 * `big-o-growth` (in *Complexity Analysis*) plots the families: it answers what
 * separates n² from n log n, in the abstract, with no algorithm in it. This
 * page needs the other half, and the one the family plot deliberately hides.
 * Bubble, selection and insertion sort are all Θ(n²), so on that chart they are
 * one line, yet on real input they are not remotely the same algorithm:
 * insertion sort does a fraction of the work bubble sort does, and on
 * nearly-sorted input it drops to something close to linear.
 *
 * That is the practical content of "the difference between them is constants".
 * The constants are exactly what big-O throws away, so seeing them requires
 * counting rather than reasoning: every point here is an actual run of the
 * algorithm on the same generated array, with array reads and writes tallied.
 * No formula is drawn.
 *
 * Merge sort is on the same axes as the reference, because the lesson's real
 * claim is comparative: a better constant buys you a factor, and a better order
 * buys you the graph. By the right-hand edge the gap between the best and worst
 * quadratic sort is smaller than the gap between any of them and merge sort.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES, rng } from "./_theme.mjs";

export const title =
  "Operation counts for bubble, selection and insertion sort plus merge sort, measured on the same arrays at sizes from 20 to 400. The three quadratic sorts fan apart from each other by a constant factor while all three curve away from merge sort's much flatter line.";

const SIZES = [20, 40, 60, 90, 120, 160, 200, 260, 320, 400];

/** One shared source of arrays, so every algorithm at a given size sorts the
 *  identical input and any difference is the algorithm. */
function shuffled(n, seed) {
  const u = rng(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(u() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Reads and writes of the array, which is the unit that makes the three
 *  quadratic sorts comparable: comparisons alone would flatter selection sort,
 *  which compares as much as bubble sort but swaps almost never. */
function bubble(a) {
  let ops = 0;
  const x = [...a];
  for (let i = 0; i < x.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < x.length - 1 - i; j++) {
      ops += 2;
      if (x[j] > x[j + 1]) {
        [x[j], x[j + 1]] = [x[j + 1], x[j]];
        ops += 2;
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return ops;
}

function selection(a) {
  let ops = 0;
  const x = [...a];
  for (let i = 0; i < x.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < x.length; j++) {
      ops += 2;
      if (x[j] < x[min]) min = j;
    }
    if (min !== i) {
      [x[i], x[min]] = [x[min], x[i]];
      ops += 2;
    }
  }
  return ops;
}

function insertion(a) {
  let ops = 0;
  const x = [...a];
  for (let i = 1; i < x.length; i++) {
    const key = x[i];
    ops += 1;
    let j = i - 1;
    while (j >= 0 && x[j] > key) {
      ops += 2;
      x[j + 1] = x[j];
      j--;
    }
    ops += 1;
    x[j + 1] = key;
  }
  return ops;
}

function merge(a) {
  let ops = 0;
  const sort = (xs) => {
    if (xs.length < 2) return xs;
    const mid = xs.length >> 1;
    const l = sort(xs.slice(0, mid));
    const r = sort(xs.slice(mid));
    const out = [];
    let i = 0;
    let j = 0;
    while (i < l.length && j < r.length) {
      ops += 3;
      out.push(l[i] <= r[j] ? l[i++] : r[j++]);
    }
    while (i < l.length) {
      ops += 2;
      out.push(l[i++]);
    }
    while (j < r.length) {
      ops += 2;
      out.push(r[j++]);
    }
    return out;
  };
  sort([...a]);
  return ops;
}

const ALGOS = [
  { key: "Bubble", f: bubble, color: ACCENT },
  { key: "Selection", f: selection, color: SERIES[1] },
  { key: "Insertion", f: insertion, color: SERIES[3] },
  { key: "Merge", f: merge, color: PRIMARY },
];

const ROWS = SIZES.flatMap((n) => {
  const input = shuffled(n, 5000 + n);
  return ALGOS.map((alg) => ({ key: alg.key, color: alg.color, n, ops: alg.f(input) }));
});

const at = (key, n) => ROWS.find((r) => r.key === key && r.n === n).ops;
const BIGGEST = SIZES[SIZES.length - 1];
const WORST_QUAD = Math.max(...["Bubble", "Selection", "Insertion"].map((k) => at(k, BIGGEST)));
const BEST_QUAD = Math.min(...["Bubble", "Selection", "Insertion"].map((k) => at(k, BIGGEST)));
const SPREAD = (WORST_QUAD / BEST_QUAD).toFixed(1);
const VS_MERGE = (BEST_QUAD / at("Merge", BIGGEST)).toFixed(0);

export const caption = `Every point is a real run: the algorithm sorts the array and its reads and writes are counted, so the constants big-O discards are the thing being drawn. All three quadratic sorts trace the same shape, and they are still ${SPREAD}× apart from each other at n = ${BIGGEST}, which is why "they are all O(n²)" is a statement about the curve and never about which one to write. But the spread among them is dwarfed by the next comparison: the *best* of the three does about ${VS_MERGE}× the work of merge sort at the same size, and that ratio keeps growing while the ${SPREAD}× does not. A better constant buys a factor; a better order buys the graph.`;

export function render() {
  return plot({
    height: 350,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 90,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Array size (n)", labelAnchor: "center", domain: [0, BIGGEST + 10], ticks: 6 },
    y: {
      label: "Array reads + writes",
      ticks: 5,
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    marks: [
      ...ALGOS.map((alg) =>
        Plot.line(ROWS.filter((r) => r.key === alg.key), {
          x: "n",
          y: "ops",
          stroke: alg.color,
          strokeWidth: alg.key === "Merge" ? 2.6 : 2,
        }),
      ),
      Plot.dot(ROWS, { x: "n", y: "ops", r: 2.4, fill: (d) => d.color }),

      // Labels at the right end, where the four curves are furthest apart and
      // the reading order top-to-bottom is the ranking itself.
      ...ALGOS.map((alg) =>
        Plot.text([{}], {
          x: BIGGEST,
          y: at(alg.key, BIGGEST),
          text: () => alg.key,
          fill: alg.color,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),

      Plot.text([{}], {
        x: BIGGEST * 0.42,
        y: at("Merge", BIGGEST) * 4,
        text: () => "all three are O(n²);\nthey are not the same cost",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),

      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
