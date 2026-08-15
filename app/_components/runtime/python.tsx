import type {
  CompletionListItem,
  CompletionRequest,
  CompletionResult,
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  PlotlyFigure,
  RunOptions,
} from "../types";
import { getRuffFmt } from "./ruffFmt";

// Pyodide loads inside a dedicated module Web Worker (see
// runtime/pyodide-worker.ts): a bundler-ignored CDN import keeps Turbopack
// away from Pyodide's dynamic imports, and execution stays off the main
// thread.

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
    key: "read_csv_url",
    title: "Read CSV from URL",
    desc: "Load a remote CSV with pandas",
    code: `import pandas as pd

# raw.githubusercontent.com sends permissive CORS headers, so pandas can
# read the CSV straight from the URL, no download or proxy needed.
url = "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/penguins.csv"
penguins = pd.read_csv(url)

print(f"{penguins.shape[0]} rows × {penguins.shape[1]} columns")
print()
print("Penguins per species:")
print(penguins["species"].value_counts())

# A returned DataFrame renders as a table.
penguins.head()
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

print("Linear Regression, Housing Price Model")
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
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "Import a helper module defined alongside main.py",
    code: `from greetings import hello, bye

print(hello("Python Playground"))
print(bye("Python Playground"))
`,
    files: [
      {
        filename: "greetings.py",
        content: `def hello(name: str) -> str:
    return f"Hello, {name}!"


def bye(name: str) -> str:
    return f"Goodbye, {name}!"
`,
      },
    ],
    entryFilename: "main.py",
  },
];

const PACKAGES: PackageInfo[] = [
  // Scientific
  {
    cat: "Scientific Computing", icon: "🔢", color: "#4f8ef7", name: "numpy", ver: "2.4",
    desc: "N-dimensional arrays, linear algebra, FFT, random sampling",
    example: `import numpy as np

a = np.arange(1, 10).reshape(3, 3)
print("matrix:")
print(a)
print("sum:", a.sum())
print("eigenvalues:", np.linalg.eigvals(a).round(3))
`,
  },
  {
    cat: "Scientific Computing", icon: "📐", color: "#4f8ef7", name: "scipy", ver: "1.18",
    desc: "Optimization, integration, interpolation, signal processing",
    example: `from scipy import integrate, optimize
import numpy as np

area, _ = integrate.quad(lambda x: np.sin(x) ** 2, 0, np.pi)
print(f"∫ sin²(x) dx from 0..π = {area:.6f}")

minimum = optimize.minimize_scalar(lambda x: (x - 3) ** 2 + 1)
print(f"min at x={minimum.x:.4f}, f={minimum.fun:.4f}")
`,
  },
  {
    cat: "Scientific Computing", icon: "🧮", color: "#4f8ef7", name: "sympy", ver: "1.14",
    desc: "Symbolic mathematics, algebra, calculus, equation solving",
    example: `from sympy import symbols, expand, diff, integrate

x = symbols("x")
expr = (x + 1) ** 3
print("expand:", expand(expr))
print("d/dx:  ", diff(expr, x))
print("∫ dx:  ", integrate(expr, x))
`,
  },
  // Data
  {
    cat: "Data & Analysis", icon: "🐼", color: "#34d399", name: "pandas", ver: "3.0",
    desc: "DataFrames, Series, data manipulation and analysis",
    example: `import pandas as pd

df = pd.DataFrame({
    "name": ["Ada", "Linus", "Grace", "Hopper"],
    "age":  [36, 54, 40, 85],
    "team": ["A", "B", "A", "B"],
})
print(df)
print()
print(df.groupby("team")["age"].mean())
`,
  },
  {
    cat: "Data & Analysis", icon: "📊", color: "#34d399", name: "statsmodels", ver: "0.14",
    desc: "Statistical models, hypothesis tests, time series analysis",
    example: `import numpy as np
import statsmodels.api as sm

rng = np.random.default_rng(0)
x = np.linspace(0, 10, 50)
y = 2.0 * x + 1.0 + rng.normal(scale=0.5, size=x.size)

