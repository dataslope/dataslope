/**
 * The same misleading chart in a default template and in a clean one, so it is
 * obvious that the template changed nothing that mattered.
 *
 * A template sets fonts, gridlines, backgrounds and a palette. Those are worth
 * setting, and `simple_white` is a better default than most, which is exactly
 * why it is worth being clear about the boundary: a template cannot reach the
 * things that decide whether a chart is honest. The axis here starts at 88
 * rather than 0, so a two percent difference occupies most of the panel, and
 * that is true in both versions. Cleaning up the frame makes the exaggeration
 * *more* convincing, because the chart now looks careful.
 *
 * The list of what a template does not fix is short and worth keeping: a
 * truncated axis, the wrong mark for the question, a missing denominator, a
 * cherry-picked window, an ordering chosen after seeing the result, and a
 * title that states a conclusion the data does not support. All of those are
 * decisions in the call that builds the figure.
 *
 * The right panel is the same data on a zero baseline, which is the edit the
 * template was never going to make for you.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "One set of five near-identical bars drawn three ways: on a truncated axis in a busy template, on the same truncated axis in a clean template, and on a zero baseline where the differences turn out to be about two percent.";

// Single letters. Three panels of five categories leaves about 35px a label,
// which real names do not fit into and which is not what this chart is about.
const BARS = [
  { key: "A", v: 92.4 },
  { key: "B", v: 91.1 },
  { key: "C", v: 93.0 },
  { key: "D", v: 90.6 },
  { key: "E", v: 92.1 },
];

const CUT = 88;
const MAXV = Math.max(...BARS.map((d) => d.v));
const MINV = Math.min(...BARS.map((d) => d.v));
const SPREAD = ((MAXV - MINV) / MINV) * 100;

const BUSY = "Default template, axis at 88";
const CLEAN = "Clean template, axis at 88";
const HONEST = "Clean template, axis at 0";

/** The three panels differ in their y baseline, and a facet shares one y
 *  scale, so the bars are drawn in a shared 0-1 frame and each panel's own
 *  baseline is applied when the height is computed. */
const frac = (v, floor) => (v - floor) / (100 - floor);

const rows = [
  ...BARS.map((d, i) => ({ ...d, i, panel: BUSY, h: frac(d.v, CUT) })),
  ...BARS.map((d, i) => ({ ...d, i, panel: CLEAN, h: frac(d.v, CUT) })),
  ...BARS.map((d, i) => ({ ...d, i, panel: HONEST, h: frac(d.v, 0) })),
];

/** The junk in the first panel: gridlines every fiftieth, a border, and a
 *  shadow, none of which touches the baseline. */
const DENSE = Array.from({ length: 21 }, (_, i) => i / 20);

export const caption = `A template sets fonts, gridlines, backgrounds and a palette, and simple_white is a better default than most, which is why the boundary is worth stating: a template cannot reach anything that decides whether a chart is honest. The axis in the first two panels starts at ${CUT}, so a spread of ${SPREAD.toFixed(1)} percent fills the frame, and that is equally true before and after the cleanup. Tidying the furniture makes the exaggeration more convincing, not less, because the chart now looks careful. What a template does not fix: a truncated axis, the wrong mark for the question, a missing denominator, a cherry-picked window, an order chosen after seeing the result, and a title asserting something the data will not carry. Every one of those is a decision in the call that builds the figure. The third panel is the same numbers on a zero baseline, which is the edit no template was ever going to make for you.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 30,
    marginRight: 18,
    marginBottom: 52,
    ariaLabel: title,
    fx: { label: null, domain: [BUSY, CLEAN, HONEST] },
    x: {
      label: null,
      domain: [-0.6, BARS.length - 0.4],
      ticks: BARS.map((_, i) => i),
      tickFormat: (i) => BARS[i].key,
    },
    // The frame is a fraction of each panel's own range, so the axis is
    // labelled per panel by the text marks below rather than by ticks.
    y: { label: null, domain: [0, 1.12], ticks: [], grid: false },
    marks: [
      Plot.ruleY(DENSE, { fx: () => BUSY, stroke: MUTED, strokeOpacity: 0.4 }),
      Plot.frame({ fx: () => BUSY, stroke: MUTED, strokeOpacity: 0.85 }),
      Plot.rect(
        rows.filter((d) => d.panel === BUSY),
        {
          fx: "panel",
          x1: (d) => d.i - 0.28,
          x2: (d) => d.i + 0.44,
          y1: -0.02,
          y2: (d) => d.h - 0.02,
          fill: MUTED,
          fillOpacity: 0.5,
        },
      ),
      Plot.rect(rows, {
        fx: "panel",
        x1: (d) => d.i - 0.36,
        x2: (d) => d.i + 0.36,
        y1: 0,
        y2: "h",
        fill: (d) => (d.panel === HONEST ? PRIMARY : ACCENT),
        fillOpacity: 0.8,
      }),
      // Each panel's baseline, written where the ticks would be.
      ...[
        { panel: BUSY, floor: CUT },
        { panel: CLEAN, floor: CUT },
        { panel: HONEST, floor: 0 },
      ].map((p) =>
        Plot.text([{}], {
          fx: () => p.panel,
          frameAnchor: "top-left",
          text: () => `baseline ${p.floor}`,
          fill: p.floor === 0 ? MUTED : ACCENT,
          fontSize: 9.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 3,
          dy: 3,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        fx: () => HONEST,
        frameAnchor: "top-right",
        text: () => `${SPREAD.toFixed(1)}% apart`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        dx: -4,
        dy: 3,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
