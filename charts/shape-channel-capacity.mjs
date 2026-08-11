/**
 * The same scatter encoded with three shapes and with seven, and the point at
 * which the shape channel stops working.
 *
 * Shape is a genuinely useful categorical channel: it survives greyscale
 * printing, it survives color vision deficiency, and it survives a marker
 * small enough that hue is hard to judge. What it does not survive is a long
 * list. Shape is *nominal only* (no shape is bigger than another) and it has
 * almost no capacity: three or four values read at a glance, five is work, and
 * past that the reader is doing lookups against a legend for every point.
 *
 * Both panels draw identical positions. The left one is grouped by species and
 * three marks are enough to tell them apart without looking away. The right
 * one is the same data after someone asked for it to be split by site as well,
 * which turns three shapes into seven and makes the chart unreadable while
 * appearing to add information.
 *
 * The fix is almost never a bigger symbol palette. It is faceting: give each
 * of the seven groups its own small panel and the shape channel is free again.
 */
import { Plot, plot, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "One scatter drawn twice with the same points: on the left three groups get three marker shapes and separate cleanly, on the right the same points split into seven groups and the shapes become impossible to tell apart.";

const u = rng(9021);

/** Three loose clusters, then a second, arbitrary split that has nothing to do
 *  with position, which is exactly how a chart ends up with seven shapes. */
const SPECIES = [
  { key: "Adelie", cx: 18.6, cy: 38.8 },
  { key: "Chinstrap", cx: 18.4, cy: 48.8 },
  { key: "Gentoo", cx: 15.0, cy: 47.5 },
];
const PAIRS = [
  ["Adelie", "Biscoe"],
  ["Adelie", "Dream"],
  ["Adelie", "Torgersen"],
  ["Chinstrap", "Dream"],
  ["Chinstrap", "Torgersen"],
  ["Gentoo", "Biscoe"],
  ["Gentoo", "Dream"],
];

const points = SPECIES.flatMap((s) => {
  const mine = PAIRS.filter((p) => p[0] === s.key);
  return Array.from({ length: 44 }, () => {
    const pair = mine[Math.min(mine.length - 1, Math.floor(u() * mine.length))];
    return {
      species: s.key,
      pair: `${pair[0]} / ${pair[1]}`,
      x: s.cx + (u() + u() + u() - 1.5) * 1.5,
      y: s.cy + (u() + u() + u() - 1.5) * 4.2,
    };
  });
});

const THREE = "Three shapes: read at a glance";
const SEVEN = "Seven shapes: read one at a time";

const rows = [
  ...points.map((d) => ({ ...d, panel: THREE, group: d.species })),
  ...points.map((d) => ({ ...d, panel: SEVEN, group: d.pair })),
];

/** Plot's filled symbol scheme has exactly seven members, which is a fair
 *  upper bound on the channel and well past a usable one. */
const SYMBOLS = ["circle", "square", "triangle", "diamond", "star", "cross", "wye"];
const DOMAIN = [
  ...SPECIES.map((s) => s.key),
  ...PAIRS.map((p) => `${p[0]} / ${p[1]}`),
];
const RANGE = DOMAIN.map((key, i) =>
  i < SPECIES.length ? SYMBOLS[i] : SYMBOLS[(i - SPECIES.length) % SYMBOLS.length],
);

export const caption = `Identical points, two encodings. Shape is a real categorical channel: it survives greyscale printing, color vision deficiency, and markers too small for hue to be judged. What it does not survive is a long list. Shape is nominal only, no shape is larger than another, and its capacity is roughly three or four values at a glance, five as work, and after that the reader is doing a legend lookup per point. The left panel is grouped by species; the right is the same chart after someone asked to split by site as well, which turns ${SPECIES.length} shapes into ${PAIRS.length} and destroys the chart while appearing to add information. The answer is almost never a bigger symbol palette. It is faceting: give each of the seven groups a small panel of its own and the shape channel is free again.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 34,
    marginLeft: 48,
    marginRight: 22,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: [THREE, SEVEN] },
    x: {
      label: "Bill depth (mm)",
      labelAnchor: "center",
      domain: [12.6, 22],
      ticks: 4,
    },
    y: { label: "Bill length (mm)", domain: [30, 60], ticks: 4 },
    symbol: { domain: DOMAIN, range: RANGE },
    marks: [
      Plot.dot(rows, {
        fx: "panel",
        x: "x",
        y: "y",
        symbol: "group",
        r: 3.4,
        fill: PRIMARY,
        fillOpacity: 0.75,
      }),
      // Checkable without a legend, which is the whole difference: on the left
      // every cluster is one mark, on the right every cluster is a mixture.
      Plot.text([{}], {
        fx: () => THREE,
        frameAnchor: "bottom-right",
        text: () => "one shape per cluster",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        dy: -6,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => SEVEN,
        frameAnchor: "bottom-right",
        text: () => "two or three shapes per cluster",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        dy: -6,
        ...HALO,
      }),
    ],
  });
}
