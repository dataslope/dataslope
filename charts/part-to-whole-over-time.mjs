/**
 * Three charts of one composition, because "part of a whole, over time" is
 * three different questions and no single mark answers more than one of them
 * well.
 *
 * The data is the same twelve months of orders across four channels in every
 * panel. What changes is which comparison the drawing makes easy:
 *
 *   • Stacked to the total, the height of the pile is the business, so "are we
 *     growing?" is immediate — and only the bottom band sits on the axis, so
 *     every band above it is a length floating on a moving baseline.
 *   • Stacked to 100%, the total is gone entirely and the mix is exact, which
 *     is the right chart when the finding is a shift in composition and the
 *     wrong one when anyone might conclude something about volume from it.
 *   • Unstacked, every series gets its own baseline and the totals get lost,
 *     which is the only one of the three that answers "is *this* segment
 *     growing?" without the reader doing arithmetic by eye.
 *
 * `dashboard-two-questions` draws the first panel alone, as a warning about
 * one chart answering two questions. This one is the whole decision: which of
 * the three to draw, given which question is being asked.
 *
 * The trap the middle and left panels share is worth being concrete about, and
 * it is why Web is drawn flat here: it sells almost the same number of orders
 * in December as in January. In the stacked panel its band rides upward on
 * Mobile's growth, and in the share panel its share falls. Both are true, both
 * are about Mobile, and a reader looking for Web reads a trend that the
 * right-hand panel says does not exist.
 */
