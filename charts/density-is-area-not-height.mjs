/**
 * A probability density whose peak is above one, which is not a bug.
 *
 * The first thing that goes wrong with continuous distributions is the y axis.
 * On a histogram of counts it means "how many"; on a probability mass function
 * it means "how likely"; on a *density* it means neither, and the units are
 * the giveaway: a density is probability *per unit of x*. Its height therefore
 * has units of one-over-x, and it can be any positive number at all.
 *
 * The curve here is a normal with a standard deviation of 0.3, which squeezes
 * the whole distribution into a narrow interval. All the probability still has
 * to add up to one, so a narrow distribution has to be *tall*, and this one
 * peaks above 1.3. Nothing is wrong with it. Halve the standard deviation
 * again and the peak doubles again.
 *
 * What the reader takes off the chart is the shaded region, because for a
 * continuous variable probability is *area*. That also explains the fact that
 * catches everyone once: the probability of any exact value is zero, because a
 * region of zero width has zero area, and asking for `P(X = 2.5)` is asking
 * for the area of a line. Continuous variables answer questions about
 * intervals, and only about intervals.
 *
 * The practical version: a density's height is only ever used for *comparing*
 * (this region is denser than that one), never for reading a probability off.
 * When you want a probability, integrate, which in practice means calling the
 * CDF twice and subtracting.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, linspace, normalPdf } from "./_theme.mjs";

export const title =
  "A normal density with a standard deviation of 0.3, whose peak is above 1.3. Height is not probability, so a density above one is not an error; the probability is the shaded area, which here is 0.68.";

const MU = 2.5;
const SD = 0.3;
const CURVE = linspace(1.2, 3.8, 201).map((x) => ({ x, y: normalPdf(x, MU, SD) }));
const PEAK = Math.max(...CURVE.map((d) => d.y));

const LO = MU - SD;
const HI = MU + SD;
const SHADED = CURVE.filter((d) => d.x >= LO && d.x <= HI);
/** Trapezoid rule over the shaded slice, so the number in the caption is the
 *  area the reader is looking at rather than a remembered constant. */
const AREA = SHADED.slice(1).reduce(
  (s, d, i) => s + ((d.y + SHADED[i].y) / 2) * (d.x - SHADED[i].x),
  0,
);

export const caption = `The first thing that goes wrong with continuous distributions is the vertical axis. On a histogram of counts it means how many; on a probability mass function it means how likely; on a density it means neither. A density is probability *per unit of x*, so its height carries units of one-over-x and can be any positive number at all. This curve is a normal with a standard deviation of ${SD}, which packs the whole distribution into a narrow interval, and since all the probability still has to come to one, a narrow distribution has to be tall: this one peaks at ${PEAK.toFixed(2)}. Halve the standard deviation again and the peak doubles again. What a reader actually takes off the chart is the shaded region, because for a continuous variable probability is *area*, and the shading here covers ${AREA.toFixed(2)}. That also explains the fact everybody meets once: the probability of an exact value is zero, because a region of zero width has zero area, and asking for the probability that X is exactly ${MU} is asking for the area of a line. Continuous variables answer questions about intervals and nothing else. In practice: use a density's height only for comparing one region with another, never for reading a probability, and when you want a probability call the CDF twice and subtract.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 56,
    marginRight: 30,
    marginBottom: 50,
    ariaLabel: title,
    x: { label: "x", labelAnchor: "center", domain: [1.2, 3.8], ticks: [1.5, 2.0, 2.5, 3.0, 3.5] },
    y: { label: "Density (probability per unit of x)", domain: [0, 1.55], ticks: [0, 0.5, 1, 1.5] },
    marks: [
      Plot.areaY(SHADED, { x: "x", y: "y", fill: PRIMARY, fillOpacity: 0.24, clip: true }),
      Plot.line(CURVE, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2, clip: true }),
      Plot.ruleY([1], { stroke: ACCENT, strokeWidth: 1.3, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: 1.25,
        y: 1,
        text: () => "height = 1",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        dy: -7,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MU,
        y: PEAK,
        text: () => `the peak is ${PEAK.toFixed(2)}, and nothing is wrong`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: MU,
        y: normalPdf(MU, MU, SD) * 0.42,
        text: () => `area = ${AREA.toFixed(2)}\nthis is the probability`,
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleX([LO, HI], {
        stroke: GUIDE,
        strokeWidth: 1.2,
        strokeDasharray: "3,3",
      }),
      Plot.text([{ x: HI }], {
        x: "x",
        y: 0,
        text: () => "a region has probability;\na point has none",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        dy: -26,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
