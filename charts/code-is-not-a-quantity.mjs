/**
 * Four columns of numbers, four means, and not one of them means anything.
 *
 * Every value here is stored as an integer, so every one of them will average,
 * sum, correlate and go into a regression without a warning. The arithmetic is
 * valid in the sense that it completes. The results are nonsense in a way that
 * only the column's *meaning* can reveal, which is why the type system cannot
 * help and a data dictionary can.
 *
 * The four failures are different, and worth separating:
 *
 *   • a **postcode** is nominal. 90210 is not more than 10001, it is a
 *     different place, and the mean of two postcodes is usually the sea.
 *   • a **survey code** is ordinal at best, and here it is not even that,
 *     because 9 is the code for "prefer not to say" and averaging it into a
 *     five-point scale pulls the result up by a whole point.
 *   • a **jersey number** is a label with a tradition attached, and no reader
 *     of a mean of 23.4 learns anything about the team.
 *   • a **year** is interval. Differences work (2024 minus 2019 is five
 *     years); the mean is fine; ratios are not, and "2024 is 1.005 times
 *     2014" is a sentence nobody should write.
 *
 * The habit that catches all four: for each numeric column, ask whether
 * *doubling it* means anything. If not, it is a label with digits in it, and
 * belongs in the dataframe as a category, not an int.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, mean } from "./_theme.mjs";

export const title =
  "Four numeric-looking columns with their means computed: postcodes, survey codes including a 9 for no answer, jersey numbers and years. Every mean is arithmetically valid and only one of them means anything.";

const COLUMNS = [
  {
    key: "Postcode",
    values: [90210, 10001, 60614, 33139, 20852],
    scale: "nominal",
    verdict: "the mean is a point in the ocean",
    valid: false,
  },
  {
    key: "Survey code",
    values: [1, 2, 4, 5, 9],
    scale: "ordinal, with a 9 that is not on the scale",
    verdict: "9 means “no answer” and adds a whole point",
    valid: false,
  },
  {
    key: "Jersey number",
    values: [7, 10, 23, 45, 32],
    scale: "nominal",
    verdict: "23.4 describes no player",
    valid: false,
  },
  {
    key: "Year",
    values: [2014, 2018, 2021, 2022, 2024],
    scale: "interval",
    verdict: "the mean is fine; the ratio is not",
    valid: true,
  },
].map((d) => ({ ...d, mean: mean(d.values) }));

const ORDER = COLUMNS.map((d) => d.key);
/** The survey column with the 9s removed, which is the answer the analyst
 *  wanted and is a whole point lower. */
const SURVEY = COLUMNS[1];
const CLEAN = mean(SURVEY.values.filter((v) => v <= 5));
const SHIFT = (SURVEY.mean - CLEAN).toFixed(1);

export const caption = `Four integer columns that will average, sum, correlate and enter a regression without a warning. Averaging in the code 9 for "prefer not to say" lifts the survey result by ${SHIFT} of a point, from ${CLEAN.toFixed(1)} to ${SURVEY.mean.toFixed(1)}.`;

export function render() {
  return plot({
    height: 300,
    marginTop: 26,
    marginLeft: 120,
    marginRight: 214,
    marginBottom: 34,
    ariaLabel: title,
    x: { axis: null, domain: [0, 1] },
    y: { label: null, domain: ORDER, padding: 0.42, grid: false },
    marks: [
      Plot.ruleY(ORDER, { stroke: "currentColor", strokeOpacity: 0.08 }),
      Plot.text(COLUMNS, {
        x: 0.02,
        y: "key",
        text: (d) => d.values.join("   "),
        fill: "currentColor",
        fillOpacity: 0.85,
        fontSize: 11.5,
        textAnchor: "start",
        dy: -8,
      }),
      Plot.text(COLUMNS, {
        x: 0.02,
        y: "key",
        text: (d) => `${d.scale}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 500,
        textAnchor: "start",
        dy: 10,
      }),
      Plot.text(COLUMNS, {
        x: 1,
        y: "key",
        text: (d) => `mean = ${d.mean.toFixed(1)}`,
        fill: (d) => (d.valid ? PRIMARY : ACCENT),
        fontSize: 11.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 8,
        dy: -8,
        ...HALO,
      }),
      Plot.text(COLUMNS, {
        x: 1,
        y: "key",
        text: "verdict",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 500,
        textAnchor: "start",
        dx: 8,
        dy: 10,
        ...HALO,
      }),
      Plot.text([{ at: ORDER.at(-1) }], {
        x: 0.02,
        y: "at",
        text: () => "For each column: does doubling it mean anything?",
        fill: MUTED,
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dy: 40,
        ...HALO,
      }),
    ],
  });
}
