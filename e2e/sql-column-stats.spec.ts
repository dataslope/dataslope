import { test, expect, type Page, type Locator } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// "Column statistics" inspector in the shared result grid.
// Right-clicking a column header opens its context menu; "Column
// statistics" computes descriptive stats over the loaded rows and shows
// them in a dialog. Verified live on all three engines (the feature lives
// entirely in the shared ResultView, so it behaves identically).
// ─────────────────────────────────────────────────────────────────────

async function runSql(page: Page, sql: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .click();
}

async function waitIdle(page: Page) {
  await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
    timeout: 60_000,
  });
}

// Open the column-statistics dialog for the data column at `colIndex`
// (0 = first data column; the row-select checkbox column has no menu).
async function openColumnStats(page: Page, colIndex: number) {
  await page
    .locator(".sql-result-th-ctx-trigger")
    .nth(colIndex)
    .click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Column statistics" })
    .click();
  await expect(page.locator(".sql-col-stats-popup")).toBeVisible();
}

// The value cell of the stats row whose label is exactly `label`.
function statValue(page: Page, label: string): Locator {
  return page
    .locator(".sql-col-stats-popup .sql-col-stats-row")
    .filter({
      has: page.locator(".sql-col-stats-label", {
        hasText: new RegExp(`^${label}$`),
      }),
    })
    .locator(".sql-col-stats-value");
}

// id, amount (10/20/30/NULL), category ('a'×3, 'b'×1), standard SQL that
// every engine accepts, with known stats we can assert exactly.
const SETUP = [
  "CREATE TABLE stest (id INTEGER, amount INTEGER, category TEXT);",
  "INSERT INTO stest VALUES (1, 10, 'a'), (2, 20, 'b'), (3, 30, 'a'), (4, NULL, 'a');",
].join("\n");

const ENGINES = [
  { id: "SQLite", route: "/playground/sqlite" },
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
];

for (const { id, route } of ENGINES) {
  test(`${id}: column statistics (numeric + text)`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator("button.run-btn-split-main, button.run-btn")
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    await runSql(page, SETUP);
    await waitIdle(page);
    await runSql(page, "SELECT * FROM stest;");
    await expect(page.locator(".sql-result-table tbody tr")).toHaveCount(4, {
      timeout: 40_000,
    });
    await waitIdle(page);

    // ── Numeric column (`amount`, the 2nd data column) ──
    await openColumnStats(page, 1);
    await expect(statValue(page, "Rows")).toHaveText("4");
    await expect(statValue(page, "Non-null")).toHaveText("3");
    await expect(statValue(page, "Null")).toHaveText("1 (25%)");
    await expect(statValue(page, "Distinct")).toHaveText("3");
    await expect(statValue(page, "Min")).toHaveText("10");
    await expect(statValue(page, "Max")).toHaveText("30");
    await expect(statValue(page, "Mean")).toHaveText("20");
    await expect(statValue(page, "Median")).toHaveText("20");
    await expect(statValue(page, "Sum")).toHaveText("60");
    await expect(page.locator(".sql-col-stats-foot")).toContainText(
      "Numeric column",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator(".sql-col-stats-popup")).toHaveCount(0);

    // ── Text column (`category`, the 3rd data column) ──
    await openColumnStats(page, 2);
    await expect(statValue(page, "Non-null")).toHaveText("4");
    await expect(statValue(page, "Distinct")).toHaveText("2");
    await expect(statValue(page, "Min length")).toHaveText("1");
    await expect(statValue(page, "Max length")).toHaveText("1");
    await expect(page.locator(".sql-col-stats-foot")).toContainText(
      "Text column",
    );
    // Most-frequent list: 'a' (3) ranks first.
    const topFirst = page.locator(".sql-col-stats-top-item").first();
    await expect(topFirst).toContainText("a");
    await expect(topFirst.locator(".sql-col-stats-top-count")).toHaveText("3");
    await page.keyboard.press("Escape");
    await expect(page.locator(".sql-col-stats-popup")).toHaveCount(0);
  });
}
