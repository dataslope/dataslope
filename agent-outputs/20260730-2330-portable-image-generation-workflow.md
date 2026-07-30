# Portable Image-Generation Workflow

**Date:** 2026-07-30
**Source:** the illustration pipeline in `dataslope/dataslope`
**Target:** any other Next.js repository, **without R2** — generated WebP files are
committed to git and served straight out of `public/`.

> This document is self-contained. It is written to be dropped into a *different*
> repository and implemented from scratch: every API call, every parameter, every
> measured number, and complete drop-in scripts are here. Nothing depends on
> Dataslope-specific infrastructure.
>
> **Verification status of the scripts in the appendices.** All four were run in a
> scratch repo: prompt rendering, cost estimation, `--only` / `--category` filtering,
> argument validation, `--help`, WebP q92 encoding, the stale-cut-out guard, and the
> manifest's incremental/no-op behaviour all confirmed working. The paths that spend
> money — the OpenAI Batch calls and the Kie job calls — were **not** executed; they
> are transcribed unchanged from the pipeline that generated ~800 production images.

---

## 1. What the workflow does

Four steps, four scripts, one committed artifact per image:

```
  data/image-prompts.json          ← 1. author the prompt (source of truth)
            │
            ▼  scripts/generate-images.mjs        (OpenAI Batch API, gpt-image-2, quality low)
  generated-images/<id>.png        ← 2. candidates, gitignored, local scratch
            │
            ▼  scripts/remove-background.mjs      (Kie.ai → recraft/remove-background)
  generated-images/<id>-cutout.png ← 3. transparent cut-out beside its original
            │
            ▼  scripts/promote-images.mjs         (sharp → WebP q92)
  public/images/<id>-cutout.webp   ← 4. COMMITTED. This file IS what browsers download.
  lib/generated/images.js          ←    manifest: slug → {hash, width, height}
            │
            ▼
  <Figure slug="…" />              ← 5. rendered by the Next.js app from /images/<slug>.webp
```

The defining property: **an image is encoded exactly once and exists in git exactly
once.** The promoted WebP is the served byte stream — there is no build-time
re-encode, no source copy, no second lossy pass.

### Why each step exists

| Step | Why it can't be skipped or merged |
|---|---|
| Prompt in JSON | One source of truth for the generator, any review UI, and the page that embeds the image. Prompts drift instantly when they live in two places. |
| Generate at `low` | Image output tokens dominate the bill; `low` is 1/7 the cost of `medium` and visually fine for flat/isometric art. |
| Background removal | `gpt-image-2` **cannot** emit transparency. It is a separate model call, always. |
| WebP q92 | PNG is ~11–15× larger. Committing PNG puts gigabytes in git per thousand images. |
| Manifest | The page needs intrinsic `width`/`height` to reserve layout space (no CLS) without shipping or decoding the file at build time. |

---

## 2. Prerequisites

```bash
node --version   # 20+ (native fetch, FormData, Blob, web streams)
npm i sharp      # the only runtime dependency the pipeline adds
```

Two API keys, as environment variables. Never write them to a file.

| Variable | Used by | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | step 2 (generation) | platform.openai.com |
| `KIE_API_KEY` | step 3 (background removal) | kie.ai |

No cloud storage credentials are needed — that is the whole point of this port.
Candidates live in a gitignored local directory.

```gitignore
# scratch: raw model output, only the promoted WebP is committed
generated-images/
```

---

## 3. Step 1 — Author the prompt

### The data file

`data/image-prompts.json` is the single source of truth. Every script reads it, and
so should any in-app gallery or review page.

```jsonc
{
  "meta": {
    "model": "gpt-image-2",
    "defaultStyle": "isometric illustration",
    "brandColors": {
      "blue": "#148cff",
      "green": "#20c621",
      "red": "#ff4f59",
      "yellow": "#ffdd6c"
    },
    "sizes": {
      "hero": "1536x1024",
      "illustration": "1536x1024",
      "portrait": "1024x1536",
      "square": "1024x1024"
    }
  },
  "prompts": [
    {
      "id": "css-grid",                  // unique; becomes the filename AND the
                                         // regeneration handle. Slug-safe.
      "category": "illustration",        // selects the size from meta.sizes
      "title": "CSS Grid in depth",      // human label for review UIs
      "style": "isometric illustration", // optional; defaults to meta.defaultStyle
      "subject": "a two-dimensional lattice of cells on a platform, one wide panel spanning three cells and another spanning two rows"
    }
  ]
}
```

Add whatever extra fields your repo needs (`page`, `collection`, `mascot`, …) — the
scripts only require `id`, `category`, and `subject`.

### The prompt template

One shared, dependency-free builder, imported by the generator **and** by any UI that
displays the prompt, so the two can never disagree:

```ts
// lib/imagePrompt.ts
export interface BrandColors { blue: string; green: string; red: string; yellow: string }

export const DEFAULT_STYLE = "isometric illustration";

/** "An" before a vowel-initial style ("isometric"), "A" otherwise. */
const article = (style: string) => (/^[aeiou]/i.test(style) ? "An" : "A");

export function buildImagePrompt(
  spec: { subject: string; style?: string },
  colors: BrandColors,
): string {
  const style = spec.style?.trim() || DEFAULT_STYLE;
  return (
    `${article(style)} ${style} of ${spec.subject}. No text.\n\n` +
    `Blue: ${colors.blue}\n` +
    `Green: ${colors.green}\n` +
    `Red: ${colors.red}\n` +
    `Yellow: ${colors.yellow}`
  );
}
```

Which renders exactly:

```
An isometric illustration of a two-dimensional lattice of cells on a platform, one
wide panel spanning three cells and another spanning two rows. No text.

Blue: #148cff
Green: #20c621
Red: #ff4f59
Yellow: #ffdd6c
```

**`"No text."` is appended unconditionally.** Never ask for lettering — the model
bakes in garbled text. If a label seems needed, write "blank name plate", "blank
banner", "blank paper tag" into the subject.

> If you keep both a TypeScript builder (for the app) and a JS copy (for the Node
> script), pin them together with a test that asserts byte-identical output for a
> sample spec. That test is the only thing preventing house-style drift.

### Writing a good `subject`

Rules that produced a set of ~800 usable images:

- **Describe the page's actual idea**, not a generic scene. You should be able to tell
  which page an image belongs to.
- **Concrete objects on a platform.** "platform", "tray", "rail", "chute", "socket",
  "gate" recur because they cut out cleanly and read at small sizes.
- **Contrast pairs** work well for before/after ideas: "a messy heap of irregular tiles
  on one platform beside the same tiles arranged into a perfect rectangular grid".
- **Keep it simple.** Complex compositions are what fail background removal.
- **Never request text.**

### Style: pick one and hold it

**Isometric illustration is the recommended house style.** It survived every
comparison: clean subject isolation, readable on both light and dark page
backgrounds, and it cuts out reliably.

Tried and permanently retired: risograph (busy scenes have no isolable subject), flat
geometric vector, line art, blueprint schematic, cut-paper collage. Do not
reintroduce a second style "just for this one" — a mixed set is what makes a first
pass unusable.

### The transparency constraint (read before choosing a palette)

Removing the background strips the white field that was making single-tone artwork
legible. **A monochrome cut-out only reads against one of two page backgrounds** —
black linework is crisp on `#ffffff` and nearly invisible on `#121212`. No background
remover can fix this; the fix is upstream.

**Any image meant to run transparent must be drawn in a multi-colour palette, never in
black, white, or a single hue.** Naming four brand colours in every prompt is not only
an aesthetic decision — it is what makes the cut-outs survive both themes.

Build a review page that renders each cut-out over the *live* page background with a
light/dark toggle. It catches this in seconds and nothing else does.

---

## 4. Step 2 — Generate with GPT Image 2 (quality `low`)

### The request

`POST https://api.openai.com/v1/images/generations`

```jsonc
{
  "model": "gpt-image-2",
  "prompt": "An isometric illustration of …\n\nBlue: #148cff\n…",
  "size": "1536x1024",   // see the size table below
  "quality": "low",      // non-negotiable, see cost table
  "n": 1
  // "output_format": "png"    (default; "webp" and "jpeg" also valid, "svg" is a 400)
  // "background": "opaque"    (do NOT send "transparent" — 400)
}
```

