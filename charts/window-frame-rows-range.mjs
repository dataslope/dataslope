/**
 * `ROWS` against `RANGE`, drawn as the rows each frame actually admits.
 *
 * The frame clause is the part of `OVER` that candidates skip, and the ROWS /
 * RANGE distinction is where it bites: `ROWS` counts positions, `RANGE` counts
 * *values*, so `RANGE` silently pulls in every row that ties with the current
 * one on the `ORDER BY` key. On a running total ordered by a date with several
 * events on the same day, that is the difference between "the total so far"
 * and "the total including the rest of today", and the two disagree by exactly
 * the peer group.
 *
 * Drawn as bands over one ordered row set rather than as four computed series,
 * because the frames are the subject and their four running totals would need
 * four different y ranges to compare. Both scales are continuous and the frame
 * names are painted on by `tickFormat`: a band scale would let `Plot.cell` do
 * the layout, but then the row positions could not carry numeric ticks, and the
 * positions are half the point.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Fourteen ordered rows with four window frames drawn over them. The two ROWS frames stop at the current row; the RANGE frame extends past it to cover the rows that tie with it on the ORDER BY key.";

/** Day for each row position. Days 4 and 5 carry three rows each, so the
 *  peer groups a RANGE frame sweeps up are visible rather than asserted. */
const DAYS = [1, 2, 3, 4, 4, 4, 5, 5, 5, 6, 7, 8, 9, 10];
const CURRENT = 7; // 1-based position, the first row of day 5

const N = DAYS.length;
const CURRENT_DAY = DAYS[CURRENT - 1];
const PEERS = DAYS.map((d, i) => ({ d, i: i + 1 })).filter((r) => r.d === CURRENT_DAY);
const PEER_END = PEERS.at(-1).i;
const EXTRA = PEER_END - CURRENT;

const FRAMES = [
  { label: "ROWS UNBOUNDED PRECEDING", from: 1, to: CURRENT, note: "positions, up to here" },
  { label: "ROWS 2 PRECEDING", from: CURRENT - 2, to: CURRENT, note: "a fixed-width window" },
  {
    label: "RANGE UNBOUNDED PRECEDING",
    from: 1,
    to: PEER_END,
    note: "values, so the rest of the day comes too",
    range: true,
  },
  { label: "ROWS 1 FOLLOWING", from: CURRENT, to: CURRENT + 1, note: "looks ahead by position" },
];

const CELLS = FRAMES.flatMap((f, row) =>
  Array.from({ length: N }, (_, i) => {
    const pos = i + 1;
    return {
      row,
      pos,
      inside: pos >= f.from && pos <= f.to,
      // The rows RANGE admits that ROWS would not: the peers after the
      // current one, which is the entire difference between the two.
      peer: Boolean(f.range) && pos > CURRENT && pos <= PEER_END,
    };
  }),
);

export const caption = `Fourteen rows ordered by day, three of them sharing day ${CURRENT_DAY} with the current row at position ${CURRENT}. The two \`ROWS\` frames count positions and stop where told. \`RANGE\` compares *values*, so its frame runs to the end of the peer group and quietly admits ${EXTRA} rows that come after the current one. On a running total over a date column with several events a day, that is the gap between "the total so far" and "the total including the rest of today".`;

export function render() {
  return plot({
    height: 300,
    marginTop: 54,
    marginLeft: 200,
    marginRight: 20,
    marginBottom: 46,
    ariaLabel: title,
    x: {
      label: "Row position, ordered by day",
      labelAnchor: "center",
      domain: [0.4, N + 0.6],
      ticks: DAYS.map((_, i) => i + 1),
    },
    y: {
      label: null,
      domain: [FRAMES.length - 0.4, -0.78],
      ticks: FRAMES.map((_, i) => i),
      tickFormat: (i) => FRAMES[i].label,
      grid: false,
    },
    marks: [
      Plot.rect(CELLS, {
        x1: (d) => d.pos - 0.44,
        x2: (d) => d.pos + 0.44,
        y1: (d) => d.row - 0.26,
        y2: (d) => d.row + 0.26,
        fill: (d) => (d.peer ? ACCENT : d.inside ? PRIMARY : MUTED),
        fillOpacity: (d) => (d.inside ? 0.5 : 0.12),
      }),
      Plot.ruleX([CURRENT], { stroke: GUIDE, strokeWidth: 1.6, strokeDasharray: "4 3" }),
      Plot.text([{}], {
        x: CURRENT,
        y: -0.78,
        text: () => "current row",
        fill: GUIDE,
        fontSize: 11,
        fontWeight: 600,
        dy: -10,
        ...HALO,
      }),
      // The day each position carries, along the top: the peer group is then
      // readable rather than something the caption has to assert, and it does
      // not collide with the position ticks along the bottom.
      Plot.text(
        DAYS.map((d, i) => ({ d, pos: i + 1 })),
        {
          x: "pos",
          y: -0.78,
          text: (d) => `day ${d.d}`,
          fill: MUTED,
          fontSize: 10,
        },
      ),
      Plot.text(FRAMES, {
        x: N + 0.55,
        y: (d, i) => i,
        text: "note",
        fill: MUTED,
        fontSize: 10,
        textAnchor: "end",
        dy: -20,
        ...HALO,
      }),
    ],
  });
}
