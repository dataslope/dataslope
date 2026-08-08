/**
 * Three years of a seasonal series folded onto one calendar, so that the same
 * month in different years sits in the same place.
 *
 * A continuous time axis is the right default and the wrong choice for a
 * seasonal question. Drawn end to end, three Decembers are thirty-six months
 * apart on the page, so "was this December better than last December?" becomes
 * a memory test: hold the height of one peak in your head, travel a third of
 * the width of the chart, compare. Nobody does that accurately, and the answer
 * the eye volunteers instead is about the trend, which is a different question.
 *
 * Folding the axis to month-of-year puts the three Decembers an inch apart and
 * makes the comparison a glance. The price is real: the folded chart cannot
 * show the trend except as a stack of lines, and it cannot say anything about
 * the order of events across a year boundary. Seasonality and trend are two
 * questions, so this is two charts rather than one chart improved.
 *
 * The muted-earlier-years treatment is the other half of the technique. Three
 * equally weighted lines is a small spaghetti plot; one line in the accent and
 * the rest as context says which year the chart is about.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Three years of monthly sales overlaid on a shared January-to-December axis, latest year emphasised. Each year peaks in December, and the middle year's December is visibly short of the other two.";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const YEARS = [2022, 2023, 2024];

/** A December peak, a February trough, mild year-on-year growth, and one weak
 *  December so the fold has something to report. */
const SEASON = [-14, -20, -8, -2, 3, 6, 2, -1, 4, 11, 26, 48];
const WOBBLE = [1.4, -2.1, 0.8, 2.6, -1.3, 0.5, -2.4, 1.9, -0.7, 2.2, -1.8, 0.9];

const series = YEARS.flatMap((year, y) =>
  MONTHS.map((month, m) => ({
    year,
    month,
    m,
    latest: y === YEARS.length - 1,
    v:
      100 +
      y * 9 +
      SEASON[m] +
      WOBBLE[(m + y) % 12] +
      (year === 2023 && m === 11 ? -19 : 0),
  })),
);

const decembers = series.filter((d) => d.m === 11);
const DENT = Math.round(decembers[0].v - decembers[1].v);

const ends = YEARS.map((year) => series.find((d) => d.year === year && d.m === 11));

export const caption = `Three years, folded so the same month lands in the same place. A continuous time axis is the right default and the wrong choice here: end to end, three Decembers are a third of the chart apart, so "was this December better than last?" is a memory test, and the answer the eye volunteers instead is about the trend, which nobody asked for. Folded, the comparison is a glance: ${YEARS[1]} came in ${DENT} short of ${YEARS[0]} despite the year being larger overall. The price is the trend, which this chart can only show as a stack of lines, and any sense of what happened across a year boundary. Seasonality and trend are two questions, so this is two charts, not one chart improved. Muting the earlier years is the other half of the technique: three equal lines is a small spaghetti plot, one accent line and two in grey says which year the chart is about.`;

export function render() {
  return plot({
    height: 320,
    marginTop: 24,
    marginLeft: 52,
    marginRight: 62,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: null,
      domain: [0, MONTHS.length - 1],
      ticks: MONTHS.map((_, i) => i),
      tickFormat: (i) => MONTHS[i],
    },
    y: { label: "Sales (index)", domain: [70, 172], ticks: 4 },
    marks: [
      Plot.line(series, {
        x: "m",
        y: "v",
        z: "year",
        stroke: (d) => (d.latest ? ACCENT : MUTED),
        strokeWidth: (d) => (d.latest ? 2.3 : 1.4),
        strokeOpacity: (d) => (d.latest ? 1 : 0.75),
      }),
      Plot.dot(decembers, {
        x: "m",
        y: "v",
        r: 4,
        fill: (d) => (d.latest ? ACCENT : MUTED),
      }),
      // The dent, drawn as the gap it is.
      Plot.link([{}], {
        x1: 11,
        x2: 11,
        y1: decembers[1].v,
        y2: decembers[0].v,
        stroke: PRIMARY,
        strokeWidth: 1.6,
      }),
      Plot.text([{ at: (decembers[0].v + decembers[1].v) / 2 }], {
        x: 11,
        y: "at",
        text: () => `${DENT} short`,
        fill: PRIMARY,
        fontSize: 10.5,
        fontWeight: 600,
        textAnchor: "end",
        dx: -8,
        ...HALO,
      }),
      // Year labels at the right-hand end, in place of a legend.
      ...ends.map((d) =>
        Plot.text([d], {
          x: "m",
          y: "v",
          text: () => String(d.year),
          fill: d.latest ? ACCENT : MUTED,
          fontSize: 11,
          fontWeight: 600,
          textAnchor: "start",
          dx: 9,
          ...HALO,
        }),
      ),
    ],
  });
}
