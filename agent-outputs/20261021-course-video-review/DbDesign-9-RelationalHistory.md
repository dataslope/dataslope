# DbDesign-9-RelationalHistory (0-218 s, whole video)

## Verdict
- The history is solid. Every date and name on screen or in the narration checks out against the two lessons and the sources in `script.ts`. IMS "first shipped 1967" also matches IBM's own history page. The two known lesson caveats are fixed: `the-relational-revolution.mdx` now says "eleven-page" and "Eleven pages" (pp. 377-387), and `from-ingres-to-postgresql.mdx` now dates 6.0 to January 1997. The video agrees with both: it shows pp. 377-387, says "renamed in 1996", and makes no 6.0 claim. The soft "aircraft company" caveat is now sourced in `script.ts` (Chamberlin, 1995 SQL Reunion), and the video says no more than the lesson does.
- The biggest problem is one chart. Fig. 4 is titled "Who sold SQL first", but it gains a Berkeley lane from 1973, which reads as Berkeley beating Oracle to SQL. Ingres used QUEL and was never sold.
- Four times the frame is empty or nearly empty while the narrator delivers a key line: "Keep the data in tables" plays over a blank page, Chamberlin and Boyce get a bare caption, the PGlite build chain floats alone in a corner, and the Postgres scene leaves two-thirds of the frame empty for 15 s.
- Several labels mislead. The pronunciation "post · gres · cue · ell" sits under the Postgres95 card instead of PostgreSQL. Fig. 3's bars carry an invented 42% speed, an "IBM's big earner" label, and colours that reverse the rest of the video.
- Pacing is comfortable for most of the video (2.1-2.8 words/s, with 1.6 s scene gaps). It gets rushed at two points. The Ingres scene ends with about 20 words on screen that nobody reads aloud, in about 4 s. The ending's two densest beats ("upbringing" at 3.09 and "close" at 3.31 words/s) run over the only unnarrated three-line error message in the video.

## Findings

### 1. [P1] confusion: Fig. 4 "Who sold SQL first" gains a Berkeley lane that started in 1973
- When: 133.4-137.5 s, beat `berkeley-in` (element-270.jpeg, element-273.jpeg)
- What: A blue "Berkeley" lane draws in, with a dot at 1973 and a line that runs to 1986, under the unchanged caption "Fig. 4 Who sold SQL first". The earliest mark on a chart about who sold SQL first now belongs to Berkeley, six years before the "Oracle, 1979" dot. Berkeley's Ingres spoke QUEL (the Ingres card says so 5 s later), and it was given away on tape, not sold.
- Why it matters: The chart contradicts its own caption and the narration's "Oracle shipped first" just as the story hands over to Berkeley.
- Cause: `video/src/videos/db-relational-history/RaceScene.tsx:89` keeps the caption for the whole scene, while `:129`, `:142-145` and `:206-208` add the Berkeley lane on the same axis.
- Fix: Swap the caption to "Who read Codd" at `onlyAt - 2` (give `FigLabel` an `out` and add a second label). Alternatively, end the Berkeley lane with a "QUEL, not SQL" tag at 1975 rather than letting it run unlabelled to 1986.

