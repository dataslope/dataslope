/**
 * One quiz set. GET: public metadata + ordered item ids; expired rows 404.
 * PUT: owner only, updates title/description/item list (every id must
 * resolve to a live item). DELETE: owner only.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { isSameOrigin, json } from "@/lib/workspaces/server";
import { isValidCustomId } from "@/lib/custom-content/policy";
import { validateSetInput } from "@/lib/custom-content/schema";
import {
  deleteSetRow,
  getLiveItemRows,
  getLiveSetRow,
  parseSetItemIds,
  updateSetRow,
} from "@/lib/custom-content/store";
import type { CustomSetView } from "@/lib/custom-content/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  if (!isValidCustomId(id)) return json({ error: "Not found." }, 404);

  const { env } = getCloudflareContext();
  const row = await getLiveSetRow(env, id, Date.now());
  if (!row) return json({ error: "Not found." }, 404);

  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  const owned = !!session && !!row.user_id && session.user.id === row.user_id;

  const set: CustomSetView = {
    id: row.id,
    title: row.title,
    description: row.description,
    itemIds: parseSetItemIds(row.item_ids),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    owned,
  };
  return json({ set });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { id } = await context.params;
  if (!isValidCustomId(id)) return json({ error: "Not found." }, 404);

  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) return json({ error: "Sign in to edit this quiz set." }, 401);
  if (session.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }

  const nowMs = Date.now();
  const row = await getLiveSetRow(env, id, nowMs);
  if (!row) return json({ error: "Not found." }, 404);
  if (!row.user_id || row.user_id !== session.user.id) {
    return json({ error: "Only the creator can edit this." }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Body must be valid JSON." }, 400);
  }
  const validated = validateSetInput(body);
  if (!validated.ok) return json({ error: validated.message }, 400);
  const { title, description, itemIds } = validated.payload;

  const liveRows = await getLiveItemRows(env, itemIds, nowMs);
  if (liveRows.length !== itemIds.length) {
    const live = new Set(liveRows.map((r) => r.id));
    const missing = itemIds.filter((i) => !live.has(i));
    return json(
      {
        error: `These items don't exist (or have expired): ${missing.join(", ")}.`,
      },
      400,
    );
  }

  const updated = await updateSetRow(env, session.user.id, id, {
    title,
    description,
    item_ids: JSON.stringify(itemIds),
    updated_at: new Date(nowMs).toISOString(),
  });
  if (!updated) return json({ error: "Only the creator can edit this." }, 403);

  return json({ ok: true });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { id } = await context.params;
  if (!isValidCustomId(id)) return json({ error: "Not found." }, 404);

  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!session) return json({ error: "Sign in to delete this." }, 401);
  if (session.user.banned) {
    return json({ error: "This account is suspended." }, 403);
  }

  const deleted = await deleteSetRow(env, session.user.id, id);
  if (!deleted) return json({ error: "Not found." }, 404);
  return json({ ok: true });
}
