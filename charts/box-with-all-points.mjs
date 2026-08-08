/**
 * Four small groups as boxes, and the same four with every observation shown,
 * which is the only version that admits how little data there is.
 *
 * A box plot looks the same whether it was computed from nine observations or
 * nine thousand. The five numbers are drawn at full size either way, the
 * whiskers reach out with the same confidence, and nothing on the chart says
 * which case the reader is in. On nine points a quartile is barely a quantity:
 * move one observation and the box changes shape.
 *
 * Overlaying the points fixes it for free. The reader can count them, see that
 * the third group is three observations pretending to be a distribution, see
 * that the second group's "outlier" is one of only eleven values and not an
 * anomaly at all, and calibrate their confidence accordingly. This is what
 * `points="all"` is for, and on small samples it should be the default rather
 * than an option.
 *
 * The jitter is horizontal only. Displacing a point vertically would move it
 * on the axis that carries the measurement, which is a different chart and a
 * false one.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Four groups drawn as box plots and again as boxes with every observation jittered on top. The boxes look equally solid; the points reveal that the groups hold eleven, nine, three and fourteen observations.";

const u = rng(2884);
const draw = (n, mean, sd) =>
  Array.from({ length: n }, () => {
    const a = Math.max(u(), Number.EPSILON);
    const b = u();
    return mean + sd * Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
  });

const GROUPS = [
  { key: "Control", values: draw(11, 52, 9) },
  { key: "Variant A", values: draw(9, 58, 11) },
  { key: "Variant B", values: draw(3, 61, 7) },
  { key: "Variant C", values: draw(14, 49, 8) },
];

function quantile(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}

const BOXES = "Boxes only";
const POINTS = "Boxes with every point";

const stats = GROUPS.map((g, i) => ({
  key: g.key,
  c: i,
  n: g.values.length,
  q1: quantile(g.values, 0.25),
  med: quantile(g.values, 0.5),
  q3: quantile(g.values, 0.75),
  lo: Math.min(...g.values),
  hi: Math.max(...g.values),
}));

const boxes = [BOXES, POINTS].flatMap((panel) => stats.map((s) => ({ ...s, panel })));

/** Horizontal jitter only: a vertical nudge would move a point along the axis
 *  that carries its value. */
const dots = GROUPS.flatMap((g, i) =>
  g.values.map((v) => ({ panel: POINTS, key: g.key, c: i + (u() - 0.5) * 0.34, v })),
);

const SMALLEST = stats.reduce((a, b) => (a.n <= b.n ? a : b));
const LARGEST = stats.reduce((a, b) => (a.n >= b.n ? a : b));

export const caption = `A box plot looks identical whether it came from nine observations or nine thousand. The five numbers are drawn at full size either way, the whiskers reach out with the same confidence, and nothing on the chart says which case the reader is in. On this data the groups hold ${stats.map((s) => s.n).join(", ")} observations, and the left panel gives no hint of that: ${SMALLEST.key} is ${SMALLEST.n} points wearing a box, and its quartiles would change shape if any one of them moved. Overlaying the points fixes it at no cost. A reader can count them, see which groups are worth an opinion, and see that ${LARGEST.key}'s spread rests on ${LARGEST.n} values rather than on a summary that was never checked. That is what points="all" is for, and on small samples it deserves to be the default rather than an option. Note that the jitter is horizontal only: nudging a point vertically would move it along the axis carrying its value.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 46,
    marginRight: 20,
    marginBottom: 52,
    ariaLabel: title,
    fx: { label: null, domain: [BOXES, POINTS] },
    x: {
      label: null,
      domain: [-0.62, GROUPS.length - 0.38],
      ticks: GROUPS.map((_, i) => i),
      tickFormat: (i) => GROUPS[i].key,
    },
    y: { label: "Score", domain: [26, 82], ticks: 4 },
    marks: [
      Plot.ruleX(boxes, {
        fx: "panel",
        x: "c",
        y1: "lo",
        y2: "hi",
        stroke: PRIMARY,
        strokeWidth: 1.3,
      }),
      Plot.rect(boxes, {
        fx: "panel",
        x1: (d) => d.c - 0.22,
        x2: (d) => d.c + 0.22,
        y1: "q1",
        y2: "q3",
        fill: PRIMARY,
        fillOpacity: 0.16,
        stroke: PRIMARY,
        strokeWidth: 1.3,
      }),
      Plot.ruleY(boxes, {
        fx: "panel",
        y: "med",
        x1: (d) => d.c - 0.22,
        x2: (d) => d.c + 0.22,
        stroke: PRIMARY,
        strokeWidth: 2.2,
      }),
      Plot.dot(dots, {
        fx: "panel",
        x: "c",
        y: "v",
        r: 2.9,
        fill: (d) => (d.key === SMALLEST.key ? ACCENT : PRIMARY),
        fillOpacity: 0.9,
      }),
      // The counts, printed only where the chart can be checked against them.
      Plot.text(stats, {
        fx: () => POINTS,
        x: "c",
        frameAnchor: "bottom",
        text: (d) => `n = ${d.n}`,
        fill: (d) => (d.key === SMALLEST.key ? ACCENT : MUTED),
        fontSize: 10,
        fontWeight: 600,
        dy: 26,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => BOXES,
        frameAnchor: "bottom-left",
        text: () => "four equally confident boxes",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        dy: -4,
        ...HALO,
      }),
    ],
  });
}
