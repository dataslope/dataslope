# Course unit video: builder brief

You build **one** course unit video, end to end, in the Remotion package at
`/home/user/dataslope/video`: script, facts, scenes, watercolor art, voice, and
every check. Nine other builders are doing the other nine videos of the same two
courses at the same time, in the same checkout, on a 4-CPU machine. Your
coordinator commits and pushes; you never do.

`S` below is `/tmp/claude-0/-home-user-dataslope/2a3cc9a3-7547-5d18-88e1-2b54dd0db0d9/scratchpad`.

Your prompt names: the composition id (`<Id>`), its folder (`<folder>`), the
course, the unit, the lessons it covers, the narrator, the intro title, the
character cap, and the bridges into and out of it.

## Read first, in this order

1. `video/README.md`, all of it. It is the rulebook: narration and timing,
   scene gaps, takes, voices, what goes on screen, sound effects, images, checks.
2. The plan: `agent-outputs/20261023-0700-nlp-and-llm-course-video-plan.md`.
   Your unit's section is your outline; you may reorder or cut within it, and
   must keep its bridges.
3. `agent-outputs/20261021-0551-course-video-review.md`: the 378 findings on
   the last 18 course videos. Its "Series-wide problems" are the mistakes a new
   video is most likely to repeat; build so none of them appear (summary below).
   `agent-outputs/20261021-1530-course-video-fixes.md` says how each was fixed.
4. `AGENTS.md` at the repo root, sections "Videos", "Illustrations" (style,
   transparency) and "Prose style" (no em dashes, no filler: narration is prose).
5. Your lessons, in full: `content/courses/<course>/<lesson>.mdx`.
6. Two worked examples of the format, read for structure, not to copy:
   `video/src/videos/db-why-design/` (a short unit, 3 min) and
   `video/src/videos/estimation/` (a long one). The shared kit is
   `video/src/editorial/` (`Page.tsx`, `ui.tsx`, `layout.ts`, `style.ts`,
   `charts.tsx`, `SeriesIntro.tsx`, `course.ts`, `intro.ts`) and
   `video/src/components/` (`Scene`, `Illustration`, `motion`, `arrow.ts`).
   Related standalone videos worth mining: `llm-temperature/` (sampling, voiced
   by Hope, numbers in `measurements.json`) and `tf-idf/` (the NLP lesson's
   corpus, unvoiced).

## What you own, and what you must not touch

You may create and edit only:

- `video/src/videos/<folder>/` (a placeholder `script.ts` and `Video.tsx` are
  already there and already registered in `src/Root.tsx`; replace them)
- `video/public/images/<folder>/`, `video/public/narration/<folder>/`,
  `video/takes/<folder>/`, `video/.generated/<folder>/`
- files under `video/out/` whose names start with `<Id>` (and
  `out/entries/<Id>.tsx`, already written)
- `$S/<Id>/` for scratch

Never edit anything else: not `src/Root.tsx`, not `src/editorial/`,
`src/components/`, `src/narration/`, `src/sound/`, `scripts/`, the README,
`package.json`, `sfx/`, other videos' folders, or any lesson in `content/`.
If the shared kit lacks something, build it locally in your folder (a
`parts.tsx` or `kit.tsx`) and name it under "Kit suggestions" in your report.

Never run `git commit`, `git push`, `git stash`, `git checkout`, `git reset`,
`git clean` or `npm install`. Reading git (`git log`, `git show`, `git diff`)
is fine.

## Working alongside nine others

- **Every render goes through the queue**: `out/render-slot.sh <command>` (two
  slots, first come first served). That includes stills, previews and every
  `npm run check:*` that renders (frames, motion, sync, mix).
- **Bundle your own entry, never the shared Root.** Another builder's half-made
  folder can break a bundle of `src/index.ts` at any moment.
  - Checks: prefix `VIDEO_ENTRY=out/entries/<Id>.tsx`, e.g.
    `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:frames -- <Id>`
  - Remotion CLI: give the entry as the first argument, e.g.
    `out/render-slot.sh npx remotion still out/entries/<Id>.tsx <Id> out/<Id>-f300.png --frame=300 --scale=1`
  - Always `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`.
- **Prefer stills to renders.** A handful of stills at chosen frames tells you
  more per CPU-second than a preview. Never render at 4K; `check:motion` makes
  the one half-size preview you need.
- **Typecheck and lint only your folder's errors.** Others are mid-edit, so the
  package can be red for reasons that are not yours:
  `flock $S/tsc.lock npx tsc --noEmit 2>&1 | grep "src/videos/<folder>/"` and
  `npx eslint src/videos/<folder>`. `npm test` and `npm run check:cues` read
  every video: read the failures that name your folder.
