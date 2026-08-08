/**
 * Four missing days plotted as zeroes and left as a gap, and the difference
 * between a collapse and an outage.
 *
 * This is the most expensive small bug in time-series reporting, because it
 * produces a chart that is dramatic, wrong, and completely plausible. A
 * pipeline drops four days. A `resample` or a `reindex` or a `fillna(0)` puts
 * zeroes there. The chart draws a cliff to the floor and back, and everyone in
 * the room reads a catastrophe that recovered, because that is exactly what a
 * collapse to zero and a rebound look like.
 *
 * A gap says the only true thing: no data. It is less dramatic and it is not
 * ambiguous, and it puts the question where it belongs, on the pipeline rather
 * than on the business.
 *
 * Zero is a legitimate value, which is what makes this dangerous. There is no
 * way to tell a real zero from a missing one after the fill, so the check has
 * to happen before: a count of rows per day next to the values, and a rule
 * that a missing key stays missing all the way to the chart.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "One series drawn twice across a four-day pipeline outage. Filled with zeroes it plunges to the floor and recovers; left as a gap it simply stops and resumes at the same level.";

const DAYS = 30;
const OUTAGE = [14, 15, 16, 17];
const u = rng(1720);

const base = Array.from({ length: DAYS }, (_, d) => ({
  d,
  v: 62 + d * 0.5 + Math.sin(d * 0.8) * 4 + (u() - 0.5) * 5,
}));

const missing = (d) => OUTAGE.includes(d);

const FILLED = "fillna(0): a collapse";
const GAP = "Left missing: an outage";

/** The zero-filled series is one unbroken line, which is the whole problem:
 *  nothing in it marks the four days as different from the other twenty-six. */
const filled = base.map((p) => ({ ...p, panel: FILLED, v: missing(p.d) ? 0 : p.v }));

/** The gap is drawn by splitting the series into two runs, because a line mark
 *  joins whatever rows it is given and would bridge the hole otherwise. */
const gapped = base
  .filter((p) => !missing(p.d))
  .map((p) => ({ ...p, panel: GAP, run: p.d < OUTAGE[0] ? "before" : "after" }));

const BEFORE = base[OUTAGE[0] - 1].v;
const AFTER = base[OUTAGE.at(-1) + 1].v;
const STEP = Math.abs(AFTER - BEFORE).toFixed(1);
const CLIFF = Math.round(BEFORE);

export const caption = `This is the most expensive small bug in time-series reporting, because the chart it produces is dramatic, wrong and entirely plausible. A pipeline drops ${OUTAGE.length} days, a resample or a reindex or a fillna(0) puts zeroes in their place, and the line draws a cliff to the floor and back. Everyone in the room reads a catastrophe that recovered, because that is precisely what a collapse and a rebound look like. Compare the two drops: the fill draws one of ${CLIFF}, and the real difference between the last measured day and the first one after is ${STEP}. The gap says the only true thing, which is that there is no data, and it puts the question where it belongs, on the pipeline rather than on the business. What makes this dangerous is that zero is a legitimate value, and after the fill there is no way to tell a real zero from a missing one. The check has to come earlier: count rows per day alongside the values, and let a missing key stay missing all the way to the chart.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 46,
    marginRight: 22,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [FILLED, GAP] },
    x: { label: "Day", labelAnchor: "center", domain: [0, DAYS - 1], ticks: 4 },
    y: { label: "Orders", domain: [0, 100], ticks: 4 },
    marks: [
      // The outage window, marked in both panels so the two are comparable.
      Plot.rect([{}], {
        x1: OUTAGE[0] - 0.5,
        x2: OUTAGE.at(-1) + 0.5,
        y1: 0,
        y2: 100,
        fill: MUTED,
        fillOpacity: 0.12,
      }),
      Plot.line(filled, {
        fx: "panel",
        x: "d",
        y: "v",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(gapped, {
        fx: "panel",
        x: "d",
        y: "v",
        z: "run",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.text([{ at: (OUTAGE[0] + OUTAGE.at(-1)) / 2 }], {
        fx: () => FILLED,
        x: "at",
        y: 14,
        text: () => "a catastrophe\nthat never happened",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{ at: (OUTAGE[0] + OUTAGE.at(-1)) / 2 }], {
        fx: () => GAP,
        x: "at",
        y: 14,
        text: () => "no data",
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
