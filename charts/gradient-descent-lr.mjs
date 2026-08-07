/**
 * The learning rate, drawn as the three things it can do to a run.
 *
 * The same quadratic loss and the same starting point, descended with three
 * step sizes. Too small and the run is still nowhere near the minimum when the
 * budget runs out. About right and it converges in a handful of steps. Too
 * large and the update overshoots by more than the distance it was trying to
 * close, so the loss climbs every step and diverges.
 *
 * The divergent run is the one worth drawing: people expect a bad learning
 * rate to converge slowly, and what it actually does is explode. The y axis is
 * logarithmic so the three fit in one frame, and the diverging line clips
 * rather than dragging the scale.
 *
 * The paths are real gradient descent on f(x) = x², not sketches; the
 * threshold at which it diverges (a rate of 1) is a property of that function
 * and is annotated as such.
 */
import { Plot, plot, ACCENT, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "Loss against step for gradient descent at three learning rates on the same quadratic: one barely moving, one converging within about ten steps, and one climbing away by orders of magnitude.";

export const caption =
  "Same loss surface, same starting point, three step sizes. Too small and it has barely moved when the budget runs out; about right and it is done in ten steps; too large and each update overshoots by more than it closes, so the loss grows without bound. A diverging run is not a slow run, and the difference is one number.";

const STEPS = 26;
const START = 8;
/** f(x) = x², f'(x) = 2x. Divergence begins at a rate of 1. */
const RATES = [
  { lr: 0.004, key: "lr = 0.004 · too small" },
  { lr: 0.25, key: "lr = 0.25 · about right" },
  { lr: 1.05, key: "lr = 1.05 · diverges" },
];

const rows = RATES.flatMap((r, i) => {
  let x = START;
  return Array.from({ length: STEPS }, (_, step) => {
    const loss = x * x;
    x -= r.lr * 2 * x;
    return { key: r.key, color: SERIES[i % SERIES.length], step, loss: Math.max(loss, 2e-6) };
  });
});

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 130,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Step", labelAnchor: "center", domain: [0, STEPS - 1], ticks: 5 },
    y: {
      type: "log",
      label: "Loss",
      // Floor low enough that the converging run lands inside the frame rather
      // than dropping off the bottom edge with its label.
      domain: [1e-6, 1e5],
      ticks: [1e-6, 1e-3, 1, 1e3, 1e5],
      tickFormat: (d) => (d === 1 ? "1" : `1e${Math.round(Math.log10(d))}`),
    },
    marks: [
      Plot.line(rows, { x: "step", y: "loss", stroke: "color", strokeWidth: 2, clip: true }),
      // Direct labels at each run's last visible point; a legend would make the
      // eye travel away from three lines that cross.
      Plot.text(
        RATES.map((r, i) => {
          const last = rows.filter((d) => d.key === r.key).at(-1);
          // Clamped into the frame: the diverging run ends above the top and the
          // converging one below the bottom, and a label outside the plot area
          // is a label nobody reads.
          return {
            key: r.key,
            color: SERIES[i % SERIES.length],
            loss: Math.min(Math.max(last.loss, 4e-6), 6e4),
          };
        }),
        {
          x: STEPS - 1,
          y: "loss",
          text: "key",
          fill: "color",
          fontSize: 10.5,
          fontWeight: 600,
          textAnchor: "start",
          dx: 8,
          ...HALO,
        },
      ),

      Plot.text([{}], {
        x: 1,
        y: 3e4,
        text: () => "on f(x) = x², any rate above 1 diverges",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
