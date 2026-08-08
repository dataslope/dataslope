/**
 * One series, two headlines, no lying.
 *
 * The lesson's other pair, `bar-truncation` and `bar-truncation-cropped`, is
 * about an axis that has been cut, which is a thing you can catch by looking at
 * the axis. This is the harder case, and the one the storytelling section is
 * actually about: both panels here start at zero, plot every point, and use the
 * same scale. Nothing has been cropped, filtered or rescaled. The only things
 * that differ are the title and where the annotation points, and they carry the
 * reader to opposite conclusions.
 *
 * That is not a trick to avoid; it is the job. A chart without a claim is a
 * lookup table, and choosing what to point at is what makes it a chart. The
 * reason it belongs next to the truncation figures is that it shows the
 * responsibility does not end at the axis: a technically impeccable chart can
 * still be an argument, and the honest move is to know which argument you are
 * making and to leave the rest of the series visible while you make it.
 *
 * Both annotations are true statements about the same numbers, computed from
 * the series rather than written by hand, so neither panel is a straw man.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "The same twenty-quarter revenue series drawn twice, both starting at zero and showing every point. The left panel's title calls it a recovery and highlights the recent rise; the right panel's title calls it a decline and highlights the fall from the earlier peak.";

/** A series with a genuine early peak, a genuine trough, and a genuine recent
 *  recovery, so both readings are supportable. Written out rather than
 *  generated: the shape has to hold all three facts at once. */
const VALUES = [
  62, 68, 74, 81, 88, 92, 95, 91, 84, 74, 63, 55, 49, 46, 48, 53, 59, 64, 69, 73,
];

const ROWS = VALUES.map((v, i) => ({ i, v }));

const PEAK = ROWS.reduce((a, b) => (b.v > a.v ? b : a));
const TROUGH = ROWS.reduce((a, b) => (b.v < a.v ? b : a));
const LAST = ROWS[ROWS.length - 1];

const RECOVERY = Math.round(((LAST.v - TROUGH.v) / TROUGH.v) * 100);
const DECLINE = Math.round(((LAST.v - PEAK.v) / PEAK.v) * 100);

const PANELS = [
  {
    key: `Up ${RECOVERY}% from the low`,
    from: TROUGH,
    note: `+${RECOVERY}% since the trough`,
    color: PRIMARY,
  },
  {
    key: `Still ${Math.abs(DECLINE)}% below the peak`,
    from: PEAK,
    note: `${DECLINE}% since the peak`,
    color: ACCENT,
  },
];

const ORDER = PANELS.map((p) => p.key);
const ALL = PANELS.flatMap((p) => ROWS.map((r) => ({ panel: p.key, ...r })));

/** The highlighted stretch in each panel: from the marked point to the end.
 *  Same series, different window emphasised, nothing hidden. */
const SPANS = PANELS.flatMap((p) =>
  ROWS.filter((r) => r.i >= p.from.i).map((r) => ({ panel: p.key, color: p.color, ...r })),
);

export const caption = `Both panels are the same twenty quarters, both start at zero, both show every point, both use the same scale. Nothing is cropped and nothing is filtered, and the two annotations are arithmetic on the same numbers: revenue really is up ${RECOVERY}% from the trough, and it really is ${Math.abs(DECLINE)}% below the peak. The title and the highlighted stretch do all the rest. That is not a trick to avoid, it is the job, because a chart with no claim is a lookup table. It does mean the responsibility does not stop at the axis: know which argument you are making, and leave the rest of the series in view while you make it.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 26,
    marginLeft: 50,
    marginRight: 24,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Quarter", labelAnchor: "center", ticks: 5 },
    y: { label: "Revenue (£m)", domain: [0, 108], ticks: 5 },
    fx: { domain: ORDER, label: null },
    marks: [
      // The whole series, in both panels, at the same weight: nothing is hidden
      // in either reading, which is the point being made.
      Plot.line(ALL, {
        x: "i",
        y: "v",
        fx: "panel",
        stroke: MUTED,
        strokeOpacity: 0.5,
        strokeWidth: 1.6,
      }),

      // The stretch each headline is about.
      Plot.line(SPANS, {
        x: "i",
        y: "v",
        z: "panel",
        fx: "panel",
        stroke: (d) => d.color,
        strokeWidth: 2.8,
      }),

      Plot.ruleX(
        PANELS.map((p) => ({ panel: p.key, i: p.from.i })),
        { x: "i", fx: "panel", stroke: GUIDE, strokeWidth: 1, strokeDasharray: "3,3" },
      ),
      Plot.dot(
        PANELS.map((p) => ({ panel: p.key, color: p.color, ...p.from })),
        { x: "i", y: "v", fx: "panel", r: 4, fill: (d) => d.color },
      ),
      Plot.text(
        PANELS.map((p) => ({ panel: p.key, color: p.color, note: p.note, ...p.from })),
        {
          x: "i",
          y: "v",
          fx: "panel",
          text: "note",
          fill: (d) => d.color,
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          dy: -12,
          ...HALO,
        },
      ),
    ],
  });
}
