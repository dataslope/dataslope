-- Deletion requests: which charts and illustrations an admin wants removed
-- from the repository altogether.
--
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-illustrations            (local)
--   npx wrangler d1 migrations apply dataslope-illustrations --remote   (Cloudflare)
--
-- ── Why a mark rather than a delete ─────────────────────────────────────────
--
-- The admin galleries cannot delete either artefact, and no amount of work on
-- them would change that. A chart is `charts/<slug>.mjs` and an illustration
-- is `public/images/<id>.webp`, both of them files in git, compiled or copied
-- into the deployed bundle at build time; the Worker serving the gallery holds
-- the rendered output and nothing else. Deleting one is a commit, and a commit
-- is something a person or a coding agent makes.
--
-- So the gallery records the *decision* and the repository work reads it back,
-- which is the same split `marked` already uses for redraws: the reviewer is
-- in the browser looking at the artefact, the work happens in a checkout.
--
--   -- what has been asked for, oldest request first
--   npx wrangler d1 execute dataslope-illustrations --remote --command \
--     "SELECT prompt_id, delete_reason, delete_requested_at
--        FROM chart_regen_marks
--       WHERE delete_requested_at IS NOT NULL
--       ORDER BY delete_requested_at"
--
-- Then, having removed `charts/<slug>.mjs` and the `<Chart slug="…" />` tags
-- that referenced it, clear the request so the gallery stops showing it:
--
--   npx wrangler d1 execute dataslope-illustrations --remote --command \
--     "UPDATE chart_regen_marks
--         SET delete_requested_at = NULL, delete_reason = '',
--             updated_at = datetime('now')
--       WHERE prompt_id = '<slug>'"
--
-- Nothing here cascades. Clearing the request is the agent's way of saying the
-- deletion happened, and leaving the row behind is deliberate: it keeps the
-- note and the review history for a slug that may be reused.

-- Both tables, because lib/review/marks.ts addresses them with one set of
-- statements bound to a queue name. A column that exists on one and not the
-- other breaks the queue that lacks it, which is the warning already in 0003.
ALTER TABLE chart_regen_marks ADD COLUMN delete_requested_at TEXT;
ALTER TABLE chart_regen_marks ADD COLUMN delete_requested_by TEXT;
ALTER TABLE chart_regen_marks ADD COLUMN delete_reason TEXT NOT NULL DEFAULT '';

ALTER TABLE illustration_regen_marks ADD COLUMN delete_requested_at TEXT;
ALTER TABLE illustration_regen_marks ADD COLUMN delete_requested_by TEXT;
ALTER TABLE illustration_regen_marks ADD COLUMN delete_reason TEXT NOT NULL DEFAULT '';

-- The queue read: outstanding requests, oldest first, so a clean-up run works
-- through them in the order they were raised. Partial, because the answer is
-- almost always a handful of rows out of a table with one row per artefact
-- ever reviewed.
CREATE INDEX IF NOT EXISTS idx_chart_delete_requested
  ON chart_regen_marks(delete_requested_at)
  WHERE delete_requested_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_illustration_delete_requested
  ON illustration_regen_marks(delete_requested_at)
  WHERE delete_requested_at IS NOT NULL;
