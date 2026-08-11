/**
 * The α/β tradeoff: one threshold, two worlds.
 *
 * Stacked panels rather than the textbook's two overlapping curves. Overlaid,
 * the α tail is a sliver hiding under the alternative's much taller power
 * region, and three of the four labels end up fighting each other and the
 * x-axis for the same few hundred pixels. Split, each world gets its own
 * horizon, the shaded regions never occlude one another, and the critical
 * value is a single line running through both panels — which is the actual
 * point: *the same threshold* produces α up top and β below, so moving it
 * trades one for the other.
 *
 * Both error regions are the accent color and power is the primary series,
 * because α and β are the same kind of thing (mistakes) and power is not.
 */
import { Plot, plot, linspace, normalPdf, ACCENT, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two stacked panels sharing one x-axis. The upper panel shows the distribution of the test statistic when the null is true, with the tail beyond the critical value shaded as alpha, the false-positive rate. The lower panel shows the distribution when the effect is real, with the area before the critical value shaded as beta, the miss rate, and the area beyond it shaded as power.";

export const caption =
  "One threshold, two worlds. Sliding the critical value left catches more real effects (more power) at the cost of more false alarms; sliding it right does the reverse. Only a bigger sample shrinks both, by pulling the two curves apart.";

const EFFECT = 3; // the alternative's mean, in standard errors
const CRIT = 1.645; // one-sided α = 0.05
const DOMAIN = [-3.4, 6.6];
const PEAK = normalPdf(0);

const NULL_PANEL = "If H₀ is true";
const ALT_PANEL = "If the effect is real";

const density = (panel, mean) =>
  linspace(DOMAIN[0], DOMAIN[1], 201).map((x) => ({ panel, x, y: normalPdf(x, mean) }));

const nullCurve = density(NULL_PANEL, 0);
const altCurve = density(ALT_PANEL, EFFECT);

const alphaTail = nullCurve.filter((d) => d.x >= CRIT);
const betaRegion = altCurve.filter((d) => d.x <= CRIT);
const powerRegion = altCurve.filter((d) => d.x >= CRIT);

/** A label placed inside one panel, in that panel's own y units. */
const label = (panel, x, y, text, fill, anchor = "middle") => ({
  panel,
  x,
  y: PEAK * y,
  text,
  fill,
  anchor,
});

const LABELS = [
  label(NULL_PANEL, 2.75, 0.42, "α\nfalse alarm", ACCENT, "start"),
  label(ALT_PANEL, 0.55, 0.44, "β\nmiss it", ACCENT, "end"),
  label(ALT_PANEL, 3.4, 0.5, "power\ncatch it", PRIMARY, "start"),
];

// Panel names as in-frame text rather than an fy axis: Plot puts facet labels
// in a right-hand gutter, and these two need ~150px of margin that would
// otherwise squeeze the curves.
const PANEL_NAMES = [
  { panel: NULL_PANEL, fill: MUTED },
  { panel: ALT_PANEL, fill: PRIMARY },
];

export function render() {
  return plot({
    height: 420,
    marginTop: 16,
    marginLeft: 30,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Test statistic", labelAnchor: "center", domain: DOMAIN, ticks: 6 },
    y: { label: null, ticks: [], grid: false, domain: [0, PEAK * 1.12] },
    fy: { label: null, axis: null, domain: [NULL_PANEL, ALT_PANEL] },
    marks: [
      Plot.text(PANEL_NAMES, {
        x: DOMAIN[0],
        y: PEAK * 1.04,
        fy: "panel",
        text: "panel",
        fill: "fill",
        textAnchor: "start",
        fontSize: 12.5,
        fontWeight: 600,
      }),
      Plot.areaY(alphaTail, { x: "x", y: "y", fy: "panel", fill: ACCENT, fillOpacity: 0.5 }),
      Plot.areaY(betaRegion, { x: "x", y: "y", fy: "panel", fill: ACCENT, fillOpacity: 0.28 }),
      Plot.areaY(powerRegion, { x: "x", y: "y", fy: "panel", fill: PRIMARY, fillOpacity: 0.28 }),

      Plot.lineY(nullCurve, { x: "x", y: "y", fy: "panel", stroke: MUTED, strokeWidth: 1.75 }),
      Plot.lineY(altCurve, { x: "x", y: "y", fy: "panel", stroke: PRIMARY, strokeWidth: 1.75 }),

      // The threshold, drawn in both panels: the one thing the two worlds share.
      Plot.ruleX([CRIT], { stroke: "currentColor", strokeWidth: 1.5 }),
      Plot.text([{ panel: NULL_PANEL, x: CRIT }], {
        x: "x",
        y: PEAK * 1.04,
        fy: "panel",
        text: () => "critical value",
        fill: "currentColor",
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
      }),

      Plot.text(LABELS, {
        x: "x",
        y: "y",
        fy: "panel",
        text: "text",
        fill: "fill",
        textAnchor: "anchor",
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.25,
      }),
      Plot.ruleY([0], { fy: "panel", stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
