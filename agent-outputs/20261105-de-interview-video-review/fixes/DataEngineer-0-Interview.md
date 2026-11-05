# DataEngineer-0-Interview: fixes

Folder `video/src/videos/de-interview/`. Review report:
`agent-outputs/20261105-de-interview-video-review/DataEngineer-0-Interview.md`
(0 P1, 2 P2, 8 P3). Nothing committed.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 answer | fixed | New beat `probe-design` after `probe-store`, voiced alone, with `probe-store`'s `pauseAfter: 0.8` moved onto it: "Designing a pipeline for X draws on all four layers at once. The series builds each layer, and Part eleven walks one design through, end to end." On screen, on "all four layers": all four bands light at 60% of the reading yellow, and a 2px `INK_SOFT` bracket draws down the stack's right (x = 1470, `bandY(0)` to the stack's foot) with a nub pointing at "design a pipeline for X" (`body(32, true)`, `INK`, at left 1500, `bandY(2) + 20`, under the meerkat), cued to "Designing a pipeline for X". Under it, "Part 11 walks one through" (`label(21, BLUE_INK)`), cued to "Part eleven walks". The 11 is `partOf("de-pipelines-for-ai")` from `PARTS`, and `check.mjs` now fails if the narration's "part eleven" stops matching it. Part 11's question 2 ("Walk through the ingestion pipeline for a RAG assistant") is the walk-through it points at. |
| 2 | P2 | fixed | Pair boxes inset as suggested: `left: colX(pr.a) + 4`, `width: colX(pr.b) + COL_W - colX(pr.a) - 8`. Still at 121.8 s: a 16px white gap between the SQL and modeling pairs. |
| 3 | P3 | fixed | **The map:** each layer's name now carries its parts in `label(21, BLUE_INK)`: "Parts 1–2", "Parts 3–4", "Parts 6, 8, 10", "Parts 7, 9", derived from `PARTS` by folder (`partOf` in `data.ts`). They ink in on "builds each layer" in `probe-design` rather than with each layer, so the narration says what they are; the line opens under the name as it inks, so name and label stay centred in the band together. **The page's pointer:** new beat `ai-more`, "Part eleven covers all four in depth.", and under the cards "**Part 11**, Pipelines for AI, covers all four in depth." cued to it. **RAG's gloss:** on screen only, under its expansion: "a model answers from documents it looks up" (`note(22, INK_SOFT)`, italic, balanced over two lines). `ai-rag` was not re-voiced: the gloss in the narration would have cost about 220 characters of the 400 P3 budget. |
| 4 | P3 | fixed | The four step boxes stand as empty dashed outlines (`HAIRLINE` at 50%) from "Ingestion" and fill, blue with their word, on their own cues as before (still at 66 s). The first scene's `Scene` starts at frame -6 (`Video.tsx`) and its kicker inks at -14, so frame 0 is the kicker, not a blank page (still at 0 s). The series scene's names now ink in on "This series" rather than "follows the track", 0.9 s sooner (still at 113.8 s). |
| 5 | P3 | fixed | Card: "Postgres (pgvector) or a dedicated store", Part 11's word. Narration re-voiced: "…exact or approximate, Postgres with its vector extension or a dedicated store, metadata filters…". The cue is now `"Postgres with its vector extension"`. I dropped the suggested comma before "or", which in a comma-separated list would make the extension and the dedicated store read as two separate items. |
| 6 | P3 | fixed (screen) | The card line is the page's wording, "personal data kept away from external embedding APIs", which wraps as "…kept away from external / embedding APIs" (still at 111.2 s). The narration still says "kept from outside embedding APIs". Spoken, it has no line break to misread, and re-voicing `ai-gov` (150 characters) did not fit in the P3 budget. |
| 7 | P3 | fixed | The loop is gone. A `BLUE_INK` arrow comes down into "parse" from above (`top - 70` to `top - 6`) on "keep it fresh incrementally", with "only new and changed documents" (`note(24, INK)`) beside its tail at `top - 84`. The caption "keep it fresh, incrementally, like any other pipeline" is kept, centred under the row at `bottom + h(22)` (still at 75.5 s). |
| 8 | P3 | fixed | **"each answered once":** kept in the narration and the headline, and glossed under the headline on "each answered once": "The topic pages ask 182; a question two pages share is answered once, in one video." The 182 is `PAGE_QUESTIONS` (`results.json`). **"worth a figure":** `series-how` re-voiced as "Each video works through the harder questions in figures, and most end on a quick round of one-line answers." The screen line reads "Each video: the harder questions, in figures, then, in most, a quick round of one-line answers." **"3 pages":** now "SQL, Python and warehousing pages: challenges that run in the browser". The names come from `results.json` (pages with `challenges > 0`) through `CHALLENGE_PAGE_NAMES` in `data.ts`, not typed. The line ends near x = 1,555. |
| 9 | P3 | fixed | One highlight box now does the bridge. On "hard sequel" (143.1 s) it lights Parts 1 and 2 together. On "the series starts there" (144.8 s) its right edge slides in to Part 1 alone as the other ten dim. Stills at 143.9 s (pair lit) and 146.5 s (Part 1 alone). |
| 10 | P3 | fixed | `expect` split into `expect`, "Expect it in a data engineer interview." (`pauseAfter: 0.5`), and `expect-sql`, "Alongside it comes sequel, a level deeper than an analyst screen." Both were re-voiced, because the take has a comma, not a sentence break, after "interview", so no part of the old beat could be cut from it for free. `sqlAt` is `"comes sequel"` and `deeperAt` `"a level deeper"`, both in `expect-sql`. The meerkat still pops on "Expect it", the SQL band 3.2 s later. Pace: 2.7 and 2.3 words/s (was 3.31). |

No finding was judged wrong. The page agrees with each fix: "pgvector versus a dedicated store", "kept away from external embedding APIs", "Pipelines for AI covers these questions in depth". No error on the page.

## Voice

**542 characters re-voiced** (the `narrate --dry-run` count), each beat on
its own, no new take, no `--force`:

- **P2 (answer), 144:** `probe-design` (new).
- **P3s, 398:** `expect` 39, `expect-sql` 65 (new), `ai-vector` 149,
  `ai-more` 37 (new), `series-how` 108.

Nothing was free to recut: the only split (`expect`) fell at a comma, which
`locateBeats` will not start a beat after. Against the pre-fix commit
`4bff3bc`, every other beat's entry in `alignment.json`, its `meta` and
every other MP3 are byte-identical, and the takes are untouched (checked
with `git diff --stat 4bff3bc -- video/public/narration/de-interview/
video/takes/de-interview/` and a per-beat comparison of the alignment).

Left for budget: `ai-gov` ("kept from outside", 150 characters) and the RAG gloss in `ai-rag` (about 220). Both are carried on screen instead.

## Length and checks

CHECKS_PLACEHOLDER

## Facts

`node video/src/videos/de-interview/check.mjs` re-run: `results.json` is
byte-identical (bank 110, 9 topic pages, 182 page questions, concept checks
on 9, challenges 5 on 3). `QUESTIONS` is still 157. The new on-screen
numbers come through `data.ts`: 182 (`PAGE_QUESTIONS`), the challenge page
names (`CHALLENGE_PAGE_NAMES`, from `results.pages`), and every part number
(`partOf`, from `PARTS`). `check.mjs` now also asserts that "Part eleven" in
`probe-design` and `ai-more` is where Pipelines for AI stands in `PARTS`.

## Noticed

- **The video is 20 s longer** (2:13 to about 2:32). Most of that is the two new beats (`probe-design` 10.1 s, `ai-more` 3.1 s) and the slower, split `expect`. The prompt scene is now 60 s. It keeps moving: each layer fills on its cue, then the design bracket and the parts labels arrive.
- **The narration and the card differ** on the governance line ("kept from outside" spoken, "kept away from external" written) until `ai-gov` is re-voiced. If the re-dub after this pass has budget, the text to use is the page's: "personal data kept away from external embedding APIs", cued `"personal data kept"`.
- **The AI scene still has no watercolor spot.** Part 11's llama (`de-pipelines-for-ai-llama`) would fit beside the new pointer line, if a picture is wanted there. I did not add it.
- No shared change needed.
