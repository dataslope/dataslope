import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3457";
const browser = await chromium.launch();
// ignoreHTTPSErrors mirrors playwright.config.ts, the sandbox trips on
// jsDelivr's cert chain, which real browsers accept. Needed for CDN runtimes.
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  ignoreHTTPSErrors: true,
});
const page = await ctx.newPage();

const url = process.env.URL ?? `${BASE}/learn/python-basics/hello-world`;
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const pick = (el) => {
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.getAttribute("class") || "").split(/\s+/).slice(0, 3),
      aria: el.getAttribute("aria-label"),
      testid: el.getAttribute("data-testid"),
      text: (el.textContent || "").trim().slice(0, 40),
    };
  };
  // All data-testids on the page
  const testids = [...document.querySelectorAll("[data-testid]")].map((e) => ({
    testid: e.getAttribute("data-testid"),
    aria: e.getAttribute("aria-label"),
  }));
  // First "executable code block" container
  const cb = document.querySelector('[aria-label$="executable code block"]');
  const cbButtons = cb
    ? [...cb.querySelectorAll("button")].map((b) => ({
        text: (b.textContent || "").trim().slice(0, 24),
        aria: b.getAttribute("aria-label"),
        cls: (b.getAttribute("class") || "").slice(0, 40),
      }))
    : null;
  // Toolbar
  const toolbar = document.querySelector('[aria-label="Code block actions"]');
  // MCQ
  const mcq = document.querySelector('[aria-label="Multiple choice question"]');
  const mcqChoices = mcq
    ? mcq.querySelectorAll('[role="radiogroup"] input, [role="group"] input').length
    : 0;
  // Challenge card
  const cc = document.querySelector('[data-testid="challenge-card"]');
  // count component types
  return {
    counts: {
      codeBlocks: document.querySelectorAll('[aria-label$="executable code block"]').length,
      challengeCards: document.querySelectorAll('[data-testid="challenge-card"]').length,
      mcqs: document.querySelectorAll('[aria-label="Multiple choice question"]').length,
      mermaid: document.querySelectorAll("svg[id^='mermaid'], .mermaid svg, [id^=':r'] svg").length,
    },
    testids: testids.slice(0, 30),
    cbButtons,
    toolbarPresent: !!toolbar,
    mcqPresent: !!mcq,
    mcqChoices,
    ccPresent: !!cc,
    ccSubmit: pick(document.querySelector('[data-testid="challenge-submit"]')),
    // output container classes (run a quick scan of likely output nodes)
    outputClasses: [...document.querySelectorAll('[class*="output"], [class*="out-cell"], [class*="Output"]')]
      .slice(0, 6)
      .map((e) => (e.getAttribute("class") || "").slice(0, 50)),
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
