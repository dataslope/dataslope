# Nlp-2-CleaningText: fix pass

Review: `$S/review/reports/Nlp-2-CleaningText.md` (1 P1, 3 P2, 13 P3). Every finding fixed, one partly. Nothing committed by me (your snapshot 1c08728 holds the work up to the container restart).

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
| 9 | P3 | FIX9 |
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

LENGTH_AND_CHECKS

## Also changed

- Script header: the lesson's "? also ends a sentence" is not said (it costs nothing on this line), the mice/feet claim is noted as holding only for nouns (the lesson's own pos="v" table prints them unchanged), and the order measurement and the faded "never" are documented.
- measure.py: the order tip on Fig. 8's line (`order`: 2 sentences as written, 1 once `string.punctuation` is deleted); it still asserts all 13 lesson blocks against the page's output.
