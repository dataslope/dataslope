import { test, expect, type Page } from "@playwright/test";

// In-grid filter on an ENGINE-PAGED result: the filter is pushed down to SQL
// (query wrapped as a subquery + native LIKE/ILIKE WHERE) and re-paged, so it
// matches across the WHOLE result while only one page loads. Verified on all
// three engines (the LIKE/ILIKE dialect differs).

async function runSql(page: Page, sql: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
  await page.locator("button.run-btn-split-main, button.run-btn").first().click();
}

// Wait until the engine is idle: a query holds the "running" lock through its
// post-run schema refresh, and a filter re-query fired in that window is dropped.
async function waitIdle(page: Page) {
  await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
    timeout: 60_000,
  });
}

// A 600-row table (id, label "item_N", parity "even"/"odd"), built with each
// engine's own row generator. 600 > the default 50 rows/page, so the result is
// engine-paged; "even" matches 300 rows (still paged), "item_500" matches 1.
const ENGINES: { id: string; route: string; create: string }[] = [
  {
    id: "SQLite",
    route: "/playground/sqlite",
    create:
      "CREATE TABLE ftest AS WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM s WHERE n < 600) SELECT n AS id, 'item_' || n AS label, CASE WHEN n % 2 = 0 THEN 'even' ELSE 'odd' END AS parity FROM s;",
  },
  {
    id: "PostgreSQL",
    route: "/playground/postgres",
    create:
      "CREATE TABLE ftest AS SELECT g AS id, 'item_' || g AS label, CASE WHEN g % 2 = 0 THEN 'even' ELSE 'odd' END AS parity FROM generate_series(1, 600) g;",
  },
  {
    id: "DuckDB",
    route: "/playground/duckdb",
    create:
      "CREATE TABLE ftest AS SELECT i AS id, 'item_' || i AS label, CASE WHEN i % 2 = 0 THEN 'even' ELSE 'odd' END AS parity FROM range(1, 601) t(i);",
  },
];

for (const { id, route, create } of ENGINES) {
  test(`${id}: filtering an engine-paged result pushes the filter to SQL (paging preserved)`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator("button.run-btn-split-main, button.run-btn")
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    await runSql(page, create);
    await waitIdle(page);
    await runSql(page, "SELECT * FROM ftest;");
    const pagerInfo = page.locator(".sql-result-pager-info").first();
    await expect(pagerInfo).toContainText("of 600", { timeout: 40_000 });
    await waitIdle(page);

    // The filter field is a normal ENABLED input, no "load all" button, no
    // disabled state (engine-paged results are filterable via pushdown).
    const input = page.locator(".sql-result-filter-input");
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    expect(await page.locator(".sql-result-filter-trigger").count()).toBe(0);

    // (1) Filter "even" → 300 matches across the whole 600, but only ONE page
    //     (50) is loaded, proving the filter is pushed down AND the result is
    //     still paged (not loaded entirely into memory).
    await input.fill("even");
    await expect(pagerInfo).toContainText("filtered from 600", {
      timeout: 20_000,
    });
    await expect(pagerInfo).toContainText("of 300");
    await expect(pagerInfo).toContainText("1–50");
    await expect(page.locator(".sql-result-table tbody")).not.toContainText(
      "odd",
    );
    await waitIdle(page);

    // (2) "item_500" exercises LIKE-wildcard escaping (the `_` is literal) and
    //     a precise pushdown match → exactly 1 row of 600.
    await input.fill("item_500");
    await expect(pagerInfo).toContainText("of 1", { timeout: 20_000 });
    await expect(pagerInfo).toContainText("filtered from 600");
    await waitIdle(page);

    // (3) Clearing restores the full engine-paged result.
    await input.fill("");
    await expect(pagerInfo).toContainText("of 600", { timeout: 20_000 });
    await expect(pagerInfo).not.toContainText("filtered from");
  });
}

// A materialized (LIMIT) result stays in memory, so its filter is client-side
// (exact displayed-text match, instant, no re-query), verified on SQLite.
test("SQLite: a small in-memory (LIMIT) result filters client-side", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/playground/sqlite");
  await page
    .locator(".sql-tree-item")
    .filter({ has: page.locator(".sql-tree-item-name", { hasText: /^users$/ }) })
    .first()
    .waitFor({ state: "visible", timeout: 120_000 });

  await runSql(page, "SELECT * FROM users LIMIT 20;");
  const pagerInfo = page.locator(".sql-result-pager-info").first();
  await expect(pagerInfo).toContainText("of 20", { timeout: 30_000 });
  await waitIdle(page);

  const input = page.locator(".sql-result-filter-input");
  await input.fill("Female");
  await expect(pagerInfo).toContainText("filtered from 20", { timeout: 10_000 });
  await input.fill("");
  await expect(pagerInfo).toContainText("of 20");
});
