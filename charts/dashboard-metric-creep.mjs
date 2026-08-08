/**
 * Two counts over two years: panels added to a dashboard, and panels anyone
 * actually opened.
 *
 * Dashboards do not fail by being wrong. They fail by accumulating. Every
 * request to "just add" a chart is individually reasonable, costs one
 * afternoon, and is impossible to refuse without seeming obstructive, so the
 * count only ever goes up. Nothing in the process ever removes one, because
 * removal requires someone to assert that a panel is not needed, and nobody
 * gets thanked for that.
 *
 * The second line is the one that matters and the one nobody measures. Usage
 * does not track the panel count, it flattens and then falls, because past
 * some size a dashboard stops being a place you read and becomes a place you
 * search. The gap between the lines is the maintenance burden: queries that
 * still run, definitions that still have to be kept true, and a page that
 * takes longer to load, all for panels nobody opens.
 *
 * The fix is a rule with teeth, not more discipline. Every panel gets an owner
 * and a question, and a panel whose question stops being asked comes off.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Panels on a dashboard rising steadily over twenty-four months while the number of panels anyone looked at rises briefly, flattens and then declines, so the gap between the two widens every quarter.";

const MONTHS = 24;

/** Panels only ever go up: nothing in the process removes one. */
const ADDED = [
  6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 23, 24, 26, 27, 29, 31, 32, 34, 35,
  37, 38, 40, 41,
];
/** Panels opened at least once in the trailing month: rises, flattens, falls
 *  as the page becomes something to search rather than something to read. */
const USED = [
  5, 6, 7, 8, 9, 10, 10, 11, 11, 11, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 7, 6,
  6,
];

const rows = Array.from({ length: MONTHS }, (_, m) => ({
  m,
  added: ADDED[m],
  used: USED[m],
}));

const PEAK_USE = Math.max(...USED);
const PEAK_AT = USED.indexOf(PEAK_USE);
const END = rows.at(-1);
const IGNORED = END.added - END.used;
const SHARE = Math.round((IGNORED / END.added) * 100);

export const caption = `Dashboards rarely fail by being wrong. They fail by accumulating. Every request to "just add" a chart is individually reasonable, costs an afternoon, and is awkward to refuse, so the count only goes up: ${ADDED[0]} panels to ${END.added} in two years. Nothing in the process removes one, because removal means asserting that a panel is not needed and nobody is thanked for that. The second line is the one that matters and the one nobody measures. Usage peaks at ${PEAK_USE} panels in month ${PEAK_AT + 1} and then falls, because past a certain size a dashboard stops being a page you read and becomes a page you search. The widening gap is the maintenance bill: ${IGNORED} panels, ${SHARE} percent of the dashboard, whose queries still run, whose definitions still have to be kept true, and which nobody opens. The fix is a rule rather than more discipline. Every panel gets an owner and a question, and a panel whose question stops being asked comes off.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 46,
    marginRight: 96,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Month", labelAnchor: "center", domain: [0, MONTHS - 1], ticks: 5 },
    y: { label: "Panels", domain: [0, 46], ticks: 4 },
    marks: [
      // The gap, shaded, because the gap is the subject rather than either line.
      Plot.areaY(rows, {
        x: "m",
        y1: "used",
        y2: "added",
        fill: ACCENT,
        fillOpacity: 0.12,
      }),
      Plot.line(rows, { x: "m", y: "added", stroke: PRIMARY, strokeWidth: 2.1 }),
      Plot.line(rows, { x: "m", y: "used", stroke: ACCENT, strokeWidth: 2.1 }),
      Plot.text([END], {
        x: "m",
        y: "added",
        text: () => "panels on\nthe dashboard",
        fill: PRIMARY,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([END], {
        x: "m",
        y: "used",
        text: () => "panels opened\nin the last month",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{ at: MONTHS * 0.58 }], {
        x: "at",
        y: (rows[Math.round(MONTHS * 0.58)].added + rows[Math.round(MONTHS * 0.58)].used) / 2,
        text: () => "queries that still run,\ndefinitions still owed",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
