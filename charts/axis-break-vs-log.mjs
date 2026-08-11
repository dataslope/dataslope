/**
 * One enormous value among twelve small ones, and the three things people do
 * about it.
 *
 * This is the most common awkward dataset there is. One region, one customer,
 * one error code accounts for most of the total, and drawn honestly it flattens
 * everything else into a row of hairlines. All three panels here are the same
 * thirteen numbers.
 *
 * The *linear* panel is not wrong, it is just not useful: it answers "how big
 * is the big one" perfectly and every other question not at all. The *log*
 * panel is useful and honest, on one condition, which is that the axis says so
 * loudly enough for a reader to notice before they read a ratio off it. The
 * *broken* panel is the one to be careful with. It looks like the linear panel
 * and reads like the log panel, and the entire difference is a mark most
 * charting defaults will not draw for you.
 *
 * The specific failure is worth naming, because "broken axes are bad" is not
 * the lesson and would be wrong: a broken axis with a clear break marker is a
 * legitimate, well-established device. The failure is that the break is
 * *invisible by default*. A reader who does not spot it compares the bars by
 * length, which is what bars are for, and gets an answer that is off by a
 * factor of thirty.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "The same thirteen values on three vertical axes. On a linear axis the twelve small values are hairlines beside one huge one. On a broken axis with no break marker they look comparable, which is a lie. On a log axis every value is legible and the axis says what it is doing.";

/** Requests per second by endpoint: one hot path and a long tail, which is
 *  what almost every real distribution of this shape looks like. */
const ENDPOINTS = [
  { key: "/feed", rps: 2480 },
  { key: "/auth", rps: 96 },
  { key: "/search", rps: 74 },
  { key: "/user", rps: 61 },
  { key: "/media", rps: 52 },
  { key: "/notify", rps: 44 },
  { key: "/billing", rps: 31 },
  { key: "/admin", rps: 22 },
  { key: "/export", rps: 17 },
  { key: "/health", rps: 12 },
  { key: "/webhook", rps: 9 },
  { key: "/debug", rps: 6 },
  { key: "/legacy", rps: 4 },
];

const N = ENDPOINTS.length;
const BIG = ENDPOINTS[0];
const SECOND = ENDPOINTS[1];
const RATIO = Math.round(BIG.rps / SECOND.rps);

/** Where the broken axis is cut, and how much it swallows. Everything above
 *  `BREAK` is squeezed into the same space as the 0-to-BREAK band. */
const BREAK = 110;

const LINEAR = panel(0, { y: [0, 2600] });
const BROKEN = panel(1, { y: [0, 2600] });
const LOG = panel(2, { y: [3, 4000], yType: "log" });

/**
 * The broken panel's own mapping. Below the cut it behaves like a normal axis
 * over the bottom two thirds of the panel; above it, the whole remaining range
 * is compressed into the top third. Nothing marks the seam, which is the point
 * of the panel.
 */
const SPLIT = 0.66;
const brokenY = (v) => {
  const { bottom, top } = BROKEN;
  const span = top - bottom;
  if (v <= BREAK) return bottom + span * SPLIT * (v / BREAK);
  return bottom + span * (SPLIT + (1 - SPLIT) * ((v - BREAK) / (2600 - BREAK)));
};

const BAR = 0.62; // bar width as a fraction of its slot

const bars = (p, mapY) =>
  ENDPOINTS.map((d, i) => ({
    ...d,
    x1: p.band(i, N) - (p.bandWidth(N) * BAR) / 2,
    x2: p.band(i, N) + (p.bandWidth(N) * BAR) / 2,
    y: mapY(d.rps),
    y0: mapY(p === LOG ? 3 : 0),
  }));

const rows = [
  ...bars(LINEAR, LINEAR.py),
  ...bars(BROKEN, brokenY),
  ...bars(LOG, LOG.py),
].map((d) => ({ ...d, big: d.key === BIG.key }));

export const caption = `The same thirteen numbers three times: drawn linearly, cut at ${BREAK} with nothing to say so, and on a log axis. One endpoint carries ${RATIO} times the traffic of the next.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 24,
    marginLeft: 22,
    marginRight: 18,
    marginBottom: 34,
    ariaLabel: title,
    ...panelSpace(3),
    marks: [
      ...panelAxis(LINEAR, { ticks: [0, 500, 1000, 1500, 2000, 2500] }),
      // The broken panel's ticks are placed through its own mapping, which is
      // exactly how a reader gets fooled: they are evenly spaced numbers at
      // uneven distances, and nothing about them looks wrong.
      ...panelAxis(
        { ...BROKEN, py: brokenY },
        { ticks: [0, 50, 100, 1000, 2000] },
      ),
      ...panelAxis(LOG, { ticks: [10, 100, 1000], format: (v) => v.toLocaleString() }),

      panelTitle(LINEAR, "Linear: honest, useless"),
      panelTitle(BROKEN, "Broken, unmarked: a lie", { fill: ACCENT }),
      panelTitle(LOG, "Log: honest, and legible"),

      panelBaseline(LINEAR),
      panelBaseline(BROKEN),
      panelBaseline(LOG, 3),

      Plot.rect(rows, {
        x1: "x1",
        x2: "x2",
        y1: "y0",
        y2: "y",
        fill: (d) => (d.big ? ACCENT : PRIMARY),
        fillOpacity: (d) => (d.big ? 0.85 : 0.6),
      }),

      Plot.text([{}], {
        x: (BROKEN.left + BROKEN.right) / 2,
        y: BROKEN.bottom + (BROKEN.top - BROKEN.bottom) * SPLIT,
        text: () => "the axis is cut here,\nand nothing says so",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -14,
        ...HALO,
      }),
      Plot.text([{}], {
        x: LINEAR.band(6, N),
        y: LINEAR.py(0),
        text: () => "twelve values, all\nof them hairlines",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "middle",
        dy: -22,
        ...HALO,
      }),
      Plot.text([{}], {
        x: (LOG.left + LOG.right) / 2,
        y: LOG.bottom,
        text: () => "requests per second, log scale",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 16,
        ...HALO,
      }),
    ],
  });
}