The response carries **base64, never a URL**:

```jsonc
{ "data": [ { "b64_json": "iVBORw0KG…" } ] }
```

```js
const buf = Buffer.from(res.data[0].b64_json, "base64");
```

### Sizes

`gpt-image-2` accepts a fixed set of sizes — all of which are below 1536×1536, so the
"smaller than 1536×1536" requirement is satisfied by construction:

| `size` | Shape | Output tokens at `low` |
|---|---|---|
| **`1536x1024`** | landscape — **the default, use this unless there's a reason not to** | **158** (measured) |
| `1024x1536` | portrait | 158 assumed by symmetry — **measure before budgeting a large portrait run** |
| `1024x1024` | square | 196 (measured) |
| `auto` | model picks | unpredictable — **never use** |

Landscape is *cheaper* than square at the same quality (158 vs 196 tokens), which is a
pleasant surprise the first time you see it. `auto` costs roughly 2× `low` with no
control over the tier, so pin the size per category in `meta.sizes` and pin the quality
on the command line.

Only landscape and square were used in production, so those two token counts are
measured; the portrait figure is inferred from the pixel count matching landscape. A
`dry-run` on a handful of prompts, compared against the API's reported usage, confirms
it in a minute.

### Quality: `low`, and why it is not a compromise

Image output tokens dominate the bill and the tiers are far apart. Measured against
`gpt-image-2` on 2026-07-28:

| Size / quality | Output tokens | 1000 images @ Batch ($15/1M) |
|---|---|---|
| 1536x1024 / **low** | **158** | **$2.37** |
| 1024x1024 / low | 196 | $2.94 |
| 1536x1024 / medium | 1372 | $20.58 |
| 1536x1024 / high | 5488 | $82.32 |

`low` is visibly fine for flat, isometric, brand-coloured art. Reach for `medium` only
for a one-off hero image where you have actually compared the two side by side.

### Batch API, always

The Batch API is **half price** and, in practice, a 20-image job returns in well under
a minute despite the 24-hour completion window. A 337-image job took 27 minutes.

The flow is four calls:

1. **Upload** a JSONL file of requests — `POST /v1/files` with `purpose=batch`
   (multipart). One line per image:
   ```jsonc
   {"custom_id":"css-grid","method":"POST","url":"/v1/images/generations","body":{…}}
   ```
   `custom_id` is the prompt id, and it is what comes back on each output row — that is
   how a result is matched to a filename.
2. **Create** — `POST /v1/batches` with
   `{ input_file_id, endpoint: "/v1/images/generations", completion_window: "24h" }`.
3. **Poll** — `GET /v1/batches/{id}` until `status` is terminal
   (`completed` / `failed` / `expired` / `cancelled`). `request_counts` gives progress.
4. **Download** — `GET /v1/files/{output_file_id}/content`, a JSONL stream, one row per
   image with the base64 inline.

Two structural constraints that the script's shape exists to satisfy — do **not**
"simplify" them away:

- **Chunk the prompts into separate batch jobs** (default 100 per job). One 1536×1024
  PNG is ~2.6 MB, ~3.6 MB as inline base64. A single 1000-image batch would produce a
  ~3.6 GB output file.
- **Stream the output file line by line.** `await res.text()` on that file blows V8's
  ~512 MB max string length. Read `res.body` with a reader and split on newlines, so
  only one row (~3.6 MB) is in memory at a time.

**Use `submit` → `status` → `download` as three separate invocations, not one
long-lived process.** A 65-minute batch once outlived its parent process; the images
were only recovered because the batch id had been written to disk and
`download --batch <id>` could pick it up. Paid work must never depend on a process
staying alive.

### Retry policy — the part that actually bites

**Every expensive failure so far has been on the *retrieval* side, after the paid work
completed.** Three separate incidents: the OpenAI batch-output GET (504 through a
proxy), the object-store fetch under concurrency, and the Kie CDN result download (8 of
44 failed). The images were already generated and billed in all three cases.

So:

- Retry **idempotent GETs** — status polls, file content — on `408, 425, 429, 500, 502,
  503, 504` and on network errors, with exponential backoff (2s, 4s, 8s, 16s, 32s cap).
- **Never** blanket-retry the POSTs that create batches or generate images. A silent
  re-send duplicates work and doubles the bill. Retries are opted into per call site,
  never a default.
- Any new `fetch` added to these scripts must be wrapped. A bare `fetch` here is a bug
  waiting for a burst of concurrency.

### Known 400s

| You send | You get |
|---|---|
| `background: "transparent"` | 400. `gpt-image-2` has no transparent background. Asking for transparency *in the prompt* is worse — the model paints a fake checkerboard as real opaque pixels. |
| `output_format: "svg"` | 400. png / webp / jpeg only. |

---

## 5. Step 3 — Background removal (Kie.ai → Recraft)

Model: **`recraft/remove-background`**, served through Kie.ai.

Chosen after comparison: it lifts a subject out of a full-bleed scene, where
Replicate's `851-labs/background-remover` and a local colour-key both dissolved busy
frames into translucent ghost mattes.

### The flow

```
POST https://kieai.redpandaai.co/api/file-base64-upload
     { base64Data: "data:image/png;base64,…", uploadPath: "images/…", fileName: "css-grid.png" }
  → { data: { downloadUrl: "https://…" } }

POST https://api.kie.ai/api/v1/jobs/createTask
     { model: "recraft/remove-background", input: { image: "<downloadUrl>" } }
  → { data: { taskId: "…" } }

GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=…      (poll every ~3s)
  → { data: { state: "success", resultJson: "{\"resultUrls\":[\"https://…\"]}" } }
     state is "success" | "fail" (with failMsg/failCode) | in-progress

GET  <resultUrls[0]>   → the transparent PNG bytes
```

All requests carry `Authorization: Bearer $KIE_API_KEY`.
Cost is ~1 credit and ~3 seconds per image.

### Four API details that each cost an hour to rediscover

1. **The model takes a public URL only** — no base64, no data URI. That is why every
   image is pushed through Kie's own upload endpoint first. The upload is free and
   auto-deletes after 24 h.
2. **Both Kie hosts sit behind Cloudflare and reject a request with no browser
   `User-Agent`** — a bare `403` with `error code: 1010`. It reads exactly like an auth
   failure and is not. Any ordinary browser UA string satisfies it.
3. **Rate limit is per account: 20 new generation requests per 10 seconds, and the
   excess is rejected with 429 *without being queued*.** Admit `createTask` calls
   through a shared sliding-window limiter at 18/10 s so concurrency can be raised
   freely, and on a 429 wait out a **full window** rather than a short backoff — the
   request was dropped, not held. Uploads and status polls are not counted against this
   limit.
4. **`resultJson` is a JSON *string*** inside the response, not an object. Parse it,
   then read `resultUrls[0]`.

### The failure mode that will waste your afternoon

**Skipping background removal fails silently.** Pages reference the `-cutout` slug. If
you regenerate an original and skip this step, promotion finds no cut-out for that run
and promotes **only the original**: no warning, no error. `<id>.webp` updates,
`<id>-cutout.webp` stays stale, and **the page keeps serving the old image**. You will
wrongly conclude the regeneration didn't work.

After any regeneration, verify explicitly:

```bash
git status --short public/images | grep -- -cutout
```

Better: have the promote script warn when it promotes an original whose cut-out is
absent from the source directory *while* a `<id>-cutout.webp` already exists in
`public/images` — that combination always means a stale page.

---

## 6. Step 4 — Encode to WebP q92 and commit

### The encode

```js
import sharp from "sharp";

const webp = await sharp(pngBuffer)
  .webp({ quality: 92, alphaQuality: 100, effort: 6 })
  .toBuffer();
```

- **`quality: 92`**, not a serving-oriented 80, because this file *is* the artifact —
  q92 is what users actually see. There is no later "real" encode to defer quality to.
- **`alphaQuality: 100`** keeps the cut-out edge clean. Lossy alpha shows as a halo.
- **`effort: 6`** is the encoder's time/size tradeoff; it costs seconds per image and is
  paid once, at authoring time, not per request.
