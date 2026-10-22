import results from "./results.json" with { type: "json" };

// Every number and every figure the video shows, read from results.json:
// what DuckDB, Pyodide with SciPy, and the page's own chart generators gave
// check.mjs, which wrote it. Pure (no Remotion, no DOM).

export const VIDEO = "da-ab-testing";

/**
 * Whether public/images/da-ab-testing/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = false;

type Value = string | number | boolean | null;
type SqlStep = { sql: string; ok: boolean; columns?: string[]; rows?: Value[][]; error?: string };
type SqlFigure = { setup: string; steps: Record<string, SqlStep>; version: string };
type PyStep = { code: string; ok: boolean; value?: { kind: string; str?: string; value?: unknown } | null; error?: string };
type PyFigure = { setup: string; steps: Record<string, PyStep> };

const R = results as unknown as {
  runtime: { sql: string; py: string };
  sql: Record<string, SqlFigure>;
  py: Record<string, PyFigure>;
  charts: {
    peeking: { planned: number; rows: [number, number][]; under: number[]; crossings: number[]; final: number };
    balance: {
      threshold: number;
      rows: { key: string; unmeasured: boolean; selected: number; randomised: number }[];
      overSelected: number;
      overRandomised: [string, number][];
    };
    coverage: { truth: number; intervals: [number, number][]; missed: number };
    drift: { months: string[]; definitions: { key: string; values: number[] }[]; spread: number };
    power: { lifts: { to: number; rows: [number, number][] }[] };
    novelty: { novelty: number[]; durable: number[] };
    cohorts: { key: string; rows: number[] }[];
    retention: { core: number[]; leaky: number[] };
  };
};

/** A value as a SQL client prints it. */
const shown = (v: Value): string => (v === null ? "null" : String(v));

export type Table = { cols: string[]; rows: string[][] };

const sqlStep = (figure: string, id: string): SqlStep => {
  const s = R.sql[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no sql step ${id} in ${figure}`);
  if (!s.ok || !s.columns || !s.rows) throw new Error(`${figure}.${id} failed: ${s.error}`);
  return s;
};

/** A result, its SQL as printed lines, and its rows as printed cells. */
const query = (figure: string, id: string): Table & { lines: string[] } => {
  const s = sqlStep(figure, id);
  return { lines: s.sql.split("\n"), cols: s.columns!, rows: s.rows!.map((r) => r.map(shown)) };
};

/** The one value of a one-row, one-column result, as a number. */
const scalar = (figure: string, id: string) => Number(sqlStep(figure, id).rows![0][0]);

/** A Python step's value: a number, or a list or dict as Python wrote it. */
const py = <T = number>(figure: string, id: string): T => {
  const s = R.py[figure]?.steps[id];
  if (!s || !s.ok || !s.value) throw new Error(`py ${figure}.${id} failed: ${s?.error}`);
  if (s.value.kind === "json") return s.value.value as T;
  return Number(s.value.str) as T;
};

/** As a percentage with `d` decimals, from a 0..1 rate. */
export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;

// ── 1, 2, 3. Metrics ────────────────────────────────────────────────────────

export const DRIFT = R.charts.drift;

// ── 4, 5. The funnel ────────────────────────────────────────────────────────

const step = query("funnel", "step");
const lost = query("funnel", "lost");
export const FUNNEL = {
  step,
  stages: step.rows.map((r, i) => ({
    stage: r[0],
    users: Number(r[1]),
    step: r[2] === "null" ? null : Number(r[2]),
    lost: lost.rows[i][1] === "null" ? null : Number(lost.rows[i][1]),
  })),
  overall: scalar("funnel", "overall"),
};

// ── 6, 7. The test ──────────────────────────────────────────────────────────

export const BALANCE = R.charts.balance;

const [xA, nA, xB, nB] = py<number[]>("experiment", "counts");
export const EXPERIMENT = {
  xA,
  nA,
  xB,
  nB,
  /** Conversion in each arm, in percent. */
  rates: py<[number, number]>("experiment", "rates"),
  /** The lift in points, and relative in percent. */
  lift: py<[number, number]>("experiment", "lift"),
  z: py("experiment", "z"),
  p: py("experiment", "p"),
  /** The standard error of the difference, in points. */
  se: py("experiment", "se"),
  zc: py("experiment", "zc"),
  /** The 95% interval on the lift, in points. */
  ci: py<[number, number]>("experiment", "ci"),
};

// ── 8, 9. Significance and size; the interval ───────────────────────────────

export const PRACTICAL = {
  d: 0.2,
  rows: py<[number, number][]>("practical", "rows"),
  /** The first group size whose p-value is under 0.05. */
  cross: py("practical", "cross"),
};

export const COVERAGE = R.charts.coverage;

// ── 10, 11, 12. Sample size, errors, power ──────────────────────────────────

export const SAMPLE = {
  twelve: py("sampleSize", "twelve"),
  eleven: py("sampleSize", "eleven"),
  ratio: py("sampleSize", "ratio"),
  curves: R.charts.power.lifts,
};

export const ERRORS = {
  crit: py("errors", "crit"),
  shift: py("errors", "shift"),
  alpha: py("errors", "alpha"),
  beta: py("errors", "beta"),
  power: py("errors", "power"),
};

// ── 13. Peeking ─────────────────────────────────────────────────────────────

export const PEEK = R.charts.peeking;

// ── 14, 15. Totals that lie ─────────────────────────────────────────────────

export const STONES = { bySize: query("stones", "bySize"), pooled: query("stones", "pooled") };

export const RATIO = {
  regions: query("ratio", "table"),
  averaged: scalar("ratio", "averaged"),
  weighted: scalar("ratio", "weighted"),
};

// ── Short ones ──────────────────────────────────────────────────────────────

export const RAPID = {
  events: query("conversion", "table"),
  right: query("conversion", "right"),
  repeats: query("conversion", "repeats"),
  novelty: R.charts.novelty,
  cohorts: R.charts.cohorts,
  retention: R.charts.retention,
};

export const RUNTIME = `${R.runtime.sql}; ${R.runtime.py}`;
