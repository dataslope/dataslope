/**
 * A Pyodide interpreter in Node, set up to behave like the one the site runs
 * in a browser worker. Shared by check-code-blocks.mjs and
 * check-challenge-cards.mjs; without the package mirroring below, runner gaps
 * get reported as broken lesson content. Rendering is deliberately not
 * mirrored — `fig.show()` / `plt.show()` are stubbed; the sweeps only ask
 * "does this raise?".
 *
 * The pyodide devDependency MUST stay pinned to the version
 * `app/_components/runtime/pyodide-worker.ts` loads from the CDN, so
 * deprecations fire on the pandas readers actually get.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Worker } from "node:worker_threads";

import { POLARS_IMPORT_PATTERN, POLARS_WASM_SHIM } from "../../app/_components/runtime/polarsWasm.ts";
import { installSyncHttp } from "./sync-http.mjs";

const DATASET_BASE = "https://raw.githubusercontent.com/dataslope/datasets/main/";
const CACHE = ".dataset-cache";

/**
 * Per-block wall-clock budget. 30s is a claim about the reader's patience,
 * not the machine: a slower block is a content problem. The env override
 * exists for measuring over-budget blocks, not for quieting the sweep — do
 * not raise it in CI.
 */
export const BLOCK_TIMEOUT_MS = Number(process.env.BLOCK_TIMEOUT_MS ?? 30_000);

/** Ceiling on captured stdout+stderr per run, in characters. */
const CAPTURE_LIMIT = 4_000_000;

/**
 * Failure patterns skipped rather than reported as content failures, so real
 * breakages are not buried in noise. Every entry is a block nobody is
 * checking, so the list is meant to shrink — TLS errors are deliberately not
 * excused (sync-http.mjs makes HTTP work for real).
 *
 * The polars thread/lock patterns are actually *content* failures the reader
 * gets too (`scan_csv` on a big file — the Pyodide wheel has no
 * `new-streaming` feature); they stay here only so the sweep is not drowned
 * by the poisoned-lock cascade after the first one, and
 * `check-polars-scan.mjs` counts them so they cannot quietly grow.
 */
export const ENVIRONMENT_ONLY = [
  /could not spawn threads/,
  /LazyLock instance has previously been poisoned/,
  // JSPI: Chrome has it, Node's V8 build does not, so blocks that suspend
  // WebAssembly (`input()` etc.) cannot run.
  /WebAssembly stack switching not supported/,
];

export const isEnvironmental = (f) =>
  ENVIRONMENT_ONLY.some((re) => re.test(f.full ?? f.error ?? ""));

/** Datasets live in the dataslope/datasets repo and are fetched by the browser
 *  at run time; cache them on disk so a re-run is offline. */
async function fetchDataset(path) {
  mkdirSync(CACHE, { recursive: true });
  const local = join(CACHE, path.replace(/[/\\]/g, "__"));
  if (existsSync(local)) return readFileSync(local);
  const url = path.startsWith("http") ? path : DATASET_BASE + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(local, buf);
  return buf;
}

/** Packages a block needs but never names. Mirrors IMPLICIT_PACKAGES in the
 *  worker; the comment there explains why the trigger is a call pattern rather
 *  than an import. */
