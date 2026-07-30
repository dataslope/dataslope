#!/usr/bin/env node
/**
 * Batch-generate the Dataslope course/interview illustrations with OpenAI's
 * GPT Image 2 (https://developers.openai.com/api/docs/models/gpt-image-2).
 *
 * Reads the prompt definitions from `data/illustration-prompts.json` (the same
 * source of truth the `/illustration-prompts` gallery and the in-lesson
 * `<IllustrationPrompt>` cards render), builds each generation prompt in the
 * Dataslope house style (an isometric illustration of the subject, in the four
 * brand colors), and writes one PNG per prompt named `<id>.png`.
 *
 * By default it uses the OpenAI **Batch API** (~50% cheaper, async, up to a 24h
 * completion window) at **low** quality, packing the prompts into JSONL jobs
 * against the `/v1/images/generations` endpoint. A `sync` mode is available for
 * quick one-off runs.
 *
 * Why low quality is the default: image output tokens dominate the bill, and
 * the tiers are far apart. Measured on gpt-image-2 (see COST_TOKENS below),
 * one 1024x1024 image is 196 output tokens at `low` but 1372 at `medium` and
 * 5488 at `high` — so at Batch pricing ($15 / 1M output tokens) a 1000-image
 * run is ~$2.94 low vs ~$82 high. `low` is more than good enough for flat
 * isometric / risograph art; override with `--quality` for a hero image.
 *
 * Why the work is split across several batches: every image comes back as
 * inline base64 inside the batch's output JSONL, and one 1024x1024 PNG is
 * ~2.6 MB (~3.6 MB base64). A single 1000-image batch would therefore produce
 * a ~3.6 GB output file, which cannot be read into one JS string (V8 caps
 * strings at ~512 MB). So prompts are chunked into `--batch-size` jobs and
 * every output file is parsed as a stream, never buffered whole.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-illustrations.mjs <command> [options]
 *
 * Commands:
 *   run        submit the batches, poll them, and download images as they finish
 *   submit     build + upload the JSONL batches and create them; prints the ids
 *   status     show batch status (--batch <id>, or every batch last submitted)
 *   download   download completed batches' images into --out
 *   sync       generate immediately, one request per prompt (bounded concurrency)
 *   dry-run    print the prompts, targets, and projected cost; make no API calls
 *
 * Options:
 *   --out <dir>          Output directory (default: ./generated-illustrations)
 *   --sink <disk|r2>     Where images land (default: disk). `r2` uploads each
 *                        image under illustrations/<runId>/<promptId>/v<n>/ so
 *                        rejected candidates never reach git; promote the
 *                        keepers with scripts/promote-illustrations.mjs.
 *   --run <id>           Run id for the R2 key prefix (default: a timestamp)
 *   --variant <n>        Variant number for the R2 key (default: 1)
 *   --only <id[,id...]>  Only these prompt ids
 *   --category <cat>     Only this category (course-thumbnail | course-illustration | ...)
 *   --size <WxH|auto>    Override the per-category size for every prompt
 *   --quality <q>        auto | low | medium | high (default: low — see above)
 *   --background <mode>  auto | opaque (default: auto)
 *                        gpt-image-2 has no transparent background. To get
 *                        cut-outs, run scripts/remove-background-kie.mjs over
 *                        the generated candidates afterwards.
 *   --output-format <f>  png | webp | jpeg (default: png). webp is ~10x smaller
 *                        on disk, which matters over thousands of images.
 *   --model <name>       Override the model (default: JSON meta.model)
 *   --completion-window  Batch window: 24h (default)
 *   --batch-size <n>     Prompts per batch job (default: 100)
 *   --max-in-flight <n>  Batches submitted at once during `run` (default: 4)
 *   --batch <id>         Target batch id for `status` / `download`
 *   --poll-interval <s>  `run` poll seconds (default: 30)
 *   --concurrency <n>    `sync` parallel requests (default: 3)
 *   --force              Overwrite existing images (default: skip present)
 *   -h, --help           Show this help
 *
 * Notes:
 *   - GPT Image 2 returns base64 image data (no URL); it is decoded and written.
 *   - The prompt text is built the same way as lib/illustrationPrompt.ts
 *     (buildIllustrationPrompt). `__tests__/illustrationPrompt.test.ts` asserts
 *     the two agree, so the house style cannot drift between them.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createR2Client, credentialsFromEnv } from "./lib/r2.mjs";

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
    sink: "disk",
    run: null,
    variant: 1,
    only: null,
    category: null,
    size: null,
    // Low is the default on purpose: it is ~7x cheaper than medium and ~28x
    // cheaper than high, and holds up for isometric / risograph art.
    quality: "low",
    background: "auto",
    outputFormat: "png",
    model: null,
    completionWindow: "24h",
    batchSize: 100,
    maxInFlight: 4,
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
      case "--sink": opts.sink = next(); break;
      case "--run": opts.run = next(); break;
      case "--variant": opts.variant = Math.max(1, Number(next()) || 1); break;
      case "--only": opts.only = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--category": opts.category = next(); break;
      case "--size": opts.size = next(); break;
      case "--quality": opts.quality = next(); break;
      case "--background": opts.background = next(); break;
      case "--output-format": opts.outputFormat = next(); break;
      case "--model": opts.model = next(); break;
      case "--completion-window": opts.completionWindow = next(); break;
      case "--batch-size": opts.batchSize = Math.max(1, Number(next()) || 100); break;
      case "--max-in-flight": opts.maxInFlight = Math.max(1, Number(next()) || 4); break;
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
/** Exported so `__tests__/illustrationPrompt.test.ts` can assert this stays
 *  byte-identical to the TypeScript `buildIllustrationPrompt`. */
