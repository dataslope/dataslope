/**
 * The chart that found the answer, and the chart that carries it, which are
 * not the same chart and should not be.
 *
 * An exploratory chart is written for one reader who already knows what the
 * columns mean, will look at it for four seconds, and will then write another
 * one. It should show everything, because the point is to find what is there:
 * every series, default labels, no title, no thought about color. Time spent
 * making it pretty is time not spent on the next question, and there will be
 * thirty more.
 *
 * A presentation chart is written for a reader who was not there. It carries
 * one finding, and everything not serving that finding is removed or muted.
 * The series that mattered is named on the chart, the title states the
 * conclusion rather than the subject, and the rest of the data stays visible
 * as context so the reader can see that nothing was cropped away.
 *
 * The mistake in both directions is common. Polishing during exploration is
 * slow, and publishing the exploratory chart is what fills reports with
 * fourteen-series line charts titled "revenue.png".
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "Fourteen series drawn as a raw exploratory chart with no title and every line the same weight, and the same data as a presentation chart with one series named, the rest muted, and the finding in the title.";

const MONTHS = 20;
const N = 14;
const u = rng(7442);

const FIND = 5;

const series = Array.from({ length: N }, (_, s) => {
  const start = 30 + u() * 40;
  const drift = s === FIND ? 3.1 : (u() - 0.42) * 1.6;
  return {
    s,
    points: Array.from({ length: MONTHS }, (_, m) => ({
      m,
      v: Math.max(6, start + drift * m + (u() - 0.5) * 7),
    })),
  };
});

const rows = series.flatMap((d) => d.points.map((p) => ({ ...p, s: d.s })));

const EXPLORE = "cohort_rev.png";
const PRESENT = "The March cohort is still growing";

const both = [EXPLORE, PRESENT].flatMap((panel) =>
  rows.map((d) => ({ ...d, panel })),
);

const subject = series[FIND];
const GROWTH = Math.round(subject.points.at(-1).v - subject.points[0].v);
const others = series.filter((d) => d.s !== FIND);
const MEDIAN_GROWTH = Math.round(
  [...others]
    .map((d) => d.points.at(-1).v - d.points[0].v)
    .sort((a, b) => a - b)[Math.floor(others.length / 2)],
);

export const caption = `These are two different charts and they should be. The exploratory one is written for a reader who already knows what the columns mean, will look for four seconds, and will then write another one: show everything, default labels, no title, no thought about color, because time spent making it pretty is time not spent on the next question and there are thirty more. The presentation one is written for someone who was not there. It carries a single finding, the March cohort gaining ${GROWTH} against a median of ${MEDIAN_GROWTH} for the other ${others.length}, names the series on the chart rather than in a legend, and puts the conclusion in the title instead of the subject. The rest of the data stays visible as context so a reader can see that nothing was cropped. The mistake runs both ways: polishing during exploration is slow, and publishing the exploratory chart is what fills reports with fourteen-series line charts called revenue.png.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 46,
    marginRight: 84,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [EXPLORE, PRESENT] },
    x: { label: "Month", labelAnchor: "center", domain: [0, MONTHS - 1], ticks: 4 },
    y: { label: "Revenue (k)", domain: [0, 148], ticks: 4 },
    marks: [
      Plot.line(
        both.filter((d) => d.panel === EXPLORE),
        {
          fx: "panel",
          x: "m",
          y: "v",
          z: "s",
          // Every series the same weight, which is the correct choice when the
          // question is still "what is in here".
          stroke: PRIMARY,
          strokeWidth: 1.2,
          strokeOpacity: 0.7,
        },
      ),
      Plot.line(
        both.filter((d) => d.panel === PRESENT && d.s !== FIND),
        {
          fx: "panel",
          x: "m",
          y: "v",
          z: "s",
          stroke: MUTED,
          strokeWidth: 1.1,
          strokeOpacity: 0.5,
        },
      ),
      Plot.line(
        both.filter((d) => d.panel === PRESENT && d.s === FIND),
        { fx: "panel", x: "m", y: "v", stroke: ACCENT, strokeWidth: 2.4 },
      ),
      Plot.text([{ m: MONTHS - 1, v: subject.points.at(-1).v }], {
        fx: () => PRESENT,
        x: "m",
        y: "v",
        text: () => `March\n+${GROWTH}k`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{ m: MONTHS - 1, v: 40 }], {
        fx: () => PRESENT,
        x: "m",
        y: "v",
        text: () => `the other ${others.length}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => EXPLORE,
        frameAnchor: "top-left",
        text: () => "four seconds, then the next one",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 4,
        dy: 2,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