const IMPLICIT_PACKAGES = [
  { pattern: /\btrendline\s*=/, pkg: "statsmodels" },
  { pattern: /\bpyarrow\b|\.(?:to|from)_(?:arrow|pandas)\(/, pkg: "pyarrow" },
  { pattern: /\.(?:to|read|scan|sink)_parquet\(/, pkg: "pyarrow" },
  // pyarrow must be on disk before the first `import polars`: polars caches
  // "is Arrow available?" at import time and never re-checks.
  {
    pattern:
      /^\s*(?:from\s+polars(?:\.[\w.]+)?\s+import\b|import\s+(?:[\w.]+\s*,\s*)*polars(?:\.[\w.]+)?(?:\s+as\s+\w+)?\s*(?:,|$|#))/m,
    pkg: "pyarrow",
  },
  { pattern: /\btz_localize\(|\btz_convert\(|\bZoneInfo\(|\btz\s*=\s*["']/, pkg: "tzdata" },
];

/** Pure-Python wheels the Pyodide lockfile does not know about. Has to stay in
 *  step with the map of the same name in the worker. */
const MICROPIP_PACKAGES = { openpyxl: "openpyxl", seaborn: "seaborn" };

/** Anchored to a line start, so a module named inside a string or a comment
 *  does not trigger an install. Mirrors the worker's `codeImportsModule`. */
function codeImportsModule(code, mod) {
  const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^\\s*(?:from\\s+${esc}(?:\\.[\\w.]+)?\\s+import\\b|import\\s+(?:[\\w.]+\\s*,\\s*)*${esc}(?:\\.[\\w.]+)?(?:\\s+as\\s+\\w+)?\\s*(?:,|$|#))`,
    "m",
  ).test(code);
}

/**
 * Boot Pyodide and return a runner.
 *
 * @param {string} label prefix for progress lines, so two sweeps sharing this
 *   file still say which one is talking.
 */
export async function bootPyodide(label) {
  // A block that leaves a rejected promise behind (a bare `await` on a failed
  // fetch, say) would otherwise take the whole process down mid-sweep and lose
  // every result collected so far.
  process.on("unhandledRejection", (err) => {
    console.error(`${label}: unhandled rejection —`, err?.message ?? err);
  });

  const { loadPyodide } = await import("pyodide");

  console.log(`${label}: booting Pyodide…`);
  const py = await loadPyodide({
    packages: ["numpy", "pandas", "matplotlib", "scipy", "micropip"],
  });

  const version = py.runPython(
    "import sys, pandas; f'{sys.version.split()[0]} / pandas {pandas.__version__}'",
  );
  console.log(`${label}: python ${version}`);

  // plotly is not in the Pyodide distribution; the site micropip-installs it on
  // first import and so does this.
  try {
    const micropip = py.pyimport("micropip");
    await micropip.install("plotly");
  } catch (err) {
    console.error(`${label}: could not install plotly (${err.message}).`);
    console.error("Blocks that import it will be reported as failures; rerun with network access.");
  }

  // HTTP, the same way the worker sets it up (SETUP_SCRIPT_B in
  // pyodide-worker.ts): pyodide_http reroutes urllib/requests through XHR.
  // Node has no XMLHttpRequest — `patch_all()` still "succeeds" but requests
  // fall through to a raw socket with no TLS — so installSyncHttp supplies a
  // genuinely blocking XHR first.
  const uninstallSyncHttp = installSyncHttp();
  try {
    const micropip = py.pyimport("micropip");
    await micropip.install("pyodide_http");
    py.runPython("import pyodide_http; pyodide_http.patch_all()");
  } catch (err) {
    console.error(`${label}: could not set up pyodide_http (${err.message}).`);
    console.error("Blocks that fetch over HTTP will be reported as failures.");
  }

  // fig.show()/plt.show() have nowhere to draw here, and the worker installs
  // `display` into builtins (see pyodide-worker.ts) — without the same shim
  // every block using it fails with NameError.
  py.runPython(`
import builtins
import matplotlib
matplotlib.use("Agg")
import plotly.io as pio
pio.renderers.default = "json"
import plotly.graph_objects as _go
_go.Figure.show = lambda self, *a, **k: None

def display(*objs, **kwargs):
    """Stand-in for the worker's rich display: printing is enough to prove the
    object exists and can be rendered."""
    for o in objs:
        print(o)

builtins.display = display
`);

  // The interrupt buffer is the only way to stop a looping block: Python
  // checks it between bytecodes and raises KeyboardInterrupt on a 2.
  const interrupt = new Uint8Array(new SharedArrayBuffer(1));
  py.setInterruptBuffer(interrupt);

  // The 2 must be written from another thread: a `setTimeout` never fires
  // because `runPythonAsync` only yields at Python `await` points, so a
  // compute-bound block blocks the event loop and the "timeout" bounds
  // nothing. The watchdog worker shares the interrupt buffer, waits out the
  // budget on `ctl`, and writes the 2 itself; `ctl` carries a generation
  // number so a run that finishes early wakes the watchdog and it skips that
  // round instead of firing into the next block.
  const ctl = new Int32Array(new SharedArrayBuffer(4));
  const watchdog = new Worker(
    `const { parentPort, workerData } = require("node:worker_threads");
     const flag = new Uint8Array(workerData.interrupt);
     const ctl = new Int32Array(workerData.ctl);
     parentPort.on("message", ({ gen, ms }) => {
       if (Atomics.wait(ctl, 0, gen, ms) === "timed-out" && Atomics.load(ctl, 0) === gen) {
         flag[0] = 2;
       }
     });`,
    { eval: true, workerData: { interrupt: interrupt.buffer, ctl: ctl.buffer } },
  );
  watchdog.unref();
  let generation = 0;

  /** Arm the watchdog for this run; returns the disarm function. */
  function guard(ms) {
    const gen = ++generation;
    Atomics.store(ctl, 0, gen);
    watchdog.postMessage({ gen, ms });
    return () => {
      Atomics.store(ctl, 0, gen + 1);
      Atomics.notify(ctl, 0);
      interrupt[0] = 0;
    };
  }

  // Fetched once: `py.globals.get(...)` mints a PyProxy per call, and one
  // leaked per block wedged the interpreter ~1000 blocks in.
  const dictCtor = py.globals.get("dict");

  const micropipInstalled = new Set(["plotly"]);
  const implicitLoaded = new Set();
  let polarsShimmed = false;
  const staged = new Set();

  /** The two package steps the browser does before every run, mirrored here. */
  async function ensurePackages(code) {
    // Quiet: the loader narrates every fetch through stdout.
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
          (codeImportsModule(code, mod) ||
            (mod === "openpyxl" && /\.(?:to|read)_excel\(/.test(code))),
      )
      .map(([, req]) => req);
    if (needed.length > 0) {
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
    // The same polars mmap shim the browser worker installs, at the same
    // moment: before the block's own `import polars`.
    if (!polarsShimmed && POLARS_IMPORT_PATTERN.test(code)) {
      await py.runPythonAsync(POLARS_WASM_SHIM);
      polarsShimmed = true;
    }
  }

  /** Stage a block's datasets and sibling files into the Pyodide filesystem.
   *  Returns an error string, or null when everything landed. */
  async function stage({ datasets = [], files = [], entry }) {
    for (const d of datasets) {
      if (staged.has(d.stageAs)) continue;
      try {
        py.FS.writeFile(d.stageAs, new Uint8Array(await fetchDataset(d.path)));
        staged.add(d.stageAs);
      } catch (err) {
        return `dataset ${d.path}: ${err.message}`;
      }
    }
    // Non-entry files are importable siblings, so they must exist on disk.
    // `solutionSource` (set only by the challenge-card extractor) is the
    // buffer Solution would leave in that file; without it multi-file cards
    // are graded with sibling modules still blank. `initCode` is joined only
    // when present, matching `effectiveSourceFor` in ChallengeCard.tsx — an
    // unconditional "\n" prefix corrupts data siblings (it once cost a CSV
    // its header row).
    const siblings = [];
    for (const f of files) {
      if (f.filename === entry) continue;
      const body = f.solutionSource ?? f.starterCode;
      py.FS.writeFile(f.filename, f.initCode ? `${f.initCode}\n${body}` : body);
      siblings.push(f.filename);
    }

    // Drop these modules from the import cache before the run: one
    // interpreter serves the whole sweep, but a reader gets a fresh runtime
    // per card, so a cached `utils.py` from an earlier card fails a later,
    // innocent one. Done by filename rather than clearing everything.
    const modules = siblings
      .filter((n) => n.endsWith(".py"))
      .map((n) => n.slice(0, -3).replace(/\//g, "."));
    if (modules.length > 0) {
      py.runPython(`
import importlib, sys
for _name in ${JSON.stringify(modules)}:
    sys.modules.pop(_name, None)
del _name
importlib.invalidate_caches()
`);
    }
    return null;
  }

  /**
   * Run `code` in a fresh namespace. `capture` is off by default — holding
   * every printed byte in a JS string is unbounded and quadratic, and a
   * "does this raise?" sweep has no use for it. Callers that need the text
   * (the challenge harness) opt in and get a capped buffer.
   *
   * @returns {{error: string|null, full: string|null, stdout: string,
   *   stderr: string, truncated: boolean, ms: number}}
   */
  async function run(code, { capture = false } = {}) {
    const startedAt = Date.now();
    const disarm = guard(BLOCK_TIMEOUT_MS);
    const ns = dictCtor();
    const out = [];
    const err = [];
    let captured = 0;
    let truncated = false;
    if (capture) {
      // Chunks in an array, joined once: linear, not quadratic. The cap keeps
      // a runaway loop from taking the sweep down.
      const sink = (bucket) => (s) => {
        if (captured > CAPTURE_LIMIT) {
          truncated = true;
          return;
        }
        captured += s.length + 1;
        bucket.push(s);
      };
      py.setStdout({ batched: sink(out) });
      py.setStderr({ batched: sink(err) });
    }
    let error = null;
    let full = null;
    try {
      // Two timeouts for two ways to hang: the interrupt buffer stops Python
      // bytecode; this race covers a pending JS promise (package downloads).
      await Promise.race([
        ensurePackages(code).then(() => py.runPythonAsync(code, { globals: ns })),
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
      error = timedOut ? `did not finish in ${BLOCK_TIMEOUT_MS / 1000}s` : last;
      full = message;
    } finally {
      // Always, including on failure: a leaked namespace per broken block is
      // the same slow death as a leaked PyProxy.
      ns.destroy();
      disarm();
      if (capture) {
        py.setStdout({});
        py.setStderr({});
      }
    }
    return {
      error,
      full,
      stdout: out.length > 0 ? `${out.join("\n")}\n` : "",
      stderr: err.length > 0 ? `${err.join("\n")}\n` : "",
      truncated,
      ms: Date.now() - startedAt,
    };
  }

  return { py, run, stage, ensurePackages, uninstallSyncHttp };
}
