# Illustration regeneration queue

**Status:** live. Written 2026-08-03.

The `/illustration-prompts` gallery is where generated art gets judged. This
document covers the half that outlives the review session: the **regeneration
queue**, a D1 table recording which illustrations were marked "redraw this" and
what extra guidance to redraw them with.

If you are an agent who has been asked to *"regenerate the images marked in the
database"*, you want [The regeneration loop](#the-regeneration-loop).

For how images are generated in the first place (the five-step pipeline, costs,
every gotcha), read `agent-outputs/20260730-1200-illustration-pipeline-handoff.md`
and the "Illustrations" section of `AGENTS.md`. This document assumes both.

---

## Where the data lives

| | |
| --- | --- |
| **D1 database** | `dataslope-illustrations` |
| **Database id** | `0ab9f248-58dc-4e0a-a17e-f41badf9f6c0` |
| **Worker binding** | `ILLUSTRATIONS_DB` (`wrangler.jsonc` → `d1_databases`) |
| **Table** | `illustration_regen_marks` |
| **Schema** | `migrations-illustrations/0001_…`, `0002_add_approval_tracking.sql` |
| **Access layer** | `lib/illustrations/regenMarks.ts` |
| **API** | `app/api/admin/illustration-prompts/route.ts` (`GET` gallery, `PUT` mark) |
| **UI** | `app/illustration-prompts/` |

This is a **second, separate database** from `dataslope-auth`. Review marks are
authoring state, not user data, so the whole queue can be read, dumped, or
wiped by a coding agent with no path anywhere near accounts and sessions. It
also means the two schemas migrate independently:

```bash
npm run db:migrate:illustrations           # local (miniflare)
npm run db:migrate:illustrations:remote    # Cloudflare
```

Both wrap `wrangler d1 migrations apply dataslope-illustrations`. Every
statement in the migration is `IF NOT EXISTS`, so re-running it is a no-op (the
remote table was created out-of-band on 2026-08-03, before wrangler had ever
recorded a migration for this database).

### `illustration_regen_marks`

| Column | Type | Meaning |
| --- | --- | --- |
| `prompt_id` | TEXT PK | Illustration id from `data/illustration-prompts.json`. Also the file stem: `public/images/<prompt_id>.webp` and `<prompt_id>-cutout.webp`. |
| `marked` | INTEGER | `1` = redraw this one, `0` = cleared. |
| `note` | TEXT | Extra guidance for the redraw, e.g. "use a simpler illustration". Never empty on a marked row (see the default below). Capped at 500 chars, single line. |
| `marked_by` | TEXT | User id of the admin who last wrote the row. |
| `created_at` | TEXT | ISO-8601 UTC. |
| `updated_at` | TEXT | ISO-8601 UTC of the last write. |
| `regenerated_at` | TEXT | ISO-8601 UTC, **stamped by whoever redraws the art**. NULL until then. |
| `approved_at` | TEXT | ISO-8601 UTC, stamped when an admin presses Approve. NULL until then. |
| `approved_by` | TEXT | User id of the admin who signed the redraw off. |

Three deliberate choices:

- **No foreign key to anything.** The prompt list lives in git, not in this
  database. A row must survive a prompt being renamed for long enough that
  someone notices.
- **Unmarking keeps the row.** Clearing a mark sets `marked = 0` and leaves the
  note, so the next review round starts from what was already observed. "What
  needs regenerating" is therefore `WHERE marked = 1`, never "every row".
- **Approval is a timestamp, not a flag.** "Waiting to be looked at" is derived
  by comparing the two dates, which is what makes a *second* redraw of an
  already-approved illustration come back for review: the fresh
  `regenerated_at` simply overtakes the stale `approved_at`.

### The three states

| State | Row | Card in the gallery |
| --- | --- | --- |
| Idle | `marked = 0`, and approved (or never redrawn) | Normal |
| Queued | `marked = 1` | Red tint, "Marked for regeneration" |
| Redrawn, unreviewed | `regenerated_at IS NOT NULL AND (approved_at IS NULL OR approved_at < regenerated_at)` | Green tint, banner with the date, **Approve** button |

