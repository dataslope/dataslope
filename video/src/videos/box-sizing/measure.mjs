/* global console, process */
// Measures every pixel value the BoxSizing video shows, by rendering real
// HTML in Chromium and reading what the browser laid out. data.ts imports the
// output, measurements.json. From video/, through the shared render queue
// (it launches a browser):
//
//   out/render-slot.sh node src/videos/box-sizing/measure.mjs
//
// Playwright and sharp resolve from the repo root's node_modules. The browser
// is the container's Chromium unless CHROMIUM points at another.
//
// The values are the ones the video uses: a box 300px wide with 20px of
// padding and a 5px border (and a 20px margin, for the four-layer figure),
// and two 50% columns of that box in a 600px row. The lesson's own examples
// (content/courses/modern-css-layout/box-model-and-sizing.mdx) are measured
// too, under `lesson`, so the report can say whether its numbers hold.
import { chromium } from "playwright";
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const executablePath = process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

// Plain colors, so a screenshot pixel says which layer painted it.
const PAGE_BG = [255, 255, 255];
const BOX_BG = [200, 220, 255];
const BORDER = [40, 40, 40];
const rgb = (c) => `rgb(${c.join(", ")})`;

const BOX = "width: 300px; padding: 20px; border: 5px solid; margin: 20px;";
const COL = "width: 50%; padding: 20px; border: 5px solid;";

const page = `<!doctype html>
<html><head><style>
  html, body { margin: 0; background: ${rgb(PAGE_BG)}; font: 16px/1.2 sans-serif; }
  section { position: relative; width: 800px; padding: 40px 0; }
  .box { ${BOX} background: ${rgb(BOX_BG)}; border-color: ${rgb(BORDER)}; }
  .inner { height: 100px; }
  .cell { height: 40px; }
  .flexwrap { display: flex; flex-wrap: wrap; width: 600px; }
  .flexnowrap { display: flex; width: 600px; }
  .floats { display: flow-root; width: 600px; }
  .floats > .col { float: left; }
  .col { ${COL} background: ${rgb(BOX_BG)}; border-color: ${rgb(BORDER)}; }
  .bb { box-sizing: border-box; }
  /* the lesson's own examples */
  .lesson-prose { width: 200px; padding: 20px; border: 2px solid; }
  .lesson-preview { width: 220px; padding: 24px; border: 2px solid; }
  .lesson-challenge { width: 300px; padding: 24px; border: 1px solid; }
</style></head><body>
  <section id="single">
    <div class="box" id="one"><div class="inner"></div></div>
    <div class="box" id="two"><div class="inner"></div></div>
  </section>
  <section id="single-bb">
    <div class="box bb" id="one-bb"><div class="inner"></div></div>
  </section>
  <section><div class="flexwrap" id="row-wrap"><div class="col"><div class="cell"></div></div><div class="col"><div class="cell"></div></div></div></section>
  <section><div class="flexwrap" id="row-wrap-bb"><div class="col bb"><div class="cell"></div></div><div class="col bb"><div class="cell"></div></div></div></section>
  <section><div class="floats" id="row-float"><div class="col"><div class="cell"></div></div><div class="col"><div class="cell"></div></div></div></section>
  <section><div class="floats" id="row-float-bb"><div class="col bb"><div class="cell"></div></div><div class="col bb"><div class="cell"></div></div></div></section>
  <section><div class="flexnowrap" id="row-nowrap"><div class="col"><div class="cell"></div></div><div class="col"><div class="cell"></div></div></div></section>
  <section id="lesson">
    <div class="lesson-prose" id="lesson-prose"></div>
    <div class="lesson-prose bb" id="lesson-prose-bb"></div>
    <div class="lesson-preview" id="lesson-preview"></div>
    <div class="lesson-preview bb" id="lesson-preview-bb"></div>
    <div class="lesson-challenge" id="lesson-challenge"></div>
    <div class="lesson-challenge bb" id="lesson-challenge-bb"></div>
  </section>
</body></html>`;

// The fix as the lesson writes it, on a page of its own.
const universal = `<!doctype html>
<html><head><style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; }
  .row { display: flex; flex-wrap: wrap; width: 600px; }
  .col { ${COL} }
  .col::before { content: ""; display: block; height: 40px; }
  .col::after { content: ""; }
</style></head><body>
  <div class="row" id="row"><div class="col"><span id="deep">text</span></div><div class="col"></div></div>
</body></html>`;

