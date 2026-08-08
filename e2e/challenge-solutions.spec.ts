import { test, expect, type Page } from "@playwright/test";
import { pagesForAdapters, requestedAdapters } from "./_adapterFilter";

// Drives every <ChallengeCard> on every /fumadocs-dev/challenge-cards-<lang>
// page, loads its reference solution into the editor buffers, clicks
// Submit, and asserts that all of the card's declared tests pass.
//
// Each card exposes a test driver via:
//   - DOM:    [data-testid="challenge-card"][data-adapter-id][data-challenge-title][data-solution-files]
//   - window: window.__dsChallenges["<adapter>::<title>"]
//
// `data-solution-files` carries the per-file solution payload as JSON
// so the spec doesn't have to re-parse MDX. `window.__dsChallenges`
// hands us a programmatic setFileContent/submit/getTestResults trio
// so we don't have to round-trip every character through CodeMirror's
// contenteditable, that pathway is fragile against IME / paste /
// indent extensions.
//
// Pages and per-card runs are slow because each runtime fetches its
// WASM toolchain from a CDN on first load (browsercc, Pyodide, WebR,
// php-wasm, pglite, sqlite-wasm). The per-test timeouts in
// playwright.config.ts already allow for that, we don't need extra
// retry logic here.

type SolutionFilePayload = { filename: string; source: string };

interface TestResultLite {
  id: string;
  name: string;
  state: "idle" | "pending" | "pass" | "fail";
  detail: string | null;
}

interface ChallengeTestHandleLite {
  adapterId: string;
  title: string;
  entryFilename: string;
  filenames: string[];
  setFileContent(filename: string, content: string): boolean;
  submit(): Promise<void>;
  getBannerState(): "pass" | "fail" | null;
  getTestResults(): TestResultLite[];
}

declare global {
  interface Window {
    __dsChallenges?: Record<string, ChallengeTestHandleLite>;
  }
}

// Default: the per-language/dialect demo pages. Set COURSEWARE=1 to sweep
// every docs page that embeds a <ChallengeCard> or <SqlChallengeCard>
// across all courses, a long, opt-in CI run. `path` is the full route.
const DEMO_PAGES: { path: string; label: string }[] = [
  { path: "/fumadocs-dev/challenge-cards-javascript", label: "JavaScript" },
  { path: "/fumadocs-dev/challenge-cards-typescript", label: "TypeScript" },
  { path: "/fumadocs-dev/challenge-cards-python", label: "Python" },
  { path: "/fumadocs-dev/challenge-cards-r", label: "R" },
  { path: "/fumadocs-dev/challenge-cards-java", label: "Java" },
  { path: "/fumadocs-dev/challenge-cards-c", label: "C" },
  { path: "/fumadocs-dev/challenge-cards-cpp", label: "C++" },
  { path: "/fumadocs-dev/challenge-cards-csharp", label: "C#" },
  { path: "/fumadocs-dev/challenge-cards-php", label: "PHP" },
  { path: "/fumadocs-dev/challenge-cards-web", label: "Web (HTML/CSS/JS)" },
  { path: "/fumadocs-dev/challenge-cards-react", label: "React" },
  // SQL challenge cards register on the same window.__dsChallenges registry
  // and expose the same data-* attributes (see SqlChallengeCard).
  { path: "/fumadocs-dev/sql-challenge-cards-sqlite", label: "SQLite" },
  { path: "/fumadocs-dev/sql-challenge-cards-duckdb", label: "DuckDB" },
  { path: "/fumadocs-dev/sql-challenge-cards-postgres", label: "PostgreSQL" },
];

// `ADAPTERS=java,csharp,…` narrows both the page list and the cards driven on
// each page to those languages (see _adapterFilter.ts).
const ADAPTERS = requestedAdapters();

const CHALLENGE_PAGES: { path: string; label: string }[] = process.env
  .COURSEWARE
  ? pagesForAdapters(["<ChallengeCard", "<SqlChallengeCard"], ADAPTERS).map((p) => ({
      path: p.route,
      label: p.route,
    }))
  : DEMO_PAGES;

async function readCardsOnPage(
  page: Page,
  adapters: string[] | null,
): Promise<
  {
    key: string;
    adapterId: string;
    title: string;
    solutionFiles: SolutionFilePayload[];
  }[]