A queued row outranks an unreviewed one visually: if the redraw was still wrong
and the admin marked it again, red is the state that matters. `isAwaitingApproval`
in `lib/illustrations/regenMarks.ts` is the one definition of that middle state,
shared by the API and the gallery.

### The default note

Marking an illustration with the note field left blank does **not** store an
empty note. `DEFAULT_REGEN_NOTE` goes in instead:

> use a simpler illustration with fewer, larger shapes and less fine detail:
> the small details came out malformed

That is the common case by a wide margin (mushed star points, broken little
characters, lettering-shaped smears), and the fix is always the same. The
gallery shows the default as the input's placeholder, so what will be stored is
visible before the button is pressed. Type anything and that wins.

---

## Reviewing (what a human does)

`/illustration-prompts` is **admin-only**. The page itself is still a
statically prerendered shell holding no data; everything it renders comes from
`GET /api/admin/illustration-prompts`, which calls `requireAdmin`. A signed-out
visitor gets a sign-in prompt, a signed-in non-admin gets an access-denied
notice, and neither ever receives the prompt corpus. The footer link stays
public on purpose: following it just shows the notice.

The gallery shows a **column grid of the background-removed WebP only**, which
is the file the site actually serves, over the live page background with no
backdrop of its own. Flipping the theme pill is the judgement tool: a cut-out
that only reads on one background is the thing this page exists to catch.
Clicking an image opens the raw file in a new tab at full size.

Each card carries the prompt, a copy button, the lesson it renders on, a
**Mark for regeneration** toggle, and a note input. The two are one control in
practice: **typing in the note marks the illustration**, because nobody writes
"the star points are mushed" about a picture they are happy with. The card tints
on the first keystroke and the row is written once typing pauses (or on blur or
Enter, whichever comes first), so a note is never lost to walking away without
blurring. Unmarking through the button keeps the note. A card that has
been redrawn since it was last signed off turns green and grows an **Approve**
button, which is the whole of the sign-off: press it and the card goes back to
looking like every other one.

Two filter chips at the top narrow the grid, to what is queued and to what is
waiting for approval. Both the filter and the page are in the URL
(`?page=2&filter=regenerated`), so a view can be reloaded, bookmarked, or
shared.

Marking is disabled with a visible warning when `ILLUSTRATIONS_DB` is not
bound; reviewing still works.

---

## Reading the queue

Two paths, both fine:

**wrangler** (needs `CLOUDFLARE_API_TOKEN` or an interactive login):

```bash
npx wrangler d1 execute dataslope-illustrations --remote --json \
  --command "SELECT prompt_id, note, updated_at FROM illustration_regen_marks WHERE marked = 1 ORDER BY updated_at;"
```

**Cloudflare MCP** (`mcp__Cloudflare_Developer_Platform__d1_database_query`),
which works in a Claude Code session with no extra credentials. Pass
`database_id: 0ab9f248-58dc-4e0a-a17e-f41badf9f6c0` and the same SQL.

The id list in the shape the generator wants:

```sql
SELECT group_concat(prompt_id) FROM illustration_regen_marks WHERE marked = 1;
```

---

## The regeneration loop

Work one batch at a time. Every step below is the standard pipeline; the only
new parts are step 1 (read the queue) and step 6 (stamp it).

**1. Read the queue.**

```sql
SELECT prompt_id, note FROM illustration_regen_marks WHERE marked = 1 ORDER BY updated_at;
```

**2. Apply each note to the prompt, in `data/illustration-prompts.json`.**

The note is an instruction about the prompt, not a suffix to paste onto it. Do
not bolt "use a simpler illustration" onto the end of the generated prompt
string: edit the entry's `subject` (occasionally its `style`) so the change is
versioned in git and every future regeneration inherits it. `subject` is the
only free text in the prompt; `buildIllustrationPrompt` supplies the article,
the style, "No text.", and the brand colors around it
(`lib/illustrationPrompt.ts`).

