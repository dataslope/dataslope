# Image-Generation Workflow — Tabbied Showcase Sites & Product Mockups

**Date:** 2026-07-30
**Source:** the illustration pipeline in `dataslope/dataslope`, generalised
**Target:** the Tabbied repo (tabbied.com) — sample showcase websites and product
mockups for a css-doodle pattern library. **No R2**: generated WebP files are committed
to git and served straight out of `public/`.

> This document is self-contained. It is written to be implemented from scratch in a
> different repository: every API call, every parameter, every measured number, and
> complete drop-in scripts are here.
>
> **Claim hygiene.** The source pipeline generated ~800 production images, so some
> numbers here are measured. Others are recommendations for *this* use case, which is
> different in three ways that matter (many palettes, many styles, photographic
> content). Measured claims say **measured**; the rest are marked **recommended** and
> should be confirmed on your first batch.
>
> **Verification status of the appendix scripts.** All five were run in a scratch repo:
> the resolution cascade, prompt rendering, cost estimation, filtering, argument
> validation, `--help`, WebP q92 encoding, the missing-cut-out guard, and the manifest's
> incremental/no-op behaviour. The paths that spend money — OpenAI Batch calls, Kie job
> calls — were **not** executed; they are transcribed unchanged from the pipeline that
> ran ~800 images through them.

---

## 1. What the workflow does

```
  data/image-prompts.json        ← 1. author the PROJECT (palette + style), then its prompts
            │
            ▼  scripts/generate-images.mjs      (OpenAI Batch API, gpt-image-2)
  generated-images/<id>.png      ← 2. candidates, gitignored, local scratch
            │
            ├───────────────── cutout: false ──────────────┐   (a scene: hero photo,
            │                                              │    interior, landscape)
            ▼  scripts/remove-background.mjs               │
  generated-images/<id>-cutout.png  ← 3. only for cutout: true
            │    (an object: product, portrait, prop)      │
            ▼                                              ▼
            └──────────► scripts/promote-images.mjs  (sharp → WebP q92)
  public/images/<id>[-cutout].webp  ← 4. COMMITTED. This file IS what browsers download.
  lib/generated/images.js           ←    manifest: slug → {hash, width, height}
            │
            ▼
  <Figure slug="…" />               ← 5. rendered by the app, composited over a Tabbied pattern
```

Two properties define the pipeline:

- **An image is encoded exactly once and exists in git exactly once.** The promoted WebP
  is the served byte stream — no build-time re-encode, no source copy, no second lossy
  pass.
- **Background removal is per-image, not global.** Whether an image gets a cut-out is a
  property of the *prompt*, declared in the JSON, and it drives every downstream step.

### Why each step exists

| Step | Why it can't be skipped or merged |
|---|---|
| Project + prompt in JSON | One source of truth for the palette, the style, and the removal flag. A palette that lives in two places has already drifted. |
| Generate | `gpt-image-2` via the Batch API at half price. |
| Background removal | `gpt-image-2` **cannot** emit transparency. It is always a separate model call — and only for images that need it. |
| WebP q92 | PNG is ~11–15× larger (**measured**). Committing PNG puts gigabytes in git per thousand images. |
| Manifest | The page needs intrinsic `width`/`height` to reserve layout space (no CLS) without shipping or decoding the file at build time. |

---

## 2. Prerequisites

```bash
node --version   # 20+ (native fetch, FormData, Blob, web streams)
npm i sharp      # the only runtime dependency the pipeline adds
```

| Variable | Used by | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | step 2 (generation) | platform.openai.com |
| `KIE_API_KEY` | step 3 (background removal) | kie.ai |

No cloud-storage credentials. Candidates live in a gitignored local directory:

```gitignore
# scratch: raw model output. Only the promoted WebP is committed.
generated-images/
```

---

## 3. Author the project, then its prompts

This is the section that differs most from the source pipeline. There, one repo had one
house style and one four-colour brand palette forever. Here, **every showcase site and
every product mockup is its own visual world** — its own palette, its own style, its own
media mix — and there will be many of them.

The structure that makes that manageable: **a project record holds everything shared, a
prompt holds only what is specific to one image.** A prompt that repeats its project's
palette is a bug waiting to happen.

### 3.1 The data file

`data/image-prompts.json`:

```jsonc
{
  "meta": {
    "model": "gpt-image-2",
    "defaults": { "size": "1536x1024", "quality": "low", "paletteMode": "hex", "cutout": false }
  },

  // ── One record per showcase site / mockup series. Everything shared lives here.
  "projects": {
    "northwind-architects": {
      "title": "Northwind Architects — sample site",
      "style": "editorial architectural photograph",
      "paletteMode": "scene",
      "palette": {
        "Ink":   { "hex": "#1c1c1a", "as": "window frames, railings, and deep shadow" },
        "Sand":  { "hex": "#e8dfd2", "as": "plaster walls and poured concrete" },
        "Clay":  { "hex": "#b8674a", "as": "terracotta brick and clay planters" },
        "Sage":  { "hex": "#8a9a7b", "as": "planting and upholstery" }
      },
      "quality": "medium",
      "cutout": false
    },

    "lumen-cosmetics": {
      "title": "Lumen Cosmetics — product mockups",
      "style": "product photograph",
      "paletteMode": "scene",
      "palette": {
        "Blush": { "hex": "#e8b4b8", "as": "packaging and powder" },
        "Ink":   { "hex": "#171512", "as": "caps, type plates, and shadow" },
        "Gold":  { "hex": "#c9a227", "as": "trim and foil" }
      },
      "size": "1024x1024",
      "quality": "medium",
      "cutout": true,
      "backdrop": "The product stands alone on a plain neutral light-grey seamless backdrop, evenly lit, with no cast shadow and nothing else in frame."
    },

    "orchard-co-op": {
      "title": "Orchard Co-op — sample site",
      "style": "risograph illustration",
      "paletteMode": "hex",
      "palette": { "Ink": "#22201c", "Pulp": "#f4efe4", "Fig": "#7b4b6d", "Leaf": "#4f7c4a" },
      "quality": "low",
      "cutout": true
    }
  },

  // ── Reusable descriptors that must be IDENTICAL across a group of images.
  //    A team grid only reads as one set if every portrait shares these words.
  "sets": {
    "northwind-team": {
      "style": "portrait photograph",
      "size": "1024x1536",
      "quality": "medium",
      "cutout": true,
      "description": "Head-and-shoulders portrait, framed at the same distance, subject facing the camera with a relaxed, friendly expression. Soft large-source key light from camera left, gentle fill, natural skin texture, 85mm lens look with a shallow depth of field.",
      "backdrop": "Plain warm-grey seamless studio backdrop, evenly lit, no props, no cast shadow on the backdrop.",
      "palette": {
        "Ink":  { "hex": "#1c1c1a", "as": "clothing and hair" },
        "Sand": { "hex": "#e8dfd2", "as": "the backdrop and warm highlights on skin" },
        "Clay": { "hex": "#b8674a", "as": "an occasional warm accent in knitwear" },
        "Sage": { "hex": "#8a9a7b", "as": "an occasional cool accent in shirts" }
      }
    }
  },

  // ── One entry per image. Only what is specific to THIS image.
  "prompts": [
    {
      "id": "northwind-hero",
      "project": "northwind-architects",
      "slot": "hero",
      "subject": "a finished single-storey house at the end of a gravel drive, low afternoon sun raking across its façade, mature trees behind it"
    },
    {
      "id": "northwind-team-01",
      "project": "northwind-architects",
      "set": "northwind-team",
      "slot": "about-portrait",
      "subject": "a woman in her fifties with short silver hair and dark-rimmed glasses, wearing a charcoal roll-neck"
    },
    {
      "id": "northwind-team-02",
      "project": "northwind-architects",
      "set": "northwind-team",
      "slot": "about-portrait",
      "subject": "a Black man in his thirties with a close-cropped beard, wearing an open denim shirt over a plain tee"
    },
    {
      "id": "lumen-serum-bottle",
      "project": "lumen-cosmetics",
      "slot": "product",
      "subject": "a frosted glass serum bottle with a matte cap and a slim pipette, three-quarter view"
    }
  ]
}
```

### 3.2 The resolution cascade

Every field resolves **prompt → set → project → `meta.defaults`**, first hit wins.

| Field | Typical home | Notes |
|---|---|---|
| `style` | project (or set) | one style per project — see §3.4 |
| `palette` / `paletteMode` | project | never on a prompt |
| `size` | project default, set, or prompt | choose by slot — see §4 |
| `quality` | project or set | `low` vs `medium` matters here — see §4 |
| `cutout` | project, overridden per prompt/set | drives steps 3 and 4 — see §3.5 |
| `backdrop` | project or set | only for images that will be cut out |
| `subject` | **prompt only** | the one thing that is always specific |

This is what stops a twenty-image mockup from drifting: change the palette once and
every image in the project follows.

> **Keep one copy of the palette.** The same colours drive the css-doodle pattern behind
> the image. If Tabbied already defines a palette per showcase (a token file, a JS
> export), generate the `palette` block from it or assert equality in a test. Two
> hand-maintained copies of four hex codes will diverge, and the failure is subtle — an
> image that is *almost* on-palette looks worse than one that is obviously off.

