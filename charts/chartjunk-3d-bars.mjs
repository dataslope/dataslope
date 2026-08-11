/**
 * What the third dimension does to a bar chart, which is not nothing.
 *
 * The usual complaint about 3-D bars is that they are ugly, and that is the
 * least of it. The problem is that perspective is a *quantitative* distortion
 * applied on top of the encoding, and it is applied unevenly.
 *
 * The error this figure draws is the *reading line*. On a flat bar the top
 * edge and the axis sit at the same depth, so a value is read straight across.
 * Give the bar a depth and the top face becomes a parallelogram: the front
 * edge and the back edge of one bar now meet the axis at two different
 * heights, and nothing tells the reader which edge is the number. Most people
 * take the front one, which is systematically too high.
 *
 * The ink also triples. Every bar gains a top face and a side face, and
 * neither encodes anything.
 *
 * A real 3-D chart, of the kind a spreadsheet will make, adds two more
 * problems this drawing does not have. Its bars are genuinely foreshortened,
 * so equal differences render as unequal ones depending on depth, and its
 * front row physically hides part of its back row. The version here is the
 * *mildest* case, an isometric extrusion with no perspective at all, and it is
 * already ambiguous.
 *
 * There is no case where this is the right chart. The third dimension is not
 * carrying a third variable; it is carrying nothing, and charging for it in
 * accuracy.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Five values drawn as three-dimensional perspective bars and as flat bars. On the perspective bars the top face is a parallelogram, so the front and back edges of one bar read as two different values, and the reader is not told which edge to use.";

const VALUES = [
  { key: "A", v: 48 },
  { key: "B", v: 44 },
  { key: "C", v: 40 },
  { key: "D", v: 36 },
  { key: "E", v: 32 },
];

const N = VALUES.length;
const MAX = 60;
const STEP = VALUES[0].v - VALUES[1].v;

const FAKE = panel(0, { y: [0, MAX] });
const FLAT = panel(1, { y: [0, MAX] });

const BAR = 0.5;
/** The depth offset, in frame units. Everything wrong with the left panel is
 *  a consequence of these two numbers being non-zero. */
const DEPTH_X = 0.026;
const DEPTH_Y = 0.045;

const slot = (p, i) => ({
  cx: p.band(i, N),
  w: p.bandWidth(N) * BAR,
});

/** Front face, top face and right face of one perspective bar, as polygons. */
function block(i, d) {
  const { cx, w } = slot(FAKE, i);
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = FAKE.py(0);
  const y1 = FAKE.py(d.v);
  const key = d.key;
  const face = [
    { x: x0, y: y0 },
    { x: x0, y: y1 },
    { x: x1, y: y1 },
    { x: x1, y: y0 },
    { x: x0, y: y0 },
  ].map((p) => ({ ...p, key, part: `face-${key}` }));
  const top = [
    { x: x0, y: y1 },
    { x: x0 + DEPTH_X, y: y1 + DEPTH_Y },
    { x: x1 + DEPTH_X, y: y1 + DEPTH_Y },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ].map((p) => ({ ...p, key, part: `top-${key}` }));
  const side = [
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x1 + DEPTH_X, y: y1 + DEPTH_Y },
    { x: x1 + DEPTH_X, y: y0 + DEPTH_Y },
    { x: x1, y: y0 },
  ].map((p) => ({ ...p, key, part: `side-${key}` }));
  return { face, top, side };
}

const blocks = VALUES.map((d, i) => block(i, d));
const faces = blocks.flatMap((b) => b.face);
const tops = blocks.flatMap((b) => b.top);
const sides = blocks.flatMap((b) => b.side);

const flatBars = VALUES.map((d, i) => {
  const { cx, w } = slot(FLAT, i);
  return { ...d, x1: cx - w / 2, x2: cx + w / 2, y: FLAT.py(d.v) };
});

