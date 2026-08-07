/**
 * Why distance-based models need their features scaled: without it, the
 * feature with the largest units decides every neighbour.
 *
 * Two features that matter equally to the problem, measured in units that do
 * not: an age in years and an income in currency. Unscaled, the distance
 * between any two people is essentially the difference in their incomes, and
 * age contributes a rounding error. Standardised, both contribute what they
 * should.
 *
 * The bars are the share of squared Euclidean distance each feature accounts
 * for, averaged over every pair in a sample, computed rather than asserted. It
 * is not that one feature is more important; it is that nothing in the model
 * knows the units are arbitrary.
 */
import { Plot, plot, mean, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The share of pairwise distance contributed by age and income, before and after standardising. Unscaled, income accounts for almost all of it; standardised, the two are close to even.";

const N = 200;
const age = normalSamples(N, 42, 12, 606);
const income = normalSamples(N, 54000, 18000, 707);

const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((v) => (v - m) ** 2)));
};

/** Mean share of squared distance from each feature, over all pairs. */
function shares(a, b) {
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      sa += (a[i] - a[j]) ** 2;
      sb += (b[i] - b[j]) ** 2;
    }
  }
  const total = sa + sb;
  return { age: sa / total, income: sb / total };
}

const z = (xs) => {
  const m = mean(xs);
  const s = sd(xs);
  return xs.map((v) => (v - m) / s);
};

const RAW = shares(age, income);
const SCALED = shares(z(age), z(income));

/** How many times more distance income contributes than age, unscaled. The
 *  shares round to 100% and 0% at any sensible precision, which reads as a
 *  rounding artefact rather than the point; the ratio is the honest number. */
const RATIO = RAW.income / RAW.age;

/** Percentages, with enough precision to stay true when a share is tiny. */
const pct = (v) => (v >= 0.005 ? `${(v * 100).toFixed(1)}%` : "under 0.1%");

/** A ratio in the order of magnitude a reader thinks in. */
const times = (r) =>
  r >= 1e6 ? `${(r / 1e6).toFixed(1)} million` : r >= 1e3 ? `${Math.round(r / 1e3)} thousand` : String(Math.round(r));

const rows = [
  { panel: "As measured", feature: "Age (years)", share: RAW.age },
  { panel: "As measured", feature: "Income (currency)", share: RAW.income },
  { panel: "Standardised", feature: "Age (years)", share: SCALED.age },
  { panel: "Standardised", feature: "Income (currency)", share: SCALED.income },
];

export const caption =
  `Both features matter equally to the problem; only their units differ. Unscaled, income contributes about ${times(RATIO)} times as much squared distance as age, so a nearest-neighbour model is really a nearest-income model and the age column may as well not be there. Standardising puts them at ${(SCALED.income * 100).toFixed(0)}% and ${(SCALED.age * 100).toFixed(0)}%. Nothing about the data changed; the model simply had no way to know the units were arbitrary.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 130,
    marginRight: 60,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: ["As measured", "Standardised"] },
    x: { label: "Share of pairwise distance", labelAnchor: "center", domain: [0, 1], tickFormat: "%", ticks: 3 },
    y: { label: null, domain: ["Income (currency)", "Age (years)"], padding: 0.35 },
    marks: [
      Plot.barX(rows, {
        x: "share",
        y: "feature",
        fx: "panel",
        fill: (d) => (d.share > 0.9 ? ACCENT : PRIMARY),
        fillOpacity: 0.5,
      }),
      // Labels inside a wide bar and outside a narrow one: at 100% and
      // effectively 0% a single anchor puts one of them through the panel
      // divider and the other over its own bar.
      Plot.text(
        rows.filter((d) => d.share > 0.6),
        {
          x: "share",
          y: "feature",
          fx: "panel",
          text: (d) => pct(d.share),
          fill: MUTED,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "end",
          dx: -8,
          ...HALO,
        },
      ),
      Plot.text(
        rows.filter((d) => d.share <= 0.6),
        {
          x: "share",
          y: "feature",
          fx: "panel",
          text: (d) => pct(d.share),
          fill: MUTED,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
