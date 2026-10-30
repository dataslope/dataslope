import results from "./results.json" with { type: "json" };
import { MILLION, RATIO, TABLE_SLOTS } from "../list-vs-set/data";

// Every snippet, table, console line, error and measurement the video shows,
// read from results.json: what Pyodide 314.0.7 (Python 3.14.2) with pandas
// 3.0.2, the runtime the page's blocks run in, returned for the snippets in
// check.mjs, which wrote it. The code printed on screen is the code in that
// file, so a listing cannot drift from what ran. Question 6's times are the
// course video ListVsSet's, measured in CPython 3.13 (list-vs-set/data.ts),
// imported rather than copied. Pure (no Remotion, no DOM).

export const VIDEO = "de-python";

/** Whether public/images/de-python/ holds the watercolor from
 *  illustrations.json (the ant, 1506x943). */
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
type Step = {
  code: string;
  ok: boolean;
  value?: FrameValue | SeriesValue | ScalarValue | null;
  error?: string;
  stdout: string;
  warnings: string[];
  peak?: number;
};
type Figure = { setup: string; steps: Record<string, Step> };
const FIGURES = results.figures as unknown as Record<string, Figure>;

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  return s;
};

/** A table as the kit draws it: a column title per column, and printed cells. */
export type Table = { cols: string[]; rows: string[][] };

/** A DataFrame as pandas displays it: the index as the first column, then
 *  the columns. */
const frame = (figure: string, id: string): Table => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "frame") throw new Error(`${figure}.${id} is not a DataFrame`);
  return {
    cols: [v.indexName ?? "", ...v.columns],
    rows: v.index.map((label, i) => [label, ...v.rows[i]]),
  };
};

/** A frame of plain Python records (a list of dicts), drawn without the
 *  index pandas gave it on the way to the screen. */
const records = (figure: string, id: string): Table => {
  const t = frame(figure, id);
  return { cols: t.cols.slice(1), rows: t.rows.map((r) => r.slice(1)) };
};

/** A Series as two columns: its index, and its values. */
const series = (figure: string, id: string): Table => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "series") throw new Error(`${figure}.${id} is not a Series`);
  return { cols: [v.indexName ?? "", v.name ?? ""], rows: v.index.map((label, i) => [label, v.values[i]]) };
};

/** A scalar the way print() shows it. */
const scalar = (figure: string, id: string): string => {
  const v = step(figure, id).value;
  if (!v || v.kind !== "value") throw new Error(`${figure}.${id} is not a scalar`);
  return v.str;
};
const int = (figure: string, id: string) => Number(scalar(figure, id));

/** A snippet as printed, one string per line. A last line that only names a
 *  value (`total`, `df`) displays what the figure beside it already shows,
 *  so the listing leaves it off. */
const code = (figure: string, id: string): string[] => {
  const lines = step(figure, id).code.split("\n");
  return lines.length > 1 && /^[A-Za-z_]\w*$/.test(lines[lines.length - 1]) ? lines.slice(0, -1) : lines;
};

/** What a step printed, one string per line. */
const printed = (figure: string, id: string): string[] => {
  const s = step(figure, id).stdout;
  if (!s) throw new Error(`${figure}.${id} printed nothing`);
  return s.replace(/\n$/, "").split("\n");
};

/** A step's peak traced memory, in bytes (tracemalloc around the step). */
const peak = (figure: string, id: string): number => {
  const p = step(figure, id).peak;
  if (p === undefined) throw new Error(`${figure}.${id} was not measured`);
  return p;
};

/** A snippet Python refused: its code, the error's kind and its message. */
const refused = (figure: string, id: string) => {
  const s = step(figure, id);
  if (s.ok || !s.error) throw new Error(`${figure}.${id} did not fail`);
  const [kind, ...rest] = s.error.split(": ");
  return { lines: code(figure, id), kind, message: rest.join(": ").split("\n")[0] };
};

/** The lines of a figure's setup from the one holding `from` to the one
 *  holding `to`, inclusive: a function the setup defines, as it ran. */
const setupLines = (figure: string, from: string, to: string): string[] => {
  const lines = FIGURES[figure].setup.split("\n");
  const a = lines.findIndex((l) => l.includes(from));
  const b = lines.findIndex((l, i) => i >= a && l.includes(to));
  if (a < 0 || b < 0) throw new Error(`${figure}'s setup has no lines from ${from} to ${to}`);
  return lines.slice(a, b + 1);
};

