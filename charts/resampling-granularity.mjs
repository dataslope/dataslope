/**
 * One series at three granularities, where each step of aggregation buys
 * legibility with a different loss.
 *
 * Resampling is usually taught as a tidying step, a way to get a chart that
 * isn't a fuzzy band. It is really a choice about which questions the chart
 * can still answer. Hourly keeps everything and shows almost nothing: the
 * daily cycle dominates so completely that the four-week trend underneath it
 * is invisible. Daily means remove the cycle and the trend appears, along with
 * the one-day incident in week three. Weekly means give the cleanest line on
 * the page and quietly delete the incident, because a bad Tuesday averaged
 * with six normal days is a normal week.
 *
 * The rule that follows: aggregate to the grain of the *decision*, and if
 * anyone needs to spot single-day events, no weekly chart will let them.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Twenty-eight days of hourly traffic shown hourly, as daily means and as weekly means. The hourly line is dominated by the daily cycle, the daily line reveals both the trend and a one-day incident, and the weekly line is smooth and has erased the incident entirely.";

const DAYS = 28;
const HOURS = DAYS * 24;
const INCIDENT_DAY = 17;

const u = rng(5150);

const hourly = Array.from({ length: HOURS }, (_, h) => {
  const day = Math.floor(h / 24);
  const hour = h % 24;
  const trend = 60 + day * 0.85;
  const daily = Math.sin(((hour - 4) / 24) * Math.PI * 2) * 26;
  const noise = (u() + u() - 1) * 6;
  const drop = day === INCIDENT_DAY ? -32 : 0;
  return { day, h, t: h / 24, v: Math.max(4, trend + daily + noise + drop) };
});

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

const daily = Array.from({ length: DAYS }, (_, d) => ({
  t: d + 0.5,
  v: mean(hourly.filter((p) => p.day === d).map((p) => p.v)),
}));

const WEEKS = DAYS / 7;
const weekly = Array.from({ length: WEEKS }, (_, w) => ({
  t: w * 7 + 3.5,
  v: mean(daily.slice(w * 7, w * 7 + 7).map((p) => p.v)),
}));

// Bare grain names. Plot writes facet labels into the right margin without
// wrapping, so the reading of each row belongs in the caption.
const HOURLY = "Hourly";
const DAILY = "Daily mean";
const WEEKLY = "Weekly mean";

const rows = [
  ...hourly.map((d) => ({ ...d, panel: HOURLY })),
  ...daily.map((d) => ({ ...d, panel: DAILY })),
  ...weekly.map((d) => ({ ...d, panel: WEEKLY })),
];

const INCIDENT = daily[INCIDENT_DAY];
const NORMAL = mean(
  daily.filter((_, i) => Math.abs(i - INCIDENT_DAY) > 2 && i > 10).map((p) => p.v),
);
const SHORTFALL = Math.round(((NORMAL - INCIDENT.v) / NORMAL) * 100);

export const caption = `The same four weeks of traffic at three grains. Resampling is usually taught as tidying, a way to stop a chart being a fuzzy band; it is really a choice about which questions the chart can still answer. Hourly keeps every number and shows almost nothing, because the daily cycle swamps the four-week trend underneath it. Daily means delete the cycle, and the trend appears along with the incident on day ${INCIDENT_DAY + 1}, about ${SHORTFALL} percent below its neighbours. Weekly means give the cleanest line here and erase that incident completely, because one bad day averaged with six normal ones is a normal week. Aggregate to the grain of the decision, and if anyone needs to catch single-day events, no weekly chart will let them.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 34,
    marginLeft: 50,
    marginRight: 84,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: [HOURLY, DAILY, WEEKLY] },
    x: { label: "Day", labelAnchor: "center", domain: [0, DAYS], ticks: 5 },
    y: { label: "Requests/s", domain: [0, 132], ticks: 3 },
    marks: [
      Plot.line(rows, {
        fy: "panel",
        x: "t",
        y: "v",
        z: "panel",
        stroke: (d) => (d.panel === HOURLY ? MUTED : PRIMARY),
        strokeWidth: (d) => (d.panel === HOURLY ? 0.7 : 1.9),
        strokeOpacity: (d) => (d.panel === HOURLY ? 0.8 : 1),
      }),
      // The incident, marked where it survives and where it does not.
      Plot.dot([INCIDENT], {
        fy: () => DAILY,
        x: "t",
        y: "v",
        r: 4,
        fill: ACCENT,
      }),
      Plot.text([INCIDENT], {
        fy: () => DAILY,
        x: "t",
        y: "v",
        text: () => `incident: -${SHORTFALL}%`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        dy: 2,
        ...HALO,
      }),
      Plot.text([{ at: INCIDENT.t }], {
        fy: () => WEEKLY,
        x: "at",
        y: 96,
        text: () => "the same day, gone",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
