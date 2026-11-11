# BackendEngineer-3-ApiDesign: fixes

I changed only my own folder, `video/src/videos/be-api-design/`, and its
narration in `video/public/narration/be-api-design/`. I added no shared code,
left the takes untouched, did not edit the page, and committed nothing.

The review had 16 findings: 0 P1, 6 P2 (3 of them answer findings) and 10 P3
(1 of them an answer finding). All 16 are fixed.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 3 | P2 answer | Q5 never says what the racing retry gets back, or what happens to a key reused with a different body | fixed | New beat `idem-reply`, voiced alone: "The server catches that refusal and answers with the stored payment, and a key reused with a different body is rejected." Two notes now sit right of the race lines, in the order they are spoken. "caught: → payment 1, as stored" sits on the racing row, in green, and inks on "answers with the stored payment". "same key, new body: **rejected**" sits on the error's row, with "rejected" in red. The payment id is `IDEM.stored`, read from `results.json`. `idem-race`'s `pauseAfter` went from 0.8 to 0.6, and the new beat takes the 0.8. |
| 4 | P2 answer | Q6's cursor reads 20 rows at any depth only because of an index, which is never named | fixed | New beat `page-index`, voiced alone: "And that order needs an index to match, or every page scans the whole table." It is measured: `check.mjs` gained three steps, `tieScan`, `tieIndex` and `tieSeek`. At page 500, a cursor on `(created_at, id)` with no index gives `Seq Scan` + top-N sort and reads 90,020 + 9,981 removed = 100,001 rows, the whole table. After `CREATE INDEX … (created_at, id)`, the same query gives `Index Scan Backward using articles_created_id`, which reads 20. `data.ts` exports `TIE_INDEX` and adds this to the "said aloud" checks. On screen, the order line now ends "(created_at, id), **indexed**", with "indexed" inking and highlighted on "needs an index to match". It is appended at the end so nothing reflows. |
| 5 | P2 answer | Q13 names only path versioning | fixed | `r-version` was split in three. `r-version` and `r-version-add` were recut free from the take. The middle beat, `r-version-path`, was re-voiced alone: "A version in the path, slash v one, is the pragmatic default: more visible and cache-friendly than a header or a query parameter." That is the page's own reason, and it names the page's three strategies. On screen: `GET /v1/articles/42`, now the blog, not `/v1/orders`. Under it: "**the default**: more visible and cache-friendly than" / "a header, `Accept: application/vnd.api.v2+json`, or `?version=2`". The example is "An article, as v1 clients read it": `"views"` is removed (red) and `"status": "published"` becomes `2` (red). The added optional field is `"summary": null` (green). The JSON box moved down to make room. |
| 1 | P2 | Q8 opens on an almost empty page for about 11 s | fixed | The two servers and the shared store now draw at `instantAt + 4` to `+ 6`, and their arrows at `+ 10`. They come in while "When you need instant revocation" is spoken, not at "every server shares". `sharesAt` now pulses the store's border (`lit={pulse(…)}`). On the new timing the gap is the question being read, with the Question 8 card up. The diagram is on screen about 2 s into the answer (still at 401.5 s). |
| 2 | P2 | The "parse the message" counter-example is struck and gone within about 2 s | fixed | `codes-why`'s `pauseAfter` went from 0.6 to 1.6. The strike is gone, as the reviewer's second option suggests: the line stays red with the red cross, and every glyph stays readable. It is up about 3 s before Question 4. The scratch sound now plays with the cross. |
| 6 | P2 | The "429" labels nearly touch the heading above the backoff bars | fixed | The bars and their "429" ticks are at `wTop + h(80)`, was `h(56)`. The jitter and crowd notes and the crowd dots moved down by the same amount, and the hairline follows. The first "429" no longer hangs left of the column; it starts at the column edge. Heading to "429" is now about 30 px (still at 485 s). |
| 7 | P3 answer | Q7 never says OAuth on its own is not a login | fixed | New beat `auth-oidc`, voiced alone: "Logging users in on top of OAuth is OpenID Connect's job: it adds an ID token." Under "its tokens: JWTs or opaque strings", a grey note reads "logging in: **OpenID Connect**, an ID token". "an ID token" inks on its words. This goes past the page, so the script header cites OpenID Connect Core 1.0. |
| 8 | P3 | "the payload, decoded" drops `iat` | fixed | The claims box now lists the payload in its own order, `sub`, `role`, `iat`, `exp`, from `AUTH.claims`. `iat` has no highlight. The signature and "no longer verifies" lines moved down 34 design px, and the panel hairlines follow. |
| 9 | P3 | Ticks straddle the service boxes' top borders; the caption hugs the boxes | fixed | Each tick now sits inside its box, right of the title (`left: x + 196`, vertically centred). The caption moved to `svcRow + h(96)`, about 45 px below the boxes. |
| 10 | P3 | A faint "article 42" floats right of the 404 row | fixed | Deleted. "hides that it exists" already says it. |
| 11 | P3 | "log in again" is struck through a correct sentence | fixed | The strike and its scratch sound are gone. The note reads "logging in again won't necessarily help". |
| 12 | P3 | 301 and 500 have no reason phrase | fixed | They are now "301 Moved Permanently" and "500 Internal Server Error". To fit the first, the 3xx column moved from x 500 to 470. The rules between the classes moved to x 390 and 822, centred in the new gaps, about 60 px from the text on each side. |
| 13 | P3 | The hook's "both sides agree on how" bracket covers only the second link | fixed | The bracket now runs from the client to the last service, under the "asks / answers" labels. "both sides agree on how" is centred under the whole row. To make room, "Predictable, consistent, hard to misuse." moved from `y(510)` to `y(570)`, and the blog block from `y(590)` to `y(650)`. The plan squares stay where they were, about 47 px below the blog's sub-labels. |
| 14 | P3 | In the closing REST/gRPC diagram, only "orders" is connected | fixed | The three internal services are now a stacked column (orders, search, billing). The gRPC line runs from "your API" to a fork, and three arrows fan out to the three boxes, as the load balancer does in Q1. The "gRPC" label sits over the trunk. Each arrow is a straight line with its head built by `arrowHead()` in `Flow`. |
| 15 | P3 | Retry-After is explained twice | fixed | Deleted the note "Retry-After: how long to wait" under the card. The "seconds to wait" gloss and the yellow mark on its row remain. |
| 16 | P3 | Content negotiation shows a single representation | fixed | A second, smaller pair sits under the JSON pair: `Accept: text/csv` → `Content-Type: text/csv`. It is cued to "several representations". The gzip bars are unchanged. |

