/**
 * What the F-ratio actually compares: the spread *between* the group means
 * against the spread *within* the groups.
 *
 * Both panels have the same three group means. The only thing that changes is
 * how noisy the groups are, and that alone flips the verdict — on the left the
 * gaps between the means are large compared with the scatter inside each
 * group, on the right they are lost in it. That is the entire content of the F
 * statistic, and it is why "the means are different" is not by itself a
 * finding.
 *
 * Faceting is legitimate: both panels plot the same measurement on the same
 * axis, and the shared scale is the point.
 *
 * The group axis is continuous rather than a band because each group is drawn
 * as a strip of dots, and offsetting them needs a per-point x. (`dx` is a
 * constant option in Plot, not a channel, so it cannot do the spreading.)
 */
import { Plot, plot, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two panels of three groups each, with identical group means of 96, 100 and 106. On the left the groups are tight and the means are clearly separated; on the right the same means sit inside heavily overlapping scatter.";

export const caption =
  "Identical group means in both panels. On the left the gaps between them are large next to the noise inside each group; on the right the same gaps are swamped by it. F is that comparison, which is why a difference in means says nothing until you know the spread.";

const GROUPS = [
  { name: "A", mu: 96 },
  { name: "B", mu: 100 },
  { name: "C", mu: 106 },
];

const PANELS = [
  { key: "Tight groups: F is large", sd: 3, seed: 811 },
  { key: "Noisy groups: F is small", sd: 12, seed: 977 },
];

const N = 27;
const HALF_WIDTH = 0.3;

const points = PANELS.flatMap((p) =>
  GROUPS.flatMap((g, gi) =>
    normalSamples(N, g.mu, p.sd, p.seed + gi * 31).map((v, i) => ({
      panel: p.key,
      group: g.name,
      value: v,
      // Nine columns per group, cycled, so the strip is even and deterministic.
      x: gi + (((i % 9) - 4) / 4) * HALF_WIDTH,
    })),
  ),
);

// The *population* means, not the sample means, so the two panels really do
// carry the identical three values the annotation claims. A sample mean would
// wobble a little between panels and quietly undercut the point.
const means = PANELS.flatMap((p) => GROUPS.map((g, gi) => ({ panel: p.key, x: gi, value: g.mu })));

export function render() {
  return plot({
    height: 330,
    marginTop: 34,
    marginLeft: 50,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: {
      label: null,
      domain: [-0.55, 2.55],
      ticks: [0, 1, 2],
      tickFormat: (i) => GROUPS[i].name,
    },
    y: { label: "Measured value", domain: [58, 142], ticks: 5 },
    marks: [
      Plot.dot(points, {
        x: "x",
        y: "value",
        fx: "panel",
        r: 2.4,
        fill: PRIMARY,
        fillOpacity: 0.45,
        stroke: null,
        clip: true,
      }),
      // Each group's mean, as a wide tick the eye can line up across panels.
      Plot.ruleY(means, {
        y: "value",
        x1: (d) => d.x - 0.42,
        x2: (d) => d.x + 0.42,
        fx: "panel",
        stroke: ACCENT,
        strokeWidth: 2.5,
      }),
      Plot.text([{ panel: PANELS[0].key }], {
        x: -0.5,
        y: 137,
        fx: "panel",
        text: () => "the same three group means in both panels",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
