/**
 * One set of five numbers encoded seven ways, so "channel" stops being a word
 * and becomes something you can look at.
 *
 * Every chart is a choice of channel, and most people meet the choice already
 * made: a bar chart is length, a scatter is position, a pie is angle, a
 * heatmap is color value. Laying the same five numbers out across all seven
 * makes two things visible at once. The first is that they are genuinely
 * interchangeable, in the sense that each row is a complete and correct
 * encoding of the data. The second is that they are nothing like equally good,
 * which is what the Cleveland-McGill ranking measures and what the ordering of
 * these rows follows.
 *
 * Try the same question on each row: which is the third largest? Position and
 * length answer it before the question is finished. Angle and area take a
 * moment and some people get it wrong. Color value takes longer and gets it
 * wrong more often. Hue and shape cannot answer it at all, because neither has
 * an order for a reader to consult, which is not a matter of difficulty.
 */
import { Plot, plot, ACCENT, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "The same five values encoded seven ways in seven rows: position, length, angle, area, color value, color hue and shape, ordered from the most accurate channel to the least.";

const VALUES = [
  { key: "A", v: 34 },
  { key: "B", v: 78 },
  { key: "C", v: 52 },
  { key: "D", v: 96 },
  { key: "E", v: 61 },
];

const MAX = Math.max(...VALUES.map((d) => d.v));
const ranked = [...VALUES].sort((a, b) => b.v - a.v);
const THIRD = ranked[2];

const W = 680;
const H = 360;

const ROWS = [
  { key: "Position", note: "accurate" },
  { key: "Length", note: "accurate" },
  { key: "Angle", note: "approximate" },
  { key: "Area", note: "approximate" },
  { key: "Color value", note: "approximate" },
  { key: "Color hue", note: "no order at all" },
  { key: "Shape", note: "no order at all" },
];

const LABEL_X = 104;
const X0 = 122;
const SLOT = 104;
const Y0 = 40;
const STEP = 44;
const cx = (i) => X0 + SLOT * i + SLOT / 2;
const cy = (r) => Y0 + STEP * r;

const cells = ROWS.flatMap((row, r) =>
  VALUES.map((d, i) => ({ ...d, row: row.key, r, i, x: cx(i), y: cy(r) })),
);

const at = (name) => cells.filter((c) => c.row === name);

/** Angle: a wedge of a fixed circle, which is the pie chart's channel taken
 *  out of the pie so it can be compared with the others. */
const wedge = (c, radius) => {
  const a = -Math.PI / 2 + (c.v / MAX) * 2 * Math.PI * 0.92;
  return [
    `M ${c.x} ${c.y}`,
    `L ${c.x} ${c.y - radius}`,
    `A ${radius} ${radius} 0 ${c.v / MAX > 0.55 ? 1 : 0} 1 ${c.x + radius * Math.cos(a)} ${c.y + radius * Math.sin(a)}`,
    "Z",
  ].join(" ");
};

const SYMBOLS = ["circle", "square", "triangle", "diamond", "star"];

export const caption = `Every chart is a choice of channel, and most people meet the choice already made: a bar chart is length, a scatter is position, a pie is angle, a heatmap is color value. The same five numbers across all seven show two things at once. They are genuinely interchangeable, in that each row is a complete and correct encoding. They are also nothing like equally good, which is what the Cleveland-McGill ranking measures and what the order of these rows follows. Run one question down the page: which is third largest? Position and length answer before the question is finished. Angle and area take a moment and some readers miss it. Color value takes longer and misses more often. Hue and shape cannot answer it at all, because neither carries an order for a reader to consult, and that is a property of the channel rather than a matter of difficulty. The answer, for the record, is ${THIRD.key}.`;

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 16,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 16,
    ariaLabel: title,
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    // Radii below are pixel values, not data to be rescaled.
    r: { type: "identity" },
    marks: [
      Plot.text(
        ROWS.map((row, r) => ({ ...row, y: cy(r) })),
        {
          x: LABEL_X,
          y: "y",
          text: "key",
          fill: MUTED,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "end",
        },
      ),
      Plot.text(
        ROWS.map((row, r) => ({ ...row, y: cy(r) })),
        {
          x: W - 12,
          y: "y",
          text: "note",
          fill: (d) => (d.note === "no order at all" ? ACCENT : MUTED),
          fontSize: 10,
          textAnchor: "end",
        },
      ),
      Plot.text(VALUES.map((d, i) => ({ ...d, x: cx(i) })), {
        x: "x",
        y: 16,
        text: "key",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "middle",
      }),

      // Position: one axis, one dot.
      Plot.link(at("Position"), {
        x1: (d) => d.x - 34,
        x2: (d) => d.x + 34,
        y1: "y",
        y2: "y",
        stroke: MUTED,
        strokeOpacity: 0.35,
      }),
      Plot.dot(at("Position"), {
        x: (d) => d.x - 34 + (d.v / MAX) * 68,
        y: "y",
        r: 4,
        fill: PRIMARY,
      }),

      // Length: a bar from a shared baseline.
      Plot.rect(at("Length"), {
        x1: (d) => d.x - 34,
        x2: (d) => d.x - 34 + (d.v / MAX) * 68,
        y1: (d) => d.y - 7,
        y2: (d) => d.y + 7,
        fill: PRIMARY,
        fillOpacity: 0.8,
      }),

      // Angle and area, both drawn as paths through a render transform, since
      // Plot has no arc mark.
      Plot.frame({
        stroke: "none",
        render: (index, scales, values, dimensions, context) => {
          const { document } = context;
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          for (const c of at("Angle")) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", c.x);
            circle.setAttribute("cy", c.y);
            circle.setAttribute("r", 15);
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", "var(--ds-chart-muted)");
            circle.setAttribute("stroke-opacity", "0.35");
            g.appendChild(circle);
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", wedge(c, 15));
            path.setAttribute("fill", "var(--ds-chart-1)");
            path.setAttribute("fill-opacity", "0.75");
            g.appendChild(path);
          }
          return g;
        },
      }),

      // Area: radius as the square root of the value, which is the only
      // scaling that makes area proportional.
      Plot.dot(at("Area"), {
        x: "x",
        y: "y",
        r: (d) => 4 + Math.sqrt(d.v / MAX) * 12,
        fill: PRIMARY,
        fillOpacity: 0.65,
      }),

      // Color value: one hue, luminance carrying the number.
      Plot.rect(at("Color value"), {
        x1: (d) => d.x - 16,
        x2: (d) => d.x + 16,
        y1: (d) => d.y - 11,
        y2: (d) => d.y + 11,
        fill: PRIMARY,
        fillOpacity: (d) => 0.08 + (d.v / MAX) * 0.85,
      }),

      // Color hue: distinct hues, which encode identity and not magnitude.
      Plot.rect(at("Color hue"), {
        x1: (d) => d.x - 16,
        x2: (d) => d.x + 16,
        y1: (d) => d.y - 11,
        y2: (d) => d.y + 11,
        fill: (d) => SERIES[d.i % SERIES.length],
        fillOpacity: 0.85,
      }),

      // Shape: nominal, and the row where the question has no answer.
      Plot.dot(at("Shape"), {
        x: "x",
        y: "y",
        r: 7,
        symbol: (d) => SYMBOLS[d.i % SYMBOLS.length],
        fill: PRIMARY,
        fillOpacity: 0.8,
      }),
    ],
  });
}
