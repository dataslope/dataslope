import { test, expect, type Locator } from "@playwright/test";
import { adapterSelector, pagesForAdapters, requestedAdapters } from "./_adapterFilter";

// Records what every `<CodeBlock>` prints, for the languages a Node process
// cannot run.
//
// `scripts/build-block-outputs.mjs` prepopulates Python, JavaScript,
// TypeScript, C and C++ headlessly. The rest have no Node runtime — java is
// CheerpJ, csharp is .NET wasm, php is php-wasm, web and react render into a
// sandboxed iframe — and R, which *does* run under Node, renders data frames
// as HTML tables and plots as images through `runtime/r.tsx`, so a stdout-only
// runner would record a panel missing most of what the reader sees. A real
// browser has all of it already.
//
// This is a *capture*, not a check: `code-blocks-run.spec.ts` is what asserts
// blocks run cleanly. Here a block that errors is simply not recorded, because
// an error is not the preview a lesson wants. The two specs share their page
// selection and their run choreography for the same reason the sweeps do —
// whatever makes a block start and settle reliably is not worth discovering
// twice.
//
// Driven by `scripts/capture-browser-outputs.mjs`, which reads the `CAPTURE`
// lines below and merges them into the manifest. Run directly and it prints
// them and records nothing.

const ADAPTERS = requestedAdapters();

const PAGES = pagesForAdapters(["<CodeBlock"], ADAPTERS).map((p) => ({
  path: p.route,
  label: p.route,
}));

const BLOCK_SELECTOR = adapterSelector("code-block", "data-adapter", ADAPTERS);

// web/react bridge a sandboxed iframe's console back as cells, and the run
// resolves 150 ms after the iframe's `load` — output from a timer or an effect
// lands after that. Same window `code-blocks-run.spec.ts` waits.
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
 * Click Run and confirm the block actually started.
 *
 * Copied in spirit from `code-blocks-run.spec.ts`: the Run button is
 * server-rendered and looks enabled before React wires its handler, so an
 * early click is swallowed without a trace and the block sits at `idle`
 * forever while the run appears to have finished.
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
      // Every runtime here downloads itself at run time — CheerpJ, the .NET
      // wasm bundle, php-wasm, webR, esbuild-wasm — and a sandbox can allow
      // Node's egress while blocking the browser's, which shows up as
      // ERR_CONNECTION_RESET on the first CDN request and a page that never
      // boots. `CAPTURE_RELAY=1` hands those requests to the test process,
      // which does have a route out. Off by default: where the browser can
      // reach the network, relaying only adds a hop.
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

      // One line per page rather than per block: the driver parses these off
      // stdout, and a 4 MB plot split across interleaved lines is a parse
      // failure waiting to happen.
      const captured = (await page.evaluate(
        () => (window as unknown as { __blockCapture: Captured[] }).__blockCapture,
      )) as Captured[];

      // The seam fires on every state change, so a block that produced cells
      // in stages appears more than once. The last push for a key is the
      // complete one.
      const latest = new Map<string, Captured>();
      for (const c of captured) latest.set(c.key, c);

      console.log(
        `CAPTURE ${JSON.stringify({ route: path, captured: [...latest.values()] })}`,
      );
    });
  }
});
