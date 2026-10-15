// Every number the video shows. Measured, not simulated: measure.py times the
// lesson's own lookup with `timeit` and measurements.json is its output, copied
// here with the precision the screen uses. Pure (no Remotion, no DOM).
//
// Machine: CPython 3.13.16 on x86_64, one core of an Intel Xeon at 2.1 GHz
// (a cloud container). Each figure is the best of 30 rounds, sizes timed in a
// seeded shuffled order each round, so a noisy minute on a shared machine hits
// every size alike. Absolute times move with the machine; the shapes do not.
//
// The mechanism facts were checked directly in CPython 3.13.16:
//   - `999_999 in big_list` calls `__eq__` 1,000,000 times, on items 0, 1, 2
//     and on, front to back; `-1 in big_list` also calls it 1,000,000 times;
//   - `999_999 in big_set` calls it once (a wrapper whose `__eq__` counts);
//   - the set's table has 2,097,152 slots (mask 2,097,151); hash(999_999) is
//     999,999, and the C table holds that very object in slot 999,999, with
//     slots 0 to 999,999 filled and every slot above empty (read with ctypes).

export const VIDEO = "list-vs-set";

/**
 * Whether public/images/list-vs-set/ holds the two watercolors from
 * illustrations.json. Their batch was still queued at OpenAI when this was
 * rendered, so the scenes leave them out; once
 * `npm run illustrations -- list-vs-set` (or `--import` after a `download`)
 * has written both WebPs, set this to true. Every frame is laid out with room
 * for them either way.
 */
export const ILLUSTRATIONS = true;

export type Row = {
  /** Items in the list, and in the set built from it. */
  n: number;
  /** `n - 1 in big_list`: the last value, so the list walks all n. */
  listMs: number;
  /** `n - 1 in big_set`. */
  setNs: number;
  /** A value picked at random (seeded): the list walks about half. */
  listRandomMs: number;
};

export const ROWS: readonly Row[] = [
  { n: 100_000, listMs: 0.48, setNs: 23.3, listRandomMs: 0.23 },
  { n: 200_000, listMs: 0.987, setNs: 20.9, listRandomMs: 0.455 },
  { n: 300_000, listMs: 1.496, setNs: 23.0, listRandomMs: 0.653 },
  { n: 400_000, listMs: 2.06, setNs: 22.1, listRandomMs: 1.002 },
  { n: 500_000, listMs: 2.608, setNs: 23.6, listRandomMs: 1.119 },
  { n: 600_000, listMs: 3.089, setNs: 23.0, listRandomMs: 1.501 },
  { n: 700_000, listMs: 3.731, setNs: 22.9, listRandomMs: 1.748 },
  { n: 800_000, listMs: 4.23, setNs: 23.6, listRandomMs: 1.928 },
  { n: 900_000, listMs: 5.014, setNs: 23.2, listRandomMs: 2.384 },
  { n: 1_000_000, listMs: 5.526, setNs: 22.8, listRandomMs: 2.313 },
];

export const MILLION = ROWS[ROWS.length - 1];
export const HALF_MILLION = ROWS[4];

/** `set(big_list)` for a million items, best of 30. */
export const BUILD_MS = 36.5;

/** The set answers this many times faster, at a million. */
export const RATIO = (MILLION.listMs * 1e6) / MILLION.setNs;
/** Building the set costs this many full scans of the list. */
export const BUILD_SCANS = BUILD_MS / MILLION.listMs;

/** Slots in the hash table of `set(range(1_000_000))`. */
export const TABLE_SLOTS = 2_097_152;

/** `sys.getsizeof`, in bytes, at a million. The ints themselves are shared. */
export const LIST_BYTES = 8_000_056;
export const SET_BYTES = 33_554_648;

export const SET_NS_RANGE = [
  Math.min(...ROWS.map((r) => r.setNs)),
  Math.max(...ROWS.map((r) => r.setNs)),
] as const;

// `node src/videos/list-vs-set/data.ts` prints what the narration quotes.
const runAsScript =
  typeof process !== "undefined" &&
  typeof process.argv?.[1] === "string" &&
  process.argv[1].endsWith("data.ts");
if (runAsScript) {
  const pct = (a: number, b: number) => (a / b).toFixed(2);
  console.log(`list ${MILLION.listMs} ms, set ${MILLION.setNs} ns, ratio ${Math.round(RATIO)}`);
  console.log(
    `doubling: 100k→200k x${pct(ROWS[1].listMs, ROWS[0].listMs)}, 200k→400k x${pct(ROWS[3].listMs, ROWS[1].listMs)}, ` +
      `400k→800k x${pct(ROWS[7].listMs, ROWS[3].listMs)}, 500k→1M x${pct(MILLION.listMs, HALF_MILLION.listMs)}`,
  );
  console.log(`set range ${SET_NS_RANGE[0]} to ${SET_NS_RANGE[1]} ns`);
  console.log(`build ${BUILD_MS} ms = ${BUILD_SCANS.toFixed(2)} scans; memory x${pct(SET_BYTES, LIST_BYTES)}`);
}
