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
(`--ds-<hue>-<step>`) and previewable at `/color-test`. **Prefer the `500`
shade** (the primary/base color); the other steps exist for when a lighter or
darker tone is required (backgrounds, borders, hover states, AA-legible text on
white, and telling chart/diagram series apart). `500` = the brand color; the
`ink` text anchors that clear WCAG AA body text on white are noted per hue.

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

1. **Author** the prompt in `data/illustration-prompts.json` (one source of
   truth: the `/illustration-prompts` gallery, the in-lesson `<Figure>`, and
   the generator all read it).
2. **Generate** with `scripts/generate-illustrations.mjs` — OpenAI `gpt-image-2`,
   **quality `low`**, **size `1536x1024`**, always via the **Batch API**.
3. **Remove the background** with Recraft's `remove-background` through Kie AI.
4. **Place** the source in `assets/images/`, run `npm run build:images`, and
   embed with `<Figure slug="…" alt="…" />`.

```bash
# generate (low + batch are the defaults; --out defaults to ./generated-illustrations)
node scripts/generate-illustrations.mjs dry-run          # prompts + projected cost, no API calls
node scripts/generate-illustrations.mjs run              # submit, poll, download
```

### Non-negotiables

**Quality `low`.** Image output tokens dominate the bill and the tiers are far
apart. Measured on `gpt-image-2`: a 1536x1024 image is **158 output tokens at
`low`** vs 1372 at `medium` and 5488 at `high`. At Batch pricing ($15 / 1M
output tokens) 1000 images is ~$2.37 at `low` and ~$82 at `high`. `low` is
visibly fine for this material. Never leave quality at `auto` — it picks its
own tier per prompt, costing ~2x `low` with no control.

**Size `1536x1024`** unless there is a specific reason otherwise. It is also
the cheaper option: 158 tokens vs 196 for `1024x1024` at the same quality.

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

**Risograph is the occasional exception**, and only for a *simple* subject —
typically a mascot moment. Of the risographs tried, only `strings` (a ribbon of
tiles) worked; `dictionaries`, `exceptions`, and `history` were all too busy.
The marmot-in-the-mountains thumbnail looks great as a standalone image but did
not survive background removal.

**Avoid** flat geometric vector, line art, blueprint schematic, and cut-paper
collage.

| Style | Use |
| --- | --- |
| isometric illustration | ✅ default |
| risograph | ⚠️ occasionally, simple subjects / mascot only |
| flat geometric vector | ❌ |
| line art illustration | ❌ |
| blueprint schematic | ❌ |
| cut-paper collage | ❌ |

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

Check both themes with the toggle on `/illustration-prompts`, which renders
each cut-out over the live page background for exactly this reason.

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
