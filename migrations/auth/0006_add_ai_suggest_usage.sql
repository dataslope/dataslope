-- Ask AI suggested questions: per-user, per-day usage counters.
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-auth            (local)
--   npx wrangler d1 migrations apply dataslope-auth --remote   (Cloudflare)
--
-- Suggestions are tracked separately from Ask AI chat on the same
-- ai_usage_daily row: the panel fetches three suggested questions on open and
-- after every answer, so letting those calls consume the chat `requests`
-- counter would eat a member's Ask AI budget without them ever asking
-- anything. Chat budgets keep reading requests/input_tok/output_tok; suggest
-- budgets read these three columns (see lib/ai/limits.ts). Suggestion tokens
-- DO still count toward the global daily ceiling in ai_usage_global, which
-- stays the single bounded-downside backstop for total provider spend.
ALTER TABLE ai_usage_daily ADD COLUMN suggests INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_usage_daily ADD COLUMN suggest_in_tok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_usage_daily ADD COLUMN suggest_out_tok INTEGER NOT NULL DEFAULT 0;
