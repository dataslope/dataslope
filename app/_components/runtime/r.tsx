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

/** Message off webR's output queue. `stdout`/`stderr` carry one line of text;
 *  `canvas` carries a graphics event (a new plot page, or a rendered frame of
 *  the page being drawn). */
interface WebROutputMessage {
  type: string;
  data: unknown;
}

/** Options for an evaluation. Leaving the streams and conditions uncaptured
 *  is what puts output on the queue as it is produced (see `run`). */
interface EvalOptions {
  captureStreams?: boolean;
  captureConditions?: boolean;
  captureGraphics?: boolean;
}

interface WebRFS {
  writeFile(path: string, data: Uint8Array): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  mkdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
}
interface WebRInstance {
  FS: WebRFS;
  init(): Promise<void>;
  evalRVoid(code: string, options?: EvalOptions): Promise<void>;
  evalRString(code: string, options?: EvalOptions): Promise<string>;
  installPackages(pkgs: string[]): Promise<void>;
  /** Next message off the output queue; pends until one arrives. */
  read(): Promise<WebROutputMessage>;
  /** Drains whatever is already queued, discarding it. */
  flush(): Promise<WebROutputMessage[]>;
  /** Shuts down the webR session and terminates its worker. Synchronous:
   *  webR terminates the worker on the spot. */
  close(): void;
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

// ─── Playground ↔ R control protocol ─────────────────────────────────────
// R writes ordinary output to stdout/stderr, which reaches the panel as text.
// A line that starts with RS is a control line for the surface instead: the
// tag says what it carries, US separates its fields. Both are C0 control
// characters, and every value R puts on such a line has its own control
// characters replaced first, so printed data cannot forge one. R writes a
// newline before each control line, so one is never appended to output that
// ended mid-line; a cell's trailing whitespace is dropped, so that newline
// never shows.
const RS = "\u001e";
const US = "\u001f";
/** A rendered data frame: metadata, then the header cells, then row cells. */
const TAG_DATAFRAME = `${RS}DF`;
/** The error that ended the run, newlines encoded as US. */
const TAG_ERROR = `${RS}ERR`;
/** The run's last line: everything it produced is on the queue ahead of it. */
const TAG_END = `${RS}END`;
/** How long to keep waiting for `TAG_END` once the evaluation has returned,
 *  before publishing what did arrive. Only a broken session gets here. */
const END_TIMEOUT_MS = 5_000;
/** Cell value standing in for `NA`, so it stays distinct from `""`. */
const NA_TOKEN = "\u0011";

/** One auto-printed data frame, already formatted by R (see
 *  `.pg_emit_dataframe`): every cell is the string `format()` would print,
 *  `null` for `NA`, sliced down to the head/tail window when truncated. */
interface DataFramePayload {
  totalRows: number;
  totalCols: number;
  /** Column names of the slice, without the row-name column. */
  columns: (string | null)[];
  /** Row-name of each rendered row, paired with that row's cells. */
  index: (string | null)[];
  rows: (string | null)[][];
  rowsTruncated: boolean;
  colsTruncated: boolean;
}

/** Parses a `TAG_DATAFRAME` control line; null when it is malformed. */
function parseDataFramePayload(line: string): DataFramePayload | null {
  const fields = line.slice(TAG_DATAFRAME.length + US.length).split(US);
  if (fields.length < 5) return null;
  const totalRows = Number(fields[0]);
  const totalCols = Number(fields[1]);
  const shownCols = Number(fields[2]);
  const rowsTruncated = fields[3] === "1";
  const colsTruncated = fields[4] === "1";
  if (!Number.isFinite(totalRows) || !Number.isFinite(totalCols)) return null;
  if (!Number.isInteger(shownCols) || shownCols <= 0) return null;

  // Cells arrive row-major, each row prefixed by its row name, header first.
  const cells = fields.slice(5).map((c) => (c === NA_TOKEN ? null : c));
  const stride = shownCols + 1;
  if (cells.length < stride || cells.length % stride !== 0) return null;
  const columns = cells.slice(1, stride);
  const index: (string | null)[] = [];
  const rows: (string | null)[][] = [];
  for (let i = stride; i < cells.length; i += stride) {
    index.push(cells[i]);
    rows.push(cells.slice(i + 1, i + stride));
  }
  return {
    totalRows,
    totalCols,
    columns,
    index,
    rows,
    rowsTruncated,
    colsTruncated,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** `NA` is a value, not a blank: rendering it as an empty cell makes it
 *  indistinguishable from the empty string, and an all-`NA` row reads as a
 *  rendering glitch rather than as data. */
function renderCell(value: string | null): string {
  return value === null
    ? '<span class="dataframe-na">NA</span>'
    : escapeHtml(value);
}

function dataFrameToHtml(df: DataFramePayload): string | null {
  if (df.rows.length === 0 || df.columns.length === 0) return null;

  // A truncated frame gets an "⋯" marker column / row where the omitted
  // middle would be; `null` marks that position in the column list.
  const displayCols: (string | null)[] = df.colsTruncated
    ? [
        ...df.columns.slice(0, R_HEAD_COLS),
        null,
        ...df.columns.slice(df.columns.length - R_TAIL_COLS),
      ]
    : df.columns;
  const colOffsets: (number | null)[] = df.colsTruncated
    ? [
        ...df.columns.slice(0, R_HEAD_COLS).map((_, i) => i),
        null,
        ...df.columns
          .slice(df.columns.length - R_TAIL_COLS)
          .map((_, i) => df.columns.length - R_TAIL_COLS + i),
      ]
    : df.columns.map((_, i) => i);

  const head = displayCols
    .map((c) =>
      c === null
        ? '<th class="dataframe-ellipsis-col">&#x22EF;</th>'
        : `<th>${renderCell(c)}</th>`,
    )
    .join("");

  const rowIndices: (number | null)[] = df.rowsTruncated
    ? [
        ...df.rows.slice(0, R_HEAD_ROWS).map((_, i) => i),
        null,
        ...df.rows
          .slice(df.rows.length - R_TAIL_ROWS)
          .map((_, i) => df.rows.length - R_TAIL_ROWS + i),
      ]
    : df.rows.map((_, i) => i);

  const body = rowIndices
    .map((r) => {
      if (r === null) {
        return `<tr class="dataframe-ellipsis-row"><th>&#x22EF;</th>${displayCols
          .map(() => "<td>&#x22EF;</td>")
          .join("")}</tr>`;
      }
      const cells = df.rows[r];
      return (
        `<tr><th>${renderCell(df.index[r] ?? null)}</th>` +
        colOffsets
          .map((c) =>
            c === null
              ? '<td class="dataframe-ellipsis-col">&#x22EF;</td>'
              : `<td>${renderCell(cells[c] ?? null)}</td>`,
          )
          .join("") +
        `</tr>`
      );
    })
    .join("");

  const footerParts: string[] = [];
  if (df.rowsTruncated) {
    footerParts.push(`${R_HEAD_ROWS + R_TAIL_ROWS} of ${df.totalRows} rows`);
  }
  if (df.colsTruncated) {
    footerParts.push(`${R_HEAD_COLS + R_TAIL_COLS} of ${df.totalCols} columns`);
  }
  const footer =
    footerParts.length > 0
      ? `<tfoot><tr><td colspan="${displayCols.length + 1}" class="dataframe-rows-footer">` +
        `Showing ${footerParts.join(" · ")}` +
        `</td></tr></tfoot>`
      : "";

  return `<table class="dataframe"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody>${footer}</table>`;
}

// ─── Runtime ─────────────────────────────────────────────────────────────

// WebR manages its own dedicated internal worker; calling it from the main
// thread is already non-blocking. No outer wrapper worker is needed.

// Working directory inside the WebR Emscripten FS (matches `getwd()` output).
const WEB_USER_HOME = "/home/web_user";

// The run's source, staged under /tmp so it never shows up in the user's
// working directory (or in `list.files()`, or in the Files pane).
const RUN_CODE_PATH = "/tmp/.pg_run_code.R";

// One-time R setup, kept on the search path so it survives the per-run wipe
// of the global environment. 1. download.file() is wrapped to print progress
// to stdout (stderr is styled as an error); CORS still applies. 2. print() is
// overridden (a search-path lookup, not an S3 method) to truncate plain
// data.frames; tibbles/data.tables keep their own truncating print methods.
// 3. `.pg_run_file` is the run driver: it evaluates the user's file one
// top-level expression at a time, the way R's own REPL does, so every visible
// value is displayed, conditions reach the panel as they are raised, and
// output produced before an error survives the error.
const R_SESSION_SETUP = String.raw`
suppressWarnings(dir.create("/tmp", showWarnings = FALSE))

# Coverage-instrumentation droppings from the webR build. Left alone it shows
# up in the working directory of every fresh session, in list.files() output
# and in the Files pane, as a file the user never created.
try(unlink("default.profraw"), silent = TRUE)

local({
  # The control-line protocol; keep in step with RS / US / NA_TOKEN in
  # the TypeScript above.
  RS <- "\u001e"
  US <- "\u001f"
  NA_TOKEN <- "\u0011"
  MAX_ROWS <- ${R_MAX_DISPLAY_ROWS}L
  HEAD_ROWS <- ${R_HEAD_ROWS}L
  TAIL_ROWS <- ${R_TAIL_ROWS}L
  MAX_COLS <- ${R_MAX_DISPLAY_COLS}L
  HEAD_COLS <- ${R_HEAD_COLS}L
  TAIL_COLS <- ${R_TAIL_COLS}L
  CELL_CHARS <- 300L

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
        file.exists(destfile) && !isTRUE(quiet)) {
      size <- file.info(destfile)$size
      cat(sprintf("downloaded %s bytes\n",
                  format(size, big.mark = ",", scientific = FALSE)))
    }
    invisible(status)
  }

  # ── Control lines ──────────────────────────────────────────────────────
  # Strips the control characters the surface's protocol is built from, so a
  # value can never look like a control line, and caps runaway cells.
  clean <- function(v) {
    v <- as.character(v)
    out <- gsub("[[:cntrl:]]", " ", v)
    long <- !is.na(out) & nchar(out) > CELL_CHARS
    out[long] <- paste0(substr(out[long], 1L, CELL_CHARS), "…")
    out[is.na(v)] <- NA_TOKEN
    out
  }

  # ── Displaying a value ─────────────────────────────────────────────────
  # A column as print() would show it: factor labels rather than their
  # integer codes, formatted dates rather than days since the epoch, R's
  # TRUE/FALSE rather than JavaScript's true/false, and NA kept as NA so the
  # surface can render it as a value instead of a blank cell.
  format_column <- function(col) {
    if (is.factor(col)) return(as.character(col))
    if (is.character(col)) return(col)
    if (is.logical(col)) return(ifelse(col, "TRUE", "FALSE"))
    if (inherits(col, "Date") || inherits(col, "POSIXt")) return(format(col))
    if (is.list(col)) {
      return(vapply(col,
                    function(v) paste(format(v), collapse = ", "),
                    character(1)))
    }
    out <- vapply(col,
                  function(v) format(v, trim = TRUE, justify = "none")[1],
                  character(1))
    # format() spells NA as "NA"; keep the missing values missing. NaN is a
    # value of its own and keeps the text format() gave it.
    nan <- if (is.double(col)) is.nan(col) else rep(FALSE, length(col))
    out[is.na(col) & !nan] <- NA_character_
    out
  }

  emit_dataframe <- function(x) {
    tryCatch({
      df <- as.data.frame(x, stringsAsFactors = FALSE)
      n <- nrow(df)
      p <- ncol(df)
      if (n == 0L || p == 0L) return(FALSE)
      rows_trunc <- n > MAX_ROWS
      ridx <- if (rows_trunc) c(seq_len(HEAD_ROWS), seq.int(n - TAIL_ROWS + 1L, n))
              else seq_len(n)
      cols_trunc <- p > MAX_COLS
      cidx <- if (cols_trunc) c(seq_len(HEAD_COLS), seq.int(p - TAIL_COLS + 1L, p))
              else seq_len(p)
      sub <- df[ridx, cidx, drop = FALSE]
      cols <- lapply(seq_along(cidx), function(j) clean(format_column(sub[[j]])))
      index <- clean(rownames(sub))
      cells <- c("", clean(names(sub)))
      for (i in seq_along(ridx)) {
        cells <- c(cells, index[i],
                   vapply(cols, function(col) col[i], character(1)))
      }
      cat("\n", RS, "DF", US, n, US, p, US, length(cidx),
          US, if (rows_trunc) "1" else "0",
          US, if (cols_trunc) "1" else "0",
          US, paste(cells, collapse = US), "\n", sep = "")
      TRUE
    }, error = function(e) FALSE)
  }

  show_value <- function(x) {
    if (is.data.frame(x) && isTRUE(emit_dataframe(x))) return(invisible(NULL))
    if (isS4(x)) methods::show(x) else print(x)
    invisible(NULL)
  }

  # ── Conditions ─────────────────────────────────────────────────────────
  # Calls belonging to the driver rather than to the user's code; R would
  # name them in a warning or an error the user never wrote.
  harness_call <- function(call) {
    if (is.null(call)) return(TRUE)
    txt <- paste(deparse(call), collapse = " ")
    prefixes <- c("eval(", "withVisible(", "withCallingHandlers(", "tryCatch(",
                  "doTryCatch(", "try(", "parse(", "show_value(",
                  "emit_dataframe(", ".pg_")
    any(vapply(prefixes, function(p) startsWith(txt, p), logical(1)))
  }

  condition_text <- function(cnd, label) {
    msg <- conditionMessage(cnd)
    call <- conditionCall(cnd)
    if (harness_call(call)) {
      if (identical(label, "Error")) paste0("Error: ", msg)
      else paste0(label, " message:\n", msg)
    } else {
      paste0(label, " in ", paste(deparse(call), collapse = " "), " : ", msg)
    }
  }

  # message() is R's neutral channel (package attach notices, progress), so
  # it goes to stdout; a warning is a diagnostic and keeps stderr's red.
  on_message <- function(cnd) {
    cat(conditionMessage(cnd), sep = "")
    invokeRestart("muffleMessage")
  }

  on_warning <- function(cnd) {
    level <- getOption("warn", 0)
    # warn >= 2 turns warnings into errors: leave it to R. warn < 0 drops
    # them entirely, which is what the user asked for.
    if (level >= 2) return(invisible(NULL))
    if (level < 0) invokeRestart("muffleWarning")
    cat(condition_text(cnd, "Warning"), "\n", sep = "", file = stderr())
    invokeRestart("muffleWarning")
  }

  # ── The run ────────────────────────────────────────────────────────────
  run_file <- function(path, entry) {
    on.exit({
      # A sink the program opened and never closed would swallow the lines
      # below, and every line of the next run with them.
      while (sink.number() > 0L) try(sink(NULL), silent = TRUE)
      # A message sink is a single diversion, and reads back as 2 (stderr)
      # when there is none.
      if (sink.number(type = "message") != 2L) {
        try(sink(NULL, type = "message"), silent = TRUE)
      }
      # Each run draws on its own device, so a plot never continues onto the
      # previous run's page; closing it also flushes its last frame.
      while (!is.null(dev.list())) try(dev.off(), silent = TRUE)
      # Everything this run produced is now on the queue, ahead of this line:
      # the surface waits for it rather than for the call to return, which
      # says nothing about what the queue still holds.
      cat("\n", RS, "END", "\n", sep = "")
      try(flush(stdout()), silent = TRUE)
    }, add = TRUE)

    fail <- function(cnd) {
      text <- condition_text(cnd, "Error")
      # A parse error quotes the path the source was staged at; the user
      # knows the file by the name in their editor.
      text <- gsub(path, entry, text, fixed = TRUE)
      cat("\n", RS, "ERR", US, gsub("\n", US, text, fixed = TRUE), "\n",
          sep = "")
      invisible(FALSE)
    }

    exprs <- tryCatch(parse(file = path, keep.source = FALSE),
                      error = function(e) e)
    if (inherits(exprs, "condition")) return(fail(exprs))

    for (i in seq_along(exprs)) {
      ok <- tryCatch(
        withCallingHandlers({
          vr <- withVisible(eval(exprs[[i]], .GlobalEnv))
          if (vr$visible) show_value(vr$value)
          TRUE
        }, message = on_message, warning = on_warning),
        error = function(e) fail(e))
      if (!isTRUE(ok)) return(invisible(FALSE))
    }
    invisible(TRUE)
  }

  # Every file in the working directory with its size and mtime, so the
  # surface can tell which ones a run created or rewrote. Dot-files (webR's
  # own scratch) and directories are left out.
  file_stamps <- function(home) {
    files <- list.files(home, all.files = FALSE, recursive = TRUE, no.. = TRUE)
    files <- files[!grepl("[[:cntrl:]]", files)]
    if (length(files) == 0L) return("")
    if (length(files) > 5000L) files <- files[seq_len(5000L)]
    info <- file.info(file.path(home, files))
    paste(paste0(files, US, info$size, US, as.numeric(info$mtime)),
          collapse = RS)
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
  attach(list(download.file = download_file, print = print_override,
              .pg_run_file = run_file, .pg_file_stamps = file_stamps),
         name = "webr:playground", warn.conflicts = FALSE)
})
`;

// Backstop against one run flooding the UI with megabytes of text. Streamed
// output can only be capped at the head: by the time the total is known the
// earlier text is already on screen. Data frames are truncated more nicely by
// the print override.
const MAX_RUN_TEXT_CHARS = 250_000;
const TRUNCATION_NOTE = "\n… further output hidden …\n";
// Text is handed to the surface in batches, so a print-heavy loop doesn't
// re-render the panel once per line.
const TEXT_FLUSH_MS = 60;
const TEXT_FLUSH_CHARS = 8192;
// A plot arrives as a sequence of progressively drawn frames. The first is
// shown as soon as it lands (so a long run's plots appear while it runs) and
// later frames replace it, at most this often; the final frame always wins.
const IMAGE_REFRESH_MS = 250;
/** Ceilings on what one run can hand back to the Files pane, so a program
 *  that fills the filesystem in a loop can't wedge the tab mirroring it.
 *  Matches the Python runtime's. */
const CREATED_FILES_MAX = 50;
const CREATED_BYTES_MAX = 64 * 1024 * 1024;

/**
 * Turns one run's webR output messages into output cells, in the order R
 * produced them.
 *
 * Text accumulates into the current cell until something else arrives (a
 * plot, a table, a switch between stdout and stderr), which is what keeps a
 * plot sitting between the lines that introduce it rather than after all of
 * them. Text is streamed stripped — leading whitespace skipped, trailing
 * whitespace held back until more arrives — so a cell reads the same whether
 * it was delivered in one piece or twenty.
 */
class RunOutputStream {
  private seq = 0;
  private text: { type: "stdout" | "stderr"; seq: number; sent: boolean } | null =
    null;
  private buffer = "";
  private held = "";
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFlush = 0;
  private image: {
    seq: number;
    bitmap: ImageBitmap | null;
    /** Set when a frame arrived that hasn't been rendered yet. */
    dirty: boolean;
    lastRender: number;
  } | null = null;
  private chars = 0;
  private truncated = false;
  /** The error R reported, if the run ended on one. */
  error: string | null = null;
  private ended = false;
  private onEnd: (() => void) | null = null;

  constructor(private emit: EmitOutput) {}

  /**
   * Resolves once R's end-of-run line has been handled.
   *
   * Evaluating returns over webR's request channel while output is still
   * travelling up the queue, so the call resolving is not the run being over.
   * Waiting for the line R prints last is.
   */
  waitForEnd(): Promise<void> {
    if (this.ended) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.onEnd = null;
        resolve();
      }, END_TIMEOUT_MS);
      this.onEnd = () => {
        clearTimeout(timer);
        this.onEnd = null;
        resolve();
      };
    });
  }

  /** Handles one message off webR's output queue. Awaited by the caller, so
   *  encoding a plot frame never overlaps with the next message. */
  async handle(message: WebROutputMessage): Promise<void> {
    if (message.type === "stdout") {
      const line = String(message.data);
      if (line.startsWith(RS)) {
        await this.control(line);
        return;
      }
      this.write("stdout", `${line}\n`);
      return;
    }
    if (message.type === "stderr") {
      this.write("stderr", `${String(message.data)}\n`);
      return;
    }
    if (message.type === "canvas") {
      const data = message.data as { event?: string; image?: ImageBitmap };
      if (data?.event === "canvasNewPage") await this.newPlot();
      else if (data?.event === "canvasImage" && data.image) {
        await this.plotFrame(data.image);
      }
    }
  }

  private async control(line: string): Promise<void> {
    if (line.startsWith(TAG_DATAFRAME + US)) {
      const payload = parseDataFramePayload(line);
      const html = payload ? dataFrameToHtml(payload) : null;
      if (html) {
        this.flushText(true);
        this.emit({ type: "html", content: html }, this.seq++, false);
      }
      return;
    }
    if (line.startsWith(TAG_ERROR + US)) {
      this.error = line
        .slice(TAG_ERROR.length + US.length)
        .split(US)
        .join("\n");
      return;
    }
    if (line === TAG_END) {
      this.ended = true;
      this.onEnd?.();
      return;
    }
    // Unknown tag: show it rather than swallow it.
    this.write("stdout", `${line}\n`);
  }

  private write(type: "stdout" | "stderr", chunk: string): void {
    if (this.truncated) return;
    if (this.chars + chunk.length > MAX_RUN_TEXT_CHARS) {
      chunk = chunk.slice(0, Math.max(0, MAX_RUN_TEXT_CHARS - this.chars));
      this.truncated = true;
    }
    this.chars += chunk.length;
    if (this.text && this.text.type !== type) this.flushText(true);
    if (!this.text) this.text = { type, seq: this.seq++, sent: false };
    this.buffer += chunk;
    if (this.truncated) this.buffer += TRUNCATION_NOTE;
    if (this.buffer.length >= TEXT_FLUSH_CHARS) this.flushText(false);
    else this.scheduleFlush();
  }

  /** Publishes the buffered text. `end` closes the cell, dropping the
   *  trailing whitespace that would otherwise render as a blank line. */
  private flushText(end: boolean): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    const cell = this.text;
    if (!cell) return;
    let pending = this.buffer;
    this.buffer = "";
    if (!cell.sent) pending = pending.replace(/^\s+/, "");
    const trailing = /\s*$/.exec(pending)?.[0] ?? "";
    const body = pending.slice(0, pending.length - trailing.length);
    if (body) {
      this.emit(
        { type: cell.type, content: this.held + body },
        cell.seq,
        cell.sent,
      );
      cell.sent = true;
      this.held = end ? "" : trailing;
    } else if (!end) {
      this.held += trailing;
    }
    this.lastFlush = Date.now();
    if (end) {
      // An all-whitespace cell never got a position of its own; leave the
      // hole for the surface to skip.
      this.held = "";
      this.text = null;
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    const wait = Math.max(0, TEXT_FLUSH_MS - (Date.now() - this.lastFlush));
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushText(false);
    }, wait);
  }

  /** A new plot page: give it a cell where the output stands today, so later
   *  text lands below it. */
  private async newPlot(): Promise<void> {
    this.flushText(true);
    // The page being replaced may have drawn more since its last frame was
    // rendered; that frame is the finished plot.
    if (this.image?.dirty) await this.render(this.image);
    this.image?.bitmap?.close();
    this.image = {
      seq: this.seq++,
      bitmap: null,
      dirty: false,
      lastRender: 0,
    };
  }

  private async plotFrame(bitmap: ImageBitmap): Promise<void> {
    if (!this.image) await this.newPlot();
    const slot = this.image!;
    slot.bitmap?.close();
    slot.bitmap = bitmap;
    slot.dirty = true;
    const now = Date.now();
    if (slot.lastRender === 0 || now - slot.lastRender >= IMAGE_REFRESH_MS) {
      await this.render(slot);
    }
  }

  private async render(slot: NonNullable<RunOutputStream["image"]>): Promise<void> {
    const bitmap = slot.bitmap;
    if (!bitmap) return;
    try {
      const png = await imageBitmapToPngBase64(bitmap);
      this.emit({ type: "image", content: png }, slot.seq, false);
      slot.dirty = false;
      slot.lastRender = Date.now();
    } catch {
      // A frame that can't be encoded is dropped; the next one replaces it.
    }
  }

  /** Publishes everything held back, once the run is over. */
  async finish(): Promise<void> {
    this.flushText(true);
    if (this.image?.dirty) await this.render(this.image);
    this.dispose();
  }

  dispose(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.image?.bitmap?.close();
    if (this.image) this.image.bitmap = null;
  }
}

