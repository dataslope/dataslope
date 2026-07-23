#!/usr/bin/env node
/**
 * Batch-generate the Dataslope course/interview illustrations with OpenAI's
 * GPT Image 2 (https://developers.openai.com/api/docs/models/gpt-image-2).
 *
 * Reads the prompt definitions from `data/illustration-prompts.json` (the same
 * source of truth the `/illustration-prompts` gallery and the in-lesson
 * `<IllustrationPrompt>` cards render), builds each generation prompt in the
 * Dataslope house style (a risograph of the subject, in the four brand colors),
 * and writes one PNG per prompt named `<id>.png`.
 *
 * By default it uses the OpenAI **Batch API** (~50% cheaper, async, up to a 24h
 * completion window): it packs every prompt into one JSONL job against the
 * `/v1/images/generations` endpoint, uploads it, and creates a single batch.
 * A `sync` mode is available for quick one-off runs.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-illustrations.mjs <command> [options]
 *
 * Commands:
 *   run        submit a batch, poll until it finishes, then download the PNGs
 *   submit     build + upload the JSONL batch and create it; prints the batch id
 *   status     show a batch's status (--batch <id>, or the last one submitted)
 *   download   download a completed batch's images into --out
 *   sync       generate immediately, one request per prompt (bounded concurrency)
 *   dry-run    print the prompts and targets; make no API calls
 *
 * Options:
 *   --out <dir>          Output directory (default: ./generated-illustrations)
 *   --only <id[,id...]>  Only these prompt ids
 *   --category <cat>     Only this category (course-thumbnail | course-illustration | ...)
 *   --size <WxH|auto>    Override the per-category size for every prompt
 *   --quality <q>        auto | low | medium | high (default: auto)
 *   --background <mode>  auto | opaque (default: auto)
 *                        gpt-image-2 has no transparent background; for cut-outs
 *                        post-process with a background-removal service.
 *   --model <name>       Override the model (default: JSON meta.model)
 *   --completion-window  Batch window: 24h (default)
 *   --batch <id>         Target batch id for `status` / `download`
 *   --poll-interval <s>  `run` poll seconds (default: 30)
 *   --concurrency <n>    `sync` parallel requests (default: 3)
 *   --force              Overwrite existing PNGs (default: skip present)
 *   -h, --help           Show this help
 *
 * Notes:
 *   - GPT Image 2 returns base64 PNG data (no URL); it is decoded and written.
 *   - The prompt text is built the same way as lib/illustrationPrompt.ts
 *     (buildIllustrationPrompt); keep the two in sync if the house style changes.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = join(ROOT, "data", "illustration-prompts.json");
const API_BASE = "https://api.openai.com/v1";
const IMAGES_ENDPOINT = "/v1/images/generations";

// ── CLI parsing ────────────────────────────────────────────────────────────
const COMMANDS = new Set([
  "run",
  "submit",
  "status",
  "download",
  "sync",
  "dry-run",
]);

function parseArgs(argv) {
  const opts = {
    command: null,
    out: join(process.cwd(), "generated-illustrations"),
    only: null,
    category: null,
    size: null,
    quality: "auto",
    background: "auto",
    model: null,
    completionWindow: "24h",
    batch: null,
    pollInterval: 30,
    concurrency: 3,
    force: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--out": opts.out = next(); break;
      case "--only": opts.only = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--category": opts.category = next(); break;
      case "--size": opts.size = next(); break;
      case "--quality": opts.quality = next(); break;
      case "--background": opts.background = next(); break;
      case "--model": opts.model = next(); break;
      case "--completion-window": opts.completionWindow = next(); break;
      case "--batch": opts.batch = next(); break;
      case "--poll-interval": opts.pollInterval = Math.max(5, Number(next()) || 30); break;
      case "--concurrency": opts.concurrency = Math.max(1, Number(next()) || 1); break;
      case "--force": opts.force = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default:
        if (!a.startsWith("-") && opts.command === null && COMMANDS.has(a)) {
          opts.command = a;
        } else {
          console.error(`Unknown argument: ${a}`);
          process.exit(1);
        }
    }
  }
  return opts;
}

function printHelp() {
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

/** The request body sent to /v1/images/generations for one prompt. */
function requestBody(entry, opts, model) {
  const body = {
    model,
    prompt: entry.prompt,
    size: opts.size || entry.size,
    n: 1,
  };
  if (opts.quality && opts.quality !== "auto") body.quality = opts.quality;
  if (opts.background && opts.background !== "auto") body.background = opts.background;
  return body;
}

