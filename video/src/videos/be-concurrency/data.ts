import results from "./results.json" with { type: "json" };

// Every number the video shows, read from results.json: what check.mjs got
// back from Pyodide (Python 3.14). No thread ran: the site's Python has none
// to start, so the race and the deadlock are every possible order of a small
// model, enumerated, and the asyncio figures are the page's own block run on
// its event loop. Amdahl's law is the page's chart's formula. Pure (no
// Remotion, no DOM).

export const VIDEO = "be-concurrency";

/**
 * Whether public/images/be-concurrency/ holds the watercolors from
 * illustrations.json (generated and imported 2026-11-06).
 */
export const ILLUSTRATIONS = true;

export const PYTHON = results.runtime.python;

// ── 1. Amdahl's law (the page's chart) ──────────────────────────────────────

type Curve = { ceiling: number; at: Record<string, number>; curve: [number, number][] };
const AMDAHL = results.amdahl as Record<string, Curve>;

/** Speedup on `cores` cores for a program `serial` of which can't be split. */
export const speedup = (serial: number, cores: number) => {
  const v = AMDAHL[String(serial)]?.at[String(cores)];
  if (v === undefined) throw new Error(`results.json has no speedup for ${serial} on ${cores} cores`);
  return v;
};
/** The flat line each curve stops at: 1 / serial. */
export const ceiling = (serial: number) => {
  const c = AMDAHL[String(serial)];
  if (!c) throw new Error(`results.json has no curve for ${serial}`);
  return c.ceiling;
};
export const SERIAL_FRACTIONS = Object.keys(AMDAHL).map(Number);
/** The curve the figure draws for `serial`: [cores, speedup], 1 to 1000
 *  cores evenly spaced on a log axis. */
export const curve = (serial: number) => {
  const c = AMDAHL[String(serial)];
  if (!c) throw new Error(`results.json has no curve for ${serial}`);
  return c.curve;
};
/** The one the narration reads: five percent serial, a hundred cores. */
export const AMDAHL_SAID = { serial: 0.05, cores: 100, ceiling: ceiling(0.05), speedup: speedup(0.05, 100) };

// ── 3. The race ─────────────────────────────────────────────────────────────

export type RaceCount = {
  start: number;
  right: number;
  orders: number;
  rightOrders: number;
  outcomes: Record<string, number>;
  lostExample: string[] | null;
  /** Every order, as the thread taking each step ("AABABB"), and the counter
   *  it leaves; null for the 924 orders of two increments each. */
  every: { threads: string; result: number }[] | null;
};
export const RACE = results.race as {
  steps: string[];
  /** One increment each: 20 orders, 2 right. */
  one: RaceCount;
  /** Two increments each (screen only): 924 orders, 6 right. */
  two: RaceCount;
  /** One increment each, the three steps under a lock: 2 orders, both right. */
  locked: RaceCount;
  /** Both threads read first: the page's "both see 5". */
  bothRead: { order: string[]; result: number };
};

// ── 4. The GIL: what `counter += 1` compiles to ─────────────────────────────

export const BYTECODE = results.bytecode as {
  source: string;
  /** "LOAD_GLOBAL counter", "LOAD_SMALL_INT 1", "BINARY_OP +=", "STORE_GLOBAL counter". */
  instructions: string[];
  count: number;
  /** The loop's own jump, filed under the same line and not drawn. */
  loopJump: string[];
};

// ── 5, 6. Deadlock ──────────────────────────────────────────────────────────

export type Schedules = {
  schedules: number;
  finish: number;
  deadlock: number;
  examples: { trace: string[]; holds: Record<string, string[]>; waitsFor: Record<string, string> }[];
};
export const DEADLOCK = results.deadlock as {
  /** T1 takes A then B, T2 takes B then A. */
  opposite: Schedules;
  /** Both take A then B: no schedule deadlocks. */
  sameOrder: Schedules;
};

// ── 7, 8. The event loop ────────────────────────────────────────────────────

type Gathered = { results: string[]; finished: string[] };
export const ASYNC = results.async as {
  /** The page's waits, in seconds: a 0.02, b 0.01. */
  delays: { a: number; b: number };
  /** What the page's block printed, as written. */
  pagePrinted: string;
  /** Both await: b finishes first, results still a then b. */
  awaiting: Gathered;
  /** a's wait is a blocking sleep: a finishes first. */
  blocking: Gathered;
  /** The pair's length when the waits overlap (the longer wait). */
  overlapped: { total: number; rule: string };
  /** And when they cannot (the sum of the waits). */
  serial: { total: number; rule: string };
};

/** Seconds as the screen shows them: 0.02 → "20 ms". */
export const ms = (s: number) => `${Math.round(s * 1000)} ms`;

// ── Quick round ─────────────────────────────────────────────────────────────

/** Twelve downloads through a semaphore of five: never more than five at once. */
export const SEMAPHORE = results.semaphore as { limit: number; downloads: number; peak: number };

/** The page's pool example: square mapped over range(6), in input order. */
export const POOL = results.pool as { workers: number; inputs: number[]; results: number[] };
