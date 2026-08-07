/**
 * The memory hierarchy on a log scale, which is the only scale that can hold
 * it: the span from a register to a disk seek is seven orders of magnitude, and
 * on a linear axis every level but the last is a flat line on the floor.
 *
 * The second column is the reason this figure exists. Nanoseconds are not a
 * quantity anyone has intuition about, so each latency is also given scaled up
 * until an L1 hit takes one second, at which point a page fault to an SSD is
 * most of a day. Those scaled figures are computed from the nanosecond values
 * rather than typed, so the two columns cannot disagree.
 *
 * The numbers are the usual order-of-magnitude figures for a modern x86 server
 * (Jeff Dean's "latency numbers", updated for NVMe rather than spinning rust).
 * They are approximate by nature and the chart says so: what matters here is
 * the ratios, and the ratios are stable across every machine you will meet.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Memory access latency by level on a logarithmic scale, from under a nanosecond for a register to ten million nanoseconds for a network round trip, spanning seven orders of magnitude.";

/** Nanoseconds, order of magnitude. */
const LEVELS = [
  { name: "Register", ns: 0.3 },
  { name: "L1 cache", ns: 1 },
  { name: "L2 cache", ns: 4 },
  { name: "L3 cache", ns: 30 },
  { name: "Main memory", ns: 100 },
  { name: "NVMe SSD read", ns: 100_000 },
  { name: "Network round trip", ns: 10_000_000 },
];

const L1 = LEVELS.find((l) => l.name === "L1 cache").ns;

/** The same latency with an L1 hit stretched to one second. */
function human(ns) {
  const s = ns / L1;
  if (s < 1) return `${(s * 1000).toFixed(0)} ms`;
  if (s < 90) return `${s.toFixed(0)} s`;
  if (s < 5400) return `${(s / 60).toFixed(0)} min`;
  if (s < 172_800) return `${(s / 3600).toFixed(1)} hours`;
  return `${(s / 86_400).toFixed(0)} days`;
}

const rows = LEVELS.map((l) => ({ ...l, scaled: human(l.ns) }));
const SPREAD = Math.round(
  Math.log10(LEVELS[LEVELS.length - 1].ns / LEVELS[0].ns),
);

const scaledFor = (name) => rows.find((r) => r.name === name).scaled;

export const caption =
  `${SPREAD} orders of magnitude, which is why the axis is logarithmic: drawn linearly, every level but the last would sit flat on the floor. The right-hand column is the same figures with an L1 hit stretched to one second, where main memory is ${scaledFor("Main memory")} and an SSD read is ${scaledFor("NVMe SSD read")}. This is the whole reason cache locality is worth writing code around.`;

export function render() {
  return plot({
    height: 348,
    // Room above the first row for the "if L1 took one second" header, which
    // otherwise lands on the Register row's own figure.
    marginTop: 46,
    marginLeft: 132,
    marginRight: 96,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Latency (nanoseconds)",
      labelAnchor: "center",
      domain: [0.2, 3e7],
      ticks: [1, 100, 1e4, 1e6],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : d >= 1000 ? `${d / 1000}k` : String(d)),
    },
    y: { label: null, domain: rows.map((r) => r.name), padding: 0.28 },
    marks: [
      Plot.ruleY(rows, {
        y: "name",
        x1: 0.2,
        x2: "ns",
        stroke: GUIDE,
        strokeOpacity: 0.45,
        strokeWidth: 1,
      }),
      Plot.barX(rows, {
        y: "name",
        x1: 0.2,
        x2: "ns",
        fill: (d) => (d.ns >= 1e5 ? ACCENT : PRIMARY),
        fillOpacity: 0.5,
      }),
      Plot.dot(rows, { y: "name", x: "ns", fill: (d) => (d.ns >= 1e5 ? ACCENT : PRIMARY), r: 3.5 }),
      // The intuition column, hard against the right margin.
      Plot.text(rows, {
        y: "name",
        x: 3e7,
        text: "scaled",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 12,
        ...HALO,
      }),
      // Anchored to the top row and lifted clear of it: on any row inside the
      // frame this header covers that row's own figure.
      Plot.text([{ name: "Register" }], {
        y: "name",
        x: 3e7,
        text: () => "if L1 took\none second…",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 12,
        dy: -34,
        ...HALO,
      }),
      // In the empty upper right, where no bar reaches.
      Plot.text([{ name: "L2 cache" }], {
        y: "name",
        x: 3e7,
        text: () => `${SPREAD} orders of magnitude,\ntop to bottom`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
