/**
 * The four set-preserving SQL joins as one reusable Venn diagram.
 *
 * A join operates on rows rather than abstract sets, so the diagram is an
 * intentionally narrow explanation of which unmatched keys survive. It does
 * not imply that joins deduplicate keys or have set cardinality.
 */
import { Plot, plot, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Venn diagrams for inner, left, right, and full joins. Inner shades only the overlap; left shades the whole left set including the overlap; right shades the whole right set including the overlap; full shades both sets.";

export const caption =
  "The shaded region shows which keys can contribute rows to the result: **INNER** keeps the overlap, **LEFT** keeps all of A, **RIGHT** keeps all of B, and **FULL** keeps either side. This is a guide to unmatched-row preservation, not row counts: duplicate keys can still produce several result rows.";

const PANELS = ["INNER", "LEFT", "RIGHT", "FULL"];
const RADIUS = 0.82;
const LEFT_X = -0.42;
const RIGHT_X = 0.42;
const STEPS = 80;

function disk(panel, center, side) {
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const x = center - RADIUS + (2 * RADIUS * i) / STEPS;
    const halfHeight = Math.sqrt(Math.max(0, RADIUS ** 2 - (x - center) ** 2));
    return { panel, side, x, y1: -halfHeight, y2: halfHeight };
  });
}

function outline(panel, center, side) {
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const angle = (2 * Math.PI * i) / STEPS;
    return { panel, side, x: center + RADIUS * Math.cos(angle), y: RADIUS * Math.sin(angle) };
  });
}

const disks = PANELS.flatMap((panel) => [
  ...disk(panel, LEFT_X, "A"),
  ...disk(panel, RIGHT_X, "B"),
]);
const outlines = PANELS.flatMap((panel) => [
  ...outline(panel, LEFT_X, "A"),
  ...outline(panel, RIGHT_X, "B"),
]);
const selectedDisks = disks.filter(
  (d) =>
    d.panel === "FULL" ||
    (d.panel === "LEFT" && d.side === "A") ||
    (d.panel === "RIGHT" && d.side === "B"),
);

// Take the tighter boundary of the circles at each x to form their lens.
const innerLens = Array.from({ length: STEPS + 1 }, (_, i) => {
  const start = RIGHT_X - RADIUS;
  const x = start + ((LEFT_X + RADIUS - start) * i) / STEPS;
  const leftHalf = Math.sqrt(Math.max(0, RADIUS ** 2 - (x - LEFT_X) ** 2));
  const rightHalf = Math.sqrt(Math.max(0, RADIUS ** 2 - (x - RIGHT_X) ** 2));
  const halfHeight = Math.min(leftHalf, rightHalf);
  return { panel: "INNER", x, y1: -halfHeight, y2: halfHeight };
});

const labels = PANELS.flatMap((panel) => [
  { panel, x: LEFT_X - 0.43, y: 0, text: "A" },
  { panel, x: RIGHT_X + 0.43, y: 0, text: "B" },
]);

export function render() {
  return plot({
    height: 230,
    marginTop: 30,
    marginRight: 8,
    marginBottom: 8,
    marginLeft: 8,
    ariaLabel: title,
    // Join names belong above their diagrams. Plot facets default to a bottom
    // axis, which made the labels look like a detached footer.
    fx: { label: null, domain: PANELS, padding: 0.12, axis: "top" },
    x: { axis: null, domain: [-1.38, 1.38] },
    y: { axis: null, domain: [-1.05, 1.05], grid: false },
    marks: [
      Plot.areaY(disks, {
        fx: "panel", x: "x", y1: "y1", y2: "y2", z: "side",
        fill: MUTED, fillOpacity: 0.09,
      }),
      Plot.areaY(selectedDisks, {
        fx: "panel", x: "x", y1: "y1", y2: "y2", z: "side",
        fill: PRIMARY, fillOpacity: 0.42,
      }),
      Plot.areaY(innerLens, {
        fx: "panel", x: "x", y1: "y1", y2: "y2",
        fill: PRIMARY, fillOpacity: 0.62,
      }),
      Plot.line(outlines, {
        fx: "panel", x: "x", y: "y", z: "side",
        stroke: MUTED, strokeWidth: 1.5,
      }),
      Plot.text(labels, {
        fx: "panel", x: "x", y: "y", text: "text",
        fill: "currentColor", fontWeight: 700,
      }),
    ],
  });
}
