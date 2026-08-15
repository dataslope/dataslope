#!/usr/bin/env node
/**
 * Remove the background from generated illustrations with Recraft's
 * `remove-background`, served through Kie AI. Middle step of the illustration
 * pipeline (generate → remove background → promote, see AGENTS.md): reads a
 * run's candidates (local dir or R2 prefix) and writes each cut-out back
 * beside its original for `promote-illustrations.mjs`.
 *
 * Kie API quirks this script encapsulates:
 *   1. The model input takes a public URL only — each image is pushed through
 *      Kie's upload endpoint first (auto-deleted after 24h).
 *   2. Both Kie hosts sit behind Cloudflare and answer a request with no
 *      browser User-Agent with a bare 403 `error code: 1010` — it reads like
 *      an auth failure and is not.
 *   3. Kie caps an account at 20 new generation requests per 10s and rejects
 *      the excess with 429 WITHOUT queueing; a shared sliding-window limiter
 *      admits createTask at 18/10s, and a 429 waits out a full window.
 *
 * Usage:
 *   KIE_API_KEY=... node scripts/remove-background-kie.mjs [options]
 *
 * Options:
 *   --from <dir|r2>    Candidate source (default: ./generated-illustrations)
 *   --run <id>         R2 run id (required when --from r2; also the sink)
 *   --variant <n>      Variant number for R2 keys (default: 1)
 *   --only <id[,id..]> Only these prompt ids
 *   --concurrency <n>  Parallel jobs (default: 4)
 *   --force            Redo images whose cut-out already exists
 *   -h, --help         Show this help
 *
 * R2 credentials, when --from r2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET (see scripts/lib/r2.mjs).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createR2Client, credentialsFromEnv } from "./lib/r2.mjs";
import sharp from "sharp";

const KIE_UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload";
const KIE_CREATE = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_STATUS = "https://api.kie.ai/api/v1/jobs/recordInfo";
const MODEL = "recraft/remove-background";
// Cloudflare in front of both Kie hosts rejects a UA-less request with 403
// "error code: 1010"; any ordinary browser UA satisfies it.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
export const CUTOUT_SUFFIX = "-cutout";

function parseArgs(argv) {
  const opts = {
    from: join(process.cwd(), "generated-illustrations"),
    run: null,
    variant: 1,
    only: null,
    concurrency: 4,
    force: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--from": opts.from = next(); break;
      case "--run": opts.run = next(); break;
      case "--variant": opts.variant = Math.max(1, Number(next()) || 1); break;
      case "--only": opts.only = next().split(",").map((x) => x.trim()).filter(Boolean); break;
      case "--concurrency": opts.concurrency = Math.max(1, Number(next()) || 4); break;
      case "--force": opts.force = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default: console.error(`Unknown argument: ${a}`); process.exit(1);
    }
  }
  return opts;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(
    src.slice(src.indexOf("/**"), src.indexOf("*/") + 2)
      .replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "")
      .trim(),
  );
}

function requireKey() {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    console.error("KIE_API_KEY is not set. Export it and re-run.");
    process.exit(1);
  }
  return key;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Kie's per-account cap: 20 new generation requests per 10s, excess rejected
// with 429 and NOT queued. Only createTask counts; uploads and polls are not
// throttled here but share the 429 retry below.
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 18; // a little under 20, so a burst can't race past the limit

/** Sliding-window limiter. Shared across workers, so raising --concurrency
 *  cannot exceed the account limit. */
function createLimiter(max, windowMs) {
  const stamps = [];
  let chain = Promise.resolve();
  return () => {
    // Serialise admission so two workers can't both read a stale window.
    chain = chain.then(async () => {
      for (;;) {
        const now = Date.now();
        while (stamps.length && now - stamps[0] >= windowMs) stamps.shift();
        if (stamps.length < max) {
          stamps.push(now);
          return;
        }
        await sleep(windowMs - (now - stamps[0]) + 50);
      }
    });
    return chain;
  };
}
const admitGeneration = createLimiter(RATE_MAX, RATE_WINDOW_MS);

