/**
 * Why a chat conversation costs more than it looks: every turn resends the
 * whole history.
 *
 * A ten-turn conversation is not ten requests of one message. Turn 1 sends the
 * system prompt and one message; turn 10 sends the system prompt and nineteen
 * messages, because the model is stateless and the transcript is the state.
 * Billed input therefore grows with the *square* of the turn count, and the
 * shaded region is what the resend adds over the naive count.
 *
 * The lesson's own arithmetic: a 400-token system prompt, ~180 tokens per
 * user message and ~320 per reply. Everything drawn here is computed from
 * those three numbers rather than asserted, so the totals in the annotations
 * cannot drift from the bars.
 */
import { Plot, plot, ACCENT, HALO, MUTED, PRIMARY } from "./_theme.mjs";

export const title =
  "Billed input tokens per turn across ten turns of a conversation, as a rising staircase. A thin band at the top of each bar is the new message; the grey bulk beneath it is resent history, which grows to dominate by the last turn.";

export const caption =
  "The model is stateless, so every turn resends the whole transcript. Only the thin band at the top of each bar is the new message; everything under it you have already paid for at least once. This is what prompt caching is for.";

const TURNS = 10;
const SYSTEM = 400;
const USER = 180;
const REPLY = 320;

/** Billed input on turn `n`: the system prompt, every prior exchange, and the
 *  new message. */
const rows = Array.from({ length: TURNS }, (_, i) => {
  const turn = i + 1;
  const resent = SYSTEM + i * (USER + REPLY);
  return { turn, resent, fresh: USER, total: resent + USER };
});

const TOTAL = rows.reduce((s, r) => s + r.total, 0);
const NAIVE = TURNS * (SYSTEM + USER);

/** Where the first bar's leader line ends: clear of bar 6, which is the
 *  tallest thing the label runs over, and clear of the summary above it. */
const LEADER_TOP = rows[5].total * 1.06;

export function render() {
  return plot({
    height: 340,
    marginTop: 34,
    marginLeft: 62,
    marginRight: 26,
    marginBottom: 46,
    ariaLabel: title,
    x: { label: "Turn", labelAnchor: "center", domain: rows.map((r) => r.turn), padding: 0.24 },
    y: { label: "Billed input tokens", ticks: 5, tickFormat: (d) => `${d / 1000}k` },
    marks: [
      Plot.barY(rows, { x: "turn", y: "resent", fill: MUTED, fillOpacity: 0.42 }),
      Plot.barY(rows, {
        x: "turn",
        y1: "resent",
        y2: "total",
        fill: ACCENT,
        fillOpacity: 0.75,
      }),
      Plot.text([rows[rows.length - 1]], {
        x: "turn",
        y: "total",
        text: (d) => `${(d.total / 1000).toFixed(1)}k on turn ${d.turn}`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "end",
        dy: -12,
        ...HALO,
      }),
      // Pointed at the first bar, where the new message is most of the total
      // and the band is still easy to pick out. The label itself has to live
      // well above the bar: at the band's own height it ran straight through
      // the next three bars, which are taller than it.
      Plot.ruleX([rows[0]], {
        x: "turn",
        y1: "total",
        y2: LEADER_TOP,
        stroke: ACCENT,
        strokeOpacity: 0.6,
        strokeWidth: 1.5,
      }),
      Plot.text([rows[0]], {
        x: "turn",
        y: LEADER_TOP,
        text: () => `the new message: ${USER} tokens`,
        fill: ACCENT,
        fontSize: 11.5,
        fontWeight: 600,
        textAnchor: "start",
        dx: 8,
        dy: -4,
        ...HALO,
      }),
      Plot.text([rows[1]], {
        x: "turn",
        y: rows[rows.length - 1].total * 0.95,
        text: () =>
          `${(TOTAL / 1000).toFixed(1)}k billed in total, against ${(NAIVE / 1000).toFixed(1)}k\nif each turn were sent alone`,
        fill: MUTED,
        fontSize: 11.5,
        fontWeight: 600,
        lineHeight: 1.3,
        textAnchor: "start",
        ...HALO,
      }),
      Plot.ruleY([0], { stroke: "currentColor", strokeOpacity: 0.35 }),
    ],
  });
}
