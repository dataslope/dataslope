/**
 * Seven values encoded as area and as position, so the gap in accuracy between
 * the two channels is something the reader experiences rather than reads.
 *
 * Area sits near the bottom of the Cleveland-McGill ranking and position sits
 * at the top, which is easy to nod along to and hard to feel. The top row asks
 * for a ranking from bubbles alone; the bottom row is the same seven numbers
 * on an axis. Almost nobody gets the middle of the top row right, and everyone
 * gets the bottom row right instantly, without effort and without a legend.
 *
 * The conclusion is not "never use size". It is that size answers "big or
 * small" and nothing finer, so it belongs on the variable where that is all
 * the reader needs, and the variables that have to be compared belong on x and
 * y. A bubble chart that puts the interesting quantity in the radius has
 * spent its strongest channel on something nobody was asking about.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Seven values shown as bubbles of proportional area and again as points on a scale. The bubble row is hard to rank; the position row is immediate.";

const VALUES = [
  { key: "A", v: 61 },
  { key: "B", v: 92 },
  { key: "C", v: 78 },
  { key: "D", v: 44 },
  { key: "E", v: 85 },
  { key: "F", v: 70 },
  { key: "G", v: 99 },
];

const AREA = "As area";
const POSITION = "As position";

const MAX = Math.max(...VALUES.map((d) => d.v));
const MIN = Math.min(...VALUES.map((d) => d.v));

/** The two the caption picks on: the closest adjacent pair once ranked, which
 *  is the pair a reader of the bubble row will most often swap. */
const ranked = [...VALUES].sort((a, b) => b.v - a.v);
const CLOSEST = ranked.reduce(
  (best, d, i) =>
    i > 0 && ranked[i - 1].v - d.v < best.gap
      ? { gap: ranked[i - 1].v - d.v, pair: [ranked[i - 1], d] }
      : best,
  { gap: Infinity, pair: [ranked[0], ranked[1]] },
);

const SPREAD = Math.round((MAX / MIN) * 10) / 10;

const rows = VALUES.map((d, i) => ({ ...d, i }));

export const caption = `Seven numbers, two channels. Area sits near the bottom of the Cleveland-McGill ranking and position sits at the top, which is easy to agree with and hard to feel, so here it is: rank the top row from the bubbles, then look at the bottom row. ${CLOSEST.pair[0].key} and ${CLOSEST.pair[1].key} differ by ${CLOSEST.gap}, and on the bubbles almost nobody calls it, while on the axis nobody misses it. Even the full spread, ${SPREAD} times from smallest to largest, reads as much less than that in area. The conclusion is not "never use size". It is that size answers "big or small" and nothing finer, so it belongs on the variable where that is all a reader needs, and the quantities that have to be compared belong on x and y. A bubble chart with the interesting number in the radius has spent its strongest channel on something nobody asked about.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 34,
    marginRight: 82,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: [AREA, POSITION] },
    x: {
      label: null,
      domain: [-0.6, VALUES.length - 0.4],
      ticks: VALUES.map((_, i) => i),
      tickFormat: (i) => VALUES[i].key,
    },
    // No y axis. A facet shares its scales, so any ticks here would also run
    // across the bubble row and claim a value for marks whose y is a constant.
    y: { label: null, domain: [0, 112], ticks: [], grid: false },
    // Areas proportional to the value, which is the correct scaling and still
    // not enough: the point is that even a correctly built bubble is weak.
    r: { type: "sqrt", domain: [0, MAX], range: [0, 21] },
    marks: [
      Plot.dot(rows, {
        fy: () => AREA,
        x: "i",
        y: 56,
        r: "v",
        fill: PRIMARY,
        fillOpacity: 0.55,
        stroke: PRIMARY,
        strokeOpacity: 0.9,
      }),
      Plot.ruleX(rows, {
        fy: () => POSITION,
        x: "i",
        y1: 0,
        y2: "v",
        stroke: PRIMARY,
        strokeOpacity: 0.35,
      }),
      Plot.dot(rows, {
        fy: () => POSITION,
        x: "i",
        y: "v",
        r: 4.5,
        fill: PRIMARY,
      }),
      // The pair the reader is most likely to get wrong, marked in both rows so
      // the miss and the correction sit one above the other.
      ...CLOSEST.pair.map((p) =>
        Plot.dot([{ i: VALUES.findIndex((d) => d.key === p.key), v: p.v }], {
          fy: () => POSITION,
          x: "i",
          y: "v",
          r: 5,
          fill: ACCENT,
        }),
      ),
      // Values printed only on the pair the caption names, so the ranking in
      // the lower row is still done by height and not by reading numbers.
      ...CLOSEST.pair.map((p) =>
        Plot.text([{ i: VALUES.findIndex((d) => d.key === p.key), v: p.v }], {
          fy: () => POSITION,
          x: "i",
          y: "v",
          text: () => String(p.v),
          fill: ACCENT,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "middle",
          dy: -12,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        fy: () => AREA,
        frameAnchor: "top-right",
        text: () => "rank these",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -4,
        dy: -4,
        ...HALO,
      }),
      Plot.text([{}], {
        fy: () => POSITION,
        frameAnchor: "bottom-right",
        text: () => "already done",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -4,
        dy: -4,
        ...HALO,
      }),
      Plot.ruleY([0], {
        fy: () => POSITION,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
    ],
  });
}
