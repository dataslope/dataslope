/**
 * What squaring the errors does: one outlier moved across the range, and the
 * two metrics it moves.
 *
 * The dataset is fixed except for a single point, whose residual is swept from
 * 0 to 40. MAE rises linearly with it, because an absolute error contributes
 * in proportion to its size. RMSE rises far faster, because the square makes a
 * residual of 40 count as much as sixteen hundred residuals of one. By the
 * right-hand edge one point in fifty has pulled RMSE well above the level the
 * other forty-nine set.
 *
 * That is the whole choice between them, and it is a question about the domain
 * rather than about the model: use RMSE when a single large miss is genuinely
 * much worse than several small ones, and MAE when it is not.
 */
import { Plot, plot, linspace, normalSamples, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Mean absolute error and root mean squared error plotted against the size of a single outlier's residual. MAE rises as a gentle straight line; RMSE curves upward far more steeply and ends more than twice as high.";

export const caption =
  "Forty-nine residuals held fixed and one swept from zero to forty. MAE counts that point once; RMSE squares it first, so a single large miss moves it far more. Which you want is a question about what a big error costs you.";

const N = 50;
// Forty-nine ordinary residuals, seeded so the figure never churns.
const BASE = normalSamples(N - 1, 0, 3, 606).map(Math.abs);

const OUTLIERS = linspace(0, 40, 120);

const rows = OUTLIERS.map((o) => {
  const residuals = [...BASE, o];
  const mae = residuals.reduce((s, r) => s + Math.abs(r), 0) / N;
  const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / N);
  return { o, mae, rmse };
});

const METRICS = [
  { key: "RMSE", accessor: "rmse", color: ACCENT },
  { key: "MAE", accessor: "mae", color: PRIMARY },
];

const lines = METRICS.flatMap((m) =>
  rows.map((r) => ({ key: m.key, color: m.color, o: r.o, value: r[m.accessor] })),
);

const END = rows[rows.length - 1];

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 22,
    marginRight: 106,
    ariaLabel: title,
    x: {
      label: "One outlier's residual",
      labelAnchor: "center",
      domain: [0, 40],
      ticks: 5,
    },
    y: { label: "Reported error", domain: [0, Math.ceil(END.rmse) + 1], ticks: 5 },
    marks: [
      Plot.lineY(lines, {
        x: "o",
        y: "value",
        z: "key",
        stroke: (d) => d.color,
        strokeWidth: 2,
      }),
      Plot.text(
        METRICS.map((m) => ({ ...m, value: END[m.accessor] })),
        {
          x: 40,
          y: "value",
          text: (d) => `${d.key}\n${d.value.toFixed(1)}`,
          fill: (d) => d.color,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.3,
          textAnchor: "start",
          dx: 10,
        },
      ),
      // The gap between them at the right edge is the whole story.
      Plot.ruleX([40], {
        y1: END.mae,
        y2: END.rmse,
        stroke: MUTED,
        strokeWidth: 1,
        strokeDasharray: "3,3",
      }),
      Plot.text([{}], {
        x: 2,
        y: END.rmse * 1.12,
        text: () => "one point in fifty, squared",
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