- **`nearLossless` is deliberately not used** — these are photographic-ish raster
  renders, so plain high-quality WebP is both smaller and visually equivalent.

Measured: PNG → WebP q92 took 929.6 MB → 63.8 MB across 674 files (**14.6×**). A single
1536×1024 illustration is ~1.4 MB as PNG and ~130 kB as WebP.

### Write straight into `public/images/` — do not keep a source copy

This is the decision that most repos get wrong, so here is the measurement behind it.

If you put the promoted file under `assets/` (or `src/images/`) and let a build step
re-encode it for serving, you pay a **double lossy pass**:

| Path | PSNR vs the PNG original |
|---|---|
| promote q92 → build q80 (two passes) | **35.58 dB** |
| single q80 encode | **37.41 dB** |

The second pass **cost ~1.8 dB to save ~3 kB**. It also means every image is in git
roughly three times (source + two build outputs).

So: **`promote` writes `public/images/<id>.webp` and that is the end of it.** The build
step never touches those bytes; it only reads their dimensions.

If your repo also needs a *second* class of image — a photo, a screenshot, a scanned
diagram that did not come from this pipeline — keep a separate source directory that
the build step *does* encode (WebP + a `.png`/`.jpg` fallback). Just never route a
pipeline image through it.

### The manifest

`lib/generated/images.js` is generated, **committed**, and maps slug → metadata:

```js
// GENERATED by scripts/build-image-manifest.mjs, do not edit by hand.
export default {
  "css-grid-cutout": {
    "hash": "9f2c…",     // sha256(MANIFEST_VERSION + file bytes)
    "width": 1536,
    "height": 1024,
    "formats": ["webp"]
  }
};
```

Why it exists and why it is committed:

- `width`/`height` let the `<img>` reserve layout space — **no CLS** — without the page
  importing or decoding the file.
- The hash makes the build step **incremental and a true no-op** on a clean tree: an
  unchanged file is never re-measured and the manifest file is not even rewritten, so
  it produces no git churn on `dev` / `build` / `postinstall`.
- Committing it means a deploy serves the images straight from CDN with **zero build
  work**.
- `formats` stays an array so a two-format image (WebP + fallback) can coexist later.
  Pipeline images are always `["webp"]`.

`MANIFEST_VERSION` is a bump-to-invalidate constant: change it when metadata semantics
change and every entry is re-measured once.

### What "commit the WebP" means in practice

- A commit that lands artwork is **large and touches many binary files** — 674 files in
  one commit is normal. Don't split it to look tidier: **the manifest must land in the
  same commit as its images**, or the app renders nothing for the new slugs.
- The manifest is a single generated file, so two concurrent branches each regenerating
  a different image **will conflict there**. Resolution is mechanical: take either side,
  re-run the manifest build, commit.
- Budget the repo size honestly: ~130 kB per image ⇒ ~130 MB per thousand. That is fine
  for git. PNG at ~1.4 MB each would be ~1.4 GB per thousand, which is not.
- Regenerating an image **reuses its slug**, so the diff is two changed WebP files
  (original + cutout) and one changed manifest line. Git stores both blob versions
  forever — expect steady, modest growth per regeneration, and don't regenerate in bulk
  casually.

### Losing R2: the one real tradeoff

In the source repo, pristine PNG candidates live in object storage for a 14-day
retention window, so a run can be **re-promoted at a different WebP quality for free**,
without paying to regenerate.

Committing directly gives that up: once `generated-images/` is cleaned, the only copy
is the q92 WebP. Two mitigations, pick one:

1. **Keep candidates locally** for as long as you might want to re-promote. Disk is
   cheap; the directory is gitignored.
2. **Accept regeneration cost** — at ~$0.0024 per image, redoing one is ~a quarter of a
   cent. This is the honest default for a small repo.

Do **not** solve this by committing the PNGs.

---

## 7. Step 5 — Serving from the Next.js app

Files in `public/images/` are served at `/images/<slug>.webp`. The component reads the
manifest for dimensions:

```tsx
// components/Figure.tsx
import imageManifest from "@/lib/generated/images";

const PUBLIC_BASE = "/images";
const MIME: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg" };

interface FigureProps {
  /** Image slug — the committed filename without its extension. */
  slug: string;
  /** Alt text. Pass "" only for a purely decorative image. */
  alt: string;
  caption?: string;
  maxWidth?: number;
  /** Eager-load + high fetch priority for an above-the-fold hero. */
  priority?: boolean;
}

export function Figure({ slug, alt, caption, maxWidth, priority = false }: FigureProps) {
  const entry = imageManifest[slug];

  // A slug with no image yet: surface it while developing, render nothing in
  // production, so a placement can be authored before its artwork exists.
  if (!entry) {
    if (process.env.NODE_ENV !== "development") return null;
    return <span role="img" aria-label={`Image pending: ${slug}`}>Image <code>{slug}</code> pending</span>;
  }

  // The last format is the <img> src; any earlier ones become <source>s. With a
  // single format <picture> collapses to a plain <img>.
  const fallback = entry.formats[entry.formats.length - 1];
  const sources = entry.formats.slice(0, -1);

  return (
    <figure style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}>
      <picture>
        {sources.map((ext) => (
          <source key={ext} srcSet={`${PUBLIC_BASE}/${slug}.${ext}`} type={MIME[ext]} />
        ))}
        <img
          src={`${PUBLIC_BASE}/${slug}.${fallback}`}
          width={entry.width}
          height={entry.height}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
        />
      </picture>
      {caption ? <figcaption>{caption}</figcaption> : null}
      {/* Regeneration handle: the prompt id is the slug minus the -cutout suffix,
          which is exactly what every script takes as --only. */}
      <figcaption className="assetId"><code>{slug.replace(/-cutout$/, "")}</code></figcaption>
    </figure>
  );
}
```

Three things worth copying verbatim:

- **A plain `<img>`, not `next/image`.** `next/image` re-encodes at request time, which
  is the same double-lossy pass the pipeline exists to avoid, and the bytes are already
  final and correctly sized. If you must use `next/image` for layout reasons, pass
  `unoptimized`.
- **`width`/`height` always set** from the manifest. This is the entire CLS story.
- **The prompt id rendered under the image.** It looks like a small thing; it is the
  regeneration handle. A reviewer reading the live page can say "redo `css-grid`" and
  that string is precisely what `--only` takes. Keep it working. (Gate it behind
  non-production if it ever reads as clutter — a one-line change.)

**Caching.** Slugs are *stable across regenerations*, so `Cache-Control: immutable` is
wrong — a regenerated image would never reach returning visitors. Either use a moderate
`max-age` with `stale-while-revalidate`, or append the manifest hash as a cache-buster
and then cache immutably:

```tsx
src={`${PUBLIC_BASE}/${slug}.${fallback}?v=${entry.hash.slice(0, 8)}`}
```

*(The query-string buster is an addition for this port, not something the source repo
does — it becomes worthwhile precisely because there is no CDN purge step here.)*

---

## 8. Cost and performance, measured

| | |
|---|---|
| Tokens per image | **158** at low / 1536×1024 |
| Batch pricing | $15 / 1M output tokens (standard sync: $30) |
| Real run | 337 images → **$0.80**, **27 min**, 4 batch jobs, **0 failures** |
| Per image | **~$0.0024** |
| Background removal | 337 images → 0 failures at concurrency 8, ~1 credit + ~3 s each |
| PNG → WebP q92 | 929.6 MB → 63.8 MB (**14.6×**) |
| A 30-image set, end to end | **~$0.07**, ~40 minutes wall clock including removal and promotion |

Promotion is slower than it looks: 674 files took ~25 minutes of `sharp` encoding.
Node buffers stdout to a pipe, so a backgrounded run's log looks empty while it works —
watch the filesystem instead (`ls public/images/*.webp | wc -l`).

---

## 9. Gotcha checklist

Ordered by how likely each is to bite you.

1. **Skipping background removal fails silently** and leaves the page serving the old
   image. See §5. Verify with `git status --short public/images | grep -- -cutout`.
2. **Never run a large batch inside one long-lived process.** `submit` → `status` →
   `download` as separate invocations; persist the batch ids to disk.
3. **Every expensive failure is on the retrieval side, after the paid work.** Wrap every
   GET in retries; never blanket-retry a POST that creates work.
