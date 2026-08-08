/**
 * A Pyodide interpreter in Node, set up to behave like the one the site runs
 * in a browser worker.
 *
 * Shared by check-code-blocks.mjs and check-challenge-cards.mjs. The setup
 * here is not incidental: without the package mirroring below, a sweep reports
 * a few hundred failures that no reader ever sees — every polars and
 * scikit-learn block with Pyodide's "see loading-packages" notice, every
 * openpyxl block with ModuleNotFoundError, every tz-aware timestamp with
 * ZoneInfoNotFoundError, and every `display()` call with a NameError. A second
 * copy of that logic would drift from the worker within a release, and the way
 * drift shows up is as lesson content being blamed for a runner gap.
 *
 * What this deliberately does *not* mirror is rendering: `fig.show()` and
 * `plt.show()` have nowhere to draw, so they are stubbed. The question these
 * sweeps ask is only ever "does this raise?".
 *
 * The pyodide devDependency MUST stay pinned to the same version
 * `app/_components/runtime/pyodide-worker.ts` loads from the CDN. An older
 * build ships an older pandas, and the whole point is to catch the
 * deprecations that fire on the version readers actually get: pandas 2 only
 * warns about `freq="H"`, pandas 3 raises.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Worker } from "node:worker_threads";

import { installSyncHttp } from "./sync-http.mjs";

const DATASET_BASE = "https://raw.githubusercontent.com/dataslope/datasets/main/";
const CACHE = ".dataset-cache";

/**
 * Per-block wall-clock budget.
 *
 * 30s is not a guess about the runner, it is a claim about the reader: a block
 * a lesson invites you to press Run on and which then takes longer than this
 * is a content problem, not a sweep problem, so the default stays where a
 * reader's patience is rather than where the machine's is.
 *
 * `BLOCK_TIMEOUT_MS` in the environment raises it, which exists for measuring
 * how long an over-budget block actually takes ("did not finish in 30s" tells
 * you nothing about whether the answer is 31s or ten minutes) — not for
 * quieting the sweep. Raising it in CI turns the check into one that cannot
 * fail on the thing it was built to catch.
 */
export const BLOCK_TIMEOUT_MS = Number(process.env.BLOCK_TIMEOUT_MS ?? 30_000);

/** Ceiling on captured stdout+stderr per run, in characters. */
const CAPTURE_LIMIT = 4_000_000;

/**
 * Failures this environment causes, which a reader never sees.
 *
 * Pyodide-in-Node is close to Pyodide-in-a-browser but not identical, and the
 * gaps are all in the host rather than in the lesson:
 *
 *   • polars ships a Rust thread pool. A browser worker gives it threads; Node
 *     does not, so the first parallel query panics and every later one finds
 *     the poisoned lock.
 *
 * Reporting these as content failures is worse than not running the block at
 * all: it buries the real breakages (a deprecated argument, a dtype that
 * pandas 3 now rejects) in a few hundred lines of noise, which is how the
 * first sweep of this file ended up chasing the wrong thing twice.
 *
 * Every entry here is a block nobody is checking, so the list is meant to
 * shrink. HTTP used to be on it and is not any more: `lib/sync-http.mjs`
 * gives `pyodide_http` a genuinely blocking XMLHttpRequest to patch onto, so
 * the 53 `sns.load_dataset(...)` blocks in the Seaborn course — which were
 * the largest gap the sweep had — now run for real. A TLS error is therefore
 * no longer expected from anywhere, and is deliberately not excused below:
 * if one appears it means some block reaches the network by a path the shim
 * does not cover, and that is worth seeing rather than skipping.
 */
