import { test, expect, type Page } from "@playwright/test";

// Dropping a file anywhere on a SQL playground. The whole page is a drop
// target: the file is recognised from its first bytes and a confirmation
// offers what this engine can do with it, instead of the reader having to
// find the matching entry in the Import menu first.

/** Dispatch a real drag sequence carrying one file at the page level. */
async function dropFile(
  page: Page,
  name: string,
  text: string,
  selector = "body",
) {
  await page.evaluate(
    ({ name, text, selector }) => {
      const file = new File([new TextEncoder().encode(text)], name);
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const target = document.querySelector(selector);
      if (!target) throw new Error(`no ${selector}`);
      for (const type of ["dragenter", "dragover", "drop"]) {
        target.dispatchEvent(
          new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
          }),
        );
      }
    },
    { name, text, selector },
  );
}

async function waitForPlayground(page: Page) {
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });
}

const CSV = "id,city\n1,Davis\n2,Woodland\n";

test("SQLite: a dropped CSV becomes a table, and a dropped dump replaces the database", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/playground/sqlite");
  await waitForPlayground(page);

  const dialog = page.locator(".sql-import-popup");

  // ── A CSV is offered as a new table, and lands in the CSV preview ──
  await dropFile(page, "cities.csv", CSV);
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog).toContainText("Import cities.csv?");
  await expect(dialog).toContainText("cities.csv");
  await page.getByRole("button", { name: /Add it as a new table/ }).click();
  // The playground's own CSV import dialog takes over, pre-loaded.
  await expect(page.locator(".sql-import-preview")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Cancel" }).first().click();

  // ── A SQL dump is offered as a replacement database ──
  await dropFile(
    page,
    "seed.sql",
    "CREATE TABLE dropped_in (id INTEGER);\nINSERT INTO dropped_in VALUES (1);\n",
  );
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog).toContainText("Run seed.sql?");
  await page
    .getByRole("button", { name: /Run the dump in this workspace/ })
    .click();
  await expect(dialog).toBeHidden({ timeout: 60_000 });
  await expect(
    page.locator(".sql-tree-item-name", { hasText: /^\s*dropped_in\s*$/ }).first(),
  ).toBeVisible({ timeout: 30_000 });
});

test("SQLite: an unreadable file is refused, and the editor's own drops still work", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/playground/sqlite");
  await waitForPlayground(page);

  const dialog = page.locator(".sql-import-popup");
  await dropFile(page, "notes.md", "# just some prose, not a data file\n");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog).toContainText("Can't import notes.md");
  await expect(dialog).toContainText(/Drop a database file/);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

for (const { id, route } of [
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
]) {
  test(`${id}: a dropped SQLite database is refused with an explanation`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.goto(route);
    await waitForPlayground(page);

    // The 16-byte magic header is what the sniffer recognises.
    await dropFile(page, "chinook.db", `SQLite format 3\0${"x".repeat(200)}`);
    const dialog = page.locator(".sql-import-popup");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toContainText("SQLite database");
    await expect(dialog).toContainText(/Open it in the SQLite playground/);
    await page.getByRole("button", { name: "Cancel" }).click();

    // A CSV, which this engine does read, is offered as a table.
    await dropFile(page, "cities.csv", CSV);
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toContainText("Import cities.csv?");
    await page.getByRole("button", { name: /Add it as a new table/ }).click();
    await expect(page.locator(".sql-import-preview")).toBeVisible({
      timeout: 30_000,
    });
  });
}