export function buildPrompt(spec, colors) {
  // Mirror of DEFAULT_STYLE in lib/illustrationPrompt.ts (pinned by a parity test).
  const style = (spec.style && spec.style.trim()) || "isometric illustration";
  const article = /^[aeiou]/i.test(style) ? "An" : "A";
  return (
    `${article} ${style} of ${spec.subject}. No text.\n\n` +
    `Blue: ${colors.blue}\n` +
    `Green: ${colors.green}\n` +
    `Red: ${colors.red}\n` +
    `Yellow: ${colors.yellow}`
  );
}

// ── Cost estimation ──────────────────────────────────────────────────────────
// Image output tokens per request, measured against gpt-image-2 on 2026-07-28.
// Keyed "<size>/<quality>". `auto` is not listed because the model picks a tier
// per prompt, so its cost is not predictable up front.
const COST_TOKENS = {
  "1024x1024/low": 196,
  "1024x1024/medium": 1372,
  "1024x1024/high": 5488,
  "1536x1024/low": 158,
  "1536x1024/medium": 1372,
  "1536x1024/high": 5488,
};
// USD per 1M image output tokens (https://developers.openai.com/api/docs/pricing).
const USD_PER_MTOK = { batch: 15, sync: 30 };

/** Projected USD for a set of entries, or null when the tier is unpredictable. */
function estimateCost(entries, opts, mode) {
  let tokens = 0;
  for (const e of entries) {
    const key = `${opts.size || e.size}/${opts.quality}`;
    const t = COST_TOKENS[key];
    if (t === undefined) return null;
    tokens += t;
  }
  return (tokens * USD_PER_MTOK[mode]) / 1e6;
}

function describeCost(entries, opts, mode) {
  const usd = estimateCost(entries, opts, mode);
  if (usd === null) {
    return `cost not estimable at quality "${opts.quality}" (use low/medium/high)`;
  }
  return `~$${usd.toFixed(2)} projected (${mode} pricing, image output tokens)`;
}

