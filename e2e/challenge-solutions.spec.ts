import { test, expect, type Page } from "@playwright/test";

// Drives every <ChallengeCard> on every /learn/challenge-cards/<lang>
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
// contenteditable — that pathway is fragile against IME / paste /
// indent extensions.
//
// Pages and per-card runs are slow because each runtime fetches its
// WASM toolchain from a CDN on first load (browsercc, Pyodide, WebR,
// php-wasm, pglite, sqlite-wasm). The per-test timeouts in
// playwright.config.ts already allow for that — we don't need extra
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

const CHALLENGE_PAGES: { slug: string; label: string }[] = [
  { slug: "javascript", label: "JavaScript" },
  { slug: "typescript", label: "TypeScript" },
  { slug: "python", label: "Python" },
  { slug: "r", label: "R" },
  { slug: "java", label: "Java" },
  { slug: "c", label: "C" },
  { slug: "cpp", label: "C++" },
  { slug: "csharp", label: "C#" },
  { slug: "php", label: "PHP" },
];

async function readCardsOnPage(page: Page): Promise<
  {
    key: string;
    adapterId: string;
    title: string;
    solutionFiles: SolutionFilePayload[];
  }[]
> {
  return await page.evaluate(() => {
    const out: {
      key: string;
      adapterId: string;
      title: string;
      solutionFiles: SolutionFilePayload[];
    }[] = [];
    const nodes = document.querySelectorAll<HTMLElement>(
      '[data-testid="challenge-card"]',
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
  for (const { slug, label } of CHALLENGE_PAGES) {
    test(`${label} — every challenge solution passes`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto(`/learn/challenge-cards-${slug}`);
      // Cards register on `window.__dsChallenges` from a `useEffect`
      // that fires once the React tree commits — wait until at least
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

      const cards = await readCardsOnPage(page);
      expect(cards.length, "page should contain at least one challenge card").toBeGreaterThan(0);

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
          `${failures.length}/${cards.length} challenges failed on ${slug}:\n\n${summary}`,
        );
      }

      // Anything thrown into pageerror during the sweep is worth
      // surfacing — it usually means a runtime crashed before its
      // banner could settle.
      expect(pageErrors, "no uncaught page errors during run").toEqual([]);
    });
  }
});
