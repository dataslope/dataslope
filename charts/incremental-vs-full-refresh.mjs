/**
 * Why incremental models exist, and why the periodic full refresh survives.
 *
 * A full rebuild reprocesses history every run, so its cost is the size of the
 * table and grows with every day the pipeline has ever run. An incremental run
 * reprocesses one day, so its cost is the arrival rate and is flat forever.
 * After two years the gap is two orders of magnitude, which is the whole
 * argument for the materialization.
 *
 * The saw-tooth is the part the answer usually omits. Incremental models drift:
 * late-arriving facts land outside the filter window, a dimension is corrected
 * retroactively, the transformation logic itself changes. So a monthly
 * `--full-refresh` is scheduled deliberately, and the chart shows what it costs
 * when it lands. "Incremental" is not "never rebuild"; it is "rebuild on a
 * schedule you chose rather than on every run".
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Rows processed per daily run over two years. The full-rebuild line climbs steadily as history accumulates, while the incremental line stays flat at one day of arrivals apart from a monthly spike where a scheduled full refresh lands.";

const DAYS = 730;
const DAILY = 8_000;
const SEED_ROWS = 200_000;
const FULL_REFRESH_EVERY = 60;

const full = (d) => SEED_ROWS + DAILY * d;

const rows = Array.from({ length: DAYS + 1 }, (_, d) => {
  const refresh = d > 0 && d % FULL_REFRESH_EVERY === 0;
  return [
    { key: "Full rebuild every run", d, processed: full(d) },
    { key: "Incremental", d, processed: refresh ? full(d) : DAILY, refresh },
  ];
}).flat();

const INCREMENTAL = rows.filter((r) => r.key === "Incremental");
const FULL = rows.filter((r) => r.key !== "Incremental");
const RATIO = Math.round(full(DAYS) / DAILY);

export const caption = `A table taking ${DAILY.toLocaleString()} new rows a day. A full rebuild reprocesses everything that has ever landed, so its cost tracks the table; an incremental run reprocesses one day and stays flat. By day ${DAYS} that is a factor of about ${RATIO}. The spikes are deliberate: late-arriving facts and changed logic mean a scheduled \`--full-refresh\` is part of the design, so incremental means rebuilding on a cadence you picked, not never rebuilding.`;

export function render() {
  return plot({
    height: 330,
    marginTop: 26,
    marginLeft: 66,
    marginRight: 128,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Days since launch", labelAnchor: "center", domain: [0, DAYS], ticks: 6 },
    y: {
      label: "Rows processed by one run",
      type: "log",
      domain: [4_000, 12_000_000],
      ticks: [10_000, 100_000, 1_000_000, 10_000_000],
      tickFormat: (d) => (d >= 1e6 ? `${d / 1e6}M` : `${d / 1000}k`),
    },
    marks: [
      Plot.line(FULL, { x: "d", y: "processed", stroke: ACCENT, strokeWidth: 2 }),
      Plot.line(INCREMENTAL, { x: "d", y: "processed", stroke: PRIMARY, strokeWidth: 1.6 }),
      Plot.text([{}], {
        x: DAYS,
        y: full(DAYS),
        text: () => "Full rebuild\nevery run",
        fill: ACCENT,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.35,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: DAYS,
        y: DAILY,
        text: () => "Incremental",
        fill: PRIMARY,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        ...HALO,
      }),
      Plot.text([{}], {
        x: DAYS * 0.06,
        y: 6_000_000,
        text: () => "each spike is a scheduled --full-refresh",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
    ],
  });
}
