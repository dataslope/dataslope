/**
 * Four numbers drawn as decoration and drawn as data, which is the whole of
 * the distinction.
 *
 * A picture becomes a data visualisation at the moment some visual property is
 * a *function* of a number. That is the entire test, and it is stricter than
 * it sounds. The left panel has icons, labels, colours, a layout and the
 * numbers themselves, and none of its sizes mean anything: the circles were
 * scaled to fill the space, which is a design decision, so the picture encodes
 * the designer's sense of balance and not the data. A reader who trusts the
 * sizes is misled, and the sizes are the first thing anyone trusts.
 *
 * The right panel changes one thing. Area is proportional to value, so the
 * picture is now a claim that can be checked and, if it were wrong, falsified.
 *
 * This is why the printed numbers do not rescue the left panel. If the reader
 * has to read the digits to get the ranking, the graphic contributed nothing,
 * and if they read the sizes instead, they get the wrong answer. Decoration is
 * not a lesser chart; it is a different kind of object that happens to have
 * numbers on it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Four figures drawn as evenly sized circles with the numbers printed on them, and again as circles whose areas are proportional to those numbers, where the ranking becomes visible.";

const ITEMS = [
  { key: "Email", v: 8 },
  { key: "Search", v: 46 },
  { key: "Social", v: 17 },
  { key: "Direct", v: 29 },
];

const MAX = Math.max(...ITEMS.map((d) => d.v));
const MIN = Math.min(...ITEMS.map((d) => d.v));
const RATIO = (MAX / MIN).toFixed(1);
const BIGGEST = ITEMS.find((d) => d.v === MAX);

export const caption = `A picture becomes a data visualisation at the moment some visual property is a function of a number, and that test is stricter than it sounds. The top row has icons, colours, labels, a layout and the numbers themselves, and not one of its sizes means anything: the circles were scaled to fill the space, so the graphic encodes the designer's sense of balance rather than the data. A reader who trusts the sizes is misled, and the sizes are the first thing anyone trusts. ${BIGGEST.key} is ${RATIO} times the smallest figure here and the top row gives no hint of it. The bottom row changes one thing, area proportional to value, and the picture becomes a claim that can be checked. This is also why printing the numbers does not rescue the top row: if the reader has to read the digits to get the ranking then the graphic contributed nothing, and if they read the sizes instead they get the wrong answer. Decoration is not a lesser chart, it is a different kind of object that happens to have numbers on it.`;

const W = 680;
const H = 320;

const CY = { deco: 92, data: 240 };
const CX = ITEMS.map((_, i) => 132 + i * 136);

/** Decoration: one size, chosen because four equal circles look tidy. */
const DECO_R = 30;
/** Data: area proportional to value, so radius goes as the square root. */
const dataR = (v) => 12 + Math.sqrt(v / MAX) * 34;

const rows = ITEMS.flatMap((d, i) => [
  { ...d, cx: CX[i], cy: CY.deco, r: DECO_R, mode: "deco" },
  { ...d, cx: CX[i], cy: CY.data, r: dataR(d.v), mode: "data" },
]);

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 22,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 14,
    ariaLabel: title,
    // A pixel frame: neither row has an axis, which is precisely the property
    // under discussion.
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    // The radii are already in pixels. Without this they go through Plot's r
    // scale, which rescales them to its own default range and, since the top
    // row is all one value, collapses every circle to the same small dot.
    r: { type: "identity" },
    marks: [
      Plot.text([{}], {
        x: 24,
        y: 20,
        text: () => "Decoration: the sizes are a layout choice",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.dot(
        rows.filter((d) => d.mode === "deco"),
        { x: "cx", y: "cy", r: "r", fill: MUTED, fillOpacity: 0.3, stroke: MUTED },
      ),
      Plot.text([{}], {
        x: 24,
        y: 168,
        text: () => "Data: area is proportional to the value",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.dot(
        rows.filter((d) => d.mode === "data"),
        {
          x: "cx",
          y: "cy",
          r: "r",
          fill: (d) => (d.v === MAX ? ACCENT : PRIMARY),
          fillOpacity: 0.5,
          stroke: (d) => (d.v === MAX ? ACCENT : PRIMARY),
        },
      ),
      Plot.text(rows, {
        x: "cx",
        y: "cy",
        text: (d) => `${d.v}%`,
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text(
        rows.filter((d) => d.mode === "data"),
        {
          x: "cx",
          y: (d) => d.cy + d.r,
          text: "key",
          fill: MUTED,
          fontSize: 10,
          textAnchor: "middle",
          dy: 14,
        },
      ),
      Plot.text(
        rows.filter((d) => d.mode === "deco"),
        {
          x: "cx",
          y: (d) => d.cy + d.r,
          text: "key",
          fill: MUTED,
          fontSize: 10,
          textAnchor: "middle",
          dy: 14,
        },
      ),
      Plot.text([{}], {
        x: W - 24,
        y: 20,
        text: () => "read the digits or be wrong",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text([{}], {
        x: W - 24,
        y: 168,
        text: () => `${BIGGEST.key} is ${RATIO}x the smallest`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
