/**
 * The other answer to a spaghetti chart: keep one line and grey the rest.
 *
 * `spaghetti-vs-facets` (in *Faceting and Small Multiples*) gives the general
 * fix, which is to stop overlaying and start repeating. That is the right move
 * when every series matters equally. It is the wrong move when one of them is
 * the point, because small multiples make comparison to a *specific* line hard:
 * the reader has to hold one panel in memory while looking at another.
 *
 * When there is a protagonist, the cheaper fix is to leave the overlay alone
 * and change what is loud. Same axes, same data, one series in colour with its
 * name attached and the rest dropped to a single muted grey. The others do not
 * disappear, which matters: they are the context that makes the highlighted
 * line mean anything, and a chart of one line with no comparison is a different
 * and weaker claim.
 *
 * Drawn as two panels of the identical twelve series so the change is visibly
 * only the emphasis. Both are the same overlay; neither is a small multiple.
 * The greyed lines are one colour rather than twelve desaturated ones, because
 * the moment they carry distinguishable hues the reader starts trying to
 * identify them again and the emphasis is gone.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES, rng } from "./_theme.mjs";

export const title =
  "The same twelve-line chart drawn twice. On the left every line is a different colour and none stands out; on the right eleven are a uniform pale grey and one is drawn in a strong colour with its name at the end of it.";

const MONTHS = 24;
const SERIES_COUNT = 12;
const HERO = "Store 07";

const u = rng(1877);
function gauss() {
  const a = Math.max(u(), Number.EPSILON);
  const b = u();
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
}

/** Twelve wandering series. The hero is not the highest or the lowest, which is
 *  the case that makes the point: in the left panel it is genuinely unfindable,
 *  and an outlier would have been findable without any help. */
const LINES = Array.from({ length: SERIES_COUNT }, (_, s) => {
  const name = `Store ${String(s + 1).padStart(2, "0")}`;
  let level = 40 + u() * 45;
  const drift = (u() - 0.5) * 1.4;
  return {
    name,
    points: Array.from({ length: MONTHS }, (_, t) => {
      level += drift + gauss() * 2.6;
      return { t, y: level };
    }),
  };
});

const PANELS = ["Every line shouts", "One line speaks"];

const ROWS = PANELS.flatMap((panel) =>
  LINES.flatMap((l) => l.points.map((p) => ({ panel, name: l.name, ...p }))),
);

const heroEnd = LINES.find((l) => l.name === HERO).points[MONTHS - 1];

export const caption = `Same twelve series, same axes, both panels. On the left the reader is asked to find one store among twelve competing colours and a legend; on the right eleven lines have been dropped to one flat grey and the twelfth is labelled where it ends. Nothing was removed, which is the part worth keeping: the grey lines are the context that makes the highlighted one mean anything, and a chart showing only the hero would be a weaker claim about it. Reach for this when one series is the story and for small multiples when they all are.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 46,
    marginRight: 74,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Month", labelAnchor: "center", ticks: 5 },
    y: { label: "Weekly sales (£k)", ticks: 5 },
    fx: { domain: PANELS, label: null },
    marks: [
      // Left: every series in its own colour, which is what a plotting library
      // does by default and what makes the chart unreadable.
      Plot.line(ROWS.filter((d) => d.panel === PANELS[0]), {
        x: "t",
        y: "y",
        z: "name",
        fx: "panel",
        stroke: "name",
        strokeWidth: 1.5,
      }),

      // Right: the eleven, in one grey. Drawn before the hero so it sits on top.
      Plot.line(ROWS.filter((d) => d.panel === PANELS[1] && d.name !== HERO), {
        x: "t",
        y: "y",
        z: "name",
        fx: "panel",
        stroke: MUTED,
        strokeOpacity: 0.45,
        strokeWidth: 1.2,
      }),
      Plot.line(ROWS.filter((d) => d.panel === PANELS[1] && d.name === HERO), {
        x: "t",
        y: "y",
        fx: "panel",
        stroke: ACCENT,
        strokeWidth: 2.6,
      }),
      Plot.text([{ panel: PANELS[1] }], {
        x: () => heroEnd.t,
        y: () => heroEnd.y,
        fx: "panel",
        text: () => HERO,
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        dy: -12,
        ...HALO,
      }),
    ],
    // Plot's own categorical scheme writes literal hex, which the build rejects
    // and which would be wrong in one of the two themes. The role tokens cycle
    // instead: the theme has seven and the left panel has twelve series, so
    // colours repeat. That is not a defect in the panel, it is the panel's
    // argument, and it is what actually happens when you hand a library twelve
    // categories.
    color: { type: "ordinal", range: SERIES },
  });
}
