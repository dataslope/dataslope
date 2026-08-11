/**
 * The three families of color scale, each shown on the data it fits and on
 * data it does not, so the choice reads as a claim about the numbers.
 *
 * A palette is not a decoration, it is an assertion about the structure of the
 * variable. A sequential ramp says "these are ordered, and darker is more". A
 * diverging ramp says "there is a meaningful middle, and the two sides mean
 * opposite things". A qualitative palette says "these have no order at all".
 * Pick the wrong one and the chart makes a claim the data does not support,
 * and it makes it before anyone reads a label.
 *
 * Both failures are common and neither looks like an error. Ordered values in
 * a qualitative palette lose their order: the reader has to consult the legend
 * to find out that green comes after orange, which is exactly the work the
 * ramp was supposed to do. Signed values on a sequential ramp lose the sign:
 * zero lands somewhere arbitrary in the middle of the ramp, a small surplus
 * and a small deficit get near-identical colors, and the one thing every
 * reader wants from a variance chart, who is above and who is below, is gone.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "Three rows of swatches: unordered categories in a qualitative palette, ordered values in a sequential ramp, and signed values in a diverging ramp, each shown beside the same values in the wrong family.";

const N = 9;

const RIGHT = "The family that fits";
const WRONG = "The family that does not";

const ROWS = [
  {
    key: "Nominal",
    note: "no order",
    // Distinct hues: the palette's job is to say "unrelated".
    right: (i) => ({ fill: SERIES[i % SERIES.length], opacity: 0.85 }),
    // A ramp invents a ranking that is not in the data.
    wrong: (i) => ({ fill: PRIMARY, opacity: 0.12 + (i / (N - 1)) * 0.8 }),
    wrongNote: "invents a ranking",
  },
  {
    key: "Ordered",
    note: "low to high",
    right: (i) => ({ fill: PRIMARY, opacity: 0.12 + (i / (N - 1)) * 0.8 }),
    wrong: (i) => ({ fill: SERIES[i % SERIES.length], opacity: 0.85 }),
    wrongNote: "throws the order away",
  },
  {
    key: "Signed",
    note: "midpoint at zero",
    // Two ramps meeting at the middle, so the sign is the first thing read.
    right: (i) => {
      const t = (i - (N - 1) / 2) / ((N - 1) / 2);
      return {
        fill: t < 0 ? PRIMARY : ACCENT,
        opacity: 0.08 + Math.abs(t) * 0.82,
      };
    },
    wrong: (i) => ({ fill: PRIMARY, opacity: 0.12 + (i / (N - 1)) * 0.8 }),
    wrongNote: "hides which side of zero",
  },
];

const swatches = ROWS.flatMap((row) =>
  Array.from({ length: N }, (_, i) => [
    { row: row.key, panel: RIGHT, i, ...row.right(i) },
    { row: row.key, panel: WRONG, i, ...row.wrong(i) },
  ]).flat(),
);

const labels = ROWS.map((r, y) => ({ row: r.key, y, note: r.note }));
const wrongNotes = ROWS.map((r, y) => ({ row: r.key, y, note: r.wrongNote }));

export const caption =
  'A palette is not decoration, it is an assertion about the structure of the variable. A sequential ramp says "these are ordered and darker is more". A diverging ramp says "there is a meaningful middle and the two sides mean opposite things". A qualitative palette says "these have no order at all". Choose the wrong one and the chart makes a claim the data will not support, before anyone has read a label. Both failures look tidy, which is why they survive review: ordered values in a qualitative palette force the reader to the legend to learn that green comes after orange, which is the work the ramp existed to do, and signed values on a sequential ramp put zero at an arbitrary point in the middle, so a small surplus and a small deficit get nearly the same color and the only question anyone asks of a variance chart is unanswerable.';

export function render() {
  return plot({
    height: 260,
    marginTop: 40,
    marginLeft: 74,
    marginRight: 20,
    marginBottom: 40,
    ariaLabel: title,
    fx: { label: null, domain: [RIGHT, WRONG] },
    x: { label: null, domain: [0, N], ticks: [], grid: false },
    y: {
      label: null,
      domain: [ROWS.length, 0],
      ticks: ROWS.map((_, i) => i + 0.5),
      tickFormat: (v) => ROWS[Math.floor(v)].key,
      grid: false,
    },
    marks: [
      Plot.rect(
        swatches.map((s) => ({ ...s, y: ROWS.findIndex((r) => r.key === s.row) })),
        {
          fx: "panel",
          x1: "i",
          x2: (d) => d.i + 1,
          y1: (d) => d.y + 0.18,
          y2: (d) => d.y + 0.72,
          fill: "fill",
          fillOpacity: "opacity",
          inset: 0.8,
        },
      ),
      Plot.text(labels, {
        fx: () => RIGHT,
        x: 0,
        y: (d) => d.y + 0.88,
        text: "note",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "start",
        dx: 1,
        ...HALO,
      }),
      Plot.text(wrongNotes, {
        fx: () => WRONG,
        x: 0,
        y: (d) => d.y + 0.88,
        text: "note",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 1,
        ...HALO,
      }),
      // The zero the diverging row is built around, marked where it exists and
      // where the sequential ramp has quietly lost it.
      Plot.ruleX([N / 2], {
        fx: () => RIGHT,
        y1: ROWS.length - 1,
        y2: ROWS.length,
        stroke: MUTED,
        strokeDasharray: "3 3",
      }),
      Plot.text([{ at: N / 2 }], {
        fx: () => RIGHT,
        x: "at",
        y: ROWS.length - 1,
        text: () => "zero",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -6,
        ...HALO,
      }),
    ],
  });
}
