/**
 * Noise shrinks with n; bias does not.
 *
 * Each band is where an estimate lands about 95% of the time, plotted against
 * sample size. Both bands narrow at the same √n rate: that is the noise going
 * away, and it is the part everybody already believes. The point of the figure
 * is what happens to the *centres*: the random sample's band closes on the
 * truth, and the convenience sample's closes just as tightly on a number that
 * is ten points too high. At n = 20,000 the biased estimate is precise,
 * confident, and wrong, which is the failure mode more data cannot fix.
 *
 * The population and the convenience scheme are the lesson's
 * (statistics-for-data-science-python/sampling-and-bias.mdx): satisfaction
 * scores drawn from Normal(70, 12) and clipped to 0..100, with everyone above
 * 75 weighted 1.1 and everyone else 0.1, so a happy customer is eleven times
 * as likely to be picked. Both centres and both spreads are worked out from
 * that definition below rather than typed in. They come to 70.0 and 80.0,
 * which is where the lesson's code lands: its repeated convenience draws
 * centre on 79.9, a bias of +9.9. The sizes are the lesson's too, 50 to
 * 20,000, which stops at one customer in 25 of its population of 500,000.
 */
import { Plot, plot, linspace, normalPdf, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

const MU = 70;
const SD = 12;
const clip = (x) => Math.min(100, Math.max(0, x));
const convenienceWeight = (x) => (x > 75 ? 1.1 : 0.1);

/** Mean and SD of a clipped score drawn with probability proportional to
 *  `weight`, by the trapezoid rule over ±8 SD. A step of 0.001 puts the
 *  error far below anything the figure prints. */
function moments(weight) {
  const xs = linspace(MU - 8 * SD, MU + 8 * SD, 192_001);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  xs.forEach((x, i) => {
    const v = clip(x);
    const end = i === 0 || i === xs.length - 1 ? 0.5 : 1;
    const w = end * normalPdf(x, MU, SD) * weight(v);
    s0 += w;
    s1 += w * v;
    s2 += w * v * v;
  });
  const mean = s1 / s0;
  return { mean, sd: Math.sqrt(s2 / s0 - mean * mean) };
}

const RANDOM = moments(() => 1);
const CONVENIENCE = moments(convenienceWeight);
const TRUE_MEAN = RANDOM.mean;
const BIAS = CONVENIENCE.mean - RANDOM.mean;

export const title = `Two narrowing bands plotted against sample size on a log axis. The random sample's band closes on the true mean of ${Math.round(TRUE_MEAN)}; the convenience sample's band closes just as tightly on ${Math.round(CONVENIENCE.mean)}, ${Math.round(BIAS)} points above it.`;

export const caption =
  "Both estimates get more precise as the sample grows, at the same rate. Only one of them is getting closer to the truth. More data narrows the band; nothing about the size of a sample fixes how it was selected.";

const SIZES = [50, 200, 1000, 5000, 20000];
// Drawn against log10(n) on a linear scale rather than on Plot's log scale:
// d3's log tick formatter blanks any tick whose leading digit is above 3, which
// would leave the lesson's 50 and 5,000 unlabelled.
const LOG_SIZES = SIZES.map(Math.log10);
const NS = linspace(LOG_SIZES[0], LOG_SIZES.at(-1), 90).map((e) => Math.pow(10, e));
const sizeLabel = (n) => (n >= 1000 ? `${n / 1000}k` : String(n));

const METHODS = [
  { key: "Random sample", ...RANDOM, color: PRIMARY },
  // A convenience sample over-reaches the satisfied, so it is both shifted up
  // and less variable than a random draw from the whole population.
  { key: "Convenience sample", ...CONVENIENCE, color: ACCENT },
];

const bands = METHODS.flatMap((m) =>
  NS.map((n) => {
    const se = m.sd / Math.sqrt(n);
    return { key: m.key, logN: Math.log10(n), lo: m.mean - 2 * se, hi: m.mean + 2 * se, centre: m.mean };
  }),
);

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 54,
    marginRight: 140,
    ariaLabel: title,
    x: {
      label: "Sample size",
      labelAnchor: "center",
      domain: [LOG_SIZES[0], LOG_SIZES.at(-1)],
      ticks: LOG_SIZES,
      tickFormat: (e) => sizeLabel(Math.round(Math.pow(10, e))),
    },
    y: { label: "Estimated mean score", domain: [62, 88], ticks: 5 },
    marks: [
      Plot.ruleY([TRUE_MEAN], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      ...METHODS.map((m) =>
        Plot.areaY(bands.filter((b) => b.key === m.key), {
          x: "logN",
          y1: "lo",
          y2: "hi",
          fill: m.color,
          fillOpacity: 0.18,
        }),
      ),
      ...METHODS.map((m) =>
        Plot.lineY(bands.filter((b) => b.key === m.key), {
          x: "logN",
          y: "centre",
          stroke: m.color,
          strokeWidth: 2,
        }),
      ),

      // Labelled in the right margin, where the bands have already collapsed
      // to a line and there is nothing to sit on top of.
      Plot.text(METHODS, {
        x: LOG_SIZES.at(-1),
        y: "mean",
        text: (d) => `${d.key}\nlands on ${Math.round(d.mean)}`,
        fill: (d) => d.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 10,
      }),
      Plot.text([{}], {
        x: Math.log10(320),
        // Just under halfway, so it does not sit on the gridline at 75.
        y: (RANDOM.mean + CONVENIENCE.mean) / 2 - 0.6,
        text: () => "this gap is the bias, and it never closes",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
