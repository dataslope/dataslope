# Deep-dive video: brief

You build one short **deep-dive** video: about two minutes on one idea that
its course's unit video could only sketch. It is embedded on its own at one
lesson section, beside the unit video, so it must work for a viewer who has
not just watched the unit.

**Your main instructions are the unit builders' brief, which applies in
full except where this page says otherwise:**
`/tmp/claude-0/-home-user-dataslope/2a3cc9a3-7547-5d18-88e1-2b54dd0db0d9/scratchpad/BRIEF.md`.
Read it first. Everything in it holds: what you own (your own folder,
images, narration, takes, `out/<Id>*`), the render queue, your private entry,
facts computed in `measure.py`, the voice rules, the art pipeline, the
checks, no commits, no lesson edits, the report.

## What is different

- **No series intro and no `<NextLine>`.** The video opens straight on its
  question and ends on its takeaway. The placeholder `Video.tsx` has no
  intro; keep it that way. (Like the standalone videos such as
  `llm-temperature/` and `tf-idf/`, which are good models of the length and
  shape.)
- **Script:** `id`, `voice` and `minPause: COURSE_MIN_PAUSE` are already in
  the placeholder; keep them, and `tail: 2.6`. No `leadIn` (the first word
  comes after a short breath, as the standalone videos have).
- **Length about 2 minutes, character cap 1,900.** One idea, shown working,
  step by step. The review that asked for this video says what it should
  show; that is your outline.
- **Start from the unit.** The unit video's folder already has the lesson's
  data in `measure.py`/`measurements.json`, a visual kit in its
  `parts.tsx`/`kit.tsx`, and art. Copy what you need into your folder (never
  import across folders, never edit the unit's folder: its builder is fixing
  it right now) and keep the numbers identical where the two videos show
  the same thing, so a viewer who watches both sees one story.
- **Art:** 1 or 2 watercolor spots of your own, `<folder>-<name>`, through the
  same pipeline (Batch API, sync fallback after an hour). Reusing one of the
  unit's images is fine; copy the WebP into your own `public/images/<folder>/`.
- **The review's rules from the start.** Read
  `agent-outputs/20261023-1030-nlp-llm-video-review.md` (the summary of the
  review that led to this video) and the unit's own review report named in
  your prompt. The deep dive exists because the unit asserted something
  without showing it; the whole point is that this video shows it.

Write your report to `$S/reports/<Id>.md` and return it, as the brief says.
