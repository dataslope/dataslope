/**
 * `==` against `===` on the comparisons people actually trip over.
 *
 * The left grid is loose equality, which coerces before comparing, and the
 * right is strict, which does not. Strict equality is a diagonal: a value
 * equals itself and nothing else. Loose equality is not, and the off-diagonal
 * cells are the bugs: an empty string equals zero, `"0"` equals zero but not
 * the empty string, and `null` equals `undefined` while equalling nothing else.
 *
 * The one cell that is false on both diagonals is `NaN`, which is not equal to
 * itself under either operator, and is the reason `Number.isNaN` exists.
 *
 * Every cell is evaluated at build time rather than transcribed, so the table
 * is the language's behaviour rather than a recollection of it.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Two grids comparing the same seven JavaScript values under loose and strict equality. Strict equality is a clean diagonal; loose equality has several true cells off it.";

const VALUES = [
  { key: "0", v: 0 },
  { key: '""', v: "" },
  { key: '"0"', v: "0" },
  { key: "false", v: false },
  { key: "null", v: null },
  { key: "undefined", v: undefined },
  { key: "NaN", v: NaN },
];

const cells = ["==", "==="].flatMap((op) =>
  VALUES.flatMap((a) =>
    VALUES.map((b) => ({
      op,
      a: a.key,
      b: b.key,
      // Evaluated, not transcribed: the point is what the language does.
      equal: op === "==" ? a.v == b.v : a.v === b.v,
      diagonal: a.key === b.key,
    })),
  ),
);

const SURPRISES = cells.filter((c) => c.op === "==" && c.equal && !c.diagonal).length / 2;
const NAN = cells.find((c) => c.op === "===" && c.a === "NaN" && c.b === "NaN");

export const caption =
  `Strict equality is the diagonal and nothing else. Loose equality adds ${SURPRISES} more pairs, each of which is a real bug someone has shipped: an empty string equals zero, "0" equals zero but not the empty string, and null equals undefined while equalling nothing else. NaN is the cell that is false on both diagonals, ${NAN.equal ? "" : "even under ==="}, which is why Number.isNaN exists.`;

const KEYS = VALUES.map((v) => v.key);
const YES = SERIES[2];

export function render() {
  return plot({
    height: 340,
    marginTop: 60,
    marginLeft: 78,
    marginBottom: 26,
    ariaLabel: title,
    fx: { label: null, domain: ["==", "==="] },
    x: { label: null, domain: KEYS, axis: "top", tickRotate: -40, padding: 0.08 },
    y: { label: null, domain: KEYS, padding: 0.08 },
    marks: [
      Plot.cell(cells, {
        x: "b",
        y: "a",
        fx: "op",
        fill: (d) => (d.equal ? (d.diagonal ? YES : ACCENT) : MUTED),
        fillOpacity: (d) => (d.equal ? 0.4 : 0.12),
      }),
      Plot.text(
        cells.filter((c) => c.equal),
        {
          x: "b",
          y: "a",
          fx: "op",
          text: () => "=",
          fill: MUTED,
          fontSize: 12,
          fontWeight: 700,
          ...HALO,
        },
      ),
    ],
  });
}
