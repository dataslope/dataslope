# Prepopulated code-block outputs (plan) + telling the learner a Result tab appeared (recommendations)

**Date:** 2026-08-10
**Status:** **Both are now built.** The plan in §1 and the recommendations in §2 were written first and approved; §3 records what shipped and where the implementation departed from the plan.
**Scope:** §1 answers "can the output be filled in at build time so a learner sees it without pressing Run?" §2 answers "how should a SQL block tell the learner it just added a Result tab?" §3 is the as-built note.

---

## 1. Prepopulated outputs at build time

### 1.1 The short answer

Yes, and most of the machinery already exists. The site already executes
**every runnable block in Node at build/CI time** and already has a
**serializable output-cell model** that the browser renders. The missing piece
is not execution and not rendering, it is a **manifest between them**.

Two facts make this cheap rather than a rewrite:

- `scripts/check-code-blocks.mjs`, `check-js-blocks`, `check-r-blocks`,
  `check-cpp-blocks`, `check-sql-blocks`, `check-browser-blocks` and
  `check-challenge-cards` already boot the real runtimes (Pyodide, the
  almostnode workers, sqlite-wasm / PGlite / DuckDB via
  `scripts/lib/sql-engines.mjs`) and run every block. `run()` in
  `scripts/lib/pyodide-runner.mjs` already takes `{ capture: true }` and
  returns `{ stdout, stderr, truncated, ms }`. Today the sweeps throw the
  text away because they only ask "does this raise?"
- `OutputCell` in `app/_components/types.ts` is already exactly the shape a
  manifest would need: `{ type: "stdout" | "stderr" | "html" | "image" |
  "plot", content, plot? }`. Text, DataFrame HTML, base64 PNG and Plotly
  figure JSON are all already strings/JSON. **Nothing new has to be invented
  for the non-text cases; they are already serialized this way at runtime.**

So the work is: capture what the sweeps already produce, key it, ship it, and
seed the panel with it on mount.

### 1.2 Scale

| Surface | Count | Notes |
| --- | --- | --- |
| Non-SQL `<CodeBlock>` | 3,374 | python 1,689 · typescript 333 · r 281 · cpp 240 · java 217 · javascript 197 · csharp 191 · c 149 · web 47 · react 25 · php 5 |
| `<SqlCodeBlock>` | 364 | sqlite / postgres / duckdb |
| `<SqlChallengeCard>` | 59 | prepopulate the **seeded tables**, never the solution's result |
| `<ChallengeCard>` | ~810 | **out of scope** (see 1.7) |

### 1.3 Architecture

```
scripts/build-block-outputs.mjs        (new; wraps the existing sweeps)
        │  runs each block in the real runtime, capture: true
        ▼
lib/generated/block-outputs.js         (new; generated, gitignored)
        │  { [blockKey]: { cells: OutputCell[], stale: false, ms } }
        ▼
<CodeBlock> / <SqlCodeBlock>           (seed `outputs` state on mount)
```

**Block key.** `sha256(adapter + "\0" + initCode + "\0" + starterCode)`,
truncated to 16 hex chars. Content-addressed, not `file:line`: a key that
moves when a paragraph is inserted above the block invalidates the whole
course on every edit, and a *stale* key is worse than a missing one, because
a stale key silently shows the learner output the code no longer produces.
Hashing the source means an edited block simply has no entry until the
generator reruns, and the block falls back to today's empty panel.

**Generation.** One new script that reuses `extractBlocks()` /
`extractSqlBlocks()` and the existing per-language runners, wrapped in
`scripts/lib/build-cache.mjs` so an unchanged tree costs a stat-signature
check and nothing else. Cost is bounded by what CI already pays: the Python
sweep is "a couple of minutes" for 1,689 blocks today. Running it in `build`
adds that once, cached thereafter; the alternative is a nightly job that
commits the manifest.

**Consumption.** `<CodeBlock>` already holds `const [outputs, setOutputs] =
useState<OutputCell[]>([])`. Seeding is a lazy initializer reading the
manifest by key, plus a `prepopulated` flag that the first real Run clears.
The renderer (`OutputSegment`) needs **no changes at all** — it already
renders every cell type from exactly this data.

