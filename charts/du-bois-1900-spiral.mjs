/**
 * W.E.B. Du Bois, Paris 1900: the bar that would not fit, so it was coiled.
 *
 * For the Exposition Universelle, Du Bois and his students at Atlanta
 * University hand-drew sixty-odd plates on Black American life. This one plots
 * the assessed value of household furniture owned by Black Georgians across a
 * quarter century, and it has a problem every chart of growth has: the last
 * value is sixty-eight times the first. Drawn as an ordinary bar chart, 1875
 * is a hairline and the reader learns nothing about the early years; drawn on
 * a log axis, the growth stops looking like growth.
 *
 * Du Bois did neither. He kept the bar linear, kept every value comparable by
 * *length*, and wound the bar around itself so the whole run fits on one
 * sheet. Nothing is truncated, no axis is broken, and the ratio between any
 * two years is still a ratio of two lengths. What it costs is the ability to
 * compare two bars at a glance, which is the trade every space-saving chart
 * makes and which is worth naming out loud.
 *
 * The plates were routinely filed under folk art for most of a century. They
 * are design decisions, and this is the clearest one: a chart that is aware of
 * its own scale problem and answers it in the geometry rather than in a
 * footnote.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * Du Bois's own figures from the plate, in dollars of the day.
 */
import { Plot, plot, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "W.E.B. Du Bois's 1900 spiral bar redrawn: the assessed value of household furniture owned by Black Georgians rises from $21,186 in 1875 to $1,434,975 in 1899, drawn as one continuous bar that coils outward from the centre rather than breaking its scale.";

/** Assessed value of household and kitchen furniture, in dollars. */
const YEARS = [
  { year: 1875, value: 21_186 },
  { year: 1880, value: 498_532 },
  { year: 1885, value: 736_170 },
  { year: 1890, value: 1_173_624 },
  { year: 1895, value: 1_322_694 },
  { year: 1899, value: 1_434_975 },
].map((d, i) => ({ ...d, color: SERIES[i % SERIES.length] }));

const TOTAL = YEARS.reduce((s, d) => s + d.value, 0);
const RATIO = Math.round(YEARS.at(-1).value / YEARS[0].value);

// ── The spiral ──────────────────────────────────────────────────────────────
//
// An Archimedean centreline r(θ) = R0 + B·θ, banded to a constant thickness.
// The pitch (2πB) has to exceed the band thickness or successive turns
// overlap; the gap between turns is what is left over.
const R0 = 0.16; // radius where the 1875 bar starts
const BAND = 0.17; // thickness of the bar, constant, so length is the only cue
const GAP = 0.06;
const B = (BAND + GAP) / (2 * Math.PI);
const THETA_MAX = (0.9 - R0) / B; // outermost turn lands just inside the frame
const START_ANGLE = -Math.PI / 2; // the bar leaves the centre pointing down

const r = (t) => R0 + B * t;

/**
 * Cumulative arc length along the centreline, sampled finely enough to invert
 * by linear interpolation. The closed form exists but inverting it does not,
 * and the whole spiral is 2,000 samples.
 */
const SAMPLES = 2000;
const STEP = THETA_MAX / SAMPLES;
const ARC = [0];
for (let k = 1; k <= SAMPLES; k++) {
  const t = k * STEP;
  ARC.push(ARC[k - 1] + Math.hypot(r(t), B) * STEP);
}
const ARC_TOTAL = ARC.at(-1);

/** θ at a given distance travelled along the centreline. */
function thetaAt(arc) {
  let lo = 0;
  let hi = SAMPLES;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ARC[mid] < arc) lo = mid;
    else hi = mid;
  }
  const span = ARC[hi] - ARC[lo] || 1;
  return (lo + (arc - ARC[lo]) / span) * STEP;
}

const point = (t, radius) => ({
  x: radius * Math.cos(START_ANGLE + t),
  y: radius * Math.sin(START_ANGLE + t),
});

/** One year's stretch of the bar, as a closed ribbon polygon. */
function ribbon(fromArc, toArc, meta) {
  const t0 = thetaAt(fromArc);
  const t1 = thetaAt(toArc);
  const steps = Math.max(6, Math.ceil((t1 - t0) / 0.06));
  const outer = [];
  const inner = [];
  for (let k = 0; k <= steps; k++) {
    const t = t0 + ((t1 - t0) * k) / steps;
    outer.push(point(t, r(t) + BAND / 2));
    inner.push(point(t, r(t) - BAND / 2));
  }
  return [...outer, ...inner.reverse(), outer[0]].map((p) => ({ ...p, ...meta }));
}

