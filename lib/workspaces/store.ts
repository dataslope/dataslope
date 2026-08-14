/**
 * D1 + R2 access for cloud workspaces and share links. Raw D1 with typed row
 * shapes, no ORM. R2 holds the bundle bytes; every function that removes a
 * row removes its object first, so a crash leaves at worst an unreferenced
 * row (self-heals on the next sweep), never a dangling object reference.
 * Retention is enforced by callers via `isExpired` (lib/workspaces/policy.ts).
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import type { MemberTier } from "@/lib/ai/types";
import { isExpired } from "./policy";

// ---------------------------------------------------------------------------
// Row shapes (snake_case mirrors migrations/auth/0005)
// ---------------------------------------------------------------------------

export interface WorkspaceRow {
  user_id: string;
  id: string;
  name: string;
  playground: string;
  size_bytes: number;
  manifest: string;
  r2_key: string;
  created_at: string;
  updated_at: string;
  last_used_at: string;
}

export interface ShareRow {
  id: string;
  user_id: string | null;
  name: string;
  playground: string;
  size_bytes: number;
  manifest: string;
  r2_key: string;
  created_at: string;
  last_viewed_at: string;
  expires_at: string | null;
}

/** Share row joined with its owner's tier-relevant columns (all null for
 *  guest shares). */
export interface ShareRowWithOwner extends ShareRow {
  owner_email: string | null;
  owner_role: string | null;
  owner_plan: string | null;
}

// ---------------------------------------------------------------------------
// Cloud workspaces
// ---------------------------------------------------------------------------

export async function listWorkspaceRows(
  env: CloudflareEnv,
  userId: string,
): Promise<WorkspaceRow[]> {
  const res = await env.DB.prepare(
    `SELECT user_id, id, name, playground, size_bytes, manifest, r2_key,
            created_at, updated_at, last_used_at
       FROM cloud_workspaces WHERE user_id = ?
      ORDER BY last_used_at DESC`,
  )
    .bind(userId)
    .all<WorkspaceRow>();
  return res.results;
}

export async function getWorkspaceRow(
  env: CloudflareEnv,
  userId: string,
  id: string,
): Promise<WorkspaceRow | null> {
  const row = await env.DB.prepare(
    `SELECT user_id, id, name, playground, size_bytes, manifest, r2_key,
            created_at, updated_at, last_used_at
       FROM cloud_workspaces WHERE user_id = ? AND id = ?`,
  )
    .bind(userId, id)
    .first<WorkspaceRow>();
  return row ?? null;
}

export async function upsertWorkspaceRow(
  env: CloudflareEnv,
  row: WorkspaceRow,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO cloud_workspaces
       (user_id, id, name, playground, size_bytes, manifest, r2_key,
        created_at, updated_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, id) DO UPDATE SET
       name = excluded.name,
       playground = excluded.playground,
       size_bytes = excluded.size_bytes,
       manifest = excluded.manifest,
       r2_key = excluded.r2_key,
       updated_at = excluded.updated_at,
       last_used_at = excluded.last_used_at`,
  )
    .bind(
      row.user_id,
      row.id,
      row.name,
      row.playground,
      row.size_bytes,
      row.manifest,
      row.r2_key,
      row.created_at,
      row.updated_at,
      row.last_used_at,
    )
    .run();
}

/** Refreshes the free-tier retention clock (open/download counts as use). */
export async function touchWorkspaceRow(
  env: CloudflareEnv,
  userId: string,
  id: string,
  nowIso: string,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE cloud_workspaces SET last_used_at = ? WHERE user_id = ? AND id = ?`,
  )
    .bind(nowIso, userId, id)
    .run();
}

/** Deletes workspace rows + their R2 objects. Objects go first so a partial
 *  failure can't leave a row pointing at deleted bytes. */
