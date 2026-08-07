/**
 * The same series in three aspect ratios, because the shape of a line chart is
 * a choice the author makes and the reader cannot see.
 *
 * Nothing about the data changes across the three. Squeezed narrow, the cycle
 * looks like a violent oscillation; stretched wide, the same cycle is gentle
 * ripple on a rising line. The middle one banks the average slope to somewhere
 * near 45°, which is Cleveland's rule and roughly where people judge slope
 * differences best.
 *
 * Laid out by hand rather than with `fx`, because Plot divides a facet's width
 * equally among its panels and unequal width is the entire subject. Each panel
 * gets its own slice of one continuous x axis and the series is mapped into
 * it; the y scale is genuinely shared, which is what keeps the three
 * comparable.
 */
import { Plot, plot, linspace, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "One time series drawn three times at different widths on a shared vertical scale. In the narrow panel the twelve-month cycle looks like a violent oscillation; in the wide panel the same cycle is a gentle ripple on a rising line.";

export const caption =
  "The same numbers three times, on the same vertical scale. Aspect ratio is not a cosmetic setting: it decides whether a cycle reads as noise or as a crisis. Banking the average slope to about 45 degrees, as the middle one does, is the usual rule.";

const N = 60;
const TS = linspace(0, N - 1, N);
const value = (t) => 100 + 1.1 * t + 9 * Math.sin((2 * Math.PI * t) / 12);

// Panel extents in x-axis units, chosen so the three widths differ by roughly
// 4x end to end. The gaps between them are the gutters.
const PANELS = [
  { key: "Too narrow", x0: 0, x1: 13 },
  { key: "Banked to about 45°", x0: 21, x1: 55 },
  { key: "Too wide", x0: 63, x1: 128 },
];

const rows = PANELS.flatMap((p) =>
  TS.map((t) => ({
    panel: p.key,
    x: p.x0 + (t / (N - 1)) * (p.x1 - p.x0),
    value: value(t),
  })),
);

const Y = [88, 172];

export function render() {
  return plot({
    height: 320,
    marginTop: 44,
    marginLeft: 46,
    marginRight: 16,
    marginBottom: 30,
    ariaLabel: title,
    x: { label: null, domain: [0, 128], ticks: [], grid: false },
    y: { label: "Value", domain: Y, ticks: 4 },
    marks: [
      ...PANELS.map((p) =>
        Plot.rect([{}], {
          x1: p.x0,
          x2: p.x1,
          y1: Y[0],
          y2: Y[1],
          fill: "none",
          stroke: "currentColor",
          strokeOpacity: 0.14,
        }),
      ),
      Plot.lineY(rows, {
        x: "x",
        y: "value",
        z: "panel",
        stroke: PRIMARY,
        strokeWidth: 1.75,
      }),
      Plot.text(PANELS, {
        x: (d) => (d.x0 + d.x1) / 2,
        y: Y[1],
        text: "key",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        dy: -14,
        ...HALO,
      }),
    ],
  });
}
