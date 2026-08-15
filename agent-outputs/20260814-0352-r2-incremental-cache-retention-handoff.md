# R2 Incremental-Cache Retention — Agent Handoff

**Date:** 2026-08-14
**Project:** DataSlope (`dataslope/dataslope`)
**Branch:** `claude/dataslope-cache-r2-size-d8vwxc` → PR **#663** (2 commits ahead of `main`)
**State at:** `ff511af8`
**Trigger:** the Cloudflare dashboard reported `dataslope-inc-cache` at **78.04 GB**, which looked wrong.

> **You are the operator.** PR #663 is written, tested and pushed but **not merged**.
> This document is the investigation record plus the runbook for what comes next.
> Every measurement below is reproducible with the scripts in
> [Reproducing the measurements](#reproducing-the-measurements) — re-run them before
> trusting any number, because several of them already drifted once.
>
> `.github/workflows/r2-cache-cleanup.yml` and `open-next.config.ts` are the spec.
> This is the reasoning behind their current values.

---

## TL;DR

The 78 GB was real, not a dashboard artifact. Two independent causes, both of which had
silently drifted away from what the code comments asserted:

1. **Each build folder is ~2× its documented size** — 2.504 GB / 1,081 objects, not the
   "~1–1.4 GB / ~1,600 objects" both files claimed. Next 16's client segment cache adds a
   `segmentData` map to every entry (~40% of each object), of which `segmentData["/_full"]`
   is a byte-identical duplicate of `rsc` (40/40 sampled) — ~20% of the bucket is redundant.
2. **Retention kept ~24h of every build**, not the "(MAX_BRANCHES + 1) folders" the header
   promised. At ~1.2 deploys/hour × 2.5 GB, a 24h tail *is* the bucket.

PR #663 fixes the retention half and corrects the comments. The segment-cache half is
**documented but deliberately not acted on** — see [Open items](#open-items) #5.

A third, unrelated bug surfaced during the investigation: **cached 404s were resetting
folder age**, defeating the cleanup entirely. Fixed in the second commit.

**Do these next:** [Open items](#open-items). #1 gates #2, and #2 is the real prize.

---

## Current state

| | |
|---|---|
| Bucket, post-sweep (2026-08-14 03:52 UTC) | **31.27 GB** — 13 folders, 14,055 objects |
| Bucket, pre-sweep peak (2026-08-14 00:26 UTC) | **~75 GB** — 32 folders, 32,435 objects |
| Dashboard reading that started this | 78.04 GB (a lagging snapshot near peak) |
| Incomplete multipart uploads | **0** (checked via `ListMultipartUploads`) |
| Per-folder size | 2.504 GB / 1,081 objects, mean 2.32 MB/object |
| Deploy velocity | ~1.2 folders/hour (all branches), ~0.54/hour on `main` |
| Populate duration | median **0.8 min**, max 1.8 min |
| Populate → worker live | **< 2 min** (measured on `5834910a`) |
| Commit → live (full pipeline) | median **~10–12 min** |
| Last 10 `main` commits span | 19.2 hours |

**The bucket oscillates.** It is not a steady 78 GB — it sawtooths between roughly 31 GB
(just after a sweep) and 78 GB (just before one) on the pre-PR 6h/24h policy. Read any
single dashboard number with that in mind.

---

## What PR #663 changes

Two commits. Neither has been merged or run against the real bucket yet.

### `aa85399e` — keep open-PR previews on merit, not on age

The core move: **the open-PR-head check was below the age check**, so a still-open PR's
preview lost its cache once the folder aged past `THRESHOLD_HOURS`, then re-rendered on
demand and 500'd every `node:fs` page. `THRESHOLD_HOURS: 24` existed mainly to paper over
that ("keeps a preview alive through next-morning review"), which forced a day-deep tail
onto every *other* folder too. Moving the check above the age line decouples the two.

The resulting ladder, now stated explicitly in the workflow header:

```
1. populated within GRACE_HOURS          -> KEEP
2. predecessor of a pending head build   -> KEEP
3. head of an open PR (within the cap)   -> KEEP   <- moved up
4. older than THRESHOLD_HOURS            -> DELETE
5. recent default-branch commit          -> KEEP
6. anything else                         -> DELETE
```

| knob | before | after | why |
|---|---|---|---|
| `THRESHOLD_HOURS` | 24 | **4** | no longer has to keep previews alive |
| sweep interval | 6h | **2h** | worst-case age is `interval + THRESHOLD_HOURS`, so the interval was about to become the binding constraint |
| `MAIN_COMMITS` | 30 | **10** | non-binding either way (checked *after* the cutoff); lowered for honesty |
| `MAX_BRANCHES` | 10 | 10 | now the **only** bound on preview retention |

Also corrects the stale per-folder figures in the workflow header, `open-next.config.ts`,
and the `MIN_CACHE_OBJECTS` comment.

### `ff511af8` — date folders by median write, not newest

The job aged each folder by its **newest** object. Objects also arrive at *request* time:
a request for a `/courses/*` path that isn't prerendered matches the `[...slug]` catch-all,
misses, renders the not-found page, and OpenNext caches that 404 (~1.8 MB, `revalidate:
false`) into whichever build folder is live.

Folder `0127baf6` was populated at 17:54, then took 404 writes at 18:22, 19:59, 20:46 and
21:07 — gaps of 28, 97, 47 and 21 minutes, **every one inside `GRACE_HOURS`** — so it was
held as "possibly an in-flight deploy" more than three hours after its deploy finished.
4 of 33 folders affected, 14 writes total.

The median is immune: ~1,081 burst-written objects date the folder and a handful of late
ones cannot move the middle. It stays correct for in-flight populates, where the median of
what has landed so far is also seconds old.

---

## Verification already done

Do not redo these from scratch; extend them.

- **YAML parses**, and the extracted `run:` step passes `bash -n`.
- **The decision ladder was extracted verbatim from the workflow** and driven against mock
  state (`test-ladder.sh` below). Results:
  - open-PR head → KEEP at 1h / 6h / 12h / 30h under both the old 24h and new 4h thresholds
    (before the reorder, 6h/12h/30h were DELETE at 4h)
  - predecessor whose head build is still populating → KEEP under both thresholds; DELETE
    once the head lands
  - merged previews pruned, grace-window folders kept, main builds kept within the window
    and retired past it — all unchanged
- **Median extraction tested** against four real distributions: the `0127baf6` shape now
  dates to 17:54 instead of 21:07 (3h13m of drift removed); a 400-object in-flight populate
  still dates to now; a 7-object partial folder and an empty folder behave as before.

**Not yet done:** a real `dry_run=true` run against the live bucket. Do that before or
immediately after merge — see [Open items](#open-items) #0.

---

## Non-negotiables

Already investigated and settled. Don't re-litigate without new measurements.

- **Never let the job delete the folder a deployment is serving.** Two outages came from
  exactly this (2026-07-16 production, 2026-08-05 preview). The build-ID probe and the
  abort-on-API-failure guards exist for it. Any rewrite keeps both.
- **`prefetchInlining: false` in `next.config.ts` stays.** It is load-bearing — see the long
  note there about the ~150 req/s client-side request storm. Unrelated to this work, but a
  tempting-looking flag in the same file.
- ~~**Don't flip `experimental.clientSegmentCache: false` casually.** It would cut the bucket
  to ~60%, but the segment cache interacts with `prefetchInlining: false` and that
  combination has never been tested on a preview deploy.~~
  **Superseded 2026-08-14: that option does not exist.** Next 16.3.0 rejects the key outright
  (`Unrecognized key(s) in object: 'clientSegmentCache'`, and `tsc` fails against
  `ExperimentalConfig`); `segmentData` is emitted unconditionally. There is nothing to flip,
  casually or otherwise. See §5 below and the note in `open-next.config.ts`.
- **`MAIN_COMMITS` cannot rescue anything past `THRESHOLD_HOURS`** — it is checked *after*
  the cutoff. If stalled-deploy cover ever needs to be longer, raise `THRESHOLD_HOURS`.
  Raising `MAIN_COMMITS` does nothing.
- **The 24h threshold is not a preview-keepalive mechanism any more.** Rule 3 does that on
  merit. Don't restore 24h "to keep previews alive."

---

## Open items

### 0. Run `dry_run=true` before trusting the new thresholds — **do this first**

Actions → *R2 incremental-cache cleanup* → Run workflow → `dry_run: true`. Read the KEEP/
DELETE lines against the ladder above. The ladder is unit-tested; the *inputs* (probe,
`gh pr list`, folder dating) are not, and this is the cheapest way to see them all at once.

### 1. Does Workers Builds build branches with no open PR? — **gates #2**

Cannot be answered from the repo; it's a Cloudflare Workers Builds setting. It matters
because under the proposed rewrite (#2) such a branch would be protected only by
`GRACE_HOURS`, where today `THRESHOLD_HOURS` gives it 4h. If the answer is yes, #2 must
enumerate **branches** rather than open PRs.

### 2. Rewrite the keep-set around live probes — **the real prize**

The current job uses six knobs to approximate two facts: *what is each deployment serving*,
and *what is it about to serve*. Both are directly obtainable, so the approximations can go.

```
KEEP = { probe(production) }                     # what prod serves now
     ∪ { probe(alias_i) ∀ open PR i }            # what each preview serves now
     ∪ { head(default_branch) }                  # what prod is about to serve
     ∪ { head(pr_i) ∀ open PR i }                # what each preview is about to serve
     ∪ { folders populated < GRACE_HOURS }       # catch-all for the unclassifiable
DELETE everything else
```

`THRESHOLD_HOURS`, `MAIN_COMMITS`, `PR_COMMITS` and `MIN_CACHE_OBJECTS` all disappear.
`GRACE_HOURS` survives as a safety net rather than policy; `MAX_BRANCHES` as a sanity cap.
Roughly 277 lines of bash → ~100.

**This is verified feasible.** The per-branch preview alias is in the Cloudflare check-run
summary, and probing it works:

```
$ gh api repos/dataslope/dataslope/commits/<sha>/check-runs   # "Workers Builds: dataslope"
  output.summary contains:
    Preview URL: https://4a5ed0c9-dataslope.subwaymatch.workers.dev
    Preview Alias URL: https://claude-sql-playground-info-wrap-gdt49u-dataslope.subwaymatch.workers.dev

$ curl -fsS https://claude-sql-playground-info-wrap-gdt49u-dataslope.subwaymatch.workers.dev/api/cache-build-id
  81f3560f39873e5f25dff322706e99c650b0bfaa      # == PR #659's head. Exact, not inferred.
```

Why it's *more* correct, not merely shorter:

- The `pr_pending` heuristic has a live race: a head stops counting as "pending" once its
  folder crosses `MIN_CACHE_OBJECTS: 100` of 1,081 objects, but the worker hasn't switched
  yet — so the folder actually being served loses protection. A probe has no such window.
- `PR_COMMITS: 3` is a guess. A preview 4+ commits stale (rapid pushes, or a failed build)
  is unprotected today. A probe doesn't care how far behind it is.
- `MAIN_COMMITS` exists solely to cover the incoming production build. That build *is*
  `head(main)` — one value instead of 30, and unbounded in time, so the stalled-deploy
  trade-off #663 introduces disappears rather than narrowing to 2–4h.

Required care:

- **A probe failure must never delete anything.** Retry; on persistent failure fall back to
  conservative behavior for *that branch only* (keep its recent commits, as today). Never
  treat "no answer" as "nothing to keep", and never let one flaky preview abort the sweep.
- **Treat the alias URL as untrusted data.** It comes from check-run output. Validate against
  `^https://[a-z0-9-]+-dataslope\.subwaymatch\.workers\.dev$` before probing. The alias is
  also derivable from the branch name (`/` and `_` → `-`), but read it from the check run
  rather than reconstructing it.
- Keep the existing abort-without-deleting guards.

### 3. Fix the flat `/courses/<lesson>` links — user-facing, independent of storage

The cached 404s are requests for **real lessons missing their course segment**. Confirmed
live:

| requested | result | actual content |
|---|---|---|
| `/courses/capstone-data-pipeline` | **404** | `/courses/csharp-linq-functional/capstone-data-pipeline` → 200 |
| `/courses/setup-and-tsconfig` | **404** | `/courses/typescript-from-scratch/setup-and-tsconfig` → 200 |

`app/sitemap.ts` emits correct two-segment URLs, so the flat shape comes from somewhere
else — old URL scheme, inbound external links, or generated guesses. **Source not
identified.** These are broken links to content that exists: an SEO and UX bug on its own
merits, and fixing it removes the 404 cache writes at the source. A redirect from the
one-segment shape to the correct path likely fixes both.

### 4. Should a permanent 404 be in the incremental cache at all?

Each is ~1.8 MB with `revalidate: false` — cached forever — and the hit rate on a mistyped
URL is near zero. The mechanism is unbounded in the number of distinct bad URLs: a crawler
working through stale links, or a script hitting `/courses/<random>`, mints a fresh 1.8 MB
object and a full SSR render per unique path. Observed volume today is low (14 entries over
~2 days), so this is a design question, not an incident. `ff511af8` makes the *cleanup*
immune to it; it does not stop the writes.

### 5. Decide on `segmentData` (~40% of the bucket)

**Attempted 2026-08-14, and the premise was wrong.** `experimental.clientSegmentCache: false`
is not a Next 16.3.0 option — the build fails with `Unrecognized key(s) in object:
'clientSegmentCache' at "experimental"`, `tsc` rejects it against `ExperimentalConfig`, and
the name appears in `next/dist` only inside source maps. `app-render.js` guards
`collectSegmentData(...)` on nothing but `renderOpts.isBuildTimePrerendering`, so it is
emitted on every prerender with no flag to stop it.

The measurement itself held up, and got sharper — over all 1,081 objects rather than 40
(`node scripts/analyze-cache.mjs`): `segmentData` is **42.8%** of the bucket, and
`segmentData["/_full"]` is byte-identical to `rsc` in **1,045 of 1,045**, i.e. 20.4% of the
bucket is one field stored twice.

**The bigger prize is compression, and it makes this moot.** These objects go to R2
uncompressed (`--compress`): gzip -6 is 5.4× (2.340 GiB → ~0.44 GiB), brotli q5 is 17.0×
(→ ~0.14 GiB). A compressor erases a byte-identical duplicate for free, so a custom
`incrementalCache` override beats removing `segmentData` even if the flag existed. See
`open-next.config.ts` for what the read side would have to do.

### 6. Decide whether rollback cover is wanted

Rolling the Worker back to a build whose cache has been pruned 500s the site — same
`node:fs` mechanism. Cover was ~24h before #663, is ~4–6h after, and would be ~0 under #2.
The trap is that Cloudflare's Deployments tab offers rollback targets with no warning that
their cache is gone.

Mitigating context: revert-and-redeploy is ~12 min end-to-end (measured), so the fallback
is cheap. If you do want rollback, add it back **deliberately** as its own rule — "keep the
last N production builds", count-bounded, above the age line — rather than as an emergent
side effect of a time threshold. At N=5 that is ~9h of history for ~5 GB incremental cost
(the 4h tail already retains ~3 main builds).

---

## Reproducing the measurements

All read-only. Credentials come from the environment (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`); the helper is `scripts/lib/r2.mjs`, whose `listDetailed()` returns
size and `lastModified` per object.

**Weigh the bucket and group by build folder:**

```js
import { createR2Client, credentialsFromEnv } from "./scripts/lib/r2.mjs";
const r2 = createR2Client(credentialsFromEnv(), "dataslope-inc-cache");
const objs = await r2.listDetailed("incremental-cache/");
const f = new Map();
for (const o of objs) {
  const id = o.key.split("/")[1];
  const e = f.get(id) ?? { n: 0, b: 0, min: Infinity, max: -Infinity };
  e.n++; e.b += o.size;
  const t = Date.parse(o.lastModified);
  e.min = Math.min(e.min, t); e.max = Math.max(e.max, t);
  f.set(id, e);
}
console.log(f.size, "folders", (objs.reduce((s,o)=>s+o.size,0)/1e9).toFixed(2), "GB");
```

**Find stray (post-populate) writes** — cluster each folder's timestamps with a >5 min gap;
the largest cluster is the populate, everything else is a runtime write. Fetch one and read
`JSON.parse(buf).value.meta.status` (404) and `.headers["x-next-cache-tags"]` (the path).

**Where the bytes go inside an entry** — `JSON.parse` a `.cache` object and measure
`html` / `rsc` / `segmentData`, comparing `segmentData["/_full"] === rsc`.

**Incomplete multipart uploads** — `GET /<bucket>?uploads` signed with
`buildSignedRequest`, paginating on `NextKeyMarker` / `NextUploadIdMarker`.

**Test the ladder without running the workflow** — parse the YAML, pull
`jobs.cleanup.steps[0].run`, slice from `if (( ts >= grace_cutoff` to the matching outer
`fi`, then `source` that fragment with `ts`, `sha`, `cutoff`, `grace_cutoff` and the
`pr_pending` / `pr_branch` / `main_sha` associative arrays set by hand. This tests the real
code rather than a paraphrase of it — keep it that way.

---

## Things that misled me, so they don't mislead you

- **The dashboard number is a lagging snapshot of a sawtooth.** My first LIST read 72.53 GB
  against a dashboard 78.04 GB; the gap was a folder being written *during* the scan, not an
  accounting discrepancy.
- **Production's folder appeared to be missing.** It was mid-populate during the listing and
  landed two minutes later. Probe `/api/cache-build-id` and check the folder again before
  concluding anything is wrong.
- **Four folders looked like 4-hour populates.** They were 1-minute populates plus stray 404
  writes hours later. Cluster the timestamps before believing a duration.
- **`MAIN_COMMITS` looks like a retention knob.** It is checked after the age cutoff, so at
  any `THRESHOLD_HOURS` shorter than the span of the last N main commits it does nothing.
- **The workflow header was confidently wrong** about per-folder size and worst-case folder
  count. Both predated changes that invalidated them. Measure, don't read.
