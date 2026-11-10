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

Four courses have one video per unit, each in its own Studio folder, with
ids that sort in course order:

| Folder | Compositions |
| --- | --- |
| `Statistics` | `Stats-1-ThinkingStatistically` to `Stats-9-StatisticsInPractice`. Unit 5 is `Stats-5-Sampling`, one video made of its five parts, `Stats-5-1-SamplingBias` to `Stats-5-5-StandardError`, which also render on their own |
| `Database-Design` | `DbDesign-1-WhyDesign` to `DbDesign-9-RelationalHistory` |
| `How-LLMs-Work` | `Llm-1-Tokens` to `Llm-5-Benchmarks`, narrated by Drew, with two deep dives: `Llm-2-1-AttentionScore` (one attention score worked through) and `Llm-4-1-ConversationCost` (why a chat's bill grows faster than the chat) |
| `NLP-Python` | `Nlp-1-WhyTextIsHard` to `Nlp-5-History`, narrated by Hope, with two deep dives: `Nlp-2-1-LemmasAndTags` (lemmatizing needs the part of speech) and `Nlp-3-1-ZipfsLaw` (Zipf's law read off a log-log plot) |

The `Logo-Reveals` folder holds twenty short brand clips: five stings,
eight course openers and seven variations of the columns opener (see
[Logo reveals](#logo-reveals)). The `Thumbnails` folder holds a YouTube
thumbnail for each merged course and interview track (see
[YouTube thumbnails](#youtube-thumbnails)).

A deep dive (`Llm-2-1-…`) is a two-minute video on one idea its unit could
only sketch, embedded at one lesson section beside the unit video. It has no
"Next" line, and sits after its unit in the Studio folder.

A course video's id is not its folder name (`Stats-2-DescribingData` lives in
`src/videos/describing-data/`). The check scripts take either; `remotion
render` and `check:frames` take the id.

Each follows the lesson it is named after (the header of its `script.ts` says
which), and each renders at 4K: 3840x2160.

### The editorial videos

The eighteen editorial videos share one look, the shared editorial kit in
`src/editorial/`: a plain white page, numbered figures with Inter
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

The page is plain white (`PAPER` in `src/editorial/style.ts`, the brand's
`--ds-white`), with no texture. It was warm paper with a printed grain until
2026-10-21, when white read cleaner. Everything drawn in the page's color
(text halos, masks, cards that hide what is behind them, ERD boxes) uses
`PAPER`, so a change of page is that one token.

On white, the brand colors are used as they are. Ink is the site's gray-900
and gray-600, and type in a hue reads `inkOf` (`src/theme/brand.ts`): the
brand 500 itself for blue, red, purple and orange, and the nearest step that
still clears 3:1 on white (the large-text bar every label meets) for green,
teal and yellow, whose 500s do not. The site's own `--ds-*-ink` anchors are
set for 4.5:1 body text, and are darker than a video needs. Code listings sit
on gray-50.

## Quick start

```bash
cd video
npm install
npm run studio                               # preview and scrub in the browser
npm run render -- CPointers out/CPointers-4k.mp4   # 3840x2160
npm run render:fhd -- CPointers out/CPointers-fhd.mp4   # 1920x1080
npm run render:preview -- CPointers out/c-pointers-preview.mp4   # half size, fast
npm run render:all -- --fhd                  # every video changed since its last render, 1080p
npm run render:all -- --hd                   # the same at 720p (1280x720)
npm run render:series -- Statistics --fhd    # a whole course in one video, openers between units
npm run thumbnails                           # every YouTube thumbnail → out/thumbnails/<Track>.png
npm run still -- CPointers out/frame.png --frame=600
npm run cues -- c-pointers                   # when each beat is spoken
```

Remotion downloads its own Chrome Headless Shell on the first render. Where
that download is blocked, point it at one you have:
`REMOTION_BROWSER_EXECUTABLE=/path/to/headless_shell` (the cloud container has
one under `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/`).

### Rendering what changed, and whole series

Two scripts sit on top of `remotion render`. Both take `--fhd` for 1080p
(`out/<id>-fhd.mp4`); without it they render at 4K (`out/<id>-4k.mp4`), the
size to upload, since YouTube streams a 4K upload at a higher bitrate even
to a 1080p viewer, which keeps small type sharp. `render:all` also takes `--hd` for
720p (`out/<id>-hd.mp4`, 1280x720), for a quick local copy to watch.

**`npm run render:all`** (`scripts/render-all.mjs`) renders every video,
plus the series openers and the unit opener sample, which go in their own
folder, `out/openers/<id>-4k.mp4`, as thumbnails have `out/thumbnails/`. It skips a video whose
output is in `out/` and whose content has not changed since it was
rendered, and re-renders one whose content has, even though the old file is
there. Its content is everything its render reads: the source files
reachable from its folder, the shared kit, its `<Composition>` in
`Root.tsx`, its narration, images and patterns, the sound effects and brand
files, the dependency versions and the render settings. After each render
`out/.render-manifest.json` records a hash of every one of those files, so a
run that stops resumes where it stopped, and `--dry-run` says which files
changed (`Llm-1-Tokens (changed: src/videos/llm-tokens/BpeScene.tsx)`).

```bash
npm run render:all                           # 4K, every video that changed
npm run render:all -- --fhd                  # the same at 1080p
npm run render:all -- --hd                   # the same at 720p → out/<id>-hd.mp4
npm run render:all -- --dry-run              # list what would render, and why
npm run render:all -- BaseRate,TfIdf         # only these (ids or folders)
npm run render:all -- --force                # render even if unchanged
npm run render:all -- --concurrency 12       # frames rendered at once (default: half the CPU's threads)
npm run render:all -- --x264-preset medium   # the encoder's preset (default: fast)
```

**Speed.** At 4K a frame is a 3840x2160 screenshot from headless Chrome,
saved as a JPEG and encoded to H.264, all on the CPU: an 8-core desktop
renders about 15 frames a second, so a 10-minute video takes about 20
minutes and a whole interview series a few hours on its first run. Remotion
renders half the CPU's threads' worth of frames at once; find a better
number for a machine with

```bash
npx remotion benchmark DataAnalyst-6-Visualization --scale=2 --frames=0-299 --concurrencies=8,12,16 --runs=1
```

and pass it as `--concurrency` (`render:series` passes it on). The encoder
runs at x264's `fast` preset rather than its `medium`: a slightly larger
file, not visible quality, at the same CRF, and less encoding time
(measured on a 5-second opener at 4K, 7% less, where the screenshots are
most of the work). Neither setting is part of a video's fingerprint, so
changing either re-renders nothing. Remotion has no NVIDIA encoder; its
hardware encoding is macOS only.

An edit to one scene re-renders that video alone; an edit to the shared kit
(`src/editorial/`, `src/theme/`) or the sound effects re-renders every video,
as it should. The first run after a change like that takes hours at 4K. An
edit to a thumbnail, an opener or a review kit re-renders no video: those
are imported by `Root.tsx` but read by no video, so they are not part of a
video's content (until 2026-11-07 they were, and a thumbnail edit
re-rendered everything). Saving a file without changing it re-renders
nothing, since the hashes compare content, not dates.

An output with no record (rendered by hand with `npm run render`, or by the
first version of the script, which kept one hash per video) is judged by
date: it is up to date if it is newer than every file it reads. Git rewrites
only the files a pull changes, so a pull that changes a video leaves its
output older than its inputs, and it renders again. Its record is written
on the next run, and from then on the hashes decide.

**`npm run render:series`** (`scripts/render-series.mjs`) puts a whole
course or interview track in one video: before each unit or part, its
opener, then its videos, in the order `src/series.ts` lists them.

```bash
npm run render:series -- Statistics          # 4K → out/series/Statistics-4k.mp4
npm run render:series -- Statistics --fhd    # 1080p → out/series/Statistics-fhd.mp4
npm run render:series -- --all --fhd         # every series
npm run render:series -- DataEngineer --units 0-2 --fhd   # a stretch, to preview
npm run render:series -- Statistics --dry-run   # list the pieces
npm run render:series -- Statistics --no-render # stitch what is in out/ as it is
npm run render:series -- DataAnalyst --concurrency 12   # passed on to render:all
```

It runs `render:all` on exactly the pieces it needs first, so only a missing
or changed piece is rendered, then joins them with ffmpeg. **The picture is
not re-encoded**: every frame is copied packet for packet from the piece
that rendered it, so the series looks exactly like its parts and the join
takes minutes. The sound is decoded and encoded once (AAC at 320 kb/s with
libfdk_aac, the encoder and rate the pieces have), because AAC does not join
cleanly when copied: each piece's encoder delay would leave a click at every
join. Every piece must
share size, frame rate and pixel format, which pieces from one `render:all`
run do; anything else stops the stitch. Beside the video it writes
`<name>.chapters.txt`, one line per unit ("0:00 Unit 1 · Thinking
statistically") for the YouTube description, which is where YouTube reads
chapters from. ffmpeg is Remotion's own (`npx remotion ffmpeg`), so nothing
else needs installing.

**The series** are in `src/series.ts`: each course's units and each
interview track's parts, the videos each one plays, and the title its
opener shows. The openers are Columns-7's three lines (the series' name,
"Unit n" or "Part n", the title), generated from that list into the Studio's
`Series-Openers` folder: a course's in blue, an interview track's in green,
mark and title both, like their thumbnails. Renaming a unit there
re-renders that unit's opener alone. The rendered openers are in
`out/openers/` (`OPENERS_OUT` in `src/series.ts`), not beside the videos;
`render:series` reads them from there. A unit with a deep dive plays it after
the unit video, under the one opener, and Statistics Unit 5 is the merged
`Stats-5-Sampling`.

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
its pixels, and is now drawn at exactly the size they cover. Text, SVG,
patterns and the logo are vector.

## How a video is put together

```
src/videos/<video>/
  script.ts            narration: beats, the unit audio is generated in
  Video.tsx            the composition: scenes, each cued to narration words
  illustrations.json   image prompts (watercolor, GPT Image)
  patterns.json        Tabbied patterns, if the video uses any
  check.mjs            the facts: runs the lesson's code, writes results.json
  results.json         what check.mjs measured (committed)
  data.ts              reads results.json for the scenes
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
  a corner of its line. Keys are `PK`, `FK`, `UK` (an alternate key) or a
  pair. A scene that reads each end aloud cues it with `fromAt`/`toAt`, an
  end given `null` stays bare (a line whose cardinality is the question), and
  `endSymbols()` says where an end's maximum and minimum sit, to point at one
  as it is read. The `ErdKit` composition under Assets shows the kit.

**A video's facts are measured, never typed.** `check.mjs` runs the lesson's
own code in the engine the page runs it in (Pyodide, DuckDB-Wasm or PGlite)
and writes `results.json`; `data.ts` reads it, so a number on screen can't
drift from what ran. Those engines are the site's dependencies, not this
package's: `check.mjs` loads them from the repository root's
`node_modules`, so run `npm ci` at the root once before running one, or it
stops at `Cannot find module 'pyodide'`. (The Data Scientist fixers, barred
from installing, pointed `NODE_PATH` at private copies of the locked
versions; every existing value reproduced.)

Register a new composition in `src/Root.tsx` with
`defaultProps={EDITORIAL_DEFAULTS}` and
`calculateMetadata={narratedMetadata(script)}`, so its length follows the
narration.

## What goes on screen

Every video follows these rules.

- **Content only.** No running head or masthead, no opener and no branded
  end card. The video opens on its first idea and stops on its last. Each
  course and interview track is uploaded to YouTube as one merged video, and
  the opener goes on in that edit: one of the logo reveals, or the series
  intro below, both kept for it. No lesson video carries the logo.
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
- **SVG text is colored with `fill`.** An SVG `<text>` ignores CSS `color`,
  so `label()` or `note()` on it draws black whatever color it names: the
  Data Scientist review found 30 such labels, one a P1. Wrap the style in
  `svgText()` (`src/editorial/style.ts`), or set `fill`; `npm test` fails on
  SVG text styled without either.
- **Tabular figures on the number only.** Inter's tabular feature also sets
  a hyphen a digit wide, so `TABULAR` over a phrase reads "p - value". Put
  it on the number (`<Num>`, `src/editorial/ui.tsx`); `npm test` fails on
  `TABULAR` over a hyphenated word in the source, and `check:frames` fails on
  one in the drawn page, which also catches text that arrives as a value (a
  sheet cell "P-101", a list item): `PageAudit` in `src/editorial/audit.tsx`
  reads the page while it renders.
- **A space stays a space.** Words set as separate elements are spaced by
  margins, so two things can eat the space between them. An `em` gap on a
  flex row means the row's own font size, which is the page default (16px)
  when only the children set one: "0.36em" between 40px words came out at
  5.8px, so set `fontSize` on the row. And a highlight drawn behind a word
  reaches past it on both sides; every highlight component (`Mark`,
  `Marked`, `Marker`, `Sweep`) takes the same width back as margin, so a
  neighbour keeps a full space from the band. `check:frames` measures every
  pair of neighbouring words on a line, a highlight counting as part of its
  word, and fails a gap under 0.15em that holds for two samples: the "of"
  and highlighted "2,097,152" of ListVsSet were 3.7px apart. Words meant to
  touch (punctuation, one line of code, letters set one by one) pass.
- **One line, one size, one family.** Words that share a line are set in one
  size and one face: "Expected profit = $80 − $45 =" in Inter beside "$35"
  in the serif at twice the size reads as two things. Emphasis is color,
  weight or a highlight. A label beside a big value either matches it or
  takes a line of its own above it; a hero number may stay large only on a
  line of its own. Headlines, code in the mono face and super- and
  subscripts are exempt. `check:frames` fails neighbours on a line that
  differ in size by more than 12% or in family (`[mixed]`).
- **No cards unless the layout needs one.** Group with spacing and
  alignment, and separate with at most a very subtle hairline, not with
  bordered, rounded or tinted boxes around text (the owner, 2026-11-06:
  "Using spacing or very subtle separators should be preferred"). Code
  listings and data tables keep the house look, since there the frame is
  the listing or the table itself. **Small badges stay** (the owner, the
  same evening: "the little card-like badges look better"): a small tinted
  and/or outlined chip around one word, one value, a short tag of a few
  words, or a ringed numeral is a badge, not a card. A card is a box around
  a sentence, a group of lines, a panel or a column. A badge's text stays
  within 12% of the size of the text it shares a line with. **Badges have
  no border**: a light tint of their hue, the hue's ink, rounded corners
  (the owner, on backend Part 9's prompt ingredients: "use this style …
  the background slightly lighter, but the no-use of border is amazing").
  Use `Badge` / `badgeStyle(tone, size)` from `src/editorial/ui.tsx`; a
  numbered badge is a tinted disc with no ring. Its text is semibold (600,
  "bold looks too heavy"; a numeral in a disc at most 700) and its padding
  is even top and bottom, so the word sits centred in its tint; do not
  override either. A line of text under a row of badges keeps at least
  20px clear of the tint (the owner: "make sure the description text under
  each badge has enough top spacing").
  **Items set side by side take a vertical hairline between them** (the
  owner: "When there are items laid out horizontally, I think subtle
  separators will help"): two, three or four columns of text get a 1px
  `HAIRLINE` rule in each gap, the height of the column's text, centred in
  the gap and at least 24px from the text on either side. Not before the
  first column or after the last, and not between words on one line (a
  middle dot does that). It inks in with the column to its right.
  **Not where the columns already carry their own rule** (the owner, on
  WhyNormalization's three anomalies, each under a short rule: "There
  shouldn't be any vertical separators here"): a column with its own top
  rule, kicker rule or heading rule is already grouped, so it takes no
  vertical hairline. **Leave room under a rule** (the same note: "add more
  spacing after each horizontal line"): at least 28px between a horizontal
  rule and the text under it.
  `ColumnRule` in `src/editorial/ui.tsx` draws one.
  **A card that comes off leaves its padding behind as space** (the owner:
  "ensure that there are enough spacing between items after removing a
  card design"). The box was doing the grouping; without it, space has to.
  Space between groups is clearly larger than space inside one: at least
  40px between groups (a source block and its first figure, one stat and
  the next), 10 to 14px inside a group (a label and its bar, a title and
  its note), and about 25px between rows of text. A label sits closer to
  the thing it names than to the thing above it.
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

### Writing initialisms for the voice

How an initialism is written decides how the voice says it. These rules were
measured on Drew with pitch tracking and speech-to-text, and
`src/narration/acronyms.test.ts` enforces the first two:

- **Plain caps, never letter-spaced.** Write CLT, PCA and SGD, not "C L T".
  Letters written with spaces between them are each read as their own word,
  and the voice stresses one of them. PCA swung 10.3 semitones written spaced
  and 4.2 written plain, at the same speed. Speech-to-text confirms the plain
  forms are still spelled out: ATE is not read as "eight". "A B test" and
  "A A test" are the exception, because "A/B" is read "A slash B".
- **No sentence opens "A SQL …".** A capital "A" in front of an initialism
  is read as the letter "ay" (0.16 s, against 0.04 s for the same "a"
  mid-sentence). Reword it: "First, a SQL screen", "Think of a CTE as …".
- **Respell a compound phonetically.** ROC-AUC takes 1.8 to 2.0 s in every
  written form, with a pitch accent on the R. Written "ar-oh-see
  ay-you-see", it takes about 1.3 s. Captions are off in the editorial
  videos, so the respelling never reaches the screen. The cue phrases quote
  the respelling, and the on-screen text keeps the usual form.

A single take varies by a few tenths of a second. If one beat comes out slow,
`npm run narrate -- <video> --only <beat>` records that beat again on its own.

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

### The series intro (kept, not placed)

`<SeriesIntro>` (`src/editorial/SeriesIntro.tsx`) is the course opener the
unit videos used to start on: the Dataslope mark assembles from its two
slopes, tilts the way the site's logo tilts on hover, and the wordmark
writes itself beside it, set as the site header sets it (Inter 600, tracked
tight, at 1.38 times the mark's height). The course and unit, then the
unit's title, arrive under a hairline. Its sound is `el-logo`, an airy rise
into a bell, peaking at -21 dBFS with nothing under it, and a pencil stroke
for the hairline.

**No video opens on it any more** (removed 2026-11-05). The tracks are
uploaded as merged videos, each with one opener added in the edit, so 28
copies of the intro inside them would repeat. The component and its timing
stay for a video that wants one:

- **The intro is its own scene from frame 0**, ending where the first
  content scene's cut begins, and the script sets `leadIn: INTRO_LEAD_IN`
  (4.6 s, just past the intro's 4.4, both in `src/editorial/intro.ts`) so the
  first word waits for it. Anything the first scene shows at fixed frames
  is cued to its first beat (`n.beat(id).from`) instead, or it plays under
  the logo.
- **`src/editorial/intro.test.ts` holds the two together.** A video that
  opens on the intro takes its lead-in from `intro.ts`, and a script that
  waits `INTRO_LEAD_IN` without opening on the intro fails, because its
  first word would follow 4.6 s of empty page.

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
npm run narrate -- c-pointers --recut     # re-cut every beat a kept take still says, no API call
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

**A split is free.** A beat that needs audio but whose words a kept take
still says, word for word, is cut from that take instead of voiced: a beat
split at a sentence break, or one moved. So to change one sentence of a long
beat, split the sentence off into its own beat, then reword it: the rest of
the beat is cut from the take and only the new sentence is paid for. `--dry-run`
marks each such beat "cut from take-N, free". `--only` and `--force` always
voice, since they ask for a new performance.
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
"t", "f" or "s" is timed from its vowel, up to 0.17 s late. The cut finds
where speech starts after the pause and moves the first letter's time there,
and `npm run narrate` prints each beat it moved by more than 80 ms. "Speech",
not the first sound: a breath clears a plain loudness bar, and Estimation's
`rate-se` once cued 0.23 s early on one. So `scripts/lib/onset.mjs` finds the
first voiced frame (-27 dB from the take's loudest, set against all 906
recorded beats) and walks back over the
word's own soft attack (-30 dB) for at most 120 ms.

A beat voiced on its own gets the same placement, from its own file. Before
it did, a beat that opened on an audio tag cued early by the time the tag
had taken: Estimation's `[slowly]` beats ran up to 0.25 s out in
`check:sync`. `npm run narrate -- <video> --onsets --only a,b` places the
first word of beats already voiced, from the files on disk, with no API
call.

**Slowing a beat down.** `eleven_v4_turbo` ignores the API's `speed` voice
setting (0.7 and 0.85 both came back at normal pace). The `[slowly]` audio
tag works: the same sentence went from about 3.0 to about 2.4 words a
second, and `[calmly]` or `[thoughtfully]` barely changed it. A tag is never
spoken and is left out of the captions, so it changes the delivery and not
the words. Stats-6's rate-to-test stretch and Stats-9's "keep a wall" beats
are voiced this way.

**What is committed.** Everything a render needs, and the master it came
from:

- `public/narration/<script id>/`: one MP3 per beat and `alignment.json`.
  This is what a video plays, about 1.1 MB a video.
- `takes/<script id>/`: the raw takes (`take-1.mp3`, `take-2.mp3`, …) and
  their alignment (`take-1.json`, …), about 1.3 MB for two minutes of speech.
  The beats are cut from them, so `--recut` can cut them again, for instance
  after a change to the cutting, without paying for another take. A take is
  matched to the script by its own text (`locateBeats()` in
  `src/narration/takes.ts`), not by the take plan, so it stays usable after
  the script moves on: a beat split at a sentence break is found as its
  pieces, and a beat reworded and voiced alone since is cut around. `--recut`
  never replaces a beat voiced on its own: it rewrites a beat only when the
  beat needs audio, when `--only` names it, or when the fresh cut is the
  committed audio already. A re-cut is deterministic: cutting an unchanged
  take reproduces the committed beats byte for byte, and `--recut` on every
  voiced video changes nothing. Videos voiced before takes were split keep a
  single `take.mp3`/`take.json`, one more kept take to cut from. `npm test`
  fails if a voiced video has lost its takes.

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
`agent-outputs/20261105-1200-narration-acronym-redub-plan.md` (at the
repository root) plans the general fix: one pronunciation table applied when
the text is sent, which re-voices exactly the beats it changes (52 of them,
in 19 videos, when it was written).

Captions are off by default (`EDITORIAL_DEFAULTS`). Switch them on in the
Studio's props panel, or with `--props='{"captions":true}'`.

## Logo reveals

Short brand clips, in the Studio's `Logo-Reveals` folder. A **sting** is the
mark and the wordmark (3.5 s). A **course opener** adds a course and a unit
(5 s). **Openers are set in Inter**, the site's face; three more repeat an
Inter opener in another face, to compare against it. Each opens on a few frames of bare page, builds the mark, sets the
words, and holds the finished lockup for at least a second.

| Composition | The mark | The words | Layout |
| --- | --- | --- | --- |
| `Sting-1-Assemble` | `assemble` | `ink` | `sting` |
| `Sting-2-Plot` | `plot` | `letters` | `sting` |
| `Sting-3-Histogram` | `histogram` | `slide` | `sting` |
| `Sting-4-Scatter` | `scatter` | `blur` | `sting` |
| `Sting-5-UnfoldDark` | `unfold` | `type` | `sting`, on deep blue |
| `Opener-1-Stack` | `rise` | `slide` | `stack`, every line one size |
| `Opener-2-Block` | `plot` | `ink` | `block`, every line one size |
| `Opener-3-Centered` | `unfold` | `letters` | `centered`, every line one size |
| `Opener-4-Columns` | `assemble` | `blur` | `columns`, every line one size |
| `Opener-5-Headline` | `histogram` | `ink` | `headline`, a hierarchy, for comparison |
| `Opener-6-Stack-SourceSerif` | `rise` | `slide` | Opener-1 in Source Serif 4, the videos' headline face |
| `Opener-7-Centered-Fraunces` | `unfold` | `letters` | Opener-3 in Fraunces |
| `Opener-8-Columns-Mono` | `assemble` | `blur` | Opener-4 in JetBrains Mono, the site's code face |
| `Columns-1-Black` | `assemble` | `blur` | Opener-4 with the course and unit in black |
| `Columns-2-BlueBar` | `plot` | `slide` | black, the divider a brand-blue bar |
| `Columns-3-ThreeLines` | `unfold` | `letters` | black, the unit on a line of its own |
| `Columns-4-Large` | `assemble` | `ink` | black, blue bar, every line at 64 px |
| `Columns-5-FullCourse` | `rise` | `slide` | black, a whole merged course: no unit |
| `Columns-6-InterviewPrep` | `assemble` | `blur` | black, blue bar, a whole interview track |
| `Columns-7-ThreeLines-Assemble` | `assemble` | `blur` | Columns-3's three lines with Columns-1's motion and sound |

All of them are one component, `LogoReveal` (`src/reveals/`), with different
props (`src/reveals/presets.ts`). Any mark motion goes with any text motion,
layout and theme, and an opener names any unit, from the Studio's props panel
or the command line:

```bash
npm run render -- Opener-1-Stack --props='{"course":"Database Design with PostgreSQL","unit":"Unit 4","title":"Keys and integrity"}'
```

- **The mark is the site's own file.** `src/components/mark.ts` holds its two
  paths and gradients (the series intro draws from it too), and the slope's
  centre line, `SPINE`, measured from the file: each slope is a band 272
  units wide along it. That is what lets `plot` draw a slope as one
  round-capped pen stroke and `scatter` settle points inside it. Every motion
  ends on the file exactly.
- **The motions** (`timing.ts`): `assemble` (the halves slide in and meet,
  then the site's hover tilt), `plot` (drawn up one slope and down the other,
  the round cap as the pen), `histogram` (bars rise inside the outline, then
  close their gaps into the shape), `scatter` (points gather into the
  slopes, then it fills), `rise` (up from behind a horizon, with an
  overshoot) and `unfold` (the peak drops in folded and swings open like a
  compass). Distances are in screen pixels, so a small mark beside a line of
  text moves as much as a large one.
- **Equal sizes.** The `stack`, `block`, `centered` and `columns` openers set
  every line at one size, "Dataslope" included: weight and color tell the
  lines apart (the wordmark in ink at 600, the course in the soft ink at 500,
  the unit's title in the brand blue). `headline` keeps a size hierarchy, to
  compare against: its large title is Inter Display, the optical size Inter
  draws at that scale.
- **Columns options.** `textInk: "black"` sets the course and unit lines in
  the ink rather than the soft grey; the title stays in the brand blue, so
  blue is the only color in the words. `divider: "blue"` turns the hairline
  into a brand-blue bar, `threeLines` gives the unit a line of its own, and
  `size` overrides the one size every line is set at. A merged course or
  interview track has no unit: pass `"unit": ""` and the title stands alone,
  with the course line saying what the video is ("The full course, nine
  units").
- **Inter first.** `face` (`OpenerFace` in `LogoReveal.tsx`) sets the course
  and unit lines: `inter` by default, or `source-serif`, `fraunces` or
  `jetbrains-mono` to compare. The wordmark is Inter 600 whatever it says,
  because it is the logo. Another face is scaled to Inter's x-height (by the
  scales `editorial/typefaces.ts` measured), since a serif set at Inter's
  font size reads smaller, and keeps Inter's line pitch, so "one size" still
  holds. `reveals.test.ts` fails an opener in another face that isn't an
  Inter opener with only the face changed.
- **One number per motion.** `MARK_LANDS` is the frame the mark is whole; the
  words, the glide of a sting's mark and the landing sound are all cued from it.
  `src/reveals/reveals.test.ts` checks each against the springs that make it,
  that every sound cued exists and starts inside the video, and that every
  reveal holds its finished lockup for a second.
- **Every reveal lands on the same sound**, the sonic half of the logo:
  `landing`, a marimba chord by default (`el-reveal-land-marimba`), or a felt
  piano chord (`felt`) or a soft synth pluck (`pluck`). Never a bell: the
  first landing was one, and its ringing upper partials read as metal. What
  leads into it follows the motion: a whoosh as each half of `assemble`
  sweeps in and a click as they meet, a pen stroke under `plot`, a rising
  marimba run under `histogram`, a shimmer that swells into `scatter`'s
  landing, a thud and a whoosh for `unfold`. Each is cued by its accent
  (`<Sfx accentAt>`, below), and each opener line by the tap of a soft card
  slide. A reveal measures about -27 LUFS and peaks at -11 dBFS, a little
  under the narration's -25 LUFS, since it plays alone.

## YouTube thumbnails

One still per track in the Studio's `Thumbnails` folder, `Thumb-<Track>`,
1280x720, with the animal hung top-right (the owner's choice, 2026-11-07):

- **A course:** its name in black, then "Full Course" in the brand blue
  under it, at the name's size, and a blue mark.
- **An interview track:** its role in green, then "Interview" and
  "Questions" in black on two lines, and a green mark, green being the
  interview series' color against the courses' blue.

The earlier rounds' options (a smaller "Full Course" or one above the name,
the animal low, the role in black or blue, "Interview Prep", other greys
and greens) remain props of `Thumbnail`.

```bash
npm run thumbnails                            # every track → out/thumbnails/<Track>.png
npm run thumbnails -- DataEngineer,Statistics # just these
npm run thumbnails -- --list                  # the tracks it knows
```

`scripts/render-thumbnails.mjs` renders one `Thumb-<Track>` still per
entry in `TRACKS` (`src/thumbnails/tracks.ts`), so a new track is one entry
there. It loads only those stills; asking Remotion for every composition
would also time every video, and log a 404 for each one with no recorded
narration. A PNG is about 200 to
300 kB, well inside YouTube's 2 MB limit.

Each track has its own watercolor animal, so the eight read apart at a
glance in a list of results: an owl on a die (Statistics), an elephant at a
card catalog (Database Design), a llama with books (LLMs), a parrot (NLP), a
raccoon (Data Analyst), the otter and meerkat of the Data Scientist and
Data Engineer overviews, and a beaver with a log beside a stack of servers
(Backend Engineer).

A white page, the Dataslope mark alone in the top-left corner (no
wordmark), the words low on the left and the animal on the right: standing
on the line the words end on, or hung from the top-right corner, level with
the mark and as far in from the edge.

- **One weight, one pitch.** Every word is Inter 500 and every line sits on
  the title's line pitch, blue or green lines included, with nothing added
  between them. The title is 80px (`SIZE`), and so is "Full Course". No
  pills or badges; the words sit on the page.
- **One size of animal.** The raccoon is drawn at 86% of its box
  (`artScale` in `TRACKS`): its body fills more of its picture than the
  otter's or the meerkat's, and at full size it read larger than them.
- **Seen small.** A thumbnail is about 168x94 on a phone, where 80px is about
  10px, so the words are few. "Interview Questions", the widest line at
  about 730px, fits beside the animal hung top-right; "Interview
  Preparation" does not fit at all, so it takes two lines.
- **Nothing in the bottom-right corner**, where YouTube prints the running
  time. The animal's box stops well short of it.
- **The art goes through the pipeline.** The six new animals are prompts in
  `src/thumbnails/illustrations.json` (watercolor, 1024x1024, transparent),
  generated and imported like any video's art:
  `npm run illustrations -- thumbnails`, which finds prompts under
  `src/<name>/` as well as `src/videos/<name>/`. A track's words and animal
  are one entry in `TRACKS` (`src/thumbnails/tracks.ts`).


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
- **Generated by ElevenLabs** (ThinkingStatistically, the logo intro and the
  logo reveals): `npm run sfx:elevenlabs` (`scripts/sfx-elevenlabs.mjs`)
  sends each prompt in `sfx/elevenlabs.json` to the sound-generation API and
  writes `public/sfx/el-<name>.wav`. They sound recorded rather than built,
  which is the point of having them.

```bash
npm run sfx:elevenlabs -- --dry-run        # what would be generated, no calls
npm run sfx:elevenlabs                     # only the sounds not yet generated
npm run sfx:elevenlabs -- --only tap,pop   # these again, even if present
npm run sfx:elevenlabs -- --only x --reprocess   # re-trim the kept MP3, no API call
```

**The model is SFX v3**, `eleven_text_to_sound_v3` (released 2026-10-29),
for every sound that doesn't name another with `model`. The API still
defaults to v2 when no model is sent, so the script always sends one, and the
lock file records which model made each file. The first eight sounds
(`logo` to `chime`) were made on v2 and say so. ElevenLabs removes v2 on
2027-03-01; the files stay, but regenerating one then means moving it to v3.
v3 takes a `duration_seconds` of 0.5 to 30 s, which the script checks before
it spends anything.

**One event per sound, cued by its accent.** v3 is said to follow a prompt
that lists events in order, but the reveals' first prompts ("two whooshes,
then a click, then a bell") came back as a single hit near the start, or as
an even texture with no bell. So each sound is one event, and the animation
places them. `scripts/lib/wav.mjs` measures each file's **accent**, the
attack of its loudest moment, into `public/sfx/accents.json`, and
`<Sfx name="el-reveal-land-marimba" accentAt={land}>` starts the sound early
by that much, so the chord strikes on the frame the mark lands. The cue still holds
when the sound is regenerated. A sound whose accent comes before the video
starts has its head trimmed instead of being dropped.

**`reverse: true`** plays a sound backwards, which turns one that peaks and
decays into one that swells into its last instant: `el-reveal-shimmer` is a
shimmer generated forwards and played backwards, building into `scatter`'s
landing. `--reprocess` re-applies it, or a change to the trimming, from the
raw MP3 kept in `.generated/sfx/`, for free.

Generation costs credits from the same ElevenLabs pool as the narration,
though very few: a 2.5 s sound measured 14 on v2. ElevenLabs lists 40
credits a second when a duration is set; the reveals' 20 s of v3 sounds did
not move the account's character count on 2026-11-05, so check the usage
page if it matters. So the script generates only what is missing, and a
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
conclusion, and `el-logo` for the intro. The `el-reveal-*` sounds belong to
the logo reveals (see above). `el-chime` is the one to watch: it
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
| ThinkingStatistically | 21.9 LU (-46.6 against -24.6 LUFS) | -27.1 dBFS at 0:05.6 | 22.0 dB |

About 15 LU under or more reads as subtle. The "closest" moments are 50 ms
readings, so a knock that lands in the gap between two words can briefly
match the voice there without masking a word: listen before turning one
down.

## Images

Illustrations come from the site's own pipeline
(`scripts/generate-illustrations.mjs` at the repo root), so they get the same
house style and checks:

- OpenAI `gpt-image-2.6-flare` (set in each `illustrations.json`)
- `quality: low`
- transparent background
- the Batch API when the model is offered there; 2.6 is not, so today the
  generator runs every request synchronously (about $0.02 per 1536x1024 image)
- an alpha check that rejects an image painted on an opaque background

The art already in `public/images/` was drawn on `gpt-image-2.5-flare` and
stays as it is; moving the model does not mean regenerating it.

**When a batch stalls, generate directly.** (This applies only to a model
the Batch API takes.) OpenAI batches usually finish
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

### Real people and real machines

The house watercolor draws every person as an anonymous figure with no face.
Two more styles, defined in the `meta.styles` of the videos that use them, are
for the moments where the subject is a real one:

- **`watercolor portrait`**: head and shoulders of a named person, the face
  drawn carefully enough that the likeness reads, the clothes in brand washes.
  Used for Ted Codd (DbDesign-9-RelationalHistory), Claude Shannon and Alan
  Turing (Nlp-5-History), each in the scene that names them and gone before
  the scene moves on.
- **`detailed watercolor`**: accurate proportions and fine structure, for a
  subject a viewer knows the real shape of. SurvivorshipBias's bomber is a
  four-engine heavy bomber of 1943 with bullet holes across its wings and
  fuselage, and none in its engines or cockpit, which is the point of the
  story.

**A portrait is checked against a photograph before it is used.** The model
knows some faces and invents others. Turing came back recognisable from his
name alone. Codd came back with a full head of brown hair until his subject
described what his photo shows (balding, white at the sides, a grey
moustache). Abraham Wald came back as someone else in round glasses, and was
dropped rather than shown. So a portrait's subject names the person and
describes the photograph, and it is compared with that photograph before it
goes in. Only people who have died are painted; Chamberlin and Stonebraker,
in the same history, are not.

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
one (the page is plain white), but `<Pattern>` and this script
stay for a video that does.

## Checks

```bash
npm run typecheck
npm run lint
npm test              # timing, scene cuts, word cues, voices, arrowheads
npm run check:cues    # every word cue says which occurrence it means (no render)
npm run check:frames  # a frame every half second at --scale=2 (about a minute):
                      # illustrations sharp at 4K, arrowheads on straight ends,
                      # no hyphen set in tabular figures, a space between words,
                      # one size and one family per line
                      # (CHECK_SCALE=1 for a quicker layout-only sweep)
npm run check:sync -- <video>   # a voiced video: every beat starts where its cue says
npm run check:mix -- <video>    # a video with sound effects: how far under the voice they sit
npm run check:motion -- <video> # the picture never holds still for 3 s (renders a half-size preview)
```

`check:cues` reads every `n.word(beat, phrase)` in the scenes and fails one
whose beat says the phrase more than once with no `nth`: the cue takes the
first, which is not always the one meant (Probability's "a hundred" landed on
"Walk a hundred thousand", three seconds early). Give `{ nth: 1 }` when the
first is right. It also fails a cue whose beat never says its phrase. A cue
built from a variable is not visible to it, so `useNarration` also warns at
render time and `check:frames` lists those warnings.

`check:motion` and `check:sync` read a video's timeline the way its
composition plays it (`scripts/lib/video-timeline.mjs`), so the merged Unit 5
(`sampling`) is checked against its five parts' own cues, placed where it
plays them, and its still stretches are labelled `<part>/<beat>`.

`check:motion` keeps the half-size preview it renders, with sound, as
`out/<id>-preview.mp4`; `--file` checks one already rendered. A frame is still
when under 0.05% of its pixels change and under 0.01% change a lot, compared
in colour (`scripts/lib/motion.mjs`): a pale highlight sweep moves hue more
than brightness, and a thin line drawing on changes few pixels but each by a
lot, so both count as motion. Each still stretch it lists comes with the beats
spoken over it, which is where to add the next part of a figure, a highlight
on the phrase, a value counting or an annotation arriving.

The three render checks take the composition (`Stats-1-ThinkingStatistically`),
its old name (`ThinkingStatistically`), or the folder name that `narrate` and
`cues` take (`thinking-statistically`), and write their renders to `out/`. The
audio checks are plain Node (`scripts/lib/audio.mjs`),
with no ffmpeg filters and no Python, so they run the same on Windows. The
loudness and pause detection are checked against ffmpeg's `ebur128` and
`silencedetect` (the same pauses to 1 ms) and pinned by
`scripts/lib/audio.test.mjs` under `npm test`.

**Checking one video while others are mid-edit.** Every render check bundles
`src/index.ts`, which imports every video through `src/Root.tsx`, so one
half-written folder breaks the bundle for all of them. `VIDEO_ENTRY` points
the checks at an entry that registers one composition on its own instead (a
copy of its `<Composition>` from Root.tsx, kept under `out/`); the Remotion
CLI takes the same file as its first argument:

```bash
VIDEO_ENTRY=out/entries/Llm-1-Tokens.tsx npm run check:frames -- Llm-1-Tokens
npx remotion still out/entries/Llm-1-Tokens.tsx Llm-1-Tokens out/f300.png --frame=300
```

The composition still has to be registered in Root.tsx, which is where the
checks look up its folder.
