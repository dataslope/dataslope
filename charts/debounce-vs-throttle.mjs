/**
 * Debounce and throttle, drawn on the same event stream, because the
 * difference is easy to state and hard to remember.
 *
 * The top row is the raw events: a burst of typing, a pause, another burst.
 * Debounce fires once, after the stream goes quiet for the delay, so it never
 * fires during a burst and a long enough burst delays it indefinitely. Throttle
 * fires at a fixed maximum rate throughout, so it responds during the burst but
 * fires many times.
 *
 * The counts underneath are computed by running both policies over the same
 * event times rather than asserted, which is what makes the tradeoff concrete:
 * one is for "tell me when they've finished", the other for "keep up, but not
 * too often".
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "One stream of events across two seconds, with the calls a debounced handler makes and the calls a throttled one makes drawn on separate rows. Debounce fires twice, after each burst; throttle fires steadily throughout.";

const WAIT = 260;
/** Two bursts of typing with a gap between them. */
const EVENTS = [
  ...Array.from({ length: 9 }, (_, i) => 60 + i * 55),
  ...Array.from({ length: 11 }, (_, i) => 1050 + i * 48),
];
const END = 2000;

/** Trailing debounce: fire `WAIT` after the last event of a quiet-bounded run. */
const debounced = EVENTS.filter((t, i) => {
  const next = EVENTS[i + 1];
  return next === undefined || next - t > WAIT;
}).map((t) => t + WAIT);

/** Leading throttle: fire, then ignore everything for `WAIT`. */
const throttled = (() => {
  const out = [];
  let last = -Infinity;
  for (const t of EVENTS) {
    if (t - last >= WAIT) {
      out.push(t);
      last = t;
    }
  }
  return out;
})();

const ROWS = [
  { key: "Events", times: EVENTS, color: MUTED },
  { key: `Debounced (${debounced.length} calls)`, times: debounced, color: PRIMARY },
  { key: `Throttled (${throttled.length} calls)`, times: throttled, color: ACCENT },
];

const marks = ROWS.flatMap((r) => r.times.map((t) => ({ row: r.key, color: r.color, t })));

export const caption =
  `${EVENTS.length} keystrokes. Debounce waits for ${WAIT}ms of quiet and fires ${debounced.length} times, once per burst, which is what you want before sending a search request. Throttle fires at most once per ${WAIT}ms and so fires ${throttled.length} times, which is what you want for a scroll handler that has to keep up. Neither is a smaller version of the other.`;

export function render() {
  return plot({
    height: 280,
    marginTop: 34,
    marginLeft: 168,
    marginRight: 24,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Milliseconds",
      labelAnchor: "center",
      domain: [0, END],
      ticks: 5,
    },
    y: { label: null, domain: ROWS.map((r) => r.key), padding: 0.5 },
    marks: [
      Plot.ruleY(ROWS, { y: "key", x1: 0, x2: END, stroke: "currentColor", strokeOpacity: 0.18 }),
      Plot.dot(marks, { x: "t", y: "row", fill: "color", r: 3 }),
      // The band value goes on the datum: as a bare option it is read as a
      // field name, resolves to undefined, and the label never renders.
      Plot.text([{ row: ROWS[1].key }], {
        x: EVENTS.at(8) + WAIT,
        y: "row",
        text: () => "fires after the\nburst goes quiet",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        dy: -18,
        ...HALO,
      }),
      Plot.text([{ row: ROWS[2].key }], {
        x: throttled[1],
        y: "row",
        text: () => "fires during it,\nat a capped rate",
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        dx: 8,
        dy: -18,
        ...HALO,
      }),
    ],
  });
}
