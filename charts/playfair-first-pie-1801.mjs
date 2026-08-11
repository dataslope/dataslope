/**
 * The first pie chart ever printed, redrawn: Playfair, 1801.
 *
 * In the *Statistical Breviary* Playfair drew each state as a circle whose
 * *area* was its extent, so that two empires could be compared at a glance.
 * The Turkish Empire was the awkward one, because it lay across three
 * continents, and to show that he cut its circle into three. That cut is the
 * pie chart, and it was a subdivision of an area encoding rather than a chart
 * type he set out to invent.
 *
 * Which is the useful thing to know about pies. This one has three slices, one
 * obviously largest and two that a reader can rank without effort, and at that
 * size the form works. Every complaint made about pie charts since is a
 * complaint about what happens past three or four: `pie-slice-count` shows the
 * same shares at three, six and eleven slices, and `pie-vs-bar` shows what the
 * eye gives up when angle replaces length.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * Playfair's own figures for the extent of the Turkish dominions in each
 * continent, as tabulated in the Breviary. His arithmetic, not a modern
 * atlas's: the point is what he drew, and later scholarship has been unkind to
 * several of his areas.
 */
import { Plot, plot, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Playfair's 1801 pie chart redrawn: the Turkish Empire's extent divided between Asia, Europe and Africa as three slices of one circle. Asia is nearly half, Europe a little over a quarter, Africa a quarter.";

/** Extent of the Turkish dominions, in Playfair's units of 10,000 square
 *  miles, in the order he drew them. */
const PARTS = [
  { key: "Asia", extent: 7.6, color: SERIES[0] },
  { key: "Europe", extent: 4.4, color: SERIES[1] },
  { key: "Africa", extent: 4.0, color: SERIES[4] },
];

const TOTAL = PARTS.reduce((s, p) => s + p.extent, 0);
const TAU = Math.PI * 2;
const ARC_STEPS = 40;

/** Running start angle per slice, clockwise from twelve o'clock. */
let acc = 0;
const SLICES = PARTS.map((p) => {
  const a0 = (acc / TOTAL) * TAU;
  acc += p.extent;
  const a1 = (acc / TOTAL) * TAU;
  return { ...p, a0, a1, mid: (a0 + a1) / 2, share: p.extent / TOTAL };
});

const wedge = (s) => {
  const pts = [{ x: 0, y: 0 }];
  for (let k = 0; k <= ARC_STEPS; k++) {
    const a = s.a0 + ((s.a1 - s.a0) * k) / ARC_STEPS;
    pts.push({ x: Math.sin(a), y: Math.cos(a) });
  }
  pts.push({ x: 0, y: 0 });
  return pts.map((p) => ({ ...p, key: s.key, color: s.color }));
};

const petals = SLICES.flatMap(wedge);
const labels = SLICES.map((s) => ({
  key: s.key,
  share: s.share,
  x: 0.62 * Math.sin(s.mid),
  y: 0.62 * Math.cos(s.mid),
}));

const pct = (v) => `${Math.round(v * 100)}%`;
const BIGGEST = SLICES.reduce((a, b) => (b.share > a.share ? b : a));

export const caption = `The first pie chart in print, redrawn with Playfair's own figures for the extent of the Turkish dominions. Three slices, one at ${pct(BIGGEST.share)} that is plainly the largest, and two the eye can rank without help.`;

export function render() {
  return plot({
    width: 680,
    height: 344,
    marginTop: 20,
    marginRight: 16,
    marginBottom: 20,
    marginLeft: 16,
    ariaLabel: title,
    // Hidden: the axes of a pie are radii of a circle of fixed size, which is
    // not a quantity, and drawing them would invite the reader to measure one.
    //
    // The two domains are sized so a unit is the same number of pixels on each
    // axis, which is what keeps the circle a circle. 648px of frame across 4.9
    // units and 304px down across 2.3 both come to 132 px per unit; the first
    // version left x twice as wide as y and drew Playfair an ellipse.
    x: { axis: null, domain: [-1.25, 3.65] },
    y: { axis: null, grid: false, domain: [-1.15, 1.15] },
    marks: [
      Plot.line(petals, {
        x: "x",
        y: "y",
        z: "key",
        fill: "color",
        fillOpacity: 0.82,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.5,
        clip: true,
      }),
      Plot.text(labels, {
        x: "x",
        y: "y",
        text: (d) => `${d.key}\n${pct(d.share)}`,
        fill: "var(--ds-chart-surface)",
        fontSize: 12.5,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
      }),
      Plot.text([{}], {
        x: 1.42,
        y: 0,
        text: () =>
          "Playfair, 1801: the extent of the\nTurkish Empire, cut across the three\ncontinents it lay in.\n\nThe circle's own area was the empire's\nsize, so that two states could be\ncompared without reading a number.\n\nSlicing one up was the afterthought\nthat became the pie chart.",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 500,
        lineHeight: 1.55,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
