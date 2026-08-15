# Build Process Audit — where the 12–13 minutes go

**Date:** 2026-08-14
**Project:** DataSlope (`dataslope/dataslope`)
**Branch:** `claude/build-process-audit-9duox3`
**Trigger:** the full deploy pipeline (init → clone → install → build → deploy) takes ~12–13 minutes.

> **One change is shipped in this branch** (`build-search-corpus` parallelised, −10 s on every
> deploy). Everything else below is a measured, ranked recommendation with its tradeoff stated —
> none of it is applied. Sections marked **Dashboard** are Cloudflare build-settings changes with
> no repo diff at all.

---

## 1. The headline: there are two build times, not one

Cloudflare Workers Builds durations, taken from the `check_run` comment pairs that
`.github/workflows/cloudflare-build-pr-comments.yml` posts on every build. All seven are preview
builds on PR #662, same day, same machine class:

| Commit | Duration | What it touched |
| --- | --- | --- |
| `c05a6d7` | **12 m 04 s** | `scripts/build-charts.mjs`, `SqlCardToolsMenu.tsx`, an API route |
| `35c83ec` | **11 m 51 s** | (same PR, code) |
| `f27999c` | 10 m 33 s | failed |
| `f27999c` (retry) | **7 m 30 s** | identical tree, second attempt |
| `07a7bda` | **7 m 19 s** | |
| `f81798e` | **7 m 18 s** | |
| `080cdd1` | **7 m 09 s** | one CSS file |

The same commit built twice, ten minutes apart, took 10 m 33 s and then 7 m 30 s. That is the
Turbopack compile cache (`.next/cache`, restored by Workers Builds) doing its job — and it means
the number to optimise is not 12 minutes.

**~7 minutes is the floor**, paid by every build including a one-line CSS change. The extra
~5 minutes on top is Turbopack recompilation, and it is already cached; it is spent only when a
change genuinely invalidates a large part of the module graph. Work aimed at the 12-minute case
buys nothing on most builds. Work aimed at the 7-minute floor is paid back on all of them.

---

## 2. Measured breakdown

