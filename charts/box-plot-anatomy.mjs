/**
 * A box plot with every part named, over the data it was computed from.
 *
 * The box is five numbers and a rule, and every one of them is a quantile,
 * which is the fact that makes the rest of the chart make sense: the box is
 * the middle half, the line inside is the median rather than the mean, and the
 * whiskers stop at the last real observation inside the fence rather than at
 * the fence itself. That last detail is the one people get wrong, and it is
 * why two box plots of the same distribution can have whiskers of different
 * lengths.
 *
 * The raw points are drawn underneath because a box plot is a summary and the
 * whole risk of a summary is forgetting what it summarised. Here they agree.
 * `box-hides-shape` is the companion showing four datasets where the same box
 * hides four completely different shapes.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, normalSamples, rng } from "./_theme.mjs";

export const title =
  "A single horizontal box plot with its parts labelled: the minimum inside the fence, the first quartile, the median, the third quartile, the maximum inside the fence, the interquartile range, and two outlying points beyond the upper fence.";

const u = rng(77);
/** A mostly-normal batch plus two genuine stragglers, so the chart has
 *  outliers to name without inventing a second distribution. */
const DATA = [...normalSamples(60, 46, 7, 515), 74, 79].map((v) => Math.round(v * 10) / 10);

function quantile(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}

const Q1 = quantile(DATA, 0.25);
const MED = quantile(DATA, 0.5);
const Q3 = quantile(DATA, 0.75);
const IQR = Q3 - Q1;
const LO_FENCE = Q1 - 1.5 * IQR;
const HI_FENCE = Q3 + 1.5 * IQR;

/** The whiskers stop at the last *observation* inside the fence, never at the
 *  fence: that is the part people misremember. */
const inside = DATA.filter((v) => v >= LO_FENCE && v <= HI_FENCE);
const WHISK_LO = Math.min(...inside);
const WHISK_HI = Math.max(...inside);
const OUTLIERS = DATA.filter((v) => v < LO_FENCE || v > HI_FENCE);

/** Jitter, so 62 points on one row are countable rather than a smear. */
const POINTS = DATA.map((v) => ({ v, j: 0.62 + (u() - 0.5) * 0.34 }));

const LABELS = [
  { x: WHISK_LO, text: "min inside\nthe fence", dy: -34 },
  { x: Q1, text: "Q1", dy: -52 },
  { x: MED, text: "median", dy: -70 },
  { x: Q3, text: "Q3", dy: -52 },
  { x: WHISK_HI, text: "max inside\nthe fence", dy: -34 },
];

export const caption = `Every number in a box plot is a quantile. The box spans Q1 to Q3, so it is the middle half of the data; the line inside is the *median*, not the mean; and the whiskers stop at the last real observation within 1.5×IQR of the box (${WHISK_HI} here), not at the fence itself (${HI_FENCE.toFixed(1)}). That last detail is the one people misremember, and it is why two box plots of the same distribution can have whiskers of different lengths. Anything past the whisker is drawn individually. The raw points sit underneath because a box is a summary, and the risk of every summary is forgetting what it summarised.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 88,
    marginLeft: 40,
    marginRight: 40,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Value", labelAnchor: "center", domain: [22, 86], ticks: 7 },
    y: { label: null, domain: [0, 1], ticks: [], grid: false },
    marks: [
      // The raw data, under the summary that stands in for it.
      Plot.dot(POINTS, { x: "v", y: "j", r: 2.6, fill: MUTED, fillOpacity: 0.55 }),

      // Whiskers, then the box, then the median: drawn in that order so each
      // sits on top of the one it belongs to.
      Plot.ruleY([0.26], { x1: WHISK_LO, x2: Q1, stroke: PRIMARY, strokeWidth: 1.4 }),
      Plot.ruleY([0.26], { x1: Q3, x2: WHISK_HI, stroke: PRIMARY, strokeWidth: 1.4 }),
      Plot.ruleX([WHISK_LO, WHISK_HI], { y1: 0.19, y2: 0.33, stroke: PRIMARY, strokeWidth: 1.4 }),
      Plot.rect([{}], {
        x1: Q1,
        x2: Q3,
        y1: 0.14,
        y2: 0.38,
        fill: PRIMARY,
        fillOpacity: 0.22,
        stroke: PRIMARY,
        strokeWidth: 1.4,
      }),
      Plot.ruleX([MED], { y1: 0.14, y2: 0.38, stroke: PRIMARY, strokeWidth: 2.6 }),
      Plot.dot(OUTLIERS.map((v) => ({ v })), { x: "v", y: 0.26, r: 4, fill: ACCENT }),

      // The IQR, measured across the top of the box.
      Plot.ruleY([0.5], { x1: Q1, x2: Q3, stroke: GUIDE, strokeWidth: 1.3 }),
      Plot.ruleX([Q1, Q3], { y1: 0.47, y2: 0.53, stroke: GUIDE, strokeWidth: 1.3 }),
      Plot.text([{}], {
        x: MED,
        y: 0.5,
        text: () => `IQR = ${IQR.toFixed(1)}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        dy: -10,
        ...HALO,
      }),

      // Leaders from each part up into the margin kept clear for them.
      Plot.ruleX(LABELS, { x: "x", y1: 0.38, y2: 0.62, stroke: MUTED, strokeOpacity: 0.4 }),
      ...LABELS.map((l) =>
        Plot.text([{}], {
          x: l.x,
          y: 1,
          text: () => l.text,
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          dy: l.dy + 74,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: OUTLIERS[OUTLIERS.length - 1],
        y: 0.26,
        text: () => "beyond the fence:\ndrawn individually",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -10,
        dy: 22,
        ...HALO,
      }),
    ],
  });
}