X = sm.add_constant(x)
model = sm.OLS(y, X).fit()
print(model.summary().tables[1])
`,
  },
  {
    cat: "Data & Analysis", icon: "🗃️", color: "#34d399", name: "pyarrow", ver: "22.0",
    desc: "Apache Arrow columnar data, Parquet file I/O",
    example: `import pyarrow as pa

table = pa.table({
    "name": ["Ada", "Linus", "Grace"],
    "age":  [36, 54, 40],
})
print(table)
print("schema:", table.schema)
`,
  },
  // Visualization
  {
    cat: "Visualization", icon: "📈", color: "#f59e0b", name: "matplotlib", ver: "3.10",
    desc: "2D plotting, line, bar, scatter, histogram, heatmap, etc.",
    example: `import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 2 * np.pi, 200)
plt.plot(x, np.sin(x), label="sin")
plt.plot(x, np.cos(x), label="cos")
plt.legend()
plt.title("sin / cos")
plt.show()
`,
  },
  {
    cat: "Visualization", icon: "🎨", color: "#f59e0b", name: "plotly", ver: "6.9",
    desc: "Interactive charts, line, bar, scatter, 3D, maps",
    example: `import plotly.express as px

fig = px.bar(
    x=["A", "B", "C", "D"],
    y=[10, 7, 14, 4],
    title="Counts",
)
fig.show()
`,
  },
  {
    cat: "Visualization", icon: "🌊", color: "#f59e0b", name: "seaborn", ver: "0.13",
    desc: "Statistical visualization built on Matplotlib",
    example: `import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd

# Built inline so the example doesn't depend on network access.
tips = pd.DataFrame({
    "day": ["Thu", "Fri", "Sat", "Sun"] * 5,
    "total_bill": [12, 18, 25, 30, 15, 20, 28, 33, 11, 19,
                   24, 31, 14, 17, 26, 29, 13, 21, 27, 32],
})
sns.boxplot(data=tips, x="day", y="total_bill")
plt.title("Bill by day")
plt.show()
`,
  },
  {
    cat: "Visualization", icon: "✦", color: "#f59e0b", name: "altair", ver: "6.0",
    desc: "Declarative statistical visualization (Vega-Altair)",
    example: `import altair as alt
import pandas as pd

df = pd.DataFrame({"x": list("ABCDE"), "y": [3, 1, 4, 1, 5]})
chart = alt.Chart(df).mark_bar().encode(x="x", y="y")

# This playground renders text, tables, and images rather than live Vega
# views, so print the Vega-Lite spec the chart compiles to.
print(chart.to_json(indent=2))
`,
  },
  {
    cat: "Visualization", icon: "🖼️", color: "#f59e0b", name: "pillow", ver: "12.2",
    desc: "Image processing, open, transform, save images",
    example: `from PIL import Image, ImageDraw

img = Image.new("RGB", (200, 80), "white")
draw = ImageDraw.Draw(img)
draw.rectangle([10, 10, 190, 70], outline="black", width=2)
draw.text((30, 30), "Hello, Pillow!", fill="black")
print("size:", img.size, "mode:", img.mode)
`,
  },
  // ML / AI
  {
    cat: "Machine Learning", icon: "🤖", color: "#a78bfa", name: "scikit-learn", ver: "1.8",
    desc: "Classification, regression, clustering, model selection",
    example: `from sklearn.datasets import load_iris
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

X, y = load_iris(return_X_y=True)
Xtr, Xte, ytr, yte = train_test_split(X, y, random_state=0)
clf = LogisticRegression(max_iter=200).fit(Xtr, ytr)
print(f"accuracy: {clf.score(Xte, yte):.3f}")
`,
  },
  {
    cat: "Machine Learning", icon: "🌲", color: "#a78bfa", name: "xgboost", ver: "2.1",
    desc: "Gradient boosting, fast and accurate tree models",
    example: `import xgboost as xgb
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split

