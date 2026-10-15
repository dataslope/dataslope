// Every curve and number the video shows. measure.py computes them in numpy
// (seeded) and statsmodels, and measurements.json is its output, imported
// as-is; this file only reshapes it for the screen. Pure (no Remotion, no
// DOM). `node src/videos/random-walks/data.ts` prints what the narration
// quotes, for checking against script.ts.
import m from "./measurements.json" with { type: "json" };

export const VIDEO = "random-walks";

/**
 * Whether public/images/random-walks/ holds both watercolors from
 * illustrations.json. Every frame is laid out with room for them either way.
 */
export const ILLUSTRATIONS = false;

/** Flips per walk, and how many independent pairs were counted. */
export const STEPS = m.steps;
export const PAIRS = m.pairs;
export const LONG_STEPS = m.long.steps;

const f = m.featured;

/** The featured pair: pair 0 of `default_rng(0)`, the lesson's seed. Each
 *  walk starts at 0 before its first flip, so a walk of 300 flips has 301
 *  points, at x = 0 to 300. */
export const WALK_A: readonly number[] = [0, ...f.walkA];
export const WALK_B: readonly number[] = [0, ...f.walkB];
/** The first flips of walk a, spelled out. */
export const FIRST_FLIPS: readonly number[] = f.flipsA;
/** Walk a differenced, as plotted: each value minus the one before it, from
 *  the start at 0. measure.py asserts these are exactly its flips. */
export const DIFF_A: readonly number[] = WALK_A.slice(1).map((v, i) => v - WALK_A[i]);

export const R_WALKS = f.r;
export const R_DIFFS = f.rDiff;
export const END_A = f.endA;
export const MAX_A = f.maxA;
/** Correlation of each point with the next one. */
export const LAG1_WALK = f.lag1Walk;
export const LAG1_FLIPS = f.lag1Diff;
/** Augmented Dickey-Fuller p-values, statsmodels defaults, as the lesson runs it. */
export const ADF_WALK = f.adfWalk;
export const ADF_DIFF = f.adfDiff;

/** Least-squares straight line through walk a (as plotted, x = 0 to 300):
 *  the "trend" the eye sees. */
export const TREND = (() => {
  const n = WALK_A.length;
  const xs = WALK_A.map((_, i) => i);
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = WALK_A.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (WALK_A[i] - my);
    sxx += (x - mx) ** 2;
  });
  const slope = sxy / sxx;
  return { slope, at: (x: number) => my + slope * (x - mx) };
})();

/** Histograms of r over [-1, 1) in bins of 0.05. */
export const BIN = m.bin;
export const LO = m.lo;
export const HIST = {
  walks: m.walk.counts,
  diffs: m.diff.counts,
  long: m.long.counts,
} as const;

export const SHARE = {
  /** |r| > 0.5, walks of 300 and of 3,000 flips. */
  walks50: m.walk.shareAbove50,
  long50: m.long.shareAbove50,
  /** |r| > 0.25, walks and their differences. */
  walks25: m.walk.shareAbove25,
  diffs25: m.diff.shareAbove25,
};
/** Pairs whose differenced r is past 0.25, as a count. */
export const DIFFS_PAST_25 = Math.round(m.diff.shareAbove25 * PAIRS);
export const SPREAD = { walks: m.walk.sd, long: m.long.sd, diffs: m.diff.sd };
export const MAX_ABS_DIFF = m.diff.maxAbs;

/** "39%" */
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;
/** Two decimals with a real minus sign: "0.84", "−0.50". */
export const dec = (x: number, digits = 2) => `${x < 0 ? "−" : ""}${Math.abs(x).toFixed(digits)}`;

const runAsScript =
  typeof process !== "undefined" &&
  typeof process.argv?.[1] === "string" &&
  process.argv[1].endsWith("data.ts");
if (runAsScript) {
  console.log(`walk a: ends ${END_A} (max ${MAX_A}); first flips ${FIRST_FLIPS.join(" ")}`);
  console.log(`trend slope ${TREND.slope.toFixed(4)} per flip, fit ${TREND.at(0).toFixed(2)} to ${TREND.at(STEPS).toFixed(2)}`);
  console.log(`featured r walks ${R_WALKS.toFixed(3)}, diffs ${R_DIFFS.toFixed(3)}`);
  console.log(`lag-1 walk ${LAG1_WALK.toFixed(3)}, flips ${LAG1_FLIPS.toFixed(3)}`);
  console.log(`|r| > 0.5: walks ${pct(SHARE.walks50, 1)}, ${LONG_STEPS}-flip walks ${pct(SHARE.long50, 1)}`);
  console.log(`sd of r: walks ${SPREAD.walks.toFixed(3)}, long ${SPREAD.long.toFixed(3)}, diffs ${SPREAD.diffs.toFixed(3)}`);
  console.log(`|r| > 0.25: walks ${pct(SHARE.walks25, 1)}, diffs ${DIFFS_PAST_25} of ${PAIRS}; max diff |r| ${MAX_ABS_DIFF.toFixed(3)}`);
  console.log(`ADF p: walk ${ADF_WALK.toFixed(3)}, diffs ${ADF_DIFF.toExponential(2)}`);
  console.log(`differences start with the flips: ${DIFF_A.slice(0, FIRST_FLIPS.length).join(",") === FIRST_FLIPS.join(",")}`);
  console.log(`max bin: walks ${Math.max(...HIST.walks)}, long ${Math.max(...HIST.long)}, diffs ${Math.max(...HIST.diffs)}`);
}
