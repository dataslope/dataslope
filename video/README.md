# Dataslope videos

Short tutorial videos, made in code with [Remotion](https://www.remotion.dev).
Each one is timed to a narration script, so the voice-over can be added later
without re-timing anything by hand.

This is its own package: nothing here is part of the site's build, and the
site's `tsconfig.json` and ESLint config ignore it.

| Composition | Format | About |
| --- | --- | --- |
| `SqlExecutionOrder` | 16:9 | "SQL doesn't run in the order you write it" (`intro-sql-postgres/query-execution-order`), house isometric style |
| `TabsVsSpaces` | 9:16 | The tabs vs spaces debate, for YouTube Shorts and TikTok, house isometric style |
| `BinarySearch` | 9:16 | Guessing 1 to 100 in seven tries, as an 8-bit arcade game with pixel-art sprites |
| `FloatingPoint` | 16:9 | Why 0.1 + 0.2 isn't 0.3, as a chalkboard lecture with chalk drawings |
| `CentralLimitTheorem` | 16:9 | The Central Limit Theorem as a magazine science page, with watercolors |
| `LlmTokens` | 9:16 | Why "strawberry" trips up a language model, in neon with claymation figures |
| `EventLoop` | 16:9 | The JavaScript ordering puzzle as an engineering blueprint |

All of them render at 4K: 3840x2160 for 16:9, or 2160x3840 for 9:16.

`CentralLimitTheorem` also has five design variations in the Studio's
`CLT-variations` folder. Each changes one thing from the default (Fraunces,
captions on):

| Composition | Change |
| --- | --- |
| `CentralLimitTheorem-NoCaptions` | No captions; the figures take the space they used |
| `CentralLimitTheorem-Inter` | Inter throughout (headlines from its Display cut) |
| `CentralLimitTheorem-Newsreader` | Newsreader headlines and captions |
| `CentralLimitTheorem-SourceSerif` | Source Serif 4 headlines and captions |
| `CentralLimitTheorem-Playfair` | Playfair headlines and captions |

They are the same composition with two props, `typeface` and `captions`, so
any pairing can be tried from the Studio's props panel. The faces are defined
in `typefaces.ts`; each is scaled to Fraunces's x-height, so changing the face
never moves the layout. Turning captions off stretches the page vertically
(`layout.ts`) instead of leaving a blank band at the bottom.

## Quick start

```bash
cd video
npm install
npm run studio                               # preview and scrub in the browser
npm run render -- SqlExecutionOrder          # 4K → out/SqlExecutionOrder.mp4
npm run render:fhd -- SqlExecutionOrder out/SqlExecutionOrder-fhd.mp4   # 1920x1080
npm run render:preview -- SqlExecutionOrder out/sql-preview.mp4   # half size, fast
npm run still -- SqlExecutionOrder out/frame.png --frame=600
npm run cues -- sql-execution-order          # when each beat is spoken
```

Remotion downloads its own Chrome Headless Shell on the first render. Where
that download is blocked, point it at one you have:
`REMOTION_BROWSER_EXECUTABLE=/path/to/headless_shell` (the cloud container has
one under `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/`).

### Why the compositions are 1080p

Every composition is laid out at 1920x1080 (or 1080x1920) CSS pixels and
rendered with `--scale=2`, which `npm run render` passes. Text, SVG and the
patterns are drawn at 4K directly, so nothing is upscaled, and every size in
the source stays in the familiar 1080p range. `npm run render:fhd` renders the
same layout at 1080p (`--scale=1`), and `npm run render:preview` at half that.

## How a video is put together

```
src/videos/<video>/
  script.ts            narration: beats, the unit audio is generated in
  Video.tsx            the composition: scenes, each cued to narration words
  illustrations.json   image prompts (house style, GPT Image)
  patterns.json        Tabbied patterns
public/images/<video>/     trimmed WebP cut-outs (generated, committed)
public/patterns/<video>/   pattern SVGs (generated, committed)
public/narration/<script id>/   audio and alignment, once there is audio
```

Shared building blocks:

- `src/narration/`: timing, cues, captions and audio playback.
- `src/components/`: `Scene`, `Pattern`, `Illustration`, `Logo` and the
  `motion` helpers.
- `src/theme/`: the site's brand tokens (imported from `app/brand.css`) and
  its fonts (Inter, JetBrains Mono).

Register a new composition in `src/Root.tsx` with
`calculateMetadata={narratedMetadata(script)}` so its length follows the
narration.

## What goes on screen

`CentralLimitTheorem` follows these rules; the six earlier videos predate them.

- **Content only.** No running head or masthead, and no branded end card. The
  video starts on its first idea and stops on its last.
- **No tracked capitals.** Kickers, figure numbers and axis titles are set in
  sentence case. All caps with wide letter spacing shouts, and it blurs at
  small sizes.
- **Nothing under 19px** on the 1080p layout, which is about the smallest that
  still reads on a phone. Running text and notes sit at 20px and up.
- **Room between neighbours.** A figure label, the heading under it and an
  illustration beside them each get clear space: about 25px between rows of
  text, more between text and a chart. Figure labels are one line of Inter at
  one size ("Fig. 3" in the accent, the title in ink), and a chart's legend
  goes at the right end of that line rather than over the data.
- **Text that follows text flows.** A second phrase on the same line, an
  underline or a strike-through is laid out against the words (flex, `em`,
  `100%`), never at a pixel offset measured in one font, so the line still
  works when the face changes.
- **Reveals keep their descenders.** A mask paints only inside its element's
  box, and a line box set near `line-height: 1` cuts off g, p and y until the
  mask comes off. Give a masked wrapper some padding with a matching negative
  margin, and set `box-sizing: content-box` so a `width` on it still means
  the width of the text.

## Narration and timing

A script is a list of **beats**, each a sentence or two with a stable `id`.
Scenes never use frame numbers. They ask what is being said:

```tsx
const n = useNarration();
const strikeAt = n.word("where", "Anything");    // frame "Anything" is spoken
const { from, to } = n.beat("where");            // the beat's first and last frame
const later = n.word("having", "Dee", { nth: 2, edge: "end" });
```

If a cue names a word the beat no longer says, it throws. That's on purpose:
an error in the Studio is better than an animation that silently drifts off
its word.

Timing comes from one of two places:

- **Estimate** (now). A reading-speed model, about 160 words a minute with
  pauses at punctuation. Good enough to build and review a video before any
  audio exists. The burned-in captions show where each word lands.
- **Alignment** (once the audio exists). ElevenLabs' character timestamps.
  When `public/narration/<script id>/alignment.json` exists, every beat it
  covers is timed from it and its audio plays at that moment. Nothing in the
  scenes changes.

### Adding the voice-over later

Generate one audio file per beat with ElevenLabs
`POST /v1/text-to-speech/{voice_id}/with-timestamps`, sending the beat's
`text` exactly. You can send the neighbouring beats as `previous_text` and
`next_text` so the intonation runs on. Save each response's audio as
`public/narration/<script id>/<beat id>.mp3`, and its `alignment` (not
`normalized_alignment`) into one file:

```json
{
  "beats": {
    "hook": {
      "text": "Here's a SQL fact that trips up almost everyone.",
      "audio": "narration/sql-execution-order/hook.mp3",
      "alignment": {
        "characters": ["H", "e", "r", "e", "..."],
        "character_start_times_seconds": [0, 0.07, 0.12, 0.16],
        "character_end_times_seconds": [0.07, 0.12, 0.16, 0.21]
      }
    }
  }
}
```

A beat whose text has changed since its audio was made is reported as `stale`
by `npm run cues` and falls back to the estimate, so an edited sentence can't
play the old audio out of sync. Re-generate just that beat.

Words like "SQL" and "Postgres" are better pinned with an ElevenLabs
pronunciation dictionary than respelled in the script: the captions show the
script text exactly as written.

Captions are on by default (`captions: true` in the composition's props).
Switch them off in the Studio's props panel, or with
`--props='{"captions":false}'`.

## Images

Illustrations come from the site's own pipeline
(`scripts/generate-illustrations.mjs` at the repo root), so they get the same
house style and checks:

- OpenAI `gpt-image-2.5-flare` (set in each `illustrations.json`)
- `quality: low`
- transparent background
- the Batch API
- an alpha check that rejects an image painted on an opaque background

The prompts stay in `src/videos/<video>/illustrations.json`, never in
`data/illustration-prompts.json`, so video art doesn't show up in the site's
gallery.

### A video's own image style

A prompt with no `style` is drawn in the site's isometric house style. A
video can define its own style instead (pixel art, chalk, watercolor,
claymation, blueprint linework…) in its file's `meta.styles`, and point
prompts at it:

```json
{
  "meta": {
    "styles": {
      "chalk drawing": {
        "constraints": "Draw it in rough dry-chalk strokes… Leave the background fully empty and transparent: no board, no frame, no shadow.",
        "softAlphaWarn": 0.35
      }
    }
  },
  "prompts": [{ "id": "…", "category": "video-icon", "style": "chalk drawing", "subject": "…" }]
}
```

Each prompt then reads "A chalk drawing of <subject>." It starts with the
shared rules ("No text. Draw only the objects described…"), then has the
style's `constraints` where the house constraints would be, then the brand
colors. `softAlphaWarn` is the partial-alpha share above which the generator
warns. Grainy media (chalk, watercolor, fine linework) are soft by nature,
so they need a higher bar.

Write the constraints the way the house ones are written. Keep them
prohibitive, because a noun named inside a "no …" clause still gets drawn.
Always ask for an empty transparent background. Keep it to a few large
objects. A monochrome style is fine in a video, since its background never
changes, which the site's two themes can't promise.

```bash
# needs the repo root's `npm install` (for sharp) and OPENAI_API_KEY
npm run illustrations -- sql-execution-order --dry-run   # prompts and cost
npm run illustrations -- sql-execution-order             # generate + import
npm run illustrations -- sql-execution-order --only sql-eo-hero --force
```

Raw PNGs land in `.generated/` (gitignored). The import step trims each one
to its drawn content and writes a WebP to `public/images/<video>/`, and that
WebP is the file that gets committed.

## Patterns

Background and decorative patterns come from
[Tabbied](https://tabbied.com) (the `tabbied` npm package, MIT; its terms let
you use the patterns you make commercially). They are rendered once to SVG in
the brand palette, so every frame and every machine draws the same pattern:

```bash
TABBIED_CHROMIUM=/path/to/chromium npm run patterns -- sql-execution-order
```

`patterns.json` names a design (`npx tabbied list`, or browse tabbied.com), a
seed, a size and a palette given as brand token names (`"blue"`,
`"teal-300"`, `"transparent"`), so no hex value is written by hand. Use
patterns sparingly: a band on the title or end card, or one transition. Never
put one behind text the viewer has to read.

## Checks

```bash
npm run typecheck
npm run lint
npm test          # the timing model
```
