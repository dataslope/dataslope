-- Approval tracking for regenerated illustrations.
--
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-illustrations            (local)
--   npx wrangler d1 migrations apply dataslope-illustrations --remote   (Cloudflare)
--
-- 0001 gave a row two states: queued for regeneration (`marked = 1`) or not.
-- That left the round trip unfinished, since nothing recorded whether anyone
-- had looked at the redraw. A row now carries a third, derived state,
-- "regenerated, waiting to be looked at":
--
--   regenerated_at IS NOT NULL AND (approved_at IS NULL OR approved_at < regenerated_at)
--
-- Comparing the two timestamps rather than clearing `regenerated_at` on
-- approval is what makes a second redraw of an already-approved illustration
-- come back for review: the new `regenerated_at` simply overtakes the old
-- `approved_at`. It also keeps both dates as history.
ALTER TABLE illustration_regen_marks ADD COLUMN approved_at TEXT;

-- Who signed the redraw off, mirroring `marked_by`.
ALTER TABLE illustration_regen_marks ADD COLUMN approved_by TEXT;