/** File extension for the configured output format. */
function outputExt(opts) {
  return opts.outputFormat === "jpeg" ? "jpg" : opts.outputFormat;
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
  if (opts.outputFormat && opts.outputFormat !== "png") {
    body.output_format = opts.outputFormat;
  }
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

// Statuses worth retrying: gateway/proxy hiccups and rate limits. A batch's
// output file is hundreds of MB, and fetching it through a proxy is exactly
// where a 504 shows up — losing the whole run at the last step, after the
// images have already been generated and paid for.
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * One OpenAI API call.
 *
 * `retries` defaults to 0 and is opted into per call site, deliberately: this
 * helper also creates batches and submits image generations, and silently
 * re-sending one of those would duplicate work and double the bill. Only
 * idempotent GETs pass a retry count.
 */
async function api(path, { method = "GET", key, json, form, retries = 0 } = {}) {
  const headers = { Authorization: `Bearer ${key}` };
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form !== undefined) {
    body = form; // fetch sets the multipart boundary itself
  }

  for (let attempt = 0; ; attempt++) {
    let res;
    let networkErr;
    try {
      res = await fetch(`${API_BASE}${path}`, { method, headers, body });
    } catch (err) {
      networkErr = err; // DNS, TLS, socket reset — retryable like a 5xx
    }
    if (res?.ok) return res;

    const transient = networkErr !== undefined || RETRY_STATUS.has(res?.status);
    if (!transient || attempt >= retries) {
      if (networkErr) throw networkErr;
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ""}`);
    }

    // 2s, 4s, 8s, 16s, 32s (capped): long enough to outlast a proxy blip
    // without stalling a run that is genuinely broken.
    const waitMs = Math.min(32_000, 2_000 * 2 ** attempt);
    const reason = networkErr ? networkErr.message : `HTTP ${res.status}`;
    console.error(
      `  … ${method} ${path} failed (${reason}); retry ${attempt + 1}/${retries} in ${waitMs / 1000}s`,
    );
    await sleep(waitMs);
  }
}

/** Internals exposed for `__tests__/generateIllustrationsRetry.test.ts`, which
 *  pins both halves of the retry contract: transient failures are retried where
 *  a caller opts in, and never retried where they are not. */
export const __testing = { api };

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
  }));
}

/** Split entries into `--batch-size` chunks so no single batch produces an
 *  output file too large to stream comfortably. */
function chunk(entries, size) {
  const out = [];
  for (let i = 0; i < entries.length; i += size) out.push(entries.slice(i, i + size));
  return out;
}

/** Decode a base64 image payload from an images response body and write it. */
function decodeImage(respBody) {
  const b64 = respBody?.data?.[0]?.b64_json;
  if (!b64) throw new Error("response contained no image data (b64_json)");
  return Buffer.from(b64, "base64");
}

/** R2 key for one candidate image. Mirrors promote-illustrations.mjs. */
export function candidateKey(runId, promptId, variant, kind) {
  return `illustrations/${runId}/${promptId}/v${variant}/${kind}.png`;
}

/**
 * Where generated images land.
 *
 * `disk` is the default and keeps one-off local work frictionless. `r2` exists
 * because most candidates are rejects: generating several variants per
 * illustration and keeping one means three quarters of the bytes should never
 * reach git. Uploading them under a run-scoped prefix keeps them reviewable,
 * makes a whole run deletable with a single prefix delete, and lets a bucket
 * lifecycle rule expire them without any bookkeeping.
 */
function makeSink(opts) {
  const ext = outputExt(opts);
  if (opts.sink === "disk") {
    return {
      describe: opts.out,
      skip: (id) => !opts.force && existsSync(join(opts.out, `${id}.${ext}`)),
      label: (id) => `${id}.${ext}`,
      init: () => mkdirSync(opts.out, { recursive: true }),
      write: async (id, buf) => writeFileSync(join(opts.out, `${id}.${ext}`), buf),
    };
  }
  const client = createR2Client(credentialsFromEnv());
  const runId = opts.run;
  return {
    describe: `r2://${client.bucket}/illustrations/${runId}/`,
    // No per-object existence check: a HEAD per candidate would cost a round
    // trip each, and re-uploading the same key is idempotent anyway.
    skip: () => false,
    label: (id) => candidateKey(runId, id, opts.variant, "original"),
    init: () => {},
    write: async (id, buf) =>
      client.put(candidateKey(runId, id, opts.variant, "original"), buf, `image/${opts.outputFormat}`),
  };
}