### 3.3 The prompt template

One shared, dependency-free builder used by the generator **and** by any review UI, so
the two can never disagree. It **only concatenates authored sentences — it never invents
prose.** Anything that needs to read as English (the set description, the backdrop) is
written by a human in the JSON and appended verbatim.

```js
// scripts/lib/prompts.mjs  (excerpt — full file in Appendix A)
export function buildPrompt(r) {
  const article = /^[aeiou]/i.test(r.style) ? "An" : "A";
  const sentences = [`${article} ${r.style} of ${r.subject}.`];
  for (const s of r.sentences) sentences.push(period(s));   // set description, backdrop, note
  if (r.noText) sentences.push("No text, letters, numbers, or logos.");

  const entries = Object.entries(r.palette ?? {});
  if (!entries.length) return sentences.join(" ");

  const header =
    r.paletteMode === "scene"
      ? "Palette — render these as the scene's real materials, surfaces, and light:"
      : "Palette — use these colours and no others:";
  const lines = entries.map(([name, v]) =>
    typeof v === "string" ? `${name}: ${v}` : `${name}: ${v.hex}${v.as ? ` — ${v.as}` : ""}`);

  return `${sentences.join(" ")}\n\n${header}\n${lines.join("\n")}`;
}
```

**Rendered — a risograph illustration (`paletteMode: "hex"`):**

```
A risograph illustration of a market stall stacked with crates of apples under a
striped awning. No text, letters, numbers, or logos.

Palette — use these colours and no others:
Ink: #22201c
Pulp: #f4efe4
Fig: #7b4b6d
Leaf: #4f7c4a
```

**Rendered — a portrait photograph (`paletteMode: "scene"`, with a set):**

```
A portrait photograph of a woman in her fifties with short silver hair and dark-rimmed
glasses, wearing a charcoal roll-neck. Head-and-shoulders portrait, framed at the same
distance, subject facing the camera with a relaxed, friendly expression. Soft
large-source key light from camera left, gentle fill, natural skin texture, 85mm lens
look with a shallow depth of field. Plain warm-grey seamless studio backdrop, evenly
lit, no props, no cast shadow on the backdrop. No text, letters, numbers, or logos.

Palette — render these as the scene's real materials, surfaces, and light:
Ink: #1c1c1a — clothing and hair
Sand: #e8dfd2 — the backdrop and warm highlights on skin
Clay: #b8674a — an occasional warm accent in knitwear
Sage: #8a9a7b — an occasional cool accent in shirts
```

