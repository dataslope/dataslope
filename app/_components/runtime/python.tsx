import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  PlotlyFigure,
} from "../types";
import type { PyodideInterface } from "./globals";
import { loadScripts, loadStylesheets } from "./loader";

const CDN_CM = "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16";

export const CODEMIRROR_SCRIPTS: string[] = [
  `${CDN_CM}/codemirror.min.js`,
  `${CDN_CM}/mode/python/python.min.js`,
  `${CDN_CM}/mode/r/r.min.js`,
  `${CDN_CM}/addon/edit/closebrackets.min.js`,
  `${CDN_CM}/addon/edit/matchbrackets.min.js`,
  `${CDN_CM}/addon/comment/comment.min.js`,
  `${CDN_CM}/keymap/sublime.min.js`,
];

export const CODEMIRROR_STYLES: string[] = [
  `${CDN_CM}/codemirror.min.css`,
  `${CDN_CM}/theme/dracula.min.css`,
  `${CDN_CM}/theme/monokai.min.css`,
  `${CDN_CM}/theme/material-darker.min.css`,
  `${CDN_CM}/theme/nord.min.css`,
  `${CDN_CM}/theme/tomorrow-night-eighties.min.css`,
  `${CDN_CM}/theme/solarized.min.css`,
  `${CDN_CM}/theme/eclipse.min.css`,
  `${CDN_CM}/theme/mdn-like.min.css`,
];

