/**
 * CSS specificity as the three-digit number it is, which is the only way the
 * cascade's surprises stop being surprises.
 *
 * Specificity is a tuple: id count, then class/attribute/pseudo-class count,
 * then element count, compared left to right. That ordering is why no number
 * of classes ever beats one id, and why a long descendant selector full of
 * elements loses to a single class. The bars are the tuples, and the ordering
 * is the comparison.
 *
 * `!important` is drawn off the scale on purpose: it is not a higher
 * specificity, it is a different cascade origin that specificity never
 * reaches, and drawing it as a taller bar would teach the wrong model.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Selectors ranked by specificity, each shown as its id, class and element counts. One id outranks any number of classes, and any class outranks any number of elements.";

const SELECTORS = [
  { sel: "div p span", a: 0, b: 0, c: 3 },
  { sel: "ul li a:hover", a: 0, b: 1, c: 3 },
  { sel: ".card", a: 0, b: 1, c: 0 },
  { sel: ".card .title.large", a: 0, b: 3, c: 0 },
  { sel: "nav .menu a.active", a: 0, b: 2, c: 2 },
  { sel: "#header", a: 1, b: 0, c: 0 },
  { sel: "#header .nav a", a: 1, b: 1, c: 1 },
];

const score = (d) => d.a * 10000 + d.b * 100 + d.c;
const rows = [...SELECTORS]
  .map((d) => ({ ...d, score: score(d) }))
  .sort((x, y) => x.score - y.score);

const parts = rows.flatMap((r) => [
  { sel: r.sel, kind: "elements", value: r.c },
  { sel: r.sel, kind: "classes", value: r.b },
  { sel: r.sel, kind: "ids", value: r.a },
]);

const ONE_ID = rows.find((r) => r.sel === "#header");
const MANY_CLASSES = rows.find((r) => r.sel === ".card .title.large");

export const caption =
  `Specificity is compared left to right, not summed. \`${MANY_CLASSES.sel}\` has ${MANY_CLASSES.b} classes and still loses to \`${ONE_ID.sel}\`, because the id column is checked first and a single id ends the comparison. \`!important\` is not on this chart on purpose: it is a different cascade origin rather than a higher score, and drawing it as a taller bar would teach the wrong model.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 40,
    marginLeft: 148,
    marginRight: 96,
    marginBottom: 44,
    ariaLabel: title,
    x: { label: "Count in the selector", labelAnchor: "center", domain: [0, 5], ticks: 5 },
    y: { label: null, domain: rows.map((r) => r.sel), padding: 0.28 },
    color: { domain: ["ids", "classes", "elements"], range: [ACCENT, SERIES[1], SERIES[0]], legend: true },
    marks: [
      Plot.barX(parts, { x: "value", y: "sel", fill: "kind", fillOpacity: 0.55, order: ["ids", "classes", "elements"] }),
      Plot.text(rows, {
        x: 5,
        y: "sel",
        text: (d) => `${d.a}-${d.b}-${d.c}`,
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "monospace",
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.text([ONE_ID], {
        x: 1,
        y: "sel",
        text: () => "one id beats any number of classes",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
