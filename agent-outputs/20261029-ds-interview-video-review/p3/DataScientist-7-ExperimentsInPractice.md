# DataScientist-7-ExperimentsInPractice: P3 fixes

Folder `video/src/videos/ds-experiments-in-practice/`. Review:
`agent-outputs/20261029-ds-interview-video-review/DataScientist-7-ExperimentsInPractice.md`.
P2 fix report: `.../fixes/DataScientist-7-ExperimentsInPractice.md`. Nothing committed.

## The P3s

| # | Status | What changed |
| --- | --- | --- |
| 10 "read in week one" labels a 1-2.5 week band | fixed | `NoveltyScene`: "read in week one" now leaves (`out={pastAt}`) as the grey band replaces the yellow one, and the grey band gets its own label, "run past these weeks" in green, at the band's left edge. |
| 11 Long-running sketch labels on the wrong things | fixed | `RapidScene` `Long`: the boxes are numbered "week 1", 2 ... 8. The orange drift labels moved above the strip, over weeks 3-4 and 5-6. "at least one full business cycle" now sits directly under its green outline, with "(often a week or two)" under it (the page's own wording). The end-date flag now stands at the end of week 8, labelled under the strip right-aligned to its pole. "freeze the scope" became "freeze the scope for the whole run", on the top row, so it no longer reads as the outline's label. |
| 12 SRM labels run together; the bad split's verdict leaves | fixed | `SrmScene`: "asked for: / 5,000 each" moved to the right end of the dashed line, as two lines, clear of B's "5,200" and of the formula column. When the formula exits on `srm-cause`, a red "p ≈ 0.00006: an SRM" takes its place above the main bars, mirroring the contrast split's green "p = 0.42: chance". |
| 13 Legend on the p = 1 gridline | fixed | `ManyScene`: the right panel's log scale now tops out at `lg(4)` instead of `lg(1.5)`, so the "really moved / didn't" key sits in headroom above the p = 1 row. Ranks 3-5 move about 10% closer to their steps; the rings, the fence and the printed comparisons beside the legend (from the P2 pass) still carry that. |
| 14 Zero line through "−0.1" | fixed | `NullScene`: the suggested fix (end labels under the bar) would still have crossed the zero line, which runs the full height of the plot. For the 100,000-per-arm row only, the end labels now sit beside the caps on the bar's own row ("−0.1 ⊢●⊣ +0.4"), and its verdict moved 26 px right to make room. The 1,000-per-arm row keeps its labels above. |
| 15 One-word orphans | fixed | Simpson's half was done in the P2 pass. Network: both green notes take `textWrap: "balance"` and now read "randomize groups / that rarely touch" and "clusters of friends, / or whole cities". DiD: the question card is `size={54}` and fits on one line. |
| 16 Q7 to Q8 gets 0.7 s | fixed | `network` `pauseAfter: 1.6`. |
| 17 "DID"; bars "new" next to a "gets the sharing feature" legend | fixed | The DiD half was done in the P2 pass. The network bars now read "sharing" and "control". |
| 18 "1×" off-centre | done in P2 | Both values are centred over their bars (P2 rewrote the block). |
| 19 "factorial design" named, not explained | fixed | New beat `factorial` after `concurrent`: "A factorial design randomizes each test independently, so all four cells fill, and estimates the interaction directly." On screen, under "if they differ, the two interact": "factorial: randomize each test independently" / "all four cells fill; estimate the interaction". On "all four cells fill" the "neither" cell lights too, so the whole grid is filled. The page says factorial designs "explicitly model the joint assignment". |
| 20 64% rests on unstated assumptions; Bonferroni's guarantee unnamed | fixed | `many` split at its sentence break; `many-20` re-voiced: "Read twenty independent metrics where nothing really moved, and the chance that at least one of them fires is sixty-four percent." `many-fix` split; `many-bonf` re-voiced: "Bonferroni divides the five percent by ten, which holds the chance of any false alarm to at most five percent. It keeps two: safe, but it drops a real one." On screen, the left panel's x axis now reads "independent metrics read, none really moved". The Bonferroni guarantee is narration only: the legend column has no room for a second line under its row. |
| 21 Winner's curse not tied to meta-analysis | fixed | New beat `r-pool` after `r-curse`: "So pool every experiment you ran, not just the winners." On screen, a green line under the meta-analysis panel says the same. `pauseAfter` 1.8 moved from `r-curse` to `r-pool` as 1.2, so the 2.24× bar now holds at full from about 512.1 s to 518.7 s, through `r-pool`, before the bridge. Not added: the page's fixed- versus random-effects distinction. |
| 22 ATE = ATT too absolute; no reason to use ATT | fixed | `r-ate` split; `r-ate-why` re-voiced: "If everyone assigned is treated, a randomized test makes them match. Opt-in features and observational data can pull them apart. Report ATT when only the people who use the feature matter." (the page: "ATT is appropriate when you only care about the effect on the group that would actually use the feature"). On screen: "randomized, all treated: they match", "opt-in or observational: they can differ", and a new blue line, "report ATT for the people who use it". The two definitions now land word by word (see `check:motion` below). |

No P3 was moot, and none looked wrong against the frames or the page.

## Voice

- **645 characters re-voiced** (the count `narrate --dry-run` printed), 5 beats, each on its own: `many-20` (129), `many-bonf` (155), `r-ate-why` (188), and the new `factorial` (118) and `r-pool` (55).
- **Three splits at sentence breaks, at no cost:** `many` | `many-20`, `many-fix` | `many-bonf`, `r-ate` | `r-ate-why`. The first pieces, `many`, `many-fix` and `r-ate`, play their cut audio unchanged. `narrate --recut` still refuses this video because its takes are stale, so I used two workarounds:
  - **`many` and `many-fix` are cut from kept take 3.** Their words are still in that take, and their committed audio came from it. The tool is `$S/DataScientist-7-ExperimentsInPractice/tools/recut-take3.mjs`, after DS-0's `recut-take.mjs`. It runs narrate's own `--recut` on a scratch root whose script is take 3's text, split at every boundary the video now has. The untouched `many-end`, `switchback`, `sb-time` and `concurrent` came back byte-identical to HEAD, in both MP3 and alignment entry.
  - **`r-ate` is cut from its own file with `split.mjs`.** It was voiced alone in #715 and is in no take; take 4 holds an older recording with "A T E". The tool is DS-4's `split.mjs`, copied to `$S/DataScientist-7-ExperimentsInPractice/tools/split.mjs` with its `ID` changed. I validated it on the untouched `r-holdback` and then restored that beat. The re-cut had the same length (312,890 samples, zero offset) and a byte-identical alignment entry. The audio is one extra MP3 encode of the same speech, at 30 dB SNR.
  - Both tools gave identical alignment entries for `many` and `many-fix`, so the take cut changed only those two MP3s' bytes. The only alignment entries that differ from HEAD are the eight beats named above.

## Length and checks

- **Length:** 532.2 s (8:52), up from 501.2 s. 39 beats.

Every check below ran on the final code and audio.

- `tsc`: exit 0, nothing anywhere. `eslint`: nothing in the folder.
- `check:cues`: pass.
- `npm test`: pass, 59/59.
- `check:sync`: pass, 39 beats, worst +0.03 s (`many-end`).
- `check:mix`: pass. The effects sit 30.9 LU under the narration, with a median of 30.1 dB between them. The closest point is 10.3 dB at 1:15.1, in the untouched SRM scene, the same as after the P2 pass.
- `check:motion`: pass. The longest still is 2.5 s, over `many` and over `network`.
  - The first run failed: a 4.0 s still at 7:29-7:33, over `r-ate`. Two things lengthened the quick round: `r-ate-why` got longer and `r-pool` is new. `Drift` spreads its ease over the whole scene, so it now moves too slowly to count as motion. The ATE/ATT figure had nothing else moving between the outer circle at "ATE" and the inner one at "on the treated".
  - The fix is word-cued. "ATE" lands on its word, and ": averaged over everyone" follows on those words. "everyone" pulses the outer circle (its fill deepens, its stroke thickens). "ATT" lands on its word, and its definition follows on "only over those who actually got it".
- `check:frames`: not run; no arrow, illustration or ERD changed.
- **Stills** checked at 85, 96.5, 136.5, 226.5, 246, 266, 290, 320.5, 389, 395, 440, 449.5, 451.9, 455.6, 459, 472.5, 484.5 and 517.5 s, covering every place that changed.

## Shared kit

No shared change is needed for these fixes. Two suggestions:

- `QuestionCard` could set `textWrap: "balance"` on the headline. That would end question-card orphans like this video's DiD card across the series, without each video tuning `size`.
- `narrate --recut` could cut one beat's own file into pieces when the takes no longer match the script, as `split.mjs` does. Every split in both passes of this video needed a workaround.
