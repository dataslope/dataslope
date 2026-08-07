/**
 * Why a 99% accurate test is usually wrong: every person who tests positive,
 * drawn as one dot, coloured by whether they are actually sick.
 *
 * The tree in the lesson gets to 9% by arithmetic, which convinces the reader
 * without moving them — the gut answer stays "but it's 99% accurate". Natural
 * frequencies are what actually shifts the intuition, and a dot grid is
 * natural frequencies you can count. The 99 true cases are a block you can
 * take in at a glance against the 999 false alarms beside them, and the ratio
 * is the answer.
 *
 * Numbers are the lesson's own: 100,000 people, a 1-in-1,000 base rate, 99%
 * sensitivity and a 1% false-positive rate, giving 1,098 positives of whom 99
 * are sick.
 */
import { Plot, plot, ACCENT, HALO, MUTED } from "./_theme.mjs";

export const title =
  "A grid of 1,098 dots, one for each person who tests positive. A block of 99 at the start is coloured to mark the people who are actually sick; the remaining 999 are false alarms.";

export const caption =
  "Everyone who tests positive out of 100,000 people, one dot each. Only 99 of the 1,098 are actually sick, so a positive result on a 99% accurate test means about a 9% chance of disease. The test is accurate; the disease is just rare.";

const TRUE_POSITIVES = 99;
const FALSE_POSITIVES = 999;
const TOTAL = TRUE_POSITIVES + FALSE_POSITIVES;
const COLS = 61; // 61 × 18 = 1,098 exactly, so the grid has no ragged last row

const dots = Array.from({ length: TOTAL }, (_, i) => ({
  col: i % COLS,
  row: Math.floor(i / COLS),
  sick: i < TRUE_POSITIVES,
}));

const ROWS = Math.ceil(TOTAL / COLS);

export function render() {
  return plot({
    height: 340,
    marginTop: 56,
    marginBottom: 54,
    marginLeft: 16,
    marginRight: 16,
    ariaLabel: title,
    x: { label: null, ticks: [], domain: [-1, COLS], grid: false },
    // Row 0 at the top, so the sick block reads first.
    // A clear row of space above the block and below the grid: at -1.1 and
    // ROWS - 0.35 the two labels were sitting on the dots they name.
    y: { label: null, ticks: [], domain: [ROWS + 1.1, -2.2], grid: false },
    marks: [
      Plot.dot(dots, {
        x: "col",
        y: "row",
        r: 3.6,
        fill: (d) => (d.sick ? ACCENT : MUTED),
        fillOpacity: (d) => (d.sick ? 1 : 0.42),
        stroke: null,
      }),
      Plot.text([{}], {
        x: 0,
        y: -1.7,
        text: () => `${TRUE_POSITIVES} really have it`,
        fill: ACCENT,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.text([{}], {
        x: COLS - 1,
        y: ROWS + 0.7,
        text: () => `${FALSE_POSITIVES} false alarms`,
        fill: MUTED,
        fontSize: 12.5,
        fontWeight: 600,
        textAnchor: "end",
        ...HALO,
      }),
    ],
  });
}
