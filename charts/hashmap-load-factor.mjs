/**
 * Where 0.75 comes from.
 *
 * A hash table's average probe length depends on how full it is, not on how
 * big it is, and the relationship is not linear: under open addressing with
 * linear probing the expected probes for an unsuccessful lookup are
 * `(1 + 1/(1−α)²)/2`, which is under 3 at α = 0.5, about 8.5 at 0.75, and
 * unbounded as α approaches 1. Separate chaining, which is what
 * `java.util.HashMap` uses, degrades far more gently: the average chain is
 * simply α, so a table at 90% capacity is still doing about one comparison.
 *
 * The default load factor is therefore a memory decision as much as a speed
 * one. `HashMap` resizes at 0.75 not because chaining falls apart there but
 * because the space it would save by waiting is small and the tail behaviour
 * (long chains, and the treeification that rescues them) is not worth
 * inviting. The chart shows both curves because the number people quote as a
 * universal constant belongs to only one of them.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Expected probes per lookup against load factor, for separate chaining and for open addressing with linear probing. Chaining rises gently towards two while open addressing turns almost vertical past three quarters full.";

const DEFAULT_LF = 0.75;

const alphas = Array.from({ length: 96 }, (_, i) => 0.01 + (i * 0.96) / 95);

const chaining = (a) => 1 + a / 2;
const linear = (a) => (1 + 1 / Math.pow(1 - a, 2)) / 2;

const rows = alphas.flatMap((a) => [
  { key: "Separate chaining", a, probes: chaining(a) },
  { key: "Open addressing, linear probing", a, probes: Math.min(linear(a), 40) },
]);

export const caption = `Average probe length depends on how *full* a table is, not how big. Under separate chaining, which is what \`HashMap\` uses, the average chain is the load factor itself, so even a table at 90% is doing about ${chaining(0.9).toFixed(1)} comparisons. Under open addressing it is ${linear(DEFAULT_LF).toFixed(1)} probes at ${DEFAULT_LF} and unbounded as the table fills. The 0.75 default is therefore a memory decision as much as a speed one: chaining does not fall apart there, but the space saved by waiting is small and the long-chain tail is not worth inviting. The number gets quoted as a universal constant; it belongs to one of these two curves.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 172,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Load factor (entries ÷ buckets)",
      labelAnchor: "center",
      domain: [0, 1],
      ticks: 5,
      tickFormat: (d) => d.toFixed(2),
    },
    y: { label: "Expected probes per lookup", domain: [0, 22], ticks: 5 },
    marks: [
      Plot.line(rows.filter((d) => d.key === "Separate chaining"), {
        x: "a",
        y: "probes",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => d.key !== "Separate chaining"), {
        x: "a",
        y: "probes",
        stroke: ACCENT,
        strokeWidth: 2,
        clip: true,
      }),
      Plot.ruleX([DEFAULT_LF], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: DEFAULT_LF,
        y: 20,
        text: () => "HashMap resizes here",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1,
        y: 16,
        text: () => "Open addressing,\nlinear probing",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 1,
        y: chaining(1),
        text: () => "Separate chaining",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
