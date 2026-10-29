# DataScientist-11-LlmEvaluation: P3 fixes

Report: `agent-outputs/20261029-ds-interview-video-review/DataScientist-11-LlmEvaluation.md`.
Folder: `video/src/videos/ds-llm-evaluation/`. Nothing committed.

## P3s

| # | Finding | Status | What changed |
| --- | --- | --- | --- |
| 9 | McNemar named, not what it tests | fixed | `size-pair` split after "ten to A." (`size-pair` / `size-mc`, cut free). New beat `size-null` between them: "If the two versions were equally good, those would split about evenly, like coin flips." On screen, under "35 disagree: only these count": "if equally good, / about **17.5** each way". The 17.5 is `pair.evenSplit`, new in `check.mjs`. |
| 10 | "point oh two" said, 0.017 shown | fixed (screen) | McNemar's p is shown as `p = 0.02` (`toFixed(2)`). It now matches the narration and the `p = 0.23` above it. |
| 11 | 64% label drops "at least one" and the 5% level | fixed | `check-list` split three ways (`check-list` / `check-test` / `check-rest`, cut free). `check-test` re-voiced: "...or twenty segments tested at five percent each with no correction, which gives a sixty-four percent chance of at least one false alarm." Screen: "20 segments at 5% each, no correction: **64% chance of at least one false alarm**". The 5% is `notebook.alpha`, new in `check.mjs`. |
| 12 | "A judge can't beat the humans it imitates" overstates the page | fixed | `judge-bias` split before its last sentence. `judge-bar` re-voiced: "Don't expect a judge to beat the humans it imitates." The screen line matches. |
| 13 | Red used for things that aren't traps (the rest; Q1 was done in P2) | fixed | Hook: the "what's new" label and its three chips are now `INK`. Q4: judge and A are purple 500 (`FAMILY`, an accent with no meaning in the series), and B is the default `INK_SOFT`. Close: the bank chip is `BLUE_INK` like the other two, and the yellow `lit` still marks it. |
| 14 | Authoring note printed on screen | fixed | The "each drawn as a mechanism…" Note is deleted, along with the `madeUp` import that only it used. |
| 15 | Grid can't show each rater's 90/90 | fixed | The 10 red cells are now 5 solid ("only the judge passes") and 5 with a white slash ("only the expert passes"). Local `Grid100` in `parts.tsx` gains a `slash(i)` option. The legend has two columns with a matching slashed swatch. A new line reads "judge and expert each pass **85 + 5 = 90** of the 100", using `judge.judgePasses` / `expertPasses`, new in `check.mjs`. |
| 16 | Wide hyphens (the CheckScene half; the PrevScene half was done in P2) | fixed | `...TABULAR` is gone from the "t-test" / segments line. Its numbers never change. |
| 17 | "updated under the same name" touches the red bar | fixed | Label moved to `TL.y - 54`, about 10 px clear of the bar. At −54 its first letters would have met the end of "the test, start to finish, one model name", which runs past `mid`, so that line moved up to `TL.y - 82` (about 13 px between them). |
| 18 | "2. stratify" runs into its explanation | fixed | `marginLeft: 16` replaces the collapsed `{"  "}`. |
| 19 | "the headline" drops "number" | fixed | The screen now reads "reproduce the headline number another way". |
| 20 | Close is the densest beat | already done | Fixed in the P2 pass (`close` / `close-practice`). |
| 21 | Rapid answers drop a clause | fixed | New beat `r-thumbs-diag`: "Keep the thumbs-up rate as a diagnostic, not the target." Screen line: "keep the thumbs-up rate as [a diagnostic, not the target]". `r-contam` split before its last sentence. `r-contam-keep` re-voiced: "...and never train on it or put it in few-shot prompts." The last chip extends to "never train on it or put it in few-shot prompts". I used the page's "few-shot prompts" rather than the report's "paste it into prompts". |

## Voice

**493 characters re-voiced** (the `narrate --dry-run` count), five beats, each voiced alone on `eleven_v4_turbo`:
`size-null` (88, new), `judge-bar` (52), `check-test` (184), `r-thumbs-diag` (56, new), `r-contam-keep` (113).

Free: four splits at sentence breaks: `size-pair`/`size-mc`, `judge-bias`/`judge-bar`, `check-list`/`check-test`/`check-rest` and `r-contam`/`r-contam-keep`. `narrate --recut` cannot cut this video (its takes predate the P2 beats voiced alone). Each split was cut from the beat's own file with `$S/DataScientist-11-LlmEvaluation/tools/split.mjs`, which is the DS-4 tool with `ID = "ds-llm-evaluation"`. I validated it first by re-cutting the untouched `size-strat` into itself. The alignment came back identical, the length identical (5.381 s) and the lag zero. The only difference is one MP3 re-encode generation, 28 dB SNR. I then restored the committed file. No takes were written.

## Facts

`check.mjs` was re-run with the private Pyodide copy (`NODE_PATH=$S/DataScientist-11-LlmEvaluation/pyo/node_modules`). It adds four fields:
- `pair.evenSplit` 17.5
- `judge.judgePasses` 90
- `judge.expertPasses` 90
- `notebook.alpha` 0.05

Every existing value in `results.json` came back identical, checked field by field against a copy taken first.

## Length and checks

- **Length:** 496.0 s (8:16), was 477.3 s; 43 beats, was 36.
- Typecheck: no errors in `src/videos/ds-llm-evaluation/`. ESLint: clean.
- `npm run check:cues`: no failures in this folder. The failures it lists are in `ds-deep-learning`, `ds-ml-evaluation` and `ds-probability`, which other fixers are editing.
- `npm test`: 57 of 59 pass. Both failures are the cue-scan tests, and every line they list names those same three other folders. None names this one.
- `check:motion`: passed, nothing still for 3 s across all 8:16.3. There are 8 stretches of 2.0 to 2.8 s, on question cards being read and finished scenes before their cut.
- `check:sync`: passed. All 43 beats start within ±0.12 s of their cues; the worst is +0.06 s (`judge-bar`). The five newly voiced beats sit at −0.01 to +0.06 s.
- `check:mix`: passed. The effects are 29.8 LU under the narration. Where both sound, speech is a median 27.8 dB above them (5th percentile 12.3 dB).
- `check:frames`: not run. No arrow, illustration or ERD changed (the grid slash is a cell mark).
- Stills, each looked at:
  - 36 s: the hook's "what's new" in ink
  - 180.8 s: the even-split note
  - 190.5 s: p = 0.02 and the stratify gap
  - 212 s: the slashed grid, legend and 85 + 5 = 90
  - 256.3 and 259.5 s: purple family, no authoring note, the "don't expect" line, and the legend clear of "offline scores"
  - 300 s: the timeline labels, zoomed
  - 425 s: the 64% line and the headline number
  - 454.2 s: the diagnostic line
  - 474.9 s: the few-shot chip
  - 493.3 s: the blue bank chip

## Shared kit

None needed; everything was local to this folder. Two notes:
- `narrate --recut` could cut one beat's own file into pieces when the takes no longer match the script (what `split.mjs` does), as DS-4's report also suggests.
- If the coordinator wants the slashed cell elsewhere, the `slash(i)` option on this folder's `Grid100` is a few lines.
