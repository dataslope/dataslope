/**
 * The same series twice, once bare and once annotated, where the annotation is
 * the only difference and it changes what the chart says.
 *
 * The bare panel is not wrong. Every number is there, the axis is honest, the
 * line is drawn correctly, and a reader who studies it for long enough will
 * notice that the slope changes about two thirds of the way along. Most
 * readers will not study it for long enough. They will take the one impression
 * a line gives away for free, "it went up", and move on.
 *
 * The annotated panel says the thing the analyst already knows: the slope
 * changed in June, and it changed because the pricing page changed. That is a
 * sentence, and a sentence is what a reader remembers. The annotation is not
 * decoration on the finding, it *is* the finding; the line is the evidence
 * for it.
 *
 * The cost of annotating is that you have to commit to a claim, which is why
 * charts go unannotated far more often than they should.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "One monthly signup series drawn twice. The left panel is unannotated and reads as steady growth; the right panel marks the June pricing change and the steeper slope that followed, which is the finding the numbers were always carrying.";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Slow growth, then a change of slope at the June release. Small wiggles so
 *  the line looks measured rather than drawn with a ruler. */
const WOBBLE = [0, 0.4, -0.5, 0.3, -0.2, 0.5, -0.4, 0.6, -0.3, 0.4, -0.5, 0.2];
const SHIP = 5;
const BEFORE_SLOPE = 1.1;
const AFTER_SLOPE = 4.3;

const series = MONTHS.map((month, i) => ({
  month,
  i,
  value:
    22 +
    BEFORE_SLOPE * Math.min(i, SHIP) +
    AFTER_SLOPE * Math.max(0, i - SHIP) +
    WOBBLE[i],
}));

const BARE = "Signups by month";
const TOLD = "Pricing change in June doubled signup growth";

const rows = [BARE, TOLD].flatMap((panel) => series.map((d) => ({ ...d, panel })));

const SHIP_POINT = series[SHIP];
const LAST = series.at(-1);
const MULTIPLE = Math.round(AFTER_SLOPE / BEFORE_SLOPE);

export const caption = `The same twelve numbers, drawn the same way, with one difference. The left panel is not wrong: the axis is honest and a reader who studies it will eventually notice that the slope changes two thirds of the way along. Most readers will take the impression a line gives away for free, "it went up", and move on. The right panel says what the analyst already knew: growth ran at about ${BEFORE_SLOPE} a month until the June release and about ${AFTER_SLOPE} after, roughly ${MULTIPLE} times faster, and the title names the cause. That is a sentence, and a sentence is what gets remembered; the line is the evidence for it. The cost of annotating is having to commit to a claim, which is why so many charts go unannotated.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 46,
    marginRight: 24,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [BARE, TOLD] },
    x: {
      label: null,
      domain: [-0.5, MONTHS.length - 0.5],
      ticks: [0, 3, 6, 9, 11],
      tickFormat: (i) => MONTHS[i],
    },
    y: { label: "Signups (k)", domain: [0, 66], ticks: 4 },
    marks: [
      // The event, drawn only where it is being talked about.
      Plot.ruleX([SHIP_POINT], {
        fx: () => TOLD,
        x: "i",
        stroke: GUIDE,
        strokeDasharray: "4 3",
      }),
      Plot.areaY(
        rows.filter((d) => d.panel === TOLD && d.i >= SHIP),
        { fx: "panel", x: "i", y: "value", fill: ACCENT, fillOpacity: 0.12 },
      ),
      Plot.line(rows, {
        fx: "panel",
        x: "i",
        y: "value",
        z: "panel",
        stroke: (d) => (d.panel === TOLD ? ACCENT : PRIMARY),
        strokeWidth: 2.1,
      }),
      Plot.dot([SHIP_POINT], {
        fx: () => TOLD,
        x: "i",
        y: "value",
        r: 4.5,
        fill: ACCENT,
      }),
      Plot.text([SHIP_POINT], {
        fx: () => TOLD,
        x: "i",
        y: "value",
        text: () => "new pricing page\nships 6 June",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -8,
        dy: -16,
        ...HALO,
      }),
      Plot.text([LAST], {
        fx: () => TOLD,
        x: "i",
        y: "value",
        text: () => `${MULTIPLE}x the monthly gain`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -14,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => BARE,
        frameAnchor: "top-left",
        text: () => "true, and forgettable",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        dy: 4,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