A note like "use a simpler illustration" usually means cutting clauses out of
the subject, not adding the word "simple" to it.

**3. Generate, always via the Batch API, quality `low`.**

```bash
IDS="aida-broken-joins,python-basics-loops"     # from step 1
RUN=2026-08-regen-01
node scripts/generate-illustrations.mjs dry-run --only "$IDS"
node scripts/generate-illustrations.mjs submit  --only "$IDS" --sink r2 --run "$RUN"
node scripts/generate-illustrations.mjs status
node scripts/generate-illustrations.mjs download --sink r2 --run "$RUN"
```

**4. Remove the background. Never skip this on a regeneration.**

Pages reference the `-cutout` slug. Promotion silently promotes only the
original when no cut-out exists, which leaves the page serving the *old* image
and the review looking like the regeneration did nothing.

```bash
node scripts/remove-background-kie.mjs --from r2 --run "$RUN" --concurrency 8
```

**5. Promote the keepers.**

```bash
node scripts/promote-illustrations.mjs --all --from r2 --run "$RUN"
```

This writes `public/images/<id>.webp` + `<id>-cutout.webp` and refreshes
`lib/generated/images.js`. No `wire-course-figures` run is needed: the slugs
did not change, so the `<Figure>` in each lesson already points at the new
bytes.

**6. Hand the ids you redrew back for review.** Clear the mark and stamp
`regenerated_at`, which is what turns those cards green with an Approve button.
Do it for the ids you actually redrew, not the whole table: a mark added while
you were working is not one you have handled.

```sql
UPDATE illustration_regen_marks
   SET marked = 0,
       regenerated_at = '2026-08-03T12:00:00Z',   -- now, ISO-8601 UTC
       updated_at     = '2026-08-03T12:00:00Z'
 WHERE prompt_id IN ('aida-broken-joins', 'python-basics-loops');
```

Do **not** touch `approved_at`. Approving is the human's half of the round trip
(the Approve button on the card, or the `?filter=regenerated` view for the whole
batch); an agent stamping it would sign off its own work.

The note stays either way. If the redraw did not fix it, the reviewer re-marks
the row and the previous guidance is still there to build on.

**7. Commit** the JSON edits, the new WebP files, and the manifest, then say in
the PR which ids were redrawn and what each note asked for. Point the reviewer
at `/illustration-prompts?filter=regenerated`, which is exactly the batch you
just landed.

---

## Gotchas

- **A mark is not a promise the art exists.** An id can be marked before it has
  ever been generated (the gallery shows "Not generated yet"). Step 3 handles
  both cases identically, so this needs no special treatment, but do not assume
  a marked id has files on disk.
- **"Generated, but no cut-out"** on a card is a background-removal failure,
  not a drawing problem. Re-run step 4 for that run; regenerating the image is
  wasted money.
- **Notes are single-line and capped at 500 characters** (`MAX_NOTE_LENGTH` in
  `lib/illustrations/regenMarks.ts`). They are guidance, not replacement
  prompts. A full rewrite belongs in `subject`.
- **A note reading exactly `DEFAULT_REGEN_NOTE` means nothing was typed.** It is
  still a real instruction (simplify, fewer and larger shapes) and should be
  acted on, but there is no illustration-specific observation behind it, so look
  at the image before deciding what to cut.
- **Never stamp `approved_at` from a script.** Approval is the human's
  confirmation that a redraw worked; an agent setting it erases the only signal
  that anyone looked.
- **Deleting a course does not clear its marks.** Rows for removed prompt ids
  linger harmlessly (the gallery only renders ids that still exist). Clean them
  up with a `DELETE ... WHERE prompt_id LIKE '<prefix>%'` if they get noisy.
- **Local dev writes to a local D1**, not the remote one. `npm run dev` under
  miniflare gives `ILLUSTRATIONS_DB` its own SQLite file, so marks made against
  a dev server are not the ones a regeneration run reads. Review on the
  deployed site, or apply the migration locally and accept the split.
