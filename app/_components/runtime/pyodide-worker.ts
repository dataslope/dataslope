/// <reference lib="webworker" />

// Pyodide runs inside a dedicated Web Worker so that:
//   1. The bundler (Turbopack in Next.js 16) never sees Pyodide's internal
//      `await import(e)` calls — those would otherwise fail with
//      "Cannot find module as expression is too dynamic". We sidestep
//      Turbopack entirely by loading `pyodide.js` from the CDN with
//      `importScripts`, which is a worker-only API and is not analysed by
//      the bundler.
//   2. Heavy Python execution (numpy, pandas, plot rendering, …) doesn't
//      block the main thread, so the UI stays responsive while user code
//      is running.
//
// The worker speaks a small request/response protocol with the main
// thread (see message types below).

import type { PyodideInterface } from "pyodide";

// Dedicated workers expose `self` as a `DedicatedWorkerGlobalScope`. We
// also rely on the global `loadPyodide` that `pyodide.js` adds when it's
// loaded via `importScripts`.
declare const self: DedicatedWorkerGlobalScope & {
  loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface>;
};

const PYODIDE_VERSION = "v0.29.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

// Load the Pyodide JS loader synchronously into the worker scope. This is
// the call that would explode if attempted on the main thread under
// Turbopack — `importScripts` is unprocessed by the bundler.
self.importScripts(PYODIDE_INDEX_URL + "pyodide.js");

// ─── Output cell shape (mirrors `OutputCell` minus the bookkeeping the
//     main thread fills in) ───────────────────────────────────────────────
type OutputCellType = "stdout" | "stderr" | "html" | "image" | "plot";
interface OutputCellMessage {
  type: OutputCellType;
  content: string;
  plot?: { data: unknown[]; layout?: Record<string, unknown> };
}

// ─── Protocol ──────────────────────────────────────────────────────────
type InMessage =
  | { kind: "init" }
  | { kind: "run"; id: number; code: string; theme?: "light" | "dark" }
  | { kind: "complete"; id: number; line: string; column: number }
  | {
      kind: "prepare-fs";
      id: number;
      /** Workspace-relative paths → file bytes. */
      files: Array<[string, Uint8Array]>;
    };

type OutMessage =
  | { kind: "loading"; message: string; fraction?: number }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "run-status"; id: number; message: string; preparing: boolean }
  | { kind: "output"; id: number; cell: OutputCellMessage }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string }
  | { kind: "prepare-fs-done"; id: number }
  | { kind: "prepare-fs-error"; id: number; message: string }
  | {
      kind: "complete-result";
      id: number;
      completions: string[];
      replaceLength: number;
    };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

// ─── Two-phase boot state ──────────────────────────────────────────────
// Phase A (initPyodide / `initPromise`): the interpreter plus the
// display/tee/reset plumbing — enough to run any stdlib-only snippet.
// `ready` is posted at the end of phase A, so plain-Python blocks run
// seconds before the data stack is in.
// Phase B (`ensurePackages`): the heavy package set (numpy, pandas,
// matplotlib, scipy, micropip + plotly + pyodide_http) and the
// matplotlib/urllib patches that depend on it. It starts in the
// background right after phase A; a run whose code needs it awaits it
// (with a run-status notice), everything else doesn't.
let pyodide: PyodideInterface | null = null;
let initPromise: Promise<void> | null = null;
// Python's stdlib top-level module names (sys.stdlib_module_names),
// snapshotted after phase A for the needs-heavy-packages gate.
let stdlibModuleNames: Set<string> | null = null;
let packagesReady = false;
let packagesPromise: Promise<void> | null = null;

// Some packages advertised in the Packages drawer ship as pure-Python
// wheels on PyPI but are NOT part of the Pyodide distribution, so
// `loadPackagesFromImports()` can't see them (it only knows the bundled
// lockfile). Map each importable module name to its PyPI requirement and
// micropip-install it the first time the user's code imports it. `plotly`
// is installed eagerly at init, so it doesn't need to be listed here.
const MICROPIP_PACKAGES: Record<string, string> = {
  openpyxl: "openpyxl",
  seaborn: "seaborn",
};
const micropipInstalled = new Set<string>();

/** True when `code` imports the top-level module `mod` (matches
 *  `import mod`, `import mod as x`, `import a, mod`, `from mod import …`,
 *  anchored to a line start so matches inside strings/comments are
 *  ignored). Mirrors the adapter's `hasImport`. */
