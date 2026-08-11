/**
 * What Tukey actually drew in 1977, and what survived into your plotting
 * library.
 *
 * The box plot on the top row is the *schematic plot* from *Exploratory Data
 * Analysis*, with the machinery Tukey defined and most people have never seen
 * drawn. Two pairs of fences, not one. Two classes of unusual point, not one.
 * And whiskers that stop at a *data value*, which is the part almost everyone
 * misremembers.
 *
 * The vocabulary, since none of it is obvious:
 *
 *   • *hinges* are the medians of the lower and upper halves of the sorted
 *     batch. They are close to the quartiles and not always equal to them,
 *     and Tukey chose them because you can find them by folding a written-out
 *     list in half twice, with no arithmetic at all;
 *   • the *H-spread* is the distance between them, the box;
 *   • the *inner fences* sit one and a half H-spreads outside the hinges and
 *     the *outer fences* three;
 *   • the *adjacent values* are the most extreme observations still inside the
 *     inner fences, and the whiskers reach to those. This is the point people
 *     get wrong. A whisker does not end at the fence, it ends at the last
 *     real observation before it, so its length is data and not arithmetic;
 *   • a point past an inner fence is *outside*; past an outer fence, *far
 *     out*. Two words, because a value four H-spreads away is a different kind
 *     of event from one that is two, and collapsing them loses that.
 *
 * The bottom row is what a modern library gives you from the same batch: the
 * quartiles, the 1.5 rule, and one undifferentiated category called outliers.
 * It is the same drawing with the outer fence deleted, and the deletion is why
 * "outlier" has come to sound like a verdict rather than a distance.
 *
 * The fences are drawn here, which no real box plot does. They exist to
 * classify and are then thrown away, so the only way to see where they were is
 * to put them back.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, normalSamples } from "./_theme.mjs";

export const title =
  "One batch of numbers drawn twice. The top row is Tukey's 1977 schematic plot, with inner and outer fences marked and unusual points split into outside and far out. The bottom row is a modern box plot of the same data, where both classes are collapsed into one category of outlier and the fences are not drawn at all.";

/** A right-skewed batch: lognormal-ish, which is what a response time, an
 *  income or a file size looks like, and the case box plots are used on. */
const BATCH = normalSamples(38, 0, 0.52, 8_946)
  .map((z) => Math.round(24 * Math.exp(z)))
  .concat([132, 171, 8]);

const sorted = [...BATCH].sort((a, b) => a - b);
const medianOf = (xs) => {
  const n = xs.length;
  const h = n >> 1;
  return n % 2 ? xs[h] : (xs[h - 1] + xs[h]) / 2;
};

const MEDIAN = medianOf(sorted);
// Tukey's hinges: split the batch at the median, keeping the median itself in
// both halves when the count is odd, and take the median of each half.
const half = Math.ceil(sorted.length / 2);
const LO_HINGE = medianOf(sorted.slice(0, half));
const HI_HINGE = medianOf(sorted.slice(sorted.length - half));
const HSPREAD = HI_HINGE - LO_HINGE;

const INNER = [LO_HINGE - 1.5 * HSPREAD, HI_HINGE + 1.5 * HSPREAD];
const OUTER = [LO_HINGE - 3 * HSPREAD, HI_HINGE + 3 * HSPREAD];

const inside = sorted.filter((v) => v >= INNER[0] && v <= INNER[1]);
const ADJACENT = [inside[0], inside.at(-1)];

const classify = (v) => {
  if (v < OUTER[0] || v > OUTER[1]) return "far out";
  if (v < INNER[0] || v > INNER[1]) return "outside";
  return "in";
};

const TUKEY = "Tukey's schematic plot, 1977";
const TODAY = "The box plot you get today";

const points = [TUKEY, TODAY].flatMap((panel) =>
  sorted.map((v) => ({
    v,
    panel,
    kind: panel === TUKEY ? classify(v) : classify(v) === "in" ? "in" : "outlier",
  })),
);

const COLOR = { in: PRIMARY, outside: ACCENT, "far out": ACCENT, outlier: ACCENT };
const OPACITY = { in: 0.5, outside: 0.95, "far out": 0.95, outlier: 0.95 };
const RADIUS = { in: 3.2, outside: 4.6, "far out": 5.6, outlier: 4.6 };

const nOutside = sorted.filter((v) => classify(v) === "outside").length;
const nFarOut = sorted.filter((v) => classify(v) === "far out").length;

/** One box, drawn by hand in both panels, because the fences and the whisker
 *  ends are computed above and a `Plot.boxX` would recompute its own. */
const BOX_HEIGHT = 0.34;
const box = (panel) => [{ panel, y0: -BOX_HEIGHT, y1: BOX_HEIGHT }];

