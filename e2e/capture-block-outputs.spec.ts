import { test, expect, type Locator } from "@playwright/test";
import { adapterSelector, pagesForAdapters, requestedAdapters } from "./_adapterFilter";

// Records what every <CodeBlock> prints, for languages a Node process cannot
// run (java/csharp/php/web/react, plus R whose data-frame tables and plots
// only render in a browser). A capture, not a check: code-blocks-run.spec.ts
// asserts blocks run cleanly; an errored block is simply not recorded. Driven
// by scripts/capture-browser-outputs.mjs, which parses the CAPTURE lines below.

const ADAPTERS = requestedAdapters();

const PAGES = pagesForAdapters(["<CodeBlock"], ADAPTERS).map((p) => ({
  path: p.route,
  label: p.route,
}));

const BLOCK_SELECTOR = adapterSelector("code-block", "data-adapter", ADAPTERS);

// web/react output from a timer or effect lands after the run resolves; same
// settle window code-blocks-run.spec.ts waits.
const PREVIEW_ADAPTERS = new Set(["web", "react"]);
const PREVIEW_SETTLE_MS = 1_500;

interface CapturedCell {
  type: string;
  content: string;
  plot?: unknown;
}
interface Captured {
  key: string;
  adapter: string;
  cells: CapturedCell[];
}

/**
 * Click Run and confirm the block actually started (see code-blocks-run.spec.ts:
 * a pre-hydration click is silently swallowed and the block sits at `idle`).
 */
async function startRun(block: Locator, runBtn: Locator): Promise<boolean> {
  const status = () =>
    block.locator("[data-status]").first().getAttribute("data-status");
  for (let attempt = 0; attempt < 3; attempt++) {
    await runBtn.click();
    const started = await expect
      .poll(status, { timeout: 10_000 })
      .not.toBe("idle")
      .then(() => true)
      .catch(() => false);
    if (started) return true;
  }
  return false;
}

test.describe("Capture code block output", () => {
  test.describe.configure({ mode: "serial" });

  for (const { path, label } of PAGES) {
    test(`capture ${label}`, async ({ page }) => {
      // A sandbox can allow Node's egress while blocking the browser's, and
      // every runtime downloads itself from a CDN. CAPTURE_RELAY=1 routes those
      // requests through the test process; off by default (an extra hop).
      if (process.env.CAPTURE_RELAY) {
        await page.route(
          (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
          async (route) => {
            const req = route.request();
            try {
              const res = await fetch(req.url(), {
                method: req.method(),
                headers: req.headers(),
                body: req.postDataBuffer()
                  ? new Uint8Array(req.postDataBuffer() as Buffer)
                  : undefined,
                redirect: "follow",
              });
              const headers: Record<string, string> = {};
              res.headers.forEach((v, k) => {
                // The relayed response is same-origin to nobody; let the page
                // read it, and drop the encoding headers that describe bytes
                // fetch has already decoded.
                if (k === "content-encoding" || k === "content-length") return;
                headers[k] = v;
              });
              headers["access-control-allow-origin"] = "*";
              await route.fulfill({
                status: res.status,
                headers,
                body: Buffer.from(await res.arrayBuffer()),
              });
            } catch {
              await route.abort();
            }
          },
        );
      }

      // The seam CodeBlock pushes finished cells into. Installed before any
      // script runs so the very first block on the page is not missed.
      await page.addInitScript(() => {
        (window as unknown as { __blockCapture: unknown[] }).__blockCapture = [];
      });
      await page.goto(path);

      const blocks = page.locator(BLOCK_SELECTOR);
      const count = await blocks.count();
      if (count === 0) {
        console.log(`CAPTURE ${JSON.stringify({ route: path, captured: [] })}`);
        return;
      }

      for (let i = 0; i < count; i++) {
        const block = blocks.nth(i);
        // A block whose lesson *is* the error has nothing worth previewing.
        if ((await block.getAttribute("data-expect-error")) === "true") continue;
        const runBtn = block.getByTestId("codeblock-run");
        await block.scrollIntoViewIfNeeded();
        // The first block of a page pays for the runtime download.
        await expect(runBtn).toBeEnabled({ timeout: 150_000 });
        if (!(await startRun(block, runBtn))) continue;
        await expect
          .poll(
            () =>
              block.locator("[data-status]").first().getAttribute("data-status"),
            { timeout: 150_000 },
          )
          .not.toMatch(/loading|running/)
          .catch(() => {});
        await expect(runBtn).toBeEnabled({ timeout: 150_000 }).catch(() => {});
        const adapter = (await block.getAttribute("data-adapter")) ?? "";
        if (PREVIEW_ADAPTERS.has(adapter)) await page.waitForTimeout(PREVIEW_SETTLE_MS);
      }

      // One CAPTURE line per page: the driver parses these off stdout, and a
      // large plot split across interleaved lines would break the parse.
      const captured = (await page.evaluate(
        () => (window as unknown as { __blockCapture: Captured[] }).__blockCapture,
      )) as Captured[];

      // The seam fires on every state change; the last push for a key is the
      // complete one.
      const latest = new Map<string, Captured>();
      for (const c of captured) latest.set(c.key, c);

      console.log(
        `CAPTURE ${JSON.stringify({ route: path, captured: [...latest.values()] })}`,
      );
    });
  }
});
