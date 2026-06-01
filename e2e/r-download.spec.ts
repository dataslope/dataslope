import { test, expect, type Page } from "@playwright/test";

// Verifies the R playground's download.file() fix: a file fetched with
// download.file() must (1) actually download (WebR's built-in stalls without
// cross-origin isolation) and (2) show up in the Files pane.
//
// This test reaches the real WebR CDN and a real raw.githubusercontent.com
// CSV (~4 MB), so it is intentionally kept out of the default e2e run to avoid
// external-network flakiness. Enable it with:
//
//   R_NET_E2E=1 npx playwright test e2e/r-download.spec.ts
//
// (The webServer + Chromium are booted by playwright.config.ts as usual.)

const ENABLED = !!process.env.R_NET_E2E;

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

test.describe("R download.file()", () => {
  test.skip(!ENABLED, "set R_NET_E2E=1 to run (reaches external network)");

  test("downloads a CSV and shows it in the Files pane", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

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

    // The download must not error. download.file() prints "trying URL" /
    // "downloaded N bytes" via message() (an stderr cell) — those are
    // expected, so we look for genuine failure markers instead of any stderr.
    expect(allText, allText).not.toMatch(/cannot open URL/i);
    expect(allText, allText).not.toMatch(/could not find function/i);
    expect(allText, allText).not.toMatch(/download failed/i);
    expect(allText, allText).not.toMatch(/Error[:\s]/);

    // The file exists in the R working directory with real content.
    expect(allText).toContain("exists: TRUE");
    expect(allText).toMatch(/nbytes:\s*\d{4,}/); // at least a few KB

    // …and it now appears in the Files pane.
    await page.locator('[aria-label="Files"]').first().click();
    await expect(
      page.locator(".playground-files-name", { hasText: CSV_NAME }),
    ).toBeVisible({ timeout: 10_000 });

    // Guard against page errors from the download path, but tolerate the
    // app's pre-existing benign OPFS "NotFoundError" that fires on first
    // load of a brand-new workspace (create:false reads in fileStorage /
    // databaseStorage), which is unrelated to this feature.
    const relevantErrors = pageErrors.filter(
      (m) => !/requested file or directory could not be found/i.test(m),
    );
    expect(relevantErrors, relevantErrors.join("\n")).toEqual([]);
  });
});
