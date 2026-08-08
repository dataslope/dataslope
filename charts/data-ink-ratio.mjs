/**
 * The same seven numbers under a heavy frame and under none, so Tufte's
 * data-ink ratio is a picture rather than a slogan.
 *
 * The rule is easy to caricature as minimalism for its own sake. It is not
 * about taste. Every mark on a page competes for the same attention, and a
 * mark that encodes nothing wins some of that attention anyway: a box around
 * the plot, a gridline every five units, tick marks on both axes, a drop
 * shadow behind each bar, a legend for a single series. None of it is
 * information and all of it is read.
 *
 * The right test is deletion. Remove a mark and ask what the reader can no
 * longer work out. If the answer is nothing, the mark was spending attention
 * without paying for it. The panels here differ by no data at all; only the
 * furniture is gone, and the bars are easier to compare without it.
 *
 * The limit is worth stating: a gridline that lets a reader recover a value
 * they need *is* data-ink doing its job. Erase the junk, not the scaffolding.
 */
import { Plot, plot, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "One bar chart drawn twice. The left panel carries a border, gridlines every five units on both axes, tick marks, drop shadows and a legend; the right panel carries the bars, four gridlines and the labels.";

const BARS = [
  { key: "Mon", v: 62 },
  { key: "Tue", v: 71 },
  { key: "Wed", v: 68 },
  { key: "Thu", v: 84 },
  { key: "Fri", v: 79 },
  { key: "Sat", v: 41 },
  { key: "Sun", v: 33 },
];

const JUNK = "Framed, ruled and shadowed";
const CLEAN = "The same numbers";

const YMAX = 100;
const rows = [JUNK, CLEAN].flatMap((panel) =>
  BARS.map((d, i) => ({ ...d, i, panel })),
);

/** A gridline every five units, which is the density that stops being a scale
 *  and starts being a texture. */
const DENSE = Array.from({ length: YMAX / 5 + 1 }, (_, i) => i * 5);
const SPARSE = [0, 25, 50, 75, 100];

const INK = DENSE.length + BARS.length * 2 + 6;
const LEAN = SPARSE.length + BARS.length;

export const caption = `Tufte's data-ink rule is easy to caricature as minimalism for its own sake, and it is not about taste. Every mark on a page competes for the same attention, and a mark that encodes nothing wins some of it anyway: a border, a rule every five units, ticks on both axes, a shadow behind each bar, a legend for one series. None of that is information and all of it is read. The test is deletion: remove a mark and ask what the reader can no longer work out, and if the answer is nothing, it was spending attention without paying for it. These two panels differ by no data at all, roughly ${INK} marks against ${LEAN}, and the bars are easier to compare on the right. One limit worth stating: a gridline that lets a reader recover a value they actually need is data-ink doing its job. Erase the junk, not the scaffolding.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 46,
    marginRight: 20,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [JUNK, CLEAN] },
    x: {
      label: null,
      domain: [-0.6, BARS.length - 0.4],
      ticks: BARS.map((_, i) => i),
      tickFormat: (i) => BARS[i].key,
    },
    // Gridlines are drawn per panel below rather than by the scale, because
    // the two panels are meant to have different amounts of them.
    y: { label: "Orders", domain: [0, YMAX], ticks: 4, grid: false },
    marks: [
      // ── The junk panel ─────────────────────────────────────────────────
      Plot.ruleY(DENSE, { fx: () => JUNK, stroke: MUTED, strokeOpacity: 0.55 }),
      Plot.ruleX(
        BARS.flatMap((_, i) => [i - 0.5, i + 0.5]),
        { fx: () => JUNK, stroke: MUTED, strokeOpacity: 0.4 },
      ),
      Plot.frame({ fx: () => JUNK, stroke: MUTED, strokeOpacity: 0.9 }),
      // A shadow, offset down and right, encoding nothing whatsoever.
      Plot.rect(
        rows.filter((d) => d.panel === JUNK),
        {
          fx: "panel",
          x1: (d) => d.i - 0.3,
          x2: (d) => d.i + 0.42,
          y1: -3,
          y2: (d) => d.v - 3,
          fill: MUTED,
          fillOpacity: 0.55,
        },
      ),
      Plot.rect(
        rows.filter((d) => d.panel === JUNK),
        {
          fx: "panel",
          x1: (d) => d.i - 0.38,
          x2: (d) => d.i + 0.34,
          y1: 0,
          y2: "v",
          fill: PRIMARY,
          fillOpacity: 0.75,
          stroke: GUIDE,
          strokeWidth: 1.4,
        },
      ),
      // A legend, for one series.
      Plot.rect([{}], {
        fx: () => JUNK,
        x1: BARS.length - 2.5,
        x2: BARS.length - 0.5,
        y1: 88,
        y2: 98,
        fill: "none",
        stroke: MUTED,
      }),
      Plot.dot([{}], {
        fx: () => JUNK,
        x: BARS.length - 2.25,
        y: 93,
        r: 3,
        fill: PRIMARY,
      }),
      Plot.text([{}], {
        fx: () => JUNK,
        x: BARS.length - 2.05,
        y: 93,
        text: () => "Orders",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "start",
      }),

      // ── The clean panel ────────────────────────────────────────────────
      Plot.ruleY(SPARSE, { fx: () => CLEAN, stroke: "currentColor", strokeOpacity: 0.12 }),
      Plot.rect(
        rows.filter((d) => d.panel === CLEAN),
        {
          fx: "panel",
          x1: (d) => d.i - 0.36,
          x2: (d) => d.i + 0.36,
          y1: 0,
          y2: "v",
          fill: PRIMARY,
          fillOpacity: 0.8,
        },
      ),
      Plot.text([{}], {
        fx: () => CLEAN,
        frameAnchor: "top-right",
        text: () => "nothing lost",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -4,
        dy: 2,
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
