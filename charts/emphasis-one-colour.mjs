/**
 * Twelve bars in twelve colours, and the same twelve with one colour spent
 * where it does some work.
 *
 * Colour applied to a category the axis already names is colour spent on
 * nothing. The labels are right there; the hues repeat the labels and add a
 * legend's worth of lookup on top. Worse, a full palette flattens the chart:
 * everything is emphasised, so nothing is, and the reader's eye has no reason
 * to land anywhere in particular.
 *
 * The right panel spends the same ink differently. Eleven bars in one quiet
 * grey and one in the accent, and the chart has acquired a subject. Nothing
 * was hidden, every bar is the same height it was, and the reader now knows
 * which one the chart is about before reading a word.
 *
 * The rule generalises past bars: reach for a categorical palette when the
 * categories are the message, and for grey plus one accent whenever the
 * message is about a particular one of them.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "The same twelve bars twice: once with a different colour per bar, which emphasises everything and so emphasises nothing, and once in grey with a single bar picked out in the accent colour.";

const BARS = [
  { key: "Berlin", v: 58 },
  { key: "Madrid", v: 44 },
  { key: "Paris", v: 71 },
  { key: "Rome", v: 39 },
  { key: "Vienna", v: 52 },
  { key: "Lisbon", v: 33 },
  { key: "Dublin", v: 47 },
  { key: "Prague", v: 41 },
  { key: "Warsaw", v: 36 },
  { key: "Athens", v: 29 },
  { key: "Oslo", v: 26 },
  { key: "Zagreb", v: 22 },
];

const SUBJECT = "Paris";

const RAINBOW = "A colour per category";
const FOCUS = "One colour, spent on the point";

const rows = [RAINBOW, FOCUS].flatMap((panel) =>
  BARS.map((d, i) => ({ ...d, i, panel })),
);

const subject = BARS.find((d) => d.key === SUBJECT);
const RUNNER = [...BARS].sort((a, b) => b.v - a.v)[1];
const LEAD = Math.round(((subject.v - RUNNER.v) / RUNNER.v) * 100);

export const caption = `Colour spent on a category the axis already names is colour spent on nothing: the labels are right there, the hues repeat them, and a legend's worth of lookup is added on top. It is worse than wasteful, because a full palette flattens the chart. Everything is emphasised, so nothing is, and the eye has no reason to land anywhere. The right panel spends the same ink differently, eleven bars in one quiet grey and one in the accent, and the chart now has a subject: ${SUBJECT}, ${LEAD} percent clear of ${RUNNER.key}. Nothing was hidden and no bar changed height. The rule generalises past bars: reach for a categorical palette when the categories are the message, and for grey plus one accent whenever the message is about a particular one of them.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 34,
    marginLeft: 62,
    marginRight: 88,
    marginBottom: 46,
    ariaLabel: title,
    fx: { label: null, domain: [RAINBOW, FOCUS] },
    x: { label: null, domain: [0, 78], ticks: 3 },
    y: {
      label: null,
      domain: [BARS.length, 0],
      ticks: BARS.map((_, i) => i + 0.5),
      tickFormat: (v) => BARS[Math.floor(v)].key,
      grid: false,
    },
    marks: [
      Plot.rect(rows, {
        fx: "panel",
        x1: 0,
        x2: "v",
        y1: (d) => d.i + 0.16,
        y2: (d) => d.i + 0.84,
        fill: (d) =>
          d.panel === RAINBOW
            ? SERIES[d.i % SERIES.length]
            : d.key === SUBJECT
              ? ACCENT
              : MUTED,
        fillOpacity: (d) =>
          d.panel === RAINBOW ? 0.82 : d.key === SUBJECT ? 0.92 : 0.42,
      }),
      Plot.text([{ at: BARS.findIndex((d) => d.key === SUBJECT) + 0.5 }], {
        fx: () => FOCUS,
        x: subject.v,
        y: "at",
        text: () => `+${LEAD}% on ${RUNNER.key}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 7,
        ...HALO,
      }),
      Plot.text([{}], {
        fx: () => RAINBOW,
        frameAnchor: "bottom-right",
        text: () => "all emphasis is no emphasis",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -4,
        dy: -4,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
