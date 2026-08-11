/**
 * Why the mean latency on your dashboard is the number least worth watching.
 *
 * Real latency distributions are heavy-tailed: most requests are fast and a
 * small share are far slower, usually because of a retry, a cold cache, or a
 * garbage-collection pause. The mean sits just right of the bulk and describes
 * nobody. The p99 sits far out in the tail, and it is the experience of one
 * request in a hundred, which on a page making a hundred calls is most pages.
 *
 * The percentiles are computed from the drawn sample, so their positions are
 * the distribution's rather than markers placed for effect.
 */
import { Plot, plot, linspace, mean, rng, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A histogram of request latencies with a long right tail, marked with the mean, median, 95th and 99th percentiles. The p99 is several times the median and far outside the bulk of the distribution.";

const N = 40_000;
const next = rng(4242);

/** Log-normal body plus an occasional slow path: retries, cold caches, pauses. */
const SAMPLE = Array.from({ length: N }, () => {
  const u = Math.max(next(), 1e-9);
  const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
  const base = Math.exp(3.15 + 0.44 * g);
  return next() < 0.02 ? base + 120 + next() * 260 : base;
});

const sorted = [...SAMPLE].sort((a, b) => a - b);
const q = (p) => sorted[Math.floor(p * (sorted.length - 1))];

const MARKS = [
  { key: "median", ms: q(0.5), color: MUTED },
  { key: "mean", ms: mean(SAMPLE), color: PRIMARY },
  { key: "p95", ms: q(0.95), color: ACCENT },
  { key: "p99", ms: q(0.99), color: ACCENT },
];

const MEDIAN = MARKS[0].ms;
const P99 = MARKS[3].ms;

export const caption =
  `Most requests take about ${MEDIAN.toFixed(0)}ms. The mean is ${MARKS[1].ms.toFixed(0)}ms, pulled right by a tail it does not describe, and the p99 is ${P99.toFixed(0)}ms, which is ${(P99 / MEDIAN).toFixed(1)} times the median. One request in a hundred is not rare: a page making a hundred calls hits it more often than not, which is why tail percentiles are the number to watch and the mean is the number to ignore.`;

// Wide enough for the p99, which is the mark the figure exists to show: at a
// tighter domain it fell outside the frame and simply did not render.
const DOMAIN = [0, Math.ceil((q(0.99) * 1.12) / 20) * 20];
const THRESHOLDS = linspace(DOMAIN[0], DOMAIN[1], 70);

export function render() {
  return plot({
    height: 330,
    marginTop: 44,
    marginLeft: 58,
    marginRight: 30,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Milliseconds", labelAnchor: "center", domain: DOMAIN, ticks: 6 },
    y: { label: "Requests", ticks: 5 },
    marks: [
      Plot.rectY(
        SAMPLE.map((ms) => ({ ms })),
        Plot.binX({ y: "count" }, { x: "ms", thresholds: THRESHOLDS, fill: PRIMARY, fillOpacity: 0.35 }),
      ),
      Plot.ruleX(MARKS, { x: "ms", stroke: "color", strokeWidth: 2 }),
      // One mark per percentile so each label gets its own vertical offset;
      // the four lines sit close enough that a shared dy stacks them.
      //
      // Three rows, not two. The median, the mean and the p95 are all inside
      // the first sixth of the domain — about 55px apart at this width, against
      // labels around 60px wide — so alternating between two rows put "median
      // 24ms" and "p95 53ms" on the same baseline and printed one through the
      // other. The p99 is far enough right to share the top row with the
      // median safely.
      ...MARKS.map((m, i) =>
        Plot.text([m], {
          x: "ms",
          frameAnchor: "top",
          text: (d) => `${d.key} ${d.ms.toFixed(0)}ms`,
          fill: m.color,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 6,
          dy: [-32, -19, -6, -32][i],
          ...HALO,
        }),
      ),
      // A dashed rule at the p99.9 used to sit here. The domain is sized to
      // the p99, and on a tail this heavy the p99.9 is always past it, so the
      // rule never landed inside the frame: it drew 107px beyond the figure
      // and across whatever the page had beside it.
      Plot.text([{}], {
        x: DOMAIN[1] - 4,
        frameAnchor: "top",
        text: () => "the tail is where your users are",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: 10,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
