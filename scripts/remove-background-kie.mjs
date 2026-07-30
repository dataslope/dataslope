#!/usr/bin/env node
/**
 * Remove the background from generated illustrations with Recraft's
 * `remove-background`, served through Kie AI.
 *
 * Middle step of the illustration pipeline (see "Illustrations" in AGENTS.md):
 * generate → **remove background** → promote. It reads the candidates a run
 * produced (a local directory or an R2 run prefix) and writes each cut-out back
 * beside its original, so `promote-illustrations.mjs` can pick up both.
 *
 * Why this model: Recraft beat both Replicate's `851-labs/background-remover`
 * and a local colour-key on this material. It lifts a subject out of a
 * full-bleed scene instead of dissolving the frame into a translucent ghost,
 * which is what the alternatives did to the busier illustrations.
 *
 * Three Kie API details this script exists to encapsulate, because each cost an
 * hour to rediscover, or would:
 *
 *   1. The model input takes a **public URL only** — no base64, no data URI. So
 *      each image is pushed through Kie's own upload endpoint first (free,
 *      auto-deleted after 24h) and the returned `downloadUrl` is what gets
 *      handed to the model.
 *   2. Both Kie hosts sit behind Cloudflare and answer a request with no
 *      browser `User-Agent` with a bare 403 and `error code: 1010`. It reads
 *      exactly like an auth failure and is not.
 *   3. Kie caps an account at 20 new generation requests per 10 seconds, and
 *      rejects the excess with 429 WITHOUT queueing it. A shared sliding-window
 *      limiter admits createTask calls at 18 per 10s so --concurrency can be
 *      raised freely without tripping it, and a 429 waits out a full window
 *      rather than the usual short backoff, since the request was dropped.
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

// Kie enforces, per account, 20 new generation requests per 10 seconds. Excess
// requests are rejected with 429 and are NOT queued, so the limit has to be
// respected client-side rather than discovered. Only createTask counts as a
// "generation request"; uploads and status polls are not throttled here, but
// they do get the same 429 retry below in case that ever changes.
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
 * Fetch binary content with the same transient-failure policy as `kie`.
 *
 * This exists because the finished image is served from Kie's CDN rather than
 * its API, and a bare fetch there is exactly where a run gets lost: the
 * generation has already succeeded and been billed, so a 503 on the download
 * throws away paid work. Eight of forty-four images failed this way before it
 * was wrapped.
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
  async function worker() {
    while (i < todo.length) {
      const id = todo[i++];
      try {
        const src = await store.read(id);
        const cut = await removeBackground(src, `${id}.png`, key);
        const where = await store.writeCutout(id, cut);
        ok++;
        console.log(`  ✓ ${where} (${(cut.length / 1e6).toFixed(2)}MB)`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${id}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.concurrency, todo.length) }, worker));
  console.log(`\nDone: ${ok} removed, ${failed} failed.`);
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
