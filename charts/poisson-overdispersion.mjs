/**
 * When a Poisson fits the mean and misses everything that matters.
 *
 * The Poisson has one parameter, and that is its whole personality: the
 * variance is *forced* to equal the mean. Fit one to any set of counts and it
 * will match the average exactly and then be wrong about the spread by whatever
 * factor the real data disagrees by.
 *
 * These observed counts have a mean of about 8 and a variance about four times
 * that. The fitted Poisson, with the same mean, is far too narrow. It is short
 * in the middle, where it piles up probability the data does not have, and
 * short again in the tail, where the data has days the model says are nearly
 * impossible.
 *
 * The tail is where this costs money. Under the fitted Poisson a day past
 * twenty is a once-in-years event; in the data it happens several times a year.
 * Every capacity plan, alerting threshold and staffing model built on the fit
 * is calibrated for a world with less variance than the one it runs in.
 *
 * The check is one line: compute the variance-to-mean ratio, which is called
 * the *dispersion*. One means Poisson. Above one is **overdispersion** and is
 * what almost all real count data does, because Poisson assumes events arrive
 * independently at a constant rate and real events cluster: outages come in
 * storms, sales come in campaigns, arrivals come in buses.
 *
 * The standard replacement is the negative binomial, which is a Poisson with a
 * second parameter for the extra variance, and switching to it changes nothing
 * about the mean and everything about the intervals.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean, rng } from "./_theme.mjs";

export const title =
  "Observed daily counts against a Poisson fitted to the same mean. The fit is far too narrow: it puts too much probability in the middle and almost none past twenty, where the data has several days a year.";

const LAMBDA = 8;
/** Counts drawn from a gamma-mixed Poisson, which is the negative binomial and
 *  is what overdispersed data looks like: the rate itself varies day to day. */
const u = rng(6_263);
const DAYS = 700;
const OBSERVED = Array.from({ length: DAYS }, () => {
  // Gamma(shape 1.5) by summing exponentials, scaled to mean 1.
  const g = (-Math.log(Math.max(u(), 1e-12)) - Math.log(Math.max(u(), 1e-12))) / 2;
  const rate = LAMBDA * g;
  // Poisson by Knuth's method at the day's own rate.
  let k = 0;
  let prod = 1;
  const limit = Math.exp(-rate);
  while (prod > limit && k < 60) {
    prod *= Math.max(u(), 1e-12);
    k += 1;
  }
  return Math.max(0, k - 1);
});

const OBS_MEAN = mean(OBSERVED);
const OBS_VAR = OBSERVED.reduce((s, v) => s + (v - OBS_MEAN) ** 2, 0) / (OBSERVED.length - 1);
const DISPERSION = OBS_VAR / OBS_MEAN;

const K_MAX = 34;
const counts = new Array(K_MAX + 1).fill(0);
for (const v of OBSERVED) if (v <= K_MAX) counts[v] += 1;
const OBS = counts.map((c, k) => ({ k, p: c / DAYS }));

/** The fitted Poisson: same mean, and no freedom left to match anything else. */
const poissonPmf = (k, lam) => {
  let logp = -lam + k * Math.log(lam);
  for (let i = 2; i <= k; i++) logp -= Math.log(i);
  return Math.exp(logp);
};
const FIT = Array.from({ length: K_MAX + 1 }, (_, k) => ({ k, p: poissonPmf(k, OBS_MEAN) }));

const THRESHOLD = 20;
const OBS_TAIL = OBSERVED.filter((v) => v > THRESHOLD).length / DAYS;
const FIT_TAIL = FIT.filter((d) => d.k > THRESHOLD).reduce((s, d) => s + d.p, 0);
const TAIL_RATIO = Math.round(OBS_TAIL / FIT_TAIL);

export const caption = `The Poisson has one parameter, and that is its whole personality: the variance is forced to equal the mean. Fit one to any counts and it will match the average exactly, then be wrong about the spread by however much the data disagrees. These observations have a mean of ${OBS_MEAN.toFixed(1)} and a variance of ${OBS_VAR.toFixed(1)}, a dispersion of ${DISPERSION.toFixed(1)}, and the fitted Poisson is far too narrow: too much probability in the middle, almost none in the tail. The tail is where it costs money. Past ${THRESHOLD} the fit gives ${(FIT_TAIL * 100).toFixed(2)}% of days and the data has ${(OBS_TAIL * 100).toFixed(1)}%, about ${TAIL_RATIO} times as many, so every capacity plan, alerting threshold and staffing model built on the fit is calibrated for a world with less variance than the one it runs in. The check is one line: the variance-to-mean ratio, called the dispersion. One means Poisson; above one is overdispersion, and that is what nearly all real count data does, because Poisson assumes events arrive independently at a constant rate and real events cluster. Outages come in storms, sales come in campaigns, arrivals come in buses. The standard replacement is the negative binomial, a Poisson with a second parameter for the extra variance, and switching to it changes nothing about the mean and everything about the intervals.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 54,
    marginRight: 120,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Events in a day",
      labelAnchor: "center",
      domain: [-0.6, K_MAX],
      ticks: [0, 10, 20, 30],
    },
    y: { label: "Share of days", domain: [0, 0.16], ticks: [0, 0.05, 0.1, 0.15], tickFormat: (v) => `${Math.round(v * 100)}%` },
    marks: [
      Plot.rectY(OBS, {
        x1: (d) => d.k - 0.42,
        x2: (d) => d.k + 0.42,
        y: "p",
        fill: MUTED,
        fillOpacity: 0.5,
        clip: true,
      }),
      Plot.line(FIT, { x: "k", y: "p", stroke: ACCENT, strokeWidth: 2.2, clip: true }),
      Plot.dot(FIT, { x: "k", y: "p", r: 2.4, fill: ACCENT, clip: true }),
      Plot.areaY(
        FIT.filter((d) => d.k >= THRESHOLD),
        { x: "k", y: "p", fill: ACCENT, fillOpacity: 0.3, clip: true },
      ),
      Plot.ruleX([THRESHOLD], { stroke: MUTED, strokeWidth: 1.2, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: K_MAX,
        y: 0.15,
        text: () =>
          `observed\nmean ${OBS_MEAN.toFixed(1)}\nvariance ${OBS_VAR.toFixed(1)}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: K_MAX,
        y: 0.085,
        text: () =>
          `fitted Poisson\nmean ${OBS_MEAN.toFixed(1)}\nvariance ${OBS_MEAN.toFixed(1)}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: THRESHOLD + 0.8,
        y: 0.045,
        text: () => `past ${THRESHOLD}: ${TAIL_RATIO}× more days\nthan the fit allows`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 8,
        y: 0.155,
        text: () => `dispersion ${DISPERSION.toFixed(1)}, and Poisson only fits 1.0`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
