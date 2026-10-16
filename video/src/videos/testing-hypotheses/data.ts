import m from "./measurements.json";

// Every dot, bar and number the video shows. Measured, not drawn: measure.py
// re-runs the lessons' own code blocks with their seeds, and
// measurements.json is its output, imported here as it is. Pure (no
// Remotion, no DOM). The lessons' printed lines are echoed by measure.py on
// stderr, for checking against script.ts.

export const VIDEO = "testing-hypotheses";

/**
 * Whether public/images/testing-hypotheses/ holds the four watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = true;

/** mulberry32: a tiny, well-mixed 32-bit PRNG, for layout jitter only. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` seeded values in [0, 1), for jittering a strip of dots. */
export const jitter = (seed: number, count: number) => {
  const r = mulberry32(seed);
  return Array.from({ length: count }, () => r());
};

// ── Part 1 ──────────────────────────────────────────────────────────────────

/** hypothesis-testing's opening: two conversion rates, in percent. */
export const CHECKOUT = m.checkout;

/** The worked example: forty users' steps against a claimed 8,000 (seed 11). */
export const STEPS = {
  ...m.steps,
  values: m.steps.values as readonly number[],
  /** The sample mean minus the claim. */
  gap: m.steps.mean - m.steps.claimed,
};

/** The two cutoffs of a 5% test on the standard normal. */
export const SIDES = m.sides;

// ── Part 2 ──────────────────────────────────────────────────────────────────

/** 100,000 runs of 100 fair flips; counts[k] is how many gave k heads. */
export const COIN = { ...m.coin, counts: m.coin.counts as readonly number[] };

/** A fixed 0.1 effect at five sample sizes, with the p-value as printed. */
export const TINY = m.tiny;

// ── Part 3 ──────────────────────────────────────────────────────────────────

/** 5,000 p-values from a world with no effect, in twenty bins of 0.05. */
export const NULL_P = { ...m.nullP, bins: m.nullP.bins as readonly number[] };

/** Twenty tests of pure noise, and which of them came in at or under 0.05. */
export const TWENTY = { p: m.twenty.p as readonly number[], hits: m.twenty.hits as readonly number[] };

/** The chance that at least one of k tests fires: 1 - 0.95^k. */
export const AT_LEAST = m.atLeast;

// ── Part 4 ──────────────────────────────────────────────────────────────────

/** 2,000 experiments with a real 0.5 effect: did each one reject? */
export const POWER = {
  ...m.power,
  flags: [...m.power.flags].map((c) => c === "1"),
};

export const POWER_BY_N = m.powerByN;

/** Users per arm for 80% power from a 10% baseline, keyed by the target rate. */
export const AB = m.ab;

/** 6,000 estimates of a 0.3 effect at 15 per group, all and significant. */
export const CURSE = m.curse;

// ── Part 5 ──────────────────────────────────────────────────────────────────

export const PAIRED = m.paired;

// ── Part 6 ──────────────────────────────────────────────────────────────────

export const PAIRWISE = m.pairwise;
export const ANOVA = m.anova;
export const WAREHOUSES = (["East", "West", "South"] as const).map((name) => ({ name, ...m.anova.groups[name] }));
export const CHI = m.chi;

// ── Part 7 ──────────────────────────────────────────────────────────────────

export const CURVE = m.curve;
export const USHAPE = m.ushape;
export const MWU = m.mwu;