const browser = await chromium.launch({ executablePath });
const tab = await browser.newPage({ viewport: { width: 1000, height: 1800 }, deviceScaleFactor: 1 });
await tab.setContent(page);

const read = await tab.evaluate(() => {
  const r = (el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  };
  const box = (id) => {
    const el = document.getElementById(id);
    const cs = getComputedStyle(el);
    const inner = el.firstElementChild;
    return {
      rect: r(el),
      content: inner ? r(inner) : null,
      boxSizing: cs.boxSizing,
      computedWidth: cs.width,
      padding: parseFloat(cs.paddingLeft),
      border: parseFloat(cs.borderLeftWidth),
      margin: parseFloat(cs.marginLeft),
      clientWidth: el.clientWidth,
      offsetWidth: el.offsetWidth,
    };
  };
  const row = (id) => {
    const el = document.getElementById(id);
    const o = el.getBoundingClientRect();
    const cols = [...el.children].map((c) => {
      const b = c.getBoundingClientRect();
      const inner = c.firstElementChild.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return {
        x: b.x - o.x,
        y: b.y - o.y,
        width: b.width,
        height: b.height,
        contentWidth: inner.width,
        contentX: inner.x - b.x,
        computedWidth: cs.width,
        boxSizing: cs.boxSizing,
      };
    });
    return { width: o.width, height: o.height, cols };
  };
  const one = document.getElementById("one").getBoundingClientRect();
  const two = document.getElementById("two").getBoundingClientRect();
  const section = document.getElementById("single").getBoundingClientRect();
  return {
    single: {
      ...box("one"),
      /** Left edge of the box from the edge of its container: the margin. */
      marginLeftMeasured: one.x - section.x,
      /** Gap between two stacked boxes (their 20px margins collapse to one). */
      gapToNext: two.y - (one.y + one.height),
    },
    singleBorderBox: box("one-bb"),
    rows: {
      flexWrap: row("row-wrap"),
      flexWrapBorderBox: row("row-wrap-bb"),
      float: row("row-float"),
      floatBorderBox: row("row-float-bb"),
      flexNoWrap: row("row-nowrap"),
    },
    lesson: Object.fromEntries(
      ["lesson-prose", "lesson-prose-bb", "lesson-preview", "lesson-preview-bb", "lesson-challenge", "lesson-challenge-bb"].map(
        (id) => [id, { width: document.getElementById(id).getBoundingClientRect().width, boxSizing: getComputedStyle(document.getElementById(id)).boxSizing }],
      ),
    ),
  };
});

// Which layer paints what: sample the screenshot inside each layer of #one.
const shot = await tab.screenshot({ fullPage: true });
const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => {
  const i = (Math.round(y) * info.width + Math.round(x)) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};
const s = read.single;
const midY = s.rect.y + s.rect.height / 2;
const samples = {
  content: px(s.rect.x + s.rect.width / 2, midY),
  padding: px(s.rect.x + s.border + s.padding / 2, midY),
  border: px(s.rect.x + s.border / 2, midY),
  margin: px(s.rect.x - s.margin / 2, midY),
};
const same = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 1);
const paint = {
  samples,
  contentIsBoxBackground: same(samples.content, BOX_BG),
  paddingIsBoxBackground: same(samples.padding, BOX_BG),
  borderIsBorderColor: same(samples.border, BORDER),
  marginIsPageBackground: same(samples.margin, PAGE_BG),
};

// The universal rule reaches every element and both pseudo-elements.
await tab.setContent(universal);
const universalRule = await tab.evaluate(() => {
  const col = document.querySelector(".col");
  const row = document.getElementById("row").getBoundingClientRect();
  return {
    html: getComputedStyle(document.documentElement).boxSizing,
    col: getComputedStyle(col).boxSizing,
    deep: getComputedStyle(document.getElementById("deep")).boxSizing,
    before: getComputedStyle(col, "::before").boxSizing,
    after: getComputedStyle(col, "::after").boxSizing,
    cols: [...document.querySelectorAll(".col")].map((c) => {
      const b = c.getBoundingClientRect();
      return { x: b.x - row.x, y: b.y - row.y, width: b.width };
    }),
  };
});

const version = browser.version();
await browser.close();

const out = {
  browser: `Chromium ${version}`,
  css: { box: BOX, col: COL, row: "display: flex; flex-wrap: wrap; width: 600px;" },
  ...read,
  paint,
  universalRule,
};
writeFileSync(join(here, "measurements.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify(out, null, 2));