/** Boots a webR session ready to take runs: graphics on a canvas device that
 *  streams its frames to the output queue, plus the playground's own R setup.
 *  Used for the first boot and for the session a Stop stands back up. */
async function startWebR(): Promise<WebRInstance> {
  // @ts-expect-error -- webr ships without bundled type declarations
  const { WebR } = (await import("webr")) as { WebR: new () => WebRInstance };
  const webR = new WebR();
  await webR.init();
  // Let the styler formatter reuse this session instead of a second R.
  activeWebR = webR;

  // capture = FALSE puts each frame of a plot on the output queue as it is
  // drawn, so a figure lands between the lines that introduce it. Capturing
  // instead would hold every plot back until the run ended.
  await webR.evalRVoid(
    `options(device = function() webr::canvas(width = 720, height = 432, capture = FALSE))`,
  );

  // Best-effort: a setup failure shouldn't block startup.
  try {
    await webR.evalRVoid(R_SESSION_SETUP);
  } catch (err) {
    console.error("[webr] failed to install playground session setup", err);
  }
  return webR;
}

/** Error the surface renders as "Run stopped." rather than as a failure. */
function cancelledError(): Error {
  const err = new Error("Run stopped.");
  err.name = "RunCancelledError";
  return err;
}

/** A string literal for R source. JSON escaping is valid in R strings too. */
function rString(value: string): string {
  return JSON.stringify(value);
}

