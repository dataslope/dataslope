import { test, expect, type Page } from "@playwright/test";

// "Read/Fetch CSV from URL" examples in the Python/R/JS/TS playgrounds: load
// from the Examples menu, run, assert the remote penguins.csv was read.
// Needs heavy runtimes and a real network fetch, so opt-in:
//   CSV_E2E=1 npx playwright test e2e/csv-examples.spec.ts

const ENABLED = !!process.env.CSV_E2E;

async function waitForRuntimeReady(page: Page) {
  await page.waitForFunction(
    () => {
      const banner = document.querySelector(".loading-banner, .pg-status");
      const text = banner?.textContent ?? "";
      if (text.startsWith("Failed to load")) throw new Error(text);
      const btn = document.querySelector(".run-btn");
      return !!btn && !btn.hasAttribute("disabled");
    },
    null,
    { timeout: 150_000 },
  );
}

async function loadExampleByTitle(page: Page, title: string) {
  await page.locator('button[aria-label="Examples"]').click();
  const item = page
    .locator(".example-item")
    .filter({ has: page.locator(".ex-title", { hasText: title }) });
  await item.first().waitFor({ state: "visible", timeout: 10_000 });
  await item.first().click();
  // Loading an example over the (different) default code pops a confirm.
  const danger = page.locator(".confirm-popup .confirm-btn-danger");
  try {
    await danger.waitFor({ state: "visible", timeout: 2500 });
    await danger.click();
  } catch {
    /* no dialog, editor already matched / was empty */
  }
}

async function runAndCollect(page: Page) {
  const runBtn = page.locator(".run-btn").first();
  await runBtn.click();
  await expect(runBtn).toBeDisabled({ timeout: 5_000 }).catch(() => {});
  await expect(runBtn).toBeEnabled({ timeout: 150_000 });
  await page
    .waitForFunction(
      () => {
        const runs = [...document.querySelectorAll(".run-cell")];
        return (
          runs.length > 0 &&
          runs.every((c) =>
            (c.querySelector(".run-cell-ms")?.textContent ?? "").includes(
              "Done in",
            ),
          )
        );
      },
      null,
      { timeout: 150_000 },
    )
    .catch(() => {});

  // One entry per segment of the newest run, in the order they appear.
  return page.evaluate(() => {
    const runs = [...document.querySelectorAll(".run-cell")];
    const last = runs[runs.length - 1];
    if (!last) return [];
    return [...last.querySelectorAll(".run-cell-content > *")].map((c) => ({
      type: c.getAttribute("data-cell-type") ?? "unknown",
      body: c.textContent ?? "",
    }));
  });
}

const ERROR_MARKERS =
  /Traceback|is not defined|could not find function|cannot open URL|ReferenceError|SyntaxError|Error:/;

test.describe("CSV-from-URL examples", () => {
  test.skip(!ENABLED, "set CSV_E2E=1 to run (needs runtimes / network)");

  test("Python: Read CSV from URL", async ({ page }) => {
    await page.goto("/playground/python");
    await waitForRuntimeReady(page);
    await loadExampleByTitle(page, "Read CSV from URL");
    const cells = await runAndCollect(page);
    const all = cells.map((c) => `[${c.type}] ${c.body}`).join("\n");
    expect(all, all).toContain("344 rows");
    expect(all, all).toContain("Adelie");
    expect(all, all).not.toMatch(ERROR_MARKERS);
    expect(cells.some((c) => c.type === "html")).toBe(true); // head() table
  });

  test("R: Read CSV from URL", async ({ page }) => {
    await page.goto("/playground/r");
    await waitForRuntimeReady(page);
    await loadExampleByTitle(page, "Read CSV from URL");
    const cells = await runAndCollect(page);
    const all = cells.map((c) => `[${c.type}] ${c.body}`).join("\n");
    const stderr = cells
      .filter((c) => c.type === "stderr")
      .map((c) => c.body)
      .join("\n");
    expect(all, all).toContain("344 rows");
    expect(all, all).toContain("Adelie");
    expect(all, all).not.toMatch(ERROR_MARKERS);
    // Download progress is normal output, not an error cell.
    expect(stderr, stderr).not.toContain("trying URL");
    expect(cells.some((c) => c.type === "html")).toBe(true); // head() table
  });

  test("JavaScript: Fetch CSV from URL", async ({ page }) => {
    await page.goto("/playground/javascript");
    await waitForRuntimeReady(page);
    await loadExampleByTitle(page, "Fetch CSV from URL");
    const cells = await runAndCollect(page);
    const all = cells.map((c) => `[${c.type}] ${c.body}`).join("\n");
    expect(all, all).toContain("344 rows");
    expect(all, all).toContain("species");
    expect(all, all).toContain("Adelie");
    expect(all, all).not.toMatch(ERROR_MARKERS);
  });

  test("TypeScript: Fetch CSV from URL", async ({ page }) => {
    await page.goto("/playground/typescript");
    await waitForRuntimeReady(page);
    await loadExampleByTitle(page, "Fetch CSV from URL");
    const cells = await runAndCollect(page);
    const all = cells.map((c) => `[${c.type}] ${c.body}`).join("\n");
    expect(all, all).toContain("344 rows");
    expect(all, all).toContain("species");
    expect(all, all).toContain("Adelie");
    expect(all, all).not.toMatch(ERROR_MARKERS);
  });
});
