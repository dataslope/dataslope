/**
 * A waterfall where one bar points the wrong way, and why that is a data bug
 * rather than a styling one.
 *
 * A waterfall chart encodes a bridge from one total to another: each bar
 * starts where the last one finished, and its *direction* says whether the
 * term added or subtracted. Direction is not decoration here, it is half the
 * encoding, and the arithmetic in the reader's head is a running sum of signed
 * quantities.
 *
 * The left panel has one term drawn with its magnitude but not its sign, which
 * is what happens when a pipeline does `abs()` somewhere, or when a "costs"
 * column arrives positive because that is how the ledger stores it. Every
 * individual bar is a correct length. The chart is still wrong, because the
 * running total it draws is not the running total of the data: the end of the
 * bridge lands at a figure the business never had.
 *
 * That is the thing worth carrying away. Most misleading charts are wrong
 * about *emphasis*, and a careful reader can recover the truth from them. This
 * one is wrong about *arithmetic*: the final bar is a number, it is printed on
 * the chart, and it is not the number. No amount of care recovers it, because
 * nothing on the drawing is inconsistent with itself.
 *
 * The check that catches it takes five seconds. Add the terms up by hand and
 * see whether you land where the closing bar says you should.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";
import { panel, panelAxis, panelBaseline, panelSpace, panelTitle } from "./_panels.mjs";

export const title =
  "A five-term waterfall drawn twice. In the first, one negative term is plotted with its magnitude but not its sign, so it rises where it should fall and the closing total lands 34 too high. In the second the same term points down and the bridge closes correctly.";

/** A bridge from opening to closing revenue, in thousands. */
const TERMS = [
  { key: "Opening", v: 240, kind: "total" },
  { key: "New", v: 68, kind: "delta" },
  { key: "Expansion", v: 31, kind: "delta" },
  { key: "Churn", v: -17, kind: "delta" },
  { key: "Discounts", v: -12, kind: "delta" },
];

/** The bug: this term is drawn as +12 instead of -12. */
const BROKEN_KEY = "Discounts";

const closing = (signed) =>
  TERMS.reduce(
    (t, d) =>
      d.kind === "total" ? d.v : t + (signed || d.key !== BROKEN_KEY ? d.v : Math.abs(d.v)),
    0,
  );
const TRUE_CLOSE = closing(true);
const DRAWN_CLOSE = closing(false);
const ERROR = DRAWN_CLOSE - TRUE_CLOSE;

const MAX = 360;
const WRONG = panel(0, { y: [0, MAX] });
const RIGHT = panel(1, { y: [0, MAX] });

const N = TERMS.length + 1; // plus the closing bar
const BAR = 0.58;

/** Walk the bridge, returning one rectangle per term plus a closing total. */
function bridge(p, signed) {
  let running = 0;
  const out = [];
  TERMS.forEach((d, i) => {
    const c = p.band(i, N);
    const w = p.bandWidth(N) * BAR;
    const value = d.kind === "total" ? d.v : signed || d.key !== BROKEN_KEY ? d.v : Math.abs(d.v);
    const from = d.kind === "total" ? 0 : running;
    const to = d.kind === "total" ? d.v : running + value;
    running = to;
    out.push({
      key: d.key,
      kind: d.kind,
      value,
      wrongWay: !signed && d.key === BROKEN_KEY,
      x1: c - w / 2,
      x2: c + w / 2,
      y1: p.py(Math.min(from, to)),
      y2: p.py(Math.max(from, to)),
      top: p.py(Math.max(from, to)),
      link: p.py(to),
      c,
    });
  });
  const c = p.band(TERMS.length, N);
  const w = p.bandWidth(N) * BAR;
  out.push({
    key: "Closing",
    kind: "total",
    value: running,
    wrongWay: false,
    x1: c - w / 2,
    x2: c + w / 2,
    y1: p.py(0),
    y2: p.py(running),
    top: p.py(running),
    link: p.py(running),
    c,
  });
  return out;
}

const wrongBars = bridge(WRONG, false);
const rightBars = bridge(RIGHT, true);

