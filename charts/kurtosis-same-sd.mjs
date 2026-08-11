/**
 * Three distributions with the same mean and the same standard deviation, and
 * one of them will hurt you.
 *
 * Mean and standard deviation are the two numbers everybody reports, and
 * between them they pin down a normal distribution completely. For anything
 * else they leave the part that matters unspecified, which is the tail.
 *
 * All three samples here have a mean of zero and a standard deviation of one.
 * The normal is the reference. The heavy-tailed one (a t with four degrees of
 * freedom, rescaled) is *narrower in the middle* and much fatter at the edges:
 * it produces more values very close to the mean and more values very far from
 * it, and fewer in between. The uniform is the opposite, with no tail at all
 * past its edges.
 *
 * The number that separates them is kurtosis, which is the fourth standardised
 * moment, and it is worth knowing what it is not: it is not "peakedness",
 * despite decades of textbooks saying so. Kurtosis is dominated by the fourth
 * power of the distance from the mean, so it is almost entirely a statement
 * about how much probability lives far out.
 *
 * The practical stake is on the right of the chart. Under a normal, a value
 * beyond three standard deviations happens about once in 370. Under this
 * heavy-tailed distribution it happens several times as often, and the ratio
 * grows without limit as you go further out. Every rule of thumb built on
 * "three sigma" is silently assuming a shape, and finance, insurance, network
 * traffic and queueing all live in distributions that do not have it.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES, linspace, normalPdf } from "./_theme.mjs";

export const title =
  "Three distributions with identical mean and standard deviation: a normal, a heavy-tailed t, and a uniform. Beyond three standard deviations the normal puts 0.27 per cent of its probability, the heavy-tailed one about five times that, and the uniform none at all.";

const GRID = linspace(-4.6, 4.6, 361);

/** Student's t with 4 df, rescaled to unit variance (var = df/(df−2) = 2). */
const T_DF = 4;
const tPdf = (x) => {
  const s = Math.sqrt(T_DF / (T_DF - 2));
  const z = x * s;
  const g = 0.375; // Γ(2.5)/(√(4π)Γ(2)) for df = 4
  return s * g * (1 + (z * z) / T_DF) ** (-(T_DF + 1) / 2);
};
/** Uniform with unit variance spans ±√3. */
const U_HALF = Math.sqrt(3);
const uniformPdf = (x) => (Math.abs(x) <= U_HALF ? 1 / (2 * U_HALF) : 0);

const SHAPES = [
  { key: "Normal", f: (x) => normalPdf(x, 0, 1), color: PRIMARY, beyond: 0.0027 },
  { key: "Heavy-tailed (t, 4 df)", f: tPdf, color: ACCENT, beyond: null },
  { key: "Uniform", f: uniformPdf, color: SERIES[4], beyond: 0 },
];

/** Tail mass past three SDs, integrated from the curve rather than looked up,
 *  so the caption cannot drift from the drawing. */
const tailMass = (f) => {
  const xs = linspace(3, 40, 4000);
  let s = 0;
  for (let i = 1; i < xs.length; i++) s += ((f(xs[i]) + f(xs[i - 1])) / 2) * (xs[i] - xs[i - 1]);
  return 2 * s;
};
const CURVES = SHAPES.map((s) => ({
  ...s,
  mass: s.beyond ?? tailMass(s.f),
  points: GRID.map((x) => ({ x, y: s.f(x) })),
}));

const HEAVY = CURVES[1];
const NORMAL = CURVES[0];
const RATIO = Math.round(HEAVY.mass / NORMAL.mass);

export const caption = `Mean and standard deviation pin a normal distribution down completely, and for anything else they leave the part that matters unspecified. All three of these have a mean of zero and a standard deviation of one. The heavy-tailed one is *narrower* in the middle and much fatter at the edges: more values very close to the mean, more very far from it, fewer in between. The uniform has no tail past its edges at all. The number separating them is kurtosis, the fourth standardised moment, and it is worth knowing what it is not: it is not peakedness, despite decades of textbooks. It is dominated by the fourth power of the distance from the mean, so it is almost entirely a statement about how much probability lives far out. The stake is at the right of the chart. Under a normal, a value beyond three standard deviations happens about once in ${Math.round(1 / NORMAL.mass)}; under this t it happens about ${RATIO} times as often. Every rule built on three sigma is quietly assuming a shape, and finance, insurance, network traffic and queueing all live in distributions that do not have it.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 46,
    marginRight: 152,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Standard deviations from the mean",
      labelAnchor: "center",
      domain: [-4.6, 4.6],
      ticks: [-4, -3, 0, 3, 4],
    },
    y: { label: "Density", domain: [0, 0.62], ticks: [0, 0.2, 0.4, 0.6] },
    marks: [
      Plot.ruleX([-3, 3], { stroke: GUIDE, strokeWidth: 1.2, strokeDasharray: "4,3" }),
      ...CURVES.map((c) =>
        Plot.line(c.points, { x: "x", y: "y", stroke: c.color, strokeWidth: 2.2, clip: true }),
      ),
      // The tails, shaded, because that is the entire subject.
      ...CURVES.map((c) =>
        Plot.areaY(
          c.points.filter((d) => d.x >= 3),
          { x: "x", y: "y", fill: c.color, fillOpacity: 0.35, clip: true },
        ),
      ),
      Plot.text(
        CURVES.map((c, i) => ({ ...c, lx: 4.6, ly: 0.55 - i * 0.075 })),
        {
          x: "lx",
          y: "ly",
          text: (d) =>
            `${d.key}\nbeyond 3 SD: ${d.mass === 0 ? "none" : `${(d.mass * 100).toFixed(2)}%`}`,
          fill: "color",
          fontSize: 10.5,
          fontWeight: 700,
          lineHeight: 1.35,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 3,
        y: 0.6,
        text: () => "three standard deviations",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 3.5,
        y: 0.045,
        text: () => `${RATIO}× the normal's\ntail mass out here`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -16,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
