import { test, expect, type Page } from "@playwright/test";

// "Explain" toolbar action: shows the query's execution plan in a read-only
// modal. SQLite uses EXPLAIN QUERY PLAN; Postgres/DuckDB use plain EXPLAIN.
// Shared ExplainPlanDialog + utils/explain.ts across all three engines.

async function typeInEditor(page: Page, sql: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
}

async function runSql(page: Page, sql: string) {
  await typeInEditor(page, sql);
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

const ENGINES = [
  { id: "SQLite", route: "/playground/sqlite" },
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
];

for (const { id, route } of ENGINES) {
  test(`${id}: Explain shows the query plan`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator("button.run-btn-split-main, button.run-btn")
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    await runSql(
      page,
      "CREATE TABLE widgets (id INTEGER, name TEXT); INSERT INTO widgets VALUES (1,'a'),(2,'b');",
    );
    await waitIdle(page);

    // Put a query in the editor (don't run it) and Explain it.
    await typeInEditor(page, "SELECT * FROM widgets WHERE id > 0;");
    await page.getByRole("button", { name: "Explain" }).click();

    const dlg = page.locator(".sql-explain-popup");
    await expect(dlg).toBeVisible();
    // The subtitle echoes the explained statement.
    await expect(dlg.locator(".sql-explain-subtitle")).toContainText("widgets");
    // The plan is non-empty and references the scanned table.
    const plan = dlg.locator(".sql-explain-plan");
    await expect(plan).toBeVisible();
    await expect(plan).not.toHaveText("(no plan returned)");
    await expect(plan).toContainText("widgets");

    // Whatever the engine draws with, the plan is rendered in characters the
    // site's monospace face actually has. DuckDB returns a box-drawing tree,
    // and those glyphs come from a wider fallback font, which sheared the
    // drawing away from the labels it frames; they are redrawn in ASCII.
    const planText = (await plan.textContent()) ?? "";
    expect(planText).not.toMatch(/[\u2500-\u257f]/);

    // Every line of a drawn tree is the same width — the borders line up.
    // Only rows framed on both sides count, so SQLite's `|--SCAN t` detail
    // lines aren't mistaken for box art.
    const drawn = planText
      .split("\n")
      .filter((line) => /^[+|].*[+|]$/.test(line));
    if (drawn.length > 1) {
      expect(new Set(drawn.map((line) => line.length)).size).toBe(1);
    }

    // Closes cleanly (the footer's primary "Close" button).
    await dlg.locator("button.confirm-btn-primary").click();
    await expect(dlg).toHaveCount(0);
  });
}