4. **Kie's rate limit is per account** (20 new generation requests / 10 s) and the
   excess is **not queued**. Client-side sliding-window limiter, 18/10 s.
5. **Kie needs a browser `User-Agent`** or Cloudflare answers `403 / error code: 1010`,
   which reads exactly like an auth failure.
6. **Kie takes a public URL only** — upload through its own endpoint first.
7. **Batch output cannot be buffered whole** (V8 caps strings at ~512 MB). Stream the
   JSONL; chunk the prompts.
8. **`gpt-image-2` has no transparent background.** `background: "transparent"` is a
   400; asking in the prompt paints a fake checkerboard. `output_format: "svg"` is also
   a 400.
9. **Filtering prompt ids by regex has bitten twice** — `^(c|cs)-` also matched
   `c-programming-…`. Filter on the `category` field, never on an id prefix alone.
10. **Bump `MANIFEST_VERSION`** when metadata semantics change; it forces a one-time
    re-measure of every entry.
11. **The manifest is one generated file** — concurrent branches conflict there. Take
    either side and re-run the build.
12. **Never leave both `<id>.png` and `<id>.webp` in a source directory** — they
    slugify to the same manifest key and collide.

---

## 10. Verification checklist

Run before committing image work.

```bash
npm run build:images     # must be a TRUE no-op on a clean tree
npx tsc --noEmit
npm run lint
npm run build
```

Plus these audits, which no test suite gives you for free:

```bash
# 1. Every <Figure slug> resolves to a manifest entry.
#    A slug with no image renders NOTHING in production — a silent missing image.
node -e '
const fs=require("fs"),path=require("path");const m=require("./lib/generated/images.js");const e=m.default||m;
let figs=0,bad=0;
(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);
  if(fs.statSync(p).isDirectory())walk(p);
  else if(f.endsWith(".mdx")||f.endsWith(".tsx")){
    for(const x of fs.readFileSync(p,"utf8").matchAll(/<Figure\b[^>]*slug="([^"]+)"/g)){
      figs++; if(!e[x[1]]){bad++;console.log("  unresolved",x[1],p);}}}}})("content");
console.log(figs+" figures, "+bad+" unresolved");'

# 2. Manifest vs disk: no missing served files, no strays.
node -e '
const m=require("./lib/generated/images.js");const e=m.default||m;const fs=require("fs");
const k=Object.keys(e);const miss=[];
for(const s of k)for(const f of e[s].formats)if(!fs.existsSync(`public/images/${s}.${f}`))miss.push(s+"."+f);
const stray=fs.readdirSync("public/images").filter(f=>{const s=f.replace(/\.[^.]+$/,""),x=f.split(".").pop();
  return !e[s]||!e[s].formats.includes(x);});
console.log(k.length+" entries, "+miss.length+" missing, "+stray.length+" stray");'

# 3. Prompts are 1:1 with the pages that need art.
node -e '
const j=require("./data/image-prompts.json");
const ids=j.prompts.map(p=>p.id);
const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
console.log(ids.length+" prompts, "+dup.length+" duplicate ids", dup.slice(0,5));'
```

**Make audit 1 a real test.** It is the guard that matters: in production an unresolved
slug renders nothing at all, so a typo ships an invisible image with a green build. If
you add an allowlist for pending slugs, keep it empty — a stale row whitelists a slug
that will never resolve.

---

## 11. Runbook

```bash
# ── 0. one-time
npm i sharp
echo "generated-images/" >> .gitignore

# ── 1. author prompts in data/image-prompts.json, then check the cost (no API calls)
node scripts/generate-images.mjs dry-run --only css-grid,flexbox

# ── 2. generate (Batch API). Three separate invocations, never one long process.
node scripts/generate-images.mjs submit --only css-grid,flexbox
node scripts/generate-images.mjs status            # repeat until "completed"
node scripts/generate-images.mjs download

# ── 3. background removal → writes <id>-cutout.png beside each original
node scripts/remove-background.mjs --concurrency 8

# ── 4. promote → WebP q92 into public/images + rebuild the manifest
node scripts/promote-images.mjs --all

# ── 5. verify, then commit images and manifest TOGETHER
git status --short public/images | grep -- -cutout    # cut-outs actually moved?
npm run build:images                                  # must be a no-op
git add public/images lib/generated/images.js data/image-prompts.json
git commit -m "Add generated illustrations for CSS layout pages"
```

**Waiting on a batch** — poll in the background, never chain a foreground `sleep`:

```bash
for i in $(seq 1 200); do
  out=$(node scripts/generate-images.mjs status 2>&1)
  if [ "$(echo "$out" | grep -cE 'validating|in_progress|finalizing')" -eq 0 ]; then
    echo "SETTLED"; echo "$out"; exit 0
  fi
  sleep 60
done
```

**Regenerating one image** (the id under the figure on the live page is the handle):

```bash
# edit that prompt's "subject" in data/image-prompts.json, then:
node scripts/generate-images.mjs submit --only css-grid
node scripts/generate-images.mjs status
node scripts/generate-images.mjs download --force
node scripts/remove-background.mjs --only css-grid --force   # ← NEVER skip
node scripts/promote-images.mjs css-grid
```

No re-wiring needed — the slug is unchanged, the manifest picks up the new hash, and
the commit is two WebP files plus one manifest line.

---

## Appendix A — `scripts/generate-images.mjs`

Disk-only adaptation. Batch (`submit`/`status`/`download`) plus a `sync` mode for
one-offs. A single-process `run` command is deliberately **not** included — see gotcha
2.

