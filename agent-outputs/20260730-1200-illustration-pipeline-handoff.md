# Illustration Pipeline — Agent Handoff

**Date:** 2026-07-30
**Project:** DataSlope (`dataslope/dataslope`)
**Branch:** `claude/gpt-image-2-api-test-v4memq` → PR **#612** (34 commits ahead of `main`)
**State at:** `0b5b654`

> **You are the operator.** This document assumes a coding agent does all of the work
> end to end — authoring prompts, generating, background removal, promotion, wiring,
> verification, commit, push, and triggering the lifecycle workflow. Every step below
> is runnable as written. Nothing here requires a human to click anything.
>
> `AGENTS.md` → "Illustrations" is the spec. This is the runbook.

---

## TL;DR

All **30 courses** carry generated isometric art on **every page** (781/781). `content/`
has zero inline SVG. Every served image is a single-format WebP encoded exactly once.
The last run did 337 images + 337 background removals with **zero failures** for
**$0.80** in 27 minutes.

**Do these after #612 merges:** [Open items](#open-items). #1 is mandatory or R2 grows
without bound.

---

## Current state

| | |
|---|---|
| Courses converted | 30 / 30 |
| Pages with an illustration | 781 / 781 |
| `<Figure>` placements in `content/` | 787 (all resolve) |
| Prompts in `data/illustration-prompts.json` | 810 — 751 course illustrations, 30 course thumbnails, 6 interview thumbnails, 4 home bento icons, 19 auth globe pins |
| Manifest (`lib/generated/images.js`) | 1580 entries, **all single-format** |
| `public/images` | 1580 files, 154 MB |
| `assets/images` | README only — **no raster sources** |
| Inline `<svg>` in `content/` | 0 |
| Mermaid in `content/` | 1176 blocks / 555 files — **untouched; out of scope; keep it that way** |

---

## Non-negotiables

Violating any of these has already been tried and rejected. Don't re-litigate.

- `gpt-image-2`, **quality `low`**, **size `1536x1024`**, **always the Batch API**.
  Low is the default in the script for a reason: image output tokens dominate the bill
  and the tiers are 158 vs 1372 vs 5488 tokens.
- **Isometric** is the house style. Permanently retired: flat geometric, line art,
  blueprint schematic, cut-paper collage, and SVG. Risograph is allowed only for a
  simple mascot moment and hasn't been used since the pilot.
- Brand palette named in every prompt: blue `#148cff`, green `#20c621`, red `#ff4f59`,
  yellow `#ffdd6c`. `"No text."` is appended automatically by
  `lib/illustrationPrompt.ts` — **never ask for lettering**, the model bakes in garbled
  text.
- Promotion writes **straight to `public/images/`**. Never add a copy under
  `assets/images/` — that is the double-encode this branch removed (cost ~1.8 dB PSNR).
- Exactly **one `<Figure>` per page**, referencing the **`-cutout`** slug.
- Never touch mermaid.

### Creatures

The marmot is the house mascot. Domain mascots where they fit: panda (pandas), penguin
(seaborn), duck (DuckDB), **elephant (PostgreSQL — explicitly requested)**. The
`mascot: true` field means "features a creature", matching how the pandas prompts use
it.

