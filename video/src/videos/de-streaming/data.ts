import results from "./results.json" with { type: "json" };

// Every number the video shows, read from results.json: what check.mjs got
// back from a small seeded model in Pyodide 314.0.7 (Python and NumPy). No
// Kafka runs here and nothing is Kafka's output: the stream of twelve clicks
// is the video's own, and the partitions, windows, watermarks, crashes and
// lag are computed from it or modelled beside it. Pure (no Remotion, no DOM).

export const VIDEO = "de-streaming";

/**
 * Whether public/images/de-streaming/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

export type User = "ava" | "ben" | "cam" | "dee";
export const USERS: readonly User[] = ["ava", "ben", "cam", "dee"];

export type Click = {
  /** Its index in event-time order. */
  i: number;
  user: User;
  /** When it happened, in seconds. */
  t: number;
  /** When it reached the engine, in seconds. */
  arrive: number;
  partition: number;
  offset: number;
  /** Its place in arrival order. */
  order: number;
};

/** The video's own stream, in event-time order. */
export const STREAM = results.stream as Click[];
/** The same clicks in the order they arrived. */
export const ARRIVALS = [...STREAM].sort((a, b) => a.order - b.order);

/** Each user's partition out of three, and out of four. */
export const PARTITIONS = results.partitions as {
  count: number;
  of: Record<User, number>;
  sizes: number[];
  four: Record<User, number>;
};

/** Ten thousand keys hashed into three partitions, then four. */
export const MOVED = results.moved as { keys: number; moved: number; share: number; ours: number };

export type Session = { first: number; last: number; end: number; clicks: number };

export const WINDOWS = results.windows as {
  size: number;
  slide: number;
  gap: number;
  end: number;
  tumblingEvent: number[];
  tumblingProcessing: number[];
  sliding: { start: number; count: number }[];
  sessions: Record<User, Session[]>;
  sessionCount: number;
};

type Watermark = {
  delay: number;
  lateness: number;
  /** At each arrival: the watermark just before it, and just after. */
  trace: { i: number; arrive: number; before: number | null; after: number; behind: boolean }[];
  behind: number[];
  dropped: number[];
  /** When the first window, 0 to 10 s, closes (processing time, s). */
  closeFirst: number;
  counts: number[];
  firstCount: number;
};

export const WATERMARK = results.watermark as {
  three: Watermark;
  ten: Watermark;
  threeLate: Watermark;
  /** dee's click: its index, when it arrives, and the watermark it arrives behind. */
  dee: number;
  deeAt: number;
  deeBehind: number;
  firstOnTime: number;
  firstFinal: number;
  closeLater: number;
};

export const DELIVERY = results.delivery as {
  messages: number;
  batch: number;
  crashes: { crash: number; batch: number }[];
  lost: number;
  duplicates: number;
  blindRows: number;
  idempotentRows: number;
};

export const BACKPRESSURE = results.backpressure as {
  rate: number;
  one: number;
  two: number;
  join: number;
  meanIn: number;
  /** Consumer lag at the end of each second, 1 to 100. */
  lag: number[];
  atJoin: number;
  drainedAt: number;
  drainSeconds: number;
};

export const COMPACTION = results.compaction as {
  log: { offset: number; user: User; version: number; kept: boolean }[];
  kept: number;
};

/** A count with thousands separators. */
export const count = (v: number) => v.toLocaleString("en-US");
