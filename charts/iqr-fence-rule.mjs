/**
 * Where the 1.5 in the 1.5×IQR rule comes from, and what it is actually
 * claiming.
 *
 * The rule is usually taught as a recipe with a magic constant. It is not
 * magic: on a normal distribution the quartiles sit at ±0.6745 standard
 * deviations, so the fences land at ±2.698σ, and about 0.7% of a normal
 * sample falls outside them. Tukey chose 1.5 to make "unusual" mean roughly
 * one row in a hundred and fifty rather than one in twenty.
 *
 * Which is the point the recipe hides: the fence flags a *rate*, not a
 * mistake. Run it on 10,000 clean normal rows and it will hand you about 70
 * of them, every one perfectly good data. "Outlier" here means "far from the
 * middle by this yardstick", and whether that makes it wrong is a question
 * about the measurement, not about the arithmetic.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, normalCurve } from "./_theme.mjs";

export const title =
  "A normal curve with the quartiles, the interquartile range and the two 1.5×IQR fences marked. The fences sit at about 2.7 standard deviations, leaving roughly seven tenths of one per cent of the distribution outside them.";

/** Quartiles of the standard normal, in standard deviations. */
const Q = 0.6745;
const IQR = 2 * Q;
const FENCE = Q + 1.5 * IQR; // 2.698σ

const CURVE = normalCurve(-4, 4, 0, 1, 321);
const PEAK = Math.max(...CURVE.map((d) => d.y));

const INSIDE = CURVE.filter((d) => d.x >= -FENCE && d.x <= FENCE);
const MIDDLE = CURVE.filter((d) => d.x >= -Q && d.x <= Q);
const LEFT = CURVE.filter((d) => d.x <= -FENCE);
const RIGHT = CURVE.filter((d) => d.x >= FENCE);

/** Normal tail beyond the fences, by Abramowitz–Stegun 7.1.26, so the caption
 *  quotes a computed rate rather than a remembered one. */
function tailBeyond(z) {
  const t = 1 / (1 + 0.3275911 * (z / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-((z / Math.SQRT2) ** 2));
  return 1 - y;
}

const OUTSIDE = tailBeyond(FENCE);
const PER_10K = Math.round(OUTSIDE * 10_000);

export const caption = `The 1.5 is not magic. On a normal distribution the quartiles sit at ±${Q}σ, so the interquartile range is ${IQR.toFixed(2)}σ and the fences land at ±${FENCE.toFixed(2)}σ, leaving about ${(OUTSIDE * 100).toFixed(1)}% of the distribution outside them. Tukey picked 1.5 to make "unusual" mean roughly one row in a hundred and fifty. Which is what the recipe hides: the rule flags a *rate*, not a mistake. Run it over 10,000 clean normal rows and it hands back about ${PER_10K}, every one good data. Whether a flagged point is wrong is a question about the measurement; the fence only says it is far from the middle by this yardstick.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 40,
    marginLeft: 56,
    marginRight: 24,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Standard deviations from the mean",
      labelAnchor: "center",
      domain: [-4, 4],
      ticks: [-4, -3, -2, -1, 0, 1, 2, 3, 4],
    },
    y: { label: "Density", domain: [0, PEAK * 1.3], ticks: [], grid: false },
    marks: [
      Plot.areaY(INSIDE, { x: "x", y: "y", fill: PRIMARY, fillOpacity: 0.12 }),
      Plot.areaY(MIDDLE, { x: "x", y: "y", fill: PRIMARY, fillOpacity: 0.22 }),
      // The tails the rule flags, drawn at full strength: they are the subject,
      // and at this scale they are a sliver that needs the contrast.
      Plot.areaY(LEFT, { x: "x", y: "y", fill: ACCENT, fillOpacity: 0.75 }),
      Plot.areaY(RIGHT, { x: "x", y: "y", fill: ACCENT, fillOpacity: 0.75 }),
      Plot.line(CURVE, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),

      Plot.ruleX([-Q, Q], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.ruleX([-FENCE, FENCE], { stroke: ACCENT, strokeWidth: 1.5 }),

      // The IQR as a measured span between the quartiles.
      Plot.ruleY([PEAK * 1.1], { x1: -Q, x2: Q, stroke: GUIDE, strokeWidth: 1.4 }),
      Plot.text([{}], {
        x: 0,
        y: PEAK * 1.1,
        text: () => `IQR = ${IQR.toFixed(2)}σ`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        dy: -9,
        ...HALO,
      }),
      Plot.text(
        [
          { x: -Q, label: "Q1" },
          { x: Q, label: "Q3" },
        ],
        { x: "x", y: PEAK * 0.97, text: "label", fill: MUTED, fontSize: 11, fontWeight: 600, ...HALO },
      ),
      Plot.text(
        [
          { x: -FENCE, label: "Q1 − 1.5×IQR" },
          { x: FENCE, label: "Q3 + 1.5×IQR" },
        ],
        {
          x: "x",
          y: PEAK * 0.62,
          text: "label",
          fill: ACCENT,
          fontSize: 10.5,
          fontWeight: 600,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 0,
        y: PEAK * 0.3,
        text: () => `${(OUTSIDE * 100).toFixed(1)}% of a clean normal sample\nfalls outside these fences`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        ...HALO,
      }),
    ],
  });
}
