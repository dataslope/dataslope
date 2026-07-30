#!/usr/bin/env node
/**
 * Promote chosen illustration candidates into the repository.
 *
 * This is the last step of the illustration pipeline (see the "Illustrations"
 * section of AGENTS.md): generation writes candidates to R2 or a scratch
 * directory, a human picks the ones worth keeping, and this converts those to
 * WebP and writes them into `public/images/`, the files the site serves.
 *
 * Why WebP, and why this writes the served file directly:
 *
 * Measured on the Python Basics batch, a 1536x1024 illustration is ~1.4 MB as
 * PNG and ~130 kB as WebP — an 11x reduction that holds for the alpha cut-outs
 * too. Committing PNG sources put ~58 MB in git for twenty illustrations, which
 * projects to ~2.9 GB per thousand.
 *
 * The output goes straight into `public/images/`, so each illustration is
 * encoded once and stored in git once. Writing a source under `assets/images/`
 * instead would mean build-images re-encoded it for serving — measured at ~1.8
 * dB PSNR lost to save ~3 kB — and would keep two copies of every image in the
 * repository. build-images now adopts these files into the manifest by reading
 * their dimensions, without touching the bytes.
 *
 * Because the promoted file IS the artifact, `--quality` is the quality users
 * actually see; it defaults to 92 rather than a serving-oriented 80. The
 * pristine PNGs stay in R2 for the bucket's retention window, so a run can be
 * re-promoted at a different quality without regenerating.
 *
 * Deliberately kept separate from build-images.mjs, which is a deterministic,
 * content-hashed build step that must stay a true no-op when nothing changed.
 * Promotion is a network-touching, human-triggered action; it would poison
 * those properties if it lived in the same script.
 *
 * Usage:
 *   node scripts/promote-illustrations.mjs <ids...> [options]
 *   node scripts/promote-illustrations.mjs --all --from <dir>
 *
 * Ids are prompt ids (e.g. `python-basics-loops`). A `-cutout` suffix is
 * promoted alongside its original automatically unless --no-cutout is passed.
 *
 * Options:
 *   --from <dir|r2>   Source of candidates (default: ./generated-illustrations)
 *   --run <id>        R2 run id to promote from (required when --from r2)
 *   --variant <n>     Which variant to take when several exist (default: 1)
 *   --all             Promote every candidate found in the source
 *   --quality <n>     WebP quality of the served image (default: 92)
 *   --no-cutout       Promote only the original, not its background-removed pair
 *   --no-build        Skip the build-images run afterwards
 *   --dry-run         Report what would be promoted; write nothing
 *   -h, --help        Show this help
 *
 * R2 credentials, when --from r2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET (see scripts/lib/r2.mjs).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { createR2Client, credentialsFromEnv } from "./lib/r2.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// Promotion writes the *served* file directly. There is deliberately no copy
// under assets/images: that would put every illustration in git twice, and the
// second encode build-images used to apply cost ~1.8 dB PSNR to save ~3 kB.
const OUT_DIR = join(ROOT, "public", "images");
export const CUTOUT_SUFFIX = "-cutout";

function parseArgs(argv) {
  const opts = {
    ids: [],
    from: join(process.cwd(), "generated-illustrations"),
    run: null,
    variant: 1,
    all: false,
    quality: 92,
    cutout: true,
    build: true,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--from": opts.from = next(); break;
      case "--run": opts.run = next(); break;
      case "--variant": opts.variant = Math.max(1, Number(next()) || 1); break;
      case "--all": opts.all = true; break;
      case "--quality": opts.quality = Math.min(100, Math.max(1, Number(next()) || 92)); break;
      case "--no-cutout": opts.cutout = false; break;
      case "--no-build": opts.build = false; break;
      case "--dry-run": opts.dryRun = true; break;
      case "-h":
      case "--help": opts.help = true; break;
      default:
        if (a.startsWith("-")) { console.error(`Unknown argument: ${a}`); process.exit(1); }
        opts.ids.push(a);
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

/** R2 key for one candidate image. Mirrors generate-illustrations.mjs. */
export function candidateKey(runId, promptId, variant, kind) {
  return `illustrations/${runId}/${promptId}/v${variant}/${kind}.png`;
}

/**
 * Convert one image buffer to the committed WebP source.
 * `nearLossless` is not used: these are photographic-ish raster renders, so
 * plain high-quality WebP is both smaller and visually equivalent.
 */
