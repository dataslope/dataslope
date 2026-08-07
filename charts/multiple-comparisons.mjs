/**
 * The consequence of `pvalues-under-null`, drawn: if each test has a 5% chance
 * of a false positive and the tests are independent, the chance that *at least
 * one* of them fires is 1 − 0.95^k.
 *
 * The curve is the argument against "we looked at twenty metrics and one moved".
 * At twenty tests a false positive is more likely than not, so the finding
 * needs no explanation beyond the number of times you looked.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED } from "./_theme.mjs";

export const title =
  "The probability that at least one of k independent tests returns p below 0.05, rising from 5% at one test through 40% at ten to 64% at twenty, drawn against a line marking even odds.";

export const caption =
  "Each test is a fresh 5% chance of a false alarm. Run twenty and you are more likely than not to find one, which is why the number of comparisons has to be part of how a result is reported.";

const ALPHA = 0.05;
const MAX_K = 20;

const curve = Array.from({ length: MAX_K }, (_, i) => ({
  k: i + 1,
  p: 1 - Math.pow(1 - ALPHA, i + 1),
}));

const MARKS = [1, 5, 10, 20].map((k) => curve[k - 1]);

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 56,
    ariaLabel: title,
    x: { label: "Number of tests run", labelAnchor: "center", domain: [0, MAX_K + 0.5], ticks: 5 },
    y: {
      label: "Chance of at least one false positive",
      domain: [0, 0.78],
      ticks: 5,
      tickFormat: "%",
    },
    marks: [
      // Even odds, the line the curve crosses somewhere in the teens: past it,
      // a "finding" is the more likely outcome of finding nothing.
      Plot.ruleY([0.5], { stroke: GUIDE, strokeWidth: 1, strokeDasharray: "4,3" }),
      Plot.text([0.5], {
        x: 0.4,
        y: (d) => d,
        text: () => "even odds",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        dy: -10,
        ...HALO,
      }),

      Plot.areaY(curve, { x: "k", y: "p", fill: ACCENT, fillOpacity: 0.13 }),
      Plot.lineY(curve, { x: "k", y: "p", stroke: ACCENT, strokeWidth: 2 }),
      Plot.dot(MARKS, { x: "k", y: "p", r: 3.5, fill: ACCENT, stroke: null }),
      Plot.text(MARKS, {
        x: "k",
        y: "p",
        text: (d) => `${d.k} test${d.k === 1 ? "" : "s"}\n${Math.round(d.p * 100)}%`,
        fill: ACCENT,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.25,
        // The last mark sits against the right edge, so its label turns inward
        // rather than running off the frame.
        textAnchor: (d) => (d.k === MAX_K ? "end" : "start"),
        dx: (d) => (d.k === MAX_K ? -10 : 10),
        dy: -28,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
