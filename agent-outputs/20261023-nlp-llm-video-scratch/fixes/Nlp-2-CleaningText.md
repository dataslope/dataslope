# Nlp-2-CleaningText: fix pass

Review: `$S/review/reports/Nlp-2-CleaningText.md` (1 P1, 3 P2, 13 P3). All 17 findings fixed. I committed nothing; your snapshots (1c08728, 2d4dbd9) hold the work through the two interruptions, and the final edits since are in the working tree.

## Findings

| # | P | Result | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | Fig. 8's recipes now show what each runs on, as the lesson's code does: `w.isalpha()` *on text.split()*, `w.translate(table)` *on text.lower().split()*, `re.findall(r"[a-z]+", …)` *on text.lower()*, each "on" line inked as it is said. Re-voiced: `translate` "The second lowercases the line, then deletes the punctuation characters." and `regex` "The third lowercases too, then pulls out runs of letters…". |
| 2 | P2 | fixed | Fig. 5: the default tokenizer's split chips (red) and TweetTokenizer's whole ones (blue) both return to plain on "Neither one is wrong"; on "the right tokens" the one unit, the hashtag, is lit in both rows (cut in two in one, whole in the other) in the neutral yellow. |
| 3 | P2 | fixed | Fig. 3: " Wasn't that great?" stays plain and its "?" tag is gone. "He smiled" turns red with the tag "period gone". Re-voiced `naive-cut`: "…breaks inside two point five, and throws the periods away." |
| 4 | P2 | fixed | The order rule is now shown: on "tokenizer" / "clues", two lines ink beside the note, `sent_tokenize(text)` **2 sentences** (blue) and `sent_tokenize(stripped)` **1 sentence** (red), measured in measure.py on Fig. 8's own line. The note reads "Strip punctuation after you tokenize, never before."; re-voiced `order` "And strip punctuation after you tokenize…" (the "it" had no clear antecedent); its `pauseAfter` is 1.2 s. |
| 5 | P3 | fixed | "wa" gets a red tag "plural noun" on "wa"; the Lemmatize card adds "given the part of speech" under "real word". (The deep dive explains the lookup.) |
| 6 | P3 | fixed | Row 1 of Fig. 8 inks "2 of 8 kept" on "lose". |
| 7 | P3 | fixed | `fox` `pauseAfter` 0.5 → 1.5 s: the twelve chips sit whole before any drop. |
| 8 | P3 | fixed | Fig. 13 draws the keep-word "never" faded and struck (it is not on NLTK's list, as Fig. 11 just showed), driven by measure.py's `keepRemoved`. |
| 9 | P3 | fixed | New spot `nlp-cleaning-text-book` (an open dictionary with a ribbon bookmark, no shears) for LemmaScene; StemScene and Fig. 17's last card keep the book-and-shears. The batch sat at 0 of 1 for an hour, so it was cancelled and the image generated with `sync`, then imported (1536x840, drawn at 560x306, stretch under 1 at 2x). |
| 10 | P3 | fixed | Fig. 17's Normalize card: "the capitals and punctuation" (the four results now set at 30 px so it fits one line). Re-voiced `close-list`: "The spaces. The capitals and the punctuation. The common words. The endings." |
| 11 | P3 | fixed | Headline swaps in SplitScene (token) and StemScene (key) now start 8 frames after the old line's exit instead of 1 to 2 s later. |
| 12 | P3 | fixed | The faint Fig. 1 sentence inks from the hook's first word (`hookFrom + 8`). |
| 13 | P3 | fixed | `split(".")`'s leading spaces are drawn as a faint open box (␣), overlaid on the space so the text does not move. |
| 14 | P3 | fixed | Fig. 15's `pos=` labels share one column past the widest lemma, and each arrives with its own value (`rightAt + 2`). |
| 15 | P3 | fixed | The `lower()` arrow and label dim to 25% while the folding chips fly over them, and come back when they land. |
| 16 | P3 | fixed | Fig. 10's call is the lesson's comprehension `[t for t in tokens if t not in stop]`; Fig. 13's `(base - keep) \| add` is gone (its formula row already says it in words). |
| 17 | P3 | fixed | "a number, a symbol" cut from the narration (the sentence has neither): `token-kinds` "Usually a word, but sometimes a punctuation mark." |

## Voice

- **478 characters re-voiced**, six beats, each on its own: `token-kinds` (49), `naive-cut` (83), `translate` (72), `regex` (99), `order` (98), `close-list` (76). No take recorded again, no `--force`.
- Four beats were split at a sentence break first and cut from the kept takes with `--recut` (free): `token` / `token-kinds`, `naive` / `naive-cut`, `translate` / `shut`, `close` / `close-list`. Only the second halves (and `translate`'s first) changed words.

## Length and checks

- **Length:** 7:40.5 (460.5 s by `npm run cues`, 67 beats), up from 7:31.5: the new pauses (`fox` 1.5 s, `order` 1.2 s) and the split beats' joins.

| Check | Result |
| --- | --- |
| tsc (folder) | clean |
| eslint (folder) | clean |
| check:cues | clean for this folder |
| npm test | 59/59 pass |
| check:frames | pass: 5 illustrations, largest stretch 0.83 at 2x; 14 arrows, 0.0° of bend |
| check:sync | pass, worst +0.09 s (`removed`, 4:31.7) |
| check:motion | pass, longest still 2.5 s (12 stretches of 2 s or more, 26.3 s in all) |
| check:mix (informational) | effects 21.3 LU under the narration (-46.3 LUFS); peak -21.1 dBFS (the logo); speech a median 23.9 dB above the effects (5th percentile 9.3 dB); closest 10.0 dB at 7:18.1 |

Stills re-taken and checked at every changed place: the hook (faint sentence from the first word), Fig. 2 with the trimmed token kinds, Fig. 3 (plain last piece, "period gone", the ␣ marks on the baseline), Fig. 5 on "Neither", the fold with the dimmed arrow, Fig. 8 with its "on" lines, "2 of 8 kept" and the order inset, Fig. 10's call, Fig. 13's struck "never", Fig. 15 with the book, the "plural noun" tag and the aligned `pos=` column, and Fig. 17's card.

## Also changed

- Script header: the lesson's "? also ends a sentence" is not said (it costs nothing on this line), the mice/feet claim is noted as holding only for nouns (the lesson's own pos="v" table prints them unchanged), and the order measurement and the faded "never" are documented.
- measure.py: the order tip on Fig. 8's line (`order`: 2 sentences as written, 1 once `string.punctuation` is deleted); it still asserts all 13 lesson blocks against the page's output.