// ── Commands ─────────────────────────────────────────────────────────────────
async function cmdDryRun(entries, opts) {
  const ext = outputExt(opts);
  const batches = chunk(entries, opts.batchSize).length;
  console.log(
    `[dry-run] ${entries.length} prompt(s) · background ${opts.background} · ` +
      `quality ${opts.quality} · ${ext} · ${batches} batch job(s)\n` +
      `          ${describeCost(entries, opts, "batch")}\n`,
  );
  for (const e of entries) {
    console.log(`── ${e.id}.${ext}  (${opts.size || e.size})`);
    console.log(e.prompt.replace(/^/gm, "   "));
    console.log();
  }
}

/** Upload one JSONL chunk and create its batch. */
async function submitChunk(entries, opts, model, key, label) {
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

  const form = new FormData();
  form.append("purpose", "batch");
  form.append(
    "file",
    new Blob([jsonl], { type: "application/jsonl" }),
    "illustration-batch.jsonl",
  );
  const fileRes = await api("/files", { method: "POST", key, form });
  const file = await fileRes.json();

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
  console.log(`  ${label} → batch ${batch.id} (${entries.length} requests, ${batch.status})`);
  return batch;
}

/** Record every batch id so `status` / `download` can pick them all up later. */
function saveBatchState(opts, model, batches, total) {
  mkdirSync(opts.out, { recursive: true });
  writeFileSync(
    BATCH_STATE_FILE(opts.out),
    JSON.stringify(
      {
        model,
        count: total,
        outputFormat: opts.outputFormat,
        batchIds: batches.map((b) => b.id),
      },
      null,
      2,
    ),
  );
}

async function cmdSubmit(entries, opts, model, key) {
  const chunks = chunk(entries, opts.batchSize);
  console.log(`Submitting ${entries.length} prompt(s) across ${chunks.length} batch job(s)…`);
  const batches = [];
  for (const [i, c] of chunks.entries()) {
    batches.push(await submitChunk(c, opts, model, key, `[${i + 1}/${chunks.length}]`));
  }
  saveBatchState(opts, model, batches, entries.length);
  console.log(`\nTrack them with:  node scripts/generate-illustrations.mjs status --out ${opts.out}`);
  return batches;
}

/** Every batch id this run should act on: explicit --batch, else the state file. */
function resolveBatchIds(opts) {
  if (opts.batch) return [opts.batch];
  const stateFile = BATCH_STATE_FILE(opts.out);
  if (existsSync(stateFile)) {
    const state = JSON.parse(readFileSync(stateFile, "utf8"));
    // `batchId` is the pre-chunking single-batch shape; still accepted.
    const ids = state.batchIds || (state.batchId ? [state.batchId] : []);
    if (ids.length) return ids;
  }
  console.error("No --batch id given and no last-batch.json in --out.");
  process.exit(1);
}

async function retrieveBatch(id, key) {
  // Polled in a loop for the life of a run; one transient 5xx should not end it.
  const res = await api(`/batches/${id}`, { key, retries: 5 });
  return res.json();
}

async function cmdStatus(opts, key) {
  const ids = resolveBatchIds(opts);
  const batches = [];
  for (const id of ids) {
    const batch = await retrieveBatch(id, key);
    const c = batch.request_counts || {};
    console.log(
      `Batch ${batch.id}: ${batch.status} · ${c.completed ?? 0}/${c.total ?? "?"} done, ${c.failed ?? 0} failed`,
    );
    batches.push(batch);
  }
  return batches;
}

/**
 * Yield an output file's JSONL rows one line at a time.
 *
 * Batch image output embeds each PNG as base64 in its row, so these files run to
 * gigabytes; `res.text()` would exceed V8's ~512 MB max string length. Reading
 * the body as a stream keeps only one row (~3.6 MB) in memory at a time.
 */
