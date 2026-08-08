# Agent Guidelines

Rules and patterns for AI coding agents working in this repository.

---

## Brand colors

Dataslope's brand color palette. Use the primary colors as the default palette
for UI, illustrations, charts, and diagrams. Reach for the accent colors only
sparingly, to highlight or differentiate.

### Primary colors

| Color  | Hex       |
| ------ | --------- |
| Blue   | `#148CFF` |
| Green  | `#20C621` |
| Red    | `#FF4F59` |
| Yellow | `#FFDD6C` |

### Accent colors (use sparingly)

| Color  | Hex       |
| ------ | --------- |
| Teal   | `#00AEAA` |
| Purple | `#AB77FA` |
| Orange | `#E47600` |

### Tonal shades (100–900)

Each hue has a full tonal ramp exposed as CSS variables in `app/brand.css`
(`--ds-<hue>-<step>`) and previewable at `/dashboard/admin/color-palette`.
**Prefer the `500` shade** (the primary/base color); the other steps exist for
when a lighter or darker tone is required (backgrounds, borders, hover states,
AA-legible text on white, and telling chart/diagram series apart). `500` = the
brand color; the `ink` text anchors that clear WCAG AA body text on white are noted per hue.

**Primary hues**

| Step    | Blue        | Green       | Red         | Yellow      |
| ------- | ----------- | ----------- | ----------- | ----------- |
| 100     | `#D1E6FF`   | `#D4F3D1`   | `#FFDCDA`   | `#FDF5D9`   |
| 200     | `#AED3FF`   | `#B4EAAF`   | `#FFC2BF`   | `#FEF0C3`   |
| 300     | `#8ABFFF`   | `#93E08E`   | `#FFA6A3`   | `#FEEBAC`   |
| 400     | `#5BA7FF`   | `#66D361`   | `#FF807F`   | `#FFE48E`   |
| **500** | **`#148CFF`** | **`#20C621`** | **`#FF4F59`** | **`#FFDD6C`** |
| 600     | `#0878DD`   | `#0AA80F`   | `#DC3F49`   | `#D4B651`   |
| 700     | `#0064BD` ⬅ | `#008B03`   | `#BA303A` ⬅ | `#AB9137`   |
| 800     | `#00519C`   | `#006F01` ⬅ | `#99212C`   | `#836D1C` ⬅ |
| 900     | `#00407F`   | `#005600`   | `#7C141F`   | `#624F00`   |

⬅ = the `ink` shade for that hue (AA body text on white): Blue `700`,
Green `800`, Red `700`, Yellow/Amber `800`.

> Blue also has 50-unit half-steps (`--ds-blue-550/650/750/850/950`) plus a
> `950` extension, for cases (e.g. Mermaid mindmaps) that need several distinct
> white-text-legible blues.

**Accent hues (non-semantic; use sparingly)**

| Step    | Teal        | Purple      | Orange      |
| ------- | ----------- | ----------- | ----------- |
| 100     | `#CFEDEB`   | `#EAE0FD`   | `#FAE0D0`   |
| 200     | `#AAE0DD`   | `#DBCAFC`   | `#F6CAAD`   |
| 300     | `#80D3CF`   | `#CCB3FB`   | `#F1B288`   |
| 400     | `#3BC4BF`   | `#BB96FA`   | `#EB9558`   |
| **500** | **`#00AEAA`** | **`#AB77FA`** | **`#E47600`** |
| 600     | `#009491`   | `#9263D7`   | `#C36400`   |
| 700     | `#007B79` ⬅ | `#7A51B6` ⬅ | `#A35200` ⬅ |
| 800     | `#006361`   | `#634094`   | `#844200`   |
| 900     | `#004E4C`   | `#4E3177`   | `#693300`   |

⬅ = the `ink` shade (AA body text on white) for each accent hue: `700`.

Each hue also has a `50` step (lightest tint) in `brand.css` if an even lighter
background is needed. In code, reference these via the CSS variables
(`var(--ds-blue-500)`) rather than hard-coding hex values.

---

## Illustrations

How course and interview illustrations get made. Both API keys
(`OPENAI_API_KEY`, `KIE_API_KEY`) are already present as environment variables
in Claude Code sessions; do not ask for them and never write them into a file.

### The pipeline

> **Runbook:** `agent-outputs/20260730-1200-illustration-pipeline-handoff.md` is the
> operational companion to this section — measured costs, every gotcha that has cost
> real time, prompt-writing guidance, the course id-prefix registry, and copy-paste
> audits. Read it before a large run.

Five steps, four scripts. Candidates live in R2 until someone picks the
keepers; only the keepers reach git.

