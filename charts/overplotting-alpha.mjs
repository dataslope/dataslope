/**
 * The same 4,000 points at full opacity and at a tenth of it.
 *
 * A dense scatter drawn opaque is a silhouette: every point after the first
 * few hundred lands on ink that is already there, so the plot stops carrying
 * information about density and shows only the outline of the cloud. Drop the
 * opacity and the same marks become a density estimate for free, and the two
 * clusters the left panel hides are simply there.
 *
 * The panels share their axes, which is what a facet is for here: identical
 * data, identical coordinates, one drawing parameter changed.
 */
import { Plot, plot, normalSamples, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same dense scatter plot drawn twice. At full opacity it is a solid blob with no internal structure; at ten percent opacity two distinct clusters and a sparse bridge between them are visible.";

export const caption =
  "Four thousand points, drawn opaque and then at a tenth of the opacity. Nothing about the data changed. Once marks overlap, opacity is what turns a silhouette back into a density.";

const N = 2000;

/** Two clusters plus a thin bridge, which is the structure the opaque panel
 *  destroys and the transparent one recovers. */
const cluster = (n, mx, my, sd, seed) => {
  const xs = normalSamples(n, mx, sd, seed);
  const ys = normalSamples(n, my, sd, seed + 7919);
  return xs.map((x, i) => ({ x, y: ys[i] }));
};

const DATA = [
  ...cluster(N, 3.2, 3.4, 0.85, 101),
  ...cluster(N, 6.6, 6.2, 0.85, 202),
  ...cluster(Math.round(N / 6), 5, 4.8, 1.5, 303),
];

const PANELS = [
  { key: "Opaque", opacity: 1 },
  { key: "10% opacity", opacity: 0.1 },
];

const points = PANELS.flatMap((p) => DATA.map((d) => ({ ...d, panel: p.key })));

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 44,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: PANELS.map((p) => p.key) },
    x: { label: "x", labelAnchor: "center", domain: [0, 10], ticks: 4 },
    y: { label: "y", domain: [0, 10], ticks: 4 },
    marks: [
      // One mark per panel: `fillOpacity` is a channel, but writing the two
      // out keeps the single changed parameter obvious in the source.
      ...PANELS.map((p) =>
        Plot.dot(
          points.filter((d) => d.panel === p.key),
          {
            x: "x",
            y: "y",
            fx: "panel",
            r: 2.6,
            fill: PRIMARY,
            fillOpacity: p.opacity,
            stroke: null,
            clip: true,
          },
        ),
      ),
      Plot.text([{ panel: "10% opacity" }], {
        x: 0.4,
        y: 9.4,
        fx: "panel",
        text: () => "two clusters, and a\nthin bridge between them",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.frame({ stroke: "currentColor", strokeOpacity: 0.12 }),
    ],
  });
}
