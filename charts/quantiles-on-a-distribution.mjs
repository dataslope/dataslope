/**
 * Quantiles as cuts through a distribution, so "the 95th percentile" stops
 * being a number a function returns and becomes a place on a shape.
 *
 * The distribution is deliberately right-skewed, which is what response times,
 * incomes, basket sizes and file sizes all look like, and it is where the
 * median stops being enough. On a symmetric curve the quantiles are evenly
 * spaced and reporting the middle is nearly the whole story. On this one they
 * bunch at the left and stretch out to the right: half the mass sits in the
 * narrow gap between p25 and p75, and the distance from p50 to p99 is several
 * times the distance from p1 to p50.
 *
 * That asymmetry is the argument for quoting a high quantile in an SLA. The
 * median says what a typical request does and says nothing at all about the
 * tail, which is the part users notice and the part that pages someone.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A right-skewed response-time distribution with the 25th, 50th, 75th, 90th and 99th percentiles marked as vertical cuts. The lower cuts sit close together under the peak while the 99th is far out in the tail.";

/** Log-normal-ish: the shape of nearly every duration and size in computing. */
const MU = Math.log(120);
const SIGMA = 0.62;

const pdf = (x) =>
  x <= 0
    ? 0
    : Math.exp(-Math.pow(Math.log(x) - MU, 2) / (2 * SIGMA * SIGMA)) /
      (x * SIGMA * Math.sqrt(2 * Math.PI));

/** Quantile of the log-normal: exp(mu + sigma·z). The z values are the
 *  standard normal quantiles, written out rather than solved for, so the
 *  chart has no numerical inverse to get wrong. */
const Z = { 25: -0.6745, 50: 0, 75: 0.6745, 90: 1.2816, 99: 2.3263 };
const q = (p) => Math.exp(MU + SIGMA * Z[p]);

const MAX_X = 620;
const CURVE = Array.from({ length: 300 }, (_, i) => {
  const x = 1 + (i * (MAX_X - 1)) / 299;
  return { x, y: pdf(x) };
});

const CUTS = [25, 50, 75, 90, 99].map((p) => ({ p, x: q(p), y: pdf(q(p)) }));
const PEAK = Math.max(...CURVE.map((d) => d.y));

/** The middle half, shaded: the span `describe()` reports as 25% and 75%. */
const MIDDLE = CURVE.filter((d) => d.x >= q(25) && d.x <= q(75));

export const caption = `Every quantile is a cut through the same shape. On a right-skewed distribution (response times, incomes, file sizes, basket values) the low cuts bunch together and the high ones stretch away: half of all requests land in the ${Math.round(q(75) - q(25))} ms between p25 and p75, and the gap from the median to p99 is ${((q(99) - q(50)) / (q(50) - q(25))).toFixed(0)} times the gap from p25 to the median. That is why an SLA quotes p95 or p99 rather than the median. The median describes a typical request and says nothing whatever about the tail, which is the part users notice.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 34,
    marginLeft: 60,
    marginRight: 24,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Response time (ms)", labelAnchor: "center", domain: [0, MAX_X], ticks: 6 },
    y: { label: "Density", domain: [0, PEAK * 1.22], ticks: [], grid: false },
    marks: [
      Plot.areaY(MIDDLE, { x: "x", y: "y", fill: PRIMARY, fillOpacity: 0.2 }),
      Plot.line(CURVE, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
      // Two marks, because `strokeDasharray` is a constant option rather than a
      // channel: a function there is stringified into the attribute and every
      // rule silently comes out solid.
      Plot.ruleX(CUTS.filter((d) => d.p !== 50), {
        x: "x",
        y2: "y",
        stroke: GUIDE,
        strokeWidth: 1.3,
        strokeDasharray: "4 3",
      }),
      Plot.ruleX(CUTS.filter((d) => d.p === 50), {
        x: "x",
        y2: "y",
        stroke: ACCENT,
        strokeWidth: 1.8,
      }),
      // Labels above each cut, alternating height so p90 and p99 do not touch.
      Plot.text(CUTS, {
        x: "x",
        y: (d) => d.y + PEAK * (d.p === 90 ? 0.16 : 0.06),
        text: (d) => `p${d.p}`,
        fill: (d) => (d.p === 50 ? ACCENT : MUTED),
        fontSize: 11,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (q(25) + q(75)) / 2,
        y: PEAK * 0.42,
        text: () => "the middle half",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX_X * 0.62,
        y: PEAK * 0.78,
        text: () => "the median says nothing\nabout what happens out here",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