Note what the set contributed: the style (`portrait photograph`, overriding the
project's architectural one), the three shared sentences, the size, the quality, the
cut-out flag, and re-anchored palette notes. The prompt supplied one thing — the person.

### 3.4 Two palette modes, because photographs don't take hex codes

**Recommended, based on how the two kinds of content behave — worth confirming on your
first batch of each.**

| Mode | Use for | How it reads to the model |
|---|---|---|
| **`hex`** | risograph, flat vector, isometric, halftone, screen-print, any graphic style | A literal ink list. Graphic styles have flat fills, so "use these and no others" is a constraint the model can actually satisfy. |
| **`scene`** | photographs, 3D renders, painterly work | A hex code alone has little purchase on a photograph — there is no "fill" to set. Anchoring each colour to a **material** ("terracotta brick", "plaster walls") gives the model something physical to place it on, and the palette arrives as art direction rather than as a colour instruction. |

In `scene` mode a palette entry is `{ "hex": "…", "as": "where this colour lives in the
scene" }`. The `as` note is the part that does the work; the hex keeps the intent
recorded next to the pattern that shares it.

**When a set changes the medium, it must re-anchor the palette.** The `northwind-team`
set above carries its own `palette` — the *same four hexes*, because the site's colours
don't change, but with the `as` notes rewritten for a studio portrait. Inheriting the
project's "plaster walls and poured concrete" into a head-and-shoulders shot on a
seamless backdrop sends the model anchors that have nothing to attach to. This is the
single easiest way to write a prompt that reads fine and generates badly, and it is
exactly what the cascade exists to fix: override the `as` notes on the set, never the
hexes.

Neither mode makes the model colour-accurate. Expect a family resemblance, not a match —
which is fine, because the pattern behind the image *is* exact, and an image that is
close-but-organic reads better against an exact pattern than a flat colour-matched one
would.

### 3.5 One style per project, many styles across the library

The source pipeline retired every style but isometric, because it was one product with
one voice. **That rule does not port** — a pattern library's showcase is meant to
demonstrate range.

The rule that does port, scoped down one level:

> **One style per project, held across every image in it. As many styles across the
> library as you like.**

A single sample site that mixes risograph illustrations with 3D renders and stock-looking
photos reads as a template nobody art-directed — which is the one thing a showcase for a
design tool cannot afford. Declare `style` on the project record so it cannot drift, and
override it only where the *medium* genuinely differs (a photo-styled site still needs
photographic portraits — hence `style` on the `northwind-team` set).

A starting vocabulary. The cut-out column matters — see §3.6.

| `style` string | Palette mode | Cuts out cleanly? |
|---|---|---|
| `isometric illustration` | hex | ✅ **measured** — the source pipeline's house style, cut out ~800 times |
| `risograph illustration` | hex | ⚠️ only when the subject is a single simple object (**measured**: busy risograph scenes had no isolable subject) |
| `flat vector illustration` | hex | ✅ recommended |
| `halftone screen-print illustration` | hex | ⚠️ recommended — texture at the edge can confuse the matte |
| `product photograph` | scene | ✅ recommended — this is what background removers are built for |
| `portrait photograph` | scene | ✅ recommended, with the hair caveat in §3.6 |
| `editorial architectural photograph` | scene | ❌ a scene, not an object — use full-bleed |
| `interior photograph` | scene | ❌ same |
| `3D clay render` | scene | ✅ recommended |
| `watercolour illustration` | hex | ⚠️ soft edges matte poorly |
| `technical line drawing` | hex | ❌ monochrome — see the value-separation trap in §5.4 |

### 3.6 Cut out objects, not scenes

The decision the user is already making intuitively, stated as a rule:

> **`cutout: true` for an object. `cutout: false` for a scene.**

An **object** has a silhouette — a product on a backdrop, a portrait, a single prop, a
piece of furniture. Removing its background gives you something to place *on* a Tabbied
pattern, which is the strongest composite the library can show: the pattern reads as the
brand's surface, the object sits on it.

A **scene** has no silhouette — a finished house, an interior, a landscape, a street. Cut
one out and you get a rectangle with ragged sky, or a ghost. **Measured** on the source
pipeline: this is exactly how the busy compositions failed. Use these full-bleed, and let
the pattern live *next to* them (a split hero, a section band, a card back) rather than
behind them.

Worked examples from your list:

| Image | `cutout` | Why |
|---|---|---|
| Architect's finished home | `false` | scene — full-bleed hero |
| Makeup product on seamless | `true` | object — sits on the pattern |
| "About us" team portrait | `true` | object — a portrait grid over a pattern is the best use of this whole pipeline |
| Interior shot, office | `false` | scene |
| A single illustrated icon/prop | `true` | object |
| Lifestyle shot (person using the product in a room) | `false` | scene containing a person ≠ an object |

Set the default on the project (`"cutout": true` for a product-mockup series) and
override per prompt for the exceptions.

**An image that will be cut out must be generated for it.** That means a `backdrop`
sentence on the project or set — plain, neutral, evenly lit, nothing else in frame — and
it means **never asking for a drop shadow** in the prompt. Both are covered in §5.3.

### 3.7 Human portraits

The "About Us" grid is the hardest thing in this workflow to make look real, and almost
all of the difficulty is *consistency*, not per-image quality.

**Generate a team as a set, never as individuals.** Six portraits generated from six
independently-written prompts will differ in crop, lighting direction, backdrop tone, and
lens feel, and the grid will look like six stock photos — which is precisely the tell you
are trying to avoid. Put every shared word in a `sets` entry (see `northwind-team` above)
and let each prompt contribute **only the person**. Submit the whole set in one batch.

The set descriptor should pin, in this order:

1. **Crop** — "head-and-shoulders, framed at the same distance"
2. **Pose and expression** — "facing the camera, relaxed friendly expression"
3. **Light** — direction, size, and quality: "soft large-source key from camera left, gentle fill"
4. **Backdrop** — one named tone, "plain warm-grey seamless"
5. **Lens feel** — "85mm look, shallow depth of field"
6. **Skin** — "natural skin texture" is worth stating; without it the model drifts toward retouched plastic

**Author the diversity explicitly.** Left to itself the model collapses toward a narrow
default. Write each person's age, build, hair, skin tone, and clothing into their
`subject` — it is one line each and it is the difference between a team that looks like a
company and one that looks like a stock-photo search result. Keep wardrobe within the
project palette (`charcoal roll-neck`, `denim shirt`) so the grid coheres.

**Faces are where `low` quality shows.** See §4 — portraits are the main reason this
workflow does not inherit `low` as a blanket default.

**Hair is where cut-outs fail.** Flyaway strands against a seamless backdrop are the
classic matting failure: the remover either eats them or leaves a grey fringe. Three
mitigations, in order of effectiveness: prefer subjects with contained hair (short,
tied-back, cropped) in the `subject` text; keep the backdrop neutral and evenly lit
(§5.3); and check the cut-out at full size over an actual pattern before promoting.
**Recommended** — the source pipeline never generated human portraits, so this is
reasoning from how matting works, not a measurement. Budget a reject-and-retry on your
first portrait set.

> **Synthetic people, used honestly.** These are placeholders in a demo of a pattern
> library, which is a fine use of a generated face. Two things to hold to: don't prompt
> for a named real person's likeness, and don't present generated faces as real staff,
> customers, or testimonials of a real business. When a mockup is built to pitch a
> specific real client, that second one is worth an explicit glance before it ships.

### 3.8 Writing a good `subject`

Carried over from the source pipeline (**measured** across ~800 images), plus what
changes for photographic work:

- **Describe the actual thing**, specifically enough that you can tell which slot it
  belongs to. Generic subjects produce generic images.
- **Keep it to one subject.** Complex compositions are what failed background removal.
  For `cutout: true`, one object, clear silhouette, nothing else in frame.
- **Concrete nouns beat adjectives.** "a frosted glass serum bottle with a matte cap and
  a slim pipette" places better than "an elegant premium serum bottle".
- **For photographs, add the shot** — angle and distance ("three-quarter view",
  "head-and-shoulders", "low afternoon sun raking across the façade"). Without it the
  model picks, and it picks differently every time, which is fatal for a set.
- **Don't put style, palette, lighting, or backdrop in the subject.** Those live on the
  project or the set. A subject that names its own style has already started the drift.

### 3.9 Never bake text

`"No text, letters, numbers, or logos."` is appended to every prompt by default. The
model bakes in garbled lettering otherwise (**measured** — this is why the clause exists
in the source pipeline).

This is *more* important here, not less. A product mockup wants a brand name on the
packaging — put it in the DOM, over the image, in a real font. Baked text is garbled,
unlocalisable, uneditable, and unsearchable; DOM text is none of those and lets one
generated bottle serve five different fictional brands. Same for headlines over a hero:
that is HTML, not pixels.

If a label shape is genuinely needed in-frame, ask for a **blank** one: "a blank foil
label", "a blank name plate".

---

## 4. Generate with GPT Image 2

### The request

`POST https://api.openai.com/v1/images/generations`

```jsonc
{
  "model": "gpt-image-2",
  "prompt": "A portrait photograph of …\n\nPalette — …",
  "size": "1024x1536",
  "quality": "medium",
  "n": 1
  // "output_format": "png"   (default; "webp"/"jpeg" also valid, "svg" is a 400)
  // "background": "opaque"   (do NOT send "transparent" — 400)
}
```

The response carries **base64, never a URL**:

```js
const buf = Buffer.from(res.data[0].b64_json, "base64");
```

### Size by slot

`gpt-image-2` accepts a fixed set of sizes — all below 1536×1536, so that constraint is
satisfied by construction. Pick by what the image is for, not by habit:

| Slot | `size` | Output tokens at `low` |
|---|---|---|
| Hero, full-bleed scene, wide card | **`1536x1024`** | **158** (**measured**) |
| Team portrait, standing product, phone mockup | **`1024x1536`** | 158 assumed by symmetry — **measure before a large portrait run** |
| Product on seamless, avatar, icon tile, square card | **`1024x1024`** | 196 (**measured**) |
| — | `auto` | unpredictable — **never use** |

Landscape is *cheaper* than square at the same quality (158 vs 196 tokens, **measured**),
which surprises people the first time. `auto` costs roughly 2× `low` with no control over
the tier.

### Quality — this is where the source pipeline's default does *not* port

The source repo pinned `low` forever, and the argument was purely volume: at ~800 images,
`medium` would have cost ~$82 instead of ~$2.37. **That argument does not apply here.** A
showcase site is ten to thirty images; a mockup series is a handful.

| Size / quality | Output tokens | Per image (Batch, $15/1M) | A 20-image site |
|---|---|---|---|
| 1536x1024 / **low** | 158 (**measured**) | $0.0024 | **$0.05** |
| 1536x1024 / **medium** | 1372 (**measured**) | $0.021 | **$0.41** |
| 1536x1024 / high | 5488 (**measured**) | $0.082 | $1.65 |

**Recommended split:**

- **`low`** — flat graphic styles: risograph, flat vector, isometric, halftone. `low` was
  measured as visibly fine for exactly this material across ~800 images. It is also
  correct for anything that will sit small on the page.
- **`medium`** — **faces, hero shots, and any product photograph that will be seen
  large.** Photorealistic content is where the tier shows: skin, hair, fabric weave,
  glass and metal highlights. A mockup's entire job is to look convincing, and the
  difference between the two tiers on a 20-image site is about 36 cents.
- **`high`** — only after comparing it against `medium` on the actual image and seeing a
  difference worth 4×.

Set `quality` on the project (or on a portrait set) rather than passing it per run, so
the choice is recorded next to the images it applies to.

### Batch API, always

Half price, and **measured**: a 20-image job returns in well under a minute despite the
24-hour window; a 337-image job took 27 minutes.

1. **Upload** JSONL — `POST /v1/files`, `purpose=batch`, multipart. One line per image:
   ```jsonc
   {"custom_id":"lumen-serum-bottle","method":"POST","url":"/v1/images/generations","body":{…}}
   ```
   `custom_id` is the prompt id and comes back on each output row — that is how a result
   is matched to a filename.
2. **Create** — `POST /v1/batches` with `{ input_file_id, endpoint: "/v1/images/generations", completion_window: "24h" }`.
3. **Poll** — `GET /v1/batches/{id}` until `status` is terminal (`completed` / `failed` /
   `expired` / `cancelled`). `request_counts` gives progress.
4. **Download** — `GET /v1/files/{output_file_id}/content`, a JSONL stream with the
   base64 inline.

Two structural constraints — do **not** "simplify" them away:

- **Chunk prompts into separate batch jobs** (default 100). One 1536×1024 PNG is ~2.6 MB,
  ~3.6 MB as inline base64; a 1000-image batch produces a ~3.6 GB output file.
- **Stream the output file line by line.** `await res.text()` on it blows V8's ~512 MB
  max string length.

At Tabbied's volumes a single project is one batch job, so this matters less than it did
— but the scripts already handle it and removing the handling only creates a cliff later.

**Use `submit` → `status` → `download` as three separate invocations.** A 65-minute batch
once outlived its parent process; the images were recovered only because the batch id was
on disk. Paid work must never depend on a process staying alive.

### Retry policy — the part that actually bites

**Measured, three separate times: every expensive failure was on the *retrieval* side,
after the paid work completed.** The OpenAI batch-output GET (504 through a proxy), the
object-store fetch under concurrency (43 of 45 failed), and the Kie CDN result download
(8 of 44). The images were already generated and billed in all three cases.

- Retry **idempotent GETs** — status polls, file content — on `408, 425, 429, 500, 502,
  503, 504` and on network errors, exponential backoff (2s, 4s, 8s, 16s, 32s cap).
- **Never** blanket-retry the POSTs that create batches or generate images. A silent
  re-send duplicates work and doubles the bill. Retries are opted into per call site.
- Any new `fetch` added to these scripts must be wrapped.

### Known 400s

| You send | You get |
|---|---|
| `background: "transparent"` | 400. `gpt-image-2` has no transparent background. Asking for transparency *in the prompt* is worse — **measured**: the model paints a fake checkerboard as real opaque pixels. |
| `output_format: "svg"` | 400. png / webp / jpeg only. |

---

## 5. Background removal (Kie.ai → Recraft) — for `cutout: true` only

Model: **`recraft/remove-background`** via Kie.ai. Chosen after comparison
(**measured**): it lifts a subject out of a full-bleed scene where Replicate's
`851-labs/background-remover` and a local colour-key both dissolved busy frames into
translucent ghost mattes.

### 5.1 Which images the script processes

`scripts/remove-background.mjs` reads `data/image-prompts.json` and processes **only the
prompts whose resolved `cutout` is `true`** and whose original is on disk. You do not
hand it a list; the flag in the JSON is the list. `--only` narrows it further,
`--ignore-flags` falls back to scanning the whole directory.

That is the mechanical difference from the source pipeline, where every image was cut out
unconditionally.

### 5.2 The flow

```
POST https://kieai.redpandaai.co/api/file-base64-upload
     { base64Data: "data:image/png;base64,…", uploadPath: "images/…", fileName: "lumen-serum-bottle.png" }
  → { data: { downloadUrl: "https://…" } }

POST https://api.kie.ai/api/v1/jobs/createTask
     { model: "recraft/remove-background", input: { image: "<downloadUrl>" } }
  → { data: { taskId: "…" } }

GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=…        (poll every ~3s)
  → { data: { state: "success", resultJson: "{\"resultUrls\":[\"https://…\"]}" } }
     state is "success" | "fail" (with failMsg/failCode) | in-progress

GET  <resultUrls[0]>   → the transparent PNG bytes
```

All requests carry `Authorization: Bearer $KIE_API_KEY`. ~1 credit and ~3 seconds each
(**measured**).

### 5.3 Four API details that each cost an hour (**measured**)

1. **The model takes a public URL only** — no base64, no data URI. Hence the upload step.
   Kie's upload is free and auto-deletes after 24 h.
2. **Both Kie hosts sit behind Cloudflare and reject a request with no browser
   `User-Agent`** — a bare `403` with `error code: 1010`. It reads exactly like an auth
   failure and is not. Any ordinary browser UA satisfies it.
3. **Rate limit is per account: 20 new generation requests per 10 seconds, and the excess
   is rejected with 429 *without being queued*.** Admit `createTask` through a shared
   sliding-window limiter at 18/10 s, and on a 429 wait out a **full window** rather than
   a short backoff. Uploads and status polls are not counted.
4. **`resultJson` is a JSON *string***, not an object. Parse it, then read
   `resultUrls[0]`.

### 5.4 Generating an image so it can be cut out

**Recommended — this is the part to get right before your first product batch.**

- **Neutral backdrop, never a palette colour.** Matting leaves a thin fringe of the
  original backdrop blended into the subject's edge pixels. Against a Tabbied pattern, a
  fringe of *neutral grey* reads as a soft edge; a fringe of saturated Blush reads as a
  coloured outline around the product. Put a `backdrop` sentence on the project — "plain
  neutral light-grey seamless, evenly lit" — and leave the palette to the subject.
- **Never ask for a drop shadow.** A baked shadow either gets stripped (leaving the
  object looking unseated) or survives as a grey blob on the transparent PNG. Add
  `filter: drop-shadow(…)` in CSS at composite time, where it can be tuned per pattern
  and per theme.
- **One object, nothing else in frame.** Props, hands, and surfaces all become matting
  ambiguity.
- **Value separation from the pattern.** The pattern behind the cut-out is drawn from
  *the same palette*, so a subject rendered only in palette mid-tones can disappear into
  it. Two fixes: keep the subject's value range at one end (clearly darker or lighter
  than the pattern), or reserve one palette colour for subjects and keep it out of the
  pattern. This is the Tabbied-specific version of a constraint that was **measured** in
  the source pipeline — there, a monochrome cut-out was legible on a white page and
  nearly invisible on a `#121212` one. A busy pattern is a harder background than either.
