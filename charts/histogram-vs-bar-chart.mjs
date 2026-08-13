/**
 * The two charts side by side, drawn from one table, so the difference has
 * somewhere to come from other than the author's taste.
 *
 * Both panels count the same 420 support tickets, and both vertical axes are
 * that count, so nothing separates these charts except the variable on x. On
 * the left it is the channel the ticket arrived through, which is a set of
 * five labels: they have no order, no distance between them, and no values in
 * between, so the bars are given gaps to say so and may be sorted however
 * suits the reader. On the right it is the hours the ticket took to resolve,
 * which is a number line: every position on it exists, the order is the data,
 * and the bars therefore touch and cannot be rearranged.
 *
 * Everything else people list — "bars are separate, histogram bars touch",
 * "you can sort a bar chart", "a histogram has a bin width" — is downstream of
 * that one fact. Stating them as separate rules is what leaves an interviewee
 * reciting three of the five and missing the reason.
 *
 * The panels are hand-laid-out rather than faceted because their x scales are
 * different kinds of thing, and Plot's facets share every scale.
 */
import { Plot, plot, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelCategories, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "One set of 420 support tickets shown as two charts. On the left, a bar chart of tickets per channel: five separated bars over five unordered labels. On the right, a histogram of resolution time: touching bars over a continuous axis of hours, whose order cannot be changed.";

const N = 420;
const CHANNELS = ["Email", "Chat", "Phone", "Portal", "Social"];
/** How a ticket picks its channel, and roughly how long it then takes. Seeded:
 *  the generated module is diffed on every build. */
const WEIGHTS = [0.34, 0.27, 0.17, 0.14, 0.08];
/** Where the hours axis stops; draws that land past it are taken again. */
const HOURS_MAX = 24;

const draw = rng(70141);
const TICKETS = Array.from({ length: N }, () => {
  let r = draw();
  let k = 0;
  while (k < WEIGHTS.length - 1 && r > WEIGHTS[k]) {
    r -= WEIGHTS[k];
    k += 1;
  }
  // Resolution time: a right-skewed wait, which is what queues produce and
  // what makes the distribution worth drawing at all. Redrawn rather than
  // clipped when it lands past the axis, since clipping would pile the whole
  // tail into the last bin and invent a bump there.
  let hours = 0.4 - 5 * Math.log(1 - draw());
  while (hours >= HOURS_MAX) hours = 0.4 - 5 * Math.log(1 - draw());
  return { channel: CHANNELS[k], hours };
});

/** Left panel: a count per label, sorted, because the labels have no order of
 *  their own to preserve. */
const BY_CHANNEL = CHANNELS.map((channel) => ({
  channel,
  count: TICKETS.filter((t) => t.channel === channel).length,
})).sort((a, b) => b.count - a.count);

/** Right panel: a count per interval of one axis. */
const BIN = 2;
const HOURS = [0, HOURS_MAX];
const BINS = Array.from({ length: (HOURS[1] - HOURS[0]) / BIN }, (_, i) => ({
  x1: HOURS[0] + i * BIN,
  x2: HOURS[0] + (i + 1) * BIN,
  count: TICKETS.filter((t) => t.hours >= HOURS[0] + i * BIN && t.hours < HOURS[0] + (i + 1) * BIN)
    .length,
}));

const Y = [0, 180];
// No tick at the top of the domain: that band is where each panel's note sits.
const TICKS = [0, 50, 100, 150];

const CATEGORY = panel(0, { y: Y });
const CONTINUOUS = panel(1, { x: HOURS, y: Y });

const bars = BY_CHANNEL.map((d, i) => ({
  ...d,
  x1: CATEGORY.band(i, CHANNELS.length) - (CATEGORY.bandWidth(CHANNELS.length) * 0.6) / 2,
  x2: CATEGORY.band(i, CHANNELS.length) + (CATEGORY.bandWidth(CHANNELS.length) * 0.6) / 2,
  y: CATEGORY.py(d.count),
}));

const hist = BINS.map((b) => ({
  ...b,
  px1: CONTINUOUS.px(b.x1),
  px2: CONTINUOUS.px(b.x2),
  y: CONTINUOUS.py(b.count),
}));

/** The x-axis of the right panel, which the left panel does not have. */
const HOUR_TICKS = [0, 6, 12, 18, 24];

/** The finding the right-hand panel hands over and the left-hand one cannot:
 *  where the mass of the distribution actually sits. */
const FAST_HOURS = 6;
const FAST_SHARE = Math.round(
  (TICKETS.filter((t) => t.hours < FAST_HOURS).length / N) * 100,
);

export const caption = `Both charts count the same ${N} tickets and both vertical axes are that count, so the only difference between them is the variable on x. Channel is a set of five labels with no order, no distance and nothing in between, which is why its bars are separated and why sorting them by size costs nothing. Resolution time is a number line, so its bars touch, its order is the data rather than a choice, and the shape is the finding: ${FAST_SHARE}% of tickets close inside ${FAST_HOURS} hours and a thin tail runs the rest of the day. **A bar chart compares categories; a histogram shows a distribution**, and every other difference follows from what x is.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 30,
    marginRight: 16,
    marginBottom: 14,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(CATEGORY, { ticks: TICKS }),
      ...panelAxis(CONTINUOUS, { ticks: TICKS }),

      panelTitle(CATEGORY, "Bar chart: tickets by channel"),
      panelTitle(CONTINUOUS, "Histogram: hours to resolve"),

      panelBaseline(CATEGORY),
      panelBaseline(CONTINUOUS),

      Plot.rect(bars, {
        x1: "x1",
        x2: "x2",
        y1: CATEGORY.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.6,
      }),
      panelCategories(CATEGORY, BY_CHANNEL.map((d) => d.channel)),

      Plot.rect(hist, {
        x1: "px1",
        x2: "px2",
        y1: CONTINUOUS.py(0),
        y2: "y",
        fill: PRIMARY,
        fillOpacity: 0.6,
        // A gap of a hairline, so twelve bins read as twelve bins and still
        // read as one continuous run.
        stroke: "var(--ds-chart-surface)",
        strokeWidth: 0.75,
      }),
      Plot.text(
        HOUR_TICKS.map((v) => ({ v, x: CONTINUOUS.px(v) })),
        {
          x: "x",
          y: CONTINUOUS.bottom,
          text: (d) => `${d.v}h`,
          fill: "currentColor",
          fillOpacity: 0.62,
          fontSize: 10,
          dy: 13,
        },
      ),

      Plot.text([{}], {
        x: (CATEGORY.left + CATEGORY.right) / 2,
        y: CATEGORY.top,
        text: () => "five labels, gaps between them,\nand any order you like",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -6,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (CONTINUOUS.left + CONTINUOUS.right) / 2,
        y: CONTINUOUS.top,
        text: () => "one number line, bars touching,\nand the order is the data",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -6,
        ...HALO,
      }),
    ],
  });
}
