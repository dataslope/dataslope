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
| **Schema** | `migrations-illustrations/0001_create_illustration_regen_marks.sql` |
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
| `note` | TEXT | Extra guidance for the redraw, e.g. "use a simpler illustration". `''` when none. Capped at 500 chars, single line. |
| `marked_by` | TEXT | User id of the admin who last wrote the row. |
| `created_at` | TEXT | ISO-8601 UTC. |
| `updated_at` | TEXT | ISO-8601 UTC of the last write. |
| `regenerated_at` | TEXT | ISO-8601 UTC, stamped by whoever redraws the art. NULL until then. |

Two deliberate choices:

- **No foreign key to anything.** The prompt list lives in git, not in this
  database. A row must survive a prompt being renamed for long enough that
  someone notices.
- **Unmarking keeps the row.** Clearing a mark sets `marked = 0` and leaves the
  note, so the next review round starts from what was already observed. "What
  needs regenerating" is therefore `WHERE marked = 1`, never "every row".

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
**Mark for regeneration** toggle, and a note input. Toggling the mark saves
immediately; the note saves on blur (or Enter) and always travels with the
mark, so typing a note then hitting the button persists both. A "Marked for
regeneration" filter at the top collapses the grid to the queue.

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

**6. Clear the marks you actually redrew.** Not the whole table: a mark added
while you were working is not one you have handled.

```sql
UPDATE illustration_regen_marks
   SET marked = 0,
       regenerated_at = '2026-08-03T12:00:00Z',   -- now, ISO-8601 UTC
       updated_at     = '2026-08-03T12:00:00Z'
 WHERE prompt_id IN ('aida-broken-joins', 'python-basics-loops');
```

The note stays. If the redraw did not fix it, the next reviewer re-marks the
row and the previous guidance is still there to build on.

**7. Commit** the JSON edits, the new WebP files, and the manifest, then say in
the PR which ids were redrawn and what each note asked for.

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
- **Deleting a course does not clear its marks.** Rows for removed prompt ids
  linger harmlessly (the gallery only renders ids that still exist). Clean them
  up with a `DELETE ... WHERE prompt_id LIKE '<prefix>%'` if they get noisy.
- **Local dev writes to a local D1**, not the remote one. `npm run dev` under
  miniflare gives `ILLUSTRATIONS_DB` its own SQLite file, so marks made against
  a dev server are not the ones a regeneration run reads. Review on the
  deployed site, or apply the migration locally and accept the split.
