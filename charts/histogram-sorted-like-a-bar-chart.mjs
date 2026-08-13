/**
 * What the histogram/bar-chart difference costs, rather than what it is.
 *
 * `histogram-vs-bar-chart` puts the two charts side by side and says the
 * difference is the x-axis. This is the consequence, and it is the one that
 * shows up in real work, because sorting bars descending is a genuinely good
 * habit — on a bar chart it is close to free, it hands the reader the ranking,
 * and every BI tool offers it as a click.
 *
 * Applied to a histogram, that same click deletes the finding. Both panels
 * here hold the identical ten bars, the identical ten counts, and the same
 * 600 deliveries. Sorted, the two-hump shape that was the entire reason to
 * draw the chart becomes a smooth ramp — the shape of *any* sorted histogram,
 * which is to say the shape of nothing. The bin labels are still on the axis
 * and still correct, and they are now in an order no reader can use.
 *
 * The rule is worth stating from this end. On a bar chart the horizontal
 * position of a bar is a lookup key, so moving it costs nothing. On a
 * histogram the horizontal position *is* a measurement, so moving it throws
 * away the measurement and keeps the ink.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "One histogram of delivery times shown twice with the same ten bars: in bin order, where two clear humps sit at about six and twenty-one hours, and sorted by height like a bar chart, where the humps become a smooth descending ramp and the bin labels along the axis run out of order.";

const N = 600;
const BIN = 3;
const BINS = 10;
const EDGES = Array.from({ length: BINS }, (_, i) => i * BIN);

/** Two populations in one column, which is the single most common thing a
 *  histogram is drawn to find: a local warehouse and a national one. Seeded,
 *  because the generated module is diffed on every build. */
const pick = rng(9301);
const spread = rng(4477);
const HOURS = Array.from({ length: N }, () => {
  const local = pick() < 0.55;
  const centre = local ? 6 : 21;
  // Three uniform draws, which is close enough to a bell over four bins a side
  // and keeps the spec free of a distribution import it would use once.
  const wobble = (spread() + spread() + spread() - 1.5) * 5;
  return Math.min(29.9, Math.max(0, centre + wobble));
});

const COUNTS = EDGES.map((edge) => ({
  edge,
  count: HOURS.filter((h) => h >= edge && h < edge + BIN).length,
}));

const ORDERED = "In bin order: a distribution";
const SORTED = "Sorted by height: a ramp";

const inOrder = COUNTS.map((d, i) => ({ ...d, panel: ORDERED, i }));
const sorted = [...COUNTS]
  .sort((a, b) => b.count - a.count)
  .map((d, i) => ({ ...d, panel: SORTED, i }));
const rows = [...inOrder, ...sorted];

/** The two humps, named in the caption so the claim can be checked against the
 *  left panel. */
const PEAKS = [0, 1].map((half) =>
  COUNTS.slice(half * 5, half * 5 + 5).reduce((hi, d) => (d.count > hi.count ? d : hi)),
);

export const caption = `The same ten bars twice, holding the same ${N} deliveries; only their left-to-right order differs. In bin order the chart says what it was drawn to say, that these are two populations and not one: a hump around ${PEAKS[0].edge}–${PEAKS[0].edge + BIN} hours and another around ${PEAKS[1].edge}–${PEAKS[1].edge + BIN}. Sorted by height it says nothing at all, because *every* histogram sorted by height is a descending ramp. On a bar chart a bar's position is a lookup key and sorting is close to free; on a histogram the position **is** the measurement, and sorting throws it away while keeping all of the ink.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 52,
    marginRight: 18,
    marginBottom: 52,
    ariaLabel: title,
    fx: { label: null, domain: [ORDERED, SORTED] },
    // Positional x with two different meanings per panel, so each panel prints
    // its own bin labels below rather than sharing one set of ticks.
    x: { label: null, domain: [-0.5, BINS - 0.5], ticks: [] },
    y: { label: "Deliveries", domain: [0, 160], ticks: 4 },
    marks: [
      Plot.rect(rows, {
        fx: "panel",
        x1: (d) => d.i - 0.5,
        x2: (d) => d.i + 0.5,
        y1: 0,
        y2: "count",
        fill: (d) => (d.panel === SORTED ? ACCENT : PRIMARY),
        fillOpacity: (d) => (d.panel === SORTED ? 0.45 : 0.55),
        // The bars touch in both panels, because nothing about the bars
        // changed: a hairline in the page color keeps ten of them countable.
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 0.75,
        clip: true,
      }),
      Plot.text(rows, {
        fx: "panel",
        x: "i",
        y: 0,
        text: (d) => String(d.edge),
        fill: MUTED,
        fontSize: 10,
        dy: 14,
      }),
      Plot.text([{ panel: ORDERED }, { panel: SORTED }], {
        fx: "panel",
        x: (BINS - 1) / 2,
        y: 0,
        text: () => "hours to deliver, bin start",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        dy: 32,
      }),
      Plot.text([{ panel: SORTED }], {
        fx: "panel",
        x: 6.4,
        y: 108,
        text: () => "same ten bars, same ten counts,\nand both humps are gone",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
