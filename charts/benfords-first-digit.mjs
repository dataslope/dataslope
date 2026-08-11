/**
 * A distributional check that catches what an outlier rule cannot.
 *
 * Benford's law says that in many naturally occurring sets of numbers, the
 * leading digit is 1 about 30% of the time and 9 about 4.6% of the time, and
 * the whole distribution is `log10(1 + 1/d)`. It holds when the values span
 * several orders of magnitude and are not bounded or rounded into a narrow
 * range: revenues, populations, file sizes, transaction amounts.
 *
 * The reason it is useful for fraud work is that people inventing numbers do
 * not produce it. Asked for a plausible amount, humans produce leading digits
 * roughly uniformly, with a bias towards the middle of the range and towards
 * digits just under a reporting threshold. The fabricated ledger here has no
 * single unusual row, so no outlier rule flags anything, and its *shape* is
 * wrong in a way that is obvious once you look at the right summary.
 *
 * Two things must be said about how far this goes. It is a screen, not
 * evidence: a Benford deviation says look harder, and plenty of honest data
 * deviates, particularly anything with a natural scale (heights, exam scores,
 * prices ending in 99) or anything filtered to a range. And it works on the
 * *whole* population of a ledger, not on a subset somebody has already chosen,
 * because filtering can produce the deviation by itself.
 *
 * The wider point is the one worth keeping. An outlier rule asks whether any
 * single value is unusual. A distributional check asks whether the *set* is
 * the sort of set it claims to be, and those are different questions with
 * different failure modes.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Benford's expected first-digit distribution against a real ledger and a fabricated one. The fabricated ledger contains no unusual single value, so no outlier rule flags it, and its distribution of leading digits is visibly flat.";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const EXPECTED = DIGITS.map((d) => ({ d, p: Math.log10(1 + 1 / d) }));

const N = 1200;
const u = rng(3_907);

/** A real ledger: amounts spread over several orders of magnitude, which is
 *  the condition under which Benford holds. */
const realDigits = new Array(10).fill(0);
for (let i = 0; i < N; i++) {
  const v = 12 * Math.pow(10, u() * 4) * (0.4 + u() * 1.6);
  realDigits[Number(String(Math.round(v))[0])] += 1;
}

/** A fabricated ledger: amounts a person would invent, drifting towards the
 *  middle of the range and away from anything that looks round. */
const fakeDigits = new Array(10).fill(0);
for (let i = 0; i < N; i++) {
  const lead = 1 + Math.floor(Math.pow(u(), 0.82) * 9);
  fakeDigits[Math.min(9, lead)] += 1;
}

const SERIES = [
  { key: "Real ledger", counts: realDigits, color: PRIMARY },
  { key: "Fabricated ledger", counts: fakeDigits, color: ACCENT },
].map((s) => ({
  ...s,
  points: DIGITS.map((d) => ({ d, p: s.counts[d] / N })),
}));

/** Chi-squared against Benford, so "wrong shape" has a number behind it. */
const chiSq = (points) =>
  points.reduce((s, row, i) => {
    const e = EXPECTED[i].p * N;
    return s + ((row.p * N - e) ** 2) / e;
  }, 0);
const CHI = SERIES.map((s) => ({ key: s.key, chi: chiSq(s.points) }));
const CRIT = 15.51; // chi-squared, 8 df, 0.05

export const caption = `Benford's law says that in many naturally occurring sets of numbers the leading digit is 1 about 30% of the time and 9 about 4.6%, following log10(1 + 1/d). It holds when values span several orders of magnitude and are not bounded or rounded into a narrow band: revenues, populations, file sizes, transaction amounts. It is useful for fraud work because people inventing numbers do not produce it. Asked for a plausible amount, humans produce leading digits roughly uniformly, drifting towards the middle of the range. The fabricated ledger here contains no unusual single row, so no outlier rule flags anything, and its chi-squared against Benford is ${CHI[1].chi.toFixed(0)} against the real ledger's ${CHI[0].chi.toFixed(1)}, on a critical value of ${CRIT} at eight degrees of freedom. Two limits are worth stating. This is a screen rather than evidence: a deviation says look harder, and plenty of honest data deviates, particularly anything with a natural scale (heights, exam scores, prices ending in 99) or anything filtered to a range. And it applies to a whole ledger rather than a subset somebody already chose, because filtering can produce the deviation by itself. The wider point is the useful one. An outlier rule asks whether any single value is unusual. A distributional check asks whether the set is the sort of set it claims to be, and those are different questions with different blind spots.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 56,
    marginRight: 126,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Leading digit",
      labelAnchor: "center",
      domain: [0.4, 9.6],
      ticks: DIGITS,
    },
    y: {
      label: "Share of amounts",
      domain: [0, 0.36],
      ticks: [0, 0.1, 0.2, 0.3],
      tickFormat: (v) => `${Math.round(v * 100)}%`,
    },
    marks: [
      Plot.rectY(EXPECTED, {
        x1: (d) => d.d - 0.4,
        x2: (d) => d.d + 0.4,
        y: "p",
        fill: MUTED,
        fillOpacity: 0.24,
      }),
      ...SERIES.map((s) =>
        Plot.line(s.points, { x: "d", y: "p", stroke: s.color, strokeWidth: 2.2, clip: true }),
      ),
      ...SERIES.map((s) => Plot.dot(s.points, { x: "d", y: "p", r: 3.4, fill: s.color })),
      Plot.text(
        SERIES.map((s, i) => ({
          ...s,
          chi: CHI[i].chi,
          y: s.points.at(-1).p + (i === 0 ? 0.02 : -0.02),
        })),
        {
          x: 9.6,
          y: "y",
          text: (d) => `${d.key}\nchi-squared ${d.chi.toFixed(d.chi < 20 ? 1 : 0)}`,
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
        x: 5.6,
        y: 0.33,
        text: () => "shaded: what Benford's law expects",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 5.6,
        y: 0.045,
        text: () => "no single row in the fabricated ledger is unusual",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
