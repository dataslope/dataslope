/**
 * What a donut removes, which is the only thing that made a pie readable.
 *
 * A pie chart gives a reader three cues for the same quantity: the *angle* at
 * the centre, the *arc* along the rim, and the *area* of the wedge. They are
 * not equally good. Angle is the one people actually use, and Cleveland and
 * McGill's experiments put it in the middle of the accuracy ranking, well
 * below length and position but comfortably above area.
 *
 * Cutting a hole in the middle deletes the angle. There is no vertex left to
 * judge, so the reader is down to arc length and area, both of which are
 * worse, and the two now disagree with each other: on a donut the arc grows
 * linearly with the share while the visible band's area does too, but neither
 * meets at a point the eye can use as a reference. What is left is a set of
 * curved ribbons of different lengths, compared by eye, without a common
 * baseline.
 *
 * The hole is usually defended as a place to put a total. That is a real use
 * and it is worth being clear about the trade: you have spent the chart's best
 * remaining channel to make room for a number you could have written above the
 * chart.
 *
 * The third panel is the same five shares as bars. Every value now starts from
 * the same line, which is the top of the accuracy ranking, and the ranking is
 * readable without effort. Notice which two shares you were unsure about in
 * the first two panels.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Five shares drawn as a pie, as a donut and as bars. The pie offers the centre angle, the donut deletes it and leaves only arc length and area, and the bars put every value on a common baseline where the two middle shares can finally be told apart.";

/** Traffic by source. The middle three are close enough that the chart type
 *  decides whether a reader can rank them. */
const SHARES = [
  { key: "Search", v: 31 },
  { key: "Direct", v: 24 },
  { key: "Social", v: 21 },
  { key: "Referral", v: 15 },
  { key: "Email", v: 9 },
];

const TOTAL = SHARES.reduce((s, d) => s + d.v, 0);
const TAU = Math.PI * 2;
const ARC_STEPS = 44;

const PIE = panel(0, { y: [0, 1] });
const DONUT = panel(1, { y: [0, 1] });
const BARS = panel(2, { y: [0, 34] });

// A circle only stays a circle if one unit is the same number of pixels on
// both axes, and in this coordinate system it is not: x spans three units
// across the frame's width while y spans one across its height.
const WIDTH = 680;
const HEIGHT = 340;
const FRAME_W = (WIDTH - 36 - 18) / 3;
const FRAME_H = HEIGHT - 26 - 42;
const ASPECT = FRAME_H / FRAME_W;

const R = 0.34; // in y units
const RX = R * ASPECT;
const HOLE = 0.55; // donut inner radius, as a fraction of R

let acc = 0;
const SLICES = SHARES.map((d, i) => {
  const a0 = (acc / TOTAL) * TAU;
  acc += d.v;
  const a1 = (acc / TOTAL) * TAU;
  return { ...d, a0, a1, mid: (a0 + a1) / 2, color: SERIES[i], share: d.v / TOTAL };
});

const centre = (p) => ({ x: (p.left + p.right) / 2, y: (p.top + p.bottom) / 2 });

/** A wedge, or a ring segment when `inner` is above zero. */
function wedge(p, s, inner) {
  const c = centre(p);
  const at = (a, f) => ({ x: c.x + RX * f * Math.sin(a), y: c.y + R * f * Math.cos(a) });
  const outer = [];
  const back = [];
  for (let k = 0; k <= ARC_STEPS; k++) {
    const a = s.a0 + ((s.a1 - s.a0) * k) / ARC_STEPS;
    outer.push(at(a, 1));
    back.push(at(a, inner));
  }
  const pts = inner > 0 ? [...outer, ...back.reverse(), outer[0]] : [...outer, c, outer[0]];
  return pts.map((q) => ({ ...q, key: s.key, color: s.color }));
}

const pieWedges = SLICES.flatMap((s) => wedge(PIE, s, 0));
const donutWedges = SLICES.flatMap((s) => wedge(DONUT, s, HOLE));

const labelAt = (p, s, f) => {
  const c = centre(p);
  return { x: c.x + RX * f * Math.sin(s.mid), y: c.y + R * f * Math.cos(s.mid) };
};

const BAR = 0.6;
const barRows = SHARES.map((d, i) => ({
  ...d,
  x1: BARS.band(i, SHARES.length) - (BARS.bandWidth(SHARES.length) * BAR) / 2,
  x2: BARS.band(i, SHARES.length) + (BARS.bandWidth(SHARES.length) * BAR) / 2,
  y: BARS.py(d.v),
}));

const CLOSE = SHARES.slice(1, 3);
const GAP = CLOSE[0].v - CLOSE[1].v;

export const caption = `The same five shares as a pie, a donut and bars. ${CLOSE[0].key} and ${CLOSE[1].key} are ${GAP} points apart: obvious in the bars, and worth trying to be sure of in the donut.`;

export function render() {
  return plot({
    width: WIDTH,
    height: HEIGHT,
    marginTop: 26,
    marginLeft: 36,
    marginRight: 18,
    marginBottom: 42,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      panelTitle(PIE, "Pie: angle, arc and area"),
      panelTitle(DONUT, "Donut: the angle is gone", { fill: ACCENT }),
      panelTitle(BARS, "Bars: one baseline", { fill: PRIMARY }),

      Plot.line(pieWedges, {
        x: "x",
        y: "y",
        z: "key",
        fill: "color",
        fillOpacity: 0.8,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.4,
      }),
      Plot.line(donutWedges, {
        x: "x",
        y: "y",
        z: "key",
        fill: "color",
        fillOpacity: 0.8,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.4,
      }),

      Plot.text(
        SLICES.map((s) => ({ ...s, ...labelAt(PIE, s, 0.62) })),
        {
          x: "x",
          y: "y",
          text: (d) => `${d.v}%`,
          fill: "var(--ds-chart-surface)",
          fontSize: 10.5,
          fontWeight: 700,
          textAnchor: "middle",
        },
      ),
      Plot.text(
        SLICES.map((s) => ({ ...s, ...labelAt(DONUT, s, (1 + HOLE) / 2) })),
        {
          x: "x",
          y: "y",
          text: (d) => `${d.v}%`,
          fill: "var(--ds-chart-surface)",
          fontSize: 10.5,
          fontWeight: 700,
          textAnchor: "middle",
        },
      ),
      Plot.text([{}], {
        x: centre(DONUT).x,
        y: centre(DONUT).y,
        text: () => `${TOTAL}%`,
        fill: MUTED,
        fontSize: 13,
        fontWeight: 700,
        textAnchor: "middle",
      }),

      ...panelAxis(BARS, { ticks: [0, 10, 20, 30], format: (v) => `${v}%` }),
      panelBaseline(BARS),
      Plot.rect(barRows, {
        x1: "x1",
        x2: "x2",
        y1: BARS.py(0),
        y2: "y",
        fill: (d, i) => SERIES[i],
        fillOpacity: 0.8,
      }),
      Plot.text(
        SHARES.map((d, i) => ({ key: d.key, x: BARS.band(i, SHARES.length) })),
        {
          x: "x",
          y: BARS.py(0),
          text: (d) => d.key.slice(0, 3),
          fill: "currentColor",
          fillOpacity: 0.6,
          fontSize: 10,
          textAnchor: "middle",
          dy: 13,
        },
      ),
      Plot.text([{}], {
        x: centre(DONUT).x,
        y: DONUT.bottom,
        text: () => "no centre left to judge an angle at",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 6,
        ...HALO,
      }),
    ],
  });
}
