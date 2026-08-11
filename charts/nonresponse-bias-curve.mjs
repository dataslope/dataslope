/**
 * Why a small careful survey beats a huge careless one, drawn as two curves.
 *
 * The instinct that more responses is better is right only when the extra
 * responses arrive at random. When people opt in, the sample is a self-selected
 * one, and self-selection is not noise: it is a systematic difference between
 * the people who answered and the people who did not.
 *
 * The horizontal axis is the response rate. The two curves are the total error
 * of the estimate under two amounts of non-response bias, and the shapes are
 * completely different.
 *
 * With mild bias the error falls steadily as more people answer, because the
 * remaining bias is small and sampling noise dominates. With strong bias the
 * curve flattens almost immediately: past a certain point extra responses stop
 * helping, because they are drawn from the same self-selecting pool as the ones
 * you already had, and they reduce the noise without touching the bias.
 *
 * The consequence is the one that surprises people. A survey with a 70%
 * response rate and mild bias beats a survey with a 5% response rate and strong
 * bias, and it beats it regardless of how many people the second one sent to.
 * Sending a million invitations and getting fifty thousand replies does not
 * help, because the fifty thousand are still the kind of people who reply.
 *
 * This is the Literary Digest lesson, restated. In 1936 they polled 2.4 million
 * people and got the election wrong; Gallup polled 50,000 and got it right.
 * The 2.4 million were drawn from telephone and car-registration lists in a
 * year when owning either correlated with how you voted, and no sample size
 * fixes a frame like that.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, SERIES, linspace } from "./_theme.mjs";

export const title =
  "Total estimation error against response rate for a mildly biased survey and a strongly biased one. The mild curve falls steadily; the strong one flattens almost at once, because extra responses reduce noise and leave the bias untouched.";

const POPULATION = 50_000;
const CASES = [
  { key: "Mild non-response bias", gap: 2, color: PRIMARY },
  { key: "Strong non-response bias", gap: 12, color: ACCENT },
];

/** Total error is bias plus sampling noise. Bias shrinks with the share of
 *  non-responders left; noise shrinks with the square root of the count. */
const CURVES = CASES.map((c) => ({
  ...c,
  points: linspace(0.02, 0.95, 120).map((rate) => {
    const n = POPULATION * rate;
    const bias = c.gap * (1 - rate);
    const noise = 1.96 * Math.sqrt((0.25 / n)) * 100;
    return { rate, error: bias + noise };
  }),
}));

const at = (curve, rate) =>
  curve.points.reduce((a, b) => (Math.abs(b.rate - rate) < Math.abs(a.rate - rate) ? b : a));

const GOOD = at(CURVES[0], 0.7);
const BAD = at(CURVES[1], 0.05);
const BAD_BIG = at(CURVES[1], 0.5);

export const caption = `The instinct that more responses is better holds only when the extra responses arrive at random. When people opt in, the sample is self-selected, and self-selection is not noise: it is a systematic difference between those who answered and those who did not. The two curves are total error against response rate under two amounts of that bias, and their shapes differ completely. With mild bias the error falls steadily, because what is left is small and sampling noise dominates. With strong bias the curve flattens almost immediately, because extra responses are drawn from the same self-selecting pool and reduce the noise while leaving the bias exactly where it was: at a 5% response rate the error is ${BAD.error.toFixed(1)} points, and at ten times that response rate it is still ${BAD_BIG.error.toFixed(1)}. So a survey with a 70% response rate and mild bias, at ${GOOD.error.toFixed(1)} points, beats the strongly biased one at any size. Sending a million invitations and collecting fifty thousand replies does not help, because the fifty thousand are still the kind of people who reply. This is the Literary Digest lesson restated: in 1936 they polled 2.4 million people and called the election wrong while Gallup polled fifty thousand and called it right, because the 2.4 million came from telephone and car-registration lists in a year when owning either predicted how you voted. No sample size fixes a frame.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 60,
    marginRight: 130,
    marginBottom: 50,
    ariaLabel: title,
    x: {
      label: "Response rate",
      labelAnchor: "center",
      domain: [0, 1],
      ticks: [0, 0.25, 0.5, 0.75, 1],
      tickFormat: (v) => `${Math.round(v * 100)}%`,
    },
    y: {
      label: "Total error (percentage points)",
      domain: [0, 14],
      ticks: [0, 4, 8, 12],
    },
    marks: [
      ...CURVES.map((c) =>
        Plot.line(c.points, { x: "rate", y: "error", stroke: c.color, strokeWidth: 2.2, clip: true }),
      ),
      Plot.text(
        CURVES.map((c) => ({ ...c, ...c.points.at(-1) })),
        {
          x: "rate",
          y: "error",
          text: "key",
          fill: "color",
          fontSize: 10.5,
          fontWeight: 700,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),
      Plot.dot([GOOD, BAD], { x: "rate", y: "error", r: 4.6, fill: MUTED }),
      Plot.link([{}], {
        x1: GOOD.rate,
        x2: BAD.rate,
        y1: GOOD.error,
        y2: GOOD.error,
        stroke: GUIDE,
        strokeWidth: 1.3,
        strokeDasharray: "4,3",
      }),
      Plot.text([GOOD], {
        x: "rate",
        y: "error",
        text: (d) => `70% response, mild bias:\n${d.error.toFixed(1)} points`,
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "end",
        dx: -10,
        dy: -14,
        ...HALO,
      }),
      Plot.text([BAD], {
        x: "rate",
        y: "error",
        text: (d) => `5% response, strong bias:\n${d.error.toFixed(1)} points`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 10,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0.62,
        y: 3.2,
        text: () => "extra responses cut the noise\nand leave the bias where it was",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