/** The dotted carry lines between one bar's end and the next bar's start. */
const carries = (bars) =>
  bars.slice(0, -1).map((d, i) => ({ x1: d.x2, x2: bars[i + 1].x1, y: d.link }));

const fillFor = (d) => {
  if (d.wrongWay) return ACCENT;
  if (d.kind === "total") return MUTED;
  return d.value < 0 ? ACCENT : PRIMARY;
};

export const caption = `A waterfall is a bridge from one total to another: each bar begins where the last one ended, and its direction says whether the term added or took away. Direction is half the encoding, and the reader's running sum is a sum of signed quantities. In the left panel one term carries its magnitude and not its sign, which is what an `+"`abs()`"+` in a pipeline does, or a costs column that arrives positive because that is how the ledger stores it. Every bar is a correct length. The chart is wrong anyway, because the running total it draws is not the running total of the data, and the bridge closes at ${DRAWN_CLOSE} where the business finished at ${TRUE_CLOSE}, ${Math.abs(ERROR)} out. That is the part worth keeping. Most misleading charts are wrong about emphasis, and a careful reader can recover the truth from them. This one is wrong about arithmetic: the closing figure is printed on the chart, it is not the right figure, and nothing on the drawing contradicts anything else, so care does not help. The check that catches it takes five seconds. Add the terms up yourself and see whether you land where the last bar says.`;

export function render() {
  return plot({
    height: 340,
    marginTop: 26,
    marginLeft: 40,
    marginRight: 18,
    marginBottom: 44,
    ariaLabel: title,
    ...panelSpace(2),
    marks: [
      ...panelAxis(WRONG, { ticks: [0, 100, 200, 300] }),
      ...panelAxis(RIGHT, { ticks: [0, 100, 200, 300] }),
      panelTitle(WRONG, "One term drawn without its sign", { fill: ACCENT }),
      panelTitle(RIGHT, "The same five terms, signed", { fill: PRIMARY }),
      panelBaseline(WRONG),
      panelBaseline(RIGHT),

      ...[wrongBars, rightBars].map((bars) =>
        Plot.link(carries(bars), {
          x1: "x1",
          x2: "x2",
          y1: "y",
          y2: "y",
          stroke: "currentColor",
          strokeOpacity: 0.3,
          strokeDasharray: "3,3",
        }),
      ),
      ...[wrongBars, rightBars].map((bars) =>
        Plot.rect(bars, {
          x1: "x1",
          x2: "x2",
          y1: "y1",
          y2: "y2",
          fill: fillFor,
          fillOpacity: (d) => (d.kind === "total" ? 0.5 : 0.75),
        }),
      ),
      ...[wrongBars, rightBars].map((bars) =>
        Plot.text(bars, {
          x: "c",
          y: "top",
          text: (d) =>
            d.kind === "total"
              ? String(d.value)
              : `${d.value > 0 ? "+" : ""}${d.value}`,
          fill: (d) => (d.wrongWay ? ACCENT : MUTED),
          fontSize: 10,
          fontWeight: 700,
          textAnchor: "middle",
          dy: -8,
          ...HALO,
        }),
      ),
      ...[
        [WRONG, wrongBars],
        [RIGHT, rightBars],
      ].map(([p, bars]) =>
        Plot.text(bars, {
          x: "c",
          y: p.py(0),
          text: "key",
          fill: "currentColor",
          fillOpacity: 0.6,
          fontSize: 10,
          textAnchor: "middle",
          dy: 13,
        }),
      ),

      // One block, in the empty band below the bridge, because the two halves
      // of the point are one point.
      Plot.text([{}], {
        x: WRONG.band(2.6, N),
        y: WRONG.py(150),
        text: () =>
          `${BROKEN_KEY} is \u2212${Math.abs(TERMS.at(-1).v)} and is drawn upward,\nso the bridge closes at ${DRAWN_CLOSE}\nwhere the business finished at ${TRUE_CLOSE}.`,
        fill: ACCENT,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.45,
        textAnchor: "middle",
        ...HALO,
      }),
    ],
  });
}
