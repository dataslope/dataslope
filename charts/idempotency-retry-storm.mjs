/**
 * Why a retry policy without jitter turns a blip into an outage.
 *
 * A thousand clients hit a service that fails briefly. With plain exponential
 * backoff every client waits the same interval and they all come back at the
 * same instant, so the recovering service is hit by the full load in a spike,
 * fails again, and the whole population synchronises harder each round. With
 * jitter the same backoff spreads the same clients over the window and the
 * service sees a load it can actually absorb.
 *
 * The peaks are computed by bucketing the retry times of a simulated client
 * population, so the ratio between the two policies is measured rather than
 * asserted. The service's capacity is drawn as a line, because the number that
 * matters is not how many retries there are but how many arrive at once.
 */
import { Plot, plot, rng, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Retry arrivals per 100ms bucket for a thousand clients, with and without jitter. Without jitter the retries land in three tall spikes far above the service's capacity; with jitter they spread into a flat band below it.";

const CLIENTS = 1000;
const CAPACITY = 90;
const BASE = 400;
const ROUNDS = 3;
const BUCKET = 100;
const WINDOW = 4000;

const next = rng(60613);

/** Arrival times for one policy, over three backoff rounds. */
function arrivals(jitter) {
  const out = [];
  for (let c = 0; c < CLIENTS; c++) {
    for (let r = 0; r < ROUNDS; r++) {
      const backoff = BASE * 2 ** r;
      // Full jitter: uniform in [0, backoff]. Without it, everyone waits exactly
      // `backoff` and lands on the same millisecond.
      out.push(jitter ? next() * backoff + BASE * (2 ** r - 1) : backoff + BASE * (2 ** r - 1));
    }
  }
  return out;
}

function bucketed(times, key) {
  const counts = new Map();
  for (const t of times) {
    if (t > WINDOW) continue;
    const b = Math.floor(t / BUCKET) * BUCKET;
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return [...counts.entries()].map(([t, n]) => ({ panel: key, t, n }));
}

const PLAIN = "Backoff alone";
const JITTERED = "Backoff with jitter";
const rows = [
  ...bucketed(arrivals(false), PLAIN),
  ...bucketed(arrivals(true), JITTERED),
];

const peak = (key) => Math.max(...rows.filter((r) => r.panel === key).map((r) => r.n));
const PEAK_PLAIN = peak(PLAIN);
const PEAK_JITTER = peak(JITTERED);

export const caption =
  `${CLIENTS.toLocaleString()} clients, the same backoff schedule, one difference. Without jitter every client waits the identical interval and ${PEAK_PLAIN} arrive in the same 100ms, against a service that can take ${CAPACITY}: the recovery attempt is itself the outage. With jitter the peak is ${PEAK_JITTER}. The retries did not go away; they stopped being simultaneous.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 34,
    marginLeft: 58,
    marginBottom: 48,
    ariaLabel: title,
    fx: { label: null, domain: [PLAIN, JITTERED] },
    x: { label: "Milliseconds after the failure", labelAnchor: "center", domain: [0, WINDOW], ticks: 4 },
    y: {
      type: "sqrt",
      label: "Retries in a 100ms window",
      domain: [0, PEAK_PLAIN * 1.1],
      ticks: 5,
    },
    marks: [
      Plot.rectY(rows, {
        x1: "t",
        x2: (d) => d.t + BUCKET,
        y: "n",
        fx: "panel",
        fill: (d) => (d.n > CAPACITY ? ACCENT : PRIMARY),
        fillOpacity: 0.55,
      }),
      Plot.ruleY([CAPACITY], { stroke: GUIDE, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.text([{ panel: JITTERED }], {
        x: WINDOW - 60,
        y: CAPACITY,
        fx: "panel",
        text: () => `what the service can take: ${CAPACITY}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "end",
        dy: -9,
        ...HALO,
      }),
      Plot.text([{ panel: PLAIN }], {
        x: WINDOW - 60,
        y: PEAK_PLAIN,
        fx: "panel",
        text: () => `peak ${PEAK_PLAIN}`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.text([{ panel: JITTERED }], {
        x: WINDOW - 60,
        y: PEAK_PLAIN,
        fx: "panel",
        text: () => `peak ${PEAK_JITTER}`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
