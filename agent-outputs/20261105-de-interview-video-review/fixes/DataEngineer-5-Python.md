# DataEngineer-5-Python: fixes

Folder `video/src/videos/de-python/`. Review report:
`agent-outputs/20261105-de-interview-video-review/DataEngineer-5-Python.md`
(0 P1, 6 P2, 15 P3). Nothing committed by me; the coordinator's checkpoint
caught the work part-way. Compare against `4bff3bc` for the whole change.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 answer | fixed | New beat `hash-avg` after `hash-jump`: "On average, that is: collisions can add a few probes, and the worst case is order n." On screen, right of the hash row (x 1110, clear of "bucket 999,999 of 2,097,152" and the arc's head): "**on average** (yellow mark): a collision adds a probe or two" and, soft, "worst case *O*(*n*); keys must be hashable" (the page's condition), each on its cue. `hash-jump` is unchanged, so "one comparison, at any size" now carries its caveat one breath later rather than a re-voiced clause. |
| 2 | P2 answer | fixed | `iter-def` split at its sentence break: "An iterable, like a list or a dict, hands out a fresh iterator each time you loop over it." is cut from take-2 for free; new `iter-next`: "That's its dunder iter method. An iterator has dunder next: it keeps its place, and at the end, it raises stop iteration." New `iter-self` after `iter-twice`: "Ask a generator for its iterator, and it returns itself; a list returns a new one." On screen: "a fresh iterator for every loop: `__iter__()`" and "`__next__()`: keeps its place, then is used up", each marked on its words; the iterator's second loop is now `next(rows)` **StopIteration** in the error box's red, from `ITER.stop` (measured, previously unused), cued to "raises stop iteration". The two `iter(rows) is rows` lines are marked on "it returns itself" and "a list returns a new one", so the narration now reads the test on screen. `data.ts` fails if `ITER.stop.kind` stops being StopIteration. |
| 3 | P2 | fixed | `csv-mean` split into `csv-mean` ("Sums add up across chunks.", cut free), new `csv-off` ("A mean doesn't. The last chunk has only fifty thousand rows, so the mean of the three means counts its rows double, and it's off.") and `csv-carry` (cut free). The line on screen reads "first 250,000 rows: chunks of 100,000, 100,000 and **50,000**", the last marked on "only fifty thousand rows". The sizes are a new `check.mjs` step, `meanSizes` (`[100000, 100000, 50000]`), and `data.ts` fails if they change. |
| 4 | P2 answer | fixed | New `check.mjs` steps: `normalized` (`nums = pd.to_numeric(amounts.str.replace(",", ""), errors="coerce")` → 12.5, NaN, 1200.0, 7.0), `leftCount` (1) and `rejected` (`['n/a']`). `parse-num` split: its first sentence is cut free; new `parse-fix`: "Strip the thousands comma first, and twelve hundred survives. Then count what's left and send it to a reject list, so it doesn't vanish into an average." The listing gains the `nums = …` line (inks in on "Strip the thousands comma"); the table gains a third column, "comma stripped", that opens on the same cue, with 1200.0 marked green on "twelve hundred survives" and the remaining NaN red on "count what's left". The count line is now code: "`nums.isna().sum()`: **1** left, and `'n/a'` goes to the rejects". The dates listing moved up `h(20)` so its console still ends above the page's lowest line. |
| 5 | P2 | fixed | New beat `pipe-peak`: "The generators peak at about a hundred fifty kilobytes." with `pauseAfter: 1.2` (`pipe-swap` loses its 0.7). The generator bar grows 10 frames after "one row passes through all three" (or 16 before the number is said, whichever is first). The generators' bar is now up from about 93.9 s to 102.5 s, 8.6 s instead of 3.5, and the 150 KB is spoken. |
| 6 | P2 answer | fixed | New `retry-key` after `retry-not`: "Give each request an idempotency key, and the server charges it once, however often it arrives." (it takes `retry-not`'s `pauseAfter: 0.8`). New `retry-herd-name` after `retry-herd`: "That's a thundering herd." On screen the red line under the model reads "plain backoff, all six at once: **a thundering herd**" (marked on the words). The "what not to retry" group (retitled from "a permanent error") now holds, under the error box, "retry only what's safe to repeat: *a retried payment can charge twice*" (red part on its words) and, green, "**send an idempotency key**, and the server charges once". The demo error is now `ValueError("400 Bad Request: amount must be positive")` (`check.mjs`), so the box no longer mixes HTTP with SQL; the box is 720 px wide so the longer message stays on one line. |
| 7 | P3 | not fixed (shared kit) | Left for the coordinator, as instructed. The shared change is below, under "Shared change". |
| 8 | P3 | fixed | Each pitfall is set in `ACCENT_INK` from the moment it appears, struck at `it.at + 36` (1.2 s later) and its fix fades in at `it.at + 40`. |
| 9 | P3 | fixed | New beat `file-lazy` ("The console shows it: the pipeline is built before the file even opens.", `pauseAfter: 1.4`; `file-loop` loses its 0.8). The console marks "pipeline built" yellow on "the pipeline is built" and "opening events.csv" green on "the file even opens". The lone number is now "peak 149 KB", under the for-loop listing (beside it, the longer label ran into the console). Under that, soft: "no line breaks? `f.read(size)`, a fixed block at a time", the page's "fixed-size chunks". Beside the read() bar: "the bytes and the text", backed by a new measured step, `readBytes` (the bytes alone peak at 8.4 MB, half of read()'s 16.6; `data.ts` fails if the ratio leaves 2 ± 0.1). The narration's "Don't call read or read lines" is unchanged: re-voicing it did not fit the P3 budget, and the screen now carries the "with no size" half. |
| 10 | P3 | fixed | `dedup-dict` `pauseAfter: 1.6`. `check.mjs` adds plain `rows` (the same three records) to the dedup setup and the dict loop is now `for r in rows:`; a new step `rowsTable` draws them as a records table with no index (`data.ts` checks they equal the page's frame row for row). The `rows` table and the dict listing hold until question 8's text writes in, then the page's `df` (with its index) comes in for pandas. |
| 11 | P3 | fixed | The probe console takes `dim={outBuild}`. The cost notes stay for the whole scene, moved under the joined rows' console (x 1120), with a third, soft line: "*n* orders, *m* users; only the smaller side is held in memory". |
| 12 | P3 | fixed | `clean-page` split: "Strip whitespace, check the field count, and convert types." (re-voiced) and `clean-bob` ("Bob's missing age becomes none; bad row is dropped.", cut free). The crash-proof claim moved to the code that makes it: under the rejects console, green, "caught per row, so one bad row can't crash the job", cued to "Send them to a reject list" (the `except ValueError` mark). |
| 13 | P3 | fixed | Bars titled "equality comparisons, deduplicating distinct keys"; the set row's note reads "one hash lookup each; every key is new, so nothing to compare". `hash-time` `pauseAfter: 1.3`. Caption: "a million numbers, timed in CPython 3.13 for the course video “List or set?”" (the quotes make the question mark part of the title). |
| 14 | P3 | fixed | The struck "add to them" is in `ACCENT_INK`. The upsert row's note defines it: "an upsert: update the row if its key exists, insert it if not". A soft line beside "set values": "in a warehouse: overwrite the day's partition, or `MERGE` on the key". Both on screen only (the narration's 400-character P3 budget went to #12, #18, #19, #20 and #9). |
| 15 | P3 | fixed | Like for like: a new measured step, `streamGroup`, sums the same file by name into a `Counter` a line at a time (peak 149 KB; `data.ts` checks its totals equal `read_csv` and `groupby`'s). The bars are now "read_csv, groupby" 54.2 MB in `BAR` blue (data) and "a dict, line by line" 149 KB in green, under "the same totals by name, 1,000,000 rows: peak memory in Pyodide". |
| 16 | P3 | fixed | In all three scenes the old card still leaves on "Question two / four / fourteen", but the old figures now leave at the new card's text cue (`q2TextAt - 4`, `q4TextAt - 4`, `q14TextAt - 4`). Stills at 76.2 s and 159.8 s show the previous figure under the new kicker. |
| 17 | P3 | fixed | Q5: the passes are drawn as 124 px blocks, one loop per row (iterable: loop 1 and loop 2 on fresh rows; iterator: loop 1 greys as it goes, loop 2 is the StopIteration box), filling about y 440 to 760 until the read-twice listings take the page. Q10: the `batched()` listing comes in on "An insert per row", with the call-count bars beside it on the right. Q12: `OUT_X` is 1000. |
| 18 | P3 | fixed | New beat `batch-iter`: "Why call iter first? I-slice on a list starts at the front every time, and the loop never ends." The `it = iter(iterable)` line is marked green again on it. Under the listing: "without `iter()`, on a list: `[0, 1, 2], [0, 1, 2], [0, 1, 2], …`" and, red, "the same first three, forever", from a new step, `noIter` (the first four batches of a version without `iter()`, all `[0, 1, 2]`). |
| 19 | P3 | fixed | `latest-tie` re-voiced: "If two rows can share a timestamp, add a tiebreaker to the sort, or the row you keep is arbitrary." The note reads "add a tiebreaker column to the sort, or the row kept is arbitrary". I dropped the `[slowly]` tag to keep within budget; it reads at 2.7 words/s. |
| 20 | P3 | fixed | New beat `csv-counter`: "A counter's update adds; a plain dict's would keep only the last chunk." (`pauseAfter: 0.9`; `csv-chunks` loses its 0.6). On screen under "an iterator of data frames": "**`Counter.update` adds**" (green mark), then in red "; a dict's would keep only the last chunk". |
| 21 | P3 | fixed | The second headline inks in at `checksAt + 4`; still at 22.5 s shows "Bigger than memory, safe to run twice." in place. |

No finding was judged wrong. Two places where the page is looser than the video now is, without being wrong: its iterator answer says "consumed once" and the video adds the measured `StopIteration`; its dedup block for question 8 sorts on one column, and the default sort is not stable, which is what #19 now says.

## Voice

**1,137 characters re-voiced** (the `narrate --dry-run` count), each beat on
its own with `--only`, no new take, no `--force`:

- **P2s (all answer or pacing findings), 743:** `pipe-peak` 55, `csv-off` 129,
  `iter-next` 121, `iter-self` 82, `hash-avg` 84, `retry-herd-name` 25,
  `retry-key` 95, `parse-fix` 152.
- **P3s, 394 (of 400):** `file-lazy` 71, `csv-counter` 71, `latest-tie` 98,
  `batch-iter` 95, `clean-page` 59.

Five beats were split at a sentence break and cut from the kept takes for
free with `--recut`: `csv-mean` and `csv-carry` (take-2), `iter-def` (take-2;
it was a `[slowly]` beat voiced alone, and is now the take's normal pace),
`clean-bob` and `parse-num` (take-5). Against `4bff3bc`, exactly those 18
alignment entries changed (the 13 voiced, the 5 cut); every other beat's MP3
and alignment entry is byte-identical, and `takes/de-python/` is untouched.

Left unvoiced for budget, carried on screen instead: #9's "Don't call read
with no size", #11's "the side held in memory" and "n orders, m users", #14's
upsert definition and the warehouse form.

## Length and checks

- `npm run cues -- de-python`: 86 beats, 1,650 words, **695.0 s (11:35)**, up
  from 630.8 s (10:31). Most of the 64 s is the eleven beats with new words; the rest is
  the longer holds (#5, #9, #10, #13, #20).
- Typecheck and eslint for `src/videos/de-python/`: clean.
- `npm run check:cues`: pass. `npm test`: 75 of 75 pass.
- `check:motion`: pass, 11:35.0 checked, 0 stretches still for 2 s or more.
- `check:sync`: pass, 86 beats, worst +0.03 s (`batch-iter`).
- `check:mix`: pass. Effects 29.0 LU under the narration; where both sound,
  speech a median 28.5 dB above (5th percentile 12.2 dB).
- `check:frames`: pass. 2 illustrations (largest stretch 0.85), 2 arrows (up
  to 7.1° under the head), no hyphen in tabular figures, every cue names its
  occurrence.
- Stills, each looked at: 22.5, 24, 76.2, 100, 135, 150 (twice), 157, 159.8,
  180, 200 (twice), 205, 220, 221, 229, 231, 236, 240, 247, 297, 304, 320,
  346, 349.8, 372, 400, 411, 426, 447, 448.5, 453, 489, 515, 545, 557, 572,
  593, 599.5, 618, 628, 652, 676 and 683 s; plus frames from the
  `check:motion` preview at 76.0, 160.0, 233.5, 241.5, 349.6 and 596.2 s for
  the question changes. The first round caught two things, both fixed before
  the checks ran: "peak 149 KB" ran into the lazy-pipeline console (moved under
  its listing), and the Q4 bars' title sat 25 px under the new Counter line
  (bars moved down `h(14)`).

## Facts

`check.mjs` was run twice (from the repo root, as its header says). New steps,
all appended so no existing step's namespace changed: `file.meanSizes`,
`file.readBytes`, `file.streamGroup`, `dedup.rowsTable`, `batch.noIter`,
`clean.normalized`, `clean.leftCount`, `clean.rejected`.

Changed on purpose, each the subject of a finding: `dedup.setup` (adds the
plain `rows`) and `dedup.latestDict` (loops over them, #10; output unchanged,
`{1: 'b', 2: 'c'}`), `retry.setup` and `retry.permanent` (the message, #6).

Every other value came back identical **except two raw byte peaks**:
`file.whole` 54,153,654 → 54,153,569 and `file.chunks` 7,535,570 → 7,535,806.
That is run-to-run noise in pandas under tracemalloc, not my change: the
second run of the same `check.mjs` gave 54,153,629 and 7,535,621. Both still
print as 54.2 MB and 7.5 MB, so nothing on screen or in the narration moved.
Every other peak (the list, generator, pipeline and file reads) is identical
to the byte.

New guards in `data.ts`: the chunk sizes are 100,000, 100,000 and 50,000;
read() holds 2 ± 0.1 times the bytes alone; the streamed group-sum's totals
equal pandas'; the plain records equal the page's frame; the no-`iter()`
batches are four `[0, 1, 2]`; "1,200" parses as 1200.0 once its comma is
stripped and one value is left; `next()` on a spent generator raises
StopIteration.

## Shared change (finding 7, for the coordinator)

In `video/src/videos/da-pandas/parts.tsx`, `textOf` (lines 181-188) reads
only `props.children`, and `<Code line=…>` has none, so `Strike` measures ""
and gives a ~380 px phrase the full 2° tilt (a 13 px climb). Make it read the
`line` prop first:

```ts
const textOf = (node: React.ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join("")
      : React.isValidElement<{ children?: React.ReactNode; line?: unknown }>(node)
        ? typeof node.props.line === "string"
          ? node.props.line
          : textOf(node.props.children)
        : "";
```

"lines = f.readlines()" then measures 21 characters, and the tilt drops to
about 0.65° (a 4 px rise over the phrase). Users of the pattern:
`de-python/HookScene.tsx:227` and `ds-python-pandas/HookScene.tsx:147`; any
other `<Strike><Code line=…/></Strike>` gets the same fix. Nothing in
`de-python` needs to change after it.

## Noticed along the way

- The pitfalls round (#8) still draws its strike at the shared `0.55em`
  through the x-height of mono text. The fix delays and recolors it as
  suggested; the line itself still crosses the glyphs, which is what a strike
  is. If the coordinator wants it lower for mono, that is the shared
  `Strike`'s `top`, not something to override per video.
- `idem-upsert` still says "The page's upsert sets each ID's status"; with
  the definition now on screen it reads correctly and was not worth 100 of the
  P3 characters.
