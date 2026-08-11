/**
 * Catastrophic backtracking: a pattern that works, on input that does not.
 *
 * A backtracking engine tries alternatives until one matches or all of them
 * fail, and nested quantifiers give it exponentially many to try. `(a+)+$`
 * against a string of `a`s followed by one `b` has to consider every way of
 * splitting the `a`s between the inner and outer groups before it can report
 * failure, which is 2ⁿ ways. Thirty characters is already about a second, and
 * every character after that doubles it.
 *
 * ── Why the chart is drawn the way it is ────────────────────────────────────
 *
 * The first version of this figure was a two-line log plot with the y axis
 * ticked in `1 µs / 1 ms / 1 s` and the series labelled "Backtracking, with a
 * quantifier inside a quantifier". Every one of those choices assumed a reader
 * who already knew the answer:
 *
 *   • a *straight* line on a log axis is what exponential growth looks like,
 *     and a reader who does not know that reads the steeper straight line as
 *     "linear, but worse" — which is the one reading the figure exists to
 *     rule out. The scale is now said out loud inside the plot, and the fact
 *     it implies ("one more character doubles it") is said with it;
 *   • microseconds and milliseconds are not felt quantities. The axis now runs
 *     up to *17 minutes*, and three points on the curve are called out in
 *     units a reader has waited through: a millisecond, a second, 18 minutes;
 *   • "quantifier inside a quantifier" is the definition, not the example. The
 *     two series are now labelled with the patterns themselves, `(a+)+$` and
 *     `a+$`, which are the same test written two ways and are also the fix.
 *
 * The pattern is not exotic, and the shape recurs wherever a quantifier
 * contains another one: `(\s*\w+)*`, `(\d+|x)*`, an email regex from a blog
 * post. Nothing goes wrong on well-formed input, because the first path tried
 * is the one that matches. The blowup needs a near-miss, which is why it
 * reaches production as a denial of service rather than as a failing test.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two regular expressions timed against the same failing input as it gets longer, on a scale where each gridline is a thousand times the one below. The pattern with a repeat inside a repeat needs a millisecond at twenty characters, a second at thirty and eighteen minutes at forty; the pattern without one stays under a microsecond throughout.";

const MAX_N = 44;
/** Roughly a nanosecond per step attempted, on a modern engine. */
const STEP_NS = 1;

const backtracking = Array.from({ length: MAX_N + 1 }, (_, n) => ({
  n,
  ns: Math.pow(2, n) * STEP_NS,
}));
const linear = Array.from({ length: MAX_N + 1 }, (_, n) => ({ n, ns: 40 + n * 12 }));

const SECOND = 1e9;

/** The three points called out on the curve, in units a reader has waited
 *  through. Times are read off the curve rather than typed in, so the labels
 *  cannot drift away from the geometry. */
const MARKS = [
  { n: 20, text: "20 characters:\nabout a millisecond" },
  { n: 30, text: "30 characters:\nabout a second" },
  { n: 40, text: "40 characters:\n18 minutes" },
];

export const caption = `Both patterns ask the same question ("is this text nothing but \`a\`s?") and both are given the same answer-is-no input: a run of \`a\`s with a single \`b\` on the end. \`a+$\` checks the characters once and says no. \`(a+)+$\` has a repeat (\`+\`) wrapped inside another repeat, and before a backtracking engine can say no it has to try every way of dividing those \`a\`s between the inner \`+\` and the outer one: 2ⁿ ways, so each character added doubles the work. Nothing goes wrong on text that *does* match, because the first division tried is the one that works; the blowup needs a near-miss, which is why it arrives in production as a hung request rather than as a failing test. Three fixes: never put a quantifier inside a quantifier, rewrite it anchored and possessive, or use an engine that does not backtrack.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 86,
    marginRight: 152,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Characters in the input",
      labelAnchor: "center",
      domain: [0, MAX_N],
      ticks: [0, 10, 20, 30, 40],
    },
    y: {
      label: "Time to answer “no”",
      type: "log",
      domain: [120, 6e13],
      // Powers of ten only: a base-10 log scale silently refuses to label
      // anything else, so a "1 min" tick at 6e10 would draw as a blank. These
      // four are all powers of ten, and between them they carry the range from
      // "too fast to notice" to "long enough to page someone".
      ticks: [1e3, 1e6, 1e9, 1e12],
      tickFormat: (d) =>
        d >= 1e12 ? "17 min" : d >= 1e9 ? "1 second" : d >= 1e6 ? "1 ms" : "1 µs",
    },
    marks: [
      Plot.text([{}], {
        x: 0.6,
        y: 1.4e13,
        text: () =>
          "Each gridline is 1,000× the one below.\nOn a scale like that a straight line means\nthe time doubles with every character added.",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([SECOND], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.line(linear, { x: "n", y: "ns", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.line(backtracking, { x: "n", y: "ns", stroke: ACCENT, strokeWidth: 2, clip: true }),
      Plot.dot(MARKS, {
        x: "n",
        y: (d) => Math.pow(2, d.n) * STEP_NS,
        fill: ACCENT,
        r: 3.5,
        clip: true,
      }),
      Plot.text(MARKS, {
        x: "n",
        y: (d) => Math.pow(2, d.n) * STEP_NS,
        text: "text",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        dy: -6,
        clip: true,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_N,
        y: 2.6e13,
        text: () => "(a+)+$\na repeat inside\na repeat",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_N,
        y: 40 + MAX_N * 12,
        text: () => "a+$\nthe same test,\nnothing nested",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
