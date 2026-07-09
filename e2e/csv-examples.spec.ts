import { test, expect, type Page } from "@playwright/test";

// Verifies the "Read/Fetch CSV from URL" examples added to the Python, R,
// JavaScript and TypeScript playgrounds. Each loads the example from the
// Examples menu, runs it, and asserts the remote penguins.csv was read.
//
// Needs the heavy runtimes (fetched from CDNs) and reaches a real
// raw.githubusercontent.com CSV, so it's kept out of the default e2e run.
// Enable with:
//
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
