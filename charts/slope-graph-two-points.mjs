/**
 * Ten things measured twice, and the one question a grouped bar chart cannot
 * answer.
 *
 * Two measurements per category is the most common comparison anybody makes:
 * before and after, last year and this year, control and treatment. The
 * default drawing is a pair of bars per category, and it is fine at what it
 * does. Read the left panel and you can say how big each value is, and roughly
 * whether each pair went up or down.
 *
 * Now try the question people actually have: *who overtook whom*. On the bars
 * that is ten separate comparisons, each one held in memory while you make the
 * next, and the answer arrives slowly if at all. On the slopegraph it is a
 * crossing. Two lines that cross changed places; two that do not, did not. The
 * eye does the whole thing at once, because a crossing is a shape and shapes
 * are free.
 *
 * That is the general rule the panel is here to teach. A chart's job is not to
 * show the numbers, it is to turn the reader's question into a shape. Rank
 * change is a crossing. Convergence is a narrowing. Something running away
 * from the pack is a line leaving a bundle. If the question you have is a
 * *comparison of comparisons*, bars will make you do it one at a time.
 *
 * The cost is real and small: a slopegraph gives up the zero baseline, so
 * absolute size is harder to read, and it needs the two ends labelled or the
 * reader cannot tell which end is which.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Eight product lines measured in two years, drawn as paired bars and as a slopegraph. On the bars a change in ranking is eight separate comparisons; on the slopegraph a line that crosses another is a pair that changed places, and four lines move three or more ranks.";

/** Illustrative figures: revenue by product line, in millions, two years
 *  apart. Spaced far enough apart at both ends that every line can carry its
 *  own label, which a slopegraph needs and a bar chart does not. */
const LINES = [
  { key: "Atlas", before: 64, after: 36 },
  { key: "Beacon", before: 56, after: 52 },
  { key: "Cedar", before: 50, after: 76 },
  { key: "Delta", before: 44, after: 28 },
  { key: "Ember", before: 38, after: 44 },
  { key: "Forge", before: 32, after: 68 },
  { key: "Grove", before: 26, after: 20 },
  { key: "Harbor", before: 20, after: 60 },
];

const BEFORE = "2022";
const AFTER = "2024";
const N = LINES.length;
const MAX = 84;

const rankOf = (field) => {
  const order = [...LINES].sort((a, b) => b[field] - a[field]).map((d) => d.key);
  return Object.fromEntries(order.map((k, i) => [k, i + 1]));
};
const R0 = rankOf("before");
const R1 = rankOf("after");
/** Highlighted only when the move is large enough to be the story. Coloring
 *  every line that shifted by one would light up the whole panel and say
 *  nothing. */
const BIG_MOVE = 3;
const moved = (d) => Math.abs(R0[d.key] - R1[d.key]) >= BIG_MOVE;
const MOVERS = LINES.filter(moved);
const CLIMBER = LINES.reduce((a, b) =>
  R0[b.key] - R1[b.key] > R0[a.key] - R1[a.key] ? b : a,
);
/** Pairs that actually swapped order, which is what a crossing is. */
const CROSSINGS = LINES.flatMap((a, i) =>
  LINES.slice(i + 1).filter(
    (b) => Math.sign(a.before - b.before) !== Math.sign(a.after - b.after),
  ),
).length;

const BARS = panel(0, { y: [0, MAX] });
const SLOPE = panel(1, { y: [0, MAX] });

const BAR_W = 0.34; // of a slot, so a pair fills about seventy per cent of it

const barRows = LINES.flatMap((d, i) => {
  const c = BARS.band(i, N);
  const w = BARS.bandWidth(N) * BAR_W;
  return [
    { key: d.key, when: BEFORE, x1: c - w, x2: c, y: BARS.py(d[`before`]) },
    { key: d.key, when: AFTER, x1: c, x2: c + w, y: BARS.py(d.after) },
  ];
});

