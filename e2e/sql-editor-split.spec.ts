import { test, expect, type Page } from "@playwright/test";

// The drag handle between the SQL editor and its results sets a split that
// every query tab shares. It used to be an inline `grid-template-rows` that
// each playground wiped whenever a table view or ER diagram took over the
// panes, so a query tab came back at the default height after a round trip
// through "View data", and a reload always forgot it.

const ENGINES = [
  { id: "SQLite", route: "/playground/sqlite" },
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
];

const runButton = (page: Page) =>
  page.locator("button.run-btn-split-main, button.run-btn").first();

async function waitReady(page: Page) {
  await runButton(page).waitFor({ state: "visible", timeout: 150_000 });
  await expect(runButton(page)).toBeEnabled({ timeout: 150_000 });
}

async function editorHeight(page: Page): Promise<number> {
  const box = await page.locator(".sql-editor-pane").boundingBox();
  if (!box) throw new Error("editor pane is not visible");
  return box.height;
}

async function dragResizer(page: Page, dy: number) {
  const box = await page.locator(".sql-resizer").boundingBox();
  if (!box) throw new Error("resizer is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy / 2);
  await page.mouse.move(x, y + dy);
  await page.mouse.up();
}

for (const { id, route } of ENGINES) {
  test(`${id}: the editor height survives a table view and a reload`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(route);
    await waitReady(page);

    const table = `split_probe_${Date.now().toString(36)}`;
    const editor = page.locator(".cm-content");
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Delete");
    await page.keyboard.insertText(
      `CREATE TABLE ${table} (id INTEGER); INSERT INTO ${table} VALUES (1);`,
    );
    await runButton(page).click();
    await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
      timeout: 60_000,
    });

    const before = await editorHeight(page);
    await dragResizer(page, 160);
    const dragged = await editorHeight(page);
    expect(dragged).toBeGreaterThan(before + 100);

    const queryTab = page.locator('.playground-tabs [role="tab"][aria-selected="true"]');
    const queryTabId = await queryTab.getAttribute("data-tab-id");

    // Open the table's data view, which hides the editor and takes over the
    // panes' grid, then come back to the query tab.
    const entity = page.locator(".sql-tree-entity", { hasText: table }).first();
    await entity.hover();
    await entity.getByRole("button", { name: "View data" }).click();
    await expect(page.locator(".sql-editor-pane")).toBeHidden();
    await page.locator(`[role="tab"][data-tab-id="${queryTabId}"]`).click();
    await expect(page.locator(".sql-editor-pane")).toBeVisible();
    expect(Math.abs((await editorHeight(page)) - dragged)).toBeLessThanOrEqual(2);

    // A fresh navigation rather than `reload()`: same storage, and it does not
    // revalidate the engine's CDN module, which flakes in sandboxed runners.
    await page.goto(route);
    await waitReady(page);
    await page.locator(`[role="tab"][data-tab-id="${queryTabId}"]`).click();
    expect(Math.abs((await editorHeight(page)) - dragged)).toBeLessThanOrEqual(2);
  });
}
