/**
 * Support volume by weekday and hour, which is the shape a calendar heatmap
 * exists to show and no other chart shows as well.
 *
 * The data is one number per cell, so a line chart could carry it: seven
 * series of twenty-four points each. Nobody can read seven overlapping daily
 * curves, and small multiples of seven make the reader compare across panels
 * to answer the only questions anyone asks, which are "when is it busy" and
 * "when can we do maintenance". The grid answers both at a glance because the
 * two dimensions of the data are the two dimensions of the page.
 *
 * That is the real rule for a heatmap: reach for it when the data is naturally
 * a matrix and the question is about *where the hot regions are* rather than
 * about exact values. Color is a weak channel, so a heatmap that needs its
 * reader to compare two similar cells precisely has picked the wrong mark; one
 * that needs them to find the block of dark cells has picked the right one.
 *
 * The cells are labelled at the extremes only. A number in every cell turns
 * the heatmap into a table, which is a legitimate chart and a different one.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Support ticket volume in a grid of seven weekdays by twenty-four hours. A dark block covers weekday working hours, a lighter ridge covers Monday morning, and the overnight and weekend cells are nearly empty.";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = 24;

const u = rng(3161);

/** Office hours, a Monday-morning backlog, a small evening tail, and weekends
 *  at about a tenth of the weekday rate. */
const weight = (d, h) => {
  const weekend = d >= 5;
  const office = h >= 9 && h < 18 ? 1 : h >= 7 && h < 21 ? 0.35 : 0.04;
  const monday = d === 0 && h >= 8 && h < 12 ? 1.45 : 1;
  return office * monday * (weekend ? 0.12 : 1);
};

const cells = DAYS.flatMap((day, d) =>
  Array.from({ length: HOURS }, (_, h) => ({
    d,
    h,
    day,
    n: Math.round(weight(d, h) * 42 * (0.82 + u() * 0.36)),
  })),
);

const PEAK = cells.reduce((a, b) => (a.n >= b.n ? a : b));
const QUIET = cells.reduce((a, b) => (a.n <= b.n ? a : b));
const MAX = PEAK.n;

const weekdayDay = cells
  .filter((c) => c.d < 5 && c.h >= 9 && c.h < 18)
  .reduce((s, c) => s + c.n, 0);
const total = cells.reduce((s, c) => s + c.n, 0);
const SHARE = Math.round((weekdayDay / total) * 100);

const hourLabel = (h) => (h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`);

export const caption = `One number per cell, which a line chart could also carry as seven daily curves of twenty-four points. Nobody reads seven overlapping curves, and seven small multiples make the reader compare across panels to answer the only two questions anyone asks: when is it busy, and when can we take the system down. The grid answers both at once because the two dimensions of the data are the two dimensions of the page. ${SHARE} percent of the week's tickets land in weekday working hours, the busiest cell is ${PEAK.day} at ${hourLabel(PEAK.h)} with ${PEAK.n}, and the quietest is ${QUIET.day} at ${hourLabel(QUIET.h)} with ${QUIET.n}. That is the rule for a heatmap: use it when the data is naturally a matrix and the question is where the hot regions are, not what the exact values are. Color is a weak channel, so a heatmap that asks its reader to compare two similar cells precisely has picked the wrong mark. Labelling every cell would turn it into a table, which is a good chart and a different one.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 24,
    marginLeft: 44,
    marginRight: 22,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Hour of day",
      labelAnchor: "center",
      domain: [0, HOURS],
      ticks: [0, 6, 12, 18, 24].map((h) => h),
      tickFormat: (h) => (h === 24 ? "12a" : hourLabel(h)),
      grid: false,
    },
    y: {
      label: null,
      domain: [DAYS.length, 0],
      ticks: DAYS.map((_, i) => i + 0.5),
      tickFormat: (v) => DAYS[Math.floor(v)],
      grid: false,
    },
    marks: [
      // Intensity as opacity on one token: a two-stop color scale would need
      // a literal for its low end, and only the tokens survive both themes.
      Plot.rect(cells, {
        x1: "h",
        x2: (d) => d.h + 1,
        y1: "d",
        y2: (d) => d.d + 1,
        fill: PRIMARY,
        fillOpacity: (d) => 0.04 + (d.n / MAX) * 0.92,
        inset: 0.5,
      }),
      Plot.rect([PEAK], {
        x1: "h",
        x2: (d) => d.h + 1,
        y1: "d",
        y2: (d) => d.d + 1,
        fill: "none",
        stroke: ACCENT,
        strokeWidth: 1.8,
      }),
      Plot.text([PEAK], {
        x: (d) => d.h + 0.5,
        y: (d) => d.d,
        text: (d) => `busiest: ${d.n}`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        dy: -6,
        ...HALO,
      }),
      Plot.text([{ at: DAYS.length }], {
        x: 3,
        y: "at",
        text: () => "overnight and weekends: near zero",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dy: -8,
        ...HALO,
      }),
    ],
  });
}