```js
#!/usr/bin/env node
/**
 * Batch-generate images with OpenAI's GPT Image 2.
 *
 * Reads prompt definitions from `data/image-prompts.json`, builds each prompt in
 * the house style, and writes one PNG per prompt named `<id>.png` into --out.
 *
 * Uses the OpenAI Batch API (~50% cheaper) at quality `low`. Prompts are chunked
 * into `--batch-size` jobs and every output file is parsed as a STREAM, never
 * buffered whole: images come back as inline base64 (~3.6 MB per image), so a
 * 1000-image batch would build a ~3.6 GB string and blow V8's ~512 MB cap.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs <command> [options]
 *
 * Commands:
 *   dry-run    print prompts, targets and projected cost; make no API calls
 *   submit     build + upload the JSONL batches and create them; prints the ids
 *   status     show batch status (--batch <id>, or every batch last submitted)
 *   download   download completed batches' images into --out
 *   sync       generate immediately, one request per prompt (bounded concurrency)
 *
 * Options:
 *   --out <dir>          Output directory (default: ./generated-images)
 *   --only <id[,id...]>  Only these prompt ids
 *   --category <cat>     Only this category
 *   --size <WxH>         Override the per-category size (1536x1024 | 1024x1536 | 1024x1024)
 *   --quality <q>        low | medium | high (default: low)
 *   --output-format <f>  png | webp | jpeg (default: png)
 *   --model <name>       Override the model (default: JSON meta.model)
 *   --batch-size <n>     Prompts per batch job (default: 100)
 *   --batch <id>         Target batch id for status / download
 *   --concurrency <n>    `sync` parallel requests (default: 3)
 *   --force              Overwrite existing images (default: skip present)
 *   -h, --help           Show this help
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = join(ROOT, "data", "image-prompts.json");
const API_BASE = "https://api.openai.com/v1";
const IMAGES_ENDPOINT = "/v1/images/generations";

const COMMANDS = new Set(["dry-run", "submit", "status", "download", "sync"]);
const SIZES = new Set(["1536x1024", "1024x1536", "1024x1024"]);

function parseArgs(argv) {
  const opts = {
    command: null,
    out: join(process.cwd(), "generated-images"),
    only: null,
    category: null,
    size: null,
    quality: "low", // ~7x cheaper than medium, ~28x cheaper than high
    outputFormat: "png",
    model: null,
    batchSize: 100,
    batch: null,
    concurrency: 3,
    force: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--out": opts.out = next(); break;
      case "--only": opts.only = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--category": opts.category = next(); break;
      case "--size": opts.size = next(); break;
      case "--quality": opts.quality = next(); break;
      case "--output-format": opts.outputFormat = next(); break;
      case "--model": opts.model = next(); break;
      case "--batch-size": opts.batchSize = Math.max(1, Number(next()) || 100); break;
      case "--batch": opts.batch = next(); break;
      case "--concurrency": opts.concurrency = Math.max(1, Number(next()) || 1); break;
      case "--force": opts.force = true; break;
      case "-h": case "--help": opts.help = true; break;
      default:
        if (!a.startsWith("-") && opts.command === null && COMMANDS.has(a)) opts.command = a;
        else { console.error(`Unknown argument: ${a}`); process.exit(1); }
    }
  }
  return opts;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(
    src.slice(src.indexOf("/**"), src.indexOf("*/") + 2)
      .replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "").trim(),
  );
}

// ── Prompt building (keep byte-identical to lib/imagePrompt.ts) ──────────────
export function buildPrompt(spec, colors, defaultStyle) {
  const style = (spec.style && spec.style.trim()) || defaultStyle;
  const article = /^[aeiou]/i.test(style) ? "An" : "A";
  return (
    `${article} ${style} of ${spec.subject}. No text.\n\n` +
    `Blue: ${colors.blue}\n` +
    `Green: ${colors.green}\n` +
    `Red: ${colors.red}\n` +
    `Yellow: ${colors.yellow}`
  );
}

// ── Cost estimation ─────────────────────────────────────────────────────────
// Image output tokens per request, measured against gpt-image-2 on 2026-07-28.
const COST_TOKENS = {
  "1024x1024/low": 196, "1024x1024/medium": 1372, "1024x1024/high": 5488,
  "1536x1024/low": 158, "1536x1024/medium": 1372, "1536x1024/high": 5488,
  "1024x1536/low": 158, "1024x1536/medium": 1372, "1024x1536/high": 5488,
};
const USD_PER_MTOK = { batch: 15, sync: 30 };

function describeCost(entries, opts, mode) {
  let tokens = 0;
  for (const e of entries) {
    const t = COST_TOKENS[`${opts.size || e.size}/${opts.quality}`];
    if (t === undefined) return `cost not estimable at quality "${opts.quality}"`;
    tokens += t;
  }
  return `~$${((tokens * USD_PER_MTOK[mode]) / 1e6).toFixed(2)} projected (${mode} pricing)`;
}

const outputExt = (opts) => (opts.outputFormat === "jpeg" ? "jpg" : opts.outputFormat);

function requestBody(entry, opts, model) {
  const body = { model, prompt: entry.prompt, size: opts.size || entry.size, n: 1 };
  if (opts.quality) body.quality = opts.quality;
  if (opts.outputFormat !== "png") body.output_format = opts.outputFormat;
  return body;
}

// ── OpenAI helpers ──────────────────────────────────────────────────────────
function requireKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.error("OPENAI_API_KEY is not set."); process.exit(1); }
  return key;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/**
 * One OpenAI API call. `retries` defaults to 0 and is opted into PER CALL SITE,
 * deliberately: this helper also creates batches and submits generations, and
 * silently re-sending one of those would duplicate work and double the bill.
 * Only idempotent GETs pass a retry count.
 */
async function api(path, { method = "GET", key, json, form, retries = 0 } = {}) {
  const headers = { Authorization: `Bearer ${key}` };
  let body;
  if (json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(json); }
  else if (form !== undefined) body = form; // fetch sets the multipart boundary

  for (let attempt = 0; ; attempt++) {
    let res, networkErr;
    try { res = await fetch(`${API_BASE}${path}`, { method, headers, body }); }
    catch (err) { networkErr = err; } // DNS, TLS, socket reset — retryable like a 5xx
    if (res?.ok) return res;

    const transient = networkErr !== undefined || RETRY_STATUS.has(res?.status);
    if (!transient || attempt >= retries) {
      if (networkErr) throw networkErr;
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ` - ${detail}` : ""}`);
    }
    const waitMs = Math.min(32_000, 2_000 * 2 ** attempt);
    console.error(`  … ${method} ${path} failed; retry ${attempt + 1}/${retries} in ${waitMs / 1000}s`);
    await sleep(waitMs);
  }
}

const BATCH_STATE_FILE = (out) => join(out, "last-batch.json");

// ── Entry selection ─────────────────────────────────────────────────────────
function selectEntries(data, opts) {
  const { meta } = data;
  let prompts = data.prompts;
  if (opts.only) prompts = prompts.filter((p) => opts.only.includes(p.id));
  if (opts.category) prompts = prompts.filter((p) => p.category === opts.category);
  if (!prompts.length) { console.error("No prompts matched the filters."); process.exit(1); }
  return prompts.map((p) => ({
    id: p.id,
    size: (meta.sizes && meta.sizes[p.category]) || "1536x1024",
    prompt: buildPrompt(p, meta.brandColors, meta.defaultStyle || "isometric illustration"),
  }));
}

function chunk(entries, size) {
  const out = [];
  for (let i = 0; i < entries.length; i += size) out.push(entries.slice(i, i + size));
  return out;
}

function decodeImage(respBody) {
  const b64 = respBody?.data?.[0]?.b64_json;
  if (!b64) throw new Error("response contained no image data (b64_json)");
  return Buffer.from(b64, "base64");
}

// ── Commands ────────────────────────────────────────────────────────────────
function cmdDryRun(entries, opts) {
  const ext = outputExt(opts);
  console.log(
    `[dry-run] ${entries.length} prompt(s) · quality ${opts.quality} · ${ext} · ` +
      `${chunk(entries, opts.batchSize).length} batch job(s)\n          ` +
      `${describeCost(entries, opts, "batch")}\n`,
  );
  for (const e of entries) {
    console.log(`── ${e.id}.${ext}  (${opts.size || e.size})`);
    console.log(e.prompt.replace(/^/gm, "   "));
    console.log();
  }
}

async function submitChunk(entries, opts, model, key, label) {
  const jsonl = entries
    .map((e) => JSON.stringify({
      custom_id: e.id, method: "POST", url: IMAGES_ENDPOINT, body: requestBody(e, opts, model),
    }))
    .join("\n");

  const form = new FormData();
  form.append("purpose", "batch");
  form.append("file", new Blob([jsonl], { type: "application/jsonl" }), "image-batch.jsonl");
  const file = await (await api("/files", { method: "POST", key, form })).json();

  const batch = await (await api("/batches", {
    method: "POST", key,
    json: { input_file_id: file.id, endpoint: IMAGES_ENDPOINT, completion_window: "24h" },
  })).json();
  console.log(`  ${label} → batch ${batch.id} (${entries.length} requests, ${batch.status})`);
  return batch;
}

function saveBatchState(opts, model, batches, total) {
  mkdirSync(opts.out, { recursive: true });
  writeFileSync(
    BATCH_STATE_FILE(opts.out),
    JSON.stringify({ model, count: total, batchIds: batches.map((b) => b.id) }, null, 2),
  );
}

async function cmdSubmit(entries, opts, model, key) {
  const chunks = chunk(entries, opts.batchSize);
  console.log(`Submitting ${entries.length} prompt(s) across ${chunks.length} batch job(s)…`);
  const batches = [];
  for (const [i, c] of chunks.entries()) {
    batches.push(await submitChunk(c, opts, model, key, `[${i + 1}/${chunks.length}]`));
    saveBatchState(opts, model, batches, entries.length);
  }
  console.log(`\nTrack with:  node scripts/generate-images.mjs status --out ${opts.out}`);
}

function resolveBatchIds(opts) {
  if (opts.batch) return [opts.batch];
  const stateFile = BATCH_STATE_FILE(opts.out);
  if (existsSync(stateFile)) {
    const ids = JSON.parse(readFileSync(stateFile, "utf8")).batchIds || [];
    if (ids.length) return ids;
  }
  console.error("No --batch id given and no last-batch.json in --out.");
  process.exit(1);
}

// Polled for the life of a run; one transient 5xx must not end it.
const retrieveBatch = async (id, key) => (await api(`/batches/${id}`, { key, retries: 5 })).json();

async function cmdStatus(opts, key) {
  for (const id of resolveBatchIds(opts)) {
    const b = await retrieveBatch(id, key);
    const c = b.request_counts || {};
    console.log(`Batch ${b.id}: ${b.status} · ${c.completed ?? 0}/${c.total ?? "?"} done, ${c.failed ?? 0} failed`);
  }
}