export const caption = `Tukey's 1977 schematic plot above a modern library's box plot of the same batch. His has two pairs of fences and two classes of unusual value; the modern one drops the outer fence and merges both into ${nOutside + nFarOut} points labelled outlier.`;

export function render() {
  return plot({
    height: 350,
    marginTop: 22,
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 52,
    ariaLabel: title,
    x: {
      label: "Value",
      labelAnchor: "center",
      domain: [-16, 186],
      ticks: [0, 40, 80, 120, 160],
    },
    y: { axis: null, domain: [-1.2, 1.3], grid: false },
    // The row titles are long enough that an fy axis would take a third of the
    // width for two labels. They go inside the panels instead.
    fy: { axis: null, domain: [TUKEY, TODAY] },
    marks: [
      Plot.text([{ panel: TUKEY }, { panel: TODAY }], {
        fy: "panel",
        x: -16,
        y: 1.3,
        text: "panel",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "start",
        dy: 2,
        ...HALO,
      }),
      // ── fences, only on the row that has a name for them ──────────────────
      ...[
        { at: INNER[1], label: "inner fence\n1.5 box-widths" },
        { at: OUTER[1], label: "outer fence\n3 box-widths" },
      ].map(({ at }) =>
        Plot.ruleX([{ panel: TUKEY }], {
          fy: "panel",
          x: at,
          stroke: GUIDE,
          strokeWidth: 1.25,
          strokeDasharray: "4,3",
        }),
      ),
      ...[
        { at: INNER[1], label: "inner fence" },
        { at: OUTER[1], label: "outer fence" },
      ].map(({ at, label }) =>
        Plot.text([{ panel: TUKEY }], {
          fy: "panel",
          x: at,
          y: 1.3,
          text: () => label,
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 2,
          ...HALO,
        }),
      ),

      // ── the box itself ────────────────────────────────────────────────────
      ...[TUKEY, TODAY].map((panel) =>
        Plot.rect(box(panel), {
          fy: "panel",
          x1: LO_HINGE,
          x2: HI_HINGE,
          y1: "y0",
          y2: "y1",
          fill: PRIMARY,
          fillOpacity: 0.14,
          stroke: PRIMARY,
          strokeWidth: 1.4,
        }),
      ),
      ...[TUKEY, TODAY].map((panel) =>
        Plot.ruleX([{ panel }], {
          fy: "panel",
          x: MEDIAN,
          y1: -BOX_HEIGHT,
          y2: BOX_HEIGHT,
          stroke: PRIMARY,
          strokeWidth: 2.6,
        }),
      ),
      // Whiskers, ending at the adjacent values.
      ...[TUKEY, TODAY].flatMap((panel) =>
        [
          [LO_HINGE, ADJACENT[0]],
          [HI_HINGE, ADJACENT[1]],
        ].map(([from, to]) =>
          Plot.link([{ panel }], {
            fy: "panel",
            x1: from,
            x2: to,
            y1: 0,
            y2: 0,
            stroke: PRIMARY,
            strokeWidth: 1.4,
          }),
        ),
      ),
      ...[TUKEY, TODAY].map((panel) =>
        Plot.ruleX(
          ADJACENT.map(() => ({ panel })),
          {
            fy: "panel",
            x: (d, i) => ADJACENT[i],
            y1: -0.16,
            y2: 0.16,
            stroke: PRIMARY,
            strokeWidth: 1.4,
          },
        ),
      ),

      // ── the observations ──────────────────────────────────────────────────
      Plot.dot(points, {
        fy: "panel",
        x: "v",
        y: -0.72,
        r: (d) => RADIUS[d.kind],
        fill: (d) => COLOR[d.kind],
        fillOpacity: (d) => OPACITY[d.kind],
      }),

      // ── the words, which are the actual difference between the rows ───────
      Plot.text([{ panel: TUKEY }], {
        fy: "panel",
        x: (INNER[1] + OUTER[1]) / 2,
        y: -0.72,
        text: () => `${nOutside} outside`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 18,
        ...HALO,
      }),
      Plot.text([{ panel: TUKEY }], {
        fy: "panel",
        x: OUTER[1] + 8,
        y: -0.72,
        text: () => `${nFarOut} far out`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dy: 18,
        ...HALO,
      }),
      Plot.text([{ panel: TODAY }], {
        fy: "panel",
        x: INNER[1] + 6,
        y: -0.72,
        text: () => `${nOutside + nFarOut} outliers, one word for both`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dy: 18,
        ...HALO,
      }),
      Plot.text([{ panel: TUKEY }], {
        fy: "panel",
        x: ADJACENT[1],
        y: 0,
        text: () => "the whisker stops at a\nvalue, not at the fence",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: -14,
        ...HALO,
      }),
    ],
  });
}
