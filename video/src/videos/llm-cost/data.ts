import m from "./measurements.json";

// Every price, bill, total and token the video shows. Measured, not typed:
// measure.py runs the lessons' own code blocks (checked against the site's
// printed output) and computes everything with the functions they define;
// measurements.json is its output, imported here as it is. Pure (no Remotion,
// no DOM).

export const VIDEO = "llm-cost";

/** Whether public/images/llm-cost/ holds the four watercolors from
 *  illustrations.json. Every frame is laid out with room for them either way. */
export const ILLUSTRATIONS = true;

export type Tier = "fable" | "opus" | "sonnet" | "haiku";
export const TIERS: readonly Tier[] = ["fable", "opus", "sonnet", "haiku"];
/** "Claude Sonnet 5.5": each price key's row in the October 2026 table. */
export const NAME = m.names as Record<Tier, string>;

// ── Part 1. The price sheet (pricing-structure.mdx) ─────────────────────────

/** "The five numbers", the lesson's table verbatim. */
export const SHEET = m.sheet as readonly { name: string; what: string; relation: string }[];

/** "The landscape, October 2026": ten rows, the ratio as the lesson prints it
 *  and as measure.py computed it. */
export const RATES = m.rates as readonly { model: string; in: number; out: number; ratioPrinted: string; ratio: number }[];
export const FIVES = m.fives;
export const MIN_RATIO = m.minRatio;
export const SPREAD = m.spread;

/** The four tiers' rates (estimating-cost's PRICES). */
export const PRICES = m.prices as Record<Tier, { in: number; out: number; cached: number }>;
/** Each tier's cache rate as a fraction of its input rate. */
export const CACHE_FRACTION = m.cacheFraction as Record<Tier, number>;
/** The lesson's 50,000-token prefix on Sonnet, full and cached. */
export const PREFIX = m.prefix;

export const THRESHOLDS = m.thresholds as readonly { model: string; threshold: number; inMult: number; outMult: number }[];
/** The concept check's 300,000-token prompt on GPT-6.1 Sol. */
export const OVERSIZED = m.oversized;

/** Fig. 3's two lines, cut into o200k_base tokens. */
export const TOKENS = m.tokens as { prompt: readonly { id: number; piece: string }[]; answer: readonly { id: number; piece: string }[] };

// ── Part 2. Estimating (estimating-cost.mdx) ────────────────────────────────

export const REQUEST = m.request as {
  in: number;
  out: number;
  volume: number;
  tiers: readonly { model: Tier; per: number; perVolume: number }[];
};

export const CONVERSATION = {
  system: m.conversation.system,
  user: m.conversation.user,
  reply: m.conversation.reply,
  perTurn: m.conversation.perTurn as readonly { turn: number; input: number; resent: number; new: number }[],
  totals: m.conversation.totals as readonly { turns: number; plain: number; cached: number; saved: number }[],
  twentyOverTen: m.conversation.twentyOverTen,
  fortyOverTwenty: m.conversation.fortyOverTwenty,
};
/** The bill for the first `turns` turns, uncached. */
export const billAt = (turns: number) => CONVERSATION.totals[turns - 1].plain;

export const THINKING = m.thinking as {
  in: number;
  visible: number;
  rows: readonly { thinking: number; cost: number; times: number }[];
};

export const MONTH = m.month as {
  workloads: readonly { name: string; model: Tier; in: number; out: number; perDay: number; per: number; month: number }[];
  total: number;
  dominant: string;
  dearestModel: string;
};

// ── Part 3. Controlling (controlling-cost.mdx) ──────────────────────────────

export const ROUTE = m.route as {
  in: number;
  out: number;
  perDay: number;
  tiers: readonly { model: Tier; month: number }[];
  saving: number;
};
export const CACHE_LEVER = m.cacheLever;
export const OUTPUT_WORTH = m.outputWorth;

// ── Formatting ──────────────────────────────────────────────────────────────

/** "$1,759.50", "$0.0054": dollars to a fixed number of places. */
export const usd = (x: number, digits = 2) =>
  `$${x.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
/** "2,000". */
export const int = (x: number) => Math.round(x).toLocaleString("en-US");