/**
 * Yield an output file's JSONL rows one line at a time. Batch image output
 * embeds each PNG as base64, so these files run to gigabytes; res.text() would
 * exceed V8's ~512 MB max string length.
 */
async function* streamFileLines(fileId, key) {
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

async function downloadBatch(b, opts, key) {
  if (b.status !== "completed") { console.error(`  ! batch ${b.id} is ${b.status}, skipping`); return { ok: 0, failed: 0 }; }
  if (b.error_file_id) {
    for await (const line of streamFileLines(b.error_file_id, key)) {
      const row = JSON.parse(line);
      console.error(`  ! ${row.custom_id}: ${row.response?.body?.error?.message || "request errored"}`);
    }
  }
  if (!b.output_file_id) { console.error(`  ! batch ${b.id} has no output file`); return { ok: 0, failed: 0 }; }

  const ext = outputExt(opts);
  let ok = 0, failed = 0;
  for await (const line of streamFileLines(b.output_file_id, key)) {
    const row = JSON.parse(line);
    if (row.error || row.response?.status_code !== 200) {
      failed++;
      console.error(`  ✗ ${row.custom_id}: ${row.error?.message || row.response?.body?.error?.message || "unknown error"}`);
      continue;
    }
    const dest = join(opts.out, `${row.custom_id}.${ext}`);
    if (!opts.force && existsSync(dest)) { console.log(`  • skip ${row.custom_id} (exists; use --force)`); continue; }
    try {
      writeFileSync(dest, decodeImage(row.response.body));
      ok++;
      console.log(`  ✓ ${row.custom_id}.${ext}`);
    } catch (err) { failed++; console.error(`  ✗ ${row.custom_id}: ${err.message}`); }
  }
  return { ok, failed };
}

async function cmdDownload(opts, key) {
  mkdirSync(opts.out, { recursive: true });
  const batches = await Promise.all(resolveBatchIds(opts).map((id) => retrieveBatch(id, key)));
  let ok = 0, failed = 0;
  for (const b of batches) { const r = await downloadBatch(b, opts, key); ok += r.ok; failed += r.failed; }
  console.log(`\nDone: ${ok} written, ${failed} failed. Output in ${opts.out}`);
  if (failed) process.exitCode = 1;
}

async function cmdSync(entries, opts, model, key) {
  mkdirSync(opts.out, { recursive: true });
  const ext = outputExt(opts);
  const todo = entries.filter((e) => {
    if (!opts.force && existsSync(join(opts.out, `${e.id}.${ext}`))) {
      console.log(`  • skip ${e.id} (exists; use --force)`);
      return false;
    }
    return true;
  });
  if (!todo.length) return console.log("Nothing to generate.");

  let i = 0, ok = 0, failed = 0;
  async function worker() {
    while (i < todo.length) {
      const e = todo[i++];
      try {
        const res = await api(IMAGES_ENDPOINT, { method: "POST", key, json: requestBody(e, opts, model) });
        writeFileSync(join(opts.out, `${e.id}.${ext}`), decodeImage(await res.json()));
        ok++; console.log(`  ✓ ${e.id}.${ext}`);
      } catch (err) { failed++; console.error(`  ✗ ${e.id}: ${err.message}`); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.concurrency, todo.length) }, worker));
  console.log(`\nDone: ${ok} generated, ${failed} failed. Output in ${opts.out}`);
  if (failed) process.exitCode = 1;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.command) return printHelp();

  if (!["png", "webp", "jpeg"].includes(opts.outputFormat)) {
    console.error(`Unsupported --output-format "${opts.outputFormat}". Use png, webp, or jpeg.`);
    process.exit(1);
  }
  if (!["low", "medium", "high"].includes(opts.quality)) {
    // "auto" is rejected on purpose: it picks its own tier per prompt, costing
    // ~2x low with no control.
    console.error(`Unsupported --quality "${opts.quality}". Use low, medium, or high.`);
    process.exit(1);
  }
  if (opts.size && !SIZES.has(opts.size)) {
    console.error(`Unsupported --size "${opts.size}". Use ${[...SIZES].join(", ")}.`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const model = opts.model || data.meta.model;

  if (opts.command === "status") return cmdStatus(opts, requireKey());
  if (opts.command === "download") return cmdDownload(opts, requireKey());

  const entries = selectEntries(data, opts);
  if (opts.command === "dry-run") return cmdDryRun(entries, opts);

  const mode = opts.command === "sync" ? "sync" : "batch";
  console.log(
    `${entries.length} prompt(s) · model ${model} · quality ${opts.quality} · ` +
      `${outputExt(opts)} · out ${opts.out}\n${describeCost(entries, opts, mode)}\n`,
  );
  const key = requireKey();
  if (opts.command === "sync") return cmdSync(entries, opts, model, key);
  if (opts.command === "submit") return cmdSubmit(entries, opts, model, key);
}

// Only drive the CLI when executed directly, so tests can import buildPrompt.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
```

---

## Appendix B — `scripts/remove-background.mjs`

```js
#!/usr/bin/env node
/**
 * Remove the background from generated images with Recraft's `remove-background`,
 * served through Kie AI. Reads `<id>.png` from --from and writes `<id>-cutout.png`
 * beside it.
 *
 * Three Kie API details this script exists to encapsulate:
 *   1. The model input takes a PUBLIC URL only — no base64, no data URI. Each image
 *      is pushed through Kie's own upload endpoint first (free, auto-deleted after
 *      24h) and the returned `downloadUrl` is handed to the model.
 *   2. Both Kie hosts sit behind Cloudflare and answer a request with no browser
 *      `User-Agent` with a bare 403 and `error code: 1010`. It reads exactly like
 *      an auth failure and is not.
 *   3. Kie caps an account at 20 new generation requests per 10 seconds and rejects
 *      the excess with 429 WITHOUT queueing it. A shared sliding-window limiter
 *      admits createTask at 18 per 10s so --concurrency can be raised freely, and a
 *      429 waits out a full window rather than the usual short backoff.
 *
 * Usage:
 *   KIE_API_KEY=... node scripts/remove-background.mjs [options]
 *
 * Options:
 *   --from <dir>       Source directory (default: ./generated-images)
 *   --only <id[,id..]> Only these ids
 *   --concurrency <n>  Parallel jobs (default: 4)
 *   --force            Redo images whose cut-out already exists
 *   -h, --help         Show this help
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KIE_UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload";
const KIE_CREATE = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_STATUS = "https://api.kie.ai/api/v1/jobs/recordInfo";
const MODEL = "recraft/remove-background";
// Cloudflare in front of both Kie hosts rejects a UA-less request with
// 403 "error code: 1010"; any ordinary browser UA satisfies it.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
export const CUTOUT_SUFFIX = "-cutout";

function parseArgs(argv) {
  const opts = { from: join(process.cwd(), "generated-images"), only: null, concurrency: 4, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--from": opts.from = next(); break;
      case "--only": opts.only = next().split(",").map((x) => x.trim()).filter(Boolean); break;
      case "--concurrency": opts.concurrency = Math.max(1, Number(next()) || 4); break;
      case "--force": opts.force = true; break;
      case "-h": case "--help": opts.help = true; break;
      default: console.error(`Unknown argument: ${a}`); process.exit(1);
    }
  }
  return opts;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(src.slice(src.indexOf("/**"), src.indexOf("*/") + 2).replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "").trim());
}