const same = (label: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${label}: ${JSON.stringify(a)} against ${JSON.stringify(b)}`);
};

// ── The opening, and 1: a generator against a list ─────────────────────────

export const GEN = {
  /** The page's parser, as the setup defines it. */
  parser: setupLines("gen", "def parse_rows", "yield name"),
  page: { lines: code("gen", "page"), out: printed("gen", "page") },
  bytes1m: int("gen", "bytes1m"),
  bytes100k: int("gen", "bytes100k"),
  list: { lines: code("gen", "list1m"), m: peak("gen", "list1m"), k: peak("gen", "list100k") },
  gen: { lines: code("gen", "gen1m"), m: peak("gen", "gen1m"), k: peak("gen", "gen100k") },
};
same("the list and the generator total", scalar("gen", "list1m"), scalar("gen", "gen1m"));
// The script says the list "shrinks to a tenth" and the generator "doesn't
// move".
if (Math.abs(GEN.list.m / GEN.list.k - 10) > 0.3) throw new Error(`the list grew ${GEN.list.m / GEN.list.k}x, not ten`);
if (Math.abs(GEN.gen.m / GEN.gen.k - 1) > 0.02) throw new Error("the generator's memory moved with the input");

// ── 2: a generator pipeline against intermediate lists ─────────────────────

const again = scalar("pipe", "again").match(/^\((\d+), (\d+)\)$/);
if (!again) throw new Error("pipe.again is not a pair");
export const PIPE = {
  lists: { lines: code("pipe", "lists"), peak: peak("pipe", "lists") },
  gens: { lines: code("pipe", "gens"), peak: peak("pipe", "gens") },
  again: { lines: code("pipe", "again"), first: Number(again[1]), second: Number(again[2]) },
};
same("the pipelines' totals", scalar("pipe", "lists"), scalar("pipe", "gens"));
if (PIPE.again.second !== 0) throw new Error("the spent generator summed to more than zero");

// ── 3, 4: a file too big for memory; pandas in chunks ──────────────────────

export const FILE = {
  /** The two whole reads, without their last lines (`len(...)`, which only
   *  showed that each ran). */
  read: { lines: code("file", "read").slice(0, 2), peak: peak("file", "read") },
  readlines: { lines: code("file", "readlines").slice(0, 2), peak: peak("file", "readlines") },
  stream: { lines: code("file", "stream"), peak: peak("file", "stream") },
  whole: { lines: code("file", "whole"), peak: peak("file", "whole"), totals: scalar("file", "whole") },
  /** The chunked read, without its last line (`dict(totals)`, which only
   *  displays what the totals table beside it shows). */
  chunks: { lines: code("file", "chunks").slice(0, -1), peak: peak("file", "chunks"), totals: scalar("file", "chunks") },
  /** The totals both reads agree on, as name and quantity. */
  totals: [...scalar("file", "chunks").matchAll(/'(\w+)': (\d+)/g)].map((m) => [m[1], Number(m[2]).toLocaleString("en-US")]),
  lazy: { lines: code("file", "lazy"), out: printed("file", "lazy") },
  nChunks: int("file", "nChunks"),
  meanTrue: scalar("file", "meanTrue"),
  meanOfMeans: scalar("file", "meanOfMeans"),
  meanFolded: scalar("file", "meanFolded"),
};
// The script says nothing is read until the last stage asks.
same("the lazy pipeline's first two lines", FILE.lazy.out.slice(0, 2), ["pipeline built", "opening events.csv"]);
same("the whole read and the chunks' totals", FILE.whole.totals, FILE.chunks.totals);
same("sum over count and the true mean", FILE.meanFolded, FILE.meanTrue);
if (FILE.meanOfMeans === FILE.meanTrue) throw new Error("the mean of means is not off; the script says it is");

// ── 5: an iterable against an iterator ──────────────────────────────────────

export const ITER = {
  list: { lines: code("iter", "list").slice(0, 2), out: printed("iter", "list"), isIter: scalar("iter", "list") },
  gen: { lines: code("iter", "gen").slice(0, 2), out: printed("iter", "gen"), isIter: scalar("iter", "gen") },
  file: scalar("iter", "file"),
  trap: { lines: code("iter", "trap"), out: printed("iter", "trap") },
  stop: refused("iter", "next"),
};
same("a list read twice", ITER.list.out, ["4 4"]);
same("a generator read twice", ITER.gen.out, ["4 0"]);
same("counted, then loaded", ITER.trap.out, ["4 0"]);
same("a file is its own iterator", ITER.file, "True");

// ── 6: hash lookups (ListVsSet's numbers, and the loop counted here) ───────

export const HASH = {
  /** A million items: `999_999 in big_list` and `999_999 in big_set`, timed
   *  in CPython 3.13 by ListVsSet. */
  listMs: MILLION.listMs,
  setNs: MILLION.setNs,
  ratio: RATIO,
  slots: TABLE_SLOTS,
  list5k: int("hash", "list5k"),
  list10k: int("hash", "list10k"),
  set10k: int("hash", "set10k"),
  loop: setupLines("hash", "def dedup_list", "seen.append"),
  setLoop: setupLines("hash", "def dedup_set", "seen.add"),
};
if (HASH.list10k / HASH.list5k < 3.9) throw new Error("doubling the keys did not quadruple the comparisons");

// ── 7, 8: deduplicating; the latest record per key ─────────────────────────

export const DEDUP = {
  records: records("dedup", "records"),
  first: { lines: code("dedup", "first"), out: printed("dedup", "first") },
  frame: frame("dedup", "frame"),
  dict: { lines: code("dedup", "latestDict"), out: printed("dedup", "latestDict") },
  latest: { lines: code("dedup", "latest"), ...frame("dedup", "latest") },
};
same("the first record per user", DEDUP.first.out, ["[1, 2, 3]"]);

// ── 9: a join in memory ─────────────────────────────────────────────────────

export const JOIN = {
  users: records("join", "users"),
  orders: records("join", "orders"),
  build: { lines: code("join", "build"), value: scalar("join", "build") },
  probe: { lines: code("join", "probe"), out: printed("join", "probe") },
  missing: refused("join", "missing"),
  /** The orders once the video's own order 13, for user 3, is appended. */
  after: records("join", "after"),
  left: { lines: code("join", "left"), value: scalar("join", "left") },
};

// ── 10: batches ─────────────────────────────────────────────────────────────

export const BATCH = {
  fn: setupLines("batch", "def batched", "yield chunk"),
  page: { lines: code("batch", "page"), out: printed("batch", "page") },
  builtin: { lines: code("batch", "builtin"), out: printed("batch", "builtin") },
  calls: int("batch", "calls"),
};
if (BATCH.calls !== 1000) throw new Error(`the script says a thousand calls; ${BATCH.calls}`);

// ── 11: retries ─────────────────────────────────────────────────────────────

const lists = (figure: string, id: string): number[][] => JSON.parse(scalar(figure, id).replace(/\(/g, "[").replace(/\)/g, "]"));
export const RETRY = {
  fn: setupLines("retry", "def with_retries", "time.sleep(delay)"),
  page: { lines: code("retry", "page"), out: printed("retry", "page") },
  permanent: refused("retry", "permanent"),
  permanentCalls: int("retry", "permanentCalls"),
  plain: lists("retry", "plain"),
  jittered: lists("retry", "jittered"),
  /** The model's own code, as it ran. */
  schedule: setupLines("retry", "def schedule", "return times"),
  jitterLines: code("retry", "jittered"),
};
same("plain backoff's retry times", RETRY.plain[0], [1, 3, 7, 15]);
if (RETRY.permanentCalls !== 1) throw new Error("the bad request was retried");

// ── 12: idempotency ─────────────────────────────────────────────────────────

export const IDEM = {
  upsert: { lines: code("idem", "upsert"), out: printed("idem", "upsert") },
  append: { lines: code("idem", "append"), out: printed("idem", "append") },
  adds: { lines: code("idem", "adds"), out: printed("idem", "adds") },
  /** The payments the keyed add runs over, from the figure's setup. */
  amounts: [...FIGURES.idem.setup.matchAll(/"amount": (\d+)/g)].map((m) => Number(m[1])),
};
same("the keyed add, run twice", IDEM.adds.out, [`{1: ${2 * IDEM.amounts[0]}, 2: ${2 * IDEM.amounts[1]}}`]);

// ── 13, 14: messy records, malformed values ────────────────────────────────

/** The JSON-shaped list on the one line of `lines` that holds `marker`. */
const listOn = (lines: readonly string[], marker: string): string[] => {
  const line = lines.find((l) => l.includes(marker));
  const m = line?.match(/\[(".*")\]/);
  if (!m) throw new Error(`no list after ${marker}`);
  return JSON.parse(`[${m[1]}]`) as string[];
};

export const CLEAN = {
  /** The page's four raw rows, as strings. */
  raw: listOn(FIGURES.clean.setup.split("\n"), "raw = ["),
  fn: setupLines("clean", "def clean", "return out"),
  page: { lines: code("clean", "page"), out: printed("clean", "page") },
  quoted: { lines: code("clean", "quoted"), out: printed("clean", "quoted") },
  quarantine: { lines: code("clean", "quarantine"), out: printed("clean", "quarantine") },
  numeric: { lines: code("clean", "numeric"), ...series("clean", "numeric"), inputs: listOn(code("clean", "numeric"), "pd.Series([") },
  badCount: int("clean", "badCount"),
  dates: { lines: code("clean", "dates"), out: printed("clean", "dates") },
};
if (CLEAN.badCount !== 2) throw new Error("the script names two values that would not parse");

// ── Quickly, 15 to 18 ───────────────────────────────────────────────────────

export const QUICK = {
  stream: { lines: code("stream", "running"), out: printed("stream", "running") },
  groupby: { lines: code("groupby", "agg"), ...frame("groupby", "agg") },
};