import { Plot, plot, HALO, MUTED, SERIES, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Twelve months of orders across four channels, drawn three ways: stacked to the total, stacked to 100 percent, and as four separate lines. Only the third shows that the Web channel has been flat all year, which the first two hide by riding it on top of a growing Mobile channel.";

const MONTHS = 12;
const CHANNELS = [
  { key: "Mobile", from: 20, to: 96 },
  { key: "Web", from: 62, to: 64 },
  { key: "Partner", from: 24, to: 36 },
  { key: "Retail", from: 42, to: 22 },
];

/** A little seeded wobble, so the bands read as a measurement rather than as
 *  four straight lines. */
const jitter = rng(51204);
const VALUES = CHANNELS.map((c) =>
  Array.from({ length: MONTHS }, (_, i) => {
    const t = i / (MONTHS - 1);
    return Math.round(c.from + (c.to - c.from) * t + (jitter() - 0.5) * 6);
  }),
);

const TOTALS = Array.from({ length: MONTHS }, (_, i) =>
  VALUES.reduce((sum, series) => sum + series[i], 0),
);

const COLOR = Object.fromEntries(CHANNELS.map((c, k) => [c.key, SERIES[k]]));

const TOTAL_Y = [0, 260];
const SHARE_Y = [0, 100];
const LEVEL_Y = [0, 110];

const STACK = panel(0, { x: [0, MONTHS - 1], y: TOTAL_Y });
const SHARE = panel(1, { x: [0, MONTHS - 1], y: SHARE_Y });
const LEVEL = panel(2, { x: [0, MONTHS - 1], y: LEVEL_Y });

/** Bands for a stacked panel: each channel's cumulative floor and ceiling,
 *  mapped through that panel's own y. `scale` turns the count into whatever
 *  the panel measures — the raw total, or a percentage of it. */
function bands(p, scale) {
  return CHANNELS.flatMap((c, k) =>
    Array.from({ length: MONTHS }, (_, i) => {
      const below = VALUES.slice(0, k).reduce((sum, series) => sum + series[i], 0);
      return {
        key: c.key,
        x: p.px(i),
        lo: p.py(scale(below, i)),
        hi: p.py(scale(below + VALUES[k][i], i)),
      };
    }),
  );
}

const stackBands = bands(STACK, (v) => v);
const shareBands = bands(SHARE, (v, i) => (v / TOTALS[i]) * 100);

const lines = CHANNELS.flatMap((c, k) =>
  Array.from({ length: MONTHS }, (_, i) => ({
    key: c.key,
    x: LEVEL.px(i),
    y: LEVEL.py(VALUES[k][i]),
  })),
);

/** Direct labels at the right edge of the unstacked panel, which is the only
 *  panel where the four series are separated enough to name in place. */
const ENDS = CHANNELS.map((c, k) => ({
  key: c.key,
  x: LEVEL.px(MONTHS - 1),
  y: LEVEL.py(VALUES[k][MONTHS - 1]),
}));

const WEB = CHANNELS.findIndex((c) => c.key === "Web");
const WEB_CHANGE = VALUES[WEB][MONTHS - 1] - VALUES[WEB][0];
const TOTAL_GROWTH = Math.round(((TOTALS[MONTHS - 1] - TOTALS[0]) / TOTALS[0]) * 100);
const MOBILE_SHARE = [0, MONTHS - 1].map((i) => Math.round((VALUES[0][i] / TOTALS[i]) * 100));

export const caption = `The same twelve months in all three panels. Stacked, the pile's height is the business and the answer to "are we growing?" is immediate: up ${TOTAL_GROWTH}% over the year. Stacked to 100%, the total is gone and the mix is exact: Mobile goes from ${MOBILE_SHARE[0]}% of orders to ${MOBILE_SHARE[1]}%. Unstacked, every channel finally sits on the axis, and Web, which moved ${WEB_CHANGE >= 0 ? "up" : "down"} ${Math.abs(WEB_CHANGE)} orders across the whole year, stops looking like a trend. **One chart answers one question**: the reader who needs to track a single segment is being sold the wrong two-thirds of this figure.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 24,
    marginLeft: 30,
    marginRight: 16,
    marginBottom: 16,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      ...panelAxis(STACK, { ticks: [0, 100, 200] }),
      ...panelAxis(SHARE, { ticks: [0, 50, 100], format: (v) => `${v}%` }),
      ...panelAxis(LEVEL, { ticks: [0, 50, 100] }),

      panelTitle(STACK, "Stacked: the total"),
      panelTitle(SHARE, "To 100%: the mix"),
      panelTitle(LEVEL, "Unstacked: each level"),

      Plot.areaY(stackBands, {
        x: "x",
        y1: "lo",
        y2: "hi",
        z: "key",
        fill: (d) => COLOR[d.key],
        fillOpacity: 0.72,
      }),
      Plot.areaY(shareBands, {
        x: "x",
        y1: "lo",
        y2: "hi",
        z: "key",
        fill: (d) => COLOR[d.key],
        fillOpacity: 0.72,
      }),
      Plot.line(lines, {
        x: "x",
        y: "y",
        z: "key",
        stroke: (d) => COLOR[d.key],
        strokeWidth: 2,
      }),
      Plot.text(ENDS, {
        x: "x",
        y: "y",
        text: "key",
        fill: (d) => COLOR[d.key],
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        dy: -9,
        ...HALO,
      }),

      // The stacked panel is the first one read, so it carries the names; the
      // other two reuse the same colors in the same order.
      Plot.text(
        CHANNELS.map((c, k) => {
          const at = 5;
          const below = VALUES.slice(0, k).reduce((sum, series) => sum + series[at], 0);
          return {
            key: c.key,
            x: STACK.px(at),
            y: STACK.py(below + VALUES[k][at] / 2),
          };
        }),
        {
          x: "x",
          y: "y",
          text: "key",
          fill: "currentColor",
          fillOpacity: 0.85,
          fontSize: 10,
          fontWeight: 700,
          textAnchor: "middle",
          ...HALO,
        },
      ),

      panelBaseline(STACK),
      panelBaseline(SHARE),
      panelBaseline(LEVEL),

      // Each panel's question, as a subtitle, and the axis it is asked over.
      Plot.text(
        [
          { p: STACK, q: "is the business growing?" },
          { p: SHARE, q: "is the mix shifting?" },
          { p: LEVEL, q: "is this one growing?" },
        ],
        {
          x: (d) => (d.p.left + d.p.right) / 2,
          y: 0.878,
          text: "q",
          fill: MUTED,
          fontSize: 10,
          textAnchor: "middle",
        },
      ),
      Plot.text(
        [STACK, SHARE, LEVEL].flatMap((p) => [
          { x: p.px(0), text: "Jan" },
          { x: p.px(MONTHS - 1), text: "Dec" },
        ]),
        {
          x: "x",
          y: (d) => STACK.bottom,
          text: "text",
          fill: "currentColor",
          fillOpacity: 0.62,
          fontSize: 10,
          dy: 14,
        },
      ),
      // Web's January level, carried across the panel, so "flat" is something
      // the reader can check rather than a claim in the caption.
      Plot.link([{}], {
        x1: LEVEL.px(0),
        x2: LEVEL.px(MONTHS - 1),
        y1: LEVEL.py(VALUES[WEB][0]),
        y2: LEVEL.py(VALUES[WEB][0]),
        stroke: MUTED,
        strokeDasharray: "4 4",
      }),
      Plot.text([{}], {
        x: (LEVEL.left + LEVEL.right) / 2,
        y: LEVEL.py(6),
        text: () => "only here does Web read flat",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