- **Check over the real pattern, at full size, before promoting.** Build a review page
  that renders each cut-out over the actual css-doodle output with a palette switcher.
  It takes an afternoon and it is the only way to catch fringing and value collapse
  before they are committed.

### 5.5 The failure mode that will waste your afternoon

**Skipping background removal fails silently** in the source pipeline: pages reference the
`-cutout` slug, so a regenerated original with no new cut-out leaves the page serving the
old image, with no warning.

Two things close it here:

1. The `cutout` flag makes the expectation explicit, so `promote` knows which images
   *must* have a cut-out.
2. The promote script in Appendix D **errors** when a `cutout: true` prompt has no
   `-cutout.png` in the source directory, and shouts louder when a stale
   `<id>-cutout.webp` is already committed. That was an open item in the source repo; it
   is built in here.

After any regeneration, still eyeball it:

```bash
git status --short public/images | grep -- -cutout
```

---

## 6. Encode to WebP q92 and commit

### The encode

```js
const webp = await sharp(pngBuffer).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toBuffer();
```

- **`quality: 92`**, not a serving-oriented 80, because this file *is* the artifact.
- **`alphaQuality: 100`** keeps the cut-out edge clean. Lossy alpha shows as a halo —
  which matters more here than in the source repo, since every cut-out lands on a busy
  pattern.
- **`effort: 6`** is paid once at authoring time, never per request.
- **`nearLossless` deliberately unused** — plain high-quality WebP is both smaller and
  visually equivalent on this material (**measured**).

**Measured:** PNG → WebP q92 took 929.6 MB → 63.8 MB across 674 files (**14.6×**). A
1536×1024 image is ~1.4 MB as PNG and ~130 kB as WebP.

### Write straight into `public/images/` — no source copy

If you put the promoted file under `assets/` and let a build step re-encode it, you pay a
**double lossy pass** (**measured**):

| Path | PSNR vs the PNG original |
|---|---|
| promote q92 → build q80 (two passes) | **35.58 dB** |
| single q80 encode | **37.41 dB** |

The second pass **cost ~1.8 dB to save ~3 kB**, and put every image in git roughly three
times. So `promote` writes `public/images/<id>.webp` and that is the end of it.

### Only the served variant is committed

**Changed for this port.** The source pipeline promoted both the opaque original and the
cut-out for every image. Here, promotion follows the flag:

- `cutout: false` → commit `<id>.webp`
- `cutout: true` → commit `<id>-cutout.webp` **only** (pass `--keep-original` if you also
  want the opaque one, e.g. to show a before/after)

That halves the committed bytes for product and portrait sets, where the opaque original
is never served.

### The manifest

`lib/generated/images.js` is generated, **committed**, and maps slug → metadata:

```js
// GENERATED by scripts/build-image-manifest.mjs, do not edit by hand.
export default {
  "lumen-serum-bottle-cutout": { "hash": "9f2c…", "width": 1024, "height": 1024, "formats": ["webp"] }
};
```

- `width`/`height` let the `<img>` reserve layout space — **no CLS** — without importing
  or decoding the file.
- The hash makes the build **incremental and a true no-op**: an unchanged file is never
  re-measured and the manifest is not even rewritten, so it produces no git churn on
  `dev` / `build` / `postinstall`.
- Committing it means a deploy does **zero** image work.
- `formats` stays an array so a WebP + fallback pair can coexist later.

### What "commit the WebP" means in practice

- A commit that lands artwork **touches many binary files at once.** Don't split it: the
  manifest must land in the same commit as its images or the app renders nothing for the
  new slugs.
- The manifest is a single generated file, so two branches each adding a project **will
  conflict there**. Resolution is mechanical: take either side, re-run the manifest
  build, commit.
- ~130 kB per image ⇒ a 20-image showcase is ~2.6 MB. Twenty showcases, ~50 MB. Fine for
  git. PNG at ~1.4 MB each would not be.
- Regenerating reuses the slug, so the diff is one changed WebP and one manifest line.
  Git keeps both blob versions forever — expect modest steady growth, and don't
  regenerate in bulk casually.

### Losing R2: the one real tradeoff

The source repo kept pristine PNG candidates in object storage for 14 days, so a run
could be **re-promoted at a different WebP quality for free**. Committing directly gives
that up: once `generated-images/` is cleaned, the only copy is the q92 WebP.

Either keep candidates locally while a project is still in flux, or accept regeneration
(~$0.002 at `low`, ~$0.02 at `medium` per image). **Do not** solve it by committing the
PNGs.

---

## 7. Serving, and compositing over a Tabbied pattern

Files in `public/images/` are served at `/images/<slug>.webp`. The component reads the
manifest for dimensions:

```tsx
// components/Figure.tsx
import imageManifest from "@/lib/generated/images";

const PUBLIC_BASE = "/images";

interface FigureProps {
  /** Committed filename without its extension — include `-cutout` for cut-outs. */
  slug: string;
  alt: string;
  /** Cut-outs get a CSS shadow to seat them on the pattern; scenes don't. */
  cutout?: boolean;
  priority?: boolean;
}

export function Figure({ slug, alt, cutout = false, priority = false }: FigureProps) {
  const entry = imageManifest[slug];

  // A slug with no image yet: surface it in dev, render nothing in production, so a
  // layout can be built before its artwork exists.
  if (!entry) {
    if (process.env.NODE_ENV !== "development") return null;
    return <span role="img" aria-label={`Image pending: ${slug}`}>Image <code>{slug}</code> pending</span>;
  }

  return (
    <img
      src={`${PUBLIC_BASE}/${slug}.webp?v=${entry.hash.slice(0, 8)}`}
      width={entry.width}
      height={entry.height}
      alt={alt}
      className={cutout ? "figure figure--cutout" : "figure"}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
```

```css
/* The pattern is the surface; the cut-out sits on it. */
.figure--cutout {
  /* Seats the object on a busy pattern. Never bake this into the PNG — see §5.4. */
  filter: drop-shadow(0 12px 24px rgb(0 0 0 / 0.18));
}
```

Four things worth copying verbatim:

- **A plain `<img>`, not `next/image`.** `next/image` re-encodes at request time — the
  same double-lossy pass §6 exists to avoid — and the bytes are already final and
  correctly sized. If you need it for layout reasons, pass `unoptimized`.
- **`width`/`height` always set** from the manifest. That is the entire CLS story.
- **The hash as a cache-buster.** Slugs are stable across regenerations, so
  `Cache-Control: immutable` alone would be wrong — a regenerated image would never reach
  returning visitors. `?v=<hash8>` changes when the bytes change, which makes immutable
  caching safe. (**Recommended addition**; the source repo relied on a CDN purge
  instead.)
