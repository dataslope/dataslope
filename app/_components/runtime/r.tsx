import type {
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
} from "../types";
import type { WebRInstance, WebRShelter } from "./globals";
import { CODEMIRROR_SCRIPTS, CODEMIRROR_STYLES } from "./python";

const WEBR_VERSION = "v0.5.4";
const WEBR_LOADER_TAG_ID = "__webr_module_loader__";

/**
 * WebR is distributed as an ES module on the CDN. Import it via an inline
 * `<script type="module">` so the Next.js bundler never sees the URL — the
 * import happens entirely in the browser. The loader stores the WebR class on
 * `window.__WebR` and dispatches a `webr-loaded` event when ready.
 */
function loadWebRModule(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.__WebR) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(WEBR_LOADER_TAG_ID);
    if (existing) {
      window.addEventListener("webr-loaded", () => resolve(), { once: true });
      window.addEventListener(
        "webr-load-error",
        (e: Event) =>
          reject(
            new Error(
              (e as CustomEvent<{ message: string }>).detail?.message ??
                "WebR failed to load",
            ),
          ),
        { once: true },
      );
      return;
    }
    const s = document.createElement("script");
    s.type = "module";
    s.id = WEBR_LOADER_TAG_ID;
    s.textContent = `
      try {
        const mod = await import("https://webr.r-wasm.org/${WEBR_VERSION}/webr.mjs");
        window.__WebR = mod.WebR;
        window.dispatchEvent(new Event("webr-loaded"));
      } catch (err) {
        window.dispatchEvent(new CustomEvent("webr-load-error", { detail: { message: String(err) } }));
      }
    `;
    window.addEventListener("webr-loaded", () => resolve(), { once: true });
    window.addEventListener(
      "webr-load-error",
      (e: Event) =>
        reject(
          new Error(
            (e as CustomEvent<{ message: string }>).detail?.message ??
              "WebR failed to load",
          ),
        ),
      { once: true },
    );
    document.head.appendChild(s);
  });
}

