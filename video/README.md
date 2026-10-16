# Dataslope videos

Short tutorial videos, made in code with [Remotion](https://www.remotion.dev).
Each one is timed to a narration script, so the voice-over can be added later
without re-timing anything by hand.

This is its own package: nothing here is part of the site's build, and the
site's `tsconfig.json` and ESLint config ignore it.

Every video is 16:9 and drawn in the **editorial** style described below.

| Composition | About |
| --- | --- |
| `CentralLimitTheorem` | Lopsided wait times whose averages still pile up into a bell |
| `ListVsSet` | `999_999 in big_list` against the same lookup in a set |
| `SqlNullTrap` | Three-valued logic, and `NOT IN` over a subquery that yields a `NULL` |
| `WhyNormalization` | The three anomalies of one wide table, and the split that fixes them |
| `BaseRate` | A 99% accurate test that is usually wrong |
| `Overfitting` | Polynomials of rising degree, scored on training and held-out data |
| `CPointers` | `&n`, `*p`, and the swap that changes nothing until it takes addresses (voiced) |
| `WindowFunctions` | What `GROUP BY` throws away and `OVER` keeps |
| `LeftJoinTrap` | A `WHERE` on the right table that turns a `LEFT JOIN` back into an inner one |
| `PandasGroupby` | Split, apply, combine on a seven-row frame |
| `RandomWalks` | Trends that are not there, and the differencing that removes them |
| `RecursionFib` | Why naive `fib(50)` takes so long, and the memo that fixes it |
| `TypeErasure` | TypeScript's types are gone at runtime, and what checks a value instead |
| `BoxSizing` | `content-box` against `border-box`, and the two columns that stop fitting |
| `LlmTemperature` | What temperature does to a model's next-token choice (voiced) |
| `TfIdf` | Term frequency, inverse document frequency, and the word that scores zero |
| `JavaEquality` | `==` or `.equals()`, with the stack, the heap and the `Integer` cache |
| `SimpsonsParadox` | Berkeley's 1973 admissions: women ahead in most departments, behind overall |

Each follows the lesson it is named after (the header of its `script.ts` says
which), and each renders at 4K: 3840x2160.

### The editorial videos

The eighteen editorial videos share one look, the shared editorial kit in
`src/editorial/`: warm paper, numbered figures with Inter
labels, ink-wipe reveals, watercolor spot illustrations, and Source Serif 4
headlines with no burned-in captions. That setting was chosen from a
side-by-side trial of five faces with and without captions. A new video in
this style wraps its scenes in `<EditorialPage>` and registers with
`defaultProps={EDITORIAL_DEFAULTS}`.

Two props keep the alternatives a click away in the Studio's props panel:

- `typeface`: `"source-serif"` (default), `"fraunces"`, `"newsreader"`,
  `"playfair"` or `"inter"`. The faces are defined in
  `src/editorial/typefaces.ts`, each scaled to the same x-height, so changing
  the face never moves the layout.
- `captions`: off by default. Turned on, the narration appears as a serif
  lower third and the page compresses vertically to make room for it
  (`src/editorial/layout.ts`). Scenes therefore pass every vertical position
  through `useLayout().y()` and every vertical length through `h()`.

The paper's grain is two full-frame SVG noise filters (`PaperSource` in
`src/editorial/ui.tsx`), but a page never draws them. Drawn live they made
every frame about three times slower to render (450 frames at 1080p: 125 s
against 42 s; 150 frames at 4K: 148 s against 37 s), for a picture that
never changes. `<Paper>` shows `public/editorial/paper@1x.webp` instead, or
`paper@2x.webp` whenever the render is scaled up, so a 4K render gets grain
at full resolution rather than a stretched 1080p copy. Both are lossless, and
a page renders the same either way: identical pixels in the frames checked,
apart from antialiasing on a few edge pixels of BaseRate's 10,000-dot grid.
Re-run `npm run paper` after changing `PaperSource`, `PAPER`, `INK` or the
yellow tone.

## Quick start

```bash
cd video
npm install
npm run studio                               # preview and scrub in the browser
npm run render -- CPointers                  # 4K → out/CPointers.mp4
npm run render:fhd -- CPointers out/CPointers-fhd.mp4   # 1920x1080
npm run render:preview -- CPointers out/c-pointers-preview.mp4   # half size, fast
npm run still -- CPointers out/frame.png --frame=600
npm run cues -- c-pointers                   # when each beat is spoken
```

Remotion downloads its own Chrome Headless Shell on the first render. Where
that download is blocked, point it at one you have:
`REMOTION_BROWSER_EXECUTABLE=/path/to/headless_shell` (the cloud container has
one under `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/`).

### Why the compositions are 1080p

