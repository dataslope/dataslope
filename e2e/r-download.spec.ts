import { test, expect, type Page } from "@playwright/test";

// E2E coverage for the R playground's data-handling fixes:
//   1. download.file() saves a file that shows up in the Files pane.
//   2. Printing a large data.frame is truncated (head + ellipsis + tail)
//      instead of dumping every row and freezing the page.
//
// Both need the heavy WebR runtime (fetched from a CDN), and the download
// test also reaches a real raw.githubusercontent.com CSV (~4 MB), so this
// spec is kept out of the default e2e run. Enable it with:
//
//   R_E2E=1 npx playwright test e2e/r-download.spec.ts

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

async function runAndCollect(page: Page) {
  const runBtn = page.locator(".run-btn").first();
  await runBtn.click();
  await expect(runBtn).toBeDisabled({ timeout: 5_000 }).catch(() => {});
  await expect(runBtn).toBeEnabled({ timeout: 150_000 });
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll(".out-cell")].length > 0 &&
        [...document.querySelectorAll(".out-cell")].every((c) =>
          (c.querySelector(".cell-time")?.textContent ?? "").includes("Done in"),
        ),
      null,
      { timeout: 150_000 },
    )
    .catch(() => {});

  const cells = await page.locator(".out-cell").all();
  const out: { type: string; body: string }[] = [];
  for (const cell of cells) {
    const cls = (await cell.getAttribute("class")) ?? "";
    const type =
      cls
        .split(/\s+/)
        .find((c) =>
          ["stdout", "stderr", "html", "image", "plot"].includes(c),
        ) ?? "unknown";
    const body = (await cell.locator(".out-cell-body").textContent()) ?? "";
    out.push({ type, body });
  }
  return out;
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
