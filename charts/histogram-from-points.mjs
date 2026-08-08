/**
 * A histogram assembled in three steps, so the bars stop being a mystery.
 *
 * Beginners often read a histogram as a bar chart whose categories happen to
 * be numbers, which leads to two persistent misreadings: that the bars are
 * separate things rather than slices of one axis, and that a taller bar means
 * a bigger value rather than more observations. Drawing the assembly fixes
 * both, because each step is visibly the same points rearranged.
 *
 * The three steps are: put every observation on the number line; cut the line
 * into equal intervals; stack the observations that fall in each interval. The
 * height of a bar is a *count*, the width of a bar is a *choice*, and the
 * x axis is continuous the whole way through, which is why the bars touch.
 *
 * The rug at the bottom of the final panel is kept on purpose. It is the raw
 * data still present under the summary, and it makes the last remaining
 * question visible: the bars come from where the cuts were put.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, normalSamples } from "./_theme.mjs";

export const title =
  "A histogram built in three panels: the observations as ticks on a number line, the line cut into equal-width bins, and the observations in each bin stacked into a bar.";

const LO = 0;
const HI = 60;
const BINS = 8;
const WIDTH = (HI - LO) / BINS;

const values = normalSamples(64, 29, 11, 515)
  .map((v) => Math.max(LO + 0.4, Math.min(HI - 0.4, v)))
  .sort((a, b) => a - b);

const binOf = (v) => Math.min(BINS - 1, Math.floor((v - LO) / WIDTH));

const counts = new Array(BINS).fill(0);
for (const v of values) counts[binOf(v)]++;

// Short row names. Plot writes facet labels into the right margin without
// wrapping; the steps are spelled out in the caption.
const STEP1 = "1. On the line";
const STEP2 = "2. Cut into bins";
const STEP3 = "3. Stacked";

/** Panels 1 and 2 show the same rug; panel 3 shows the rug and the bars. */
const rug = [STEP1, STEP2, STEP3].flatMap((panel) =>
  values.map((v) => ({ panel, v })),
);

/** In panel 2 the points are stacked in place, which is the step where a
 *  reader can see the count forming without the bar hiding it. */
const stacked = (() => {
  const seen = new Array(BINS).fill(0);
  return values.map((v) => {
    const b = binOf(v);
    return { panel: STEP2, v, k: seen[b]++ };
  });
})();

const bars = counts.map((c, i) => ({
  panel: STEP3,
  x1: LO + i * WIDTH,
  x2: LO + (i + 1) * WIDTH,
  c,
}));

const cuts = Array.from({ length: BINS + 1 }, (_, i) => LO + i * WIDTH);
const PEAK = Math.max(...counts);
const TALL = counts.indexOf(PEAK);

export const caption = `Read as a bar chart whose categories happen to be numbers, a histogram produces two lasting misreadings: that the bars are separate things rather than slices of one axis, and that a taller bar means a bigger value rather than more observations. Assembling it makes both go away, because every step is the same ${values.length} points rearranged. Put each observation on the number line, cut the line into equal intervals, stack what lands in each. The height of a bar is a count, ${PEAK} for the tallest here, covering ${LO + TALL * WIDTH} to ${LO + (TALL + 1) * WIDTH}; the width of a bar is a choice; and the axis is continuous throughout, which is why the bars touch. The rug is left under the final panel on purpose: it is the raw data still sitting beneath the summary, and it keeps the remaining question visible, which is that the bars depend on where the cuts were put.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 34,
    marginLeft: 40,
    marginRight: 96,
    marginBottom: 44,
    ariaLabel: title,
    fy: { label: null, domain: [STEP1, STEP2, STEP3] },
    x: { label: "Value", labelAnchor: "center", domain: [LO, HI], ticks: 5 },
    y: { label: null, domain: [0, PEAK * 1.15], ticks: [], grid: false },
    marks: [
      // The cuts, from step 2 onward.
      Plot.ruleX(cuts, {
        fy: () => STEP2,
        stroke: GUIDE,
        strokeOpacity: 0.8,
        strokeDasharray: "3 3",
      }),
      Plot.rect(bars, {
        fy: "panel",
        x1: "x1",
        x2: "x2",
        y1: 0,
        y2: "c",
        fill: (d) => (d.c === PEAK ? ACCENT : PRIMARY),
        fillOpacity: 0.62,
        inset: 0.5,
      }),
      // Observations stacked in place, one dot per row of its bin.
      Plot.dot(stacked, {
        fy: "panel",
        x: "v",
        y: (d) => d.k + 0.5,
        r: 2.4,
        fill: PRIMARY,
        fillOpacity: 0.85,
      }),
      // The rug: the raw values, present in every panel. Tall in the first,
      // where it is the whole picture; short afterwards, where it sits under
      // the summary being built on top of it.
      Plot.ruleX(
        rug.filter((d) => d.panel === STEP1),
        { fy: "panel", x: "v", y1: 0, y2: PEAK * 0.55, stroke: PRIMARY, strokeOpacity: 0.6 },
      ),
      Plot.ruleX(
        rug.filter((d) => d.panel !== STEP1),
        { fy: "panel", x: "v", y1: 0, y2: PEAK * 0.09, stroke: PRIMARY, strokeOpacity: 0.5 },
      ),
      Plot.text([{ at: LO + (TALL + 0.5) * WIDTH }], {
        fy: () => STEP3,
        x: "at",
        y: PEAK,
        text: () => `${PEAK} observations`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -9,
        ...HALO,
      }),
      Plot.text([{}], {
        fy: () => STEP2,
        frameAnchor: "top-right",
        text: () => `${BINS} bins, ${WIDTH} wide`,
        fill: MUTED,
        fontSize: 9.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -4,
        dy: 2,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
