# DataScientist-0-Interview: P2 fixes

Folder `video/src/videos/ds-interview/`. Review report:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-0-Interview.md`.
Not committed.

## P2s

| # | Status | What changed |
| --- | --- | --- |
| 1 | fixed | Split `probe` after its first sentence (re-cut from the kept take, no cost), then re-voiced only that sentence: "Across the loop, interviewers probe five things." The rest of the old beat is now `probe-list`, unchanged audio. On screen the kicker is now "What interviewers probe" (the page's heading) and the turn is "probed across the loop." The numbered cards stay. Once the claim is no longer "every round", reading each card as mostly one round's subject agrees with the loop, so the figure no longer undercuts the headline. |
| 2 | fixed | Re-voiced `practice`: "Each page carries practice too. Every one has concept checks, four add challenges that run in your browser, and a bank of a hundred and ten multiple-choice questions covers the whole track." The screen now has two lines. Line 1: "Every page: concept checks · 4 pages: challenges that run in your browser". Line 2, at `y(LINE_Y + 44)` and cued to "a bank of a hundred and ten": "A bank of **110 multiple-choice questions**, for the whole track". Line 1 is cued to "Every one has", and the "In each…" line it replaces stays until then, so "Every page:" never sits alone across the sentence break. The 4 and the 110 now come from a new `check.mjs` (it counts the component tags on `content/interview/data-scientist/`), through `results.json` to `data.ts` (`CHALLENGE_PAGES`, `BANK`). The challenge pages are machine-learning, probability, python-and-pandas and sql. All 9 topic pages have concept checks. |
| 3 | fixed | Split `ai` at its sentence breaks into `ai` (headline and LLM evaluation, unchanged), `ai-exp`, `ai-check` (unchanged) and `ai-rounds`, each with `pauseAfter: 0.6`. Re-voiced `ai-exp`: "…from one run to the next, and the provider can change the model in the middle of a test." Panel 2 gets a third line, "and the model can change mid-test". Re-voiced `ai-rounds`: "And some coding rounds allow an assistant and grade how you check its work. Others ban it, so ask the recruiter about each round." Under panel 4's pills: "if allowed, graded on how you check its work" in INK, with the yellow `<Mark>` on the grading clause, cued to "grade how you check its work". Below that: "ask the recruiter about each round". |

The page agrees with all three fixes. index.mdx itself says "(where it fits) runnable challenges", "Some coding rounds allow an assistant and grade how you verify it" and "a provider can change the model in the middle of a test". No page error found.

### P3s fixed on the way

- **9** ("multiple - choice"): fixed. The rewritten practice lines carry no `TABULAR`. The 4 and the 110 are static, so they need none.
- **5** (color against meaning): partly fixed. The recruiter line was rewritten for #3, and it is now INK instead of the red `ACCENT_INK`. The loop scene's green B arm is untouched (LoopScene was not part of any P2 edit).
- **13** (four AI ideas in one 31 s beat): mostly fixed by #3's split. Each panel now has its own beat and a 0.6 s pause. The first piece, `ai` (headline and LLM evaluation), still runs 2.75 words/s because its words did not change.

Not fixed (no P2 edit touched them): 4, 6, 7, 8, 10, 11, 12. Number 12 (explain "eval set", "LLM judge") would mean re-voicing `ai` (about 290 characters). That still fits the 993 characters left in the budget if wanted.

## Voice

**507 characters re-voiced** (the `narrate --dry-run` count), each beat on its own:

- `probe`: 48
- `ai-exp`: 141
- `ai-rounds`: 129
- `practice`: 189

`probe-list`, `ai` and `ai-check` were split off and re-cut from the kept take at no cost. `loop`, `series` and `next` are byte-identical.

## Length and checks

- `npm run cues -- ds-interview`: 10 beats, 292 words, **129.8 s** (2:10), up from 118.4 s.
- Typecheck and eslint for `src/videos/ds-interview/`: clean.
- `npm run check:cues`: nothing in ds-interview (0 missing, 0 ambiguous).
- `npm test`: 59/59 pass on the final code.
- `check:motion`: pass on the final code, nothing still for 2 s or more over 2:10.0. It was also run once before the last two edits, with the same result.
- `check:sync`: pass. Every beat is within ±0.12 s; the worst is +0.02 s (`next`). The re-voiced beats sit at −0.00 to +0.01.
- `check:mix`: pass. Effects sit 32.2 LU under the narration. Where both sound, the speech is a median 27.5 dB above the effects (5th percentile 12.7 dB).
- `check:frames`: not run, since no arrow, illustration or ERD changed.
- Stills at every change, each looked at (full size unless marked):
  - 22.8 s and 46.5 s: the probe headline and the finished columns.
  - 75.5 s: panel 2 with its third line.
  - 82.5 s and 84.5 s (from the half-size `check:motion` preview): panel 4 building.
  - 88.3 s: panel 4 finished.
  - 107.8 to 112.5 s (from the final `check:motion` preview): the practice band handing over from "In each…". The full-size stills for this moment timed out in the render queue.
  - 118.8 s and 124.5 s: both practice lines.
  - 129 s: Next.

## Noticed

- **The cue checks could not see most of this video's cues.** ProbeScene and AiScene cued through one-argument wrappers (`const w = (p) => n.word("ai", p)`). `check:cues` and `scenes.test.ts` only read literal `.word("beat", "phrase")`, so 34 of the video's 57 cues had never been checked. All 57 are now literal `n.word(...)` calls, and the scanner reports them clean. Kit suggestion: have `cue-scan.mjs` flag `=> n.word("…", p)` wrappers, which no other video uses today, so a new one cannot hide its cues again.
- **The Part 4 tile wraps too.** "Machine learning II" puts "II" on a line of its own, the same ragged baseline P3 #10 reports for Product sense. Left as is.
- **New files:** `check.mjs` and `results.json` in the folder. `data.ts` now imports `results.json`, as the other videos' `data.ts` files do.
