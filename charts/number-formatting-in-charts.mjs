/**
 * One number, four ways, and why the axis is where formatting matters most.
 *
 * Nobody defends `1234567.891` as a label. The interesting part is what
 * happens between the three defensible options, because they are not
 * interchangeable and the choice is not a matter of house style.
 *
 * A raw figure with separators is the most information and the slowest to
 * read: comparing two of them means comparing digit strings left to right, and
 * a reader doing that on five ticks has done twenty-five comparisons by the
 * time they look at the data. Rounding to a unit (`1.2M`) is the fastest,
 * because the labels become short enough to hold in the eye at once, and it
 * costs precision the axis never had anyway: nobody reads a bar to the nearest
 * pound.
 *
 * The failure worth knowing about is the third column. Rounding to *too few*
 * significant figures collapses distinct ticks into identical strings, which
 * is worse than either option, because an axis that reads `1M, 1M, 1M, 2M, 2M`
 * has stopped being a scale. It happens whenever a range is narrow relative to
 * its magnitude, which is common in money and rare in counts, and it is the
 * one thing to check after switching to compact units.
 *
 * The general shape of the rule: on an axis, use the fewest digits that still
 * make every tick distinct, put the unit in the axis title rather than on each
 * tick, and keep the precise figures for the tooltip and the table, where a
 * reader has asked for one number rather than being shown five.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One axis of five values labelled four ways: raw digits, digits with thousands separators, over-rounded compact units where three of the five ticks collapse to the same string, and compact units with one decimal. The last is legible and still distinct.";

/** Annual revenue by region, in pounds, with a range narrow enough relative to
 *  its magnitude that over-rounding collapses ticks. */
const VALUES = [1_234_567.891, 1_612_004.5, 1_988_441.11, 2_366_877.72, 2_745_314.33];

const compact = (v, digits) => `${(v / 1e6).toFixed(digits)}M`;

const STYLES = [
  {
    title: "Raw",
    format: (v) => String(Math.round(v * 1000) / 1000),
    verdict: "every tick a\ndigit-by-digit read",
    bad: true,
  },
  {
    title: "Separators",
    format: (v) => Math.round(v).toLocaleString("en-GB"),
    verdict: "correct, and still\nslow to compare",
    bad: false,
  },
  {
    title: "Compact, 0 dp",
    format: (v) => compact(v, 0),
    verdict: "three ticks now\nread the same",
    bad: true,
  },
  {
    title: "Compact, 1 dp",
    format: (v) => compact(v, 1),
    verdict: "short, distinct:\nuse this one",
    bad: false,
  },
];

const DOMAIN = [1_000_000, 3_000_000];
const PANELS = STYLES.map((_, k) => panel(k, { y: DOMAIN }));
const BEST = 3;

/** Which styles produce a duplicate label, found rather than asserted. */
const collapses = (style) => new Set(VALUES.map(style.format)).size < VALUES.length;
const COLLAPSED = STYLES.filter(collapses).map((s) => s.title);

export const caption = `The same five axis values, labelled four ways. Nobody defends the first column; the interesting choice is between the other three. Separators are the most information and the slowest to read, because comparing two of them means comparing digit strings from the left, and a reader has done that five times before they have looked at the data. Compact units are the fastest, and the precision they cost is precision the axis never had: nobody reads a bar to the nearest pound. The failure to watch for is the third column, where rounding to too few significant figures makes ${COLLAPSED.length > 1 ? "several ticks" : "three of the five ticks"} print the same string, and an axis reading 1M, 2M, 2M, 2M, 3M has stopped being a scale. That happens whenever a range is narrow next to its magnitude, which is common with money. The working rule: fewest digits that keep every tick distinct, unit in the axis title rather than on each tick, and full precision saved for the tooltip and the table, where a reader has asked for one number instead of being handed five.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 24,
    marginLeft: 16,
    marginRight: 16,
    marginBottom: 44,
    ariaLabel: title,
    ...panelSpace(STYLES.length),
    marks: [
      ...PANELS.flatMap((p, k) => {
        const style = STYLES[k];
        const seen = new Map();
        const rows = VALUES.map((v) => {
          const label = style.format(v);
          const n = (seen.get(label) ?? 0) + 1;
          seen.set(label, n);
          return { v, label, y: p.py(v), dup: n > 1 || VALUES.some((o) => o !== v && style.format(o) === label) };
        });
        return [
          Plot.link(rows, {
            x1: p.left + 0.06,
            x2: p.right,
            y1: "y",
            y2: "y",
            stroke: "currentColor",
            strokeOpacity: 0.12,
          }),
          Plot.text(rows, {
            x: (p.left + p.right) / 2,
            y: "y",
            text: "label",
            fill: (d) => (d.dup ? ACCENT : "currentColor"),
            fillOpacity: (d) => (d.dup ? 1 : 0.75),
            fontSize: 11,
            fontWeight: 600,
            textAnchor: "middle",
            dy: -7,
            ...HALO,
          }),
          panelTitle(p, style.title, { fill: k === BEST ? PRIMARY : MUTED, fontSize: 11 }),
          Plot.text([{}], {
            x: (p.left + p.right) / 2,
            y: p.bottom,
            text: () => style.verdict,
            fill: style.bad ? ACCENT : MUTED,
            fontSize: 10,
            fontWeight: 600,
            lineHeight: 1.35,
            textAnchor: "middle",
            dy: 22,
            ...HALO,
          }),
        ];
      }),
    ],
  });
}
