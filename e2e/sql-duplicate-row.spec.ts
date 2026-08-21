import { test, expect, type Page } from "@playwright/test";

// "Duplicate row" in the shared result grid. A row whose primary key or
// UNIQUE columns the database won't re-generate used to leave the menu item
// greyed out with a "cannot duplicate" popover; it now opens a dialog that
// asks what the copy should carry in each of those columns. A row with
// nothing to answer for still duplicates straight from the menu.

async function runSql(page: Page, sql: string) {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(sql);
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .click();
  await expect(page.locator(".run-btn-spinner")).toHaveCount(0, {
    timeout: 60_000,
  });
}

// Right-click the first data row and return the "Duplicate row" menu item
// (its label gains an ellipsis when it opens the dialog).
async function openRowMenu(page: Page) {
  await page
    .locator(".sql-result-table-wrap tbody tr")
    .first()
    .locator("td")
    .nth(1)
    .click({ button: "right" });
  return page.getByRole("menuitem", { name: /^Duplicate row/ });
}

function dataRows(page: Page) {
  return page.locator(".sql-result-table-wrap tbody tr");
}

const ENGINES = [
  { id: "SQLite", route: "/playground/sqlite" },
  { id: "PostgreSQL", route: "/playground/postgres" },
  { id: "DuckDB", route: "/playground/duckdb" },
];

// A plain `INT PRIMARY KEY` (no sequence, no rowid alias) plus a UNIQUE text
// column: two values the database can't invent, on every engine.
const CONFLICTING = [
  "DROP TABLE IF EXISTS zz_dup_conflict;",
  "CREATE TABLE zz_dup_conflict (id INT PRIMARY KEY, email TEXT UNIQUE, name TEXT);",
  "INSERT INTO zz_dup_conflict VALUES (1, 'ada@example.com', 'Ada');",
].join("\n");

for (const { id, route } of ENGINES) {
  test(`${id}: duplicating a row with a plain primary key goes through the dialog`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page.locator(".cm-content").waitFor({ timeout: 150_000 });

    await runSql(page, CONFLICTING);
    await runSql(page, "SELECT * FROM zz_dup_conflict;");
    await expect(dataRows(page)).toHaveCount(1);

    const item = await openRowMenu(page);
    // The ellipsis is the tell that the item opens a dialog rather than
    // inserting straight away.
    await expect(item).toHaveText(/…$/);
    await item.click();

    const dialog = page.locator(".sql-duplicate-popup");
    await expect(dialog).toBeVisible();
    // Both unique columns are listed; the key defaults to the generated
    // option, the text column to an input seeded with a "(copy)" suggestion.
    await expect(dialog.locator(".sql-duplicate-col-name")).toHaveText([
      "id",
      "email",
    ]);
    await expect(
      dialog.getByRole("radio", { name: /Next available number/ }),
    ).toBeChecked();
    // A sole primary key and a single-column UNIQUE can never keep their
    // values, so "Keep original" must not be offered here at all.
    await expect(
      dialog.getByRole("radio", { name: "Keep original" }),
    ).toHaveCount(0);
    await page
      .getByLabel("Custom value for email")
      .fill("ada+copy@example.com");

    await dialog.getByRole("button", { name: "Duplicate row" }).click();
    await expect(dialog).toBeHidden();

    // The grid refetches the table: two rows, the copy carrying MAX(id) + 1
    // and the typed email.
    await expect(dataRows(page)).toHaveCount(2, { timeout: 60_000 });
    await expect(
      dataRows(page).nth(1).locator("td").nth(1),
    ).toHaveText("2");
    await expect(
      dataRows(page).nth(1).locator("td").nth(2),
    ).toHaveText("ada+copy@example.com");
  });

  test(`${id}: a composite key offers keep, but not for every member at once`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.goto(route);
    await page.locator(".cm-content").waitFor({ timeout: 150_000 });

    await runSql(
      page,
      [
        "DROP TABLE IF EXISTS zz_dup_pair;",
        "CREATE TABLE zz_dup_pair (a INT, b INT, note TEXT, PRIMARY KEY (a, b));",
        "INSERT INTO zz_dup_pair VALUES (1, 2, 'Ada');",
      ].join("\n"),
    );
    await runSql(page, "SELECT * FROM zz_dup_pair;");
    await (await openRowMenu(page)).click();

    const dialog = page.locator(".sql-duplicate-popup");
    await expect(dialog).toBeVisible();
    // Both members are asked about, and both may keep their value — one
    // member changing is enough to make the pair fresh.
    await expect(
      dialog.getByRole("radio", { name: "Keep original" }),
    ).toHaveCount(2);
    // ...but keeping EVERY member reproduces the copied key, so that plan
    // stays blocked.
    for (const col of ["a", "b"]) {
      await page.locator(`input[name="sql-duplicate-${col}"]`).last().check();
    }
    await expect(
      dialog.getByRole("button", { name: "Duplicate row" }),
    ).toBeDisabled();
    await expect(dialog.locator(".sql-duplicate-warning")).toContainText(
      "At least one key column has to change",
    );
    // Moving one member back to the generated number unblocks it.
    await page.locator('input[name="sql-duplicate-a"]').first().check();
    await expect(
      dialog.getByRole("button", { name: "Duplicate row" }),
    ).toBeEnabled();
  });
}

test("SQLite: an INTEGER PRIMARY KEY duplicates without asking", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/playground/sqlite");
  await page.locator(".cm-content").waitFor({ timeout: 150_000 });

  // `INTEGER PRIMARY KEY` is SQLite's rowid alias: leave it out of the INSERT
  // and SQLite assigns the next id, AUTOINCREMENT keyword or not. This is the
  // schema that used to be refused outright.
  await runSql(
    page,
    [
      "DROP TABLE IF EXISTS zz_dup_rowid;",
      "CREATE TABLE zz_dup_rowid (id INTEGER PRIMARY KEY, name TEXT);",
      "INSERT INTO zz_dup_rowid (name) VALUES ('Ada');",
    ].join("\n"),
  );
  await runSql(page, "SELECT * FROM zz_dup_rowid;");
  await expect(dataRows(page)).toHaveCount(1);

  const item = await openRowMenu(page);
  await expect(item).toHaveText("Duplicate row");
  await item.click();

  await expect(page.locator(".sql-duplicate-popup")).toHaveCount(0);
  await expect(dataRows(page)).toHaveCount(2, { timeout: 60_000 });
  await expect(dataRows(page).nth(1).locator("td").nth(1)).toHaveText("2");
  await expect(dataRows(page).nth(1).locator("td").nth(2)).toHaveText("Ada");
});