const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 6;

/**
 * Fetch binary content with the same transient-failure policy as `kie`. The
 * finished image is served from Kie's CDN, and a 503 on that download throws
 * away generation work that has already been billed.
 */
async function fetchBinary(url, label) {
  let lastDetail = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res;
    let networkErr;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch (err) {
      networkErr = err;
    }
    if (res?.ok) return Buffer.from(await res.arrayBuffer());

    lastDetail = networkErr ? networkErr.message : String(res.status);
    const transient = networkErr !== undefined || RETRY_STATUS.has(res?.status);
    if (!transient || attempt === MAX_ATTEMPTS - 1) break;
    await sleep(Math.min(16_000, 500 * 2 ** attempt));
  }
  throw new Error(`${label} failed: ${lastDetail}`);
}

async function kie(url, { key, json, method = "GET" } = {}) {
  let lastDetail = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res;
    let networkErr;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${key}`,
          "User-Agent": UA,
          ...(json ? { "Content-Type": "application/json" } : {}),
        },
        body: json ? JSON.stringify(json) : undefined,
      });
    } catch (err) {
      networkErr = err;
    }
    if (res?.ok) return res.json();

    const detail = networkErr ? networkErr.message : await res.text().catch(() => "");
    lastDetail = networkErr ? detail : `${res.status} ${detail.slice(0, 300)}`;
    const transient = networkErr !== undefined || RETRY_STATUS.has(res?.status);
    if (!transient || attempt === MAX_ATTEMPTS - 1) break;

    // A 429 means the window is already full; wait out a whole window rather
    // than the usual short backoff, since the request was rejected, not queued.
    const waitMs =
      res?.status === 429 ? RATE_WINDOW_MS : Math.min(16_000, 500 * 2 ** attempt);
    await sleep(waitMs);
  }
  throw new Error(`Kie ${method} ${new URL(url).pathname} → ${lastDetail}`);
}

/** Upload → createTask → poll → return the finished PNG bytes. */
export async function removeBackground(buf, fileName, key) {
  const up = await kie(KIE_UPLOAD, {
    key,
    method: "POST",
    json: {
      base64Data: `data:image/png;base64,${buf.toString("base64")}`,
      uploadPath: "images/illustrations",
      fileName,
    },
  });
  const imageUrl = up?.data?.downloadUrl;
  if (!imageUrl) throw new Error(`upload returned no downloadUrl: ${JSON.stringify(up).slice(0, 200)}`);

  await admitGeneration();
  const created = await kie(KIE_CREATE, {
    key,
    method: "POST",
    json: { model: MODEL, input: { image: imageUrl } },
  });
  const taskId = created?.data?.taskId;
  if (!taskId) throw new Error(`createTask returned no taskId: ${JSON.stringify(created).slice(0, 200)}`);

  for (let i = 0; i < 100; i++) {
    await sleep(3000);
    const info = await kie(`${KIE_STATUS}?taskId=${encodeURIComponent(taskId)}`, { key });
    const d = info?.data ?? {};
    if (d.state === "success") {
      const url = JSON.parse(d.resultJson).resultUrls[0];
      return fetchBinary(url, "result download");
    }
    if (d.state === "fail") throw new Error(`${d.failMsg || "failed"} (code ${d.failCode ?? "?"})`);
  }
  throw new Error("timed out waiting for the task");
}

/** Candidate store: a local directory, or an R2 run prefix. */
function makeStore(opts) {
  if (opts.from !== "r2") {
    const dir = opts.from;
    if (!existsSync(dir)) {
      console.error(`Source directory not found: ${dir}`);
      process.exit(1);
    }
    const names = () => readdirSync(dir).filter((f) => /\.png$/i.test(f));
    return {
      describe: dir,
      list: async () =>
        names()
          .map((f) => basename(f, extname(f)))
          .filter((s) => !s.endsWith(CUTOUT_SUFFIX))
          .sort(),
      hasCutout: async (id) => existsSync(join(dir, `${id}${CUTOUT_SUFFIX}.png`)),
      read: async (id) => readFileSync(join(dir, `${id}.png`)),
      writeCutout: async (id, buf) => {
        writeFileSync(join(dir, `${id}${CUTOUT_SUFFIX}.png`), buf);
        return `${id}${CUTOUT_SUFFIX}.png`;
      },
    };
  }
  if (!opts.run) {
    console.error("--from r2 needs --run <runId>.");
    process.exit(1);
  }
  const client = createR2Client(credentialsFromEnv());
  const keyFor = (id, kind) => `illustrations/${opts.run}/${id}/v${opts.variant}/${kind}.png`;
  let cache = null;
  const load = async () => (cache ??= await client.list(`illustrations/${opts.run}/`));
  return {
    describe: `r2://${client.bucket}/illustrations/${opts.run}/`,
    list: async () => {
      const ids = new Set();
      for (const k of await load()) {
        const m = /^illustrations\/[^/]+\/([^/]+)\/v\d+\/original\.png$/.exec(k);
        if (m) ids.add(m[1]);
      }
      return [...ids].sort();
    },
    hasCutout: async (id) => (await load()).includes(keyFor(id, "cutout")),
    read: async (id) => client.get(keyFor(id, "original")),
    writeCutout: async (id, buf) => client.put(keyFor(id, "cutout"), buf, "image/png"),
  };
}