async function* streamFileLines(fileId, key) {
  // The call that actually bit: a several-hundred-MB output file fetched
  // through a proxy returns 504 often enough to matter, and by this point the
  // images are already generated and billed. Retries cover establishing the
  // request; if the socket dies mid-stream the generator still throws, and the
  // fix there is to re-run `download --batch <id>`, which starts the file over.
  const res = await api(`/files/${fileId}/content`, { key, retries: 5 });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.trim()) yield line;
    }
  }
  buf += decoder.decode();
  if (buf.trim()) yield buf;
}

/** Stream one batch's output file, writing every successful image as it arrives. */
async function writeBatchOutputs(fileId, opts, key, sink) {
  let ok = 0;
  let failed = 0;
  for await (const line of streamFileLines(fileId, key)) {
    const row = JSON.parse(line);
    if (row.error || row.response?.status_code !== 200) {
      failed++;
      const msg = row.error?.message || row.response?.body?.error?.message || "unknown error";
      console.error(`  ✗ ${row.custom_id}: ${msg}`);
      continue;
    }
    if (sink.skip(row.custom_id)) {
      console.log(`  • skip ${row.custom_id} (exists; use --force)`);
      continue;
    }
    try {
      await sink.write(row.custom_id, decodeImage(row.response.body));
      ok++;
      console.log(`  ✓ ${sink.label(row.custom_id)}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${row.custom_id}: ${err.message}`);
    }
  }
  return { ok, failed };
}

/** Download one completed batch. Returns per-batch counts. */
async function downloadBatch(b, opts, key, sink) {
  if (b.status !== "completed") {
    console.error(`  ! batch ${b.id} is ${b.status}, skipping`);
    return { ok: 0, failed: 0 };
  }
  if (b.error_file_id) {
    for await (const line of streamFileLines(b.error_file_id, key)) {
      const row = JSON.parse(line);
      console.error(`  ! ${row.custom_id}: ${row.response?.body?.error?.message || "request errored"}`);
    }
  }
  if (!b.output_file_id) {
    console.error(`  ! batch ${b.id} completed but has no output file`);
    return { ok: 0, failed: 0 };
  }
  return writeBatchOutputs(b.output_file_id, opts, key, sink);
}

async function cmdDownload(opts, key, batches, sink = makeSink(opts)) {
  sink.init();
  const list =
    batches ||
    (await Promise.all(resolveBatchIds(opts).map((id) => retrieveBatch(id, key))));
  let ok = 0;
  let failed = 0;
  for (const b of list) {
    const r = await downloadBatch(b, opts, key, sink);
    ok += r.ok;
    failed += r.failed;
  }
  console.log(`\nDone: ${ok} written, ${failed} failed. Output in ${sink.describe}`);
  if (failed > 0) process.exitCode = 1;
}

const TERMINAL = new Set(["completed", "failed", "expired", "cancelled"]);

/** Poll one batch to a terminal state, reporting progress under `label`. */
async function pollBatch(batch, opts, key, label) {
  let b = batch;
  while (!TERMINAL.has(b.status)) {
    await sleep(opts.pollInterval * 1000);
    b = await retrieveBatch(b.id, key);
    const c = b.request_counts || {};
    console.log(`  … ${label} ${b.status} (${c.completed ?? 0}/${c.total ?? "?"})`);
  }
  return b;
}

/**
 * Submit every chunk, keeping at most `--max-in-flight` batches live at a time,
 * and download each one's images as soon as it completes. Bounding the window
 * keeps a thousands-of-images run inside the account's queued-batch limits and
 * means disk fills incrementally rather than all at the end.
 */
