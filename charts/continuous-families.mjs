/**
 * Three continuous distributions a data scientist meets constantly, drawn to
 * the same scale so their shapes can be compared rather than described.
 *
 * The point is that "continuous" is not one shape. Uniform is flat and has
 * hard edges; exponential is highest at zero and decays, which is why waiting
 * times are never symmetric; normal is the symmetric bell everything else gets
 * compared against. All three are drawn with the same mean so the difference
 * on show is shape alone.
 */
import { Plot, plot, linspace, HALO, SERIES } from "./_theme.mjs";

export const title =
  "Three probability densities on one pair of axes, all with a mean of two: a flat uniform block, an exponential decaying from a peak at zero, and a symmetric normal bell.";

export const caption =
  "Three continuous distributions, all with the same mean of 2. The mean tells you nothing about which one you are holding, which is why shape has to be looked at rather than summarised.";

const DOMAIN = [0, 6];
const XS = linspace(DOMAIN[0], DOMAIN[1], 241);

const CURVES = [
  {
    label: "Uniform",
    color: SERIES[2],
    f: (x) => (x >= 0 && x <= 4 ? 0.25 : 0),
    labelAt: 3.1,
  },
  {
    label: "Exponential",
    color: SERIES[1],
    f: (x) => (x < 0 ? 0 : 0.5 * Math.exp(-0.5 * x)),
    labelAt: 0.85,
  },
  {
    label: "Normal",
    color: SERIES[0],
    f: (x) => Math.exp(-0.5 * ((x - 2) / 0.8) ** 2) / (0.8 * Math.sqrt(2 * Math.PI)),
    labelAt: 2,
  },
];

const curves = CURVES.flatMap((c) => XS.map((x) => ({ label: c.label, x, y: c.f(x) })));
const COLOR = Object.fromEntries(CURVES.map((c) => [c.label, c.color]));

export function render() {
  return plot({
    height: 330,
    marginTop: 28,
    ariaLabel: title,
    x: { label: "Value", labelAnchor: "center", domain: DOMAIN, ticks: 7 },
    y: { label: "Density", domain: [0, 0.62], ticks: 4 },
    marks: [
      Plot.lineY(curves, {
        x: "x",
        y: "y",
        z: "label",
        stroke: (d) => COLOR[d.label],
        strokeWidth: 2,
        curve: "linear",
      }),
      Plot.text(CURVES, {
        x: "labelAt",
        y: (d) => d.f(d.labelAt),
        text: "label",
        fill: (d) => d.color,
        fontSize: 12.5,
        fontWeight: 600,
        dy: -12,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
