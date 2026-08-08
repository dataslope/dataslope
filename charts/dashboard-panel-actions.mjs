/**
 * The deletion pass, drawn: how often each panel on a year-old dashboard
 * actually changed what anyone did.
 *
 * Dashboards are cheap to add to and expensive to delete from, so they grow by
 * accretion until nobody can say what any given panel is for. The audit that
 * fixes this is one question per panel — if this value moves, does anyone do
 * something different? — and the answer is countable: how many times in the
 * last year did this panel trigger a decision, an alert someone acted on, a
 * message in a channel, a rollback.
 *
 * The distribution is the usual one for anything that grows by accretion. A
 * few panels carry the dashboard; most have never once been the reason for
 * anything. Those are not neutral: they are the panels the reader has to scan
 * past to reach the four that matter.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Fourteen dashboard panels ranked by the number of decisions each one triggered over a year. Four panels account for nearly all of them and eight triggered none at all.";

const PANELS = [
  { key: "Error rate by service", n: 31 },
  { key: "Checkout conversion", n: 22 },
  { key: "Daily revenue", n: 17 },
  { key: "p99 latency", n: 12 },
  { key: "Signups", n: 4 },
  { key: "Refund rate", n: 2 },
  { key: "Sessions by browser", n: 0 },
  { key: "Traffic by country", n: 0 },
  { key: "Page views", n: 0 },
  { key: "Avg session length", n: 0 },
  { key: "Sessions by OS", n: 0 },
  { key: "Social referrals", n: 0 },
  { key: "Newsletter clicks", n: 0 },
  { key: "Bounce rate", n: 0 },
];

const DEAD = PANELS.filter((d) => d.n === 0).length;
const TOTAL = PANELS.reduce((s, d) => s + d.n, 0);
const TOP4 = PANELS.slice(0, 4).reduce((s, d) => s + d.n, 0);

const rows = PANELS.map((d) => ({ ...d, dead: d.n === 0 }));

export const caption = `Ask of every panel: if this value changes, will anyone do something different? Counted over a year, four of these fourteen panels account for ${((TOP4 / TOTAL) * 100).toFixed(0)}% of the decisions and ${DEAD} have never driven one. The ${DEAD} are not free, either: they are what the reader scans past to reach the four that matter. Run this pass on a schedule, because nobody ever deletes a panel unprompted.`;

export function render() {
  return plot({
    height: 380,
    marginTop: 22,
    marginLeft: 152,
    marginRight: 118,
    marginBottom: 42,
    ariaLabel: title,
    x: { label: "Decisions triggered in 12 months", labelAnchor: "center", domain: [0, 34], ticks: 5 },
    y: { label: null, domain: PANELS.map((d) => d.key), grid: false },
    marks: [
      Plot.ruleY(rows, {
        y: "key",
        x1: 0,
        x2: "n",
        stroke: (d) => (d.dead ? ACCENT : PRIMARY),
        strokeWidth: 2.5,
        strokeOpacity: 0.75,
      }),
      Plot.dot(rows, {
        y: "key",
        x: "n",
        fill: (d) => (d.dead ? ACCENT : PRIMARY),
        r: 4.2,
      }),
      Plot.text(rows.filter((d) => !d.dead), {
        y: "key",
        x: "n",
        text: (d) => String(d.n),
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.text([{ at: PANELS[9].key }], {
        x: 3.4,
        y: "at",
        text: () => `${DEAD} panels, zero decisions,\nstill on the page`,
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