### 1.4 Challenge 1: non-deterministic output

Between the two options you sketched, **"OUTPUT PREVIEW" is the better
default**, and I'd add the info icon as a second layer rather than an
alternative:

- The label is doing the honest work. A learner who runs the block and gets
  different numbers has been told, in advance, in the one place they were
  already looking. An icon that must be hovered to reveal a caveat is not a
  caveat.
- The popover then explains the *why* for the curious, and is where the
  "these are real, they were produced by running this exact code" reassurance
  belongs, because the risk of a preview label is the learner assuming the
  output is decorative or fabricated.

Suggested wording for the popover (not the label):

> This output was produced by running the code above when the page was built,
> so you can read the result before running anything yourself. Press **Run**
> to execute it in your browser, where you can edit the code and see it
> change. Blocks that use randomness or the current time will print something
> different each run.

Two refinements worth taking:

- **Label every prepopulated block "OUTPUT PREVIEW", not just the
  non-deterministic ones.** Deciding per block which is deterministic is a
  losing game: `rng.default_rng(0)` is reproducible, `datetime.now()` is not,
  and a `dict` iteration order or a floating-point last digit sits in
  between. One honest label everywhere costs nothing and never lies. The
  moment the learner runs the block, the label reverts to "OUTPUT" because
  the output is now theirs.
- **Detect the obvious offenders anyway and record it.** The generator can
  run each block **twice** and compare. Two identical runs → `stable: true`;
  differing → `stable: false`. That is cheap (the runtime is already warm),
  it needs no source analysis, and it gives you a real signal: a `stable:
  false` count that jumps after a content edit is worth looking at, and a
  block that is *supposed* to be deterministic and isn't is a bug the sweep
  can now surface. Whether the flag ever changes the UI is a later decision;
  I would not branch the label on it initially.

### 1.5 Challenge 2: non-text output

The good news is that this is largely already solved by the runtime, because
the browser already serializes these cell types today:

| Output | How it already crosses the wire at runtime | What the manifest stores | Extra work |
| --- | --- | --- | --- |
| stdout / stderr | plain text | the text | none |
| pandas / polars DataFrame | `type: "html"`, an HTML string | the HTML string | none |
| matplotlib, seaborn, ggplot2 | `type: "image"`, **base64 PNG** | the base64 PNG | none |
| Plotly | `type: "plot"`, figure JSON | the figure JSON | none |
| web / react previews | live sandboxed iframe | **nothing** | excluded (1.7) |

So "a ggplot output could be stored as a file" is already true in spirit —
it is stored as a base64 PNG in exactly the form the `<img>` consumes.

The one real decision is **payload size**, and it is the main risk in this
plan:

- A matplotlib PNG at Pyodide's default DPI is typically 30–80 kB base64. At
  ~1,000 chart-producing blocks that is tens of megabytes.
- A `df.head()` HTML table is 2–10 kB. A Plotly figure with a few hundred
  points is 10–100 kB, and one built from a large frame can be far more.

Mitigations, in the order I would apply them:

1. **Per-lesson chunks, not one manifest.** Write
   `lib/generated/block-outputs/<course>/<lesson>.json` and have the lesson's
   MDX import only its own. This is the single most important item: it caps
   what any page pays at what that page shows.
2. **Cap each cell and each block.** Truncate text at the existing
   `CAPTURE_LIMIT`; skip any single cell over ~120 kB and any block whose
   cells total over ~250 kB. A skipped block has no entry and behaves exactly
   as today. Log every skip — a silent cap reads as "we covered everything".
3. **Re-encode images.** Save the PNG through the existing image pipeline's
   encoder to WebP before base64-ing it; the same art at roughly a third the
   bytes. (Charts are flat-colour line art, which is where WebP wins most.)
4. **Set the figure DPI in the generator, not the lesson.** A build-time
   `matplotlib.rcParams["figure.dpi"]` of 96 is plenty for a preview and is
   invisible to the lesson source.

If after (1)–(4) the numbers are still uncomfortable, the fallback is to
**prepopulate text-only cells and leave chart blocks empty**. That still
covers the large majority of blocks, and it is a config flag rather than a
redesign.

### 1.6 SQL blocks