const EXAMPLES: ExampleSnippet[] = [
  {
    key: "hello",
    title: "Hello World",
    desc: "Basic print, math & vectors",
    code: `# Hello, R Playground!
cat("R", R.version$major, ".", R.version$minor, sep = "")
cat("\\npi  ≈", pi, "\\n")
cat("exp(1) ≈", exp(1), "\\n\\n")

for (i in 1:5) {
  cat(sprintf("  %d: %s\\n", i, strrep("*", i)))
}

msg <- "Hello, World!"
cat("\\n", strrep("-", 30), "\\n", sep = "")
cat(format(msg, width = 30, justify = "centre"), "\\n", sep = "")
cat(strrep("-", 30), "\\n", sep = "")
`,
  },
  {
    key: "dataframe",
    title: "data.frame",
    desc: "Create & display a data.frame",
    code: `set.seed(42)
months   <- c("Jan", "Feb", "Mar", "Apr", "May", "Jun")
products <- c("Widget A", "Widget B", "Widget C")

df <- data.frame(
  Month   = rep(months, times = 3),
  Product = rep(products, each = 6),
  Revenue = sample(10000:80000, 18),
  Units   = sample(50:500, 18),
  Margin  = round(runif(18, 0.15, 0.45), 2)
)
df$AvgPrice <- round(df$Revenue / df$Units, 2)

cat("Sales Summary\\n")
cat(strrep("-", 40), "\\n", sep = "")
print(aggregate(cbind(Revenue, Units) ~ Product, data = df, FUN = sum))

cat("\\nFull data (first 10 rows):\\n")
print(head(df, 10))

# Returning a value displays it as a table.
head(df, 10)
`,
  },
  {
    key: "lm",
    title: "Linear Model",
    desc: "Fit a linear regression",
    code: `set.seed(42)
n     <- 200
sqft  <- runif(n, 500, 3500)
rooms <- sample(1:5, n, replace = TRUE)
age   <- sample(1:40, n, replace = TRUE)
price <- 80000 + sqft * 120 + rooms * 8000 - age * 500 + rnorm(n) * 20000

model <- lm(price ~ sqft + rooms + age)
print(summary(model))

cat("\\nCoefficients:\\n")
print(round(coef(model), 2))
`,
  },
  {
    key: "plot_base",
    title: "Base R Plot",
    desc: "Histogram + scatter using plot()",
    code: `set.seed(0)
x <- rnorm(2000)

old <- par(mfrow = c(1, 2), bg = "#0f1117", fg = "#e2e8f0",
           col.axis = "#94a3b8", col.lab = "#94a3b8", col.main = "#e2e8f0")
hist(x, breaks = 40, col = "#4f8ef7", border = NA,
     main = "Normal Distribution", xlab = "x")

t <- seq(0, 4 * pi, length.out = 500)
plot(t, sin(t), type = "l", col = "#4f8ef7", lwd = 2,
     ylim = c(-1.2, 1.2), main = "Trig Functions",
     xlab = "t", ylab = "")
lines(t, cos(t),    col = "#34d399", lwd = 2)
lines(t, sin(2*t),  col = "#f59e0b", lwd = 2, lty = 2)
legend("topright", legend = c("sin", "cos", "sin 2x"),
       col = c("#4f8ef7", "#34d399", "#f59e0b"),
       lty = c(1, 1, 2), lwd = 2, bty = "n", text.col = "#e2e8f0")
par(old)
`,
  },
  {
    key: "stats",
    title: "Descriptive Stats",
    desc: "Vectors, matrices & summary()",
    code: `set.seed(99)
x <- rnorm(1000, mean = 50, sd = 10)

cat(strrep("=", 38), "\\n", sep = "")
cat("  Descriptive Statistics\\n")
cat(strrep("=", 38), "\\n", sep = "")
cat(sprintf("  Count  : %10d\\n", length(x)))
cat(sprintf("  Mean   : %10.4f\\n", mean(x)))
cat(sprintf("  Median : %10.4f\\n", median(x)))
cat(sprintf("  Std    : %10.4f\\n", sd(x)))
cat(sprintf("  Min    : %10.4f\\n", min(x)))
cat(sprintf("  Max    : %10.4f\\n", max(x)))
qs <- quantile(x, c(0.25, 0.75))
cat(sprintf("  P25    : %10.4f\\n", qs[1]))
cat(sprintf("  P75    : %10.4f\\n", qs[2]))
cat(strrep("=", 38), "\\n", sep = "")

# Matrix operations
A <- matrix(sample(1:8, 16, replace = TRUE), 4, 4)
B <- matrix(sample(1:8, 16, replace = TRUE), 4, 4)
cat("\\nA %*% B =\\n")
print(A %*% B)
cat("\\nDet(A) =", round(det(A), 4), "\\n")
cat("Eigenvalues(A) =", round(Re(eigen(A)$values), 3), "\\n")
`,
  },
  {
    key: "ggplot",
    title: "ggplot2",
    desc: "Scatter plot with ggplot2",
    code: `library(ggplot2)

set.seed(42)
n <- 80
df <- data.frame(
  x = runif(n, 0, 100),
  y = NA_real_,
  group = sample(c("Alpha", "Beta", "Gamma"), n, replace = TRUE)
)
df$y <- 2.5 * df$x + rnorm(n, sd = 15) + 30

ggplot(df, aes(x = x, y = y, colour = group)) +
  geom_point(size = 3, alpha = 0.8) +
  geom_smooth(method = "lm", se = FALSE, colour = "white",
              linetype = "dashed", linewidth = 0.6) +
  scale_colour_manual(values = c(Alpha = "#4f8ef7",
                                 Beta  = "#34d399",
                                 Gamma = "#f59e0b")) +
  labs(title = "Scatter with Trend Line", x = "X", y = "Y") +
  theme_minimal(base_size = 13) +
  theme(plot.background  = element_rect(fill = "#0f1117", colour = NA),
        panel.background = element_rect(fill = "#161b27", colour = NA),
        panel.grid       = element_line(colour = "#2a3347"),
        axis.text        = element_text(colour = "#94a3b8"),
        axis.title       = element_text(colour = "#e2e8f0"),
        plot.title       = element_text(colour = "#e2e8f0"),
        legend.text      = element_text(colour = "#94a3b8"),
        legend.title     = element_text(colour = "#e2e8f0"))
`,
  },
];