export async function deleteWorkspaces(
  env: CloudflareEnv,
  bucket: R2Bucket,
  userId: string,
  rows: Pick<WorkspaceRow, "id" | "r2_key">[],
): Promise<void> {
  if (rows.length === 0) return;
  await bucket.delete(rows.map((r) => r.r2_key));
  const stmt = env.DB.prepare(
    `DELETE FROM cloud_workspaces WHERE user_id = ? AND id = ?`,
  );
  await env.DB.batch(rows.map((r) => stmt.bind(userId, r.id)));
}

// ---------------------------------------------------------------------------
// Shares
// ---------------------------------------------------------------------------

export async function listShareRows(
  env: CloudflareEnv,
  userId: string,
): Promise<ShareRow[]> {
  const res = await env.DB.prepare(
    `SELECT id, user_id, name, playground, size_bytes, manifest, r2_key,
            created_at, last_viewed_at, expires_at
       FROM playground_shares WHERE user_id = ?
      ORDER BY created_at DESC`,
  )
    .bind(userId)
    .all<ShareRow>();
  return res.results;
}

export async function getShareRowWithOwner(
  env: CloudflareEnv,
  shareId: string,
): Promise<ShareRowWithOwner | null> {
  const row = await env.DB.prepare(
    `SELECT s.id, s.user_id, s.name, s.playground, s.size_bytes, s.manifest,
            s.r2_key, s.created_at, s.last_viewed_at, s.expires_at,
            u.email AS owner_email, u.role AS owner_role, u.plan AS owner_plan
       FROM playground_shares s
       LEFT JOIN user u ON u.id = s.user_id
      WHERE s.id = ?`,
  )
    .bind(shareId)
    .first<ShareRowWithOwner>();
  return row ?? null;
}

export async function insertShareRow(
  env: CloudflareEnv,
  row: ShareRow,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO playground_shares
       (id, user_id, name, playground, size_bytes, manifest, r2_key,
        created_at, last_viewed_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.user_id,
      row.name,
      row.playground,
      row.size_bytes,
      row.manifest,
      row.r2_key,
      row.created_at,
      row.last_viewed_at,
      row.expires_at,
    )
    .run();
}