X, y = load_iris(return_X_y=True)
Xtr, Xte, ytr, yte = train_test_split(X, y, random_state=0)
model = xgb.XGBClassifier(n_estimators=20, max_depth=3).fit(Xtr, ytr)
print(f"accuracy: {model.score(Xte, yte):.3f}")
`,
  },
  // Text & Data Formats
  {
    cat: "Text & Formats", icon: "📝", color: "#f472b6", name: "regex", ver: "2026.3",
    desc: "Advanced regular expressions beyond the standard \`re\`",
    example: `import regex

text = "Order 123 placed on 2024-05-12, total $42.95."
for m in regex.finditer(r"\\d+(?:\\.\\d+)?", text):
    print(m.group(), "@", m.start())
`,
  },
  {
    cat: "Text & Formats", icon: "🧬", color: "#f472b6", name: "lxml", ver: "6.0",
    desc: "Fast XML/HTML parsing and XPath querying",
    example: `from lxml import etree

xml = """<users>
  <user id="1"><name>Ada</name></user>
  <user id="2"><name>Linus</name></user>
</users>"""
root = etree.fromstring(xml)
for name in root.xpath("//user/name/text()"):
    print(name)
`,
  },
  {
    cat: "Text & Formats", icon: "📋", color: "#f472b6", name: "openpyxl", ver: "3.1",
    desc: "Read and write Excel .xlsx files",
    example: `from openpyxl import Workbook
from io import BytesIO

wb = Workbook()
ws = wb.active
ws.title = "demo"
ws.append(["name", "score"])
ws.append(["Ada", 95])
ws.append(["Linus", 88])

buf = BytesIO()
wb.save(buf)
print(f"workbook size: {len(buf.getvalue())} bytes")
`,
  },
  {
    cat: "Text & Formats", icon: "📄", color: "#f472b6", name: "pyyaml", ver: "6.0",
    desc: "YAML file parsing and serialization",
    example: `import yaml

text = """
name: Ada
skills:
  - math
  - code
"""
data = yaml.safe_load(text)
print(data)
print("re-emitted:")
print(yaml.safe_dump(data, sort_keys=False))
`,
  },
  {
    cat: "Text & Formats", icon: "🗜️", color: "#f472b6", name: "msgpack", ver: "1.1",
    desc: "Fast binary serialization format",
    example: `import msgpack

data = {"name": "Ada", "skills": ["math", "code"], "age": 36}
packed = msgpack.packb(data)
print(f"packed: {len(packed)} bytes")
print("unpacked:", msgpack.unpackb(packed))
`,
  },
  // Networking & Utilities
  {
    cat: "Utilities", icon: "🌐", color: "#60a5fa", name: "requests", ver: "2.33",
    desc: "HTTP requests (via micropip, pure Python)",
    example: `# Note: real network calls are blocked in the browser sandbox; this
# example shows the request-construction API instead of executing it.
import requests

req = requests.Request("GET", "https://api.example.com/users",
                       params={"q": "ada"}).prepare()
print("URL:    ", req.url)
print("method: ", req.method)
`,
  },
  {
    cat: "Utilities", icon: "🔐", color: "#60a5fa", name: "cryptography", ver: "47.0",
    desc: "Cryptographic recipes and primitives",
    example: `from cryptography.fernet import Fernet

key = Fernet.generate_key()
f = Fernet(key)
token = f.encrypt(b"secret message")
print("token:    ", token)
print("decrypted:", f.decrypt(token))
`,
  },
  {
    cat: "Utilities", icon: "⚙️", color: "#60a5fa", name: "attrs", ver: "26.1",
    desc: "Classes without boilerplate, define clean data classes",
    example: `import attrs

@attrs.define
class Point:
    x: float
    y: float

p = Point(3.0, 4.0)
print(p)
print("fields:", [f.name for f in attrs.fields(Point)])
`,
  },
  {
    cat: "Utilities", icon: "📦", color: "#60a5fa", name: "packaging", ver: "26.1",
    desc: "Version parsing and specifiers (PEP 440/508)",
    example: `from packaging.version import Version
from packaging.specifiers import SpecifierSet

