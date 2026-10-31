import { ds, inkOf } from "../../theme/brand";
import { BLUE_INK } from "../../editorial/style";
import results from "./results.json" with { type: "json" };

// Every number the video shows, read from results.json: what check.mjs got
// from PandasGroupby's seven-row frame (pandas 3.0.5) run through a MapReduce
// by hand, from small seeded models in plain Python in Pyodide 314.0.7, and
// from the page's own charts read from their source. No Spark runs here, and
// the video says so wherever a number is a model. Pure (no Remotion, no DOM).

export const VIDEO = "de-distributed";

/** Whether public/images/de-distributed/ holds the hero from illustrations.json. */
export const ILLUSTRATIONS = true;

export type Dept = "Eng" | "Ops" | "Sales";
export type Row = { index: number; dept: Dept; salary: number };

type MapReduce = {
  rows: Row[];
  splits: number[][];
  groups: { dept: Dept; values: number[]; from: number[] }[];
  reduced: { dept: Dept; salary: number }[];
  shuffled: number;
  combined: { dept: Dept; salary: number }[][];
  combinedShuffled: number;
};

/** PandasGroupby's frame, by index (its measurements.json, via check.mjs). */
export const MR = results.mapreduce as MapReduce;

/** A million clicks over a thousand products, four partitions: the shuffle sizes. */
export const REDUCE = results.reduceModel as {
  events: number;
  keys: number;
  partitions: number;
  perPartition: number;
  groupByKey: number;
  reduceByKey: number;
  ratio: number;
  repeats: number;
};

/** A million rows, eight partitions, a "guest" key on 30%: rows per partition. */
export const SKEW = results.skew as {
  rows: number;
  partitions: number;
  hotShare: number;
  guestRows: number;
  guestPartition: number;
  before: number[];
  after: number[];
  mean: number;
  maxBefore: number;
  maxAfter: number;
  ratioBefore: number;
  ratioAfter: number;
  salts: number;
  partials: number[];
  total: number;
};

/** charts/tail-latency-fanout.mjs at 1% per task: 1 - 0.99^n, every `step` tasks to `max`. */
export const TAIL = results.tail as {
  p: number;
  half: number;
  atHalf: number;
  tasks: number;
  at200: number;
  curve: number[];
  step: number;
  max: number;
};

/** charts/memory-latency-ladder.mjs: its seven levels and its "if L1 took one second" column. */
export const LADDER = results.ladder as {
  levels: { name: string; ns: number; scaled: string }[];
  ssdOverMemory: number;
  networkOverMemory: number;
};

/** Sixteen gigabytes on sixteen cores, in 4, 64 and 100,000 partitions. */
export const PARTS = results.partitions as {
  gb: number;
  cores: number;
  cases: { partitions: number; mb: number; busy: number; idle: number; perCore: number }[];
};
export const caseOf = (partitions: number) => {
  const c = PARTS.cases.find((k) => k.partitions === partitions);
  if (!c) throw new Error(`no partition case for ${partitions}`);
  return c;
};

/** The page's concept check's 2 TB fact table and 20 MB lookup, on fifty executors. */
export const BROADCAST = results.broadcast as {
  factTB: number;
  dimMB: number;
  executors: number;
  broadcastMB: number;
  shuffleMB: number;
  ratio: number;
};

/** The frame's rows, in index order. */
export const ROWS: readonly Row[] = MR.rows;

/** The sum of one department, from the reduce. */
export const sumOf = (dept: Dept) => MR.reduced.find((r) => r.dept === dept)!.salary;

/** One color per department, as PandasGroupby keeps them: blue, teal, orange. */
export const DEPT_COLOR: Record<Dept, string> = {
  Eng: ds("blue", 500),
  Ops: ds("teal", 500),
  Sales: ds("orange", 500),
};
export const DEPT_INK: Record<Dept, string> = {
  Eng: BLUE_INK,
  Ops: inkOf.teal,
  Sales: inkOf.orange,
};
export const DEPT_NAME: Record<Dept, string> = { Eng: "engineering", Ops: "ops", Sales: "sales" };

/** A count with thousands separators. */
export const count = (v: number) => Math.round(v).toLocaleString("en-US");