function codeImportsModule(code: string, mod: string): boolean {
  const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `^\\s*(?:from\\s+${esc}(?:\\.[\\w.]+)?\\s+import\\b|import\\s+(?:[\\w.]+\\s*,\\s*)*${esc}(?:\\.[\\w.]+)?(?:\\s+as\\s+\\w+)?\\s*(?:,|$|#))`,
    "m",
  );
  return re.test(code);
}

/** Install any micropip-only drawer packages referenced by `code` that
 *  haven't been installed yet. Throws on install failure so the caller can
 *  surface it as an stderr cell. */
async function ensureMicropipPackages(code: string): Promise<void> {
  if (!pyodide) return;
  const needed = Object.entries(MICROPIP_PACKAGES)
    .filter(
      ([mod, req]) =>
        !micropipInstalled.has(req) && codeImportsModule(code, mod),
    )
    .map(([, req]) => req);
  if (needed.length === 0) return;
  const micropip = pyodide.pyimport("micropip");
  for (const req of needed) {
    await micropip.install(req);
    micropipInstalled.add(req);
  }
}

interface PyDisplayDataframe { type: "dataframe"; html: string }
interface PyDisplayHtml { type: "html"; html: string }
interface PyDisplayImage { type: "image"; data: string }
interface PyDisplayStdout { type: "stdout"; text: string }
interface PyDisplayStderr { type: "stderr"; text: string }
interface PyDisplayPlot { type: "plot"; json: string }
type PyDisplayOutput =
  | PyDisplayDataframe
  | PyDisplayHtml
  | PyDisplayImage
  | PyDisplayStdout
  | PyDisplayStderr
  | PyDisplayPlot;

function isPyDisplayOutputs(v: unknown): v is PyDisplayOutput[] {
  return Array.isArray(v);
}