const PACKAGES: PackageInfo[] = [
  // Core
  { cat: "Base R", icon: "📚", color: "#4f8ef7", name: "base", ver: "4.4", desc: "Built-in functions: arithmetic, vectors, control flow, I/O" },
  { cat: "Base R", icon: "📊", color: "#4f8ef7", name: "stats", ver: "4.4", desc: "Statistical functions: lm, glm, t.test, distributions" },
  { cat: "Base R", icon: "📈", color: "#4f8ef7", name: "graphics", ver: "4.4", desc: "Base graphics: plot, hist, barplot, lines" },
  { cat: "Base R", icon: "🔧", color: "#4f8ef7", name: "utils", ver: "4.4", desc: "Utilities: head, tail, str, summary, install.packages" },
  // Tidyverse
  { cat: "Tidyverse", icon: "🧰", color: "#34d399", name: "tidyverse", ver: "2.0", desc: "Meta-package: ggplot2, dplyr, tidyr, readr, purrr, tibble, stringr" },
  { cat: "Tidyverse", icon: "📐", color: "#34d399", name: "dplyr", ver: "1.1", desc: "Grammar of data manipulation: filter, mutate, summarise, group_by" },
  { cat: "Tidyverse", icon: "🎨", color: "#34d399", name: "ggplot2", ver: "3.5", desc: "Declarative graphics — layered grammar of plots" },
  { cat: "Tidyverse", icon: "🧹", color: "#34d399", name: "tidyr", ver: "1.3", desc: "Reshape & tidy data: pivot_longer, pivot_wider, separate" },
  { cat: "Tidyverse", icon: "📥", color: "#34d399", name: "readr", ver: "2.1", desc: "Fast CSV/TSV reading with type inference" },
  // Data
  { cat: "Data & Tables", icon: "⚡", color: "#f59e0b", name: "data.table", ver: "1.15", desc: "Fast aggregations, joins, in-place modifications" },
  { cat: "Data & Tables", icon: "🗂️", color: "#f59e0b", name: "tibble", ver: "3.2", desc: "Modern reimagining of data.frame" },
  // Modelling
  { cat: "Modelling", icon: "🤖", color: "#a78bfa", name: "caret", ver: "6.0", desc: "Classification and regression training framework" },
  { cat: "Modelling", icon: "🌲", color: "#a78bfa", name: "randomForest", ver: "4.7", desc: "Breiman & Cutler's random forests for classification & regression" },
  { cat: "Modelling", icon: "🧮", color: "#a78bfa", name: "MASS", ver: "7.3", desc: "Modern Applied Statistics with S — rlm, lda, qda, mvrnorm" },
  // Visualization
  { cat: "Visualization", icon: "🌊", color: "#f472b6", name: "lattice", ver: "0.22", desc: "Trellis graphics — multi-panel conditioning plots" },
  { cat: "Visualization", icon: "🖼️", color: "#f472b6", name: "scales", ver: "1.3", desc: "Scaling helpers used throughout ggplot2" },
  // Strings & dates
  { cat: "Strings & Dates", icon: "🔤", color: "#60a5fa", name: "stringr", ver: "1.5", desc: "Consistent, simple wrappers for string operations" },
  { cat: "Strings & Dates", icon: "🗓️", color: "#60a5fa", name: "lubridate", ver: "1.9", desc: "Make working with dates and times easier" },
  // I/O
  { cat: "I/O & Formats", icon: "📋", color: "#fbbf24", name: "jsonlite", ver: "1.8", desc: "JSON parser and generator optimised for statistical data" },
  { cat: "I/O & Formats", icon: "📄", color: "#fbbf24", name: "yaml", ver: "2.3", desc: "Read and write YAML files" },
];

