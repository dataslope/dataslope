/**
 * Rich-output capture for `build-block-outputs.mjs`.
 *
 * `pyodide-runner.mjs` deliberately stubs rendering: the sweeps only ask
 * "does this raise?", so `plt.show()` is a no-op and `display()` just
 * prints. Prepopulating a lesson's output panel needs the opposite — the
 * table, the chart and the figure exactly as a reader would see them — so
 * this script re-patches the same three seams on top of that boot.
 *
 * ── Keep this in step with the worker ────────────────────────────────────
 * The wire shape below (`{type: "stdout"|"stderr"|"dataframe"|"html"|
 * "image"|"plot"}`) is the one `app/_components/runtime/pyodide-worker.ts`
 * produces in `_display_outputs`, and the JS side of the conversion is
 * shared rather than copied: both go through `toOutputCells()` in
 * `app/_components/runtime/pythonDisplayOutputs.ts`. The *Python* half is
 * a second implementation, and the risk that comes with that is real: if
 * the worker changes how it renders a DataFrame, a prepopulated panel will
 * quietly disagree with what Run produces. Two things bound the damage —
 * the shapes are asserted by `__tests__/blockOutputs.test.ts`, and a
 * mismatch is visible rather than silent, because the learner can press Run
 * and compare.
 */

/**
 * Installed once, after `bootPyodide()`.
 *
 * Everything lives in the *main* globals, while blocks execute in a fresh
 * namespace per run, which is exactly what makes the split work: the tee
 * and the patched `show()` persist, and nothing a block defines leaks into
 * the next one.
 */
export const CAPTURE_SETUP = `
import sys, io, base64, json, ast as _bo_ast

_bo_outputs = []

def _bo_emit_text(kind, s):
    """Append stream text, merging consecutive writes of the same stream
    into one segment (print() emits the text and its newline separately)."""
    if not s:
        return
    if _bo_outputs and _bo_outputs[-1].get("type") == kind:
        _bo_outputs[-1]["text"] += s
    else:
        _bo_outputs.append({"type": kind, "text": s})

class _BoTee(io.TextIOBase):
    """Tee over sys.stdout/stderr so text lands in _bo_outputs *in order*
    with tables and figures, print -> display(df) -> print renders in that
    sequence, like a notebook."""
    def __init__(self, kind):
        self._kind = kind
    def writable(self):
        return True
    def write(self, s):
        _bo_emit_text(self._kind, s)
        return len(s)

sys.stdout = _BoTee("stdout")
sys.stderr = _BoTee("stderr")

def _bo_strip_styles(h):
    import re as _re
    return _re.sub(r'<style[^>]*>.*?</style>', '', h, flags=_re.DOTALL)

def _bo_display(*objs, **kwargs):
    pd = sys.modules.get("pandas")
    _axes = sys.modules.get("matplotlib.axes")
    _figure = sys.modules.get("matplotlib.figure")
    if pd is not None and not getattr(pd, "_bo_defaults_applied", False):
        pd._bo_defaults_applied = True
        if not pd.get_option("display.max_columns"):
            pd.set_option("display.max_columns", 20)
    for obj in objs:
        if obj is None:
            continue
        # Figures are captured by the plt.show() patch below; a repr here
        # would just print "<Axes: ...>".
        if _axes is not None and isinstance(obj, _axes.Axes):
            continue
        if _figure is not None and isinstance(obj, _figure.Figure):
            continue
        if pd is not None and isinstance(obj, pd.DataFrame):
            h = obj._repr_html_()
            if h is None:
                h = obj.to_html(classes="dataframe", border=0, show_dimensions=True)
            else:
                h = _bo_strip_styles(h)
            _bo_outputs.append({"type": "dataframe", "html": h})
        elif hasattr(obj, "to_plotly_json"):
            _bo_outputs.append({"type": "plot", "json": obj.to_json()})
        elif hasattr(obj, "_repr_html_"):
            h = obj._repr_html_()
            if h:
                _bo_outputs.append({"type": "html", "html": _bo_strip_styles(h)})
        else:
            _bo_emit_text("stdout", repr(obj) + "\\n")

import builtins
builtins.display = _bo_display

# matplotlib: mirror the worker's savefig-to-base64 (SETUP_SCRIPT_B).
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as _bo_plt

    def _bo_show(*a, **k):
        buf = io.BytesIO()
        _bo_plt.savefig(buf, format="png", bbox_inches="tight", dpi=BO_FIGURE_DPI,
                        facecolor=_bo_plt.gcf().get_facecolor())
        buf.seek(0)
        _bo_outputs.append({"type": "image", "data": base64.b64encode(buf.read()).decode()})
        _bo_plt.clf()
        _bo_plt.close("all")
    _bo_plt.show = _bo_show
except Exception:
    pass

# plotly: the browser renders the figure JSON, so that is what we store.
try:
    import plotly.graph_objects as _bo_go
    def _bo_fig_show(self, *a, **k):
        _bo_outputs.append({"type": "plot", "json": self.to_json()})
    _bo_go.Figure.show = _bo_fig_show
except Exception:
    pass

def _bo_flush_figures():
    """Capture any figure the block created but never showed.

    Mirrors the auto-flush at the end of the worker's run wrapper. Plenty
    of lessons never call plt.show() — \`sns.histplot(...)\` or
    \`df.plot.density()\` build a figure and return an Axes — and without
    this the browser shows a chart while the prepopulated panel shows
    nothing, which is the one disagreement this whole feature must not
    have."""
    _plt = sys.modules.get("matplotlib.pyplot")
    if _plt is None:
        return
    for _num in list(_plt.get_fignums()):
        _fig = _plt.figure(_num)
        # A figure with no drawn content is an artefact of the import, not
        # something the lesson made; skipping it keeps empty panels empty.
        if not _fig.get_axes():
            continue
        _buf = io.BytesIO()
        _fig.savefig(_buf, format="png", bbox_inches="tight", dpi=BO_FIGURE_DPI,
                     facecolor=_fig.get_facecolor())
        _bo_outputs.append({"type": "image", "data": base64.b64encode(_buf.getvalue()).decode()})
    _plt.close("all")

def _bo_take():
    """Hand the current run's outputs to JS and reset for the next block."""
    _bo_flush_figures()
    out = json.dumps(_bo_outputs)
    _bo_outputs.clear()
    return out

def _bo_last_expr_span(src):
    """Byte-free (character) span of the trailing top-level expression, or
    null.

    The worker auto-displays a block's final expression the way a notebook
    does, so a lesson ending in a bare \`df\` renders a table. The Node runner
    just execs, which would silently drop it. Returning the span lets the
    caller splice \`display(...)\` around the exact original text instead of
    round-tripping the file through ast.unparse and losing its formatting."""
    try:
        tree = _bo_ast.parse(src)
    except SyntaxError:
        return None
    if not tree.body or not isinstance(tree.body[-1], _bo_ast.Expr):
        return None
    node = tree.body[-1]
    lines = src.splitlines(keepends=True)
    starts = []
    total = 0
    for ln in lines:
        starts.append(total)
        total += len(ln)
    try:
        start = starts[node.lineno - 1] + node.col_offset
        end = starts[node.end_lineno - 1] + node.end_col_offset
    except IndexError:
        return None
    return json.dumps({"start": start, "end": end})
`;