async function initPyodide(): Promise<void> {
  post({ kind: "loading", message: "Loading Python runtime…", fraction: 0.06 });
  pyodide = await self.loadPyodide({ indexURL: PYODIDE_INDEX_URL });

  post({
    kind: "loading",
    message: "Preparing the Python environment…",
    fraction: 0.8,
  });

  // Set up display(), the stdout/stderr tee, and the per-run reset
  // helpers. Deliberately matplotlib-free: the plotting stack arrives
  // in boot phase B (see SETUP_SCRIPT_B), so this script must run on
  // the bare interpreter. find_imports is hoisted here for the
  // needs-heavy-packages gate in runCode().
  await pyodide.runPythonAsync(`
import sys, io, base64, json, ast as _ast, re as _re
from pyodide.code import find_imports as _pg_find_imports

_display_outputs = []

# Per-run cap on captured stdout/stderr text. Without it, a runaway program
# (e.g. \`while True: print(x)\`) grows _display_outputs without bound — the
# captured string balloons the worker's memory into the gigabytes while the
# loop pegs a CPU core. Once a run crosses the cap we keep the output already
# captured (trimmed to the limit), append a one-time notice, and raise to
# abort the run, which also stops the spinning loop. _pg_output_truncated
# then drops any further writes so memory stays bounded even if user code
# swallows the exception.
_PG_MAX_OUTPUT_CHARS = 2_000_000  # ~2 MB of text per run
_pg_output_chars = 0
_pg_output_truncated = False

class _PgOutputLimitError(Exception):
    """Raised when a run's captured output exceeds _PG_MAX_OUTPUT_CHARS."""

def _pg_reset_output():
    """Reset the per-run output counter. Called before each run (these names
    survive _pg_reset_user_globals via the protected-names snapshot, so they
    must be reset explicitly rather than recreated)."""
    global _pg_output_chars, _pg_output_truncated
    _pg_output_chars = 0
    _pg_output_truncated = False

def _pg_emit_text(kind, s):
    """Append stream text to the ordered output list, merging consecutive
    writes of the same stream into one segment (print() emits the text and
    its newline as separate writes). Enforces a per-run size cap so a
    runaway/infinite-output program can't grow memory without bound."""
    global _pg_output_chars, _pg_output_truncated
    if not s:
        return
    if _pg_output_truncated:
        # Cap already hit this run — drop further text so memory stays
        # bounded even if the abort below was swallowed by user code.
        return
    remaining = _PG_MAX_OUTPUT_CHARS - _pg_output_chars
    if len(s) >= remaining:
        s = s[:remaining] if remaining > 0 else ""
        _pg_output_truncated = True
    if s:
        _pg_output_chars += len(s)
        if _display_outputs and _display_outputs[-1].get("type") == kind:
            _display_outputs[-1]["text"] += s
        else:
            _display_outputs.append({"type": kind, "text": s})
    if _pg_output_truncated:
        _display_outputs.append({
            "type": "stderr",
            "text": "\\n[Output truncated: exceeded %d characters. Stopping the run — check for an unbounded loop.]\\n" % _PG_MAX_OUTPUT_CHARS,
        })
        raise _PgOutputLimitError(
            "Output exceeded the %d-character limit" % _PG_MAX_OUTPUT_CHARS
        )

# Tee installed over sys.stdout/sys.stderr while user code runs, so prints
# land in _display_outputs *in order* with display() tables, figures and
# charts — print → display(df) → print renders exactly in that sequence,
# like a notebook.
class _PgTee(io.TextIOBase):
    def __init__(self, kind):
        self._kind = kind
    def writable(self):
        return True
    def write(self, s):
        _pg_emit_text(self._kind, s)
        return len(s)

def _ensure_pd_notebook_options(pd):
    """Pin pandas' Jupyter-style display limits once per session.

    Pyodide is not an IPython session, so pandas falls back to its
    terminal defaults — display.max_columns resolves to 0 (no limit) and
    a wide frame renders every column. Pin the notebook default (20) so
    wide frames middle-truncate with "..." columns; a later explicit
    pd.set_option(...) by the user still wins because this runs once.
    """
    if getattr(pd, "_pg_display_defaults_applied", False):
        return
    pd._pg_display_defaults_applied = True
    if not pd.get_option("display.max_columns"):
        pd.set_option("display.max_columns", 20)

def _strip_html_styles(h):
    """Remove <style> blocks from HTML to prevent them from overriding playground CSS."""
    return _re.sub(r'<style[^>]*>.*?</style>', '', h, flags=_re.DOTALL)

def display(*objs):
    # The heavy libraries arrive in boot phase B, so this must work on
    # the bare interpreter: an object can only BE a DataFrame / Axes /
    # Figure if its module is already imported, which makes sys.modules
    # lookups exactly equivalent to the hard imports they replace —
    # without failing before phase B finishes.
    pd = sys.modules.get("pandas")
    _mpl_axes = sys.modules.get("matplotlib.axes")
    _mpl_figure = sys.modules.get("matplotlib.figure")
    if pd is not None:
        _ensure_pd_notebook_options(pd)
    for obj in objs:
        if obj is None:
            continue
        # Matplotlib Axes/Figure objects are captured by the auto-flush that
        # runs after user code executes—skip them here to avoid printing
        # an unhelpful repr like "<Axes: ylabel='Density'>".
        if _mpl_axes is not None and isinstance(obj, _mpl_axes.Axes):
            continue
        if _mpl_figure is not None and isinstance(obj, _mpl_figure.Figure):
            continue
        if pd is not None and isinstance(obj, pd.DataFrame):
            # Use _repr_html_() so pandas respects display.max_rows,
            # display.min_rows, display.max_columns and other options,
            # producing head+ellipsis+tail output just like a Jupyter notebook.
            h = obj._repr_html_()
            if h is None:
                # notebook_repr_html option is disabled — fall back with limits.
                h = obj.to_html(
                    classes="dataframe", border=0,
                    max_rows=pd.get_option("display.max_rows"),
                    max_cols=pd.get_option("display.max_columns"),
                    show_dimensions=True,
                )
            else:
                # Strip the <style> block pandas injects so it does not
                # override the playground's own table/th/td styles.
                h = _strip_html_styles(h)
            _display_outputs.append({"type": "dataframe", "html": h})
        elif hasattr(obj, "_repr_html_"):
            h = obj._repr_html_()
            if h:
                # Strip injected <style> blocks (e.g. from polars) so they
                # do not override the playground's own table styles.
                h = _strip_html_styles(h)
                _display_outputs.append({"type": "html", "html": h})
        else:
            _pg_emit_text("stdout", repr(obj) + "\\n")

import builtins
builtins.display = display

import asyncio as _asyncio

async def _execute_with_last_display(code):
    """Execute user code, auto-displaying the last expression like Jupyter."""
    _globals = globals()
    _flags = _ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
    tree = _ast.parse(code)
    if tree.body and isinstance(tree.body[-1], _ast.Expr):
        last_expr = tree.body.pop()
        if tree.body:
            _ast.fix_missing_locations(tree)
            result = eval(compile(tree, "<string>", "exec", flags=_flags), _globals)
            if _asyncio.iscoroutine(result):
                await result
        expr_tree = _ast.Expression(body=last_expr.value)
        _ast.fix_missing_locations(expr_tree)
        result = eval(compile(expr_tree, "<string>", "eval", flags=_flags), _globals)
        if _asyncio.iscoroutine(result):
            result = await result
        if result is not None:
            display(result)
    else:
        result = eval(compile(tree, "<string>", "exec", flags=_flags), _globals)
        if _asyncio.iscoroutine(result):
            await result

# ─── Autocomplete via stdlib rlcompleter ─────────────────────────────
import re as _re
import rlcompleter as _rlcompleter

# Identifier optionally followed by attribute accesses (e.g. "pd.DataFr").
_COMPLETION_FRAGMENT_RE = _re.compile(r"[A-Za-z_][A-Za-z0-9_]*(?:\\.[A-Za-z_][A-Za-z0-9_]*)*\\.?[A-Za-z_]?[A-Za-z0-9_]*$")

def _python_completions(line, column):
    """Return (completions, replace_length) for the prefix ending at (line, column).

    Uses rlcompleter.Completer against the live globals() so that
    user-defined names and imported modules are completable.
    """
    text = line[:column]
    m = _COMPLETION_FRAGMENT_RE.search(text)
    if not m:
        return [], 0
    fragment = m.group()
    completer = _rlcompleter.Completer(globals())
    seen = []
    seen_set = set()
    i = 0
    # rlcompleter.complete returns successive matches until it returns None.
    while True:
        try:
            match = completer.complete(fragment, i)
        except Exception:
            break
        if match is None:
            break
        # rlcompleter appends "(" for callables and "." for modules — strip
        # those so the inserted text is just the identifier; the user can
        # decide whether to add parentheses themselves.
        clean = match.rstrip("(").rstrip(".")
        if clean and clean not in seen_set:
            seen_set.add(clean)
            seen.append(clean)
        i += 1
    return seen, len(fragment)

# ─── Per-run global reset ─────────────────────────────────────────────
# Snapshot the names that exist after worker init — anything introduced
# by user code (variables, functions, classes, modules they import) is
# wiped before the next run so each execution starts from a fresh state.
# Built-ins, the helpers defined above, and the standard \`__name__\` /
# \`__doc__\` / \`__loader__\` module attributes are preserved.
def _pg_reset_user_globals():
    """Delete any global introduced by previously-run user code."""
    g = globals()
    for name in [n for n in list(g.keys()) if n not in _PG_PROTECTED_NAMES]:
        try:
            del g[name]
        except KeyError:
            pass

def _pg_evict_staged_modules():
    """Drop modules imported from the staged workspace root so a re-run
    re-reads edited helper files instead of the copy cached in
    sys.modules. The per-run global reset above leaves the import cache
    intact, so a multi-file challenge that edits a helper module between
    runs (e.g. fixing utils.py after a failed attempt) would otherwise
    keep executing the stale module. The root literal mirrors
    STAGED_ROOT in pyodide-worker.ts."""
    import sys, importlib
    _root = "/home/pyodide/"
    for _n in [n for n, m in list(sys.modules.items())
               if getattr(m, "__file__", None) and m.__file__.startswith(_root)]:
        sys.modules.pop(_n, None)
    importlib.invalidate_caches()

# Snapshot taken *after* the helpers above are defined so that
# _PG_PROTECTED_NAMES and the reset/evict helpers are all included.
_PG_PROTECTED_NAMES = set(globals().keys()) | {
    "__name__", "__doc__", "__package__", "__loader__", "__spec__",
    "__builtins__", "__file__", "__cached__",
    "_user_code_str", "_complete_line", "_complete_column",
    # Explicitly guard the set and the helpers themselves —
    # set(globals().keys()) above already captures them, but listing them
    # here makes the intent obvious and guards against future reordering.
    "_PG_PROTECTED_NAMES", "_pg_reset_user_globals",
    "_pg_evict_staged_modules",
    # Output-cap state/helpers: _pg_reset_output() reassigns the counters
    # each run, so they must persist across the per-run global reset.
    "_PG_MAX_OUTPUT_CHARS", "_pg_output_chars", "_pg_output_truncated",
    "_PgOutputLimitError", "_pg_reset_output", "_pg_emit_text",
}
`);

  // Snapshot the stdlib module names for the gate in runCode(): code
  // whose imports all resolve against the bare interpreter never waits
  // for the heavy package set.
  stdlibModuleNames = new Set(
    (
      pyodide.runPython(
        "','.join(sorted(sys.stdlib_module_names))",
      ) as string
    ).split(","),
  );

  post({ kind: "ready" });

  // Phase B starts immediately in the background so the package set is
  // usually in place before the first pandas-importing run. Failures
  // are deliberately swallowed here: ensurePackages() clears itself on
  // error, and the next run that needs packages retries (and surfaces
  // the real error through the run's error path).
  void ensurePackages().catch(() => {});
}

