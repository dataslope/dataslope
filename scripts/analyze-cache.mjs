#!/usr/bin/env node
/**
 * Break down what `.open-next/cache` is actually made of.
 *
 * Why this exists:
 *
 * Every deploy — production and every preview — writes this whole directory to
 * R2 under a fresh build-ID prefix, undiffed (see open-next.config.ts). So its
 * size is paid twice over: once per deploy in populate time, and once per
 * retained build in storage until .github/workflows/r2-cache-cleanup.yml
 * prunes it. That makes "what is in here, and does it need to be?" a question
 * worth being able to answer in one command rather than by hand.
 *
 * It has already changed one decision. The client segment cache arrived on by
 * default in Next 16 and nothing in this repo opted in; this script is what
 * showed that its `segmentData` map was 42.8% of the cache, and that
 * `segmentData["/_full"]` was byte-identical to `rsc` in 1,045 of 1,045
 * objects — a fifth of the bucket being one field stored twice. It is off in
 * next.config.ts as a result, with those numbers recorded beside the flag.
 *
 * Usage:
 *
 *   node scripts/analyze-cache.mjs [dir]              # default .open-next/cache
 *   node scripts/analyze-cache.mjs [dir] --compress   # + compression sample
 *
 * `--compress` answers the other half of the question: these objects are stored
 * and uploaded uncompressed, and they are repetitive JSON. It samples across the
 * set (every Nth object, not the first N — sizes vary by course) and reports
 * what gzip and brotli would do. It is slow enough to be opt-in.
 *
 * Read the percentages, not the absolute sizes, when comparing two builds: the
 * corpus grows, and a share of the total is the thing that stays comparable.
 *
 * Reads only; it never writes to the cache or to R2.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const withCompression = args.includes("--compress");
const DIR = args.find((a) => !a.startsWith("--")) ?? ".open-next/cache";

/** Every file under `dir`, recursively. */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Byte length of a field as it sits in the JSON, string or not. */
const sizeOf = (v) => Buffer.byteLength(typeof v === "string" ? v : JSON.stringify(v ?? null));

let files;
try {
  files = walk(DIR);
} catch {
  console.error(
    `[analyze-cache] no cache at ${DIR}. Run \`npx opennextjs-cloudflare build\` first.`,
  );
  process.exit(1);
}

const totals = { total: 0, html: 0, rsc: 0, segment: 0, segmentFull: 0 };
let parsed = 0;
let unparsed = 0;
let withSegment = 0;
let withFull = 0;
let fullEqualsRsc = 0;

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  totals.total += Buffer.byteLength(raw);

  let entry;
  try {
    entry = JSON.parse(raw);
  } catch {
    // Not every object in here is a JSON cache entry; count it in the total
    // and move on rather than guessing at its shape.
    unparsed++;
    continue;
  }
  parsed++;

  // OpenNext wraps the payload in `value` in some versions and not others.
  const value = entry?.value ?? entry;
  totals.html += sizeOf(value.html ?? "");
  totals.rsc += sizeOf(value.rsc ?? "");

  const segment = value.segmentData;
  if (segment && typeof segment === "object") {
    withSegment++;
    totals.segment += sizeOf(segment);
    if ("/_full" in segment) {
      withFull++;
      totals.segmentFull += sizeOf(segment["/_full"]);
      // The duplication claim, checked on every object rather than sampled.
      if (String(segment["/_full"]) === String(value.rsc)) fullEqualsRsc++;
    }
  }
}

const accounted = totals.html + totals.rsc + totals.segment;
const gib = (b) => (b / 1073741824).toFixed(3);
const pct = (b) => `${((b / totals.total) * 100).toFixed(1)}%`;
const row = (label, bytes, note = "") =>
  console.log(`  ${label.padEnd(16)} ${gib(bytes).padStart(7)} GiB  ${pct(bytes).padStart(6)}${note}`);

console.log(`\n${DIR}: ${files.length} object(s), ${gib(totals.total)} GiB\n`);
row("html", totals.html);
row("rsc", totals.rsc);
row("segmentData", totals.segment, `   present on ${withSegment}/${parsed}`);
if (withFull) {
  row('  └ "/_full"', totals.segmentFull, `   byte-identical to rsc: ${fullEqualsRsc}/${withFull}`);
}
row("other/overhead", totals.total - accounted);
if (unparsed) console.log(`\n  (${unparsed} object(s) were not JSON and are counted in the total only)`);

if (withFull && fullEqualsRsc === withFull) {
  console.log(
    `\n  ${pct(totals.segmentFull)} of this cache is \`rsc\` stored a second time under ` +
      `segmentData["/_full"].\n  Not removable on Next 16.3.0 — see the note in open-next.config.ts.`,
  );
}

if (withCompression) {
  // Every Nth object rather than the first N: sizes track the course a page
  // belongs to, so a prefix is not a sample.
  const step = Math.max(1, Math.floor(files.length / 120));
  const sample = files.filter((_, i) => i % step === 0);
  let raw = 0;
  let gz = 0;
  let br = 0;
  for (const file of sample) {
    const buf = readFileSync(file);
    raw += buf.length;
    gz += gzipSync(buf, { level: 6 }).length;
    br += brotliCompressSync(buf, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
    }).length;
  }
  const ratio = (b) => `${(raw / b).toFixed(2)}×`;
  const share = (b) => `${((b / raw) * 100).toFixed(1)}%`;
  console.log(`\n  compression, sampled on ${sample.length} of ${files.length} objects:`);
  console.log(`    gzip -6     ${share(gz).padStart(6)} of raw  ${ratio(gz).padStart(7)}  → ${gib((totals.total * gz) / raw)} GiB`);
  console.log(`    brotli q5   ${share(br).padStart(6)} of raw  ${ratio(br).padStart(7)}  → ${gib((totals.total * br) / raw)} GiB`);
  console.log(
    "\n  These objects go to R2 uncompressed, in full, on every deploy. Compressing\n" +
      "  them in a custom `incrementalCache` override is the largest lever on this\n" +
      "  cache by some margin — and it subsumes the segmentData duplication above,\n" +
      "  which compresses to almost nothing precisely because it is a duplicate.",
  );
}
console.log();
