/**
 * A Kaplan-Meier curve, and the reason it exists: the people who have not had
 * the event yet still carry information, and throwing them away biases
 * everything.
 *
 * The step function is the share still subscribed over time. The tick marks
 * are censored observations, customers who were still active when the data was
 * pulled. A naive analysis either drops them, which counts only churners and
 * makes retention look terrible, or treats them as retained forever, which
 * makes it look perfect. Kaplan-Meier keeps them in the denominator until the
 * moment they leave the study, and no longer.
 *
 * The median lifetime is read off the curve at 50% survival, computed rather
 * than typed, and the naive figures are computed from the same data so the
 * three can be compared honestly.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A Kaplan-Meier survival curve stepping down from one hundred percent over twenty-four months, with tick marks for censored observations and the median lifetime marked where the curve crosses fifty percent.";

const N = 220;
const HORIZON = 24;
const next = rng(5150);

/** Each subject either churns at some month or is still active at the cutoff,
 *  in which case the observation is censored rather than missing. */
const subjects = Array.from({ length: N }, () => {
  const churn = Math.ceil(-Math.log(Math.max(next(), 1e-9)) * 11);
  const leaveStudy = Math.ceil(next() * HORIZON);
  return churn <= leaveStudy && churn <= HORIZON
    ? { time: churn, event: true }
    : { time: Math.min(leaveStudy, HORIZON), event: false };
});

/** Kaplan-Meier: at each event time, multiply by (1 - deaths/at risk). */
const km = (() => {
  const times = [...new Set(subjects.filter((s) => s.event).map((s) => s.time))].sort(
    (a, b) => a - b,
  );
  let survival = 1;
  const out = [{ t: 0, s: 1 }];
  for (const t of times) {
    const atRisk = subjects.filter((s) => s.time >= t).length;
    const events = subjects.filter((s) => s.event && s.time === t).length;
    survival *= 1 - events / atRisk;
    out.push({ t, s: survival });
  }
  out.push({ t: HORIZON, s: survival });
  return out;
})();

const censored = subjects
  .filter((s) => !s.event)
  .map((s) => ({ t: s.time, s: km.filter((k) => k.t <= s.time).at(-1).s }));

const MEDIAN = km.find((k) => k.s <= 0.5)?.t ?? null;
const CENSORED_SHARE = Math.round((censored.length / N) * 100);
/** Median of the churn times alone, which is what dropping the censored rows
 *  leaves you describing. It is shorter than the truth, because the customers
 *  who are lasting longest are exactly the ones being discarded. */
const NAIVE_MEDIAN = (() => {
  const churned = subjects.filter((s) => s.event).map((s) => s.time).sort((a, b) => a - b);
  return churned[Math.floor(churned.length / 2)];
})();

export const caption =
  `${CENSORED_SHARE}% of these customers had not churned when the data was pulled, which is information rather than a gap. Kaplan-Meier keeps them at risk until they leave the study and puts the median lifetime at ${MEDIAN} months. Drop them and you are describing churners only, which gives ${NAIVE_MEDIAN} months: the customers lasting longest are precisely the ones you threw away.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 30,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Months since signup", labelAnchor: "center", domain: [0, HORIZON], ticks: 5 },
    y: { label: "Still subscribed", domain: [0, 1.04], ticks: 5, tickFormat: "%" },
    marks: [
      Plot.areaY(km, { x: "t", y: "s", fill: PRIMARY, fillOpacity: 0.13, curve: "step-after" }),
      Plot.line(km, { x: "t", y: "s", stroke: PRIMARY, strokeWidth: 2, curve: "step-after" }),
      // Censoring ticks: the observations a naive analysis silently discards.
      Plot.ruleX(censored, {
        x: "t",
        y1: (d) => d.s - 0.022,
        y2: (d) => d.s + 0.022,
        stroke: MUTED,
        strokeOpacity: 0.75,
      }),
      Plot.ruleY([0.5], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      ...(MEDIAN
        ? [
            Plot.dot([{ t: MEDIAN, s: 0.5 }], { x: "t", y: "s", fill: ACCENT, r: 4.5 }),
            Plot.text([{ t: MEDIAN, s: 0.5 }], {
              x: "t",
              y: "s",
              text: () => `median lifetime:\n${MEDIAN} months`,
              fill: ACCENT,
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1.3,
              textAnchor: "start",
              dx: 10,
              dy: -14,
              ...HALO,
            }),
          ]
        : []),
      Plot.text([{}], {
        x: HORIZON,
        y: 0.86,
        text: () => `each tick is a customer still active\nat the cutoff (${CENSORED_SHARE}% of them)`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
