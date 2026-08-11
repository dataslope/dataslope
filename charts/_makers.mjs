/**
 * One scatter of engine size against fuel economy, split four ways, shared by
 * `groups-by-color-one-panel` and `groups-in-a-facet-grid`.
 *
 * The four names are invented, and are the same invented companies
 * `filter-beats-showing-everything` uses, so a reader who meets them twice
 * meets the same fictional world rather than two unexplained word-lists. The
 * lesson introduces them as manufacturers before either figure appears; the
 * captions repeat it, because a chart in the gallery has no lesson around it.
 *
 * The pair's whole argument is that these are *the same points* — the second
 * chart adds no data and removes none, it only moves each group into its own
 * frame — so the sample lives here rather than being generated twice. If the
 * two specs could drift apart the comparison would be an assertion instead of
 * a demonstration.
 *
 * ── Why the groups are four makers and not four vehicle classes ─────────────
 *
 * Vehicle classes were the first draft, and they made the pair prove the wrong
 * thing. Compacts, saloons, SUVs and pickups occupy different parts of *both*
 * axes, so the colored panel separated them into a tidy staircase and color
 * came out looking fine. Groups that separate in space are exactly the case
 * color handles well: the eye finds them by position and the hue is
 * decoration.
 *
 * The case faceting is for is groups that sit on top of each other, where hue
 * is the only thing telling them apart and there is nowhere for it to work.
 * Four manufacturers selling across the same range of engine sizes do that
 * naturally: the clouds share the same band, the four fitted lines start
 * together at the small end and only fan apart at the large end, and each
 * maker's own economy-per-litre penalty — the finding — is present in the
 * overlaid chart and unreadable in it.
 */
import { rng, SERIES } from "./_theme.mjs";

/** Economy at the pivot displacement, and the mpg lost per extra litre. All
 *  four sell the same range of engine sizes, so the clouds overlap and only
 *  the slopes distinguish them. */
const PIVOT = 2.2;
const MAKERS = [
  { key: "Northwind", mpg: 34, slope: -4.8, n: 34 },
  { key: "Peartree", mpg: 33, slope: -3.4, n: 34 },
  { key: "Halcyon", mpg: 32, slope: -2.1, n: 34 },
  { key: "Brightside", mpg: 31, slope: -1.0, n: 34 },
];

const LO = 1.6;
const HI = 5.4;

export const MAKER_KEYS = MAKERS.map((m) => m.key);

/** Mpg lost per litre, by maker. The four differ, which is the whole finding:
 *  in the colored panel it is buried and in the facet grid it is the shape of
 *  each panel. Read from the same definitions the points are built from, so a
 *  label can never quote a slope the geometry does not have. */
export const MAKER_SLOPE = Object.fromEntries(MAKERS.map((m) => [m.key, m.slope]));

/** One color per maker, identical in both charts so a reader can carry a
 *  maker from the tangle into the panel that finally separates it. */
export const MAKER_COLOR = Object.fromEntries(
  MAKERS.map((m, i) => [m.key, SERIES[i % SERIES.length]]),
);

/** Where each maker sits in the two-by-two grid. Faceting on the name directly
 *  would give Plot a single four-value `fx` and lay the panels out in one
 *  strip; a row key and a column key are what make it a grid. */
export const MAKER_CELL = Object.fromEntries(
  MAKERS.map((m, i) => [
    m.key,
    { col: i % 2 === 0 ? "left" : "right", row: i < 2 ? "top" : "bottom" },
  ]),
);

const next = rng(90210);

export const POINTS = MAKERS.flatMap((m) =>
  Array.from({ length: m.n }, () => {
    const displ = LO + (HI - LO) * next();
    const noise = (next() + next() + next() - 1.5) * 3.0;
    return {
      key: m.key,
      displ: Math.round(displ * 10) / 10,
      hwy: Math.round((m.mpg + m.slope * (displ - PIVOT) + noise) * 10) / 10,
    };
  }),
);

/** Endpoints of each maker's own fitted line. Every maker covers the same
 *  range, so no line is drawn past its data — the mistake
 *  `trendline-through-empty-space` is about. */
export const FITS = MAKERS.flatMap((m) =>
  [LO, HI].map((displ) => ({ key: m.key, displ, hwy: m.mpg + m.slope * (displ - PIVOT) })),
);

export const X_DOMAIN = [1.3, 5.7];
export const Y_DOMAIN = [10, 44];
