/**
 * Nine regions shaded by the same rate, and the visual weight each one gets,
 * which is its area and has nothing to do with its data.
 *
 * A choropleth encodes a value in a fill and, whether or not the author meant
 * to, encodes something else in the size of the patch. The eye adds up ink.
 * One enormous sparsely populated region carries more of the reader's
 * impression than a dozen dense small ones put together, so a map of a country
 * with a big empty middle reports the big empty middle.
 *
 * The regions here all share one rate, so the fill says nothing at all, and
 * the map still has a strong visual message: the reader comes away believing
 * that whatever is being shown is mostly about the two big blocks on the left.
 * Beside it, the same nine regions as a bar chart of the population each one
 * actually represents, in the reverse order.
 *
 * The fixes are all forms of showing the denominator: a cartogram that resizes
 * regions by population, dots proportional to counts placed on the map, or the
 * bar chart, which gives up the geography and keeps the quantities. The one
 * thing that does not work is leaving the map alone and hoping the reader
 * corrects for area, because nobody does.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Nine regions of very different sizes shaded with an identical value, next to a bar chart of the population each one holds. The two largest regions dominate the map and hold the fewest people.";

/** A stylised country: a few huge rural blocks and several small dense ones,
 *  laid out on a grid so the arithmetic is checkable. */
const REGIONS = [
  { key: "Northern Plains", x: 0, y: 0, w: 3, h: 3, pop: 0.4 },
  { key: "Great Basin", x: 0, y: 3, w: 3, h: 3, pop: 0.6 },
  { key: "Lakeshore", x: 3, y: 0, w: 2, h: 2, pop: 2.1 },
  { key: "Midlands", x: 3, y: 2, w: 2, h: 2, pop: 1.8 },
  { key: "Riverbend", x: 3, y: 4, w: 2, h: 2, pop: 1.4 },
  { key: "Harbour", x: 5, y: 0, w: 1.45, h: 1.5, pop: 4.6 },
  { key: "Old Town", x: 5, y: 1.5, w: 1.45, h: 1.5, pop: 3.9 },
  { key: "Eastgate", x: 5, y: 3, w: 1.45, h: 1.5, pop: 3.2 },
  { key: "Docks", x: 5, y: 4.5, w: 1.45, h: 1.5, pop: 2.7 },
];

const RATE = 12.4;
const areaOf = (r) => r.w * r.h;
const TOTAL_AREA = REGIONS.reduce((s, r) => s + areaOf(r), 0);
const TOTAL_POP = REGIONS.reduce((s, r) => s + r.pop, 0);

const byArea = [...REGIONS].sort((a, b) => areaOf(b) - areaOf(a));
const BIG_TWO = byArea.slice(0, 2);
const AREA_SHARE = Math.round(
  (BIG_TWO.reduce((s, r) => s + areaOf(r), 0) / TOTAL_AREA) * 100,
);
const POP_SHARE = Math.round(
  (BIG_TWO.reduce((s, r) => s + r.pop, 0) / TOTAL_POP) * 100,
);

const byPop = [...REGIONS].sort((a, b) => b.pop - a.pop);

export const caption = `A choropleth encodes a value in a fill and, whether the author meant it or not, encodes a second thing in the size of the patch, because the eye adds up ink. Every region on this map carries the identical rate of ${RATE}, so the fill says nothing whatever, and the map still has a message: ${BIG_TWO.map((r) => r.key).join(" and ")} take ${AREA_SHARE} percent of the page and hold ${POP_SHARE} percent of the people. ${byPop[0].key}, with the most people of any region, is the sliver on the right. The fixes are all ways of showing the denominator: a cartogram that resizes regions by population, dots proportional to counts placed on the map, or the bar chart beside it, which gives up the geography and keeps the quantities. What does not work is leaving the map as it is and trusting the reader to correct for area, because nobody does.`;

const W = 680;
const H = 320;

// Scale trimmed so the widened dense column still clears the bar chart's
// row labels. The dense regions are wide enough to hold a name at 10px:
// a patch too small for its own label is a layout accident, and this
// chart is about area meaning something, so its areas have to be read.
const MAP = { x0: 30, y0: 54, scale: 38 };
const BAR = { x0: 420, x1: 640, y0: 58, step: 26 };

const patches = REGIONS.map((r) => ({
  ...r,
  px1: MAP.x0 + r.x * MAP.scale,
  px2: MAP.x0 + (r.x + r.w) * MAP.scale,
  py1: MAP.y0 + r.y * MAP.scale,
  py2: MAP.y0 + (r.y + r.h) * MAP.scale,
}));

const MAX_POP = Math.max(...REGIONS.map((r) => r.pop));
const bars = byPop.map((r, i) => ({
  ...r,
  cy: BAR.y0 + i * BAR.step,
  bx: BAR.x0 + (r.pop / MAX_POP) * (BAR.x1 - BAR.x0),
  big: BIG_TWO.some((b) => b.key === r.key),
}));

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 22,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 14,
    ariaLabel: title,
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      Plot.text([{}], {
        x: MAP.x0,
        y: 20,
        text: () => `Every region shaded ${RATE}`,
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.rect(patches, {
        x1: "px1",
        x2: "px2",
        y1: "py1",
        y2: "py2",
        fill: (d) => (BIG_TWO.some((b) => b.key === d.key) ? ACCENT : PRIMARY),
        fillOpacity: 0.42,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1.5,
      }),
      Plot.text(
        patches.filter((d) => d.w >= 2),
        {
          x: (d) => (d.px1 + d.px2) / 2,
          y: (d) => (d.py1 + d.py2) / 2,
          text: (d) => `${d.key}\n${d.pop.toFixed(1)}m`,
          fill: MUTED,
          fontSize: 10,
          lineHeight: 1.3,
          textAnchor: "middle",
          ...HALO,
        },
      ),
      // The narrow regions get a name too, smaller: an unlabelled patch reads
      // as an oversight rather than as the point being made.
      Plot.text(
        patches.filter((d) => d.w < 2),
        {
          x: (d) => (d.px1 + d.px2) / 2,
          y: (d) => (d.py1 + d.py2) / 2,
          text: (d) => `${d.key}\n${d.pop.toFixed(1)}m`,
          fill: MUTED,
          fontSize: 10,
          lineHeight: 1.25,
          textAnchor: "middle",
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: MAP.x0,
        y: MAP.y0 + 6 * MAP.scale + 20,
        text: () => `two regions, ${AREA_SHARE}% of the page, ${POP_SHARE}% of the people`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),

      Plot.text([{}], {
        x: BAR.x0,
        y: 20,
        text: () => "People per region",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.rect(bars, {
        x1: BAR.x0,
        x2: "bx",
        y1: (d) => d.cy - 8,
        y2: (d) => d.cy + 8,
        fill: (d) => (d.big ? ACCENT : PRIMARY),
        fillOpacity: 0.72,
      }),
      Plot.text(bars, {
        x: BAR.x0 - 6,
        y: "cy",
        text: "key",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "end",
      }),
      Plot.text(bars, {
        x: (d) => d.bx + 5,
        y: "cy",
        text: (d) => `${d.pop.toFixed(1)}m`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.link([{}], {
        x1: BAR.x0,
        x2: BAR.x0,
        y1: BAR.y0 - 12,
        y2: BAR.y0 + (bars.length - 1) * BAR.step + 12,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
    ],
  });
}
