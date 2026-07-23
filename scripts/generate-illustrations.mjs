#!/usr/bin/env node
/**
 * Batch-generate the Dataslope course/interview illustrations with OpenAI's
 * GPT Image 2 API (https://developers.openai.com/api/docs/models/gpt-image-2).
 *
 * Reads the prompt definitions from `data/illustration-prompts.json` (the same
 * source of truth the `/illustration-prompts` gallery and the in-lesson
 * `<IllustrationPrompt>` cards render), builds each generation prompt in the
 * Dataslope house style (a risograph of the subject, in the four brand colors),
 * calls the Images API, and writes one PNG per prompt named `<id>.png`.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-illustrations.mjs [options]
 *
 * Options:
 *   --out <dir>          Output directory (default: ./generated-illustrations)
 *   --only <id[,id...]>  Generate only these prompt ids
 *   --category <cat>     Generate only this category
 *                        (course-thumbnail | course-illustration | ...)
 *   --size <WxH|auto>    Override the per-category size for every prompt
 *   --background <mode>  auto | transparent | opaque (default: auto)
 *   --quality <q>        auto | low | medium | high (default: auto)
 *   --model <name>       Override the model (default: from JSON meta.model)
 *   --concurrency <n>    Parallel requests (default: 3)
 *   --force              Overwrite existing PNGs (default: skip ones present)
 *   --dry-run            Print the prompts and targets; make no API calls
 *   -h, --help           Show this help
 *
 * Notes:
 *   - GPT Image 2 returns base64 PNG data (no URL), decoded and written here.
 *   - `--background transparent` asks the model for an alpha channel, handy for
 *     content-decoration art that overlays the light/dark lesson backgrounds.
 *   - The prompt text is built the same way as lib/illustrationPrompt.ts
 *     (buildIllustrationPrompt); keep the two in sync if the house style
 *     changes.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = join(ROOT, "data", "illustration-prompts.json");
const API_URL = "https://api.openai.com/v1/images/generations";

// ── CLI parsing ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    out: join(process.cwd(), "generated-illustrations"),
    only: null,
    category: null,
    size: null,
    background: "auto",
    quality: "auto",
    model: null,
    concurrency: 3,
    force: false,
    dryRun: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--out": opts.out = next(); break;
      case "--only": opts.only = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--category": opts.category = next(); break;
      case "--size": opts.size = next(); break;
      case "--background": opts.background = next(); break;
      case "--quality": opts.quality = next(); break;
      case "--model": opts.model = next(); break;
      case "--concurrency": opts.concurrency = Math.max(1, Number(next()) || 1); break;
      case "--force": opts.force = true; break;
      case "--dry-run": opts.dryRun = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default:
        console.error(`Unknown option: ${a}`);
        process.exit(1);
    }
  }
  return opts;
}

function printHelp() {
  // The banner at the top of this file is the canonical help text.
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const banner = src.slice(src.indexOf("/**"), src.indexOf("*/") + 2);
  console.log(banner.replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "").trim());
}

// ── Prompt building (mirror of lib/illustrationPrompt.ts) ────────────────────
function buildPrompt(spec, colors) {
  const style = (spec.style && spec.style.trim()) || "risograph";
  const abstract = spec.noText ? " No text. Just an abstract art." : "";
  return (
    `A ${style} of ${spec.subject}.${abstract}\n\n` +
    `Blue: ${colors.blue}\n` +
    `Green: ${colors.green}\n` +
    `Red: ${colors.red}\n` +
    `Yellow: ${colors.yellow}`
  );
}

// ── One request ──────────────────────────────────────────────────────────────
async function generateOne(entry, opts, apiKey) {
  const body = {
    model: opts.model,
    prompt: entry.prompt,
    size: opts.size || entry.size,
    n: 1,
  };
  if (opts.background && opts.background !== "auto") body.background = opts.background;
  if (opts.quality && opts.quality !== "auto") body.quality = opts.quality;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ""}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Response contained no image data (b64_json).");
  writeFileSync(entry.outPath, Buffer.from(b64, "base64"));
}

// ── Simple bounded-concurrency runner ────────────────────────────────────────
async function runPool(items, limit, worker) {
  let i = 0;
  let ok = 0;
  let failed = 0;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      try {
        await worker(items[idx]);
        ok++;
      } catch (err) {
        failed++;
        console.error(`  ✗ ${items[idx].id}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return { ok, failed };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();

  const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const { meta } = data;
  const model = opts.model || meta.model;
  opts.model = model;

  let prompts = data.prompts;
  if (opts.only) prompts = prompts.filter((p) => opts.only.includes(p.id));
  if (opts.category) prompts = prompts.filter((p) => p.category === opts.category);

  if (prompts.length === 0) {
    console.error("No prompts matched the given filters.");
    process.exit(1);
  }

  mkdirSync(opts.out, { recursive: true });

  const entries = prompts.map((p) => ({
    id: p.id,
    category: p.category,
    size: (meta.sizes && meta.sizes[p.category]) || "1024x1024",
    prompt: buildPrompt(p, meta.brandColors),
    outPath: join(opts.out, `${p.id}.png`),
  }));

  console.log(
    `${opts.dryRun ? "[dry-run] " : ""}${entries.length} prompt(s) · model ${model} · ` +
      `background ${opts.background} · quality ${opts.quality} · out ${opts.out}\n`,
  );

  if (opts.dryRun) {
    for (const e of entries) {
      console.log(`── ${e.id}.png  (${opts.size || e.size})`);
      console.log(e.prompt.replace(/^/gm, "   "));
      console.log();
    }
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set. Export it and re-run.");
    process.exit(1);
  }

  const todo = [];
  for (const e of entries) {
    if (!opts.force && existsSync(e.outPath)) {
      console.log(`  • skip ${e.id} (exists; use --force to overwrite)`);
      continue;
    }
    todo.push(e);
  }
  if (todo.length === 0) {
    console.log("\nNothing to generate.");
    return;
  }

  const { ok, failed } = await runPool(todo, opts.concurrency, async (e) => {
    await generateOne(e, opts, apiKey);
    console.log(`  ✓ ${e.id}.png`);
  });

  console.log(`\nDone: ${ok} generated, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
