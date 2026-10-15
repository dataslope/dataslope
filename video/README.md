# Dataslope videos

Short tutorial videos, made in code with [Remotion](https://www.remotion.dev).
Each one is timed to a narration script, so the voice-over can be added later
without re-timing anything by hand.

This is its own package: nothing here is part of the site's build, and the
site's `tsconfig.json` and ESLint config ignore it.

| Composition | Format | About |
| --- | --- | --- |
| `SqlExecutionOrder` | 16:9, 3840x2160 | "SQL doesn't run in the order you write it", after the lesson `intro-sql-postgres/query-execution-order` |
| `TabsVsSpaces` | 9:16, 2160x3840 | The tabs vs spaces debate, for YouTube Shorts and TikTok |

## Quick start

```bash
cd video
npm install
npm run studio                               # preview and scrub in the browser
npm run render -- SqlExecutionOrder          # 4K → out/SqlExecutionOrder.mp4
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
the source stays in the familiar 1080p range. `npm run render:preview` passes
`--scale=0.5` instead.

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
