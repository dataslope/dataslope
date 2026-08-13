/**
 * The one shape question anyone asks of a retention curve: does it flatten?
 *
 * Every retention curve falls, and falling fast early is normal rather than
 * alarming: most of what a product loses in week one was never going to stay.
 * What separates a business from a leaky bucket is what happens after that.
 * A curve that bends toward a floor has a retained core, and each new cohort
 * adds to a base that persists; a curve still heading for zero at week twelve
 * has no core, and every user has to be re-acquired forever.
 *
 * Both curves here start at 100% and both look similar for the first fortnight,
 * which is the reason the figure is worth drawing. The judgement cannot be made
 * from week one, or from a single retention number, and the two products are
 * only distinguishable at the point where one of them stops falling.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Two retention curves over twelve weeks, both starting at one hundred percent. One flattens onto a plateau near a third of the cohort and stays there; the other keeps falling toward zero. For the first two weeks the two are hard to tell apart.";

const WEEKS = 12;

/** A plateau is an exponential decay toward a floor, and no floor is an
 *  exponential decay toward nothing. Same starting drop, different limits. */
const PLATEAU = 31;
const CURVES = [
  {
    key: "Has a core",
    color: PRIMARY,
    at: (w) => PLATEAU + (100 - PLATEAU) * Math.exp(-0.62 * w),
  },
  {
    key: "Leaky bucket",
    color: ACCENT,
    at: (w) => 100 * Math.exp(-0.34 * w),
  },
];

const rows = CURVES.flatMap((c) =>
  Array.from({ length: WEEKS + 1 }, (_, w) => ({
    key: c.key,
    color: c.color,
    w,
    pct: c.at(w),
  })),
);

const ends = CURVES.map((c) => ({ key: c.key, color: c.color, w: WEEKS, pct: c.at(WEEKS) }));
const at = (key, w) => rows.find((d) => d.key === key && d.w === w).pct;
const round = (v) => Math.round(v);

export const caption = `Both cohorts start whole and both fall steeply, and at week 2 they are ${round(at("Has a core", 2))}% and ${round(at("Leaky bucket", 2))}%, close enough that no meeting would separate them. By week 12 one is flat at ${round(at("Has a core", 12))}% and the other has reached ${round(at("Leaky bucket", 12))}% and is still going. **The plateau is the product**: a curve that flattens means each cohort leaves something behind, so acquisition compounds, and a curve heading for zero means every user has to be bought again. It is the shape after the early drop that carries this, which is why one retention number, and especially week one, answers nothing.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 54,
    marginRight: 108,
    marginBottom: 44,
    ariaLabel: title,
    x: { label: "Weeks since signup", labelAnchor: "center", domain: [0, WEEKS], ticks: 6 },
    y: {
      label: "Share of the cohort still active",
      domain: [0, 100],
      ticks: 5,
      tickFormat: (d) => `${d}%`,
    },
    marks: [
      Plot.ruleY([PLATEAU], { stroke: MUTED, strokeDasharray: "4 4" }),
      Plot.line(rows, {
        x: "w",
        y: "pct",
        z: "key",
        stroke: "color",
        strokeWidth: 2.2,
        clip: true,
      }),
      Plot.dot(rows, { x: "w", y: "pct", z: "key", fill: "color", r: 2.6, clip: true }),
      Plot.text(ends, {
        x: WEEKS,
        y: "pct",
        text: "key",
        fill: "color",
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: WEEKS,
        y: PLATEAU,
        text: () => `the plateau: ${PLATEAU}% of every cohort stays`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 2,
        y: at("Has a core", 2),
        text: () => "at week 2 these are\nthe same product",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: -18,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