> {
  const all = await page.evaluate(() => {
    const out: {
      key: string;
      adapterId: string;
      title: string;
      solutionFiles: SolutionFilePayload[];
    }[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(
      '[data-testid="challenge-card"], [data-testid="sql-challenge-card"]',
    );
    nodes.forEach((node) => {
      const adapterId = node.getAttribute("data-adapter-id") ?? "";
      const title = node.getAttribute("data-challenge-title") ?? "";
      const raw = node.getAttribute("data-solution-files");
      if (!raw) return;
      let files: SolutionFilePayload[] = [];
      try {
        files = JSON.parse(raw) as SolutionFilePayload[];
      } catch {
        return;
      }
      if (files.length === 0) return;
      out.push({
        key: `${adapterId}::${title}`,
        adapterId,
        title,
        solutionFiles: files,
      });
    });
    return out;
  });
  if (adapters === null) return all;
  return all.filter((c) => adapters.includes(c.adapterId));
}

async function waitForChallengeHandle(
  page: Page,
  key: string,
  timeoutMs: number,
): Promise<void> {
  await page.waitForFunction(
    (k) => {
      const reg = window.__dsChallenges;
      return !!(reg && reg[k]);
    },
    key,
    { timeout: timeoutMs },
  );
}

async function runOneCard(
  page: Page,
  card: {
    key: string;
    adapterId: string;
    title: string;
    solutionFiles: SolutionFilePayload[];
  },
): Promise<{ ok: boolean; detail: string }> {
  await waitForChallengeHandle(page, card.key, 60_000);

  // The `web` and `react` cards grade a live preview: their tests query the
  // rendered DOM inside a sandboxed iframe, measure geometry and dispatch
  // clicks. An iframe that is off-screen has no useful layout, and the tests
  // then fail on the *harness*, not the solution — `repeat(4, 1fr)` reported
  // as resolving to two columns, a padded link measured 0 px tall, three
  // clicks landing as two. Everything is driven programmatically through
  // `window.__dsChallenges` so nothing else here needs the card visible;
  // this scroll is what makes the preview measurable.
  const cardRoot = page
    .locator(
      `[data-challenge-title="${card.title.replace(/"/g, '\\"')}"][data-adapter-id="${card.adapterId}"]`,
    )
    .first();
  // The preview slot, not the card's top edge: a card is tall enough that its
  // heading can be on screen while the iframe underneath is still below the
  // fold, and a document that is not being presented does not get laid out.
  const preview = cardRoot.locator('[data-testid="web-preview"]').first();
  await ((await preview.count()) > 0 ? preview : cardRoot)
    .scrollIntoViewIfNeeded()
    .catch(() => {});

  // Stage every file's solution into the card's buffers.
  const staged = await page.evaluate(
    ([key, files]) => {
      const handle = window.__dsChallenges?.[key as string];
      if (!handle) return { ok: false, missing: "handle" };
      for (const f of files as SolutionFilePayload[]) {
        const written = handle.setFileContent(f.filename, f.source);
        if (!written) return { ok: false, missing: f.filename };
      }
      return { ok: true, missing: "" };
    },
    [card.key, card.solutionFiles] as const,
  );
  if (!staged.ok) {
    return {
      ok: false,
      detail: `Failed to set file content (${staged.missing})`,
    };
  }

  // Submit the run and wait for the banner to flip to pass/fail.
  // The runtime may take a while on first run per language because
  // packages are still warming up.
  await page.evaluate((key) => {
    const handle = window.__dsChallenges?.[key];
    return handle?.submit();
  }, card.key);

  await page.waitForFunction(
    (key) => window.__dsChallenges?.[key]?.getBannerState() !== null,
    card.key,
    { timeout: 150_000 },
  );

  const result = await page.evaluate((key) => {
    const handle = window.__dsChallenges?.[key];
    return {
      banner: handle?.getBannerState() ?? null,
      tests: handle?.getTestResults() ?? [],
    };
  }, card.key);

  if (result.banner === "pass") {
    return { ok: true, detail: `${result.tests.length} tests passed` };
  }
  const failed = result.tests
    .filter((t) => t.state !== "pass")
    .map((t) => `  - ${t.name} [${t.state}] ${t.detail ?? ""}`.trimEnd())
    .join("\n");
  return {
    ok: false,
    detail: `Banner=${result.banner ?? "null"}\n${failed || "(no per-test detail)"}`,
  };
}

test.describe("Challenge solutions", () => {
  for (const { path: pagePath, label } of CHALLENGE_PAGES) {
    test(`${label}, every challenge solution passes`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(pagePath);
      // Cards register on `window.__dsChallenges` from a `useEffect`
      // that fires once the React tree commits, wait until at least
      // one card has registered before reading the manifest, so we
      // don't race the initial render.
      await page.waitForFunction(
        () => {
          const reg = window.__dsChallenges;
          return !!reg && Object.keys(reg).length > 0;
        },
        null,
        { timeout: 60_000 },
      );

      const cards = await readCardsOnPage(page, ADAPTERS);
      // With no adapter filter, a page reached through `<ChallengeCard` must
      // have cards. With one, it may legitimately have none: the page was
      // selected because the language appears *somewhere* in its MDX, which
      // can be on a `<CodeBlock>` alone. Reported rather than asserted, and
      // reconciled against the extractor's totals by check-browser-blocks.mjs
      // so a filter that silently matches nothing cannot pass for coverage.
      if (ADAPTERS === null) {
        expect(cards.length, "page should contain at least one challenge card").toBeGreaterThan(0);
      }
      console.log(`SWEEP ${JSON.stringify({ route: pagePath, kind: "card", ran: cards.length })}`);
      if (cards.length === 0) return;

      const failures: { key: string; detail: string }[] = [];
      for (const card of cards) {
        const r = await runOneCard(page, card);
        if (!r.ok) failures.push({ key: card.key, detail: r.detail });
      }

      if (failures.length > 0) {
        const summary = failures
          .map((f) => `❌ ${f.key}\n${f.detail}`)
          .join("\n\n");
        throw new Error(
          `${failures.length}/${cards.length} challenges failed on ${pagePath}:\n\n${summary}`,
        );
      }

      // Anything thrown into pageerror during the sweep is worth
      // surfacing, it usually means a runtime crashed before its
      // banner could settle.
      expect(pageErrors, "no uncaught page errors during run").toEqual([]);
    });
  }
});