const PYODIDE_VERSION = "v0.27.3";
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;
const PLOTLY_SRC = "https://cdn.plot.ly/plotly-2.35.2.min.js";

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "Basic print, math & strings",
    code: `# Hello, Python Playground!
import sys, math

print("Python", sys.version.split()[0])
print("π ≈", math.pi)
print("e ≈", math.e)

for i in range(1, 6):
    stars = "★" * i
    print(f"  {i}: {stars}")

msg = "Hello, World!"
print("\\n" + "─" * 30)
print(msg.center(30))
print("─" * 30)
`,
  },
  {
    key: "dataframe",
    title: "Pandas DataFrame",
    desc: "Create & display a DataFrame",
    code: `import pandas as pd
import numpy as np

# Create a sample sales DataFrame
np.random.seed(42)
months = ["Jan","Feb","Mar","Apr","May","Jun"]
products = ["Widget A","Widget B","Widget C"]

data = {
    "Month": months * 3,
    "Product": [p for p in products for _ in months],
    "Revenue": np.random.randint(10000, 80000, 18),
    "Units": np.random.randint(50, 500, 18),
    "Margin %": np.round(np.random.uniform(0.15, 0.45, 18), 2),
}

df = pd.DataFrame(data)
df["Avg Price"] = (df["Revenue"] / df["Units"]).round(2)

print("Sales Summary")
print("─" * 40)
display(df.groupby("Product")[["Revenue","Units"]].sum())
print()
print("Full data (first 10 rows):")
display(df.head(10))
`,
  },
  {
    key: "plotly_line",
    title: "Plotly Line Chart",
    desc: "Interactive time-series plot",
    code: `import plotly.graph_objects as go
import numpy as np

# Simulate time-series data
np.random.seed(7)
days = np.arange(1, 91)
series_a = 100 + np.cumsum(np.random.randn(90) * 2)
series_b = 90  + np.cumsum(np.random.randn(90) * 1.5)
series_c = 110 + np.cumsum(np.random.randn(90) * 2.5)

fig = go.Figure()
for name, vals, color in [
    ("Product A", series_a, "#4f8ef7"),
    ("Product B", series_b, "#34d399"),
    ("Product C", series_c, "#f59e0b"),
]:
    fig.add_trace(go.Scatter(
        x=days, y=vals, name=name,
        line=dict(color=color, width=2),
        hovertemplate=f"Day %{{x}}<br>{name}: %{{y:.1f}}<extra></extra>"
    ))

fig.update_layout(
    title="90-Day Performance Trends",
    xaxis_title="Day", yaxis_title="Value",
    legend=dict(x=0, y=1),
    height=400,
)
fig.show()
`,
  },
  {
    key: "plotly_bar",
    title: "Plotly Bar Chart",
    desc: "Grouped bar chart with colors",
    code: `import plotly.graph_objects as go

quarters = ["Q1", "Q2", "Q3", "Q4"]
regions  = {
    "North": [42, 55, 61, 78],
    "South": [38, 47, 52, 65],
    "East":  [51, 60, 70, 82],
    "West":  [29, 41, 48, 57],
}
colors = ["#4f8ef7", "#34d399", "#f59e0b", "#f472b6"]

fig = go.Figure()
for (region, vals), color in zip(regions.items(), colors):
    fig.add_trace(go.Bar(
        name=region, x=quarters, y=vals,
        marker_color=color,
        hovertemplate=f"{region}<br>%{{x}}: %{{y}}M<extra></extra>"
    ))

fig.update_layout(
    barmode="group",
    title="Regional Revenue by Quarter ($M)",
    xaxis_title="Quarter", yaxis_title="Revenue ($M)",
    height=400,
)
fig.show()
`,
  },
  {
    key: "plotly_scatter",
    title: "Plotly Scatter",
    desc: "Scatter with regression trend",
    code: `import plotly.graph_objects as go
import numpy as np

np.random.seed(42)
n = 80
x = np.random.uniform(0, 100, n)
y = 2.5 * x + np.random.randn(n) * 15 + 30
sizes = np.random.uniform(8, 24, n)
category = np.random.choice(["Alpha","Beta","Gamma"], n)
color_map = {"Alpha":"#4f8ef7","Beta":"#34d399","Gamma":"#f59e0b"}

fig = go.Figure()
for cat in ["Alpha","Beta","Gamma"]:
    mask = category == cat
    fig.add_trace(go.Scatter(
        x=x[mask], y=y[mask], mode="markers",
        name=cat,
        marker=dict(size=sizes[mask], color=color_map[cat], opacity=0.75, line=dict(width=1, color="white")),
        hovertemplate=f"{cat}<br>x=%{{x:.1f}}, y=%{{y:.1f}}<extra></extra>"
    ))

# Trend line
m, b = np.polyfit(x, y, 1)
xs = np.linspace(0, 100, 200)
fig.add_trace(go.Scatter(
    x=xs, y=m*xs+b, mode="lines", name="Trend",
    line=dict(color="white", width=1.5, dash="dash"), opacity=0.5
))

fig.update_layout(title="Scatter with Trend Line", height=420,
    xaxis_title="X", yaxis_title="Y")
fig.show()
`,
  },
  {
    key: "matplotlib",
    title: "Matplotlib",
    desc: "Static chart as image",
    code: `import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), facecolor="#0f1117")
fig.suptitle("Matplotlib Output", color="#e2e8f0", fontsize=14, fontweight="bold")

# Histogram
np.random.seed(0)
data = np.random.normal(0, 1, 2000)
ax1 = axes[0]
ax1.hist(data, bins=40, color="#4f8ef7", edgecolor="none", alpha=0.85)
ax1.set_title("Normal Distribution", color="#e2e8f0")
ax1.set_facecolor("#161b27")
ax1.tick_params(colors="#64748b")
for sp in ax1.spines.values(): sp.set_edgecolor("#2a3347")

# Sine waves
ax2 = axes[1]
t = np.linspace(0, 4 * np.pi, 500)
ax2.plot(t, np.sin(t),   color="#4f8ef7", linewidth=2, label="sin")
ax2.plot(t, np.cos(t),   color="#34d399", linewidth=2, label="cos")
ax2.plot(t, np.sin(2*t), color="#f59e0b", linewidth=2, label="sin 2x", linestyle="--")
ax2.set_title("Trig Functions", color="#e2e8f0")
ax2.set_facecolor("#161b27")
ax2.tick_params(colors="#64748b")
ax2.legend(facecolor="#1e2535", edgecolor="#2a3347", labelcolor="#94a3b8")
for sp in ax2.spines.values(): sp.set_edgecolor("#2a3347")

plt.tight_layout()
plt.show()
`,
  },
  {
    key: "numpy_stats",
    title: "NumPy Statistics",
    desc: "Arrays & statistical ops",
    code: `import numpy as np

np.random.seed(99)
data = np.random.normal(loc=50, scale=10, size=1000)

print("═" * 38)
print("  Descriptive Statistics")
print("═" * 38)
print(f"  Count  : {len(data):>10,}")
print(f"  Mean   : {np.mean(data):>10.4f}")
print(f"  Median : {np.median(data):>10.4f}")
print(f"  Std    : {np.std(data):>10.4f}")
print(f"  Var    : {np.var(data):>10.4f}")
print(f"  Min    : {np.min(data):>10.4f}")
print(f"  Max    : {np.max(data):>10.4f}")
print(f"  P25    : {np.percentile(data, 25):>10.4f}")
print(f"  P75    : {np.percentile(data, 75):>10.4f}")
print("═" * 38)

# Matrix operations
A = np.random.randint(1, 9, (4, 4))
B = np.random.randint(1, 9, (4, 4))
print("\\nMatrix A @ B =")
print(A @ B)
print("\\nDet(A) =", round(np.linalg.det(A), 4))
print("Eigenvalues(A) =", np.linalg.eigvals(A).round(3))
`,
  },
  {
    key: "sklearn",
    title: "Scikit-learn",
    desc: "Linear regression example",
    code: `from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np
import pandas as pd

# Generate synthetic housing data
np.random.seed(42)
n = 200
sqft    = np.random.uniform(500, 3500, n)
rooms   = np.random.randint(1, 6, n)
age     = np.random.randint(1, 40, n)
price   = 80000 + sqft * 120 + rooms * 8000 - age * 500 + np.random.randn(n) * 20000

X = np.column_stack([sqft, rooms, age])
y = price

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LinearRegression()
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

print("Linear Regression — Housing Price Model")
print("─" * 42)
print(f"  R²  score : {r2_score(y_test, y_pred):.4f}")
print(f"  RMSE      : \${mean_squared_error(y_test, y_pred)**0.5:,.0f}")
print()
features = ["Sq Ft", "Rooms", "Age"]
print("  Coefficients:")
for f, c in zip(features, model.coef_):
    print(f"    {f:<8} : {c:+.2f}")
print(f"  Intercept  : {model.intercept_:+,.0f}")
`,
  },
];

