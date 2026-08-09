/**
 * The other half of deferred execution: a query is a recipe, and a recipe runs
 * every time you read it.
 *
 * Laziness is usually sold on what it avoids, and the bill arrives when the
 * same `IEnumerable<T>` is enumerated more than once. Each `foreach`, each
 * `Count()`, each `Any()`, each interpolation into a string re-runs the whole
 * chain from the source, so a query used four times does its work four times
 * and hits the database four times. `ToList()` collapses that to one pass and
 * a snapshot.
 *
 * The two lines are the two failure modes, which is why neither materialising
 * everything nor materialising nothing is the rule. A deferred query used once
 * is free and a materialised one has paid for a list it did not need; a
 * deferred query used five times costs five times what it looks like it costs,
 * and it is the *look* that makes this a bug rather than a trade-off.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Source passes against the number of times a query is enumerated. The deferred query rises one pass per enumeration; the materialised list stays flat at one, and the two cross after the first use.";

const MAX = 6;
const CROSS = 1;

const rows = Array.from({ length: MAX + 1 }, (_, n) => [
  { key: "Deferred (IEnumerable)", n, passes: n },
  { key: "Materialised (ToList)", n, passes: n === 0 ? 0 : 1 },
]).flat();

export const caption = `Every \`foreach\`, \`Count()\`, \`Any()\` and string interpolation over the same \`IEnumerable<T>\` re-runs the whole chain from the source, which against a database means one round trip each. \`ToList()\` collapses that to a single pass and a snapshot. The crossover is at ${CROSS} use, so the rule is neither "always materialise" nor "never": enumerate once and deferred is free, enumerate ${MAX} times and the query costs ${MAX} times what it looks like it costs. It is the *look* that makes this a bug rather than a trade-off.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 22,
    marginRight: 158,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Times the query is enumerated", labelAnchor: "center", domain: [0, MAX], ticks: MAX + 1 },
    y: { label: "Passes over the source", domain: [0, MAX + 0.4], ticks: MAX + 1 },
    marks: [
      Plot.line(rows.filter((d) => d.key.startsWith("Deferred")), {
        x: "n",
        y: "passes",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.dot(rows.filter((d) => d.key.startsWith("Deferred")), {
        x: "n",
        y: "passes",
        fill: ACCENT,
        r: 3,
      }),
      Plot.line(rows.filter((d) => !d.key.startsWith("Deferred")), {
        x: "n",
        y: "passes",
        stroke: PRIMARY,
        strokeWidth: 2,
        curve: "step-after",
      }),
      Plot.ruleX([CROSS], { stroke: GUIDE, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: MAX,
        y: MAX,
        text: () => "Deferred\n(IEnumerable)",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MAX,
        y: 1,
        text: () => "Materialised\n(ToList)",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: CROSS,
        y: MAX * 0.72,
        text: () => "one use: deferred wins.\nafter that, it is a multiplier",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 12,
        ...HALO,
      }),
    ],
  });
}
