/**
 * What "IQR is robust and the standard deviation is not" means, measured.
 *
 * One dataset, then the same dataset with a single value mistyped: a 42 that
 * became 4200 because someone left the decimal point out. Nothing else about
 * the data changed, and nothing about the *middle* of it changed either, so
 * the median and the interquartile range barely move. The mean shifts, and the
 * standard deviation more than quadruples.
 *
 * The reason is structural rather than a quirk of these numbers. The standard
 * deviation squares every distance from the mean, so a point ten times further
 * out contributes a hundred times as much, and one bad row can dominate a sum
 * of two hundred good ones. A quantile only cares about the *order* of the
 * values, so moving one point from the edge to very far past the edge changes
 * where nothing sits.
 *
 * That is also the whole reason the outlier rule is built from the IQR: the
 * fence has to be drawn with a ruler the outlier cannot bend.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, normalSamples } from "./_theme.mjs";

export const title =
  "Mean, median, standard deviation and interquartile range for one dataset before and after a single mistyped value. The mean and standard deviation move sharply; the median and IQR barely move.";

const CLEAN = normalSamples(200, 42, 8, 4242).map((v) => Math.round(v * 10) / 10);
/** One row where a decimal point went missing. */
const DIRTY = [...CLEAN];
DIRTY[0] = Math.round(DIRTY[0] * 100) / 10;

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/** Linear-interpolated quantile, the default `pandas` and `numpy` use, so the
 *  numbers here match what the lesson's code prints. */
function quantile(xs, p) {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}

function sd(xs) {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

const iqr = (xs) => quantile(xs, 0.75) - quantile(xs, 0.25);

const STATS = [
  { key: "Mean", robust: false, clean: mean(CLEAN), dirty: mean(DIRTY) },
  { key: "Median", robust: true, clean: quantile(CLEAN, 0.5), dirty: quantile(DIRTY, 0.5) },
  { key: "Std dev", robust: false, clean: sd(CLEAN), dirty: sd(DIRTY) },
  { key: "IQR", robust: true, clean: iqr(CLEAN), dirty: iqr(DIRTY) },
];

const rows = STATS.flatMap((s) => [
  { ...s, when: "Clean", value: s.clean },
  { ...s, when: "One mistyped value", value: s.dirty },
]);

const shift = (s) => (s.clean === 0 ? 0 : ((s.dirty - s.clean) / s.clean) * 100);
const SD_SHIFT = shift(STATS[2]);
const IQR_SHIFT = shift(STATS[3]);

export const caption = `${CLEAN.length} measurements, then the same ${CLEAN.length} with one value mistyped (a ${CLEAN[0].toFixed(1)} entered as ${DIRTY[0].toFixed(0)}). The standard deviation moves by ${SD_SHIFT.toFixed(0)}% and the IQR by ${Math.abs(IQR_SHIFT) < 0.5 ? "under 1" : Math.abs(IQR_SHIFT).toFixed(0)}%. That is structural, not luck: the standard deviation squares every distance from the mean, so a point ten times further out counts a hundred times as much, while a quantile only cares about the *order* of the values and moving one point from the edge to far past the edge changes where nothing sits. It is also why the outlier fence is built from the IQR: the ruler has to be one the outlier cannot bend.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 30,
    marginLeft: 152,
    marginRight: 108,
    marginBottom: 46,
    ariaLabel: title,
    fy: { label: null, domain: STATS.map((s) => s.key) },
    x: { label: "Value", labelAnchor: "center", domain: [0, 46], ticks: 5 },
    y: { label: null, domain: ["Clean", "One mistyped value"], padding: 0.24, grid: false },
    marks: [
      Plot.barX(rows, {
        fy: "key",
        y: "when",
        x: "value",
        fill: (d) => (d.robust ? PRIMARY : ACCENT),
        fillOpacity: (d) => (d.when === "Clean" ? 0.45 : 0.8),
      }),
      Plot.text(rows, {
        fy: "key",
        y: "when",
        x: "value",
        text: (d) => d.value.toFixed(1),
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 7,
        ...HALO,
      }),
      Plot.ruleX([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
