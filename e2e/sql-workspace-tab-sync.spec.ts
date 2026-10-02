import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// A workspace's database and its query tabs have to come back together, and
// as they were left, when the playground is closed and reopened.
//
// SQLite failed this after "New Database → Overwrite this workspace": the
// engine resolved the persisted `__blank__` id to the first sample on every
// boot, so the reopened workspace was labelled `credit_card_transactions.db`,
// its edits were saved under that sample's tab keys, and the next session
// restored the tabs from the session before. Postgres and DuckDB instead
// restored whatever tabs were last saved for the blank slot, from an earlier
// database. A new page is a new session: sessionStorage starts empty, so the
// workspace is resumed from the device-wide pointer, as after a restart.

const ENGINES = [
  { id: "SQLite", route: "/playground/sqlite", playground: "sqlite" },
  { id: "PostgreSQL", route: "/playground/postgres", playground: "postgres" },
  { id: "DuckDB", route: "/playground/duckdb", playground: "duckdb" },
];

const runButton = (page: Page) =>
  page.locator("button.run-btn-split-main, button.run-btn").first();
const tabs = (page: Page) => page.locator('.playground-tabs [role="tab"]');
const dbLabel = (page: Page) =>
  page.getByRole("combobox", { name: "Select sample database" });

async function open(context: BrowserContext, route: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(route);
  await runButton(page).waitFor({ state: "visible", timeout: 150_000 });
  await expect(runButton(page)).toBeEnabled({ timeout: 150_000 });
  return page;
}

async function replaceEditor(page: Page, sql: string) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
}

for (const { id, route, playground } of ENGINES) {
  test(`${id}: an overwritten workspace reopens with its own database and latest tabs`, async ({
    context,
  }) => {
    test.setTimeout(420_000);

    // Session 1: overwrite the default workspace with a blank database.
    let page = await open(context, route);
    await dbLabel(page).click();
    await page.getByRole("option", { name: /New Database/ }).click();
    await page.getByRole("button", { name: "Overwrite this workspace" }).click();
    await expect(tabs(page)).toHaveCount(1, { timeout: 60_000 });
    await expect(runButton(page)).toBeEnabled({ timeout: 60_000 });
    const blankLabel = (await dbLabel(page).innerText()).trim();

    await replaceEditor(page, "CREATE TABLE probe (id INTEGER);");
    await runButton(page).click();
    await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
      timeout: 60_000,
    });
    await page.locator(".playground-tab-add").click();
    await expect(tabs(page)).toHaveCount(2);
    await replaceEditor(page, "SELECT 'from session one';");
    // DuckDB debounces tab saves; closing flushes them on pagehide, but a
    // beat here keeps the test about restore rather than about that flush.
    await page.waitForTimeout(800);
    await page.close();

    // Session 2: same database, same tabs, and edits keep landing there.
    page = await open(context, route);
    await expect(dbLabel(page)).toHaveText(blankLabel);
    await expect(tabs(page)).toHaveCount(2);
    await expect(page.locator(".cm-content")).toContainText("from session one");
    await page.locator(".playground-tab-add").click();
    await expect(tabs(page)).toHaveCount(3);
    await replaceEditor(page, "SELECT 'from session two';");
    await page.waitForTimeout(800);
    await page.close();

    // Session 3: the tabs are session two's, not session one's.
    page = await open(context, route);
    await expect(dbLabel(page)).toHaveText(blankLabel);
    await expect(tabs(page)).toHaveCount(3);
    await expect(page.locator(".cm-content")).toContainText("from session two");
    await page.close();
  });

  // The database choice used to be one device-wide key, so returning to a
  // workspace paired its data with the database chosen last anywhere: the
  // wrong label, and that database's tabs instead of the workspace's own.
  test(`${id}: each workspace keeps its own database and tabs`, async ({
    context,
  }) => {
    test.setTimeout(420_000);
    const pointer = `playground_active_ws_${playground}`;

    const page = await open(context, route);
    await dbLabel(page).click();
    await page.getByRole("option", { name: /New Database/ }).click();
    await page.getByRole("button", { name: "Overwrite this workspace" }).click();
    await expect(tabs(page)).toHaveCount(1, { timeout: 60_000 });
    await expect(runButton(page)).toBeEnabled({ timeout: 60_000 });
    const blankLabel = (await dbLabel(page).innerText()).trim();
    await page.locator(".playground-tab-add").click();
    await replaceEditor(page, "SELECT 'first workspace';");
    await page.waitForTimeout(800);
    const first = await page.evaluate((k) => sessionStorage.getItem(k), pointer);
    expect(first).toBeTruthy();

    // Open a sample in a new workspace (SQLite and DuckDB reload into it,
    // Postgres switches in place).
    await dbLabel(page).click();
    await page.locator(".sql-db-popup .sql-db-item").last().click();
    await page.getByRole("button", { name: "Open in new workspace" }).click();
    await expect(dbLabel(page)).not.toHaveText(blankLabel, { timeout: 150_000 });
    await expect(runButton(page)).toBeEnabled({ timeout: 150_000 });
    const sampleLabel = (await dbLabel(page).innerText()).trim();
    const second = await page.evaluate((k) => sessionStorage.getItem(k), pointer);
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
    await page.locator(".playground-tab-add").click();
    await replaceEditor(page, "SELECT 'second workspace';");
    await page.waitForTimeout(800);

    // Back to the first workspace, the way the workspace switcher does it.
    await page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [pointer, first ?? ""]);
    await page.goto("about:blank");
    await page.goto(route);
    await expect(runButton(page)).toBeEnabled({ timeout: 150_000 });
    await expect(dbLabel(page)).toHaveText(blankLabel);
    await expect(tabs(page)).toHaveCount(2);
    await expect(page.locator(".cm-content")).toContainText("first workspace");

    // And forward again.
    await page.evaluate(([k, v]) => sessionStorage.setItem(k, v), [pointer, second ?? ""]);
    await page.goto("about:blank");
    await page.goto(route);
    await expect(runButton(page)).toBeEnabled({ timeout: 150_000 });
    await expect(dbLabel(page)).toHaveText(sampleLabel);
    await expect(page.locator(".cm-content")).toContainText("second workspace");
  });
}