// ─── Boot phase B: the heavy package set ───────────────────────────────

// Globals (and patches) this script adds on top of SETUP_SCRIPT A. It
// runs as ONE synchronous Python exec — no awaits — so it can never
// interleave with a concurrently executing stdlib-only run.
const SETUP_SCRIPT_B = `
# Patch urllib/requests once so user code can make HTTP(S) calls (subject to
# CORS — cross-origin hosts still need the CORS proxy). Called a single time
# per worker; re-patching already-patched modules is unnecessary.
import pyodide_http
pyodide_http.patch_all()

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

_original_show = plt.show
def _patched_show(*args, **kwargs):
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", dpi=130, facecolor=plt.gcf().get_facecolor())
    buf.seek(0)
    img_b64 = base64.b64encode(buf.read()).decode()
    _display_outputs.append({"type": "image", "data": img_b64})
    plt.clf()
    plt.close("all")
plt.show = _patched_show

# These globals postdate setup A's protected-names snapshot — protect
# them explicitly or the per-run global reset would delete them.
_PG_PROTECTED_NAMES |= {
    "pyodide_http", "matplotlib", "plt", "_original_show", "_patched_show",
}
`;

async function loadHeavyPackages(): Promise<void> {
  if (!pyodide) throw new Error("Pyodide is not initialised");

  // Pyodide 0.29's package loader writes its progress messages
  // ("Loading numpy, …", "pandas already loaded from default channel",
  // "No new packages to load", …) through Python's `sys.stdout`. Once
  // `runCode()` installs a `setStdout({ batched })` capture, those
  // messages would otherwise be conflated with the user's real `print`
  // output. Provide explicit callbacks so the loader noise stays out of
  // user-visible output cells.
  const pkgCallbacks = {
    messageCallback: (m: string) => {
      console.log("[pyodide:loadPackage]", m);
    },
    errorCallback: (m: string) => {
      console.error("[pyodide:loadPackage]", m);
    },
  };

  await pyodide.loadPackage(["numpy", "pandas", "matplotlib", "scipy"], pkgCallbacks);
  await pyodide.loadPackage("micropip", pkgCallbacks);
  const micropip = pyodide.pyimport("micropip");
  await micropip.install("plotly");
  // pyodide_http reroutes urllib/requests through the browser's fetch/XHR so
  // that `requests.get(...)`, `pd.read_csv(url)`, etc. work in the worker.
  // It does NOT bypass CORS — cross-origin hosts still need the CORS proxy.
  await micropip.install("pyodide_http");

  await pyodide.runPythonAsync(SETUP_SCRIPT_B);
}

