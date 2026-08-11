/**
 * Four sizes of type against one, and what the sizes are actually saying.
 *
 * Both panels carry the same six pieces of text: a title, a subtitle, an axis
 * label, tick labels, one annotation and a source note. On the left they are
 * all the same size and weight, so the reader has to read all six to find out
 * which one matters, in whatever order their eye happens to land. On the right
 * they are set in four sizes, and the reader knows the order before reading a
 * word.
 *
 * That is the whole function of a type hierarchy: it is an instruction about
 * *reading order*, delivered before reading starts. It is not decoration and
 * it is not about looking professional. A chart with flat type has withheld
 * information it already had.
 *
 * Four levels is about the practical limit, and they map onto four jobs:
 *
 *   • **the claim**, largest, read first, read by everyone;
 *   • **the qualification**, one step down, read by people who want to know
 *     what exactly was measured;
 *   • **the machinery**, axis and tick labels, read only when somebody is
 *     checking a specific value;
 *   • **the provenance**, smallest, read by the one person who is going to
 *     argue with you.
 *
 * The failure in the other direction is worth naming too: more than four
 * levels stops being a hierarchy and becomes a ransom note, because the
 * reader can no longer tell which of six sizes is bigger than which without
 * comparing them, and comparing them is the thing hierarchy exists to avoid.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace } from "./_panels.mjs";

/** The right panel's source note is set at 8.5px on purpose: the whole subject
 *  of this figure is a four-step type hierarchy, and a hierarchy needs a step
 *  that is visibly the smallest. Every label a reader is meant to *read* here,
 *  the claim, the subtitle, the ticks and the annotation, sits at the 10px
 *  authoring floor or above, so `legibleMinWidth` in scripts/build-charts.mjs
 *  sizes the drawing from the floor rather than from the provenance line. */
export const smallTypeAllowed =
  "the smallest step of the type hierarchy being demonstrated is the subject";

export const title =
  "The same chart with the same six pieces of text, set once all at one size and once in four sizes. Flat type makes the reader read everything to find out what matters; a hierarchy tells them the order before they read a word.";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8"];
const CHURN = [7.4, 7.1, 6.8, 6.9, 5.2, 4.6, 4.1, 3.8];
const CHANGE_AT = 4;

const DROP = Math.round(((CHURN[3] - CHURN.at(-1)) / CHURN[3]) * 100);

const TEXT = {
  title: `Churn fell ${DROP}% after onboarding changed`,
  subtitle: "Monthly churn, self-serve accounts only",
  axis: "Churn (%)",
  note: "onboarding rebuilt",
  source: "Source: billing exports, quarters ending Mar 2024 to Dec 2025",
};

const FLAT = panel(0, { x: [0, 7], y: [0, 8.6] });
const RANKED = panel(1, { x: [0, 7], y: [0, 8.6] });

/** Left panel: everything at one size and weight. Right panel: four steps. */
const SIZES = {
  flat: { title: 11, subtitle: 11, axis: 11, tick: 11, note: 11, source: 11 },
  ranked: { title: 14, subtitle: 11, axis: 10, tick: 10, note: 10, source: 8.5 },
};

const line = (p) => CHURN.map((v, i) => ({ x: p.px(i), y: p.py(v) }));

export const caption = `Six pieces of text, twice: a title, a subtitle, an axis label, the tick labels, one annotation and a source note. On the left they are all one size and one weight, so a reader has to read all six to discover which one matters, in whatever order their eye lands. On the right the same six are set in four sizes and the reading order arrives before the reading does. That is the entire job of a type hierarchy. It is an instruction about sequence, delivered ahead of the content, and a chart with flat type has withheld information it already had. Four levels is about the working limit, and they map onto four jobs: the claim, which everyone reads; the qualification, for people who want to know what was measured; the machinery of axis and ticks, read only when somebody is checking a number; and the provenance, read by the one person who intends to argue. Past four it stops being a hierarchy, because the reader can no longer tell which size is larger without comparing them, and not having to compare them was the point.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 30,
    marginRight: 16,
    marginBottom: 44,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...[FLAT, RANKED].flatMap((p, k) => {
        const S = k === 0 ? SIZES.flat : SIZES.ranked;
        const strong = k === 1;
        return [
          ...panelAxis(p, {
            ticks: [0, 2, 4, 6, 8],
            format: String,
            labelSize: S.tick,
          }),
          panelBaseline(p),
          Plot.areaY(line(p), {
            x: "x",
            y1: p.py(0),
            y2: "y",
            fill: PRIMARY,
            fillOpacity: 0.13,
          }),
          Plot.line(line(p), { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2 }),
          Plot.ruleX([{ at: p.px(CHANGE_AT - 0.5) }], {
            x: "at",
            y1: p.py(0),
            y2: p.py(8.6),
            stroke: ACCENT,
            strokeWidth: 1.2,
            strokeDasharray: "4,3",
          }),

          // 1. the claim
          Plot.text([{}], {
            x: p.left,
            y: 0.975,
            text: () => TEXT.title,
            fill: strong ? "currentColor" : MUTED,
            fillOpacity: strong ? 0.92 : 1,
            fontSize: S.title,
            fontWeight: strong ? 700 : 600,
            textAnchor: "start",
            ...HALO,
          }),
          // 2. the qualification
          Plot.text([{}], {
            x: p.left,
            y: 0.905,
            text: () => TEXT.subtitle,
            fill: MUTED,
            fontSize: S.subtitle,
            fontWeight: strong ? 500 : 600,
            textAnchor: "start",
            ...HALO,
          }),
          // 3. the machinery
          Plot.text([{}], {
            x: p.left,
            y: p.top,
            text: () => TEXT.axis,
            fill: MUTED,
            fontSize: S.axis,
            fontWeight: strong ? 500 : 600,
            textAnchor: "start",
            dy: -6,
            ...HALO,
          }),
          Plot.text(
            QUARTERS.map((label, i) => ({ label, x: p.px(i) })),
            {
              x: "x",
              y: p.bottom,
              text: "label",
              fill: "currentColor",
              fillOpacity: 0.55,
              fontSize: S.tick,
              fontWeight: strong ? 400 : 600,
              textAnchor: "middle",
              dy: 14,
            },
          ),
          Plot.text([{ at: p.px(CHANGE_AT - 0.5) }], {
            x: "at",
            y: p.py(7.9),
            text: () => TEXT.note,
            fill: ACCENT,
            fontSize: S.note,
            fontWeight: strong ? 600 : 600,
            textAnchor: "start",
            dx: 5,
            ...HALO,
          }),
          // 4. the provenance
          Plot.text([{}], {
            x: p.left,
            y: 0.03,
            text: () => TEXT.source,
            fill: MUTED,
            fillOpacity: strong ? 0.7 : 1,
            fontSize: S.source,
            fontWeight: strong ? 400 : 600,
            textAnchor: "start",
            ...HALO,
          }),
        ];
      }),
    ],
  });
}