// ── OpenAI helpers ───────────────────────────────────────────────────────────
function requireKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("OPENAI_API_KEY is not set. Export it and re-run.");
    process.exit(1);
  }
  return key;
}

async function api(path, { method = "GET", key, json, form } = {}) {
  const headers = { Authorization: `Bearer ${key}` };
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form !== undefined) {
    body = form; // fetch sets the multipart boundary itself
  }
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ""}`);
  }
  return res;
}

const BATCH_STATE_FILE = (out) => join(out, "last-batch.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Entry selection ──────────────────────────────────────────────────────────
function selectEntries(data, opts) {
  const { meta } = data;
  let prompts = data.prompts;
  if (opts.only) prompts = prompts.filter((p) => opts.only.includes(p.id));
  if (opts.category) prompts = prompts.filter((p) => p.category === opts.category);
  if (prompts.length === 0) {
    console.error("No prompts matched the given filters.");
    process.exit(1);
  }
  return prompts.map((p) => ({
    id: p.id,
    category: p.category,
    size: (meta.sizes && meta.sizes[p.category]) || "1024x1024",
    prompt: buildPrompt(p, meta.brandColors),
    outPath: join(opts.out, `${p.id}.png`),
  }));
}

/** Decode a base64 image payload from an images response body and write it. */
function writeImage(outPath, respBody) {
  const b64 = respBody?.data?.[0]?.b64_json;
  if (!b64) throw new Error("response contained no image data (b64_json)");
  writeFileSync(outPath, Buffer.from(b64, "base64"));
}

// ── Commands ─────────────────────────────────────────────────────────────────
async function cmdDryRun(entries, opts) {
  console.log(`[dry-run] ${entries.length} prompt(s) · background ${opts.background} · quality ${opts.quality}\n`);
  for (const e of entries) {
    console.log(`── ${e.id}.png  (${opts.size || e.size})`);
    console.log(e.prompt.replace(/^/gm, "   "));
    console.log();
  }
}

async function cmdSubmit(entries, opts, model, key) {
  const jsonl = entries
    .map((e) =>
      JSON.stringify({
        custom_id: e.id,
        method: "POST",
        url: IMAGES_ENDPOINT,
        body: requestBody(e, opts, model),
      }),
    )
    .join("\n");

  // 1. Upload the JSONL as a batch input file.
  const form = new FormData();
  form.append("purpose", "batch");
  form.append(
    "file",
    new Blob([jsonl], { type: "application/jsonl" }),
    "illustration-batch.jsonl",
  );
  const fileRes = await api("/files", { method: "POST", key, form });
  const file = await fileRes.json();
  console.log(`Uploaded ${entries.length}-request input file ${file.id}`);

  // 2. Create the batch.
  const batchRes = await api("/batches", {
    method: "POST",
    key,
    json: {
      input_file_id: file.id,
      endpoint: IMAGES_ENDPOINT,
      completion_window: opts.completionWindow,
    },
  });
  const batch = await batchRes.json();

  mkdirSync(opts.out, { recursive: true });
  writeFileSync(
    BATCH_STATE_FILE(opts.out),
    JSON.stringify({ batchId: batch.id, model, count: entries.length }, null, 2),
  );
  console.log(`Created batch ${batch.id} (status: ${batch.status}).`);
  console.log(`Track it with:  node scripts/generate-illustrations.mjs status --out ${opts.out}`);
  return batch;
}

function resolveBatchId(opts) {
  if (opts.batch) return opts.batch;
  const stateFile = BATCH_STATE_FILE(opts.out);
  if (existsSync(stateFile)) {
    return JSON.parse(readFileSync(stateFile, "utf8")).batchId;
  }
  console.error("No --batch id given and no last-batch.json in --out.");
  process.exit(1);
}

async function retrieveBatch(id, key) {
  const res = await api(`/batches/${id}`, { key });
  return res.json();
}

async function cmdStatus(opts, key) {
  const id = resolveBatchId(opts);
  const batch = await retrieveBatch(id, key);
  const c = batch.request_counts || {};
  console.log(
    `Batch ${batch.id}: ${batch.status} · ${c.completed ?? 0}/${c.total ?? "?"} done, ${c.failed ?? 0} failed`,
  );
  return batch;
}

async function downloadFileText(fileId, key) {
  const res = await api(`/files/${fileId}/content`, { key });
  return res.text();
}

/** Parse a batch output JSONL and write every successful image. */
function writeBatchOutputs(text, opts) {
  let ok = 0;
  let failed = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const outPath = join(opts.out, `${row.custom_id}.png`);
    if (row.error || row.response?.status_code !== 200) {
      failed++;
      const msg = row.error?.message || row.response?.body?.error?.message || "unknown error";
      console.error(`  ✗ ${row.custom_id}: ${msg}`);
      continue;
    }
    if (!opts.force && existsSync(outPath)) {
      console.log(`  • skip ${row.custom_id} (exists; use --force)`);
      continue;
    }
    try {
      writeImage(outPath, row.response.body);
      ok++;
      console.log(`  ✓ ${row.custom_id}.png`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${row.custom_id}: ${err.message}`);
    }
  }
  return { ok, failed };
}