const PACKAGES: PackageInfo[] = [
  // Scientific
  { cat: "Scientific Computing", icon: "🔢", color: "#4f8ef7", name: "numpy", ver: "1.26", desc: "N-dimensional arrays, linear algebra, FFT, random sampling" },
  { cat: "Scientific Computing", icon: "📐", color: "#4f8ef7", name: "scipy", ver: "1.12", desc: "Optimization, integration, interpolation, signal processing" },
  { cat: "Scientific Computing", icon: "🧮", color: "#4f8ef7", name: "sympy", ver: "1.12", desc: "Symbolic mathematics — algebra, calculus, equation solving" },
  // Data
  { cat: "Data & Analysis", icon: "🐼", color: "#34d399", name: "pandas", ver: "2.2", desc: "DataFrames, Series, data manipulation and analysis" },
  { cat: "Data & Analysis", icon: "📊", color: "#34d399", name: "statsmodels", ver: "0.14", desc: "Statistical models, hypothesis tests, time series analysis" },
  { cat: "Data & Analysis", icon: "🗃️", color: "#34d399", name: "pyarrow", ver: "15.0", desc: "Apache Arrow columnar data, Parquet file I/O" },
  // Visualization
  { cat: "Visualization", icon: "📈", color: "#f59e0b", name: "matplotlib", ver: "3.8", desc: "2D plotting — line, bar, scatter, histogram, heatmap, etc." },
  { cat: "Visualization", icon: "🎨", color: "#f59e0b", name: "plotly", ver: "5.20", desc: "Interactive charts — line, bar, scatter, 3D, maps" },
  { cat: "Visualization", icon: "🌊", color: "#f59e0b", name: "seaborn", ver: "0.13", desc: "Statistical visualization built on Matplotlib" },
  { cat: "Visualization", icon: "✦", color: "#f59e0b", name: "altair", ver: "5.2", desc: "Declarative statistical visualization (Vega-Altair)" },
  { cat: "Visualization", icon: "🖼️", color: "#f59e0b", name: "pillow", ver: "10.2", desc: "Image processing — open, transform, save images" },
  // ML / AI
  { cat: "Machine Learning", icon: "🤖", color: "#a78bfa", name: "scikit-learn", ver: "1.4", desc: "Classification, regression, clustering, model selection" },
  { cat: "Machine Learning", icon: "🌲", color: "#a78bfa", name: "xgboost", ver: "2.0", desc: "Gradient boosting — fast and accurate tree models" },
  // Text & Data Formats
  { cat: "Text & Formats", icon: "📝", color: "#f472b6", name: "regex", ver: "2.5", desc: "Advanced regular expressions beyond the standard `re`" },
  { cat: "Text & Formats", icon: "🧬", color: "#f472b6", name: "lxml", ver: "5.1", desc: "Fast XML/HTML parsing and XPath querying" },
  { cat: "Text & Formats", icon: "📋", color: "#f472b6", name: "openpyxl", ver: "3.1", desc: "Read and write Excel .xlsx files" },
  { cat: "Text & Formats", icon: "📄", color: "#f472b6", name: "pyyaml", ver: "6.0", desc: "YAML file parsing and serialization" },
  { cat: "Text & Formats", icon: "🗜️", color: "#f472b6", name: "msgpack", ver: "1.0", desc: "Fast binary serialization format" },
  // Networking & Utilities
  { cat: "Utilities", icon: "🌐", color: "#60a5fa", name: "requests", ver: "2.31", desc: "HTTP requests (via micropip — pure Python)" },
  { cat: "Utilities", icon: "🔐", color: "#60a5fa", name: "cryptography", ver: "42.0", desc: "Cryptographic recipes and primitives" },
  { cat: "Utilities", icon: "⚙️", color: "#60a5fa", name: "attrs", ver: "23.2", desc: "Classes without boilerplate — define clean data classes" },
  { cat: "Utilities", icon: "🏎️", color: "#60a5fa", name: "numba", ver: "0.59", desc: "JIT compiler for numerical Python (LLVM-based)" },
  { cat: "Utilities", icon: "📦", color: "#60a5fa", name: "packaging", ver: "24.0", desc: "Version parsing and specifiers (PEP 440/508)" },
  { cat: "Utilities", icon: "🧪", color: "#60a5fa", name: "pytest", ver: "8.1", desc: "Testing framework — run via micropip install" },
];

