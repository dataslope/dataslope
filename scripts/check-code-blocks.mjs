/**
 * Runs every Python `<CodeBlock>` in `content/` and reports the ones that
 * raise.
 *
 * These blocks are the part of a lesson a reader actually executes, and
 * nothing else in the repo checks them: `check-prose` lints the words,
 * `check-mcq` lints the questions, and the Playwright suite drives
 * `<ChallengeCard>`s only. A block that stopped working because a library
 * deprecated an argument therefore ships silently and fails in the reader's
 * browser, which is how `freq="H"` survived into pandas 3.
 *
 * The site executes these in Pyodide in a worker; this boots the same Pyodide
 * build once in Node and runs each block in a fresh namespace, which turns a
 * multi-hour browser sweep into a couple of minutes. It is not a perfect
 * mirror of the browser (no canvas, no `fig.show()` renderer), so the runner
 * stubs the display side and cares only about whether the code raises.
 *
 * The pyodide devDependency MUST stay pinned to the same version
 * `app/_components/runtime/pyodide-worker.ts` loads from the CDN. An older
 * build ships an older pandas, and the whole point of this check is to catch
 * the deprecations that fire on the version readers actually get: pandas 2
 * only warns about `freq="H"`, pandas 3 raises.
 *
 * Usage:
 *   node scripts/check-code-blocks.mjs [--filter <substring>] [--list] [--json <path>]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const CONTENT_DIR = "content";
const DATASET_BASE = "https://raw.githubusercontent.com/dataslope/datasets/main/";

// ── MDX extraction ──────────────────────────────────────────────────────────

/** Walk from `open` (index of the char after `<CodeBlock`) to the matching
 *  `/>`, tracking brace/bracket depth and skipping over string literals so a
 *  `>` or `}` inside code never ends the tag early. */
function tagEnd(src, open) {
  let i = open;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "`" || c === '"' || c === "'") {
      const quote = c;
      i += 1;
      while (i < src.length) {
        if (src[i] === "\\") i += 2;
        else if (src[i] === quote) break;
        else i += 1;
      }
    } else if (c === "{" || c === "[") depth += 1;
    else if (c === "}" || c === "]") depth -= 1;
    else if (c === "/" && src[i + 1] === ">" && depth === 0) return i + 2;
    i += 1;
  }
  return -1;
}

/** Read a backtick-delimited template literal starting at `start` (the
 *  backtick), returning [text, indexAfterClosingBacktick]. Handles the
 *  escapes MDX authors actually use: \` and \\ and \$. */
function readTemplate(src, start) {
  let i = start + 1;
  let out = "";
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      const next = src[i + 1];
      // MDX passes the string through JS, so \` \\ \$ are unescaped, and
      // \n inside a template literal is a literal backslash-n in Python
      // (used for "\\n" in print strings) — leave those alone.
      if (next === "`" || next === "\\" || next === "$") {
        out += next;
        i += 2;
        continue;
      }
      out += c;
      i += 1;
      continue;
    }
    if (c === "`") return [out, i + 1];
    out += c;
    i += 1;
  }
  return [out, i];
}

/** Pull `filename` / `initCode` / `starterCode` out of one `files={[...]}`
 *  literal, in source order. */
function parseFiles(block) {
  const files = [];
  const keyRe = /(filename|initCode|starterCode)\s*:\s*/g;
  let current = null;
  let m;
  while ((m = keyRe.exec(block)) !== null) {
    const valueStart = m.index + m[0].length;
    const ch = block[valueStart];
    let value;
    let after;
    if (ch === "`") {
      [value, after] = readTemplate(block, valueStart);
    } else if (ch === '"' || ch === "'") {
      const end = block.indexOf(ch, valueStart + 1);
      value = block.slice(valueStart + 1, end);
      after = end + 1;
    } else {
      continue;
    }
    keyRe.lastIndex = after;
    if (m[1] === "filename") {
      current = { filename: value, initCode: "", starterCode: "" };
      files.push(current);
    } else if (current) {
      current[m[1]] = value;
    }
  }
  return files;
}

function parseDatasets(block) {
  const out = [];
  const re = /path:\s*"([^"]+)"(?:\s*,\s*stageAs:\s*"([^"]+)")?/g;
  let m;
  while ((m = re.exec(block)) !== null) out.push({ path: m[1], stageAs: m[2] ?? m[1] });
  return out;
}

function mdxFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...mdxFiles(p));
    else if (entry.name.endsWith(".mdx")) out.push(p);
  }
  return out.sort();
}

export function extractBlocks(root = CONTENT_DIR) {
  const blocks = [];
  for (const file of mdxFiles(root)) {
    const src = readFileSync(file, "utf8");
    let idx = 0;
    while ((idx = src.indexOf("<CodeBlock", idx)) !== -1) {
      const end = tagEnd(src, idx + "<CodeBlock".length);
      if (end === -1) break;
      const raw = src.slice(idx, end);
      idx = end;
      const adapter = raw.match(/adapter="([^"]+)"/)?.[1];
      if (adapter !== "python") continue;
      const files = parseFiles(raw);
      if (files.length === 0) continue;
      const entryName = raw.match(/entryFilename="([^"]+)"/)?.[1];
      const entry = files.find((f) => f.filename === entryName) ?? files[0];
      blocks.push({
        file: relative(process.cwd(), file),
        line: src.slice(0, idx).split("\n").length,
        datasets: parseDatasets(raw),
        files,
        entry: entry.filename,
        // What Run executes: the hidden setup, then the visible buffer.
        code: `${entry.initCode ? `${entry.initCode}\n` : ""}${entry.starterCode}`,
      });
    }
  }
  return blocks;
}

// ── Runner ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? "");
};

const filter = flag("--filter");
let blocks = extractBlocks();
if (filter) blocks = blocks.filter((b) => b.file.includes(filter));

if (args.includes("--list")) {
  for (const b of blocks) console.log(`${b.file}:${b.line}  (${b.code.split("\n").length} lines)`);
  console.log(`\n${blocks.length} python block(s)`);
  process.exit(0);
}

const CACHE = ".dataset-cache";
mkdirSync(CACHE, { recursive: true });

/** Datasets live in the dataslope/datasets repo and are fetched by the
 *  browser at run time; cache them on disk so a re-run is offline. */
async function dataset(path) {
  const local = join(CACHE, path.replace(/[/\\]/g, "__"));
  if (existsSync(local)) return readFileSync(local);
  const url = path.startsWith("http") ? path : DATASET_BASE + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(local, buf);
  return buf;
}

// A block that leaves a rejected promise behind (a bare `await` on a failed
// fetch, say) would otherwise take the whole process down mid-sweep and lose
// every result collected so far.
process.on("unhandledRejection", (err) => {
  console.error("check-code-blocks: unhandled rejection —", err?.message ?? err);
});

const { loadPyodide } = await import("pyodide");

console.log("check-code-blocks: booting Pyodide…");
const py = await loadPyodide({ packages: ["numpy", "pandas", "matplotlib", "scipy", "micropip"] });

const pyVersion = py.runPython("import sys, pandas; f'{sys.version.split()[0]} / pandas {pandas.__version__}'");
console.log(`check-code-blocks: python ${pyVersion}`);

// plotly is not in the Pyodide distribution; the site micropip-installs it on
// first import and so does this.
try {
  const micropip = py.pyimport("micropip");
  await micropip.install("plotly");
} catch (err) {
  console.error(`check-code-blocks: could not install plotly (${err.message}).`);
  console.error("Blocks that import it will be reported as failures; rerun with network access.");
}

// The blocks call fig.show() and plt.show(); neither has anywhere to draw
// here, and a headless failure there is not a lesson bug.
py.runPython(`
import matplotlib
matplotlib.use("Agg")
import plotly.io as pio
pio.renderers.default = "json"
import plotly.graph_objects as _go
_go.Figure.show = lambda self, *a, **k: None
`);

// Pyodide runs Python synchronously, so the only way to stop a block that
// loops forever (or sits waiting on a package that will never arrive) is the
// interrupt buffer: Python checks it between bytecodes and raises
// KeyboardInterrupt when it sees a 2. Without this, one bad block hangs the
// whole sweep and every result collected so far is lost.
const interrupt = new Uint8Array(new SharedArrayBuffer(1));
py.setInterruptBuffer(interrupt);
const BLOCK_TIMEOUT_MS = 30_000;