- Long-running commands (the illustration batch, narrate, renders) go in the
  background (`run_in_background`), so you keep working meanwhile.
- Append one line to `$S/progress/<Id>.log` at each milestone (script drafted,
  art submitted, art imported, scenes built, stills reviewed, voiced, each check
  passed), with the time. The coordinator reads these.

## Facts

Every number, token, tag, price and output on screen comes from running code
you commit beside the video, never typed by hand: `measure.py` (or
`check.mjs`), its output `measurements.json` (or `results.json`), and a
`data.ts` that imports it. Follow the lesson's own examples, data and seeds.

- Python: `$S/pyenv/bin/python`, pinned to the site's Pyodide 314.0.7
  versions: NLTK 3.9.4, NumPy 2.4.6, scikit-learn 1.8.0, tiktoken 0.12.0,
  regex 2026.3.32.
- NLTK data: `export NLTK_DATA=$S/nltk_data` (punkt_tab, stopwords, wordnet,
  averaged_perceptron_tagger_eng, gutenberg: what the lessons load). If you
  need another package, fetch it into the same folder the way the lessons do
  (`https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/<category>/<name>.zip`)
  and say so in your report.
- Tokenizers: tiktoken `o200k_base` is the lesson's; `export TIKTOKEN_CACHE_DIR=$S/tiktoken-cache`.
- What the page prints: `lib/generated/block-outputs.json` holds each lesson
  block's output as the site's Pyodide produced it, keyed by
  `lib/blockOutputKey.ts`. Where your video shows a block's result, agree with
  it, or explain the difference in the script header.
- Prices are the lesson's own table (pricing-structure.mdx, October 2026),
  not looked up.
- Put a header comment in `script.ts` like the existing course scripts: what
  the video covers, part by part, and where each fact on screen comes from.
- If a lesson is wrong (a printed number that disagrees with its own code, a
  date, a quote), do not edit the lesson and do not repeat the error on screen:
  put it under "Lesson discrepancies" in your report with file, line and the
  evidence.

## The script

- `script.ts` exports `script` with `id: "<folder>"`, `voice` as your prompt
  says, `leadIn: INTRO_LEAD_IN`, `minPause: COURSE_MIN_PAUSE`, `tail: 2.6`.
  `npm test` enforces the last three.
