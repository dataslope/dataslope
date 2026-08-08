-- Illustration review marks: which generated images an admin wants redrawn,
-- and the extra prompt guidance to redraw them with.
--
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-illustrations            (local)
--   npx wrangler d1 migrations apply dataslope-illustrations --remote   (Cloudflare)
--
-- This database (`dataslope-illustrations`, binding ILLUSTRATIONS_DB) is
-- separate from `dataslope-auth`: it holds authoring/review state, not user
-- data, so it can be dumped, wiped, or read by a coding agent without going
-- anywhere near accounts and sessions. See
-- agent-outputs/20260803-0900-illustration-regeneration-queue.md.

-- One row per illustration prompt id (the `id` in data/illustration-prompts.json,
-- which is also the file stem: `<id>.webp` / `<id>-cutout.webp`). No foreign
-- key: the prompt list lives in git, not in this database, and a row must
-- survive a prompt being renamed long enough for someone to notice.
--
-- Rows are kept when unmarked rather than deleted, so the note written during
-- one review round is still there on the next one. "What needs regenerating"
-- is therefore `WHERE marked = 1`, never "every row".
CREATE TABLE IF NOT EXISTS illustration_regen_marks (
  prompt_id       TEXT    NOT NULL PRIMARY KEY, -- illustration id, e.g. "python-basics-loops"
  marked          INTEGER NOT NULL DEFAULT 0,   -- 1 = redraw this one, 0 = cleared
  note            TEXT    NOT NULL DEFAULT '',  -- extra guidance, e.g. "use a simpler illustration"
  marked_by       TEXT,                         -- user id of the admin who last touched the row
  created_at      TEXT    NOT NULL,             -- ISO-8601 UTC
  updated_at      TEXT    NOT NULL,             -- ISO-8601 UTC
  regenerated_at  TEXT                          -- ISO-8601 UTC, stamped when the art is redrawn
);

-- The queue read: marked rows, oldest mark first, so a regeneration run works
-- through them in the order they were raised.
CREATE INDEX IF NOT EXISTS idx_illustration_regen_marks_marked
  ON illustration_regen_marks(marked, updated_at);
