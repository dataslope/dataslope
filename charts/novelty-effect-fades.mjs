/**
 * Why "we saw a 14% lift" is not a result until you know which week it came
 * from.
 *
 * A visible change gets clicked because it is new. That is a real behavior and
 * it produces a real, large, statistically significant lift, which then decays
 * as the novelty wears off. Nothing about the first week's number is fabricated
 * or underpowered; it is measuring a thing that will not last, and there is
 * nothing inside week one that says so.
 *
 * The two arms drawn here are indistinguishable at the point where most tests
 * get read: the novelty arm is ahead by more, so a team stopping early would
 * not merely fail to notice the difference, it would ship the wrong one. Only
 * the shape over several weeks separates them, which is the actual answer to
 * the interview question: run past the novelty window, and check whether the
 * effect holds for users who join later, after the change has stopped being new
 * to anyone.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Treatment lift over eight weeks for two changes. One starts at plus fourteen percent and decays to almost nothing by week six; the other holds a steady lift of about four percent. In week one the fading change looks like the better result.";

const WEEKS = 8;
const READ_AT = 1;

const ARMS = [
  {
    key: "Novelty",
    color: ACCENT,
    at: (w) => 13.6 * Math.exp(-0.62 * (w - 1)) + 0.5,
  },
  {
    key: "Durable",
    color: PRIMARY,
    at: (w) => 4.2 - 0.45 * Math.exp(-0.5 * (w - 1)),
  },
];

const rows = ARMS.flatMap((a) =>
  Array.from({ length: WEEKS }, (_, i) => {
    const w = i + 1;
    return { key: a.key, color: a.color, w, lift: a.at(w) };
  }),
);

const at = (key, w) => rows.find((d) => d.key === key && d.w === w).lift;
const ends = ARMS.map((a) => ({ key: a.key, color: a.color, w: WEEKS, lift: at(a.key, WEEKS) }));
const one = (v) => v.toFixed(1);

export const caption = `Two changes, eight weeks of measured lift each. Read in week ${READ_AT}, which is when a test that "hit significance" usually gets read, the fading change is ahead by ${one(at("Novelty", READ_AT))}% against ${one(at("Durable", READ_AT))}%, so stopping early does not just blur the two: it picks the wrong one. By week ${WEEKS} the novelty is worth ${one(at("Novelty", WEEKS))}% and the durable change is still worth ${one(at("Durable", WEEKS))}%. **The first week measures the change being new**, which is a real effect and not one you get to keep. The defenses are to run past the novelty window, and to check the effect on users who joined after the change shipped, for whom it was never new.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 56,
    marginRight: 76,
    marginBottom: 44,
    ariaLabel: title,
    x: { label: "Week of the experiment", labelAnchor: "center", domain: [0.6, WEEKS + 0.4], ticks: WEEKS },
    y: {
      label: "Lift over control",
      domain: [0, 16],
      ticks: 5,
      tickFormat: (d) => `${d}%`,
    },
    marks: [
      Plot.ruleX([READ_AT], { stroke: GUIDE, strokeWidth: 1.4, strokeDasharray: "4 4" }),
      Plot.line(rows, { x: "w", y: "lift", z: "key", stroke: "color", strokeWidth: 2.2, clip: true }),
      Plot.dot(rows, { x: "w", y: "lift", z: "key", fill: "color", r: 3, clip: true }),
      Plot.text(ends, {
        x: WEEKS,
        y: "lift",
        text: "key",
        fill: "color",
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: READ_AT,
        y: 15.4,
        text: () => "stop here and you ship the\nchange that is about to fade",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 5,
        y: at("Durable", 5),
        text: () => "the effect worth having",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "middle",
        dy: -14,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