`<SqlCodeBlock>` is a slightly different shape and, I think, a *better* first
target than Python:

- Its output is a `SqlResult` (`{ columns, values }`), which is small,
  already JSON, and already what the Result tab renders.
- `scripts/lib/sql-engines.mjs` + `check-sql-blocks.mjs` already boot the
  real engines and run every block.
- The payoff is larger, because a SQL block's table viewer currently sits
  empty behind a cold DuckDB/PGlite download, which is seconds of nothing on
  a first visit. A prepopulated Result tab (and prepopulated **table viewer
  pages**, which is the same mechanism) makes the block readable before any
  WASM arrives.

Rows should be capped (the viewer already pages at 50) and the cap surfaced
in the footnote the viewer already renders.

### 1.7 Explicitly out of scope

- **`<ChallengeCard>` and `<SqlChallengeCard>` starter output.** The starter
  code is deliberately incomplete; its "output" is a `None` or a failing
  assertion. Prepopulating that teaches nothing and looks like a broken page.
  For SQL cards, prepopulating the **seeded tables** is worthwhile and is
  covered by 1.6; the query result is not.
- **`web` / `react` blocks (72).** Their output is a live iframe, not a cell
  array. A screenshot would be a different feature with a different
  truthfulness problem.
- **Anything with network access at run time.** `remoteInitSql` datasets are
  fetched from GitHub; the manifest should record the fetched result, but a
  block whose *lesson* is the fetch should be excluded so the preview does
  not imply an offline capability.

### 1.8 Suggested sequencing

| Phase | Work | Verifies |
| --- | --- | --- |
| 1 | Manifest format + `<CodeBlock>` seeding + "OUTPUT PREVIEW" label + popover, generated for **Python text-only cells in one course** | the whole path, at a size that is trivially reviewable |
| 2 | Non-text cells (html / image / plot) + the size caps and logging | the payload question, with real numbers |
| 3 | Roll out to the remaining non-SQL adapters | reuses phase 1–2 wholesale |
| 4 | `<SqlCodeBlock>` result + table-viewer prepopulation | the cold-engine win |
| 5 | Double-run `stable` flag + a CI report of newly unstable blocks | the determinism signal |

Phase 1 is small enough to be worth doing before committing to the rest: it
settles the label wording, the seeding mechanics and the cache story, which
are the parts everything else inherits.

---

## 2. Making the new Result tab noticeable

### 2.1 What exists today

`TableViewer` in `app/_components/SqlChallengeCard.tsx` already does three
things on a run: it appends a **Result** tab, it **switches to it**
(`setResultIsActive(true)`), and it plays a **0.5s accent wash** over the
pane (`.resultFlashOverlay`, 12% opacity, fading to 0).

So the feedback is not absent — it is *too quiet and in the wrong place*.
Three concrete reasons a learner misses it:

1. **The flash paints the pane, not the tab.** The thing that changed is the
   tab bar; the thing that lights up is the area below it.
2. **It can be off-screen.** `.tableViewerTabs` is `overflow-x: auto`, and
   the Result tab is appended **last**. On a card seeded with six or seven
   tables, the new tab is created outside the visible strip and nothing
   scrolls it into view.
3. **12% for 500ms fading to nothing is below the threshold** at which a
   change reads as a change, especially when the learner's eyes are on the
   Run button or the editor, several hundred pixels away.

### 2.2 Recommendations, in order of value per unit of work

**1. Scroll the Result tab into view when it appears.** One
`ref.scrollIntoView({ inline: "nearest", behavior: "smooth" })` in the
existing `runSeq` effect. This is the highest-value fix by a wide margin: no
amount of highlighting helps a tab that is not on screen. Respect
`prefers-reduced-motion` by dropping to `behavior: "auto"`.

**2. Move the emphasis onto the tab itself.** Replace (or supplement) the
pane wash with a short animation on the Result tab: the accent underline
already used for the active tab, drawn in with a 250ms scale-x, plus a
one-shot background pulse on the tab. The eye is drawn to the tab bar, which
is where the *structural* change happened, and it survives the case where the
pane below is a tall table whose top pixel is all that flashed.

