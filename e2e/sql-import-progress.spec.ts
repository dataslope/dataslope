import { test, expect, type Page } from "@playwright/test";

// Feedback while a dropped database file is imported. A large file spends
// seconds being read and more seconds inside the engine; the dialog used to
// sit on an idle dropzone for all of it, so the import read as a no-op. The
// dropzone is now replaced by a progress panel that names the phase, counts
// the bytes read, and keeps an elapsed clock. Verified on all three SQL
// playgrounds, whose import dialogs share the panel.

/** A dump big enough to cross the "this can take a while" threshold (8 MB)
 *  and to keep the engine busy for seconds, so the panel is observable rather
 *  than a flash. Plain standard SQL: every engine accepts it. */
function bigDump(): string {
  const lines = ["CREATE TABLE imported (id INTEGER, note TEXT);"];
  const note = "x".repeat(180);
  // 100k rows in batches of 200 values, ~20 MB of text.
  for (let batch = 0; batch < 500; batch += 1) {
    const values: string[] = [];
    for (let i = 0; i < 200; i += 1) {
      values.push(`(${batch * 200 + i}, '${note}')`);
    }
    lines.push(`INSERT INTO imported (id, note) VALUES ${values.join(",")};`);
  }
  return `${lines.join("\n")}\n`;
}

async function waitForPlayground(page: Page) {
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });
}

/** Assert the panel showed the work: a phase label, the file, its size, the
 *  "large file" warning, and a bar that is either measured or sweeping. */
async function expectProgressPanel(page: Page, filename: string) {
  const panel = page.locator(".sql-import-progress");
  await expect(panel).toBeVisible({ timeout: 30_000 });
  await expect(panel).toContainText(
    /Reading file|Decoding SQL dump|Replaying SQL dump|Restoring dump|Reading schema|Importing/,
  );
  await expect(panel).toContainText(filename);
  await expect(panel).toContainText(/\d+(\.\d+)? MB/);
  await expect(panel).toContainText("can take a while");
  await expect(panel.locator('[role="progressbar"]')).toHaveCount(1);
  // The dropzone is gone while the import runs, so a second file cannot be
  // dropped onto a database that is already being replaced.
  await expect(page.locator(".sql-dropzone")).toHaveCount(0);
}

test("SQLite: importing a database file shows read and engine progress", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/playground/sqlite");
  await waitForPlayground(page);

  await page.locator('[aria-label="Select sample database"]').click();
  await page.getByRole("option", { name: /Import Database/ }).click();

  const dialog = page.locator(".sql-import-popup");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".sql-dropzone")).toBeVisible();

  await dialog.locator('input[aria-label="Choose database file"]').setInputFiles({
    name: "big-import.sql",
    mimeType: "application/sql",
    buffer: Buffer.from(bigDump()),
  });

  await expectProgressPanel(page, "big-import.sql");

  // The importer closes the dialog on success and the imported table lands in
  // the sidebar.
  await expect(dialog).toBeHidden({ timeout: 180_000 });
  await expect(page.getByText(/Imported "big-import.sql"/)).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.locator(".sql-tree-item-name", { hasText: /^\s*imported\s*$/ }).first(),
  ).toBeVisible({ timeout: 30_000 });
});

for (const { id, route } of [
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
]) {
  test(`${id}: importing a SQL dump shows read and engine progress`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.goto(route);
    await waitForPlayground(page);

    await page.locator('[aria-label="Select sample database"]').click();
    await page.getByRole("option", { name: /Import SQL Dump/ }).click();

    const dialog = page.locator(".sql-import-popup");
    await expect(dialog).toBeVisible();

    await dialog
      .locator('input[aria-label="Choose SQL dump file"]')
      .setInputFiles({
        name: "big-import.sql",
        mimeType: "application/sql",
        buffer: Buffer.from(bigDump()),
      });

    // Postgres offers a target choice after the read (overwrite vs. a new
    // workspace); picking one starts the engine phase with the panel back up.
    const overwrite = page.getByRole("button", {
      name: "Overwrite this workspace",
    });
    if (await overwrite.isVisible().catch(() => false)) {
      await expect(dialog).toContainText(/\d+(\.\d+)? MB/);
      await overwrite.click();
    }

    await expectProgressPanel(page, "big-import.sql");
    await expect(dialog).toBeHidden({ timeout: 180_000 });
    await expect(page.getByText(/Loaded "big-import.sql"/)).toBeVisible({
      timeout: 30_000,
    });
  });
}
