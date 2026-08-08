-- Schema delta for Better Auth's `admin` plugin (lib/auth/server.ts), applied with:
--   npx wrangler d1 migrations apply dataslope-auth            (local)
--   npx wrangler d1 migrations apply dataslope-auth --remote   (Cloudflare)
--
-- The admin plugin adds role + ban fields to `user` and an impersonation
-- back-reference to `session`. Column shapes follow the same kysely-adapter
-- sqlite encoding as 0001 (the source of truth for what the running handler
-- reads/writes):
--   * `boolean` (banned)        -> INTEGER 0/1
--   * `date`    (banExpires)    -> ISO-8601 TEXT
--   * strings   (role, …)       -> TEXT
-- New users get role 'user' and banned 0 by default; the `adminUserIds` config
-- can grant admin without touching this column, and an admin can promote others
-- by setting `role = 'admin'`.

ALTER TABLE user ADD COLUMN role      TEXT    NOT NULL DEFAULT 'user';
ALTER TABLE user ADD COLUMN banned    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user ADD COLUMN banReason TEXT;
ALTER TABLE user ADD COLUMN banExpires TEXT;

ALTER TABLE session ADD COLUMN impersonatedBy TEXT;
