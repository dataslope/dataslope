# MachineLearningEngineer-10-LlmEvals: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-10-LlmEvals.md`
(0 P1, 6 P2, 5 P3). All in `video/src/videos/mle-llm-evals/`.

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P2 | "Fix the eval set" as the only reading of an online loss | fixed | `q1-agree` split; new `q1-agree-fix` adds "and the guardrails held"; grey "Guardrails held" under "Wins offline, loses online" (`LayersScene.tsx`) |
| 2 | P2 | Calibrate the judge, but against what bar | fixed | New beat `q2-bar`; line "The bar: judge–expert agreement ≈ expert–expert agreement"; judge box moved down a row (`JudgeScene.tsx`) |
| 3 | P2 | Idempotent tools without how | fixed | `q4-idem` split; new `q4-idem-key` names the idempotency key; both chips read `file_ticket(key="7f3")` (`AgentScene.tsx`) |
| 4 | P2 | Loop dot rides over the code and labels | fixed | Dot hidden while inside any box (with 14px margin), so it rides only the arrows (`AgentScene.tsx`) |
| 5 | P2 | Q2 fixes ink over the fading chart | fixed | Chart clears at `q2-fix.from − 20` frames, done before the first fix inks; `q2-read` pause 0.8 → 1.3 s keeps the finished case ~3.5 s |
| 6 | P2 | "A path you'd never allow" held ~1.6 s | fixed | `q5-traj` pause 0.7 → 1.6 s (now ~2.6 s) |
| 7 | P3 | "A claim you can't check" held 1.7 s | fixed | `q3-faith` pause 0.7 → 1.3 s (now ~2.4 s) |
| 8 | P3 | Orphaned judge chip beside "Public benchmarks" | fixed | Chip leaves with rung 3 (`out` at `q1-ci`), pops back lit on "lean on an LLM judge" in `q2-in` |
| 9 | P3 | Idempotency chips arrive out of order | fixed | First call cued on "an idempotency key", retry on "filing the same ticket twice" |
| 10 | P3 | "More bad ones" drawn as fewer | fixed | Two more wrong answers (three red under two green); line and discs below moved down (`HookScene.tsx`) |
| 11 | P3 | Numbered discs green | fixed | Rung and question discs in the Disc's grey; current rung still lit yellow |

## Re-voiced (313 characters, Drew, `eleven_v4_turbo`)

Split first, so the kept halves were cut from the takes for free
(`--recut`: `q1-agree` from take-1, `q4-idem` from take-4), then only the
new sentences were voiced with `--only`:

- `q1-agree-fix` (136): old "When a change wins offline and loses online, fix the eval set: it's measuring something users don't care about." → new "When a change wins offline and loses online, and the guardrails held, fix the eval set: it's measuring something users don't care about."
- `q2-bar` (86, new): "The bar: it should agree with the experts about as well as they agree with each other." (Zheng et al., the paper the scene cites, report GPT-4's agreement with humans at the level of humans' agreement with each other; the page does not state the bar, so this is a fact added, not a page answer changed.)
- `q4-idem-key` (91): old "Filing the same ticket twice should still leave one ticket." → new "Give each call an idempotency key, so filing the same ticket twice still leaves one ticket."

No P3 used voice. Pacing fixes were `pauseAfter` only.

## Images

None generated.

## Length

554.6 s (9:15) → 569.4 s (9:29), +14.8 s: 2.0 s of longer pauses
(`q2-read`, `q3-faith`, `q5-traj`); the rest is the new `q2-bar` beat,
the longer `q1-agree-fix` and `q4-idem-key` sentences, and the pauses
the two splits add.

## Checks (final code, through the queues)

- `tsc --noEmit` (folder): clean. `eslint src/videos/mle-llm-evals`: clean.
- `check:cues`: pass (every word cue names a phrase its beat says).
- `npm test`: 79/79 pass.
- `CHECK_SCALE=1 check:frames`: pass (3 images, 23 arrows, spacing, one size per line).
- `check:motion`: pass (9:29.5 checked, 0 stretches still for 2 s or more).
- `check:sync`: pass (53 beats, worst +0.07 s at `q1-ours`; the new beats `q1-agree-fix`, `q2-bar`, `q4-idem-key` within ±0.02 s).
- `check:mix`: pass (speech a median 27.1 dB above the effects, closest 11.9 dB at 0:24.6). WAVs and the motion preview deleted.
- `check.mjs`: "48 quotes on the page, 22 spoken numbers match"; `results.json` byte-identical (no new number, no value changed).

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/MachineLearningEngineer-10-LlmEvals/`:

- `01-an-online-loss-is-blamed-on-the-eval-set-only-if.png`
- `02-the-judge-s-bar-agree-with-experts-as-well-as-th.png`
- `03-idempotent-tools-the-idempotency-key.png`
- `04-the-loop-s-dot-no-longer-rides-over-the-code.png`
- `05-question-2-s-first-fix-no-longer-inks-over-the-f.png`
- `06-a-path-you-d-never-allow-holds-before-the-clear.png`
- `07-a-claim-you-can-t-check-holds-a-little-longer.png`
- `08-no-orphaned-judge-chip-beside-public-benchmarks.png`
- `09-the-idempotency-chips-arrive-in-reading-order.png`
- `10-and-more-bad-ones-more-bad-answers-than-good.png`
- `11-numbered-discs-in-grey-not-the-answer-s-green.png`

## Notes

- Shared kit: nothing needed. (Observed, not changed: every series' Video.tsx fades the first scene in from frame 0, so frame 0 is blank despite this video's "inked before frame 0" comment; harmless in a merged upload.)
- Files touched: `script.ts`, `LayersScene.tsx`, `JudgeScene.tsx`, `AgentScene.tsx`, `HookScene.tsx`; `public/narration/mle-llm-evals/` (`alignment.json`, re-cut `q1-agree.mp3` and `q4-idem.mp3`, new `q1-agree-fix.mp3`, `q2-bar.mp3`, `q4-idem-key.mp3`). Takes unchanged.
