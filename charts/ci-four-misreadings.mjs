/**
 * One interval, and the four things people believe it says.
 *
 * A 95% confidence interval makes a claim about the *procedure*: if you ran the
 * whole study many times, 95% of the intervals it produced would contain the
 * true value. That is a statement about a long run of intervals, and every
 * common misreading turns it into a statement about this one.
 *
 * Each row draws what the belief would require to be true, next to what the
 * interval actually claims:
 *
 *   • **"95% chance the true value is in here."** That would need the true
 *     value to be random and the interval fixed. It is the other way round: the
 *     parameter sits still and the interval is what moves from sample to
 *     sample. (A Bayesian credible interval *does* say this, which is why the
 *     two get confused, and it needs a prior to do it.)
 *   • **"95% of the data falls in here."** That is a prediction interval, and
 *     it is much wider, because it carries the spread of individuals as well as
 *     the uncertainty about the mean.
 *   • **"95% of future sample means will fall in here."** Closer, and still
 *     wrong: capturing a future estimate requires an interval about √2 times as
 *     wide, because two estimates each carry sampling error.
 *   • **"The values inside are plausible and the ones outside are not."** The
 *     boundary is not a cliff. The last row shades every value by how well the
 *     data supports it, and nothing happens at the endpoints: a value a hair
 *     outside is barely less compatible than one a hair inside.
 *
 * The reading that survives: an interval is a *range of parameter values the
 * data does not rule out*, at a stated standard of evidence, and its width is
 * the useful part.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, linspace } from "./_theme.mjs";

export const title =
  "One 95 per cent confidence interval beside the intervals that the common misreadings would actually require: a credible interval, a much wider prediction interval, an interval √2 times wider for a future sample mean, and a smooth compatibility curve showing the boundary is not a cliff.";

const MEAN = 100;
const SE = 2.4;
const SD = 15;
const Z = 1.96;

const CI = [MEAN - Z * SE, MEAN + Z * SE];
const PRED_SE = Math.sqrt(SD * SD + SE * SE);
const PREDICTION = [MEAN - Z * PRED_SE, MEAN + Z * PRED_SE];
const FUTURE_MEAN = [MEAN - Z * SE * Math.SQRT2, MEAN + Z * SE * Math.SQRT2];

const ROWS = [
  {
    key: "What it does say",
    span: CI,
    note: "run the study many times and 95%\nof those intervals hold the truth",
    right: true,
  },
  {
    key: "“95% chance the truth is in here”",
    span: CI,
    note: "needs the parameter to be random:\nthat is a credible interval, and it needs a prior",
  },
  {
    key: "“95% of the data is in here”",
    span: PREDICTION,
    note: `that is a prediction interval: ${PREDICTION[0].toFixed(0)} to ${PREDICTION[1].toFixed(0)}, off both ends\nof this panel, because it carries the spread of individuals too`,
    open: true,
  },
  {
    key: "“95% of future means land in here”",
    span: FUTURE_MEAN,
    note: "needs √2 times the width:\ntwo estimates, two lots of sampling error",
  },
];

const CLIFF = "“inside is plausible, outside is not”";
const ORDER = [...ROWS.map((d) => d.key), CLIFF];
const PRED_RATIO = ((PREDICTION[1] - PREDICTION[0]) / (CI[1] - CI[0])).toFixed(1);

/** Standard normal tail, good to about six decimal places, so the last row can
 *  be shaded by each candidate value's compatibility with the data. */
function tail(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-0.5 * z * z);
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? p : 1 - p;
}
const compatibility = (v) => 2 * tail(Math.abs(v - MEAN) / SE);

const DOMAIN = [88, 112];

/** Drawn as graded ticks: a smooth curve, with the interval's endpoints laid
 *  over it, so the endpoints can be seen not to coincide with anything. */
const GRADIENT = linspace(DOMAIN[0], DOMAIN[1], 190).map((v) => ({
  v,
  key: CLIFF,
  // Gamma-corrected so the tails stay visible; the numbers live in the caption.
  support: Math.sqrt(compatibility(v)),
}));
/** Where the same interval's right-hand edge sits under two other conventions,
 *  which is what "outside is ruled out" is really resting on. */
