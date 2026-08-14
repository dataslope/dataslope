/**
 * One-off helper for dropping `<Chart slug="…" />` into lessons: find the
 * anchor heading, walk to the end of its section, back up over trailing blank
 * lines, insert the lead paragraph and the tag. End-of-section because a
 * section boundary is the one position reliably at the top level — the scan
 * runs over `codeRegions()` so heading-shaped lines inside a `<CodeBlock>`
 * are not headings. Re-running is safe: a slug already present is left alone.
 *
 *   node scripts/place-charts.mjs [--dry]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { codeRegions, headingLevel } from "./lib/mdx-regions.mjs";
import { PLACEMENTS } from "./place-charts.data.mjs";

const DRY = process.argv.includes("--dry");
const ROOT = new URL("../content/", import.meta.url);

let placed = 0;
const skipped = [];

for (const [file, rows] of Object.entries(PLACEMENTS)) {
  const path = new URL(file, ROOT);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    skipped.push(`${file} :: no such file`);
    continue;
  }
  let touched = false;

  for (const { slug, after, lead } of rows) {
    if (text.includes(`slug="${slug}"`)) continue;

    const lines = text.split("\n");
    const code = codeRegions(lines);
    const isHeading = (i) => !code[i] && headingLevel(lines[i]) > 0;
    const anchor = new RegExp(after);
    const at = lines.findIndex((l, i) => isHeading(i) && anchor.test(l));
    if (at === -1) {
      skipped.push(`${file} :: ${slug} :: anchor not found: ${after}`);
      continue;
    }

    const level = headingLevel(lines[at]);
    let end = at + 1;
    while (end < lines.length) {
      if (isHeading(end) && headingLevel(lines[end]) <= level) break;
      end++;
    }
    while (end > at + 1 && lines[end - 1].trim() === "") end--;

    const block = lead
      ? ["", ...lead.split("\n"), "", `<Chart slug="${slug}" />`]
      : ["", `<Chart slug="${slug}" />`];
    lines.splice(end, 0, ...block);

    // Verify against the result rather than the plan. A section that *ends*
    // with a `<CodeBlock>` is a perfectly good place to append — the closing
    // `/>` belongs to the block, but the line after it does not — so the
    // question is only ever whether the tag we just wrote came out at the top
    // level. Re-scanning answers that directly.
    const tagAt = end + block.length - 1;
    if (codeRegions(lines)[tagAt]) {
      skipped.push(`${file} :: ${slug} :: would land inside a code region`);
      continue;
    }

    text = lines.join("\n");
    touched = true;
    placed++;
  }

  if (touched && !DRY) writeFileSync(path, text);
}

console.log(`place-charts: ${placed} placed${DRY ? " (dry run)" : ""}`);
if (skipped.length > 0) console.log("skipped:\n  " + skipped.join("\n  "));
