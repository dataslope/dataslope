-- Better Auth core schema for D1 (SQLite), applied with:
--   npx wrangler d1 migrations apply dataslope-auth            (local)
--   npx wrangler d1 migrations apply dataslope-auth --remote   (Cloudflare)
--
-- These four tables (user / session / account / verification) are exactly the
-- set Better Auth's `getAuthTables()` derives for email + social login with no
-- extra plugins. Column shapes follow the kysely-adapter's sqlite encoding,
-- which is the source of truth for what the running auth handler reads/writes:
--   * `date` fields are stored as ISO-8601 *strings* (supportsDates: false) -> TEXT
--   * `boolean` fields are stored as 0/1                (supportsBooleans: false) -> INTEGER
--   * ids and all other strings -> TEXT
-- If you later add Better Auth plugins (2FA, organizations, etc.) regenerate the
-- delta with `npx @better-auth/cli generate` and add it as a new migration file
-- rather than editing this one.

CREATE TABLE user (
  id            TEXT    PRIMARY KEY,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image         TEXT,
  createdAt     TEXT    NOT NULL,
  updatedAt     TEXT    NOT NULL
);

CREATE TABLE session (
  id        TEXT PRIMARY KEY,
  expiresAt TEXT NOT NULL,
  token     TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId    TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE
);
CREATE INDEX idx_session_userId ON session (userId);

CREATE TABLE account (
  id                    TEXT PRIMARY KEY,
  accountId             TEXT NOT NULL,
  providerId            TEXT NOT NULL,
  userId                TEXT NOT NULL REFERENCES user (id) ON DELETE CASCADE,
  accessToken           TEXT,
  refreshToken          TEXT,
  idToken               TEXT,
  accessTokenExpiresAt  TEXT,
  refreshTokenExpiresAt TEXT,
  scope                 TEXT,
  password              TEXT,
  createdAt             TEXT NOT NULL,
  updatedAt             TEXT NOT NULL
);
CREATE INDEX idx_account_userId ON account (userId);

CREATE TABLE verification (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  expiresAt  TEXT NOT NULL,
  createdAt  TEXT,
  updatedAt  TEXT
);
CREATE INDEX idx_verification_identifier ON verification (identifier);