function requireKey() {
  const key = process.env.KIE_API_KEY;
  if (!key) { console.error("KIE_API_KEY is not set."); process.exit(1); }
  return key;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Kie enforces, per account, 20 new generation requests per 10 seconds. Excess
// requests are rejected with 429 and are NOT queued, so the limit has to be
// respected client-side rather than discovered.
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 18; // a little under 20, so a burst can't race past the limit

/** Sliding-window limiter, shared across workers so raising --concurrency
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
        if (stamps.length < max) { stamps.push(now); return; }
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
 * The finished image is served from Kie's CDN rather than its API, and a bare
 * fetch there is exactly where a run gets lost: the generation has already
 * succeeded and been billed. Eight of forty-four images failed this way before
 * it was wrapped.
 */
async function fetchBinary(url, label) {
  let lastDetail = "";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res, networkErr;
    try { res = await fetch(url, { headers: { "User-Agent": UA } }); }
    catch (err) { networkErr = err; }
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
    let res, networkErr;
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
    } catch (err) { networkErr = err; }
    if (res?.ok) return res.json();

    const detail = networkErr ? networkErr.message : await res.text().catch(() => "");
    lastDetail = networkErr ? detail : `${res.status} ${detail.slice(0, 300)}`;
    const transient = networkErr !== undefined || RETRY_STATUS.has(res?.status);
    if (!transient || attempt === MAX_ATTEMPTS - 1) break;

    // A 429 means the window is already full; wait out a whole window rather
    // than the usual short backoff, since the request was rejected, not queued.
    const waitMs = res?.status === 429 ? RATE_WINDOW_MS : Math.min(16_000, 500 * 2 ** attempt);
    await sleep(waitMs);
  }
  throw new Error(`Kie ${method} ${new URL(url).pathname} → ${lastDetail}`);
}

