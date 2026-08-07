/**
 * A circuit breaker doing its job, drawn against the thing it is protecting.
 *
 * The top panel is the dependency's error rate; the bottom is the request rate
 * actually reaching it, banded by the breaker's state. The point is the shape
 * of the recovery, not the state machine diagram: while the breaker is open,
 * *no* load reaches a service that is already failing, which is the only reason
 * it gets a chance to recover. A half-open probe sends a trickle; if the probe
 * succeeds the breaker closes and full traffic returns, and if it fails the
 * breaker re-opens without having re-buried the dependency.
 *
 * Contrast this with the naive retry loop: when the error rate spikes, retries
 * *add* load exactly when the dependency has least to give. The dashed line in
 * the lower panel is that alternative, computed from the same error rate with a
 * fixed retry budget, so the two curves are answering the same outage.
 *
 * The state timeline is derived from the error rate and the thresholds below —
 * trip above `TRIP_RATE`, wait `OPEN_MS`, probe, close on success — rather than
 * being drawn where the bands look tidy.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY, rng } from "./_theme.mjs";

export const title =
  "A dependency's error rate over two minutes, and the request rate reaching it. When the breaker opens, load falls to zero and the error rate recovers; a retry loop over the same outage adds load instead.";

const N = 120; // one point per second
const TRIP_RATE = 0.5;
const OPEN_S = 12; // seconds held open before probing
const PROBE_SHARE = 0.1; // fraction of traffic let through when half-open
const RETRY_BUDGET = 2; // extra attempts per failed request, for the comparison
const OFFERED = 100; // requests per second the callers want to send

const random = rng(7);

/**
 * The dependency's own health. It degrades badly under load and heals when
 * left alone, so the error rate depends on what the breaker did a moment ago —
 * that feedback is the whole mechanism.
 */
function simulate() {
  const rows = [];
  let health = 1; // 1 = fine, 0 = flat on its back
  let state = "closed";
  let openedAt = -Infinity;

  for (let t = 0; t < N; t++) {
    // An external shock: the dependency starts degrading at t=20 on its own.
    if (t >= 20 && t < 34) health -= 0.085;

    const allowed =
      state === "closed" ? OFFERED : state === "half-open" ? OFFERED * PROBE_SHARE : 0;
    const retried = allowed * (1 + RETRY_BUDGET * Math.max(0, 1 - health));

    // Load hurts a sick dependency and heals it when withheld.
    const pressure = retried / OFFERED;
    health += (0.055 - 0.05 * pressure) * (t >= 34 ? 1 : 0.2);
    health = Math.min(1, Math.max(0.02, health));

    const errorRate = Math.min(1, Math.max(0, 1 - health + (random() - 0.5) * 0.05));

    rows.push({ t, errorRate, allowed, state });

    // State transitions, evaluated on what just happened.
    if (state === "closed" && errorRate > TRIP_RATE) {
      state = "open";
      openedAt = t;
    } else if (state === "open" && t - openedAt >= OPEN_S) {
      state = "half-open";
    } else if (state === "half-open") {
      if (errorRate < 0.2) state = "closed";
      else if (errorRate > TRIP_RATE) {
        state = "open";
        openedAt = t;
      }
    }
  }
  return rows;
}

const ROWS = simulate();

/** The counterfactual: no breaker, same shock, retries on every failure. The
 *  dependency never gets a quiet moment, so it does not come back. */
function simulateRetries() {
  const rows = [];
  let health = 1;
  for (let t = 0; t < N; t++) {
    if (t >= 20 && t < 34) health -= 0.085;
    const errorRate = Math.min(1, Math.max(0, 1 - health));
    const offered = OFFERED * (1 + RETRY_BUDGET * errorRate);
    health += (0.055 - 0.05 * (offered / OFFERED)) * (t >= 34 ? 1 : 0.2);
    health = Math.min(1, Math.max(0.02, health));
    rows.push({ t, offered });
  }
  return rows;
}

const RETRY_ROWS = simulateRetries();

/** Contiguous runs of one state, for the background bands. */
const BANDS = (() => {
  const out = [];
  for (const r of ROWS) {
    const last = out[out.length - 1];
    if (last && last.state === r.state) last.t1 = r.t + 1;
    else out.push({ state: r.state, t0: r.t, t1: r.t + 1 });
  }
  return out.filter((b) => b.state !== "closed");
})();

const OPEN_BAND = BANDS.find((b) => b.state === "open");
const RECOVERED = ROWS.slice(-10).every((r) => r.errorRate < 0.15);
const RETRY_PEAK = Math.max(...RETRY_ROWS.map((r) => r.offered));
// Probes that were tried and failed, i.e. every half-open window followed by
// another open one. Worth naming: it is visible in the figure as the thin
// stripe inside the open band, and it is the reason a breaker needs a probe
// rather than a timer.
const PROBES = BANDS.filter((b) => b.state === "half-open").length;
const FAILED_PROBES = Math.max(0, PROBES - 1);

export const caption = RECOVERED
  ? `The breaker trips at ${Math.round(TRIP_RATE * 100)} percent errors and holds the circuit open for ${OPEN_S} seconds, during which the dependency receives nothing and starts to recover. It then lets ${Math.round(PROBE_SHARE * 100)} percent of traffic through as a probe${FAILED_PROBES > 0 ? `; the first ${FAILED_PROBES === 1 ? "one comes" : `${FAILED_PROBES} come`} back still failing, so the circuit re-opens instead of re-burying the service` : ""}. The dashed line is the same outage handled by retries instead: offered load peaks at ${Math.round(RETRY_PEAK)} requests per second against a service that cannot serve ${OFFERED}, and it never recovers.`
  : `The breaker trips at ${Math.round(TRIP_RATE * 100)} percent errors and holds the circuit open for ${OPEN_S} seconds. The dashed line is the same outage handled by retries instead.`;

