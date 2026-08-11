/**
 * One set of numbers, three classification schemes, three maps that disagree.
 *
 * A choropleth has to turn a continuous variable into a small number of shades,
 * and the decision about *where the breaks go* is made in a dialog box that
 * most people accept the default of. It is not a formatting choice. It decides
 * which regions look alike, which look extreme, and therefore what the map
 * says.
 *
 * The three schemes here are the three every GIS tool offers:
 *
 *   • **Equal interval** cuts the range into equal-width slices. It is the only
 *     one whose legend is honest about magnitude, and on a skewed distribution
 *     it puts almost every region in the bottom class and leaves the top ones
 *     empty. The map looks uniform, with one or two outliers.
 *   • **Quantile** puts an equal *count* in each class. Every shade is used, so
 *     the map looks informative, and the price is that the legend's boundaries
 *     are arbitrary: two regions a hair apart can land in different classes,
 *     and two regions far apart can share one.
 *   • **Natural breaks** (Jenks) looks for the gaps in the data and cuts there,
 *     minimising variance inside each class. It usually produces the most
 *     defensible map and the least explicable legend.
 *
 * None of them is wrong. What is wrong is choosing one because the map looks
 * better, which is the usual method, and not saying which one was used, which
 * is nearly universal.
 *
 * The layout here is a *tile grid*: one square per region, arranged roughly
 * geographically. It is a real cartographic form, used precisely because it
 * stops area from being an accidental encoding, and it keeps this figure about
 * classification rather than about coastlines.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Sixteen regional rates shown on three tile-grid maps that differ only in how the values were cut into five classes: equal interval, quantile and natural breaks. The same region can be in the lightest class on one map and the middle class on another.";

/** A right-skewed distribution, which is what rates usually are: most regions
 *  bunched low, a few far above. Laid out as a four-by-four tile grid. */
const REGIONS = [
  ["A1", 4, 0, 0], ["B1", 6, 1, 0], ["C1", 5, 2, 0], ["D1", 9, 3, 0],
  ["A2", 7, 0, 1], ["B2", 11, 1, 1], ["C2", 8, 2, 1], ["D2", 13, 3, 1],
  ["A3", 6, 0, 2], ["B3", 10, 1, 2], ["C3", 46, 2, 2], ["D3", 12, 3, 2],
  ["A4", 5, 0, 3], ["B4", 9, 1, 3], ["C4", 62, 2, 3], ["D4", 15, 3, 3],
].map(([key, v, col, row]) => ({ key, v, col, row }));

const K = 5;
const values = REGIONS.map((d) => d.v).sort((a, b) => a - b);
const LO = values[0];
const HI = values.at(-1);

/** Equal interval: the range cut into K equal widths. */
const equalBreaks = Array.from({ length: K - 1 }, (_, i) => LO + ((HI - LO) * (i + 1)) / K);

/** Quantile: equal counts per class. */
const quantileBreaks = Array.from(
  { length: K - 1 },
  (_, i) => values[Math.floor((values.length * (i + 1)) / K)],
);

/**
 * Natural breaks, one-dimensional k-means, which is what Jenks converges to
 * and is three lines instead of thirty. Seeded from the quantile breaks so the
 * result is deterministic.
 */
const naturalBreaks = (() => {
  let centres = Array.from(
    { length: K },
    (_, i) => values[Math.floor((values.length * (i + 0.5)) / K)],
  );
  for (let pass = 0; pass < 30; pass++) {
    const groups = Array.from({ length: K }, () => []);
    for (const v of values) {
      let best = 0;
      for (let i = 1; i < K; i++) {
        if (Math.abs(v - centres[i]) < Math.abs(v - centres[best])) best = i;
      }
      groups[best].push(v);
    }
    centres = groups.map((g, i) => (g.length ? g.reduce((s, v) => s + v, 0) / g.length : centres[i]));
  }
  return Array.from({ length: K - 1 }, (_, i) => (centres[i] + centres[i + 1]) / 2);
})();