async function cmdDownload(opts, key, batch) {
  const b = batch || (await retrieveBatch(resolveBatchId(opts), key));
  if (b.status !== "completed") {
    console.error(`Batch ${b.id} is ${b.status}, not completed. Try again later.`);
    process.exit(1);
  }
  mkdirSync(opts.out, { recursive: true });
  if (b.error_file_id) {
    const errText = await downloadFileText(b.error_file_id, key);
    for (const line of errText.split("\n")) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      console.error(`  ! ${row.custom_id}: ${row.response?.body?.error?.message || "request errored"}`);
    }
  }
  if (!b.output_file_id) {
    console.error("Batch completed but has no output file.");
    process.exit(1);
  }
  const text = await downloadFileText(b.output_file_id, key);
  const { ok, failed } = writeBatchOutputs(text, opts);
  console.log(`\nDone: ${ok} written, ${failed} failed. Output in ${opts.out}`);
  if (failed > 0) process.exitCode = 1;
}

const TERMINAL = new Set(["completed", "failed", "expired", "cancelled"]);

async function cmdRun(entries, opts, model, key) {
  const submitted = await cmdSubmit(entries, opts, model, key);
  let batch = submitted;
  while (!TERMINAL.has(batch.status)) {
    await sleep(opts.pollInterval * 1000);
    batch = await retrieveBatch(batch.id, key);
    const c = batch.request_counts || {};
    console.log(`  … ${batch.status} (${c.completed ?? 0}/${c.total ?? "?"})`);
  }
  if (batch.status !== "completed") {
    console.error(`Batch ended as ${batch.status}.`);
    process.exit(1);
  }
  await cmdDownload(opts, key, batch);
}

async function cmdSync(entries, opts, model, key) {
  mkdirSync(opts.out, { recursive: true });
  const todo = entries.filter((e) => {
    if (!opts.force && existsSync(e.outPath)) {
      console.log(`  • skip ${e.id} (exists; use --force)`);
      return false;
    }
    return true;
  });
  if (todo.length === 0) return console.log("Nothing to generate.");

  let i = 0;
  let ok = 0;
  let failed = 0;
  async function worker() {
    while (i < todo.length) {
      const e = todo[i++];
      try {
        const res = await api(IMAGES_ENDPOINT, {
          method: "POST",
          key,
          json: requestBody(e, opts, model),
        });
        writeImage(e.outPath, await res.json());
        ok++;
        console.log(`  ✓ ${e.id}.png`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${e.id}: ${err.message}`);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(opts.concurrency, todo.length) }, worker),
  );
  console.log(`\nDone: ${ok} generated, ${failed} failed. Output in ${opts.out}`);
  if (failed > 0) process.exitCode = 1;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.command) return printHelp();

  if (opts.background === "transparent") {
    console.error(
      "gpt-image-2 does not support transparent backgrounds. Generate opaque\n" +
        "art and remove the background afterwards with a background-removal service.",
    );
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const model = opts.model || data.meta.model;

  // Commands that operate on an existing batch don't need the prompt set.
  if (opts.command === "status") return cmdStatus(opts, requireKey());
  if (opts.command === "download") return cmdDownload(opts, requireKey());

  const entries = selectEntries(data, opts);

  if (opts.command === "dry-run") return cmdDryRun(entries, opts);

  console.log(
    `${entries.length} prompt(s) · model ${model} · background ${opts.background} · ` +
      `quality ${opts.quality} · out ${opts.out}\n`,
  );
  const key = requireKey();
  if (opts.command === "sync") return cmdSync(entries, opts, model, key);
  if (opts.command === "submit") { await cmdSubmit(entries, opts, model, key); return; }
  if (opts.command === "run") return cmdRun(entries, opts, model, key);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