**Keep the flag consistent with the subject text.** It drives a badge in the
`/illustration-prompts` review gallery
(`app/illustration-prompts/IllustrationPromptsClient.tsx`), and it drifted once already:
14 prompts gained an elephant or duck in the subject without the flag being set, and one
carried the flag with no creature. All 15 were corrected on 2026-07-30, and the checker
in [Verification](#verification) now returns 0 on a clean tree — if it returns anything,
you introduced it.

**182 of 810** prompts (22%) feature a creature. Use them for welcome pages, capstones,
and next-steps; keep technical concept pages as clean diagrams. Site *chrome* is the
exception to that restraint and is deliberately creature-heavy: the interview thumbnails,
the home bento icons, and the auth globe pins are all mascot art by request.

---

## Prompt schema

`data/illustration-prompts.json` is the single source of truth — the
`/illustration-prompts` gallery, the in-lesson card, and every script read it.

```jsonc
{
  "id": "css-grid",                       // unique; becomes the filename and the
                                          // handle shown under the image on the site
  "collection": "courses",
  "course": "modern-css-layout",          // must match the content/courses/<dir> name
  "courseTitle": "Modern CSS: Layout and Responsive Design",
  "lesson": "css-grid",                   // MUST equal the MDX file stem
  "category": "course-illustration",      // or course-thumbnail | interview-thumbnail
                                          // | home-icon | auth-globe-pin
  "title": "CSS Grid in depth",
  "style": "isometric illustration",      // the default; only change deliberately
  "mascot": false,                        // true iff the subject features a creature
  "subject": "a two-dimensional lattice of cells on a platform, one wide panel spanning three cells and another spanning two rows"
}
```

`buildIllustrationPrompt` renders exactly:

```
An isometric illustration of <subject>. No text.

Blue: #148cff
Green: #20c621
Red: #ff4f59
Yellow: #ffdd6c
```

### Writing a good `subject`

It has to read naturally after "An isometric illustration of ". Rules that produced the
set that shipped:

- **Describe the page's actual idea**, not a generic scene. `sns-facets` is "one chart
  plane splitting into a tidy three-by-two grid of identical smaller panels sharing one
  axis rail" — you can tell which lesson it belongs to.
- **Concrete objects on a platform.** "platform", "tray", "rail", "chute", "socket",
  "gate" recur because they cut out cleanly and read at small sizes.
- **No text, ever.** If a label seems needed, use "blank name plate", "blank banner",
  "blank paper tag".
- **Contrast pairs work well** for before/after lessons: "a messy heap of irregular
  tiles on one platform beside the same tiles arranged into a perfect rectangular grid".
- **Keep it simple.** The user's explicit feedback: complex compositions failed
  background removal; the one usable risograph was usable *because* it was simple.

### Deriving prompts from page content

For a 30-page course, dump each page's title/description/headings/opening prose and
write from that, rather than opening 30 files one at a time:

```bash
node -e '
const fs=require("fs"),path=require("path");
const dir="content/courses/"+process.argv[1];
for(const f of fs.readdirSync(dir).sort()){
  if(!/\.mdx?$/.test(f)||f==="index.mdx")continue;
  const src=fs.readFileSync(path.join(dir,f),"utf8");
  const g=re=>(re.exec(src)||[])[1]||"";
  let body=src.replace(/^---[\s\S]*?\n---\n/,"").replace(/```[\s\S]*?```/g,"")
              .replace(/<[A-Z][\s\S]*?\/>/g,"");
  const heads=[...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map(m=>m[1]).slice(0,6);
  const prose=body.split(/\n\n/).map(s=>s.trim().replace(/\s+/g," "))
    .filter(s=>s&&!/^[#<|]/.test(s)&&s.length>60).slice(0,2).join(" ");
  console.log(`\n--- ${f}\ntitle: ${g(/^title:\s*(.+)$/m)}\ndesc: ${g(/^description:\s*(.+)$/m)}`);
  console.log(`heads: ${heads.join(" | ")}\nprose: ${prose.slice(0,500)}`);
}' <course-dir>
```

### Course id prefixes in use

Pick a **new, non-colliding** prefix for a new course. Note several course names share a
leading word (`mastering-`, `intro-`, `java-`), which is why prefixes are hand-assigned.

| Course | Prefix | Course | Prefix |
|---|---|---|---|
| `beginners-javascript` | `js-` | `mastering-ggplot2` | `gg-` |
| `c-programming-for-beginners` | `c-` | `modern-css-layout` | `css-` |
| `csharp-linq-functional` | `cs-` | `natural-language-processing-python` | `nlp-` |
| `data-analysis-python-pandas` | `pandas-` | `oop-blueprint-java` | `oopj-` |
| `database-design-postgresql` | `db-` | `practical-r-for-beginners` | `rlang-` |
| `from-zero-to-cpp` | `cpp-` | `python-basics` | `python-` |
| `functional-programming-typescript` | `fp-` | `react-from-the-ground-up` | `rx-` |
| `intro-data-viz-plotly` | `viz-` | `scientific-computing-python` | `scipy-` |
| `intro-modern-csharp` | `mcs-` | `seaborn-foundations` | `sns-` |
| `intro-sql-postgres` | `sql-` | `sql-analytics-duckdb` | `duck-` |
| `intro-web-development` | `web-` | `sqlite-for-beginners` | `lite-` |
| `java-collections-and-generics-deep-dive` | `jcol-` | `statistics-for-data-science-python` | `stat-` |
| `java-programming-for-beginners` | `java-` | `systems-programming-c` | `sysc-` |
| `machine-learning-scikit-learn` | `ml-` | `time-series-analysis-python` | `tsa-` |
| `mastering-dsa-cpp` | `dsa-` | `typescript-from-scratch` | `tsx-` |

### Site chrome: the `home` and `auth` collections

Most prompts belong to a course or an interview track. Three groups are page
*chrome* instead, and they are authored through the same pipeline on purpose —
so they show up in `/illustration-prompts`, and so "regenerate `auth-pin-duckdb`"
works exactly like any other id.

| Category | Collection | Where it renders | Size |
|---|---|---|---|
| `interview-thumbnail` | `interview` | `/interview-prep` role cards | 1536x1024 |
| `home-icon` | `home` | the home page bento grid | 1024x1024 |
| `auth-globe-pin` | `auth` | the cobe globe behind the auth card | 1024x1024 |

`home` and `auth` are single-page collections: `lib/illustrationPromptsGallery.ts`
holds them in `SINGLE_PAGE`, so `lessonRoute` returns their base URL instead of
building a `<base>/<course>/<lesson>` path. Adding another chrome collection means
adding it to `Collection`, `URL_BASE`, `SINGLE_PAGE`, `Category`, `CATEGORY_LABEL`,
`CATEGORY_ORDER`, and `meta.sizes` — all in that one file plus the JSON.

**Square, not 3:2, for anything painted into a square slot.** The bento icon and
the globe pin are both square on the page; generating 1536x1024 for them would
mean cropping. `meta.sizes` is per category, so this is just a JSON value.

**Promote chrome art with `--max-width`.** The globe pins render at 36 CSS px. A
1024px WebP is ~50 kB of detail nobody can see, and there are 19 of them on a
page a signed-out user always hits:

```bash
node scripts/promote-illustrations.mjs --all --from r2 --run <runId> --max-width 144
```

144px covers a 36px disc at 4x DPR. Measured on the pin run: **~50 kB → ~4 kB**
per image, 19 pins landing at ~75 kB total instead of ~1 MB. The flag never
upscales (`withoutEnlargement`), so it is safe to pass over a mixed run.

### Appending prompts safely

Append idempotently rather than hand-editing 300 JSON entries:

```bash
node -e '
const fs=require("fs");const P="data/illustration-prompts.json";
const j=JSON.parse(fs.readFileSync(P,"utf8"));
const have=new Set(j.prompts.map(p=>p.id));
const COURSE="modern-css-layout", TITLE="Modern CSS: Layout and Responsive Design";
// [lessonFileStem, id, title, subject, mascot?]
const ENTRIES=[
  ["css-grid","css-grid","CSS Grid in depth","a two-dimensional lattice of cells on a platform, one wide panel spanning three cells and another spanning two rows"],
];
let added=0;
for(const [lesson,id,title,subject,mascot=false] of ENTRIES){
  if(have.has(id))continue;
  j.prompts.push({id,collection:"courses",course:COURSE,courseTitle:TITLE,lesson,
    category:"course-illustration",style:"isometric illustration",title,mascot,subject});
  have.add(id);added++;
}
fs.writeFileSync(P,JSON.stringify(j,null,2)+"\n");
console.log(COURSE,"+"+added,"→",j.prompts.length);'
```

`data/illustration-prompts.json` **is** prettier-enforced (2-space, trailing newline) —
`JSON.stringify(j, null, 2) + "\n"` matches. Confirm with
`npx prettier --check data/illustration-prompts.json`.

---

## The pipeline

Keys are already environment variables in Claude Code sessions: `OPENAI_API_KEY`,
`KIE_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET`. Verify before a long run:

```bash
for v in OPENAI_API_KEY KIE_API_KEY R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET; do
  eval "val=\$$v"; [ -n "$val" ] && echo "$v: set" || echo "$v: MISSING"
done
```

### Full course run

```bash
# ids for a course, comma-joined, for --only
IDS=$(node -e 'const j=require("./data/illustration-prompts.json");
console.log(j.prompts.filter(p=>p.course===process.argv[1]&&p.category==="course-illustration")
  .map(p=>p.id).join(","))' <course-dir>)

# 1. cost check, no API calls
node scripts/generate-illustrations.mjs dry-run --only "$IDS"

# 2. generate — submit/status/download, NEVER bare `run` (gotcha 2)
node scripts/generate-illustrations.mjs submit --only "$IDS" --sink r2 --run 2026-08-<slug>
node scripts/generate-illustrations.mjs status
node scripts/generate-illustrations.mjs download --sink r2 --run 2026-08-<slug>

# 3. background removal (adds cutout.png beside each original in R2)
node scripts/remove-background-kie.mjs --from r2 --run 2026-08-<slug> --concurrency 8

# 4. promote (q92 WebP straight into public/images, then runs build-images)
node scripts/promote-illustrations.mjs --all --from r2 --run 2026-08-<slug>

# 5. wire every page (idempotent; dry-run first)
node scripts/wire-course-figures.mjs <course-dir> --dry-run
node scripts/wire-course-figures.mjs <course-dir>
```

**Waiting for a batch.** A 337-image batch took 27 minutes. Poll in the background
rather than blocking; never chain `sleep` in the foreground:

```bash
# run with run_in_background: true
for i in $(seq 1 200); do
  out=$(node scripts/generate-illustrations.mjs status 2>&1)
  if [ "$(echo "$out" | grep -cE 'validating|in_progress|finalizing')" -eq 0 ]; then
    echo "SETTLED"; echo "$out"; exit 0
  fi
  sleep 60
done
```

**Promotion is slow and gets backgrounded.** 674 files took ~25 minutes. Node buffers
stdout to a pipe, so the output file looks empty while it works — watch the filesystem
instead: `ls public/images/*.webp | wc -l`.

### Regenerating specific images

The handle printed under every figure on the site **is** the prompt id, and is exactly
what `--only` takes. That is what it is for — a user reporting "regenerate `css-grid`"
gives you everything you need.

```bash
# 1. edit that prompt's "subject" in data/illustration-prompts.json, then:
node scripts/generate-illustrations.mjs submit --only css-grid --sink r2 --run 2026-08-fix
node scripts/generate-illustrations.mjs status
node scripts/generate-illustrations.mjs download --sink r2 --run 2026-08-fix
node scripts/remove-background-kie.mjs --from r2 --run 2026-08-fix --only css-grid   # ← never skip
node scripts/promote-illustrations.mjs --from r2 --run 2026-08-fix css-grid
```

No re-wiring needed: the slug is unchanged. `build-images` re-adopts changed bytes
under the same slug with a new hash (verified). Commit is 2 WebP + one manifest line.

**Re-promoting at a different quality**, free, while the run is still in R2:

```bash
node scripts/promote-illustrations.mjs --all --from r2 --run <runId> --quality 95
```

### Adding a brand-new course

1. Assign an unused id prefix (table above).
2. Author one `course-illustration` prompt per lesson file (`lesson` = file stem) plus
   one `course-thumbnail` with `lesson: "index"`.
3. Run the pipeline, then `wire-course-figures.mjs <course>`.
4. Course cards: check `app/courses/_components/courseArt.tsx` and
   `app/_components/home/CoursesSection.tsx` — those map a **category** to an icon, not
   an image slug; the card art comes from the `<course>-thumbnail` slug.

---

## Gotchas that cost real time

Ordered by likelihood of biting you.

**1. Skipping background removal fails silently — the worst one.**
Pages reference `<id>-cutout`. Regenerate an original, skip step 3, and `promote` finds
no cut-out in the new run so it promotes **only the original**. No warning, no error.
`<id>.webp` updates, `<id>-cutout.webp` stays stale, and **the page keeps showing the
old image**. You will wrongly conclude the regeneration didn't work. A guard for this is
[open item 2](#open-items). Until then, verify explicitly:

```bash
# after any regeneration, confirm the cut-out actually moved
git status --short public/images | grep -- -cutout
```

**2. Never use bare `run` for a large batch.** A 65-minute batch outlived its `run`
process; the images were only recovered with `download --batch <id>`.
`submit` → `status` → `download` cannot lose paid work.

**3. Every expensive failure so far has been on the *retrieval* side, after the paid
work completed.** Three separate times: the OpenAI batch-output GET, the R2
`signedFetch` (43 of 45 failed with "503 DNS resolution failure" under concurrency), and
the Kie CDN result download (8 of 44). All three are now wrapped in retries.
**Any new network fetch you add to these scripts must be wrapped.** A bare `fetch` here
is a bug waiting for a burst of concurrency.

**4. Kie's rate limit is per *account*: 20 new generation requests / 10 s, and excess
429s are *not queued*.** `remove-background-kie.mjs` admits at 18/10 s through a
sliding-window limiter, so `--concurrency` can be raised freely. A 429 waits out a full
window rather than a short backoff.

**5. Kie needs a browser `User-Agent`.** Both hosts sit behind Cloudflare and answer a
UA-less request with a bare `403` / `error code: 1010`, which reads exactly like an auth
failure and is not.

**6. Kie takes a public URL only** — no base64, no data URI. The script uploads each
image through Kie's own endpoint first (free, auto-deleted after 24 h) and passes the
returned `downloadUrl`.

**7. Batch output cannot be buffered whole.** One 1536x1024 PNG is ~2.6 MB inline
base64; a 1000-image output would be ~3.6 GB and V8 caps strings at ~512 MB. Output
JSONL is parsed as a **stream** and prompts are chunked into `--batch-size` jobs. Do not
"simplify" this to `res.text()`.

**8. `gpt-image-2` has no transparent background.** `background: "transparent"` is a
400, and asking for transparency in the prompt makes the model *paint a fake
checkerboard* (verified: opaque RGB, zero alpha). Removal is always a separate step.
`output_format: "svg"` is also a 400 — png/webp/jpeg only.

**9. The R2 sink never skips.** `--force` matters only for the disk sink
(`skip: (id) => !opts.force && existsSync(...)`); the R2 sink is `skip: () => false`, so
reusing a run id overwrites cleanly.

**10. Bump `ENCODER_VERSION` in `build-images.mjs`** when encode settings change — it
invalidates every cached hash and forces a one-time re-encode. Currently `"2"`.

**11. `lib/generated/images.js` is one generated file.** Two concurrent PRs each
regenerating a different image conflict there. Resolution: take either side, re-run
`npm run build:images`.

**12. Filtering prompt ids by regex has bitten twice.** `^(c|cs)-` caught
`c-programming-for-beginners-thumbnail`; `^(viz|mcs|sql|…)-` caught three more
thumbnails. Filter on `p.category === 'course-illustration'`, never on an id prefix
alone.

**13. `pkill -f "next start"` can kill your own shell** and any command chained after
it. Run the kill and the next step as separate calls.

---

## Cost and performance, measured

| | |
|---|---|
| Tokens per image | **158** at low/1536x1024 (196 low/1024x1024; 1372 medium; 5488 high) |
| Batch pricing | $15 / 1M output tokens (standard $30) |
| Last run | 337 images → **$0.80**, **27 min**, 4 batch jobs, 0 failures |
| Per image | ~$0.0024 |
| Background removal | 337 → 0 failures at `--concurrency 8` |
| PNG → WebP q92 | 929.6 MB → 63.8 MB (**14.6x**) |
| Single vs double encode | q92→q80 = **35.58 dB** PSNR; single q80 = **37.41 dB**. The second pass cost ~1.8 dB to save ~3 kB — why promotion writes the served file directly. |

Budget a full 30-page course at roughly **$0.07** and ~40 minutes wall-clock including
removal and promotion.

---

## Verification

Run all of this before committing illustration work.

```bash
npx vitest run          # 967 tests
npx tsc --noEmit
npm run lint            # expect 0 errors, 52 pre-existing warnings
npm run build
npm run build:images    # must be a TRUE no-op on a clean tree
```

Prettier is **not** enforced on `scripts/*.mjs`, `AGENTS.md`, `Figure.tsx`, or
`assets/images/README.md` — they are already non-conforming at HEAD and `npm run lint`
passes. Don't reformat them; it only adds diff noise. It **is** enforced on
`data/illustration-prompts.json`.

`__tests__/figureSlugs.test.ts` is the guard that matters: it fails any `<Figure>` whose
slug has no image, because in production such a placement renders **nothing** — a
silent missing image. If it goes red after adding placements, that is correct
behaviour. Land the artwork; do not reach for the exemption below.

`assets/images/README.md` has a pending-slug table the test treats as an **allowlist**.
It is intentionally **empty**. Do not add stale rows: a leftover row whitelists a slug
that will never resolve, so a typo matching it ships an invisible image with a green
test.

### Audits the suite doesn't cover

```bash
# coverage + stale slugs + inline svg, across every course
node -e '
const fs=require("fs"),path=require("path");const m=require("./lib/generated/images.js");const e=m.default||m;
let pages=0,figs=0,bad=0,svg=0;
(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);
  if(fs.statSync(p).isDirectory())walk(p);else if(f.endsWith(".mdx")){
    const s=fs.readFileSync(p,"utf8");pages++;if(/<svg[\s>]/.test(s))svg++;
    const fm=[...s.matchAll(/<Figure\b[^>]*slug="([^"]+)"/g)];figs+=fm.length;
    if(fm.length!==1)console.log("  "+fm.length+" figures:",p);
    for(const x of fm)if(!e[x[1]]){bad++;console.log("  unresolved",x[1],p);}}}})("content/courses");
console.log(pages+" pages, "+figs+" figures, "+bad+" unresolved, "+svg+" with inline svg");'

# manifest vs disk: no missing served files, no strays
node -e '
const m=require("./lib/generated/images.js");const e=m.default||m;const fs=require("fs");
const k=Object.keys(e);let miss=[];
for(const s of k)for(const f of e[s].formats)if(!fs.existsSync(`public/images/${s}.${f}`))miss.push(s+"."+f);
const stray=fs.readdirSync("public/images").filter(f=>{const s=f.replace(/\.[^.]+$/,""),x=f.split(".").pop();
  return !e[s]||!e[s].formats.includes(x);});
console.log(k.length+" entries, "+k.filter(s=>e[s].formats.length===1).length+" single-format, "
  +miss.length+" missing, "+stray.length+" stray");'

# mascot flag consistent with subject text
node -e '
const j=require("./data/illustration-prompts.json");
const re=/marmot|panda|penguin|duck|elephant|predator/i;
const bad=j.prompts.filter(p=>p.mascot!==re.test(p.subject));
console.log(bad.length+" mascot-flag mismatches");bad.slice(0,10).forEach(p=>console.log("  ",p.id,p.mascot));'

# prompts are 1:1 with lesson files for a course
node -e '
const fs=require("fs"),j=require("./data/illustration-prompts.json"),c=process.argv[1];
const files=fs.readdirSync("content/courses/"+c).filter(f=>/\.mdx?$/.test(f)&&f!=="index.mdx")
  .map(f=>f.replace(/\.mdx?$/,""));
const mapped=new Set(j.prompts.filter(p=>p.course===c&&p.category==="course-illustration").map(p=>p.lesson));
console.log("missing:",files.filter(f=>!mapped.has(f)).join(",")||"none");
console.log("extra:",[...mapped].filter(l=>!files.includes(l)).join(",")||"none");' <course-dir>

# mermaid must be untouched — compare against a pre-change ref
git grep -c '```mermaid' <ref> -- content | awk -F: '{s+=$3} END {print "before:",s}'
git grep -c '```mermaid' HEAD  -- content | awk -F: '{s+=$3} END {print "after: ",s}'
```

Spot-check rendered markup in the build (an illustration must be a bare `<img>`, no
`<source>`):

```bash
grep -oE '<figure[^>]*>.{0,400}' .next/server/app/courses/<course>/<page>.html | head -1
```

---

## Architecture notes

**Why promotion writes the served file directly.** `promote-illustrations.mjs` encodes
q92 WebP into `public/images/<id>.webp` and that file *is* what browsers download.
`build-images.mjs` has an **adoption pass**: an orphan `.webp` in `public/images` with
no source under `assets/images` is hashed (`ENCODER_VERSION` + bytes), has its
dimensions read, and is registered as `formats: ["webp"]` — which also protects it from
the prune step. So each illustration is encoded once and exists in git once.

**Two classes of image can reach `public/images`:** pipeline illustrations (single
format, every image today) and raster sources under `assets/images` (encoded to
`.webp` + a `.png`/`.jpg` fallback). The second path is currently unused but stays
supported and tested for a future photo or screenshot.

**`<Figure>`** reads the manifest, uses `formats[last]` as the `<img>` src and the rest
as `<source>`. With one format `<picture>` collapses to a plain `<img>`. It also renders
the prompt id in a `<figcaption class="assetId">` — that is the regeneration handle, and
it is deliberately on production pages.

**R2 client** is hand-rolled SigV4 over `node:crypto` (`scripts/lib/r2.mjs`), no AWS
SDK, because the pipeline only needs put/get/list/delete on one bucket. `signedFetch`
**re-signs every attempt** — the signature covers `x-amz-date`, so a retry reusing the
first attempt's headers would eventually fail the 15-minute skew check instead of
succeeding.

---

## R2 candidate storage

Bucket `dataslope-illustrations`, keys
`illustrations/<runId>/<promptId>/v<n>/{original,cutout}.png`. Run-scoped, so a whole
run is one prefix delete and a lifecycle rule can expire it with no bookkeeping.
Candidates stay **PNG** (pristine, re-processable); only the promoted copy is WebP.
There is deliberately no D1 table and no Worker binding — these are authoring scripts
against the S3 API, keeping content authoring decoupled from deploying the app.

Retention is **14 days** (raised from 7 on 2026-07-30), applied by
`.github/workflows/r2-illustrations-lifecycle.yml`.

**The rule has never actually been applied.** #612 has since merged, which triggered the
workflow, and that first run failed: `AccessDenied` on `PutBucketLifecycleConfiguration`.
A lifecycle rule is bucket configuration, which R2 lets only an **Admin Read & Write**
token edit — an **Object Read & Write** token gets as far as `head-bucket` and is then
denied. The workflow now takes `R2_ADMIN_ACCESS_KEY_ID` / `R2_ADMIN_SECRET_ACCESS_KEY`
(the `dataslope-github-admin` token, created 2026-07-30 along with those secrets). Until
the job is re-run, nothing has expired and all 9 runs remain:

| Run | Objects |
|---|---|
| `2026-07-29-python-isometric` | 34 |
| `2026-07-29-thumbnails-and-backfill` | 90 |
| `2026-07-29-pandas` | 80 |
| `2026-07-29-javascript` | 60 |
| `2026-07-29-c-and-csharp` | 88 |
| `2026-07-30-db-cpp-fp` | 168 |
| `2026-07-30-seven-courses` | 382 |
| `2026-07-30-elephants` | 40 |
| `2026-07-30-final-fifteen` | 674 |
| **Total** | **1616** |

Until the rule runs, **any** image can be re-promoted at a different quality for free.

List what's actually there:

```bash
node -e 'import("./scripts/lib/r2.mjs").then(async({createR2Client,credentialsFromEnv})=>{
  const c=createR2Client(credentialsFromEnv());const keys=await c.list("illustrations/");
  const runs={};for(const k of keys){const m=/^illustrations\/([^/]+)\//.exec(k);if(m)runs[m[1]]=(runs[m[1]]||0)+1;}
  for(const [r,n] of Object.entries(runs).sort())console.log(r.padEnd(36),n);
  console.log("TOTAL",keys.length);});'
```

`PutBucketLifecycleConfiguration` **replaces a bucket's entire** lifecycle config. The
workflow refuses to run against any bucket but `dataslope-illustrations`; never point it
at `dataslope-inc-cache` or `dataslope-workspaces`, whose contents are not disposable.

---

## Git and PR workflow

Branch for this work: `claude/gpt-image-2-api-test-v4memq`, PR **#612**.

- Always `git push -u origin <branch>`; retry network failures with exponential backoff
  (2s, 4s, 8s, 16s).
- **If #612 is already merged, do not stack onto it.** Restart the branch from the
  latest default branch and open a new PR:
  `git fetch origin main && git checkout -B <branch> origin/main`.
- No `gh` CLI in this environment — use the `mcp__github__*` MCP tools for PRs, reviews,
  comments, and Actions.
- Commits touching image bytes are large (674 files in one commit is normal). That is
  expected; don't split them to look tidier — the manifest must land with its images.

---

## Open items

1. **Run the lifecycle workflow successfully once.** Mandatory: until it applies,
   candidates accumulate indefinitely. The `dataslope-github-admin` token
   (**Admin Read & Write**) and its `R2_ADMIN_*` repository secrets exist as of
   2026-07-30, so this is now unblocked — an agent can run it:

   ```
   mcp__github__actions_run_trigger   owner=dataslope repo=dataslope
                                      workflow=r2-illustrations-lifecycle.yml ref=main
   ```
   Run it once with the `dry_run` input `true` to print the rule without applying it,
   confirm the output shows `"Days": 14`, then run again with `dry_run` false. The job
   reads the config back and fails if the rule is absent, so a silent no-op is already
   guarded — and a dry run that cannot read the configuration now fails instead of
   reporting `(none set)`. Verify with `mcp__github__actions_get`.

   The `R2_INC_CACHE_*` secrets that `r2-cache-cleanup.yml` uses are the **object-scoped**
   pair (renamed 2026-07-30 from `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`). Do not point
   this workflow at them, and do not point that one at `R2_ADMIN_*`: admin tokens are
   account-wide, and that job deletes on a schedule.

2. **Guard the silent-stale-cut-out failure** (gotcha 1). Offered to the user, not built.
   In `promote-illustrations.mjs`, warn when promoting an original whose cut-out is
   absent from the source run *but* a `<id>-cutout.webp` already exists in
   `public/images` — that combination means a page will keep serving the old image.
   Turns a silent wrong-image into a visible message. Small, high value.

3. **Second illustration for multi-diagram pages — user's call, do not assume.** Pages
   that had two or three inline SVG diagrams collapsed to one figure. **119 pages had
   more than one** (465 SVGs across 316 pages), so some pages lost a distinct
   explanatory image. Adding a second illustration to those is ~$0.30 and one batch
   cycle. The user has been told; they have not asked for it.

4. **Do not do unprompted:** the `.assetId` figcaption renders the prompt id on
   production pages. It exists so the user can name an image for regeneration. If it
   ever reads as clutter, gating it behind non-production is a one-line change — but
   ask first.

---

## Style feedback from the user, verbatim in substance

Direct preferences. Don't re-litigate these.

- **Isometric won every comparison.** The `strings` risograph was the only usable one
  *because it was simple*; the dictionaries, exceptions, and history risographs were all
  too complex. The mountain-marmot thumbnail looked great but cut out badly.
- **Recraft (via Kie) is much better** than Replicate's `851-labs/background-remover`,
  which dissolved busy frames into translucent ghosts. A local colour-key was worse
  still; its script was deleted.
- **The user spotted the double compression before it was explained, and was right.**
  Serve quality matters to them — never quietly trade it for kilobytes.
- **They asked for the id under each image** specifically so they could request
  regenerations. Keep it working.
- **PostgreSQL courses get elephants.** Pandas gets ≥25% panda/marmot presence.
- **Mermaid is out of scope.** Confirmed untouched; keep it that way.
