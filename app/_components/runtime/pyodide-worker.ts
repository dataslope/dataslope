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
  | { kind: "run"; id: number; code: string };

type OutMessage =
  | { kind: "loading"; message: string }
  | { kind: "ready" }
  | { kind: "init-error"; message: string }
  | { kind: "output"; id: number; cell: OutputCellMessage }
  | { kind: "done"; id: number }
  | { kind: "error"; id: number; message: string };

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

  post({ kind: "loading", message: "Installing packages…" });
  await pyodide.loadPackage(["numpy", "pandas", "matplotlib"]);
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install("plotly");

  // Set up display() and a matplotlib show() patch that captures figures
  // as base64 PNGs into _display_outputs.
  await pyodide.runPythonAsync(`
import sys, io, base64, json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

_display_outputs = []

def display(obj):
    import pandas as pd
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
  // (e.g. `import sklearn` triggers loading of scikit-learn).
  try {
    await pyodide.loadPackagesFromImports(code);
  } catch (err) {
    stderr += `Failed to auto-load packages: ${
      err instanceof Error ? err.message : String(err)
    }\n`;
  }

  await pyodide.runPythonAsync("_display_outputs.clear()");

  // Wrap user code with a Plotly intercept so `fig.show()` captures the
  // figure JSON instead of trying to open a browser tab.
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

${code}

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
    (async () => {
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
    })();
  }
});
