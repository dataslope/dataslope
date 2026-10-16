/**
 * Survivorship bias, drawn as the thing it actually is: a histogram with a
 * piece cut off, and a mean computed from what is left.
 *
 * The funds are the lesson's own (sampling-and-bias.mdx, "Survivorship bias:
 * the most famous trap"): 5,000 annual returns from numpy's
 * `default_rng(3).normal(6, 8, 5000)`, where every fund returning below -4%
 * this period is closed and drops out of the database. A spec cannot replay
 * numpy's generator, so the bins below are that run, binned, and this
 * regenerates them:
 *
 *     import numpy as np
 *     r = np.random.default_rng(3).normal(loc=6.0, scale=8.0, size=5000)
 *     edges = np.arange(-22, 40, 2)
 *     print(np.histogram(r, bins=edges)[0].tolist())
 *     print([round(float(r[(r >= e) & (r < e + 2)].sum()), 2) for e in edges[:-1]])
 *
 * Each bin carries its count and the sum of its returns, so both means are
 * computed here from the same data the bars are drawn from: the gap in the
 * caption is the gap in the drawing, and it is the gap the lesson's code
 * block prints (6.04%, 7.65%, and 515 funds gone).
 *
 * The same shape covers the WWII bomber story, "successful founders dropped
 * out", and every backtest built on today's index membership.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

const BIN_LO = -22;
const BIN_WIDTH = 2;
const COUNTS = [
  2, 1, 15, 18, 27, 54, 80, 140, 178, 275, 374, 400, 437, 488, 483,
  444, 414, 368, 247, 213, 144, 89, 49, 34, 14, 5, 3, 2, 1, 1,
];
const SUMS = [
  -41.53, -18.47, -253.48, -269.2, -350.29, -592.07, -710.76, -982.36,
  -884.05, -811.89, -342.33, 397.72, 1310.18, 2455.38, 3393.6, 4003.94,
  4528.52, 4754.85, 3688.96, 3612.49, 2727.43, 1869.8, 1119.86, 848.46,
  375.78, 143.74, 93.65, 64.93, 34.56, 37.09,
];

/** Anything that returned less than this closed and stopped reporting, which
 *  is the only reason it is missing from the data. A bin edge, so every bin
 *  is wholly open or wholly closed. */
const CLOSED_BELOW = -4;

const bins = COUNTS.map((count, i) => {
  const x1 = BIN_LO + i * BIN_WIDTH;
  return { x1, x2: x1 + BIN_WIDTH, count, sum: SUMS[i], survived: x1 >= CLOSED_BELOW };
});

const total = (rows, key) => rows.reduce((s, b) => s + b[key], 0);
const N = total(bins, "count");
if (N !== 5000 || SUMS.length !== COUNTS.length) {
  throw new Error(`survivorship-bias: the bins hold ${N} funds, not the lesson's 5,000`);
}
const SURVIVORS = bins.filter((b) => b.survived);
const ALL_MEAN = total(bins, "sum") / N;
const SURV_MEAN = total(SURVIVORS, "sum") / total(SURVIVORS, "count");
const CLOSED = N - total(SURVIVORS, "count");
const CLOSED_SHARE = Math.round((CLOSED / N) * 100);

export const title =
  "A histogram of one year's returns for 5,000 funds, with the funds that lost more than 4% shaded as the ones that closed; the average of the survivors sits to the right of the average of all of them.";

export const caption = `All ${N.toLocaleString("en-US")} funds averaged ${ALL_MEAN.toFixed(2)}%. The ones still open averaged ${SURV_MEAN.toFixed(2)}%, because the ${CLOSED} that closed, ${CLOSED_SHARE}% of them, took their losses out of the sample with them. The second number is correct about survivors and useless for deciding whether to invest.`;

const DOMAIN = [BIN_LO, BIN_LO + COUNTS.length * BIN_WIDTH];

export function render() {
  return plot({
    height: 340,
    marginTop: 40,
    marginLeft: 56,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Annual return (%)", labelAnchor: "center", domain: DOMAIN, ticks: 6 },
    // Fixed, with headroom over the tallest bin (488 funds), because the two
    // mean labels are placed a fixed distance above the baseline.
    y: { label: "Funds", domain: [0, 600], ticks: [0, 200, 400, 600] },
    marks: [
      Plot.rectY(bins, {
        x1: "x1",
        x2: "x2",
        y: "count",
        fill: (d) => (d.survived ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.survived ? 0.45 : 0.28),
        insetLeft: 0.5,
        insetRight: 0.5,
      }),
      Plot.ruleX([CLOSED_BELOW], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: CLOSED_BELOW,
        y: 0,
        text: () => `${CLOSED} funds closed\nand stopped reporting`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -8,
        dy: -130,
        ...HALO,
      }),
      Plot.ruleX([ALL_MEAN], { stroke: MUTED, strokeWidth: 2 }),
      Plot.ruleX([SURV_MEAN], { stroke: ACCENT, strokeWidth: 2 }),
      Plot.text([{}], {
        x: ALL_MEAN,
        y: 0,
        text: () => `all funds\n${ALL_MEAN.toFixed(2)}%`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -6,
        dy: -222,
        ...HALO,
      }),
      Plot.text([{}], {
        x: SURV_MEAN,
        y: 0,
        text: () => `survivors only\n${SURV_MEAN.toFixed(2)}%`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 6,
        dy: -222,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
