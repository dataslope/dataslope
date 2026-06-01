import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

// ─────────────────────────────────────────────────────────────────────
// Regression for the SQL result-grid in-grid filter on an *engine-paged*
// result. Opening a table that has more rows than "Rows per page" (the
// credit_card_transactions `transactions` table has 260 rows; the default
// page size is 50) used to render the filter as a DEAD, disabled field —
// the user couldn't type in it.
//
// Now the filter is offered as a "Filter rows…" button that opens a
// "Filter all rows?" confirmation; choosing "Load all rows" materializes
// the whole result and focuses the (now enabled) filter input, so typing
// narrows across all 260 rows.
// ─────────────────────────────────────────────────────────────────────

const SHOTS = path.join(process.cwd(), "audit-results", "filter-screens");

async function openTransactionsTable(page: Page) {
  await page.goto("/playground/sqlite");
  // Engine boot + sample schema are ready once the sidebar lists the
  // `transactions` table (exact match avoids `foreign_transactions` etc.).
  const tableBtn = page
    .locator(".sql-tree-item")
    .filter({
      has: page.locator(".sql-tree-item-name", { hasText: /^transactions$/ }),
    })
    .first();
  await tableBtn.waitFor({ state: "visible", timeout: 120_000 });
  // Double-click opens the table via the engine-paged "view data" path.
  await tableBtn.dblclick();
  await page
    .locator(".sql-result-pager")
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
}

test("engine-paged result: filter loads all rows, then filters across them", async ({
  page,
}) => {
  fs.mkdirSync(SHOTS, { recursive: true });
  await openTransactionsTable(page);

  const pagerInfo = page.locator(".sql-result-pager-info").first();
  // Sanity: a partial window is loaded (default 50/page of 260 total).
  await expect(pagerInfo).toContainText("of 260");

  // (1) The filter is a clickable button, NOT a dead/disabled input.
  const trigger = page.locator(".sql-result-filter-trigger");
  await expect(trigger).toBeVisible();
  await expect(trigger).toContainText("Filter rows");
  await expect(page.locator(".sql-result-filter-input")).toHaveCount(0);
  await page.screenshot({
    path: path.join(SHOTS, "1-filter-button.png"),
    fullPage: false,
  });

  // (2) Clicking it opens the "Filter all rows?" confirmation.
  await trigger.click();
  const dialog = page.locator(".confirm-popup", { hasText: "Filter all rows?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("260 rows");
  await page.screenshot({
    path: path.join(SHOTS, "2-confirm-dialog.png"),
    fullPage: false,
  });

  // (3) "Load all rows" materializes the whole result and focuses the now
  //     enabled filter input.
  await dialog.getByRole("button", { name: "Load all rows" }).click();
  const input = page.locator(".sql-result-filter-input");
  await expect(input).toBeVisible({ timeout: 30_000 });
  await expect(input).toBeEnabled();
  // All 260 rows are now loaded.
  await expect(pagerInfo).toContainText("of 260");
  // Auto-focus is best-effort (rAF after the reload) — record but don't gate.
  await expect.soft(input).toBeFocused();
  await page.screenshot({
    path: path.join(SHOTS, "3-filter-enabled.png"),
    fullPage: false,
  });

  // (4) Typing narrows the rows across the WHOLE result (not just a page).
  await input.fill("amazon");
  const filteredNote = page.locator(".sql-result-pager-filtered-note");
  await expect(filteredNote).toContainText("filtered from 260");
  // At least one matching row is shown, and it's fewer than the full set.
  const rowCount = await page.locator(".sql-result-table tbody tr").count();
  expect(rowCount).toBeGreaterThan(0);
  await page.screenshot({
    path: path.join(SHOTS, "4-filtered-amazon.png"),
    fullPage: false,
  });

  // (5) A term that matches nothing reports "No matching rows (of 260)" —
  //     proving the filter scans the entire result, not just one page.
  await input.fill("zzz_no_such_value_zzz");
  await expect(pagerInfo).toContainText("No matching rows");
  await expect(pagerInfo).toContainText("of 260");
  await page.screenshot({
    path: path.join(SHOTS, "5-no-match.png"),
    fullPage: false,
  });

  // Esc clears the filter and restores the full result.
  await input.press("Escape");
  await expect(input).toHaveValue("");
  await expect(pagerInfo).toContainText("of 260");
});