/** Memoised phase B with retry-on-failure: a failed attempt clears the
 *  memo so the next package-needing run re-kicks the download instead
 *  of caching a transient network error forever. */
function ensurePackages(): Promise<void> {
  if (!packagesPromise) {
    packagesPromise = loadHeavyPackages().then(
      () => {
        packagesReady = true;
      },
      (err) => {
        packagesPromise = null;
        throw err;
      },
    );
  }
  return packagesPromise;
}

// Phase-B-provided ambient names: the setup scripts define a global
// `plt`/`matplotlib`, and pyodide_http patches urllib/http/requests —
// code that *references* any of these needs phase B even when it never
// import-statements a heavy package. False positives (say, a variable
// named http) merely wait for the full boot, i.e. today's behaviour.
const PHASE_B_AMBIENT_RE = /\b(?:plt|matplotlib|urllib|requests|http)\b/;

/** True when `code` can't run correctly on the bare (phase A)
 *  interpreter. Conservative: any uncertainty (unparseable code,
 *  unknown imports) waits for the full boot — the failure mode is
 *  "behaves like before the two-phase split", never a broken run. */
function runNeedsHeavyPackages(code: string): boolean {
  const stdlib = stdlibModuleNames;
  if (!pyodide || !stdlib) return true;
  if (PHASE_B_AMBIENT_RE.test(code)) return true;
  try {
    pyodide.globals.set("_pg_gate_code", code);
    const proxy = pyodide.runPython("_pg_find_imports(_pg_gate_code)") as {
      toJs(): string[];
      destroy?: () => void;
    };
    const imports = proxy.toJs();
    proxy.destroy?.();
    return imports.some((mod) => !stdlib.has(mod));
  } catch {
    return true;
  }
}