class WebRRuntime implements LanguageRuntime {
  private installedPackages = new Set<string>();
  // Absolute FS paths written during the previous prepareFileSystem call.
  // Used to remove stale files when tabs are renamed or deleted.
  private stagedPaths = new Set<string>();
  // One-time `rc.settings` setup for the completion engine; false when
  // it failed (completions then stay empty for the session).
  private completionSetup: Promise<boolean> | null = null;
  // Working-directory contents as of the last check, keyed by path with a
  // size/mtime stamp. What changes between runs is what the run created.
  private fileStamps = new Map<string, string>();
  // Where the reader loop delivers output while a run is in flight.
  private sink: ((message: WebROutputMessage) => Promise<void>) | null = null;
  // Rejects the in-flight run() when Stop tears the session down.
  private abortActiveRun: ((err: Error) => void) | null = null;
  // Non-null between the Stop that closed the old session and the moment its
  // replacement is ready. Every entry point waits on it, so nothing is sent
  // to a terminated worker (which would never answer).
  private restartPromise: Promise<void> | null = null;

  constructor(private webR: WebRInstance) {
    this.readOutput(webR);
  }

  /**
   * Drains webR's output queue for the session's lifetime, handing each
   * message to the active run.
   *
   * One loop rather than one per run: `read()` resolves with the next
   * message whenever it arrives, so a loop that stopped between runs would
   * leave a pending read holding the first message of the next one.
   */
  private readOutput(webR: WebRInstance): void {
    void (async () => {
      for (;;) {
        let message: WebROutputMessage;
        try {
          message = await webR.read();
        } catch {
          return;
        }
        // A restart leaves the old worker's loop running until its channel
        // closes; its messages belong to a session nobody is watching.
        if (this.webR !== webR) return;
        if (message.type === "closed") return;
        try {
          await this.sink?.(message);
        } catch {
          // A message that can't be rendered must not stop the queue.
        }
      }
    })();
  }

