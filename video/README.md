# Dataslope videos

Short tutorial videos, made in code with [Remotion](https://www.remotion.dev).
Each one is timed to a narration script, so the voice-over can be added later
without re-timing anything by hand.

This is its own package: nothing here is part of the site's build, and the
site's `tsconfig.json` and ESLint config ignore it.

Every video is 16:9 and drawn in the **editorial** style described below.

| Composition | About |
| --- | --- |
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

Two courses have one video per unit, each in its own Studio folder, with
ids that sort in course order:

| Folder | Compositions |
| --- | --- |
| `Statistics` | `Stats-1-ThinkingStatistically` to `Stats-9-StatisticsInPractice`. Unit 5 is `Stats-5-Sampling`, one video made of its five parts, `Stats-5-1-SamplingBias` to `Stats-5-5-StandardError`, which also render on their own |
| `Database-Design` | `DbDesign-1-WhyDesign` to `DbDesign-9-RelationalHistory` |

A course video's id is not its folder name (`Stats-2-DescribingData` lives in
`src/videos/describing-data/`). The check scripts take either; `remotion
render` and `check:frames` take the id.

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
height. `npm run check:frames` walks every composition at `--scale=2`, a
frame every half second, writing nothing to disk (about a minute for all 18),
and fails if any illustration is drawn across more device pixels than it has
(or if an arrowhead sits on a bend; see "What goes on screen").
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
- `src/editorial/erd.tsx`: entity-relationship diagrams. `<Entity>` is a
  table box that builds itself row by row, keys marked; `<Relation>` is a
  relationship line that draws itself with crow's-foot ends
  (`src/components/crowsfoot.ts`: exactly one, zero or one, one or many, zero
  or many, many). Every ERD is drawn with them, so the notation reads the
  same in every video, and `npm run check:frames` fails an end built across
  a corner of its line. The `ErdKit` composition under Assets shows the kit.

Register a new composition in `src/Root.tsx` with
`defaultProps={EDITORIAL_DEFAULTS}` and
`calculateMetadata={narratedMetadata(script)}`, so its length follows the
narration.

## What goes on screen

Every video follows these rules.

- **Content only.** No running head or masthead, and no branded end card. The
  video stops on its last idea. The one brand moment is the series intro
  below, at the very start of a course video, and nothing else carries the
  logo.
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
- **An arrowhead sits on a straight end.** Build every head with
  `arrowHead()` from `src/components/arrow.ts`, passing the drawn line
  sampled densely (`sampleCubic`, `roundedPolyline`). It aims the head along
  the last head-length of the line, the stretch the eye reads it against,
  never along a control point or the tangent at the tip. And shape the curve
  so it has stopped turning before the head starts: put the last control
  point well back along the direction the line arrives in, at least half the
  gap it crosses. If a line turns inside its head, no head angle fits: aimed
  at the tip it crosses the line coming in, aimed at the chord the line
  leaves its base off centre. CPointers' pointers did both before they were
  reshaped, with their last control point straight under the tip: a
  vertical tangent on a line that turned 29 degrees in its last 15 px.
  `npm run check:frames` measures every head as it renders and fails any line
  that turns more than 10 degrees under one (CPointers is 5 now, the set's
  worst is 7), and `npm test` fails any head built outside `arrow.ts`.

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

### A course video opens on the series intro

A course's unit video opens with `<SeriesIntro>` (`src/editorial/SeriesIntro.tsx`):
the Dataslope mark assembles from its two slopes, tilts the way the site's
logo tilts on hover, and the wordmark writes itself beside it, set as the
site header sets it (Inter 600, tracked tight, at 1.38 times the mark's
height). The course and unit, then the unit's title, arrive under a hairline.
ThinkingStatistically is the worked example.

- **The mark is the site's own file.** Its two paths and radial gradients are
  copied from `public/dataslope-logo-blue.svg` (the copy in
  `public/brand/` is the same file), drawn inline so each half can move, with
  the blue as a brand token.
