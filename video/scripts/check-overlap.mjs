/**
 * Sweeps every composition for text drawn over other text, or off the page
 * (PageAudit's `[overlap]` and `[offpage]`, src/editorial/audit.tsx): a frame
 * every two seconds, with no other audit and no pixels written, so a whole
 * library takes minutes, not hours. Run it after a change of type sizes.
 *
 *   npm run check:overlap                         # every composition
 *   npm run check:overlap -- BaseRate,TfIdf       # just these
 *   npm run check:overlap -- --json out.json      # also write the findings
 *   npm run check:overlap -- --since base.json    # report only what is new
 *
 * Exits non-zero if it finds anything (anything new, with --since).
 */
import { getCompositions, renderFrames } from "@remotion/renderer";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundleVideo } from "./lib/bundle.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? null : args.splice(i, 2)[1];
};
const jsonOut = flag("--json");
const since = flag("--since");
const every = Number(flag("--every") ?? 2);
const only = args[0]?.split(",");
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const serveUrl = process.env.SERVE_URL ?? (await bundleVideo(path.resolve("src/index.ts")));
const compositions = (await getCompositions(serveUrl, { browserExecutable, inputProps: {} })).filter(
  (c) => c.durationInFrames > 1 && (!only || only.includes(c.id)),
);

const found = {}; // comp -> { "kind text": first frame }
for (const composition of compositions) {
  const mine = (found[composition.id] = {});
  await renderFrames({
    serveUrl,
    composition,
    inputProps: { audit: "overlap" },
    outputDir: null,
    imageFormat: "none",
    scale: 1,
    everyNthFrame: Math.round(composition.fps * every),
    concurrency: Number(process.env.CONCURRENCY ?? 3),
    browserExecutable,
    onStart: () => {},
    onFrameUpdate: () => {},
    onBrowserLog: ({ text }) => {
      const m = text.match(/^(\[(?:overlap|offpage)\] .*) at frame (\d+)$/);
      if (m && !(m[1] in mine)) mine[m[1]] = Number(m[2]);
    },
  });
  process.stdout.write(`${composition.id}: ${Object.keys(mine).length}\n`);
}

const base = since ? JSON.parse(readFileSync(since, "utf8")) : {};
let count = 0;
for (const [comp, issues] of Object.entries(found)) {
  for (const [issue, frame] of Object.entries(issues)) {
    if (base[comp] && issue in base[comp]) continue;
    count++;
    console.log(`  ✗ ${comp} @${frame}: ${issue}`);
  }
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(found, null, 1));
console.log(count ? `${count} ${since ? "new " : ""}overlapping or off-page runs of text.` : "  ✓ no text over text, none off the page");
process.exit(count ? 1 : 0);