export const ENVIRONMENT_ONLY = [
  /could not spawn threads/,
  /LazyLock instance has previously been poisoned/,
  // JSPI. Chrome has it; Node's V8 build here does not, so any block that
  // suspends WebAssembly (`input()`, and anything built on it) cannot run.
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
  // pyarrow has to be on disk before the first `import polars`: polars caches
  // "is Arrow available?" at import time and nothing can change its mind
  // afterwards. See the long note in the worker where the old repair used to
  // live.
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

  // HTTP, the same way the worker sets it up (see SETUP_SCRIPT_B in
  // pyodide-worker.ts): install pyodide_http and let it reroute urllib and
  // requests through XMLHttpRequest.
  //
  // Node has no XMLHttpRequest, so this used to be a no-op that looked like a
  // success — `patch_all()` returns cleanly either way, and the first HTTP
  // call then fell through to a real socket with no TLS. `installSyncHttp`
  // supplies a genuinely blocking XHR so the patch has something to patch
  // onto, which is what brings the Seaborn course's `sns.load_dataset(...)`
  // blocks into the sweep.
  const uninstallSyncHttp = installSyncHttp();
  try {
    const micropip = py.pyimport("micropip");
    await micropip.install("pyodide_http");
    py.runPython("import pyodide_http; pyodide_http.patch_all()");
  } catch (err) {
    console.error(`${label}: could not set up pyodide_http (${err.message}).`);
    console.error("Blocks that fetch over HTTP will be reported as failures.");
  }

  // The blocks call fig.show() and plt.show(); neither has anywhere to draw
  // here, and a headless failure there is not a lesson bug.
  //
  // `display` is the other one. The worker installs it into builtins so a
  // lesson can render a DataFrame as a table (see pyodide-worker.ts), and
  // without the same shim here every block that uses it fails with NameError:
  // a runner gap reported as seven broken lessons.
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

  // Pyodide runs Python synchronously, so the only way to stop a block that
  // loops forever (or sits waiting on a package that will never arrive) is the
  // interrupt buffer: Python checks it between bytecodes and raises
  // KeyboardInterrupt when it sees a 2. Without this, one bad block hangs the
  // whole sweep and every result collected so far is lost.
  const interrupt = new Uint8Array(new SharedArrayBuffer(1));
  py.setInterruptBuffer(interrupt);

  // …and the thing that writes that 2 has to live on another thread.
  //
  // The obvious `setTimeout(() => { interrupt[0] = 2 }, …)` cannot work, and
  // silently so: `runPythonAsync` only yields to the event loop at `await`
  // points *in the Python*, so a block that just computes blocks the loop
  // outright. The timer never fires, the interrupt is never armed, and the
  // timeout that looks like it bounds the run bounds nothing. A parameter
  // sweep in the scientific-computing capstone sat there indefinitely, which
  // reads exactly like a hung sweep and is really a timeout that was never
  // able to run.
  //
  // A worker thread is not blocked by any of that. It shares the interrupt
  // buffer, waits out the budget on `ctl`, and writes the 2 itself. `ctl`
  // carries a generation number so a run that finishes early wakes the
  // watchdog and it skips that round instead of firing into the next block.
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

  // Fetched once. `py.globals.get(...)` mints a PyProxy on every call, and one
  // leaked per block was enough to wedge the interpreter about a thousand
  // blocks in — which looked exactly like a hang on whatever block happened to
  // be next, and sent two debugging attempts after innocent lesson content.
  const dictCtor = py.globals.get("dict");

  const micropipInstalled = new Set(["plotly"]);
  const implicitLoaded = new Set();
  const staged = new Set();

  /** The two package steps the browser does before every run, mirrored here. */
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
          (codeImportsModule(code, mod) ||
            (mod === "openpyxl" && /\.(?:to|read)_excel\(/.test(code))),
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
    // Non-entry files are importable siblings, so they have to exist on disk.
    //
    // `solutionSource` is set only by the challenge-card extractor, and is the
    // buffer the Solution button would leave in that file (its `solutionCode`
    // when it has one, its starter otherwise). Without it a card whose
    // exercise lives in a sibling module — which is every multi-file card in
    // python-basics — is graded with that module still blank. Code blocks
    // never set it and keep staging their starters, which is what Run does.
    //
    // `initCode` is joined only when there is some, matching
    // `effectiveSourceFor` in ChallengeCard.tsx (`init ? merge(init, buf) :
    // buf`) and the entry-code path in mdx-blocks.mjs. Prepending "\n"
    // unconditionally is invisible in a .py sibling and corrupts a data one:
    // it cost `sales.csv` its header row, so `csv.DictReader` came back with a
    // single empty field name and a correct solution raised
    // `KeyError: 'product'`.
    const siblings = [];
    for (const f of files) {
      if (f.filename === entry) continue;
      const body = f.solutionSource ?? f.starterCode;
      py.FS.writeFile(f.filename, f.initCode ? `${f.initCode}\n${body}` : body);
      siblings.push(f.filename);
    }

    // Drop these modules from the import cache before the run.
    //
    // One interpreter serves the whole sweep, but a reader gets a fresh
    // runtime per card, so module state that persists here persists nowhere
    // else. `utils.py` is the case that bites: several cards ship one, and
    // once any of them has been imported, `import utils` in a later card
    // returns the first card's module and its `greet` is missing. The failure
    // lands on the innocent card, only in a full sweep, and never for a
    // reader — the worst combination to debug, and the reason this is done by
    // filename rather than by clearing everything.
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
   * Run `code` in a fresh namespace.
   *
   * `capture` is off by default, and deliberately so. Redirecting Pyodide's
   * stdout into a JavaScript string means holding every byte a block prints:
   * a lesson that prints a large frame in a loop grows the buffer without
   * bound, and repeated `+=` on a multi-megabyte string is quadratic on top of
   * that. A sweep that only asks "does this raise?" has no use for the output,
   * so it lets Pyodide write through to the console as it always did.
   *
   * Callers that do need the text (the challenge harness prints its results
   * there) opt in and get a capped buffer.
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
      // Chunks in an array, joined once: linear rather than quadratic. The cap
      // is far above anything a lesson legitimately prints, and exists so a
      // runaway loop is reported as one bad card instead of taking the sweep
      // down with it.
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
      // Two timeouts, because there are two ways to hang. The interrupt buffer
      // above stops Python spinning in its own bytecode; it cannot touch a
      // pending JS promise, and `runPythonAsync` awaits package downloads for
      // any module the block imports. This race covers that second case.
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
      // Always, including on the failure path: a leaked namespace per broken
      // block is the same slow death as above.
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
