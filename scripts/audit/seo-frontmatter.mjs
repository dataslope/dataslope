// Audit /learn lesson frontmatter for SEO snippet quality.
//
// Title + description frontmatter become the SERP <title> and snippet, so this
// flags pages that would index with a missing, duplicated, truncated, or thin
// snippet. It does NOT rewrite anything — fixing copy is an editorial call.
//
// Usage:
//   node scripts/audit/seo-frontmatter.mjs            # summary + worst offenders
//   node scripts/audit/seo-frontmatter.mjs --list     # every flagged page
//   node scripts/audit/seo-frontmatter.mjs --report <file.md>   # write a markdown report
//
// Length thresholds reflect how Google renders results:
//   - description: ~70–160 chars (shorter reads thin, longer truncates)
//   - title: pages get a " · DataSlope" suffix (~12 chars), so the page title
//     itself should stay <= ~55 chars to avoid truncation.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const list = argv.includes("--list");
const reportIdx = argv.indexOf("--report");
const reportPath = reportIdx !== -1 ? argv[reportIdx + 1] : null;

const DESC_MIN = 70;
const DESC_MAX = 160;
const TITLE_MAX = 55;

const root = path.join(process.cwd(), "content", "learn");

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(p));
    else if (entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  const fm = m ? m[1] : "";
  const grab = (key) => {
    const r = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return r ? r[1].trim().replace(/^["']|["']$/g, "") : null;
  };
  return { title: grab("title"), description: grab("description") };
}

const files = walk(root);
const missingTitle = [];
const missingDesc = [];
const shortDesc = [];
const longDesc = [];
const longTitle = [];
const descSeen = new Map(); // normalized description -> [relPaths]

for (const file of files) {
  const rel = path.relative(root, file);
  const { title, description } = parseFrontmatter(readFileSync(file, "utf8"));
  if (!title) missingTitle.push(rel);
  else if (title.length > TITLE_MAX) longTitle.push({ rel, len: title.length, title });
  if (!description) {
    missingDesc.push(rel);
  } else {
    if (description.length < DESC_MIN) shortDesc.push({ rel, len: description.length });
    if (description.length > DESC_MAX) longDesc.push({ rel, len: description.length });
    const key = description.toLowerCase();
    if (!descSeen.has(key)) descSeen.set(key, []);
    descSeen.get(key).push(rel);
  }
}

const dupDesc = [...descSeen.entries()].filter(([, paths]) => paths.length > 1);

const lines = [];
const out = (s = "") => lines.push(s);
out(`# /learn frontmatter SEO audit`);
out();
out(`Scanned **${files.length}** lessons under \`content/learn/\`.`);
out();
out(`| Check | Count |`);
out(`| --- | --- |`);
out(`| Missing \`title\` | ${missingTitle.length} |`);
out(`| Missing \`description\` | ${missingDesc.length} |`);
out(`| Duplicate \`description\` (distinct strings reused) | ${dupDesc.length} |`);
out(`| \`description\` shorter than ${DESC_MIN} chars (thin) | ${shortDesc.length} |`);
out(`| \`description\` longer than ${DESC_MAX} chars (truncates) | ${longDesc.length} |`);
out(`| \`title\` longer than ${TITLE_MAX} chars (truncates with suffix) | ${longTitle.length} |`);
out();

const section = (heading, items, render) => {
  if (!items.length) return;
  out(`## ${heading} (${items.length})`);
  out();
  const show = list ? items : items.slice(0, 15);
  for (const it of show) out(`- ${render(it)}`);
  if (!list && items.length > show.length)
    out(`- …and ${items.length - show.length} more (run with \`--list\`)`);
  out();
};

section("Missing title", missingTitle, (r) => `\`${r}\``);
section("Missing description", missingDesc, (r) => `\`${r}\``);
section("Duplicate descriptions", dupDesc, ([, paths]) =>
  `${paths.length}× — ${paths.map((p) => `\`${p}\``).join(", ")}`,
);
section("Titles that truncate", longTitle, (it) => `\`${it.rel}\` (${it.len}) — "${it.title}"`);
section("Descriptions over the snippet limit", longDesc, (it) => `\`${it.rel}\` (${it.len} chars)`);
section("Descriptions that read thin", shortDesc, (it) => `\`${it.rel}\` (${it.len} chars)`);

const reportText = lines.join("\n");
if (reportPath) {
  writeFileSync(reportPath, reportText + "\n");
  console.log(`[seo-frontmatter] wrote ${reportPath}`);
} else {
  console.log(reportText);
}
