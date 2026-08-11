/**
 * The first bar chart, and the reason it exists: missing data.
 *
 * The *Commercial and Political Atlas* is forty-three plates of time series
 * and one plate that is not. Playfair had eighty-one years of England's trade
 * with its major partners and drew them as lines. For Scotland he had a single
 * year, Christmas 1780 to Christmas 1781, seventeen partners, one number each,
 * and no way to draw a line through one point.
 *
 * So he turned the axis into a list of places instead of a run of years, and
 * the chart type that fell out of that constraint is the one now used more
 * than any other. Playfair himself thought it the weakest plate in the book,
 * and said so: it showed no *progress*, which is what he believed charts were
 * for.
 *
 * Two things in the drawing are worth pointing at because they are still the
 * rules. The bars start at zero, because their length is the quantity. And
 * they are sorted by size rather than alphabetically, so the ranking, which is
 * the only thing one year of data can tell you, is the first thing you read.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * Read from the engraving and rounded to the nearest five thousand pounds. The
 * order and the spread are Playfair's; the last digit is not, and the caption
 * says so rather than implying a precision the source does not carry.
 */
import { Plot, plot, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "Playfair's 1786 bar chart redrawn: Scotland's imports and exports with seventeen trading partners for the single year to Christmas 1781, as paired horizontal bars sorted by total trade. Ireland and Russia dominate; most partners are a fraction of them.";

/** Thousands of pounds for the one year, read from the plate. */
const PARTNERS = [
  ["Ireland", 305, 265],
  ["Russia", 220, 20],
  ["West Indies", 95, 80],
  ["America", 75, 55],
  ["Denmark and Norway", 70, 25],
  ["Holland", 60, 55],
  ["Germany", 55, 50],
  ["Sweden", 50, 15],
  ["Flanders", 40, 45],
  ["Portugal", 35, 40],
  ["Guernsey", 25, 20],
  ["Prussia", 25, 10],
  ["Poland", 20, 5],
  ["Isle of Man", 15, 20],
  ["Greenland", 15, 5],
  ["Iceland", 10, 5],
  ["Jersey", 10, 15],
].map(([key, imports, exports]) => ({ key, imports, exports, total: imports + exports }));

const ORDER = [...PARTNERS].sort((a, b) => b.total - a.total).map((d) => d.key);
const rows = PARTNERS.flatMap((d) => [
  { key: d.key, kind: "Imports into Scotland", value: d.imports },
  { key: d.key, kind: "Exports from Scotland", value: d.exports },
]);
const KIND_COLOR = { "Imports into Scotland": SERIES[1], "Exports from Scotland": PRIMARY };
const TOP = PARTNERS.reduce((a, b) => (b.total > a.total ? b : a));

export const caption = `Redrawn from the one plate in the *Atlas* that is not a time series: Scotland's trade with seventeen partners in a single year, led by ${TOP.key} at £${TOP.total},000.`;

const KINDS = ["Imports into Scotland", "Exports from Scotland"];

export function render() {
  return plot({
    height: 470,
    marginTop: 26,
    marginLeft: 138,
    marginRight: 26,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Thousands of pounds, one year to Christmas 1781",
      labelAnchor: "center",
      domain: [0, 392],
      ticks: 4,
      tickFormat: (d) => `£${d}k`,
    },
    // One facet row per partner, two bars inside it. `Plot.barX` with two rows
    // sharing a band *stacks* them, which would draw a total nobody asked for
    // and clip the longest pair off the frame; a second band scale inside the
    // facet is how Plot dodges.
    fy: { label: null, domain: ORDER, axis: null },
    y: { label: null, domain: KINDS, axis: null, padding: 0.28 },
    marks: [
      Plot.barX(rows, {
        fy: "key",
        y: "kind",
        x: "value",
        fill: (d) => KIND_COLOR[d.kind],
        fillOpacity: 0.85,
        clip: true,
      }),
      // The partner name once per facet, drawn rather than left to an axis:
      // an `fy` axis prints its labels on the right, away from the bars they
      // belong to.
      //
      // `frameAnchor`, not `y: KINDS[0]`. A string handed to `y` is a *field
      // name*, so Plot looks for `d["Imports into Scotland"]`, finds nothing,
      // and drops the mark without a word. Every partner name and the note
      // below vanished from the first render exactly that way.
      Plot.text(PARTNERS, {
        fy: "key",
        frameAnchor: "left",
        text: "key",
        fill: "currentColor",
        fontSize: 11.5,
        textAnchor: "end",
        dx: -10,
      }),
      // Direct labels on the top row instead of a legend, which is the rule
      // the rest of this course teaches.
      Plot.text(
        KINDS.map((kind) => ({ kind, key: ORDER[0], value: PARTNERS.find((p) => p.key === ORDER[0])[kind === KINDS[0] ? "imports" : "exports"] })),
        {
          fy: "key",
          y: "kind",
          x: "value",
          text: (d) => (d.kind === KINDS[0] ? "Imports" : "Exports"),
          fill: (d) => KIND_COLOR[d.kind],
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text([{ key: ORDER[10] }], {
        fy: "key",
        frameAnchor: "right",
        text: () => "one year, because one year\nwas all Playfair had",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