/**
 * How much of the original's drawn content survived into the cut-out, as two
 * numbers read together — one measure cannot see both failure modes:
 *
 *   - `ink` — of all the ink laid down, how much is still covered by alpha,
 *     weighted per pixel and capped, so a half-tone pixel is fully accounted
 *     for by half alpha (a plain opacity count fails healthy risograph
 *     screens, where between the dots is rightly transparent). Catches whole
 *     objects being deleted.
 *   - `solid` — of unambiguously inked pixels, how many came back genuinely
 *     opaque. Catches a ghost matte (uniform partial alpha), which `ink`
 *     alone reads as a mild loss.
 *
 * Both images are downscaled to a common width first: the comparison is
 * statistical, and the remover may return a different pixel size.
 */
export async function keptFraction(originalBuf, cutoutBuf) {
  const W = 320;
  const raw = (buf) =>
    sharp(buf).resize({ width: W }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [o, c] = await Promise.all([raw(originalBuf), raw(cutoutBuf)]);
  const w = o.info.width, h = o.info.height;
  const n = Math.min(w * h, c.info.width * c.info.height);

  // Derive the background from the original's border (median pixel) rather
  // than assuming white: on art staged over a solid color, "everything not
  // white" counts the background as content and a correct removal scores as
  // catastrophic loss.
  const chan = [[], [], []];
  const push = (i) => { for (let k = 0; k < 3; k++) chan[k].push(o.data[i * 4 + k]); };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  const bg = chan.map((v) => v.sort((a, b) => a - b)[v.length >> 1]);

  let ink = 0;
  let inkKept = 0;
  let solid = 0;
  let solidKept = 0;
  for (let i = 0; i < n; i++) {
    // 18/255 from the background ignores both the faint contact shadow under
    // each object and any soft vignette, which the remover is right to drop.
    const d = Math.max(
      Math.abs(o.data[i * 4] - bg[0]),
      Math.abs(o.data[i * 4 + 1] - bg[1]),
      Math.abs(o.data[i * 4 + 2] - bg[2]),
    );
    if (d < 18) continue;
    const alpha = c.data[i * 4 + 3];
    ink += d / 255;
    inkKept += Math.min(d, alpha) / 255;
    if (d >= 128) {
      solid++;
      if (alpha > 200) solidKept++;
    }
  }
  return {
    ink: ink ? inkKept / ink : 1,
    solid: solid ? solidKept / solid : 1,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();
  const key = requireKey();

  const store = makeStore(opts);
  let ids = await store.list();
  if (opts.only) ids = ids.filter((id) => opts.only.includes(id));
  if (!ids.length) {
    console.error(`No originals found in ${store.describe}`);
    process.exit(1);
  }

  // How much of the original's drawn content a cut-out must retain. The
  // remover occasionally keeps only the animal and deletes its objects;
  // healthy cut-outs keep a median 96% (5th percentile 90%) while those
  // failures scored ~0.2, so 0.70 sits far from both. Applied to BOTH of
  // `keptFraction`'s numbers — they fail differently, and passing one is no
  // evidence about the other. Known limit: a textured background defeats the
  // border-derived background measure and scores a good removal low; the run
  // then refuses to write and asks for --force, the safe direction to be
  // wrong in.
  const KEEP_FLOOR = 0.7;

  const todo = [];
  for (const id of ids) {
    if (!opts.force && (await store.hasCutout(id))) {
      console.log(`  • skip ${id} (cut-out exists; use --force)`);
      continue;
    }
    todo.push(id);
  }
  if (!todo.length) return console.log("Nothing to do.");

  console.log(`Removing background from ${todo.length} image(s) in ${store.describe}\n`);
  let i = 0;
  let ok = 0;
  let failed = 0;
  const eaten = [];
  async function worker() {
    while (i < todo.length) {
      const id = todo[i++];
      try {
        const src = await store.read(id);
        const cut = await removeBackground(src, `${id}.png`, key);
        const kept = await keptFraction(src, cut);
        const pct = (v) => `${(v * 100).toFixed(0)}%`;
        const score = `ink ${pct(kept.ink)}, solid ${pct(kept.solid)}`;
        if (kept.ink < KEEP_FLOOR || kept.solid < KEEP_FLOOR) {
          // Do NOT write it: a written cut-out would be served, and the next
          // run would skip the id because a cut-out now exists.
          eaten.push({ id, score });
          failed++;
          console.error(
            `  ✗ ${id}: background removal kept ${score} of the artwork ` +
              `— objects were eaten, not written`,
          );
          continue;
        }
        const where = await store.writeCutout(id, cut);
        ok++;
        console.log(`  ✓ ${where} (${(cut.length / 1e6).toFixed(2)}MB, kept ${score})`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${id}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.concurrency, todo.length) }, worker));
  console.log(`\nDone: ${ok} removed, ${failed} failed.`);
  if (eaten.length) {
    console.error(
      `\n${eaten.length} image(s) lost their objects to the remover and were NOT written:\n` +
        eaten.map((e) => `  ${e.id} (kept ${e.score})`).join("\n") +
        `\nRe-run with --force to retry them; the remover is not deterministic, so a` +
        `\nsecond attempt often succeeds. If one keeps failing, look at what the` +
        `\nsubject asks for before retrying a third time:` +
        `\n  · An outline enclosing white — a ruled sheet, a form, an empty grid —` +
        `\n    cannot survive. The white inside it is the same white as the paper,` +
        `\n    so the remover drops it and the object comes back as bare lines.` +
        `\n    Measured on one: 88% of the frame near-white, ink 100% / solid 56%.` +
        `\n    Redraw it as solid masses (a column of filled row blocks, not a` +
        `\n    sheet ruled into rows) and it comes back at solid 98%.` +
        `\n  · A subject that names a setting — "hung on a panelled wall", "in a` +
        `\n    room", "against the sky" — asks for a background, and removing` +
        `\n    backgrounds is the whole job. Measured on one: ink 50%, half the` +
        `\n    artwork gone with the wall. Put the same things on a bench or a` +
        `\n    desk instead and it comes back at ink 100%.` +
        `\n  · A mascot standing apart from the objects can also fail; redraw with` +
        `\n    the animal touching them.`,
    );
  }
  if (failed > 0) process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
