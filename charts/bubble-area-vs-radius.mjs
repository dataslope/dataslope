/**
 * Why a bubble chart's size channel has to scale by area: encode the value on
 * the radius instead and every difference is squared.
 *
 * The two rows carry the same five values, and both are scaled so the largest
 * disc is the same size, which is how a reader would meet them. On the top row
 * the disc's *area* is proportional to the value, which is what the eye reads
 * and what Plotly Express and Observable Plot both do by default. On the bottom
 * the radius is proportional instead, and because area goes with the square of
 * the radius, every ratio is squared: the 5 covers twenty-five times the ink of
 * the 1 rather than five times, and the small values all but disappear.
 *
 * This is the same mistake as a truncated bar axis: the number and the mark
 * have come apart, and the reader has no way to tell.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two rows of five circles encoding the same values 1 through 5, both scaled to the same largest disc. On the top row, where area carries the value, the discs grow gently; on the bottom, where the radius carries it, the small discs shrink to almost nothing.";

export const caption =
  "The same five values, sized two ways, both scaled to the same largest disc. Encoding area is correct because area is what the eye reads. Encoding the radius squares every ratio, so the 5 covers twenty-five times the ink of the 1 instead of five times.";

const VALUES = [1, 2, 3, 4, 5];
const MAX_R = 26; // pixels for the largest disc under the correct encoding

const ROWS = [
  {
    key: "Area ∝ value",
    correct: true,
    // r ∝ √value, so area ∝ value.
    r: (v) => MAX_R * Math.sqrt(v / Math.max(...VALUES)),
  },
  {
    key: "Radius ∝ value",
    correct: false,
    r: (v) => MAX_R * (v / Math.max(...VALUES)),
  },
];

const discs = ROWS.flatMap((row) =>
  VALUES.map((v) => ({ row: row.key, correct: row.correct, v, r: row.r(v) })),
);

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 132,
    marginRight: 34,
    marginBottom: 46,
    ariaLabel: title,
    // `r` here is already in pixels, so the radius scale is the identity and
    // the two rows are directly comparable rather than separately normalised.
    r: { type: "identity" },
    x: {
      label: "Value",
      labelAnchor: "center",
      domain: [0.4, 5.6],
      ticks: VALUES,
      tickFormat: (d) => String(d),
    },
    y: { label: null, domain: ROWS.map((r) => r.key), padding: 0.5, grid: false },
    marks: [
      Plot.dot(discs, {
        x: "v",
        y: "row",
        r: "r",
        fill: (d) => (d.correct ? PRIMARY : ACCENT),
        fillOpacity: 0.45,
        stroke: (d) => (d.correct ? PRIMARY : ACCENT),
        strokeWidth: 1.25,
      }),
      Plot.text([{ v: 1 }, { v: 5 }], {
        x: "v",
        y: "Radius ∝ value",
        text: (d) => (d.v === 1 ? "1" : "5, but 25× the ink"),
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        dy: 46,
        ...HALO,
      }),
    ],
  });
}
