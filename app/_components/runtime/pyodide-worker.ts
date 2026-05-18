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

const PYODIDE_VERSION = "v0.29.3";
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
  | { kind: "run"; id: number; code: string }
  | { kind: "complete"; id: number; line: string; column: number };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "output"; id: number; cell: OutputCellMessage }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string }
  | {
      kind: "complete-result";
      id: number;
      completions: string[];
      replaceLength: number;
    };

function post(msg: OutMessage) {
  self.postMessage(msg);
}

let pyodide: PyodideInterface | null = null;
let initPromise: Promise<void> | null = null;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

interface PyDisplayDataframe { type: "dataframe"; html: string }
interface PyDisplayHtml { type: "html"; html: string }
interface PyDisplayImage { type: "image"; data: string }
interface PyDisplayStdout { type: "stdout"; text: string }
type PyDisplayOutput =
  | PyDisplayDataframe
  | PyDisplayHtml
  | PyDisplayImage
  | PyDisplayStdout;

function isPyDisplayOutputs(v: unknown): v is PyDisplayOutput[] {
  return Array.isArray(v);
}

async function initPyodide(): Promise<void> {
  post({ kind: "loading", message: "Loading Pyodide…" });
  pyodide = await self.loadPyodide({ indexURL: PYODIDE_INDEX_URL });

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

  post({ kind: "loading", message: "Installing packages…" });
  await pyodide.loadPackage(["numpy", "pandas", "matplotlib", "scipy"], pkgCallbacks);
  await pyodide.loadPackage("micropip", pkgCallbacks);
  const micropip = pyodide.pyimport("micropip");
  await micropip.install("plotly");

  // Set up display() and a matplotlib show() patch that captures figures
  // as base64 PNGs into _display_outputs.
  await pyodide.runPythonAsync(`
import sys, io, base64, json, ast as _ast
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

_display_outputs = []

def display(*objs):
    import pandas as pd
    import matplotlib.axes
    import matplotlib.figure
    for obj in objs:
        if obj is None:
            continue
        # Matplotlib Axes/Figure objects are captured by the auto-flush that
        # runs after user code executes — skip them here to avoid printing
        # an unhelpful repr like "<Axes: ylabel='Density'>".
        if isinstance(obj, (matplotlib.axes.Axes, matplotlib.figure.Figure)):
            continue
        if isinstance(obj, pd.DataFrame):
            _display_outputs.append({"type": "dataframe", "html": obj.to_html(classes="dataframe", border=0)})
        elif hasattr(obj, "_repr_html_"):
            h = obj._repr_html_()
            if h:
                _display_outputs.append({"type": "html", "html": h})
        else:
            _display_outputs.append({"type": "stdout", "text": repr(obj)})

import builtins
builtins.display = display

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

def _execute_with_last_display(code):
    """Execute user code, auto-displaying the last expression like Jupyter."""
    _globals = globals()
    tree = _ast.parse(code)
    if tree.body and isinstance(tree.body[-1], _ast.Expr):
        last_expr = tree.body.pop()
        if tree.body:
            _ast.fix_missing_locations(tree)
            exec(compile(tree, "<string>", "exec"), _globals)
        expr_tree = _ast.Expression(body=last_expr.value)
        _ast.fix_missing_locations(expr_tree)
        result = eval(compile(expr_tree, "<string>", "eval"), _globals)
        if result is not None:
            display(result)
    else:
        exec(compile(tree, "<string>", "exec"), _globals)

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

# Snapshot taken *after* _pg_reset_user_globals is defined so that
# both _PG_PROTECTED_NAMES and _pg_reset_user_globals are included.
_PG_PROTECTED_NAMES = set(globals().keys()) | {
    "__name__", "__doc__", "__package__", "__loader__", "__spec__",
    "__builtins__", "__file__", "__cached__",
    "_user_code_str", "_complete_line", "_complete_column",
    # Explicitly guard the set and the reset helper themselves —
    # set(globals().keys()) above already captures them, but listing them
    # here makes the intent obvious and guards against future reordering.
    "_PG_PROTECTED_NAMES", "_pg_reset_user_globals",
}
`);

  post({ kind: "ready" });
}