/** What the back edge of the first bar reads as on the same axis. */
const BACK_READS = MAX * ((FAKE.py(VALUES[0].v) + DEPTH_Y - FAKE.bottom) / (FAKE.top - FAKE.bottom));
const OVERSTATE = Math.round(BACK_READS - VALUES[0].v);

export const caption = `The complaint about 3-D bars is usually that they are ugly, which is the least of it. Perspective is a quantitative distortion laid on top of the encoding, and it is applied unevenly. Look at one bar's top face: it is a parallelogram, so the front edge and the back edge of the same bar meet the axis at two different heights, about ${OVERSTATE} units apart here, and nothing tells the reader which edge is the value. Most people read the front, which is systematically too high. The ink also triples: every bar gains a top face and a side face that encode nothing. And this is the mildest possible case, an isometric extrusion with no perspective in it at all. A real 3-D chart of the kind a spreadsheet will make adds true foreshortening, so an equal ${STEP}-unit step renders as a different step depending on how far back it is, and it lets the front row physically cover the back row. In none of these versions is the third dimension carrying a third variable. It carries nothing, and charges for it in accuracy.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 36,
    marginRight: 18,
    marginBottom: 42,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(FAKE, { ticks: [0, 20, 40, 60] }),
      ...panelAxis(FLAT, { ticks: [0, 20, 40, 60] }),
      panelTitle(FAKE, "Perspective bars", { fill: ACCENT }),
      panelTitle(FLAT, "The same five values, flat", { fill: PRIMARY }),
      panelBaseline(FAKE),
      panelBaseline(FLAT),

      Plot.line(sides, {
        x: "x",
        y: "y",
        z: "part",
        fill: PRIMARY,
        fillOpacity: 0.3,
        stroke: PRIMARY,
        strokeOpacity: 0.4,
      }),
      Plot.line(tops, {
        x: "x",
        y: "y",
        z: "part",
        fill: PRIMARY,
        fillOpacity: 0.42,
        stroke: PRIMARY,
        strokeOpacity: 0.4,
      }),
      Plot.line(faces, {
        x: "x",
        y: "y",
        z: "part",
        fill: PRIMARY,
        fillOpacity: 0.62,
        stroke: PRIMARY,
        strokeOpacity: 0.5,
      }),

      Plot.rect(flatBars, {
        x1: "x1",
        x2: "x2",
        y1: FLAT.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.62,
      }),

      // The two heights the first bar can be read at.
      Plot.link([{}], {
        x1: FAKE.left,
        x2: slot(FAKE, 0).cx,
        y1: FAKE.py(VALUES[0].v),
        y2: FAKE.py(VALUES[0].v),
        stroke: ACCENT,
        strokeWidth: 1.2,
        strokeDasharray: "3,3",
      }),
      Plot.link([{}], {
        x1: FAKE.left,
        x2: slot(FAKE, 0).cx,
        y1: FAKE.py(VALUES[0].v) + DEPTH_Y,
        y2: FAKE.py(VALUES[0].v) + DEPTH_Y,
        stroke: ACCENT,
        strokeWidth: 1.2,
        strokeDasharray: "3,3",
      }),
      Plot.text([{}], {
        x: slot(FAKE, 2).cx,
        y: FAKE.py(MAX),
        text: () => `one bar, two readings,\n${OVERSTATE} units apart`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -4,
        ...HALO,
      }),

      ...[
        [FAKE, VALUES],
        [FLAT, VALUES],
      ].map(([p, list]) =>
        Plot.text(
          list.map((d, i) => ({ key: d.key, x: p.band(i, N) })),
          {
            x: "x",
            y: p.py(0),
            text: "key",
            fill: "currentColor",
            fillOpacity: 0.6,
            fontSize: 10,
            textAnchor: "middle",
            dy: 13,
          },
        ),
      ),
      Plot.text([{}], {
        x: (FLAT.left + FLAT.right) / 2,
        y: FLAT.py(0),
        text: () => `each bar ${STEP} below the one before, and it looks it`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