export async function toWebpSource(buf, quality) {
  return sharp(buf).webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer();
}

/** Candidate sources: either a local directory of PNGs or an R2 run prefix. */
function makeSource(opts) {
  if (opts.from !== "r2") {
    const dir = opts.from;
    if (!existsSync(dir)) {
      console.error(`Source directory not found: ${dir}`);
      process.exit(1);
    }
    const names = readdirSync(dir).filter((f) => /\.(png|webp)$/i.test(f));
    return {
      describe: dir,
      list: () =>
        names
          .map((f) => basename(f, extname(f)))
          .filter((s) => !s.endsWith(CUTOUT_SUFFIX)),
      has: (stem) => names.some((f) => basename(f, extname(f)) === stem),
      read: async (stem) => {
        const hit = names.find((f) => basename(f, extname(f)) === stem);
        return readFileSync(join(dir, hit));
      },
    };
  }

  if (!opts.run) {
    console.error("--from r2 needs --run <runId>.");
    process.exit(1);
  }
  const client = createR2Client(credentialsFromEnv());
  let keys = null;
  const load = async () => (keys ??= await client.list(`illustrations/${opts.run}/`));
  return {
    describe: `r2://${client.bucket}/illustrations/${opts.run}/`,
    list: async () => {
      const all = await load();
      const ids = new Set();
      for (const k of all) {
        const m = /^illustrations\/[^/]+\/([^/]+)\/v\d+\/original\.png$/.exec(k);
        if (m) ids.add(m[1]);
      }
      return [...ids].sort();
    },
    has: async (stem) => {
      const all = await load();
      const isCutout = stem.endsWith(CUTOUT_SUFFIX);
      const id = isCutout ? stem.slice(0, -CUTOUT_SUFFIX.length) : stem;
      return all.includes(candidateKey(opts.run, id, opts.variant, isCutout ? "cutout" : "original"));
    },
    read: async (stem) => {
      const isCutout = stem.endsWith(CUTOUT_SUFFIX);
      const id = isCutout ? stem.slice(0, -CUTOUT_SUFFIX.length) : stem;
      return client.get(candidateKey(opts.run, id, opts.variant, isCutout ? "cutout" : "original"));
    },
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.ids.length && !opts.all)) return printHelp();

  const source = makeSource(opts);
  const ids = opts.all ? await source.list() : opts.ids;
  if (!ids.length) {
    console.error(`No candidates found in ${source.describe}`);
    process.exit(1);
  }

  // Each id promotes its original plus, unless suppressed, its cut-out pair.
  const stems = [];
  for (const id of ids) {
    stems.push(id);
    if (opts.cutout && (await source.has(`${id}${CUTOUT_SUFFIX}`))) {
      stems.push(`${id}${CUTOUT_SUFFIX}`);
    }
  }

  console.log(
    `Promoting ${stems.length} image(s) from ${source.describe} ` +
      `→ public/images (webp q${opts.quality})${opts.dryRun ? " [dry-run]" : ""}\n`,
  );

  if (!opts.dryRun) mkdirSync(OUT_DIR, { recursive: true });
  let promoted = 0;
  let before = 0;
  let after = 0;
  for (const stem of stems) {
    if (!(await source.has(stem))) {
      console.error(`  ✗ ${stem}: not found in source`);
      continue;
    }
    const raw = await source.read(stem);
    const webp = await toWebpSource(raw, opts.quality);
    before += raw.length;
    after += webp.length;
    const out = join(OUT_DIR, `${stem}.webp`);
    if (!opts.dryRun) writeFileSync(out, webp);
    promoted++;
    console.log(
      `  ✓ ${stem}.webp  ${(raw.length / 1e6).toFixed(2)}MB → ${(webp.length / 1e6).toFixed(2)}MB`,
    );
  }

  const saved = before - after;
  console.log(
    `\n${promoted} promoted · ${(before / 1e6).toFixed(1)}MB → ${(after / 1e6).toFixed(1)}MB ` +
      `(${saved > 0 ? (before / after).toFixed(1) : "1.0"}x smaller)`,
  );

  if (opts.dryRun) return;
  if (!opts.build) {
    console.log("Skipped build-images (--no-build); run `npm run build:images` before committing.");
    return;
  }
  console.log("\nRunning build-images…");
  execFileSync(process.execPath, [join(ROOT, "scripts", "build-images.mjs")], {
    stdio: "inherit",
  });
}

const invokedDirectly =
  process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
