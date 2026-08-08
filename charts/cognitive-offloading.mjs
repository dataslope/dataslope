/**
 * Twenty-four numbers as digits and as a line, and the work each version asks
 * of the reader.
 *
 * The claim that a chart "offloads cognition" sounds like a metaphor. It is
 * closer to arithmetic. Answering "when did it dip, and did it recover" from
 * the table means holding a running comparison across twenty-four values in
 * working memory, which holds about four things, so the reader loses the start
 * before reaching the end and starts over. On the line the same question is
 * answered by the shape of the ink; nothing is held, nothing is compared in
 * the head, and the answer arrives before the reader has decided to look for
 * it.
 *
 * The table is not worse. It is better at what a table is for: reading one
 * exact value, checking a figure quoted somewhere else, carrying more than one
 * measure per row. Both objects contain identical information, which is what
 * makes the difference in effort a property of the *reader* rather than of the
 * data, and that is the whole idea. A chart is a way of spending the page so
 * the reader spends less.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Twenty-four monthly figures printed as a grid of numbers beside the same figures drawn as a line, where the dip in the middle of the second year is immediate in the line and has to be searched for in the grid.";

const MONTHS = 24;

/** A steady climb, a three-month dip, and a recovery: findable in the line at
 *  a glance and genuinely tedious to find in the digits. */
const SHAPE = [
  61, 63, 62, 66, 68, 67, 71, 73, 72, 76, 78, 77, 81, 83, 82, 71, 64, 66, 75,
  84, 86, 88, 91, 93,
];
const values = Array.from({ length: MONTHS }, (_, m) => ({ m, v: SHAPE[m] }));

const DIP_START = SHAPE.indexOf(Math.min(...SHAPE.slice(12, 20)));
const TROUGH = SHAPE[DIP_START];
const BEFORE = SHAPE[DIP_START - 2];
const DROP = BEFORE - TROUGH;
const RECOVERED = SHAPE.findIndex((v, i) => i > DIP_START && v >= BEFORE);

export const caption = `The claim that a chart "offloads cognition" reads like a metaphor and is closer to arithmetic. Answering "when did it dip, and did it recover" from the grid means running a comparison across ${MONTHS} values in working memory, which holds about four things, so the reader loses the beginning before reaching the end and starts again. On the line the same question is answered by the shape of the ink: nothing is held, nothing is compared in the head, and the answer arrives before the reader has decided to look for it. It fell ${DROP} from month ${DIP_START - 1} and was back above that level by month ${RECOVERED + 1}. The grid is not worse, it is better at what a grid is for: reading one exact value, checking a figure quoted elsewhere, carrying several measures per row. Both objects hold identical information, which makes the difference in effort a property of the reader rather than of the data, and that is the entire idea. A chart spends the page so the reader spends less.`;

const W = 680;
const H = 300;

const GRID = { x0: 40, y0: 62, cols: 4, colW: 62, rowH: 30 };
const LINE = { x0: 336, x1: 660, y0: 66, y1: 240 };

const cells = values.map((d) => ({
  ...d,
  gx: GRID.x0 + (d.m % GRID.cols) * GRID.colW,
  gy: GRID.y0 + Math.floor(d.m / GRID.cols) * GRID.rowH,
  dip: d.m >= DIP_START - 1 && d.m <= DIP_START + 1,
}));

const MINV = Math.min(...SHAPE) - 6;
const MAXV = Math.max(...SHAPE) + 4;
const px = (m) => LINE.x0 + (m / (MONTHS - 1)) * (LINE.x1 - LINE.x0);
const py = (v) => LINE.y1 - ((v - MINV) / (MAXV - MINV)) * (LINE.y1 - LINE.y0);

const path = values.map((d) => ({ ...d, x: px(d.m), y: py(d.v) }));
const trough = path[DIP_START];

export function render() {
  return plot({
    height: H,
    width: W,
    marginTop: 22,
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 14,
    ariaLabel: title,
    x: { axis: null, grid: false, domain: [0, W] },
    y: { axis: null, grid: false, domain: [H, 0] },
    marks: [
      Plot.text([{}], {
        x: GRID.x0,
        y: 22,
        text: () => "As digits: when did it dip?",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.text(cells, {
        x: "gx",
        y: "gy",
        text: (d) => `${d.m + 1}`,
        fill: MUTED,
        fontSize: 10,
        textAnchor: "end",
        dx: -4,
      }),
      Plot.text(cells, {
        x: "gx",
        y: "gy",
        text: (d) => String(d.v),
        fill: MUTED,
        fontSize: 11.5,
        textAnchor: "start",
      }),

      Plot.text([{}], {
        x: LINE.x0,
        y: 22,
        text: () => "As a line: already answered",
        fill: MUTED,
        fontSize: 12,
        fontWeight: 600,
        textAnchor: "start",
      }),
      Plot.line(path, { x: "x", y: "y", stroke: PRIMARY, strokeWidth: 2.1 }),
      Plot.dot([trough], { x: "x", y: "y", r: 4.5, fill: ACCENT }),
      Plot.text([trough], {
        x: "x",
        y: "y",
        text: () => `-${DROP}, back by month ${RECOVERED + 1}`,
        fill: ACCENT,
        fontSize: 10,
        fontWeight: 600,
        textAnchor: "middle",
        dy: 18,
        ...HALO,
      }),
      Plot.link([{}], {
        x1: LINE.x0,
        x2: LINE.x1,
        y1: LINE.y1 + 10,
        y2: LINE.y1 + 10,
        stroke: "currentColor",
        strokeOpacity: 0.35,
      }),
      Plot.text([{}], {
        x: LINE.x0,
        y: LINE.y1 + 26,
        text: () => "month 1",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "start",
      }),
      Plot.text([{}], {
        x: LINE.x1,
        y: LINE.y1 + 26,
        text: () => `month ${MONTHS}`,
        fill: MUTED,
        fontSize: 10,
        textAnchor: "end",
      }),
    ],
  });
}