// Fetched once. `py.globals.get(...)` mints a PyProxy on every call, and one
// leaked per block was enough to wedge the interpreter about a thousand blocks
// in — which looked exactly like a hang on whatever block happened to be next,
// and sent two debugging attempts after innocent lesson content.
const dictCtor = py.globals.get("dict");

/**
 * The two package steps the browser does before every run, mirrored here.
 *
 * Without them this sweep reports a few hundred false failures: every polars
 * and scikit-learn block fails with Pyodide's "see loading-packages" notice,
 * every openpyxl block with ModuleNotFoundError, and every tz-aware timestamp
 * with ZoneInfoNotFoundError — none of which happens to a reader, because
 * app/_components/runtime/pyodide-worker.ts loads those packages first.
 *
 * `loadPackagesFromImports` covers everything in the Pyodide distribution
 * (polars, scikit-learn, tzdata). MICROPIP_PACKAGES covers the pure-Python
 * wheels the distribution's lockfile does not know about; it has to stay in
 * step with the map of the same name in the worker.
 */
const MICROPIP_PACKAGES = { openpyxl: "openpyxl", seaborn: "seaborn" };
const micropipInstalled = new Set(["plotly"]);
const implicitLoaded = new Set();

/** Packages a block needs but never names. Mirrors IMPLICIT_PACKAGES in the
 *  worker; the comment there explains why the trigger is a call pattern rather
 *  than an import. */
