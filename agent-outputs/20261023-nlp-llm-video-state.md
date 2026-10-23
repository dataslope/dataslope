# NLP and LLM course videos: state, and how to resume

Saved 2026-10-23 at the user's request, so the work survives if the session
that started it is lost. The plan is
[`20261023-0700-nlp-and-llm-course-video-plan.md`](20261023-0700-nlp-and-llm-course-video-plan.md);
everything below is about where the work stands. Branch
`claude/blissful-goldberg-149yc1`, pull request dataslope/dataslope#716.

## Where it stands

Ten unit videos, each built by one builder agent from
[`20261023-nlp-llm-video-scratch/BUILDER-BRIEF.md`](20261023-nlp-llm-video-scratch/BUILDER-BRIEF.md),
in parallel in one checkout. Each builder's milestones are in
`20261023-nlp-llm-video-scratch/progress/<Id>.log`, and its report (once it
has finished) in `reports/<Id>.md`. A builder's report is final only once its
progress log ends with "report written" or similar; earlier copies are drafts.

| Video | Folder | Narrator | Length | Characters | State |
| --- | --- | --- | --- | --- | --- |
| Llm-1-Tokens | llm-tokens | Drew | 5:23 | 4,094 | built, every check passes |
| Llm-2-Meaning | llm-meaning | Drew | 6:32 | 5,054 | built, every check passes |
| Llm-3-Generation | llm-generation | Drew | 6:19 | 5,156 | built, every check passes |
| Llm-4-Cost | llm-cost | Drew | 5:02 | 3,885 | built, every check passes |
| Llm-5-Benchmarks | llm-benchmarks | Drew | 5:38 | 4,379 | built, every check passes |
| Nlp-1-WhyTextIsHard | nlp-why-text-is-hard | Hope | 5:17 | 3,863 | built, every check passes |
| Nlp-2-CleaningText | nlp-cleaning-text | Hope | 7:31 | 5,582 | built, every check passes |
| Nlp-3-CountingWords | nlp-counting-words | Hope | 6:34 | 4,778 | built, every check passes |
| Nlp-4-TextToFeatures | nlp-text-to-features | Hope | 6:50 | 5,016 | built, every check passes |
| Nlp-5-History | nlp-history | Hope | 5:12 | 4,007 | built, every check passes |
| **Total** | | | **60:18** | **45,814** | |

All ten were built and voiced by 2026-10-23 10:00 UTC. The package passes
`typecheck`, `lint`, `npm test` (59/59) and `check:cues`. The review (step 2
below) started then: frames, timelines and contact sheets for all ten, and one
reviewer per video.

Everything the builders had written at the save is committed: scripts,
scenes, `measure.py` and its output, the imported WebP art, the narration
(`video/public/narration/<folder>/`) and the raw takes (`video/takes/<folder>/`).

**Decided by the user:** Drew for the LLM course, Hope for the NLP course;
`gpt-image-2.5-flare` at quality low, transparent, Batch API (direct `sync`
after an hour's stall); five videos per course; then a full review, its fixes,
and 3 to 5 short deep dives chosen from the review.

## Next steps

1. **Finish the ten.** Done.
2. **Review.** Render frames every 0.5 s and contact sheets with the tools in
   `20261023-nlp-llm-video-scratch/review-tools/` (adapted from the October 21
   review), then one reviewer per video from `REVIEW-BRIEF.md`. Reports list
   findings P1 to P3 and up to three deep-dive candidates each.
3. **Fix** the findings, as `20261021-1530-course-video-fixes.md` did.
4. **Deep dives:** 3 to 5, about 2 minutes each, in the course's voice,
   picked from the reviewers' candidates.
5. Each finished video gets its own commit; update the PR description.

## Restoring the scratch setup in a fresh container

`20261023-nlp-llm-video-scratch/` holds copies of what lived in the session
scratchpad and in `video/out/` (gitignored). Code files carry an extra `.txt`
suffix so the site's TypeScript and ESLint skip them; drop it when restoring.

- **Private entries:** copy `entries/<Id>.tsx.txt` to
  `video/out/entries/<Id>.tsx`. Each registers one composition on its own, so
  a video can be checked while others are mid-edit:
  `VIDEO_ENTRY=out/entries/<Id>.tsx npm run check:frames -- <Id>` (see the
  video README, "Checking one video while others are mid-edit").
- **Render queue:** `render-slot.sh.txt` → `video/out/render-slot.sh`
  (`chmod +x`), and point its `L=` line at a lock folder in the new scratchpad.
  Two Chromium renders at a time on the 4-CPU container.
- **Browser:** `export REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`.
- **Python for facts**, pinned to the site's Pyodide 314.0.7:
  `python3 -m venv <scratch>/pyenv && <scratch>/pyenv/bin/pip install nltk==3.9.4 numpy==2.4.6 scikit-learn==1.8.0 tiktoken==0.12.0 regex==2026.3.32`.
- **NLTK data** (what the lessons load), into `<scratch>/nltk_data` with
  `NLTK_DATA` pointing there: `tokenizers/punkt_tab`, `corpora/stopwords`,
  `corpora/wordnet`, `taggers/averaged_perceptron_tagger_eng`,
  `corpora/gutenberg`, each from
  `https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/<path>.zip`,
  unzipped beside the zip.
- **Builder scripts:** `builder-scripts/<Id>/` holds the small helper scripts
  each builder wrote (batched stills, contact sheets, job scripts).

## Budget

ElevenLabs had 80,140 characters left at the start (resets 2026-11-16). The
ten first recordings were capped at 52,000 together and came to 45,814 by the
scripts' own count. The account then reported 70,062 characters left (61,050
of 131,112 used), a smaller drop than the scripts' count; whichever is right,
the review's re-voicing fits.
