#!/usr/bin/env node
/**
 * Batch-generate the Dataslope course/interview illustrations with OpenAI's
 * GPT Image 2. Reads prompt definitions from `data/illustration-prompts.json`
 * (the same source the admin gallery and `<IllustrationPrompt>` cards render),
 * builds each prompt in the house style, and writes one PNG per prompt.
 *
 * Defaults to the Batch API (~50% cheaper, async) at **low** quality: image
 * output tokens dominate the bill and `low` (196 tokens per 1024x1024 vs 5488
 * at `high`) holds up for flat isometric/risograph art. Work is split across
 * batches because images come back as inline base64 in the output JSONL — one
 * big batch's file could not be read into a JS string (V8 caps ~512 MB) — and
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
 *   --background <mode>  transparent | opaque | auto (default: transparent)
 *                        gpt-image-2 emits a real alpha channel, so a run is
 *                        already the cut-out the site serves and there is no
 *                        background-removal step. A transparent image is
 *                        written as the run's `cutout` artifact and checked
 *                        for alpha before it is written (see `alphaStats`).
 *   --output-format <f>  png | webp | jpeg (default: png). webp is ~10x smaller
 *                        on disk, which matters over thousands of images.
 *                        jpeg has no alpha channel and is refused with a
 *                        transparent background.
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
 *   - Transparency comes from the API, not from a second service. An image
 *     that comes back with no transparent pixels at all is a failed cut-out
 *     (the model painted a background anyway), and is reported rather than
 *     written: a written one would be promoted as a `-cutout` and serve an
 *     opaque rectangle where every surface expects an isolated subject.
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
import sharp from "sharp";
import { createR2Client, credentialsFromEnv } from "./lib/r2.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = join(ROOT, "data", "illustration-prompts.json");
const API_BASE = "https://api.openai.com/v1";
// Two spellings, not interchangeable: `api()` joins IMAGES_PATH onto
// API_BASE (which already carries /v1), while a Batch JSONL line names the
// endpoint from the API root. Passing the batch spelling to `api()` builds
// `/v1/v1/...` and 404s in a way that reads like a missing model.
const IMAGES_PATH = "/images/generations";
const IMAGES_ENDPOINT = `/v1${IMAGES_PATH}`;

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
    // Low on purpose: ~28x cheaper than high, holds up for this art style.
    quality: "low",
    // Transparent by default: this is the pipeline's cut-out step, and an
    // opaque run would have to be background-removed by something else.
    background: "transparent",
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
  // Mirror of SHARED_CONSTRAINTS in lib/illustrationPrompt.ts (same parity test).
  const shared =
    "No text. Draw only the objects described — nothing scattered over, around, " +
    "or behind them: no speckled dots, no confetti, no stray connecting lines.";
  // Mirror of ISOMETRIC_CONSTRAINTS; also the fallback for a style with no
  // block of its own, exactly as in the library.
  const isometric =
    "Render each object as a solid three-dimensional form with real thickness, " +
    "smooth matte shading, and clean edges; never as a glossy sphere, a ball, or " +
    "a thin round counter. " +
    "Stage everything light and airy on an empty transparent background: pale " +
    "grey and white platforms, bright brand colors, no dark or black bases. " +
    "Leave the background fully empty behind, around and beneath the subject: " +
    "no backdrop, no floor, no ground shadow, no soft glow and no vignette, so " +
    "the whole subject lifts off the page in one piece. Make every object a " +
    "single solid piece in one flat brand color: never build one object out of " +
    "many small blocks or cubelets, never pack a container with a heap of little " +
    "pieces, and never blend, mix, or bleed two colors into each other. Animals " +
    "are the exception and the focal point: draw each one as a rounded, " +
    "realistic creature with soft fur or feather texture and its own natural " +
    "coloring and markings, never a flat brand color and never a flat " +
    "silhouette. A bird has wings, a beak and feet and never hands or arms: it " +
    "perches, stands, or nudges things with its beak rather than holding them.";
  // Mirror of RISOGRAPH_CONSTRAINTS (the inline historical figures).
  const risograph =
    "Print it as a risograph: a few flat spot-color inks, coarse halftone grain " +
    "inside every inked shape, and slight misregistration where two inks " +
    "overlap. No gradients, no photographic shading, no glossy highlights. " +
    "Ink every shape in one of the brand colors below and let two inks overprint " +
    "into a third; never key the scene off black, grey, or a single hue, and " +
    "never outline in black. Leave the paper blank white behind and between the " +
    "shapes: no printed panel, no frame, no border, no ground shadow, so the " +
    "whole subject lifts off the page in one piece. Compose it as a wide band " +
    "twice as long as it is tall, reading left to right across the full width " +
    "rather than centered in the middle. Draw any person as a small stylized " +
    "figure with minimal facial detail and no resemblance to a real individual.";
  const byStyle = { "isometric illustration": isometric, risograph };
  const constraints = `${shared} ${byStyle[style] ?? isometric}`;
  return (
    `${article} ${style} of ${spec.subject}. ${constraints}\n\n` +
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
  // The 2:1 band the inline risograph figures use (`course-inline`), and the
  // cheapest frame the API will take: 1024x512 is refused ("below the current
  // minimum pixel budget"). Only `low` is measured, the tier everything ships at.
  "1536x768/low": 102,
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

// Statuses worth retrying: gateway/proxy hiccups and rate limits.
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * One OpenAI API call. `retries` defaults to 0 and is opted into per call
 * site: this helper also creates batches and submits generations, and
 * silently re-sending one would double the bill. Only idempotent GETs retry.
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

    // 2s..32s capped backoff: outlasts a proxy blip without stalling a run
    // that is genuinely broken.
    const waitMs = Math.min(32_000, 2_000 * 2 ** attempt);
    const reason = networkErr ? networkErr.message : `HTTP ${res.status}`;
    console.error(
      `  … ${method} ${path} failed (${reason}); retry ${attempt + 1}/${retries} in ${waitMs / 1000}s`,
    );
    await sleep(waitMs);
  }
}

/** Exposed for `__tests__/generateIllustrationsRetry.test.ts`, which pins
 *  both halves of the retry contract. */
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

