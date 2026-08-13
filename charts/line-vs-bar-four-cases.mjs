/**
 * "Line or bars?" is a question about the x-axis, so the answer needs both
 * axes and both marks: two kinds of x crossed with two marks, four panels.
 *
 * The same six numbers appear in every panel. Nothing about the values decides
 * this, which is exactly the point — a reader who chooses the mark by looking
 * at the y column is choosing at random. What decides it is whether the
 * horizontal axis has an order and a between: six consecutive weeks have both,
 * six issue types have neither.
 *
 * That gives one wrong cell rather than two. Bars over time are not a mistake;
 * they are a slightly worse default, because the eye reads a trend off a slope
 * more readily than off a row of tops, and thirty-six of them is a picket
 * fence (`line-vs-bar-series-length` is that half of the question). A line over
 * categories is a different kind of thing: it draws a path through positions
 * that could be reordered without changing a single value, and the reader takes
 * a trend away from a variable that cannot have one.
 *
 * `line-implies-continuity` makes the same argument with the two panels on the
 * anti-diagonal. This one exists because the interview question is "line chart
 * or bar chart?", and answering it means saying what happens in all four
 * cases, including the two where the answer is "that is fine".
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same six values drawn four times: as a line and as bars over six consecutive weeks, and as a line and as bars over six unordered issue types. Only the line over issue types is wrong, because it draws a trajectory through categories that have no order.";

/** One set of numbers, used in all four panels. Anything the mark can be
 *  chosen from has to come from the axis, so the values are held constant. */
const VALUES = [180, 205, 198, 240, 262, 291];

const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6"];
const TYPES = ["Login", "Billing", "Export", "Search", "Mobile", "API"];

const COLS = ["As a line", "As bars"];
const ROWS = ["ordered", "unordered"];

/** Panel-by-panel: which x it uses, and the verdict printed inside it. */
const CELLS = [
  {
    col: COLS[0],
    row: ROWS[0],
    labels: WEEKS,
    ok: true,
    note: "Right. The slope is the finding,\nand it is there to be read.",
  },
  {
    col: COLS[1],
    row: ROWS[0],
    labels: WEEKS,
    ok: true,
    note: "Fine. Six levels, honestly drawn;\nthe trend is left to the reader.",
  },
  {
    col: COLS[0],
    row: ROWS[1],
    labels: TYPES,
    ok: false,
    note: "Wrong. A path through categories\nthat could be listed in any order.",
  },
  {
    col: COLS[1],
    row: ROWS[1],
    labels: TYPES,
    ok: true,
    note: "Right. Six lengths from one baseline,\nand any order will do.",
  },
];

const points = CELLS.flatMap((c) =>
  VALUES.map((value, i) => ({ ...c, i, value, label: c.labels[i] })),
);
const lineCells = points.filter((d) => d.col === COLS[0]);
const barCells = points.filter((d) => d.col === COLS[1]);
const goodLines = lineCells.filter((d) => d.ok);
const badLines = lineCells.filter((d) => !d.ok);

export const caption =
  "The same six numbers in every panel, so nothing in the data decides the mark. The x-axis does. Weeks have an order and a between, so a line is a true claim about them and bars merely a quieter one; issue types have neither, so the line in the bottom-left draws a trajectory that would change shape if the categories were listed alphabetically instead. **Bars for categories, lines for ordered x**, and the reason is not taste: a line is an assertion about the axis it is drawn over.";

export function render() {
  return plot({
    height: 450,
    marginTop: 24,
    marginLeft: 56,
    marginRight: 18,
    marginBottom: 44,
    ariaLabel: title,
    fx: { label: null, domain: COLS },
    // The two rows name their x positions differently, so one shared set of
    // ticks would be wrong in one of them; each panel labels its own below.
    // The band of air between the rows is where the upper row's own category
    // labels go; without it they land on the lower row's first line of type.
    fy: { label: null, domain: ROWS, axis: null, padding: 0.22 },
    x: { label: null, domain: [-0.5, VALUES.length - 0.5], ticks: [] },
    // No tick on the domain maximum: the band above the last gridline is
    // where each panel's verdict goes, and a label at the frame edge would
    // have to share it with the facet title.
    y: { label: "Support tickets", domain: [0, 400], ticks: [0, 100, 200, 300] },
    marks: [
      Plot.rect(barCells, {
        fx: "col",
        fy: "row",
        x1: (d) => d.i - 0.32,
        x2: (d) => d.i + 0.32,
        y1: 0,
        y2: "value",
        fill: PRIMARY,
        fillOpacity: 0.55,
        clip: true,
      }),
      Plot.line(goodLines, {
        fx: "col",
        fy: "row",
        x: "i",
        y: "value",
        stroke: PRIMARY,
        strokeWidth: 2.2,
        clip: true,
      }),
      Plot.dot(goodLines, {
        fx: "col",
        fy: "row",
        x: "i",
        y: "value",
        fill: PRIMARY,
        r: 3.2,
        clip: true,
      }),
      // The one wrong panel is drawn in the accent and dashed, so the figure
      // says which cell it is about before any of the notes are read.
      Plot.line(badLines, {
        fx: "col",
        fy: "row",
        x: "i",
        y: "value",
        stroke: ACCENT,
        strokeWidth: 2.2,
        strokeDasharray: "5 4",
        clip: true,
      }),
      Plot.dot(badLines, {
        fx: "col",
        fy: "row",
        x: "i",
        y: "value",
        fill: ACCENT,
        r: 3.2,
        clip: true,
      }),

      // Each panel's own category names, since the x scale is shared and
      // positional but the two rows mean different things by position.
      Plot.text(points, {
        fx: "col",
        fy: "row",
        x: "i",
        y: 0,
        text: "label",
        fill: MUTED,
        fontSize: 10,
        dy: 14,
      }),

      Plot.text(CELLS, {
        fx: "col",
        fy: "row",
        x: -0.4,
        y: 400,
        text: "note",
        fill: (d) => (d.ok ? MUTED : ACCENT),
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        // Half the two-line block's height, so it hangs below the frame edge
        // rather than straddling it.
        dy: 14,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
