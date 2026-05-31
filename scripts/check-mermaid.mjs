// Validates every ```mermaid fenced block in the given MDX files against
// the installed mermaid version, using a jsdom-backed DOM so mermaid's
// parser runs the same way it does in the browser. Exits non-zero on the
// first diagram that fails to parse.
import { readFileSync } from "node:fs";

// mermaid is a browser library, so we run its parser against a jsdom DOM.
// jsdom is an optional dev tool (install with `npm i -D jsdom`); if it's
// absent we skip validation rather than fail, so this script is safe to
// run in any environment.
let JSDOM;
try {
  ({ JSDOM } = await import("jsdom"));
} catch {
  console.warn(
    "check-mermaid: jsdom is not installed — skipping mermaid validation.\n" +
      "  Install it with `npm i -D jsdom` to enable this check.",
  );
  process.exit(0);
}

// Give mermaid a browser-like global environment.
const dom = new JSDOM("<!DOCTYPE html><body></body>", {
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// `navigator` is a read-only global in modern Node; define it instead of
// assigning so mermaid's feature checks still see a browser-like value.
if (!("navigator" in globalThis)) {
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
}

const { default: mermaid } = await import("mermaid");
mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: node scripts/check-mermaid.mjs <file.mdx> ...");
  process.exit(2);
}

const FENCE = /```mermaid\n([\s\S]*?)```/g;
let total = 0;
let failed = 0;

for (const file of files) {
  let src;
  try {
    src = readFileSync(file, "utf8");
  } catch (e) {
    console.error(`Cannot read ${file}: ${e.message}`);
    failed++;
    continue;
  }
  let m;
  let idx = 0;
  while ((m = FENCE.exec(src)) !== null) {
    idx++;
    total++;
    const chart = m[1];
    try {
      await mermaid.parse(chart);
    } catch (e) {
      failed++;
      const msg = (e && e.message ? e.message : String(e)).split("\n")[0];
      console.error(`\n✗ ${file} (mermaid block #${idx})`);
      console.error(`  ${msg}`);
      console.error(
        "  ----\n" +
          chart
            .split("\n")
            .map((l) => "  | " + l)
            .join("\n"),
      );
    }
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${total} mermaid block(s) FAILED to parse.`);
  process.exit(1);
}
console.log(`✓ all ${total} mermaid block(s) parsed OK`);
