import { test, expect, type Page } from "@playwright/test";
import { pagesForAdapters, requestedAdapters } from "./_adapterFilter";

// Loads every <ChallengeCard>'s reference solution, submits it, and asserts
// all declared tests pass. Cards are driven programmatically through
// window.__dsChallenges (typing through CodeMirror's contenteditable is
// fragile); data-solution-files carries the solution payload as JSON. Runs are
// slow because each runtime fetches its WASM toolchain on first load —
// playwright.config.ts timeouts already allow for that.

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

// Default: the per-language demo pages. COURSEWARE=1 sweeps every docs page
// embedding a <ChallengeCard> or <SqlChallengeCard>.
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
  // SQL challenge cards register on the same window.__dsChallenges registry.
  { path: "/fumadocs-dev/sql-challenge-cards-sqlite", label: "SQLite" },
  { path: "/fumadocs-dev/sql-challenge-cards-duckdb", label: "DuckDB" },
  { path: "/fumadocs-dev/sql-challenge-cards-postgres", label: "PostgreSQL" },
];

// ADAPTERS=java,csharp,… narrows the page list and cards (see _adapterFilter.ts).
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

  // web/react cards grade a live preview iframe by measuring its DOM; an
  // off-screen iframe has no useful layout and fails on the harness, not the
  // solution. This scroll is what makes the preview measurable.
  const cardRoot = page
    .locator(
      `[data-challenge-title="${card.title.replace(/"/g, '\\"')}"][data-adapter-id="${card.adapterId}"]`,
    )
    .first();
  // Scroll to the preview slot, not the card's top edge: the iframe can still
  // be below the fold while the heading is visible.
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

  // Submit and wait for the banner to flip; first run per language is slow
  // while packages warm up.
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
      // Cards register on window.__dsChallenges after the React tree commits;
      // wait for at least one so we don't race the initial render.
      await page.waitForFunction(
        () => {
          const reg = window.__dsChallenges;
          return !!reg && Object.keys(reg).length > 0;
        },
        null,
        { timeout: 60_000 },
      );

      const cards = await readCardsOnPage(page, ADAPTERS);
      // With an adapter filter a page may legitimately have no cards (the
      // language may appear only on a <CodeBlock>); counts are reconciled by
      // check-browser-blocks.mjs instead of asserted here.
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

      // A pageerror usually means a runtime crashed before its banner settled.
      expect(pageErrors, "no uncaught page errors during run").toEqual([]);
    });
  }
});
