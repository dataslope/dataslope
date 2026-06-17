import { test, expect } from "@playwright/test";

// The "result is above the editor" arrow hint. SQL blocks render run
// output as a tab in the table view ABOVE the editor (unlike the non-SQL
// code blocks, whose output sits below), so a curved arrow points the
// learner upward — but only while the Result tab is the active view.
//
// Each <SqlCodeBlock> exposes:
//   - root:  [data-testid="sql-code-block"] with [data-run-status]
//   - run:   [data-testid="sql-codeblock-run"]
//   - arrow: [data-testid="result-location-arrow"] (only while Result active)

const DEMO_PAGES: { path: string; label: string }[] = [
  { path: "sql-code-blocks-sqlite", label: "SQLite" },
  { path: "sql-code-blocks-duckdb", label: "DuckDB" },
  { path: "sql-code-blocks-postgres", label: "PostgreSQL" },
];

test.describe("SQL result-location arrow", () => {
  for (const { path: pagePath, label } of DEMO_PAGES) {
    test(`${label} — arrow appears with the Result tab and hides otherwise`, async ({
      page,
    }) => {
      await page.goto(`/learn/${pagePath}`);

      const block = page.getByTestId("sql-code-block").first();
      await expect(block).toBeVisible({ timeout: 60_000 });
      await block.scrollIntoViewIfNeeded();

      const arrow = block.getByTestId("result-location-arrow");
      const runBtn = block.getByTestId("sql-codeblock-run");

      // No Result tab yet → no arrow.
      await expect(arrow).toHaveCount(0);

      // Run the block; the Result tab activates and the arrow appears.
      await expect(runBtn).toBeEnabled({ timeout: 120_000 });
      await runBtn.click();
      await expect
        .poll(async () => block.getAttribute("data-run-status"), {
          timeout: 120_000,
        })
        .not.toMatch(/running|loading/);
      expect(await block.getAttribute("data-run-status")).not.toBe("error");

      await expect(arrow).toBeVisible({ timeout: 30_000 });

      // The arrow is anchored above the editor's top edge — its bottom
      // should sit near the top of the editor, pointing up into the result.
      const editor = block.locator(".cm-editor").first();
      const arrowBox = await arrow.boundingBox();
      const editorBox = await editor.boundingBox();
      expect(arrowBox).not.toBeNull();
      expect(editorBox).not.toBeNull();
      if (arrowBox && editorBox) {
        // Top of the arrow is above the editor (reaching into the result).
        expect(arrowBox.y).toBeLessThan(editorBox.y);
        // Arrow lives on the right-hand side of the card.
        const blockBox = await block.boundingBox();
        if (blockBox) {
          expect(arrowBox.x).toBeGreaterThan(blockBox.x + blockBox.width / 2);
        }
      }

      // Switching to a table tab (if any) hides the arrow; otherwise
      // dismissing the Result tab does. Prefer a real table tab so we
      // exercise the active-tab path.
      const tableTab = block
        .locator('[role="tab"]')
        .filter({ hasNotText: "Result" })
        .first();
      if (await tableTab.count()) {
        await tableTab.click();
        await expect(arrow).toHaveCount(0);

        // Back to the Result tab → arrow returns.
        await block.locator('[role="tab"]').filter({ hasText: "Result" }).first().click();
        await expect(arrow).toBeVisible();
      }

      // Closing the Result tab removes the arrow.
      await block.getByRole("button", { name: "Close result tab" }).click();
      await expect(arrow).toHaveCount(0);
    });
  }
});
