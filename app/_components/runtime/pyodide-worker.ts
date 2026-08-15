/// <reference lib="webworker" />

// Pyodide runs in a dedicated Web Worker: the CDN dynamic import keeps the
// bundler away from Pyodide's internal dynamic imports, and heavy Python
// execution stays off the main thread. Pyodide 314 has no classic-worker
// entry point, so python.tsx must spawn this worker with `{ type: "module" }`.
// The worker speaks the request/response protocol defined below.

import type { PyodideInterface } from "pyodide";
import { POLARS_IMPORT_PATTERN, POLARS_WASM_SHIM } from "./polarsWasm";
import { toOutputCells } from "./pythonDisplayOutputs";

declare const self: DedicatedWorkerGlobalScope;

const PYODIDE_VERSION = "v314.0.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

/** Load Pyodide's ES-module entry point from the CDN, outside the
 *  bundler's sight. Called once from initPyodide. */
function loadPyodideModule(): Promise<{
  loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface>;
}> {
  return import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */
    `${PYODIDE_INDEX_URL}pyodide.mjs`
  ) as Promise<{
    loadPyodide: (opts: { indexURL: string }) => Promise<PyodideInterface>;
  }>;
}

// ─── Output cell shape (mirrors `OutputCell` minus the bookkeeping the
//     main thread fills in) ───────────────────────────────────────────────
type OutputCellType = "stdout" | "stderr" | "html" | "image" | "plot";
interface OutputCellMessage {
  type: OutputCellType;
  content: string;
  plot?: { data: unknown[]; layout?: Record<string, unknown> };
}

// ─── Protocol ──────────────────────────────────────────────────────────

/** Rich completion item, mirrors `CompletionItemDetail` in ../types. */
interface CompletionItemMessage {
  label: string;
  type?: string;
  detail?: string;
  info?: string;
  apply?: string;
  boost?: number;
}

type InMessage =
  | { kind: "init" }
  | { kind: "run"; id: number; code: string; theme?: "light" | "dark" }
  | {
      kind: "complete";
      id: number;
      /** Full document text (jedi analyses the whole buffer). */
      doc: string;
      /** 1-based line of the cursor within `doc`. */
      lineNumber: number;
      /** Text of the cursor's line (rlcompleter fallback path). */
      line: string;
      /** 0-based column of the cursor within `line`. */
      column: number;
    }
  | {
      kind: "prepare-fs";
      id: number;
      /** Workspace-relative paths → file bytes. */
      files: Array<[string, Uint8Array]>;
    }
  | {
      kind: "warm-packages";
      /** Authored code that may run soon. Phase B is kicked only when one
       *  of these needs it; see `warmHintNeedsHeavyPackages`. */
      sources: string[];
      /** Skip the needs-analysis and warm the full set (playground). */
      force?: boolean;
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
      completions: Array<string | CompletionItemMessage>;
      replaceLength: number;
    };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

// ─── Two-phase boot state ──────────────────────────────────────────────
// Phase A (initPyodide): interpreter + display/tee/reset plumbing; `ready`
// posts at its end so stdlib-only blocks run early. Phase B
// (`ensurePackages`): the heavy package set (numpy/pandas/matplotlib/scipy/
// plotly/pyodide_http) plus dependent patches; only package-needing runs
// await it.
let pyodide: PyodideInterface | null = null;
let initPromise: Promise<void> | null = null;
// sys.stdlib_module_names, snapshotted after phase A for the packages gate.
let stdlibModuleNames: Set<string> | null = null;
let packagesReady = false;
let packagesPromise: Promise<void> | null = null;

// Drawer packages that aren't in the Pyodide distribution, so
// `loadPackagesFromImports()` can't see them; micropip-installed on first
// import. plotly is installed eagerly at init, so it isn't listed.
const MICROPIP_PACKAGES: Record<string, string> = {
  openpyxl: "openpyxl",
  seaborn: "seaborn",
};
const micropipInstalled = new Set<string>();

