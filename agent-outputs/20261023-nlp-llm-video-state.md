# NLP and LLM course videos: state, and how to resume

Saved 2026-10-23 at the user's request, so the work survives if the session
that started it is lost. The plan is
[`20261023-0700-nlp-and-llm-course-video-plan.md`](20261023-0700-nlp-and-llm-course-video-plan.md);
everything below is about where the work stands. Branch
`claude/blissful-goldberg-149yc1`, pull request dataslope/dataslope#716.

## Where it stands

**Done.** Fourteen videos, every one voiced and passing `check:frames`,
`check:motion`, `check:sync` and `check:mix`; the package passes `typecheck`,
`lint`, `npm test` (59/59) and `check:cues`.

| Video | Folder | Narrator | Length |
| --- | --- | --- | --- |
| Llm-1-Tokens | llm-tokens | Drew | 5:38 |
| Llm-2-Meaning | llm-meaning | Drew | 6:47 |
| Llm-2-1-AttentionScore (deep dive) | llm-attention-score | Drew | 2:27 |
| Llm-3-Generation | llm-generation | Drew | 6:32 |
| Llm-4-Cost | llm-cost | Drew | 5:29 |
| Llm-4-1-ConversationCost (deep dive) | llm-conversation-cost | Drew | 2:20 |
| Llm-5-Benchmarks | llm-benchmarks | Drew | 5:58 |
| Nlp-1-WhyTextIsHard | nlp-why-text-is-hard | Hope | 5:52 |
| Nlp-2-CleaningText | nlp-cleaning-text | Hope | 7:41 |
| Nlp-2-1-LemmasAndTags (deep dive) | nlp-lemmas-and-tags | Hope | 2:27 |
| Nlp-3-CountingWords | nlp-counting-words | Hope | 6:56 |
| Nlp-3-1-ZipfsLaw (deep dive) | nlp-zipfs-law | Hope | 2:07 |
| Nlp-4-TextToFeatures | nlp-text-to-features | Hope | 7:27 |
| Nlp-5-History | nlp-history | Hope | 5:20 |
| **Total** | | | **73:00** |

How it got here, in order:

1. [The plan](20261023-0700-nlp-and-llm-course-video-plan.md); ten builders
   from [`BUILDER-BRIEF.md`](20261023-nlp-llm-video-scratch/BUILDER-BRIEF.md),
   one per unit, their reports in `20261023-nlp-llm-video-scratch/reports/`.
2. [The review](20261023-1030-nlp-llm-video-review.md): 167 findings (9 P1)
   and the choice of four deep dives; one report per video in
   `20261023-nlp-llm-video-review/`.
3. [The fixes and deep dives](20261023-1530-nlp-llm-video-fixes.md): 156
   findings fixed and 11 partly; four deep dives built from
   [`DEEPDIVE-BRIEF.md`](20261023-nlp-llm-video-scratch/DEEPDIVE-BRIEF.md);
   one fix report per video in `20261023-nlp-llm-video-scratch/fixes/`. It
   also lists the lesson errors the work found, which the lessons still
   carry.

**Decided by the user:** Drew for the LLM course, Hope for the NLP course;
`gpt-image-2.5-flare` at quality low, transparent, Batch API (direct `sync`
after an hour's stall); five videos per course; then a full review, its
fixes, and 3 to 5 short deep dives chosen from the review.

**Open:** whether to correct the lessons where their prose contradicts their
own code (the fixes document's table), and how the videos are embedded on
the site (undecided for every course).

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

ElevenLabs had 80,140 characters left at the start (resets 2026-11-16). By
the scripts' own count the work used 58,952: 45,814 for the ten first
recordings, 6,063 re-voiced in the fix pass and 7,075 for the deep dives.
The account's own counter fell by less (it reported 67,170 left at the
end), so whichever is right there is room for later re-voicing.
