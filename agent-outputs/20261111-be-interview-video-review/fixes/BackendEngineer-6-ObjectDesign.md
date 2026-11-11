# BackendEngineer-6-ObjectDesign: fixes

Folder `video/src/videos/be-object-design/`. Review report:
`agent-outputs/20261111-be-interview-video-review/BackendEngineer-6-ObjectDesign.md`
(0 P1, 5 P2, 7 P3). Nothing committed.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | `r-encap` split after "…can overdraw it." (cut from the take). The rest is re-voiced in the problem-then-rule order the report asks for, as `r-encap-ctor`: "But an account that opens at minus fifty is overdrawn already, so guard every way in, the constructor too." The figure follows it (`RapidScene.tsx`, `Encap`): the constructor's door appears dashed red with "opening: no check" on "But an account that opens", −50 flows in and the balance turns red −50, "overdrawn already" under it. On "so guard every way in" the door turns green, the −50 arrow pulls back 30px and stops outside the door, "refused" (red) appears under it as on the withdraw side, the balance returns to 100 (blue), and "overdrawn already" fades. "opening: checked too" on "the constructor too". The refusal is a run: `check.mjs` now also runs the page's **current** `BankAccount` verbatim (`encapsulationGuarded`): it prints 70, and `BankAccount(-50)` raises "ValueError: starting balance can't be negative" (`ACCOUNT.guardedOpening`; the scene throws if it ever stops raising). Stills 514.5 (−50, overdrawn already) and 519.4 (refused, 100, green door). |
| 2 | P2 | fixed | `comp-hold` pauseAfter 0.6 → 1.2; Part A's exit `aOut` is now `n.word("comp-mix", "Notifications go by")` instead of `mixAt - 6`. Red 0 beside green "after 3" now holds about 3.6 s at rest, through "It also combines freely". Part A is gone before Part B's first label inks (still 139.5). Still 136.5. |
| 3 | P2 (answer) | fixed | New beat `lsp-which`, voiced alone: "The square promises less: setting its width no longer leaves the height alone." On screen the "demand more" highlight is dropped; "promise them less" keeps it; a third red line "The square promises less: its width moves its height." inks on the beat, and a red pointer (`Flow`, from past the line's end along and up) ends under the square's "expected 20". Stills 206.9. |
| 4 | P2 (answer) | fixed | `r-abstract` split into `r-abstract` (definition) and `r-abstract-use` ("Use an interface…"), both cut from the take; between them a new beat `r-abstract-many`: "And a class can implement many interfaces, but extend only one. Java and C sharp interfaces can now carry default methods, but never instance fields." On screen a new row under the two columns, "a class implements many" / "a class extends only one", above the green "a pure contract" / "subclasses share code", and a footnote line "Java and C# interfaces may carry default methods, but never instance fields." (21px, `INK_SOFT`). The page says "no implementation"; it is not wrong for Python, which is what it runs, so the page is unchanged and the video adds the Java/C# caveat. Still 586.5. |
| 5 | P2 (answer) | fixed | New beat `obs-fail` after `obs-cost`, voiced alone: "And in the simple version, the listeners run inside the order's own call. If analytics breaks, the order fails with it, and loyalty never hears. So backends often put a broker between them: publish-subscribe." It is a run: `check.mjs` step `observer.fails` subscribes the same four to one order with analytics raising, and `place(1043)` raises "analytics is down" while only email and stock heard (`OBSERVER.failed`, `OBSERVER.heardBeforeFailing`; the scene and `check.mjs` both fail if that changes). On screen: the figure undims from the cost beat, the red "find who subscribed" outline fades, "knows only: notify each one" becomes "calls each one, in turn"; Analytics turns red and its result becomes "raised: analytics is down"; a red dot runs back along its line to the order, which turns red, "1043 failed"; loyalty's "points for 1043" is struck, "never heard" beside it; the cost path dims and "A broker between the order and its listeners: publish-subscribe" (the last word green) appears under it. Stills 430.5, 431.5. |
| 6 | P3 (answer) | fixed | New beat `dip-di` after `dip-arrows`, voiced alone: "Injection is just how the email sender gets passed in; the inversion is that the confirmation owns the interface." On screen under the before/after row: "Injection: how the sender gets in. Inversion: the confirmation owns the interface." with the last phrase highlighted. The before/after row moved up 20 design px (`y(744)` → `y(724)`) to make room. Still 334.6. |
| 7 | P3 | fixed | (a) The third rule's label reads "weight 3: flat 5, weight 12: 0"; `StratScene` throws if the light parcel's cost stops equalling the flat rate. (b) "radius 1" and "side 2" under 3.14 and 4; the 4 is now `side ** 2` and the total check uses both (the page's `Circle(1)`, `Square(2)`). (c) "the next order" (21px, blue) inks above the order box when it switches to 1043. Stills 367.5, 528.5, 403.5. |
| 8 | P3 | fixed | `dip-ex` split after "…handed the email sender." into `dip-ex` and `dip-test` (pauseAfter 0.6 between, 0.8 before the plug). The two other fast beats the report names were split the same way at their sentence breaks, with a 0.5 s pause between: `comp-break` / `comp-zero` and `lsp-break` / `lsp-hand`. All six are cut from the original takes, so the words and voice are as before. |
| 9 | P3 | fixed | Rectangle takes the same `tones={[[siblingsAt + 10, "ok"]]}` as Square. The whole right-hand run (caller lines, both shapes, their labels, ticks, rule and the new pointer line) dims to 0.38 at `fixAt + 10`; the LSP rule itself stays. Still 219.5. |
| 10 | P3 | fixed | The D row now draws question 5 in small from `dAt + 8`: Confirmation → "sends a message" (green dashed) ← Email sender, and "Question 5" in blue on "That's the next question", where the abstraction box pulses. Still 268.8. |
| 11 | P3 | partly | (a) Period added after "can break it". (b) The colon now inks in black with the second phrase; only "the second shipping rule" is green. (d) The before/after boxes say "Email sender", as the top figure does, and the parked Email sender box fades out at "The inversion is in the arrows" (still 334.6). (c) **Left, the finding misreads the frame:** element-556 caught the highlight mid-sweep. In element-557 and 558 the band is complete and "Ask which it is" sits a normal space from "before". The extra gap shows only during the 12-frame sweep, the same for every `Mark` in the series. Removing the space would make the finished band touch "before", which `check:frames` fails. |
| 12 | P3 | fixed | Observer figure about 1.15x larger: order box 330x124 (27px title), listeners 340x72 at 26px on a 90 px pitch, results 27px at x 1180, and the whole figure plus the cost path sits lower (path row at `y(772)`). Over-engineering: layer boxes 84 tall at 27px, the thing boxes 72 tall at 24px and lower (`THING.top` 548 → 580), the notes at `y(704)`. I did not add a spot illustration: the folder has no bell or megaphone, and the new Observer failure beat fills the space under the figure. Stills 430.5, 478. |

## Voice

**Over budget: 1,549 characters billed, 654 of them kept.** The 654 are the
five new beats, each voiced on its own:

- P2 (answers and #1), 541: `lsp-which` 78, `obs-fail` 208,
  `r-encap-ctor` 106, `r-abstract-many` 149.
- P3, 113: `dip-di`.

**My mistake cost the other 895.** I put the nine split beats (`comp-break`, `comp-zero`,
`lsp-break`, `lsp-hand`, `dip-ex`, `dip-test`, `r-encap`, `r-abstract`,
`r-abstract-use`) in the same `--only` list as the new ones. `--only`
forces a beat to be voiced, so all nine were voiced on their own, though
`--dry-run` had listed them as "cut from take, free". I then restored all
nine from the original takes with `--recut --only …`, which makes no API call. The
video uses the take cuts, not those re-voicings, but the credits were
spent: about 340 against the 220 allowed. At 0.22 a character, 895 is about
197 wasted credits. For other fixers: voice new beats with `--only` and run a
plain `--recut` for the splits. Never name a split beat in `--only` without
`--recut`.

Against HEAD, `alignment.json`'s `meta` and every beat not listed above are
identical, and `takes/be-object-design/` is untouched (`git diff --stat`
empty). The five beats that changed text (`comp-break`, `lsp-break`, `dip-ex`,
`r-encap`, `r-abstract`) are now take cuts of their first sentences.

## Facts

`check.mjs` (run from the repo root as its header says) gains two things:
`encapsulationGuarded`, the page's current `BankAccount` verbatim, and
`observer.fails`. Both are asserted. Every value that was in `results.json`
before came back identical (a key-by-key compare against the pre-run copy:
only the two new entries differ). The header now says that `encapsulation`
is the page's class as it stood before #725. #725 added the constructor and
positive-amount checks to the page, so "verbatim" was no longer true.

## Length and checks

- `npm run cues -- be-object-design`: 60 beats, 1,449 words, **616.6 s
  (10:17)**, up from 9:32.
- Typecheck (filtered to the folder) and `eslint src/videos/be-object-design`:
  clean.
- `npm run check:cues`: pass. `npm test`: 79 of 79 pass.
- CHECKS_PLACEHOLDER
- Stills looked at: 136.5, 139.5, 206.8, 206.9, 219.5, 268.8, 334.5, 334.6,
  367.5, 401.5, 403.5, 428, 430.5, 431.5, 478, 510.5, 514.5, 519.4, 528.5,
  586.5. Two fixes came from them: the LSP pointer started over the end of its
  line (moved to x 1312), and "never heard" was 22px beside 27px text (now 27).
  The space above the DIP footnote was widened to 30px.

## Noticed

- Every highlight followed by punctuation shows the Mark's 0.14em margin
  before it ("caller .", "is real ."). The README's spacing rule sets that
  margin on purpose for a following word, and `check:frames` accepts it, but
  punctuation reads loose. A change to this folder's `Mark` in `parts.tsx` (no right margin
  when the next character is punctuation) would fix it in this video. I left it because it is outside the findings and touches every highlight.
