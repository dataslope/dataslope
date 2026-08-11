/**
 * The four measurement scales, as the four questions you are allowed to ask.
 *
 * Stevens's 1946 taxonomy is usually taught as four names to memorise, and the
 * names are the least useful part. What matters is that each scale *licenses*
 * a set of operations and forbids the rest, and that a computer will happily
 * perform the forbidden ones and return a number.
 *
 * Read this as a ladder. Each rung keeps everything the rung below it allows
 * and adds one new question:
 *
 *   • **Nominal** answers only *are these the same?* Blood group, country,
 *     error code. You may count, take a mode, and compare for equality.
 *   • **Ordinal** adds *which is more?* A survey scale, a race position, a
 *     severity level. You may take a median and rank. You may not subtract:
 *     the distance from "agree" to "strongly agree" is not a known quantity
 *     and is not the same as the distance from "neutral" to "agree".
 *   • **Interval** adds *how much more?* Celsius, calendar dates, IQ scores.
 *     Differences are meaningful, so a mean and a standard deviation are
 *     defined. Ratios are not, because zero is a convention: 20 °C is not
 *     twice as hot as 10 °C.
 *   • **Ratio** adds *how many times more?* Length, mass, counts, duration,
 *     income. Zero means none of the thing, so ratios mean what they say and
 *     a geometric mean and a coefficient of variation both become available.
 *
 * The practical value is in the *forbidden* column. Almost every statistical
 * mistake with a categorical variable is an operation from a higher rung
 * applied to a lower one, and none of them raises an error.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY, SERIES } from "./_theme.mjs";

export const title =
  "The four measurement scales as a ladder from nominal to ratio, with the operations each one licenses. Each rung keeps everything below it and adds one question: are these the same, which is more, how much more, how many times more.";

const SCALES = [
  {
    key: "Nominal",
    asks: "Are these the same?",
    example: "country, error code, blood group",
    centre: "mode",
    ok: ["=", "count"],
  },
  {
    key: "Ordinal",
    asks: "Which is more?",
    example: "survey scale, race position, severity",
    centre: "median",
    ok: ["=", "count", "<"],
  },
  {
    key: "Interval",
    asks: "How much more?",
    example: "Celsius, calendar date, IQ",
    centre: "mean, SD",
    ok: ["=", "count", "<", "−"],
  },
  {
    key: "Ratio",
    asks: "How many times more?",
    example: "length, mass, duration, income",
    centre: "geometric mean, CV",
    ok: ["=", "count", "<", "−", "÷"],
  },
];

const OPS = ["=", "count", "<", "−", "÷"];
const OP_NAMES = {
  "=": "equality",
  count: "counting",
  "<": "order",
  "−": "difference",
  "÷": "ratio",
};

const ORDER = SCALES.map((d) => d.key);
const cells = SCALES.flatMap((s) =>
  OPS.map((op) => ({ key: s.key, op, allowed: s.ok.includes(op) })),
);

export const caption = `Stevens's four scales as a ladder: each rung keeps every operation below it and adds one question. Nominal asks only whether two values are the same; ratio asks how many times more.`;

export function render() {
  return plot({
    height: 310,
    marginTop: 46,
    marginLeft: 206,
    marginRight: 168,
    marginBottom: 26,
    ariaLabel: title,
    x: { axis: "top", label: null, domain: OPS, padding: 0.08 },
    // The scale names are printed with their questions on the left instead
    // of on an axis, so the two do not sit on top of each other.
    y: { axis: null, domain: ORDER, padding: 0.12, grid: false },
    marks: [
      Plot.cell(cells, {
        x: "op",
        y: "key",
        fill: (d) => (d.allowed ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.allowed ? 0.26 : 0.06),
        inset: 2.5,
        rx: 3,
      }),
      ...[true, false].map((allowed) =>
        Plot.text(
          cells.filter((d) => d.allowed === allowed),
          {
            x: "op",
            y: "key",
            text: (d) => (allowed ? d.op : "·"),
            fill: allowed ? PRIMARY : MUTED,
            fontSize: allowed ? 13 : 12,
            fontWeight: allowed ? 700 : 400,
            textAnchor: "middle",
          },
        ),
      ),
      // Band positions have to arrive as data: a bare string in `x` is read
      // as a field name and the mark is dropped without a word.
      Plot.text(
        SCALES.map((d) => ({ ...d, firstOp: OPS[0], lastOp: OPS.at(-1) })),
        {
        x: "firstOp",
        y: "key",
        text: (d) => `${d.asks}\n${d.example}`,
        fill: MUTED,
        fontSize: 10,
        fontWeight: 500,
        lineHeight: 1.4,
        textAnchor: "end",
        dx: -30,
        dy: 8,
        ...HALO,
      },
      ),
      Plot.text(
        SCALES.map((d) => ({ ...d, firstOp: OPS[0] })),
        {
          x: "firstOp",
          y: "key",
          text: "key",
          fill: "currentColor",
          fillOpacity: 0.88,
          fontSize: 12.5,
          fontWeight: 700,
          textAnchor: "end",
          dx: -30,
          dy: -14,
          ...HALO,
        },
      ),
      Plot.text(
        SCALES.map((d) => ({ ...d, lastOp: OPS.at(-1) })),
        {
        x: "lastOp",
        y: "key",
        text: (d) => `centre: ${d.centre}`,
        fill: (d, i) => SERIES[i],
        fontSize: 10.5,
        fontWeight: 700,
        textAnchor: "start",
        dx: 26,
        ...HALO,
      },
      ),
      Plot.text(
        OPS.map((op) => ({ op, name: OP_NAMES[op], row: ORDER.at(-1) })),
        {
          x: "op",
          y: "row",
          text: "name",
          fill: MUTED,
          fontSize: 10,
          fontWeight: 600,
          textAnchor: "middle",
          dy: 26,
          ...HALO,
        },
      ),
    ],
  });
}