**3. Give the tab a count, and animate the count changing.** `Result · 12
rows` is more informative than `Result`, and a number that visibly changes on
the second run solves the problem the flash does not: telling the learner
that a *new* result replaced the old one when the tab was already open and
already selected. This is the case with the worst feedback today — nothing
about the tab changes at all.

**4. Anchor the feedback where the learner is already looking.** The click
target is the Run button; the change is 300px away. A brief inline status
next to the action bar (the `.actionBarStatus` element already exists and is
already used for in-flight messages) saying `12 rows → Result tab` for ~2s
closes that distance. This is the one recommendation that helps even if the
learner never looks at the tab bar.

**5. Announce it to assistive technology.** None of the above reaches a
screen-reader user. An `aria-live="polite"` region carrying the same short
sentence ("Query returned 12 rows, shown in the Result tab") costs a few
lines and is the difference between "quiet" and "invisible".

**6. Consider not making it a tab at all** — the option worth naming even
though it is the largest change. A result is not a peer of the seeded tables:
tables are *inputs the learner reads*, the result is *the output of the thing
they just did*. Pinning the result as a distinct region **below** the tab bar
(or as a first-position, visually distinct tab rather than a last-position,
identical-looking one) removes the discovery problem instead of decorating
it. If you only ever adopt one structural change, make it **first position**
rather than last: it is a one-line reorder, it puts the tab where the eye
enters the strip, and it can never be scrolled out of view.

### 2.3 What I would not do

- **A toast.** The card already has a toast queue, and it is the wrong tool:
  a toast appears at the viewport corner, far from both the button and the
  tab, and on a page with several SQL blocks it detaches the feedback from
  the block that produced it.
- **A persistent badge/dot on the tab.** It has no natural clearing rule
  (opening the tab? running again?) and ends up permanently lit.
- **A longer or stronger flash.** Increasing the opacity or duration of the
  current wash treats the symptom. The problem is location, not intensity.

### 2.4 Suggested minimum set

Items **1, 3 and 5**, plus the first-position reorder from **6**. That is
roughly a dozen lines each, it makes the tab impossible to miss whether or
not it fits on screen, it handles the repeat-run case that currently has no
feedback at all, and it covers non-visual users. Items 2 and 4 are polish
worth adding once the structural fixes are in.

---

## 3. As built

Both sections were implemented after the plan was approved. What follows is
the delta between the plan and the code, so a reader of §1 and §2 is not
misled by a design that moved.

### 3.1 Prepopulated outputs — what shipped

| Piece | File |
| --- | --- |
| Block key, shared by both sides | `lib/blockOutputKey.ts` |
| Wire shape + cell conversion, shared by the worker and the generator | `app/_components/runtime/pythonDisplayOutputs.ts` |
| Python capture shim (re-patches the seams the sweeps stub) | `scripts/lib/python-output-capture.mjs` |
| Generator | `scripts/build-block-outputs.mjs` |
| Server-side lookup | `lib/blockOutputs.ts` |
| Client context | `app/_components/mdx/BlockOutputs.tsx` |
| Seeding, label, popover | `app/_components/CodeBlock.tsx` |
| Tests | `__tests__/blockOutputs.test.ts` |

Phases 1–3 of §1.8 are done in one pass, including the non-text cells, on
the strength of one thing the plan under-weighted: the worker's JS-side
conversion could be *extracted* rather than reimplemented. `pyodide-worker.ts`
now imports `toOutputCells()` instead of carrying its own copy, so a
prepopulated panel and a freshly-run one are rendered from one function. Only
the Python half is a second implementation, and that is called out in a
comment at both ends.

### 3.2 Three departures from the plan

**Charts are files, not base64 and not inline JSON.** §1.5 proposed capping
and re-encoding inline base64. Measured, that was not enough, and it took two
rounds to find the floor:

1. The first working run of one course produced 1,189 kB of manifest, of
   which **1,165 kB (98%) was base64 PNG**, up to 273 kB on a single lesson.
   Matplotlib figures moved to `public/block-outputs/<key>-<n>.webp`. That
   course dropped to 25 kB inline plus 538 kB of lazily-loaded WebP.