const EDGE_80 = (MEAN + 1.2816 * SE).toFixed(1);
const EDGE_99 = (MEAN + 2.5758 * SE).toFixed(1);

export const caption = `A 95% confidence interval makes a claim about the *procedure*: run the whole study many times and 95% of the intervals it produces contain the true value. That is a statement about a long run of intervals, and every common misreading turns it into a statement about this one. Each row draws what the belief would need in order to be true. "95% chance the truth is in here" needs the parameter to be random and the interval fixed, and it is the other way round; that sentence describes a Bayesian credible interval, which is why the two are confused, and which needs a prior. "95% of the data is in here" is a prediction interval, ${PRED_RATIO} times wider at this sample size, because it carries the spread of individuals as well as the uncertainty about the mean. "95% of future sample means land in here" is closer and still wrong: capturing a future estimate takes about √2 times the width, because two estimates each carry sampling error. The last row shades every candidate value by how compatible it is with the data, and the endpoints land on nothing: the curve is smooth, and the dashed lines are sitting where a convention put them. Move the convention and they move with it. This interval's right-hand edge is at ${CI[1].toFixed(1)} at 95%, ${EDGE_80} at 80% and ${EDGE_99} at 99%, so whether ${EDGE_80} is "ruled out" is a question about the standard of evidence rather than about the value. The reading that survives all four is that an interval is a range of parameter values the data does not rule out at a stated standard of evidence, and that its width is the useful part.`;

export function render() {
  return plot({
    height: 360,
    marginTop: 30,
    marginLeft: 208,
    marginRight: 22,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Value",
      labelAnchor: "center",
      domain: DOMAIN,
      ticks: [90, 95, 100, 105, 110],
    },
    y: { label: null, domain: ORDER, padding: 0.5, grid: false },
    marks: [
      Plot.ruleY(ORDER, { stroke: "currentColor", strokeOpacity: 0.07 }),
      Plot.ruleX([MEAN], { stroke: GUIDE, strokeWidth: 1.3, strokeDasharray: "4,3" }),

      Plot.tickX(GRADIENT, {
        x: "v",
        y: "key",
        stroke: ACCENT,
        strokeOpacity: (d) => 0.06 + 0.68 * d.support,
        strokeWidth: 3,
      }),
      Plot.tickX(
        CI.map((v) => ({ v, key: CLIFF })),
        { x: "v", y: "key", stroke: MUTED, strokeWidth: 1.4, strokeDasharray: "3,2" },
      ),

      Plot.link(
        ROWS.filter((d) => !d.open),
        {
          y: "key",
          x1: (d) => d.span[0],
          x2: (d) => d.span[1],
          stroke: (d) => (d.right ? PRIMARY : ACCENT),
          strokeOpacity: (d) => (d.right ? 1 : 0.7),
          strokeWidth: 4,
          strokeLinecap: "round",
        },
      ),
      // The prediction interval does not fit on a panel scaled to the
      // confidence interval, which is the point it is here to make.
      Plot.link(
        ROWS.filter((d) => d.open),
        {
          y: "key",
          x1: DOMAIN[0] + 0.4,
          x2: DOMAIN[1] - 0.4,
          stroke: ACCENT,
          strokeOpacity: 0.7,
          strokeWidth: 4,
          markerStart: "arrow",
          markerEnd: "arrow",
        },
      ),
      Plot.dot(ROWS, { y: "key", x: () => MEAN, r: 4, fill: (d) => (d.right ? PRIMARY : ACCENT) }),

      Plot.text(ROWS, {
        y: "key",
        x: () => MEAN,
        text: "note",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        dy: 22,
        ...HALO,
      }),
      Plot.text([{ at: CLIFF }], {
        y: "at",
        x: MEAN,
        text: () => `compatibility with the data, shaded: a smooth curve with nothing at the dashed edges.\nAt 80% they would sit at ${EDGE_80}, at 99% at ${EDGE_99}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        dy: 24,
        ...HALO,
      }),
      Plot.text([{ at: ORDER[0] }], {
        y: "at",
        x: MEAN,
        text: () => "the estimate",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -16,
        ...HALO,
      }),
    ],
  });
}
