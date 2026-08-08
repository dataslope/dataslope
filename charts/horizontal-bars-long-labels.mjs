/**
 * The same nine categories with vertical bars and with horizontal ones, where
 * the only thing that changed is whether the labels are readable.
 *
 * Vertical bars put category names on the x axis, which gives each name the
 * width of one bar. Real category names, product lines, survey answers,
 * error messages, are longer than that, so the renderer does one of three
 * things: rotates them to forty-five degrees, truncates them, or lets them
 * collide. All three make the reader work, and the rotated version is the
 * worst of the three because it looks deliberate.
 *
 * Turning the chart on its side gives every label a whole line of horizontal
 * space and costs nothing, because a bar's length is read equally well in
 * either direction. Sorting is the other half of the move: with names down the
 * side and lengths across, sorted descending, the chart becomes a ranked list
 * that happens to be quantitative.
 *
 * The exception is time. Time belongs on x, so a time series stays vertical
 * however long the labels are, and the labels get abbreviated instead.
 */
import { Plot, plot, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Nine long category names as vertical bars, where the labels are rotated and clipped, and as horizontal bars, where each label sits on its own line and the bars are sorted.";

const ITEMS = [
  { key: "Password reset loop", v: 184 },
  { key: "Payment declined", v: 142 },
  { key: "Missing invoice PDF", v: 121 },
  { key: "Export times out", v: 96 },
  { key: "Two-factor code late", v: 88 },
  { key: "Seat limit reached", v: 63 },
  { key: "Webhook not firing", v: 47 },
  { key: "Timezone wrong on report", v: 39 },
  { key: "Cannot delete account", v: 24 },
];

const sorted = [...ITEMS].sort((a, b) => b.v - a.v);

const LONGEST = ITEMS.reduce((a, b) => (a.key.length >= b.key.length ? a : b));

export const caption = `Vertical bars put the category names on x, which allots each name the width of one bar. Real names, product lines, survey answers, error messages, are longer than that, so the renderer rotates them, truncates them, or lets them collide. "${LONGEST.key}" is ${LONGEST.key.length} characters in a slot that holds about six, and the rotated version above is the polite failure: legible, and only if the reader tilts their head nine times. Turning the chart on its side gives every label a full line and costs nothing, because a bar's length reads equally well in either direction. Sorting is the other half of the move: names down the side, lengths across, sorted descending, and the chart becomes a ranked list that happens to be quantitative. The exception is time, which belongs on x however long the labels are; abbreviate those instead.`;

const W = 680;
const H = 340;

/** Hand-placed in pixel space: the two panels put the categories on different
 *  axes, so there is no shared pair of scales for a facet to share. */
const LEFT = { x0: 118, x1: 288, y0: 44, y1: 214 };
const RIGHT = { x0: 420, x1: 636, y0: 40, y1: 300 };

const MAX = Math.max(...ITEMS.map((d) => d.v));

const vertical = ITEMS.map((d, i) => {
  const step = (LEFT.x1 - LEFT.x0) / ITEMS.length;
  const cx = LEFT.x0 + step * (i + 0.5);
  return {
    ...d,
    cx,
    bx1: cx - step * 0.38,
    bx2: cx + step * 0.38,
    by: LEFT.y1 - (d.v / MAX) * (LEFT.y1 - LEFT.y0),
  };
});

const horizontal = sorted.map((d, i) => {
  const step = (RIGHT.y1 - RIGHT.y0) / sorted.length;
  const cy = RIGHT.y0 + step * (i + 0.5);
  return {
    ...d,
    cy,
    by1: cy - step * 0.36,
    by2: cy + step * 0.36,
    bx: RIGHT.x0 + (d.v / MAX) * (RIGHT.x1 - RIGHT.x0),
  };
});

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 24,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 16,
    ariaLabel: title,
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      Plot.text([{}], {
        x: (LEFT.x0 + LEFT.x1) / 2,
        y: 16,
        text: () => "Vertical: labels have to be rotated",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "middle",
      }),
      Plot.rect(vertical, {
        x1: "bx1",
        x2: "bx2",
        y1: "by",
        y2: LEFT.y1,
        fill: PRIMARY,
        fillOpacity: 0.7,
      }),
      Plot.link([{}], {
        x1: LEFT.x0,
        x2: LEFT.x1,
        y1: LEFT.y1,
        y2: LEFT.y1,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
      Plot.text(vertical, {
        x: "cx",
        y: LEFT.y1 + 7,
        text: "key",
        fill: MUTED,
        fontSize: 9,
        textAnchor: "end",
        rotate: 45,
      }),
      Plot.text([{}], {
        x: 14,
        y: LEFT.y1 + 106,
        text: () => "nine names, each read at an angle",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),

      Plot.text([{}], {
        x: RIGHT.x1,
        y: 16,
        text: () => "Horizontal, sorted: labels fit",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "end",
      }),
      Plot.rect(horizontal, {
        x1: RIGHT.x0,
        x2: "bx",
        y1: "by1",
        y2: "by2",
        fill: PRIMARY,
        fillOpacity: 0.7,
      }),
      Plot.text(horizontal, {
        x: RIGHT.x0 - 6,
        y: "cy",
        text: "key",
        fill: MUTED,
        fontSize: 9.5,
        textAnchor: "end",
      }),
      Plot.text(horizontal, {
        x: (d) => d.bx + 5,
        y: "cy",
        text: (d) => String(d.v),
        fill: MUTED,
        fontSize: 9.5,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.link([{}], {
        x1: RIGHT.x0,
        x2: RIGHT.x0,
        y1: RIGHT.y0,
        y2: RIGHT.y1,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
    ],
  });
}