const SLOPE_LEFT = SLOPE.left + 0.11;
const SLOPE_RIGHT = SLOPE.right - 0.055;
const slopeRows = LINES.flatMap((d) => [
  { key: d.key, x: SLOPE_LEFT, y: SLOPE.py(d.before), moved: moved(d) },
  { key: d.key, x: SLOPE_RIGHT, y: SLOPE.py(d.after), moved: moved(d) },
]);

export const caption = `Two measurements per category is the most ordinary comparison there is, and paired bars are the default drawing for it. They are fine at what they do: read the left panel and you can say how big each value is. Now ask the question people actually have, which is who overtook whom. On the bars that is eight separate comparisons held in memory one at a time. On the slopegraph it is a crossing: ${CROSSINGS} pairs swapped order and ${MOVERS.length} lines moved three ranks or more. ${CLIMBER.key} climbed ${R0[CLIMBER.key] - R1[CLIMBER.key]} places, which you can see without reading either number. The general rule is worth more than the example: a chart's job is to turn the reader's question into a shape. Rank change is a crossing, convergence is a narrowing, a runaway is a line leaving the bundle. What the slopegraph gives up is the zero baseline, so absolute size is harder to read, and both ends have to be labelled or nobody knows which is which.`;

export function render() {
  return plot({
    height: 360,
    marginTop: 24,
    marginLeft: 30,
    marginRight: 72,
    marginBottom: 30,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(BARS, { ticks: [0, 20, 40, 60, 80] }),
      panelTitle(BARS, "Paired bars: how big is each?"),
      panelTitle(SLOPE, "Slopegraph: who overtook whom?"),

      // ── the bars ──────────────────────────────────────────────────────────
      Plot.rect(barRows, {
        x1: "x1",
        x2: "x2",
        y1: BARS.py(0),
        y2: "y",
        fill: (d) => (d.when === BEFORE ? MUTED : PRIMARY),
        fillOpacity: (d) => (d.when === BEFORE ? 0.45 : 0.8),
      }),
      Plot.text(
        LINES.map((d, i) => ({ key: d.key, x: BARS.band(i, N) })),
        {
          x: "x",
          y: BARS.py(0),
          text: (d) => d.key.slice(0, 1),
          fill: "currentColor",
          fillOpacity: 0.55,
          fontSize: 10,
          textAnchor: "middle",
          dy: 13,
        },
      ),

      // ── the slopegraph ────────────────────────────────────────────────────
      Plot.line(slopeRows, {
        x: "x",
        y: "y",
        z: "key",
        stroke: (d) => (d.moved ? ACCENT : MUTED),
        strokeOpacity: (d) => (d.moved ? 0.9 : 0.4),
        strokeWidth: 1.8,
      }),
      Plot.dot(slopeRows, {
        x: "x",
        y: "y",
        r: 3.2,
        fill: (d) => (d.moved ? ACCENT : MUTED),
        fillOpacity: (d) => (d.moved ? 0.9 : 0.5),
      }),
      Plot.text(
        LINES.map((d) => ({ ...d, y: SLOPE.py(d.after), moved: moved(d) })),
        {
          x: SLOPE_RIGHT,
          y: "y",
          text: (d) => `${d.after}   ${d.key}`,
          fill: (d) => (d.moved ? ACCENT : MUTED),
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.text(
        LINES.map((d) => ({ ...d, y: SLOPE.py(d.before), moved: moved(d) })),
        {
          x: SLOPE_LEFT,
          y: "y",
          text: (d) => `${d.key}   ${d.before}`,
          fill: (d) => (d.moved ? ACCENT : MUTED),
          fillOpacity: 0.8,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "end",
          dx: -8,
          ...HALO,
        },
      ),
      Plot.text(
        [
          { x: SLOPE_LEFT, label: BEFORE },
          { x: SLOPE_RIGHT, label: AFTER },
        ],
        {
          x: "x",
          y: SLOPE.bottom,
          text: "label",
          fill: "currentColor",
          fillOpacity: 0.62,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 14,
        },
      ),
      Plot.text([{}], {
        x: (SLOPE_LEFT + SLOPE_RIGHT) / 2,
        y: SLOPE.py(MAX),
        text: () => "every crossing is a pair changing places",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -2,
        ...HALO,
      }),
    ],
  });
}