/**
 * Packages a block needs but never imports by name (statsmodels behind a
 * plotly trendline, pyarrow behind .to_arrow(), tzdata behind a named tz) —
 * `loadPackagesFromImports` only sees import statements. Each entry maps a
 * source pattern to the package it implies; a false positive costs one
 * download, so patterns are specific rather than clever.
 */
const IMPLICIT_PACKAGES: { pattern: RegExp; pkg: string }[] = [
  // plotly's trendlines are fitted by statsmodels.
  { pattern: /\btrendline\s*=/, pkg: "statsmodels" },
  // Arrow interop, and the parquet engine pandas and polars both prefer.
  { pattern: /\bpyarrow\b|\.(?:to|from)_(?:arrow|pandas)\(/, pkg: "pyarrow" },
  { pattern: /\.(?:to|read|scan|sink)_parquet\(/, pkg: "pyarrow" },
  // polars caches pyarrow availability at import time for the life of the
  // interpreter, so pyarrow must be on disk before the first `import polars`
  // — hence triggering on the import, not on the Arrow call.
  {
    pattern:
      /^\s*(?:from\s+polars(?:\.[\w.]+)?\s+import\b|import\s+(?:[\w.]+\s*,\s*)*polars(?:\.[\w.]+)?(?:\s+as\s+\w+)?\s*(?:,|$|#))/m,
    pkg: "pyarrow",
  },
  // zoneinfo's database is a separate package on Pyodide.
  {
    pattern: /\btz_localize\(|\btz_convert\(|\bZoneInfo\(|\btz\s*=\s*["']/,
    pkg: "tzdata",
  },
];

/** Implied packages already pulled in this session, so each is fetched once. */
const implicitLoaded = new Set<string>();

/** Whether the polars mmap shim has been installed in this worker. The shim
 *  is idempotent; this just saves re-running it on every polars block. */
let polarsShimmed = false;

/* Deliberately NO evict-and-reimport repair for polars here: its compiled
 * extension can't be re-initialised in wasm, so a re-import yields broken
 * dtype comparisons. Loading pyarrow before the first `import polars`
 * (the IMPLICIT_PACKAGES rule above) avoids the situation entirely. */

/** Distribution packages implied by `code` that have not been asked for yet. */
function implicitPackagesFor(code: string): string[] {
  const wanted = new Set<string>();
  for (const { pattern, pkg } of IMPLICIT_PACKAGES) {
    if (pattern.test(code) && !implicitLoaded.has(pkg)) wanted.add(pkg);
  }
  return [...wanted];
}

/** True when `code` imports top-level module `mod` (line-anchored so matches
 *  inside strings/comments are ignored). Mirrors the adapter's `hasImport`. */
function codeImportsModule(code: string, mod: string): boolean {
  const esc = mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `^\\s*(?:from\\s+${esc}(?:\\.[\\w.]+)?\\s+import\\b|import\\s+(?:[\\w.]+\\s*,\\s*)*${esc}(?:\\.[\\w.]+)?(?:\\s+as\\s+\\w+)?\\s*(?:,|$|#))`,
    "m",
  );
  return re.test(code);
}

/** Install micropip-only drawer packages referenced by `code`. Throws on
 *  install failure so the caller can surface it as an stderr cell. */
async function ensureMicropipPackages(code: string): Promise<void> {
  if (!pyodide) return;
  const needed = Object.entries(MICROPIP_PACKAGES)
    .filter(
      ([mod, req]) =>
        !micropipInstalled.has(req) &&
        // openpyxl is rarely imported by name; `df.to_excel(...)` counts too.
        (codeImportsModule(code, mod) ||
          (mod === "openpyxl" && /\.(?:to|read)_excel\(/.test(code))),
    )
    .map(([, req]) => req);
  if (needed.length === 0) return;
  const micropip = pyodide.pyimport("micropip");
  for (const req of needed) {
    await micropip.install(req);
    micropipInstalled.add(req);
  }
}

// Wire shape → OutputCell conversion lives in pythonDisplayOutputs.ts,
// shared with scripts/build-block-outputs.mjs for identical rendering.

async function initPyodide(): Promise<void> {
  post({ kind: "loading", message: "Loading Python runtime…", fraction: 0.06 });
  const { loadPyodide } = await loadPyodideModule();
  pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });

  post({
    kind: "loading",
    message: "Preparing the Python environment…",
    fraction: 0.8,
  });

  // display(), stdout/stderr tee, per-run reset helpers. Deliberately
  // matplotlib-free: this script must run on the bare (phase A) interpreter.
  await pyodide.runPythonAsync(`
import sys, io, base64, json, ast as _ast, re as _re
from pyodide.code import find_imports as _pg_find_imports

_display_outputs = []

def _pg_emit_text(kind, s):
    """Append stream text to the ordered output list, merging consecutive
    writes of the same stream into one segment (print() emits the text and
    its newline as separate writes)."""
    if not s:
        return
    if _display_outputs and _display_outputs[-1].get("type") == kind:
        _display_outputs[-1]["text"] += s
    else:
        _display_outputs.append({"type": kind, "text": s})

# Tee installed over sys.stdout/sys.stderr while user code runs, so prints
# land in _display_outputs *in order* with display() tables, figures and
# charts, print → display(df) → print renders exactly in that sequence,
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
    terminal defaults, display.max_columns resolves to 0 (no limit) and
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
    # lookups exactly equivalent to the hard imports they replace,
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
        # runs after user code executes-skip them here to avoid printing
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
                # notebook_repr_html option is disabled, fall back with limits.
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
        # rlcompleter appends "(" for callables and "." for modules, strip
        # those so the inserted text is just the identifier; the user can
        # decide whether to add parentheses themselves.
        clean = match.rstrip("(").rstrip(".")
        if clean and clean not in seen_set:
            seen_set.add(clean)
            seen.append(clean)
        i += 1
    return seen, len(fragment)

# ─── Per-run global reset ─────────────────────────────────────────────
# Snapshot the names that exist after worker init, anything introduced
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
    "_complete_doc", "_complete_line_no",
    # Explicitly guard the set and the helpers themselves,
    # set(globals().keys()) above already captures them, but listing them
    # here makes the intent obvious and guards against future reordering.
    "_PG_PROTECTED_NAMES", "_pg_reset_user_globals",
    "_pg_evict_staged_modules",
}
`);

  // Snapshot stdlib module names for the packages gate in runCode().
  stdlibModuleNames = new Set(
    (
      pyodide.runPython(
        "','.join(sorted(sys.stdlib_module_names))",
      ) as string
    ).split(","),
  );

  post({ kind: "ready" });

  // Phase B is deliberately NOT kicked here: it starts on a warm-packages
  // hint or lazily from a package-needing run. Booting it unconditionally
  // made stdlib-only surfaces download hundreds of MB they never used.
}

// ─── Boot phase B: the heavy package set ───────────────────────────────

// Runs as ONE synchronous Python exec (no awaits) so it can never
// interleave with a concurrently executing stdlib-only run.
const SETUP_SCRIPT_B = `
# Patch urllib/requests once so user code can make HTTP(S) calls (subject to
# CORS, cross-origin hosts still need the CORS proxy). Called a single time
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

# These globals postdate setup A's protected-names snapshot, protect
# them explicitly or the per-run global reset would delete them.
_PG_PROTECTED_NAMES |= {
    "pyodide_http", "matplotlib", "plt", "_original_show", "_patched_show",
}
`;

async function loadHeavyPackages(): Promise<void> {
  if (!pyodide) throw new Error("Pyodide is not initialised");

  // The package loader writes progress through sys.stdout, which runCode()
  // captures; explicit callbacks keep loader noise out of user output cells.
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
  // pyodide_http reroutes urllib/requests through fetch/XHR. It does NOT
  // bypass CORS; cross-origin hosts still need the CORS proxy.
  await micropip.install("pyodide_http");

  await pyodide.runPythonAsync(SETUP_SCRIPT_B);
}

/** Memoised phase B with retry-on-failure: a failed attempt clears the memo
 *  so a transient network error isn't cached forever. */
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

// ─── jedi-based autocomplete ───────────────────────────────────────────
// Loaded lazily on the first completion request. `jedi.Interpreter` sees
// the editor buffer AND the live worker globals (real DataFrame columns).
// On load failure, completion falls back to rlcompleter for the session.

const JEDI_SETUP = `
import json as _json
import jedi as _jedi

# jedi -> CodeMirror completion kinds (drives the popup icons).
_JEDI_TYPE_MAP = {
    "module": "namespace",
    "class": "class",
    "instance": "variable",
    "function": "function",
    "param": "variable",
    "path": "text",
    "keyword": "keyword",
    "property": "property",
    "statement": "variable",
    "namespace": "namespace",
}

def _python_completions_jedi(doc, line_no, column, line):
    """Complete \`doc\` at 1-based \`line_no\` / 0-based \`column\`.

    Returns a JSON string {"items": [...], "replaceLength": n} or null
    when jedi itself failed (the caller then falls back to rlcompleter).
    """
    try:
        interp = _jedi.Interpreter(doc, [globals()])
        comps = interp.complete(line=int(line_no), column=int(column))
    except Exception:
        return _json.dumps(None)
    if not comps:
        return _json.dumps({"items": [], "replaceLength": 0})
    prefix_len = comps[0].get_completion_prefix_length()
    typed = line[max(0, int(column) - prefix_len):int(column)]
    # Hide private/dunder names unless the user is typing an underscore.
    hide_private = not typed.startswith("_")
    items = []
    for c in comps:
        name = c.name
        if hide_private and name.startswith("_"):
            continue
        items.append({
            "label": name,
            "type": _JEDI_TYPE_MAP.get(c.type, "variable"),
        })
        # Cap the payload, the popup shows a handful; CodeMirror
        # re-filters as the user types and re-queries past validFor.
        if len(items) >= 200:
            break
    return _json.dumps({"items": items, "replaceLength": prefix_len})

# These globals postdate setup A's protected-names snapshot, protect
# them or the per-run global reset would delete them.
_PG_PROTECTED_NAMES |= {
    "_json", "_jedi", "_JEDI_TYPE_MAP", "_python_completions_jedi",
}
`;

let jediPromise: Promise<boolean> | null = null;

/** Load + set up jedi once; resolves false (and stops retrying) on fetch
 *  failure so completions degrade to rlcompleter, not per-keystroke retries. */
function ensureJedi(): Promise<boolean> {
  if (!jediPromise) {
    jediPromise = (async () => {
      if (!pyodide) return false;
      try {
        await pyodide.loadPackage("jedi", {
          messageCallback: (m: string) => {
            console.log("[pyodide:loadPackage]", m);
          },
          errorCallback: (m: string) => {
            console.error("[pyodide:loadPackage]", m);
          },
        });
        await pyodide.runPythonAsync(JEDI_SETUP);
        return true;
      } catch (err) {
        console.error("[pyodide] jedi unavailable, using rlcompleter", err);
        return false;
      }
    })();
  }
  return jediPromise;
}

// Phase-B ambient names (global plt/matplotlib, patched urllib/http/
// requests): referencing any of these needs phase B even without a heavy
// import. False positives merely wait for the full boot.
const PHASE_B_AMBIENT_RE = /\b(?:plt|matplotlib|urllib|requests|http)\b/;

/** Whether `code` imports beyond the stdlib; `null` when unknowable.
 *  The run gate treats null as "needs packages" (never break a run); the
 *  warm-hint gate treats it as "no evidence" (never download on a guess). */
function importsBeyondStdlib(code: string): boolean | null {
  const stdlib = stdlibModuleNames;
  if (!pyodide || !stdlib) return null;
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
    return null;
  }
}

/** True when `code` can't run on the bare (phase A) interpreter.
 *  Conservative: any uncertainty waits for the full boot, never a broken run. */
function runNeedsHeavyPackages(code: string): boolean {
  if (PHASE_B_AMBIENT_RE.test(code)) return true;
  return importsBeyondStdlib(code) ?? true;
}

/** Warm-hint variant of the gate, per source so one unparseable starter
 *  can't poison the rest. Optimistic on uncertainty: an unparseable source
 *  is skipped rather than assumed heavy — pessimism would re-create the
 *  download-for-everyone this hint exists to avoid. */
function warmHintNeedsHeavyPackages(sources: string[]): boolean {
  return sources.some(
    (src) => PHASE_B_AMBIENT_RE.test(src) || importsBeyondStdlib(src) === true,
  );
}

async function runCode(
  id: number,
  code: string,
  theme: "light" | "dark" = "dark",
): Promise<void> {
  if (!pyodide) throw new Error("Pyodide is not initialised");

  // Two-phase boot gate: package-needing code waits for phase B, with a
  // status notice so the wait doesn't masquerade as a slow user program.
  if (!packagesReady && runNeedsHeavyPackages(code)) {
    post({
      kind: "run-status",
      id,
      message: "Installing data packages, first run only…",
      preparing: true,
    });
    await ensurePackages();
    post({ kind: "run-status", id, message: "Running…", preparing: false });
  }

  let stdout = "";
  let stderr = "";
  pyodide.setStdout({ batched: (s: string) => { stdout += s + "\n"; } });
  pyodide.setStderr({ batched: (s: string) => { stderr += s + "\n"; } });

  // Auto-install packages referenced by the user's imports, keeping loader
  // noise out of captured stdout. The main thread debounces the notice so
  // an all-cached run doesn't flash it.
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
    // Dependencies the block never imports by name (see IMPLICIT_PACKAGES).
    const implicit = implicitPackagesFor(code);
    if (implicit.length > 0) {
      await pyodide.loadPackage(implicit, {
        messageCallback: (m: string) => {
          console.log("[pyodide:loadPackage]", m);
        },
        errorCallback: (m: string) => {
          console.error("[pyodide:loadPackage]", m);
        },
      });
      for (const pkg of implicit) implicitLoaded.add(pkg);
    }
    // Drawer packages outside the Pyodide lockfile need micropip.
    await ensureMicropipPackages(code);
    // polars can't mmap >1 MB files without threads, so its eager readers
    // are shimmed to take bytes. Must run before the block's own
    // `import polars`, hence the source pattern rather than an import hook.
    if (!polarsShimmed && POLARS_IMPORT_PATTERN.test(code)) {
      await pyodide.runPythonAsync(POLARS_WASM_SHIM);
      polarsShimmed = true;
    }
  } catch (err) {
    stderr += `Failed to auto-load packages: ${
      err instanceof Error ? err.message : String(err)
    }\n`;
  } finally {
    post({ kind: "run-status", id, message: "Running…", preparing: false });
  }

  await pyodide.runPythonAsync("_pg_reset_user_globals(); _display_outputs.clear()");

  // Pass the code as a Python string to avoid template-literal escaping.
  pyodide.globals.set("_user_code_str", code);

  // Wrap user code with a Plotly show() intercept and Jupyter-style
  // last-expression auto-display. The theme-appropriate Plotly template
  // becomes the default; an explicit `template=` in user code still wins.
  const plotlyDefaultTemplate = theme === "light" ? "plotly" : "plotly_dark";

  const wrappedCode = `
# Plotly arrives with boot phase B (micropip), a stdlib-only run on the
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
# phase B (stdlib-only runs) pyplot isn't importable, guard via
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

  // Post the ordered output stream. Runs in a finally so pre-exception
  // output still renders, followed by the traceback, like a notebook.
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

    // JS-level captures (output outside the per-run tee window, e.g. the
    // package-loader failure note) post first.
    if (stdout.trim()) post({ kind: "output", id, cell: { type: "stdout", content: stdout.trim() } });
    if (stderr.trim()) post({ kind: "output", id, cell: { type: "stderr", content: stderr.trim() } });

    for (const cell of toOutputCells(displayOutputsRaw)) {
      post({ kind: "output", id, cell });
    }
  };

  try {
    await pyodide.runPythonAsync(wrappedCode);
  } finally {
    flushOutputs();
  }
}

/** rlcompleter fallback, used when the jedi wheel can't be loaded. */
async function completeWithRlcompleter(
  id: number,
  line: string,
  column: number,
): Promise<void> {
  if (!pyodide) throw new Error("Pyodide is not initialised");

  // Globals carry the request so the user's text never needs escaping.
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

async function completeCode(
  id: number,
  doc: string,
  lineNumber: number,
  line: string,
  column: number,
): Promise<void> {
  if (!pyodide) throw new Error("Pyodide is not initialised");

  if (!(await ensureJedi())) {
    await completeWithRlcompleter(id, line, column);
    return;
  }

  // Globals carry the request so the user's text never needs escaping.
  pyodide.globals.set("_complete_doc", doc);
  pyodide.globals.set("_complete_line_no", lineNumber);
  pyodide.globals.set("_complete_line", line);
  pyodide.globals.set("_complete_column", column);

  const json = (await pyodide.runPythonAsync(
    "_python_completions_jedi(_complete_doc, _complete_line_no, _complete_column, _complete_line)",
  )) as string;

  let parsed: {
    items?: Array<{ label?: unknown; type?: unknown }>;
    replaceLength?: unknown;
  } | null = null;
  try {
    parsed = JSON.parse(json);
  } catch {
    parsed = null;
  }

  // `null` signals a jedi-level failure; fall back rather than answer empty.
  if (!parsed) {
    await completeWithRlcompleter(id, line, column);
    return;
  }

  const completions: CompletionItemMessage[] = [];
  for (const item of parsed.items ?? []) {
    if (typeof item?.label !== "string") continue;
    completions.push({
      label: item.label,
      type: typeof item.type === "string" ? item.type : undefined,
    });
  }
  const replaceLength =
    typeof parsed.replaceLength === "number" ? parsed.replaceLength : 0;

  post({ kind: "complete-result", id, completions, replaceLength });
}

// Pyodide is not reentrant: serialise all run/complete requests behind one
// promise chain so requests can't interleave Python execution.
let workQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = workQueue.then(task, task);
  workQueue = next.catch(() => {});
  return next;
}

// ─── Multi-file VFS staging ────────────────────────────────────────────
// prepareFs files land in Pyodide's MEMFS at /home/pyodide/. The previous
// run's paths are tracked so UI renames/deletes also remove stale VFS files
// (otherwise a removed utils.py would still be importable).
const stagedPaths = new Set<string>();
const STAGED_ROOT = "/home/pyodide";

function joinStagedPath(relPath: string): string {
  // Strip leading slashes so the join can't escape the staged root.
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
    ensureDirs(FS, abs);
    try {
      FS.writeFile(abs, bytes);
    } catch (err) {
      // Include the offending path so invalid filenames are debuggable.
      throw new Error(
        `Failed to write ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Remove previously staged paths absent from the new snapshot.
  for (const prev of stagedPaths) {
    if (!nextPaths.has(prev)) {
      try {
        FS.unlink(prev);
      } catch {
        /* file may already be gone, ignore */
      }
    }
  }
  stagedPaths.clear();
  for (const p of nextPaths) stagedPaths.add(p);

  // sys.modules may still cache imports of the just-rewritten files (the
  // per-run reset doesn't touch the import cache); evict staged-origin
  // modules so the next run sees the fresh source.
  try {
    await pyodide.runPythonAsync("_pg_evict_staged_modules()");
  } catch {
    /* best-effort, a stale import cache shouldn't abort staging */
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
        /* directory may have been created concurrently, ignore */
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
    const { id, doc, lineNumber, line, column } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await completeCode(id, doc, lineNumber, line, column);
      } catch {
        // Completions are best-effort; return an empty list.
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

  if (msg.kind === "warm-packages") {
    const { sources, force } = msg;
    // The gate is queued (it runs Python), but the install fires in the
    // background so the download never holds the run queue.
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        if (!pyodide) return;
        if (force || warmHintNeedsHeavyPackages(sources)) {
          void ensurePackages()
            .then(() => ensureMicropipPackages(sources.join("\n")))
            .catch(() => {});
        }
      } catch {
        // Warm-up is best-effort; a package-needing run surfaces real errors.
      }
    });
    return;
  }
});
