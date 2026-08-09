/**
 * What a chart looks like when it prints every value, and what it looks like
 * when the values live in the hover layer instead.
 *
 * Hover is usually introduced as a feature, which makes it sound optional. It
 * is better understood as a second layer of the chart with its own job. The
 * printed layer answers "what is the shape" and has to be readable in a
 * glance; the hover layer answers "what exactly is this one" and only has to
 * exist when asked. Trying to make one layer do both is what produces the left
 * panel, where forty numbers are competing with the line that was the point.
 *
 * That split has a consequence people miss: the chart still has to work with
 * the hover layer switched off, because it is off in a screenshot, in a PDF,
 * in an email, and on every printed page. Anything a reader must know belongs
 * in the printed layer. Hover carries the row identifier, the units, the
 * secondary fields, the precision, and nothing the argument depends on.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

/** The 7.5px value labels are the subject: this chart exists to show what a
 *  panel looks like when every number is printed on it, and printing them at
 *  a readable size would be a different chart making the opposite point.
 *
 *  The exemption covers *only* that layer. Everything a reader is meant to
 *  read here — the axes, the annotation, the tooltip's own text — is at the
 *  authoring floor or above, so `legibleMinWidth` in scripts/build-charts.mjs
 *  sizes this chart from the floor rather than from the 7.5px: type that is
 *  deliberately illegible must not also decide how far the drawing shrinks. */
export const smallTypeAllowed =
  "the left panel's unreadably small value labels are the thing being shown";

export const title =
  "One series printed with a label on every point, where the numbers crowd out the line, and the same series clean with a single hover tooltip showing the detail for one point.";

const N = 34;
const u = rng(8802);

const series = Array.from({ length: N }, (_, i) => ({
  i,
  v: Math.round(
    (58 + Math.sin(i * 0.42) * 16 + i * 0.55 + (u() - 0.5) * 7) * 10,
  ) / 10,
}));

const LABELLED = "Everything printed";
const HOVERED = "Shape printed, detail on hover";

const rows = [LABELLED, HOVERED].flatMap((panel) =>
  series.map((d) => ({ ...d, panel })),
);

/** The point the tooltip is opened on: a local peak, since that is what a
 *  reader reaches for, and one far enough from the right edge that the box
 *  has somewhere to go. */
const FOCUS = series
  .filter((d) => d.i >= 6 && d.i <= 16)
  .reduce((a, b) => (a.v >= b.v ? a : b));
const DAY = (i) => `Day ${i + 1}`;

export const caption = `Hover is usually introduced as a feature, which makes it sound optional. It is better understood as a second layer with its own job. The printed layer answers "what is the shape" and has to survive a glance; the hover layer answers "what exactly is this one" and only has to exist when asked. Making one layer do both produces the left panel, where ${N} numbers compete with the line that was the point. The split has a consequence that gets missed: the chart still has to work with the hover layer switched off, because it is off in a screenshot, in a PDF, in an email and on paper. Anything the reader must know belongs in the printed layer. Hover carries the row's name, the units, the secondary fields and the extra decimal places, and nothing the argument depends on.`;

export function render() {
  const TIP = { x: FOCUS.i, y: FOCUS.v };
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 44,
    marginRight: 20,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [LABELLED, HOVERED] },
    x: { label: "Day", labelAnchor: "center", domain: [-1, N], ticks: 4 },
    y: { label: "Sessions", domain: [30, 108], ticks: 4 },
    marks: [
      Plot.line(rows, {
        fx: "panel",
        x: "i",
        y: "v",
        z: "panel",
        stroke: PRIMARY,
        strokeWidth: 1.9,
      }),
      Plot.dot(rows, { fx: "panel", x: "i", y: "v", r: 2.4, fill: PRIMARY }),
      // Every value, printed. Alternating the offset is the best a chart can
      // do here, and it is not enough.
      Plot.text(
        rows.filter((d) => d.panel === LABELLED),
        {
          fx: "panel",
          x: "i",
          y: "v",
          text: (d) => d.v.toFixed(1),
          fill: MUTED,
          fontSize: 7.5,
          textAnchor: "middle",
          dy: -8,
        },
      ),
      // A tooltip, drawn rather than described: the detail layer, open on one
      // point, carrying more than the printed layer ever could.
      Plot.ruleX([TIP], {
        fx: () => HOVERED,
        x: "x",
        stroke: ACCENT,
        strokeOpacity: 0.5,
      }),
      Plot.dot([TIP], { fx: () => HOVERED, x: "x", y: "y", r: 4.5, fill: ACCENT }),
      // The box hangs below the point, where the y domain has room; above it
      // the panel runs out before the third line of the tooltip does.
      Plot.rect([TIP], {
        fx: () => HOVERED,
        x1: (d) => d.x + 1,
        x2: (d) => d.x + 14,
        y1: (d) => d.y - 32,
        y2: (d) => d.y - 4,
        fill: "var(--ds-chart-surface)",
        stroke: MUTED,
        strokeOpacity: 0.7,
      }),
      Plot.text([TIP], {
        fx: () => HOVERED,
        x: (d) => d.x + 2,
        y: (d) => d.y - 6,
        text: (d) => `${DAY(d.x)}\n${d.y.toFixed(1)}k sessions\n+12% on last week`,
        fill: MUTED,
        // At the authoring floor, not below it. The tooltip is the half of
        // this chart the reader is supposed to be able to read — it is the
        // *printed* layer opposite that is meant to defeat them — so it has no
        // business riding in on the small-type exemption above.
        fontSize: 10,
        lineHeight: 1.45,
        textAnchor: "start",
        lineAnchor: "top",
      }),
      Plot.text([{}], {
        fx: () => LABELLED,
        frameAnchor: "bottom-left",
        text: () => "the line is in there somewhere",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        dy: -4,
        ...HALO,
      }),
    ],
  });
}
