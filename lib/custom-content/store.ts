/**
 * D1 access for custom content (custom_items + custom_sets, migration
 * 0007). Follows the repo's raw-D1 convention (lib/workspaces/store.ts):
 * plain `env.DB.prepare(...)` with typed row shapes, no ORM.
 *
 * Expiry (guest rows only) is evaluated at read time via
 * `isCustomRowExpired`; the "live" readers drop expired rows lazily so an
 * expired link 404s immediately and the row is cleaned up in passing, the
 * same no-cron design as playground shares. Payloads live in the row
 * itself (small JSON), so unlike workspaces there is no R2 object to keep
 * in sync.
 */

import { isCustomRowExpired } from "./policy";
import type {
  CustomItemKind,
  CustomItemMeta,
  CustomItemPayload,
  CustomSetMeta,
} from "./types";

// ---------------------------------------------------------------------------
// Row shapes (snake_case mirrors migrations/auth/0007)
// ---------------------------------------------------------------------------

export interface CustomItemRow {
  id: string;
  user_id: string | null;
  kind: CustomItemKind;
  title: string;
  payload: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface CustomSetRow {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  item_ids: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

const ITEM_COLUMNS =
  "id, user_id, kind, title, payload, created_at, updated_at, expires_at";

export async function insertItemRow(
  env: CloudflareEnv,
  row: CustomItemRow,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO custom_items (${ITEM_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.user_id,
      row.kind,
      row.title,
      row.payload,
      row.created_at,
      row.updated_at,
      row.expires_at,
    )
    .run();
}

/** Read one item, enforcing expiry at read time (an expired row is
 *  deleted in passing and reported as missing). */
export async function getLiveItemRow(
  env: CloudflareEnv,
  id: string,
  nowMs: number,
): Promise<CustomItemRow | null> {
  const row = await env.DB.prepare(
    `SELECT ${ITEM_COLUMNS} FROM custom_items WHERE id = ?`,
  )
    .bind(id)
    .first<CustomItemRow>();
  if (!row) return null;
  if (isCustomRowExpired(row.expires_at, nowMs)) {
    await env.DB.prepare(`DELETE FROM custom_items WHERE id = ?`)
      .bind(id)
      .run();
    return null;
  }
  return row;
}

/** Read several items by id, preserving the caller's order and skipping
 *  ids that are missing or expired (expired rows are purged in passing).
 *  Used by the quiz-set viewer. */
export async function getLiveItemRows(
  env: CloudflareEnv,
  ids: string[],
  nowMs: number,
): Promise<CustomItemRow[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  const res = await env.DB.prepare(
    `SELECT ${ITEM_COLUMNS} FROM custom_items WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<CustomItemRow>();
  const byId = new Map(res.results.map((r) => [r.id, r]));
  const live: CustomItemRow[] = [];
  const expired: string[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) continue;
    if (isCustomRowExpired(row.expires_at, nowMs)) {
      expired.push(id);
      continue;
    }
    live.push(row);
  }
  if (expired.length > 0) {
    const del = expired.map(() => "?").join(", ");
    await env.DB.prepare(`DELETE FROM custom_items WHERE id IN (${del})`)
      .bind(...expired)
      .run();
  }
  return live;
}

export async function listItemRows(
  env: CloudflareEnv,
  userId: string,
): Promise<CustomItemRow[]> {
  const res = await env.DB.prepare(
    `SELECT ${ITEM_COLUMNS} FROM custom_items
      WHERE user_id = ? ORDER BY updated_at DESC`,
  )
    .bind(userId)
    .all<CustomItemRow>();
  return res.results;
}

export async function countItemRows(
  env: CloudflareEnv,
  userId: string,
): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM custom_items WHERE user_id = ?`,
  )
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Owner-scoped update; returns false when the row isn't the caller's. */
export async function updateItemRow(
  env: CloudflareEnv,
  userId: string,
  id: string,
  fields: { title: string; payload: string; updated_at: string },
): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE custom_items SET title = ?, payload = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
  )
    .bind(fields.title, fields.payload, fields.updated_at, id, userId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

/** Owner-scoped delete; returns false when the row isn't the caller's. */
export async function deleteItemRow(
  env: CloudflareEnv,
  userId: string,
  id: string,
): Promise<boolean> {
  const res = await env.DB.prepare(
    `DELETE FROM custom_items WHERE id = ? AND user_id = ?`,
  )
    .bind(id, userId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

const SET_COLUMNS =
  "id, user_id, title, description, item_ids, created_at, updated_at, expires_at";

export async function insertSetRow(
  env: CloudflareEnv,
  row: CustomSetRow,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO custom_sets (${SET_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      row.id,
      row.user_id,
      row.title,
      row.description,
      row.item_ids,
      row.created_at,
      row.updated_at,
      row.expires_at,
    )
    .run();
}

export async function getLiveSetRow(
  env: CloudflareEnv,
  id: string,
  nowMs: number,
): Promise<CustomSetRow | null> {
  const row = await env.DB.prepare(
    `SELECT ${SET_COLUMNS} FROM custom_sets WHERE id = ?`,
  )
    .bind(id)
    .first<CustomSetRow>();
  if (!row) return null;
  if (isCustomRowExpired(row.expires_at, nowMs)) {
    await env.DB.prepare(`DELETE FROM custom_sets WHERE id = ?`).bind(id).run();
    return null;
  }
  return row;
}

export async function listSetRows(
  env: CloudflareEnv,
  userId: string,
): Promise<CustomSetRow[]> {
  const res = await env.DB.prepare(
    `SELECT ${SET_COLUMNS} FROM custom_sets
      WHERE user_id = ? ORDER BY updated_at DESC`,
  )
    .bind(userId)
    .all<CustomSetRow>();
  return res.results;
}

export async function countSetRows(
  env: CloudflareEnv,
  userId: string,
): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM custom_sets WHERE user_id = ?`,
  )
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function updateSetRow(
  env: CloudflareEnv,
  userId: string,
  id: string,
  fields: {
    title: string;
    description: string;
    item_ids: string;
    updated_at: string;
  },
): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE custom_sets SET title = ?, description = ?, item_ids = ?, updated_at = ?
      WHERE id = ? AND user_id = ?`,
  )
    .bind(
      fields.title,
      fields.description,
      fields.item_ids,
      fields.updated_at,
      id,
      userId,
    )
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function deleteSetRow(
  env: CloudflareEnv,
  userId: string,
  id: string,
): Promise<boolean> {
  const res = await env.DB.prepare(
    `DELETE FROM custom_sets WHERE id = ? AND user_id = ?`,
  )
    .bind(id, userId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Guest creation budgets
// ---------------------------------------------------------------------------

/** Conditional check-and-increment in one statement (the
 *  reserveGuestShare pattern from lib/workspaces/store.ts): bumps the
 *  counter only while it is under `limit`, so concurrent requests can't
 *  slip past the cap. Reuses the share_usage_daily table from migration
 *  0005 under a "ci:" scope prefix. */
function reserveCounterStmt(env: CloudflareEnv) {
  return env.DB.prepare(
    `INSERT INTO share_usage_daily (scope, day, count) VALUES (?, ?, 1)
     ON CONFLICT(scope, day) DO UPDATE SET count = count + 1
       WHERE count < ?
     RETURNING count`,
  );
}

export interface GuestBudgetDecision {
  ok: boolean;
  message?: string;
}

export async function reserveGuestCustomContent(
  env: CloudflareEnv,
  ipHash: string,
  day: string,
  limits: { perIp: number; global: number },
): Promise<GuestBudgetDecision> {
  const ipRes = await reserveCounterStmt(env)
    .bind(`ci:ip:${ipHash}`, day, limits.perIp)
    .all<{ count: number }>();
  if (ipRes.results.length === 0) {
    return {
      ok: false,
      message:
        "You've reached today's guest limit for creating challenges. Sign in (it's free) to keep creating.",
    };
  }
  const globalRes = await reserveCounterStmt(env)
    .bind("ci:global", day, limits.global)
    .all<{ count: number }>();
  if (globalRes.results.length === 0) {
    return {
      ok: false,
      message:
        "Challenge creation is busy right now, please try again tomorrow, or sign in to create without the guest limit.",
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Row → wire-shape helpers
// ---------------------------------------------------------------------------

export function itemRowToMeta(row: CustomItemRow): CustomItemMeta {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export function setRowToMeta(row: CustomSetRow): CustomSetMeta {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    itemCount: parseSetItemIds(row.item_ids).length,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

/** Parse the stored item_ids JSON defensively (a malformed row yields an
 *  empty list rather than a crash on the public viewer). */
export function parseSetItemIds(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    // fall through
  }
  return [];
}

/** Parse a stored payload defensively; the writer validated it, so a
 *  parse failure means row corruption, surfaced as null → 404/skip. */
export function parseItemPayload(raw: string): CustomItemPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as CustomItemPayload;
    }
  } catch {
    // fall through
  }
  return null;
}
