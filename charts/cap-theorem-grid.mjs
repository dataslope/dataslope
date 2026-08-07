/**
 * CAP as the choice it actually is, which is not "pick two of three".
 *
 * Network partitions are not a design option; they happen. So the theorem's
 * real content is the bottom row: *during a partition*, a system either keeps
 * answering with possibly-stale data or refuses to answer. The top row is what
 * everyone actually has when the network is fine, which is both.
 *
 * Drawn as two rows rather than a triangle for exactly that reason. The
 * triangle diagram invites the reading that CA is an available choice, and it
 * is not: a CA system is a system that has not thought about partitions.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "A two-by-two grid of network state against system choice: when the network is healthy both consistency and availability hold, and during a partition a system gives up one of them.";

const STATES = ["Network healthy", "During a partition"];
const CHOICES = ["Stay consistent (CP)", "Stay available (AP)"];

const cells = STATES.flatMap((state) =>
  CHOICES.map((choice) => ({
    state,
    choice,
    healthy: state === STATES[0],
    text:
      state === STATES[0]
        ? "consistent and available"
        : choice === CHOICES[0]
          ? "refuses writes on the\nminority side"
          : "accepts writes, and\nreads may be stale",
  })),
);

export const caption =
  "Partitions are not a design choice, so neither is P. The theorem's content is the bottom row: while the network is split, a system either refuses to serve the side that cannot reach a quorum, or serves it and accepts that some reads are stale. When the network is fine, as it usually is, every system on this grid is both. Drawing CAP as a triangle invites the one reading that is wrong, that CA is something you can pick.";

export function render() {
  return plot({
    height: 280,
    marginTop: 44,
    marginLeft: 150,
    marginRight: 24,
    marginBottom: 24,
    ariaLabel: title,
    x: { label: null, domain: CHOICES, axis: "top", padding: 0.07 },
    y: { label: null, domain: STATES, padding: 0.07 },
    marks: [
      Plot.cell(cells, {
        x: "choice",
        y: "state",
        fill: (d) => (d.healthy ? SERIES[2] : ACCENT),
        fillOpacity: (d) => (d.healthy ? 0.24 : 0.28),
      }),
      Plot.text(cells, {
        x: "choice",
        y: "state",
        text: "text",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.4,
        ...HALO,
      }),
      Plot.text([{ choice: CHOICES[0], state: STATES[0] }], {
        x: "choice",
        y: "state",
        text: () => "this row is most of the time",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 600,
        dy: 26,
        ...HALO,
      }),
      Plot.text([{ choice: CHOICES[0], state: STATES[1] }], {
        x: "choice",
        y: "state",
        text: () => "this row is the theorem",
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        dy: 30,
        ...HALO,
      }),
    ],
  });
}