- **The intro is its own scene from frame 0**, ending where the first
  content scene's cut begins, and the script sets `leadIn: INTRO_LEAD_IN`
  (4.6 s, just past the intro's 4.4) so the first word waits for it. Both
  numbers live in `src/editorial/intro.ts`, so a change to the intro's length
  is one edit that moves every course video, and `src/editorial/intro.test.ts`
  fails any course script that types its own lead-in. Anything the first
  scene used to show at fixed frames is re-cued to its first beat
  (`n.beat(id).from`), or it plays under the logo. The first beat is
  `scene: true`, since a cut is cued from it.
- **It has its own sound**: `el-logo`, an airy rise into a bell, peaking at
  -21 dBFS with nothing under it but paper, and a pencil stroke for the
  hairline.

### A video in a series leads into the next

A course's videos play in order, so each one ends on the question the next
one answers, and the next one opens on that idea. Statistics Unit 5 is the
worked example: SamplingBias ends on data that only kept what survived, and
SurvivorshipBias opens on the bombers that made it home.

- **The bridge is the script's last beat**, after a pause of about 0.7 s, so
  the video's own conclusion lands first.
- **On screen, the closing scene adds `<NextLine>`** from
  `src/editorial/ui.tsx`: a hairline and "Next: …", cued to a word of the
  bridge. Put it wherever the scene has room. It is part of the scene, not an
  end card.
- **Never say "in the last video".** Every video is also embedded on its
  own, in the lesson section it teaches, so its opening has to work without
  the one before it.
- **Write the bridge before the first recording.** Added afterwards, it is
  voiced on its own, and the beat can sound slightly apart from the take.

**Inside a video, the same applies between ideas.** A long video moves
through several concepts, and a short spoken turn at each change keeps it one
argument instead of a list of scenes: "So it helps to name the numbers on
each side." ThinkingStatistically's six are the `*-in` beats at the end of
the scene before each turn (`trend-in`, `parameter-in`, …). Each was added
after the take and voiced alone, 325 characters in all, so a new transition
costs only its own words. Keep them to one sentence that names what the next
scene is for, never a recap of the one just finished.

### Adding the voice-over later

```bash
# needs ELEVENLABS_API_KEY
npm run narrate -- c-pointers --dry-run   # the text it would send
npm run narrate -- c-pointers             # a take, or the beats not yet voiced
npm run narrate -- c-pointers --only star # re-voice one edited beat
npm run narrate -- c-pointers --force     # new takes of everything (ask first)
npm run narrate -- c-pointers --recut     # cut the kept take again, no API call
npm run cues -- c-pointers                # the timing it produced
npm run check:sync -- c-pointers          # and that the voice really starts there
```

**Check the sync after every voicing.** `npm run check:sync` renders the
soundtrack with the effects off, finds where speech starts after each pause,
and compares it with the timeline's cue for every beat. Animations are cued
from those times, so a beat on time means everything cued to it is too. It
fails a beat more than 0.12 s out (`--tolerance` changes that); the voiced
videos all sit within 0.09 s, the worst being a beat voiced on its own after
the take. `--audio <file.wav>` checks a dry render you already have. A
drifting beat usually means its audio and `alignment.json` disagree: re-voice
that beat, or `--recut` if a whole run drifts.

**Voicing is billed per character, so an edit re-voices only what changed.**
A plain run sends just the new or edited beats, each on its own. That is
the default after an edit, and it costs only those beats' characters.
`--force` sends the whole script again, about 1,300 to 2,300 characters for a
two-minute video, so ask before using it. "The edited beat sounds a little
apart from the take" is not a reason on its own.

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

**A video is voiced in takes, one request per part.** `planTakes()`
(`src/narration/takes.ts`) splits the script at scene beats, grouping scenes
until a take holds about 1,800 characters (`takeChars` in the script changes
that; a beat marked `take: true` always starts one). A two-minute video is one
take; a unit video like ThinkingStatistically is three. Each take is one
request, its beats joined by a space with a paragraph break before each beat
that opens a scene, and it carries the two beats on either side as
`previous_text` and `next_text`, so the voice runs on across the seam. The
seam always falls at a scene change, the longest pause in the video. Several
takes rather than one because a request is capped at 10,000 characters, the
character times drift over a long take (ThinkingStatistically's single take
ran half a second late by 2:30), and a part that needs redoing then costs that
part, not the video.

`npm run narrate -- <video> --dry-run` prints the plan: each take, its beats
and characters, and whether it will be recorded, re-cut from the kept copy or
left alone. A take whose beats all need voicing (the first run, a part
rewritten, a new voice, or `--force`) is recorded; a take with only some
beats changed has just those re-voiced, one at a time. Every take is then cut
into beats at the middle of the longest silence
between the start of one beat's last word and the end of the next beat's
first word, so no cut lands in a word. The window is that wide because the
character times can be well off at a sentence end: StandardError's stretched
"testing." 0.45 s across the pause after it, and a narrower window missed the
pause and cut into "Next". `npm run narrate` warns when a boundary has no
pause of at least 0.15 s, where a cut could clip a word. Each beat keeps up to
0.45 s of breath before its first word and 0.3 s of decay after its last,
with an 8 ms fade at the cut. The timeline starts a beat's audio early by
that lead-in, so the first word still lands on the beat, and never starts it
over the end of the beat before.

That is most of the difference between narration and text-to-speech. Voiced
one request per beat, every sentence started cold, on the same contour, with
the same energy. Within a take, a question lifts and its answer comes down,
and one sentence runs into the next.

**The model is always `eleven_v4_turbo`** (`NARRATION_MODEL` in
`src/narration/voices.ts`). `narrate` refuses any other, the plain
`eleven_v4` included, and `npm test` fails if any committed narration or take
was recorded on another.

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
- `takes/<script id>/`: the raw takes (`take-1.mp3`, `take-2.mp3`, …) and
  their alignment (`take-1.json`, …), about 1.3 MB for two minutes of speech.
  The beats are cut from them, so `--recut` can cut them again, for instance
  after a change to the cutting, without paying for another take, and a plain
  run reuses a take when its text and voice still match. A re-cut is
  deterministic: cutting an unchanged take reproduces the committed beats
  byte for byte. Videos voiced before takes were split keep a single
  `take.mp3`/`take.json`, which `--recut` still cuts while it matches the
  script. `npm test` fails if a voiced video has lost its takes.

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

## Sound effects (SamplingBias, ThinkingStatistically)

Sound effects are small, soft sounds tied to what moves on screen: a block
knocking into place, dots appearing in a sprinkle, a pen stroke under a word.
They make a video feel made by hand without competing with the narrator.
They are off unless a composition turns them on: SamplingBias and
ThinkingStatistically set `sfx: true` in their `defaultProps`, and
`--props='{"sfx":false}'` renders either one dry.

```tsx
<Sfx name="tock-mid" at={steps.random.d + DROP - 1} level={-23} />
```

- **Cue from the animation, not from a word.** Put `<Sfx>` in the scene,
  next to the animation it belongs to, and use the same frame expression the
  animation uses. If you cue a landing from the word that starts the fall,
  the sound plays while the block is still in the air.
- **`level` is the sound's peak in dBFS.** Every file is normalized to a
  0 dBFS peak. The narration's speech runs about -25 dBFS RMS, with peaks
  near -4, so:
  - knocks peak around -23;
  - sprinkles and grains around -31;
  - pen strokes and slides around -34 to -37.
- **A scene's sounds stop with it.** A sound still playing at a cut ends there
  abruptly. The bells are 1.8 s long so that they finish inside the hold
  before a cut.
- **Many events thin out.** RepeatScene's hundred landing averages play one
  pip at most every 2.5 frames, and each pip is quieter as they come faster.
  The fall then reads as a patter that holds a steady level.

**There are two palettes, and a video uses one of them.** Both live in
`public/sfx/`, with `sounds.json` listing every file's length;
`src/sound/sfx.test.ts` keeps the list and the files in step, and either
script rewrites the list from what is in the folder.

- **Synthesized** (SamplingBias): `npm run sfx` (`scripts/sfx.mjs`) builds 21
  sounds from damped sines and filtered noise. They are free, unlicensed and
  byte-identical on every run.
- **Generated by ElevenLabs** (ThinkingStatistically and the logo intro):
  `npm run sfx:elevenlabs` (`scripts/sfx-elevenlabs.mjs`) sends each prompt in
  `sfx/elevenlabs.json` to the sound-generation API and writes
  `public/sfx/el-<name>.wav`. They sound recorded rather than built, which is
  the point of having them.

```bash
npm run sfx:elevenlabs -- --dry-run        # what would be generated, no calls
npm run sfx:elevenlabs                     # only the sounds not yet generated
npm run sfx:elevenlabs -- --only tap,pop   # these again, even if present
```

Generation costs credits from the same ElevenLabs pool as the narration,
though very few: a 2.5 s sound measured 14, so the eight in the file (8.3 s
asked for in all) come to roughly 50. So the script generates only what is missing, and a
prompt edited since its sound was generated is reported (from
`sfx/elevenlabs.lock.json`) rather than silently regenerated: pass `--only`
to pay for it. The raw MP3s stay in `.generated/sfx/` (gitignored), and the
committed WAV is trimmed to the sound (5 ms before its onset, 30 ms after it
dies away) and normalized to the same 0 dBFS peak as the synthesized set, so
`level` means the same thing in both.

The synthesized palette is wooden knocks (`tock-*`, `pip-*`), pen strokes
(`swish*`), grains (`sprinkle-*`, `riffle`), paper taps (`fill-roll`), sweeps
(`gather`, `slide`, `tighten`) and two bells (`chime`, `chime-low`). Most of
the energy sits above 2 kHz or in short transients, out of the way of the
voice. The ElevenLabs set is smaller and covers the same jobs: `el-tap` for a
value landing, `el-pop` for an illustration or a bar, `el-sprinkle` for many
dots at once, `el-pencil` for a line drawn, `el-scratch` for a strike-through,
`el-whoosh` for something sliding or sweeping in, `el-chime` for a
conclusion, and `el-logo` for the intro. `el-chime` is the one to watch: it
centres near 320 Hz, inside the voice, so it goes in a pause and stays at
about -32.

**Measure the mix rather than guess it.** `npm run check:mix` renders the
soundtrack twice, as the video plays it and with `sfx: false`, and subtracts
the two to get the effects alone:

```bash
npm run check:mix -- SamplingBias           # renders both (a few minutes for a long video)
npm run check:mix -- SamplingBias --reuse   # measure the WAVs already in out/
```

It reports both layers' integrated loudness (LUFS, measured to ITU-R
BS.1770 in the script itself, since Remotion's ffmpeg has no `ebur128`), the
effects' peak and when it happens, how far the speech stays above the
effects wherever both sound, and the five moments an effect comes closest to
the voice. `out/<id>-fx.wav` is the effects on their own, at their real
level, for listening.

| Video | Effects under the narration | Effects' peak | Speech over effects (median, 50 ms) |
| --- | --- | --- | --- |
| SamplingBias | 17.5 LU (-42.3 against -24.8 LUFS) | -23 dBFS | 19.9 dB |
| ThinkingStatistically | 18.9 LU (-43.6 against -24.7 LUFS) | -21 dBFS, the logo, with nothing under it | 22.5 dB |

About 15 LU under or more reads as subtle. The "closest" moments are 50 ms
readings, so a knock that lands in the gap between two words can briefly
match the voice there without masking a word: listen before turning one
down.

## Images

Illustrations come from the site's own pipeline
(`scripts/generate-illustrations.mjs` at the repo root), so they get the same
house style and checks:

- OpenAI `gpt-image-2.5-flare` (set in each `illustrations.json`)
- `quality: low`
- transparent background
- the Batch API
- an alpha check that rejects an image painted on an opaque background

**When a batch stalls, generate directly.** OpenAI batches usually finish
within the hour but have sat at "0 of 2 done" for three to six hours. The
user has approved this fallback for the video art: if a video's batch is
still `in_progress` an hour after it was submitted, cancel it and run the
generator's `sync` command on the same prompt file. That costs about twice
the batch price, roughly a cent for two images at `quality: low`.

```bash
node ../scripts/generate-illustrations.mjs sync --prompts src/videos/<video>/illustrations.json --out .generated/<video>
npm run illustrations -- <video> --import
```

Cancel the stalled batch (`POST /v1/batches/<id>/cancel`), so it can't
deliver and bill a second set later.

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
npm test              # timing, scene cuts, word cues, voices, arrowheads
npm run check:frames  # a frame every half second at --scale=2 (about a minute):
                      # illustrations sharp at 4K, arrowheads on straight ends
npm run check:sync -- <video>   # a voiced video: every beat starts where its cue says
npm run check:mix -- <video>    # a video with sound effects: how far under the voice they sit
```

Both audio checks take the composition (`ThinkingStatistically`) or the
folder name that `narrate` and `cues` take (`thinking-statistically`), and
write their renders to `out/`. They are plain Node (`scripts/lib/audio.mjs`),
with no ffmpeg filters and no Python, so they run the same on Windows. The
loudness and pause detection are checked against ffmpeg's `ebur128` and
`silencedetect` (the same pauses to 1 ms) and pinned by
`scripts/lib/audio.test.mjs` under `npm test`.
