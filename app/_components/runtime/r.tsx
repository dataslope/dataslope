// Shared with scripts/check-r-blocks.mjs so the sweep installs exactly the
// packages a reader's session installs.
import { extractLibraryCalls } from "./rPackages";
import type {
  CompletionListItem,
  CompletionRequest,
  CompletionResult,
  EmitOutput,
  ExampleSnippet,
  LanguageAdapter,
  LanguageRuntime,
  PackageInfo,
  RunOptions,
} from "../types";

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
    key: "read_csv_url",
    title: "Read CSV from URL",
    desc: "Download a remote CSV & read it",
    code: `# raw.githubusercontent.com sends permissive CORS headers, so the file can be
# downloaded directly (no proxy needed). The download also shows up in the
# Files pane on the left.
url <- "https://raw.githubusercontent.com/mwaskom/seaborn-data/master/penguins.csv"
download.file(url, "penguins.csv")

penguins <- read.csv("penguins.csv")

cat(nrow(penguins), "rows x", ncol(penguins), "columns\\n\\n")
cat("Penguins per species:\\n")
print(table(penguins$species))

# A returned data.frame renders as a table.
head(penguins)
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

ggplot(df, aes(x = x, y = y, color = group)) +
  geom_point(size = 3, alpha = 0.8) +
  geom_smooth(method = "lm", se = FALSE, color = "white",
              linetype = "dashed", linewidth = 0.6) +
  scale_color_manual(values = c(Alpha = "#4f8ef7",
                                 Beta  = "#34d399",
                                 Gamma = "#f59e0b")) +
  labs(title = "Scatter with Trend Line", x = "X", y = "Y") +
  theme_minimal(base_size = 13) +
  theme(plot.background  = element_rect(fill = "#0f1117", color = NA),
        panel.background = element_rect(fill = "#161b27", color = NA),
        panel.grid       = element_line(color = "#2a3347"),
        axis.text        = element_text(color = "#94a3b8"),
        axis.title       = element_text(color = "#e2e8f0"),
        plot.title       = element_text(color = "#e2e8f0"),
        legend.text      = element_text(color = "#94a3b8"),
        legend.title     = element_text(color = "#e2e8f0"))
`,
  },
  {
    key: "dplyr_pipeline",
    title: "dplyr Pipeline",
    desc: "filter, mutate, group_by, summarise",
    code: `library(dplyr)

set.seed(1)
sales <- data.frame(
  region   = sample(c("North", "South", "East", "West"), 200, replace = TRUE),
  product  = sample(c("Widget A", "Widget B", "Widget C"), 200, replace = TRUE),
  units    = sample(1:50, 200, replace = TRUE),
  price    = round(runif(200, 5, 80), 2)
)

summary_tbl <- sales |>
  mutate(revenue = units * price) |>
  filter(revenue > 100) |>
  group_by(region, product) |>
  summarise(
    orders        = n(),
    total_units   = sum(units),
    total_revenue = round(sum(revenue), 2),
    avg_price     = round(mean(price), 2),
    .groups       = "drop"
  ) |>
  arrange(desc(total_revenue))

print(summary_tbl, n = 12)
`,
  },
  {
    key: "tidyr_pivot",
    title: "tidyr Pivot",
    desc: "pivot_longer / pivot_wider",
    code: `library(tidyr)
library(dplyr)

wide <- tibble(
  city = c("NYC", "SF", "LA", "CHI"),
  Jan  = c(34, 52, 65, 28),
  Feb  = c(36, 55, 66, 30),
  Mar  = c(45, 58, 70, 38),
  Apr  = c(55, 60, 73, 50)
)

cat("Wide format:\\n")
print(wide)

long <- wide |>
  pivot_longer(cols = Jan:Apr, names_to = "month", values_to = "temp_f")

cat("\\nLong format (first 10 rows):\\n")
print(head(long, 10))

cat("\\nMonthly average across cities:\\n")
long |>
  group_by(month) |>
  summarise(avg_temp = mean(temp_f), .groups = "drop") |>
  print()

cat("\\nBack to wide via pivot_wider:\\n")
long |>
  pivot_wider(names_from = month, values_from = temp_f) |>
  print()
`,
  },
  {
    key: "ggplot_bar",
    title: "ggplot2 Bar Chart",
    desc: "Grouped bars with facets",
    code: `library(ggplot2)
library(dplyr)
library(tidyr)

set.seed(7)
quarters <- c("Q1", "Q2", "Q3", "Q4")
df <- expand_grid(
  quarter = factor(quarters, levels = quarters),
  region  = c("North", "South", "East", "West")
) |>
  mutate(revenue = round(runif(n(), 30, 90), 0))

ggplot(df, aes(x = quarter, y = revenue, fill = region)) +
  geom_col(position = position_dodge(width = 0.8), width = 0.75) +
  scale_fill_manual(values = c(North = "#4f8ef7",
                               South = "#34d399",
                               East  = "#f59e0b",
                               West  = "#f472b6")) +
  labs(title = "Regional Revenue by Quarter ($M)",
       x = "Quarter", y = "Revenue ($M)") +
  theme_minimal(base_size = 13) +
  theme(plot.background  = element_rect(fill = "#0f1117", color = NA),
        panel.background = element_rect(fill = "#161b27", color = NA),
        panel.grid.major = element_line(color = "#2a3347"),
        panel.grid.minor = element_blank(),
        axis.text        = element_text(color = "#94a3b8"),
        axis.title       = element_text(color = "#e2e8f0"),
        plot.title       = element_text(color = "#e2e8f0"),
        legend.text      = element_text(color = "#94a3b8"),
        legend.title     = element_text(color = "#e2e8f0"))
`,
  },
  {
    key: "stringr_lubridate",
    title: "stringr & lubridate",
    desc: "String and date helpers",
    code: `library(stringr)
library(lubridate)
library(dplyr)

logs <- tibble(
  raw = c(
    "2024-01-15 09:42:01 INFO  user=alice action=login",
    "2024-01-15 09:43:18 WARN  user=bob   action=retry",
    "2024-02-02 14:08:55 ERROR user=carol action=upload",
    "2024-02-19 22:01:09 INFO  user=dave  action=logout",
    "2024-03-04 06:30:44 ERROR user=eve   action=upload"
  )
)

parsed <- logs |>
  mutate(
    timestamp = ymd_hms(str_extract(raw, "^\\\\S+ \\\\S+")),
    level     = str_extract(raw, "INFO|WARN|ERROR"),
    user      = str_match(raw, "user=(\\\\S+)")[, 2],
    action    = str_match(raw, "action=(\\\\S+)")[, 2],
    weekday   = wday(timestamp, label = TRUE, abbr = FALSE),
    month     = month(timestamp, label = TRUE, abbr = FALSE)
  ) |>
  select(timestamp, weekday, month, level, user, action)

print(parsed)

cat("\\nCounts by level:\\n")
parsed |> count(level) |> print()
`,
  },
  {
    key: "multifile",
    title: "Multi-file Project",
    desc: "Source a helper script alongside main.r",
    code: `source("greetings.r")

cat(hello("R Playground"), "\\n")
cat(bye("R Playground"), "\\n")
`,
    files: [
      {
        filename: "greetings.r",
        content: `hello <- function(name) {
  paste0("Hello, ", name, "!")
}

bye <- function(name) {
  paste0("Goodbye, ", name, "!")
}
`,
      },
    ],
    entryFilename: "main.r",
  },
];