interface PyDisplayDataframe { type: "dataframe"; html: string }
interface PyDisplayHtml { type: "html"; html: string }
interface PyDisplayImage { type: "image"; data: string }
interface PyDisplayStdout { type: "stdout"; text: string }
type PyDisplayOutput = PyDisplayDataframe | PyDisplayHtml | PyDisplayImage | PyDisplayStdout;

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isPyDisplayOutputs(v: unknown): v is PyDisplayOutput[] {
  return Array.isArray(v);
}

class PyodideRuntime implements LanguageRuntime {
  constructor(private pyodide: PyodideInterface) {}

  async run(code: string, emit: EmitOutput): Promise<void> {
    let stdout = "";
    let stderr = "";
    this.pyodide.setStdout({ batched: (s) => { stdout += s + "\n"; } });
    this.pyodide.setStderr({ batched: (s) => { stderr += s + "\n"; } });

    await this.pyodide.runPythonAsync("_display_outputs.clear()");

    // Wrap user code with Plotly intercept so fig.show() captures JSON instead
    // of trying to open a browser tab.
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

    await this.pyodide.runPythonAsync(wrappedCode);

    const displayProxy = this.pyodide.globals.get("_display_outputs");
    const displayOutputsRaw = displayProxy.toJs({
      dict_converter: Object.fromEntries,
    });
    displayProxy.destroy();

    const plotlyProxy = this.pyodide.globals.get("_plotly_json_outputs");
    const plotlyOutputsRaw = plotlyProxy.toJs();
    plotlyProxy.destroy();

    if (stdout.trim()) emit({ type: "stdout", content: stdout.trim() });
    if (stderr.trim()) emit({ type: "stderr", content: stderr.trim() });

    if (isPyDisplayOutputs(displayOutputsRaw)) {
      for (const out of displayOutputsRaw) {
        if (out.type === "dataframe" || out.type === "html") {
          emit({ type: "html", content: out.html });
        } else if (out.type === "image") {
          emit({ type: "image", content: out.data });
        } else if (out.type === "stdout") {
          emit({ type: "stdout", content: out.text });
        }
      }
    }

    if (isStringArray(plotlyOutputsRaw)) {
      for (const jsonStr of plotlyOutputsRaw) {
        const fig = JSON.parse(jsonStr) as PlotlyFigure;
        emit({ type: "plot", content: jsonStr, plot: fig });
      }
    }
  }
}

export const pythonAdapter: LanguageAdapter = {
  id: "python",
  displayName: "Python Playground",
  logoText: "py",
  documentTitle: "Python Playground",
  readyStatus: "Python 3.12 ready",
  codeMirrorMode: "python",
  scripts: [...CODEMIRROR_SCRIPTS, PLOTLY_SRC, `${PYODIDE_INDEX}pyodide.js`],
  stylesheets: CODEMIRROR_STYLES,
  examples: EXAMPLES,
  packages: PACKAGES,
  packagesFooter: (
    <>
      Packages run in WebAssembly via{" "}
      <a href="https://pyodide.org" target="_blank" rel="noreferrer">
        Pyodide
      </a>
      . Use{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        import micropip; await micropip.install(&apos;pkg&apos;)
      </code>{" "}
      for pure-Python PyPI packages.
    </>
  ),
  importSnippet: (name) => `import ${name}`,
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    if (!window.loadPyodide) {
      throw new Error("loadPyodide not available — script failed to load");
    }
    setLoadingMessage("Loading Pyodide…");
    const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX });

    setLoadingMessage("Installing packages…");
    await pyodide.loadPackage(["numpy", "pandas", "matplotlib"]);
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install("plotly");

    // Set up display() and a matplotlib show() patch that captures figures as
    // base64 PNGs into _display_outputs.
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

    return new PyodideRuntime(pyodide);
  },
};

// Re-export so other adapters (R) can reuse the same CodeMirror bundle.
export async function loadCodeMirrorAssets(): Promise<void> {
  loadStylesheets(CODEMIRROR_STYLES);
  await loadScripts(CODEMIRROR_SCRIPTS);
}
