/**
 * Why the rainbow color map is the wrong default: it invents boundaries the
 * data does not have, and hides ones it does.
 *
 * Both rows encode the same smooth ramp from 0 to 100. The sequential row gets
 * steadily darker, so equal steps in the value look like equal steps in the
 * color and the reader can rank any two patches. The rainbow row has sharp
 * perceptual edges where the hue turns (cyan into green, yellow into orange)
 * and long flat stretches in between, so a gradual slope reads as a series of
 * bands and two very different values in the green stretch look alike.
 *
 * The lightness track underneath is the reason. Sequential lightness falls
 * monotonically, which is what makes it orderable; the rainbow's rises and
 * falls, so it carries no order at all and disappears entirely in greyscale or
 * for a reader with a color vision deficiency.
 */
import { Plot, plot, linspace, HALO, MUTED } from "./_theme.mjs";

export const literalColorsAllowed =
  "The two color maps are the subject of the chart, so their swatches have to " +
  "be the actual sRGB values under discussion rather than theme roles. The " +
  "chrome around them still uses the tokens and follows the page theme.";

export const title =
  "Two color ramps for the same values from 0 to 100. The sequential ramp darkens smoothly and evenly. The rainbow ramp has abrupt hue boundaries and flat stretches. Beneath each, a line tracks its lightness: the sequential one falls steadily, the rainbow one rises and falls.";

export const caption =
  "The same values, two color maps. A sequential ramp's lightness falls steadily, so equal steps in the data look like equal steps in the color. The rainbow's does not, so it invents edges where the data is smooth and flattens differences where it is not.";

const N = 120;
const XS = linspace(0, 100, N);

/** Both ramps are written as explicit stops and interpolated in sRGB, so the
 *  figure is exactly what the two color maps do rather than an impression of
 *  them. Literal colors would normally be banned here (see the guard in
 *  scripts/build-charts.mjs), but a chart *about* two specific color maps has
 *  to show those colors; they are the data. */
const SEQUENTIAL = ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"];
const RAINBOW = ["#4400ff", "#00b4ff", "#00e05a", "#e8e000", "#ff7700", "#e00000"];

function ramp(stops, t) {
  const scaled = t * (stops.length - 1);
  const i = Math.min(Math.floor(scaled), stops.length - 2);
  const f = scaled - i;
  const parse = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const [r1, g1, b1] = parse(stops[i]);
  const [r2, g2, b2] = parse(stops[i + 1]);
  const mix = (a, b) => Math.round(a + (b - a) * f);
  return [mix(r1, r2), mix(g1, g2), mix(b1, b2)];
}

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
/** Relative luminance, the quantity that makes a ramp orderable at a glance. */
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const RAMPS = [
  { key: "Sequential", stops: SEQUENTIAL },
  { key: "Rainbow", stops: RAINBOW },
];

const patches = RAMPS.flatMap((r, row) =>
  XS.map((x, i) => {
    const rgb = ramp(r.stops, i / (N - 1));
    // A hair of overlap: adjacent rects rounded to 2dp by the build's
    // coordinate pass leave sub-pixel gaps that render as vertical seams
    // across what is meant to be a continuous ramp.
    const step = 100 / (N - 1);
    return { row, x1: x, x2: x + step * 1.3, color: hex(rgb), light: luminance(rgb) };
  }),
);

// Layout in row units: a color band, then its lightness track underneath.
const BAND_TOP = 0.06;
const BAND_H = 0.34;
const TRACK_TOP = 0.52;
const TRACK_H = 0.4;
const rowBase = (row) => row * 1.12;

export function render() {
  return plot({
    height: 330,
    marginTop: 30,
    marginLeft: 96,
    marginRight: 122,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Value", labelAnchor: "center", domain: [0, 100], ticks: 5 },
    y: {
      label: null,
      domain: [-0.12, rowBase(1) + 1.0],
      ticks: [rowBase(0) + 0.24, rowBase(1) + 0.24],
      tickFormat: (v) => (v < 0.8 ? "Sequential" : "Rainbow"),
      grid: false,
      reverse: true,
    },
    marks: [
      Plot.rect(patches, {
        x1: "x1",
        x2: "x2",
        y1: (d) => rowBase(d.row) + BAND_TOP,
        y2: (d) => rowBase(d.row) + BAND_TOP + BAND_H,
        fill: "color",
      }),
      // The lightness track, drawn under its own band.
      Plot.lineY(patches, {
        x: (d) => (d.x1 + d.x2) / 2,
        y: (d) => rowBase(d.row) + TRACK_TOP + (1 - d.light) * TRACK_H,
        z: "row",
        stroke: MUTED,
        strokeWidth: 1.75,
      }),
      Plot.text(
        RAMPS.map((r, row) => ({ row })),
        {
          x: 100,
          y: (d) => rowBase(d.row) + TRACK_TOP + TRACK_H / 2,
          text: (d) => (d.row === 0 ? "lightness falls\nsteadily" : "lightness wanders:\nno order to read"),
          fill: MUTED,
          fontSize: 11.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 10,
          ...HALO,
        },
      ),
    ],
  });
}
