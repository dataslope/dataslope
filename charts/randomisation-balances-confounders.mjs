/**
 * What randomisation buys, including for the variables nobody wrote down.
 *
 * Ten covariates, two arms, and the bars are how far apart the arms are on each
 * one, in standardised units. Under self-selection the imbalances are large and
 * they are not random: people who chose the treatment differ systematically,
 * and every one of those differences is a candidate explanation for whatever
 * the study finds.
 *
 * Under randomisation the imbalances collapse to noise. They are not zero,
 * because a coin flip on a finite sample does not produce perfect balance, and
 * expecting zero is a common misreading. What randomisation guarantees is that
 * the imbalance is *random*, with a known distribution, which is exactly what
 * lets a p-value mean anything.
 *
 * The part that matters most is the right-hand pair, marked as unmeasured.
 * Statistical adjustment, matching, regression, propensity scores, can only
 * balance variables you have. Randomisation balances variables you have *and*
 * variables you have never heard of, because the coin does not know what it is
 * balancing. That is the entire reason a randomised trial licenses a causal
 * claim and an observational study does not, and it is not a matter of degree:
 * no amount of careful adjustment covers the ones you did not measure.
 *
 * Two honest limits. Randomisation says nothing about whether the sample
 * represents anyone, which is a separate question about external validity. And
 * it can be undone after the fact by attrition: if people drop out for reasons
 * related to the treatment, the groups that remain are self-selected again.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, normalSamples } from "./_theme.mjs";

export const title =
  "Standardised imbalance between two arms across ten covariates, under self-selection and under randomization. Self-selection leaves large systematic gaps including on the two unmeasured variables; randomization collapses all ten to noise.";

const COVARIATES = [
  { key: "Age", bias: 0.62 },
  { key: "Income", bias: 0.71 },
  { key: "Education", bias: 0.55 },
  { key: "Prior use", bias: 0.88 },
  { key: "Region", bias: 0.31 },
  { key: "Device", bias: 0.44 },
  { key: "Tenure", bias: 0.58 },
  { key: "Support tickets", bias: 0.36 },
  { key: "Motivation", bias: 0.79, unmeasured: true },
  { key: "Health literacy", bias: 0.66, unmeasured: true },
];

const NOISE = normalSamples(COVARIATES.length, 0, 0.055, 5_711);
const ROWS = COVARIATES.map((c, i) => ({
  ...c,
  selected: c.bias,
  randomised: Math.abs(NOISE[i]),
}));

const ORDER = ROWS.map((d) => d.key);
const THRESHOLD = 0.1; // the usual "balanced" cutoff for a standardised difference
const OVER = ROWS.filter((d) => d.selected > THRESHOLD).length;
const OVER_RAND = ROWS.filter((d) => d.randomised > THRESHOLD).length;
const UNMEASURED = ROWS.filter((d) => d.unmeasured);

export const caption = `Ten covariates and the standardised gap between two arms on each. Under self-selection ${OVER} of the ten exceed the usual 0.1 threshold for balance; under randomization ${OVER_RAND} do.`;

export function render() {
  return plot({
    height: 380,
    marginTop: 26,
    marginLeft: 118,
    marginRight: 128,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Standardised difference between the arms",
      labelAnchor: "center",
      domain: [0, 1],
      ticks: [0, 0.1, 0.25, 0.5, 0.75, 1],
      tickFormat: (v) => v.toFixed(2).replace(/0$/, ""),
    },
    y: { label: null, domain: ORDER, padding: 0.34, grid: false },
    marks: [
      Plot.ruleY(ORDER, { stroke: "currentColor", strokeOpacity: 0.07 }),
      Plot.ruleX([THRESHOLD], { stroke: GUIDE, strokeWidth: 1.4, strokeDasharray: "4,3" }),
      Plot.link(ROWS, {
        y: "key",
        x1: "randomised",
        x2: "selected",
        stroke: MUTED,
        strokeOpacity: 0.3,
        strokeWidth: 1.2,
      }),
      Plot.dot(ROWS, {
        y: "key",
        x: "selected",
        r: 4.8,
        fill: ACCENT,
        fillOpacity: (d) => (d.unmeasured ? 1 : 0.75),
      }),
      Plot.dot(ROWS, { y: "key", x: "randomised", r: 4.8, fill: PRIMARY }),
      Plot.text(
        ROWS.filter((d) => d.unmeasured),
        {
          y: "key",
          x: 1,
          text: () => "never recorded",
          fill: ACCENT,
          fontSize: 10,
          fontWeight: 700,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{ at: ORDER[0] }], {
        y: "at",
        x: ROWS[0].selected,
        text: () => "self-selected",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -14,
        ...HALO,
      }),
      Plot.text([{ at: ORDER[0] }], {
        y: "at",
        x: ROWS[0].randomised,
        text: () => "randomized",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dy: -14,
        ...HALO,
      }),
      Plot.text([{ at: ORDER[4] }], {
        y: "at",
        x: THRESHOLD,
        text: () => "0.1, the usual\n\"balanced\" line",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
