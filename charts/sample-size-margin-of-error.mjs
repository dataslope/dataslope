/**
 * Why every national poll surveys about a thousand people, and why surveying
 * ten thousand is rarely worth it.
 *
 * Margin of error at 95% confidence is 1.96·√(p(1-p)/n), which falls as the
 * square root of n. Going from 100 to 1,000 respondents cuts it from about ten
 * points to about three. Going from 1,000 to 10,000 cuts it from three to one,
 * for ten times the cost. That is the whole reason the industry settled where
 * it did.
 *
 * The population size does not appear anywhere in the formula, which is the
 * part people find hardest to believe: a sample of 1,000 is as precise for a
 * country of 300 million as for a town of 30,000, provided it is drawn
 * properly. The caption says so, because the chart cannot.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Margin of error against sample size on a log axis, falling as the square root of n: about ten points at a hundred respondents, three at a thousand, and one at ten thousand.";

const Z = 1.96;
/** Worst case, at p = 0.5, which is what pollsters quote. */
const moe = (n) => Z * Math.sqrt(0.25 / n);

const curve = linspace(2, 4.3, 200).map((e) => {
  const n = 10 ** e;
  return { n, moe: moe(n) };
});

const MARKS = [100, 400, 1000, 4000, 10000, 20000].map((n) => ({ n, moe: moe(n) }));
const K = MARKS.find((m) => m.n === 1000);
const TEN_K = MARKS.find((m) => m.n === 10000);

export const caption =
  `Margin of error falls as the square root of the sample, so precision gets expensive fast. A thousand respondents buys ±${(K.moe * 100).toFixed(1)} points; ten thousand buys ±${(TEN_K.moe * 100).toFixed(1)}, for ten times the fieldwork. Note what is absent from the formula: the population. A properly drawn sample of a thousand is as precise for a country as for a town.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 34,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Respondents",
      labelAnchor: "center",
      domain: [100, 20000],
      ticks: [100, 300, 1000, 3000, 10000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: {
      label: "Margin of error (95%)",
      domain: [0, 0.11],
      ticks: 5,
      tickFormat: (d) => `±${(d * 100).toFixed(0)}pt`,
    },
    marks: [
      Plot.areaY(curve, { x: "n", y: "moe", fill: PRIMARY, fillOpacity: 0.13 }),
      Plot.line(curve, { x: "n", y: "moe", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.ruleX(MARKS, { x: "n", y1: 0, y2: "moe", stroke: GUIDE, strokeOpacity: 0.5 }),
      Plot.dot(MARKS, { x: "n", y: "moe", fill: ACCENT, r: 3.5 }),
      Plot.text(MARKS, {
        x: "n",
        y: "moe",
        text: (d) => `±${(d.moe * 100).toFixed(1)}`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 7,
        dy: -7,
        ...HALO,
      }),
      Plot.text([K], {
        x: "n",
        y: "moe",
        text: () => "the industry standard,\nand this is why",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 12,
        dy: 46,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
