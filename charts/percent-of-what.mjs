/**
 * The chart type that hides its own sample sizes on purpose.
 *
 * A 100% stacked bar normalises every group to the same length, which is
 * exactly what you want when the question is "what is the *mix* here?" and
 * exactly what you do not want when the groups are wildly different sizes,
 * because normalising is also the operation that deletes the evidence.
 *
 * All five bars here are the same width and the same visual weight. One of
 * them summarises nine thousand responses and one of them summarises thirty.
 * The thirty-response bar has the most extreme mix in the chart, which is not
 * a finding: at n = 30 the sampling noise on a share is roughly nine
 * percentage points, so a bar that looks like a different population is what
 * you would expect a few times out of five even if every group were identical.
 *
 * The lower row draws the same five groups with their widths proportional to
 * how many observations each contains, which is one of two standard fixes.
 * (The other is to print n under each bar and let the reader discount the
 * small ones themselves; that is cheaper and works nearly as well.) The
 * variable-width version has a second virtue: the total area of each color is
 * now the actual count, so the eye adds up correctly instead of averaging
 * five percentages as though they carried equal weight.
 *
 * The general form of this mistake is bigger than one chart type. Any
 * normalisation, per cent, per capita, per thousand, index to 100, throws away
 * the denominator, and a chart which has thrown away the denominator cannot
 * tell you which of its numbers to believe.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";
import { panel, panelSpace } from "./_panels.mjs";

export const title =
  "Five survey segments as a 100 per cent stacked bar, where every bar is the same width. One summarises 9,000 responses and one summarises 30. The lower row draws the same data with each bar's width proportional to its sample size, and the tiny segment nearly disappears.";

/** Responses by segment. Shares are per cent of that segment's own total. */
const SEGMENTS = [
  { key: "Enterprise", n: 9040, mix: [58, 27, 15] },
  { key: "Mid-market", n: 3120, mix: [51, 31, 18] },
  { key: "Small business", n: 1470, mix: [46, 33, 21] },
  { key: "Education", n: 380, mix: [44, 34, 22] },
  { key: "Government", n: 30, mix: [17, 26, 57] },
];

const ANSWERS = ["Very satisfied", "Satisfied", "Not satisfied"];
const COLORS = [SERIES[0], SERIES[4], SERIES[5]];
const N = SEGMENTS.length;
const TOTAL_N = SEGMENTS.reduce((s, d) => s + d.n, 0);

const SMALLEST = SEGMENTS.reduce((a, b) => (b.n < a.n ? b : a));
const LARGEST = SEGMENTS.reduce((a, b) => (b.n > a.n ? b : a));
/** Standard error of a 50% share at the smallest n, in percentage points. */
const NOISE = Math.round(100 * Math.sqrt(0.25 / SMALLEST.n));

const EQUAL = panel(0, { y: [0, 100] });

/** Both rows share one panel's horizontal extent and are given explicit bands
 *  of its height, because the two rows, their labels, a middle heading, a
 *  leader and a legend all have to fit without touching. */
const band = (bottom, top) => ({
  bottom,
  top,
  py: (v) => bottom + ((top - bottom) * v) / 100,
});
const TOP = band(0.65, 0.95);
const BOTTOM = band(0.17, 0.43);

const BAR = 0.62;

/** Equal-width bars: every segment gets the same slot. */
const equalSlots = SEGMENTS.map((d, i) => {
  const c = EQUAL.band(i, N);
  const w = EQUAL.bandWidth(N) * BAR;
  return { ...d, x1: c - w / 2, x2: c + w / 2, c };
});

/** Width-by-n bars: the same total width, shared out by sample size, with a
 *  fixed gutter between bars so five of them stay five. */
const GUTTER = 0.012;
const widthSlots = (() => {
  const usable = EQUAL.right - EQUAL.left - GUTTER * (N - 1);
  let x = EQUAL.left;
  return SEGMENTS.map((d) => {
    const w = usable * (d.n / TOTAL_N);
    const slot = { ...d, x1: x, x2: x + w, c: x + w / 2 };
    x += w + GUTTER;
    return slot;
  });
})();

/** Stack one segment's three shares into rectangles. */
const stack = (slots, p) =>
  slots.flatMap((slot) => {
    let acc = 0;
    return slot.mix.map((share, j) => {
      const from = acc;
      acc += share;
      return {
        key: slot.key,
        answer: ANSWERS[j],
        color: COLORS[j],
        x1: slot.x1,
        x2: slot.x2,
        y1: p.py(from),
        y2: p.py(acc),
      };
    });
  });

export const caption = `Five groups as a 100 per cent stacked bar, then the same numbers with each bar's width proportional to its sample size. One of those bars is ${LARGEST.n.toLocaleString()} responses and one is ${SMALLEST.n}.`;

export function render() {
  return plot({
    height: 360,
    marginTop: 26,
    marginLeft: 36,
    marginRight: 18,
    marginBottom: 22,
    ariaLabel: title,
    ...panelSpace(1),
    marks: [
      Plot.text([{}], {
        x: (EQUAL.left + EQUAL.right) / 2,
        y: 0.985,
        text: () => "Every bar the same width",
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{}], {
        x: (EQUAL.left + EQUAL.right) / 2,
        y: 0.47,
        text: () => "Width proportional to sample size",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "middle",
        ...HALO,
      }),

      Plot.rect(stack(equalSlots, TOP), {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: "color",
        fillOpacity: 0.82,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1,
      }),
      Plot.rect(stack(widthSlots, BOTTOM), {
        x1: "x1",
        x2: "x2",
        y1: "y1",
        y2: "y2",
        fill: "color",
        fillOpacity: 0.82,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1,
      }),

      Plot.text(equalSlots, {
        x: "c",
        y: TOP.bottom,
        text: (d) => `${d.key}\nn = ${d.n.toLocaleString()}`,
        fill: (d) => (d.n === SMALLEST.n ? ACCENT : "currentColor"),
        fillOpacity: (d) => (d.n === SMALLEST.n ? 1 : 0.62),
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: 16,
      }),
      Plot.text(
        widthSlots.filter((d) => d.n > 1000),
        {
          x: "c",
          y: BOTTOM.bottom,
          text: (d) => d.key,
          fill: "currentColor",
          fillOpacity: 0.62,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 14,
        },
      ),
      // A leader down to the sliver, on its own line so it clears the other
      // row labels.
      Plot.link([{}], {
        x1: widthSlots.at(-1).c,
        x2: widthSlots.at(-1).c,
        y1: BOTTOM.bottom,
        y2: 0.075,
        stroke: ACCENT,
        strokeWidth: 1,
        strokeOpacity: 0.7,
      }),
      Plot.text([{}], {
        x: widthSlots.at(-1).c,
        y: 0.075,
        text: () => `${SMALLEST.key}, n = ${SMALLEST.n}`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        dx: -4,
        ...HALO,
      }),

      // One legend, as a strip along the bottom, clear of both rows.
      Plot.dot(
        ANSWERS.map((answer, j) => ({ answer, color: COLORS[j], x: EQUAL.left + j * 0.22 })),
        { x: "x", y: 0.0, fill: "color", r: 4.5, symbol: "square" },
      ),
      Plot.text(
        ANSWERS.map((answer, j) => ({ answer, x: EQUAL.left + j * 0.22 })),
        {
          x: "x",
          y: 0.0,
          text: "answer",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "start",
          dx: 10,
          ...HALO,
        },
      ),
    ],
  });
}