- **Text over the image, not in it.** Headlines, brand names on packaging, captions — all
  DOM. See §3.9.

**Composition patterns that use the library well:** a cut-out product centred on a
full-bleed pattern panel; a portrait grid where each face sits on a pattern tile from the
same palette; a full-bleed scene photo with a pattern band beside or beneath it. The
common thread: the pattern is the *surface*, and the image is either an object placed on
it or a scene adjacent to it — never a scene layered under it, which fights the pattern
for the same job.

---

## 8. Cost and performance

**Measured** on the source pipeline:

| | |
|---|---|
| Tokens per image | **158** at low / 1536×1024; 1372 at medium; 5488 at high |
| Batch pricing | $15 / 1M output tokens (sync: $30) |
| Real run | 337 images → **$0.80**, **27 min**, 4 batch jobs, 0 failures |
| Background removal | 337 images → 0 failures at concurrency 8, ~1 credit + ~3 s each |
| PNG → WebP q92 | 929.6 MB → 63.8 MB (**14.6×**) |

Projected for this use case:

| Showcase site | Images | Mix | Cost |
|---|---|---|---|
| Graphic-style site (risograph, all `low`) | 20 | 20 × low | **~$0.05** |
| Photo-style site with a team grid | 20 | 6 portraits + 4 heroes at medium, 10 at low | **~$0.24** |
| Product mockup series | 8 | 8 × medium, all cut out | **~$0.17** + 8 Kie credits |

Wall clock is dominated by the batch (minutes) and by removal (~3 s each), not by cost.
Promotion is `sharp` encoding — seconds per image; a large run buffers stdout, so watch
`ls public/images/*.webp | wc -l` rather than the log.

---

## 9. Gotcha checklist

Ordered by how likely each is to bite.

1. **A `cutout: true` prompt with no cut-out on disk** silently leaves a stale committed
   image. The Appendix D guard turns this into an error — keep it.
2. **A palette-coloured backdrop puts a coloured fringe around every cut-out.** Neutral
   backdrops only (§5.4).
3. **A baked drop shadow** either gets stripped or survives as a grey blob. CSS, always.
4. **A team grid generated as individuals will not match.** Use a `sets` entry (§3.7).
5. **`low` quality on faces** is the wrong economy at these volumes. `medium` for
   portraits and hero shots (§4).
6. **Never run a large batch inside one long-lived process.** `submit` → `status` →
   `download`, with batch ids persisted.
7. **Every expensive failure is on the retrieval side, after the paid work.** Wrap every
   GET in retries; never blanket-retry a POST that creates work.
8. **Kie's rate limit is per account** (20 generation requests / 10 s) and the excess is
   **not queued**. Client-side sliding window at 18/10 s.
9. **Kie needs a browser `User-Agent`** or Cloudflare answers `403 / error code: 1010`,
   which reads exactly like an auth failure.
10. **Kie takes a public URL only** — upload through its own endpoint first.
11. **Batch output cannot be buffered whole** (V8 caps strings at ~512 MB). Stream the
    JSONL; chunk the prompts.
12. **`gpt-image-2` has no transparent background.** `background: "transparent"` is a
    400; asking in the prompt paints a fake checkerboard. `output_format: "svg"` is a 400.
13. **Two copies of a palette drift.** Generate the prompt palette from the same source
    the pattern uses, or assert equality in a test (§3.2).
14. **Filtering ids by regex has bitten twice** (**measured**) — `^(c|cs)-` also matched
    `c-programming-…`. Filter on `project`, never on an id prefix alone.
15. **Bump `MANIFEST_VERSION`** when manifest semantics change.
16. **The manifest is one generated file** — concurrent branches conflict there. Take
    either side and re-run the build.

---

## 10. Verification checklist

```bash
npm run build:images     # must be a TRUE no-op on a clean tree
npx tsc --noEmit
npm run lint
npm run build
```

Plus the audits no test suite gives you for free:

```bash
# 1. Every prompt's EXPECTED served slug exists in the manifest.
#    cutout:true → <id>-cutout ; cutout:false → <id>
#    NOTE: --input-type=module must come BEFORE -e, or node treats it as a script arg.
node --input-type=module -e '
import { loadPromptData, resolvePrompt, servedSlug } from "./scripts/lib/prompts.mjs";
const m = (await import("./lib/generated/images.js")).default;
const data = loadPromptData("data/image-prompts.json");
let missing = 0;
for (const p of data.prompts) {
  const slug = servedSlug(resolvePrompt(p, data));
  if (!m[slug]) { missing++; console.log("  missing", slug, `(${p.id})`); }
}
console.log(`${data.prompts.length} prompts, ${missing} missing`);'

# 2. Manifest vs disk: no missing served files, no strays.
node -e '
const m=require("./lib/generated/images.js");const e=m.default||m;const fs=require("fs");
const miss=[];for(const s of Object.keys(e))for(const f of e[s].formats)
  if(!fs.existsSync(`public/images/${s}.${f}`))miss.push(s+"."+f);
const stray=fs.readdirSync("public/images").filter(f=>{const s=f.replace(/\.[^.]+$/,""),x=f.split(".").pop();
  return !e[s]||!e[s].formats.includes(x);});
console.log(Object.keys(e).length+" entries, "+miss.length+" missing, "+stray.length+" stray");'

# 3. Every project referenced by a prompt exists, ids are unique, sets resolve.
#    (loadPromptData throws on duplicates; resolvePrompt throws on unknown project/set)
node --input-type=module -e '
import { loadPromptData, resolvePrompt } from "./scripts/lib/prompts.mjs";
const data = loadPromptData("data/image-prompts.json");
for (const p of data.prompts) resolvePrompt(p, data);
console.log(`${data.prompts.length} prompts across ${Object.keys(data.projects).length} projects — all resolve`);'

# 4. Style discipline: flags a project whose prompts use more than one style.
#    A set that deliberately changes medium (portraits inside a photo site) shows up
#    here — read the output, don't just assert on it.
node --input-type=module -e '
import { loadPromptData, resolvePrompt } from "./scripts/lib/prompts.mjs";
const data = loadPromptData("data/image-prompts.json");
const byProject = {};
for (const p of data.prompts) (byProject[p.project] ??= new Set()).add(resolvePrompt(p, data).style);
for (const [proj, styles] of Object.entries(byProject))
  if (styles.size > 1) console.log("  mixed styles in", proj, [...styles]);
console.log("checked", Object.keys(byProject).length, "projects");'
```

**Make audit 1 a real test.** In production an unresolved slug renders nothing at all, so
a typo ships an invisible image with a green build.

---

## 11. Runbook

```bash
# ── 0. one-time
npm i sharp
echo "generated-images/" >> .gitignore

# ── 1. author the project + prompts in data/image-prompts.json, then check cost
node scripts/generate-images.mjs dry-run --project lumen-cosmetics

# ── 2. generate (Batch API). Three separate invocations, never one long process.
node scripts/generate-images.mjs submit --project lumen-cosmetics
node scripts/generate-images.mjs status            # repeat until "completed"
node scripts/generate-images.mjs download

# ── 3. background removal — automatically selects the cutout:true prompts
node scripts/remove-background.mjs --project lumen-cosmetics --concurrency 8

# ── 4. REVIEW before promoting: check each cut-out over a real pattern, full size.
#       Fringing and value collapse are invisible at thumbnail size.

# ── 5. promote → WebP q92 into public/images + rebuild the manifest
node scripts/promote-images.mjs --project lumen-cosmetics

# ── 6. verify, then commit images and manifest TOGETHER
npm run build:images                                  # must be a no-op
git add public/images lib/generated/images.js data/image-prompts.json
git commit -m "Add Lumen Cosmetics product mockup imagery"
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

**Regenerating one image:**

```bash
# edit that prompt's "subject", then:
node scripts/generate-images.mjs submit --only lumen-serum-bottle
node scripts/generate-images.mjs status
node scripts/generate-images.mjs download --force
node scripts/remove-background.mjs --only lumen-serum-bottle --force   # if cutout: true
node scripts/promote-images.mjs --only lumen-serum-bottle
```

The slug is unchanged, so the commit is one WebP plus one manifest line.

**Adding a whole new showcase site:**

1. Add a `projects` entry: title, `style`, `palette` (from the same source the css-doodle
   pattern uses), `paletteMode`, `quality`, and the `cutout` default.
2. If it has a team grid, add a `sets` entry for it.
3. Add one prompt per slot. Subject only — everything else is inherited.
4. `dry-run`, read the rendered prompts, fix the ones that read badly, then run the
   pipeline above.

---

## Appendix A — `scripts/lib/prompts.mjs`

The shared core: load, validate, resolve the cascade, render the prompt. All three
pipeline scripts import it, so the resolution rules exist once.

```js
/**
 * Load, validate, resolve and render image prompts.
 *
 * Resolution cascade, first hit wins:  prompt → set → project → meta.defaults
 *
 * The prompt builder only CONCATENATES AUTHORED SENTENCES; it never invents prose.
 * Anything that has to read as English (a set description, a backdrop) is written by
 * a human in the JSON and appended verbatim. That keeps the rendered prompt reviewable
 * and stops the script from becoming a second, hidden art director.
 */