/** Refreshes a share's inactivity clock (a view counts as activity). */
export async function touchShareRow(
  env: CloudflareEnv,
  shareId: string,
  nowIso: string,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE playground_shares SET last_viewed_at = ? WHERE id = ?`,
  )
    .bind(nowIso, shareId)
    .run();
}

export async function deleteShares(
  env: CloudflareEnv,
  bucket: R2Bucket,
  rows: Pick<ShareRow, "id" | "r2_key">[],
): Promise<void> {
  if (rows.length === 0) return;
  await bucket.delete(rows.map((r) => r.r2_key));
  const stmt = env.DB.prepare(`DELETE FROM playground_shares WHERE id = ?`);
  await env.DB.batch(rows.map((r) => stmt.bind(r.id)));
}

/**
 * Drop every R2 object a user owns (cloud saves + shares) before account
 * deletion: the D1 rows cascade from the `user` row, but the R2 payloads do
 * not. Best-effort, never throws — orphaned bytes are a storage cost, not a
 * reason to trap a user. R2 multi-delete caps at 1000 keys, so keys are
 * chunked.
 */
export async function deleteAllUserObjects(
  env: CloudflareEnv,
  userId: string,
): Promise<void> {
  const bucket = env.WORKSPACES_BUCKET;
  if (!bucket) return;
  try {
    const [workspaces, shares] = await Promise.all([
      listWorkspaceRows(env, userId),
      listShareRows(env, userId),
    ]);
    const keys = [
      ...workspaces.map((r) => r.r2_key),
      ...shares.map((r) => r.r2_key),
    ];
    for (let i = 0; i < keys.length; i += 1000) {
      await bucket.delete(keys.slice(i, i + 1000));
    }
  } catch {
    // Best-effort; see doc comment. A cleanup hiccup must not block deletion.
  }
}

/** Amortized cleanup of expired *guest* shares (nobody lists them, so nothing
 *  else would ever encounter the rows). Called opportunistically from the
 *  share-creation route via ctx.waitUntil; bounded so a single request never
 *  does unbounded work. */
export async function sweepExpiredGuestShares(
  env: CloudflareEnv,
  bucket: R2Bucket,
  nowIso: string,
  limit = 20,
): Promise<void> {
  const res = await env.DB.prepare(
    `SELECT id, r2_key FROM playground_shares
      WHERE user_id IS NULL AND expires_at IS NOT NULL AND expires_at <= ?
      LIMIT ?`,
  )
    .bind(nowIso, limit)
    .all<Pick<ShareRow, "id" | "r2_key">>();
  await deleteShares(env, bucket, res.results);
}

// ---------------------------------------------------------------------------
// Usage + expiry partitioning
// ---------------------------------------------------------------------------

/** Splits rows into live vs expired under the read-time retention rule.
 *  Accessors keep this generic over both row shapes (cloud saves have no
 *  fixed expiry column; shares do). */
export function partitionExpired<T>(
  rows: T[],
  tier: MemberTier,
  activityOf: (row: T) => string,
  expiryOf: (row: T) => string | null,
  nowMs: number,
): { live: T[]; expired: T[] } {
  const live: T[] = [];
  const expired: T[] = [];
  for (const row of rows) {
    if (
      isExpired({
        tier,
        lastActiveAt: activityOf(row),
        expiresAt: expiryOf(row),
        nowMs,
      })
    ) {
      expired.push(row);
    } else {
      live.push(row);
    }
  }
  return { live, expired };
}

// ---------------------------------------------------------------------------
// Guest share-creation budget (per-IP + global daily counters)
// ---------------------------------------------------------------------------

/** Salted SHA-256 of the client IP, the counter key stores no raw IPs. */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface GuestBudgetDecision {
  ok: boolean;
  message?: string;
}

/** Conditional check-and-increment in one statement: bumps the counter only
 *  while it is under `limit`, so concurrent requests can't all observe the
 *  same pre-increment value (the old read-check-then-write pattern let a
 *  burst blow straight through the cap). A capped request updates nothing
 *  (RETURNING yields no row), so rejected traffic can't inflate the counter. */
function reserveCounterStmt(env: CloudflareEnv) {
  return env.DB.prepare(
    `INSERT INTO share_usage_daily (scope, day, count) VALUES (?, ?, 1)
     ON CONFLICT(scope, day) DO UPDATE SET count = count + 1
       WHERE count < ?
     RETURNING count`,
  );
}

/** Atomically reserves one guest share against the per-IP and global daily
 *  budgets. The per-IP counter goes first so spam from an already-capped IP
 *  never touches (and can never exhaust) the shared global counter. */
export async function reserveGuestShare(
  env: CloudflareEnv,
  ipHash: string,
  day: string,
  limits: { perIp: number; global: number },
): Promise<GuestBudgetDecision> {
  const ipRes = await reserveCounterStmt(env)
    .bind(`ip:${ipHash}`, day, limits.perIp)
    .all<{ count: number }>();
  if (ipRes.results.length === 0) {
    return {
      ok: false,
      message:
        "You've reached today's guest share limit. Sign in (it's free) to keep sharing.",
    };
  }
  // Prune counters older than a week in the same round trip, the table
  // stays a few hundred rows without any scheduled job.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [globalRes] = await env.DB.batch<{ count: number }>([
    reserveCounterStmt(env).bind("global", day, limits.global),
    env.DB.prepare(`DELETE FROM share_usage_daily WHERE day < ?`).bind(weekAgo),
  ]);
  if (globalRes.results.length === 0) {
    return {
      ok: false,
      message:
        "Sharing is busy right now, please try again tomorrow, or sign in to share without the guest limit.",
    };
  }
  return { ok: true };
}