/** Render an R object (returned by captureR.result) as either an HTML table
 *  (data.frame-like) or a stringified value. */
function dataFrameToHtml(rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const cols = Object.keys(rows[0] ?? {});
  if (cols.length === 0) return null;
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };
  const head = cols.map((c) => `<th>${escape(c)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${cols.map((c) => `<td>${escape(r[c])}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table class="dataframe"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Convert a column-major R data.frame (the shape `toJs()` returns for a
 *  data.frame) into row-major rows. Returns null if the shape doesn't look
 *  like a data.frame. */
function rowsFromDataFrame(value: unknown): Record<string, unknown>[] | null {
  if (!value || typeof value !== "object") return null;
  // toJs() on a data.frame returns { type: 'list', names: [...], values: [Array, Array, ...] }
  const v = value as { type?: string; names?: unknown; values?: unknown };
  if (v.type !== "list") return null;
  if (!Array.isArray(v.names) || !Array.isArray(v.values)) return null;
  const names = v.names as string[];
  const cols = v.values as unknown[];
  if (cols.length === 0 || cols.length !== names.length) return null;
  // Each column should be an array (or { values: [...] }) of equal length.
  const arrays: unknown[][] = cols.map((c) => {
    if (Array.isArray(c)) return c as unknown[];
    if (c && typeof c === "object" && Array.isArray((c as { values?: unknown }).values)) {
      return (c as { values: unknown[] }).values;
    }
    return [c];
  });
  const len = arrays[0].length;
  if (!arrays.every((a) => a.length === len)) return null;
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < len; i++) {
    const row: Record<string, unknown> = {};
    for (let j = 0; j < names.length; j++) {
      row[names[j]] = arrays[j][i];
    }
    rows.push(row);
  }
  return rows;
}

async function imageBitmapToPngBase64(bmp: ImageBitmap): Promise<string> {
  // Render to an offscreen canvas → PNG → base64
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  ctx.drawImage(bmp, 0, 0);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) throw new Error("Failed to encode plot as PNG");
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Base R packages that ship with WebR — never need to be installed. */
const R_BUILTIN_PACKAGES = new Set([
  "base", "compiler", "datasets", "graphics", "grDevices", "grid",
  "methods", "parallel", "splines", "stats", "stats4", "tcltk",
  "tools", "utils", "translations",
]);

/** Best-effort scan for `library(pkg)` / `require(pkg)` /
 *  `requireNamespace("pkg")` calls so we can preinstall packages from the
 *  WebR repository before executing user code. Strips comments first so
 *  commented-out calls are ignored. */
function extractLibraryCalls(code: string): string[] {
  const stripped = code
    .split("\n")
    .map((line) => {
      // Remove anything after an unescaped `#` (R comment). This is a
      // heuristic that ignores `#` inside strings, which is acceptable for
      // package detection — false positives are filtered by name validity
      // below and false negatives just fall through to the original error.
      const idx = line.indexOf("#");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");

  const re =
    /\b(?:library|require|requireNamespace|loadNamespace)\s*\(\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z_.][A-Za-z0-9_.]*))/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const name = m[1] ?? m[2] ?? m[3];
    if (!name) continue;
    if (!/^[A-Za-z][A-Za-z0-9_.]*$/.test(name)) continue;
    if (R_BUILTIN_PACKAGES.has(name)) continue;
    found.add(name);
  }
  return [...found];
}

