/**
 * Two intervals that overlap, and a difference that is significant anyway.
 *
 * Comparing two confidence intervals by eye is the most natural thing in the
 * world and it answers a different question from the one people think it does.
 * The rule "if they overlap, there is no difference" is not the 5% test. It is
 * a stricter test, at roughly the 1% level, and it will tell you there is
 * nothing there in cases where the proper comparison says otherwise.
 *
 * The arithmetic is short. Each group's interval is about `2·SE` wide either
 * side of its mean, so two intervals stop overlapping when the means are more
 * than `2·(SE₁ + SE₂)` apart. But the standard error of the *difference* is not
 * `SE₁ + SE₂`, it is `sqrt(SE₁² + SE₂²)`, because variances add and standard
 * errors do not. With equal groups that makes the difference's interval `√2`
 * times narrower than the sum, so there is a whole band, roughly from
 * `2·√2·SE` to `4·SE` of separation, where the intervals still touch and the
 * difference is already significant.
 *
 * That band is what the right-hand panel draws. The two means differ by enough
 * that the interval *on the difference* clears zero comfortably, while the two
 * individual intervals still overlap.
 *
 * The correct move is the one that has to be said twice because it feels like
 * cheating: when the question is about a difference, compute an interval for
 * the difference. Do not compare two intervals for two things, ever, and if a
 * chart shows both groups with error bars, it is showing you the wrong
 * intervals for the question you are asking of it.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "Two group means with overlapping 95 per cent intervals, beside the 95 per cent interval for their difference, which excludes zero. Comparing two intervals by eye is a stricter test than the one people believe they are applying.";

const A = { key: "Control", mean: 100, se: 3.0 };
const B = { key: "Treatment", mean: 111, se: 3.2 };
const Z = 1.96;

const groups = [A, B].map((g) => ({ ...g, lo: g.mean - Z * g.se, hi: g.mean + Z * g.se }));
const OVERLAP = groups[0].hi - groups[1].lo;

const DIFF = B.mean - A.mean;
const SE_DIFF = Math.sqrt(A.se ** 2 + B.se ** 2);
const D_LO = DIFF - Z * SE_DIFF;
const D_HI = DIFF + Z * SE_DIFF;
const ZSTAT = DIFF / SE_DIFF;
/** What comparing the two intervals by eye would demand instead. */
const NAIVE_GAP = Z * (A.se + B.se);

const LEFT = panel(0, { x: [86, 126], y: [0, 1] });
const RIGHT = panel(1, { x: [-6, 26], y: [0, 1] });

const ROW = { Control: 0.62, Treatment: 0.36 };

export const caption = `The two groups' intervals overlap by ${OVERLAP.toFixed(1)} units, so the eye says there is nothing here. The interval for the difference is ${D_LO.toFixed(1)} to ${D_HI.toFixed(1)}, which clears zero with room to spare, and the test statistic is ${ZSTAT.toFixed(2)}. Both statements are correct, because comparing two intervals is not the 5% test people think it is: it is a stricter test, at roughly the 1% level. The arithmetic is short. Two intervals stop touching once the means are more than 1.96 times the *sum* of the standard errors apart, which is ${NAIVE_GAP.toFixed(1)} units here. But the standard error of a difference is not the sum, it is the square root of the sum of squares, ${SE_DIFF.toFixed(2)} rather than ${(A.se + B.se).toFixed(2)}, because variances add and standard errors do not. With similar groups that is a factor of about √2, so there is a whole band of separations where the intervals still overlap and the difference is already significant, and this is one of them. The right move is the one that has to be said twice because it feels like cheating: when the question is about a difference, compute an interval for the difference. A chart showing two groups with error bars is showing you the wrong intervals for the question you are asking of it.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 84,
    marginRight: 18,
    marginBottom: 48,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      panelTitle(LEFT, "Two 95% intervals, overlapping", { fill: ACCENT }),
      panelTitle(RIGHT, "One 95% interval on the difference", { fill: PRIMARY }),

      // The overlap, shaded, so the thing the eye is reacting to is explicit.
      Plot.rect([{}], {
        x1: LEFT.px(groups[1].lo),
        x2: LEFT.px(groups[0].hi),
        y1: LEFT.py(0.2),
        y2: LEFT.py(0.78),
        fill: ACCENT,
        fillOpacity: 0.1,
      }),
      ...groups.map((g, i) =>
        Plot.link([{}], {
          x1: LEFT.px(g.lo),
          x2: LEFT.px(g.hi),
          y1: LEFT.py(ROW[g.key]),
          y2: LEFT.py(ROW[g.key]),
          stroke: i === 0 ? MUTED : PRIMARY,
          strokeWidth: 3,
          strokeLinecap: "round",
        }),
      ),
      ...groups.map((g, i) =>
        Plot.dot([{}], {
          x: LEFT.px(g.mean),
          y: LEFT.py(ROW[g.key]),
          r: 4.6,
          fill: i === 0 ? MUTED : PRIMARY,
        }),
      ),
      Plot.text(groups, {
        x: (d) => LEFT.px(d.lo),
        y: (d) => LEFT.py(ROW[d.key]),
        text: "key",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "end",
        dx: -10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: LEFT.px((groups[1].lo + groups[0].hi) / 2),
        y: LEFT.py(0.2),
        text: () => `they overlap by ${OVERLAP.toFixed(1)}`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 14,
        ...HALO,
      }),

      Plot.link([{}], {
        x1: RIGHT.px(0),
        x2: RIGHT.px(0),
        y1: RIGHT.py(0.16),
        y2: RIGHT.py(0.82),
        stroke: GUIDE,
        strokeWidth: 1.4,
        strokeDasharray: "4,3",
      }),
      Plot.text([{}], {
        x: RIGHT.px(0),
        y: RIGHT.py(0.16),
        text: () => "zero",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 14,
        ...HALO,
      }),
      Plot.link([{}], {
        x1: RIGHT.px(D_LO),
        x2: RIGHT.px(D_HI),
        y1: RIGHT.py(0.5),
        y2: RIGHT.py(0.5),
        stroke: PRIMARY,
        strokeWidth: 3,
        strokeLinecap: "round",
      }),
      Plot.dot([{}], { x: RIGHT.px(DIFF), y: RIGHT.py(0.5), r: 4.6, fill: PRIMARY }),
      Plot.text([{}], {
        x: RIGHT.px(DIFF),
        y: RIGHT.py(0.5),
        text: () => `${DIFF} [${D_LO.toFixed(1)}, ${D_HI.toFixed(1)}]`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: -12,
        ...HALO,
      }),
      Plot.text([{}], {
        x: RIGHT.px(DIFF),
        y: RIGHT.py(0.5),
        text: () => "clear of zero",
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 18,
        ...HALO,
      }),
      ...[
        [LEFT, [90, 100, 110, 120]],
        [RIGHT, [0, 10, 20]],
      ].map(([p, ticks]) =>
        Plot.text(
          ticks.map((v) => ({ v, x: p.px(v) })),
          {
            x: "x",
            y: p.bottom,
            text: (d) => String(d.v),
            fill: "currentColor",
            fillOpacity: 0.55,
            fontSize: 10,
            textAnchor: "middle",
            dy: 30,
          },
        ),
      ),
      Plot.text([{}], {
        x: (LEFT.left + LEFT.right) / 2,
        y: LEFT.bottom,
        text: () => "the eye says: no difference",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 48,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (RIGHT.left + RIGHT.right) / 2,
        y: RIGHT.bottom,
        text: () => "the test says: significant at 5%",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "middle",
        dy: 48,
        ...HALO,
      }),
    ],
  });
}
