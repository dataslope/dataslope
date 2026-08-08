-- Chart review marks: which generated Observable Plot figures an admin wants
-- redrawn, and the note describing what is wrong with each one.
--
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-illustrations            (local)
--   npx wrangler d1 migrations apply dataslope-illustrations --remote   (Cloudflare)
--
-- This lives in `dataslope-illustrations` rather than a database of its own.
-- The name is historical: what that database actually holds is *authoring and
-- review state*, kept apart from `dataslope-auth` so a coding agent can read,
-- dump, or wipe it without going anywhere near accounts and sessions. A second
-- review queue belongs there for exactly that reason, and sharing the binding
-- means the charts page degrades the same way the illustrations page does when
-- ILLUSTRATIONS_DB is missing.
--
-- The shape is identical to illustration_regen_marks, and deliberately so:
-- both tables are driven by lib/review/marks.ts, which is bound to one or the
-- other by a queue name. Changing one column here without changing it there
-- will break the other queue too.

-- One row per chart slug: the `<slug>` in `charts/<slug>.mjs`, which is also
-- the key in lib/generated/charts.js and the `slug` prop on <Chart />. No
-- foreign key, because the chart list is a build artefact in git rather than a
-- table, and a row must outlive a rename long enough for someone to notice.
--
-- Rows are kept when unmarked rather than deleted, so the note written during
-- one review round is still there on the next one. "What needs redrawing" is
-- therefore `WHERE marked = 1`, never "every row".
CREATE TABLE IF NOT EXISTS chart_regen_marks (
  prompt_id       TEXT    NOT NULL PRIMARY KEY, -- chart slug, e.g. "bar-truncation"
  marked          INTEGER NOT NULL DEFAULT 0,   -- 1 = redraw this one, 0 = cleared
  note            TEXT    NOT NULL DEFAULT '',  -- what is wrong, e.g. "labels collide in dark mode"
  marked_by       TEXT,                         -- user id of the admin who last touched the row
  created_at      TEXT    NOT NULL,             -- ISO-8601 UTC
  updated_at      TEXT    NOT NULL,             -- ISO-8601 UTC
  regenerated_at  TEXT,                         -- ISO-8601 UTC, stamped when the spec is rewritten
  approved_at     TEXT,                         -- ISO-8601 UTC, stamped when the redraw is signed off
  approved_by     TEXT                          -- user id of the admin who signed it off
);

-- `prompt_id` keeps its name rather than becoming `chart_slug`: the column is
-- read by lib/review/marks.ts, which addresses both tables with one set of
-- statements, and D1 cannot bind a column name.

-- The queue read: marked rows, oldest mark first, so a redraw run works through
-- them in the order they were raised.
CREATE INDEX IF NOT EXISTS idx_chart_regen_marks_marked
  ON chart_regen_marks(marked, updated_at);

-- Closing the loop after a chart is actually redrawn. Nothing in the app writes
-- `regenerated_at` — the redraw happens in the repo, by editing charts/<slug>.mjs
-- and running `npm run build:charts` — so whoever does it stamps the row and the
-- gallery moves the chart to "regenerated, awaiting approval":
--
--   npx wrangler d1 execute dataslope-illustrations --remote --command \
--     "UPDATE chart_regen_marks
--         SET marked = 0, regenerated_at = datetime('now'), updated_at = datetime('now')
--       WHERE prompt_id = '<slug>'"
--
-- Never set `approved_at` from a script: approval is the admin's half of the
-- round trip, and stamping it here would hide the redraw from the person who
-- asked for it.