/**
 * What an image's alpha channel looks like, as three fractions of the frame.
 * Used to tell a real cut-out from an opaque rectangle before either is
 * written; a failed cut-out promoted as one serves a white slab on a page
 * that expects an isolated subject.
 *
 *   - `clear` — fully transparent. A healthy cut-out is roughly half the
 *     frame; zero means the model painted a background despite being asked
 *     for none.
 *   - `solid` — fully opaque: the artwork itself.
 *   - `soft` — everything between. Edge antialiasing is ~2% of a frame; a
 *     ground shadow or a vignette pushes it past 5%, which reads as a grey
 *     smudge on the dark page and is invisible on the light one, so it is
 *     worth reporting even though it is not fatal.
 */
export async function alphaStats(buf) {
  const { data, info } = await sharp(buf)
    // Downscaled first: this is a statistic, and a 1536x1024 RGBA raw buffer
    // is 6 MB per image where 320px wide is 260 kB.
    .resize({ width: 320 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  let clear = 0;
  let solid = 0;
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3];
    if (a <= 4) clear++;
    else if (a >= 250) solid++;
  }
  return { clear: clear / n, solid: solid / n, soft: (n - clear - solid) / n };
}

/**
 * Soft alpha above this is a painted shadow or vignette rather than edge
 * antialiasing; warned about, not fatal. Two limits, because the two house
 * styles put different amounts of the frame at partial alpha by design:
 *
 *   - **Isometric** art is solid forms with clean edges, so only the
 *     antialiased outline is soft. Measured 1.8-3% on clean art, and 9.3% on
 *     the same subject back when the prompt still asked for a white
 *     background and got a ground shadow painted at partial alpha.
 *   - **Risograph** is *made* of halftone grain, and the gap between two dots
 *     is correctly transparent. Measured 6-12% across a clean set, so the
 *     isometric limit would flag every band ever drawn.
 */
const SOFT_ALPHA_WARN = { "isometric illustration": 0.05, risograph: 0.15 };

/** Prompt styles by id, read once. `writeImage` needs the style to pick a
 *  soft-alpha limit, and the batch download path has only a custom_id. */
let styleById = null;
function softLimitFor(id) {
  if (!styleById) {
    styleById = new Map(
      JSON.parse(readFileSync(DATA_FILE, "utf8")).prompts.map((p) => [
        p.id,
        (p.style && p.style.trim()) || "isometric illustration",
      ]),
    );
  }
  // An unknown id (or a style with no constraint block of its own) is drawn
  // with the isometric constraints, so it gets the isometric limit too.
  return SOFT_ALPHA_WARN[styleById.get(id)] ?? SOFT_ALPHA_WARN["isometric illustration"];
}

/** R2 key for one candidate image. Mirrors promote-illustrations.mjs. */
export function candidateKey(runId, promptId, variant, kind) {
  return `illustrations/${runId}/${promptId}/v${variant}/${kind}.png`;
}

/** The artifact kind a run produces: a transparent generation IS the cut-out
 *  every surface asks for, so it is stored under that name and promotion
 *  picks it up with no intermediate step. */
function artifactKind(opts) {
  return opts.background === "transparent" ? "cutout" : "original";
}

/**
 * Where generated images land. `disk` keeps one-off local work frictionless;
 * `r2` exists because most candidates are rejects that should never reach git,
 * and a run-scoped prefix makes a whole run deletable/expirable as a unit.
 */