const IMPLICIT_PACKAGES = [
  { pattern: /\btrendline\s*=/, pkg: "statsmodels" },
  { pattern: /\bpyarrow\b|\.(?:to|from)_(?:arrow|pandas)\(/, pkg: "pyarrow" },
  { pattern: /\.(?:to|read|scan|sink)_parquet\(/, pkg: "pyarrow" },
  { pattern: /\btz_localize\(|\btz_convert\(|\bZoneInfo\(|\btz\s*=\s*["']/, pkg: "tzdata" },
];

/** Anchored to a line start, so a module named inside a string or a comment
 *  does not trigger an install. Mirrors the worker's `codeImportsModule`. */
function codeImportsModule(code, mod) {
  const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^\\s*(?:from\\s+${esc}(?:\\.[\\w.]+)?\\s+import\\b|import\\s+(?:[\\w.]+\\s*,\\s*)*${esc}(?:\\.[\\w.]+)?(?:\\s+as\\s+\\w+)?\\s*(?:,|$|#))`,
    "m",
  ).test(code);
}

async function ensurePackages(code) {
  // Quiet: the loader narrates every fetch through stdout, which would be
  // interleaved with the block's own output.
  await py.loadPackagesFromImports(code, {
    messageCallback: () => {},
    errorCallback: () => {},
  });
  const implicit = IMPLICIT_PACKAGES.filter(
    ({ pattern, pkg }) => pattern.test(code) && !implicitLoaded.has(pkg),
  ).map((p) => p.pkg);
  if (implicit.length > 0) {
    await py.loadPackage(implicit, { messageCallback: () => {}, errorCallback: () => {} });
    for (const pkg of implicit) implicitLoaded.add(pkg);
  }
  const needed = Object.entries(MICROPIP_PACKAGES)
    .filter(
      ([mod, req]) =>
        !micropipInstalled.has(req) &&
        (codeImportsModule(code, mod) || (mod === "openpyxl" && /\.(?:to|read)_excel\(/.test(code))),
    )
    .map(([, req]) => req);
  if (needed.length === 0) return;
  const micropip = py.pyimport("micropip");
  try {
    for (const req of needed) {
      await micropip.install(req);
      micropipInstalled.add(req);
    }
  } finally {
    micropip.destroy();
  }
}

const staged = new Set();
const failures = [];
let slowest = { ms: 0 };

for (const [i, b] of blocks.entries()) {
  for (const d of b.datasets) {
    if (staged.has(d.stageAs)) continue;
    try {
      py.FS.writeFile(d.stageAs, new Uint8Array(await dataset(d.path)));
      staged.add(d.stageAs);
    } catch (err) {
      failures.push({ ...b, error: `dataset ${d.path}: ${err.message}` });
    }
  }
  // Non-entry files are importable siblings, so they have to exist on disk.
  for (const f of b.files) {
    if (f.filename === b.entry) continue;
    py.FS.writeFile(f.filename, `${f.initCode}\n${f.starterCode}`);
  }
  const startedAt = Date.now();
  const alarm = setTimeout(() => {
    interrupt[0] = 2;
  }, BLOCK_TIMEOUT_MS);
  const ns = dictCtor();
  try {
    // Two timeouts, because there are two ways to hang. The interrupt buffer
    // above stops Python spinning in its own bytecode; it cannot touch a
    // pending JS promise, and `runPythonAsync` awaits package downloads for
    // any module the block imports. This race covers that second case.
    await Promise.race([
      ensurePackages(b.code).then(() => py.runPythonAsync(b.code, { globals: ns })),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`block exceeded ${BLOCK_TIMEOUT_MS / 1000}s`)),
          BLOCK_TIMEOUT_MS + 2000,
        ),
      ),
    ]);
  } catch (err) {
    const message = String(err.message ?? err);
    const last = message.trim().split("\n").filter(Boolean).pop();
    const timedOut = message.includes("KeyboardInterrupt") || message.includes("exceeded");
    failures.push({
      ...b,
      error: timedOut ? `did not finish in ${BLOCK_TIMEOUT_MS / 1000}s` : last,
      full: message,
    });
  } finally {
    // Always, including on the failure path: a leaked namespace per broken
    // block is the same slow death as above.
    ns.destroy();
    clearTimeout(alarm);
    interrupt[0] = 0;
  }
  const ms = Date.now() - startedAt;
  if (ms > slowest.ms) slowest = { ms, file: b.file, line: b.line };
  // Named progress, so a stall points at the block that caused it rather
  // than at a bare counter.
  if ((i + 1) % 25 === 0) {
    console.log(`  …${i + 1}/${blocks.length}  (${b.file}:${b.line})`);
  }
}

/**
 * Failures this environment causes, which a reader never sees.
 *
 * Pyodide-in-Node is close to Pyodide-in-a-browser but not identical, and the
 * gaps are all in the host rather than in the lesson:
 *
 *   • polars ships a Rust thread pool. A browser worker gives it threads; Node
 *     does not, so the first parallel query panics and every later one finds
 *     the poisoned lock.
 *   • `pyodide_http` patches urllib onto `fetch` in the browser. Here a block
 *     that reads a URL gets Node's socket layer and no TLS.
 *
 * Reporting these as content failures is worse than not running the block at
 * all: it buries the real breakages (a deprecated argument, a dtype that
 * pandas 3 now rejects) in a few hundred lines of noise, which is how the
 * first sweep of this file ended up chasing the wrong thing twice.
 */
const ENVIRONMENT_ONLY = [
  /could not spawn threads/,
  /LazyLock instance has previously been poisoned/,
  /TLS not supported in this environment/,
  // JSPI. Chrome has it; Node's V8 build here does not, so any block that
  // suspends WebAssembly (`input()`, and anything built on it) cannot run.
  /WebAssembly stack switching not supported/,
];

const isEnvironmental = (f) => ENVIRONMENT_ONLY.some((re) => re.test(f.full ?? f.error ?? ""));
const real = failures.filter((f) => !isEnvironmental(f));
const skipped = failures.filter(isEnvironmental);

const jsonPath = flag("--json");
if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ real, skipped }, null, 2));

console.log(
  `check-code-blocks: slowest block was ${(slowest.ms / 1000).toFixed(1)}s ` +
    `(${slowest.file}:${slowest.line})`,
);

// Counted, never hidden: a growing number here means the runner is drifting
// further from the browser and the sweep is covering less than it claims.
if (skipped.length > 0) {
  console.log(
    `check-code-blocks: ${skipped.length} block(s) could not run in Node ` +
      `(polars threads, network) and were not checked`,
  );
}

if (real.length === 0) {
  console.log(
    `✓ all ${blocks.length - skipped.length} checkable python code block(s) run without raising`,
  );
  process.exit(0);
}

console.error(`\n✗ ${real.length} of ${blocks.length} python code block(s) failed:\n`);
for (const f of real) console.error(`  ${f.file}:${f.line}\n      ${f.error}`);
process.exit(1);