import { readFileSync } from "node:fs";

export const CUTOUT_SUFFIX = "-cutout";

/** Read + validate the prompt file. Throws on the mistakes that are silent otherwise. */
export function loadPromptData(file) {
  const data = JSON.parse(readFileSync(file, "utf8"));
  if (!data.projects || typeof data.projects !== "object") throw new Error(`${file}: missing "projects"`);
  if (!Array.isArray(data.prompts)) throw new Error(`${file}: missing "prompts" array`);
  const seen = new Set();
  for (const p of data.prompts) {
    if (!p.id) throw new Error(`${file}: a prompt has no id`);
    if (seen.has(p.id)) throw new Error(`${file}: duplicate prompt id "${p.id}"`);
    seen.add(p.id);
    if (!p.subject) throw new Error(`${file}: prompt "${p.id}" has no subject`);
  }
  return data;
}

/** prompt → set → project → meta.defaults */
export function resolvePrompt(prompt, data) {
  const project = data.projects[prompt.project];
  if (!project) throw new Error(`prompt "${prompt.id}": unknown project "${prompt.project}"`);
  const set = prompt.set ? data.sets?.[prompt.set] : undefined;
  if (prompt.set && !set) throw new Error(`prompt "${prompt.id}": unknown set "${prompt.set}"`);
  const defaults = data.meta?.defaults ?? {};
  const pick = (key, fallback) =>
    prompt[key] ?? set?.[key] ?? project[key] ?? defaults[key] ?? fallback;

  const style = pick("style");
  if (!style) throw new Error(`prompt "${prompt.id}": no style on the prompt, set, project or defaults`);

  return {
    id: prompt.id,
    project: prompt.project,
    slot: prompt.slot ?? null,
    subject: prompt.subject,
    style,
    palette: pick("palette", {}),
    paletteMode: pick("paletteMode", "hex"),
    size: pick("size", "1536x1024"),
    quality: pick("quality", "low"),
    cutout: pick("cutout", false) === true,
    noText: pick("noText", true) !== false,
    // Authored sentences, appended verbatim in this order.
    sentences: [set?.description, pick("backdrop"), prompt.note].filter(Boolean),
  };
}

const period = (s) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** The exact text sent to the model. Keep any UI copy of this byte-identical. */
export function buildPrompt(r) {
  const article = /^[aeiou]/i.test(r.style) ? "An" : "A";
  const sentences = [`${article} ${r.style} of ${r.subject}.`];
  for (const s of r.sentences) sentences.push(period(s));
  // The model bakes in garbled lettering otherwise. Brand names belong in the DOM.
  if (r.noText) sentences.push("No text, letters, numbers, or logos.");
  const head = sentences.join(" ");

  const entries = Object.entries(r.palette ?? {});
  if (!entries.length) return head;

  // A hex list is a constraint a flat graphic style can satisfy; a photograph needs
  // each colour anchored to a material before it has any purchase.
  const header =
    r.paletteMode === "scene"
      ? "Palette — render these as the scene's real materials, surfaces, and light:"
      : "Palette — use these colours and no others:";
  const lines = entries.map(([name, v]) =>
    typeof v === "string" ? `${name}: ${v}` : `${name}: ${v.hex}${v.as ? ` — ${v.as}` : ""}`,
  );
  return `${head}\n\n${header}\n${lines.join("\n")}`;
}

/** The slug the site actually serves: the cut-out when there is one. */
export function servedSlug(resolved) {
  return resolved.cutout ? `${resolved.id}${CUTOUT_SUFFIX}` : resolved.id;
}

/** Resolved prompts matching the usual CLI filters. */
export function selectPrompts(data, { only = null, project = null, slot = null, cutout = null } = {}) {
  let list = data.prompts;
  if (only) list = list.filter((p) => only.includes(p.id));
  if (project) list = list.filter((p) => p.project === project);
  const resolved = list.map((p) => resolvePrompt(p, data));
  const filtered = resolved
    .filter((r) => (slot ? r.slot === slot : true))
    .filter((r) => (cutout === null ? true : r.cutout === cutout));
  return filtered.map((r) => ({ ...r, prompt: buildPrompt(r) }));
}
```

---

## Appendix B — `scripts/generate-images.mjs`

```js
#!/usr/bin/env node
/**
 * Generate images with OpenAI's GPT Image 2, from data/image-prompts.json.
 *
 * Size and quality are resolved per prompt (prompt → set → project → defaults), so one
 * batch can mix a 1024x1536 medium-quality portrait with a 1536x1024 low-quality
 * illustration. The CLI flags are overrides, not defaults.
 *
 * Uses the Batch API (~50% cheaper). Prompts are chunked into --batch-size jobs and
 * every output file is parsed as a STREAM, never buffered whole: images come back as
 * inline base64 (~3.6 MB each), so a 1000-image batch would build a ~3.6 GB string and
 * blow V8's ~512 MB cap.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs <command> [options]
 *
 * Commands:
 *   dry-run    print the rendered prompts, targets and projected cost; no API calls
 *   submit     upload the JSONL batches and create them; prints the ids
 *   status     show batch status (--batch <id>, or every batch last submitted)
 *   download   download completed batches' images into --out
 *   sync       generate immediately, one request per prompt (bounded concurrency)
 *
 * Options:
 *   --project <id>       Only this project
 *   --only <id[,id...]>  Only these prompt ids
 *   --slot <name>        Only this slot
 *   --out <dir>          Output directory (default: ./generated-images)
 *   --size <WxH>         OVERRIDE every entry's size (1536x1024|1024x1536|1024x1024)
 *   --quality <q>        OVERRIDE every entry's quality (low|medium|high)
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
import { loadPromptData, selectPrompts } from "./lib/prompts.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = join(ROOT, "data", "image-prompts.json");
const API_BASE = "https://api.openai.com/v1";
const IMAGES_ENDPOINT = "/v1/images/generations";

const COMMANDS = new Set(["dry-run", "submit", "status", "download", "sync"]);
const SIZES = new Set(["1536x1024", "1024x1536", "1024x1024"]);
const QUALITIES = new Set(["low", "medium", "high"]); // "auto" excluded on purpose

function parseArgs(argv) {
  const opts = {
    command: null, project: null, only: null, slot: null,
    out: join(process.cwd(), "generated-images"),
    size: null, quality: null, outputFormat: "png", model: null,
    batchSize: 100, batch: null, concurrency: 3, force: false, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--project": opts.project = next(); break;
      case "--only": opts.only = next().split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--slot": opts.slot = next(); break;
      case "--out": opts.out = next(); break;
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
  console.log(src.slice(src.indexOf("/**"), src.indexOf("*/") + 2).replace(/^\/\*\*?|\*\/$|^ \* ?/gm, "").trim());
}

// ── Cost estimation ─────────────────────────────────────────────────────────
// Image output tokens per request, measured against gpt-image-2 on 2026-07-28.
// 1024x1536 is assumed equal to 1536x1024 (same pixel count) — verify before a
// large portrait run.
const COST_TOKENS = {
  "1024x1024/low": 196, "1024x1024/medium": 1372, "1024x1024/high": 5488,
  "1536x1024/low": 158, "1536x1024/medium": 1372, "1536x1024/high": 5488,
  "1024x1536/low": 158, "1024x1536/medium": 1372, "1024x1536/high": 5488,
};
const USD_PER_MTOK = { batch: 15, sync: 30 };

const sizeOf = (e, opts) => opts.size || e.size;
const qualityOf = (e, opts) => opts.quality || e.quality;

function describeCost(entries, opts, mode) {
  let tokens = 0;
  for (const e of entries) {
    const t = COST_TOKENS[`${sizeOf(e, opts)}/${qualityOf(e, opts)}`];
    if (t === undefined) return `cost not estimable for ${sizeOf(e, opts)}/${qualityOf(e, opts)}`;
    tokens += t;
  }
  return `~$${((tokens * USD_PER_MTOK[mode]) / 1e6).toFixed(2)} projected (${mode} pricing)`;
}

const outputExt = (opts) => (opts.outputFormat === "jpeg" ? "jpg" : opts.outputFormat);

