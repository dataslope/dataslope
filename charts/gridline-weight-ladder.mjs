/**
 * Where a gridline stops helping, in five steps.
 *
 * A gridline exists to answer one question: what value is this mark at? It is
 * a measuring aid, so it should be exactly as visible as it needs to be for
 * the eye to trace across, and no more, because every pixel it spends is
 * spent in front of the data rather than behind it.
 *
 * Read this left to right and notice where your own answer changes. With no
 * grid at all, the reader can see the shape but cannot put a number on any
 * point without walking their eye down to the axis and losing their place.
 * One step in, the line is present and unnoticeable, which is where a grid
 * should live. Two steps in it is still fine. By the fourth panel the grid is
 * as dark as the data and the chart has two subjects; by the fifth the grid
 * *is* the subject, and the series is something drawn on top of a piece of
 * graph paper.
 *
 * Nothing changes across these panels except the stroke opacity and width of
 * the horizontal rules. Same data, same axis, same color, same everything
 * else. It is a good demonstration of how much of a chart's quality is decided
 * by choices nobody would call design decisions.
 *
 * The template this course uses, `simple_white`, is opinionated in exactly
 * this way: faint horizontal rules, no verticals, no panel border, no
 * background fill. That is roughly the second panel, and it is the default
 * because a reader should never have to look past the chart's furniture to
 * find the data.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";
import { panel, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One line chart drawn five times at five gridline weights, from none at all to gridlines as heavy as the data. Only the rules change; the data, the axis and the colors are identical. The second panel is where a grid is present and unnoticeable, and by the fifth the grid has become the subject of the chart.";

/** One quiet series with enough shape to be worth reading a value off. */
const u = rng(4118);
const N = 26;
const SERIES = Array.from({ length: N }, (_, i) => {
  const trend = 26 + i * 1.35;
  return { i, v: trend + Math.sin(i / 2.6) * 7 + (u() - 0.5) * 5 };
});

const TICKS = [20, 30, 40, 50, 60, 70];
const STEPS = [
  { title: "None", opacity: 0, width: 1, verdict: "shape only,\nno values" },
  { title: "Faint", opacity: 0.1, width: 1, verdict: "present and unnoticeable:\nwhere a grid belongs" },
  { title: "Light", opacity: 0.22, width: 1, verdict: "still fine" },
  { title: "Heavy", opacity: 0.45, width: 1.2, verdict: "two subjects\nnow" },
  { title: "Graph paper", opacity: 0.75, width: 1.4, verdict: "the grid is\nthe chart" },
];

const PANELS = STEPS.map((_, k) => panel(k, { x: [0, N - 1], y: [16, 74] }));
const BEST = 1;

export const caption = `Five copies of one line chart. The data, the axis, the colors and the range are identical in all five; the only thing that changes is how dark the horizontal rules are. Read left to right and watch where your own answer changes. With no grid you can see the shape and cannot put a number on any point without walking your eye to the axis and losing your place. One step in, the rules are there and you do not notice them, which is where a grid belongs: it is a measuring aid, so it should be exactly as visible as the measuring needs and no more. By the fourth panel the grid is as dark as the data and the chart has two subjects. By the fifth the series is something drawn on graph paper. The template this course uses sits at about the second panel, which is why its charts look empty at first and stop looking empty about a week later.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 24,
    marginLeft: 30,
    marginRight: 16,
    marginBottom: 40,
    ariaLabel: title,
    ...panelSpace(STEPS.length),
    marks: [
      ...PANELS.flatMap((p, k) => {
        const step = STEPS[k];
        const rows = SERIES.map((d) => ({ x: p.px(d.i), y: p.py(d.v) }));
        const grid = TICKS.map((v) => ({ y: p.py(v) }));
        return [
          ...(step.opacity > 0
            ? [
                Plot.link(grid, {
                  x1: p.left,
                  x2: p.right,
                  y1: "y",
                  y2: "y",
                  stroke: "currentColor",
                  strokeOpacity: step.opacity,
                  strokeWidth: step.width,
                }),
              ]
            : []),
          Plot.line(rows, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 1.9 }),
          panelTitle(p, step.title, { fill: k === BEST ? PRIMARY : MUTED, fontSize: 11 }),
          Plot.text([{}], {
            x: (p.left + p.right) / 2,
            y: p.bottom,
            text: () => step.verdict,
            fill: k >= 3 ? ACCENT : MUTED,
            fontSize: 10,
            fontWeight: 600,
            lineHeight: 1.35,
            textAnchor: "middle",
            dy: 18,
            ...HALO,
          }),
        ];
      }),
    ],
  });
}
