/**
 * What a set buys you on a whole *operation*, not on a single lookup.
 *
 * `collection-lookup-growth` (in *Dictionaries*) answers the single-lookup
 * question: `x in list` walks, `x in set` hashes, and the two curves separate.
 * A reader can take that away and still write the nested loop, because the
 * lesson it teaches is about one membership test and the code they are about to
 * write is about intersecting two collections.
 *
 * This is that second question. Intersecting two n-element lists with a nested
 * loop is n² comparisons; `set(a) & set(b)` builds two tables and walks one, so
 * it is linear plus the hashing. Same answer, same rows, different shape, and
 * the gap is what turns a report that runs in a blink into one that does not
 * come back.
 *
 * Both counts are measured by running the two algorithms rather than by
 * evaluating a formula, so the set line carries the real cost of building the
 * tables instead of pretending set construction is free. That measurement is
 * what settles the objection the approach usually meets, which is that hashing
 * two whole collections cannot be worth it for a handful of items. It is: at
 * five elements a side the set version already does slightly *less* work, and
 * there is no crossover anywhere in the range a person would write either line
 * of code for. The chart was drawn expecting one and the counts did not
 * produce it.
 *
 * Both axes are logarithmic, which is the only scaling that shows both halves
 * of the story at once. Drawn linearly the set line is pinned to the axis and
 * the crossover it is supposed to demonstrate happens inside the first few
 * pixels, so the chart would assert the honest part in a caption while drawing
 * only the flattering part. On log-log the quadratic is a line of slope two and
 * the linear one a line of slope one, and where they cross is legible.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Element operations against collection size for intersecting two collections. The nested-loop count curves upward as a quadratic; the set-based count is a nearly flat line. They cross at a very small size, after which the nested loop is permanently and increasingly more expensive.";

const SIZES = [5, 10, 20, 40, 80, 150, 250, 400, 600, 900];

/** Two collections with about half their members in common, which is the case
 *  the operation is usually reached for. */
function pair(n, seed) {
  const u = rng(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  const b = Array.from({ length: n }, (_, i) => Math.floor(n / 2) + i + Math.floor(u() * 2));
  return [a, b];
}

/** Nested loop: one comparison per pair, short-circuiting on a hit the way a
 *  hand-written `for x in a: for y in b:` with a `break` would. */
function nested(a, b) {
  let ops = 0;
  const out = [];
  for (const x of a) {
    for (const y of b) {
      ops += 1;
      if (x === y) {
        out.push(x);
        break;
      }
    }
  }
  return ops;
}

/** set(a) & set(b): one hash-and-insert per element of each input, then one
 *  lookup per element of the smaller table. Counted, not assumed free. */
function viaSets(a, b) {
  let ops = 0;
  const sa = new Set();
  for (const x of a) {
    ops += 1;
    sa.add(x);
  }
  const sb = new Set();
  for (const y of b) {
    ops += 1;
    sb.add(y);
  }
  const [small, large] = sa.size <= sb.size ? [sa, sb] : [sb, sa];
  for (const x of small) {
    ops += 1;
    large.has(x);
  }
  return ops;
}

const METHODS = [
  { key: "Nested loops", f: nested, color: ACCENT },
  { key: "set(a) & set(b)", f: viaSets, color: PRIMARY },
];

const ROWS = SIZES.flatMap((n) => {
  const [a, b] = pair(n, 700 + n);
  return METHODS.map((m) => ({ key: m.key, color: m.color, n, ops: m.f(a, b) }));
});

const at = (key, n) => ROWS.find((r) => r.key === key && r.n === n).ops;
const BIGGEST = SIZES[SIZES.length - 1];
const RATIO = Math.round(at("Nested loops", BIGGEST) / at("set(a) & set(b)", BIGGEST));

/** Whether the nested loop is ever the cheaper of the two on this grid. It is
 *  not, which is the finding, so nothing is marked as a crossover. */
const NESTED_EVER_WINS = SIZES.some((n) => at("Nested loops", n) < at("set(a) & set(b)", n));
const SMALLEST = SIZES[0];
/** Built outside the caption: a `${}` inside a nested string literal is not
 *  interpolated, so composing this inline silently ships the placeholder. */
const SMALL_INPUT_NOTE = NESTED_EVER_WINS
  ? ""
  : `: they are, already at ${SMALLEST} elements a side`;

export const caption = `Both lines are the same intersection over the same rows; only the shape of the work differs. Log axes on both, so the nested loop's quadratic is a slope of two and the set version's linear cost is a slope of one, and the widening gap between them is the whole point. The counts include building the two tables, which is the cost people assume makes sets not worth it on small inputs${SMALL_INPUT_NOTE}. By ${BIGGEST} the set version does roughly ${RATIO}× less work, and the ratio keeps growing. This is the single substitution that most often turns a slow analysis script into a fast one.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 34,
    marginLeft: 66,
    marginRight: 118,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Elements in each collection",
      labelAnchor: "center",
      type: "log",
      domain: [SIZES[0], BIGGEST],
      ticks: SIZES,
      tickFormat: (d) => String(d),
    },
    y: {
      label: "Element operations",
      type: "log",
      // Pinned to the end ticks. An explicit `ticks` list is drawn wherever
      // the scale puts each value, inside the domain or not, so an inferred
      // domain (the data tops out around 450k) hung the 1000k label above the
      // frame, into the axis label, and the 10 label below it.
      domain: [10, 1000000],
      ticks: [10, 100, 1000, 10000, 100000, 1000000],
      tickFormat: (d) => (d >= 1000 ? `${Math.round(d / 1000)}k` : String(d)),
    },
    marks: [
      Plot.text([{}], {
        x: SIZES[3],
        y: at("Nested loops", BIGGEST) / 2,
        text: () => "no crossover: the tables\nare cheaper from the start",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),

      ...METHODS.map((m) =>
        Plot.line(ROWS.filter((r) => r.key === m.key), {
          x: "n",
          y: "ops",
          stroke: m.color,
          strokeWidth: 2.4,
        }),
      ),
      Plot.dot(ROWS, { x: "n", y: "ops", r: 2.6, fill: (d) => d.color }),

      ...METHODS.map((m) =>
        Plot.text([{}], {
          x: BIGGEST,
          y: at(m.key, BIGGEST),
          text: () => m.key,
          fill: m.color,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),
    ],
  });
}
