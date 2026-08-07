/**
 * Why the p99 of one service becomes the p50 of a page: a request that fans out
 * to many backends is as slow as its slowest call, and "slowest of many" is a
 * very different distribution from "one call".
 *
 * If each call is slow independently with probability p, a request making n of
 * them is slow with probability 1 - (1-p)^n. That climbs far faster than
 * intuition allows: at a one-percent tail, a hundred calls are slow more often
 * than not. This is the arithmetic behind hedged requests, tail-tolerant
 * design, and why teams that fix their p99 see their page latency move and
 * teams that fix their mean do not.
 *
 * Three per-call tail rates on one pair of axes, so the lines are directly
 * comparable; the crossings where each passes even money are computed by
 * scanning the curves rather than typed.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "The chance that a fanned-out request is slow, against the number of backend calls it makes, for per-call slow rates of one in a thousand, one in a hundred, and one in twenty. All three rise steeply; the one-percent line passes even odds at about seventy calls.";

const MAX_CALLS = 200;
const RATES = [
  { p: 0.001, key: "0.1% per call" },
  { p: 0.01, key: "1% per call" },
  { p: 0.05, key: "5% per call" },
];

const curves = RATES.flatMap((r, i) =>
  Array.from({ length: MAX_CALLS + 1 }, (_, n) => ({
    key: r.key,
    color: SERIES[i % SERIES.length],
    n,
    slow: 1 - (1 - r.p) ** n,
  })),
);

/** First fan-out at which each rate passes even money. */
const HALF = RATES.map((r) => {
  const row = curves.find((d) => d.key === r.key && d.slow >= 0.5);
  return { ...r, n: row ? row.n : null };
});

const ONE_PCT = HALF.find((h) => h.key === "1% per call");

export const caption =
  `Each backend is fine on its own: at ${ONE_PCT.key.replace(" per call", "")}, ninety-nine calls in a hundred are fast. A page that makes ${ONE_PCT.n} of them is slow more often than not, because it waits for the slowest. This is why tail latency is a system property rather than a service one, and why the number worth optimising is the p99.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 32,
    marginLeft: 56,
    marginRight: 118,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Backend calls per request", labelAnchor: "center", domain: [0, MAX_CALLS], ticks: 5 },
    y: { label: "Chance the request is slow", domain: [0, 1.04], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.ruleY([0.5], { stroke: MUTED, strokeWidth: 1.25, strokeDasharray: "4,3" }),
      // Right-hand end, in the gap between the 1% and 0.1% curves: at the left
      // edge this label sits on the 5% line, which climbs almost vertically.
      Plot.text([{}], {
        x: MAX_CALLS - 4,
        y: 0.5,
        text: () => "even money",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -8,
        ...HALO,
      }),
      Plot.line(curves, { x: "n", y: "slow", stroke: "color", strokeWidth: 2 }),
      // Direct labels at the right-hand end: three lines is one too many for a
      // legend the eye has to keep travelling back to.
      Plot.text(
        RATES.map((r, i) => ({
          key: r.key,
          color: SERIES[i % SERIES.length],
          slow: 1 - (1 - r.p) ** MAX_CALLS,
        })),
        {
          x: MAX_CALLS,
          y: "slow",
          text: "key",
          fill: "color",
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.dot(HALF.filter((h) => h.n !== null), { x: "n", y: 0.5, fill: ACCENT, r: 4 }),
      Plot.text([ONE_PCT], {
        x: "n",
        y: 0.5,
        text: (d) => `${d.n} calls at 1% each,\nand half your requests are slow`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 10,
        dy: 30,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
