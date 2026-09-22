-- Drop the user-generated custom content tables created in 0007.
-- Applied with:
--   npm run db:migrate            (local)
--   npm run db:migrate:remote     (Cloudflare)
--
-- The /dashboard/create builders, the /api/custom endpoints and the /c/<id>
-- and /quiz/<id> viewers have all been removed, so nothing reads or writes
-- these tables any more.
--
-- THIS DESTROYS DATA AND CANNOT BE UNDONE. Every custom challenge, MCQ and
-- quiz set anyone created is in here, including rows behind links that have
-- been shared. `auth` is the one database whose rows cannot be rebuilt from
-- this repository, so take an export first if there is any chance the content
-- is wanted later:
--
--   npx wrangler d1 export dataslope-auth --remote \
--     --table custom_items --table custom_sets --output custom-content.sql
--
-- 0007 is deliberately left in place rather than deleted: D1 records applied
-- migrations by filename, so removing it would not un-apply it and would only
-- desynchronise the ledger on databases that already ran it.

DROP INDEX IF EXISTS idx_custom_items_user;
DROP INDEX IF EXISTS idx_custom_items_expires;
DROP TABLE IF EXISTS custom_items;

DROP INDEX IF EXISTS idx_custom_sets_user;
DROP INDEX IF EXISTS idx_custom_sets_expires;
DROP TABLE IF EXISTS custom_sets;

-- Guest creation rate limits shared `share_usage_daily` with playground shares
-- (0005) under a "ci:"-prefixed scope. That table stays — playground sharing
-- still uses it — but the "ci:ip:<hash>" and "ci:global" rows are now dead.
DELETE FROM share_usage_daily WHERE scope = 'ci:global' OR scope LIKE 'ci:ip:%';