async function cmdRun(entries, opts, model, key) {
  const chunks = chunk(entries, opts.batchSize);
  console.log(
    `Submitting ${entries.length} prompt(s) across ${chunks.length} batch job(s), ` +
      `max ${opts.maxInFlight} in flight.\n`,
  );
  const sink = makeSink(opts);
  sink.init();

  const submitted = [];
  let ok = 0;
  let failed = 0;
  let next = 0;

  async function worker() {
    while (next < chunks.length) {
      const i = next++;
      const label = `[${i + 1}/${chunks.length}]`;
      const batch = await submitChunk(chunks[i], opts, model, key, label);
      submitted.push(batch);
      saveBatchState(opts, model, submitted, entries.length);
      const done = await pollBatch(batch, opts, key, label);
      if (done.status !== "completed") {
        console.error(`  ✗ ${label} ended as ${done.status}`);
        failed += chunks[i].length;
        continue;
      }
      const r = await downloadBatch(done, opts, key, sink);
      ok += r.ok;
      failed += r.failed;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(opts.maxInFlight, chunks.length) }, worker),
  );
  console.log(`\nDone: ${ok} written, ${failed} failed. Output in ${sink.describe}`);
  if (failed > 0) process.exitCode = 1;
}

async function cmdSync(entries, opts, model, key) {
  const sink = makeSink(opts);
  sink.init();
  const todo = entries.filter((e) => {
    if (sink.skip(e.id)) {
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
        await sink.write(e.id, decodeImage(await res.json()));
        ok++;
        console.log(`  ✓ ${sink.label(e.id)}`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${e.id}: ${err.message}`);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(opts.concurrency, todo.length) }, worker),
  );
  console.log(`\nDone: ${ok} generated, ${failed} failed. Output in ${sink.describe}`);
  if (failed > 0) process.exitCode = 1;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.command) return printHelp();

  if (opts.background === "transparent") {
    console.error(
      "gpt-image-2 does not support transparent backgrounds (the API rejects\n" +
        'background="transparent", and asking for one in the prompt makes the model\n' +
        "paint a fake checkerboard). Generate opaque, then remove the background\n" +
        "afterwards with: node scripts/remove-background-kie.mjs",
    );
    process.exit(1);
  }
  if (!["png", "webp", "jpeg"].includes(opts.outputFormat)) {
    console.error(`Unsupported --output-format "${opts.outputFormat}". Use png, webp, or jpeg.`);
    process.exit(1);
  }
  if (!["auto", "low", "medium", "high"].includes(opts.quality)) {
    console.error(`Unsupported --quality "${opts.quality}". Use auto, low, medium, or high.`);
    process.exit(1);
  }
  if (!["disk", "r2"].includes(opts.sink)) {
    console.error(`Unsupported --sink "${opts.sink}". Use disk or r2.`);
    process.exit(1);
  }
  if (opts.sink === "r2" && !opts.run) {
    // A run id groups every candidate from one invocation under one prefix, so
    // the whole run can be deleted or expired as a unit. Default to a sortable
    // UTC timestamp when the caller does not supply one.
    opts.run = new Date().toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
    console.log(`No --run given; using run id ${opts.run}`);
  }

  const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const model = opts.model || data.meta.model;

  // Commands that operate on an existing batch don't need the prompt set.
  if (opts.command === "status") return cmdStatus(opts, requireKey());
  if (opts.command === "download") return cmdDownload(opts, requireKey());

  const entries = selectEntries(data, opts);

  if (opts.command === "dry-run") return cmdDryRun(entries, opts);

  const mode = opts.command === "sync" ? "sync" : "batch";
  console.log(
    `${entries.length} prompt(s) · model ${model} · background ${opts.background} · ` +
      `quality ${opts.quality} · ${outputExt(opts)} · out ${opts.out}\n` +
      `${describeCost(entries, opts, mode)}\n`,
  );
  const key = requireKey();
  if (opts.command === "sync") return cmdSync(entries, opts, model, key);
  if (opts.command === "submit") { await cmdSubmit(entries, opts, model, key); return; }
  if (opts.command === "run") return cmdRun(entries, opts, model, key);
}

// Only drive the CLI when executed directly. The vitest suite imports
// `buildPrompt` from here to assert it matches lib/illustrationPrompt.ts, and
// that import must not kick off a run.
const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