function makeSink(opts) {
  const ext = outputExt(opts);
  const kind = artifactKind(opts);
  // Disk names a cut-out `<id>-cutout.<ext>`, the suffix promote-illustrations
  // and trim-cutouts both key on.
  const stem = (id) => (kind === "cutout" ? `${id}-cutout` : id);
  if (opts.sink === "disk") {
    return {
      describe: opts.out,
      skip: (id) => !opts.force && existsSync(join(opts.out, `${stem(id)}.${ext}`)),
      label: (id) => `${stem(id)}.${ext}`,
      init: () => mkdirSync(opts.out, { recursive: true }),
      write: async (id, buf) => writeFileSync(join(opts.out, `${stem(id)}.${ext}`), buf),
    };
  }
  const client = createR2Client(credentialsFromEnv());
  const runId = opts.run;
  return {
    describe: `r2://${client.bucket}/illustrations/${runId}/`,
    // No per-object existence check: re-uploading the same key is idempotent.
    skip: () => false,
    label: (id) => candidateKey(runId, id, opts.variant, kind),
    init: () => {},
    write: async (id, buf) =>
      client.put(candidateKey(runId, id, opts.variant, kind), buf, `image/${opts.outputFormat}`),
  };
}

/**
 * Write one generated image, refusing an opaque one on a transparent run.
 * Both the batch and sync paths go through here so neither can skip the
 * check; a cut-out with no transparent pixels would be promoted and served
 * as an opaque rectangle.
 */
async function writeImage(sink, id, buf, opts) {
  if (opts.background !== "transparent") {
    await sink.write(id, buf);
    return "";
  }
  const a = await alphaStats(buf);
  const pct = (v) => `${(v * 100).toFixed(0)}%`;
  if (a.clear === 0) {
    throw new Error(
      "came back fully opaque despite background=transparent " +
        "— the model painted a background; re-run this id",
    );
  }
  await sink.write(id, buf);
  return a.soft > softLimitFor(id)
    ? `  (clear ${pct(a.clear)}, but ${pct(a.soft)} soft alpha: check for a ` +
        `painted shadow or vignette on the dark theme)`
    : ` (clear ${pct(a.clear)})`;
}

// ── Commands ─────────────────────────────────────────────────────────────────
async function cmdDryRun(entries, opts) {
  const ext = outputExt(opts);
  const batches = chunk(entries, opts.batchSize).length;
  console.log(
    `[dry-run] ${entries.length} prompt(s) · background ${opts.background} · ` +
      `quality ${opts.quality} · ${ext} · writes the ${artifactKind(opts)} · ` +
      `${batches} batch job(s)\n` +
      `          ${describeCost(entries, opts, "batch")}\n`,
  );
  const suffix = artifactKind(opts) === "cutout" ? "-cutout" : "";
  for (const e of entries) {
    console.log(`── ${e.id}${suffix}.${ext}  (${opts.size || e.size})`);
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
 * Yield an output file's JSONL rows one line at a time. These files run to
 * gigabytes (base64 PNGs); `res.text()` would exceed V8's ~512 MB max string
 * length, so stream, keeping one row in memory at a time.
 */
async function* streamFileLines(fileId, key) {
  // Retried: a several-hundred-MB file through a proxy 504s often, and by now
  // the images are already billed. Retries cover establishing the request; a
  // mid-stream death still throws — re-run `download --batch <id>`.
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
      const note = await writeImage(sink, row.custom_id, decodeImage(row.response.body), opts);
      ok++;
      console.log(`  ✓ ${sink.label(row.custom_id)}${note}`);
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
 * Submit every chunk, at most `--max-in-flight` batches live at a time,
 * downloading each as it completes — stays inside the account's queued-batch
 * limits and fills disk incrementally.
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
        const res = await api(IMAGES_PATH, {
          method: "POST",
          key,
          json: requestBody(e, opts, model),
        });
        const note = await writeImage(sink, e.id, decodeImage(await res.json()), opts);
        ok++;
        console.log(`  ✓ ${sink.label(e.id)}${note}`);
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

  if (!["transparent", "opaque", "auto"].includes(opts.background)) {
    console.error(
      `Unsupported --background "${opts.background}". Use transparent, opaque, or auto.`,
    );
    process.exit(1);
  }
  if (!["png", "webp", "jpeg"].includes(opts.outputFormat)) {
    console.error(`Unsupported --output-format "${opts.outputFormat}". Use png, webp, or jpeg.`);
    process.exit(1);
  }
  if (opts.background === "transparent" && opts.outputFormat === "jpeg") {
    console.error(
      "--output-format jpeg has no alpha channel, so it cannot carry a transparent\n" +
        "background. Use png (the default) or webp.",
    );
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
    // Run id groups one invocation's candidates under one prefix; default to
    // a sortable UTC timestamp.
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
      `quality ${opts.quality} · ${outputExt(opts)} · writes the ` +
      `${artifactKind(opts)} · out ${opts.out}\n` +
      `${describeCost(entries, opts, mode)}\n`,
  );
  const key = requireKey();
  if (opts.command === "sync") return cmdSync(entries, opts, model, key);
  if (opts.command === "submit") { await cmdSubmit(entries, opts, model, key); return; }
  if (opts.command === "run") return cmdRun(entries, opts, model, key);
}

// Only drive the CLI when executed directly: the vitest suite imports
// `buildPrompt`, and that import must not kick off a run.
const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
