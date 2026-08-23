import { test, expect, type Page } from "@playwright/test";

// R playground behaviour that only the real runtime can show: what reaches the
// output panel, in what order, and what a run leaves behind. Needs the WebR
// runtime (and, for the download test, a real ~4 MB network fetch), so it is
// opt-in: R_E2E=1 npx playwright test e2e/r-playground.spec.ts

const ENABLED = !!process.env.R_E2E;

const CSV_URL =
  "https://raw.githubusercontent.com/bdi593/datasets/refs/heads/main/zillow-properties/zillow_properties_champaign_urbana_savoy.csv";
const CSV_NAME = "zillow_properties_champaign_urbana_savoy.csv";

async function waitForRuntimeReady(page: Page) {
  await page.waitForFunction(
    () => {
      const banner = document.querySelector(".loading-banner, .pg-status");
      const text = banner?.textContent ?? "";
      if (text.startsWith("Failed to load")) {
        throw new Error(text);
      }
      const btn = document.querySelector(".run-btn");
      return !!btn && !btn.hasAttribute("disabled");
    },
    null,
    { timeout: 150_000 },
  );
}

/** Replace the CodeMirror editor's contents with `code`. */
async function setEditorCode(page: Page, code: string) {
  const content = page.locator(".cm-content").first();
  await content.click();
  await page.keyboard.press("Control+A");
  // insertText replaces the selection in a single bulk input event, so
  // CodeMirror's per-keystroke bracket auto-closing doesn't mangle the text.
  await page.keyboard.insertText(code);
}

interface Cell {
  type: string;
  body: string;
  /** Rendered markup, for the cells whose structure is the point. */
  html: string;
}

/** The cells of the newest run, in the order they appear. */
function readCells(page: Page): Promise<Cell[]> {
  return page.evaluate(() => {
    const runs = [...document.querySelectorAll(".run-cell")];
    const last = runs[runs.length - 1];
    if (!last) return [];
    return [...last.querySelectorAll(".run-cell-content > *")].map((c) => ({
      type: c.getAttribute("data-cell-type") ?? "unknown",
      body: c.textContent ?? "",
      html: c.innerHTML ?? "",
    }));
  });
}

/** True once no run is in flight: while one is, the Run button is Stop. */
function isIdle(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const btn = document.querySelector(".run-btn");
    return (
      !!btn && !btn.classList.contains("stop") && !btn.hasAttribute("disabled")
    );
  });
}

/** Click Run, wait for the run to finish, and return its cells. */
async function runAndCollect(page: Page): Promise<Cell[]> {
  await page.locator(".run-btn").first().click();
  await page.waitForFunction(
    () => {
      const btn = document.querySelector(".run-btn");
      return (
        !!btn &&
        !btn.classList.contains("stop") &&
        !btn.hasAttribute("disabled")
      );
    },
    null,
    { timeout: 150_000 },
  );
  return readCells(page);
}

/** Every cell as "[type] text", for readable assertion messages. */
function describeCells(cells: Cell[]): string {
  return cells.map((c) => `[${c.type}] ${c.body}`).join("\n");
}

function textOf(cells: Cell[], type: string): string {
  return cells
    .filter((c) => c.type === type)
    .map((c) => c.body)
    .join("\n");
}

