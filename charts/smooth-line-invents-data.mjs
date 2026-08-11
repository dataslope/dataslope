/**
 * A spline through six points, and the two months it invents.
 *
 * Curve smoothing is offered as a styling option in every charting library,
 * usually under a name like "smooth", "spline" or `line_shape="spline"`, and
 * it is presented alongside line width and color as though it belonged in
 * that category. It does not. Joining points with a curve rather than with
 * segments changes what the chart claims about the values *between* the
 * points, and there is no version of a spline that claims nothing.
 *
 * The specific harm is *overshoot*. A cubic spline is fitted so that its
 * slopes match at every knot, and satisfying that constraint through a sharp
 * peak requires the curve to swing past the peak before it comes back. The
 * highest point on the smoothed line here is above the highest value anybody
 * measured, and the lowest is below the lowest. A reader who takes a value off
 * the curve between two dots gets a number that is not in the data and was
 * never possible.
 *
 * When the y axis has a hard floor the overshoot becomes an obvious
 * impossibility rather than a subtle one. Smooth a count of errors that hits
 * zero, or a percentage that hits 100, and the curve will happily draw
 * negative errors and 104 per cent.
 *
 * Straight segments are not neutral either. They claim linear interpolation
 * between observations, which is also a claim. The difference is that it is
 * the *weakest* claim available that still connects the points: it never
 * leaves the range of the two values it joins, and every reader already knows
 * how to discount it.
 *
 * If the underlying process really is smooth and you want to say so, fit a
 * model and draw it as a distinct band or line, so the reader can see there
 * are two things on the chart: the observations, and your claim about them.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Six monthly measurements joined by a spline and by straight segments. The spline swings above the highest observation and below the lowest, so a value read from the curve between two points can be one nobody measured.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
/** A flat run followed by a jump, which is the shape that makes a spline
 *  overshoot: matching slopes at the knots forces the curve past the values
 *  on either side of the corner. */
const VALUES = [24, 22, 22, 66, 64, 30];
const POINTS = VALUES.map((v, i) => ({ i, v, month: MONTHS[i] }));

const HI = Math.max(...VALUES);
const LO = Math.min(...VALUES);

/**
 * Catmull-Rom through the points, converted to a dense polyline. This is the
 * same family of curve every "spline" option in every library uses, and the
 * overshoot is a property of the family rather than of one implementation.
 */
function catmullRom(pts, samples = 24) {
  const p = [pts[0], ...pts, pts.at(-1)];
  const out = [];
  for (let i = 1; i < p.length - 2; i++) {
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({
        i: f(p[i - 1].i, p[i].i, p[i + 1].i, p[i + 2].i),
        v: f(p[i - 1].v, p[i].v, p[i + 1].v, p[i + 2].v),
      });
    }
  }
  out.push(pts.at(-1));
  return out;
}

const CURVE = catmullRom(POINTS);
const CURVE_HI = Math.max(...CURVE.map((d) => d.v));
const CURVE_LO = Math.min(...CURVE.map((d) => d.v));
const OVER = Math.round(CURVE_HI - HI);
const UNDER = Math.round(LO - CURVE_LO);

const Y = [10, 78];
const SPLINE = panel(0, { x: [0, 5], y: Y });
const STRAIGHT = panel(1, { x: [0, 5], y: Y });

const curveRow = CURVE.map((d) => ({ x: SPLINE.px(d.i), y: SPLINE.py(d.v) }));
const dotsA = POINTS.map((d) => ({ ...d, x: SPLINE.px(d.i), y: SPLINE.py(d.v) }));
const dotsB = POINTS.map((d) => ({ ...d, x: STRAIGHT.px(d.i), y: STRAIGHT.py(d.v) }));

export const caption = `The same points joined by straight segments and by a cubic spline. The curve reaches ${Math.round(CURVE_HI)} against a highest measurement of ${HI} and dips to ${Math.round(CURVE_LO)} against a lowest of ${LO}, inventing ${OVER} units above and ${UNDER} below anything anybody recorded.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 36,
    marginRight: 18,
    marginBottom: 42,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(SPLINE, { ticks: [20, 40, 60] }),
      ...panelAxis(STRAIGHT, { ticks: [20, 40, 60] }),
      panelTitle(SPLINE, "Joined with a spline", { fill: ACCENT }),
      panelTitle(STRAIGHT, "Joined with straight segments", { fill: PRIMARY }),

      // The band the observations actually occupy, so the overshoot is
      // visible as leaving it rather than as a shape you have to trust.
      Plot.rect([{}], {
        x1: SPLINE.left,
        x2: SPLINE.right,
        y1: SPLINE.py(LO),
        y2: SPLINE.py(HI),
        fill: MUTED,
        fillOpacity: 0.09,
      }),
      Plot.link(
        [LO, HI].map((v) => ({ y: SPLINE.py(v) })),
        {
          x1: SPLINE.left,
          x2: SPLINE.right,
          y1: "y",
          y2: "y",
          stroke: MUTED,
          strokeWidth: 1,
          strokeDasharray: "3,3",
        },
      ),

      Plot.line(curveRow, { x: "x", y: "y", stroke: ACCENT, strokeWidth: 2.2 }),
      Plot.dot(dotsA, { x: "x", y: "y", r: 4, fill: ACCENT }),

      Plot.line(dotsB, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.2 }),
      Plot.dot(dotsB, { x: "x", y: "y", r: 4, fill: PRIMARY }),

      ...[
        [SPLINE, dotsA],
        [STRAIGHT, dotsB],
      ].map(([p, dots]) =>
        Plot.text(dots, {
          x: "x",
          y: p.bottom,
          text: "month",
          fill: "currentColor",
          fillOpacity: 0.55,
          fontSize: 10,
          textAnchor: "middle",
          dy: 14,
        }),
      ),

      Plot.text([{}], {
        x: SPLINE.px(1.1),
        y: SPLINE.py(CURVE_HI),
        text: () => `${OVER} above the highest\nvalue anyone measured`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: SPLINE.px(1.4),
        y: SPLINE.py(CURVE_LO),
        text: () => `and ${UNDER} below the lowest`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "start",
        dy: 16,
        ...HALO,
      }),
      Plot.text([{}], {
        x: STRAIGHT.px(2.7),
        y: STRAIGHT.py(16),
        text: () => "every segment stays between\nthe two values it joins",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