class WebRRuntime implements LanguageRuntime {
  /** Packages we've already installed (or attempted to install) so we
   *  don't pay the round-trip on every Run click. */
  private readonly installedPackages = new Set<string>();

  constructor(private webR: WebRInstance) {}

  /** Install any WebR packages referenced by `library(...)` / `require(...)`
   *  in `code` that we haven't already installed. Errors are non-fatal — we
   *  let the user's code surface the underlying load error. Returns any
   *  warning text to surface as stderr. */
  private async ensurePackages(code: string): Promise<string> {
    const referenced = extractLibraryCalls(code);
    const toInstall = referenced.filter((p) => !this.installedPackages.has(p));
    if (toInstall.length === 0) return "";
    // Optimistically mark as installed so failures don't retry every run.
    for (const p of toInstall) this.installedPackages.add(p);
    try {
      await this.webR.installPackages(toInstall);
      return "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Failed to auto-install R package(s) [${toInstall.join(", ")}]: ${msg}\n`;
    }
  }

  async run(code: string, emit: EmitOutput): Promise<void> {
    const installWarnings = await this.ensurePackages(code);

    const shelter: WebRShelter = await new this.webR.Shelter();
    try {
      const result = await shelter.captureR(code, {
        captureGraphics: { width: 720, height: 432 },
      });

      // Stream stdout / stderr (output is in the order it was produced).
      let stdoutBuf = "";
      let stderrBuf = installWarnings;
      for (const o of result.output) {
        if (o.type === "stdout") stdoutBuf += o.data + "\n";
        else if (o.type === "stderr") stderrBuf += o.data + "\n";
      }
      if (stdoutBuf.trim()) emit({ type: "stdout", content: stdoutBuf.trim() });
      if (stderrBuf.trim()) emit({ type: "stderr", content: stderrBuf.trim() });

      // Render captured graphics
      for (const bmp of result.images) {
        const b64 = await imageBitmapToPngBase64(bmp);
        emit({ type: "image", content: b64 });
        bmp.close();
      }

      // If the top-level value is a data.frame, render it as an HTML table.
      if (result.result && result.result.type === "list") {
        try {
          const js = await result.result.toJs();
          const rows = rowsFromDataFrame(js);
          if (rows) {
            const html = dataFrameToHtml(rows);
            if (html) emit({ type: "html", content: html });
          }
        } catch {
          /* not convertible — ignore */
        }
      }
    } finally {
      await shelter.purge();
    }
  }
}

export const rAdapter: LanguageAdapter = {
  id: "r",
  displayName: "R Playground",
  logoText: "R",
  documentTitle: "R Playground",
  readyStatus: "R 4.4 ready",
  codeMirrorMode: "r",
  // CodeMirror is the same bundle Python uses; WebR loads via inline ESM
  // import so it doesn't need to appear in `scripts`.
  scripts: CODEMIRROR_SCRIPTS,
  stylesheets: CODEMIRROR_STYLES,
  examples: EXAMPLES,
  packages: PACKAGES,
  packagesFooter: (
    <>
      Packages run in WebAssembly via{" "}
      <a href="https://docs.r-wasm.org/webr/latest/" target="_blank" rel="noreferrer">
        WebR
      </a>
      . Use{" "}
      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
        webr::install(&apos;pkg&apos;)
      </code>{" "}
      from the R console to add more packages.
    </>
  ),
  importSnippet: (name) => `library(${name})`,
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Loading WebR…");
    await loadWebRModule();
    if (!window.__WebR) {
      throw new Error("WebR module loaded but constructor missing");
    }

    setLoadingMessage("Initialising R runtime…");
    const webR: WebRInstance = new window.__WebR();
    await webR.init();

    setLoadingMessage("Configuring graphics device…");
    // Enable the canvas graphics device so plot() / ggplot output is captured.
    await webR.evalRVoid(
      `options(device = function() webr::canvas(width = 720, height = 432, capture = TRUE))`,
    );

    return new WebRRuntime(webR);
  },
};
