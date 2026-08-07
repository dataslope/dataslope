/**
 * Where a context window actually goes, turn by turn, and why "it has a
 * 200k window" is not the same as having 200k to work with.
 *
 * Four things compete for the same budget: a system prompt that never shrinks,
 * retrieved documents, the conversation so far, and the room the model needs to
 * answer in. The first two are fixed costs, the third grows every turn, and the
 * fourth is what gets squeezed. Long before the window is full, the reply
 * budget is the binding constraint.
 *
 * The line is the point at which the remaining room drops below a useful
 * answer, computed from the same numbers as the bands rather than marked by
 * eye.
 */
import { Plot, plot, ACCENT, GUIDE, HALO, MUTED, SERIES } from "./_theme.mjs";

export const title =
  "A stacked area of context-window usage over twenty turns: a fixed system prompt and retrieved documents, a conversation history that grows every turn, and the shrinking space left for the reply.";

const WINDOW = 32_000;
const SYSTEM = 1_800;
const RETRIEVED = 9_000;
const PER_TURN = 1_100;
const MIN_REPLY = 1_500;

const TURNS = 20;
const rows = Array.from({ length: TURNS }, (_, i) => {
  const turn = i + 1;
  const history = turn * PER_TURN;
  const used = SYSTEM + RETRIEVED + history;
  return { turn, system: SYSTEM, retrieved: RETRIEVED, history, free: Math.max(0, WINDOW - used) };
});

const layers = rows.flatMap((r) => [
  { turn: r.turn, layer: "System prompt", value: r.system },
  { turn: r.turn, layer: "Retrieved documents", value: r.retrieved },
  { turn: r.turn, layer: "Conversation so far", value: r.history },
  { turn: r.turn, layer: "Room left to answer", value: r.free },
]);

const SQUEEZED = rows.find((r) => r.free < MIN_REPLY);

// Asserted only when it actually happens: an earlier version quoted a turn
// number from a fallback and claimed a squeeze the data never reached.
const SQUEEZE_NOTE = SQUEEZED
  ? `By turn ${SQUEEZED.turn} there is less than ${(MIN_REPLY / 1000).toFixed(1)}k left to answer in, which is the constraint that bites first: not the window filling, but the reply running out of room.`
  : `The room to answer in shrinks every turn, and it is what runs out first: the window is never the thing that fills.`;

export const caption =
  `A ${(WINDOW / 1000).toFixed(0)}k window is not ${(WINDOW / 1000).toFixed(0)}k of usable room. The system prompt and the retrieved documents take ${(((SYSTEM + RETRIEVED) / WINDOW) * 100).toFixed(0)}% before the conversation starts, and history grows every turn. ${SQUEEZE_NOTE}`;

const ORDER = ["System prompt", "Retrieved documents", "Conversation so far", "Room left to answer"];

export function render() {
  return plot({
    height: 330,
    marginTop: 32,
    marginLeft: 62,
    marginRight: 140,
    marginBottom: 48,
    ariaLabel: title,
    x: { label: "Turn", labelAnchor: "center", domain: [1, TURNS], ticks: 5 },
    y: {
      label: "Tokens",
      domain: [0, WINDOW],
      ticks: 5,
      tickFormat: (d) => `${d / 1000}k`,
    },
    color: { domain: ORDER, range: [SERIES[4], SERIES[1], SERIES[0], MUTED] },
    marks: [
      Plot.areaY(layers, {
        x: "turn",
        y: "value",
        fill: "layer",
        fillOpacity: 0.55,
        order: ORDER,
      }),
      ...(SQUEEZED
        ? [
            Plot.ruleX([SQUEEZED.turn], { stroke: ACCENT, strokeWidth: 2, strokeDasharray: "4,3" }),
            Plot.text([SQUEEZED], {
              x: "turn",
              y: WINDOW * 0.94,
              text: (d) => `turn ${d.turn}: under ${(MIN_REPLY / 1000).toFixed(1)}k\nleft to answer in`,
              fill: ACCENT,
              fontSize: 10.5,
              fontWeight: 600,
              lineHeight: 1.3,
              textAnchor: "end",
              dx: -8,
              ...HALO,
            }),
          ]
        : []),
      // Direct labels at the right edge, at each band's own mid-height.
      ...(() => {
        const last = rows.at(-1);
        let acc = 0;
        return ORDER.map((layer, i) => {
          const value = [last.system, last.retrieved, last.history, last.free][i];
          const mid = acc + value / 2;
          acc += value;
          return Plot.text([{ turn: TURNS, y: mid }], {
            x: "turn",
            y: "y",
            text: () => layer,
            fill: MUTED,
            fontSize: 10,
            fontWeight: 600,
            textAnchor: "start",
            dx: 8,
            ...HALO,
          });
        });
      })(),
      Plot.ruleY([WINDOW], { stroke: GUIDE, strokeWidth: 1.5 }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