test.describe("R playground data handling", () => {
  test.skip(!ENABLED, "set R_E2E=1 to run (needs the WebR runtime / network)");

  test("download.file() saves a CSV into the Files pane", async ({ page }) => {
    await page.goto("/playground/r");
    await waitForRuntimeReady(page);

    await setEditorCode(
      page,
      `download.file("${CSV_URL}", "${CSV_NAME}")\n` +
        `cat("exists:", file.exists("${CSV_NAME}"), "\\n")\n` +
        `cat("nbytes:", file.info("${CSV_NAME}")$size, "\\n")`,
    );

    const cells = await runAndCollect(page);
    const allText = cells.map((c) => `[${c.type}] ${c.body}`).join("\n");
    const stdoutText = cells
      .filter((c) => c.type === "stdout")
      .map((c) => c.body)
      .join("\n");
    const stderrText = cells
      .filter((c) => c.type === "stderr")
      .map((c) => c.body)
      .join("\n");

    expect(allText, allText).not.toMatch(/cannot open URL/i);
    expect(allText, allText).not.toMatch(/could not find function/i);
    expect(allText, allText).not.toMatch(/download failed/i);

    // The progress lines are shown as normal output, not as an error cell.
    expect(stdoutText, stdoutText).toContain("trying URL");
    expect(stderrText, stderrText).not.toContain("trying URL");

    // The file exists in the R working directory with real content…
    expect(allText).toContain("exists: TRUE");
    expect(allText).toMatch(/nbytes:\s*\d{4,}/);

    // …and it now appears in the Files pane.
    await page.locator('[aria-label="Files"]').first().click();
    await expect(
      page.locator(".playground-files-name", { hasText: CSV_NAME }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("printing a large data.frame is truncated to head + tail", async ({
    page,
  }) => {
    await page.goto("/playground/r");
    await waitForRuntimeReady(page);

    // 500 rows; each label is unique so we can prove the middle is hidden.
    await setEditorCode(
      page,
      `df <- data.frame(idx = 1:500, label = sprintf("row-%03d", 1:500),\n` +
        `                 stringsAsFactors = FALSE)\n` +
        `print(df)`,
    );

    const cells = await runAndCollect(page);
    const stdout = cells
      .filter((c) => c.type === "stdout")
      .map((c) => c.body)
      .join("\n");

    expect(stdout, stdout).toContain("row-001"); // head present
    expect(stdout, stdout).toContain("row-500"); // tail present
    expect(stdout, stdout).toContain("..."); // ellipsis row
    expect(stdout, stdout).toMatch(/500 rows total/);
    // The hidden middle must NOT be dumped (this is the page-freeze guard).
    expect(stdout, stdout).not.toContain("row-250");
  });
});

// Regressions for the black-box audit of the R playground: each test is one
// finding, and each asserts what reaches the user rather than what R computed.
test.describe("R playground output", () => {
  test.skip(!ENABLED, "set R_E2E=1 to run (needs the WebR runtime)");

  test.beforeEach(async ({ page }) => {
    await page.goto("/playground/r");
    await waitForRuntimeReady(page);
  });

  test("message() and warning() reach the panel, suppressors still work", async ({
    page,
  }) => {
    await setEditorCode(
      page,
      [
        'cat("A: cat\\n")',
        'message("C: message")',
        'warning("E: warning")',
        'x <- as.numeric("abc")',
        'suppressWarnings(as.numeric("def"))',
        'suppressMessages(message("QUIET"))',
        'cat("F: x =", x, "\\n")',
      ].join("\n"),
    );

    const cells = await runAndCollect(page);
    const all = describeCells(cells);
    // message() is neutral output; a warning keeps stderr's red.
    expect(textOf(cells, "stdout"), all).toContain("C: message");
    expect(textOf(cells, "stderr"), all).toContain("E: warning");
    // R's own diagnostic for a silent data change must not be swallowed.
    expect(textOf(cells, "stderr"), all).toContain("NAs introduced by coercion");
    expect(all).not.toContain("QUIET");
    // suppressWarnings() leaves exactly one coercion warning, not two.
    expect(all.match(/NAs introduced by coercion/g)?.length, all).toBe(1);
  });

  test("output produced before an error survives the error", async ({ page }) => {
    await setEditorCode(
      page,
      [
        'cat("KEEP-1\\n")',
        'print("KEEP-2")',
        'plot(1:5, main = "KEEP-3")',
        'stop("deliberate failure")',
      ].join("\n"),
    );

    const cells = await runAndCollect(page);
    const all = describeCells(cells);
    expect(textOf(cells, "stdout"), all).toContain("KEEP-1");
    expect(textOf(cells, "stdout"), all).toContain("KEEP-2");
    expect(cells.filter((c) => c.type === "image").length, all).toBe(1);
    // The error is last, and names neither the harness file nor eval().
    expect(cells[cells.length - 1].body, all).toContain(
      "Error: deliberate failure",
    );
    expect(all).not.toContain(".pg_run_code");
    expect(all).not.toContain("eval(parse");
  });

  test("an error inside a function still names that function", async ({ page }) => {
    await setEditorCode(
      page,
      ["g <- function() stop(\"boom from g\")", "f <- function() g()", "f()"].join(
        "\n",
      ),
    );

    const cells = await runAndCollect(page);
    const all = describeCells(cells);
    expect(textOf(cells, "stderr"), all).toContain("boom from g");
    expect(textOf(cells, "stderr"), all).toContain("g()");
  });

  test("a rendered data frame shows what print() shows", async ({ page }) => {
    await setEditorCode(
      page,
      [
        'd <- data.frame(f = factor(c("low", "high")), b = c(TRUE, FALSE),',
        '                dt = as.Date(c("2024-01-31", "2024-02-01")),',
        '                s = c("", NA))',
        "d",
      ].join("\n"),
    );

    const cells = await runAndCollect(page);
    const all = describeCells(cells);
    const table = cells.find((c) => c.type === "html");
    expect(table, all).toBeTruthy();
    const html = table!.html;
    // Factor labels, not their integer codes; R's TRUE/FALSE, not JavaScript's;
    // dates, not days since the epoch.
    expect(html).toContain(">low<");
    expect(html).toContain(">high<");
    expect(html).toContain(">TRUE<");
    expect(html).toContain(">FALSE<");
    expect(html).toContain("2024-01-31");
    expect(html).not.toContain(">19753<");
    // Row names are carried through as an index column, as print() does.
    expect(html).toMatch(/<th>1<\/th>/);
    // NA is a value of its own, and the empty string is not it.
    expect(html).toContain("dataframe-na");
    expect(html.match(/dataframe-na/g)?.length).toBe(1);
  });

  test("every auto-printed data frame is rendered, in order", async ({ page }) => {
    await setEditorCode(
      page,
      [
        'a <- data.frame(x = 1:2, tag = c("AAA", "AAA"))',
        'b <- data.frame(x = 3:4, tag = c("BBB", "BBB"))',
        "a",
        "b",
        'cat("between\\n")',
        "head(a, 1)",
      ].join("\n"),
    );

    const cells = await runAndCollect(page);
    const all = describeCells(cells);
    const tables = cells.filter((c) => c.type === "html");
    expect(tables.length, all).toBe(3);
    expect(tables[0].html).toContain("AAA");
    expect(tables[1].html).toContain("BBB");
    // The narration keeps its place between the frames it introduces.
    expect(cells.findIndex((c) => c.body.includes("between")), all).toBe(2);
  });

  test("plots keep their place in the output", async ({ page }) => {
    await setEditorCode(
      page,
      [
        'plot(1:10, main = "first")',
        'cat("between plots\\n")',
        "barplot(c(3, 5, 2), main = \"second\")",
        'cat("after both\\n")',
      ].join("\n"),
    );

    const cells = await runAndCollect(page);
    const all = describeCells(cells);
    const types = cells.map((c) => c.type);
    expect(types.filter((t) => t === "image").length, all).toBe(2);
    expect(types, all).toEqual(["image", "stdout", "image", "stdout"]);
    expect(cells[1].body).toContain("between plots");
    expect(cells[3].body).toContain("after both");
  });

  test("output streams while the program is still running", async ({ page }) => {
    await setEditorCode(
      page,
      'for (i in 1:6) { cat("tick", i, "\\n"); Sys.sleep(1) }',
    );
    await page.locator(".run-btn").first().click();

    // Two seconds in, the first ticks must already be on screen — the whole
    // point is not having to wait for the run to end to see progress.
    await page.waitForTimeout(2500);
    const midRun = describeCells(await readCells(page));
    expect(midRun).toContain("tick 1");
    expect(midRun).not.toContain("tick 6");
    expect(await isIdle(page), "still running").toBe(false);

    await page.waitForFunction(
      () => {
        const btn = document.querySelector(".run-btn");
        return (
          !!btn &&
          !btn.classList.contains("stop") &&
          !btn.hasAttribute("disabled")
        );
      },
      null,
      { timeout: 60_000 },
    );
    expect(describeCells(await readCells(page))).toContain("tick 6");
  });

  test("Stop ends a runaway program and keeps what it printed", async ({
    page,
  }) => {
    await setEditorCode(page, ['cat("STARTED\\n")', "repeat { x <- 1 }"].join("\n"));
    await page.locator(".run-btn").first().click();

    const stop = page.locator(".run-btn.stop");
    await expect(stop).toBeVisible({ timeout: 10_000 });
    await stop.click();
    await page.waitForFunction(
      () => {
        const btn = document.querySelector(".run-btn");
        return (
          !!btn &&
          !btn.classList.contains("stop") &&
          !btn.hasAttribute("disabled")
        );
      },
      null,
      { timeout: 120_000 },
    );

    const cells = await readCells(page);
    const all = describeCells(cells);
    expect(all).toContain("STARTED");
    expect(all).toContain("Run stopped.");

    // The session that replaces the stopped one is a working one.
    await setEditorCode(page, 'cat("ALIVE\\n")');
    expect(describeCells(await runAndCollect(page))).toContain("ALIVE");
  });

  test("files a program writes reach the Files pane", async ({ page }) => {
    await setEditorCode(
      page,
      [
        'writeLines(c("a,b", "1,2"), "written_by_r.csv")',
        'png("plot_from_r.png"); plot(1:3); dev.off()',
        'cat("wrote:", paste(list.files(), collapse = ", "), "\\n")',
      ].join("\n"),
    );

    const cells = await runAndCollect(page);
    const all = describeCells(cells);
    expect(all).toContain("written_by_r.csv");

    await page.locator('[aria-label="Files"]').first().click();
    await expect(
      page.locator(".playground-files-name", { hasText: "written_by_r.csv" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator(".playground-files-name", { hasText: "plot_from_r.png" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("the working directory holds only the user's files", async ({ page }) => {
    await setEditorCode(page, 'cat(paste(list.files(), collapse = ", "), "\\n")');

    const cells = await runAndCollect(page);
    const all = describeCells(cells);
    // A coverage artifact of the WASM build, not something the user made.
    expect(all).not.toContain("default.profraw");
    expect(all).toContain("main.r");
  });
});