/**
 * Figure DPI for prepopulated charts.
 *
 * The worker renders at 130 for a crisp on-screen figure the reader just
 * asked for. A preview is a still the reader did not ask for and pays for
 * on page load, so it is rendered at 96: visually near-identical at the
 * width a lesson column gives it, and roughly half the bytes.
 */
export const FIGURE_DPI = 96;

/** The setup script with its DPI placeholder filled in.
 *
 *  `replaceAll`, not `replace`: the placeholder appears in both the
 *  `plt.show()` patch and the end-of-run figure flush, and a single-shot
 *  replace left the second one as a bare name, so every figure-producing
 *  block raised `NameError` inside `_bo_take()` and was silently recorded
 *  as having produced no output at all. */
export function captureSetupScript() {
  return CAPTURE_SETUP.replaceAll("BO_FIGURE_DPI", String(FIGURE_DPI));
}

/**
 * Wrap a block's trailing expression in `display(...)` so it renders the
 * way the browser's notebook-style auto-display renders it.
 *
 * Returns the source unchanged when there is no trailing expression, when
 * the source does not parse, or when the trailing expression is already a
 * call to `display`/`print` (wrapping those would print `None`).
 */
export function wrapLastExpression(py, src) {
  let span;
  try {
    const raw = py.runPython(
      `_bo_last_expr_span(${JSON.stringify(src)})`,
    );
    if (!raw) return src;
    span = JSON.parse(raw);
  } catch {
    return src;
  }
  const expr = src.slice(span.start, span.end).trim();
  if (!expr || /^(?:display|print)\s*\(/.test(expr)) return src;
  return `${src.slice(0, span.start)}display(${expr})${src.slice(span.end)}`;
}