function requestBody(e, opts, model) {
  const body = { model, prompt: e.prompt, size: sizeOf(e, opts), quality: qualityOf(e, opts), n: 1 };
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
    `[dry-run] ${entries.length} prompt(s) · ${chunk(entries, opts.batchSize).length} batch job(s)\n` +
      `          ${describeCost(entries, opts, "batch")}\n`,
  );
  for (const e of entries) {
    console.log(
      `── ${e.id}.${ext}  (${e.project}${e.slot ? `/${e.slot}` : ""} · ` +
        `${sizeOf(e, opts)} · ${qualityOf(e, opts)} · ${e.cutout ? "cutout" : "full-bleed"})`,
    );
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
 * Yield an output file's JSONL rows one line at a time. Batch image output embeds
 * each PNG as base64, so these files run to gigabytes; res.text() would exceed
 * V8's ~512 MB max string length.
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
      ok++; console.log(`  ✓ ${row.custom_id}.${ext}`);
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
      console.log(`  • skip ${e.id} (exists; use --force)`); return false;
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
    console.error(`Unsupported --output-format "${opts.outputFormat}". Use png, webp, or jpeg.`); process.exit(1);
  }
  if (opts.quality && !QUALITIES.has(opts.quality)) {
    console.error(`Unsupported --quality "${opts.quality}". Use ${[...QUALITIES].join(", ")}.`); process.exit(1);
  }
  if (opts.size && !SIZES.has(opts.size)) {
    console.error(`Unsupported --size "${opts.size}". Use ${[...SIZES].join(", ")}.`); process.exit(1);
  }

  const data = loadPromptData(DATA_FILE);
  const model = opts.model || data.meta.model;

  if (opts.command === "status") return cmdStatus(opts, requireKey());
  if (opts.command === "download") return cmdDownload(opts, requireKey());

  const entries = selectPrompts(data, { only: opts.only, project: opts.project, slot: opts.slot });
  if (!entries.length) { console.error("No prompts matched the filters."); process.exit(1); }

  // Every entry's resolved size/quality must be one the API accepts.
  for (const e of entries) {
    if (!SIZES.has(sizeOf(e, opts))) throw new Error(`prompt "${e.id}": unsupported size "${sizeOf(e, opts)}"`);
    if (!QUALITIES.has(qualityOf(e, opts))) throw new Error(`prompt "${e.id}": unsupported quality "${qualityOf(e, opts)}"`);
  }

  if (opts.command === "dry-run") return cmdDryRun(entries, opts);

  const mode = opts.command === "sync" ? "sync" : "batch";
  console.log(
    `${entries.length} prompt(s) · model ${model} · ${outputExt(opts)} · out ${opts.out}\n` +
      `${describeCost(entries, opts, mode)}\n`,
  );
  const key = requireKey();
  if (opts.command === "sync") return cmdSync(entries, opts, model, key);
  if (opts.command === "submit") return cmdSubmit(entries, opts, model, key);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => { console.error(err.message || err); process.exit(1); });
}
```

---

## Appendix C — `scripts/remove-background.mjs`

```js
#!/usr/bin/env node
/**
 * Remove the background from generated images with Recraft's `remove-background`,
 * served through Kie AI. Writes `<id>-cutout.png` beside each `<id>.png`.
 *
 * SELECTION IS DRIVEN BY THE DATA, not by the directory: only prompts whose resolved
 * `cutout` is true are processed. Scenes (a hero photo, an interior) are meant to stay
 * full-bleed and are skipped. --ignore-flags falls back to scanning the directory.
 *
 * Three Kie API details this script exists to encapsulate:
 *   1. The model input takes a PUBLIC URL only — no base64, no data URI. Each image is
 *      pushed through Kie's own upload endpoint first (free, auto-deleted after 24h)
 *      and the returned `downloadUrl` is handed to the model.
 *   2. Both Kie hosts sit behind Cloudflare and answer a request with no browser
 *      `User-Agent` with a bare 403 and `error code: 1010`. It reads exactly like an
 *      auth failure and is not.
 *   3. Kie caps an account at 20 new generation requests per 10 seconds and rejects the
 *      excess with 429 WITHOUT queueing it. A shared sliding-window limiter admits
 *      createTask at 18 per 10s so --concurrency can be raised freely, and a 429 waits
 *      out a full window rather than the usual short backoff.
 *
 * Usage:
 *   KIE_API_KEY=... node scripts/remove-background.mjs [options]
 *
 * Options:
 *   --project <id>     Only this project
 *   --only <id[,id..]> Only these prompt ids
 *   --from <dir>       Source directory (default: ./generated-images)
 *   --concurrency <n>  Parallel jobs (default: 4)
 *   --ignore-flags     Process every original in the directory, whatever the JSON says
 *   --force            Redo images whose cut-out already exists
 *   -h, --help         Show this help
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CUTOUT_SUFFIX, loadPromptData, selectPrompts } from "./lib/prompts.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = join(ROOT, "data", "image-prompts.json");

const KIE_UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload";
const KIE_CREATE = "https://api.kie.ai/api/v1/jobs/createTask";
const KIE_STATUS = "https://api.kie.ai/api/v1/jobs/recordInfo";
const MODEL = "recraft/remove-background";
// Cloudflare in front of both Kie hosts rejects a UA-less request with
// 403 "error code: 1010"; any ordinary browser UA satisfies it.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

function parseArgs(argv) {
  const opts = {
    project: null, only: null, from: join(process.cwd(), "generated-images"),
    concurrency: 4, ignoreFlags: false, force: false, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--project": opts.project = next(); break;
      case "--only": opts.only = next().split(",").map((x) => x.trim()).filter(Boolean); break;
      case "--from": opts.from = next(); break;
      case "--concurrency": opts.concurrency = Math.max(1, Number(next()) || 4); break;
      case "--ignore-flags": opts.ignoreFlags = true; break;
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

// Kie enforces, per account, 20 new generation requests per 10 seconds. Excess requests
// are rejected with 429 and are NOT queued, so the limit has to be respected
// client-side rather than discovered.
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 18; // a little under 20, so a burst can't race past the limit

/** Sliding-window limiter, shared across workers so raising --concurrency cannot
 *  exceed the account limit. */
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
 * The finished image is served from Kie's CDN rather than its API, and a bare fetch
 * there is exactly where a run gets lost: the generation has already succeeded and been
 * billed. Eight of forty-four images failed this way before it was wrapped.
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

    // A 429 means the window is already full; wait out a whole window rather than the
    // usual short backoff, since the request was rejected, not queued.
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
    key, method: "POST", json: { model: MODEL, input: { image: imageUrl } },
  });
  const taskId = created?.data?.taskId;
  if (!taskId) throw new Error(`createTask returned no taskId: ${JSON.stringify(created).slice(0, 200)}`);

  for (let i = 0; i < 100; i++) {
    await sleep(3000);
    const info = await kie(`${KIE_STATUS}?taskId=${encodeURIComponent(taskId)}`, { key });
    const d = info?.data ?? {};
    if (d.state === "success") {
      // resultJson is a JSON *string*, not an object.
      return fetchBinary(JSON.parse(d.resultJson).resultUrls[0], "result download");
    }
    if (d.state === "fail") throw new Error(`${d.failMsg || "failed"} (code ${d.failCode ?? "?"})`);
  }
  throw new Error("timed out waiting for the task");
}

/** Ids to process: the cutout:true prompts, or everything on disk with --ignore-flags. */
function selectIds(opts, dir) {
  const onDisk = new Set(
    readdirSync(dir)
      .filter((f) => /\.png$/i.test(f))
      .map((f) => basename(f, extname(f)))
      .filter((s) => !s.endsWith(CUTOUT_SUFFIX)),
  );
  if (opts.ignoreFlags) {
    let ids = [...onDisk];
    if (opts.only) ids = ids.filter((id) => opts.only.includes(id));
    return ids.sort();
  }
  const data = loadPromptData(DATA_FILE);
  const wanted = selectPrompts(data, { only: opts.only, project: opts.project, cutout: true });
  const missing = wanted.filter((r) => !onDisk.has(r.id));
  for (const r of missing) console.error(`  ! ${r.id}: cutout:true but no original in ${dir} — generate it first`);
  return wanted.filter((r) => onDisk.has(r.id)).map((r) => r.id).sort();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();
  const key = requireKey();

  const dir = opts.from;
  if (!existsSync(dir)) { console.error(`Source directory not found: ${dir}`); process.exit(1); }

  const ids = selectIds(opts, dir);
  if (!ids.length) return console.log("No images need background removal.");

  const todo = ids.filter((id) => {
    if (!opts.force && existsSync(join(dir, `${id}${CUTOUT_SUFFIX}.png`))) {
      console.log(`  • skip ${id} (cut-out exists; use --force)`); return false;
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
        ok++; console.log(`  ✓ ${id}${CUTOUT_SUFFIX}.png (${(cut.length / 1e6).toFixed(2)}MB)`);
      } catch (err) { failed++; console.error(`  ✗ ${id}: ${err.message}`); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(opts.concurrency, todo.length) }, worker));
  console.log(`\nDone: ${ok} removed, ${failed} failed.`);
  console.log("Review each cut-out over a real pattern, at full size, before promoting.");
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => { console.error(err.message || err); process.exit(1); });
}
```

---

## Appendix D — `scripts/promote-images.mjs`

```js
#!/usr/bin/env node
/**
 * Promote chosen candidates into the repository: encode to WebP q92 straight into
 * `public/images/`, the files the site serves, then rebuild the manifest.
 *
 * Promotion follows the `cutout` flag:
 *   cutout: false → commits <id>.webp            (a scene, served full-bleed)
 *   cutout: true  → commits <id>-cutout.webp     (an object, placed on a pattern)
 * Pass --keep-original to also commit the opaque original of a cut-out image.
 *
 * A cutout:true prompt with no cut-out on disk is an ERROR, not a silent skip: that
 * combination is what leaves a page serving a stale image after a regeneration.
 *
 * Why WebP, and why this writes the served file directly: a 1536x1024 image is ~1.4 MB
 * as PNG and ~130 kB as WebP. And routing it through a second encoder later is a double
 * lossy pass — measured, promote-q92 → build-q80 lands at 35.58 dB PSNR against the PNG
 * original while a single q80 encode is 37.41 dB. The second pass costs ~1.8 dB to save
 * ~3 kB. Because the promoted file IS the artifact, --quality is the quality users
 * actually see; it defaults to 92 rather than a serving-oriented 80.
 *
 * Usage:
 *   node scripts/promote-images.mjs [options]
 *
 * Options:
 *   --project <id>    Only this project
 *   --only <id[,id..]> Only these prompt ids
 *   --from <dir>      Candidate directory (default: ./generated-images)
 *   --quality <n>     WebP quality of the served image (default: 92)
 *   --keep-original   Also promote the opaque original of a cut-out image
 *   --no-build        Skip the manifest rebuild afterwards
 *   --dry-run         Report what would be promoted; write nothing
 *   -h, --help        Show this help
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { CUTOUT_SUFFIX, loadPromptData, selectPrompts } from "./lib/prompts.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = join(ROOT, "data", "image-prompts.json");
// Promotion writes the *served* file directly. There is deliberately no source copy
// elsewhere: that would put every image in git twice and add a second lossy encode.
const OUT_DIR = join(ROOT, "public", "images");

function parseArgs(argv) {
  const opts = {
    project: null, only: null, from: join(process.cwd(), "generated-images"),
    quality: 92, keepOriginal: false, build: true, dryRun: false, help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--project": opts.project = next(); break;
      case "--only": opts.only = next().split(",").map((x) => x.trim()).filter(Boolean); break;
      case "--from": opts.from = next(); break;
      case "--quality": opts.quality = Math.min(100, Math.max(1, Number(next()) || 92)); break;
      case "--keep-original": opts.keepOriginal = true; break;
      case "--no-build": opts.build = false; break;
      case "--dry-run": opts.dryRun = true; break;
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

/**
 * Convert one image buffer to the committed WebP.
 * `nearLossless` is not used: these are photographic-ish raster renders, so plain
 * high-quality WebP is both smaller and visually equivalent. alphaQuality 100 matters
 * here — every cut-out lands on a busy pattern, where a lossy alpha edge shows.
 */
