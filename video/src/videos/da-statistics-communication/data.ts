import results from "./results.json" with { type: "json" };

// Every number and every dot the video shows, read from results.json: what
// pandas 3.0.2 and NumPy in Pyodide 314.0.7 (the runtime the page's blocks run
// in) returned for the snippets in check.mjs, which wrote it. Random data is
// drawn there from seeded generators, so a rerun gives the same figures. Pure
// (no Remotion, no DOM).

export const VIDEO = "da-statistics-communication";

/**
 * Whether public/images/da-statistics-communication/ holds the watercolor
 * from illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

type FrameValue = {
  kind: "frame";
  index: string[];
  indexName: string | null;
  columns: string[];
  rows: string[][];
  dtypes: string[];
};
type SeriesValue = {
  kind: "series";
  name: string | null;
  index: string[];
  indexName: string | null;
  values: string[];
  dtype: string;
};
type ScalarValue = { kind: "value"; repr: string; str: string };
type JsonValue = { kind: "json"; value: unknown };
type Step = {
  code: string;
  ok: boolean;
  value?: FrameValue | SeriesValue | ScalarValue | JsonValue | null;
  error?: string;
  stdout: string;
  warnings: string[];
};
type Figure = { setup: string; steps: Record<string, Step> };
const FIGURES = results.figures as unknown as Record<string, Figure>;

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  if (!s.ok) throw new Error(`${figure}.${id} failed: ${s.error}`);
  return s;
};

/** A scalar, as a number. */
const num = (figure: string, id: string): number => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "value") throw new Error(`${figure}.${id} is not a scalar`);
  const x = Number(v.str);
  if (!Number.isFinite(x)) throw new Error(`${figure}.${id} is not a number: ${v.str}`);
  // round() can hand back -0.0, which is 0 on screen.
  return x === 0 ? 0 : x;
};

/** A list or a dict, as Python's json module wrote it. */
const json = <T>(figure: string, id: string): T => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "json") throw new Error(`${figure}.${id} is not a list or dict`);
  return v.value as T;
};

/** A table as the kit draws it: a column title per column, and printed cells. */
export type Table = { cols: string[]; rows: string[][] };

/** A DataFrame's columns and printed cells, without its index. */
const frame = (figure: string, id: string): Table => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "frame") throw new Error(`${figure}.${id} is not a DataFrame`);
  return { cols: v.columns, rows: v.rows };
};

/** A Series as two columns: its index, and its values under its name. */
const series = (figure: string, id: string): Table => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "series") throw new Error(`${figure}.${id} is not a Series`);
  return { cols: [v.indexName ?? "", v.name ?? ""], rows: v.index.map((label, i) => [label, v.values[i]]) };
};

/** Question 1: 500 right-skewed order values (the video's own, seed 7). */
export const MEDIAN = {
  mean: num("orders", "mean"),
  median: num("orders", "median"),
  above: num("orders", "above"),
  max: num("orders", "max"),
  count: 500,
  /** Histogram counts, in $2 bins from 0. */
  counts: json<number[]>("orders", "counts"),
  bin: 2,
};

/**
 * Questions 2 and 3: ice cream and drownings on 200 days, both driven by
 * temperature (the video's own, seed 11, after the page's example); then the
 * coefficient on a U and on a rising curve.
 */
export const CORR = {
  /** [temperature °C, ice creams sold, drownings], one per day. */
  days: json<[number, number, number][]>("confound", "points"),
  r: num("confound", "r"),
  tempIce: num("confound", "rTempIce"),
  tempDrown: num("confound", "rTempDrown"),
  /** Ice cream against drownings with temperature held fixed. */
  partial: num("confound", "partial"),
  /** The days the scene picks out as hot. */
  hot: 30,
};

export const SHAPE = {
  u: json<[number, number][]>("shape", "u"),
  e: json<[number, number][]>("shape", "e"),
  uPearson: num("shape", "uPearson"),
  uSpearman: num("shape", "uSpearman"),
  ePearson: num("shape", "ePearson"),
  eSpearman: num("shape", "eSpearman"),
};

/**
 * Question 4: 100,000 users' satisfaction scores, the unhappiest likelier to
 * have churned (the video's own, seed 21), and thirty surveys of the users
 * who stayed at each of three sizes.
 */
export const BIAS = {
  users: 100_000,
  truth: num("bias", "truth"),
  stayed: num("bias", "activeMean"),
  churned: num("bias", "churnedShare"),
  surveys: json<Record<string, number[]>>("bias", "surveys"),
};

/** Question 5: two weeks of sessions and orders (the video's own). */
export const METRIC = {
  weeks: frame("metric", "frame"),
  /** Conversion each week, in percent. */
  percent: json<[number, number]>("metric", "percent"),
  lift: num("metric", "lift"),
  orders: num("metric", "ordersChange"),
  sessions: num("metric", "sessionsChange"),
};

/** Questions 6 and 7: the page's thirteen amounts. */
export const AMOUNTS = (() => {
  const values = json<number[]>("outliers", "values");
  const z = json<number[]>("outliers", "z");
  const [q1, median, q3] = json<[number, number, number]>("outliers", "quartiles");
  const [iqr, low, high] = json<[number, number, number]>("outliers", "fences");
  // In order, each value with its own z-score.
  const sorted = values.map((v, i) => ({ v, z: z[i] })).sort((a, b) => a.v - b.v);
  return {
    sorted,
    q1,
    median,
    q3,
    iqr,
    low,
    high,
    iqrFlagged: json<number[]>("outliers", "iqrFlagged"),
    mean: num("outliers", "mean"),
    std: num("outliers", "std"),
    zOver2: json<number[]>("outliers", "zOver2"),
    zOver3: json<number[]>("outliers", "zOver3"),
    p90: num("outliers", "p90"),
  };
})();

/** Rapid fire: the page's snippets, and the video's own draws. */
export const RAPID = {
  variance: {
    values: json<number[]>("variance", "values"),
    deviations: json<number[]>("variance", "deviations"),
    var: num("variance", "var"),
    std: num("variance", "std"),
  },
  mode: { counts: series("mode", "counts"), mode: json<string[]>("mode", "mode")[0] },
  normal: { within: json<[number, number, number]>("normal", "within"), draws: 100_000 },
  population: {
    mean: num("population", "mean"),
    samples: json<number[]>("population", "samples"),
    size: 50,
    count: 10_000,
  },
};

export const RUNTIME = results.runtime;
