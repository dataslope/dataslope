/**
 * The same five scores, two orderings of the axes, and a shape that changes
 * size for no reason.
 *
 * A radar chart draws each variable on its own spoke and joins the points into
 * a polygon. Readers do not compare the five radii one at a time; they compare
 * the *polygons*, because a filled shape is what the eye is given and area is
 * what a filled shape means. That is the problem, because the enclosed area
 * depends on which spoke each variable landed on.
 *
 * The reason is straightforward geometry. The polygon is a ring of triangles,
 * one per adjacent pair, and a triangle between neighbouring spokes has area
 * proportional to the *product* of the two radii. Putting the two largest
 * scores next to each other multiplies two big numbers; separating them
 * multiplies each big number by a small one. Same five values, different
 * total.
 *
 * Nothing about the ordering is data. Radar charts are usually built from a
 * dataframe's column order, which is whatever order somebody typed the
 * columns in, so the area a reader takes as "overall performance" is partly a
 * fact about a spreadsheet.
 *
 * Two more properties are worth knowing before reaching for one. The axes must
 * share a scale or the shape is meaningless, which means every variable has to
 * be normalised first, and normalising is a decision that also moves the
 * shape. And the polygon closes, so the *last* variable is adjacent to the
 * first, which gives one arbitrary pair extra weight that no reader ever
 * notices.
 *
 * The honest alternative for "one entity across five measures" is five bars,
 * or a dot plot with the five measures as rows. Neither is as memorable, and
 * both are readable.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One competitor's five normalised scores drawn on a radar chart under the two orderings of the axes that give the smallest and the largest polygon. Nothing about the data changes, and the enclosed area, which is what readers compare, differs by a third.";

/** Five normalised scores for one product, out of 100. */
const SCORES = [
  { key: "Speed", v: 92 },
  { key: "Price", v: 84 },
  { key: "Ease", v: 79 },
  { key: "Features", v: 26 },
  { key: "Support", v: 18 },
];

const value = Object.fromEntries(SCORES.map((d) => [d.key, d.v]));
const N = SCORES.length;
const MAX = 100;

const LEFT = panel(0, { y: [0, 1] });
const RIGHT = panel(1, { y: [0, 1] });

// A regular pentagon needs equal pixels per unit on both axes, and this
// coordinate system gives x two units across the frame's width against y's one
// down its height.
const WIDTH = 680;
const HEIGHT = 340;
const FRAME_W = (WIDTH - 26 - 18) / 2;
const FRAME_H = HEIGHT - 30 - 30;
const ASPECT = FRAME_H / FRAME_W;

const R = 0.32;
const RX = R * ASPECT;

const centre = (p) => ({ x: (p.left + p.right) / 2, y: 0.5 });
const angleAt = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / N;
const at = (p, i, f) => {
  const c = centre(p);
  return { x: c.x + RX * f * Math.cos(angleAt(i)), y: c.y - R * f * Math.sin(angleAt(i)) };
};

/** Area of the polygon in normalised units: the sum of the triangles between
 *  neighbouring spokes, each one proportional to the product of its radii. */
const areaOf = (order) =>
  order.reduce((s, key, i) => {
    const a = value[key] / MAX;
    const b = value[order[(i + 1) % N]] / MAX;
    return s + 0.5 * a * b * Math.sin((2 * Math.PI) / N);
  }, 0);

/**
 * The smallest and largest polygons the same five numbers can make, found by
 * enumerating every distinct arrangement rather than by picking two that look
 * different. With the first spoke pinned there are 4! of them, and each shape
 * appears twice because a ring read backwards is the same ring.
 */
const { ORDER_A, ORDER_B } = (() => {
  const [first, ...rest] = SCORES.map((d) => d.key);
  const perms = (xs) =>
    xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
  const all = perms(rest).map((r) => [first, ...r]);
  const scored = all.map((order) => ({ order, area: areaOf(order) }));
  const min = scored.reduce((a, b) => (b.area < a.area ? b : a));
  const max = scored.reduce((a, b) => (b.area > a.area ? b : a));
  return { ORDER_A: min.order, ORDER_B: max.order };
})();

