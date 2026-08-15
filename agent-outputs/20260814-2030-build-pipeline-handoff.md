# Build Pipeline Optimisation — Agent Handoff

**Date:** 2026-08-14
**Project:** DataSlope (`dataslope/dataslope`)
**Branch:** `claude/build-process-audit-9duox3` → PR **#665**, **merged 2026-08-15** as `8135ed0f`
**State at:** `8135ed0f` on `main`
**Trigger:** the full deploy pipeline (init → clone → install → build → deploy) took ~12–13 minutes.
**Investigation record:** [`20260814-0930-build-process-audit.md`](20260814-0930-build-process-audit.md) — every number below is derived there.

> **You are the operator.** PR #665 is **merged and live**. Steps 1–3 of the runbook are done and
> verified in production (see [Where this stands](#where-this-stands)). What remains is **step 4**,
> the one order-dependent dashboard edit, which is now safe to make.

---

## TL;DR

| | |
| --- | --- |
| **Shipped in the branch** | corpus build −10 s · install −37 % · R2 upload 2.340 GiB → 0.135 GiB · a typecheck/lint/test gate that did not exist |
| **Needs you** | 4 Cloudflare dashboard fields, in the order below. No GitHub config required. |
| **One landmine** | add `compress-cache` to the **build command only after** the Worker is deployed |
| **Still open** | generator cache (~35 s), and one stage nobody has a baseline for |

The headline finding is that **there was never one build time.** A commit touching one CSS file
built in 7 m 09 s; the same commit rebuilt after a cache miss took 10 m 33 s then 7 m 30 s. ~7
minutes is the floor every build pays; the rest is Turbopack recompiling, and that is already
cached. Work aimed at the floor pays back on every build — that is what this branch targets.

---

## Where this stands

Merged as `8135ed0f` and **verified live on 2026-08-15**:

| Check | Result |
| --- | --- |
| `main` carries the reader, `compress-cache`, `edgeExternals`, reclassified `package.json` | ✅ |
| `export const NAME = R2_CACHE_NAME` (the populate fix) | ✅ |
| Production is serving the merge commit | ✅ `/api/cache-build-id` → `8135ed0f919b…` |
| **The populate ran** | ✅ `/`, `/courses`, `/courses/*` lessons, `/interview-prep` all 200 |

That last row is the one that mattered: a `/courses/*` page can only return 200 if the incremental
cache was populated, because an empty cache means a re-render and a re-render touches `node:fs` in
workerd. The `51400985` bug is fixed in production, not just locally.

The live Worker is currently reading **uncompressed** entries through the raw-JSON fallback, since
the build command has not been changed yet. That is the fallback doing its job, and incidental
proof that path works.

**Still to do: step 4 only** — add `&& node scripts/compress-cache.mjs` to the build command. The
merged code is on `main`, so it is safe now.

### The 10 commits, as squashed

CI green (`checks` passed on its first run at 2 m 37 s).

| Commit | What |
| --- | --- |
| `ba3e6b08` | Parallelise `build-search-corpus`, 23.7 s → 13.7 s |
| `775bad4f` | The audit document |
| `4b51836e` | `--cacheChunkSize 100` (README + `cf:deploy`) |
| `a97f0258` | `.github/workflows/checks.yml`, + the lint error it found on `main` |
| `7336a248` | Correct that workflow's timings to the runner's |
| `b2b446e1` | The segment-cache flag does not exist; compression is the real lever |
| `0f005dd1` | Brotli-compress the R2 incremental cache |
| `51400985` | **Fix:** the override had silently disabled the deploy-time populate |
| `41ec5714` | `NPM_CONFIG_OMIT=dev`; measure the admin gallery rather than trim it |
| `92122ef7` | Thread `compress-cache`, 27.0 s → 9.8 s |

Verified: **1,396 tests** (104 files), `tsc --noEmit` clean, `eslint` 0 errors, full
`npx opennextjs-cloudflare build` green end to end, all 1,081 compressed cache entries confirmed to
decode back to valid JSON.

---

## Merge runbook

### 1. Merge PR #665

Nothing below works before this. The Worker must be *deployed* with the brotli reader before the
build command starts producing brotli bytes.

### 2. Branch ruleset on `main` — **optional, and unrelated to the build**

Nothing in this branch needs one. It is listed here only because an earlier draft of this runbook
asked for one, and the reason it did has since been retired: a ruleset was only ever the
prerequisite for `ignoreBuildErrors` (step 5), which is no longer recommended. Every measured
saving in this branch is independent of branch protection. **Skipping this step costs nothing.**

If you want it anyway, it is generic repo safety rather than build tooling: Settings → Rules →
Rulesets → New branch ruleset, target the default branch, enforcement **Active**, tick **Restrict
deletions** and **Block force pushes**. Those are policies rather than checks, and the bot workflows
below do ordinary pushes, so nothing conflicts. Leave **Require status checks to pass** OFF, and
leave **Require a pull request before merging** off too.

**Why not require the check, even though this branch adds the repo's only one.** That rule gates *ref
updates*, not merges — GitHub's own wording is "commits must first be pushed to another ref where
the checks pass". Four workflows push generated content straight to `main` with `GITHUB_TOKEN`
(`block-outputs`, `react-bundles`, `refresh-created-at`, `optimize-images`), and none of their
commits can satisfy that. They would retry three times and `exit 1`.

There is no clean bypass either: **GitHub Actions is not an installable App**, so it does not appear
in the ruleset bypass list at all. The only entries that would cover those pushes are the `Write`
role — which also exempts every human, making the gate meaningless — or switching the four
workflows to push via a **deploy key**, which *is* bypassable.

So the gate is deliberately soft: `checks.yml` runs on every PR and every push to `main` and reports
in ~2 m 37 s, but does not block the merge button. It has already earned its place by catching a
lint error sitting on `main` that nothing else was looking for (Next 16 runs no ESLint during
`next build`). Blocking the merge button is the last 10% of the value and it costs four working
workflows.

### 3. Dashboard — Workers → `dataslope` → Settings → Build

| Field | Value |
| --- | --- |
| Deploy command | `npx opennextjs-cloudflare deploy --cacheChunkSize 100 && npm run db:seed:search:remote` |
| Version command *(labelled thus in the dashboard; it is the non-production branch deploy)* | `npx opennextjs-cloudflare upload --cacheChunkSize 100` |
| Build variable | `NPM_CONFIG_OMIT` = `dev` |

All three are safe in any order and independently revertible.

### 4. Only once a deploy has shipped the new Worker — the build command

| Field | Value |
| --- | --- |
| Build command | `npx opennextjs-cloudflare build && node scripts/compress-cache.mjs` |

**This is the order-dependent one.** The two failure directions are not symmetric:

- Worker deployed, build command *not* updated → **safe.** Entries stay uncompressed and the
  reader's raw-JSON fallback serves them. The cache is merely as large as it used to be. This
  fallback exists precisely so this step cannot be got wrong in this direction.
- Build command updated while `main` lacks the reader → **breaks.** Compressed bytes, no decoder,
  every page a 500.

**Why build-ID scoping makes this narrower than it looks.** Keys are
`incremental-cache/<buildId>/…` and the build ID is the deployed commit SHA (`generateBuildId` in
next.config.ts), so a Worker only ever reads the prefix its own build wrote. The live Worker cannot
meet a newer build's objects, which means there is no bad window during a deploy and no need to
stagger these carefully — the rule is simply *not before the merged code is on `main`*. Waiting for
one deploy to land first, as this step says, is belt-and-braces rather than load-bearing.

**The same rule in reverse, for rollback.** If the Worker code is ever reverted, revert the build
command first or in the same step. A reverted Worker builds a fresh prefix, the build command
compresses it, and the old reader cannot decode its own cache — the same failure from the other
direction.

### 5. `ignoreBuildErrors` — **not recommended**, see step 2

`typescript: { ignoreBuildErrors: true }` takes **17 s** off every build, and the plan was to take
it once `checks` was required. Step 2 explains why requiring `checks` costs four working workflows
or a deploy-key migration.

17 s on a ~10-minute build is ~2.6%. It is not worth buying a soft gate's worth of safety with that,
so TypeScript stays in `next build`, where it already blocks a bad deploy. Revisit only if the four
generated-content workflows move to deploy-key pushes for some other reason — at which point
requiring `checks` becomes free and this follows from it.

---

## Verify after the first green build

1. **The populate ran.** The deploy log must say `Populating remote R2 incremental cache…` and
   `Successfully populated cache with N entries`. If it says **`Incremental cache does not need
   populating`**, stop — that is the exact failure in `51400985` and it ships an empty cache, which
   500s the home page and every lesson.
2. **A lesson renders.** Open any `/courses/*` page on the preview URL. This is the end-to-end proof
   the compressed read path works in a real Worker — see [Not verified](#what-is-not-verified).
3. **Time the deploy stage.** See below; it is the one number nobody has.

---

## What is *not* verified

**The deployed read path.** Local `wrangler dev` does not serve these pages from the incremental
cache at all — it re-renders them. A marker planted inside a compressed entry never reached the
response, and the control run proved that is pre-existing rather than caused by compression: with
the entries decompressed back to raw JSON, the same Worker gave byte-identical output and the same
lesson 500s.

Standing in for it: `brotliDecompressSync` round-trips **inside workerd** (tested against a real
worker), `compress-cache` round-trips every entry before replacing it, and
`__tests__/brotliCache.test.ts` runs the real class against a fake R2 across both formats,
set/get round-trip, corrupt input and absent object. That is good coverage of the *format*. It is
not proof the deployed Worker reads it, and only step 2 above is.

**The deploy stage has no clean baseline.** The 1 m 09 s in the production log had *no populate at
all* (the `51400985` bug). Post-merge that stage gets three changes simultaneously — populate
restored, entries 17× smaller, `--cacheChunkSize 100`. Measure it before attributing anything to
any one of them.

---

## Non-negotiables

- **`NAME` in `lib/cache/brotliR2IncrementalCache.ts` must stay `R2_CACHE_NAME`.** It is not a
  label, it is a dispatch key: `populateCache` switches on it, and any other value silently turns
  the deploy-time populate off with one informational log line and a green build. Pinned by a test
  against the upstream constant.
- **The reader must keep accepting uncompressed entries.** It is what makes step 4's ordering
  survivable in one direction.
- **`node:zlib` must stay in `edgeExternals`** (`open-next.config.ts`), or the build dies at the
  config-compile step: the Cloudflare CLI compiles that file for `platform: "browser"`, where
  esbuild cannot resolve a `node:` builtin. Keep `node:crypto` alongside it — `ensure-cf-config`
  requires it.
- **Do not use `NPM_CONFIG_OMIT=optional`.** npm ships platform-specific native binaries *as*
  optional dependencies, so it strips them out of unrelated packages; the build dies on
  `Cannot find native binding` (`@ast-grep/napi`, measured). `--omit=dev` is the one that works.
- **`prefetchInlining: false` stays**, and `check-prefetch-hints` stays in the build chain. Unrelated
  to this work, but it is in the same files and it is what prevents the 2026-08-06 request storm.

---

## Open items

### 1. Generator cache under `.next/cache` — ~35 s, the real remaining prize

`scripts/lib/build-cache.mjs` keeps its manifests in `node_modules/.cache/`, which `npm ci` wipes
and Workers Builds does not restore — so **no deploy has ever hit one of those freshness gates.**
The chain runs cold, in full, on every build. `.next/cache` *is* restored (`Build output restored
from build cache` in the log), so moving the manifests **and the generated outputs** there would let
the gates fire on CI for the first time.

The risk is specific and this repo has been burned by it: `check-prefetch-hints.mjs` exists because
a **corrupt Workers Builds cache restore** shipped a build that looped RSC prefetches at ~150 req/s
per tab. Putting more build state into that same restored cache widens that surface. If you do this,
the manifest must also record a content hash of each *output* and verify it on restore, so a corrupt
restore regenerates instead of being trusted. That is the design work; the move itself is trivial.

### 2. `ignoreBuildErrors` — 17 s, and probably not worth it

Step 5 of the runbook, which now argues against it: requiring `checks` costs four working workflows
or a deploy-key migration, and 17 s is ~2.6% of the build. Recorded as measured rather than as
recommended.

### 3. Measure the deploy stage — do this before anything else on this list

See [What is not verified](#what-is-not-verified). Until it is measured, nobody knows whether
`--cacheChunkSize` helped, whether the populate is bandwidth- or request-bound, or what compression
actually bought on the wire.

---

## Closed — do not reopen without new evidence

| Idea | Why not |
| --- | --- |
| `experimental.clientSegmentCache: false` | **Not a Next 16.3.0 option.** Build fails with `Unrecognized key(s)`, `tsc` rejects it, and `app-render.js` guards `collectSegmentData` on nothing but `isBuildTimePrerendering`. The claim in `open-next.config.ts` and the retention handoff was wrong and is corrected in both. |
| Raise `experimental.cpus` for prerender | The builder is 4-core (`using 3 workers` in the log) and Next already uses `cpus - 1`. |
| `--noMinify` on the OpenNext build | Would cut ~112 s of bundling and blow the 10 MiB gzipped Worker ceiling this repo actively manages. |
| Trim the admin chart gallery (80 routes) | 292 MiB raw looked like 12.2 % of the cache — but **7.8 MiB compressed, 5.7 %**. Saving ~6 MiB would cost removing a deliberate `force-static`. Check the compressed column first. |
| Drop `fumadocs-dev` from production builds | 68 routes (6 % of the count) but **1.4 % of the bytes**. Route count is a bad proxy for cost here; pages differ by 10×. |
| `playwright` downloading browsers on install | It does not. `playwright@1.62` ships no install script. |
| Running the independent generators concurrently | ~2 s, against a new orchestrator and a `created-at`/`images` ordering hazard. |

---

## Things that misled me, so they don't mislead you

- **Route count is not cost.** It sent me at `fumadocs-dev` (6 % of routes, 1.4 % of bytes) and made
  the admin gallery look like a bigger prize than it is. Measure bytes, and measure them *compressed*.
- **A green build is not a working deploy.** The populate bug produced a successful build, a
  successful deploy, and one informational line. Read the deploy section of the log, not just the
  conclusion.
- **Local `wrangler dev` does not exercise the incremental cache.** It re-renders these pages, so it
  cannot validate anything about cache reads. Run the control (swap the data, keep the Worker) before
  concluding a change broke something.
- **Local timings do not transfer.** The builder compiles in 9.3 s where this box takes 37.9 s, and
  typechecks in 17.0 s where this box takes 28.6 s. Two of this audit's early numbers were wrong in
  the direction that would have mis-ranked the work.
- **`npm ci` is 2 m 02 s even with the dependency cache restored.** That cache saves downloads, not
  extraction and linking of 1,301 packages — which is why `--omit=dev` was worth doing at all.

---

## Reproducing the measurements

```bash
# per-step generator timings, cold — clear what CI does not have
rm -rf node_modules/.cache/dataslope-build .next .open-next public/courses public/_gen .source
npm run build

# the literal CI build command, end to end
npx opennextjs-cloudflare build

# what the deploy uploads, and what it is made of
node scripts/analyze-cache.mjs                      # composition
node scripts/analyze-cache.mjs --compress           # what compression would buy
node scripts/compress-cache.mjs                     # do it (idempotent)

# install, with and without the CI-only omission
npm ci                    # 98 s here
npm ci --omit=dev         # 62 s here — what Workers Builds will do

# real CI durations: pair the 🏗️/✅ comment timestamps on any recent PR,
# or read a build log top to bottom — the per-stage lines are all in it.
```
