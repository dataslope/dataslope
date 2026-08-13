/**
 * Why this site keeps two palettes, measured.
 *
 * Every chart in these lessons draws from seven role tokens, and each token
 * has two values: one tuned to sit on white, one tuned to sit on near-black.
 * That looks like duplication until you measure it.
 *
 * Contrast ratio is the standard measure, from the WCAG formula: the ratio of
 * the relative luminances of two colors, running from 1:1 (identical) to
 * 21:1 (black on white). The threshold that matters for a chart is **3:1**,
 * which is what WCAG asks of a non-text graphical object a reader has to be
 * able to distinguish from its background.
 *
 * The left panel is what the site actually ships: each theme's own value on
 * its own ground. Everything clears the bar comfortably.
 *
 * The right panel is the shortcut, which is to pick one palette and use it on
 * both. Both directions fail, and they fail differently. The light palette on
 * a dark ground merely gets dim. The dark palette on a white ground collapses:
 * every one of the seven lands under 3:1, and the pale yellow ends at 1.25:1,
 * which is very close to invisible.
 *
 * The asymmetry is not a coincidence and is worth understanding, because it is
 * why "just brighten the colors for dark mode" is not a reversible operation.
 * Contrast against white is bounded by how *dark* a color is; contrast
 * against black by how *light* it is. A hue bright enough to glow on black is
 * by construction too light to sit on white, and there is no single value that
 * does both jobs well for any saturated hue.
 *
 * ── On the numbers ─────────────────────────────────────────────────────────
 *
 * Computed from this site's own tokens: the seven categorical roles in
 * `Chart.module.css`, resolved through the brand ramps in `brand.css`, against
 * the light surface (#ffffff) and the dark one (#121212), using the WCAG 2.1
 * relative-luminance formula.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "Contrast ratios for this site's seven chart colors. Used as designed, each theme's own value on its own background, all fourteen clear the 3:1 threshold. Swapped, so that one palette serves both backgrounds, all fourteen fall below it, and the dark palette on white bottoms out at 1.25 to 1.";

/**
 * Contrast of each role token against each surface. Two columns are the
 * shipping pairs and two are the swaps.
 *
 *   onOwn      the theme's own value on the theme's own ground
 *   swapped    the other theme's value on this ground
 */
const ROLES = [
  { role: "1", hue: "blue", light: 4.43, dark: 7.51, lightOnDark: 4.23, darkOnLight: 2.5 },
  { role: "2", hue: "orange", light: 4.08, dark: 8.0, lightOnDark: 4.59, darkOnLight: 2.34 },
  { role: "3", hue: "green", light: 4.47, dark: 9.86, lightOnDark: 4.19, darkOnLight: 1.9 },
  { role: "4", hue: "purple", light: 4.21, dark: 7.9, lightOnDark: 4.45, darkOnLight: 2.37 },
  { role: "5", hue: "teal", light: 5.11, dark: 8.77, lightOnDark: 3.67, darkOnLight: 2.14 },
  { role: "6", hue: "red", light: 4.33, dark: 7.71, lightOnDark: 4.33, darkOnLight: 2.43 },
  { role: "7", hue: "yellow", light: 5.04, dark: 14.93, lightOnDark: 3.72, darkOnLight: 1.25 },
];

const AS_BUILT = "Each theme's own palette";
const SWAPPED = "One palette on both grounds";
const THRESHOLD = 3;

const ORDER = ROLES.map((d) => d.hue);
const rows = ROLES.flatMap((d) => [
  { ...d, panel: AS_BUILT, lo: Math.min(d.light, d.dark), hi: Math.max(d.light, d.dark) },
  {
    ...d,
    panel: SWAPPED,
    lo: Math.min(d.lightOnDark, d.darkOnLight),
    hi: Math.max(d.lightOnDark, d.darkOnLight),
  },
]);

const COLOR = Object.fromEntries(ROLES.map((d, i) => [d.hue, SERIES[i]]));
const WORST = ROLES.reduce((a, b) => (b.darkOnLight < a.darkOnLight ? b : a));
const FAILING = ROLES.filter((d) => d.darkOnLight < THRESHOLD).length;

export const caption = `WCAG contrast ratios for the ${ROLES.length} chart color roles, each theme's own value on its own ground and then swapped. All fourteen clear the 3:1 line; swapped, all ${FAILING} dark-on-white values fail, with ${WORST.hue} bottoming out at ${WORST.darkOnLight.toFixed(2)}:1.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 22,
    marginBottom: 52,
    ariaLabel: title,
    x: {
      label: "Contrast ratio against the background",
      labelAnchor: "center",
      domain: [1, 16],
      ticks: [1, 3, 5, 10, 15],
      tickFormat: (d) => `${d}:1`,
    },
    y: { label: null, domain: ORDER, padding: 0.4, grid: false },
    fx: { label: null, domain: [AS_BUILT, SWAPPED] },
    marks: [
      Plot.ruleX([THRESHOLD], { stroke: ACCENT, strokeWidth: 1.25, strokeDasharray: "4,3" }),
      Plot.link(rows, {
        fx: "panel",
        y: "hue",
        x1: "lo",
        x2: "hi",
        stroke: (d) => COLOR[d.hue],
        strokeOpacity: 0.45,
        strokeWidth: 6,
        strokeLinecap: "round",
      }),
      Plot.dot(rows, {
        fx: "panel",
        y: "hue",
        x: "lo",
        r: 4.2,
        fill: (d) => COLOR[d.hue],
      }),
      Plot.dot(rows, {
        fx: "panel",
        y: "hue",
        x: "hi",
        r: 4.2,
        fill: (d) => COLOR[d.hue],
      }),
      Plot.text(
        rows.filter((d) => d.panel === SWAPPED),
        {
          fx: "panel",
          y: "hue",
          x: "lo",
          text: (d) => d.lo.toFixed(2),
          fill: ACCENT,
          fontSize: 10,
          fontWeight: 700,
          textAnchor: "end",
          dx: -8,
          ...HALO,
        },
      ),
      Plot.text([{ panel: SWAPPED, at: ORDER[6] }], {
        fx: "panel",
        y: "at",
        x: 16,
        text: () => "the dark palette on white: all seven fail",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "end",
        // Above the last row, since below it is the axis tick row.
        dy: -16,
        ...HALO,
      }),
      Plot.text([{ panel: AS_BUILT, at: ORDER.at(-1) }], {
        fx: "panel",
        y: "at",
        x: THRESHOLD,
        text: () => "3:1, the readable minimum",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 5,
        // Above the last row rather than below it: below is where the axis
        // ticks are, and the note landed on them.
        dy: -16,
        ...HALO,
      }),
    ],
  });
}