1. **Author** the prompt in `data/illustration-prompts.json` (one source of
   truth: the `/dashboard/admin/illustration-prompts` gallery, the in-lesson
   `<Figure>`, and every script read it). `lesson` must equal the MDX file stem.
2. **Generate** — `scripts/generate-illustrations.mjs`, OpenAI `gpt-image-2`,
   **quality `low`**, **size `1536x1024`**, always via the **Batch API**.
3. **Remove the background** — `scripts/remove-background-kie.mjs`, Recraft
   `remove-background` through Kie AI. Writes a `-cutout` beside each original.
   **Never skip this on a regeneration:** pages reference the `-cutout` slug, and
   promotion silently promotes only the original if no cut-out exists, leaving the
   page serving the old image.
4. **Promote** — `scripts/promote-illustrations.mjs` encodes the chosen
   candidates to WebP straight into `public/images/`, the files the site
   serves, and runs `build-images` to record their dimensions.
5. **Wire** — `scripts/wire-course-figures.mjs` places one `<Figure>` per page
   across a course, clears retired slugs, and is idempotent. Always `--dry-run`
   first. Pass `--collection interview` for an interview-prep track, which pairs
   pages with `interview-thumbnail` / `interview-illustration` prompts under
   `content/interview` instead of the `course-*` pair under `content/courses`.

```bash
# Bulk run: candidates land in R2 under one run id, promote only the keepers.
# Use submit/status/download, not `run` — a long batch can outlive the process.
node scripts/generate-illustrations.mjs dry-run --only "$IDS"   # cost, no API calls
node scripts/generate-illustrations.mjs submit  --only "$IDS" --sink r2 --run 2026-08-foo
node scripts/generate-illustrations.mjs status
node scripts/generate-illustrations.mjs download --sink r2 --run 2026-08-foo
node scripts/remove-background-kie.mjs --from r2 --run 2026-08-foo --concurrency 8
node scripts/promote-illustrations.mjs --all --from r2 --run 2026-08-foo
node scripts/wire-course-figures.mjs <course-dir> --dry-run && \
  node scripts/wire-course-figures.mjs <course-dir>
# …or, for an interview-prep track:
node scripts/wire-course-figures.mjs --collection interview <role-dir> --dry-run

# Local run: everything on disk, nothing touches R2. Fine for one or two images.
node scripts/generate-illustrations.mjs run
node scripts/remove-background-kie.mjs                 # adds <id>-cutout.png
node scripts/promote-illustrations.mjs python-basics-loops python-basics-sets
```

### Trimming the blank band above and below the artwork

Background removal leaves the subject floating in the frame it was generated
in, so a promoted cut-out is 1536x1024 of *layout* carrying rather less than
that of drawing. `<Figure>` renders at the full content width with `height:
auto`, so every transparent row is vertical space a lesson pays for and nobody
sees — a median 11% of each image's height across the promoted set, over 30% on
41 of them.

`scripts/trim-cutouts.mjs` removes it, **vertically only**. The left/right
margins are deliberately kept: horizontal blank costs nothing in a page that
scrolls, and cropping it would leave each figure a different width, so a run of
lessons would stop sharing an edge.

```bash
node scripts/trim-cutouts.mjs --prefix python-basics- --dry-run
node scripts/trim-cutouts.mjs --prefix python-basics-
```

It re-crops the **pristine `cutout.png` in R2**, so a trimmed image is still a
single lossy generation from the original rather than a second pass over the
served WebP. A prompt id usually exists in several runs (a redraw writes a new
run prefix and leaves the old one), so the right PNG is found by matching pixels
against the file the site currently serves: the true source scores ~44 dB and
every other run of the same id 6-11 dB. When no candidate matches — the run has
aged out of the bucket — it falls back to re-encoding the served WebP, measured
at 41-49 dB premultiplied PSNR, which is visually lossless but not free. **The
script only reads from R2**; it never puts and never deletes.

It is idempotent (an already-tight image is skipped, not re-encoded) and runs
`build-images` afterwards, which is what updates the manifest's `height` so
`<Figure>` keeps reserving the right box.

Trimming changes an image's aspect ratio, which every consumer that sizes a
cut-out by width (`<Figure>`, the course-card thumbnails) or letterboxes it
(`object-contain`: the auth-globe pins, the pricing icons) absorbs for free.
Two do not, and want checking before a sweep reaches their slugs:
`StatsBento` sizes the four `home-icon-*` cut-outs `h-40 w-40` with no
`object-fit`, and `InterviewCatalog` uses `aspect-[3/2] object-cover` for the
six `interview-*-thumbnail` banners.