const AREA_A = areaOf(ORDER_A);
const AREA_B = areaOf(ORDER_B);
const DIFF = Math.round((AREA_B / AREA_A - 1) * 100);

const polygon = (p, order) => {
  const pts = order.map((key, i) => ({ ...at(p, i, value[key] / MAX), key }));
  return [...pts, pts[0]];
};

const spokes = (p, order) =>
  order.flatMap((key, i) => [
    { ...centre(p), key, part: `spoke-${key}` },
    { ...at(p, i, 1), key, part: `spoke-${key}` },
  ]);

const labels = (p, order) =>
  order.map((key, i) => ({ key, v: value[key], ...at(p, i, 1.2) }));

const rings = (p) =>
  [0.5, 1].flatMap((f) => {
    const pts = Array.from({ length: N }, (_, i) => ({ ...at(p, i, f), part: `ring-${f}` }));
    return [...pts, { ...pts[0], part: `ring-${f}` }];
  });

export const caption = `A radar chart puts each variable on its own spoke and joins the points into a polygon, and readers do not compare five radii one at a time. They compare the shapes, because a filled polygon is what they were handed and area is what a filled polygon means. That is the trouble: the enclosed area depends on which spoke each variable landed on. The geometry is simple enough to check. The polygon is a ring of triangles, one per neighbouring pair, and a triangle between adjacent spokes has area proportional to the *product* of its two radii, so putting the two highest scores side by side multiplies two large numbers while separating them pairs each large one with a small one. Same five values, and here about ${DIFF}% more area. These two are the arrangements that enclose the least and the most, found by enumerating all of them, and everything in between is available too. None of that ordering is data: radar charts are usually built from a dataframe's column order, which is the order somebody typed, so the "overall" impression is partly a fact about a spreadsheet. Two more things to know before reaching for one: the axes have to share a scale or the shape means nothing, which forces a normalisation that also moves the shape, and the polygon closes, so the last variable is adjacent to the first and one arbitrary pair gets extra weight that nobody notices. For one entity across five measures, five bars or a five-row dot plot are less memorable and readable.`;

export function render() {
  return plot({
    width: WIDTH,
    height: HEIGHT,
    marginTop: 30,
    marginLeft: 26,
    marginRight: 18,
    marginBottom: 30,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      panelTitle(LEFT, "The ordering that encloses least"),
      panelTitle(RIGHT, "The ordering that encloses most", { fill: ACCENT }),

      ...[
        [LEFT, ORDER_A, PRIMARY],
        [RIGHT, ORDER_B, ACCENT],
      ].flatMap(([p, order, color]) => [
        Plot.line(rings(p), {
          x: "x",
          y: "y",
          z: "part",
          stroke: "currentColor",
          strokeOpacity: 0.14,
        }),
        Plot.line(spokes(p, order), {
          x: "x",
          y: "y",
          z: "part",
          stroke: "currentColor",
          strokeOpacity: 0.14,
        }),
        Plot.line(polygon(p, order), {
          x: "x",
          y: "y",
          fill: color,
          fillOpacity: 0.3,
          stroke: color,
          strokeWidth: 2,
        }),
        Plot.dot(polygon(p, order).slice(0, N), { x: "x", y: "y", r: 3.2, fill: color }),
        Plot.text(labels(p, order), {
          x: "x",
          y: "y",
          text: (d) => `${d.key} ${d.v}`,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          ...HALO,
        }),
      ]),

      Plot.text([{}], {
        x: centre(LEFT).x,
        y: 0.09,
        text: () => `enclosed area: ${(AREA_A * 100).toFixed(0)} units`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: centre(RIGHT).x,
        y: 0.09,
        text: () => `enclosed area: ${(AREA_B * 100).toFixed(0)} units, ${DIFF}% more`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
