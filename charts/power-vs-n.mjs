/**
 * Power against sample size, for three sizes of effect: why the minimum
 * detectable effect has to be decided before the experiment runs.
 *
 * The curves are the lesson's own sample-size formula rearranged to solve for
 * power instead of n, so the point where the 12% curve crosses 80% is the
 * ~3,800 users per arm the code block prints.
 *
 * Drawn because the trade-off is violently non-linear and a table hides that.
 * Halving the effect you want to catch roughly quadruples the users you need,
 * so the three curves are not evenly spaced — they are an order of magnitude
 * apart on a log axis. An experiment sized for a 5-point lift has almost no
 * chance of seeing a 1-point one, and the figure is what makes "we ran it and
 * found nothing" recognisable as an answer about sample size.
 */
import { Plot, plot, linspace, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three rising power curves plotted against users per arm on a log axis, one for each target lift from a 10% baseline. A dashed line marks 80% power; the 15% curve reaches it at a few hundred users, the 12% curve at about 3,800, and the 11% curve not until roughly 15,000.";

export const caption =
  "Power against users per arm, from a 10% baseline. Each halving of the lift you want to catch roughly quadruples the sample you need, so a test sized for a big win has almost no chance of seeing a small one. This is decided before the experiment runs, not after.";

const BASELINE = 0.1;
const Z_ALPHA = 1.959964; // two-sided 5%

const LIFTS = [
  { to: 0.15, label: "10% → 15%", color: SERIES[2] },
  { to: 0.12, label: "10% → 12%", color: SERIES[0] },
  { to: 0.11, label: "10% → 11%", color: SERIES[5] },
];

/** Φ, Zelen & Severo's approximation: plenty for a plotted curve. */
function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - (Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)) * d;
  return x >= 0 ? p : 1 - p;
}

/** The two-proportion sample-size formula, solved for power rather than n. */
function power(n, p1, p2) {
  const pBar = (p1 + p2) / 2;
  const nullSe = Math.sqrt(2 * pBar * (1 - pBar));
  const altSe = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return normalCdf((Math.abs(p2 - p1) * Math.sqrt(n) - Z_ALPHA * nullSe) / altSe);
}

const MIN_N = 100;
const MAX_N = 60000;
const NS = linspace(Math.log10(MIN_N), Math.log10(MAX_N), 160).map((e) => Math.pow(10, e));

const curves = LIFTS.flatMap((l) =>
  NS.map((n) => ({ label: l.label, color: l.color, n, power: power(n, BASELINE, l.to) })),
);

/** Where each curve crosses 80%, found on the grid it is drawn from so the
 *  marker cannot sit anywhere but on the line. */
const CROSSINGS = LIFTS.map((l) => {
  const n = NS.find((x) => power(x, BASELINE, l.to) >= 0.8);
  return { ...l, n, power: 0.8 };
});

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 54,
    marginRight: 34,
    ariaLabel: title,
    x: {
      label: "Users per arm",
      labelAnchor: "center",
      type: "log",
      domain: [MIN_N, MAX_N],
      ticks: [100, 1000, 10000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: { label: "Power", domain: [0, 1], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.ruleY([0.8], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([0.8], {
        x: MIN_N,
        y: (d) => d,
        text: () => "the usual target: 80%",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: -10,
        ...HALO,
      }),
      Plot.lineY(curves, {
        x: "n",
        y: "power",
        z: "label",
        stroke: (d) => d.color,
        strokeWidth: 2,
      }),
      Plot.dot(CROSSINGS, { x: "n", y: "power", r: 4, fill: (d) => d.color, stroke: null }),
      // Each curve is named at its own 80% crossing rather than at the right
      // edge, where all three have flattened onto 100% and onto each other.
      Plot.text(CROSSINGS, {
        x: "n",
        y: "power",
        text: (d) =>
          `${d.label}\n${d.n < 1000 ? `${Math.round(d.n)}` : `${(d.n / 1000).toFixed(1)}k`} per arm`,
        fill: (d) => d.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 11,
        dy: 20,
        ...HALO,
      }),
    ],
  });
}
