/**
 * Source freshness as the thing it actually measures: when the data landed,
 * not whether it is correct.
 *
 * Every dbt test in the project can pass on a table that stopped updating a
 * week ago, because the rows that are there are still valid. Freshness is the
 * separate check that asks how old the newest row is, and its thresholds are
 * `warn_after` and `error_after` on the loaded-at column.
 *
 * The interesting part is the distribution rather than any one day. The feed
 * normally lands a little after 02:00 with an hour of jitter, which is
 * comfortably inside the window, and then drifts later across the quarter as
 * the upstream job takes longer. The warn line catches the drift weeks before
 * the error line catches the outage, which is the whole reason there are two
 * thresholds rather than one.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Daily arrival times of an upstream feed over ninety days against warn and error thresholds. Arrivals sit safely below both for the first half, drift up past the warn line through the second, and breach the error line on three days near the end.";

const DAYS = 90;
const WARN = 4;
const ERROR = 6;

const u = rng(20260807);

/** Hours after midnight. A steady baseline that drifts later over the
 *  quarter, plus jitter, plus two genuine incidents. */
const INCIDENTS = { 71: 8.4, 84: 9.1 };
const rows = Array.from({ length: DAYS }, (_, i) => {
  const drift = 2.1 + 2.3 * Math.pow(i / DAYS, 2.2);
  const jitter = (u() - 0.5) * 1.1;
  const at = INCIDENTS[i] ?? drift + jitter;
  return { day: i, at, state: at >= ERROR ? "error" : at >= WARN ? "warn" : "ok" };
});

const WARNED = rows.filter((d) => d.state === "warn").length;
const ERRORED = rows.filter((d) => d.state === "error").length;

export const caption = `Every test in the project passes on a table that stopped updating: the rows that are there are still valid. Freshness is the separate check, and it is a threshold on how old the newest row is. Here the feed drifts later across the quarter as the upstream job slows, tripping \`warn_after\` on ${WARNED} days before it ever trips \`error_after\` on ${ERRORED}. Two thresholds, because the drift is the thing worth a ticket and the outage is the thing worth a page.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 62,
    marginRight: 96,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Day", labelAnchor: "center", domain: [0, DAYS - 1], ticks: 6 },
    y: {
      label: "Arrival time",
      domain: [0, 10],
      ticks: [0, 2, 4, 6, 8, 10],
      tickFormat: (d) => `${String(d).padStart(2, "0")}:00`,
    },
    marks: [
      Plot.ruleY([WARN], { stroke: PRIMARY, strokeWidth: 1.4, strokeDasharray: "5 4" }),
      Plot.ruleY([ERROR], { stroke: ACCENT, strokeWidth: 1.4, strokeDasharray: "5 4" }),
      Plot.dot(rows, {
        x: "day",
        y: "at",
        r: 3,
        fill: (d) => (d.state === "error" ? ACCENT : d.state === "warn" ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.state === "ok" ? 0.65 : 0.95),
      }),
      Plot.text([{}], {
        x: DAYS - 1,
        y: WARN,
        text: () => "warn_after",
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: DAYS - 1,
        y: ERROR,
        text: () => "error_after",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 2,
        y: 8.6,
        text: () => "the drift is the warning;\nthe outage is just the end of it",
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
