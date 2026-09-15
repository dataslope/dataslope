/**
 * The DuckDB playground's native database file. The engine has always been
 * able to write and read a real `.duckdb` image — it is how a workspace
 * snapshots itself and how a share bundle carries its data — but neither was
 * reachable from a menu, so the only way out of the playground was a SQL
 * dump. This drives the round trip the menus now offer: export the database,
 * then import the exported file back and find the same table in it.
 */
import { test, expect, type Page } from "@playwright/test";

interface CapturedDuckDbDownload {
  name: string;
  type: string;
  /** Base64, so the test can hand the bytes back to the import input. */
  data: string;
}

declare global {
  interface Window {
    // A name of its own: another spec declares `__downloads` with a
    // different shape, and the two declarations would merge.
    __duckdbDownloads?: CapturedDuckDbDownload[];
  }
}

/**
 * Record what the page hands the browser to download, keeping the bytes.
 * `URL.createObjectURL` is where the Blob is still reachable, and the
 * anchor's `download` attribute carries the filename; intercepting the click
 * keeps the browser's own download machinery out of it.
 */
async function captureDownloads(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__duckdbDownloads = [];
    const blobs = new Map<string, Blob>();
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (obj: Blob | MediaSource) => {
      const url = createObjectURL(obj);
      if (obj instanceof Blob) blobs.set(url, obj);
      return url;
    };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function patched(
      this: HTMLAnchorElement,
    ) {
      const blob = blobs.get(this.href);
      if (!blob) return click.call(this);
      const name = this.download;
      void blob.arrayBuffer().then((buffer) => {
        let binary = "";
        for (const byte of new Uint8Array(buffer)) {
          binary += String.fromCharCode(byte);
        }
        window.__duckdbDownloads!.push({ name, type: blob.type, data: btoa(binary) });
      });
    };
  });
}

const downloads = (page: Page) => page.evaluate(() => window.__duckdbDownloads ?? []);

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

/** Open the header's ⋯ menu and its named sub-panel. */
async function openMorePanel(page: Page, label: string) {
  await page.locator(".ph-more-btn").first().click();
  await page.locator(".ph-more-item", { hasText: label }).first().click();
}

test("DuckDB: a database exported as .duckdb imports back from the menu", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await captureDownloads(page);
  await page.goto("/playground/duckdb");
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });

  await runSql(
    page,
    "CREATE TABLE roundtrip AS SELECT 42 AS answer, 'kept' AS note;",
  );

  // ── Export ──
  await openMorePanel(page, "Export database");
  await page
    .locator(".example-item", { hasText: "DuckDB Database" })
    .first()
    .click();
  await expect
    .poll(() => downloads(page), { timeout: 60_000 })
    .toHaveLength(1);
  const [file] = await downloads(page);
  expect(file.name).toMatch(/\.duckdb$/);
  expect(file.data.length).toBeGreaterThan(0);

  // Drop the table so the import has something to restore.
  await runSql(page, "DROP TABLE roundtrip;");
  await expect(
    page.locator(".sql-tree-item-name", { hasText: /^\s*roundtrip\s*$/ }),
  ).toHaveCount(0, { timeout: 30_000 });

  // ── Import the very bytes that came out ──
  await page.locator('[aria-label="Select sample database"]').click();
  await page.getByRole("option", { name: /Import Database/ }).click();
  const dialog = page.locator(".sql-import-popup");
  await expect(dialog).toBeVisible();
  await dialog
    .locator('input[aria-label="Choose DuckDB database file"]')
    .setInputFiles({
      name: file.name,
      mimeType: "application/octet-stream",
      buffer: Buffer.from(file.data, "base64"),
    });

  await expect(dialog).toBeHidden({ timeout: 120_000 });
  await expect(
    page.locator(".sql-tree-item-name", { hasText: /^\s*roundtrip\s*$/ }).first(),
  ).toBeVisible({ timeout: 60_000 });

  // The rows came back with it, not just the schema.
  await runSql(page, "SELECT answer, note FROM roundtrip;");
  await expect(page.locator(".sql-result-table")).toContainText("42");
  await expect(page.locator(".sql-result-table")).toContainText("kept");
});

test("DuckDB: the Import Database dialog also takes a SQL dump", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/playground/duckdb");
  await page
    .locator("button.run-btn-split-main, button.run-btn")
    .first()
    .waitFor({ state: "visible", timeout: 150_000 });

  // The dialog sniffs content rather than trusting the name, so a dump
  // picked here replays instead of dead-ending on "not a database".
  await page.locator('[aria-label="Select sample database"]').click();
  await page.getByRole("option", { name: /Import Database/ }).click();
  const dialog = page.locator(".sql-import-popup");
  await expect(dialog).toBeVisible();
  await dialog
    .locator('input[aria-label="Choose DuckDB database file"]')
    .setInputFiles({
      name: "seed.sql",
      mimeType: "application/sql",
      buffer: Buffer.from(
        "CREATE TABLE from_dump (id INTEGER);\nINSERT INTO from_dump VALUES (7);\n",
      ),
    });

  await expect(dialog).toBeHidden({ timeout: 120_000 });
  await expect(
    page.locator(".sql-tree-item-name", { hasText: /^\s*from_dump\s*$/ }).first(),
  ).toBeVisible({ timeout: 60_000 });
});