/** Upload → createTask → poll → return the finished PNG bytes. */
export async function removeBackground(buf, fileName, key) {
  const up = await kie(KIE_UPLOAD, {
    key, method: "POST",
    json: {
      base64Data: `data:image/png;base64,${buf.toString("base64")}`,
      uploadPath: "images/generated",
      fileName,
    },
  });
  const imageUrl = up?.data?.downloadUrl;
  if (!imageUrl) throw new Error(`upload returned no downloadUrl: ${JSON.stringify(up).slice(0, 200)}`);

  await admitGeneration();
  const created = await kie(KIE_CREATE, {
    key, method: "POST",
    json: { model: MODEL, input: { image: imageUrl } },
  });
  const taskId = created?.data?.taskId;
  if (!taskId) throw new Error(`createTask returned no taskId: ${JSON.stringify(created).slice(0, 200)}`);

  for (let i = 0; i < 100; i++) {
    await sleep(3000);
    const info = await kie(`${KIE_STATUS}?taskId=${encodeURIComponent(taskId)}`, { key });
    const d = info?.data ?? {};
    if (d.state === "success") {
      // resultJson is a JSON *string*, not an object.
      const url = JSON.parse(d.resultJson).resultUrls[0];
      return fetchBinary(url, "result download");
    }
    if (d.state === "fail") throw new Error(`${d.failMsg || "failed"} (code ${d.failCode ?? "?"})`);
  }
  throw new Error("timed out waiting for the task");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();
  const key = requireKey();

  const dir = opts.from;
  if (!existsSync(dir)) { console.error(`Source directory not found: ${dir}`); process.exit(1); }

  let ids = readdirSync(dir)
    .filter((f) => /\.png$/i.test(f))
    .map((f) => basename(f, extname(f)))
    .filter((s) => !s.endsWith(CUTOUT_SUFFIX))
    .sort();
  if (opts.only) ids = ids.filter((id) => opts.only.includes(id));
  if (!ids.length) { console.error(`No originals found in ${dir}`); process.exit(1); }

  const todo = ids.filter((id) => {
    if (!opts.force && existsSync(join(dir, `${id}${CUTOUT_SUFFIX}.png`))) {
      console.log(`  • skip ${id} (cut-out exists; use --force)`);
      return false;
    }
    return true;
  });
  if (!todo.length) return console.log("Nothing to do.");

  console.log(`Removing background from ${todo.length} image(s) in ${dir}\n`);
  let i = 0, ok = 0, failed = 0;
  async function worker() {
    while (i < todo.length) {
      const id = todo[i++];
      try {
        const cut = await removeBackground(readFileSync(join(dir, `${id}.png`)), `${id}.png`, key);
        writeFileSync(join(dir, `${id}${CUTOUT_SUFFIX}.png`), cut);
        ok++;
        console.log(`  ✓ ${id}${CUTOUT_SUFFIX}.png (${(cut.length / 1e6).toFixed(2)}MB)`);
      } catch (err) { failed++; console.error(`  ✗ ${id}: ${err.message}`); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.concurrency, todo.length) }, worker));
  console.log(`\nDone: ${ok} removed, ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => { console.error(err.message || err); process.exit(1); });
}
```

---

## Appendix C — `scripts/promote-images.mjs`

```js
#!/usr/bin/env node
/**
 * Promote chosen candidates into the repository: encode to WebP q92 straight
 * into `public/images/`, the files the site serves, then rebuild the manifest.
 *
 * Why WebP, and why this writes the served file directly:
 *   A 1536x1024 image is ~1.4 MB as PNG and ~130 kB as WebP — an 11x reduction
 *   that holds for alpha cut-outs too. And routing it through a second encoder
 *   later is a double lossy pass: measured, promote-q92 → build-q80 lands at
 *   35.58 dB PSNR against the PNG original while a single q80 encode is 37.41 dB.
 *   The second pass costs ~1.8 dB to save ~3 kB.
 *
 * Because the promoted file IS the artifact, --quality is the quality users
 * actually see; it defaults to 92 rather than a serving-oriented 80.
 *
 * Usage:
 *   node scripts/promote-images.mjs <ids...> [options]
 *   node scripts/promote-images.mjs --all
 *
 * A `-cutout` suffix is promoted alongside its original automatically.
 *
 * Options:
 *   --from <dir>    Candidate directory (default: ./generated-images)
 *   --all           Promote every candidate found
 *   --quality <n>   WebP quality of the served image (default: 92)
 *   --no-cutout     Promote only the original, not its background-removed pair
 *   --no-build      Skip the manifest rebuild afterwards
 *   --dry-run       Report what would be promoted; write nothing
 *   -h, --help      Show this help
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
// Promotion writes the *served* file directly. There is deliberately no source
// copy elsewhere: that would put every image in git twice and add a second
// lossy encode.
const OUT_DIR = join(ROOT, "public", "images");
export const CUTOUT_SUFFIX = "-cutout";

function parseArgs(argv) {
  const opts = {
    ids: [], from: join(process.cwd(), "generated-images"),
    all: false, quality: 92, cutout: true, build: true, dryRun: false, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--from": opts.from = next(); break;
      case "--all": opts.all = true; break;
      case "--quality": opts.quality = Math.min(100, Math.max(1, Number(next()) || 92)); break;
      case "--no-cutout": opts.cutout = false; break;
      case "--no-build": opts.build = false; break;
      case "--dry-run": opts.dryRun = true; break;
      case "-h": case "--help": opts.help = true; break;
      default:
        if (a.startsWith("-")) { console.error(`Unknown argument: ${a}`); process.exit(1); }
        opts.ids.push(a);
    }
  }
  return opts;
}

function printHelp() {
  const src = readFileSync(fileURLToPath(import.meta.url), "utf8");
  console.log(src.slice(src.indexOf("/**"), src.indexOf("*/") + 2).replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "").trim());
}

/**
 * Convert one image buffer to the committed WebP.
 * `nearLossless` is not used: these are photographic-ish raster renders, so
 * plain high-quality WebP is both smaller and visually equivalent.
 */
export async function toWebp(buf, quality) {
  return sharp(buf).webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || (!opts.ids.length && !opts.all)) return printHelp();

  const dir = opts.from;
  if (!existsSync(dir)) { console.error(`Source directory not found: ${dir}`); process.exit(1); }
  const names = readdirSync(dir).filter((f) => /\.(png|webp)$/i.test(f));
  const stemOf = (f) => basename(f, extname(f));
  const has = (stem) => names.some((f) => stemOf(f) === stem);
  const read = (stem) => readFileSync(join(dir, names.find((f) => stemOf(f) === stem)));

  const ids = opts.all ? [...new Set(names.map(stemOf).filter((s) => !s.endsWith(CUTOUT_SUFFIX)))].sort() : opts.ids;
  if (!ids.length) { console.error(`No candidates found in ${dir}`); process.exit(1); }

  // Each id promotes its original plus, unless suppressed, its cut-out pair.
  const stems = [];
  for (const id of ids) {
    stems.push(id);
    if (opts.cutout) {
      if (has(`${id}${CUTOUT_SUFFIX}`)) stems.push(`${id}${CUTOUT_SUFFIX}`);
      // The silent-stale trap: no cut-out in this run, but one already served.
      else if (existsSync(join(OUT_DIR, `${id}${CUTOUT_SUFFIX}.webp`))) {
        console.error(
          `  ! ${id}: no cut-out in ${dir}, but public/images/${id}${CUTOUT_SUFFIX}.webp exists.\n` +
          `    Pages referencing "${id}${CUTOUT_SUFFIX}" will keep serving the OLD image.\n` +
          `    Run: node scripts/remove-background.mjs --only ${id} --force`,
        );
      }
    }
  }

  console.log(`Promoting ${stems.length} image(s) from ${dir} → public/images (webp q${opts.quality})${opts.dryRun ? " [dry-run]" : ""}\n`);
  if (!opts.dryRun) mkdirSync(OUT_DIR, { recursive: true });

  let promoted = 0, before = 0, after = 0;
  for (const stem of stems) {
    if (!has(stem)) { console.error(`  ✗ ${stem}: not found in source`); continue; }
    const raw = read(stem);
    const webp = await toWebp(raw, opts.quality);
    before += raw.length; after += webp.length;
    if (!opts.dryRun) writeFileSync(join(OUT_DIR, `${stem}.webp`), webp);
    promoted++;
    console.log(`  ✓ ${stem}.webp  ${(raw.length / 1e6).toFixed(2)}MB → ${(webp.length / 1e6).toFixed(2)}MB`);
  }
  console.log(
    `\n${promoted} promoted · ${(before / 1e6).toFixed(1)}MB → ${(after / 1e6).toFixed(1)}MB ` +
      `(${after ? (before / after).toFixed(1) : "1.0"}x smaller)`,
  );

  if (opts.dryRun) return;
  if (!opts.build) return console.log("Skipped the manifest rebuild (--no-build); run `npm run build:images`.");
  console.log("\nRebuilding the image manifest…");
  execFileSync(process.execPath, [join(ROOT, "scripts", "build-image-manifest.mjs")], { stdio: "inherit" });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => { console.error(err.message || err); process.exit(1); });
}
```

---

## Appendix D — `scripts/build-image-manifest.mjs`

```js
#!/usr/bin/env node
/**
 * Record every committed image in `public/images/` into `lib/generated/images.js`
 * so pages can set intrinsic width/height (no CLS) without importing the file.
 *
 * These bytes are NEVER re-encoded: promotion already produced the exact bytes to
 * serve, and a second lossy pass costs ~1.8 dB PSNR to save ~3 kB. This script
 * only reads dimensions.
 *
 * Incremental and idempotent: an entry whose content hash is unchanged is reused
 * without touching sharp, and the manifest file is only rewritten when it actually
 * changed — so this stays a true no-op (and produces no git diff) on a clean tree,
 * which is what makes it safe on `dev` / `build` / `postinstall`.
 *
 * Bump MANIFEST_VERSION to invalidate every cached hash.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const IMAGES_DIR = join(ROOT, "public", "images");
const MANIFEST_FILE = join(ROOT, "lib", "generated", "images.js");
const MANIFEST_VERSION = "1";

/** Read the previous manifest so unchanged images can be skipped. It is an ES
 *  module this script wrote, so the JSON literal is pulled out by regex rather
 *  than import()-ed. Absent or unparseable → treat everything as new. */
function loadPrior() {
  if (!existsSync(MANIFEST_FILE)) return {};
  try {
    const m = readFileSync(MANIFEST_FILE, "utf8").match(/export default\s*(\{[\s\S]*\})\s*;?\s*$/);
    return m ? JSON.parse(m[1]) : {};
  } catch { return {}; }
}

function render(manifest) {
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  return (
    "// GENERATED by scripts/build-image-manifest.mjs, do not edit by hand.\n" +
    "// Committed; rebuilt from public/images/*.webp.\n" +
    `export default ${JSON.stringify(sorted, null, 2)};\n`
  );
}

async function main() {
  mkdirSync(IMAGES_DIR, { recursive: true });
  mkdirSync(dirname(MANIFEST_FILE), { recursive: true });

  const prior = loadPrior();
  const manifest = {};
  let measured = 0, cached = 0;

  // sharp is loaded lazily so the "nothing changed" path never touches the binary.
  let sharp = null;
  const ensureSharp = async () => (sharp ??= (await import("sharp")).default);

  for (const file of readdirSync(IMAGES_DIR)) {
    if (extname(file).toLowerCase() !== ".webp") continue;
    const slug = file.replace(/\.webp$/i, "");
    const buf = readFileSync(join(IMAGES_DIR, file));
    const hash = createHash("sha256").update(MANIFEST_VERSION).update(buf).digest("hex");

    if (prior[slug]?.hash === hash) { manifest[slug] = prior[slug]; cached++; continue; }

    const meta = await (await ensureSharp())(buf).metadata();
    manifest[slug] = { hash, width: meta.width, height: meta.height, formats: ["webp"] };
    measured++;
  }

  // Rewrite only when it changed, so the script stays a true no-op.
  const next = render(manifest);
  const current = existsSync(MANIFEST_FILE) ? readFileSync(MANIFEST_FILE, "utf8") : null;
  if (next !== current) writeFileSync(MANIFEST_FILE, next);

  console.log(`build-image-manifest: ${measured} measured, ${cached} cached (${Object.keys(manifest).length} image(s))`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
```

---

## Appendix E — wiring

`package.json`:

```jsonc
{
  "scripts": {
    "dev":   "node scripts/build-image-manifest.mjs && next dev",
    "build": "node scripts/build-image-manifest.mjs && next build",
    "build:images": "node scripts/build-image-manifest.mjs",
    "postinstall": "node scripts/build-image-manifest.mjs"
  },
  "dependencies": { "sharp": "^0.34.0" }
}
```

`.gitignore`:

```gitignore
# GPT Image 2 output from scripts/generate-images.mjs — candidates only.
# Only the promoted public/images/*.webp is committed.
generated-images/
```

**Do not gitignore `lib/generated/images.js` or `public/images/`.** Both are
deliberately committed — that is what makes a deploy zero-work.

Files added, in total:

| Path | Committed | Role |
|---|---|---|
| `data/image-prompts.json` | ✅ | prompt source of truth |
| `lib/imagePrompt.ts` | ✅ | shared prompt template |
| `scripts/generate-images.mjs` | ✅ | step 2 |
| `scripts/remove-background.mjs` | ✅ | step 3 |
| `scripts/promote-images.mjs` | ✅ | step 4 |
| `scripts/build-image-manifest.mjs` | ✅ | manifest |
| `components/Figure.tsx` | ✅ | step 5 |
| `lib/generated/images.js` | ✅ (generated) | slug → dimensions |
| `public/images/*.webp` | ✅ | **the served bytes** |
| `generated-images/` | ❌ gitignored | raw candidates |

---

## Appendix F — what changed from the source pipeline

| | Source repo (`dataslope`) | This port |
|---|---|---|
| Candidate storage | Cloudflare R2, run-scoped keys `illustrations/<runId>/<id>/v<n>/{original,cutout}.png`, 14-day lifecycle rule | local `generated-images/`, gitignored |
| Credentials | `OPENAI_API_KEY`, `KIE_API_KEY`, 4 × `R2_*` | `OPENAI_API_KEY`, `KIE_API_KEY` |
| `--sink` / `--from` / `--run` / `--variant` flags | present | removed — disk is the only store |
| SigV4 S3 client (`scripts/lib/r2.mjs`) | ~250 lines, hand-rolled | not needed |
| Re-promote at another quality | free, while candidates live in R2 | only while `generated-images/` is still on disk |
| Two classes of image (pipeline + raster sources) | supported; `build-images.mjs` encodes raster sources too | simplified to pipeline-only; add the second class back if you need photos/screenshots |
| Single-process `run` command | present but discouraged | removed |
| `promote` stale-cut-out warning | open item, not built | **built in** (Appendix C) |
| Cache-busting query string | not used | suggested (§7) |

Everything else — the prompt template, `quality: low`, `1536x1024`, the Batch API
shape, Recraft via Kie, WebP q92, the committed manifest, the single-encode rule — is
carried over unchanged, because each was arrived at by measurement.