### 2. [P2] confusion: "post · gres · cue · ell" sits under the Postgres95 card, not under PostgreSQL
- When: 180.1-186.6 s, beat `rename` (element-365.jpeg, element-371.jpeg)
- What: The PostgreSQL card on the right ends with "officially said:". The syllables appear 58px tall, centred under the middle card (x≈728-1200), and nothing on the right follows the colon. At 182.9 s the syllables dim to 50%, about 0.5 s after "ell" lands.
- Why it matters: The pronunciation reads as Postgres95's, and the colon in the PostgreSQL card points at nothing.
- Cause: `PostgresScene.tsx:197` uses `left: XS[1] + 28` (the middle card's column), and `:190` adds the "officially said:" line in the third card. The dim at `:209` starts at `mostAt - 2`.
- Fix: Put the syllables at `left: XS[2] + 28` under the PostgreSQL card. Move "or, as most of us say it, Postgres" (`:226`) to below the syllables, and the elephant (`:229`) to the middle column. Alternatively, drop the colon line and keep the syllables where they are. Start the dim at `nickAt` rather than `mostAt - 2`.

### 3. [P2] confusion: Fig. 3 invents a speed ratio, labels a speed bar "IBM's big earner", and reverses the colours
- When: 81.6-92.3 s, beats `doubt` and `systemr` (element-182.jpeg, element-184.jpeg)
- What:
  - The bars have no axis or units. The "Match a value" bar creeps to 42% of the lane, which presents a measured speed nobody gives.
  - The label at the end of the "Follow a pointer" bar says "IBM's big earner", which is a revenue fact sitting where a speed value would go.
  - On "It could." both bars end the same length. That claims value matching was as fast as pointers, which the caption asks outright ("as fast as following a pointer?"). The lesson says "fast enough to compete" and "made efficient".
  - The colours flip: the pointer approach that broke in Fig. 1 is now calm blue, the colour Fig. 2 used for linking by value, and the relational approach is the red used for the broken route and, later, for the error.
- Why it matters: A chart with no scale states a number and a verdict the history does not support, and the colours undo what the viewer learned two scenes earlier.
- Cause:
  - `SqlScene.tsx:71`: `valueBar = 0.42 * … + 0.58 * …`
  - `:98`: the caption text
  - `:109-110`: `BAR` (blue) for pointers, `ACCENT` (red) for values
  - `:112-114`: the "IBM's big earner" label
- Fix:
  - Retitle the figure "Could matching values be fast enough?".
  - Draw the value bar as a dashed outline with "?" until "It could", then fill it to about 85-90% with the tick and "fast enough".
  - Move "IBM's big earner" next to "Follow a pointer, as IMS does" as a second line.
  - Swap the colours: pointer bar `INK_SOFT`, value bar blue (`KEY`).

### 4. [P2] confusion: a blank page while the narrator says "Keep the data in tables"
- When: 55.2-56.6 s, start of beat `values` (element-112.jpeg, element-113.jpeg)
- What: The paper, the Codd notes and "An idea almost too plain." all leave at "Keep" (55.3 s). The Fig. 2 tables only start at 56.4 s, and the next headline arrives at 57.2 s. The central idea of the video is spoken over a blank page.
- Why it matters: This is the one sentence the whole video exists to land, and nothing is on screen while it is said.
- Cause: `CoddScene.tsx:119` (headline `out={keepAt - 4}`), `:135-146` (paper and notes `out={keepAt - 6}`), and `:152`, `:163-166` (tables at `tablesAt - 6`, `tablesAt + i*4`).
- Fix: Bring the tables in at `keepAt` (FigLabel and customers at `keepAt - 2`, rows from `keepAt + 2`). Hold "An idea almost too plain." until `linkAt - 6`, so the swap happens on "link".

### 5. [P2] pacing: a near-empty screen for 3.3 s while Chamberlin and Boyce are introduced
- When: 92.3-95.6 s, beat `sequel` (element-188.jpeg, element-190.jpeg)
- What: Fig. 3 wipes at "Along" (92.3 s). For 3.3 s the frame holds one 24px line, "Donald Chamberlin and Raymond Boyce, System R", at y≈318, with no headline above it. The headline and "Structured English Query Language" arrive at 95.6-95.8 s.
- Why it matters: The two people the next 20 s are about get a lone caption on a blank page.
- Cause: `SqlScene.tsx:65` (`lanesOut = alongAt - 4`), `:94` (headline at `languageAt - 4`), `:148` (names at `namesAt - 4`).
- Fix: Keep Fig. 3 (dimmed to 40%) until `languageAt - 6`. Alternatively, bring the "A query language" headline in at `namesAt - 4` with the names line under it, and start the SEQUEL words at `languageAt - 2` as now.

### 6. [P2] spacing: the Postgres scene leaves two-thirds of the frame empty for 15 s
- When: 153.6-168.8 s, beats `postgres` and `quirk` (element-334.jpeg)
- What: One 520px card at the left (POSTGRES: 1986, extended, data types, POSTQUEL) is the only figure for 15 s. The area to the right (x 640-1920, y 380-1000) stays empty until Postgres95 arrives at 168.8 s. Nothing shows what "extend with your own types" means.
- Why it matters: This is a long dead stretch over a new idea (user-defined types) that the lesson ties back to the data-types chapter.
- Cause: `PostgresScene.tsx:53-56` lays out three fixed columns, and the second and third cards only appear at `ninetyFourAt` (`:142-148`) and `volunteersAt` (`:176-182`).
- Fix: Use the empty columns while the first card stands alone, then clear them on "ninety-four". For example, show a small "CREATE TYPE …" chip plugging into the card on "your own types", and on "didn't speak SQL" a QUEL/POSTQUEL query next to its SQL twin with the SQL one stamped "won".

### 7. [P2] pacing: the Ingres scene ends with about 20 unread words in 4 s
- When: 147.5-153.3 s, beat `tape` (2.98 words/s; element-300.jpeg, element-305.jpeg)
- What: In about 2.5 s, the screen adds "Sybase, 1984 / co-founded by an Ingres alum" (147.5 s), "and more: Britton Lee, NonStop SQL" (148.5 s) and "Microsoft SQL Server / licensed from Sybase, version 1.0 in 1989" (150.0-150.3 s). Only "Microsoft SQL Server" is said. The scene cuts at 153.3 s, so the Microsoft line is up for about 3 s and the "and more" names for about 4.8 s. Britton Lee and NonStop SQL are in neither lesson nor `script.ts`'s sources, and they are set in the blue used for keys and links.
- Why it matters: This is the shortest scene (16.1 s) but carries the most new names, so the viewer cannot read the chain of descent it draws.
- Cause: `IngresScene.tsx:125-168`, and `script.ts` beat `tape`, which has no `pauseAfter` beyond the 1.6 s scene default.
- Fix:
  - Split `tape` after "cost of a tape" and give it `pauseAfter: 0.6`.
  - Add "Sybase" to the narration ("…seeded an industry: Sybase, and from it Microsoft SQL Server").
  - Drop the "and more" line, or source it in `script.ts` and set it in `INK_SOFT`.

### 8. [P2] pacing: the ending's error message is never narrated, and it arrives under the fastest beats
- When: 205.3-215.0 s, beats `upbringing` (3.09 words/s) and `close` (3.31 words/s) (element-412.jpeg, element-414.jpeg, element-434.jpeg)
- What: From 205.3 to 207.8 s the screen adds:
  - the INSERT for customer 25
  - a two-line ERROR and a DETAIL line
  - "Nothing stored: orders still holds 30 rows."
  - "Postgres's error code: 23503"

  That is about 40 words, which go to half strength at 213.5 s. Meanwhile the narrator runs through the two fastest beats in the video. The reason for the refusal (there is no customer 25, the lesson has 24) is never said, and 23503 is unexplained trivia. Just before, "not by a sales team" is on screen for about 1.4 s (204.1-205.5 s).
- Why it matters: The course's closing demonstration plays out under a voice that is talking about something else.
- Cause: `TabScene.tsx:221-244`, and `script.ts` beats `upbringing` and `close`.
- Fix:
  - Split `upbringing` after "sales team". Add a short beat: "Ask it to store an order for customer twenty-five, who doesn't exist... and it refuses." Give it `pauseAfter: 0.8` before `close`.
  - Drop the error-code tag.
  - Keep the error at full strength until `doesAt` rather than `knowAt`.

### 9. [P2] explanation: "Network databases" gets pale dashed lines that link nothing the viewer knows
- When: 33.1-37.5 s, beat `route` (2.87 words/s, 0.35 s gap before; element-078.jpeg)
- What: "Network databases made the tree a web" is drawn as grey dashed 2px links: Ada→Grace→Linus, plus two tangled rows under the leaves that join 101→102, 125→126, 102→103 and 126→127. Nothing says what those order-to-order links mean. They dim at 37.5 s, about 3 s after they are drawn. The figure caption still says "as IMS stored them".
- Why it matters: The second pre-relational model is named but never shown in a way a viewer can read.
- Cause: `BeforeScene.tsx:166-185` (`webLinks`), `:251` (`INK_SOFT`, width 2, `dim={knowAt + 4}`), `:204` (caption).
- Fix: Keep only the customer-to-customer chain, and add one labelled cross-link (for example, order 125 to a "product" record). Hold the links undimmed until `reorgAt - 6`. Change the caption at `networkAt` to "…, then as network databases linked them".

### 10. [P3] spacing: the opening shots of three scenes leave most of the frame empty
- When:
  - 17.8-20.1 s, `trees` (element-040.jpeg, element-044.jpeg): headline only. Then the "IBM's IMS, first shipped 1967 / built to track Saturn V parts" label sits under an empty left column from 21.6 s, 2.4 s before the rocket and the words "Saturn Five".
  - 46.2-53.8 s, `codd` (element-102.jpeg): no headline, with the right 55% of the frame empty except three short lines.
  - 186.5-191.3 s, `tab` (element-378.jpeg): only "portable C → WebAssembly → PGlite" in the top-right third for 3.5 s, with no headline until 191.3 s. "Portable C" is never said, and the two arrows differ in length (74 vs 47 px).
- Why it matters: Each scene opens on a near-empty page.
- Cause:
  - `BeforeScene.tsx:207-208` (rocket at `saturnAt - 6`, label at `imsAt - 2`)
  - `CoddScene.tsx:119` (first headline at `plainAt - 6`)
  - `TabScene.tsx:55` (tab at `runningAt - 6`), `:103` (headline at `browserAt - 6`), `:123` (`i === 1 ? 84 : 58`)
- Fix:
  - Cue the IMS label at `saturnAt - 4`, with the rocket.
  - Bring "Ted Codd, 1970." in as the Codd scene's headline at `juneAt`.
  - Bring the tab frame and the "Postgres, in your browser." headline in at `compileAt`. Use one arrow length for both arrows, and say or drop "portable C".

### 11. [P3] confusion: the red X sits on the Linus→127 pointer, not on the program's route
- When: 43.6-46.2 s, beat `broke` (element-090.jpeg)
- What: The program's dashed route now runs Linus → 103 → 127. The X marks the arrowhead of the parent→127 pointer, which is not part of the route. It reads as "this pointer broke", when the point is "the program reached the wrong order".
- Why it matters: It marks the wrong element at the moment the payoff is shown.
- Cause: `BeforeScene.tsx:318` (`<Cross x={nx} y={childTopY - 26}>`)
- Fix: Move the cross onto the end of the route, inside 127's left edge (`x={nx - CHILD_W/2 + 14}, y={CHILD_Y}`). Alternatively, drop the X and add a "127 is not Ada's" note under the "child 1 is now Linus" line.

### 12. [P3] spacing: the shuffled rows swing into the answer table
- When: about 67.6-68.4 s, beat `shuffle` (element-136.jpeg)
- What: Rows in flight step up to 180px to the right. Row 127's "(0,27)" lands on the "order_id" header of "Ada's orders" (x≈1060), and four rows overlap mid-move.
- Why it matters: For a moment the shuffle collides with the answer table.
- Cause: `parts.tsx:602` (`aside = lift * (40 + 70 * (i % 3))`). The gap between the orders table (ends x=950) and the answer table (x=1040) is only 90px.
- Fix: Cap `aside` at 60, or step rows aside to the left (negative), into the empty space between the two tables.

### 13. [P3] accuracy: Codd's first sentence is cut short with no ellipsis, and is up too briefly to read
- When: 73.7-79.7 s, beat `independence` (element-157.jpeg)
- What: The on-screen quote ends "…how the data is organized in the machine." The paper's sentence continues "(the internal representation)". The quote is 21 words, is not read aloud, and is up for about 6 s under narration (about 10 s needed at 2 words/s).
- Why it matters: The quotation is shown as complete when it is not, and few viewers will finish reading it.
- Cause: `CoddScene.tsx:268-274`
- Fix: End the quote with "… in the machine …". Bring it in at `independenceAt - 4` and extend `independence` with `pauseAfter: 0.8`.

### 14. [P3] confusion: SQL lettering keeps the dropped vowels red, and the "That name is taken" stamp ends up beside SQL
- When: 105.6-108.1 s, beats `vowels` and `boyce` (element-212.jpeg, element-230.jpeg)
- What: After the vowels fall, "Structured **E**nglish **Que**ry **L**anguage" still has its E and its "ue" in red, though SQL is only S, Q, L. The red "That name is taken" stamp, about 480px from "SQL", stays up until 108 s and reads as applying to SQL.
- Why it matters: The lettering no longer matches the acronym on screen, and the stamp lands on the wrong name.
- Cause: `SqlScene.tsx:158` (taken letters stay `ACCENT_INK`), `:200` (stamp `out={diedAt - 6}`)
- Fix: At `sqlAt`, fade the E and the "ue" to `INK_SOFT`. End the stamp at `sqlAt - 6`.

### 15. [P3] other: "not ~~SQL~~" reads as a double negative
- When: 164.6-176.8 s, beats `quirk` and `yu` (element-334.jpeg)
- What: The POSTGRES card line reads "speaks POSTQUEL, not ~~SQL~~", with the SQL both negated and struck through.
- Why it matters: The strike-through cancels the "not" it follows.
- Cause: `PostgresScene.tsx:128`
- Fix: Write "speaks POSTQUEL, not SQL" with no strike, or strike SQL and drop the "not".

### 16. [P3] spacing: left margins vary from scene to scene
- When: throughout (element-054.jpeg, element-124.jpeg, element-182.jpeg)
- What: The house margin is 96. Fig. 1's caption sits at x=600, Fig. 2's caption and tables at 150, the Codd paper at 120, and the System R card at 470, while Fig. 3's bars start at 520.
- Why it matters: The margins drift from scene to scene, and the System R card lines up with neither the labels nor the bars.
- Cause: `BeforeScene.tsx:204` (`x={600}`), `CoddScene.tsx:78` (`CX = 150`), `:125` (`x={120}`), `SqlScene.tsx:135` (`x={470}`)
- Fix: Put figure captions at x=96 everywhere, set `CX = 96` (the tables still fit), and put the System R card at `x={LANE_X0}`.

### 17. [P3] other: hyphens in card text render wide ("co - founded", "mid - 1970s")
- When: 90-92 s and 147-153 s (element-182.jpeg, element-305.jpeg)
- What: In Inter card lines, the hyphen sits in a figure-width slot with visible space on both sides.
- Why it matters: Small, but it looks like a typo.
- Cause: `parts.tsx:886` sets Card lines with `note()`, and `editorial/style.ts:66` turns on `fontVariantNumeric: "tabular-nums lining-nums"`. Inter's tabular-figures feature also widens the hyphen; this is the probable cause, since it is in the shared style.
- Fix: Use `lining-nums` only for card lines (pass a style override in `Card`), and keep tabular figures for numeric columns.