let travelled = 0;
const BARS = YEARS.map((d) => {
  const from = travelled;
  travelled += (d.value / TOTAL) * ARC_TOTAL;
  const mid = thetaAt((from + travelled) / 2);
  return {
    ...d,
    from,
    to: travelled,
    tip: point(thetaAt(travelled), r(thetaAt(travelled))),
    mid: point(mid, r(mid)),
  };
});

const petals = BARS.flatMap((d) => ribbon(d.from, d.to, { year: d.year, color: d.color }));

// The frame is square-pixelled so the coil stays a coil: one unit has to be
// the same number of pixels on both axes. Fix the y domain, then derive the x
// span from the frame's aspect and hang the legend column in what is left.
const WIDTH = 680;
const HEIGHT = 424;
const MARGIN = 16;
const Y_DOMAIN = [-1.02, 1.02];
const PX_PER_UNIT = (HEIGHT - 2 * MARGIN) / (Y_DOMAIN[1] - Y_DOMAIN[0]);
const X_SPAN = (WIDTH - 2 * MARGIN) / PX_PER_UNIT;
const X_DOMAIN = [-1.06, -1.06 + X_SPAN];

const LEGEND_X = 1.16;
const legend = BARS.map((d, i) => ({
  ...d,
  lx: LEGEND_X,
  ly: 0.58 - i * 0.2,
}));

const money = (v) => `$${v.toLocaleString()}`;

export const caption = `Du Bois's plate for the Paris Exposition of 1900, redrawn from his figures. The problem is one every chart of growth runs into: the last value is ${RATIO} times the first, so an ordinary bar chart renders ${YEARS[0].year} as a hairline and a log axis stops the growth from looking like growth. His answer was to keep the bar linear and coil it, so every year is still a length, every ratio is still a ratio of lengths, and nothing is truncated or broken. The cost is real and worth saying: two coiled bars cannot be compared at a glance the way two upright ones can. That is a trade he made deliberately, on a plate that spent most of a century being filed as folk art.`;

export function render() {
  return plot({
    width: WIDTH,
    height: HEIGHT,
    marginTop: MARGIN,
    marginRight: MARGIN,
    marginBottom: MARGIN,
    marginLeft: MARGIN,
    ariaLabel: title,
    x: { axis: null, domain: X_DOMAIN },
    y: { axis: null, grid: false, domain: Y_DOMAIN },
    marks: [
      Plot.line(petals, {
        x: "x",
        y: "y",
        z: "year",
        fill: "color",
        fillOpacity: 0.85,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.25,
        clip: true,
      }),
      Plot.text([{}], {
        x: LEGEND_X,
        y: 0.86,
        text: () =>
          "Assessed value of household and\nkitchen furniture owned by Black\nGeorgians, from Du Bois's plate.",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.5,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.dot(legend, { x: "lx", y: "ly", fill: "color", r: 5.5, symbol: "square" }),
      Plot.text(legend, {
        x: "lx",
        y: "ly",
        text: (d) => String(d.year),
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
        dx: 14,
        ...HALO,
      }),
      // Values right-aligned in their own column, so the reader compares
      // digits rather than hunting for the start of each number.
      Plot.text(legend, {
        x: LEGEND_X + 0.98,
        y: "ly",
        text: (d) => money(d.value),
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      // The first year is a sliver, which is the whole reason the plate is
      // shaped like this. Point at it, or a reader assumes it is missing.
      Plot.link([{}], {
        x1: BARS[0].mid.x,
        y1: BARS[0].mid.y,
        x2: -0.62,
        y2: -0.78,
        stroke: MUTED,
        strokeWidth: 1.1,
        strokeOpacity: 0.7,
      }),
      Plot.text([{}], {
        x: -0.62,
        y: -0.78,
        text: () => `${YEARS[0].year}: ${money(YEARS[0].value)}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -4,
        ...HALO,
      }),
      Plot.text([{}], {
        x: LEGEND_X,
        y: -0.72,
        text: () =>
          `One continuous bar, wound outward.\nThe last year is ${RATIO} times the first,\nand no axis had to be broken to\nsay so.`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.5,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
