/**
 * Nightingale's rose, redrawn from her own table.
 *
 * Two roses, one per year of the war, each month a thirty-degree wedge. All
 * three wedges in a month share the centre as their vertex, so they overlap
 * rather than stack, which is how she drew it: the blue disease wedge is the
 * outer one in almost every month, and the red wounds wedge disappears inside
 * it. That overlap is the argument. Nobody looking at this could go on
 * believing the army was dying of its wounds.
 *
 * ── The construction, and the criticism it earns ────────────────────────────
 *
 * Radius is the *square root* of the rate, so the wedge's area is proportional
 * to it. That is the correct way to build a polar area diagram and it is also
 * where the objection starts: the eye reads a wedge by how far it reaches, not
 * by how much ink it holds. Squaring the encoding means January 1855, at 1,023
 * deaths per 1,000 per year, reaches only about six times as far as a month at
 * 30, when the quantity is thirty-four times larger. The chart therefore
 * *understates* the very disaster it was drawn to expose, which is a strange
 * thing to have to say about the most effective public-health graphic ever
 * published. `nightingale-bars-1858` is the same twenty-four numbers on a
 * length scale, and it is the honest one.
 *
 * Plot has no polar coordinate system, so each wedge is built as a polygon in
 * Cartesian space: the centre, an arc of sixteen points, and back. The scales
 * are then hidden, because the numbers they would carry are radii of a square
 * root, which is a quantity no reader wants.
 *
 * Months run clockwise from the top rather than from her three-o'clock start.
 * That is a readability change and the only liberty taken with the layout.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";
import { MONTHS, PEAK, PERIODS } from "./_nightingale.mjs";

export const title =
  "Florence Nightingale's 1858 rose diagram, redrawn from her table: two circles of twelve wedges, one per year of the Crimean War. Each wedge's area is the annual death rate per 1,000, blue for preventable disease, red for wounds, grey for other causes. The blue wedges dominate the first year and collapse in the second.";

const CAUSE_COLOR = { disease: SERIES[0], wounds: ACCENT, other: MUTED };
const CAUSE_ORDER = ["disease", "other", "wounds"];

const MAX = Math.max(...MONTHS.map((m) => m.disease));
/** Area proportional to the rate, so radius goes as its square root. */
const radius = (v) => Math.sqrt(Math.max(v, 0) / MAX);

const ARC_STEPS = 16;
const TAU = Math.PI * 2;

/** One wedge as a closed polygon: centre, arc, centre. Clockwise from north. */
function wedge(monthIndexInYear, r) {
  const a0 = (monthIndexInYear / 12) * TAU;
  const a1 = ((monthIndexInYear + 1) / 12) * TAU;
  const pts = [{ x: 0, y: 0 }];
  for (let s = 0; s <= ARC_STEPS; s++) {
    const a = a0 + ((a1 - a0) * s) / ARC_STEPS;
    pts.push({ x: r * Math.sin(a), y: r * Math.cos(a) });
  }
  pts.push({ x: 0, y: 0 });
  return pts;
}

/** Every wedge, ordered so the largest in each month is drawn first and the
 *  smaller ones land on top of it. Three wedges sharing one vertex nest; the
 *  order decides whether the small ones are visible at all. */
const petals = MONTHS.flatMap((m) => {
  const inYear = m.i % 12;
  return CAUSE_ORDER.map((cause) => ({ cause, m, r: radius(m[cause]) }))
    .sort((a, b) => b.r - a.r)
    .flatMap(({ cause, r }, rank) =>
      wedge(inYear, r).map((p) => ({
        ...p,
        id: `${m.ym}-${cause}`,
        cause,
        period: m.period,
        rank,
      })),
    );
});

/** A point at radius `r` along the centre line of the worst month's wedge. */
function peakPoint(r) {
  const a = ((PEAK.i % 12) + 0.5) * (TAU / 12);
  return { x: r * Math.sin(a), y: r * Math.cos(a) };
}

const LEGEND = [
  { cause: "disease", label: "Preventable disease", y: 1.2 },
  { cause: "wounds", label: "Wounds", y: 1.08 },
  { cause: "other", label: "All other causes", y: 0.96 },
].map((d) => ({ ...d, period: PERIODS[0] }));

export const caption = `Redrawn from Nightingale's own table. Each wedge is one month and its area is the annual death rate per 1,000 men: blue for the diseases she called preventable, red for wounds, grey for everything else. At the ${PEAK.label} peak the rate reached ${Math.round(PEAK.disease).toLocaleString()} against ${Math.round(PEAK.wounds)} for wounds.`;

export function render() {
  return plot({
    width: 680,
    height: 372,
    marginTop: 30,
    marginRight: 16,
    marginBottom: 16,
    marginLeft: 16,
    ariaLabel: title,
    // Titles above the roses, not below them: Plot drops the fx axis to the
    // bottom when the top margin is tight, and a caption under a circle reads
    // as belonging to whatever comes next on the page.
    fx: { label: null, domain: PERIODS, axis: "top" },
    // Hidden, and deliberately: the numbers on these axes are radii of a square
    // root of a rate, which is not a quantity anyone should be reading off.
    x: { axis: null, domain: [-1.12, 1.12] },
    // `grid: false` explicitly: the house theme turns horizontal rules on for
    // every y scale, and a polar diagram ruled like a bar chart is nonsense.
    y: { axis: null, grid: false, domain: [-1.12, 1.3] },
    marks: [
      Plot.line(petals, {
        fx: "period",
        x: "x",
        y: "y",
        z: "id",
        fill: (d) => CAUSE_COLOR[d.cause],
        fillOpacity: 0.78,
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 0.6,
        clip: true,
      }),
      Plot.dot(LEGEND, {
        fx: "period",
        x: -1.02,
        y: "y",
        fill: (d) => CAUSE_COLOR[d.cause],
        r: 4,
      }),
      Plot.text(LEGEND, {
        fx: "period",
        x: -0.95,
        y: "y",
        text: "label",
        fill: (d) => CAUSE_COLOR[d.cause],
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      // On the wedge rather than beside it. The worst month is the long arm
      // reaching left, and a note parked at the foot of the panel makes the
      // reader hunt for which wedge it is talking about.
      Plot.text([{ period: PERIODS[0], ...peakPoint(0.62) }], {
        fx: "period",
        x: "x",
        y: "y",
        text: () => PEAK.label,
        fill: "var(--ds-chart-surface)",
        fontSize: 11,
        fontWeight: 700,
        textAnchor: "middle",
      }),
      Plot.text([{ period: PERIODS[0] }], {
        fx: "period",
        x: 0,
        y: -1.06,
        text: () =>
          `worst month: ${Math.round(PEAK.disease).toLocaleString()} per 1,000 per year`,
        fill: SERIES[0],
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{ period: PERIODS[1] }], {
        fx: "period",
        x: 0,
        y: -1.06,
        text: () => "the same army, after the hospitals were cleaned",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