- Beats a scene opens on are `scene: true`. Each part of the unit ends with a
  one-sentence turn into the next idea (README, "A video in a series leads into
  the next", last paragraph). The last beat is the bridge your prompt gives,
  after about 0.7 s, and the closing scene shows it with `<NextLine>`; the
  final unit of a course closes without one.
- **Stay under your character cap**, counted as `npm run narrate -- <folder> --dry-run`
  counts it. Cut on paper.
- Written for the ear: short spoken sentences, contractions, no symbols or
  parentheses, numbers as they are said. Initialisms in plain caps, never
  letter-spaced; no sentence opens "A" before one (README, "Writing
  initialisms"). No em dashes, no filler phrases. Never say "in the last video".
- A term, symbol or result gets a breath after it: `pauseAfter` of 0.6 to 1.0 s
  on the beats that define or deliver one.
- Drew reads casual, curious and fun; Hope upbeat and clear. Audio tags such as
  `[curious]` or `[slowly]` sparingly, as the README describes.

## The scenes

- Wrap in `<EditorialPage>`; open on `<SeriesIntro course=… unit=… title=… />`
  exactly as the placeholder does (the title is the plan's; keep it unless a
  better one is obvious, and say so).
- Every animation is cued to a spoken word (`useNarration().word(beat, phrase)`,
  `{ nth }` when the phrase repeats in the beat). Never frame numbers.
- Brand tokens only (`src/theme/brand.ts`, `inkOf` for type in a hue); no hex.
  Nothing under 19px; about 25px between rows of text; figure labels "Fig. N"
  plus a title, numbered in order of first appearance, every figure numbered.
- Arrowheads only from `arrowHead()` in `src/components/arrow.ts`.
- Sound effects: `sfx: true` is already the default in your entry and in Root;
  place the `el-*` set beside the animations they belong to, at the README's
  levels (`el-tap` about -23, `el-pop`, `el-pencil` about -34, `el-whoosh`,
  `el-chime` about -32 and only in a pause). The series intro brings its own.
- **The picture keeps moving**: nothing holds still for 3 s
  (`npm run check:motion`). Build figures as they are named, highlight the
  spoken phrase, count values, bring annotations in.

The review's series-wide problems, to avoid from the start:

1. No breath between ideas: see `pauseAfter` above.
2. The payoff arrives last and leaves first: anything the viewer must read is
   either narrated or stays at full strength for at least its word count / 2
   seconds before an exit.
3. Text on screen nobody says: voice it, or cut it to what can be read.
4. Empty openings: a scene's first figure arrives on its first beat; no half
   of the frame sits empty for long beside a small figure.
5. Notation or jargon before its definition: say the word beside the symbol
   at first use; don't badge something before the narration names it.
6. Counters that show a false number: a counter appears only once it moves,
   or the final value inks on its word.
7. (Fixed in the kit: `note()` uses lining figures; use `TABULAR` only for
   counters and number columns.)
8. No headline half left dangling mid-sentence; one meaning per color within
   a video; no label with a line through it.

## The art

- `illustrations.json` in your folder: copy `meta` from
  `src/videos/db-why-design/illustrations.json` (model `gpt-image-2.5-flare`,
  the watercolor style, `softAlphaWarn`), then 3 or 4 prompts with ids
  `<folder>-<name>`, category `video-hero` (or `video-icon` for a square),
  style `"watercolor illustration"`. A few large objects each, colors from the
  brand set, no text, no person's likeness, written as the README's "A video's
  own image style" says (a noun inside a "no …" clause still gets drawn).
- Generate with the Batch API: `npm run illustrations -- <folder> --dry-run`,
  then `npm run illustrations -- <folder>` **in the background, as early as
  you can** (as soon as the scenes are decided), so the batch runs while you
  build. Quality `low` and a transparent background are the pipeline's
  defaults; don't override them.
- If the batch is still `in_progress` an hour after you submitted it: cancel it
  (`POST https://api.openai.com/v1/batches/<id>/cancel` with `$OPENAI_API_KEY`;
  the id is in `.generated/<folder>/last-batch.json`), then
  `node ../scripts/generate-illustrations.mjs sync --prompts src/videos/<folder>/illustrations.json --out .generated/<folder>`
  and `npm run illustrations -- <folder> --import`. Approved by the user for
  video art.
- Look at every imported WebP (Read it). Redraw one that is wrong
  (`--only <id> --force`), at most twice per image.
- `OPENAI_API_KEY` is in the environment; never write it into a file.

## Review before voicing

The estimate timeline is close enough to build and review on. Before any
narration is sent:

1. Typecheck and lint your folder clean; `npm run check:cues` clean for your
   folder; `npm test` failures naming your folder fixed.
2. `npm run cues -- <folder>` for the timeline; render stills (`--scale=1`) at
   the finished state of every scene and at any moment worth checking, and
   **look at each one** (Read the PNG). Fix spacing, overlaps, empty halves,
   labels on lines, text under 19px.
3. `VIDEO_ENTRY=out/entries/<Id>.tsx out/render-slot.sh npm run check:frames -- <Id>`.

## Voice

1. `npm run narrate -- <folder> --dry-run`: check the take plan and the total
   characters against your cap.
2. `npm run narrate -- <folder>` (background). `ELEVENLABS_API_KEY` is set.
   If ElevenLabs answers 429 (too many concurrent requests: ten builders share
   one account), wait a minute and run the same command again; it voices only
   what is missing.
3. Never `--force`. After an edit, re-voice only the beats whose words changed
   (a plain run does that, or `--only a,b`). The account is shared and every
   character is billed.
4. Then, all through your entry and the queue:
   `check:sync -- <folder>`, `check:motion -- <folder>`,
   `check:frames -- <Id>`, `check:mix -- <folder>`. Fix every failure and run
   it again. Re-take stills of the voiced timeline wherever a cue moved a lot.
   `check:motion` keeps `out/<Id>-preview.mp4`.

## Done means

Voiced, and all of these pass: typecheck and lint for your folder,
`check:cues`, `npm test` for your folder, `check:frames`, `check:motion`,
`check:sync`, `check:mix` (informational: report its numbers). If something
cannot pass, stop and report exactly what and why rather than weakening a check.

## Your report

Write it to `$S/reports/<Id>.md` and return the same text as your final
message:

- Length (from `npm run cues`), characters voiced, takes.
- Each check and its result (sync worst beat, motion longest still, mix LU).
- The scenes in one line each, and the illustration ids.
- Facts: anything on screen you could not compute and how you handled it.
- Lesson discrepancies (file:line, evidence), not fixed.
- Kit suggestions (anything you built locally that belongs in the kit).
- Anything left undone.
