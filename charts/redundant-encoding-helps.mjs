/**
 * What happens to a chart when the color goes away, which it does more often
 * than anybody plans for.
 *
 * Color fails routinely and for boring reasons. The chart is printed on a
 * laser printer. It is projected onto a screen with the contrast set wrong. It
 * is pasted into a document that converts to greyscale. It is read by one of
 * the roughly one man in twelve who cannot separate red from green. None of
 * these is an edge case, and none of them can be predicted from where you are
 * sitting when you make the chart.
 *
 * The three panels are the same four groups. The first encodes group by color
 * alone, which is what every library does when you pass `color=`. The second
 * is the same chart with the color taken away, which is what a reader in any
 * of the situations above actually receives: four groups, one cloud, nothing
 * recoverable. The third encodes group by color *and* shape, and then has its
 * color taken away too. It survives, because the shape was carrying the same
 * information the whole time.
 *
 * That is redundant encoding, and the word "redundant" is doing something
 * unusual here. In most of engineering, redundancy is waste to be removed. In
 * a chart it is the thing that makes the chart robust, for exactly the same
 * reason a spare tyre is: the second copy is worthless until the first one
 * fails, and then it is the only thing that matters.
 *
 * The costs are real but small. Shape is a weak channel, so it works for four
 * or five groups and not for twelve; distinguishing shapes takes a search
 * rather than a glance, so a legend still helps; and shape needs marks big
 * enough to have a shape, which rules it out for a dense scatter of thousands
 * of points. Within those limits it is nearly free.
 */
import { Plot, plot, HALO, MUTED, SERIES, normalSamples, rng } from "./_theme.mjs";

export const title =
  "Four groups of points drawn three ways: by color alone, the same chart with the color removed, and by color and shape together with the color removed. Only the third is still readable, because the shape was carrying the same information as the color all along.";

const GROUPS = [
  { key: "Control", cx: 3.1, cy: 3.4, symbol: "circle" },
  { key: "Low dose", cx: 4.6, cy: 4.5, symbol: "square" },
  { key: "High dose", cx: 6.1, cy: 5.4, symbol: "triangle" },
  { key: "Withdrawn", cx: 5.0, cy: 2.6, symbol: "diamond" },
];

const PER_GROUP = 26;
const jitterX = rng(5_512);
const points = GROUPS.flatMap((g, gi) => {
  const xs = normalSamples(PER_GROUP, g.cx, 0.62, 1000 + gi * 37);
  const ys = normalSamples(PER_GROUP, g.cy, 0.58, 5000 + gi * 91);
  return xs.map((x, i) => ({
    key: g.key,
    symbol: g.symbol,
    color: SERIES[gi],
    x: x + (jitterX() - 0.5) * 0.06,
    y: ys[i],
  }));
});

const COLOR_ONLY = "Color only";
const COLOR_GONE = "Color only, color lost";
const BOTH_GONE = "Color and shape, color lost";
const PANELS = [COLOR_ONLY, COLOR_GONE, BOTH_GONE];

const rows = PANELS.flatMap((panel) => points.map((d) => ({ ...d, panel })));

export const caption = `Color fails for boring reasons and it fails often: a laser printer, a projector with the contrast wrong, a document converted to greyscale, or one of roughly one man in twelve who cannot separate red from green. None of those is an edge case and none of them is visible from where you sit while making the chart. The three panels are the same four groups. The first uses color alone, which is what you get from passing a color argument and nothing else. The second is that chart with the color gone, which is what a reader in any of those situations actually receives: four groups, one cloud, nothing recoverable. The third used color and shape together, and it survives having the color removed because the shape was carrying the same information all along. That is redundant encoding, and "redundant" is doing something unusual here: in most engineering redundancy is waste, and in a chart it is what makes the chart robust, for the same reason a spare tyre is. The costs are small and worth knowing. Shape is a weak channel, so it handles four or five groups and not twelve, telling shapes apart is a search rather than a glance, and the marks have to be big enough to have a shape at all, which rules it out for a dense scatter of thousands of points.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 40,
    marginRight: 18,
    marginBottom: 56,
    ariaLabel: title,
    x: { label: null, domain: [1.1, 8.1], ticks: [] },
    y: { label: null, domain: [0.9, 7.4], ticks: [] },
    fx: { label: null, domain: PANELS },
    marks: [
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
      // Panel 1: color carries the group, marks are all circles.
      Plot.dot(
        rows.filter((d) => d.panel === COLOR_ONLY),
        { fx: "panel", x: "x", y: "y", r: 3.6, fill: "color", fillOpacity: 0.8 },
      ),
      // Panel 2: the same chart after the color is gone.
      Plot.dot(
        rows.filter((d) => d.panel === COLOR_GONE),
        { fx: "panel", x: "x", y: "y", r: 3.6, fill: MUTED, fillOpacity: 0.7 },
      ),
      // Panel 3: shape was carrying the group too, so it still reads.
      Plot.dot(
        rows.filter((d) => d.panel === BOTH_GONE),
        {
          fx: "panel",
          x: "x",
          y: "y",
          r: 3.4,
          symbol: "symbol",
          stroke: MUTED,
          strokeWidth: 1.3,
          fill: "none",
        },
      ),
      Plot.text([{ panel: COLOR_GONE }], {
        fx: "panel",
        x: 4.6,
        y: 0.9,
        text: () => "four groups in here\nsomewhere",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: 22,
        ...HALO,
      }),
      Plot.text([{ panel: BOTH_GONE }], {
        fx: "panel",
        x: 4.6,
        y: 0.9,
        text: () => "still four groups",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 22,
        ...HALO,
      }),
      Plot.text([{ panel: COLOR_ONLY }], {
        fx: "panel",
        x: 4.6,
        y: 0.9,
        text: () => "what you drew",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 22,
        ...HALO,
      }),
      // A key for panel 3, since shape needs one in a way color does not.
      Plot.dot(
        GROUPS.map((g, i) => ({ ...g, panel: BOTH_GONE, kx: 1.55 + i * 0.0, ky: 7.1 - i * 0.55 })),
        {
          fx: "panel",
          x: "kx",
          y: "ky",
          r: 3.4,
          symbol: "symbol",
          stroke: MUTED,
          strokeWidth: 1.3,
          fill: "none",
        },
      ),
      Plot.text(
        GROUPS.map((g, i) => ({ ...g, panel: BOTH_GONE, kx: 1.55, ky: 7.1 - i * 0.55 })),
        {
          fx: "panel",
          x: "kx",
          y: "ky",
          text: "key",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
    ],
  });
}
