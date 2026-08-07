/**
 * Where the 5% goes: the same null distribution with a one-sided and a
 * two-sided rejection region.
 *
 * The pair makes the trade concrete. A one-sided test spends the whole budget
 * in one tail, so its cutoff is nearer the middle (1.645) and it detects an
 * effect in that direction more easily — at the price of being unable to
 * detect one in the other direction at all. The two-sided test splits the
 * budget, pushing the cutoff out to 1.96, and that difference is the entire
 * reason anyone is tempted to switch after seeing the data.
 *
 * Legitimately faceted: both panels are the same standard normal on the same
 * axis, and only the shaded region changes.
 */
import { Plot, plot, linspace, normalPdf, sidedText, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The standard normal null distribution drawn twice. The left panel shades only the upper 5% beyond 1.645; the right panel shades 2.5% in each tail, beyond plus and minus 1.96.";

export const caption =
  "The same 5% false-positive budget, spent two ways. Putting it all in one tail buys a nearer cutoff and more power in that direction, and gives up the ability to detect an effect the other way. Which one you use is decided before you see the data.";

const DOMAIN = [-4, 4];
const XS = linspace(DOMAIN[0], DOMAIN[1], 241);
const PEAK = normalPdf(0);

const PANELS = [
  { key: "One-sided, α = 0.05", crit: 1.645, sides: ["upper"] },
  { key: "Two-sided, α = 0.05", crit: 1.96, sides: ["upper", "lower"] },
];

const curve = PANELS.flatMap((p) => XS.map((x) => ({ panel: p.key, x, y: normalPdf(x) })));

const shaded = PANELS.flatMap((p) =>
  XS.filter(
    (x) =>
      (p.sides.includes("upper") && x >= p.crit) || (p.sides.includes("lower") && x <= -p.crit),
  ).map((x) => ({ panel: p.key, side: x > 0 ? "u" : "l", x, y: normalPdf(x) })),
);

const cuts = PANELS.flatMap((p) =>
  p.sides.map((s) => ({
    panel: p.key,
    side: s,
    x: s === "upper" ? p.crit : -p.crit,
    // Written out rather than formatted, so 1.645 keeps the third decimal the
    // lesson quotes while 1.96 does not gain a spurious one.
    label: `${s === "lower" ? "−" : ""}${p.crit}`,
  })),
);

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 24,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: "Test statistic", labelAnchor: "center", domain: DOMAIN, ticks: [-2, 0, 2] },
    y: { label: null, ticks: [], grid: false, domain: [0, PEAK * 1.26] },
    marks: [
      Plot.areaY(shaded, {
        x: "x",
        y: "y",
        z: (d) => `${d.panel}/${d.side}`,
        fx: "panel",
        fill: ACCENT,
        fillOpacity: 0.35,
      }),
      Plot.lineY(curve, { x: "x", y: "y", z: "panel", fx: "panel", stroke: PRIMARY, strokeWidth: 2 }),
      Plot.ruleX(cuts, {
        x: "x",
        fx: "panel",
        y1: 0,
        y2: (d) => normalPdf(d.x),
        stroke: ACCENT,
        strokeWidth: 1.5,
      }),
      ...sidedText(
        cuts,
        {
          side: (d) => (d.side === "lower" ? "end" : "start"),
          x: "x",
          fx: "panel",
          y: (d) => normalPdf(d.x),
          text: "label",
          fill: ACCENT,
          fontSize: 12,
          fontWeight: 600,
          ...HALO,
        },
        { start: { dx: 4, dy: -12 }, end: { dx: -4, dy: -12 } },
      ),
      Plot.text(
        PANELS.flatMap((p) =>
          p.sides.map((s) => ({
            panel: p.key,
            x: (s === "upper" ? 1 : -1) * (p.crit + 1.15),
            label: p.sides.length === 1 ? "5%" : "2.5%",
          })),
        ),
        {
          x: "x",
          fx: "panel",
          y: PEAK * 0.055,
          text: "label",
          fill: MUTED,
          fontSize: 12,
          fontWeight: 600,
          ...HALO,
        },
      ),
      Plot.ruleY([0], { fx: "panel", stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
