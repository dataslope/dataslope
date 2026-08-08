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
 * The pattern is not exotic, and the shape recurs wherever a quantifier
 * contains another one: `(\s*\w+)*`, `(\d+|x)*`, an email regex from a blog
 * post. Nothing goes wrong on well-formed input, because the first path tried
 * is the one that matches. The blowup needs a near-miss, which is why it
 * reaches production as a denial of service rather than as a failing test.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Time to reject a near-miss input against its length, on a logarithmic scale. A linear-time matcher stays flat along the bottom while a backtracking engine on a nested quantifier doubles with every added character, passing one second at thirty.";

const MAX_N = 34;
/** Roughly a nanosecond per step on a modern engine. */
const STEP_NS = 1;

const rows = Array.from({ length: MAX_N + 1 }, (_, n) => [
  { key: "Backtracking, nested quantifier", n, ns: Math.pow(2, n) * STEP_NS },
  { key: "Linear-time matcher", n, ns: 40 + n * 12 },
]).flat();

const SECOND = 1e9;
const atSecond = Math.ceil(Math.log2(SECOND / STEP_NS));
const LATER = atSecond + 10;
const atLater = Math.round((Math.pow(2, LATER) * STEP_NS) / 60e9);

export const caption = `\`(a+)+$\` against a run of \`a\`s ending in one \`b\`. Before it can report failure, a backtracking engine has to try every way of splitting those \`a\`s between the inner and outer groups, which is 2ⁿ of them: about a second at ${atSecond} characters and ${atLater} minutes at ${LATER}. Nothing goes wrong on well-formed input, because the first path tried is the one that matches, so the blowup needs a near-miss and reaches production as a denial of service rather than as a failing test. The fixes are the usual three: no quantifier inside a quantifier, an anchored and possessive rewrite, or an engine that does not backtrack.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 74,
    marginRight: 168,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Characters of near-miss input", labelAnchor: "center", domain: [0, MAX_N], ticks: 6 },
    y: {
      label: "Time to report no match",
      type: "log",
      domain: [30, 3e10],
      // Powers of ten only: a base-10 log scale silently refuses to label
      // anything else, so a "1 min" tick at 6e10 would draw as a blank.
      ticks: [1e3, 1e6, 1e9],
      tickFormat: (d) => (d >= 1e9 ? "1 s" : d >= 1e6 ? "1 ms" : "1 µs"),
    },
    marks: [
      Plot.line(rows.filter((d) => d.key.startsWith("Backtracking")), {
        x: "n",
        y: "ns",
        stroke: ACCENT,
        strokeWidth: 2,
        clip: true,
      }),
      Plot.line(rows.filter((d) => !d.key.startsWith("Backtracking")), {
        x: "n",
        y: "ns",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.ruleY([SECOND], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.dot([{}], { x: atSecond, y: SECOND, fill: ACCENT, r: 4 }),
      Plot.text([{}], {
        x: atSecond,
        y: SECOND,
        text: () => `${atSecond} characters is a second`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -12,
        dy: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_N,
        y: 1.6e10,
        text: () => "Backtracking, with a\nquantifier inside a\nquantifier",
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
        text: () => "Linear-time matcher",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
