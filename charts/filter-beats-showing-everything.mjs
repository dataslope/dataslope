/**
 * Forty-two series drawn in full, and the same forty-two after a filter.
 *
 * "Show everything and let the reader decide" sounds fair and is not an
 * option, because a reader cannot decide anything from forty-two overlapping
 * lines. The left panel contains every number and communicates one fact, that
 * things generally went up, which is the only fact a tangle can carry. The
 * right panel shows five named series against a band holding the other
 * thirty-seven, and communicates the ranking, the crossover, and the one
 * series that fell while the rest rose.
 *
 * Nothing has been hidden in the sense that matters: the band is still the
 * excluded series, drawn as their range, and the filter rule is written on the
 * chart so a reader can ask for the rest. That is the difference between
 * filtering and cherry-picking, and it is entirely a matter of whether the
 * rule is stated and applies to everyone.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES, rng } from "./_theme.mjs";

export const title =
  "Forty-two series drawn as a single tangle, and the same data as five named lines against a shaded band containing the rest. Only the filtered version shows the ranking and the one series that fell.";

const MONTHS = 18;
const N = 42;
const u = rng(4517);

const NAMES = [
  "Northwind",
  "Peartree",
  "Halcyon",
  "Brightside",
  "Ridgeway",
  "Kestrel",
  "Foxglove",
  "Ambleside",
];

const series = Array.from({ length: N }, (_, s) => {
  const start = 20 + u() * 55;
  const drift = s === 3 ? -1.9 : (u() - 0.18) * 2.6;
  return {
    s,
    points: Array.from({ length: MONTHS }, (_, m) => ({
      m,
      v: Math.max(4, start + drift * m + (u() - 0.5) * 6),
    })),
  };
});

const finalOf = (d) => d.points.at(-1).v;
const ranked = [...series].sort((a, b) => finalOf(b) - finalOf(a));
const TOP = 4;
/** The four largest, plus the one that fell, which no size filter would keep
 *  and which is the reason the rule has two clauses. */
const faller = series.reduce((worst, d) =>
  finalOf(d) - d.points[0].v < finalOf(worst) - worst.points[0].v ? d : worst,
);
/** Only the survivors get names, because only they are named on the chart;
 *  the rest are a band and naming them would imply a legend that is not there. */
const KEPT = [...ranked.slice(0, TOP), faller]
  .filter((d, i, a) => a.findIndex((e) => e.s === d.s) === i)
  .map((d, i) => ({ ...d, name: NAMES[i] }));
const FALLER = KEPT.find((d) => d.s === faller.s);
const REST = series.filter((d) => !KEPT.some((k) => k.s === d.s));

/** Label positions, pushed apart where two series end within a few units of
 *  each other, since a direct label that overlaps its neighbour is no better
 *  than the legend it replaced. */
const MIN_GAP = 6.5;
const labels = [...KEPT]
  .sort((a, b) => finalOf(b) - finalOf(a))
  .reduce((acc, d) => {
    const want = finalOf(d);
    const prev = acc.at(-1);
    return [...acc, { ...d, y: prev ? Math.min(want, prev.y - MIN_GAP) : want }];
  }, []);

const ALL = "Everything: 42 lines";
const FEW = "Top four, plus the mover";

const allRows = series.flatMap((d) =>
  d.points.map((p) => ({ ...p, panel: ALL, s: d.s })),
);
const keptRows = KEPT.flatMap((d, i) =>
  d.points.map((p) => ({ ...p, panel: FEW, s: d.s, rank: i, name: d.name })),
);

/** The excluded series as a range rather than as nothing, so the filter is
 *  visible on the chart instead of only in the method. */
const band = Array.from({ length: MONTHS }, (_, m) => {
  const vs = REST.map((d) => d.points[m].v);
  return { m, lo: Math.min(...vs), hi: Math.max(...vs), panel: FEW };
});

const DROP = Math.round(FALLER.points[0].v - finalOf(FALLER));

export const caption = `"Show everything and let the reader decide" sounds fair and is not on offer, because nobody decides anything from ${N} overlapping lines. The left panel holds every number and carries one fact, that things generally went up, which is all a tangle can carry. The right panel names ${KEPT.length} series against a band holding the other ${REST.length}, and carries the ranking, the crossovers, and ${FALLER.name}, which fell ${DROP} while the rest rose. Nothing is hidden in the sense that matters: the band is the excluded series drawn as their range, and the rule, largest ${TOP} at the end plus the biggest mover, is written on the chart so a reader can ask for the rest. That is the whole difference between filtering and cherry-picking: whether the rule is stated, and whether it applied to everyone before you looked.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 34,
    marginLeft: 44,
    marginRight: 92,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [ALL, FEW] },
    x: { label: "Month", labelAnchor: "center", domain: [0, MONTHS - 1], ticks: 4 },
    y: { label: "Revenue (k)", domain: [0, 110], ticks: 4 },
    marks: [
      Plot.line(allRows, {
        fx: "panel",
        x: "m",
        y: "v",
        z: "s",
        stroke: PRIMARY,
        strokeWidth: 1,
        strokeOpacity: 0.45,
      }),
      Plot.areaY(band, {
        fx: "panel",
        x: "m",
        y1: "lo",
        y2: "hi",
        fill: MUTED,
        fillOpacity: 0.22,
      }),
      Plot.line(keptRows, {
        fx: "panel",
        x: "m",
        y: "v",
        z: "s",
        stroke: (d) => (d.s === FALLER.s ? ACCENT : SERIES[d.rank % SERIES.length]),
        strokeWidth: 2,
      }),
      // Direct labels in the right margin, which is what the filter bought.
      ...labels.map((d) =>
        Plot.text([{ m: MONTHS - 1, y: d.y }], {
          fx: () => FEW,
          x: "m",
          y: "y",
          text: () => d.name,
          fill:
            d.s === FALLER.s
              ? ACCENT
              : SERIES[KEPT.findIndex((k) => k.s === d.s) % SERIES.length],
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "start",
          dx: 7,
          ...HALO,
        }),
      ),
      Plot.text([{ at: MONTHS / 2 }], {
        fx: () => FEW,
        x: "at",
        y: band[Math.floor(MONTHS / 2)].lo,
        text: () => `the other ${REST.length}, as a range`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 12,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => ALL,
        frameAnchor: "bottom-left",
        text: () => "one fact: up",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        dy: -4,
        ...HALO,
      }),
    ],
  });
}
