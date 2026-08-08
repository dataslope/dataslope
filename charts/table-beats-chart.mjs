/**
 * Five numbers as bars and as a table, where the table is the better chart.
 *
 * A chart converts numbers into positions so that the eye can do the
 * comparing. That conversion is worth it when there are enough numbers that
 * reading them all would be work, or when the shape of the relationship is the
 * point. It is a loss when there are five numbers, the reader needs the digits
 * anyway, and the differences are too small to see: the bars here are all
 * within a few percent of each other, so the chart says "roughly equal" and
 * the reader still has to be told the values.
 *
 * A table also does things a bar chart cannot. It carries several measures per
 * row without a second axis, it holds precision the eye could never recover
 * from a length, and it can be scanned in either direction. What it gives up
 * is shape, which is exactly what five near-equal numbers do not have.
 *
 * The test worth remembering: if the reader will end up reading the numbers
 * off the chart, the chart was a table with extra steps.
 */
import { Plot, plot, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Five near-identical figures drawn as bars, where the differences are invisible, and as a small table, where the values, the change and the sample size are all legible.";

const ROWS = [
  { key: "North", value: 41.8, change: 0.4, n: 1204 },
  { key: "South", value: 40.9, change: -1.1, n: 986 },
  { key: "East", value: 42.3, change: 2.7, n: 1431 },
  { key: "West", value: 41.2, change: 0.1, n: 1102 },
  { key: "Central", value: 40.6, change: -0.6, n: 874 },
];

const values = ROWS.map((r) => r.value);
const SPAN = Math.max(...values) - Math.min(...values);
const SPREAD = ((SPAN / Math.min(...values)) * 100).toFixed(1);
const MOVER = ROWS.reduce((a, b) => (Math.abs(a.change) >= Math.abs(b.change) ? a : b));

export const caption = `A chart turns numbers into positions so the eye can do the comparing, which is worth it when there are enough numbers that reading them all would be work, or when the shape is the point. Neither holds here. The five bars span ${SPAN.toFixed(1)} points, about ${SPREAD} percent, so the chart's whole message is "roughly equal" and the reader has to be told the values anyway. The table carries them, and carries two more columns the bars have nowhere to put: the change since last quarter, which is where the only real news is (${MOVER.key}, ${MOVER.change > 0 ? "up" : "down"} ${Math.abs(MOVER.change)}), and the sample size behind each figure. What a table gives up is shape, and five near-equal numbers have none. The test worth remembering: if the reader is going to end up reading the numbers off the chart, the chart was a table with extra steps.`;

const W = 680;
const H = 300;

const LEFT = { x0: 66, x1: 268, y0: 56, y1: 236 };
const TABLE = { x: 372, y0: 62, step: 34 };
const COLS = [
  { x: TABLE.x, label: "Region", anchor: "start", get: (r) => r.key },
  { x: TABLE.x + 128, label: "Score", anchor: "end", get: (r) => r.value.toFixed(1) },
  {
    x: TABLE.x + 202,
    label: "Change",
    anchor: "end",
    get: (r) => `${r.change > 0 ? "+" : ""}${r.change.toFixed(1)}`,
  },
  { x: TABLE.x + 272, label: "n", anchor: "end", get: (r) => String(r.n) },
];

const bars = ROWS.map((r, i) => {
  const step = (LEFT.y1 - LEFT.y0) / ROWS.length;
  const cy = LEFT.y0 + step * (i + 0.5);
  return {
    ...r,
    cy,
    by1: cy - step * 0.34,
    by2: cy + step * 0.34,
    bx: LEFT.x0 + (r.value / Math.max(...values)) * (LEFT.x1 - LEFT.x0),
  };
});

const cellRows = ROWS.map((r, i) => ({ ...r, y: TABLE.y0 + TABLE.step * (i + 1) }));

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 24,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 20,
    ariaLabel: title,
    // A pixel frame: the right half is a table, which has no scales at all.
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      Plot.text([{}], {
        x: LEFT.x0,
        y: 22,
        text: () => "As bars: all about the same",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.rect(bars, {
        x1: LEFT.x0,
        x2: "bx",
        y1: "by1",
        y2: "by2",
        fill: PRIMARY,
        fillOpacity: 0.7,
      }),
      Plot.text(bars, {
        x: LEFT.x0 - 7,
        y: "cy",
        text: "key",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "end",
      }),
      Plot.link([{}], {
        x1: LEFT.x0,
        x2: LEFT.x0,
        y1: LEFT.y0,
        y2: LEFT.y1,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
      Plot.text([{}], {
        x: LEFT.x0,
        y: LEFT.y1 + 24,
        text: () => `the whole range is ${SPAN.toFixed(1)} points`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),

      Plot.text([{}], {
        x: TABLE.x,
        y: 22,
        text: () => "As a table: values, change and sample size",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      // One mark per column, since textAnchor is a constant option in Plot and
      // the columns are anchored differently.
      ...COLS.map((col) => [
        Plot.text([{}], {
          x: col.x,
          y: TABLE.y0,
          text: () => col.label,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: col.anchor,
        }),
        Plot.text(cellRows, {
          x: col.x,
          y: "y",
          text: col.get,
          fill: MUTED,
          fontSize: 11.5,
          textAnchor: col.anchor,
        }),
      ]).flat(),
      Plot.link([{}], {
        x1: TABLE.x,
        x2: TABLE.x + 272,
        y1: TABLE.y0 + 12,
        y2: TABLE.y0 + 12,
        stroke: "currentColor",
        strokeOpacity: 0.3,
      }),
      Plot.text([{}], {
        x: TABLE.x,
        y: LEFT.y1 + 24,
        text: () => "three measures, no second axis",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