Every composition is laid out at 1920x1080 CSS pixels and
rendered with `--scale=2`, which `npm run render` passes. Text, SVG and the
patterns are drawn at 4K directly, so nothing is upscaled, and every size in
the source stays in the familiar 1080p range. `npm run render:fhd` renders the
same layout at 1080p (`--scale=1`), and `npm run render:preview` at half that.

The one thing a scaled-up render can't redraw is a raster image, and every
illustration is one: the image model returns at most 1536x1024, and trimming
leaves less. At 4K, an illustration drawn 620 px tall needs 1240 pixels of
height. `npm run check:4k` walks every composition at `--scale=2`, a frame
every half second, writing nothing to disk (about a minute for all 18), and
fails if any illustration is drawn across more device pixels than it has.
`<Illustration>` logs the figure as it loads, so the check sees exactly what a
render does. All 37 pass. LlmTemperature's thermometer was drawn larger than
its pixels, and is now drawn at exactly the size they cover. The paper grain has a 2x image of
its own (see the editorial section), and text, SVG, patterns and the logo are
vector.

## How a video is put together

```
src/videos/<video>/
  script.ts            narration: beats, the unit audio is generated in
  Video.tsx            the composition: scenes, each cued to narration words
  illustrations.json   image prompts (watercolor, GPT Image)
  patterns.json        Tabbied patterns, if the video uses any
public/images/<video>/     trimmed WebP cut-outs (generated, committed)
public/patterns/<video>/   pattern SVGs (generated, committed)
public/narration/<script id>/   audio and alignment, once there is audio
takes/<script id>/              the raw take the audio was cut from
```

Shared building blocks:

- `src/narration/`: timing, cues, captions, audio playback and the two house
  voices (`voices.ts`).
- `src/components/`: `Scene`, `Illustration` and the `motion` helpers, plus
  `Pattern` and `Logo`, which no current video places (see Patterns).
- `src/theme/`: the site's brand tokens (imported from `app/brand.css`) and
  its fonts (Inter, JetBrains Mono).
- `src/editorial/`: the editorial look (page, typefaces, layout, figure
  labels, reveals, histogram and axis primitives) shared by the videos in it.

Register a new composition in `src/Root.tsx` with
`defaultProps={EDITORIAL_DEFAULTS}` and
`calculateMetadata={narratedMetadata(script)}`, so its length follows the
narration.

## What goes on screen

Every video follows these rules.

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

### Time to take a scene in

A beat that a scene opens on is marked `scene: true`. The timeline then
leaves at least the script's `sceneGap` of silence before it (1.6 s by
default), so the scene that ends there stays on screen, finished, before it
goes. With an ordinary beat pause the cut came 0.1 to 0.4 s after the last
word, which was too soon to read the finished figure. It now comes at least
1.3 s after, in every video.

How long the finished scene holds is the gap minus how early the video's exit
starts. Most cut 6 or 8 frames before the next beat. A video whose exits start
earlier raises its `sceneGap`, as RandomWalks does (2.0 s), since it fades
its text 20 frames early. An exit that only one cut needs can instead take a
longer `pauseAfter` on the beat before it, which the gap never shortens.

`src/narration/scenes.test.ts` fails if a Video.tsx cuts to a beat with
`cut("…")` that is not marked, or if the timeline leaves less than the gap
before a marked beat. Mark beats the same way when a scene opens on a beat
some other way, such as a wipe or an eraser keyed to `beat("…").from`.

### Adding the voice-over later

```bash
# needs ELEVENLABS_API_KEY
npm run narrate -- c-pointers --dry-run   # the text it would send
npm run narrate -- c-pointers             # a take, or the beats not yet voiced
npm run narrate -- c-pointers --only star # re-voice one edited beat
npm run narrate -- c-pointers --force     # a whole new take
npm run narrate -- c-pointers --recut     # cut the kept take again, no API call
npm run cues -- c-pointers                # the timing it produced
```

`scripts/narrate.mjs` voices a script with ElevenLabs
`POST /v1/text-to-speech/{voice_id}/with-timestamps`, on the
`eleven_v4_turbo` model. The script refuses any response whose alignment
doesn't spell the text it sent exactly, because the timeline would ignore it.

**Two house voices.** A script names its narrator with `voice`, one of the
two in `src/narration/voices.ts`:

| `voice` | ElevenLabs voice | Reads |
| --- | --- | --- |
| `"drew"` (the default) | Drew, `q0IMILNRPxOgtBTS4taI` | casual, curious and fun: a video that walks through a puzzle with the viewer (CPointers) |
| `"hope"` | Hope, `tnSpp4vdxKPjI9w0GnoV` | upbeat and clear: a video that explains a result step by step (LlmTemperature) |

The voice belongs to the script, not to a flag, so the next person to run
`npm run narrate` on a video gets the same narrator. Changing it re-voices
every beat, so a video never mixes two, and `npm test` fails if a video's
committed audio is in a different voice from the one its script names.
`--voice` overrides it for a trial, with a house name or any ElevenLabs voice
id; to keep the result, set `voice` in the script (or add the voice to
`voices.ts` first).

