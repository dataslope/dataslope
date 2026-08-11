/**
 * Why the published effect is bigger than the real one, without anybody
 * cheating.
 *
 * Take a true effect and run studies at various power levels. In each study
 * the estimate is the truth plus noise. Now apply the filter that decides what
 * gets published: only significant results.
 *
 * That filter is not neutral about size. A study can only reach significance
 * if its estimate is large enough, so among the studies that pass, the
 * estimates are systematically the ones where the noise happened to point
 * upwards. The published estimate is therefore biased upward *by construction*,
 * and nobody has to have done anything wrong.
 *
 * The size of the bias depends entirely on power. A well-powered study reaches
 * significance at close to the true effect, so the filter barely selects and
 * the exaggeration is small. An underpowered study can only pass when the noise
 * is large and favourable, so its published effects are inflated by a factor of
 * two or more. At 20% power, which is common in many fields, the average
 * published effect is about twice the truth.
 *
 * That is why underpowered studies are doubly dangerous. Everyone knows they
 * usually miss real effects, which is a shame. Fewer people notice that when
 * they *do* find something, the number they report is wrong in a predictable
 * direction, and that the number is what goes into the meta-analysis, the
 * press release and the next study's power calculation.
 *
 * The fixes are structural rather than statistical: power the study, and
 * pre-register so that the non-significant runs are visible too.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, mean, normalSamples } from "./_theme.mjs";

export const title =
  "The true effect against the average published effect, by statistical power. At 80 per cent power the published effect is about right; at 20 per cent it is roughly twice the truth, purely because only estimates large enough to be significant get published.";

const TRUE = 1;
const POWERS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const REPS = 4000;

/** Standard error implied by a given power at this true effect, from
 *  power = P(|Z| > 1.96) with Z ~ N(effect/se, 1). Inverted numerically. */
const normalCdf = (z) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const tail = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI) * poly;
  return z >= 0 ? 1 - tail : tail;
};
const powerAt = (se) => 1 - normalCdf(1.96 - TRUE / se) + normalCdf(-1.96 - TRUE / se);
const seFor = (target) => {
  let lo = 0.05;
  let hi = 5;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (powerAt(mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

const ROWS = POWERS.map((power, i) => {
  const se = seFor(power);
  const draws = normalSamples(REPS, TRUE, se, 1000 + i * 137);
  const published = draws.filter((d) => Math.abs(d / se) > 1.96);
  return {
    power,
    se,
    published: mean(published),
    ratio: mean(published) / TRUE,
    kept: published.length / REPS,
  };
});

const LOW = ROWS.find((r) => r.power === 0.2);
const HIGH = ROWS.find((r) => r.power === 0.8);

export const caption = `Take a true effect, run studies at various power levels, and apply the filter that decides what gets published: only significant results. That filter is not neutral about size. A study can only reach significance if its estimate is large enough, so among the studies that pass, the estimates are the ones where the noise happened to point the right way. The published estimate is biased upward by construction, and nobody has to have done anything wrong. How much depends entirely on power. At ${(HIGH.power * 100).toFixed(0)}% power the average published effect is ${HIGH.ratio.toFixed(2)} times the truth, because significance arrives at close to the real value and the filter barely selects. At ${(LOW.power * 100).toFixed(0)}% power, which is ordinary in several fields, it is ${LOW.ratio.toFixed(1)} times the truth. That is why underpowered studies are doubly dangerous. Everybody knows they usually miss real effects, which is merely wasteful. Fewer people notice that when they do find something, the number they report is wrong in a predictable direction, and that number is what feeds the meta-analysis, the press release, and the next study's power calculation. The fixes are structural rather than statistical: power the study, and pre-register so the non-significant runs stay visible.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 132,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Statistical power",
      labelAnchor: "center",
      domain: [0.05, 0.95],
      ticks: [0.1, 0.3, 0.5, 0.7, 0.9],
      tickFormat: (v) => `${Math.round(v * 100)}%`,
    },
    y: {
      label: "Published effect, relative to the truth",
      domain: [0.8, 3.4],
      ticks: [1, 2, 3],
      tickFormat: (v) => `${v}×`,
    },
    marks: [
      Plot.ruleY([1], { stroke: GUIDE, strokeWidth: 1.5 }),
      Plot.areaY(ROWS, {
        x: "power",
        y1: 1,
        y2: "ratio",
        fill: ACCENT,
        fillOpacity: 0.16,
        clip: true,
      }),
      Plot.line(ROWS, { x: "power", y: "ratio", stroke: ACCENT, strokeWidth: 2.2, clip: true }),
      Plot.dot(ROWS, { x: "power", y: "ratio", r: 3.4, fill: ACCENT, clip: true }),
      Plot.text([{}], {
        x: 0.95,
        y: 1,
        text: () => "the truth",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([LOW], {
        x: "power",
        y: "ratio",
        text: (d) => `at ${Math.round(d.power * 100)}% power the published\neffect is ${d.ratio.toFixed(1)}× the truth`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.text([HIGH], {
        x: "power",
        y: "ratio",
        text: (d) => `at ${Math.round(d.power * 100)}%, ${d.ratio.toFixed(2)}×`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -12,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0.5,
        y: 3.2,
        text: () => "nobody cheated: the filter is significance, and\nonly large estimates get through it",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
