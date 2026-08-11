/**
 * Which visual channels can carry which kinds of data, as a grid rather than a
 * paragraph.
 *
 * Two separate things decide whether a channel fits. The first is *capability*:
 * a channel that has no order (hue, shape) cannot carry an ordered quantity,
 * because there is no answer to "is green more than orange", and no legend
 * fixes that. The second is *accuracy*: position and length are read precisely,
 * angle and area only roughly, so a channel can be capable and still be the
 * wrong place for a number anyone has to compare.
 *
 * Reading the grid down a column gives the shortlist for a variable. Reading
 * it across a row shows why position is the channel to spend first: it is the
 * only one that carries every kind of data, while each of the weak channels
 * carries exactly one. Most bad charts are made by spending position on the
 * row label and something from the bottom of the grid on the measure.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A grid of seven visual channels against four kinds of data, marking each combination as accurate, workable or wrong. Position works for every kind; hue and shape work only for unordered categories.";

const TYPES = [
  { key: "Quantitative", note: "dollars, age" },
  { key: "Ordinal", note: "low, mid, high" },
  { key: "Nominal", note: "country, team" },
  { key: "Temporal", note: "dates" },
];

/** Ordered by accuracy, best first, which is also the order to spend them in. */
const CHANNELS = [
  { key: "Position", fit: ["best", "best", "ok", "best"] },
  { key: "Length", fit: ["best", "ok", "no", "no"] },
  { key: "Angle", fit: ["ok", "no", "no", "no"] },
  { key: "Area", fit: ["ok", "no", "no", "no"] },
  { key: "Color value", fit: ["ok", "best", "no", "ok"] },
  { key: "Color hue", fit: ["no", "no", "best", "no"] },
  { key: "Shape", fit: ["no", "no", "ok", "no"] },
];

const VERDICT = {
  best: { mark: "accurate", fill: PRIMARY, opacity: 0.72 },
  ok: { mark: "workable", fill: PRIMARY, opacity: 0.24 },
  no: { mark: "wrong", fill: ACCENT, opacity: 0.16 },
};

const cells = CHANNELS.flatMap((c, r) =>
  c.fit.map((verdict, t) => ({
    r,
    t,
    verdict,
    ...VERDICT[verdict],
    channel: c.key,
    type: TYPES[t].key,
  })),
);

const REACH = CHANNELS.map((c) => ({
  key: c.key,
  n: c.fit.filter((f) => f !== "no").length,
}));
const WIDEST = REACH[0];
const NARROW = REACH.filter((r) => r.n === 1).length;

export const caption = `Two separate things decide whether a channel fits. Capability comes first: a channel with no order of its own, hue or shape, cannot carry an ordered quantity, because there is no answer to "is green more than orange" and no legend supplies one. Accuracy comes second: position and length are read precisely, angle and area only roughly, so a channel can be capable and still be the wrong home for a number anyone has to compare. Read a column for the shortlist for one variable; read a row to see why ${WIDEST.key} is the channel to spend first, the only one of the ${CHANNELS.length} that carries all ${TYPES.length} kinds, while ${NARROW} of the others carry exactly one apiece. Most bad charts are made by spending position on the row label and something from the bottom of this grid on the measure.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 56,
    marginLeft: 96,
    marginRight: 20,
    marginBottom: 30,
    ariaLabel: title,
    x: {
      label: null,
      domain: [0, TYPES.length],
      ticks: TYPES.map((_, i) => i + 0.5),
      tickFormat: (v) => TYPES[Math.floor(v)].key,
      axis: "top",
      grid: false,
    },
    y: {
      label: null,
      domain: [CHANNELS.length, 0],
      ticks: CHANNELS.map((_, i) => i + 0.5),
      tickFormat: (v) => CHANNELS[Math.floor(v)].key,
      grid: false,
    },
    marks: [
      Plot.rect(cells, {
        x1: "t",
        x2: (d) => d.t + 1,
        y1: "r",
        y2: (d) => d.r + 1,
        fill: "fill",
        fillOpacity: "opacity",
        inset: 1.4,
      }),
      Plot.text(cells, {
        x: (d) => d.t + 0.5,
        y: (d) => d.r + 0.5,
        text: "mark",
        fill: (d) => (d.verdict === "no" ? ACCENT : MUTED),
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text(
        TYPES.map((t, i) => ({ ...t, i })),
        {
          x: (d) => d.i + 0.5,
          y: 0,
          text: "note",
          fill: MUTED,
          fontSize: 10,
          textAnchor: "middle",
          // Clear of the axis labels, which the top axis draws at y = 0 less
          // its own tick padding.
          dy: -28,
        },
      ),
    ],
  });
}