async function runCode(
  id: number,
  code: string,
  theme: "light" | "dark" = "dark",
): Promise<void> {
  if (!pyodide) throw new Error("Pyodide is not initialised");

  // Two-phase boot gate: stdlib-only code runs on the bare interpreter
  // immediately; anything touching the data stack (or the ambient
  // names phase B provides) waits for the package set, with a status
  // notice so the wait doesn't masquerade as a slow user program.
  if (!packagesReady && runNeedsHeavyPackages(code)) {
    post({
      kind: "run-status",
      id,
      message: "Installing data packages — first run only…",
      preparing: true,
    });
    await ensurePackages();
    post({ kind: "run-status", id, message: "Running…", preparing: false });
  }

  let stdout = "";
  let stderr = "";
  pyodide.setStdout({ batched: (s: string) => { stdout += s + "\n"; } });
  pyodide.setStderr({ batched: (s: string) => { stderr += s + "\n"; } });

  // Auto-install any Pyodide packages referenced by the user's imports
  // (e.g. `import sklearn` triggers loading of scikit-learn). Suppress the
  // loader's progress messages so they don't pollute the captured user
  // stdout — see the comment on `pkgCallbacks` in `initPyodide()`.
  // `preparing: true` surfaces the boot notice during the download; the
  // main thread debounces it, so an all-cached run (nothing to fetch)
  // doesn't flash the notice.
  post({
    kind: "run-status",
    id,
    message: "Installing packages…",
    preparing: true,
  });
  try {
    await pyodide.loadPackagesFromImports(code, {
      messageCallback: (m: string) => {
        console.log("[pyodide:loadPackage]", m);
      },
      errorCallback: (m: string) => {
        console.error("[pyodide:loadPackage]", m);
      },
    });
    // Pure-Python drawer packages that aren't in the Pyodide lockfile
    // (e.g. openpyxl, seaborn) need an explicit micropip install.
    await ensureMicropipPackages(code);
  } catch (err) {
    stderr += `Failed to auto-load packages: ${
      err instanceof Error ? err.message : String(err)
    }\n`;
  } finally {
    // End the preparing window — the user's code is about to execute.
    post({ kind: "run-status", id, message: "Running…", preparing: false });
  }

  await pyodide.runPythonAsync("_pg_reset_user_globals(); _display_outputs.clear(); _pg_reset_output()");

  // Pass the user code as a Python string to avoid template-literal escaping
  // issues and to let _execute_with_last_display parse it with the ast module.
  pyodide.globals.set("_user_code_str", code);

  // Wrap user code with a Plotly intercept so `fig.show()` captures the
  // figure JSON instead of trying to open a browser tab.  The user code is
  // executed via _execute_with_last_display so that the last expression is
  // auto-displayed (Jupyter-style) when it evaluates to a non-None value.
  // Match the playground's light/dark UI by making the theme-appropriate
  // Plotly template the default. plotly.py resolves this at figure-creation
  // time, so figures the user builds without an explicit `template=` pick it
  // up, while an explicit template in user code still wins.
  const plotlyDefaultTemplate = theme === "light" ? "plotly" : "plotly_dark";

  const wrappedCode = `
# Plotly arrives with boot phase B (micropip) — a stdlib-only run on the
# bare phase A interpreter simply skips the show() patch.
try:
    import plotly as _plotly
    import plotly.io as _pio
except Exception:
    _plotly = None

if _plotly is not None:
    _pio.templates.default = "${plotlyDefaultTemplate}"

    _orig_plotly_show = _plotly.io.show

    # Plotly figures land in the same ordered output list as prints and
    # display() tables, so fig.show() keeps its place in the run's output.
    def _patched_plotly_show(fig, *args, **kwargs):
        _display_outputs.append({"type": "plot", "json": fig.to_json()})

    _plotly.io.show = _patched_plotly_show
    try:
        import plotly.graph_objects as _go
        _orig_go_show = _go.Figure.show
        def _patched_go_show(self, *args, **kwargs):
            _display_outputs.append({"type": "plot", "json": self.to_json()})
        _go.Figure.show = _patched_go_show
    except: pass

# Route the user code's stdout/stderr into the ordered output list (see
# _PgTee) so text interleaves chronologically with tables/figures/charts.
_pg_prev_stdout, _pg_prev_stderr = sys.stdout, sys.stderr
sys.stdout, sys.stderr = _PgTee("stdout"), _PgTee("stderr")
try:
    await _execute_with_last_display(_user_code_str)
finally:
    sys.stdout, sys.stderr = _pg_prev_stdout, _pg_prev_stderr
    if _plotly is not None:
        _plotly.io.show = _orig_plotly_show
        try: _go.Figure.show = _orig_go_show
        except: pass

# Auto-flush any matplotlib figures that the user did not explicitly show.
# This handles patterns like df.x.plot.density() which create a figure
# and return an Axes object without ever calling plt.show(). Before boot
# phase B (stdlib-only runs) pyplot isn't importable — guard via
# sys.modules, which is also exactly "no figures can exist yet".
_plt = sys.modules.get("matplotlib.pyplot")
if _plt is not None:
    for _fig_num in list(_plt.get_fignums()):
        _fig = _plt.figure(_fig_num)
        _buf = io.BytesIO()
        _fig.savefig(_buf, format="png", bbox_inches="tight", dpi=130, facecolor=_fig.get_facecolor())
        _display_outputs.append({"type": "image", "data": base64.b64encode(_buf.getvalue()).decode()})
    _plt.close("all")
`;

  // Post the ordered output stream. Runs in a finally so that output
  // produced *before* an exception (prints, tables, figures) still
  // renders — the traceback then follows it, like a notebook.
  const flushOutputs = () => {
    if (!pyodide) return;
    let displayOutputsRaw: unknown;
    try {
      const displayProxy = pyodide.globals.get("_display_outputs");
      displayOutputsRaw = displayProxy.toJs({
        dict_converter: Object.fromEntries,
      });
      displayProxy.destroy();
    } catch {
      return;
    }

    // Anything the JS-level capture saw (output emitted outside the
    // per-run tee window) is posted first — in practice this is the
    // pre-run package-loader failure note added above.
    if (stdout.trim()) post({ kind: "output", id, cell: { type: "stdout", content: stdout.trim() } });
    if (stderr.trim()) post({ kind: "output", id, cell: { type: "stderr", content: stderr.trim() } });

    if (!isPyDisplayOutputs(displayOutputsRaw)) return;
    for (const out of displayOutputsRaw) {
      if (out.type === "dataframe" || out.type === "html") {
        post({ kind: "output", id, cell: { type: "html", content: out.html } });
      } else if (out.type === "image") {
        post({ kind: "output", id, cell: { type: "image", content: out.data } });
      } else if (out.type === "stdout" || out.type === "stderr") {
        const text = out.text.trim();
        if (text) post({ kind: "output", id, cell: { type: out.type, content: text } });
      } else if (out.type === "plot") {
        try {
          const fig = JSON.parse(out.json) as {
            data: unknown[];
            layout?: Record<string, unknown>;
          };
          post({ kind: "output", id, cell: { type: "plot", content: out.json, plot: fig } });
        } catch {
          /* malformed figure JSON — skip the cell */
        }
      }
    }
  };

  try {
    await pyodide.runPythonAsync(wrappedCode);
  } finally {
    flushOutputs();
  }
}

