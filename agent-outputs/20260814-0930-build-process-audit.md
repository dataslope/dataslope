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
| Non-production branch deploy command | `npx opennextjs-cloudflare upload` | `npx opennextjs-cloudflare upload --cacheChunkSize 100` |

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

### 5.2 Halve the R2 populate by dropping the duplicated segment data (est. −40% of 2.34 GiB)

`open-next.config.ts` already records the measurement: `segmentData` is ~40% of every cache object,
and `segmentData["/_full"]` was byte-identical to `rsc` in 40 of 40 sampled objects — so ~20% of
the bucket is a second copy of bytes stored one key over. Setting
`experimental.clientSegmentCache: false` takes the bucket to ~60% of its size, cutting the populate
upload proportionally *and* the R2 storage bill.

The repo's own note is that it is left on because the segment cache is load-bearing for prefetching
here and its interaction with `prefetchInlining: false` has not been tested on a preview deploy.
That test is the work: flip it on a branch, deploy the preview, confirm prefetching still behaves
and `check-prefetch-hints` stays green. Do not ship it untested — the last prefetch regression on
this deployment cost 7.5M requests in four days.

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
| `experimental.clientSegmentCache: false` | −40% of a 2.34 GiB upload | needs a preview test | `next.config.ts` |
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