2. Across the whole site, what was left was **2,328 kB of Plotly figure JSON
   out of 2,635 kB inline (88%)**, 160 kB on the heaviest lesson — and it was
   the sole reason 11 chart blocks were dropped by the cell cap, at 146 kB to
   866 kB each. Figures moved out too, to `<key>-<n>.json`, fetched by an
   `IntersectionObserver` so a chart the reader never scrolls to costs
   nothing. The Plotly course went from 11 dropped blocks and ~110 kB a
   lesson to **all 104 blocks recorded at 7 kB inline**.

`OutputCell` grew an optional `src` for both. A *run's* own charts still
arrive inline, because they are already in memory and the reader is looking
straight at them.

**Per-lesson chunking was unnecessary.** §1.5 proposed emitting one JSON
chunk per lesson so a page only pays for its own. With the figures gone the
whole manifest is small, and both MDX routes are server components — so the
route reads the manifest at build time, hands the client only
`manifest[page.path]`, and the rest never crosses the wire. No chunk files,
no extra request.

**The size caps run later than planned.** They apply to what actually goes
*inline*, which is after the figures have been externalised — an image cell
costs a short URL there, and is bounded separately by its own on-disk
ceiling. Checking the caps before externalising (as the first draft did)
dropped three of one course's 64 blocks for being "too big" when the thing
that was big had already been moved out of the payload.

### 3.3 Kept from the plan, deliberately

- **"OUTPUT PREVIEW" on every prepopulated panel**, not only the ones
  suspected of non-determinism, with the info popover as the second layer.
  The label reverts to "OUTPUT" the moment the reader runs the block.
- **The double-run `stable` flag** is recorded and reported in the
  generator's summary. Nothing in the UI branches on it.
- **Content-addressed keys.** An edited block loses its entry and falls back
  to the empty panel rather than showing output its code no longer produces.
- **Every cap is logged.** A dropped block is named in the summary; a silent
  truncation would read as full coverage.
- **`<ChallengeCard>` starter output stays out of scope**, for the reason in
  §1.7: its "output" is a `None` or a failing assertion.

### 3.3b Where it landed, site-wide

The full pass, for the record:

| | |
| --- | --- |
| Blocks recorded | **1,687 of 1,689** (2 print nothing; 0 failed) |
| Lessons covered | 303 |
| Inline in the manifest | **308 kB total**, median **0.7 kB** a lesson, heaviest 9 kB |
| Written as files | 212 images + 156 figures, 11 MB, all lazily fetched |
| Dropped by the size caps | **0** |
| Flagged unstable | 19 |

For contrast, the first working version put 2,635 kB inline, up to 160 kB on
a single lesson, and dropped 11 blocks. The whole difference is that charts
became files.

### 3.4 What is still open

- **The other nine adapters.** The generator runs Python today. The manifest,
  the key, the provider and the component seeding are all adapter-agnostic —
  the block key already takes an adapter id — so extending to the almostnode
  languages (JavaScript, TypeScript) is a second runner behind the same
  interface, and R / C / C++ / Java / C# follow. Phase 4 (SQL) and phase 5
  (the CI report of newly-unstable blocks) are likewise untouched.
- **Cost on Cloudflare Workers Builds.** The generator is in the `build`
  chain and gated by the same stat-signature cache every other generator
  uses, but a cold deploy pays a full Pyodide boot plus every block. If that
  proves too slow, the fallback is the `--empty` mode already wired into
  `postinstall`: ship the manifest from a nightly job instead.

### 3.5 Result-tab feedback — what shipped

The §2.4 minimum set, all four items, in `TableViewer`:

1. **Result tab moved to first position** — it can no longer be created
   outside the visible strip.
2. **Row count on the tab** (`Result · 12 rows`), which is the only thing
   that changes on a repeat run against an already-open tab.
3. **Scroll-into-view** on arrival, `behavior: auto` under
   `prefers-reduced-motion`.
4. **`aria-live` announcement**, derived rather than stored, with an
   alternating trailing space so a repeat run with an identical row count
   still announces.

Item 2 of §2.2 (emphasis on the tab rather than the pane) came along with
them: the tab is re-keyed per run and plays a one-shot accent pulse, which is
what covers the "already open, already selected" case. Item 4 (a status next
to the Run button) and the structural rethink in §2.6 were **not** done — the
first-position move addressed the discovery problem those were hedging
against.
