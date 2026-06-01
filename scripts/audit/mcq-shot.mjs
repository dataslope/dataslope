import { chromium } from "playwright";
const BASE = "http://localhost:3457";
const OUT = "agent-outputs/assets-20260601-learn-courses-ux-audit";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.goto(`${BASE}/learn/python-basics/hello-world`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
// the 3rd MCQ on hello-world is the duplicate-choice "print without newline" one
const mcqs = page.locator('[aria-label="Multiple choice question"]');
const target = mcqs.nth(2);
await target.scrollIntoViewIfNeeded();
// click a WRONG radio input directly (first choice) to reveal all explanations
await target.locator('input[type="radio"]').first().click({ force: true });
await page.waitForTimeout(800);
await target.screenshot({ path: `${OUT}/13-mcq-submitted-explanations.png` });
console.log("banner:", (await target.locator('[class*="banner"]').textContent().catch(()=>"")).trim());
console.log("explanations shown:", await target.locator('[class*="choiceExplanation"]').count());
await browser.close();