v = Version("2.3.1")
print(f"version: {v}, major={v.major}, minor={v.minor}")
spec = SpecifierSet(">=2.0,<3.0")
print(f"{v} satisfies {spec}? {v in spec}")
`,
  },
  {
    cat: "Utilities", icon: "🧪", color: "#60a5fa", name: "pytest", ver: "9.0",
    desc: "Testing framework, run via micropip install",
    example: `# A minimal pytest-style sanity check. In a real project these would
# live in a test_*.py file and be discovered by 'pytest'.
import pytest

def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5
    with pytest.raises(TypeError):
        add("a", 1)  # type: ignore[arg-type]

test_add()
print("test_add passed")
`,
  },
];

// ─── Worker protocol, must stay in sync with `pyodide-worker.ts`. ─────
type OutputCellType = "stdout" | "stderr" | "html" | "image" | "plot";
interface OutputCellMessage {
  type: OutputCellType;
  content: string;
  plot?: PlotlyFigure;
}
type WorkerOutMessage =
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
      completions: CompletionListItem[];
      replaceLength: number;
    };

/**
 * Resolve light/dark mode for the Plotly template. Playground pages set
 * `data-playground-theme` on <html>; /learn pages toggle a `.dark` class.
 */
function detectChartTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  const html = document.documentElement;
  const pgTheme = html.getAttribute("data-playground-theme");
  if (pgTheme) return pgTheme === "light" ? "light" : "dark";
  return html.classList.contains("dark") ? "dark" : "light";
}

class PyodideWorkerRuntime implements LanguageRuntime {
  private nextId = 0;

  constructor(private worker: Worker) {}

  /** Terminate the worker (registry-eviction hook; unusable after). */
  dispose(): void {
    this.worker.terminate();
  }

  /** Fire-and-forget warm hint (see LanguageRuntime.warmPackages).
   *  Explicit module names become synthetic `import x` lines so the
   *  worker's gate treats them like authored imports. */
  warmPackages(
    sources: string[],
    options?: { packages?: string[]; force?: boolean },
  ): void {
    const hints = [
      ...sources,
      ...(options?.packages ?? []).map((mod) => `import ${mod}`),
    ].filter((s) => s.trim().length > 0);
    if (hints.length === 0 && !options?.force) return;
    this.worker.postMessage({
      kind: "warm-packages",
      sources: hints,
      force: options?.force ?? false,
    });
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    const id = ++this.nextId;
    return new Promise<void>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        // Ignore messages from earlier or unrelated runs.
        if (
          msg.kind !== "output" &&
          msg.kind !== "done" &&
          msg.kind !== "error" &&
          msg.kind !== "run-status"
        ) {
          return;
        }
        if (msg.id !== id) return;
        if (msg.kind === "run-status") {
          // Mid-run wait notices; `preparing` shows the boot notice until
          // execution actually starts.
          options?.onStatus?.(msg.message, msg.preparing);
          return;
        }
        if (msg.kind === "output") {
          emit(msg.cell);
          return;
        }
        this.worker.removeEventListener("message", onMessage);
        if (msg.kind === "done") resolve();
        else reject(new Error(msg.message));
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ kind: "run", id, code, theme: detectChartTheme() });
    });
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const id = ++this.nextId;
    return new Promise<CompletionResult>((resolve) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind !== "complete-result") return;
        if (msg.id !== id) return;
        this.worker.removeEventListener("message", onMessage);
        resolve({ list: msg.completions, replaceLength: msg.replaceLength });
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({
        kind: "complete",
        id,
        doc: request.doc,
        lineNumber: request.lineNumber,
        line: request.line,
        column: request.column,
      });
    });
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const id = ++this.nextId;
    // Send the workspace's exact filenames so `os.listdir()` matches the
    // user's mental model.
    const payload: Array<[string, Uint8Array]> = [];
    for (const [path, bytes] of files) payload.push([path, bytes]);
    return new Promise<void>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (
          msg.kind !== "prepare-fs-done" &&
          msg.kind !== "prepare-fs-error"
        ) {
          return;
        }
        if (msg.id !== id) return;
        this.worker.removeEventListener("message", onMessage);
        if (msg.kind === "prepare-fs-done") resolve();
        else reject(new Error(msg.message));
      };
      this.worker.addEventListener("message", onMessage);
      this.worker.postMessage({ kind: "prepare-fs", id, files: payload });
    });
  }
}

export const pythonAdapter: LanguageAdapter = {
  id: "python",
  displayName: "Python Playground",
  logoText: "py",
  documentTitle: "Python Playground",
  readyStatus: "Python 3.14.2 ready",
  runtimeInfo: {
    language: "Python",
    version: "3.14.2",
    // Keep in sync with PYODIDE_VERSION in pyodide-worker.ts.
    engine: "Pyodide 314.0.4",
    engineUrl: "https://pyodide.org",
    notes: "Runs in a Web Worker so the UI stays responsive while your code executes.",
  },
  codeMirrorMode: "python",
  // Phase A of the two-phase boot (interpreter + stdlib); the ~32 MB
  // package set follows in the background.
  coldDownloadMB: 6,
  // ruff_fmt (PEP 8) (see formatCode), keep in sync.
  indentWidth: 4,
  examples: EXAMPLES,
  packages: PACKAGES,
  outputCapabilities: { dataframes: true, charts: true, figures: true },
  exportFormats: [
    { extension: "py", label: "Python (.py)", mimeType: "text/x-python" },
  ],
  exportBaseFilename: "main",
  defaultFileExtension: "py",
  packagesFooter: (
    <>
      Packages run in WebAssembly via{" "}
      <a href="https://pyodide.org" target="_blank" rel="noreferrer">
        Pyodide
      </a>
      , inside a Web Worker so they don&apos;t block the UI. Use{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        import micropip; await micropip.install(&apos;pkg&apos;)
      </code>{" "}
      for pure-Python PyPI packages.
    </>
  ),
  importSnippet: (name) => `import ${name}`,
  hasImport(code, name) {
    // Match `import name`, `import name as alias`, `import a, name`,
    // and `from name import ...`, anchored at the start of a line so
    // imports that appear in strings or comments mid-line are ignored.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `^\\s*(?:from\\s+${escaped}(?:\\.[\\w.]+)?\\s+import\\b|import\\s+(?:[\\w.]+\\s*,\\s*)*${escaped}(?:\\s+as\\s+\\w+)?\\s*(?:,|$|#))`,
      "m",
    );
    return re.test(code);
  },
  async formatCode(code: string): Promise<string> {
    const { format } = await getRuffFmt();
    return format(code, "main.py");
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Starting Python runtime…", 0.02);
    // Pre-bundled by `scripts/build-almostnode-workers.mjs` and served
    // as a static asset, the same pattern as the JS/TS workers. Pyodide
    // 314's environment detection throws "Classic web workers are not
    // supported" when `importScripts` works (i.e. in a classic worker
    // scope), so this worker MUST run with a real `{ type: "module" }`
    // — and Turbopack strips the `type` option from workers it bundles
    // itself (`new Worker(new URL(...), ...)`), which is why the
    // bundler-analyzed construction can't be used here.
    const worker = new Worker("/_workers/pyodide-worker.js", {
      type: "module",
    });

    return new Promise<LanguageRuntime>((resolve, reject) => {
      const onMessage = (ev: MessageEvent<WorkerOutMessage>) => {
        const msg = ev.data;
        if (msg.kind === "loading") {
          setLoadingMessage(msg.message, msg.fraction);
        } else if (msg.kind === "ready") {
          worker.removeEventListener("message", onMessage);
          resolve(new PyodideWorkerRuntime(worker));
        } else if (msg.kind === "init-error") {
          worker.removeEventListener("message", onMessage);
          worker.terminate();
          reject(new Error(msg.message));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (ev) => {
        worker.removeEventListener("message", onMessage);
        reject(new Error(ev.message || "Pyodide worker failed to start"));
      });
      worker.postMessage({ kind: "init" });
    });
  },
};
