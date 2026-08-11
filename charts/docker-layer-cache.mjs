/**
 * Why the order of lines in a Dockerfile decides how long your builds take.
 *
 * Layers are cached in order, and a change to any layer invalidates every layer
 * after it. The two panels are the same build with the dependency install
 * before and after the source copy. Put the source first and every code change
 * reinstalls the dependencies; put it last and the dependency layer is reused
 * until the manifest itself changes.
 *
 * The rebuilt time is the sum of the invalidated layers, computed from the
 * layer list, so the saving is arithmetic rather than a claim. The layers
 * themselves are the same in both; only their order differs.
 *
 * ── Why one bar per layer, and not one stacked bar per order ────────────────
 *
 * The first version drew each order as a single stacked bar, cached segments
 * faint and rebuilt segments solid. Two things went wrong with that. The
 * layers were unnamed, so a reader could see that more of the second bar was
 * solid but not *which* steps had moved or why that followed from the
 * ordering, which is the entire lesson. And four of the six layers are one to
 * fifteen seconds against a sixty-eight second install, so on a 120-second
 * axis they were slivers two to five pixels wide: the `COPY source` step, the
 * one line the reader is being asked to move, was invisible.
 *
 * A row per layer costs vertical space and buys back both. Every step is
 * named, the sequence reads top to bottom exactly as it does in the file, and
 * `COPY source` sitting second-from-top in one panel and fifth in the other is
 * the whole argument, visible without reading a word.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same six Docker layers in two orders, as one bar per layer on a shared seconds axis. In the panel where the source is copied last, a code change rebuilds only the final two layers, 17 seconds. In the panel where it is copied early, the dependency install falls after it and the same change rebuilds 86 seconds.";

/** Seconds per layer, in build order. */
const LAYERS = [
  { key: "FROM base", seconds: 2 },
  { key: "apt install", seconds: 24 },
  { key: "COPY manifest", seconds: 1 },
  { key: "install deps", seconds: 68 },
  { key: "COPY source", seconds: 2 },
  { key: "build", seconds: 15 },
];

const TRIGGER = "COPY source";

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
  const i = layers.findIndex((l) => l.key === TRIGGER);
  return layers.slice(i).reduce((s, l) => s + l.seconds, 0);
};

/** Positions are strings so the y scale is a band rather than a number line;
 *  the axis is off and the step name is drawn per bar, because the two panels
 *  put different steps at the same position and a shared facet scale can only
 *  hold one set of labels. */
const rows = ORDERS.flatMap((o) => {
  const from = o.layers.findIndex((l) => l.key === TRIGGER);
  return o.layers.map((l, i) => ({
    order: o.key,
    pos: String(i + 1),
    layer: l.key,
    seconds: l.seconds,
    invalidated: i >= from,
    trigger: l.key === TRIGGER,
  }));
});

const TOTALS = ORDERS.map((o) => ({ order: o.key, rebuilt: rebuilt(o.layers) }));
const GOOD = TOTALS[0].rebuilt;
const BAD = TOTALS[1].rebuilt;
const COLD = LAYERS.reduce((s, l) => s + l.seconds, 0);

export const caption = `The same six layers both times, so a cold build costs ${COLD}s either way. What differs is what a *code change* costs, and that is decided by one line's position: everything from \`${TRIGGER}\` downward is invalidated and rebuilt, everything above it is served from cache. Copy the source last and that is ${GOOD}s. Copy it before the dependency install and the install falls into the rebuilt half too, so the same one-character edit costs ${BAD}s, on every build, forever. Copy the manifest, install, then copy the source, in that order.`;

export function render() {
  return plot({
    height: 400,
    // Room for two things above the frame, not one: Plot hangs the facet titles
    // 23px above it, so the legend has to clear that or it prints through
    // "Source copied last".
    marginTop: 66,
    marginLeft: 30,
    marginRight: 30,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: ORDERS.map((o) => o.key) },
    x: { label: "Seconds", labelAnchor: "center", domain: [0, 82], ticks: 4 },
    y: { label: null, domain: rows.filter((r) => r.order === ORDERS[0].key).map((r) => r.pos), axis: null, padding: 0.52 },
    marks: [
      Plot.barX(rows, {
        fx: "order",
        y: "pos",
        x: "seconds",
        fill: (d) => (d.invalidated ? ACCENT : MUTED),
        // 0.5 rather than 0.3 for the cached bars: one SVG serves both themes,
        // and the muted token is a mid grey that all but vanishes at 0.3 on the
        // near-black page while still reading as clearly secondary at 0.5 on
        // white.
        fillOpacity: (d) => (d.invalidated ? 0.65 : 0.5),
        clip: true,
      }),
      Plot.text(rows, {
        fx: "order",
        y: "pos",
        x: 0,
        text: (d) => (d.trigger ? `${d.layer}  ←  the line that decides` : d.layer),
        fill: (d) => (d.trigger ? ACCENT : "currentColor"),
        fontSize: (d) => (d.trigger ? 11 : 10.5),
        fontWeight: 600,
        textAnchor: "start",
        dy: -13,
        ...HALO,
      }),
      Plot.text(rows, {
        fx: "order",
        y: "pos",
        x: "seconds",
        text: (d) => `${d.seconds}s`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 7,
        ...HALO,
      }),
      Plot.text(TOTALS, {
        fx: "order",
        frameAnchor: "bottom-right",
        text: (d) => `${d.rebuilt}s rebuilt on\na code change`,
        fill: (d) => (d.rebuilt > COLD / 2 ? ACCENT : PRIMARY),
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "end",
        dy: -4,
        ...HALO,
      }),
      Plot.text([{ order: ORDERS[0].key }], {
        fx: "order",
        frameAnchor: "top-left",
        text: () => "solid: rebuilt on a code change  ·  faint: served from cache",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: -44,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
