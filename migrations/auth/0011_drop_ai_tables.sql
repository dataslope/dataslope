-- Drop every table the removed AI features wrote.
-- Applied with:
--   npm run db:migrate            (local)
--   npm run db:migrate:remote     (Cloudflare)
--
-- Both AI features are gone: the "Ask AI" chat assistant (with its suggested
-- questions and answer ratings) and the Pro-only AI autocomplete. Nothing
-- reads or writes these tables any more:
--
--   ai_usage_daily      per-user daily request/token counters (0003, 0004, 0006)
--   ai_usage_global     the site-wide daily token ceiling (0003)
--   ai_answer_feedback  rated Ask AI questions and answers (0008)
--
-- THIS DESTROYS DATA AND CANNOT BE UNDONE. `ai_answer_feedback` holds the text
-- of questions users asked and the answers they rated. Take an export first
-- if any of it might be wanted later:
--
--   npx wrangler d1 export dataslope-auth --remote \
--     --table ai_usage_daily --table ai_usage_global \
--     --table ai_answer_feedback --output ai-tables.sql
--
-- Apply it after the deploy that removes the AI code, not before: the
-- previous build still writes to these tables, and its AI endpoints would
-- fail until the new one is live.
--
-- 0003, 0004, 0006 and 0008 stay in place: D1 records applied migrations by
-- filename, so deleting them would not un-apply them and would only
-- desynchronise the ledger. 0003 also added `user.plan`, which stays; the
-- membership tier still decides storage limits (lib/plan.ts).

DROP INDEX IF EXISTS idx_ai_answer_feedback_created;
DROP INDEX IF EXISTS idx_ai_answer_feedback_rating;
DROP TABLE IF EXISTS ai_answer_feedback;

DROP TABLE IF EXISTS ai_usage_daily;
DROP TABLE IF EXISTS ai_usage_global;
