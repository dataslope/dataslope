/**
 * Why "our numbers don't match" is almost never a data problem.
 *
 * Three teams report "active users" from the same events table. Marketing
 * counts anyone who fired any event, product counts users with two or more
 * sessions, finance counts signed-in users who did something billable. All
 * three definitions are defensible, all three are called the same thing, and
 * on a launch month they disagree by a factor of two.
 *
 * The gap also *widens*, which is the part that turns a definitional argument
 * into a credibility problem: the definitions weight a traffic spike
 * differently, so the three lines diverge exactly when everyone is looking at
 * them. A semantic layer fixes this by making the definition the artifact
 * (one governed expression that every tool queries through) rather than
 * something each dashboard re-implements in its own SQL.
 */
import { Plot, plot, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Three monthly series all labelled active users, computed with three defensible definitions from the same events table. They start close together and diverge steadily, ending more than a factor of two apart.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** All three read the same events table. The traffic mix shifts towards
 *  casual visits over the year, which each definition weights differently. */
const DEFINITIONS = [
  {
    key: "Any event fired",
    color: SERIES[0],
    values: [212, 228, 247, 279, 318, 372, 431, 468, 512, 566, 611, 664],
  },
  {
    key: "Two or more sessions",
    color: SERIES[1],
    values: [168, 176, 187, 203, 221, 246, 271, 285, 302, 319, 334, 351],
  },
  {
    key: "Signed in and acted",
    color: SERIES[2],
    values: [141, 145, 150, 157, 164, 173, 182, 187, 194, 201, 207, 214],
  },
];

const rows = DEFINITIONS.flatMap((d) =>
  d.values.map((v, m) => ({ key: d.key, color: d.color, month: m, value: v })),
);

const TOP = DEFINITIONS[0].values.at(-1);
const BOTTOM = DEFINITIONS.at(-1).values.at(-1);
const SPREAD = (TOP / BOTTOM).toFixed(1);

export const caption = `One events table, three defensible definitions, one metric name. By December they differ by a factor of ${SPREAD}, and the gap grew all year because each definition weights a shift in traffic mix differently. Nobody's SQL is wrong; the definitions were never written down in one place. That is what a semantic layer is for: the metric becomes a governed artifact every tool queries through, instead of something each dashboard re-implements.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 60,
    marginRight: 150,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: null,
      domain: [0, MONTHS.length - 1],
      ticks: [0, 2, 4, 6, 8, 10, 11],
      tickFormat: (d) => MONTHS[d],
    },
    y: {
      label: "“Active users” (thousands)",
      domain: [0, TOP * 1.1],
      ticks: 5,
    },
    marks: [
      Plot.line(rows, { x: "month", y: "value", z: "key", stroke: "color", strokeWidth: 2 }),
      ...DEFINITIONS.map((d) =>
        Plot.text([{}], {
          x: MONTHS.length - 1,
          y: d.values.at(-1),
          text: () => d.key,
          fill: d.color,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        }),
      ),
      Plot.text([{}], {
        x: 0.3,
        y: TOP * 1.02,
        text: () => "three dashboards, three answers, one metric name",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
