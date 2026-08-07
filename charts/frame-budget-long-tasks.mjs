/**
 * The frame budget, and what a long task does to it.
 *
 * At 60 frames a second the browser has 16.7 milliseconds to produce each
 * frame, and everything competing for the main thread comes out of that. The
 * bars are the work a typical interaction does; the line is the budget. Two of
 * them fit comfortably. The third does not fit at all, and while it runs
 * nothing else happens: no scrolling, no input, no paint.
 *
 * The dropped-frame count is computed from the task length and the budget
 * rather than asserted, which is the number that turns "it feels janky" into
 * something measurable.
 *
 * A task over 50ms is what the Long Tasks API reports and what INP is measuring
 * the consequence of, so that threshold is drawn too.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Five pieces of main-thread work as bars against a 16.7 millisecond frame budget: three fit inside it, one crosses the fifty millisecond long-task threshold, and one runs for hundreds of milliseconds, dropping many frames.";

const BUDGET = 1000 / 60;
const LONG_TASK = 50;

const TASKS = [
  { name: "Style + layout", ms: 4.2 },
  { name: "Paint", ms: 6.8 },
  { name: "Small event handler", ms: 11 },
  { name: "Parse a large JSON blob", ms: 74 },
  { name: "Sort 100k rows in JS", ms: 310 },
];

const rows = TASKS.map((t) => ({
  ...t,
  dropped: Math.max(0, Math.floor(t.ms / BUDGET)),
  overBudget: t.ms > BUDGET,
}));

const WORST = rows.at(-1);

export const caption =
  `At 60fps the whole frame is ${BUDGET.toFixed(1)}ms, and everything on the main thread shares it. The first three fit. The last runs for ${WORST.ms}ms, which is about ${WORST.dropped} frames in which nothing scrolls, paints, or responds. Anything past the ${LONG_TASK}ms long-task line is what the browser reports as blocking, and what a user calls jank.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 42,
    marginLeft: 168,
    marginRight: 96,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      type: "log",
      label: "Milliseconds on the main thread",
      labelAnchor: "center",
      domain: [1, 500],
      ticks: [1, 10, 100, 500],
      tickFormat: String,
    },
    y: { label: null, domain: rows.map((r) => r.name), padding: 0.3 },
    marks: [
      Plot.barX(rows, {
        y: "name",
        x1: 1,
        x2: "ms",
        fill: (d) => (d.overBudget ? ACCENT : PRIMARY),
        fillOpacity: 0.45,
      }),
      Plot.ruleX([BUDGET], { stroke: GUIDE, strokeWidth: 2 }),
      Plot.ruleX([LONG_TASK], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{}], {
        x: BUDGET,
        frameAnchor: "top",
        text: () => `one frame: ${BUDGET.toFixed(1)}ms`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -6,
        dy: -14,
        ...HALO,
      }),
      Plot.text([{}], {
        x: LONG_TASK,
        frameAnchor: "top",
        text: () => `long task: ${LONG_TASK}ms`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        dy: -14,
        ...HALO,
      }),
      Plot.text(rows, {
        y: "name",
        x: "ms",
        text: (d) => (d.dropped > 0 ? `${d.ms}ms · ${d.dropped} frames lost` : `${d.ms}ms`),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
    ],
  });
}
