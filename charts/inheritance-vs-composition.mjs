/**
 * The class-count argument for "favour composition over inheritance", which is
 * the one part of that advice you can put a number on.
 *
 * Model two independent axes with inheritance and you need a subclass per
 * combination, because a class has one parent and the axes have to be
 * flattened into a single chain: `LoggingCachingHttpRepository`,
 * `LoggingHttpRepository`, `CachingFileRepository`, and so on for every pair.
 * The count is the product. Model them as components that a class holds and
 * you write one per behaviour and combine them at run time. The count is the
 * sum.
 *
 * Products beat sums badly and quickly: four behaviours across four subjects
 * is sixteen classes against eight, and the sixteen have to be *written*,
 * whereas the eight are *combined*. That is also the honest limit of the
 * argument, and the reason the advice says "favour" rather than "never
 * inherit": at two by two the product is smaller than the sum, and a single
 * axis of genuine specialisation is what inheritance is for.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Classes needed to cover two independent axes of variation as the number of options on each axis grows. The inheritance line rises as the product; the composition line rises as the sum and stays nearly flat by comparison.";

const MAX = 8;
const AT = 4;

const rows = Array.from({ length: MAX }, (_, i) => {
  const n = i + 1;
  return [
    { key: "Subclass per combination", n, classes: n * n },
    { key: "One component per behaviour", n, classes: 2 * n },
  ];
}).flat();

export const caption = `Two independent axes, ${AT} options each. Inheritance flattens them into one chain, so you need a subclass per *combination*: ${AT * AT} classes with names like \`LoggingCachingHttpRepository\`. Components give one class per behaviour and combine them at run time: ${2 * AT}. Products beat sums quickly, and the ${AT * AT} have to be written while the ${2 * AT} are assembled. It is also why the advice is "favour composition" rather than "never inherit": at two by two the product is the smaller number, and a single axis of real specialisation is exactly what a base class is for.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 30,
    marginRight: 176,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Options on each axis", labelAnchor: "center", domain: [1, MAX], ticks: MAX },
    y: { label: "Classes to write", domain: [0, MAX * MAX + 6], ticks: 5 },
    marks: [
      Plot.line(rows.filter((d) => d.key.startsWith("Subclass")), {
        x: "n",
        y: "classes",
        stroke: ACCENT,
        strokeWidth: 2,
      }),
      Plot.line(rows.filter((d) => !d.key.startsWith("Subclass")), {
        x: "n",
        y: "classes",
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.dot([{ n: AT, classes: AT * AT }], { x: "n", y: "classes", fill: ACCENT, r: 4 }),
      Plot.dot([{ n: AT, classes: 2 * AT }], { x: "n", y: "classes", fill: PRIMARY, r: 4 }),
      Plot.text([{}], {
        x: MAX,
        y: MAX * MAX,
        text: () => "Subclass per\ncombination",
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
        y: 2 * MAX,
        text: () => "One component\nper behaviour",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: AT,
        y: AT * AT + 16,
        text: () => `4 × 4: ${AT * AT} classes against ${2 * AT}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
