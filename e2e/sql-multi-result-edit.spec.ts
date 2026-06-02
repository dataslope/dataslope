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

    // The row-select column only appears once the table's primary key is known
    // — which is also what enables PK-ordering on the edit re-fetch and fixes
    // the column offsets (a leading select column). Wait for it before editing.
    const waitForPkLoaded = () =>
      grid
        .locator(".sql-result-row-checkbox")
        .first()
        .waitFor({ state: "visible", timeout: 40_000 });

    // Set 1 (t1, a `… LIMIT 10`): editable against its own table. A LIMIT
    // window's rows are arbitrary without an ORDER BY, so confirm the commit via
    // the undo bar (which reports the table) rather than pinning positions.
    await waitForPkLoaded();
    await commitCell(page, row1().locator("td:nth-child(3)"), S1);
    await expect(undoBar).toContainText("Updated 1 cell", { timeout: 40_000 });
    await expect(undoBar).toContainText(t1);

    // Set 2 (t2, an unbounded `SELECT *`): the reported case — editing a cell
    // used to shove the row to the bottom under PG/DuckDB MVCC. Editing it right
    // after Set 1 also exercises the run queue: Set 2's re-fetch is enqueued
    // behind Set 1's still-in-flight one instead of being dropped. After the fix
    // the edit persists AND the grid is stably PK-ordered (row 1 is the smallest
    // PK, "1"), not heap order with the edited row dumped last. Also proves
    // per-set targeting (undo bar → t2) and that the view stays on Set 2.
    await setTabs.getByRole("tab", { name: "Set 2" }).click();
    await waitForPkLoaded();
    await commitCell(page, row1().locator("td:nth-child(4)"), S2);
    await expect(undoBar).toContainText("Updated 1 cell", { timeout: 40_000 });
    await expect(undoBar).toContainText(t2);
    await expect(grid.getByText(S2)).toBeVisible({ timeout: 40_000 });
    await expect(row1().locator("td:nth-child(2)")).toHaveText("1");
    await expect(setTabs.getByRole("tab", { name: "Set 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
}