async function completeCode(
  id: number,
  line: string,
  column: number,
): Promise<void> {
  if (!pyodide) throw new Error("Pyodide is not initialised");

  // Make the request available to the Python helper without worrying
  // about quoting or escaping the user's text.
  pyodide.globals.set("_complete_line", line);
  pyodide.globals.set("_complete_column", column);

  const resultProxy = await pyodide.runPythonAsync(
    "_python_completions(_complete_line, _complete_column)",
  );
  const result = resultProxy.toJs();
  if (typeof resultProxy.destroy === "function") {
    resultProxy.destroy();
  }

  let completions: string[] = [];
  let replaceLength = 0;
  if (Array.isArray(result) && result.length === 2) {
    const [list, len] = result as [unknown, unknown];
    if (Array.isArray(list)) {
      completions = list.filter((s): s is string => typeof s === "string");
    }
    if (typeof len === "number") {
      replaceLength = len;
    }
  }

  post({ kind: "complete-result", id, completions, replaceLength });
}

// Pyodide is not reentrant — serialise all run/complete requests behind a
// single promise chain so a completion request that arrives while a run is
// in progress can't interleave Python execution.
let workQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = workQueue.then(task, task);
  workQueue = next.catch(() => {});
  return next;
}

// ─── Multi-file VFS staging ────────────────────────────────────────────
// Files supplied to `prepareFs` are written to Pyodide's MEMFS at
// `/home/pyodide/` so user code can `import other_module`, open data
// files with relative paths, etc. We track the set of paths from the
// previous run so renames/deletes in the UI also delete the stale files
// from the VFS (otherwise an old `utils.py` could still be importable
// after it's been removed from the editor).
const stagedPaths = new Set<string>();
const STAGED_ROOT = "/home/pyodide";

