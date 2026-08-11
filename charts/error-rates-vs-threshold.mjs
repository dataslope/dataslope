/**
 * The α/β tradeoff as a pair of curves in the threshold, rather than as two
 * shaded distributions.
 *
 * `alpha-power-tradeoff` draws the same fact the textbook way: two bell curves,
 * one threshold, the tails shaded. That picture answers *why* the two rates
 * move in opposite directions, and it answers it for one threshold at a time.
 * This one answers a different question, which is *by how much*: sweep the
 * critical value across its whole useful range and plot both error rates
 * against it, and the tradeoff stops being a direction and becomes a pair of
 * numbers you can read off.
 *
 * The two curves cross, which is the detail worth having on the page. The
 * crossing point is not a recommendation, it is simply where the two mistakes
 * are equally likely, and almost no real problem wants that: the whole reason
 * α is conventionally far below β is that the two mistakes usually cost
 * different amounts. Marking the conventional α = 0.05 well to the right of
 * the crossing makes that asymmetry visible instead of asserted.
 *
 * The two rates get different colors rather than one color and two dash
 * patterns. They are the same *kind* of thing, which argues for one color, but
 * they are the two things the reader has to hold apart while reading a crossing,
 * and at the widths a line is drawn a dash pattern is not enough to tell them
 * apart at a glance.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

const ALPHA_COLOR = ACCENT;
const BETA_COLOR = SERIES[3];

export const title =
  "Two curves against the position of the critical value: the false-positive rate falls as the threshold moves right, and the miss rate rises. They cross near the middle, and the conventional five percent significance level sits well to the right of that crossing, where the miss rate is far higher than the false-positive rate.";

/** The alternative's mean, in standard errors: a real but not enormous effect,
 *  the regime where the tradeoff actually bites. */
const EFFECT = 2.6;

/** Standard normal tail areas, by Abramowitz & Stegun 7.1.26 on erf. Plot has
 *  no CDF and this is the only distribution function the spec needs. */
function normalCdf(z) {
  const s = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + s * y);
}

const alphaAt = (crit) => 1 - normalCdf(crit);
const betaAt = (crit) => normalCdf(crit - EFFECT);

const DOMAIN = [0.2, 3.6];
const CRITS = linspace(DOMAIN[0], DOMAIN[1], 181);

const CURVES = [
  { key: "alpha", f: alphaAt, color: ALPHA_COLOR },
  { key: "beta", f: betaAt, color: BETA_COLOR },
];

const rows = CURVES.flatMap((c) => CRITS.map((x) => ({ key: c.key, x, y: c.f(x) })));

/** Where the two mistakes are equally likely. By symmetry that is the midpoint
 *  between the two means, but it is found on the drawn grid so the marked
 *  point cannot drift off the curves it is supposed to sit on. */
const cross = CRITS.reduce((a, b) =>
  Math.abs(alphaAt(b) - betaAt(b)) < Math.abs(alphaAt(a) - betaAt(a)) ? b : a,
);

/** The conventional one-sided 5% threshold. */
const CONVENTIONAL = 1.645;
const BETA_AT_5 = betaAt(CONVENTIONAL);

export const caption = `Sliding the critical value is the only lever a fixed sample gives you, and it moves both mistakes at once in opposite directions. The two rates are equal only at the crossing (α = β ≈ ${alphaAt(cross).toFixed(2)} here); the conventional 5% level sits well to the right of it, buying a low false-positive rate at the cost of missing about ${Math.round(BETA_AT_5 * 100)}% of real effects this size. That is a values decision, not a mathematical one, and the only way out of the trade is a bigger sample, which pulls the whole picture down.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 28,
    marginLeft: 54,
    marginRight: 128,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Where the critical value sits (standard errors above the null)",
      labelAnchor: "center",
      domain: DOMAIN,
      ticks: 6,
    },
    y: {
      label: "Error rate",
      domain: [0, 1],
      ticks: [0, 0.25, 0.5, 0.75, 1],
      tickFormat: (d) => `${Math.round(d * 100)}%`,
    },
    marks: [
      // The conventional operating point, drawn first so both curves cross it.
      Plot.ruleX([CONVENTIONAL], {
        y1: 0,
        y2: 0.92,
        stroke: GUIDE,
        strokeWidth: 1,
        strokeDasharray: "3,3",
      }),
      Plot.text([{}], {
        x: CONVENTIONAL,
        y: 0.92,
        text: () => "the conventional\nα = 0.05",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        dy: -12,
        ...HALO,
      }),

      ...CURVES.map((c) =>
        Plot.line(rows.filter((d) => d.key === c.key), {
          x: "x",
          y: "y",
          stroke: c.color,
          strokeWidth: 2.4,
        }),
      ),

      // Where the two mistakes are equally likely, which is a fact about the
      // curves rather than a recommendation.
      Plot.dot([cross], { x: (d) => d, y: (d) => alphaAt(d), r: 4, fill: MUTED, stroke: null }),
      Plot.text([cross], {
        x: (d) => d,
        y: (d) => alphaAt(d),
        text: () => "equally likely\nmistakes",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -10,
        dy: -14,
        ...HALO,
      }),

      // Each curve is labelled at the end where it is high, so neither label
      // has to sit on the axis or on the other curve.
      Plot.text([{}], {
        x: DOMAIN[0],
        y: alphaAt(DOMAIN[0]),
        text: () => "α\nfalse positives",
        fill: ALPHA_COLOR,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 6,
        dy: -18,
        ...HALO,
      }),
      Plot.text([{}], {
        x: DOMAIN[1],
        y: betaAt(DOMAIN[1]),
        text: () => "β\nmissed effects\n(1 − power)",
        fill: BETA_COLOR,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -14,
        dy: 28,
        ...HALO,
      }),

      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
