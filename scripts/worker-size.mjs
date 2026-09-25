#!/usr/bin/env node
/**
 * How close the Worker is to Cloudflare's 10 MiB (gzipped) script limit.
 *
 * Run after `npx opennextjs-cloudflare build`:
 *
 *   npm run cf:size                    # upload size, gzip size, headroom
 *   npm run cf:size -- --top 30        # plus the largest modules inside it
 *   npm run cf:size -- --budget 8192   # exit 1 above 8,192 KiB gzipped
 *
 * The totals are wrangler's own (`deploy --dry-run`), the number a deploy is
 * checked against. The module breakdown reads the Next server chunks' source
 * maps. Most are sectioned, one section per module, so every byte range
 * belongs to exactly one source file. A few chunks carry one flat map instead;
 * those are split mapping by mapping, which hands a long unmapped run (an
 * inlined JSON literal, say) to whichever mapping precedes it, so treat an
 * unexpectedly large tiny-looking module there with suspicion. The `gz`
 * column compresses each module on its own and multiplies by its copies, so
 * it ranks modules well but does not add up to the total.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT_KIB = 10 * 1024;
const HANDLER_META = join(
  ROOT,
  ".open-next/server-functions/default/handler.mjs.meta.json",
);

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : Number(args[i + 1]);
};
const top = option("--top");
const budget = option("--budget");

if (!existsSync(join(ROOT, ".open-next/worker.js"))) {
  console.error(
    "worker-size: no .open-next/worker.js; run `npx opennextjs-cloudflare build` first.",
  );
  process.exit(1);
}

// ─── Totals, from wrangler ───────────────────────────────────────────────

const outdir = mkdtempSync(join(tmpdir(), "worker-size-"));
const wrangler = spawnSync(
  process.execPath,
  [
    join(ROOT, "node_modules/wrangler/bin/wrangler.js"),
    "deploy",
    "--dry-run",
    "--outdir",
    outdir,
  ],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
rmSync(outdir, { recursive: true, force: true });
const totals = /Total Upload: ([\d.]+) KiB \/ gzip: ([\d.]+) KiB/.exec(
  `${wrangler.stdout}\n${wrangler.stderr}`,
);
if (!totals) {
  console.error(wrangler.stdout, wrangler.stderr);
  console.error("worker-size: wrangler did not report an upload size.");
  process.exit(1);
}
const rawKiB = Number(totals[1]);
const gzipKiB = Number(totals[2]);
const headroom = LIMIT_KIB - gzipKiB;
const fmt = (kib) => `${kib.toLocaleString("en-US", { maximumFractionDigits: 0 })} KiB`;

console.log(`upload   ${fmt(rawKiB)}`);
console.log(`gzip     ${fmt(gzipKiB)} of ${fmt(LIMIT_KIB)} (${((gzipKiB / LIMIT_KIB) * 100).toFixed(1)}%)`);
console.log(`headroom ${fmt(headroom)}`);

// ─── Largest modules, from the server chunks' source maps ────────────────

if (top) {
  if (!existsSync(HANDLER_META)) {
    console.error("worker-size: no handler metafile; is this an OpenNext build?");
    process.exit(1);
  }
  const meta = JSON.parse(readFileSync(HANDLER_META, "utf8"));
  const inputs = Object.entries(Object.values(meta.outputs)[0].inputs);

  /** Repo-relative source path (or npm package) of a map source. */
  const clean = (src) =>
    decodeURIComponent(src)
      .replace(/^turbopack:\/\/\/?/, "")
      .replace(/^\[project\]\//, "")
      .replace(/^(\.\.\/)+/, "")
      .replace(/ \[.*$/, "")
      .replace(/^.*node_modules\//, "node_modules/");

  const modules = new Map();
  const add = (key, text, bytes = text.length) => {
    const entry = modules.get(key) ?? { bytes: 0, copies: 0, gz: 0 };
    entry.bytes += bytes;
    entry.copies += 1;
    entry.gz += text ? gzipSync(text).length : Math.round(bytes / 4);
    modules.set(key, entry);
  };

  const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  /** The first two fields (generated column, source index) of each segment
   *  in a flat map's `mappings`, per generated line, both made absolute. */
  function decodeMappings(mappings) {
    const lines = [];
    let source = 0;
    for (const line of mappings.split(";")) {
      const segments = [];
      let column = 0;
      for (const segment of line.split(",")) {
        if (!segment) continue;
        const fields = [];
        let value = 0;
        let shift = 0;
        for (const ch of segment) {
          const digit = BASE64.indexOf(ch);
          value += (digit & 31) << shift;
          if (digit & 32) {
            shift += 5;
          } else {
            fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
            value = 0;
            shift = 0;
            if (fields.length === 2) break;
          }
        }
        column += fields[0];
        if (fields.length > 1) {
          source += fields[1];
          segments.push([column, source]);
        } else {
          segments.push([column, -1]);
        }
      }
      lines.push(segments);
    }
    return lines;
  }

  /** Split one chunk with a flat map between the sources of its mappings. */
  function addFlatChunk(code, map, rel) {
    const texts = new Map();
    const lines = code.split("\n");
    decodeMappings(map.mappings).forEach((segments, i) => {
      const line = lines[i] ?? "";
      segments.forEach(([column, source], j) => {
        const end = j + 1 < segments.length ? segments[j + 1][0] : line.length;
        const key = source >= 0 ? clean(map.sources[source]) : `(unmapped) ${rel}`;
        texts.set(key, (texts.get(key) ?? "") + line.slice(column, end));
      });
    });
    for (const [key, text] of texts) add(key, text);
  }

  for (const [path, { bytesInOutput }] of inputs) {
    const rel = path.replace(/^.*?\.next\//, ".next/");
    const chunk = join(ROOT, rel);
    if (!path.includes(".next/server/") || !existsSync(`${chunk}.map`)) {
      // Bundled by OpenNext itself (its runtime, next/dist): only a byte count.
      add(clean(path), "", bytesInOutput);
      continue;
    }
    const code = readFileSync(chunk, "utf8");
    const map = JSON.parse(readFileSync(`${chunk}.map`, "utf8"));
    const lineStart = [0];
    for (const line of code.split("\n")) {
      lineStart.push(lineStart[lineStart.length - 1] + line.length + 1);
    }
    const offset = ({ line, column }) => lineStart[line] + column;
    if (!map.sections) {
      addFlatChunk(code, map, rel);
      continue;
    }
    const sections = map.sections;
    sections.forEach((section, i) => {
      const start = offset(section.offset);
      const end = i + 1 < sections.length ? offset(sections[i + 1].offset) : code.length;
      const source = section.map.sources?.[0];
      add(source ? clean(source) : `(unmapped) ${rel}`, code.slice(start, end));
    });
  }

  const rows = [...modules].sort((a, b) => b[1].gz - a[1].gz).slice(0, top);
  console.log(`\n${"gz".padStart(9)} ${"raw".padStart(9)}  copies  module`);
  for (const [key, { bytes, copies, gz }] of rows) {
    console.log(
      `${fmt(gz / 1024).padStart(9)} ${fmt(bytes / 1024).padStart(9)}  ${String(copies).padStart(6)}  ${key}`,
    );
  }
}

if (budget && gzipKiB > budget) {
  console.error(`\nworker-size: ${fmt(gzipKiB)} gzipped is over the ${fmt(budget)} budget.`);
  process.exit(1);
}
