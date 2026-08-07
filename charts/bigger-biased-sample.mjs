/**
 * Noise shrinks with n; bias does not.
 *
 * Each band is where an estimate lands about 95% of the time, plotted against
 * sample size. Both bands narrow at the same √n rate — that is the noise going
 * away, and it is the part everybody already believes. The point of the figure
 * is what happens to the *centres*: the random sample's band closes on the
 * truth, and the convenience sample's closes just as tightly on a number that
 * is nine points too high. At n = 100,000 the biased estimate is precise,
 * confident, and wrong, which is the failure mode more data cannot fix.
 *
 * The population is the lesson's: satisfaction scores with a mean of 70, where
 * happy customers are far easier to reach.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two narrowing bands plotted against sample size on a log axis. The random sample's band closes on the true mean of 70; the convenience sample's band closes just as tightly on 79, nine points above it.";

export const caption =
  "Both estimates get more precise as the sample grows, at the same rate. Only one of them is getting closer to the truth. More data narrows the band; nothing about the size of a sample fixes how it was selected.";

const TRUE_MEAN = 70;
const BIASED_MEAN = 79;
const SD = 12;

const NS = linspace(Math.log10(50), Math.log10(100000), 90).map((e) => Math.pow(10, e));

const METHODS = [
  { key: "Random sample", centre: TRUE_MEAN, color: PRIMARY },
  // A convenience sample over-reaches the satisfied, so it is both shifted up
  // and slightly less variable than a random draw from the whole population.
  { key: "Convenience sample", centre: BIASED_MEAN, color: ACCENT, sd: 9 },
];

const bands = METHODS.flatMap((m) =>
  NS.map((n) => {
    const se = (m.sd ?? SD) / Math.sqrt(n);
    return { key: m.key, n, lo: m.centre - 2 * se, hi: m.centre + 2 * se, centre: m.centre };
  }),
);

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 54,
    marginRight: 128,
    ariaLabel: title,
    x: {
      label: "Sample size",
      labelAnchor: "center",
      type: "log",
      domain: [50, 100000],
      ticks: [50, 100, 1000, 10000, 100000],
      tickFormat: (d) => (d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: { label: "Estimated mean score", domain: [62, 88], ticks: 5 },
    marks: [
      Plot.ruleY([TRUE_MEAN], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      ...METHODS.map((m) =>
        Plot.areaY(bands.filter((b) => b.key === m.key), {
          x: "n",
          y1: "lo",
          y2: "hi",
          fill: m.color,
          fillOpacity: 0.18,
        }),
      ),
      ...METHODS.map((m) =>
        Plot.lineY(bands.filter((b) => b.key === m.key), {
          x: "n",
          y: "centre",
          stroke: m.color,
          strokeWidth: 2,
        }),
      ),

      // Labelled in the right margin, where the bands have already collapsed
      // to a line and there is nothing to sit on top of.
      Plot.text(METHODS, {
        x: 100000,
        y: "centre",
        text: (d) => (d.centre === TRUE_MEAN ? "Random sample\nlands on 70" : "Convenience sample\nlands on 79"),
        fill: (d) => d.color,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 10,
      }),
      Plot.text([{}], {
        x: 320,
        y: 74.4,
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