function joinStagedPath(relPath: string): string {
  // Workspace paths are always relative; defensively strip any leading
  // slashes so the join doesn't escape the staged root.
  const trimmed = relPath.replace(/^\/+/, "");
  return `${STAGED_ROOT}/${trimmed}`;
}

async function prepareFs(files: Array<[string, Uint8Array]>): Promise<void> {
  if (!pyodide) return;
  const FS = (pyodide as unknown as { FS: PyodideFS }).FS;

  const nextPaths = new Set<string>();
  for (const [relPath, bytes] of files) {
    const abs = joinStagedPath(relPath);
    nextPaths.add(abs);
    // Ensure parent directories exist (mkdir -p semantics).
    ensureDirs(FS, abs);
    try {
      FS.writeFile(abs, bytes);
    } catch (err) {
      // Surface filesystem-level errors with the offending path so the
      // user can debug invalid filenames.
      throw new Error(
        `Failed to write ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Remove paths staged on previous runs that aren't part of the new
  // snapshot — keeps deletes/renames in sync.
  for (const prev of stagedPaths) {
    if (!nextPaths.has(prev)) {
      try {
        FS.unlink(prev);
      } catch {
        /* file may already be gone — ignore */
      }
    }
  }
  stagedPaths.clear();
  for (const p of nextPaths) stagedPaths.add(p);

  // The files just changed on disk, but Pyodide may still hold a previous
  // import of one of them in `sys.modules` (the per-run global reset does
  // not touch the import cache). Evict staged-origin modules and invalidate
  // the finder caches so the next run imports the freshly-written source
  // instead of a stale module — see _pg_evict_staged_modules in initPyodide.
  try {
    await pyodide.runPythonAsync("_pg_evict_staged_modules()");
  } catch {
    /* best-effort — a stale import cache shouldn't abort staging */
  }
}

interface PyodideFS {
  writeFile(path: string, data: Uint8Array | string): void;
  unlink(path: string): void;
  mkdir(path: string): void;
  analyzePath(path: string): { exists: boolean };
}

function ensureDirs(FS: PyodideFS, absFilePath: string): void {
  const idx = absFilePath.lastIndexOf("/");
  if (idx <= 0) return;
  const parent = absFilePath.slice(0, idx);
  const parts = parent.split("/").filter(Boolean);
  let cur = "";
  for (const part of parts) {
    cur += `/${part}`;
    if (!FS.analyzePath(cur).exists) {
      try {
        FS.mkdir(cur);
      } catch {
        /* directory may have been created concurrently — ignore */
      }
    }
  }
}

self.addEventListener("message", (ev: MessageEvent<InMessage>) => {
  const msg = ev.data;
  if (msg.kind === "init") {
    if (!initPromise) {
      initPromise = initPyodide().catch((err) => {
        post({
          kind: "init-error",
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      });
    }
    return;
  }

  if (msg.kind === "run") {
    const { id, code, theme } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await runCode(id, code, theme);
        post({ kind: "done", id });
      } catch (err) {
        post({
          kind: "error",
          id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
    return;
  }

  if (msg.kind === "complete") {
    const { id, line, column } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await completeCode(id, line, column);
      } catch {
        // Completions are best-effort — return an empty list rather than
        // surfacing the error to the user.
        post({ kind: "complete-result", id, completions: [], replaceLength: 0 });
      }
    });
    return;
  }

  if (msg.kind === "prepare-fs") {
    const { id, files } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await prepareFs(files);
        post({ kind: "prepare-fs-done", id });
      } catch (err) {
        post({
          kind: "prepare-fs-error",
          id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    });
    return;
  }
});
