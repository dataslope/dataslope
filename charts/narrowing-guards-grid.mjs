/**
 * Which members of a union survive which guard, including the two guards that
 * do not do what they look like they do.
 *
 * Narrowing is usually taught guard by guard, which hides the two cases that
 * actually cost people an afternoon. `typeof x === "object"` keeps `null`,
 * because `typeof null` has been `"object"` since 1995 and cannot be changed
 * without breaking the web. And a truthiness check does not narrow a type at
 * all in the way people read it: it removes the *falsy values* of a type, so
 * `""` and `0` fall out of the branch while `string` and `number` remain,
 * which is how a legitimate empty string ends up in the error path.
 *
 * Drawn as a grid because the useful question is per pair, not per guard: the
 * reader arrives with a union and a branch and wants the cell.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A grid of narrowing guards against the members of a union, marking which members survive each guard. Two rows are marked as partial: typeof object keeps null, and a truthiness check keeps string and number but drops their falsy values.";

const MEMBERS = ["string", "number", "boolean", "null", "undefined", "Date", "string[]"];

/** keep: survives cleanly. partial: survives, but not the way the guard reads. */
const GUARDS = [
  { key: 'typeof x === "string"', keep: ["string"] },
  { key: 'typeof x === "number"', keep: ["number"] },
  {
    key: 'typeof x === "object"',
    keep: ["Date", "string[]"],
    partial: ["null"],
  },
  { key: "x instanceof Date", keep: ["Date"] },
  { key: "Array.isArray(x)", keep: ["string[]"] },
  { key: "x === null", keep: ["null"] },
  { key: "x != null", keep: ["string", "number", "boolean", "Date", "string[]"] },
  {
    key: "if (x)",
    keep: ["Date", "string[]"],
    partial: ["string", "number", "boolean"],
  },
];

const CELLS = GUARDS.flatMap((g, row) =>
  MEMBERS.map((m, col) => ({
    row,
    col,
    member: m,
    state: g.partial?.includes(m) ? "partial" : g.keep.includes(m) ? "keep" : "drop",
  })),
);

export const caption = `Each row is a guard, each column a member of \`string | number | boolean | null | undefined | Date | string[]\`, and each filled cell a member that survives into the branch. The two hatched rows are the ones that cost an afternoon: \`typeof x === "object"\` keeps \`null\`, because \`typeof null\` has been \`"object"\` since 1995 and cannot be changed without breaking the web; and \`if (x)\` removes *falsy values* rather than types, so \`string\` and \`number\` stay while \`""\` and \`0\` fall out of the branch. Prefer \`x != null\` when you mean "not nullish".`;

export function render() {
  return plot({
    height: 340,
    marginTop: 42,
    marginLeft: 176,
    marginRight: 24,
    marginBottom: 44,
    ariaLabel: title,
    x: {
      label: null,
      domain: [-0.5, MEMBERS.length - 0.5],
      ticks: MEMBERS.map((_, i) => i),
      tickFormat: (i) => MEMBERS[i],
      axis: "top",
    },
    y: {
      label: null,
      domain: [GUARDS.length - 0.5, -0.5],
      ticks: GUARDS.map((_, i) => i),
      tickFormat: (i) => GUARDS[i].key,
      grid: false,
    },
    marks: [
      Plot.rect(CELLS, {
        x1: (d) => d.col - 0.42,
        x2: (d) => d.col + 0.42,
        y1: (d) => d.row - 0.36,
        y2: (d) => d.row + 0.36,
        fill: (d) => (d.state === "partial" ? ACCENT : d.state === "keep" ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.state === "drop" ? 0.1 : d.state === "partial" ? 0.42 : 0.45),
      }),
      Plot.text(CELLS.filter((d) => d.state === "partial"), {
        x: "col",
        y: "row",
        text: () => "?",
        fill: ACCENT,
        fontSize: 13,
        fontWeight: 700,
        ...HALO,
      }),
      // Under the grid rather than over it: the column labels live in the
      // top margin, and a legend there lands on "null" and "undefined".
      Plot.text([{}], {
        x: -0.5,
        y: GUARDS.length - 0.5,
        text: () => "?  survives, but not the way the guard reads",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: 26,
        ...HALO,
      }),
    ],
  });
}
