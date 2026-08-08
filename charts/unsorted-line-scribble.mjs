/**
 * The single most common line-chart bug, drawn: the same points connected in
 * row order and connected in x order.
 *
 * A line mark does not sort anything. It joins point 1 to point 2 to point 3
 * in whatever order the rows arrive, because that order is sometimes the data
 * (a path, a trajectory, a hysteresis loop) and a library that silently sorted
 * would destroy those. What it means in practice is that a query without an
 * `ORDER BY`, a `groupby` whose keys came back as strings, or a concatenation
 * of two frames produces a scribble, and the scribble is the chart telling the
 * truth about the frame.
 *
 * The tell is that both panels have exactly the same dots. Nothing is missing
 * and no value is wrong; only the *joins* differ. Two habits follow: sort by
 * the x column immediately before any line chart, and when a chart looks
 * impossible, look at the dataframe before looking at the plotting call.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "The same fourteen points drawn twice. Connected in row order the line crosses itself into a scribble; connected in x order it is a smooth rising curve. The dots are identical in both.";

const N = 14;
const u = rng(6612);

/** A series that rises and falls rather than one that only rises: a monotone
 *  series joined out of order still trends up the page, so the bug hides. A
 *  shape is what the scribble has to destroy for the destruction to show. */
const base = Array.from({ length: N }, (_, i) => ({
  x: i,
  y: 44 + Math.sin(i * 0.62) * 20 + Math.sin(i * 1.7) * 5 + (u() - 0.5) * 4,
}));

/** Row order as a query without an ORDER BY tends to give it: not reversed,
 *  not random-looking on inspection, just not sorted. */
const SHUFFLE = [7, 2, 11, 0, 5, 13, 3, 9, 1, 6, 12, 4, 10, 8];
const asStored = SHUFFLE.map((i) => base[i]);

const SCRIBBLE = "Row order: a scribble";
const SORTED = "Sorted by x: the data";

const rows = [
  ...asStored.map((d, i) => ({ ...d, panel: SCRIBBLE, seq: i })),
  ...base.map((d, i) => ({ ...d, panel: SORTED, seq: i })),
];

export const caption = `The same fourteen points, connected two ways. A line mark sorts nothing: it joins row 1 to row 2 to row 3 in whatever order the frame supplies, because that order is sometimes the data itself, a path or a trajectory, and a library that quietly sorted would ruin those. In practice it means a query with no ORDER BY, a groupby whose keys came back as strings, or two frames concatenated end to end all produce a scribble, and the scribble is the chart being honest about the frame. The tell is that both panels carry identical dots: nothing is missing and no value is wrong, only the joins differ. Sort by the x column immediately before any line chart, and when a chart looks impossible, read the dataframe before you read the plotting call.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 46,
    marginRight: 22,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [SCRIBBLE, SORTED] },
    x: { label: "x", labelAnchor: "center", domain: [-0.6, N - 0.4], ticks: 4 },
    y: { label: "y", domain: [14, 76], ticks: 4 },
    marks: [
      Plot.line(rows, {
        fx: "panel",
        x: "x",
        y: "y",
        z: "panel",
        sort: "seq",
        stroke: (d) => (d.panel === SCRIBBLE ? ACCENT : PRIMARY),
        strokeWidth: 1.8,
        strokeOpacity: 0.9,
      }),
      Plot.dot(rows, {
        fx: "panel",
        x: "x",
        y: "y",
        r: 3.2,
        fill: (d) => (d.panel === SCRIBBLE ? ACCENT : PRIMARY),
      }),
      Plot.text([{}], {
        fx: () => SORTED,
        frameAnchor: "bottom-right",
        text: () => "same dots, different joins",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        dy: -6,
        ...HALO,
      }),
    ],
  });
}