const PACKAGES: PackageInfo[] = [
  // Base R packages (auto-loaded, no library() call) are omitted.
  // Tidyverse
  {
    cat: "Tidyverse", icon: "🧰", color: "#34d399", name: "tidyverse", ver: "2.0",
    desc: "Meta-package: ggplot2, dplyr, tidyr, readr, purrr, tibble, stringr",
    example: `library(tidyverse)

mtcars |>
  as_tibble(rownames = "model") |>
  filter(cyl == 6) |>
  select(model, mpg, hp, wt) |>
  arrange(desc(mpg))
`,
  },
  {
    cat: "Tidyverse", icon: "📐", color: "#34d399", name: "dplyr", ver: "1.1",
    desc: "Grammar of data manipulation: filter, mutate, summarise, group_by",
    example: `library(dplyr)

mtcars |>
  group_by(cyl) |>
  summarise(mean_mpg = mean(mpg), n = n()) |>
  arrange(cyl)
`,
  },
  {
    cat: "Tidyverse", icon: "🎨", color: "#34d399", name: "ggplot2", ver: "3.5",
    desc: "Declarative graphics, layered grammar of plots",
    example: `library(ggplot2)

ggplot(mtcars, aes(x = wt, y = mpg, color = factor(cyl))) +
  geom_point(size = 2.5) +
  geom_smooth(method = "lm", se = FALSE) +
  labs(title = "MPG vs. Weight", color = "Cylinders")
`,
  },
  {
    cat: "Tidyverse", icon: "🧹", color: "#34d399", name: "tidyr", ver: "1.3",
    desc: "Reshape & tidy data: pivot_longer, pivot_wider, separate",
    example: `library(tidyr)
library(dplyr)

wide <- tibble(id = 1:3, jan = c(10, 20, 30), feb = c(15, 25, 35))
long <- wide |> pivot_longer(c(jan, feb), names_to = "month", values_to = "value")
print(long)
`,
  },
  {
    cat: "Tidyverse", icon: "📥", color: "#34d399", name: "readr", ver: "2.1",
    desc: "Fast CSV/TSV reading with type inference",
    example: `library(readr)

csv <- "name,age\\nAda,36\\nLinus,54\\nGrace,40\\n"
df <- read_csv(csv, show_col_types = FALSE)
print(df)
`,
  },
  // Data
  {
    cat: "Data & Tables", icon: "⚡", color: "#f59e0b", name: "data.table", ver: "1.15",
    desc: "Fast aggregations, joins, in-place modifications",
    example: `library(data.table)

dt <- as.data.table(mtcars, keep.rownames = "model")
dt[cyl == 6, .(model, mpg, hp)][order(-mpg)]
`,
  },
  {
    cat: "Data & Tables", icon: "🗂️", color: "#f59e0b", name: "tibble", ver: "3.2",
    desc: "Modern reimagining of data.frame",
    example: `library(tibble)

t <- tibble(
  name  = c("Ada", "Linus", "Grace"),
  age   = c(36, 54, 40),
  team  = c("A", "B", "A"),
)
print(t)
`,
  },
  // Modelling
  {
    cat: "Modelling", icon: "🤖", color: "#a78bfa", name: "caret", ver: "6.0",
    desc: "Classification and regression training framework",
    example: `library(caret)

set.seed(1)
idx <- createDataPartition(iris$Species, p = 0.7, list = FALSE)
train <- iris[idx, ]; test <- iris[-idx, ]
fit <- train(Species ~ ., data = train, method = "rpart")
print(confusionMatrix(predict(fit, test), test$Species)$overall["Accuracy"])
`,
  },
  {
    cat: "Modelling", icon: "🌲", color: "#a78bfa", name: "randomForest", ver: "4.7",
    desc: "Breiman & Cutler's random forests for classification & regression",
    example: `library(randomForest)

set.seed(1)
fit <- randomForest(Species ~ ., data = iris, ntree = 50)
print(fit)
`,
  },
  {
    cat: "Modelling", icon: "🧮", color: "#a78bfa", name: "MASS", ver: "7.3",
    desc: "Modern Applied Statistics with S, rlm, lda, qda, mvrnorm",
    example: `library(MASS)

fit <- rlm(stack.loss ~ ., data = stackloss)
print(summary(fit)$coefficients)
`,
  },
  // Visualization
  {
    cat: "Visualization", icon: "🌊", color: "#f472b6", name: "lattice", ver: "0.22",
    desc: "Trellis graphics, multi-panel conditioning plots",
    example: `library(lattice)

xyplot(mpg ~ wt | factor(cyl), data = mtcars,
       layout = c(3, 1),
       main = "MPG vs. Weight by Cylinders")
`,
  },
  {
    cat: "Visualization", icon: "🖼️", color: "#f472b6", name: "scales", ver: "1.3",
    desc: "Scaling helpers used throughout ggplot2",
    example: `library(scales)

cat("currency: ", dollar(c(1.5, 12, 12345.67)), "\\n")
cat("percent:  ", percent(c(0.05, 0.25, 0.872)), "\\n")
cat("number:   ", comma(1234567), "\\n")
`,
  },
  // Strings & dates
  {
    cat: "Strings & Dates", icon: "🔤", color: "#60a5fa", name: "stringr", ver: "1.5",
    desc: "Consistent, simple wrappers for string operations",
    example: `library(stringr)

s <- c("Ada Lovelace", "Linus Torvalds", "Grace Hopper")
str_to_upper(s)
str_extract(s, "^[A-Z][a-z]+")
str_length(s)
`,
  },
  {
    cat: "Strings & Dates", icon: "🗓️", color: "#60a5fa", name: "lubridate", ver: "1.9",
    desc: "Make working with dates and times easier",
    example: `library(lubridate)

d <- ymd("2024-05-12") + months(3) + days(10)
cat("date:    ", format(d), "\\n")
cat("weekday: ", wday(d, label = TRUE), "\\n")
`,
  },
  // I/O
  {
    cat: "I/O & Formats", icon: "📋", color: "#fbbf24", name: "jsonlite", ver: "1.8",
    desc: "JSON parser and generator optimised for statistical data",
    example: `library(jsonlite)

json <- toJSON(list(name = "Ada", skills = c("math", "code"), age = 36),
               pretty = TRUE, auto_unbox = TRUE)
cat(json)
cat("\\nparsed: \\n")
print(fromJSON(json))
`,
  },
  {
    cat: "I/O & Formats", icon: "📄", color: "#fbbf24", name: "yaml", ver: "2.3",
    desc: "Read and write YAML files",
    example: `library(yaml)

text <- "name: Ada\\nskills:\\n  - math\\n  - code\\n"
data <- yaml.load(text)
print(data)
cat("\\nre-emitted:\\n")
cat(as.yaml(data))
`,
  },
];