export async function toWebp(buf, quality) {
  return sharp(buf).webp({ quality, alphaQuality: 100, effort: 6 }).toBuffer();
}

/** The candidate files to promote for one resolved prompt, or null with a reason. */
function plan(r, opts) {
  const src = (stem) => join(opts.from, `${stem}.png`);
  if (!r.cutout) {
    return existsSync(src(r.id))
      ? { stems: [r.id] }
      : { error: `no ${r.id}.png in ${opts.from}` };
  }
  const cutStem = `${r.id}${CUTOUT_SUFFIX}`;
  if (!existsSync(src(cutStem))) {
    const stale = existsSync(join(OUT_DIR, `${cutStem}.webp`));
    return {
      error:
        `cutout:true but no ${cutStem}.png in ${opts.from}.` +
        (stale
          ? `\n    public/images/${cutStem}.webp already exists, so the site will KEEP SERVING THE OLD IMAGE.`
          : "") +
        `\n    Run: node scripts/remove-background.mjs --only ${r.id}`,
    };
  }
  const stems = [cutStem];
  if (opts.keepOriginal && existsSync(src(r.id))) stems.push(r.id);
  return { stems };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();

  if (!existsSync(opts.from)) { console.error(`Source directory not found: ${opts.from}`); process.exit(1); }
  const data = loadPromptData(DATA_FILE);
  const selected = selectPrompts(data, { only: opts.only, project: opts.project });
  if (!selected.length) { console.error("No prompts matched the filters."); process.exit(1); }

  const stems = [];
  let errors = 0;
  for (const r of selected) {
    const p = plan(r, opts);
    if (p.error) { errors++; console.error(`  ✗ ${r.id}: ${p.error}`); continue; }
    stems.push(...p.stems);
  }
  if (!stems.length) { console.error("\nNothing to promote."); process.exit(1); }

  console.log(
    `\nPromoting ${stems.length} image(s) from ${opts.from} → public/images ` +
      `(webp q${opts.quality})${opts.dryRun ? " [dry-run]" : ""}\n`,
  );
  if (!opts.dryRun) mkdirSync(OUT_DIR, { recursive: true });

  let promoted = 0, before = 0, after = 0;
  for (const stem of stems) {
    const raw = readFileSync(join(opts.from, `${stem}.png`));
    const webp = await toWebp(raw, opts.quality);
    before += raw.length; after += webp.length;
    if (!opts.dryRun) writeFileSync(join(OUT_DIR, `${stem}.webp`), webp);
    promoted++;
    console.log(`  ✓ ${stem}.webp  ${(raw.length / 1e6).toFixed(2)}MB → ${(webp.length / 1e6).toFixed(2)}MB`);
  }
  console.log(
    `\n${promoted} promoted · ${(before / 1e6).toFixed(1)}MB → ${(after / 1e6).toFixed(1)}MB ` +
      `(${after ? (before / after).toFixed(1) : "1.0"}x smaller)` +
      (errors ? ` · ${errors} skipped with errors` : ""),
  );

  if (opts.dryRun) return;
  if (opts.build) {
    console.log("\nRebuilding the image manifest…");
    execFileSync(process.execPath, [join(ROOT, "scripts", "build-image-manifest.mjs")], { stdio: "inherit" });
  } else {
    console.log("Skipped the manifest rebuild (--no-build); run `npm run build:images`.");
  }
  if (errors) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => { console.error(err.message || err); process.exit(1); });
}
```

---

## Appendix E — `scripts/build-image-manifest.mjs`

Unchanged from the source pipeline apart from the file names.

```js
#!/usr/bin/env node
/**
 * Record every committed image in `public/images/` into `lib/generated/images.js` so
 * pages can set intrinsic width/height (no CLS) without importing the file.
 *
 * These bytes are NEVER re-encoded: promotion already produced the exact bytes to
 * serve, and a second lossy pass costs ~1.8 dB PSNR to save ~3 kB. This script only
 * reads dimensions.
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

/** Read the previous manifest so unchanged images can be skipped. It is an ES module
 *  this script wrote, so the JSON literal is pulled out by regex rather than
 *  import()-ed. Absent or unparseable → treat everything as new. */
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

## Appendix F — Wiring

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

**Do not gitignore `lib/generated/images.js` or `public/images/`.** Both are deliberately
committed — that is what makes a deploy zero-work.

| Path | Committed | Role |
|---|---|---|
| `data/image-prompts.json` | ✅ | projects, sets, prompts — the source of truth |
| `scripts/lib/prompts.mjs` | ✅ | load / resolve / render |
| `scripts/generate-images.mjs` | ✅ | step 2 |
| `scripts/remove-background.mjs` | ✅ | step 3 |
| `scripts/promote-images.mjs` | ✅ | step 4 |
| `scripts/build-image-manifest.mjs` | ✅ | manifest |
| `components/Figure.tsx` | ✅ | step 5 |
| `lib/generated/images.js` | ✅ (generated) | slug → dimensions |
| `public/images/*.webp` | ✅ | **the served bytes** |
| `generated-images/` | ❌ gitignored | raw candidates |

---

## Appendix G — What changed, and why

### From the Dataslope pipeline

| | Dataslope | Here |
|---|---|---|
| Candidate storage | Cloudflare R2, run-scoped keys, 14-day lifecycle | local `generated-images/`, gitignored |
| Credentials | `OPENAI_API_KEY`, `KIE_API_KEY`, 4 × `R2_*` | `OPENAI_API_KEY`, `KIE_API_KEY` |
| SigV4 S3 client | ~250 lines, hand-rolled | not needed |
| Re-promote at another quality | free, while candidates live in R2 | only while `generated-images/` is on disk |
| Style | one house style (isometric) forever | **one style per project, many across the library** |
| Palette | one brand palette, four fixed colours | **per-project palette, any size, two modes** |
| Quality | `low`, always, on volume grounds | **`low` for graphic styles, `medium` for faces and heroes** |
| Background removal | every image, unconditionally | **per-prompt `cutout` flag; objects yes, scenes no** |
| Promoted files | original **and** cut-out for every image | only the served variant (`--keep-original` to opt in) |
| Prompt shape | fixed template, four colour lines | authored sentences + palette block, `sets` for consistency |
| Backdrop / set descriptors | n/a | first-class, because portraits and products need them |
| Stale-cut-out guard | open item, not built | **built in, as an error** |
| Cache-busting query string | not used | `?v=<hash8>` |

### What deliberately did *not* change

Everything arrived at by measurement: the Batch API shape and its chunk-and-stream
requirement, the retry policy and where it applies, all four Kie API quirks, WebP q92
with `alphaQuality: 100`, the single-encode rule and the PSNR numbers behind it, the
committed incremental manifest, and "cut out objects, not scenes" — which was learned the
expensive way on ~800 images.