// ── Layout, in a 0–1000 unit space with 0 at the top ───────────────────────
// Two stacked panels sharing one time axis. Facets cannot do it: the panels
// are a percentage and a rate, and facets share every scale. So the y scale is
// unitless and reversed, and each panel maps its own quantity into its own band
// of it — which also means the error-rate panel reads upward, the way a rate
// should, rather than inheriting the frame's direction.
const TOP = { zero: 430, full: 190 };   // error rate: 0% and 100%
const BOT = { zero: 940, full: 560 };   // requests: 0 and Y_MAX
const BAND_TOP = 170;
const BAND_BOT = 950;

const yErr = (rate) => TOP.zero - rate * (TOP.zero - TOP.full);

const Y_MAX = Math.ceil((RETRY_PEAK * 1.08) / 50) * 50;
const yReq = (v) => BOT.zero - (v / Y_MAX) * (BOT.zero - BOT.full);

const REQ_TICKS = [0, 100, 200, 300].filter((v) => v <= Y_MAX);

export function render() {
  return plot({
    height: 400,
    width: 680,
    marginLeft: 58,
    marginRight: 118,
    marginTop: 22,
    marginBottom: 40,
    ariaLabel: title,
    x: { domain: [0, N], label: "seconds \u2192", grid: false },
    y: { domain: [1000, 0], axis: null, grid: false },
    marks: [
      // ── Background state bands, across both panels ───────────────────────
      ...BANDS.map((b) =>
        Plot.rect([b], {
          x1: "t0",
          x2: "t1",
          y1: BAND_TOP,
          y2: BAND_BOT,
          fill: b.state === "open" ? ACCENT : GUIDE,
          fillOpacity: b.state === "open" ? 0.1 : 0.18,
        }),
      ),

      // ── Top panel: the dependency's error rate ───────────────────────────
      Plot.text([{}], {
        x: 0,
        y: TOP.full,
        text: () => "error rate at the dependency",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dy: -12,
      }),
      ...[0, 50, 100].map((pct) =>
        Plot.text([{ y: yErr(pct / 100) }], {
          x: 0,
          y: "y",
          text: () => `${pct}%`,
          fill: MUTED,
          fontSize: 10,
          textAnchor: "end",
          dx: -8,
        }),
      ),
      ...[50, 100].map((pct) =>
        Plot.ruleY([{ y: yErr(pct / 100) }], {
          y: "y",
          stroke: pct === TRIP_RATE * 100 ? ACCENT : GUIDE,
          strokeOpacity: pct === TRIP_RATE * 100 ? 0.8 : 0.4,
          strokeDasharray: pct === TRIP_RATE * 100 ? "4,3" : null,
        }),
      ),
      Plot.line(ROWS, {
        x: "t",
        y: (d) => yErr(d.errorRate),
        stroke: PRIMARY,
        strokeWidth: 2,
      }),
      Plot.ruleY([{ y: TOP.zero }], {
        y: "y",
        stroke: "currentColor",
        strokeOpacity: 0.3,
      }),
      Plot.text([{ y: yErr(TRIP_RATE) }], {
        x: N,
        y: "y",
        text: () => `trip at ${Math.round(TRIP_RATE * 100)}%`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
      }),

      // ── Bottom panel: the load actually reaching it ──────────────────────
      Plot.text([{}], {
        x: 0,
        y: BOT.full,
        text: () => "requests per second reaching it",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dy: -12,
      }),
      ...REQ_TICKS.map((v) =>
        Plot.text([{ y: yReq(v) }], {
          x: 0,
          y: "y",
          text: () => String(v),
          fill: MUTED,
          fontSize: 10,
          textAnchor: "end",
          dx: -8,
        }),
      ),
      Plot.areaY(ROWS, {
        x: "t",
        y1: BOT.zero,
        y2: (d) => yReq(d.allowed),
        fill: PRIMARY,
        fillOpacity: 0.2,
      }),
      Plot.line(ROWS, { x: "t", y: (d) => yReq(d.allowed), stroke: PRIMARY, strokeWidth: 2 }),
      Plot.line(RETRY_ROWS, {
        x: "t",
        y: (d) => yReq(d.offered),
        stroke: MUTED,
        strokeWidth: 1.75,
        strokeDasharray: "5,4",
      }),
      Plot.ruleY([{ y: BOT.zero }], {
        y: "y",
        stroke: "currentColor",
        strokeOpacity: 0.3,
      }),

      // Series labels at the right edge, on each line's last value.
      Plot.text([ROWS[ROWS.length - 1]], {
        x: "t",
        y: (d) => yReq(d.allowed),
        text: () => "with a breaker",
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),
      Plot.text([RETRY_ROWS[RETRY_ROWS.length - 1]], {
        x: "t",
        y: (d) => yReq(d.offered),
        text: () => "retries only",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 6,
        ...HALO,
      }),

      // The open window, named where it happens.
      ...(OPEN_BAND
        ? [
            Plot.text([{ y: (BOT.zero + BOT.full) / 2 }], {
              x: (OPEN_BAND.t0 + OPEN_BAND.t1) / 2,
              y: "y",
              text: () => "open:\nnothing gets\nthrough",
              fill: ACCENT,
              fontSize: 10,
              fontWeight: 600,
              lineHeight: 1.3,
              textAnchor: "middle",
              ...HALO,
            }),
          ]
        : []),
    ],
  });
}