// ─── WebR type shims ─────────────────────────────────────────────────────
// Minimal shims so we don't need to import from "webr" directly; webr's
// published types reference DOM globals that can conflict with tsconfig.

interface RObjectProxy {
  type(): Promise<string>;
  toJs(): Promise<unknown>;
}
interface CaptureROutput {
  type: string;
  data: unknown;
}
interface CaptureRResult {
  output: CaptureROutput[];
  images: ImageBitmap[];
  result: RObjectProxy;
}
interface ShelterInstance {
  captureR(
    code: string,
    options: { withAutoprint: boolean; captureGraphics: { width: number; height: number } },
  ): Promise<CaptureRResult>;
  purge(): Promise<void>;
}
interface WebRShelterConstructor {
  new (): Promise<ShelterInstance>;
}
interface WebRFS {
  writeFile(path: string, data: Uint8Array): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  mkdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
}
interface WebRInstance {
  Shelter: WebRShelterConstructor;
  FS: WebRFS;
  init(): Promise<void>;
  evalRVoid(code: string): Promise<void>;
  evalRString(code: string): Promise<string>;
  installPackages(pkgs: string[]): Promise<void>;
  /** Shuts down the webR session and terminates its worker. */
  close(): Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function imageBitmapToPngBase64(bmp: ImageBitmap): Promise<string> {
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  ctx.drawImage(bmp, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Row-display limits mirroring tibble print defaults: over MAX rows, show
// HEAD + ellipsis + TAIL with a total-count footer.
const R_MAX_DISPLAY_ROWS = 20;
const R_HEAD_ROWS = 10;
const R_TAIL_ROWS = 5;
// Column-display limits (Jupyter/pandas-style): HEAD + ellipsis + TAIL.
const R_MAX_DISPLAY_COLS = 20;
const R_HEAD_COLS = 10;
const R_TAIL_COLS = 10;

function dataFrameToHtml(rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const allCols = Object.keys(rows[0] ?? {});
  if (allCols.length === 0) return null;
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const totalRows = rows.length;
  const totalCols = allCols.length;
  const rowsTruncated = totalRows > R_MAX_DISPLAY_ROWS;
  const colsTruncated = totalCols > R_MAX_DISPLAY_COLS;

  // Columns to render: real names or null (= the "⋯" marker column).
  type DisplayCol = string | null;
  const displayCols: DisplayCol[] = colsTruncated
    ? [
        ...allCols.slice(0, R_HEAD_COLS),
        null,
        ...allCols.slice(totalCols - R_TAIL_COLS),
      ]
    : allCols;

  const head = displayCols
    .map((c) =>
      c === null
        ? '<th class="dataframe-ellipsis-col">&#x22EF;</th>'
        : `<th>${escape(c)}</th>`,
    )
    .join("");

  // Rows to render: real rows or null (= ellipsis row).
  type DisplayRow = Record<string, unknown> | null;
  const displayRows: DisplayRow[] = rowsTruncated
    ? [
        ...rows.slice(0, R_HEAD_ROWS),
        null,
        ...rows.slice(totalRows - R_TAIL_ROWS),
      ]
    : rows;

  const body = displayRows
    .map((r) => {
      if (r === null) {
        return `<tr class="dataframe-ellipsis-row">${displayCols
          .map(() => "<td>&#x22EF;</td>")
          .join("")}</tr>`;
      }
      return `<tr>${displayCols
        .map((c) =>
          c === null
            ? '<td class="dataframe-ellipsis-col">&#x22EF;</td>'
            : `<td>${escape(r[c])}</td>`,
        )
        .join("")}</tr>`;
    })
    .join("");

  const footerParts: string[] = [];
  if (rowsTruncated) {
    footerParts.push(`${R_HEAD_ROWS + R_TAIL_ROWS} of ${totalRows} rows`);
  }
  if (colsTruncated) {
    footerParts.push(`${R_HEAD_COLS + R_TAIL_COLS} of ${totalCols} columns`);
  }
  const footer =
    footerParts.length > 0
      ? `<tfoot><tr><td colspan="${displayCols.length}" class="dataframe-rows-footer">` +
        `Showing ${footerParts.join(" · ")}` +
        `</td></tr></tfoot>`
      : "";

  return `<table class="dataframe"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${footer}</table>`;
}

function rowsFromDataFrame(value: unknown): Record<string, unknown>[] | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { type?: string; names?: unknown; values?: unknown };
  if (v.type !== "list") return null;
  if (!Array.isArray(v.names) || !Array.isArray(v.values)) return null;
  const names = v.names as string[];
  const cols = v.values as unknown[];
  if (cols.length === 0 || cols.length !== names.length) return null;
  const arrays: unknown[][] = cols.map((c) => {
    if (Array.isArray(c)) return c as unknown[];
    if (
      c &&
      typeof c === "object" &&
      Array.isArray((c as { values?: unknown }).values)
    ) {
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

// ─── Runtime ─────────────────────────────────────────────────────────────

// WebR manages its own dedicated internal worker; calling it from the main
// thread is already non-blocking. No outer wrapper worker is needed.

// Working directory inside the WebR Emscripten FS (matches `getwd()` output).
const WEB_USER_HOME = "/home/web_user";

// Newline-separated absolute paths created during a run (download.file()
// destinations), read back by collectCreatedFiles() then cleared.
const CREATED_FILES_PATH = "/tmp/.pg_created_files";

// One-time R setup, kept on the search path so it survives the per-run wipe
// of the global environment. 1. download.file() is wrapped to mirror the
// destination into the Files pane and print progress to stdout (stderr is
// styled as an error); CORS still applies. 2. print() is overridden (a
// search-path lookup, not an S3 method) to truncate plain data.frames;
// tibbles/data.tables keep their own truncating print methods.
const R_SESSION_SETUP = String.raw`
suppressWarnings(dir.create("/tmp", showWarnings = FALSE))

local({
  download_file <- function(url, destfile,
                            method = getOption("download.file.method", "auto"),
                            quiet = FALSE, ...) {
    # Mirror R's familiar progress lines to stdout instead of stderr. The
    # playground styles any stderr output as an error, which made a successful
    # download look like it had failed. download.file's own messages are
    # silenced with quiet = TRUE and re-emitted here via cat().
    if (!isTRUE(quiet)) cat(sprintf("trying URL '%s'\n", url))
    status <- utils::download.file(url, destfile, method = method, quiet = TRUE, ...)
    if (is.character(destfile) && length(destfile) == 1L && nzchar(destfile) &&
        file.exists(destfile)) {
      abs <- if (startsWith(destfile, "/")) destfile else file.path(getwd(), destfile)
      try(cat(abs, "\n", sep = "", file = "/tmp/.pg_created_files", append = TRUE),
          silent = TRUE)
      if (!isTRUE(quiet)) {
        size <- file.info(destfile)$size
        cat(sprintf("downloaded %s bytes\n",
                    format(size, big.mark = ",", scientific = FALSE)))
      }
    }
    invisible(status)
  }

  print_override <- function(x, ...) {
    # Only plain data.frames (e.g. from read.csv / data.frame). tibbles,
    # data.tables, etc. keep their own already-truncating print methods.
    if (identical(class(x), "data.frame")) {
      n <- nrow(x)
      if (is.finite(n) && n > 20L && ncol(x) >= 1L) {
        done <- tryCatch({
          head_n <- 10L; tail_n <- 5L
          top <- format(utils::head(x, head_n))
          bot <- format(utils::tail(x, tail_n))
          sep <- top[1, , drop = FALSE]; sep[] <- "..."; rownames(sep) <- "..."
          block <- as.matrix(rbind(top, sep, bot))
          base::print(block, quote = FALSE, right = TRUE)
          cat(sprintf("# %s rows total; showing first %d and last %d\n",
                      format(n, big.mark = ","), head_n, tail_n))
          TRUE
        }, error = function(e) FALSE)
        if (isTRUE(done)) return(invisible(x))
      }
    }
    base::print(x, ...)
  }

  while ("webr:playground" %in% search()) detach("webr:playground")
  attach(list(download.file = download_file, print = print_override),
         name = "webr:playground", warn.conflicts = FALSE)
})
`;

// Backstop against a run flooding the UI with megabytes of text; keeps head
// and tail. Data frames are truncated more nicely by the print override.
const MAX_CELL_TEXT_CHARS = 250_000;
function capCellText(text: string): string {
  if (text.length <= MAX_CELL_TEXT_CHARS) return text;
  const headLen = Math.floor(MAX_CELL_TEXT_CHARS * 0.75);
  const tailLen = MAX_CELL_TEXT_CHARS - headLen;
  const head = text.slice(0, headLen);
  const tail = text.slice(text.length - tailLen);
  const hidden = text.length - head.length - tail.length;
  return `${head}\n\n… ${hidden.toLocaleString()} characters of output hidden …\n\n${tail}`;
}

class WebRRuntime implements LanguageRuntime {
  private installedPackages = new Set<string>();
  // Absolute FS paths written during the previous prepareFileSystem call.
  // Used to remove stale files when tabs are renamed or deleted.
  private stagedPaths = new Set<string>();
  // One-time `rc.settings` setup for the completion engine; false when
  // it failed (completions then stay empty for the session).
  private completionSetup: Promise<boolean> | null = null;

  constructor(private webR: WebRInstance) {}

  /** Shut the webR session down (registry-eviction hook; unusable after).
   *  Also un-registers from the styler formatter so a later Format click
   *  starts fresh instead of talking to a dead session. */
  dispose(): void {
    releaseFormatterSession(this.webR);
    void this.webR.close().catch(() => {});
  }

  // ─── Autocomplete via R's own completion engine ───────────────────────
  // Uses the readline completion engine in `utils` (zero extra download),
  // mirroring the official webR REPL's CodeMirror wiring.

  private ensureCompletionSetup(): Promise<boolean> {
    if (!this.completionSetup) {
      this.completionSetup = this.webR
        .evalRVoid(
          // func = TRUE appends "(" to function completions (how we know a
          // completion IS a function); CodeMirror does its own fuzzy filtering.
          "utils::rc.settings(ops = TRUE, ns = TRUE, args = TRUE, func = TRUE, fuzzy = FALSE)",
        )
        .then(
          () => true,
          () => false,
        );
    }
    return this.completionSetup;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const empty: CompletionResult = { list: [], replaceLength: 0 };
    if (!(await this.ensureCompletionSetup())) return empty;

    const lineToCursor = request.line.slice(0, request.column);
    if (!lineToCursor.trim() && !request.explicit) return empty;

    // Drive the engine like R's own console; results join on a separator no
    // completion can contain. JSON.stringify escaping is also valid in an R
    // string literal, so the user's line never breaks the R code.
    const rCode = `local({
  lb <- ${JSON.stringify(lineToCursor)}
  utils:::.assignLinebuffer(lb)
  utils:::.assignEnd(nchar(lb))
  token <- utils:::.guessTokenFromLine()
  utils:::.completeToken()
  comps <- utils:::.retrieveCompletions()
  paste(c(token, comps), collapse = "\\x1f")
})`;

    let raw: string;
    try {
      raw = await this.webR.evalRString(rCode);
    } catch {
      return empty;
    }

    const parts = raw.split("\x1f");
    const token = parts[0] ?? "";
    if (!token && !request.explicit) return empty;

    // R annotates completions by suffix: `name=` is a function
    // argument, `name(` a function, `pkg::` a namespace.
    const byLabel = new Map<string, CompletionListItem>();
    for (const comp of parts.slice(1)) {
      if (!comp) continue;
      let item: CompletionListItem;
      if (comp.endsWith("=")) {
        item = { label: comp, type: "variable", detail: "argument", boost: 5 };
      } else if (comp.endsWith("(")) {
        item = { label: comp.slice(0, -1), type: "function" };
      } else if (comp.endsWith("::")) {
        item = { label: comp, type: "namespace" };
      } else {
        item = { label: comp, type: "variable" };
      }
      const label = typeof item === "string" ? item : item.label;
      if (!byLabel.has(label)) byLabel.set(label, item);
    }

    return { list: [...byLabel.values()], replaceLength: token.length };
  }

  private joinStagedPath(relPath: string): string {
    const trimmed = relPath.replace(/^\/+/, "");
    if (!trimmed) throw new Error("Invalid empty file path");
    return `${WEB_USER_HOME}/${trimmed}`;
  }

  private async ensureParentDirs(absFilePath: string): Promise<void> {
    const idx = absFilePath.lastIndexOf("/");
    if (idx < 0) return;
    const parent = absFilePath.slice(0, idx);
    const parts = parent.split("/").filter(Boolean);
    let cur = "";
    for (const part of parts) {
      cur += `/${part}`;
      try {
        await this.webR.FS.mkdir(cur);
      } catch {
        // Directory already exists, ignore.
      }
    }
  }

  async prepareFileSystem(files: Map<string, Uint8Array>): Promise<void> {
    const fs = this.webR.FS;
    const nextPaths = new Set<string>();

    for (const [relPath, bytes] of files) {
      const abs = this.joinStagedPath(relPath);
      nextPaths.add(abs);
      await this.ensureParentDirs(abs);
      try {
        await fs.writeFile(abs, bytes);
      } catch (err) {
        throw new Error(
          `Failed to write ${relPath}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Remove previously staged files so UI renames/deletes propagate.
    for (const prev of this.stagedPaths) {
      if (!nextPaths.has(prev)) {
        try {
          await fs.unlink(prev);
        } catch {
          /* file may already be gone -- ignore */
        }
      }
    }
    this.stagedPaths.clear();
    for (const p of nextPaths) this.stagedPaths.add(p);
  }

  private async ensurePackages(
    code: string,
    onStatus?: RunOptions["onStatus"],
  ): Promise<string> {
    const referenced = extractLibraryCalls(code);
    const toInstall = referenced.filter((p) => !this.installedPackages.has(p));
    if (toInstall.length === 0) return "";
    for (const p of toInstall) this.installedPackages.add(p);
    // Surface the boot notice during the download (debounced upstream).
    const label = `Installing R package${toInstall.length > 1 ? "s" : ""}: ${toInstall.join(", ")}…`;
    onStatus?.(label, true);
    try {
      await this.webR.installPackages(toInstall);
      return "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Failed to auto-install R package(s) [${toInstall.join(", ")}]: ${msg}\n`;
    } finally {
      onStatus?.("Running…", false);
    }
  }

  async run(
    code: string,
    emit: EmitOutput,
    options?: RunOptions,
  ): Promise<void> {
    const installWarnings = await this.ensurePackages(code, options?.onStatus);

    await this.webR.evalRVoid(
      `rm(list = ls(envir = .GlobalEnv, all.names = TRUE), envir = .GlobalEnv)
unlink("${CREATED_FILES_PATH}")`,
    );

    const shelter: ShelterInstance = await new this.webR.Shelter();
    try {
      // User code goes in via a VFS temp file so it never needs escaping.
      const tmpPath = `${WEB_USER_HOME}/.pg_run_code.R`;
      await this.webR.FS.writeFile(tmpPath, new TextEncoder().encode(code));

      // withVisible() tells us whether the last expression should produce
      // output without letting R auto-print it (which would dump every row
      // of a large frame). Results are stored in .GlobalEnv for later calls.
      const result = await shelter.captureR(
        `.pg_vr <- withVisible(eval(parse(file = "${tmpPath}"), envir = .GlobalEnv))
.pg_last_visible <- .pg_vr$visible
.pg_last_result  <- .pg_vr$value
.pg_vr$value`,
        { withAutoprint: false, captureGraphics: { width: 720, height: 432 } },
      );

      let stdoutBuf = "";
      let stderrBuf = installWarnings;
      for (const o of result.output) {
        if (o.type === "stdout") stdoutBuf += String(o.data) + "\n";
        else if (o.type === "stderr") stderrBuf += String(o.data) + "\n";
      }
      if (stdoutBuf.trim())
        emit({ type: "stdout", content: capCellText(stdoutBuf.trim()) });
      if (stderrBuf.trim())
        emit({ type: "stderr", content: capCellText(stderrBuf.trim()) });

      for (const bmp of result.images) {
        const b64 = await imageBitmapToPngBase64(bmp);
        emit({ type: "image", content: b64 });
        bmp.close();
      }

      // Determine whether the last expression would have auto-printed.
      let visible = false;
      try {
        const visCapture = await shelter.captureR(
          `cat(as.character(.pg_last_visible), "\n")`,
          { withAutoprint: false, captureGraphics: { width: 720, height: 432 } },
        );
        const visText = visCapture.output
          .filter((o) => o.type === "stdout")
          .map((o) => String(o.data))
          .join("")
          .trim();
        visible = visText === "TRUE";
      } catch {
        /* default: invisible */
      }

      if (visible) {
        // Try to render a data frame as a truncated HTML table.
        let emittedHtml = false;
        try {
          const t = await result.result.type();
          if (t === "list") {
            const js = (await result.result.toJs()) as unknown;
            const rows = rowsFromDataFrame(js);
            if (rows) {
              const html = dataFrameToHtml(rows);
              if (html) {
                emit({ type: "html", content: html });
                emittedHtml = true;
              }
            }
          }
        } catch {
          /* not a data frame, fall through to text print */
        }

        if (!emittedHtml) {
          // Non-data-frame result: print via R so print methods fire.
          try {
            const printCapture = await shelter.captureR(`print(.pg_last_result)`, {
              withAutoprint: false,
              captureGraphics: { width: 720, height: 432 },
            });
            let printStdout = "";
            let printStderr = "";
            for (const o of printCapture.output) {
              if (o.type === "stdout") printStdout += String(o.data) + "\n";
              else if (o.type === "stderr") printStderr += String(o.data) + "\n";
            }
            if (printStdout.trim())
              emit({ type: "stdout", content: capCellText(printStdout.trim()) });
            if (printStderr.trim())
              emit({ type: "stderr", content: capCellText(printStderr.trim()) });
            for (const bmp of printCapture.images) {
              const b64 = await imageBitmapToPngBase64(bmp);
              emit({ type: "image", content: b64 });
              bmp.close();
            }
          } catch {
            /* print failed, ignore */
          }
        }
      }
    } finally {
      await shelter.purge();
    }
  }

  /** Files created during the run (download.file() destinations), returned
   *  relative to the WebR home directory to match the Files pane. The
   *  tracking list is cleared so each file is reported at most once. */
  async collectCreatedFiles(): Promise<Map<string, Uint8Array>> {
    const out = new Map<string, Uint8Array>();

    let listBytes: Uint8Array;
    try {
      listBytes = await this.webR.FS.readFile(CREATED_FILES_PATH);
    } catch {
      // No download happened this run, the tracking file doesn't exist.
      return out;
    }

    const paths = [
      ...new Set(
        new TextDecoder()
          .decode(listBytes)
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
      ),
    ];

    for (const abs of paths) {
      try {
        const bytes = await this.webR.FS.readFile(abs);
        const rel = abs.startsWith(`${WEB_USER_HOME}/`)
          ? abs.slice(WEB_USER_HOME.length + 1)
          : (abs.split("/").pop() ?? abs);
        if (rel) out.set(rel, bytes);
      } catch {
        // File was removed before we read it back, skip it.
      }
    }

    try {
      await this.webR.FS.unlink(CREATED_FILES_PATH);
    } catch {
      // Best-effort cleanup; the next run also clears it.
    }

    return out;
  }
}

// ─── styler-based code formatter ─────────────────────────────────────────
// "Format code" runs {styler} inside WebR, installed on first use. It only
// touches scratch files under /tmp (never the user's globals or staged
// files), so it can safely reuse the page's existing WebR session; a click
// before any runtime exists lazily starts a dedicated session.

let activeWebR: WebRInstance | null = null;
let dedicatedFormatterWebR: Promise<WebRInstance> | null = null;

/** Forget `webR` when its owning runtime is disposed, so a later Format
 *  click starts fresh instead of hitting a terminated worker. */
function releaseFormatterSession(webR: WebRInstance): void {
  if (activeWebR === webR) activeWebR = null;
}

// Sessions that already have {styler} installed and configured, so we install
// it at most once each. Keyed weakly so sessions can still be garbage-collected.
const stylerReady = new WeakMap<WebRInstance, Promise<void>>();

// Scratch paths under /tmp (created by R_SESSION_SETUP and never surfaced in
// the Files pane), so formatting leaves the working directory untouched.
const FMT_IN = "/tmp/.pg_fmt_in.R";
const FMT_OUT = "/tmp/.pg_fmt_out.R";
const FMT_ERR = "/tmp/.pg_fmt_err";

async function getFormatterWebR(): Promise<WebRInstance> {
  if (activeWebR) return activeWebR;
  if (!dedicatedFormatterWebR) {
    dedicatedFormatterWebR = (async () => {
      // @ts-expect-error -- webr ships without bundled type declarations
      const { WebR } = (await import("webr")) as { WebR: new () => WebRInstance };
      const webR = new WebR();
      await webR.init();
      activeWebR = webR;
      return webR;
    })().catch((err) => {
      dedicatedFormatterWebR = null; // allow a later retry
      throw err;
    });
  }
  return dedicatedFormatterWebR;
}

function ensureStyler(webR: WebRInstance): Promise<void> {
  let ready = stylerReady.get(webR);
  if (!ready) {
    ready = (async () => {
      // installPackages pulls styler's full dependency closure automatically.
      await webR.installPackages(["styler"]);
      // Ensure /tmp exists (a dedicated formatter session skips
      // R_SESSION_SETUP) and disable styler's on-disk cache.
      await webR.evalRVoid(
        `suppressWarnings(dir.create("/tmp", showWarnings = FALSE))
suppressMessages(try(styler::cache_deactivate(verbose = FALSE), silent = TRUE))`,
      );
    })().catch((err) => {
      stylerReady.delete(webR); // allow a retry on the next Format click
      throw err;
    });
    stylerReady.set(webR, ready);
  }
  return ready;
}

async function safeUnlink(webR: WebRInstance, paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      await webR.FS.unlink(p);
    } catch {
      /* file may not exist, ignore */
    }
  }
}

async function formatRWithStyler(code: string): Promise<string> {
  // Blank buffers return unchanged so the UI reports "Already formatted".
  if (!code.trim()) return code;

  const webR = await getFormatterWebR();
  await ensureStyler(webR);

  // User code goes in via a file so it never needs escaping into R source.
  await webR.FS.writeFile(FMT_IN, new TextEncoder().encode(code));

  // Write the result (FMT_OUT) or the error (FMT_ERR). local() keeps
  // bindings out of .GlobalEnv; tryCatch turns invalid R into a clean
  // message; UTF-8 connections preserve non-ASCII source.
  await webR.evalRVoid(`suppressWarnings(local({
  unlink(c("${FMT_OUT}", "${FMT_ERR}"))
  tryCatch({
    con_in <- file("${FMT_IN}", encoding = "UTF-8")
    on.exit(close(con_in), add = TRUE)
    styled <- as.character(styler::style_text(readLines(con_in, warn = FALSE)))
    con_out <- file("${FMT_OUT}", encoding = "UTF-8")
    writeLines(styled, con_out)
    close(con_out)
  }, error = function(e) {
    writeLines(conditionMessage(e), "${FMT_ERR}")
  })
}))`);

  // Parse-error path: surface the R message via the Format toast.
  let errBytes: Uint8Array | null = null;
  try {
    errBytes = await webR.FS.readFile(FMT_ERR);
  } catch {
    errBytes = null; // no error file written, formatting succeeded
  }
  if (errBytes && errBytes.byteLength > 0) {
    const msg = new TextDecoder().decode(errBytes).trim();
    await safeUnlink(webR, [FMT_IN, FMT_OUT, FMT_ERR]);
    throw new Error(msg || "could not parse R code");
  }

  const outBytes = await webR.FS.readFile(FMT_OUT);
  const formatted = new TextDecoder().decode(outBytes);
  await safeUnlink(webR, [FMT_IN, FMT_OUT, FMT_ERR]);
  return formatted;
}

export const rAdapter: LanguageAdapter = {
  id: "r",
  displayName: "R Playground",
  logoText: "R",
  documentTitle: "R Playground",
  readyStatus: "R 4.6.0 ready",
  runtimeInfo: {
    language: "R",
    version: "4.6.0",
    engine: "WebR 0.6.0",
    engineUrl: "https://docs.r-wasm.org/webr/latest/",
    notes: "Runs entirely in the browser via WebAssembly, no server roundtrip.",
  },
  codeMirrorMode: "r",
  // R WASM image + base VFS, compressed transfer (webR 0.6).
  coldDownloadMB: 15,
  // styler's tidyverse style (see formatCode), keep in sync.
  indentWidth: 2,
  examples: EXAMPLES,
  packages: PACKAGES,
  outputCapabilities: { dataframes: true, figures: true },
  exportFormats: [
    { extension: "r", label: "R (.r)", mimeType: "text/x-r-source" },
  ],
  exportBaseFilename: "main",
  defaultFileExtension: "r",
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
  hasImport(code, name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `\\b(?:library|require|requireNamespace|loadNamespace)\\s*\\(\\s*["']?${escaped}["']?\\s*[,)]`,
    );
    return re.test(code);
  },
  formatCode(code: string): Promise<string> {
    return formatRWithStyler(code);
  },
  async init(setLoadingMessage): Promise<LanguageRuntime> {
    setLoadingMessage("Loading R runtime…", 0.03);
    // @ts-expect-error -- webr ships without bundled type declarations
    const { WebR } = (await import("webr")) as { WebR: new () => WebRInstance };

    // webR.init() is the heavy stage (~15 MB compressed R WASM image).
    setLoadingMessage("Initialising R runtime…", 0.12);
    const webR = new WebR();
    await webR.init();
    // Let the styler formatter reuse this session instead of a second R.
    activeWebR = webR;

    setLoadingMessage("Configuring graphics device…", 0.9);
    await webR.evalRVoid(
      `options(device = function() webr::canvas(width = 720, height = 432, capture = TRUE))`,
    );

    // Install R_SESSION_SETUP. Best-effort: failure shouldn't block startup.
    try {
      await webR.evalRVoid(R_SESSION_SETUP);
    } catch (err) {
      console.error("[webr] failed to install playground session setup", err);
    }

    return new WebRRuntime(webR);
  },
};