### Reviewing, and the regeneration queue

`/dashboard/admin/illustration-prompts` is the review surface and is
**admin-only**: the page is a static shell that fetches everything from `GET
/api/admin/illustration-prompts` behind `requireAdmin`, so a non-admin gets an
access-denied notice rather than the prompt corpus. Its sidebar entry is
reachable without a session on purpose; following it just shows the notice.

It renders a grid of the **background-removed WebP only** (the file the site
serves), each over the live page background so the theme pill is the judgement
tool, and a click opens the raw image in a new tab. Every card can be marked
"redraw this" with a one-line note, stored in D1 database
`dataslope-illustrations`, table `illustration_regen_marks` (binding
`ILLUSTRATIONS_DB`, schema in `migrations/illustrations/`). Typing in the note
marks the illustration by itself; marking with the note blank stores
`DEFAULT_REGEN_NOTE` ("redraw this from scratch as a solid 3D isometric scene
built from a few large objects, dropping the decorative dots…"), which is the
usual reason to redraw. It says "simplify by removing decoration, not by
flattening it" because the previous wording ("fewer, larger shapes") was read as
*flatten*, and the redraws it produced traded the isometric house style for flat
slabs and discs.

A card moves through three states: normal, red once queued, then **green with an
Approve button** once redrawn and not yet signed off. Approve is the human's
half of the loop and returns the card to normal.

> **Regenerating what is marked:**
> `agent-outputs/20260803-0900-illustration-regeneration-queue.md` is the
> runbook. Short version: read `WHERE marked = 1`, then for each id **read the
> note first and write that prompt's `subject` again from scratch** — the note
> is the brief for a new illustration, not a suffix on the built prompt and not
> an edit to the old subject (trimming clauses off the old one just brings the
> failed composition back). Carry over any creature the old subject had (marmot,
> elephant, panda, penguin, duck) and the idea the lesson needs; invent the rest.
> Then generate → remove background → promote as usual, and set `marked = 0` and
> stamp `regenerated_at` for exactly the ids you redrew, so they come back for
> approval. Never stamp `approved_at` yourself.

All four API keys are already environment variables in Claude Code sessions:
`OPENAI_API_KEY` and `KIE_API_KEY`. The R2 variables
(`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET=dataslope-illustrations`) are only needed for `--sink r2` /
`--from r2`; without them, stick to the disk flow, which is fully functional.

### Illustrations are encoded once, into `public/images/`

`promote-illustrations.mjs` writes `public/images/<id>.webp` at quality 92 and
that file **is** what browsers download. Do not commit PNG sources, and do not
put a copy under `assets/images/`: that directory is reserved for raster that
does *not* come from this pipeline (a photo, a screenshot, a scanned diagram),
which `build-images` re-encodes into a `.webp` plus a `.png`/`.jpg` fallback.
It currently holds no sources at all — every served image comes from the
pipeline.

Two reasons promotion skips `assets/images/`:

- **Quality.** Routing an illustration through both encoders is a double lossy
  pass. Measured: promote-q92 → build-q80 lands at **35.58 dB PSNR** against the
  PNG original, while a single q80 encode of the same image is **37.41 dB**. The
  second pass cost ~1.8 dB to save ~3 kB.
- **Size.** A source in `assets/` plus its two build outputs in `public/` means
  every illustration is in git roughly three times.

Illustrations therefore carry `formats: ["webp"]` in the manifest, so `<Figure>`
renders a bare `<img>` — no `<source>`, no fallback file. WebP has been
universally supported since 2020. Every entry in the manifest is single-format
today; the two-format path only comes back if someone adds a raster source under
`assets/images/`. Measured on the Python Basics batch, a 1536x1024 illustration
is ~1.4 MB as PNG and ~130 kB as WebP.

Pristine PNGs stay in R2 for the retention window, so a run can be re-promoted
at a different quality without regenerating. Bump `ENCODER_VERSION` in
`build-images.mjs` when encoder settings change; it invalidates every cached
hash and forces a one-time re-encode.

**Never leave both `<id>.png` and `<id>.webp` in `assets/images/`** — they
slugify to the same manifest key and collide.

### R2 (candidate storage)

Bucket `dataslope-illustrations`, keys
`illustrations/<runId>/<promptId>/v<n>/{original,cutout}.png`. Run-scoped so a
whole run is one prefix delete, and so a lifecycle rule can expire candidates
without bookkeeping. Candidates stay PNG in R2 (pristine, re-processable);
only the promoted copy is WebP.

There is no D1 table and no Worker binding for this bucket by design: the
scripts are authoring tools that talk to the S3 API directly (SigV4 in
`scripts/lib/r2.mjs`, no AWS SDK), so content authoring stays decoupled from
deploying the app.

Candidates expire after **14 days**, applied by
`.github/workflows/r2-illustrations-lifecycle.yml` (run it via
workflow_dispatch, or it re-applies on push when the retention window is
edited). Cloudflare does the deleting server-side, so nothing polls. That is
the review window: generate, review in
`/dashboard/admin/illustration-prompts`, promote the keepers inside a
fortnight. Promotion writes its own encoded copy into
`public/images/`, so an expired candidate that was already promoted still
serves fine — what you lose is the pristine PNG, and with it the ability to
re-promote at a different quality without paying to regenerate.

**The rule is not applied until this workflow runs successfully at least
once.** Its first run (on #612 landing) failed: `AccessDenied` on
`PutBucketLifecycleConfiguration`. Nothing has expired yet and the bucket
still keeps every run.

**That failure is a token-tier problem, not a bug in the rule.** A lifecycle
rule is bucket *configuration*, and R2 lets only an **Admin Read & Write** API
token edit that; the **Object Read & Write** token the rest of the pipeline
shares can list, read and write objects — `head-bucket` even succeeds with it,
so the job looks healthy right up to the write — and is denied on the
configuration. See the [R2 token
permissions](https://developers.cloudflare.com/r2/api/tokens/#permissions)
table.

So this one workflow reads the repository secrets `R2_ADMIN_ACCESS_KEY_ID` /
`R2_ADMIN_SECRET_ACCESS_KEY`, holding the account's Admin Read & Write token.
**R2 admin tokens are account-wide** — they cannot be scoped to one bucket —
so they stay confined to this workflow. `r2-cache-cleanup.yml` keeps its own
object-scoped pair, `R2_INC_CACHE_ACCESS_KEY_ID` /
`R2_INC_CACHE_SECRET_ACCESS_KEY` (renamed 2026-07-30 from `R2_ACCESS_KEY_ID` /
`R2_SECRET_ACCESS_KEY` once a second credential made "the" R2 secrets
ambiguous). That job deletes objects unattended every six hours and has once
deleted more than intended; handing it bucket-delete rights over
`dataslope-workspaces` — live user work, bound to the app Worker — buys
nothing.

Two R2 credentials, then, and the names now say which is which:

| Where | Secret | Tier | Reaches |
| --- | --- | --- | --- |
| `r2-illustrations-lifecycle.yml` | `R2_ADMIN_*` | Admin Read & Write | every bucket, plus their configuration |
| `r2-cache-cleanup.yml` | `R2_INC_CACHE_*` | Object Read & Write | objects only |

**Local scripts are unaffected by that rename.** `scripts/lib/r2.mjs` reads
`R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` from the *session
environment* — a separate Object Read & Write token that must cover
`dataslope-illustrations`. Same variable names, different credential, nothing
to do with repository secrets.

### Non-negotiables

**Quality `low`.** Image output tokens dominate the bill and the tiers are far
apart. Measured on `gpt-image-2`: a 1536x1024 image is **158 output tokens at
`low`** vs 1372 at `medium` and 5488 at `high`. At Batch pricing ($15 / 1M
output tokens) 1000 images is ~$2.37 at `low` and ~$82 at `high`. `low` is
visibly fine for this material. Never leave quality at `auto` — it picks its
own tier per prompt, costing ~2x `low` with no control.

**Size `1536x1024`** unless there is a specific reason otherwise. It is also
the cheaper option: 158 tokens vs 196 for `1024x1024` at the same quality.
Art painted into a *square* slot is that specific reason, and uses
`1024x1024`: the home bento icons (`home-icon`) and the auth globe pins
(`auth-globe-pin`). Size is per category in `meta.sizes`, so this is a JSON
value rather than a flag. Chrome art that only ever renders small should also
be promoted with `--max-width` — see the runbook's "Site chrome" section.

**Batch API, always.** Half price, and a 20-image job returns in well under a
minute in practice despite the 24h window. The generator chunks into
`--batch-size` jobs and streams each output file — do not "simplify" that away:
images come back as inline base64 (~3.6 MB per 1024px PNG), so a 1000-image
batch would build a ~3.6 GB string and blow V8's ~512 MB string cap.

### Style

**Isometric illustration is the house style.** It survived every test: clean
subject isolation, reads on both page backgrounds, and cuts out reliably.
Default to it — it is also the literal default (`DEFAULT_STYLE` in
`lib/illustrationPrompt.ts` and `meta.defaultStyle` in the JSON), so a prompt
that omits `style` gets it automatically.

**Nothing beyond the objects the subject names.** `buildIllustrationPrompt`
appends this to every prompt next to "No text.", because the rule it replaced
caused the failure it was meant to prevent: "draw dots, markers, and nodes as
flat 2D circles" named three things to draw in all 879 prompts, and the model
duly drew them into subjects that had none. A chest of drawers came back with a
coloured dot on every corner; an elephant resting a foot on a cube came back
ringed by dot-and-line networks. **A named noun is content, even inside a
negative rule** — so the constraint now names only the *categories of debris* to
omit (speckled dots, confetti, stray connecting lines) and never a thing to draw.

**One piece, one colour.** Every object is a single solid piece in one flat brand
colour. The model cannot hold an assembly together: a cube built from cubelets, a
bin packed with blocks, or a tower of stacked cubes comes back fused and notched,
with colours bleeding into shades outside the palette. The failure is the
*assembly*, not the count — three large blocks render perfectly where forty
cubelets do not — so containers hold a few large items, never a heap.

**Solid 3D forms.** Isometric is the house style because it has volume, so the
constraints say so outright: real thickness, smooth matte shading, clean edges.
The old wording asked for "flat 2D circles" and flattened whole scenes with it.
Write subjects in volumetric language — "thick", "deep", "solid", "chunky",
"block", "cabinet", "column" — and avoid "flat circles", "slab", "plate",
"panel", "sheet", which read as 2D and render that way. A subject that asks for
"spheres", "balls", or "beads" still fights the glossy-marble guard; say "low
solid discs" when a scene genuinely needs repeated round elements.

**Every other style is retired.** Risograph, flat geometric vector, line art,
blueprint schematic and cut-paper collage were all tried and dropped: the
monochrome ones (line art, blueprint) only read against one page background
once the background is removed, and the busy ones (risograph scenes) have no
isolable subject to cut out. Hand-authored inline `<svg>` graphics are retired
in the same move — the `/svg-gallery` page that catalogued them is gone.

Do not reintroduce a second style "just for this one". A mixed set is what
made the first pass unusable.

**Always render in the brand palette** (the four primaries above). This is not
only aesthetic: see the transparency constraint below.

### Background removal

Recraft `remove-background` via Kie AI. It beat both Replicate's
`851-labs/background-remover` and a local colour-key: it isolates a subject out
of a full-bleed scene rather than dissolving the frame into a ghost matte.

Two API details that will otherwise cost an hour:

- **The model input takes a public URL only** — no base64, no data URI. Upload
  the PNG to Kie's own file endpoint first
  (`https://kieai.redpandaai.co/api/file-base64-upload`, free, auto-deleted
  after 24h) and pass the returned `downloadUrl`.
- **Both Kie hosts sit behind Cloudflare and reject a request with no browser
  `User-Agent`**, returning a bare 403 with `error code: 1010`. It reads like
  an auth failure and is not.

**Kie caps an account at 20 new generation requests per 10 seconds**, and
rejects the excess with 429 *without queueing it*. `remove-background-kie.mjs`
admits `createTask` through a shared sliding-window limiter at 18 per 10s, so
`--concurrency` can be raised freely; a 429 waits out a whole window rather
than backing off briefly, because the request was dropped, not held.

Flow: upload → `POST https://api.kie.ai/api/v1/jobs/createTask` with
`{"model": "recraft/remove-background", "input": {"image": "<url>"}}` → poll
`GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=…` until
`state` is `success`, then read `resultJson.resultUrls[0]`. ~1 credit, ~3s each.

**`gpt-image-2` cannot emit transparency itself.** The API rejects
`background: "transparent"`, and asking for it in the prompt makes the model
paint a fake checkerboard as real pixels. Removal is always a second step.

### The transparency constraint

Removing the background strips the white field that was making single-tone
artwork legible. A monochrome cut-out only reads against one of the two page
backgrounds — black linework is crisp on `#ffffff` and nearly invisible on
`#121212`. No background remover can fix this; the fix is upstream.

**So: any illustration meant to run transparent must be drawn in the brand
colours, never in black, white, or a single hue.** Polychrome subjects survive
both themes; monochrome ones do not.

Check both themes with the toggle on
`/dashboard/admin/illustration-prompts`, which renders each cut-out over the
live page background for exactly this reason. A cut-out
that fails one theme is what the "mark for regeneration" button is for.

---

## Charts

Data-driven figures in lessons (a normal density, a sampling distribution, a
power curve) are **Observable Plot specs rendered to SVG at build time**, not a
chart library shipped to the browser.

### The pipeline

1. **Author** a spec at `charts/<slug>.mjs`. It exports `title` (the figure's
   accessible name, required), an optional `caption`, and `render()` returning
   `plot({...})` from `charts/_theme.mjs`.
2. **Build** — `npm run build:charts` renders every spec into
   `lib/generated/charts.js` (gitignored; its committed `.d.ts` types it). Runs
   from `dev`, `build`, and `postinstall`.
3. **Place** it in MDX: `<Chart slug="<slug>" />`. The component inlines the
   SVG; no import needed, it is registered globally in `mdx-components.tsx`.

### Why build-time

Course MDX compiles **at request time inside the Worker** (`dynamic: true` in
`source.config.ts`), against a gzipped 10 MiB ceiling. A chart library imported
by an MDX component would land in that bundle. Rendering here means Plot is a
devDependency that never ships: the app imports a string.

### Why the SVG is inlined, and never given a literal colour

Dark mode is a `.dark` class toggled at runtime, not a `prefers-color-scheme`
match, so a generated file referenced as `<img src="…svg">` could never follow
it (an `<img>` cannot see page CSS) and a `<picture media>` would desync from
the toggle. The SVG is therefore inlined and painted with:

- `currentColor` — Plot's own default for axis text, ticks and gridlines, left
  exactly as it emits them, so they follow the page foreground; and
- `var(--ds-chart-*)` — chart-scoped role tokens that
  `app/_components/mdx/Chart.module.css` maps to a different brand step per
  theme (the `600`s on white, the `400`s on the near-black page).

**Never write a hex into a spec.** Use `PRIMARY`, `SERIES`, `ACCENT`, `MUTED`
from `_theme.mjs`. The build fails on any literal `fill`/`stroke` colour that
survives into the output, because that is the one defect review cannot catch:
it looks right in whichever theme the author had open.

### Determinism

The generated module is diffed on every build, so a spec that uses random data
**must** draw from the seeded `rng()` / `normalSamples()` helpers in
`_theme.mjs`. An unseeded `Math.random()` rewrites its chart on every run.

The build gate hashes `charts/`, the build script, and the Plot version into
one digest and exits before importing Plot when it matches. Rendering costs
~5 ms per chart, so there is no per-chart cache: any edit re-renders everything.

### Reviewing

`/dashboard/admin/charts` draws every chart on both page surfaces at once,
which is the only way to check the two-theme property while writing a spec.
Twenty per page, ordered A→Z by default, with the ordering in the route
(`/dashboard/admin/charts/newest`, `/…/oldest`, `/…/course`, each with its own
`/2`, `/3`, …) rather than in client state, because a chart is ~13 KB of inline
SVG and reordering on the client would ship the whole library to show twenty of
it. Each figure carries the date of the commit that added its spec, from
`scripts/build-created-at.mjs`.

### The deletion queue

Neither gallery can delete anything, and this is not a gap to close: a chart is
`charts/<slug>.mjs` and an illustration is a file under `public/images/`, both
in git and compiled into the deployed bundle, so removing one is a commit. The
galleries record the *decision* instead, and the repository work reads it back.

**Doing the deletions.** Read the queue, remove what it names, then clear the
rows. Both tables live in D1 `dataslope-illustrations` (schema in
`migrations/illustrations/0004_…`):

```bash
npx wrangler d1 execute dataslope-illustrations --remote --command \
  "SELECT prompt_id, delete_reason, delete_requested_at
     FROM chart_regen_marks
    WHERE delete_requested_at IS NOT NULL
    ORDER BY delete_requested_at"
```

For a chart, that means deleting `charts/<slug>.mjs` **and** every
`<Chart slug="…" />` tag that referenced it. A tag whose spec has gone renders
the dev-only "no chart with this slug" notice and fails no build, so leaving
the tags behind is a silent half-finished job; `usedBy` in the generated
manifest, and the lesson links on the card, list exactly what to edit. Then run
`npm run build:charts` and clear the row:

```bash
npx wrangler d1 execute dataslope-illustrations --remote --command \
  "UPDATE chart_regen_marks
      SET delete_requested_at = NULL, delete_reason = '',
          updated_at = datetime('now')
    WHERE prompt_id = '<slug>'"
```

Clearing the request is how the gallery learns the deletion happened. Leave the
row itself: it keeps the review history for a slug that may be reused.

A deletion request and a redraw mark are independent, and a row can carry both.
The gallery shows the deletion, because it is the decision that supersedes, but
never assume a request means the redraw mark was withdrawn.

### The look

Academic-minimal, in the spirit of ggplot2's `theme_minimal()`: transparent
panel, no frame, no tick marks, faint horizontal rules only, labels placed in
the plot rather than in a legend, and the page's own Inter tracked slightly
tight. Chart junk is the enemy; the data is the ink.


## Prose style

Enforced by `npm run check:prose` (`scripts/check-prose.mjs`) and by
`__tests__/proseStyle.test.ts`, which runs as part of `npm test`.

### No em dashes

**Never use an em dash (`—`) in authored prose.** It is banned precisely
because it is the easy way out: it can stand in for a comma, a colon, a
semicolon or a full stop, so reaching for it means skipping the decision about
which relationship the sentence actually has. Pick the right mark instead:

| The aside is | Use |
| --- | --- |
| a parenthetical | commas, or parentheses when it already contains commas |
| an elaboration or a list | a colon |
| a second independent clause | a semicolon or a full stop |

```markdown
<!-- Bad -->
A significant result says at least one group differs, without saying which — that needs a post-hoc test.
Three colors — unvisited, in-progress, done — is the standard encoding.

<!-- Good -->
A significant result says at least one group differs, without saying which; that needs a post-hoc test.
Three colors (unvisited, in-progress, done) is the standard encoding.
```

**En dashes are fine, unspaced.** They are correct in numeric ranges
(`1815–1864`) and two-name compounds (`Runge–Kutta`, `bias–variance`). A
*spaced* en dash (` – `) is the same tic as the em dash and is rejected.

Two things deliberately pass: a lone `—` glyph marking an empty table cell in
a component (`{col.type || "—"}`) is a typographic convention rather than
prose, and em dashes inside code comments are not shipped as page text.

### Filler phrases

`AI_FILLER` in the checker holds a short, high-precision list ("delve into",
"a testament to", "unlock the potential", "let's dive in", …). Keep it that
way. Words that are ordinary technical vocabulary here must stay out of it:
**robust** (robust statistics), **leverage** (high-leverage points),
**underscore** (the `_` character) and **crucial** all have real meanings in
this material, and a linter that fires on correct prose gets ignored.

---

## Multiple-choice question explanations

Choice explanations in `<MultipleChoice>` blocks are shown to **all** learners after they submit, regardless of which choice they selected. This means the correct choice's explanation is also shown to learners who picked a wrong answer.

**Never start a choice explanation with an affirmative word or phrase.** This includes:

- `Correct!`, `Correct.`, `Correct —`, `Correct:`
- `Right!`, `Right.`
- `Exactly.`, `Exactly!`
- `Yes!`, `Yes.`
- `Perfect!`, `Great!`, `Well done!`

Write the explanation as a neutral statement that stands on its own.

### Option length

**The correct option must not be the longest one.** It is the easiest way to
make a question guessable without reading it: the writer packs the reasoning
into the right answer and leaves the distractors as stubs. The interview
question banks were once 94% guessable this way.

The reasoning belongs in the explanation, which every learner sees after
submitting. Keep the option to the claim itself and let the `>` line carry the
justification:

```markdown
<!-- Bad: the answer is obvious from the shape alone -->
- Only in the learning rate used.
- [o] Batch uses the whole dataset per update (stable, slow); SGD uses one example
      (noisy, fast, can escape shallow minima); mini-batch uses a subset and is the
      practical default.
- SGD is deterministic and batch is not.

<!-- Good -->
- Only in the learning rate each one uses.
- [o] In how many examples each parameter update is computed from.
  > Batch uses the whole dataset (stable, slow), SGD one example (noisy, fast),
  > mini-batch a subset. Mini-batch dominates because it keeps a GPU busy.
- SGD is fully deterministic while batch gradient descent is not.
```

Lengthening the distractors is the other half, and it makes them better
distractors: a one-line stub next to three real sentences is not plausible.

`scripts/check-mcq.mjs` enforces two rules over `content/interview/*/
multiple-choice-questions.mdx`: no single question where the correct option
exceeds the longest distractor by both 1.4x and 20 characters, and a
corpus-wide rate below 40% for "correct option is the single longest" (chance
is 25% with four options; the banks currently sit at 31.5%).

**The course concept-checks are not covered yet** and roughly half of them
still fail the per-question rule. Extending the guard to them means rewriting
about 1,400 questions; it has not been done.

### Answer position

**Do not leave the correct option in the same slot question after question.**
Writing a question answer-first (state the answer, then pad distractors around
it) parks it in slot 2, and the corpus had drifted there badly: 61% of all
questions and 99% of the interview banks. That is more guessable than any
length tell, because it needs no reading at all.

`scripts/shuffle-mcq-options.mjs` redistributes them. It permutes the choice
blocks in place, moving each option's `[o]` marker, continuation lines and `>`
explanation together, so only the order on the page changes:

```bash
node scripts/shuffle-mcq-options.mjs --dry-run --verbose   # report, write nothing
node scripts/shuffle-mcq-options.mjs                       # rewrite in place
```

The permutation is content-addressed (hashed from the question body plus its
choice texts, sorted), so a rerun is a no-op and a question keeps its layout
until someone edits it. Questions whose options are genuinely order-dependent
are left alone and listed under `--dry-run`: "all of the above" style options,
text pointing at another option by position ("the first choice"), and answer
sets that read as a sorted numeric sequence. Every rewrite is verified by
re-parsing the block, so a question that cannot be permuted safely is skipped
rather than mangled.

Two corpora are out of scope. `content/fumadocs-dev/multiple-choice.mdx`
documents the authoring syntax by pairing each rendered question with a
````markdown fence showing its source, and only the rendered half is a template
literal, so a rewrite would leave the two disagreeing. Custom content authored
in the dashboard MCQ builder is user data and is never rewritten.

`scripts/check-mcq.mjs` guards the result: across the whole corpus, no slot may
hold more than 35% of the correct answers (chance is 25% with four options; it
currently sits at 25.6%). The threshold is corpus-level on purpose, since a
single page with six questions can land four of them in one slot by chance.

```markdown
<!-- Bad -->
- [o] Tableau
  > Correct! Tableau is widely used for creating interactive dashboards.

<!-- Good -->
- [o] Tableau
  > Tableau is widely used for creating interactive dashboards.
```

---

## Mermaid diagram syntax

Mermaid is strict about special characters. The following rules prevent the most common parse errors.

### 1. Quote node labels that contain special characters

Any label inside `[ ]`, `( )`, `[( )]`, or `{ }` that contains `<br/>`, `:`, `/`, `.`, `(`, `)`, `"`, `,`, `|`, `<`, `>`, `%`, or `#` **must** be wrapped in double quotes.

```
<!-- Bad -->
flowchart LR
    A[hello.c<br/>source text] --> B[Preprocessor]
    C{Solve A x = b?}

<!-- Good -->
flowchart LR
    A["hello.c<br/>source text"] --> B[Preprocessor]
    C{"Solve A x = b?"}
```

### 2. Quote edge labels that contain special characters

Edge labels written as `-->|label|` or `-- label -->` need quotes when the label contains `,`, `:`, `(`, `)`, `/`, or other special characters.

```
<!-- Bad -->
A -->|apply: mean(sales)| B
A -- 1-D, bracketed --> B

<!-- Good -->
A -->|"apply: mean(sales)"| B
A -- "1-D, bracketed" --> B
```

### 3. Dotted edges with labels need spaces around the label

```
<!-- Bad (parse error) -->
A -.label.-> B

<!-- Good -->
A -. label .-> B
```

### 4. sequenceDiagram: no quotes around message text

Message text in `sequenceDiagram` (the part after `->>`/`-->>`/`->`) must **not** be wrapped in quotes.

```
<!-- Bad -->
U->>OS: "Run hello.exe"

<!-- Good -->
U->>OS: Run hello.exe
```

### 5. sequenceDiagram: no semicolons in message text

Semicolons terminate a statement in Mermaid. Use a comma instead.

```
<!-- Bad -->
CPU->>CPU: executes; produces output

<!-- Good -->
CPU->>CPU: executes, produces output
```

### 6. sequenceDiagram participant aliases: no special characters

Participant `as` aliases cannot contain `.`, `(`, `)`, `"`, or other special characters.

```
<!-- Bad -->
participant CLR as .NET runtime
participant Main as "(top level)"

<!-- Good -->
participant CLR as NET runtime
participant Main as top level
```

### 7. subgraph labels: no extra spaces around the label

```
<!-- Bad -->
subgraph Hand[ "By hand" ]

<!-- Good -->
subgraph Hand["By hand"]
```

### Quick checklist before committing a Mermaid block

- [ ] Every node label with special chars is quoted
- [ ] Every edge label with special chars is quoted
- [ ] No semicolons in `sequenceDiagram` message text
- [ ] No quoted strings in `sequenceDiagram` message text
- [ ] Participant aliases contain only plain words
- [ ] Dotted edge labels have spaces: `-. label .->`
- [ ] `subgraph` labels have no extra spaces inside the brackets

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