## Also changed (not in the report)

- **Q6, "no jump to ~~page 500~~"**: the same struck-correct-statement pattern
  as finding 11. Now "no jump straight to page 500", with no strike. The
  scratch sound became a tap.
- The script header (`script.ts`) describes the new beats and screens, and
  lists the two new points that go past the page: answering a racing retry
  with the stored result and rejecting a mismatched body (the page's "returns
  the original result on any retry", and the IETF Idempotency-Key draft), and
  OpenID Connect.

## Voice

- **405 characters re-voiced** (narrate's dry run estimated "about 403"), in 4
  beats, each voiced alone by a plain `npm run narrate -- be-api-design`:
  - **P2 answers, 325 characters:** `idem-reply` 120, `page-index` 76,
    `r-version-path` 129.
  - **P3, 80 characters:** `auth-oidc` 80.
- **Cut free from the kept take** (no API call): `r-version` and
  `r-version-add`, the two halves of the old `r-version` around the re-voiced
  middle.
- **Every other beat is unchanged.** Against HEAD, `alignment.json` differs
  only in those six beats, and the only modified mp3 is `r-version.mp3`.
  `takes/` is untouched.
- Timing only: `codes-why` 0.6 → 1.6, `idem-race` 0.8 → 0.6,
  `page-cost-two` 0.8 → 0.6, `auth-oauth` 0.7 → 0.6.

## Facts

`check.mjs` was re-run from the repo root. **Every existing value in
`results.json` came back identical**: the file minus the three new steps
deep-equals the committed one. The new steps are `page.tieScan`,
`page.tieIndex` and `page.tieSeek` (finding 4). No new number is shown on
screen. The measurement backs the spoken claim, and `data.ts` throws if it
changes.

## Length and checks

**New length: 677.2 s (11:17), was 650.3 s (10:50).** That is 56 beats, 1,596
words, 141 wpm (`npm run cues -- be-api-design`).

CHECKS_PLACEHOLDER

## Notes for the coordinator

- The page's versioning answer is followed. "Cache-friendly" is the page's
  own word, so nothing on the page needed correcting.
- The new gRPC column runs to about y 1030, the lowest drawing in the video.
  It stays above the bottom edge, but it is tight. If the owner prefers more
  air, the three boxes could shrink to `h(34)`.