Measured locally on a 4-core box (Node 22.22.2), every cache cold — which is the state Workers
Builds is actually in, see §3. Reproduce with the commands in [§8](#8-reproducing-the-measurements).

### `npm ci` — 181 s

Of which ~35 s is the `postinstall` generator pass, already skipped on Workers Builds by
`scripts/postinstall-generate.mjs`. **Install proper: ~146 s.** 1,312 packages, 2.1 GB of
`node_modules`.

### `npm run build` — 183.8 s

| Step | Cold | Share |
| --- | ---: | ---: |
| `fumadocs-mdx` | 0.91 s | |
| `build-almostnode-workers` | 1.06 s | |
| `build-course-md` | 0.13 s | |
| `build-brand-fallbacks` | 0.04 s | |
| `build-charts` | 4.33 s | |
| **`build-search-corpus`** | **23.68 s** | **13%** |
| `build-search-sql` | 0.62 s | |
| `build-created-at` | 1.86 s | |
| `build-course-catalog` | 0.05 s | |
| `build-home-stats` | 0.11 s | |
| `build-images` | 0.64 s | |
| *generator chain subtotal* | *33.4 s* | *18%* |
| **`next build`** | **145.2 s** | **79%** |
| `check-prefetch-hints` | 5.18 s | 3% |

`next build` internally: **compile 37.9 s · TypeScript 28.6 s · prerender 1,082 pages 74 s**
(3 workers) · rest ~5 s.

### `npx opennextjs-cloudflare build` — 324.9 s (5 m 25 s)

This is the literal CI **Build command**. It runs `npm run build` inside itself (with
`output: standalone`, which costs more than a bare `next build`: compile 53 s, TypeScript 32.2 s,
prerender 81 s) and then bundles the Worker. **The OpenNext bundling stage is ~105 s**, by
subtraction.

### What the build produces

| Output | Size | Files |
| --- | ---: | ---: |
| `.open-next/cache` | **2.34 GiB** | **1,081** (avg 2.22 MB) |
| `.open-next/assets` | 588 MB | 4,861 |
| `.open-next/server-functions` | 93 MB | |
| **total** | **3.1 GB** | |

`.open-next/cache` is the number that matters for the deploy stage: **every deploy, production and
every preview, uploads all 1,081 objects / 2.34 GiB to R2** under a fresh build-ID prefix. Nothing
is diffed, because the prefix is new every time. Static assets are diffed by wrangler and so are
nearly free after the first deploy; the R2 populate is not.

### A real Workers Builds log (2026-08-14 18:19 UTC)

The above is a 4-core local box. This is the actual builder, from a full build log, and it settles
two things the audit had to infer:

| Stage | Duration |
| --- | ---: |
| Initialize build environment | 3 s |
| Clone repository | 39 s |
| Restore dependency + build-output caches | 28 s |
| `npm clean-install` | **2 m 02 s** |
| Build command (`opennextjs-cloudflare build`) | **5 m 52 s** |
| Deploy command (`opennextjs-cloudflare upload`) | 1 m 09 s |
| Upload to build output cache | 40 s |
| **Total** | **10 m 55 s** |

- **Build caching is enabled**, which §3 had inferred from `check-prefetch-hints.mjs` rather than
  observed: `Success: Dependencies restored from build cache.` and `Success: Build output restored
  from build cache.` It also *writes* the cache back at the end, which is the 40 s tail — a stage
  this audit had not accounted for at all.
- **A warm `.next/cache` is worth what §1 claimed.** `✓ Compiled successfully in 9.3s`, against
  37.9 s cold locally. That is the ~5-minute swing in §1, visible in one line.
- **`npm ci` is 2 m 02 s even with the dependency cache restored** — ~19% of the build, and more
  than this audit assumed for CI. The restored cache saves the downloads, not the extraction and
  linking of 1,301 packages.
- The builder runs **Node 24.18.0**, not the 22 the workflows pin.

The deploy figure is an undercount: that build populated nothing (see §5.6), so 1 m 09 s is the
upload-and-ship cost with the R2 populate missing entirely.

### Putting it together

| Stage | Local (4-core) | Notes |
| --- | ---: | --- |
| init + clone | — | not measurable here; shallow clone |
| install | ~146 s | no `postinstall` on CI |
| build (`opennextjs-cloudflare build`) | 325 s | 33 s generators + ~180 s `next build` + ~105 s bundling |
| deploy (populate R2 + upload Worker + assets) | — | 2.34 GiB / 1,081 objects, 25-way concurrency |
| **total** | **~8 min + deploy** | consistent with a 7-minute CI floor on faster hardware |

---

## 3. The finding that reframes the generator chain

`scripts/lib/build-cache.mjs` gives every expensive generator a two-tier freshness gate, and it
works: a warm local run skips the whole chain in ~2 s instead of ~48 s. AGENTS.md documents this.

**No deploy has ever hit one of those gates.**

The manifests live in `node_modules/.cache/dataslope-build/`. Workers Builds' build cache covers
`.npm` and — for Next.js — `.next/cache`. It does **not** cover `node_modules`, and `npm ci` wipes
it anyway. So the chain runs cold, in full, on every production and every preview build. The 33.4 s
cold column is the only one a deploy ever pays; the "skipped" column is a local-development
benefit only.

That is worth being explicit about because it changes what is worth optimising: making the gates
cheaper does nothing for CI, and making the *work* cheaper helps every single build.

---

## 4. Shipped in this branch

### `build-search-corpus`: 23.7 s → 13.7 s (−10 s per deploy)

The largest generator, and 71% of the chain. It parses ~889 lessons through remark; every lesson is
independent. It now fans out across `availableParallelism() - 1` worker threads (capped at 8),
staying single-threaded below 64 lessons where worker startup would not pay for itself.

Three things worth knowing about the implementation:

- The file is **its own worker script** (`new Worker(import.meta.url)`), so the freshness gate's
  input list is unchanged. A sibling worker module would be a second input to remember, and
  forgetting it would mean a change to the extraction never invalidating the corpus.
- Lessons are striped **round-robin**, not sliced contiguously: they are walked in directory order
  and a course's lessons resemble each other in size, so contiguous chunks hand one thread a long
  course and another a short one.
- Workers return **finished JSON fragments**, one string per lesson, reassembled by original index.
  Returning row objects would pay a structured clone of ~24 MB of text and then re-serialise all of
  it. It also keeps the output byte-identical, which is load-bearing downstream: `seed-search.mjs`
  gates the D1 re-seed on a content hash of exactly these bytes, and a reordered corpus would
  re-seed the search index on every deploy for nothing.

Verified: corpus sha256 identical to the serial build (24,749,399 bytes, 21,190 rows), 1,387 unit
tests pass, eslint clean. On a build machine with more cores the gain is larger — this was measured
with 3 threads.

---

## 5. Recommended next, ranked by payoff per unit of risk

### 5.1 **Dashboard** — raise the R2 populate concurrency ✅ *documented, needs the dashboard edit*

The deploy step writes 1,081 objects / 2.34 GiB through a helper Worker, **one HTTP POST per
object, 25 in flight** (`cacheChunkSize ?? 25`, `populate-cache.js:199`). That default is not tuned
for a cache this size. Both CI commands accept the flag:

| Field | From | To |
| --- | --- | --- |
| Deploy command | `npx opennextjs-cloudflare deploy && npm run db:seed:search:remote` | `npx opennextjs-cloudflare deploy --cacheChunkSize 100 && npm run db:seed:search:remote` |
| Version command (non-production branch deploy) | `npx opennextjs-cloudflare upload` | `npx opennextjs-cloudflare upload --cacheChunkSize 100` |

There is also `--rclone`, which swaps the per-object POSTs for an rclone sync against R2's S3
endpoint; it needs the optional `rclone.js` peer dependency. Try `--cacheChunkSize` first — it is a
one-word change and instantly revertible.

**Verified (2026-08-14).** Four things, so the dashboard edit can be made without a leap of faith:

1. The flag is declared on **both** `deploy` and `upload` (both use `withPopulateCacheOptions`),
   confirmed against `--help` on each.
2. It parses to the *number* `100` in both `--cacheChunkSize 100` and `--cacheChunkSize=100` form,
   and — the failure mode that would actually break a deploy — it is **consumed by OpenNext's
   parser and never forwarded to `wrangler`**. `getWranglerArgs` only passes through *unrecognised*
   flags, and a genuine wrangler flag next to it (`--dry-run`) still passes through correctly.
3. It reaches `maxConcurrency` in `sendEntriesToR2Worker` — the *same* function the remote populate
   uses. Local and remote differ only by `dev: { remote }`.
4. Run end to end against the local target, from an identical empty store each time:

   | `--cacheChunkSize` | wall time | entries | retried | failed |
   | --- | ---: | ---: | ---: | ---: |
   | 25 (default) | 179.2 s | 1,081 | 46 | 0 |
   | 100 | **81.0 s** | 1,081 | **11** | 0 |

   The retry column is what matters. The risk of raising concurrency was that the helper Worker
   would start shedding load and the retry/backoff path would eat the gain; instead 4× the
   concurrency produced *fewer* retries, and neither run lost an entry.

**The wall-time column does not transfer.** That run is disk-bound (miniflare's on-disk R2), not
network-bound — local throughput *fell* from 12.9 to 7.1 objects/s as the store grew, which is the
local store's behaviour, not the deploy's. Treat the 2.2× as evidence the machinery scales, not as
a prediction. The real number is the deploy stage's wall time in the Cloudflare build log; the next
push to a PR measures the preview (`upload`) path directly.

### 5.2 The segment-cache flag ❌ *attempted; it does not exist. Compression is the real lever.*

The plan was `experimental.clientSegmentCache: false`, which `open-next.config.ts` and the
2026-08-14 retention handoff both described as taking the bucket to ~60% of its size, pending a
preview test of its interaction with `prefetchInlining: false`.

**There is no such option on Next 16.3.0.** The build fails outright:

```
⚠ Invalid next.config.ts options detected:
⚠     Unrecognized key(s) in object: 'clientSegmentCache' at "experimental"
next.config.ts(154,5): error TS2353: … 'clientSegmentCache' does not exist in type 'ExperimentalConfig'.
```

The name appears nowhere in `next/dist` except inside source maps, and `app-render.js` guards
`collectSegmentData(...)` on nothing but `renderOpts.isBuildTimePrerendering` — so `segmentData` is
emitted on every prerender with no flag to stop it. The prefetch-interaction question that was
holding this back was never the blocker; the option was.

**The measurement held up and got sharper.** Over all 1,081 objects rather than 40
(`node scripts/analyze-cache.mjs`, added in this branch):

| Field | Size | Share |
| --- | ---: | ---: |
| `html` | 0.731 GiB | 31.2% |
| `rsc` | 0.477 GiB | 20.4% |
| **`segmentData`** | **1.003 GiB** | **42.8%** |
| — of which `/_full` | 0.477 GiB | 20.4% |

`/_full` is byte-identical to `rsc` in **1,045 of 1,045** objects.

**And the bigger prize was hiding behind it.** These objects go to R2 *uncompressed*, and they are
repetitive JSON (`--compress`, sampled over 121 of 1,081):

| Codec | Share of raw | Ratio | 2.340 GiB becomes |
| --- | ---: | ---: | ---: |
| gzip -6 | 18.6% | 5.4× | ~0.44 GiB |
| brotli q5 | 5.9% | **17.0×** | **~0.14 GiB** |

Compressing cache values in a custom `incrementalCache` override — `open-next.config.ts` already
wraps one with `withRegionalCache` — **subsumes this entire item**, because a byte-identical
duplicate of `rsc` is precisely what a compressor erases. It would cut the per-deploy populate and
the per-retained-build storage by the same factor, and unlike the segment cache it is a lever this
repo actually holds.

The work is the read side: whatever writes compressed must decompress in the Worker, and
`enableCacheInterception` means the routing layer reads these too. That is a real design task, not
a flag — which is why it is written up rather than attempted here.

**Shipped from this attempt anyway:**

- `scripts/analyze-cache.mjs`, so the composition and compression claims are one command rather
  than a paragraph anyone has to trust.
- `check-prefetch-hints.mjs` now **fails on a scan of fewer than 100 files** instead of reporting
  "0 prerendered file(s) clean". Its filter is `.rsc` *or* `.segments`, so anything that changes
  the emitted payload shape silently shrinks its coverage — the exact failure mode a guard against
  a silent regression must not have.
- The wrong claim is corrected in `open-next.config.ts` and struck through in the retention
  handoff, so the next person does not spend the same afternoon on it.

### 5.3 Move the TypeScript check off the deploy critical path ✅ *half done — the gate exists*

`next build` spends **28.6 s** (32.2 s under OpenNext) on TypeScript, on the critical path of every
deploy. There was **no typecheck, lint or test workflow in `.github/workflows/` at all** — the
deploy build was the only gate on the app itself.

`.github/workflows/checks.yml` now runs `next typegen` → `tsc --noEmit` → `npm run lint` →
`npm test` on every PR and every push to `main`, in parallel with the deploy. **First run: green in
2 m 37 s** — checkout 15 s, setup-node 8 s, `npm ci` 54 s, typegen 2 s, tsc 20 s, lint 39 s, vitest
13 s. (The runner is roughly twice this audit's 4-core box on every step; the local figures were
typegen 12 s, tsc 41.5 s, lint 65 s, vitest 26 s.)

One job rather than three: three would each re-pay the ~77 s of checkout + setup + install to
overlap 72 s of checks — about 40 s of wall clock for 3× the runner minutes. The whole job fits
comfortably inside the Cloudflare build it runs beside, so it is never what a merge waits on.

**The gate found a real error the moment it existed.** `npm run lint` was exiting 1 on `main`:
`app/_components/Playground.tsx:884` trips `react-hooks/immutability`. Nothing had ever caught it
because Next 16 does not run ESLint during `next build` — the integration and `next lint` are both
gone — so `npm run lint` only ran when someone typed it. The pattern flagged is legitimate (a ref
mirroring state so six dependency-free callbacks can read the current tab list synchronously); the
rule cannot see that the setter is never reachable from render. It carries a narrow
`eslint-disable-next-line` with that reasoning written down, rather than a rewrite that would put
`openTabIds` into six dependency arrays.

Lint fails the job on **errors** only. The ~156 pre-existing warnings do not fail it; `--max-warnings 0`
is the right next step once that backlog is cleared, and would make the job permanently red today.

**What is left is the deliberate part.** Once `checks` is *required* in branch protection,
`typescript: { ignoreBuildErrors: true }` in `next.config.ts` takes ~29 s off every build. Do not
make that change before then: a type error would reach `main` with a green deploy and nothing to
say so.

### 5.4 Make the generator cache survive CI (up to −33 s, needs care)

Per §3 the whole chain runs cold every build. `.next/cache` **is** restored by Workers Builds, so
moving `build-cache.mjs`'s manifests *and* the generated outputs under `.next/cache/dataslope-build/`
would let the gates fire on CI for the first time — most deploys touch no lesson, and would skip
~23 s (or ~13 s after §4) of corpus work plus the rest of the chain.

The risk is specific and this repo has already been burned by it: `check-prefetch-hints.mjs` exists
because **a corrupt Workers Builds cache restore** shipped a build that looped RSC prefetches at
~150 req/s per tab. Putting more build state into that same restored cache widens that surface. If
this is done, the manifest must also record a content hash of each *output* and verify it on
restore, so a corrupt restore regenerates instead of being trusted. That is the design work; the
move itself is trivial.

### 5.5 Not worth doing — checked and rejected

- **Trimming build-irrelevant devDependencies.** `@duckdb/duckdb-wasm` (149 MB), `vitest` (36 MB),
  `playwright` + `@playwright/test`, `eslint` are ~250 MB of `node_modules` that `npm run build`
  never loads — DuckDB is only used by `scripts/lib/sql-engines.mjs` in the content sweeps, and the
  app fetches it from jsDelivr. But Workers Builds has **no install-command or `NPM_FLAGS`
  override** — the [configuration docs](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
  expose only build command, deploy command, root directory and build variables. There is no way to
  make CI install a subset, so the only route would be moving packages out of `devDependencies`
  entirely, which breaks local test/lint. Dropped.
- **Playwright browser downloads at install.** Not a factor: `playwright@1.62` ships no install
  script, so `npm ci` downloads no browsers.
- **Running the independent generators concurrently.** `fumadocs-mdx`, `almostnode-workers`,
  `course-md`, `brand-fallbacks`, `course-catalog` and `home-stats` are mutually independent and
  could run in parallel with `charts`. Total saving ~2 s, against a new orchestrator, interleaved
  log output, and a `created-at`/`images` ordering hazard (both touch `public/images/`). Not worth
  it.
- **More `next build` prerender workers.** Next already uses `cpus - 1`; the 1,082 pages are all
  genuinely needed. Nothing to reclaim.

---

## 6. What is already well optimised

Worth recording so nobody re-does it:

- `postinstall-generate.mjs` skips the generator pass on Workers Builds, where `npm run build`
  re-runs it anyway — that is tens of seconds per deploy already saved.
- `build-images` caches per-slug and commits its outputs, so a deploy re-encodes nothing (2,774
  images, 0 encoded).
- The `.md` lesson mirrors are emitted as static assets by `build-course-md` rather than as
  `force-static` route handlers, which keeps ~780 prerenders out of `next build` and ~780 objects
  out of the R2 populate.
- `db:seed:search:remote` no-ops when no indexed content changed, so most deploys skip it.
- `outputFileTracingExcludes` keeps `cdn-assets/` (3 MB `dotnet.native.wasm`) out of the traced
  server output.

---

## 7. Summary

| Action | Saving | Risk | Where |
| --- | --- | --- | --- |
| Parallelise `build-search-corpus` | −10 s | none (byte-identical, tested) | **shipped here** |
| `--cacheChunkSize 100` on both deploy commands | 2.2× on the local path; remote TBD | none found — fewer retries, no lost entries | **README updated; needs the dashboard edit** |
| ~~`experimental.clientSegmentCache: false`~~ | — | **not a Next 16.3.0 option; build fails** | ❌ |
| Compress cache values (gzip 5.4× / brotli 17.0×) | 2.34 GiB → 0.14–0.44 GiB per deploy | read side must decompress in the Worker | `open-next.config.ts` |
| Typecheck/lint/test in Actions | 0 s directly — it is the prerequisite | none (pure addition) | **shipped: `checks.yml`** |
| …then `ignoreBuildErrors: true` | −29 s | ships type errors to `main` | needs `checks` required first |
| Generator cache under `.next/cache` | up to −33 s | corrupt-restore surface | `build-cache.mjs` |

The floor is ~7 minutes and roughly half of it is `next build` compiling and prerendering 1,082
pages, which is irreducible work. The compressible parts are the generator chain (33 s), the
TypeScript pass (29 s), and the deploy-side R2 populate (2.34 GiB at 25-way concurrency) — and of
those three the populate is both the largest and the cheapest to try.

---

## 8. Reproducing the measurements

```bash
# install, timed (subtract ~35 s of postinstall generation for the CI equivalent)
time npm ci

# per-step generator timings, cold — clear what CI does not have
rm -rf node_modules/.cache/dataslope-build .next .open-next public/courses public/_gen .source
rm -f lib/generated/{search-corpus.json,search-seed.sql,brand-fallbacks.js,\
course-catalog.js,home-stats.js,charts.js,chart-slugs.js,created-at.js}
for s in build-almostnode-workers build-course-md build-brand-fallbacks build-charts \
         build-search-corpus build-search-sql build-created-at build-course-catalog \
         build-home-stats build-images; do
  /usr/bin/env time -f "$s %e s" node scripts/$s.mjs >/dev/null
done

# the literal CI build command, end to end
time npx opennextjs-cloudflare build

# what gets uploaded to R2 on every deploy
find .open-next/cache -type f -printf '%s\n' |
  awk '{s+=$1; n++} END {printf "objects=%d total=%.2f GiB avg=%.2f MB\n", n, s/1073741824, s/n/1048576}'

# real CI durations: pair the 🏗️/✅ comment timestamps on any recent PR
```

---

## 5.6 The bug this work shipped, and how it was caught

The brotli override was written with its own `name`:

```ts
export const NAME = "ds-brotli-r2-incremental-cache";
```

which reads like a label and is not one. `populateCache` in `@opennextjs/cloudflare` dispatches on
it:

```js
switch (await resolveCacheName(incrementalCache)) {
  case R2_CACHE_NAME:  await populateR2IncrementalCache(...); break;
  case KV_CACHE_NAME:  ...
  default:             logger.info("Incremental cache does not need populating");
}
```

and `withRegionalCache` forwards the inner store's name (`this.name = this.store.name`), so that
switch sees this class's name. A distinct name does not rename the cache — **it silently turns the
deploy-time populate off.**

Nothing failed. The build was green, the deploy succeeded, and the only trace was one line:

```
Incremental cache does not need populating
```

The Worker shipped with an empty incremental cache, which on this deployment 500s the home page and
every `/courses/*` lesson, because a miss falls through to a re-render that touches `node:fs` in
workerd. It was caught by a human reading the build log and asking whether that line was expected.

**Fixed** by taking the name from upstream — `export const NAME = R2_CACHE_NAME` — which is also
the honest description of the class: the same R2 cache, same bucket, same keys, differing only in
how values are encoded. Verified by rebuilding and watching the line change to `Populating local R2
incremental cache... Successfully populated cache with 1081 entries`, and pinned by a test that
asserts the name against the upstream constant so an upstream rename fails in CI rather than in a
deploy.

**The lesson worth keeping.** The local test suite could not have caught this: it tests the cache's
*behaviour*, and the behaviour was correct. What broke was a build-tool contract expressed as a
string match, exercised only by a real deploy. Two things follow — the preview deploy is not
optional for changes to this path (§5.2 said so about prefetching and it was just as true here),
and anything that reads "does not need doing" in a build log deserves the same question that caught
this one.

---

## 5.7 The admin chart gallery: measured, and deliberately left alone

`/dashboard/admin/charts/*` is **80 of the 1,081 prerendered routes** — 20 slices × 4 orderings
(`PER_PAGE = 20`, 383 charts, `ORDERINGS = alpha | newest | oldest | course`) — and it looked like
the biggest structural target on the list:

| Route group | Objects | Raw | Share | Avg |
| --- | ---: | ---: | ---: | ---: |
| courses | 835 | 1,971 MiB | 82.2% | 2.36 MiB |
| **dashboard/admin/charts** | **80** | **292 MiB** | **12.2%** | **3.65 MiB** |
| other | 84 | 96 MiB | 4.0% | 1.14 MiB |
| fumadocs-dev + llms | 68 | 33 MiB | 1.4% | 0.48 MiB |
| dashboard (other) | 14 | 5 MiB | 0.2% | 0.35 MiB |

12.2% of the cache, at a *higher* average than a lesson, for internal noindex tooling. Two things
also turned out to be true of it: every page carries all **383** chart slugs (not its own 20 — the
`ChartReviewSummary slugs={ALL.map(…)}` prop), and each chart's SVG is inlined **twice**, once per
theme pane. The second is the page's whole purpose (a figure is judged against both themes), so it
is not waste.

**And then compression made the question moot.** As actually shipped:

| Route group | Objects | Compressed | Share |
| --- | ---: | ---: | ---: |
| courses | 835 | 123.9 MiB | 89.8% |
| dashboard/admin/charts | 80 | **7.8 MiB** | 5.7% |
| other | 166 | 6.2 MiB | 4.5% |
| **total** | | **137.9 MiB** | |

292 MiB → **7.8 MiB**. Dropping three of the four orderings would save ~5.9 MiB of upload and about
4 s of prerender, and would cost removing `export const dynamic = "force-static"` from the route —
because with it, any ordering absent from `generateStaticParams` 404s rather than rendering on
demand. (An on-demand render would in fact work: `loadChartSvg` goes through `readPublicAsset`,
which is the filesystem at build time and the **ASSETS binding** at request time, so this page has
no `node:fs` dependency. The blocker is `force-static`, not safety.)

**Left alone.** Trading a deliberate `force-static` declaration on an admin route for ~6 MiB is not
a good trade, and the honest reason it is not worth doing is that §5.5's compression already took
it. Recorded here so the 12.2% figure does not tempt anyone back — check the compressed column
first.

**The route-count trap, worth remembering.** `fumadocs-dev` + its `llms` mirrors are 68 routes, 6%
of the prerender count, which is what flagged them in the first place — and 1.4% of the bytes. Route
count is a bad proxy for cost here; pages differ by 10× in size.

---

## 5.8 Install: `NPM_CONFIG_OMIT=dev` ✅ *shipped, needs the build variable*

`npm ci` is **2 m 02 s of the 10 m 55 s build** (~19%) even with Workers Builds' dependency cache
restored — that cache saves downloads, not the extraction and linking of 1,301 packages.

§5.5 recorded this as impossible: Workers Builds exposes no install command and no `NPM_FLAGS`.
**That was too strong.** It does expose **build variables**, and npm reads `NPM_CONFIG_*` from the
environment, so `NPM_CONFIG_OMIT=dev` reaches its `npm clean-install` — and applies to CI only,
never to a local checkout.

Everything the build or deploy loads moved to `dependencies`; `devDependencies` now holds only what
CI never runs (`@duckdb/duckdb-wasm` 149 MB, `vitest`, `playwright`, `@playwright/test`, `eslint`,
`eslint-config-next`, `@resvg/resvg-js`, `esbuild-wasm`, `web-worker`). Several of the moved
packages — `typescript`, `sharp`, `pyodide`, `remark-mdx`, `@cloudflare/workers-types` — are
imported by `app/` and `lib/` source and were mis-filed to begin with.

**Measured: 98 s → 62 s** (−37%), `node_modules` 2.1 GB → 1.9 GB, full build green afterwards.

**`NPM_CONFIG_OMIT=optional` is the trap, and it was tried first.** It looked cleaner — move only
the nine unwanted packages to `optionalDependencies` and leave the other classifications alone —
and it installs faster still (55 s). It also breaks the build: npm ships platform-specific native
binaries *as* optional dependencies, so omitting them strips native bindings out of unrelated
packages and the build dies with `Cannot find native binding` on `@ast-grep/napi`. `--omit=dev`
leaves optional dependencies alone, which is why it is the one that works.

Forgetting the variable is safe: CI installs everything and takes the extra ~40 s, which is today's
behaviour.

---

## 5.9 `compress-cache` threaded: 27.0 s → 9.8 s

The compression §5.5 added was single-threaded, and it is time added to *every*
build — the one cost this work introduced rather than removed. Brotli is
CPU-bound and every entry is independent, so it now fans out the same way
`build-search-corpus` does: `availableParallelism() - 1` threads capped at 8,
single-threaded below 64 entries, entries striped round-robin so one thread does
not get a run of 3 MB lessons while another gets a run of small ones.

**27.0 s → 9.8 s on 3 threads (2.8×)**, identical output (2.340 GiB → 0.135 GiB,
17.4×), still idempotent (0.1 s on a second run), all 1,081 entries verified to
decode back to valid JSON, and the empty-scan guard still exits 1.

The round-trip check stays *inside* the threaded path, per entry, before the
file is replaced. It is a fraction of the compression cost and it is the only
thing standing between a bad encode and a cache entry the Worker cannot serve.
A throw in any thread fails the whole run; the entries other threads already
rewrote are harmless, because a re-run skips anything already carrying the
magic prefix.

---

## 6.1 What the builder's own log says is left

With the production log (§2) the remaining headroom is no longer a guess. The
build command's 5 m 52 s breaks down as: generators ~45 s, compile **9.3 s**
(warm), TypeScript **17.0 s**, page data + prerender **~166 s** (114 s of it
prerender), OpenNext bundling **~112 s**.

Two of those are settled and should not be revisited:

- **Prerender parallelism is maxed.** The log reads `Generating static pages
  using 3 workers`, so the builder is 4-core and Next already uses `cpus - 1`.
  There is no `experimental.cpus` win available.
- **Bundling (~112 s) has no safe lever.** `--noMinify` would cut it and would
  also blow the 10 MiB gzipped Worker ceiling this repo actively manages.

And one number in this document was wrong: **TypeScript is 17.0 s on the
builder**, not the ~29 s measured locally, so `ignoreBuildErrors` (§5.3) is
worth 17 s rather than 29.

Realistic remaining headroom, against a 655 s build:

| Item | Saving | Blocked on |
| --- | ---: | --- |
| Generator cache under `.next/cache` (§5.4) | ~35 s on content-unchanged deploys | output-hash design |
| `ignoreBuildErrors` (§5.3) | 17 s | `checks` required in branch protection |

Everything else measured is either irreducible (prerender is content-proportional
and already parallel) or a bad trade (bundling, the admin gallery in §5.7, the
~70 MB of `cdn-assets`/`tools-jar`/`brand-assets` in the 39 s clone).

**The one stage still unmeasured is the deploy.** The 1 m 09 s in §2 had no
populate at all. Post-merge it will have populate restored, entries 17× smaller,
and `--cacheChunkSize 100` — three changes at once, in the stage nobody has a
clean baseline for. Measure it on the first green build before drawing any
conclusion about which of the three did what.

---

## 5.10 The first post-merge build, and two things it corrected

Production build `73f7afdf`, 2026-08-15 01:58 UTC — the first with everything on:
**12 m 03 s**, against the 10 m 55 s baseline in §2. Slower, and worth reading carefully before
concluding anything from it.

| Stage | §2 baseline | This build | Δ |
| --- | ---: | ---: | ---: |
| init + clone + cache restore | 70 s | 55 s | −15 s |
| `npm ci` | 2 m 02 s | 2 m 14 s | +12 s |
| **build command** | **5 m 52 s** | **7 m 25 s** | **+1 m 33 s** |
| deploy | 1 m 09 s | 1 m 12 s | +3 s |
| build-cache upload | 40 s | 14 s | −26 s |

Inside the build command: compile **9.3 s → 22.5 s**, TypeScript **17.0 s → 58 s**, prerender
~2 m 46 s → ~2 m 55 s, bundling ~1 m 52 s → ~1 m 42 s, plus `compress-cache` at **38.9 s**.

**+54 s of the +68 s is compile and TypeScript, and neither is a regression.** #667 changed **552
files**, which invalidates most of the Turbopack cache and TypeScript's incremental state. The
build cache restored fine (`Build output restored from build cache`) — restoring is not the same as
being *valid* for 552 changed files. This is the one-off the §2 note warned about; the next build
should return to ~9 s and ~17 s.

### The deploy side worked

```
02:09:37  Populating remote R2 incremental cache...
02:09:52  Successfully populated cache with 1081 entries
```

**15 s for 1,081 objects.** `NPM_CONFIG_OMIT=dev` is live too — `added 997 packages` against 1,301.

### Correction: the local `compress-cache` measurement was 4× optimistic

§5.9 reported 9.8 s from a 4-core local box. The runner, on the same 3 threads, took **38.9 s**.
Same core count, ~4× the time — the runner's per-core throughput and I/O are simply slower, and
nothing about the local figure predicted it. **Do not size a build step from this box again without
saying which machine the number came from.**

That mattered, because 39 s of build time was buying a populate that finishes in 15 s. Two changes,
both measured over 121 real entries:

| | ratio | time (sample) |
| --- | ---: | ---: |
| q3 | 12.2× | 1.1 s |
| **q4** | **16.4×** | **1.2 s** |
| q5 (shipped) | 17.9× | 2.1 s |
| q6 | 18.7× | 2.4 s |

q4 is ~43% less CPU than q5 for 8% less compression, and below it the ratio falls off a cliff for
no further saving. Paired with using *all* cores rather than `- 1` (this is the last step of the
build; the main thread only awaits), the local run went **9.8 s → 3.8 s**, which scales to roughly
**15 s on the runner**. Upload goes 0.135 → 0.147 GiB, which is noise.

### What is still not known

Whether the populate is request-bound or bandwidth-bound. 1,081 objects in 15 s is ~72 objects/s
and ~9 MB/s, which *looks* like per-request overhead dominating — but there has never been an
uncompressed populate at `--cacheChunkSize 100` to compare against, so the honest answer is that
compression's effect on deploy *duration* is unmeasured. Its effect on **storage** is not in doubt:
2.34 GiB → 0.147 GiB per retained build, against a bucket that holds production plus up to ten
branch previews.


---

## 5.11 The open question, answered by a build that forgot the compress step

§5.10 recorded that compression's effect on deploy *duration* was unmeasured: there had never been
an uncompressed populate at `--cacheChunkSize 100` to compare against, and 1,081 objects in 15 s
looked like per-request overhead dominating.

Preview build `be267174` (2026-08-15 02:33) supplied it by accident. Its build command was still
`npx opennextjs-cloudflare build` — step 4 of the runbook had not been applied — so nothing
compressed and the populate shipped the full 2.34 GiB **at chunk size 100**:

| Populate, `--cacheChunkSize 100` | Bytes | Time |
| --- | ---: | ---: |
| Uncompressed (`be267174`) | 2.34 GiB | **41.5 s** |
| Compressed (`fa46623c`) | 0.135 GiB | **14.7 s** |

**The populate is not purely request-bound.** 17× fewer bytes buys ~27 s, on an identical object
count and identical concurrency — so roughly two thirds of that stage is bytes and one third is
per-request overhead. Compression is worth **−27 s of deploy time**, against `compress-cache`
costing ~15 s at q4. Net **~−12 s on the build**, before counting the 17× off R2 storage for every
retained build, which was always the larger prize.

Note what that means about the q5 → q4 retune in §5.10: at q5's 38.9 s the whole thing was net
*negative* on build duration (−27 s of populate for +39 s of compression). The retune is what makes
it pay for itself, and neither number was knowable without both of these logs.

### The rest of that build, for the record

**9 m 42 s total**, against the 10 m 55 s baseline in §2 — and 12 m 03 s in §5.10.

| Stage | §2 | §5.10 | `be267174` |
| --- | ---: | ---: | ---: |
| init + clone + restore | 70 s | 55 s | 61 s |
| `npm ci` | 2 m 02 s | 2 m 14 s | **1 m 53 s** |
| build command | 5 m 52 s | 7 m 25 s | **4 m 52 s** |
| deploy | 1 m 09 s | 1 m 12 s | 1 m 36 s |
| build-cache upload | 40 s | 14 s | 18 s |
| **total** | **10 m 55 s** | **12 m 03 s** | **9 m 42 s** |

Compile **7.5 s** and TypeScript **12.5 s**, against 22.5 s and 58 s the build before — which
settles §5.10's claim that the spike was #667's 552-file churn invalidating the incremental caches,
not a regression. `added 997 packages` confirms `NPM_CONFIG_OMIT=dev` is live.

The generator chain was still 38.7 s, with the corpus taking 19.7 s: this was the first build
carrying `persist: true`, so the store was empty in the restored `.next/cache` and the corpus
generated and populated it. The build after this one is the one that should read
`[search-corpus] up to date … skipping`.