**A video is voiced as one take.** When every beat needs voicing (the first
run, a new voice, or `--force`), the whole script goes in a single request:
beats joined by a space, and a paragraph break before each beat that opens a
scene. The take is then cut into beats at the middle of the longest silence
in each pause between them, so no cut lands in a word. Each beat keeps up to
0.45 s of breath before its first word and 0.3 s of decay after its last,
with an 8 ms fade at the cut. The timeline starts a beat's audio early by
that lead-in, so the first word still lands on the beat, and never starts it
over the end of the beat before.

That is most of the difference between narration and text-to-speech. Voiced
one request per beat, every sentence started cold, on the same contour, with
the same energy. In one take, a question lifts and its answer comes down,
and one sentence runs into the next.

Where each beat's first word starts is read from the sound, not the
character times. Those are only good to about 80 ms, and worse in two
places: an audio tag takes time from the word after it (in CPointers the
alignment gave `[curious]` the first 0.26 s of "So", and the beat's audio
started over the end of the previous sentence), and a word that opens on
"t", "f" or "s" is timed from its vowel, up to 0.17 s late. The cut finds the
first sound after the pause and moves the first letter's time there, and
`npm run narrate` prints each beat it moved by more than 80 ms.

**What is committed.** Everything a render needs, and the master it came
from:

- `public/narration/<script id>/`: one MP3 per beat and `alignment.json`.
  This is what a video plays, about 1.1 MB a video.
- `takes/<script id>/`: the raw take (`take.mp3`) and its alignment
  (`take.json`), about 1.3 MB. The beats are cut from it, so `--recut` can
  cut them again, for instance after a change to the cutting, without paying
  for another take, and a plain run reuses it when its text and voice still
  match. A re-cut is deterministic: cutting an unchanged take reproduces the
  committed beats byte for byte. `npm test` fails if a voiced video has lost
  its take.

A beat whose text has changed since its audio was made is reported as `stale`
by `npm run cues` and falls back to the estimate, so an edited sentence can't
play the old audio out of sync. Re-generate just that beat.

The real voice runs at its own pace, not the estimate's. CPointers went from
67 s on the estimate to 86 s in Drew's take (139 words a minute, pauses
included), and LlmTemperature runs 98.5 s in Hope's (135). Every cue re-times
by itself, and the scene gaps still hold.

Words like "SQL" and "Postgres" are better pinned with an ElevenLabs
pronunciation dictionary than respelled in the script: the captions show the
script text exactly as written.

Captions are off by default (`EDITORIAL_DEFAULTS`). Switch them on in the
Studio's props panel, or with `--props='{"captions":true}'`.

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
video defines its own style instead in its file's `meta.styles`, and points
prompts at it. Every editorial video uses the same watercolor style, copied
into each file:

```json
{
  "meta": {
    "styles": {
      "watercolor illustration": {
        "constraints": "Paint it in loose, transparent watercolor… Leave the background fully empty and transparent behind, around and beneath the subject: no backdrop, …",
        "softAlphaWarn": 0.3
      }
    }
  },
  "prompts": [{ "id": "…", "category": "video-hero", "style": "watercolor illustration", "subject": "…" }]
}
```

Each prompt then reads "A watercolor illustration of <subject>." It starts with the
shared rules ("No text. Draw only the objects described…"), then has the
style's `constraints` where the house constraints would be, then the brand
colors. `softAlphaWarn` is the partial-alpha share above which the generator
warns. Watercolor feathers at its edges, so it is soft by nature and needs a
higher bar than the house style's.

Write the constraints the way the house ones are written. Keep them
prohibitive, because a noun named inside a "no …" clause still gets drawn.
Always ask for an empty transparent background. Keep it to a few large
objects. A monochrome style is fine in a video, since its background never
changes, which the site's two themes can't promise.

```bash
# needs the repo root's `npm install` (for sharp) and OPENAI_API_KEY
npm run illustrations -- c-pointers --dry-run   # prompts and cost
npm run illustrations -- c-pointers             # generate + import
npm run illustrations -- c-pointers --only c-pointers-envelope --force
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
TABBIED_CHROMIUM=/path/to/chromium npm run patterns -- <video>
```

`patterns.json` names a design (`npx tabbied list`, or browse tabbied.com), a
seed, a size and a palette given as brand token names (`"blue"`,
`"teal-300"`, `"transparent"`), so no hex value is written by hand. Use
patterns sparingly: a band on the title or end card, or one transition. Never
put one behind text the viewer has to read. None of the editorial videos uses
one (the paper is the page's only texture), but `<Pattern>` and this script
stay for a video that does.

## Checks

```bash
npm run typecheck
npm run lint
npm test          # the timing model, and scene cuts against their scripts
npm run check:4k  # every illustration sharp at --scale=2 (about a minute)
```