async function runCode(id: number, code: string): Promise<void> {
  if (!pyodide) throw new Error("Pyodide is not initialised");

  let stdout = "";
  let stderr = "";
  pyodide.setStdout({ batched: (s: string) => { stdout += s + "\n"; } });
  pyodide.setStderr({ batched: (s: string) => { stderr += s + "\n"; } });

  // Auto-install any Pyodide packages referenced by the user's imports
  // (e.g. `import sklearn` triggers loading of scikit-learn). Suppress the
  // loader's progress messages so they don't pollute the captured user
  // stdout — see the comment on `pkgCallbacks` in `initPyodide()`.
  try {
    await pyodide.loadPackagesFromImports(code, {
      messageCallback: (m: string) => {
        console.log("[pyodide:loadPackage]", m);
      },
      errorCallback: (m: string) => {
        console.error("[pyodide:loadPackage]", m);
      },
    });
  } catch (err) {
    stderr += `Failed to auto-load packages: ${
      err instanceof Error ? err.message : String(err)
    }\n`;
  }

  await pyodide.runPythonAsync("_pg_reset_user_globals(); _display_outputs.clear()");

  // Pass the user code as a Python string to avoid template-literal escaping
  // issues and to let _execute_with_last_display parse it with the ast module.
  pyodide.globals.set("_user_code_str", code);

  // Wrap user code with a Plotly intercept so `fig.show()` captures the
  // figure JSON instead of trying to open a browser tab.  The user code is
  // executed via _execute_with_last_display so that the last expression is
  // auto-displayed (Jupyter-style) when it evaluates to a non-None value.
  const wrappedCode = `
import json as _json
import plotly as _plotly

_plotly_json_outputs = []
_orig_plotly_show = _plotly.io.show

def _patched_plotly_show(fig, *args, **kwargs):
    _plotly_json_outputs.append(_json.dumps(fig.to_dict()))

_plotly.io.show = _patched_plotly_show
try:
    import plotly.graph_objects as _go
    _orig_go_show = _go.Figure.show
    def _patched_go_show(self, *args, **kwargs):
        _plotly_json_outputs.append(_json.dumps(self.to_dict()))
    _go.Figure.show = _patched_go_show
except: pass

_execute_with_last_display(_user_code_str)

# Auto-flush any matplotlib figures that the user did not explicitly show.
# This handles patterns like df.x.plot.density() which create a figure
# and return an Axes object without ever calling plt.show().
for _fig_num in list(plt.get_fignums()):
    _fig = plt.figure(_fig_num)
    _buf = io.BytesIO()
    _fig.savefig(_buf, format="png", bbox_inches="tight", dpi=130, facecolor=_fig.get_facecolor())
    _buf.seek(0)
    _display_outputs.append({"type": "image", "data": base64.b64encode(_buf.read()).decode()})
plt.close("all")

_plotly.io.show = _orig_plotly_show
try: _go.Figure.show = _orig_go_show
except: pass
`;

  await pyodide.runPythonAsync(wrappedCode);

  const displayProxy = pyodide.globals.get("_display_outputs");
  const displayOutputsRaw = displayProxy.toJs({
    dict_converter: Object.fromEntries,
  });
  displayProxy.destroy();

  const plotlyProxy = pyodide.globals.get("_plotly_json_outputs");
  const plotlyOutputsRaw = plotlyProxy.toJs();
  plotlyProxy.destroy();

  if (stdout.trim()) post({ kind: "output", id, cell: { type: "stdout", content: stdout.trim() } });
  if (stderr.trim()) post({ kind: "output", id, cell: { type: "stderr", content: stderr.trim() } });

  if (isPyDisplayOutputs(displayOutputsRaw)) {
    for (const out of displayOutputsRaw) {
      if (out.type === "dataframe" || out.type === "html") {
        post({ kind: "output", id, cell: { type: "html", content: out.html } });
      } else if (out.type === "image") {
        post({ kind: "output", id, cell: { type: "image", content: out.data } });
      } else if (out.type === "stdout") {
        post({ kind: "output", id, cell: { type: "stdout", content: out.text } });
      }
    }
  }

  if (isStringArray(plotlyOutputsRaw)) {
    for (const jsonStr of plotlyOutputsRaw) {
      const fig = JSON.parse(jsonStr) as { data: unknown[]; layout?: Record<string, unknown> };
      post({ kind: "output", id, cell: { type: "plot", content: jsonStr, plot: fig } });
    }
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
    const { id, code } = msg;
    enqueue(async () => {
      try {
        if (initPromise) await initPromise;
        await runCode(id, code);
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
});