const classOf = (v, breaks) => breaks.filter((b) => v > b).length;

const SCHEMES = [
  { title: "Equal interval", breaks: equalBreaks },
  { title: "Quantile", breaks: quantileBreaks },
  { title: "Natural breaks", breaks: naturalBreaks },
];

const PANELS = SCHEMES.map((_, k) => panel(k, { y: [0, 1] }));

const TILE = 0.155;
const GAP = 0.012;
const tiles = SCHEMES.flatMap((scheme, k) => {
  const p = PANELS[k];
  const originX = (p.left + p.right) / 2 - (4 * TILE + 3 * GAP) / 2;
  const originY = 0.72;
  return REGIONS.map((d) => ({
    ...d,
    scheme: scheme.title,
    cls: classOf(d.v, scheme.breaks),
    x1: originX + d.col * (TILE + GAP),
    x2: originX + d.col * (TILE + GAP) + TILE,
    y1: originY - d.row * (TILE * 0.62 + GAP) - TILE * 0.62,
    y2: originY - d.row * (TILE * 0.62 + GAP),
  }));
});

/** The region whose class changes most across the three schemes, found rather
 *  than picked, so the caption always points at a real disagreement. */
const MOVER = REGIONS.map((d) => {
  const classes = SCHEMES.map((s) => classOf(d.v, s.breaks));
  return { ...d, classes, span: Math.max(...classes) - Math.min(...classes) };
}).reduce((a, b) => (b.span > a.span ? b : a));

const shade = (cls) => 0.12 + (cls / (K - 1)) * 0.78;
const bottomCount = (breaks) => REGIONS.filter((d) => classOf(d.v, breaks) === 0).length;

export const caption = `A choropleth has to turn a continuous variable into a handful of shades, and where the class breaks go is settled in a dialog box whose default most people accept. It is not a formatting choice. Equal interval cuts the range into equal widths, which is the only scheme whose legend is honest about magnitude, and on a skewed distribution like this one it drops ${bottomCount(equalBreaks)} of the ${REGIONS.length} regions into the lightest class and leaves the map looking uniform with two outliers. Quantile puts an equal count in each class, so every shade gets used and the map looks informative, at the price of arbitrary boundaries: two regions a hair apart can land in different classes and two far apart can share one. Natural breaks looks for the gaps in the data and cuts there, which usually gives the most defensible map and the least explicable legend. Region ${MOVER.key}, at ${MOVER.v}, sits in class ${MOVER.classes[0] + 1} on the first map and class ${MOVER.classes[2] + 1} on the third. None of the three is wrong. What is wrong is picking one because the map looks better, which is the usual method, and not saying which was used, which is nearly universal.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 18,
    marginRight: 18,
    marginBottom: 40,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      ...PANELS.map((p, k) => panelTitle(p, SCHEMES[k].title, { fill: k === 0 ? ACCENT : MUTED })),
      Plot.rect(tiles, {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: PRIMARY,
        fillOpacity: (d) => shade(d.cls),
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.4,
      }),
      Plot.text(tiles, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: (d) => (d.y1 + d.y2) / 2,
        text: (d) => String(d.v),
        fill: (d) => (d.cls >= 2 ? "var(--ds-chart-surface)" : MUTED),
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
      }),
      // The class boundaries each scheme chose, printed under its own map.
      ...PANELS.map((p, k) =>
        Plot.text([{}], {
          x: (p.left + p.right) / 2,
          y: 0.11,
          text: () =>
            `breaks at ${SCHEMES[k].breaks.map((b) => Math.round(b)).join(", ")}`,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: (PANELS[0].left + PANELS[2].right) / 2,
        y: 0.015,
        text: () =>
          `Region ${MOVER.key} at ${MOVER.v} is in class ${MOVER.classes[0] + 1} on the left and class ${MOVER.classes[2] + 1} on the right`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
