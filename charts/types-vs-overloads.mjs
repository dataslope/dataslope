/**
 * What a type parameter is actually saving you.
 *
 * Without generics, a function that works over several types has to be written
 * once per type, and the count is combinatorial in the number of type
 * positions: one parameter costs `n` signatures, two independent parameters
 * cost `n²`, three cost `n³`. A generic function costs one, whatever `n` is,
 * and stays one when a new type is added.
 *
 * The interesting number is not the height of the curve, it is that the
 * generic line is *flat*. Adding a type to the union means writing nothing:
 * the `n²` line is the maintenance cost that shows up six months later, not
 * the typing cost today.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Signatures needed to cover a growing set of types, on a logarithmic scale. Hand-written overloads rise as n for one type parameter and as n squared for two, while a single generic signature stays flat at one.";

const MAX_N = 12;
const AT = 8;

const SHAPES = [
  { key: "Overloads, one type position", f: (n) => n, color: SERIES[1] },
  { key: "Overloads, two type positions", f: (n) => n * n, color: ACCENT },
  { key: "One generic signature", f: () => 1, color: SERIES[0] },
];

const rows = SHAPES.flatMap((s) =>
  Array.from({ length: MAX_N }, (_, i) => ({ key: s.key, color: s.color, n: i + 1, count: s.f(i + 1) })),
);

export const caption = `A function over \`n\` types needs \`n\` hand-written overloads; one over two independent type positions needs \`n²\`. At ${AT} types that is ${AT} and ${AT * AT} signatures against one generic. The height is not really the point: the generic line is flat, so adding a type to the union costs nothing, while the other two lines are the cost that arrives six months later when somebody does.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 62,
    marginRight: 176,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Types to support (n)", labelAnchor: "center", domain: [1, MAX_N], ticks: 6 },
    y: {
      label: "Signatures to write and maintain",
      type: "log",
      domain: [0.8, 160],
      ticks: [1, 10, 100],
    },
    marks: [
      Plot.line(rows, { x: "n", y: "count", z: "key", stroke: "color", strokeWidth: 2 }),
      ...SHAPES.map((s) =>
        Plot.text([{}], {
          x: MAX_N,
          y: Math.max(s.f(MAX_N), 1),
          text: () => s.key,
          fill: s.color,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: 1.4,
        y: 40,
        text: () => "one line is flat, and that is\nthe whole argument",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
