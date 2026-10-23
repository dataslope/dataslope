import m from "./measurements.json";

// Every token count, bill and ratio the video shows. Measured, not typed:
// measure.py runs estimating-cost's own code blocks (checked against the
// site's printed output) and computes everything with its
// `conversation_cost`; measurements.json is its output, imported here as it
// is. Pure (no Remotion, no DOM).

export const VIDEO = "llm-conversation-cost";

/** Whether public/images/llm-conversation-cost/ holds the watercolors from
 *  illustrations.json. Every frame is laid out with room for them either way. */
export const ILLUSTRATIONS = true;

/** "Claude Sonnet 5.5", the tier every bill is priced on. */
export const NAME = m.name;
/** Its rates, USD per million tokens. */
export const PRICE = m.price;

/** The conversation: `conversation_cost`'s defaults. */
export const SYSTEM = m.system;
export const USER = m.user;
export const REPLY = m.reply;

export type Turn = {
  turn: number;
  /** Tokens this turn sends. */
  sent: number;
  system: number;
  /** Earlier messages and replies. */
  chatBefore: number;
  message: number;
  /** What the turn before sent, all of it sent again. */
  resent: number;
  /** What this turn sends that the last did not (turn 1: everything). */
  newSlice: number;
  /** USD of input, without and with the cache. */
  inputCost: number;
  inputCostCached: number;
};
export const TURNS = m.turns as readonly Turn[];
export const LAST = TURNS[TURNS.length - 1];

export type Bill = {
  turns: number;
  plain: number;
  cached: number;
  saved: number;
  /** The system prompt every turn and the replies: a straight line. */
  line: number;
  systemPart: number;
  replies: number;
  /** The chat, resent: the triangle. */
  triangle: number;
  triangleShare: number;
};
const BILLS = m.bills as readonly Bill[];
export const billFor = (turns: number): Bill => {
  const b = BILLS.find((x) => x.turns === turns);
  if (!b) throw new Error(`measure.py priced no ${turns}-turn chat`);
  return b;
};

/** 10 → 20, 20 → 40, 40 → 80: the bill's ratio, and each part's. */
export const DOUBLINGS = m.doublings as readonly { from: number; to: number; times: number; line: number; triangle: number }[];

export const CACHE = m.cache;
export const FRESH = m.fresh;

// ── Formatting ──────────────────────────────────────────────────────────────

/** "$1.1900": dollars to the lesson table's four places. */
export const usd = (x: number, digits = 4) =>
  `$${x.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
/** "23,600". */
export const int = (x: number) => Math.round(x).toLocaleString("en-US");
/** "x3.2". */
export const times = (x: number) => `×${x.toFixed(1)}`;
/** "73%". */
export const pct = (x: number) => `${Math.round(x * 100)}%`;
