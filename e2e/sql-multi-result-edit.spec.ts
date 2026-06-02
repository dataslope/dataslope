import { test, expect, type Page } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────
// Multi-statement runs produce several result sets ("Set 1", "Set 2", …).
// Each set must be independently editable against its OWN table: double-click
// opens the inline editor, and a committed edit targets that set's table — not
// the query-wide one.
//
// Regression this guards: `sourceTable` used to be detected once for the whole
// query, and `bareTableSelectSource` returns null for anything containing a
// `;`, so EVERY set of a multi-statement run came back non-editable (a
// double-click did nothing). The fix detects an editable table per statement,
// positionally aligned with each engine's per-statement result sets.
//
// Verified on all three engines (the result-building lives in each playground;
// the editing UI is the shared ResultView).
// ─────────────────────────────────────────────────────────────────────

const S1 = "ZZ_SET1_EDIT";
const S2 = "ZZ_SET2_EDIT";

// `t1` is the first set (a `SELECT * … LIMIT 10`), `t2` the second. The string
// column edited sits at td:nth-child(3) for t1 (name) and (4) for t2 — one past
// the leading row-select column the editable grid renders.
const ENGINES: { id: string; route: string; t1: string; t2: string }[] = [
  { id: "SQLite", route: "/playground/sqlite", t1: "users", t2: "cards" },
  { id: "PostgreSQL", route: "/playground/postgres", t1: "users", t2: "cards" },
  { id: "DuckDB", route: "/playground/duckdb", t1: "customers", t2: "products" },
];

async function commitCell(
  page: Page,
  cell: ReturnType<Page["locator"]>,
  value: string,
) {
  await cell.dblclick();
  const input = page.locator(".sql-cell-input").first();
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press("Enter");
  await expect(page.locator(".sql-edit-commit-btn")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+Enter");
}

for (const { id, route, t1, t2 } of ENGINES) {
  test(`${id}: each result set of a multi-statement run edits its own table`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page
      .locator(".sql-tree-item")
      .filter({
        has: page.locator(".sql-tree-item-name", {
          hasText: new RegExp(`^${t1}$`),
        }),
      })
      .first()
      .waitFor({ state: "visible", timeout: 150_000 });

    // The user's scenario: two `SELECT *` statements → two result sets.
    const editor = page.locator(".cm-content");
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText(
      `SELECT * FROM ${t1} LIMIT 10;\nSELECT * FROM ${t2};`,
    );
    await page
      .locator("button.run-btn-split-main, button.run-btn")
      .first()
      .click();

    const setTabs = page.locator(".sql-result-set-tabs");
    await expect(setTabs).toBeVisible({ timeout: 40_000 });
    await expect(setTabs.getByRole("tab")).toHaveCount(2);

    const grid = page.locator(".sql-result-table");
    const row1 = () => grid.locator("tbody tr").first();
    const undoBar = page.locator(".sql-edit-undo-bar");

    // Set 1 (the reported case): double-click now opens the editor; commit and
    // confirm via the post-commit undo bar — which reports the table the edit
    // was applied to ("Updated 1 cell in <t1>"). (We assert the bar rather than
    // the grid because a materialized multi-statement re-fetch isn't PK-ordered,
    // so under PG/DuckDB MVCC the edited row may move within the result.)
    await expect(row1().locator("td:nth-child(3)")).toBeVisible({
      timeout: 40_000,
    });
    await commitCell(page, row1().locator("td:nth-child(3)"), S1);
    await expect(undoBar).toContainText("Updated 1 cell", { timeout: 40_000 });
    await expect(undoBar).toContainText(t1);

    // Set 2 edits ITS table — proving editability is per-set, and the write
    // targets t2 (not the query-wide t1). The view also stays on Set 2 across
    // the commit's re-fetch (it used to bounce back to Set 1).
    await setTabs.getByRole("tab", { name: "Set 2" }).click();
    await expect(row1().locator("td:nth-child(4)")).toBeVisible();
    await commitCell(page, row1().locator("td:nth-child(4)"), S2);
    await expect(undoBar).toContainText("Updated 1 cell", { timeout: 40_000 });
    await expect(undoBar).toContainText(t2);
    await expect(setTabs.getByRole("tab", { name: "Set 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
}
