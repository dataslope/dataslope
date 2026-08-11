/**
 * Why `transform` is the property to animate: it is the only one of the two
 * that skips the expensive middle of the rendering pipeline.
 *
 * A browser turns a style change into pixels in four steps. Recalculate style,
 * work out where every box goes (layout), fill in the pixels (paint), and hand
 * the resulting layers to the compositor. Which steps run depends entirely on
 * *which property* changed. `left` is a layout input, so changing it re-runs
 * all four — for the element, and for everything whose position depends on it.
 * `transform` is applied when layers are composited, so it re-runs the first
 * and the last and skips the two in the middle.
 *
 * At 60 frames a second the whole pipeline has about 16.7 ms per frame, and
 * that budget is shared with everything else the page is doing. The point of
 * the figure is not that one bar is longer: it is *which* segments exist at
 * all, because the two missing ones are the two that scale with how much of
 * the page has to be reconsidered.
 *
 * The milliseconds are representative of a moderately complex page on a
 * mid-range device rather than a measurement of any particular one, and the
 * caption says so. The shape — two segments against four — is the claim.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "Per-frame cost of animating the left property against animating transform, broken into the four rendering steps. Animating left runs all four and totals about 17 milliseconds, past the 16.7 millisecond frame budget; animating transform runs only style and compositing and totals about two.";

/** The frame budget at 60fps. */
const FRAME_MS = 1000 / 60;

const STEPS = ["Recalculate style", "Layout", "Paint", "Composite"];
const STEP_COLOR = {
  "Recalculate style": SERIES[4],
  Layout: ACCENT,
  Paint: SERIES[1],
  Composite: PRIMARY,
};

const PROPS = [
  {
    key: "animating  left",
    note: "every step, every frame",
    ms: { "Recalculate style": 1.2, Layout: 8.4, Paint: 6.3, Composite: 1.1 },
  },
  {
    key: "animating  transform",
    note: "layout and paint never run",
    ms: { "Recalculate style": 0.9, Layout: 0, Paint: 0, Composite: 1.2 },
  },
];

const rows = PROPS.flatMap((p) =>
  STEPS.filter((s) => p.ms[s] > 0).map((step) => ({ key: p.key, step, ms: p.ms[step] })),
);

const total = (p) => STEPS.reduce((t, s) => t + p.ms[s], 0);
const TOTALS = PROPS.map((p) => ({ key: p.key, ms: total(p), note: p.note }));
const OVER = TOTALS[0];
const UNDER = TOTALS[1];

export const caption = `Four steps turn a style change into pixels. Animating ` + "`left`" + ` runs all four, about ${OVER.ms.toFixed(0)} ms here and past the ${FRAME_MS.toFixed(1)} ms a frame gets at 60fps; ` + "`transform`" + ` is applied at composite time, so layout and paint never run and the frame costs about ${UNDER.ms.toFixed(1)} ms.`;

/** Legend positions in data units. Plot's own swatch legend is a separate DOM
 *  node beside the figure, and the build inlines the `<svg>` alone, so a legend
 *  has to be drawn inside the plot. `dx` is a constant option rather than a
 *  channel, so the x offsets live in the data. */
//
// The `key` on each row is not decoration either: `y: PROPS[0].key` looks like
// it pins the mark to the first row and does not. A string passed to `y` is a
// *field name*, so Plot reads `d["animating  left"]`, finds undefined, and
// draws nothing at all. The row has to arrive in the data.
const LEGEND = [
  { step: "Recalculate style", x: 0.3 },
  { step: "Layout", x: 5.4 },
  { step: "Paint", x: 8.5 },
  { step: "Composite", x: 11.1 },
].map((d) => ({ ...d, key: PROPS[0].key }));

export function render() {
  return plot({
    height: 300,
    marginTop: 40,
    marginLeft: 148,
    marginRight: 132,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Milliseconds of main-thread work per frame",
      labelAnchor: "center",
      domain: [0, 21],
      ticks: 7,
    },
    y: { label: null, domain: PROPS.map((p) => p.key), padding: 0.46, grid: false },
    color: { domain: STEPS, range: STEPS.map((s) => STEP_COLOR[s]) },
    marks: [
      Plot.barX(rows, {
        y: "key",
        x: "ms",
        fill: "step",
        fillOpacity: 0.82,
        order: STEPS,
      }),
      // `fill` here is a *channel* carrying the step name, not a color string:
      // with a color scale in play, a function returning `var(--ds-chart-N)`
      // is looked up in the scale's domain, misses, and paints nothing.
      Plot.dot(LEGEND, {
        x: "x",
        y: "key",
        dy: -32,
        fill: "step",
        r: 3.5,
      }),
      Plot.text(LEGEND, {
        x: (d) => d.x + 0.32,
        y: "key",
        dy: -32,
        text: "step",
        fill: "step",
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleX([FRAME_MS], { stroke: MUTED, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{ key: PROPS[1].key }], {
        x: FRAME_MS,
        y: "key",
        text: () => `one frame at 60fps: ${FRAME_MS.toFixed(1)} ms`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
        dy: 30,
        ...HALO,
      }),
      Plot.text(TOTALS, {
        y: "key",
        x: "ms",
        text: (d) => `${d.ms.toFixed(1)} ms`,
        fill: (d) => (d.ms > FRAME_MS ? ACCENT : PRIMARY),
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        ...HALO,
      }),
      Plot.text(TOTALS, {
        y: "key",
        x: "ms",
        text: "note",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 9,
        dy: 15,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
