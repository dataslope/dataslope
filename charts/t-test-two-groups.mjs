/**
 * What a t-test is actually asking, drawn as the three quantities it is made
 * of.
 *
 * The statistic is one ratio: the gap between the group means, divided by how
 * much that gap would wobble from sampling alone. Everything else is
 * bookkeeping. So the useful picture is not the formula, it is three pairs of
 * groups where the *difference in means is identical* and the answer is
 * completely different, because the other two ingredients moved.
 *
 * Same gap, wider spread: the wobble grows and the evidence evaporates. Same
 * gap, same spread, more rows: the wobble shrinks and the same difference
 * becomes convincing. That is the whole intuition, and it is also the answer
 * to both of the questions people ask afterwards, which are "why did my
 * significant result stop being significant on new data?" and "why is this
 * enormous sample calling a rounding error significant?".
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, normalSamples } from "./_theme.mjs";

export const title =
  "Three pairs of groups with the same three-point difference in means. Wide spread makes it unconvincing, tighter spread makes it convincing, and a larger sample at the wide spread makes it convincing again.";

const GAP = 3;
const BASE = 50;

const CASES = [
  { key: "Wide spread, n = 20", sd: 9, n: 20 },
  { key: "Tight spread, n = 20", sd: 3, n: 20 },
  { key: "Wide spread, n = 200", sd: 9, n: 200 },
];

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const variance = (xs) => {
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
};

/** Draw a sample and slide it so its mean is exactly `target`.
 *
 *  The chart's claim is that the difference in means is *identical* in all
 *  three panels and only the denominator moves. Sampling independently does
 *  not give that: a draw whose realised means happen to sit closer together
 *  than intended makes one panel disagree with its own caption, which is
 *  exactly what the first version of this chart did (the tight-spread panel
 *  came out with the same t as the wide one, contradicting the point).
 *  Recentring preserves the spread, which is the variable, and pins the gap,
 *  which is the constant.
 */
function centred(n, target, sd, seed) {
  const xs = normalSamples(n, 0, sd, seed);
  const m = xs.reduce((t, x) => t + x, 0) / n;
  return xs.map((x) => x - m + target);
}

let seed = 91;
const rows = [];
const summary = [];
for (const c of CASES) {
  const a = centred(c.n, BASE, c.sd, (seed += 17));
  const b = centred(c.n, BASE + GAP, c.sd, (seed += 17));
  for (const v of a) rows.push({ panel: c.key, group: "A", value: v });
  for (const v of b) rows.push({ panel: c.key, group: "B", value: v });

  // Welch's t: the difference in means over the standard error of that
  // difference. The denominator is the whole subject of the chart.
  const se = Math.sqrt(variance(a) / a.length + variance(b) / b.length);
  summary.push({
    panel: c.key,
    a: mean(a),
    b: mean(b),
    diff: mean(b) - mean(a),
    se,
    t: (mean(b) - mean(a)) / se,
  });
}

const MEANS = summary.flatMap((s) => [
  { panel: s.panel, group: "A", value: s.a },
  { panel: s.panel, group: "B", value: s.b },
]);

const T = summary.map((s) => ({
  panel: s.panel,
  label: `t = ${s.t.toFixed(1)}`,
  verdict: Math.abs(s.t) >= 2 ? "convincing" : "could easily be noise",
}));

export const caption = `Three pairs of groups whose means differ by the same ${GAP} points. The t statistic is that difference divided by how much it would wobble from sampling alone, so the gap alone decides nothing: at a wide spread and ${CASES[0].n} rows per group it is t = ${summary[0].t.toFixed(1)}, which is the kind of gap you get for free; tighten the spread and it is ${summary[1].t.toFixed(1)}; keep the wide spread and take ${CASES[2].n} rows instead and it is ${summary[2].t.toFixed(1)}. Same difference, three verdicts. It is also why a significant result can evaporate on new data, and why a large enough sample will call a difference nobody cares about significant.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 32,
    marginLeft: 23,
    marginRight: 138,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: CASES.map((c) => c.key) },
    x: { label: "Measurement", labelAnchor: "center", domain: [20, 80], ticks: 5 },
    y: { label: null, domain: ["A", "B"], padding: 0.35, grid: false },
    marks: [
      Plot.dot(rows, {
        fy: "panel",
        y: "group",
        x: "value",
        r: 2.4,
        fill: (d) => (d.group === "A" ? MUTED : PRIMARY),
        fillOpacity: 0.5,
      }),
      // The two means, which are the same distance apart in every panel.
      Plot.tickX(MEANS, {
        fy: "panel",
        y: "group",
        x: "value",
        stroke: ACCENT,
        strokeWidth: 2.4,
        inset: -6,
      }),
      // Inside the frame, top-left. In the right margin it sat on top of the
      // facet label, which Plot draws there too.
      Plot.text(T, {
        fy: "panel",
        frameAnchor: "top-left",
        text: (d) => `${d.label}: ${d.verdict}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        dy: 4,
        ...HALO,
      }),
    ],
  });
}
