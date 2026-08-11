/**
 * The same n and the same p, once with independent trials and once without.
 *
 * The binomial has four assumptions, and three of them are usually obvious: a
 * fixed number of trials, two outcomes, a constant probability. The fourth,
 * *independence*, is the one that quietly fails, because real trials are
 * usually people, and people are in households, classes, sessions and regions.
 *
 * Both histograms here have the same mean, because clustering does not change
 * how many successes you expect. The clustered one is far wider, because when
 * outcomes come in correlated groups the effective number of independent
 * observations is smaller than the number of rows. Here forty clusters of ten
 * behave like about fifteen independent trials rather than four hundred.
 *
 * The consequence lands on every interval. A binomial confidence interval
 * computed with n = 400 is about a third the width it should be, so an A/B test
 * on clustered data will find significance at roughly the rate you would get by
 * running the test three times and keeping the best one.
 *
 * The multiplier has a name: the **design effect**, and it is `1 + (m - 1)ρ`
 * for clusters of size m with intra-cluster correlation ρ. It is worth knowing
 * because it is brutal: even a small ρ hurts badly when clusters are large.
 * A ρ of 0.05 with clusters of 50 is a design effect of nearly 3.5, which means
 * the study needs three and a half times the data it budgeted for.
 *
 * The fix is to analyse at the level randomisation happened, or to use a model
 * that knows about the clusters (a mixed model, GEE, or cluster-robust standard
 * errors). What does not work is ignoring it, and it is easy to ignore because
 * the point estimate is fine.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, rng } from "./_theme.mjs";

export const title =
  "Two distributions of the number of successes in four hundred trials at the same success rate. Independent trials give a narrow binomial; forty clusters of ten give the same mean and roughly five times the spread.";

const CLUSTERS = 40;
const PER_CLUSTER = 10;
const N = CLUSTERS * PER_CLUSTER;
const P = 0.5;
const RHO = 0.35;
const REPS = 4000;

const u = rng(8_419);

/** Independent: 400 flips. */
const independent = () => {
  let k = 0;
  for (let i = 0; i < N; i++) if (u() < P) k += 1;
  return k;
};

/** Clustered: each cluster draws its own rate around P, then its members flip
 *  at that rate. This is the beta-binomial, and it is what a household, a
 *  class or a session does to a survey. */
const clustered = () => {
  let k = 0;
  for (let c = 0; c < CLUSTERS; c++) {
    const shift = (u() - 0.5) * 2 * Math.sqrt(RHO) * 0.9;
    const rate = Math.max(0.02, Math.min(0.98, P + shift));
    for (let i = 0; i < PER_CLUSTER; i++) if (u() < rate) k += 1;
  }
  return k;
};

const IND = Array.from({ length: REPS }, independent);
const CLU = Array.from({ length: REPS }, clustered);

const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / (xs.length - 1));
};
const SD_IND = sd(IND);
const SD_CLU = sd(CLU);
const DESIGN_EFFECT = (SD_CLU / SD_IND) ** 2;
const EFFECTIVE_N = Math.round(N / DESIGN_EFFECT);

const DOMAIN = [140, 260];
const BINS = 60;
const W = (DOMAIN[1] - DOMAIN[0]) / BINS;
const histogram = (values) => {
  const c = new Array(BINS).fill(0);
  for (const v of values) {
    const k = Math.floor((v - DOMAIN[0]) / W);
    if (k >= 0 && k < BINS) c[k] += 1;
  }
  return c.map((n, k) => ({ from: DOMAIN[0] + k * W, to: DOMAIN[0] + (k + 1) * W, p: n / values.length }));
};

const SERIES = [
  { key: "Independent trials", bars: histogram(IND), color: PRIMARY, sd: SD_IND },
  { key: `${CLUSTERS} clusters of ${PER_CLUSTER}`, bars: histogram(CLU), color: ACCENT, sd: SD_CLU },
];

export const caption = `The binomial has four assumptions and three are usually obvious: a fixed number of trials, two outcomes, a constant probability. The fourth, independence, is the one that quietly fails, because real trials are usually people and people come in households, classes, sessions and regions. Both distributions here have the same mean, because clustering does not change how many successes you expect. The clustered one has a standard deviation of ${SD_CLU.toFixed(1)} against ${SD_IND.toFixed(1)}, so ${N} rows in ${CLUSTERS} clusters carry about as much information as ${EFFECTIVE_N} independent trials. The consequence lands on every interval: a binomial confidence interval computed with n = ${N} is roughly ${(1 / Math.sqrt(DESIGN_EFFECT)).toFixed(2)} of the width it should be, so an A/B test on clustered data finds significance about as often as running the test several times and keeping the best. The multiplier has a name, the design effect, and it is 1 + (m − 1)ρ for clusters of size m with intra-cluster correlation ρ. It is worth knowing because it is brutal: a ρ of just 0.05 with clusters of fifty gives a design effect near 3.5, so the study needs three and a half times the data it budgeted for. The fix is to analyse at the level randomisation happened, or to use a model that knows about the clusters. What does not work is ignoring it, and ignoring it is easy, because the point estimate is fine.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 54,
    marginRight: 138,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Successes out of 400",
      labelAnchor: "center",
      domain: DOMAIN,
      ticks: [160, 180, 200, 220, 240],
    },
    y: { label: "Share of runs", domain: [0, 0.1], ticks: [0, 0.03, 0.06, 0.09], tickFormat: (v) => `${(v * 100).toFixed(0)}%` },
    marks: [
      ...SERIES.map((s) =>
        Plot.rectY(
          s.bars.filter((b) => b.p > 0),
          { x1: "from", x2: "to", y: "p", fill: s.color, fillOpacity: 0.5, clip: true },
        ),
      ),
      Plot.ruleX([N * P], { stroke: GUIDE, strokeWidth: 1.4 }),
      Plot.text(
        SERIES.map((s, i) => ({ ...s, y: 0.095 - i * 0.022 })),
        {
          x: DOMAIN[1],
          y: "y",
          text: (d) => `${d.key}\nSD ${d.sd.toFixed(1)}`,
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
        x: N * P,
        y: 0.1,
        text: () => "same mean",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 200,
        y: 0.035,
        text: () =>
          `design effect ${DESIGN_EFFECT.toFixed(1)}:\n${N} rows carry about\n${EFFECTIVE_N} trials' worth of information`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.4,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
