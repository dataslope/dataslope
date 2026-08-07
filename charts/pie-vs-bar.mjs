/**
 * The same five shares as a pie and as a bar chart, so the cost of
 * `coord_polar()` is visible rather than asserted.
 *
 * A pie asks the reader to compare *angles*, which is one of the weakest
 * channels there is; a bar asks them to compare positions against a shared
 * baseline, which is the strongest. The two middle slices here differ by a
 * point and a half, and on the pie almost nobody can say which is bigger. The
 * bars answer it before you have finished reading the labels.
 *
 * This is not an argument against ever drawing one. A pie is fine for "is this
 * about a quarter or about a half", which is why the slices are labelled with
 * their shares: the figure is about *ranking*, and a pie that only has to
 * communicate a rough magnitude still does that.
 *
 * Two panels, hand-placed rather than faceted, because a pie has no x or y and
 * a bar chart has both; there is no shared scale for a facet to share.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Five shares drawn twice: as a pie, where the two middle slices look interchangeable, and as a bar chart, where their order is immediate. The shares are 31, 24, 22.5, 14 and 8.5 percent.";


const SHARES = [
  { label: "Sedan", value: 31 },
  { label: "SUV", value: 24 },
  { label: "Truck", value: 22.5 },
  { label: "Van", value: 14 },
  { label: "Coupe", value: 8.5 },
];

// The two the caption is about, computed rather than named, so a change to the
// data cannot leave the text pointing at the wrong pair.
const sorted = [...SHARES].sort((a, b) => b.value - a.value);
const CLOSEST = (() => {
  let best = { gap: Infinity, pair: [sorted[0], sorted[1]] };
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i].value - sorted[i + 1].value;
    if (gap < best.gap) best = { gap, pair: [sorted[i], sorted[i + 1]] };
  }
  return best;
})();

export const caption =
  `A pie asks you to compare angles, a bar chart to compare lengths against a shared baseline. Reading rank off angles is genuinely hard: ${CLOSEST.pair[0].label} and ${CLOSEST.pair[1].label} differ by ${CLOSEST.gap} points, and the pie hides that while the bars make it obvious.`;

const R = 78;
const CX = 148;
const CY = 150;

/** The pie, built as explicit wedge paths: Plot has no pie mark, and an arc
 *  drawn from a band scale would be a different chart. */
const wedges = (() => {
  const total = SHARES.reduce((s, d) => s + d.value, 0);
  let angle = -Math.PI / 2; // start at twelve o'clock, as ggplot2 does
  return SHARES.map((d, i) => {
    const span = (d.value / total) * 2 * Math.PI;
    const a0 = angle;
    const a1 = angle + span;
    angle = a1;
    const mid = (a0 + a1) / 2;
    const large = span > Math.PI ? 1 : 0;
    return {
      ...d,
      color: SERIES[i % SERIES.length],
      d: [
        `M ${CX} ${CY}`,
        `L ${CX + R * Math.cos(a0)} ${CY + R * Math.sin(a0)}`,
        `A ${R} ${R} 0 ${large} 1 ${CX + R * Math.cos(a1)} ${CY + R * Math.sin(a1)}`,
        "Z",
      ].join(" "),
      // Label position: outside the arc, on the wedge's bisector.
      lx: CX + (R + 22) * Math.cos(mid),
      ly: CY + (R + 22) * Math.sin(mid),
      anchor: Math.cos(mid) < -0.15 ? "end" : Math.cos(mid) > 0.15 ? "start" : "middle",
    };
  });
})();

export function render() {
  const bars = SHARES.map((d, i) => ({ ...d, color: SERIES[i % SERIES.length] }));

  return plot({
    height: 320,
    width: 680,
    marginTop: 34,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 24,
    ariaLabel: title,
    // A pixel-space frame: the pie is drawn in absolute coordinates, and the
    // bars are placed into the right half of the same frame.
    // No grid on either scale: this frame is pixels, not quantities, so a
    // gridline here would be a ruled line across a picture that has no units.
    x: { axis: null, grid: false, domain: [0, 680] },
    y: { axis: null, grid: false, domain: [320, 0] },
    marks: [
      Plot.text([{}], {
        x: CX,
        y: 18,
        text: () => "As a pie: which is second?",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "middle",
      }),
      // Plot has no pie mark, and a bare `{ render }` object is not a Mark
      // (it has no `initialize`), so the wedges ride on a real mark whose own
      // drawing is replaced: `render` on any mark is a render *transform*, and
      // returning a node of our own is the supported way to emit custom SVG.
      Plot.frame({
        stroke: "none",
        render: (index, scales, values, dimensions, context) => {
          const { document } = context;
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          for (const w of wedges) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", w.d);
            path.setAttribute("fill", w.color);
            path.setAttribute("fill-opacity", "0.55");
            path.setAttribute("stroke", "var(--ds-chart-surface)");
            path.setAttribute("stroke-width", "1.5");
            g.appendChild(path);
          }
          return g;
        },
      }),
      // One mark per anchor: `textAnchor` is a constant, so a function here is
      // stringified into the attribute and the labels all default to middle.
      ...["start", "middle", "end"].map((anchor) =>
        Plot.text(
          wedges.filter((w) => w.anchor === anchor),
          {
            x: "lx",
            y: "ly",
            text: (d) => `${d.label}\n${d.value}%`,
            fill: MUTED,
            fontSize: 10.5,
            fontWeight: 600,
            lineHeight: 1.25,
            textAnchor: anchor,
            ...HALO,
          },
        ),
      ),

      Plot.text([{}], {
        x: 420,
        y: 18,
        text: () => "As bars: immediately",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      // Bars in the right half, sorted, on a shared baseline at x = 420.
      Plot.rect(
        bars.map((d, i) => ({ ...d, i })),
        {
          x1: 420,
          x2: (d) => 420 + (d.value / sorted[0].value) * 200,
          y1: (d) => 54 + d.i * 46,
          y2: (d) => 54 + d.i * 46 + 26,
          fill: "color",
          fillOpacity: 0.55,
        },
      ),
      Plot.text(
        bars.map((d, i) => ({ ...d, i })),
        {
          x: 414,
          y: (d) => 54 + d.i * 46 + 13,
          text: "label",
          fill: MUTED,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "end",
        },
      ),
      Plot.text(
        bars.map((d, i) => ({ ...d, i })),
        {
          x: (d) => 426 + (d.value / sorted[0].value) * 200,
          y: (d) => 54 + d.i * 46 + 13,
          text: (d) => `${d.value}%`,
          fill: MUTED,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
        },
      ),
      Plot.text([{}], {
        x: 420,
        y: 296,
        text: () =>
          `${CLOSEST.pair[0].label} and ${CLOSEST.pair[1].label} differ by ${CLOSEST.gap} points`,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
