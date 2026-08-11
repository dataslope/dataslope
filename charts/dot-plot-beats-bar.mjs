/**
 * Twenty bars, and the part of them nobody is comparing.
 *
 * The values here run from 68 to 91, which is what a lot of real data looks
 * like: twenty of something, all broadly similar, and the reader wants to know
 * the order and the size of the gaps. Drawn as bars from zero, roughly three
 * quarters of every bar is the stretch from 0 to 68, which every category has
 * in common and which therefore carries no information at all. The chart is
 * mostly a rectangle with a ragged right edge, and the ragged edge is the
 * data.
 *
 * The right panel replaces each bar with a dot at its end. Nothing has moved:
 * the dots sit exactly where the bar tops were, the axis is the same, and the
 * comparison is between the same positions. What is gone is about four fifths
 * of the ink, and with it the visual weight that made twenty near-identical
 * values look like twenty near-identical things.
 *
 * The reason this is a swap and not a downgrade is the same distinction bars
 * live and die by. A bar encodes with *length*, so it has to start at zero and
 * you pay for the zero in space. A dot encodes with *position*, so it does not
 * have to start anywhere, which means the honest next step, once the ink is
 * gone, is to crop the axis to the range the data occupies and let the
 * differences fill the frame. A bar chart cannot take that step without
 * lying. This one can.
 *
 * The form is Cleveland's, from *The Elements of Graphing Data* (1985), and it
 * is the standard answer to "many categories, narrow range". The cost is that
 * a dot plot with a cropped axis no longer shows how big anything is, only how
 * it ranks and by how much, so it is the wrong chart when absolute size is the
 * question.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Twenty categories whose values all fall between 68 and 91, drawn as bars from zero and as a Cleveland dot plot. The dots sit exactly where the bar tops were, so the comparison is unchanged, but about four fifths of the ink is gone.";

/** On-time delivery rate by depot: twenty categories, a narrow spread, which
 *  is the case this chart type exists for. */
const DEPOTS = [
  ["Ashford", 91],
  ["Brindle", 89],
  ["Colwyn", 88],
  ["Dunmore", 87],
  ["Elmsley", 86],
  ["Fairhaven", 85],
  ["Garrick", 84],
  ["Holbeck", 84],
  ["Ilderton", 83],
  ["Jarrow", 82],
  ["Kelmond", 81],
  ["Larkhill", 80],
  ["Meriden", 79],
  ["Northwick", 78],
  ["Oakvale", 77],
  ["Penhurst", 75],
  ["Quarrend", 74],
  ["Ravensby", 72],
  ["Sedgely", 70],
  ["Tarnwick", 68],
].map(([depot, rate]) => ({ depot, rate }));

const AS_BARS = "As bars from zero";
const AS_DOTS = "As a dot plot";
const ORDER = DEPOTS.map((d) => d.depot);
const rows = [AS_BARS, AS_DOTS].flatMap((panel) => DEPOTS.map((d) => ({ ...d, panel })));

const MIN = Math.min(...DEPOTS.map((d) => d.rate));
const MAX = Math.max(...DEPOTS.map((d) => d.rate));
/** How much of a bar is the stretch every category shares. */
const SHARED = Math.round((MIN / MAX) * 100);

export const caption = `Twenty depots, all between ${MIN}% and ${MAX}%, which is what a great deal of real data looks like. Drawn as bars from zero, about ${SHARED}% of every bar is the part every depot has in common, so the chart is mostly one rectangle with a ragged right edge and the ragged edge is the data. The right panel puts a dot where each bar ended. Nothing moved: same axis, same positions, same comparison, four fifths less ink. It is a swap rather than a downgrade because of what each mark encodes. A bar means length, so it owes you a zero and you pay for the zero in space. A dot means position, so it owes you nothing, and the honest next step once the ink is gone is to crop the axis to the range the data actually occupies and let the differences fill the frame. A bar chart cannot take that step without lying. What a cropped dot plot gives up is absolute size, so it is the wrong chart when "how big" is the question rather than "which and by how much".`;

export function render() {
  return plot({
    height: 430,
    marginTop: 26,
    marginLeft: 84,
    marginRight: 22,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "On-time delivery (%)",
      labelAnchor: "center",
      domain: [0, 98],
      ticks: [0, 25, 50, 75],
    },
    y: { label: null, domain: ORDER, padding: 0.3, grid: false },
    fx: { label: null, domain: [AS_BARS, AS_DOTS] },
    marks: [
      Plot.barX(
        rows.filter((d) => d.panel === AS_BARS),
        { fx: "panel", y: "depot", x: "rate", fill: MUTED, fillOpacity: 0.55 },
      ),
      // A band-scale position has to arrive as data: a bare string in `y1` is
      // read as a field name, and the mark is silently dropped.
      Plot.rect([{ panel: AS_BARS, lo: ORDER.at(-1), hi: ORDER[0] }], {
        fx: "panel",
        x1: 0,
        x2: MIN,
        y1: "lo",
        y2: "hi",
        fill: ACCENT,
        fillOpacity: 0.12,
      }),
      Plot.link(
        rows.filter((d) => d.panel === AS_DOTS),
        {
          fx: "panel",
          y: "depot",
          x1: MIN - 1.5,
          x2: "rate",
          stroke: MUTED,
          strokeOpacity: 0.28,
          strokeWidth: 1,
        },
      ),
      Plot.dot(
        rows.filter((d) => d.panel === AS_DOTS),
        { fx: "panel", y: "depot", x: "rate", r: 4, fill: PRIMARY },
      ),
      Plot.text([{ panel: AS_BARS, at: ORDER[3] }], {
        fx: "panel",
        x: MIN / 2,
        y: "at",
        text: () => `every bar shares\nthis stretch: ${SHARED}%\nof the ink, none\nof the information`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.4,
        textAnchor: "middle",
        ...HALO,
      }),
      Plot.text([{ panel: AS_DOTS, at: ORDER[3] }], {
        fx: "panel",
        x: 0,
        y: "at",
        text: () => "same positions,\nno rectangle",
        fill: MUTED,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1.4,
        textAnchor: "start",
        dx: 4,
        ...HALO,
      }),
    ],
  });
}
