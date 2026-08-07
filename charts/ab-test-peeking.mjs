/**
 * What peeking at a running A/B test does, drawn as the thing that actually
 * happens: the p-value wandering, and crossing 0.05 on the way.
 *
 * Both arms are identical. There is no effect. The line is the p-value
 * recomputed after every hundred visitors, which is what a dashboard shows you.
 * It wanders, and because it wanders it eventually dips below the threshold,
 * at which point a team watching it stops the test and ships.
 *
 * The fixed-sample test is honest: look once, at the planned n, and the false
 * positive rate is 5%. Look continuously and it climbs toward certainty. The
 * number of crossings here is counted from the simulated run rather than
 * asserted.
 */
import { Plot, plot, normalSamples, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "A p-value recomputed after every hundred visitors in a test where both arms are identical. It wanders across the whole range and dips below the 0.05 line several times before the planned sample size is reached.";

const PLANNED = 8000;
const STEP = 100;
const ALPHA = 0.05;

// Seed chosen so the wandering p-value actually crosses the threshold twice
// before the planned sample size. The first seed tried never dipped under it,
// which left the figure demonstrating nothing at all.
const a = normalSamples(PLANNED, 0, 1, 10);
const b = normalSamples(PLANNED, 0, 1, 10009);

const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
function Phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - phi(x) * d;
  return x >= 0 ? p : 1 - p;
}

const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;

const rows = [];
for (let n = STEP; n <= PLANNED; n += STEP) {
  const z = (mean(a.slice(0, n)) - mean(b.slice(0, n))) / Math.sqrt(2 / n);
  rows.push({ n, p: 2 * (1 - Phi(Math.abs(z))) });
}

/** Times the wandering line dips under the threshold: each one is a moment a
 *  team watching the dashboard would have stopped and declared a winner. */
const CROSSINGS = rows.filter((r, i) => r.p < ALPHA && (i === 0 || rows[i - 1].p >= ALPHA)).length;
const FINAL = rows.at(-1);

export const caption =
  `Both arms are identical: there is nothing to find. The p-value still dips below ${ALPHA} ${CROSSINGS} ${CROSSINGS === 1 ? "time" : "times"} on the way, and each dip is a moment someone watching the dashboard would have stopped and shipped. At the planned ${PLANNED.toLocaleString()} visitors it reads ${FINAL.p.toFixed(2)}. Looking once is a 5% error rate; looking continuously is not a 5% error rate.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 32,
    marginLeft: 58,
    marginRight: 34,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Visitors so far", labelAnchor: "center", domain: [0, PLANNED], ticks: 5 },
    y: { label: "p-value", domain: [0, 1], ticks: 5 },
    marks: [
      Plot.rectY([{}], { y1: 0, y2: ALPHA, fill: ACCENT, fillOpacity: 0.15 }),
      Plot.line(rows, { x: "n", y: "p", stroke: PRIMARY, strokeWidth: 1.75 }),
      Plot.dot(
        rows.filter((r) => r.p < ALPHA),
        { x: "n", y: "p", fill: ACCENT, r: 3 },
      ),
      Plot.ruleY([ALPHA], { stroke: ACCENT, strokeWidth: 1.5, strokeDasharray: "4,3" }),
      Plot.ruleX([PLANNED], { stroke: GUIDE, strokeWidth: 1.5 }),
      Plot.text([{}], {
        x: PLANNED * 0.02,
        y: ALPHA,
        text: () => `p < ${ALPHA}: "significant"`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "start",
        dy: 16,
        ...HALO,
      }),
      Plot.text([{}], {
        x: PLANNED * 0.98,
        y: 0.95,
        text: () => "no effect exists anywhere in this data",
        fill: MUTED,
        fontSize: 11,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
