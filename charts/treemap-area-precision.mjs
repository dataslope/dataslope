/**
 * Eight values as rectangles and as bars, with one question attached: rank the
 * middle four.
 *
 * A treemap encodes quantity as *area*, and area is a weak channel. That much
 * is standard. The specific reason it is weak here is worth having, because it
 * is not just "people are bad at area": a treemap's rectangles have different
 * *aspect ratios*, so comparing two of them means comparing a tall thin
 * rectangle with a short wide one, and the eye has no reliable procedure for
 * that. Two rectangles of equal area look unequal when their shapes differ,
 * and the direction of the error depends on which way each one is stretched.
 *
 * On the bars, every value starts from the same line and differs in one
 * dimension, which is the top of the accuracy ranking. Rank the middle four
 * there and it takes no effort at all.
 *
 * None of this means treemaps are useless. They do two things bars cannot.
 * They fit several hundred categories in the space a bar chart gives to
 * twenty, and they show *hierarchy*, nesting a category's children inside it,
 * which is a structure a flat bar chart has no way to draw. If you have three
 * hundred SKUs in nine product families and the question is "which family
 * dominates, and is any single SKU carrying its family", a treemap answers it
 * and a bar chart does not fit on the page.
 *
 * The rule that follows: use a treemap for *structure and scale*, where the
 * answer is one or two obviously large boxes. Do not use it when the reader's
 * question is a ranking of similar values, because that is precisely the
 * comparison its geometry cannot support.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Eight values drawn as a treemap and as bars. In the treemap the middle four are near-identical areas in four different shapes and cannot be ranked by eye; as bars, all four start from the same line and the order is immediate.";

const VALUES = [
  { key: "A", v: 340 },
  { key: "B", v: 210 },
  { key: "C", v: 96 },
  { key: "D", v: 91 },
  { key: "E", v: 87 },
  { key: "F", v: 82 },
  { key: "G", v: 54 },
  { key: "H", v: 40 },
];

const N = VALUES.length;
const TOTAL = VALUES.reduce((s, d) => s + d.v, 0);
/** The four the question is about: close in value, far apart in shape. */
const MIDDLE = VALUES.slice(2, 6);
const SPREAD = Math.round(
  ((MIDDLE[0].v - MIDDLE.at(-1).v) / MIDDLE.at(-1).v) * 100,
);

const TREE = panel(0, { y: [0, 1] });
const BARS = panel(1, { y: [0, 360] });

/**
 * Squarified treemap, the standard layout: fill the current strip while doing
 * so improves its worst aspect ratio, then start a new strip in the remaining
 * space. Written out rather than imported because the whole point of the
 * figure is what the aspect ratios do.
 */
function squarify(items, rect) {
  const out = [];
  let free = { ...rect };
  let rest = [...items];
  const areaOf = (list) => list.reduce((s, d) => s + d.v, 0);

  while (rest.length) {
    const total = areaOf(rest);
    const horizontal = free.w >= free.h;
    const side = horizontal ? free.h : free.w;
    let row = [];
    let worst = Infinity;

    while (rest.length) {
      const trial = [...row, rest[0]];
      const share = areaOf(trial) / total;
      const depth = (horizontal ? free.w : free.h) * share;
      const ratios = trial.map((d) => {
        const along = side * (d.v / areaOf(trial));
        return Math.max(along / depth, depth / along);
      });
      const trialWorst = Math.max(...ratios);
      if (row.length && trialWorst > worst) break;
      worst = trialWorst;
      row = trial;
      rest = rest.slice(1);
    }

    const share = areaOf(row) / total;
    const depth = (horizontal ? free.w : free.h) * share;
    let along = 0;
    for (const d of row) {
      const size = side * (d.v / areaOf(row));
      out.push(
        horizontal
          ? { ...d, x: free.x, y: free.y + along, w: depth, h: size }
          : { ...d, x: free.x + along, y: free.y, w: size, h: depth },
      );
      along += size;
    }
    free = horizontal
      ? { x: free.x + depth, y: free.y, w: free.w - depth, h: free.h }
      : { x: free.x, y: free.y + depth, w: free.w, h: free.h - depth };
  }
  return out;
}

// The treemap is laid out in its own square-ish box, then mapped into panel
// coordinates. Aspect ratio matters here more than anywhere: a treemap
// squashed by the frame would exaggerate the very effect being shown.
const BOX = { x: 0, y: 0, w: 1, h: 1 };
const CELLS = squarify(VALUES, BOX).map((c, i) => {
  const x0 = TREE.left + (TREE.right - TREE.left) * c.x;
  const x1 = TREE.left + (TREE.right - TREE.left) * (c.x + c.w);
  const y0 = TREE.bottom + (TREE.top - TREE.bottom) * c.y;
  const y1 = TREE.bottom + (TREE.top - TREE.bottom) * (c.y + c.h);
  return {
    ...c,
    color: SERIES[i % SERIES.length],
    x1: x0,
    x2: x1,
    y1: y0,
    y2: y1,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    middle: MIDDLE.some((m) => m.key === c.key),
  };
});

const BAR = 0.6;
const barRows = VALUES.map((d, i) => ({
  ...d,
  color: SERIES[i % SERIES.length],
  middle: MIDDLE.some((m) => m.key === d.key),
  x1: BARS.band(i, N) - (BARS.bandWidth(N) * BAR) / 2,
  x2: BARS.band(i, N) + (BARS.bandWidth(N) * BAR) / 2,
  y: BARS.py(d.v),
}));

export const caption = `Eight values as a treemap and as bars. Try to rank ${MIDDLE.map((d) => d.key).join(", ")} in the treemap: they differ by ${SPREAD}% end to end, which is not subtle, and it is close to impossible.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 40,
    marginRight: 18,
    marginBottom: 42,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      panelTitle(TREE, "As a treemap: area", { fill: ACCENT }),
      panelTitle(BARS, "As bars: one baseline, one direction", { fill: PRIMARY }),

      Plot.rect(CELLS, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: "color",
        fillOpacity: (d) => (d.middle ? 0.85 : 0.35),
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.6,
      }),
      Plot.text(CELLS, {
        x: "cx",
        y: "cy",
        text: (d) => `${d.key}\n${d.v}`,
        fill: (d) => (d.middle ? "var(--ds-chart-surface)" : MUTED),
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.3,
        textAnchor: "middle",
      }),

      ...panelAxis(BARS, { ticks: [0, 100, 200, 300] }),
      panelBaseline(BARS),
      Plot.rect(barRows, {
        x1: "x1",
        x2: "x2",
        y1: BARS.py(0),
        y2: "y",
        fill: "color",
        fillOpacity: (d) => (d.middle ? 0.85 : 0.35),
      }),
      Plot.text(barRows, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: BARS.py(0),
        text: "key",
        fill: "currentColor",
        fillOpacity: 0.6,
        fontSize: 10,
        textAnchor: "middle",
        dy: 13,
      }),
      Plot.text([{}], {
        x: (TREE.left + TREE.right) / 2,
        y: TREE.bottom,
        text: () => `rank the four dark boxes: they differ by ${SPREAD}%`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 22,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (BARS.left + BARS.right) / 2,
        y: BARS.py(0),
        text: () => "now rank them again",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