  /** Shut the webR session down (registry-eviction hook; unusable after).
   *  Also un-registers from the styler formatter so a later Format click
   *  starts fresh instead of talking to a dead session. */
  dispose(): void {
    releaseFormatterSession(this.webR);
    this.webR.close();
  }

  /**
   * Stop the running program.
   *
   * R's interrupt handling needs a SharedArrayBuffer, which needs the
   * document to be cross-origin isolated, which the site is not — so webR
   * runs on its PostMessage channel, where `interrupt()` does nothing. The
   * only lever left is the worker itself: terminate it and stand a new
   * session up. That costs the session's state, which is wiped between runs
   * anyway, and its installed packages, which re-install on demand.
   * Resolves once the replacement is ready to take a run.
   */
  async cancelRun(): Promise<void> {
    if (this.restartPromise) return this.restartPromise;
    const abort = this.abortActiveRun;
    this.abortActiveRun = null;
    this.sink = null;
    const dead = this.webR;
    releaseFormatterSession(dead);
    dead.close();
    abort?.(cancelledError());

    this.restartPromise = (async () => {
      try {
        const webR = await startWebR();
        this.webR = webR;
        this.installedPackages.clear();
        this.stagedPaths.clear();
        this.fileStamps.clear();
        this.completionSetup = null;
        this.readOutput(webR);
      } finally {
        this.restartPromise = null;
      }
    })();
    return this.restartPromise;
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
    // Mid-restart the session can't answer; completions are best-effort.
    if (this.restartPromise) return empty;
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
    if (this.restartPromise) await this.restartPromise;
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

    // Baseline for collectCreatedFiles(): everything present once staging is
    // done is the run's input, so only what changes afterwards is its output.
    const stamps = await this.readFileStamps();
    if (stamps) this.fileStamps = stamps;
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
    // A Stop leaves the runtime rebuilding itself; the next run belongs on
    // the fresh session, so wait rather than race it.
    if (this.restartPromise) await this.restartPromise;
    const installWarnings = await this.ensurePackages(code, options?.onStatus);
    const webR = this.webR;

    await webR.evalRVoid(
      `rm(list = ls(envir = .GlobalEnv, all.names = TRUE), envir = .GlobalEnv)`,
    );
    // User code goes in via a VFS file so it never needs escaping into R
    // source; the driver parses it by path.
    await webR.FS.writeFile(RUN_CODE_PATH, new TextEncoder().encode(code));
    // Anything queued before now (webR's startup banner, a package install's
    // progress) belongs to no run.
    await webR.flush();

    const out = new RunOutputStream(emit);
    // Through the stream, not straight to `emit`: cells are addressed by
    // position, and an unpositioned cell would be overwritten by the run's
    // first one.
    if (installWarnings) {
      await out.handle({ type: "stderr", data: installWarnings.trim() });
    }
    this.sink = (message) => out.handle(message);
    try {
      // Leaving the streams and conditions uncaptured is what makes this a
      // live run: R writes to the output queue as it goes, and the reader
      // loop turns each message into a cell. Graphics capture stays off for
      // the same reason — the session's canvas device streams its frames to
      // the same queue, in place, instead of handing them all over at the
      // end.
      await this.untilCancelled(
        webR.evalRVoid(
          `.pg_run_file(${rString(RUN_CODE_PATH)}, ${rString(
            options?.entryFilename ?? "main.r",
          )})`,
          {
            captureStreams: false,
            captureConditions: false,
            captureGraphics: false,
          },
        ),
      );
      await out.waitForEnd();
      // The driver reports the error that ended the run rather than printing
      // it, so the surface renders it below everything the run produced
      // first.
      if (out.error) throw new Error(out.error);
    } finally {
      this.sink = null;
      // Also on the Stop path: what the program printed before it was
      // stopped stays on screen.
      await out.finish();
    }
  }

