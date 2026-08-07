/**
 * Why a service that is "only" 90% utilised feels broken: queueing delay does
 * not grow with load, it explodes as load approaches capacity.
 *
 * For an M/M/1 queue the mean wait is ρ/(1-ρ) service times. That denominator
 * is the whole story: at 50% utilisation you wait one service time, at 90% you
 * wait nine, and at 99% you wait ninety-nine. Every point on the left half of
 * this chart looks fine, and the difference between the last two is a
 * capacity plan.
 *
 * Marked at the utilisations people actually run at, with the waits computed
 * rather than typed. The y axis is capped well below the asymptote so the
 * usable range stays readable; the curve is clipped and the caption says where
 * it goes.
 */
import { Plot, plot, linspace, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Mean queueing delay against utilisation for a single-server queue: flat and low until about seventy percent, then rising steeply and heading for infinity as utilisation approaches one.";

/** Mean wait in units of service time for M/M/1. */
const wait = (rho) => rho / (1 - rho);

const curve = linspace(0, 0.985, 220).map((rho) => ({ rho, wait: wait(rho) }));
const MARKS = [0.5, 0.8, 0.9, 0.95].map((rho) => ({ rho, wait: wait(rho) }));
const NINETY = MARKS.find((m) => m.rho === 0.9);
const FIFTY = MARKS.find((m) => m.rho === 0.5);

export const caption =
  `Mean wait is ρ/(1-ρ) service times, so it is the headroom that matters rather than the load. At ${FIFTY.rho * 100}% utilisation you wait ${FIFTY.wait.toFixed(0)} service time; at ${NINETY.rho * 100}% you wait ${NINETY.wait.toFixed(0)}; at 99% you wait 99. Running a queue near capacity is not efficient, it is the point just before the latency graph goes vertical.`;

const YMAX = 22;

export function render() {
  return plot({
    height: 340,
    marginTop: 32,
    marginLeft: 60,
    marginRight: 34,
    marginBottom: 48,
    ariaLabel: title,
    x: {
      label: "Utilisation",
      labelAnchor: "center",
      domain: [0, 1],
      ticks: 5,
      tickFormat: "%",
    },
    y: {
      label: "Mean wait (service times)",
      domain: [0, YMAX],
      ticks: 5,
      tickFormat: (d) => `${d}x`,
    },
    marks: [
      Plot.areaY(curve, { x: "rho", y: "wait", fill: PRIMARY, fillOpacity: 0.12, clip: true }),
      Plot.line(curve, { x: "rho", y: "wait", stroke: PRIMARY, strokeWidth: 2, clip: true }),
      Plot.ruleX(MARKS, { x: "rho", y1: 0, y2: "wait", stroke: GUIDE, strokeOpacity: 0.5, clip: true }),
      Plot.dot(MARKS, { x: "rho", y: "wait", fill: ACCENT, r: 4, clip: true }),
      Plot.text(MARKS, {
        x: "rho",
        y: "wait",
        text: (d) => `${(d.rho * 100).toFixed(0)}% → ${d.wait.toFixed(0)}x`,
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
        dy: -8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0.985,
        y: YMAX - 3,
        text: () => "and straight up\nfrom here",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "end",
        dx: -6,
        ...HALO,
      }),
      Plot.text([{}], {
        x: 0.02,
        y: 3,
        text: () => "everything on this half looks fine",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
