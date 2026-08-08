/**
 * Polymorphism against the `switch`, scored honestly in both directions.
 *
 * The usual telling is one-sided: scattering `switch (shape.kind)` across the
 * codebase means every new shape is an edit in every one of those places, and
 * a virtual method means one new class. True, and it is only half the table.
 * Turn it around and ask for a new *operation* over the existing types, and
 * the scores swap: one new function containing one new switch, against a new
 * method added to every class in the hierarchy.
 *
 * That symmetry has a name, the expression problem, and knowing it is what
 * turns "use polymorphism" from a slogan into a decision. Ask which axis moves
 * in your codebase. A drawing program grows shapes and its operations are
 * settled, so the classes win. A compiler's node types are fixed by the
 * grammar and it grows passes forever, so the switch wins, which is why
 * mature compilers are full of them and why languages keep adding pattern
 * matching.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Files touched to extend a program in two directions, under a switch-based design and a polymorphic one. Adding a type costs five files with switches and one with classes; adding an operation costs one file with switches and six with classes.";

const TYPES = 6;
const OPERATIONS = 5;

const rows = [
  { axis: "Add a new type", design: "switch on a tag", files: OPERATIONS },
  { axis: "Add a new type", design: "a class per type", files: 1 },
  { axis: "Add a new operation", design: "switch on a tag", files: 1 },
  { axis: "Add a new operation", design: "a class per type", files: TYPES },
];

export const caption = `A program with ${TYPES} types and ${OPERATIONS} operations over them. Adding a type means editing every switch (${OPERATIONS} files) or writing one class; adding an operation means writing one function or editing every class (${TYPES} files). The scores swap, which is the expression problem, and it turns "use polymorphism" from a slogan into a question: which axis actually moves here? A drawing program grows shapes and its operations are settled, so the classes win. A compiler's node types are fixed by the grammar while its passes grow forever, which is why mature compilers are full of switches and why languages keep adding pattern matching.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 132,
    marginRight: 158,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: ["Add a new type", "Add a new operation"] },
    x: { label: "Files you have to open", labelAnchor: "center", domain: [0, TYPES + 1], ticks: 7 },
    y: { label: null, domain: ["switch on a tag", "a class per type"], padding: 0.24, grid: false },
    marks: [
      Plot.barX(rows, {
        fy: "axis",
        y: "design",
        x: "files",
        fill: (d) => (d.files === 1 ? PRIMARY : ACCENT),
        fillOpacity: 0.7,
      }),
      Plot.text(rows, {
        fy: "axis",
        y: "design",
        x: "files",
        text: (d) => (d.files === 1 ? "1 file" : `${d.files} files`),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