  /** Settles with `work`, or rejects if Stop tears the session down first —
   *  a request to a terminated worker is never answered. */
  private untilCancelled<T>(work: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.abortActiveRun = reject;
      work.then(resolve, reject).finally(() => {
        this.abortActiveRun = null;
      });
    });
  }

  /** Files the run wrote into the working directory (`write.csv`, `png()`,
   *  `download.file()`), keyed by workspace-relative path. Comparing stamps
   *  against the last check is what keeps an unchanged file from being
   *  reported twice. */
  async collectCreatedFiles(): Promise<Map<string, Uint8Array>> {
    const out = new Map<string, Uint8Array>();
    // Stop took the filesystem down with the worker; don't stall the run's
    // tail waiting for a session that is still booting.
    if (this.restartPromise) return out;

    const stamps = await this.readFileStamps();
    if (!stamps) return out;

    let bytes = 0;
    for (const [path, stamp] of stamps) {
      if (this.fileStamps.get(path) === stamp) continue;
      // Over the cap the loop stops without stamping, so the files it did
      // not hand over are still pending rather than silently forgotten.
      if (out.size >= CREATED_FILES_MAX || bytes >= CREATED_BYTES_MAX) break;
      this.fileStamps.set(path, stamp);
      try {
        const data = await this.webR.FS.readFile(`${WEB_USER_HOME}/${path}`);
        bytes += data.length;
        out.set(path, data);
      } catch {
        // Removed between listing and reading; skip it.
      }
    }
    // Files the run deleted shouldn't linger in the comparison set.
    for (const path of [...this.fileStamps.keys()]) {
      if (!stamps.has(path)) this.fileStamps.delete(path);
    }
    return out;
  }

  /** path → "size:mtime" for everything in the working directory, or null
   *  when the session can't answer (a run in flight, a dead worker). */
  private async readFileStamps(): Promise<Map<string, string> | null> {
    let raw: string;
    try {
      raw = await this.webR.evalRString(
        `.pg_file_stamps(${rString(WEB_USER_HOME)})`,
      );
    } catch {
      return null;
    }
    const stamps = new Map<string, string>();
    if (!raw) return stamps;
    for (const entry of raw.split(RS)) {
      if (!entry) continue;
      const [path, size, mtime] = entry.split(US);
      if (!path || path.startsWith(".")) continue;
      stamps.set(path, `${size}:${mtime}`);
    }
    return stamps;
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
    notes:
      "Runs in a Web Worker via WebAssembly, so the UI stays responsive. No server roundtrip.",
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
    // webR.init() is the heavy stage (~15 MB compressed R WASM image).
    setLoadingMessage("Initialising R runtime…", 0.12);
    const webR = await startWebR();
    setLoadingMessage("Configuring graphics device…", 0.9);
    return new WebRRuntime(webR);
  },
};
