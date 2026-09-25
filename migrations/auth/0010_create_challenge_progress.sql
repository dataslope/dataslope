-- Signed-in challenge progress, so a solved challenge follows its learner to
-- another browser or device.
-- Applied with:
--   npm run db:migrate            (local)
--   npm run db:migrate:remote     (Cloudflare)
--
-- Guests keep progress in localStorage only (lib/challenges/progress.ts); on
-- sign-in that browser's progress is adopted into the account and uploaded
-- here. Only the verdicts are stored, not the learner's code: saved editor
-- buffers stay in the browser that typed them.
--
-- Progress only ever moves forward, and the API merges rather than
-- overwrites (lib/challenges/progressSync.ts): `passed_steps` is a union,
-- `solved` and `attempted` are sticky. Two devices writing at once can
-- therefore at worst each miss the other's newest step until their next
-- sync, never lose one. `solved_at` is when the challenge was first
-- accepted, kept for a future "recently solved" view. Timestamps are
-- ISO-8601 UTC TEXT, matching the other auth tables.
--
-- Deleting the user cascades here, which is what the account page's
-- "delete account" copy promises.
CREATE TABLE IF NOT EXISTS challenge_progress (
  user_id      TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  slug         TEXT    NOT NULL,
  passed_steps TEXT    NOT NULL DEFAULT '[]',  -- JSON array of zero-padded step numbers
  solved       INTEGER NOT NULL DEFAULT 0,
  attempted    INTEGER NOT NULL DEFAULT 0,
  solved_at    TEXT,
  updated_at   TEXT    NOT NULL,
  PRIMARY KEY (user_id, slug)
);
