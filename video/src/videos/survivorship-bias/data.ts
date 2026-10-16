// Every number SurvivorshipBias shows, read from measurements.json, which
// measure.py writes (Wald's worked example recomputed with his formulas, and
// the lesson's mutual-fund simulation run in numpy exactly as the lesson
// runs it). Nothing here is typed in by hand. `node
// src/videos/survivorship-bias/data.ts` prints what the narration quotes.
import m from "./measurements.json" with { type: "json" };

export const VIDEO = "survivorship-bias";

/** Gate for the watercolor spots: true once public/images/survivorship-bias/
 *  holds the WebPs `npm run illustrations -- survivorship-bias` writes. */
export const ILLUSTRATIONS = true;

// ── Wald's example (memo Part V) ────────────────────────────────────────────

export const WALD = m.wald;
export type PartKey = "engines" | "fuselage" | "fuel" | "other";
export type Part = (typeof m.wald.parts)[number] & { key: PartKey };
export const PARTS = m.wald.parts as Part[];
export const part = (key: PartKey) => PARTS.find((p) => p.key === key)!;

/** "27%": a share as a whole percentage, the way the figure prints it. */
export const pct = (x: number) => `${Math.round(x * 100)}%`;

// ── The lesson's mutual funds ──────────────────────────────────────────────

export const FUNDS = m.funds;
/** One-point bins from BIN_LO: counts, and the sum of the returns in each. */
export const BIN_LO = m.funds.binLo;
export const BIN_W = m.funds.binWidth;
export const COUNTS: readonly number[] = m.funds.counts;
const SUMS: readonly number[] = m.funds.sums;
export const BIN_HI = BIN_LO + COUNTS.length * BIN_W;

/** The average of every fund at or above `cut`, a bin edge: what the
 *  database reports once everything below it has been closed. */
export const meanAbove = (cut: number) => {
  const k = Math.max(0, Math.round((cut - BIN_LO) / BIN_W));
  let n = 0;
  let s = 0;
  for (let i = k; i < COUNTS.length; i++) {
    n += COUNTS[i];
    s += SUMS[i];
  }
  return { n, mean: n ? s / n : 0 };
};

/** Funds below a bin edge: the ones closed by a cutoff there. */
export const countBelow = (cut: number) => FUNDS.n - meanAbove(cut).n;

// The swept cutoff ends exactly where the lesson closes funds, so the last
// step of the sweep lands on the lesson's own numbers.
const atCutoff = meanAbove(FUNDS.closedAt);
if (atCutoff.n !== FUNDS.open || Math.abs(atCutoff.mean - FUNDS.survivorAvg) > 1e-9) {
  throw new Error("survivorship-bias: the binned survivors disagree with measure.py");
}

// ── Printing, for checking the script ───────────────────────────────────────

const runAsScript =
  typeof process !== "undefined" &&
  typeof process.argv?.[1] === "string" &&
  process.argv[1].endsWith("data.ts");
if (runAsScript) {
  console.log(`Wald: ${WALD.planes} planes, ${WALD.returned} back, ${WALD.totalHits} hits on the returning planes`);
  for (const p of PARTS) {
    console.log(
      `  ${p.name.padEnd(16)} area ${pct(p.areaShare)} (${p.area} sq ft)  holes ${pct(p.hitShare)} (${p.hits})  downed by one hit ${pct(p.downedByOneHit)}`,
    );
  }
  for (const line of FUNDS.printed) console.log(line);
  console.log(`open ${FUNDS.open}, closed ${FUNDS.closed}`);
}
