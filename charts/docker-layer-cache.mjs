/**
 * Why the order of lines in a Dockerfile decides how long your builds take.
 *
 * Layers are cached in order, and a change to any layer invalidates every
 * layer after it. The two bars are the same build with the dependency install
 * before and after the source copy. Put the source first and every code change
 * reinstalls the dependencies; put it last and the dependency layer is reused
 * until the manifest itself changes.
 *
 * The rebuilt time is the sum of the invalidated layers, computed from the
 * layer list, so the saving is arithmetic rather than a claim. The layers
 * themselves are the same in both; only their order differs.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "The same Docker build in two layer orders, as stacked bars of seconds per layer, with the layers that a source change invalidates highlighted. Copying source before installing dependencies rebuilds far more than copying it after.";

/** Seconds per layer, in build order. */
const LAYERS = [
  { key: "FROM base", seconds: 2 },
  { key: "apt install", seconds: 24 },
  { key: "COPY manifest", seconds: 1 },
  { key: "install deps", seconds: 68 },
  { key: "COPY source", seconds: 2 },
  { key: "build", seconds: 15 },
];

/** Good order: source is copied as late as possible. Bad order: it comes
 *  before the dependency install, so a code change invalidates that too. */
const ORDERS = [
  { key: "Source copied last", layers: LAYERS },
  {
    key: "Source copied early",
    layers: [LAYERS[0], LAYERS[1], LAYERS[4], LAYERS[2], LAYERS[3], LAYERS[5]],
  },
];

const rebuilt = (layers) => {
  const i = layers.findIndex((l) => l.key === "COPY source");
  return layers.slice(i).reduce((s, l) => s + l.seconds, 0);
};

const rows = ORDERS.flatMap((o) => {
  const from = o.layers.findIndex((l) => l.key === "COPY source");
  return o.layers.map((l, i) => ({
    order: o.key,
    layer: l.key,
    seconds: l.seconds,
    invalidated: i >= from,
    position: i,
  }));
});

const GOOD = rebuilt(ORDERS[0].layers);
const BAD = rebuilt(ORDERS[1].layers);

export const caption =
  `Identical layers, identical total for a cold build. On a code change the cached layers before \`COPY source\` are reused and everything after it is rebuilt, so the order decides the bill: ${GOOD}s against ${BAD}s, on every single build. Copy the manifest, install, then copy the source, in that order.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 36,
    marginLeft: 148,
    marginRight: 126,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Seconds", labelAnchor: "center", domain: [0, 120], ticks: 5 },
    y: { label: null, domain: ORDERS.map((o) => o.key), padding: 0.44 },
    marks: [
      Plot.barX(rows, {
        x: "seconds",
        y: "order",
        fill: (d) => (d.invalidated ? ACCENT : SERIES[0]),
        fillOpacity: (d) => (d.invalidated ? 0.62 : 0.22),
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 1,
        order: "position",
      }),
      Plot.text(
        ORDERS.map((o) => ({ order: o.key, rebuilt: rebuilt(o.layers) })),
        {
          x: 120,
          y: "order",
          text: (d) => `${d.rebuilt}s rebuilt\non a code change`,
          fill: (d) => (d.rebuilt > 60 ? ACCENT : PRIMARY),
          fontSize: 10.5,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 10,
          ...HALO,
        },
      ),
      Plot.text([{}], {
        x: 0,
        frameAnchor: "top-left",
        text: () => "solid: rebuilt every time · faint: served from cache",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dy: -14,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
