/**
 * A trending series and its first difference, stacked on a shared time axis.
 *
 * The top series wanders upward: its mean depends on when you look, which is
 * exactly what non-stationary means and what every ARIMA-family model refuses
 * to accept. Subtracting each value from the one before removes the level
 * entirely, and what is left oscillates around a fixed zero. That is the whole
 * mechanism of the "I" in ARIMA.
 *
 * The two panels cannot be facets: a level around 140 and a difference around
 * 0 share no scale, and a shared one would flatten the difference into a line.
 * They are stacked by hand into one frame with their own vertical bands, which
 * is what keeps the time axis aligned so a bump above can be found below.
 */
import { Plot, plot, rng, GUIDE, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "A rising, wandering series above its own first difference. The upper series climbs from about 100 to 180 with no fixed level; the lower one oscillates around zero with a constant spread.";

export const caption =
  "Differencing subtracts each value from the one before. The trend disappears with the level, and what is left has a mean that no longer depends on when you look. That is the I in ARIMA, and the reason it is there.";

const N = 120;
const next = rng(4242);
const gauss = () => {
  const a = Math.max(next(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
};

// A random walk with drift: the textbook non-stationary series, and the one
// differencing is designed for.
let level = 100;
const LEVELS = Array.from({ length: N }, () => {
  level += 0.62 + gauss() * 2.4;
  return level;
});

const DIFFS = LEVELS.map((v, i) => (i === 0 ? null : v - LEVELS[i - 1]));

// Layout: two bands in one frame, each normalised into its own vertical slot
// so the panels keep their own scale while sharing the time axis.
const band = (values, slotTop, slotBottom) => {
  const lo = Math.min(...values.filter((v) => v !== null));
  const hi = Math.max(...values.filter((v) => v !== null));
  return (v) => slotTop + ((hi - v) / (hi - lo)) * (slotBottom - slotTop);
};

const toLevel = band(LEVELS, 0.06, 0.42);
const toDiff = band(DIFFS, 0.58, 0.94);
const ZERO = toDiff(0);

const rows = [
  ...LEVELS.map((v, t) => ({ t, y: toLevel(v), row: "level" })),
  ...DIFFS.map((v, t) => (v === null ? null : { t, y: toDiff(v), row: "diff" })).filter(Boolean),
];

export function render() {
  return plot({
    height: 360,
    marginTop: 30,
    marginLeft: 118,
    marginRight: 24,
    marginBottom: 44,
    ariaLabel: title,
    x: { label: "Time", labelAnchor: "center", domain: [0, N - 1], ticks: [] },
    y: {
      label: null,
      domain: [0, 1],
      ticks: [0.24, 0.76],
      tickFormat: (v) => (v < 0.5 ? "The series" : "First difference"),
      grid: false,
      reverse: true,
    },
    marks: [
      Plot.lineY(rows.filter((d) => d.row === "level"), {
        x: "t",
        y: "y",
        stroke: PRIMARY,
        strokeWidth: 1.75,
      }),
      // Zero for the difference panel, which is the level the trend used to
      // hide: the series below it has a fixed mean and the one above does not.
      Plot.ruleY([ZERO], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.lineY(rows.filter((d) => d.row === "diff"), {
        x: "t",
        y: "y",
        stroke: SERIES[1],
        strokeWidth: 1.5,
      }),
      Plot.text([{}], {
        x: 2,
        y: 0.02,
        text: () => "the mean depends on when you look",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: 2,
        y: 0.54,
        text: () => "and now it does not",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
